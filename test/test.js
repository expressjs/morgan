
var http = require('http');
var morgan = require('..');
var should = require('should');
var request = require('supertest');

var lastLogLine;
function saveLastLogLine(line) { lastLogLine = line; }

describe('logger()', function () {
  describe('arguments', function () {
    it('should accept format as function', function (done) {
      var line;
      var server = createServer(function (tokens, req, res) {
        line = [req.method, req.url, res.statusCode].join(' ') + '\n'
      })

      request(server)
      .get('/')
      .end(function (err, res) {
        if (err) return done(err)
        line.should.equal('GET / 200\n')
        done()
      })
    })

    it('should use default format', function (done) {
      var server = createServer({})

      request(server)
      .get('/')
      .end(function (err, res) {
        if (err) return done(err, res)
        lastLogLine.should.startWith(res.text);
        done()
      })
    })
  })

  describe('tokens', function () {
    describe(':req', function () {
      it('should get request properties', function (done) {
        var server = createServer({
          format: ':req[x-from-string]'
        })

        request(server)
        .get('/')
        .set('x-from-string', 'me')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal('me\n')
          done()
        })
      })
    })

    describe(':res', function () {
      it('should get response properties', function (done) {
        var server = createServer({
          format: ':res[x-sent]'
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal('true\n')
          done()
        })
      })
    })

    describe(':remote-addr', function () {
      it('should get remote address', function (done) {
        var server = createServer({
          format: ':remote-addr'
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal(res.text + '\n')
          done()
        })
      })

      it('should use req.ip if there', function (done) {
        var server = createServer({
          format: ':remote-addr'
        })

        request(server)
        .get('/')
        .set('x-req-ip', '10.0.0.1')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal('10.0.0.1\n')
          done()
        })
      })

      it('should work when connection: close', function (done) {
        var server = createServer({
          format: ':remote-addr'
        })

        request(server)
        .get('/')
        .set('Connection', 'close')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal(res.text + '\n')
          done()
        })
      })

      it('should work when connection: keep-alive', function (done) {
        var server = createServer({
          format: ':remote-addr'
        })

        request(server)
        .get('/')
        .set('Connection', 'keep-alive')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal(res.text + '\n')
          done()
        })
      })
    })
  })

  describe('with immediate option', function () {
    it('should log before response', function (done) {
      var server = createServer({
        format: ':method :url :res[x-sent]',
        immediate: true
      })

      request(server)
      .get('/')
      .end(function (err, res) {
        if (err) return done(err)
        lastLogLine.should.equal('GET / -\n')
        done()
      })
    })
  })

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
})

function createServer(opts) {
  var options = opts || {}

  if (typeof options === 'object' && !options.stream) {
    options.stream = {'write': saveLastLogLine}
    lastLogLine = null
  }

  var logger = morgan(options)

  return http.createServer(function onRequest(req, res) {
    if (req.headers['x-req-ip']) {
      req.ip = req.headers['x-req-ip'];
    }

    logger(req, res, function onNext(err) {
      if (!/close/i.test(req.headers.connection)) {
        delete req._remoteAddress;
      }

      res.statusCode = err ? 500 : 200
      res.setHeader('X-Sent', 'true')
      res.end(err ? err.message : String(req.connection.remoteAddress))
    })
  })
}
