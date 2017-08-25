var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var moment = require('moment');
var jwt = require('jsonwebtoken');

var pool = mysql.createPool({
    host: "taewoondang.c0fywvxlr71j.ap-northeast-2.rds.amazonaws.com",
    port: 3306,
    user: "twd",
    password: "xodnsekd1",
    database: "Taewoondang",
    connectionLimit: 20,
    waitForConnections: true
});

router.get('/create-session', function (req, res, next) {
    var token = readToken(req);
    // res.send('hi')
    res.send(token)
    var departure = req.query.departure;
    // var route = API call;
    // var create_time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    // pool.getConnection(function (err, connection) {
    //     var query = connection.query('insert into session (hostId, departure, route, create_time) values (' +
    //         "'" + hostId + "'," +
    //         "'" + departure + "'," +
    //         "'" + route + "'," +
    //         "'" + create_time + "');",
    //         function (err, rows) {
    //             if (err) {
    //                 connection.release();
    //                 throw err;
    //             }
    //             console.log(rows);
    //             res.json(rows);
    //             connection.release();
    //         });
    //     console.log(query);
    // });
});

router.get('/join-session', function (req, res, next) {
    var sessionId = req.query.sessionId;
    var token = req.query.token;
});

function readToken(req) {
    var token = req.query.token;
    console.log(token)
    if (!token) {
        return null;
    }
    jwt.verify(token, req.app.get('jwt-secret')), (err, decoded) => {
        if (err) throw err;
        console.log(decoded)
        return decoded;
    }
}

module.exports = router;