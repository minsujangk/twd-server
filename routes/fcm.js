fmsvar express = require('express');
var mysql = require('mysql');
var router = express.Router();
var moment = require('moment');
var token = require('./token');

var pool = mysql.createPool({
    host: "taewoondang.c0fywvxlr71j.ap-northeast-2.rds.amazonaws.com",
    port: 3306,
    user: "twd",
    password: "xodnsekd1",
    database: "Taewoondang",
    connectionLimit: 20,
    waitForConnections: true
});

router.get('/update', function (req, res, next) {
    token.readToken(req)
        .then(function (token) {
            var pkey = token.pkey;
            var fcm_token = req.query.fcm_token;
            pool.getConnection(function (err, connection) {
                var query = connection.query('insert into fcm (pkey, fcm_token) values (?, ?) on duplicate key update fcm_token = ?', [pkey, fcm_token, fcm_token],
                    function (err, result, fields) {
                        if (err) {
                            connection.release();
                            throw err;
                        }
                        console.log(result)
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