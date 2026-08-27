
process.env.NO_DEPRECATION = 'morgan'
// read once at require time, hence a separate file from test/morgan.js
process.env.NO_COLOR = '1'

var assert = require('assert')
var http = require('http')
var morgan = require('..')
var request = require('supertest')
var split = require('split')

describe('morgan()', function () {
  describe('formats', function () {
    describe('dev', function () {
      it('should not color 1xx', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assertPlainDevLine(line, 102)
          done()
        })

        var stream = createLineStream(function onLine (line) {
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

      it('should not color 2xx', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assertPlainDevLine(line, 200)
          done()
        })

        var stream = createLineStream(function onLine (line) {
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

      it('should not color 3xx', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assertPlainDevLine(line, 300)
          done()
        })

        var stream = createLineStream(function onLine (line) {
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

      it('should not color 4xx', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assertPlainDevLine(line, 400)
          done()
        })

        var stream = createLineStream(function onLine (line) {
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

      it('should not color 5xx', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assertPlainDevLine(line, 500)
          done()
        })

        var stream = createLineStream(function onLine (line) {
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

      it('should match the documented dev format', function (done) {
        var cb = after(2, function (err, res, line) {
          if (err) return done(err)
          assert.ok(/^GET \/ 200 \d+\.\d{3} ms - -$/.test(line),
            'unexpected line ' + JSON.stringify(line))
          done()
        })

        var stream = createLineStream(function onLine (line) {
          cb(null, null, line)
        })

        request(createServer('dev', { stream: stream }))
          .get('/')
          .expect(200, cb)
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

function assertPlainDevLine (line, status) {
  assert.strictEqual(line.indexOf('\x1b'), -1, 'expected no escapes in ' + JSON.stringify(line))
  assert.ok(
    new RegExp('^GET / ' + status + ' \\d+\\.\\d{3} ms - (\\d+|-)$').test(line),
    'unexpected line ' + JSON.stringify(line)
  )
}

function createLineStream (callback) {
  return split().on('data', callback)
}

function createServer (format, opts, fn, fn1) {
  var logger = morgan(format, opts)
  var middle = fn || noopMiddleware

  return http.createServer().on('request', function onRequest (req, res) {
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
  })
}

function noopMiddleware (req, res, next) {
  next()
}
