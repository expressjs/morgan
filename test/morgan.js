
process.env.NO_DEPRECATION = 'morgan'

var assert = require('assert')
var fs = require('fs')
var http = require('http')
var https = require('https')
var join = require('path').join
var morgan = require('..')
var request = require('supertest')
var split = require('split')

describe('morgan()', function () {
  describe('arguments', function () {
    it('should use default format', function (done) {
      var cb = after(2, function (err, res, line) {
        if (err) return done(err)
        assert(res.text.length > 0)
        assert.strictEqual(line.substr(0, res.text.length), res.text)
        done()
      })

      var stream = createLineStream(function (line) {
        cb(null, null, line)
      })

      request(createServer(undefined, { stream: stream }))
        .get('/')
        .expect(200, cb)
    })

    describe('format', function () {
      it('should accept format as format name', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert(/^GET \/ 200 - - \d+\.\d{3} ms$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer('tiny', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should accept format as format string', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, 'GET /')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':method :url', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should accept format as function', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, 'GET / 200')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        function format (tokens, req, res) {
          return [req.method, req.url, res.statusCode].join(' ')
        }

        request(createServer(format, { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should reject format as bool', function () {
        assert.throws(createServer.bind(null, true), /argument format/)
      })

      describe('back-compat', function () {
        it('should accept options object', function (done) {
          var cb = after(2, function (err, res, line) {
            if (err) return done(err)
            assert(res.text.length > 0)
            assert.strictEqual(line.substr(0, res.text.length), res.text)
            done()
          })

          var stream = createLineStream(function (line) {
            cb(null, null, line)
          })

          request(createServer({ stream: stream }))
            .get('/')
            .expect(200, cb)
        })

        it('should accept format in options for back-compat', function (done) {
          var cb = after(2, function (err, res, line) {
            if (err) return done(err)
            assert.strictEqual(line, 'GET /')
            done()
          })

          var stream = createLineStream(function (line) {
            cb(null, null, line)
          })

          request(createServer({ format: ':method :url', stream: stream }))
            .get('/')
            .expect(200, cb)
        })

        it('should accept format function in options for back-compat', function (done) {
          var cb = after(2, function (err, res, line) {
            if (err) return done(err)
            assert.strictEqual(line, 'apple')
            done()
          })

          var stream = createLineStream(function (line) {
            cb(null, null, line)
          })

          function format () {
            return 'apple'
          }

          request(createServer({ format: format, stream: stream }))
            .get('/')
            .expect(200, cb)
        })
      })
    })

    describe('stream', function () {
      beforeEach(function () {
        this.stdout = process.stdout
      })

      afterEach(function () {
        Object.defineProperty(process, 'stdout', {
          value: this.stdout
        })
      })

      it('should default to process.stdout', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert(res.text.length > 0)
          assert.strictEqual(line.substr(0, res.text.length), res.text)
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        Object.defineProperty(process, 'stdout', {
          value: stream
        })

        request(createServer(undefined, { stream: undefined }))
          .get('/')
          .expect(200, cb)
      })

      it('should set stream to write logs to', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert(res.text.length > 0)
          assert.strictEqual(line.substr(0, res.text.length), res.text)
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(undefined, { stream: stream }))
          .get('/')
          .expect(200, cb)
      })
    })
  })

  describe('tokens', function () {
    describe(':date', function () {
      it('should get current date in "web" format by default', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':date', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should get current date in "clf" format', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2} \+0000$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':date[clf]', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should get current date in "iso" format', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':date[iso]', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should get current date in "web" format', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':date[web]', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should be blank for unknown format', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '-')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':date[bogus]', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })
    })

    describe(':http-version', function () {
      it('should be 1.0 or 1.1', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^1\.[01]$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':http-version', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })
    })

    describe(':req', function () {
      it('should get request properties', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, 'me')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':req[x-from-string]', { stream: stream }))
          .get('/')
          .set('x-from-string', 'me')
          .expect(200, cb)
      })

      it('should display all values of array headers', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, 'foo=bar, fizz=buzz')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':req[set-cookie]', { stream: stream }))
          .get('/')
          .set('Set-Cookie', ['foo=bar', 'fizz=buzz'])
          .expect(200, cb)
      })
    })

    describe(':res', function () {
      it('should get response properties', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, 'true')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':res[x-sent]', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should display all values of array headers', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, 'foo, bar')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':res[x-keys]', { stream: stream }, function (req, res, next) {
          res.setHeader('X-Keys', ['foo', 'bar'])
          next()
        })

        request(server)
          .get('/')
          .expect('X-Keys', 'foo, bar')
          .expect(200, cb)
      })
    })

    describe(':remote-addr', function () {
      it('should get remote address', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(res.text.length > 0)
          assert.strictEqual(line, res.text)
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':remote-addr', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should use req.ip if there', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '10.0.0.1')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':remote-addr', { stream: stream }, null, function (req) {
          req.ip = '10.0.0.1'
        })

        request(server)
          .get('/')
          .expect(200, cb)
      })

      it('should work on https server', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(res.text.length > 0)
          assert.strictEqual(line, res.text)
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createSecureServer(':remote-addr', { stream: stream })

        request(server)
          .get('/')
          .ca(server.cert)
          .expect(200, cb)
      })

      it('should work when connection: close', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(res.text.length > 0)
          assert.strictEqual(line, res.text)
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':remote-addr', { stream: stream }))
          .get('/')
          .set('Connection', 'close')
          .expect(200, cb)
      })

      it('should work when connection: keep-alive', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(res.text.length > 0)
          assert.strictEqual(line, res.text)

          res.req.connection.destroy()
          server.close(done)
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':remote-addr', { stream: stream }, function (req, res, next) {
          delete req._remoteAddress
          next()
        })

        request(server.listen())
          .get('/')
          .set('Connection', 'keep-alive')
          .expect(200, cb)
      })

      it('should work when req.ip is a getter', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '10.0.0.1')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':remote-addr', { stream: stream }, null, function (req) {
          Object.defineProperty(req, 'ip', {
            get: function () { return req.connection.remoteAddress ? '10.0.0.1' : undefined }
          })
        })

        request(server)
          .get('/')
          .set('Connection', 'close')
          .expect(200, cb)
      })

      it('should not fail if req.connection missing', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(res.text.length > 0)
          assert.strictEqual(line, res.text)

          res.req.connection.destroy()
          server.close(done)
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':remote-addr', { stream: stream }, null, function (req) {
          delete req.connection
        })

        request(server.listen())
          .get('/')
          .set('Connection', 'keep-alive')
          .expect(200, cb)
      })
    })

    describe(':remote-user', function () {
      it('should be empty if none present', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '-')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':remote-user', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should support Basic authorization', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, 'tj')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':remote-user', { stream: stream }))
          .get('/')
          .set('Authorization', 'Basic dGo6')
          .expect(200, cb)
      })

      it('should be empty for empty Basic authorization user', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '-')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':remote-user', { stream: stream }))
          .get('/')
          .set('Authorization', 'Basic Og==')
          .expect(200, cb)
      })
    })

    describe(':response-time', function () {
      it('should be in milliseconds', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          var end = Date.now()
          var ms = parseFloat(line)
          assert(ms > 0)
          assert(ms < end - start + 1)
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var start = Date.now()

        request(createServer(':response-time', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should have three digits by default', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^[0-9]+\.[0-9]{3}$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':response-time', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should have five digits with argument "5"', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^[0-9]+\.[0-9]{5}$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':response-time[5]', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should have no digits with argument "0"', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^[0-9]+$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':response-time[0]', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should not include response write time', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          var end = Date.now()
          var ms = parseFloat(line)
          assert(ms > 0)
          assert(ms < end - start + 1)
          assert(ms < write - start + 1)
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':response-time', { stream: stream }, function (req, res) {
          res.write('hello, ')
          write = Date.now()

          setTimeout(function () {
            res.end('world!')
          }, 50)
        })

        var start = Date.now()
        var write = null

        request(server)
          .get('/')
          .expect(200, cb)
      })

      it('should be empty without hidden property', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '-')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':response-time', { stream: stream }, function (req, res, next) {
          delete req._startAt
          next()
        })

        request(server)
          .get('/')
          .expect(200, cb)
      })

      it('should be empty before response', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '-')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':response-time', {
          immediate: true,
          stream: stream
        })

        request(server)
          .get('/')
          .expect(200, cb)
      })

      it('should be empty if morgan invoked after response sent', function (done) {
        var cb = after(3, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '-')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var logger = morgan(':response-time', {
          immediate: true,
          stream: stream
        })

        var server = http.createServer(function (req, res) {
          setTimeout(function () {
            logger(req, res, cb)
          }, 10)

          res.end()
        })

        request(server)
          .get('/')
          .expect(200, cb)
      })
    })

    describe(':status', function () {
      it('should get response status', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, String(res.statusCode))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':status', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should not exist before response sent', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '-')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':status', {
          immediate: true,
          stream: stream
        })

        request(server)
          .get('/')
          .expect(200, cb)
      })

      it('should not exist for aborted request', function (done) {
        var stream = createLineStream(function (line) {
          assert.strictEqual(line, '-')
          server.close(done)
        })

        var server = createServer(':status', { stream: stream }, function () {
          test.abort()
        })

        var test = request(server).post('/')
        test.write('0')
      })
    })

    describe(':total-time', function () {
      it('should be in milliseconds', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          var end = Date.now()
          var ms = parseFloat(line)
          assert(ms > 0)
          assert(ms < end - start + 1)
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var start = Date.now()

        request(createServer(':total-time', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should have three digits by default', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^[0-9]+\.[0-9]{3}$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':total-time', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should have five digits with argument "5"', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^[0-9]+\.[0-9]{5}$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':total-time[5]', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should have no digits with argument "0"', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^[0-9]+$/.test(line))
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':total-time[0]', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should include response write time', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          var end = Date.now()
          var ms = parseFloat(line)
          assert(ms > 0)
          assert(ms > write - start - 1)
          assert(ms < end - start + 1)
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':total-time', { stream: stream }, function (req, res) {
          res.write('hello, ')
          write = Date.now()

          setTimeout(function () {
            res.end('world!')
          }, 50)
        })

        var start = Date.now()
        var write = null

        request(server)
          .get('/')
          .expect(200, cb)
      })

      it('should be empty without hidden property', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '-')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':total-time', { stream: stream }, function (req, res, next) {
          delete req._startAt
          next()
        })

        request(server)
          .get('/')
          .expect(200, cb)
      })

      it('should be empty before response', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '-')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':total-time', {
          immediate: true,
          stream: stream
        })

        request(server)
          .get('/')
          .expect(200, cb)
      })

      it('should be empty if morgan invoked after response sent', function (done) {
        var cb = after(3, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '-')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var logger = morgan(':total-time', {
          immediate: true,
          stream: stream
        })

        var server = http.createServer(function (req, res) {
          setTimeout(function () {
            logger(req, res, cb)
          }, 10)

          res.end()
        })

        request(server)
          .get('/')
          .expect(200, cb)
      })
    })

    describe(':url', function () {
      it('should get request URL', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '/foo')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':url', { stream: stream }))
          .get('/foo')
          .expect(200, cb)
      })

      it('should use req.originalUrl if exists', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, '/bar')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        var server = createServer(':url', { stream: stream }, function (req, res, next) {
          req.originalUrl = '/bar'
          next()
        })

        request(server)
          .get('/')
          .expect(200, cb)
      })

      it('should not exist for aborted request', function (done) {
        var stream = createLineStream(function (line) {
          assert.strictEqual(line, '-')
          server.close(done)
        })

        var server = createServer(':status', { stream: stream }, function () {
          test.abort()
        })

        var test = request(server).post('/')
        test.write('0')
      })
    })
  })

  describe('formats', function () {
    describe('a function', function () {
      it('should log result of function', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, 'GET / 200')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        function format (tokens, req, res) {
          return [req.method, req.url, res.statusCode].join(' ')
        }

        request(createServer(format, { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should not log for undefined return', function (done) {
        var stream = createLineStream(function () {
          throw new Error('should not log line')
        })

        function format (tokens, req, res) {
          return undefined
        }

        request(createServer(format, { stream: stream }))
          .get('/')
          .expect(200, done)
      })

      it('should not log for null return', function (done) {
        var stream = createLineStream(function () {
          throw new Error('should not log line')
        })

        function format (tokens, req, res) {
          return null
        }

        request(createServer(format, { stream: stream }))
          .get('/')
          .expect(200, done)
      })
    })

    describe('a string', function () {
      it('should accept format as format string of tokens', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, 'GET /')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer(':method :url', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should accept text mixed with tokens', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, 'method=GET url=/')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer('method=:method url=:url', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })

      it('should accept special characters', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line, 'LOCAL\\tobi "GET /" 200')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer('LOCAL\\:remote-user ":method :url" :status', { stream: stream }))
          .get('/')
          .set('Authorization', 'Basic dG9iaTpsb2tp')
          .expect(200, cb)
      })
    })

    describe('combined', function () {
      it('should match expectations', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          var masked = line.replace(/\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2} \+0000/, '_timestamp_')
          assert.strictEqual(masked, res.text + ' - tj [_timestamp_] "GET / HTTP/1.1" 200 - "http://localhost/" "my-ua"')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer('combined', { stream: stream }))
          .get('/')
          .set('Authorization', 'Basic dGo6')
          .set('Referer', 'http://localhost/')
          .set('User-Agent', 'my-ua')
          .expect(200, cb)
      })
    })

    describe('common', function () {
      it('should match expectations', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          var masked = line.replace(/\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2} \+0000/, '_timestamp_')
          assert.strictEqual(masked, res.text + ' - tj [_timestamp_] "GET / HTTP/1.1" 200 -')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer('common', { stream: stream }))
          .get('/')
          .set('Authorization', 'Basic dGo6')
          .expect(200, cb)
      })
    })

    describe('default', function () {
      it('should match expectations', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          var masked = line.replace(/\w+, \d+ \w+ \d+ \d+:\d+:\d+ \w+/, '_timestamp_')
          assert.strictEqual(masked, res.text + ' - tj [_timestamp_] "GET / HTTP/1.1" 200 - "http://localhost/" "my-ua"')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer('default', { stream: stream }))
          .get('/')
          .set('Authorization', 'Basic dGo6')
          .set('Referer', 'http://localhost/')
          .set('User-Agent', 'my-ua')
          .expect(200, cb)
      })
    })

    describe('dev', function () {
      it('should not color 1xx', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line.substr(0, 36), '_color_0_GET / _color_0_102_color_0_')
          assert.strictEqual(line.substr(-9), '_color_0_')
          done()
        })

        var stream = createColorLineStream(function onLine (line) {
          cb(null, null, line)
        })

        var server = createServer('dev', { stream: stream }, function (req, res, next) {
          res.statusCode = 102
          next()
        })

        request(server)
          .get('/')
          .expect(102, function (err, res) {
            if (err && err.code === 'ECONNRESET') {
              // finishing response with 1xx is invalid http
              // but node.js server lets the server do this, so
              // morgan needs to test in this condition even if
              // the http client doesn't like it
              err = null
            }
            cb(err, res)
          })
      })

      it('should color 2xx green', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line.substr(0, 37), '_color_0_GET / _color_32_200_color_0_')
          assert.strictEqual(line.substr(-9), '_color_0_')
          done()
        })

        var stream = createColorLineStream(function onLine (line) {
          cb(null, null, line)
        })

        var server = createServer('dev', { stream: stream }, function (req, res, next) {
          res.statusCode = 200
          next()
        })

        request(server)
          .get('/')
          .expect(200, cb)
      })

      it('should color 3xx cyan', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line.substr(0, 37), '_color_0_GET / _color_36_300_color_0_')
          assert.strictEqual(line.substr(-9), '_color_0_')
          done()
        })

        var stream = createColorLineStream(function onLine (line) {
          cb(null, null, line)
        })

        var server = createServer('dev', { stream: stream }, function (req, res, next) {
          res.statusCode = 300
          next()
        })

        request(server)
          .get('/')
          .expect(300, cb)
      })

      it('should color 4xx yelow', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line.substr(0, 37), '_color_0_GET / _color_33_400_color_0_')
          assert.strictEqual(line.substr(-9), '_color_0_')
          done()
        })

        var stream = createColorLineStream(function onLine (line) {
          cb(null, null, line)
        })

        var server = createServer('dev', { stream: stream }, function (req, res, next) {
          res.statusCode = 400
          next()
        })

        request(server)
          .get('/')
          .expect(400, cb)
      })

      it('should color 5xx red', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.strictEqual(line.substr(0, 37), '_color_0_GET / _color_31_500_color_0_')
          assert.strictEqual(line.substr(-9), '_color_0_')
          done()
        })

        var stream = createColorLineStream(function onLine (line) {
          cb(null, null, line)
        })

        var server = createServer('dev', { stream: stream }, function (req, res, next) {
          res.statusCode = 500
          next()
        })

        request(server)
          .get('/')
          .expect(500, cb)
      })

      describe('with "immediate: true" option', function () {
        it('should not have color or response values', function (done) {
          var cb = after(2, function (err, res, line) {
            if (err) return done(err)
            assert.strictEqual(line, '_color_0_GET / _color_0_-_color_0_ - ms - -_color_0_')
            done()
          })

          var stream = createColorLineStream(function onLine (line) {
            cb(null, null, line)
          })

          var server = createServer('dev', {
            immediate: true,
            stream: stream
          })

          request(server)
            .get('/')
            .expect(200, cb)
        })
      })
    })

    describe('short', function () {
      it('should match expectations', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          var masked = line.replace(/\d+\.\d{3} ms/, '_timer_')
          assert.strictEqual(masked, res.text + ' tj GET / HTTP/1.1 200 - - _timer_')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer('short', { stream: stream }))
          .get('/')
          .set('Authorization', 'Basic dGo6')
          .expect(200, cb)
      })
    })

    describe('tiny', function () {
      it('should match expectations', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          var masked = line.replace(/\d+\.\d{3} ms/, '_timer_')
          assert.strictEqual(masked, 'GET / 200 - - _timer_')
          done()
        })

        var stream = createLineStream(function (line) {
          cb(null, null, line)
        })

        request(createServer('tiny', { stream: stream }))
          .get('/')
          .expect(200, cb)
      })
    })
  })

  describe('with buffer option', function () {
    it('should flush log periodically', function (done) {
      var cb = after(2, function (err, res, log) {
        if (err) return done(err)
        assert.strictEqual(log, 'GET /first\nGET /second\n')
        assert.ok(Date.now() - time >= 1000)
        assert.ok(Date.now() - time <= 1100)
        done()
      })
      var server = createServer(':method :url', {
        buffer: true,
        stream: { write: writeLog }
      })
      var time = Date.now()

      function writeLog (log) {
        cb(null, null, log)
      }

      request(server)
        .get('/first')
        .expect(200, function (err) {
          if (err) return cb(err)
          request(server)
            .get('/second')
            .expect(200, cb)
        })
    })

    it('should accept custom interval', function (done) {
      var cb = after(2, function (err, res, log) {
        if (err) return done(err)
        assert.strictEqual(log, 'GET /first\nGET /second\n')
        assert.ok(Date.now() - time >= 200)
        assert.ok(Date.now() - time <= 300)
        done()
      })
      var server = createServer(':method :url', {
        buffer: 200,
        stream: { write: writeLog }
      })
      var time = Date.now()

      function writeLog (log) {
        cb(null, null, log)
      }

      request(server)
        .get('/first')
        .expect(200, function (err) {
          if (err) return cb(err)
          request(server)
            .get('/second')
            .expect(200, cb)
        })
    })
  })

  describe('with immediate option', function () {
    it('should not have value for :res', function (done) {
      var cb = after(2, function (err, res, line) {
        if (err) return done(err)
        assert.strictEqual(line, 'GET / -')
        done()
      })

      var stream = createLineStream(function (line) {
        cb(null, null, line)
      })

      var server = createServer(':method :url :res[x-sent]', {
        immediate: true,
        stream: stream
      })

      request(server)
        .get('/')
        .expect(200, cb)
    })

    it('should not have value for :response-time', function (done) {
      var cb = after(2, function (err, res, line) {
        if (err) return done(err)
        assert.strictEqual(line, 'GET / -')
        done()
      })

      var stream = createLineStream(function (line) {
        cb(null, null, line)
      })

      var server = createServer(':method :url :response-time', {
        immediate: true,
        stream: stream
      })

      request(server)
        .get('/')
        .expect(200, cb)
    })

    it('should not have value for :status', function (done) {
      var cb = after(2, function (err, res, line) {
        if (err) return done(err)
        assert.strictEqual(line, 'GET / -')
        done()
      })

      var stream = createLineStream(function (line) {
        cb(null, null, line)
      })

      var server = createServer(':method :url :status', {
        immediate: true,
        stream: stream
      })

      request(server)
        .get('/')
        .expect(200, cb)
    })

    it('should log before response', function (done) {
      var lineLogged = false
      var cb = after(2, function (err, res, line) {
        if (err) return done(err)
        assert.strictEqual(line, 'GET / -')
        done()
      })

      var stream = createLineStream(function (line) {
        lineLogged = true
        cb(null, null, line)
      })

      var server = createServer(':method :url :res[x-sent]', { immediate: true, stream: stream }, function (req, res, next) {
        assert.ok(lineLogged)
        next()
      })

      request(server)
        .get('/')
        .expect(200, cb)
    })
  })

  describe('with skip option', function () {
    it('should be able to skip based on request', function (done) {
      var stream = createLineStream(function () {
        throw new Error('should not log line')
      })

      function skip (req) {
        return req.url.indexOf('skip=true') !== -1
      }

      request(createServer({ format: 'default', skip: skip, stream: stream }))
        .get('/?skip=true')
        .set('Connection', 'close')
        .expect(200, done)
    })

    it('should be able to skip based on response', function (done) {
      var stream = createLineStream(function () {
        throw new Error('should not log line')
      })

      function skip (req, res) {
        return res.statusCode === 200
      }

      request(createServer({ format: 'default', skip: skip, stream: stream }))
        .get('/')
        .expect(200, done)
    })
  })
})

describe('morgan.compile(format)', function () {
  describe('arguments', function () {
    describe('format', function () {
      it('should be required', function () {
        assert.throws(morgan.compile.bind(morgan), /argument format/)
      })

      it('should reject functions', function () {
        assert.throws(morgan.compile.bind(morgan, function () {}), /argument format/)
      })

      it('should reject numbers', function () {
        assert.throws(morgan.compile.bind(morgan, 42), /argument format/)
      })

      it('should compile a string into a function', function () {
        var fn = morgan.compile(':method')
        assert.ok(typeof fn === 'function')
        assert.ok(fn.length === 3)
      })
    })
  })
})

function after (count, callback) {
  var args = new Array(3)
  var i = 0

  return function (err, arg1, arg2) {
    assert.ok(i++ < count, 'callback called ' + count + ' times')

    args[0] = args[0] || err
    args[1] = args[1] || arg1
    args[2] = args[2] || arg2

    if (count === i) {
      callback.apply(null, args)
    }
  }
}

function createColorLineStream (callback) {
  return createLineStream(function onLine (line) {
    callback(expandColorCharacters(line))
  })
}

function createLineStream (callback) {
  return split().on('data', callback)
}

function createRequestListener (format, opts, fn, fn1) {
  var logger = morgan(format, opts)
  var middle = fn || noopMiddleware

  return function onRequest (req, res) {
    // prior alterations
    if (fn1) {
      fn1(req, res)
    }

    logger(req, res, function onNext (err) {
      // allow req, res alterations
      middle(req, res, function onDone () {
        if (err) {
          res.statusCode = 500
          res.end(err.message)
        }

        res.setHeader('X-Sent', 'true')
        res.end((req.connection && req.connection.remoteAddress) || '-')
      })
    })
  }
}

function createSecureServer (format, opts, fn, fn1) {
  var cert = fs.readFileSync(join(__dirname, 'fixtures', 'server.crt'), 'ascii')
  var key = fs.readFileSync(join(__dirname, 'fixtures', 'server.key'), 'ascii')

  return https.createServer({ cert: cert, key: key })
    .on('request', createRequestListener(format, opts, fn, fn1))
}

function createServer (format, opts, fn, fn1) {
  return http.createServer()
    .on('request', createRequestListener(format, opts, fn, fn1))
}

function expandColorCharacters (str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[(\d+)m/g, '_color_$1_')
}

function noopMiddleware (req, res, next) {
  next()
}
