"use strict";

var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var moment = require('moment');
var token = require('./token');
var promise = require('promise');

var pool = mysql.createPool({
    host: "taewoondang.c0fywvxlr71j.ap-northeast-2.rds.amazonaws.com",
    port: 3306,
    user: "twd",
    password: "xodnsekd1",
    database: "Taewoondang",
    connectionLimit: 20,
    waitForConnections: true
});

var UserParty = class UserParty {
    constructor(pkey) {
        this.pkey = pkey;
        this.session_list = [];
    }

    load() {
        var self = this;
        var query_text = 'select * from user_party where pkey = ?'
        return new promise(function (resolve, reject) {
            pool.getConnection(function (err, connection) {
                var query = connection.query(query_text, [self.pkey],
                    function (err, result, fields) {
                        if (err) {
                            connection.release();
                            throw err;
                        }
                        if (result.length == 0) {
                            // there is no row
                            var qq = connection.query('insert into user_party (pkey) values (?)', [self.pkey],
                                function (err, result, fields) {
                                    if (err) {
                                        connection.release();
                                        throw err;
                                    }
                                    self.load();
                                });
                            return;
                        }
                        connection.release();
                        console.log(result);

                        var data = result[0];

                        if (data.hasOwnProperty('session_list') && data.session_list != null && data.session_list != '') {
                            self.session_list = data.session_list.split(",").map(function (item) {
                                return parseInt(item, 10)
                            });
                        }

                        resolve(self);
                    });
                // console.log(query);
            });
        });
    }

    // update everything
    commit() {
        console.log('userparty coommit')
        var self = this;
        var query_text = 'update user_party set session_list = ? where pkey = ?'
        return new promise(function (resolve, reject) {
            pool.getConnection(function (err, connection) {
                var query = connection.query(query_text, [self.session_list.toString(), self.pkey],
                    function (err, result, fields) {
                        if (err) {
                            connection.release();
                            throw err;
                        }
                        console.log(result);
                    });
                // console.log(query);
            });

        })
    }

    // attr: session
    add(attr, array) {
        var self = this;
        return new promise(function (resolve, reject) {
            var tArray = self[attr + '_list'];
            for (var i = 0; i < array.length; i++) {
                var elem = array[i];
                if (tArray.indexOf(elem) == -1) {
                    tArray.push(elem);
                } else {
                    console.log('Error: User ' + self.pkey + ' already has ' + attr + ' ' + elem);
                }
            }
            console.log(self.session_list)
            resolve(self);
        });
    }

    // attr: session
    remove(attr, array) {
        var self = this;
        return new promise(function (resolve, reject) {
            var tArray = self[attr + '_list'];
            for (var i = 0; i < array; i++) {
                var elem = array[i];
                if (tArray.includes(elem)) {
                    tArray.splice(tArray.indexOf(elem), 1);
                } else {
                    console.log('Error: User ' + self.pkey + ' doesn`t have ' + attr + ' ' + elem);
                }
            }
            resolve(self);
        });
    }
}

// req: token
router.get('/get', function (req, res, next) {
    var up;
    token.readToken(req)
        .then(
            function (decoded) {
                var pkey = decoded.pkey;
                up = new UserParty(pkey);
            },
            function () {
                res.json({
                    message: 'failure',
                    type: 'TOKEN_INVALID'
                })
            })
        .then(function () {
            return up.load()
        })
        .then(function () {
            console.log('go')
            res.json({
                message: 'success',
                result: {
                    pkey: up.pkey,
                    session_list: up.session_list.toString()
                }
            })
        });
})

// data = [decoded, req]
var updatePartyInfo = function updatePartyInfo(type, decoded, req) {
    var pkey = decoded.pkey;

}

module.exports = router;
module.exports.UserParty = UserParty;