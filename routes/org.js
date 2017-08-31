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

router.get('/create', function (req, res, next) {
    token.readToken(req)
        .then(function (token) {
            var owner_key = token.pkey;
            var name = req.query.name;
            var host_list = [];
            var guest_list = [];
            var create_time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
            pool.getConnection(function (err, connection) {
                var query = connection.query('insert into org (owner_key, name, driver_list, user_list, create_time) values (' +
                    "'" + owner_key + "'," +
                    "'" + name + "'," +
                    "'" + host_list.toString() + "'," +
                    "'" + guest_list.toString() + "'," +
                    "'" + create_time + "');",
                    function (err, result, fields) {
                        if (err) {
                            connection.release();
                            throw err;
                        }
                        console.log(result);
                        res.json({
                            message: 'success'
                        });
                        connection.release();
                    });
                console.log(query);

            });
        }, function (res) {
            res.json({
                message: 'failure',
                type: 'TOKEN_INVALID'
            });
        });
});

router.get('/search/:filterBy', function (req, res, next) {
    token.readToken(req)
        .then(function (decoded) {
            var pkey = decoded.pkey
            var filterBy = req.params.filterBy;
            if (filterBy == 'orgkey' || filterBy == 'owner_key' || filterBy == 'name') {
                var value = req.query.value;
                pool.getConnection(function (err, connection) {
                    var query = connection.query('select orgkey, owner_key, name, driver_list, user_list from org where ' + filterBy + ' = ?', [value],
                        function (err, result, fields) {
                            if (result.length == 0) {
                                res.json({
                                    message: 'failure',
                                    type: 'ORG_NOTEXISTS'
                                });
                                connection.release();
                                return;
                            }
                            if (err) {
                                connection.release();
                                throw err;
                            }
                            console.log(result);
                            for (var i = 0; i< result.length; i++) {
                                var row = result[i];
                                if (row.owner_key != pkey) {
                                    delete row.user_list;
                                    delete row.driver_list;
                                }
                            }
                            res.json({
                                message: 'success',
                                result: result
                            })
                            connection.release();
                        });
                    console.log(query);
                });
            }
        }, function () {
            res.json({
                message: 'failure',
                type: 'TOKEN_INVALID'
            });
        });
});

router.get('/add/:type', function (req, res, next) {
    token.readToken(req)
        .then(function (token) {
            return new promise(function (resolve, reject) {
                var type = req.params.type;
                var pkey = token.pkey;
                var target_key = req.query.target_key;
                var orgkey = req.query.orgkey;
                pool.getConnection(function (err, connection) {
                    var query = connection.query('select ' + type + '_list from org where orgkey = ? and owner_key = ?', [orgkey, pkey],
                        function (err, result, fields) {
                            if (err) throw err;
                            if (result.length == 0) {
                                res.json({
                                    message: 'failure',
                                    type: 'ORG_NOTFOUND'
                                });
                                connection.release();
                                return;
                            }
                            if (result.length > 1) {
                                res.json({
                                    message: 'failure',
                                    type: 'ORG_MORETHAN2'
                                });
                                connection.release();
                                return;
                            }
                            var data = result[0];
                            var list;
                            if (data[type + '_list'] == '')
                                list = [];
                            else
                                list = data[type + '_list'].split(",");

                            console.log(list)
                            if (list.indexOf(target_key) != -1) {
                                res.json({
                                    message: 'failure',
                                    type: 'ORG_ALREADYIN'
                                })
                                connection.release();
                                return;
                            } else list.push(target_key);
                            resolve([pkey, list]);
                            connection.release();
                        });
                });
            });
        }, function () {
            res.json({
                message: 'failure',
                type: 'TOKEN_INVALID'
            });
        })
        .then(function (obj) {
            var type = req.params.type;
            var pkey = obj[0];
            var guest_list = obj[1];
            var orgkey = req.query.orgkey;
            console.log(guest_list.toString())
            pool.getConnection(function (err, connection) {
                var query = connection.query('update org set ' + type + '_list = ? where orgkey = ? and owner_key = ?', [guest_list.toString(), orgkey, pkey],
                    function (err, result, fields) {
                        console.log('resolve')
                        if (err) throw err;
                        res.json({
                            message: 'success'
                        });
                    });
                console.log(query);
            });
        }, function () {
            res.json({
                message: 'failure',
                type: 'UNKNOWN'
            });
        });
})

module.exports = router;