var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var moment = require('moment');
var bcrypt = require('bcrypt-nodejs');
var jwt = require('jsonwebtoken');
var promise = require('promise');
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

router.get('/login/user', function (req, res, next) {
  var id = req.query.id;
  var pw = req.query.pw;
  pool.getConnection(function (err, connection) {
    var query = connection.query('select * from user where id = ?', [id], function (error, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        res.json({
          message: 'failure',
          type: 'ID_NOTFOUND'
        });
        connection.release();
        return;
      }

      if (result.length > 1) {
        res.json({
          message: 'failure',
          type: 'ID_MORETHAN2'
        });
        connection.release();
        return;
      }
      console.log(result)
      data = result[0];
      if (bcrypt.compareSync(pw, data.password)) {
        const secret = req.app.get('jwt-secret');
        const jtoken = jwt.sign({
            pkey: data.pkey,
            type: 'user',
          },
          secret, {
            expiresIn: '100y',
            issuer: 'twd',
            subject: 'userToken'
          }, (err, token) => {
            res.json({
              message: "success",
              token: token
            });
          });
      } else {
        res.json({
          message: 'failure',
          type: 'PW_UNMATCHED'
        });
        connection.release();
        return;
      }
      connection.release();
    });
    console.log(query);
  });
});

router.get('/signup/user', function (req, res, next) {
  var id = req.query.id;
  var pw_hash = bcrypt.hashSync(req.query.pw);
  var phone = req.query.phone;
  var create_time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  var name = req.query.name;
  var isError = false;
  pool.getConnection(function (err, connection) {
    var nameQuery = connection.query('select * from user where id=? or phone=? ', [id, phone], function (err, result, fields) {
      if (result.length > 0) {
        if (result[0].id == id) {
          res.json({
            message: 'failure',
            type: 'ID_EXISTS'
          });
        } else if (result[0].phone == phone) {
          res.json({
            message: 'failure',
            type: 'PHONE_EXISTS'
          });
        }
        isError = true;
        connection.release();
        return;
      };

      if (!isError) {
        var query = connection.query('insert into user (id, password, name, phone, create_time) values (?,?,?,?,?)', [id, pw_hash, name, phone, create_time],
          function (err, rows) {
            if (err) {
              connection.release();
              throw err;
            }
            console.log(rows);
            res.json({
              message: 'success'
            });
            connection.release();
          });
        console.log(query);
      }
    });
  });
});

router.get('/login/driver', function (req, res, next) {
  var phone = req.query.phone;
  pool.getConnection(function (err, connection) {
    var query = connection.query('select * from driver where phone = ?', [phone], function (error, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        res.json({
          message: 'failure',
          type: 'PHONE_NOTFOUND'
        });
        connection.release();
        return;
      }

      if (result.length > 1) {
        res.json({
          message: 'failure',
          type: 'PHONE_MORETHAN2'
        });
        connection.release();
        return;
      }
      console.log(result)
      data = result[0];
      const secret = req.app.get('jwt-secret');
      const jtoken = jwt.sign({
          pkey: data.pkey,
          type: 'driver'
        },
        secret, {
          expiresIn: '100y',
          issuer: 'twd',
          subject: 'userToken'
        }, (err, token) => {
          res.json({
            message: "success",
            token: token
          });
        });

      connection.release();
    });
    console.log(query);
  });
});

router.get('/signup/driver', function (req, res, next) {
  var phone = req.query.phone;
  var create_time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  var name = req.query.name;
  var isError = false;
  pool.getConnection(function (err, connection) {
    var nameQuery = connection.query('select * from driver where phone=? ', [phone], function (err, result, fields) {
      console.log(result)
      if (result.length > 0) {
        if (result[0].phone == phone) {
          res.json({
            message: 'failure',
            type: 'PHONE_EXISTS'
          });
        }
        isError = true;
        connection.release();
        return;
      };

      if (!isError) {
        var query = connection.query('insert into driver (name, phone, create_time) values (?,?,?)', [name, phone, create_time],
          function (err, rows) {
            if (err) {
              connection.release();
              throw err;
            }
            console.log(rows);
            res.json({
              message: 'success'
            });
            connection.release();
          });
        console.log(query);
      }
    });
  });
});

router.get('/verify-token', function (req, res, next) {
  token.readToken(req)
    .then(function (data) {
      res.json({
        message: 'success'
      });
    }, function (error) {
      res.json({
        message: 'failure',
        type: 'TOKEN_INVALID'
      });
    });
})

router.get('/get-info/self', function (req, res, next) {
  token.readToken(req)
    .then(function (data) {
      var pkey = data.pkey;
      var type = data.type;
      var query_text;
      if (type == 'user')
        query_text = 'select pkey, id, name, phone, picture from user where pkey=?'
      else if (type == 'driver')
        query_text = 'select pkey, name, phone, picture from driver where pkey=?'
      pool.getConnection(function (err, connection) {
        var query = connection.query(query_text, [pkey],
          function (error, result, fields) {
            if (error) throw error;
            if (result.length == 0) {
              res.json({
                message: 'failure',
                type: 'ID_NOTFOUND'
              });
              connection.release();
              return;
            }
            if (result.length > 1) {
              res.json({
                message: 'failure',
                type: 'ID_MORETHAN2'
              });
              connection.release();
              return;
            }
            if (type == 'user')
              res.json({
                message: 'success',
                pkey: result[0].pkey,
                id: result[0].id,
                name: result[0].name,
                phone: result[0].phone,
                picture: result[0].picture
              });
            if (type == 'driver')
              res.json({
                message: 'success',
                pkey: result[0].pkey,
                name: result[0].name,
                phone: result[0].phone,
                picture: result[0].picture
              });
            connection.release();
          });
        console.log(query);
      });
    }, function (error) {
      res.json({
        message: 'failure',
        type: 'TOKEN_INVALID'
      });
    });
});




function quote(text) {
  return "'" + text + "'"
}

module.exports = router;