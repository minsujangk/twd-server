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

class UserParty {
    constructor(pkey) {
        this.pkey = pkey;
    }

    load(self) {
        return new promise(function (resolve, reject) {
            pool.getConnection(function (err, connection) {
                var query = connection.query('select * from user_party where pkey = ?', [self.pkey],
                    function (err, result, fields) {
                        if (err) {
                            connection.release();
                            throw err;
                        }
                        if (result.length == 0) {
                            // there is no row
                            var qq = connection.query('insert into user_part (pkey) values (?)', [self.pkey],
                                function (err, result, fields) {
                                    if (err) {
                                        connection.release();
                                        throw err;
                                    }
                                    resolve();
                                });
                        }
                        connection.release();
                        console.log(result)
                        var data = result[0];
                        self.org_list = data.org_list.split(",").map(function (item) {
                            return parseInt(item, 10)
                        });
                        self.session_list = data.session_list.split(",").map(function (item) {
                            return parseInt(item, 10)
                        });
                        resolve();
                    });
                console.log(query);
            });
        });
    }

    update(self) {
        var query_text = 'update user_party set org_list = ?, session_list = ? where pkey = ?'
        pool.getConnection(function (err, connection) {
            var query = connection.query(query_text, [self.org_list, self.session_list, self.pkey],
                function (err, result, fields) {
                    if (err) {
                        connection.release();
                        throw err;
                    }
                    console.log(result);
                });
            console.log(query);
        });
    }
}

router.get('/get', function (req, res, next) {
    token.readToken(req)
        .then(function getPartyInfo(decoded) {
                var pkey = decoded.pkey;
                var query_text = 'select org, session from user_party where pkey = ?'
                pool.getConnection(function (err, connection) {
                    var query = connection.query(query_text, [pkey], function (err, result, fields) {
                        if (err) {
                            connection.release();
                            throw err;
                        }
                        if (result.length == 0) {
                            res.json({
                                message: 'failure',
                                type: 'USER_NOT_EXIST'
                            });
                        }
                        if (result.length > 1) {
                            res.json({
                                message: 'failure',
                                type: 'USER_MORETHAN2'
                            });
                        }
                        res.json({
                            message: 'success',
                            result: {
                                org: result[0].org,
                                session: result[0].session
                            }
                        })
                    });
                });
            },
            function () {
                res.json({
                    message: 'failure',
                    type: 'TOKEN_INVALID'
                })
            });
});

// data = [decoded, req]
var updatePartyInfo = function updatePartyInfo(type, decoded, req) {
    var pkey = decoded.pkey;

}

module.exports = {
    router,
    UserParty: UserParty,
    getPartyInfo: getPartyInfo
}