var connect = require('connect');
var should = require('should');
var request = require('supertest');

var logger = require('..');

var lastLogLine;
function saveLastLogLine(line) { lastLogLine = line; }

describe('logger()', function () {
  describe('when Connection: close', function () {
    it('should log the client ip', function (done) {
      var app = connect();

      app.use(logger({'format': 'default', 'stream': {'write': saveLastLogLine}}));
      app.use(function (req, res) {
        res.end(req.connection.remoteAddress);
      });

      lastLogLine = null;

      request(app.listen())
      .get('/')
      .set('Connection', 'close')
      .end(function (err, res) {
        if (err) return done(err);
        lastLogLine.should.startWith(res.text);
        done();
      });
    })

    it('should be able to skip based on request', function (done) {
      var app = connect();

      function skip(req) { return req.query.skip; }

      app.use(function (req, res, next) {
        req.query = {
          skip: true
        };
        next();
      })
      app.use(logger({'format': 'default', 'skip': skip, 'stream': {'write': saveLastLogLine}}));
      app.use(function (req, res) {
        res.end(req.connection.remoteAddress);
      });

      lastLogLine = null;

      request(app.listen())
      .get('/?skip=true')
      .set('Connection', 'close')
      .end(function (err, res) {
        if (err) return done(err);
        should.not.exist(lastLogLine);
        done();
      });
    });

    it('should be able to skip based on response', function (done) {
      var app = connect();

      function skip(req, res) { return res.statusCode === 304; }

      app.use(logger({'format': 'default', 'skip': skip, 'stream': {'write': saveLastLogLine}}));
      app.use(function (req, res) {
        res.statusCode = 304;
        res.end(req.connection.remoteAddress);
      });

      lastLogLine = null;

      request(app.listen())
      .get('/')
      .end(function (err, res) {
        if (err) return done(err);
        should.not.exist(lastLogLine);
        done();
      });
    });
  })
});
