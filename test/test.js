
var http = require('http');
var morgan = require('..');
var should = require('should');
var request = require('supertest');

var lastLogLine;
function saveLastLogLine(line) { lastLogLine = line; }

describe('logger()', function () {
  describe('with skip option', function () {
    it('should be able to skip based on request', function (done) {
      function skip(req) { return ~req.url.indexOf('skip=true') }

      var server = createServer({'format': 'default', 'skip': skip})

      request(server)
      .get('/?skip=true')
      .set('Connection', 'close')
      .end(function (err, res) {
        if (err) return done(err)
        should.not.exist(lastLogLine)
        done()
      })
    })

    it('should be able to skip based on response', function (done) {
      function skip(req, res) { return res.statusCode === 200 }

      var server = createServer({'format': 'default', 'skip': skip})

      request(server)
      .get('/')
      .end(function (err, res) {
        if (err) return done(err)
        should.not.exist(lastLogLine)
        done()
      })
    })
  })

  describe('when Connection: close', function () {
    it('should log the client ip', function (done) {
      var server = createServer({'format': 'default'})

      request(server)
      .get('/')
      .set('Connection', 'close')
      .end(function (err, res) {
        if (err) return done(err)
        lastLogLine.should.startWith(res.text)
        done()
      })
    })
  })
})

function createServer(opts) {
  var options = opts || {}

  if (!options.stream) {
    options.stream = {'write': saveLastLogLine}
    lastLogLine = null
  }

  var logger = morgan(options)

  return http.createServer(function onRequest(req, res) {
    logger(req, res, function onNext(err) {
      res.statusCode = err ? 500 : 200
      res.end(err ? err.message : String(req.connection.remoteAddress))
    })
  })
}
