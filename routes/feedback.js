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

router.get('/receive', function (req, res, next) {
    token.readToken(req)
        .then(function (token) {
            var type = token.type;
            var pkey = token.pkey;
            var isDriver = -1;
            var content = req.query.content;
            if (type == 'user') {
                isDriver = 0;
            }
            if (type == 'driver') {
                isDriver = 1;
            }
            pool.getConnection(function (err, connection) {
                var query = connection.query('insert into feedback (author_key, type, content) values (?, ?, ?)', [pkey, type, content],
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

module.exports = router;