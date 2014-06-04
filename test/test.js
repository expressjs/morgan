
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
          lastLogLine.should.equal('me')
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
          lastLogLine.should.equal('true')
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
          lastLogLine.should.equal(res.text)
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
          lastLogLine.should.equal('10.0.0.1')
          done()
        })
      })

      it('should work on https server', function (done) {
        var fs = require('fs')
        var https = require('https')
        var cert = fs.readFileSync(__dirname + '/fixtures/server.crt', 'ascii')
        var logger = createLogger({format: ':remote-addr'})
        var server = https.createServer({
          key: fs.readFileSync(__dirname + '/fixtures/server.key', 'ascii'),
          cert: cert
        })

        server.on('request', function (req, res) {
          logger(req, res, function (err) {
            delete req._remoteAddress
            res.end(req.connection.remoteAddress)
          })
        })

        var agent = new https.Agent({ca: cert})
        var createConnection = agent.createConnection

        agent.createConnection = function (options) {
          options.servername = 'morgan.local'
          return createConnection.call(this, options)
        };

        var req = request(server).get('/')
        req.agent(agent)
        req.end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal(res.text)
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
          lastLogLine.should.equal(res.text)
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
          lastLogLine.should.equal(res.text)
          done()
        })
      })

      it('should not fail if req.connection missing', function (done) {
        var server = createServer({format: ':remote-addr'}, function (req) {
          delete req.connection;
          delete req._remoteAddress;
        })

        request(server)
        .get('/')
        .set('Connection', 'keep-alive')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal(res.text)
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
          lastLogLine.should.equal('-')
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
          lastLogLine.should.equal('-')
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
          lastLogLine.should.eql(res.statusCode)
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
          lastLogLine.should.equal('-')
          done()
        })
      })
    })
  })

  describe('formats', function () {
    describe('default', function () {
      it('should match expectations', function (done) {
        var server = createServer({format: 'default'})

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.startWith(res.text + ' - - ')
          lastLogLine.should.containEql('"GET / HTTP/1.1"')
          done()
        })
      })
    })

    describe('dev', function () {
      it('should color 200 green', function (done) {
        var server = createServer({format: 'dev'})

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine = lastLogLine.replace(/\x1b\[(\d+)m/g, '_color_$1_')
          lastLogLine.should.startWith('_color_90_GET / _color_32_200 _color_90_')
          lastLogLine.should.endWith('_color_0_')
          done()
        })
      })

      it('should color 500 red', function (done) {
        var server = createServer({format: 'dev'}, function (req, res) {
          res.statusCode = 500
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine = lastLogLine.replace(/\x1b\[(\d+)m/g, '_color_$1_')
          lastLogLine.should.startWith('_color_90_GET / _color_31_500 _color_90_')
          lastLogLine.should.endWith('_color_0_')
          done()
        })
      })

      it('should color 400 yelow', function (done) {
        var server = createServer({format: 'dev'}, function (req, res) {
          res.statusCode = 400
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine = lastLogLine.replace(/\x1b\[(\d+)m/g, '_color_$1_')
          lastLogLine.should.startWith('_color_90_GET / _color_33_400 _color_90_')
          lastLogLine.should.endWith('_color_0_')
          done()
        })
      })

      it('should color 300 cyan', function (done) {
        var server = createServer({format: 'dev'}, function (req, res) {
          res.statusCode = 300
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine = lastLogLine.replace(/\x1b\[(\d+)m/g, '_color_$1_')
          lastLogLine.should.startWith('_color_90_GET / _color_36_300 _color_90_')
          lastLogLine.should.endWith('_color_0_')
          done()
        })
      })
    })

    describe('short', function () {
      it('should match expectations', function (done) {
        var server = createServer({format: 'short'})

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.startWith(res.text + ' - GET / HTTP/1.1')
          done()
        })
      })
    })

    describe('tiny', function () {
      it('should match expectations', function (done) {
        var server = createServer({format: 'tiny'})

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.startWith('GET / 200')
          done()
        })
      })
    })
  })

  describe('with buffer option', function () {
    it('should flush log periodically', function (done) {
      var count = 0;
      var server = createServer({
        buffer: true,
        format: ':method :url',
        stream: {write: writeLog}
      })

      function writeLog(log) {
        log.should.equal('GET /firstGET /second')
        server.close()
        done()
      }

      server = server.listen()
      request(server)
      .get('/first')
      .end(function (err, res) {
        if (err) throw err
        count++
        request(server)
        .get('/second')
        .end(function (err, res) {
          if (err) throw err
          count++
        })
      })
    })

    it('should accept custom interval', function (done) {
      var count = 0;
      var server = createServer({
        buffer: 200,
        format: ':method :url',
        stream: {write: writeLog}
      })

      function writeLog(log) {
        log.should.equal('GET /firstGET /second')
        server.close()
        done()
      }

      server = server.listen()
      request(server)
      .get('/first')
      .end(function (err, res) {
        if (err) throw err
        count++
        request(server)
        .get('/second')
        .end(function (err, res) {
          if (err) throw err
          count++
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
        lastLogLine.should.equal('GET / -')
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

function createLogger(opts) {
  var options = opts || {}

  if (typeof options === 'object' && !options.stream) {
    options.stream = {'write': saveLastLogLine}
    lastLogLine = null
  }

  return morgan(options)
}

function createServer(opts, fn) {
  var logger = createLogger(opts)
  return http.createServer(function onRequest(req, res) {
    logger(req, res, function onNext(err) {
      if (fn) {
        // allow req, res alterations
        fn(req, res)
      }

      if (err) {
        res.statusCode = 500
        res.end(err.message)
      }

      res.setHeader('X-Sent', 'true')
      res.end((req.connection && req.connection.remoteAddress) || '-')
    })
  })
}
