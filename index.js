/*!
 * morgan
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module exports.
 * @public
 */

module.exports = Morgan

/**
 * Module dependencies.
 * @private
 */

var assert = require('assert')
var auth = require('basic-auth')
var debug = require('debug')('morgan')
var deprecate = require('depd')('morgan')
var onFinished = require('on-finished')
var onHeaders = require('on-headers')

var gFormatters = {}
var gTokens = {}

/**
 * Array of CLF month names.
 * @private
 */

var clfmonth = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

/**
 * Default log buffer duration.
 * @private
 */

var defaultBufferDuration = 1000;

/**
 * Create a logger middleware.
 *
 * @public
 * @param {String|Function} format
 * @param {Object} [options]
 * @return {Function} middleware
 */

function Morgan(options) {
  if (!(this instanceof Morgan)) {
    return new Morgan(options)
  }

  var opts = options || {}

  // output on request instead of response
  this._immediate = opts.immediate

  // check if log entry should be skipped
  this._skip = opts.skip || false

  // stream
  var buffer = opts.buffer
  this._stream = opts.stream || process.stdout

  // buffering support
  if (buffer) {
    deprecate('buffer option')

    // flush interval
    var interval = typeof buffer !== 'number'
      ? defaultBufferDuration
      : buffer

    // swap the stream
    this._stream = Morgan.createBufferStream(this._stream, interval)
  }
}

/**
 * Define a format with the given name.
 *
 * @static
 * @param {string} name
 * @param {string|function} fmt
 * @public
 */
Morgan.format = function (name, fmt) {
  gFormatters[name] = fmt
}

/**
 * Define a token function with the given name,
 * and callback fn(req, res).
 *
 * @static
 * @param {string} name
 * @param {function} fn
 * @public
 */
Morgan.token = function (name, fn) {
  gTokens[name] = fn
}

Morgan.prototype.getLogger = function (format) {
  assert (
    format,
    'Morgan.getLogger(format): format is mandatory'
  );
  assert (
    typeof format == 'string' || typeof format == 'function',
    'Morgan.getLogger(format): format must be a string or a function'
  );

  var self = this

  // format function
  self._formatLine = typeof format !== 'function'
    ? Morgan.getFormatFunction(format)
    : format

  return function logger(req, res, next) {
    // request data
    req._startAt = undefined
    req._startTime = undefined
    req._remoteAddress = getip(req)

    // response data
    res._startAt = undefined
    res._startTime = undefined

    // record request start
    recordStartTime.call(req)

    function logRequest() {
      if (self._skip !== false && self._skip(req, res)) {
        debug('skip request')
        return
      }

      var line = self._formatLine(gTokens, req, res)
      if (!line) {
        debug('skip line')
        return
      }

      debug('log request')
      self._stream.write(line + '\n')
    }

    if (self._immediate) {
      // immediate log
      logRequest()
    } else {
      // record response start
      onHeaders(res, recordStartTime)

      // log when response finished
      onFinished(res, logRequest)
    }

    next();
  }
}

/**
 * Apache combined log format.
 */
Morgan.format('combined', ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"')

/**
 * Apache common log format.
 */
Morgan.format('common', ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]')


/**
 * Short format.
 */
Morgan.format('short', ':remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms')

/**
 * Tiny format.
 */
Morgan.format('tiny', ':method :url :status :res[content-length] - :response-time ms')

/**
 * dev (colored)
 */

Morgan.format('dev', function developmentFormatLine(tokens, req, res) {
  // get the status code if response written
  var status = res._header
    ? res.statusCode
    : undefined

  // get status color
  var color = status >= 500 ? 31 // red
    : status >= 400 ? 33 // yellow
    : status >= 300 ? 36 // cyan
    : status >= 200 ? 32 // green
    : 0 // no color

  // get colored function
  var fn = developmentFormatLine[color]

  if (!fn) {
    // compile
    fn = developmentFormatLine[color] = Morgan.compile('\x1b[0m:method :url \x1b['
      + color + 'm:status \x1b[0m:response-time ms - :res[content-length]\x1b[0m')
  }

  return fn(tokens, req, res)
})

/**
 * request url
 */
Morgan.token('url', function getUrlToken(req) {
  return req.originalUrl || req.url
})

/**
 * request method
 */
Morgan.token('method', function getMethodToken(req) {
  return req.method;
});

/**
 * response time in milliseconds
 */
Morgan.token('response-time', function getResponseTimeToken(req, res, digits) {
  if (!req._startAt || !res._startAt) {
    // missing request and/or response start time
    return
  }

  // calculate diff
  var ms = (res._startAt[0] - req._startAt[0]) * 1e3
    + (res._startAt[1] - req._startAt[1]) * 1e-6

  // return truncated value
  return ms.toFixed(digits === undefined ? 3 : digits)
})

/**
 * current date
 */
Morgan.token('date', function getDateToken(req, res, format) {
  var date = new Date()

  switch (format || 'web') {
    case 'clf':
      return clfdate(date)
    case 'iso':
      return date.toISOString()
    case 'web':
      return date.toUTCString()
  }
});

/**
 * response status code
 */
Morgan.token('status', function getStatusToken(req, res) {
  return res._header
    ? String(res.statusCode)
    : undefined
})

/**
 * normalized referrer
 */
Morgan.token('referrer', function getReferrerToken(req) {
  return req.headers['referer'] || req.headers['referrer'];
});

/**
 * remote address
 */
Morgan.token('remote-addr', getip)

/**
 * remote user
 */
Morgan.token('remote-user', function getRemoteUserToken(req) {
  // parse basic credentials
  var credentials = auth(req)

  // return username
  return credentials
    ? credentials.name
    : undefined
})

/**
 * HTTP version
 */
Morgan.token('http-version', function getHttpVersionToken(req) {
  return req.httpVersionMajor + '.' + req.httpVersionMinor
})

/**
 * UA string
 */
Morgan.token('user-agent', function getUserAgentToken(req) {
  return req.headers['user-agent'];
});

/**
 * request header
 */
Morgan.token('req', function getRequestToken(req, res, field) {
  // get header
  var header = req.headers[field.toLowerCase()]

  return Array.isArray(header)
    ? header.join(', ')
    : header
})

/**
 * response header
 */
Morgan.token('res', function getResponseTime(req, res, field) {
  if (!res._header) {
    return undefined
  }

  // get header
  var header = res.getHeader(field)

  return Array.isArray(header)
    ? header.join(', ')
    : header
})

/**
 * Format a Date in the common log format.
 *
 * @private
 * @param {Date} dateTime
 * @return {string}
 */

function clfdate(dateTime) {
  var date = dateTime.getUTCDate()
  var hour = dateTime.getUTCHours()
  var mins = dateTime.getUTCMinutes()
  var secs = dateTime.getUTCSeconds()
  var year = dateTime.getUTCFullYear()

  var month = clfmonth[dateTime.getUTCMonth()]

  return pad2(date) + '/' + month + '/' + year
    + ':' + pad2(hour) + ':' + pad2(mins) + ':' + pad2(secs)
    + ' +0000'
}

/**
 * Compile a format string into a function.
 *
 * @param {string} format
 * @return {function}
 * @public
 */

Morgan.compile = function (format) {
  if (typeof format !== 'string') {
    throw new TypeError('argument format must be a string')
  }

  var fmt = format.replace(/"/g, '\\"')
  var js = '  return "' + fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g, function(_, name, arg) {
    return '"\n    + (tokens["' + name + '"](req, res, ' + String(JSON.stringify(arg)) + ') || "-") + "'
  }) + '";'

  return new Function('tokens, req, res', js)
}

/**
 * Create a basic buffering stream.
 *
 * @param {object} stream
 * @param {number} interval
 * @public
 */

Morgan.createBufferStream = function (stream, interval) {
  var buf = []
  var timer = null

  // flush function
  function flush() {
    timer = null
    stream.write(buf.join(''))
    buf.length = 0
  }

  // write function
  function write(str) {
    if (timer === null) {
      timer = setTimeout(flush, interval)
    }

    buf.push(str)
  }

  // return a minimal "stream"
  return { write: write }
}

/**
 * Lookup and compile a named format function.
 *
 * @param {string} name
 * @return {function}
 * @public
 */

Morgan.getFormatFunction = function (name) {
  // lookup format
  var fmt = gFormatters[name] || name

  // return compiled format
  return typeof fmt !== 'function'
    ? Morgan.compile(fmt)
    : fmt
}

/**
 * Get request IP address.
 *
 * @private
 * @param {IncomingMessage} req
 * @return {string}
 */

function getip(req) {
  return req.ip
    || req._remoteAddress
    || (req.connection && req.connection.remoteAddress)
    || undefined;
}

/**
 * Pad number to two digits.
 *
 * @private
 * @param {number} num
 * @return {string}
 */

function pad2(num) {
  var str = String(num)

  return (str.length === 1 ? '0' : '')
    + str
}

/**
 * Record the start time.
 * @private
 */

function recordStartTime() {
  this._startAt = process.hrtime()
  this._startTime = new Date()
}
