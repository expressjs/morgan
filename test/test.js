
process.env.NO_DEPRECATION = 'morgan'

var http = require('http');
var morgan = require('..');
var should = require('should');
var request = require('supertest');

var lastLogLine;
function saveLastLogLine(line) { lastLogLine = line; }

describe('logger()', function () {
  describe('arguments', function () {
    it('should use default format', function (done) {
      request(createServer())
      .get('/')
      .end(function (err, res) {
        if (err) return done(err, res)
        lastLogLine.should.startWith(res.text);
        done()
      })
    })

    describe('format', function () {
      it('should accept format as format name', function (done) {
        request(createServer('tiny'))
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          should(lastLogLine).match(/^GET \/ 200 - - \d+\.\d{3} ms\n$/)
          done()
        })
      })

      it('should accept format as format string', function (done) {
        request(createServer(':method :url'))
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          should(lastLogLine).equal('GET /\n')
          done()
        })
      })

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

      it('should accept format in options for back-compat', function (done) {
        request(createServer({format: ':method :url'}))
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          should(lastLogLine).equal('GET /\n')
          done()
        })
      })
    })
  })

  describe('tokens', function () {
    describe(':req', function () {
      it('should get request properties', function (done) {
        var server = createServer(':req[x-from-string]')

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
        var server = createServer(':res[x-sent]')

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
        var server = createServer(':remote-addr')

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal(res.text + '\n')
          done()
        })
      })

      it('should use req.ip if there', function (done) {
        var server = createServer(':remote-addr', null, function (req, res, next) {
          req.ip = '10.0.0.1'
          next()
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal('10.0.0.1\n')
          done()
        })
      })

      it('should work on https server', function (done) {
        var fs = require('fs')
        var https = require('https')
        var cert = fs.readFileSync(__dirname + '/fixtures/server.crt', 'ascii')
        var logger = createLogger(':remote-addr')
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
          lastLogLine.should.equal(res.text + '\n')
          done()
        })
      })

      it('should work when connection: close', function (done) {
        var server = createServer(':remote-addr')

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
        var server = createServer(':remote-addr', null, function (req, res, next) {
          delete req._remoteAddress
          next()
        })

        request(server.listen())
        .get('/')
        .set('Connection', 'keep-alive')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal(res.text + '\n')
          res.req.connection.destroy()
          server.close(done)
        })
      })

      it('should not fail if req.connection missing', function (done) {
        var server = createServer(':remote-addr', null, function (req, res, next) {
          delete req.connection
          delete req._remoteAddress
          next()
        })

        request(server.listen())
        .get('/')
        .set('Connection', 'keep-alive')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal(res.text + '\n')
          res.req.connection.destroy()
          server.close(done)
        })
      })
    })

    describe(':remote-user', function () {
      it('should be empty if none present', function (done) {
        var server = createServer(':remote-user')

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal('-\n')
          done()
        })
      })

      it('should support Basic authorization', function (done) {
        var server = createServer(':remote-user')

        request(server)
        .get('/')
        .set('Authorization', 'Basic dGo6')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal('tj\n')
          done()
        })
      })

      it('should be empty for empty Basic authorization user', function (done) {
        var server = createServer(':remote-user')

        request(server)
        .get('/')
        .set('Authorization', 'Basic Og==')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal('-\n')
          done()
        })
      })
    })

    describe(':response-time', function () {
      it('should be in milliseconds', function (done) {
        var start = Date.now()
        var server = createServer(':response-time')

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
        var server = createServer(':response-time', null, function (req, res, next) {
          delete req._startAt
          next()
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
        var server = createServer(':response-time', {
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
        var server = createServer(':status')

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine.should.equal(res.statusCode + '\n')
          done()
        })
      })

      it('should not exist before response sent', function (done) {
        var server = createServer(':status', {
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

      it('should not exist for aborted request', function (done) {
        var stream = {write: writeLog}
        var server = createServer(':status', {stream: stream}, function () {
          test.abort()
        })

        function writeLog(log) {
          log.should.equal('-\n')
          server.close()
          done()
        }

        var test = request(server).post('/')
        test.write('0')
      })
    })
  })

  describe('formats', function () {
    describe('combined', function () {
      it('should match expectations', function (done) {
        var server = createServer('combined')

        request(server)
        .get('/')
        .set('Authorization', 'Basic dGo6')
        .set('Referer', 'http://localhost/')
        .set('User-Agent', 'my-ua')
        .end(function (err, res) {
          if (err) return done(err)
          var line = lastLogLine.replace(/\w+, \d+ \w+ \d+ \d+:\d+:\d+ \w+/, '_timestamp_')
          line.should.equal(res.text + ' - tj [_timestamp_] "GET / HTTP/1.1" 200 - "http://localhost/" "my-ua"\n')
          done()
        })
      })
    })

    describe('common', function () {
      it('should match expectations', function (done) {
        var server = createServer('common')

        request(server)
        .get('/')
        .set('Authorization', 'Basic dGo6')
        .end(function (err, res) {
          if (err) return done(err)
          var line = lastLogLine.replace(/\w+, \d+ \w+ \d+ \d+:\d+:\d+ \w+/, '_timestamp_')
          line.should.equal(res.text + ' - tj [_timestamp_] "GET / HTTP/1.1" 200 -\n')
          done()
        })
      })
    })

    describe('default', function () {
      it('should match expectations', function (done) {
        var server = createServer('default')

        request(server)
        .get('/')
        .set('Authorization', 'Basic dGo6')
        .set('Referer', 'http://localhost/')
        .set('User-Agent', 'my-ua')
        .end(function (err, res) {
          if (err) return done(err)
          var line = lastLogLine.replace(/\w+, \d+ \w+ \d+ \d+:\d+:\d+ \w+/, '_timestamp_')
          line.should.equal(res.text + ' - tj [_timestamp_] "GET / HTTP/1.1" 200 - "http://localhost/" "my-ua"\n')
          done()
        })
      })
    })

    describe('dev', function () {
      it('should color 200 green', function (done) {
        var server = createServer('dev')

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine = lastLogLine.replace(/\x1b\[(\d+)m/g, '_color_$1_')
          lastLogLine.should.startWith('_color_0_GET / _color_32_200 _color_0_')
          lastLogLine.should.endWith('_color_0_\n')
          done()
        })
      })

      it('should color 500 red', function (done) {
        var server = createServer('dev', null, function (req, res, next) {
          res.statusCode = 500
          next()
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine = lastLogLine.replace(/\x1b\[(\d+)m/g, '_color_$1_')
          lastLogLine.should.startWith('_color_0_GET / _color_31_500 _color_0_')
          lastLogLine.should.endWith('_color_0_\n')
          done()
        })
      })

      it('should color 400 yelow', function (done) {
        var server = createServer('dev', null, function (req, res, next) {
          res.statusCode = 400
          next()
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine = lastLogLine.replace(/\x1b\[(\d+)m/g, '_color_$1_')
          lastLogLine.should.startWith('_color_0_GET / _color_33_400 _color_0_')
          lastLogLine.should.endWith('_color_0_\n')
          done()
        })
      })

      it('should color 300 cyan', function (done) {
        var server = createServer('dev', null, function (req, res, next) {
          res.statusCode = 300
          next()
        })

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          lastLogLine = lastLogLine.replace(/\x1b\[(\d+)m/g, '_color_$1_')
          lastLogLine.should.startWith('_color_0_GET / _color_36_300 _color_0_')
          lastLogLine.should.endWith('_color_0_\n')
          done()
        })
      })
    })

    describe('short', function () {
      it('should match expectations', function (done) {
        var server = createServer('short')

        request(server)
        .get('/')
        .set('Authorization', 'Basic dGo6')
        .end(function (err, res) {
          if (err) return done(err)
          var line = lastLogLine.replace(/\d+\.\d{3} ms/, '_timer_')
          line.should.equal(res.text + ' tj GET / HTTP/1.1 200 - - _timer_\n')
          done()
        })
      })
    })

    describe('tiny', function () {
      it('should match expectations', function (done) {
        var server = createServer('tiny')

        request(server)
        .get('/')
        .end(function (err, res) {
          if (err) return done(err)
          var line = lastLogLine.replace(/\d+\.\d{3} ms/, '_timer_')
          line.should.equal('GET / 200 - - _timer_\n')
          done()
        })
      })
    })
  })

  describe('with buffer option', function () {
    it('should flush log periodically', function (done) {
      var count = 0;
      var server = createServer(':method :url', {
        buffer: true,
        stream: {write: writeLog}
      })

      function writeLog(log) {
        log.should.equal('GET /first\nGET /second\n')
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
      var server = createServer(':method :url', {
        buffer: 200,
        stream: {write: writeLog}
      })

      function writeLog(log) {
        log.should.equal('GET /first\nGET /second\n')
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
      var server = createServer(':method :url :res[x-sent]', {
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

function createLogger(format, opts) {
  var args = Array.prototype.slice.call(arguments)
  var i = Number(typeof args[0] !== 'object')
  var options = args[i] || {}

  if (typeof options === 'object' && !options.stream) {
    options.stream = {'write': saveLastLogLine}
    lastLogLine = null
    args[i] = options
  }

  return morgan.apply(null, args)
}

function createServer(format, opts, fn) {
  var logger = createLogger(format, opts)
  var middle = fn || noopMiddleware
  return http.createServer(function onRequest(req, res) {
    logger(req, res, function onNext(err) {
      // allow req, res alterations
      middle(req, res, function onDone() {
        if (err) {
          res.statusCode = 500
          res.end(err.message)
        }

        res.setHeader('X-Sent', 'true')
        res.end((req.connection && req.connection.remoteAddress) || '-')
      })
    })
  })
}

function noopMiddleware(req, res, next) {
  next()
}
