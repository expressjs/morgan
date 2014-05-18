
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
        var server = createServer({format: ':remote-addr'}, function (req) {
          req.ip = '10.0.0.1'
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal('10.0.0.1\n')
          done()
        })
      })

      it('should work when connection: close', function (done) {
        var server = createServer({format: ':remote-addr'})

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
        var server = createServer({format: ':remote-addr'}, function (req) {
          delete req._remoteAddress;
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

    describe(':response-time', function () {
      it('should be in milliseconds', function (done) {
        var start = Date.now()
        var server = createServer({format: ':response-time'})

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          var end = Date.now()
          var ms = parseFloat(lastLogLine)
          ms.should.be.within(0, end - start + 1)
          done()
        })
      })

      it('should be empty without hidden property', function (done) {
        var server = createServer({format: ':response-time'}, function (req) {
          delete req._startAt;
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal('-\n')
          done()
        })
      })

      it('should be empty before response', function (done) {
        var server = createServer({
          format: ':response-time',
          immediate: true
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal('-\n')
          done()
        })
      })
    })

    describe(':status', function () {
      it('should get response status', function (done) {
        var server = createServer({
          format: ':status'
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal(res.statusCode + '\n')
          done()
        })
      })

      it('should not exist before response sent', function (done) {
        var server = createServer({
          format: ':status',
          immediate: true
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal('-\n')
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

function createServer(opts, fn) {
  var options = opts || {}

  if (typeof options === 'object' && !options.stream) {
    options.stream = {'write': saveLastLogLine}
    lastLogLine = null
  }

  var logger = morgan(options)

  return http.createServer(function onRequest(req, res) {
    logger(req, res, function onNext(err) {
      if (fn) {
        // allow req, res alterations
        fn(req, res)
      }

      res.statusCode = err ? 500 : 200
      res.setHeader('X-Sent', 'true')
      res.end(err ? err.message : String(req.connection.remoteAddress))
    })
  })
}
