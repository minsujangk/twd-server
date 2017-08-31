"use strict";

var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var moment = require('moment');
var token = require('./token');
var promise = require('promise');
var user_party = require('./user_party');

var UserParty = user_party.UserParty;

var pool = mysql.createPool({
    host: "taewoondang.c0fywvxlr71j.ap-northeast-2.rds.amazonaws.com",
    port: 3306,
    user: "twd",
    password: "xodnsekd1",
    database: "Taewoondang",
    connectionLimit: 20,
    waitForConnections: true
});

class Session {
    constructor() {
        console.log("constructor")
        this.userparty_list = [];
    }

    print() {
        console.log(this.sessionkey)
    }

    loadNew() {
        console.log("loadNew")
        var self = this;
        self.create_time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
        var query_text = 'INSERT INTO session (sessionkey) values (null)'
        return new promise(function (resolve, reject) {
            pool.getConnection(function (err, connection) {
                var query = connection.query(query_text,
                    function (err, result, fields) {
                        if (err) {
                            connection.release();
                            throw err;
                        }
                        console.log(result);
                        self.sessionkey = result.insertId;
                        resolve()
                    });
                console.log(query);
            });
        })
    }

    load(col, val) {
        var self = this;
        return new promise(function (resolve, reject) {
            pool.getConnection(function (err, connection) {
                var query = connection.query('select * from session where ' + col + ' = ?', [val],
                    function (err, result, fields) {
                        if (err) {
                            connection.release();
                            reject(err);
                        }
                        connection.release();
                        console.log(result)

                        if (result.length == 0) {
                            reject();
                            return;
                        }

                        var data = result[0];

                        if (data.hasOwnProperty('sessionkey') && data.sessionkey != null)
                            self.sessionkey = data.sessionkey;
                        if (data.hasOwnProperty('name') && data.name != null)
                            self.name = data.name;
                        if (data.hasOwnProperty('owner_key') && data.owner_key != null)
                            self.owner_key = data.owner_key;
                        if (data.hasOwnProperty('org_key') && data.org_key != null)
                            self.org_key = data.org_key;
                        if (data.hasOwnProperty('host_key') && data.host_key != null)
                            self.host_key = data.host_key;
                        if (data.hasOwnProperty('departure') && data.departure != null)
                            self.departure = data.departure;
                        if (data.hasOwnProperty('route') && data.route != null && data.route != '')
                            self.route = data.route.split(",");
                        if (data.hasOwnProperty('guest_list') && data.guest_list != null && data.guest_list != '')
                            self.guest_list = data.guest_list.split(",").map(function (item) {
                                return item.split('@').map(function (item) {
                                    return parseInt(item, 10)
                                });
                            })
                        if (data.hasOwnProperty('host_state') && data.host_state != null)
                            self.host_state = data.host_state;
                        if (data.hasOwnProperty('host_location') && data.host_location != null)
                            self.host_location = data.host_location;
                        self.create_time = data.create_time;
                        resolve();
                    });
                console.log(query);
            });
        });
    }

    commit() {
        var self = this;
        var query_text = 'update session set owner_key = ?, org_key = ?, host_key = ?, departure = ?, route = ?, guest_list = ?, create_time = ? where sessionKey = ?'
        return new promise(function (resolve, reject) {
            pool.getConnection(function (err, connection) {
                var guest_list = [];
                console.log(self.guest_list)
                for (var i = 0; i < self.guest_list.length; i++) {
                    var guest = self.guest_list[i]
                    guest_list.push(guest.join('@'));
                }
                var query = connection.query(query_text, [self.owner_key, self.org_key, self.host_key, self.departure, self.route.toString(), guest_list.toString(), self.create_time, self.sessionkey],
                    function (err, result, fields) {
                        if (err) {
                            reject();
                            connection.release();
                            throw err;
                        }
                        console.log(result);
                        console.log(self.guest_list)
                        resolve();
                    });
            });
        });
    }

    // attr: host_key, departure
    update(attr, val) {
        console.log("updates")
        var self = this;
        return new promise(function (resolve, reject) {
            if (val.constructor == Array) {
                self[attr] = val.toString();
            } else {
                self[attr] = val;
            }
            resolve();
        });
    }

    // for route
    updateRoute(array) {
        // array: 바뀐 route의 array
        var self = this;
        return new promise(function (resolve, reject) {
            var tArray = self.route;
            var i;
            for (i = 0; i < array.length; i++) {
                const poi = array[i];
                if (typeof tArray !== 'undefined') {
                    var index = tArray.indexOf(poi)
                    if (index !== -1) {
                        // 바뀐 poi가 발견되면,
                        if (self.guest_list) {
                            for (var j = 0; j < self.guest_list.length; j++) {
                                // guest에서 그 poi의 index를 찾아서 바꿈.
                                var guest_ = self.guest_list[j]; // List of (pkey, route_index, route_index)
                                if (guest_[1] == index) {
                                    guest_[1] = i;
                                }
                                if (guest_[2] == index) {
                                    guest_[2] = i;
                                }
                            }
                        }
                    }
                }
            }
            self.route = array;
            resolve();
        })
    }

    // array: array of (pkey, route_index)
    updateGuest(array) {
        console.log('updateGuest')
        console.log(array)
        var self = this;
        return new promise(function (resolve, reject) {
            var tArray = self.guest_list;

            // 바뀔 array에서 예전에 없던 유저들을 찾아서 UserParty에서 이 session을 추가.
            for (var i = 0; i < array.length; i++) {
                var item = array[i]
                var isExist = false;
                var pkey = item[0];
                if (typeof tArray !== 'undefined') {
                    for (var j = 0; j < tArray.length; j++) {
                        var oitem = tArray[j];
                        if (pkey == oitem[0])
                            isExist = true;
                    }
                }

                if (!isExist) {
                    var up = new UserParty(pkey);
                    up.load()
                        .then(function (va) {
                            return va.add("session", [self.sessionkey]);
                        })
                        .then(function (va) {
                            // self.userparty_list.push(va);
                            va.commit();
                        })
                }
            }

            if (typeof tArray !== 'undefined')
                for (oitem in tArray) {
                    var isExist = false;
                    var pkey = oitem[0];
                    for (item in array) {
                        if (pkey == item[0])
                            isExist = true;
                    }

                    if (!isExist) {
                        var up = new UserParty(pkey);
                        up.load()
                            .then(function (va) {
                                return up.remove("session", [self.sessionkey]);
                            })
                            .then(function (va) {
                                self.userparty_list.push(va)
                            })
                    }
                }
            self.guest_list = array;
            resolve();
        })
    }
}

// token, org_key, host_key, departure, route, guest_list
router.get('/create', function (req, res, next) {
    var sess;
    token.readToken(req)
        .then(
            function (decoded) {
                // console.log("helel1")
                sess = new Session();
                return sess.update('owner_key', decoded.pkey);
            },
            function () {
                res.json({
                    message: 'failure',
                    type: 'TOKEN_INVALID'
                })
                reject();
            })
        .then(function () {
            return sess.loadNew();
        })
        .then(function () {
            console.log(sess.sessionkey)
            if (req.query.hasOwnProperty('org_key')) {
                var org_key = req.query.org_key;
                return sess.update('org_key', org_key);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('host_key')) {
                var host_key = req.query.host_key;
                return sess.update('host_key', host_key);
            }
            return

        })
        .then(function () {
            if (req.query.hasOwnProperty('departure')) {
                var departure = req.query.departure;
                return sess.update('departure', departure);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('route')) {
                var route = req.query.route.split(",");
                console.log('updateg')
                return sess.updateRoute(route);
            }
            return
        })
        .then(function () {
            console.log('guest_list')
            if (req.query.hasOwnProperty('guest_list')) {
                var guest_list = req.query.guest_list.split(",").map(function (item) {
                    return item.split('@').map(function (item) {
                        return parseInt(item, 10)
                    });
                })
                return sess.updateGuest(guest_list);
            }
            return
        })
        .then(function () {
            console.log("commit")
            return sess.commit();
        })
        .then(function () {
            res.json({
                message: 'success'
            })
        });

});

router.get('/update/owner', function (req, res, next) {
    var sess;
    var pkey;
    var sessionkey = req.query.sessionkey;
    token.readToken(req)
        .then(
            function (decoded) {
                // console.log("helel1")
                sess = new Session();
                pkey = decoded.pkey;
            },
            function () {
                res.json({
                    message: 'failure',
                    type: 'TOKEN_INVALID'
                })
                reject();
            })
        .then(function () {
            return sess.load('sessionkey', Number(sessionkey));
        })
        // 권한 검사.
        .then(function () {
                return new promise(function (resolve, reject) {
                    if (sess.owner_key == pkey)
                        resolve();
                    else
                        reject();
                });
            },
            function () {
                res.json({
                    message: 'failure',
                    type: 'SESSION_NOTFOUND'
                })
                reject();
            })
        .then(function () {
                console.log(sess.sessionkey)
                if (req.query.hasOwnProperty('org_key')) {
                    var org_key = req.query.org_key;
                    return sess.update('org_key', org_key);
                }
                return
            },
            function () {
                res.json({
                    message: 'failure',
                    type: 'OWNER_WRONG'
                })
                reject();
            })
        .then(function () {
            if (req.query.hasOwnProperty('host_key')) {
                var host_key = req.query.host_key;
                return sess.update('host_key', host_key);
            }
            return

        })
        .then(function () {
            if (req.query.hasOwnProperty('departure')) {
                var departure = req.query.departure;
                return sess.update('departure', departure);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('route')) {
                var route = req.query.route.split(",");
                console.log('updateg')
                return sess.updateRoute(route);
            }
            return
        })
        .then(function () {
            console.log('guest_list')
            if (req.query.hasOwnProperty('guest_list')) {
                var guest_list = req.query.guest_list.split(",").map(function (item) {
                    return item.split('@').map(function (item) {
                        return parseInt(item, 10)
                    });
                })
                return sess.updateGuest(guest_list);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('state')) {
                var departure = req.query.state;
                return sess.update('state', state);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('departure')) {
                var departure = req.query.departure;
                return sess.update('departure', departure);
            }
            return
        })
        .then(function () {
            console.log("commit")
            return sess.commit();
        })
        .then(function () {
            res.json({
                message: 'success'
            })
        });
})


// router.get('/create', function (req, res, next) {
//     var org_key = req.query.org_key;
//     var host_key = req.query.host_key;
//     var departure = req.query.departure;
//     var route = req.query.route;
//     var guest_list = req.query.guest_list;
//     var create_time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
//     token.readToken(req)
//         .then(function (decoded) {
//             return new promise(function (resolve, reject) {
//                 var pkey = decoded.pkey;
//                 var type = decoded.type;
//                 var query_text = 'select owner_key from org where orgkey = ?'
//                 pool.getConnection(function (err, connection) {
//                     var query = connection.query(query_text, [org_key],
//                         function (err, result, fields) {
//                             if (err) {
//                                 connection.release();
//                                 throw err;
//                                 res.json({
//                                     message: 'failure',
//                                     type: 'QUERY_ERROR'
//                                 });
//                             }
//                             if (result[0].owner_key == pkey) {
//                                 resolve(decoded);
//                             } else
//                                 reject();
//                         });
//                     console.log(query);
//                 });
//             });
//         }, function () {
//             res.json({
//                 message: 'failure',
//                 type: 'TOKEN_INVALID'
//             });
//         })
//         .then(function (decoded) {
//             var pkey = decoded.pkey;
//             var type = decoded.type;
//             var query_text = 'insert into session (org_key, owner_key, host_key, departure, route, guest_list, create_time) value (?, ?, ?, ?, ?, ?, ?)';
//             pool.getConnection(function (err, connection) {
//                 var query = connection.query(query_text, [org_key, pkey, host_key, departure, route, guest_list, create_time],
//                     function (err, result, fields) {
//                         if (err) {
//                             connectin.release();
//                             throw err;
//                             res.json({
//                                 message: 'failure',
//                                 type: 'QUERY_ERROR'
//                             });
//                         }
//                         res.json({
//                             message: 'success'
//                         });
//                         console.log(result);
//                     });
//                 console.log(query);
//             });

//         }, function () {
//             res.json({
//                 message: 'failure',
//                 type: 'ORG_OWNER_WRONG'
//             });
//         });
// });

router.get('/search/:filterBy', function (req, res, next) {
    var value = req.query.value;
    token.readToken(req)
        .then(function (decoded) {
                var pkey = decoded.pkey
                var filterBy = req.params.filterBy;
                if (filterBy == 'sessionKey' || filterBy == 'owner_key' || filterBy == 'org_key' || filterBy == 'host_key') {
                    var value = req.query.value;
                    pool.getConnection(function (err, connection) {
                        var query = connection.query('select * from session where ' + filterBy + ' = ?', [value],
                            function (err, result, fields) {
                                if (result.length == 0) {
                                    res.json({
                                        message: 'failure',
                                        type: 'SESSION_NOTFOUND'
                                    });
                                    connection.release();
                                    return;
                                }
                                if (err) {
                                    connection.release();
                                    throw err;
                                }
                                console.log(result);
                                for (var row in result) {
                                    if (row.owner_key != pkey && row.host_key != pkey)
                                        delete row.guest_list;
                                }
                                res.json({
                                    message: 'success',
                                    result: result
                                });
                                connection.release();
                            });
                        console.log(query);
                    });
                } else {
                    res.json({
                        message: 'failure',
                        type: 'FILTER_WRONG'
                    })
                }
            },
            function () {
                res.json({
                    message: 'failure',
                    type: 'TOKEN_INVALID'
                });
            });
})

router.get('/update-by-owner', function (req, res, next) {
    var sessionKey = req.query.sessionKey;
    var session = new Session(sessionKey);
    session.load(session)
        .then(function () {
            if (req.query.host_key !== 'undefined' && req.query.host_key) {
                session.host_key = req.query.host_key;
            }
            if (req.query.departure !== 'undefined' && req.query.departure) {
                session.departure = req.query.departure;
            }
            if (req.query.route !== 'undefined' && req.query.route) {
                session.route = req.query.route;
            }
            if (req.query.guest_list !== 'undefined' && req.query.guest_list) {
                session.guest_list = req.query.guest_list.split(",");
            }
            session.update(req, res, session);
        }, function () {
            res.json({
                message: 'failure',
                type: 'SESSION_NOTFOUND'
            })
        })
});

// sessionKey, token
router.get('/join', function (req, res, next) {
    var sessionKey = req.query.sessionKey;
    var session = new Session(sessionKey);
    var routeNum = req.query.routeNum;
    session.load(session)
        .then(function () {
            session.join(req, res, session);
        }, function () {
            res.json({
                message: 'failure',
                type: 'SESSION_NOTFOUND'
            })
        })
})

module.exports = router;