/*!
 * Connect - logger
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var path = require('path');
var fs = require('fs');
require('stream');

// TEMPORARY...
Date.prototype.toJSON = function()
{
  return (
    this.getUTCFullYear() + "-" +
    ("0" + (this.getUTCMonth() + 1)).substr(-2) + "-" +
    ("0" + this.getUTCDate()).substr(-2) + "T" +
    ("0" + this.getUTCHours()).substr(-2) + ":" +
    ("0" + this.getUTCMinutes()).substr(-2) + ":" +
    ("0" + this.getUTCSeconds()).substr(-2) + "." +
    ("00" + this.getUTCMilliseconds()).substr(-3));
};
// ...TEMPORARY


/*!
 * Default log buffer duration.
 */

var defaultBufferDuration = 1000;

/**
 * Logger:
 *
 * Log requests with the given `options` or a `format` string.
 *
 * Options:
 *
 *   - `format`  Format string, see below for tokens
 *   - `stream`  Output stream, defaults to _stdout_ unless logdir is given
 *   - `logdir`  Directory in which to place rotating logs
 *   - `retaindays` Number of days to retain log files, default 14
 *   - `buffer`  Buffer duration, defaults to 1000ms when _true_
 *   - `immediate`  Write log line on request instead of response (for response times)
 *   - `skip`    Function to determine if logging is skipped, called as
 *               `skip(req, res)`, defaults to always false.
 *
 * Tokens:
 *
 *   - `:req[header]` ex: `:req[Accept]`
 *   - `:res[header]` ex: `:res[Content-Length]`
 *   - `:http-version`
 *   - `:response-time`
 *   - `:remote-addr`
 *   - `:date`
 *   - `:method`
 *   - `:url`
 *   - `:referrer`
 *   - `:user-agent`
 *   - `:status`
 *
 * Formats:
 *
 *   Pre-defined formats that ship with connect:
 *
 *    - `default` ':remote-addr - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
 *    - `short` ':remote-addr - :method :url HTTP/:http-version :status :res[content-length] - :response-time ms'
 *    - `tiny`  ':method :url :status :res[content-length] - :response-time ms'
 *    - `dev` concise output colored by response status for development use
 *
 * Examples:
 *
 *      connect.logger() // default
 *      connect.logger('short')
 *      connect.logger('tiny')
 *      connect.logger({ immediate: true, format: 'dev' })
 *      connect.logger(':method :url - :referrer')
 *      connect.logger(':req[content-type] -> :res[content-type]')
 *      connect.logger(function(tokens, req, res){ return 'some format string' })
 *      connect.logger({ format: 'dev', skip: function(req, res){ return res.statusCode === 304; }})
 *
 * Defining Tokens:
 *
 *   To define a token, simply invoke `connect.logger.token()` with the
 *   name and a callback function. The value returned is then available
 *   as ":type" in this case.
 *
 *      connect.logger.token('type', function(req, res){ return req.headers['content-type']; })
 *
 * Defining Formats:
 *
 *   All default formats are defined this way, however it's public API as well:
 *
 *       connect.logger.format('name', 'string or function')
 *
 * @param {String|Function|Object} format or options
 * @return {Function}
 * @api public
 */

exports = module.exports = function logger(options) {
  if ('object' == typeof options) {
    options = options || {};
  } else if (options) {
    options = { format: options };
  } else {
    options = {};
  }

  // output on request instead of response
  var immediate = options.immediate;

  // check if log entry should be skipped
  var skip = options.skip || function () { return false; };

  // format name
  var fmt = exports[options.format] || options.format || exports.default;

  // compile format
  if ('function' != typeof fmt) fmt = compile(fmt);

  //
  // Allow for rotating log files in a given directory.
  //
  var logTime;
  
  // One day, in milliseconds
  var DAY = 1000 * 60 * 60 * 24;
  
  // Function to generate the filename for a log which begins "now", and open
  // a stream to that file. If this function just happens to be called twice
  // in a single millisecond, we append to the existing file rather than
  // overwriting it. Presumably that will never occur.
  function createLogStream()
  {
    // Generate the file name in the given log directory. The file name is of
    // the form, 2014-03-27T09:29:37.023
    logTime = new Date();
    var filename = 
      options.logdir + path.sep +
      logTime.getUTCFullYear() + "-" +
      ("0" + (logTime.getUTCMonth() + 1)).substr(-2) + "-" +
      ("0" + logTime.getUTCDate()).substr(-2) + "T" +
      ("0" + logTime.getUTCHours()).substr(-2) + ":" +
      ("0" + logTime.getUTCMinutes()).substr(-2) + ":" +
      ("0" + logTime.getUTCSeconds()).substr(-2) + "." +
      ("00" + logTime.getUTCMilliseconds()).substr(-3);
    
    // Create a stream to write (or append) to the file
    return fs.createWriteStream(filename, { flags : 'w+' });
  }

  // Function to rotate log files. Any files older than the number of days
  // specified by options.retaindays are removed.
  function rotateLogs()
  {
    var now = Date.now();
    
    // Get a list of files in the log directory.
    fs.readdir(
      options.logdir,
      function(err, files)
      {
        // If there was an error, we'll try rotating again later
        if (err){
          return;
        }
        
        // Remove any files which are too old
        files.forEach(
          function(name)
          {
            var fileTimestamp;
            
            // The name should be in the format described in
            // createLogStream(). Parse that date format.
            fileTimestamp = new Date(name);
            
            // Is the file older than the number of days we've been told we
            // are to retain files for?
            var expires = 
              new Date(fileTimestamp.getTime() + (DAY * options.retaindays));
            if (expires.getTime() < now){
              
              // Yup. Remove this file. Ignore errors.
              fs.unlink(options.logdir + path.sep + name);
            }
          });
      });
  }

  // See if a log directory is specified.
  if (options.logdir){
    // It is. First, set default options.
    if (typeof options.retaindays == "undefined"){
      options.retaindays = 14;
    }
  
    // Rotate logs to get rid of any old log files
    rotateLogs();
    
    // Open the initial logging stream in the specified directory
    options.stream = createLogStream();
  }

  // additional options
  var stream = options.stream || process.stdout
    , buffer = options.buffer
    , realStream = stream;

  // buffering support
  if (buffer) {
    var buf = []
      , interval = 'number' == typeof buffer
        ? buffer
        : defaultBufferDuration;

    // flush interval
    setInterval(function(){
      if (buf.length) {
        // Once per day, check for log files to be removed
        if (options.logdir &&
            options.retaindays > 0 &&
            Date.now() > logTime.getTime() + DAY){

          // It is. Rotate the logs to get rid of any old ones
          rotateLogs();
          
          // Create a new log file stream.
          realStream = createLogStream();
        }

        // Write the buffered data to the stream
        realStream.write(buf.join(''));
        buf.length = 0;
      }
    }, interval);

    // swap the stream
    stream = {
      write: function(str){
        buf.push(str);
      }
    };
  } else {
    // Not buffered. We still need to check for rotation
    stream = {
      write : function(str){
        // Once per day, check for log files to be removed
        if (options.logdir &&
            options.retaindays > 0 &&
            Date.now() > logTime.getTime() + DAY){

          // It is. Rotate the logs to get rid of any old ones
          rotateLogs();
          
          // Create a new log file stream.
          realStream = createLogStream();
        }
        
        // Write the data to the stream (unbuffered)
        realStream.write(str);
      }
    };
  }

  return function logger(req, res, next) {
    var sock = req.socket;
    req._startTime = new Date;
    req._remoteAddress = sock.socket ? sock.socket.remoteAddress : sock.remoteAddress;

    function logRequest(){
      res.removeListener('finish', logRequest);
      res.removeListener('close', logRequest);
      if (skip(req, res)) return;
      var line = fmt(exports, req, res);
      if (null == line) return;
      stream.write(line + '\n');
    };

    // immediate
    if (immediate) {
      logRequest();
    // proxy end to output logging
    } else {
      res.on('finish', logRequest);
      res.on('close', logRequest);
    }


    next();
  };
};

/**
 * Compile `fmt` into a function.
 *
 * @param {String} fmt
 * @return {Function}
 * @api private
 */

function compile(fmt) {
  fmt = fmt.replace(/"/g, '\\"');
  var js = '  return "' + fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g, function(_, name, arg){
    return '"\n    + (tokens["' + name + '"](req, res, "' + arg + '") || "-") + "';
  }) + '";'
  return new Function('tokens, req, res', js);
};

/**
 * Define a token function with the given `name`,
 * and callback `fn(req, res)`.
 *
 * @param {String} name
 * @param {Function} fn
 * @return {Object} exports for chaining
 * @api public
 */

exports.token = function(name, fn) {
  exports[name] = fn;
  return this;
};

/**
 * Define a `fmt` with the given `name`.
 *
 * @param {String} name
 * @param {String|Function} fmt
 * @return {Object} exports for chaining
 * @api public
 */

exports.format = function(name, str){
  exports[name] = str;
  return this;
};

/**
 * Default format.
 */

exports.format('default', ':remote-addr - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"');

/**
 * Short format.
 */

exports.format('short', ':remote-addr - :method :url HTTP/:http-version :status :res[content-length] - :response-time ms');

/**
 * Tiny format.
 */

exports.format('tiny', ':method :url :status :res[content-length] - :response-time ms');

/**
 * dev (colored)
 */

exports.format('dev', function(tokens, req, res){
  var bytes = require('bytes');
  var status = res.statusCode
    , len = parseInt(res.getHeader('Content-Length'), 10)
    , color = 32;

  if (status >= 500) color = 31
  else if (status >= 400) color = 33
  else if (status >= 300) color = 36;

  len = isNaN(len)
    ? ''
    : len = ' - ' + bytes(len);

  return '\x1b[90m' + req.method
    + ' ' + (req.originalUrl || req.url) + ' '
    + '\x1b[' + color + 'm' + res.statusCode
    + ' \x1b[90m'
    + (new Date - req._startTime)
    + 'ms' + len
    + '\x1b[0m';
});

/**
 * request url
 */

exports.token('url', function(req){
  return req.originalUrl || req.url;
});

/**
 * request method
 */

exports.token('method', function(req){
  return req.method;
});

/**
 * response time in milliseconds
 */

exports.token('response-time', function(req){
  return String(Date.now() - req._startTime);
});

/**
 * UTC date
 */

exports.token('date', function(){
  return new Date().toUTCString();
});

/**
 * response status code
 */

exports.token('status', function(req, res){
  return res.headersSent ? res.statusCode : null;
});

/**
 * normalized referrer
 */

exports.token('referrer', function(req){
  return req.headers['referer'] || req.headers['referrer'];
});

/**
 * remote address
 */

exports.token('remote-addr', function(req){
  if (req.ip) return req.ip;
  if (req._remoteAddress) return req._remoteAddress;
  var sock = req.socket;
  if (sock.socket) return sock.socket.remoteAddress;
  return sock.remoteAddress;
});

/**
 * HTTP version
 */

exports.token('http-version', function(req){
  return req.httpVersionMajor + '.' + req.httpVersionMinor;
});

/**
 * UA string
 */

exports.token('user-agent', function(req){
  return req.headers['user-agent'];
});

/**
 * request header
 */

exports.token('req', function(req, res, field){
  return req.headers[field.toLowerCase()];
});

/**
 * response header
 */

exports.token('res', function(req, res, field){
  return (res._headers || {})[field.toLowerCase()];
});

