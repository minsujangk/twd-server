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
        this.sessionkey = '';
        this.host_location = [];
        this.state = '';
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
                            return;
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
                        if (data.hasOwnProperty('watcher_list') && data.watcher_list != null && data.watcher_list != '')
                            self.watcher_list = data.watcher_list.split(",").map(function (item) {
                                return item.split('@').map(function (item) {
                                    return parseInt(item, 10)
                                });
                            })
                        if (data.hasOwnProperty('host_state') && data.host_state != null)
                            self.host_state = data.host_state;
                        if (data.hasOwnProperty('host_location') && data.host_location != null)
                            self.host_location = data.host_location;
                        if (data.hasOwnProperty('host_route_index') && data.host_route_index != null)
                            self.host_location = data.host_route_index;
                        self.create_time = data.create_time;
                        resolve();
                    });
                console.log(query);
            });
        });
    }

    commit() {
        var self = this;
        var query_text = 'update session set owner_key = ?, org_key = ?, host_key = ?, departure = ?, route = ?, guest_list = ?, watcher_list = ?, state = ?, host_location = ?, create_time = ? where sessionKey = ?'
        return new promise(function (resolve, reject) {
            pool.getConnection(function (err, connection) {
                var guest_list = [];
                console.log(self.guest_list)
                if (self.guest_list)
                    for (var i = 0; i < self.guest_list.length; i++) {
                        var guest = self.guest_list[i]
                        guest_list.push(guest.join('@'));
                    }
                var watcher_list = [];
                console.log(self.watcher_list)
                if (self.watcher_list)
                    for (var i = 0; i < self.watcher_list.length; i++) {
                        var watcher = self.watcher_list[i]
                        watcher_list.push(watcher.join('@'));
                    }
                var query = connection.query(query_text, [self.owner_key, self.org_key, self.host_key, self.departure, self.route.toString(), guest_list.toString(), watcher_list.toString(), self.state, self.host_location.toString(), self.create_time, self.sessionkey],
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
                                if (guest_[2] == index) {
                                    guest_[2] = i;
                                }
                                if (guest_[2] == index) {
                                    guest_[2] = i;
                                }
                            }
                        }

                        if (self.watcher_list) {
                            for (var j = 0; j < self.watcher_list.length; j++) {
                                // watcher에서 그 poi의 index를 찾아서 바꿈.
                                var watcher_ = self.watcher_list[j]; // List of (pkey, route_index, route_index)
                                if (watcher_[2] == index) {
                                    watcher_[2] = i;
                                }
                                if (watcher_[3] == index) {
                                    watcher_[3] = i;
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

    // array: array of (pkey, route_index)
    updateWatcher(array) {
        var self = this;
        return new promise(function (resolve, reject) {
            var tArray = self.watcher_list;

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
            self.watcher_list = array;
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
            if (req.query.hasOwnProperty('time_policy')) {
                var time_policy = req.query.time_policy.split(",");
                return sess.updateRoute(time_policy);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('route')) {
                var route = req.query.route.split(",");
                return sess.updateRoute(route);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('route_time')) {
                var route_time = req.query.route_time.split(",");
                return sess.updateRoute(route_time);
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
            if (req.query.hasOwnProperty('watcher_list')) {
                var watcher_list = req.query.watcher_list.split(",").map(function (item) {
                    return item.split('@').map(function (item) {
                        return parseInt(item, 10)
                    });
                })
                return sess.updateWatcher(watcher_list);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('host_location')) {
                var host_location = req.query.host_location.split(",").map(function (item) {
                    return parseFloat(item);
                });
                return sess.update('host_location', host_location);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('host_route_index')) {
                var host_route_index = req.query.host_route_index;
                return sess.update('host_route_index', host_route_index);
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
            if (req.query.hasOwnProperty('state')) {
                var state = req.query.state;
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
            if (req.query.hasOwnProperty('time_policy')) {
                var time_policy = req.query.time_policy;
                return sess.update('time_policy', time_policy);
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
            if (req.query.hasOwnProperty('route_time')) {
                var route_time = req.query.route_time;
                return sess.update('route_time', route_time);
            }
            return
        })
        .then(function () {
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
            if (req.query.hasOwnProperty('watcher_list')) {
                var watcher_list = req.query.watcher_list.split(",").map(function (item) {
                    return item.split('@').map(function (item) {
                        return parseInt(item, 10)
                    });
                })
                return sess.updateWatcher(watcher_list);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('host_location')) {
                var host_location = req.query.host_location.split(",").map(function (item) {
                    return parseFloat(item);
                });
                return sess.update('host_location', host_location);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('host_route_index')) {
                var host_route_index = req.query.host_route_index;
                return sess.update('host_route_index', host_route_index);
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

router.get('/update/host', function (req, res, next) {
    var sess;
    var pkey;
    var type;
    var sessionkey = req.query.sessionkey;
    token.readToken(req)
        .then(
            function (decoded) {
                // console.log("helel1")
                sess = new Session();
                pkey = decoded.pkey;
                type = decoded.type;
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
                    if (type == 'driver' && sess.host_key == pkey)
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
                if (req.query.hasOwnProperty('state')) {
                    var state = req.query.state;
                    return sess.update('state', state);
                }
                return
            },
            function () {
                res.json({
                    message: 'failure',
                    type: 'HOST_WRONG'
                })
                reject();
            })
        .then(function () {
            if (req.query.hasOwnProperty('host_location')) {
                var host_location = req.query.host_location.split(",").map(function (item) {
                    return parseFloat(item);
                });
                return sess.update('host_location', host_location);
            }
            return
        })
        .then(function () {
            if (req.query.hasOwnProperty('host_route_index')) {
                var host_route_index = req.query.host_route_index;
                return sess.update('host_route_index', host_route_index);
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

router.get('/search/:filterBy', function (req, res, next) {
    var value = req.query.value;
    token.readToken(req)
        .then(function (decoded) {
                var pkey = decoded.pkey;
                var type = decoded.type;
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

                                for (var j = 0, row; row = result[j]; j++) {
                                    var guest_ = []
                                    var guest_list = row.guest_list.split(',');
                                    for (var i = 0; i < guest_list.length; i++) {
                                        var item = guest_list[i];
                                        if (type == 'user' && Number(item.split('@')[0]) == pkey) {
                                            guest_.push(item);
                                        }
                                    }

                                    var watcher_ = [];

                                    var watcher_list = row.watcher_list.split(',');
                                    for (var i = 0; i < watcher_list.length; i++) {
                                        var item = watcher_list[i];
                                        if (type == 'user' && Number(item.split('@')[0]) == pkey) {
                                            watcher_.push(item);
                                        }
                                    }

                                    if (watcher_) {
                                        for (var k = 0, wa; wa = watcher_[k]; k++) {
                                            var guest_pkey = watcher_[k].split('@')[1];
                                            var guest_list = row.guest_list.split(',');
                                            for (var i = 0; i < guest_list.length; i++) {
                                                var item = guest_list[i];
                                                if (type == 'user' && Number(item.split('@')[0]) == guest_pkey) {
                                                    guest_.push(item);
                                                }
                                            }
                                        }
                                    }

                                    if (guest_)
                                        row.guest_info = guest_.toString()
                                    if (watcher_)
                                        row.watcher_info = watcher_.toString()
                                }



                                for (var i = 0, row; row = result[i]; i++) {
                                    if ((!(type == 'user' && Number(row.owner_key) == pkey)) && (!(type == 'driver' && Number(row.host_key) == pkey))) {
                                        console.log('hello')
                                        delete row.guest_list;
                                        delete row.watcher_list;
                                    }
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

router.get('/get-host-info', function (req, res, next) {
    var sess
    token.readToken(req)
        .then(
            function (decoded) {
                // console.log("helel1")
                sess = new Session();
                pkey = decoded.pkey;
                type = decoded.type;
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
                res.json({
                    message: 'success',
                    result: {
                        sessionkey: sess.sessionkey,
                        host_key: sess.host_key,
                        state: sess.state,
                        host_location: sess.host_location
                    }
                })
            },
            function () {
                res.json({
                    message: 'failure',
                    type: 'SESSION_NOTFOUND'
                })
                reject();
            })
})

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