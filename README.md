# morgan

[![NPM version](https://badge.fury.io/js/morgan.svg)](http://badge.fury.io/js/morgan)
[![Build Status](https://travis-ci.org/expressjs/morgan.svg?branch=master)](https://travis-ci.org/expressjs/morgan)
[![Coverage Status](https://img.shields.io/coveralls/expressjs/morgan.svg?branch=master)](https://coveralls.io/r/expressjs/morgan)

HTTP request logger middleware for node.js

> Named after [Dexter](http://en.wikipedia.org/wiki/Dexter_Morgan), a show you should not watch until completion.

## API

```js
var express = require('express')
var morgan  = require('morgan')

var app = express()
app.use(morgan('combined'))
```

### morgan(format, options)

Create a new morgan logger middleware function using the given `format` and `options`.
The `format` argument may be a string of a predefined name (see below for the names),
a string of a format string, or a function that will produce a log entry.

```js
// a pre-defined name
morgan('combined')

// a format string
morgan(':remote-addr :method :url')

// a custom function
morgan(function (req, res) {
  return req.method + ' ' + req.url
})
```

#### Options

Morgan accepts these properties in the options object.

#### buffer

Buffer duration before writing logs to the `stream`, defaults to `false`. When
set to `true`, defaults to `1000 ms`.

#### immediate

Write log line on request instead of response. This means that a  requests will
be logged even if the server crashes, but data from the response cannot be logged
(like the response code).

##### skip

Function to determine if logging is skipped, defaults to `false`. This function
will be called as `skip(req, res)`.

```js
// only log error responses
morgan('combined', {
  skip: function (req, res) { return res.statusCode < 400 }
})
```

##### stream

Output stream for writing log lines, defaults to `process.stdout`.

#### Predefined Formats

There are various pre-defined formats provided:

##### combined

Standard Apache combined log output.

```
:remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"
```

##### common

Standard Apache common log output.

```
:remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length]
```

##### dev

Concise output colored by response status for development use. The `:status`
token will be colored red for server error codes, yellow for client error
codes, cyan for redirection codes, and uncolored for all other codes.

```
:method :url :status :response-time ms - :res[content-length]
```

##### short

Shorter than default, also including response time.

```
:remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms
```

##### tiny

The minimal output.

```
:method :url :status :res[content-length] - :response-time ms
```

#### Tokens

- `:req[header]` ex: `:req[Accept]`
- `:res[header]` ex: `:res[Content-Length]`
- `:http-version`
- `:response-time`
- `:remote-addr`
- `:remote-user`
- `:date`
- `:method`
- `:url`
- `:referrer`
- `:user-agent`
- `:status`

To define a token, simply invoke `morgan.token()` with the name and a callback function. The value returned is then available as ":type" in this case:
```js
morgan.token('type', function(req, res){ return req.headers['content-type']; })
```


## License

The MIT License (MIT)

Copyright (c) 2014 Jonathan Ong me@jongleberry.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
