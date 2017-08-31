

var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var jwt = require('jsonwebtoken');
var promise = require('promise');


var readToken = function readToken(req) {
    return new promise(function (resolve, reject) {
        var token = req.query.token;
        if (!token) {
            reject(null);
        }
        jwt.verify(token, req.app.get('jwt-secret'), function (err, decoded) {
            if (err) reject(null);
            console.log(decoded);
            resolve(decoded);
        });
    });
}


module.exports = {
    readToken: readToken
}