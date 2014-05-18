# morgan [![NPM version](https://badge.fury.io/js/morgan.svg)](http://badge.fury.io/js/morgan) [![Build Status](https://travis-ci.org/expressjs/morgan.svg)](https://travis-ci.org/expressjs/morgan) [![Coverage Status](https://img.shields.io/coveralls/expressjs/morgan.svg)](https://coveralls.io/r/expressjs/morgan)

Logging middleware for node.js http apps.

> Named after [Dexter](http://en.wikipedia.org/wiki/Dexter_Morgan), a show you should not watch until completion.

## API

```js
var express = require('express')
var morgan  = require('morgan')

var app = express()
app.use(morgan())
```

### morgan(options)

Morgan may be passed options to configure the logging output. The options may be passed as a predefined format, formatting string, function, or object.

```js
morgan() // default
morgan('short')
morgan('tiny')
morgan({ format: 'dev', immediate: true })
morgan(':method :url - :referrer')
morgan(':req[content-type] -> :res[content-type]')
morgan(function(tokens, req, res){ return 'some format string' })
morgan({ format: 'dev', skip: function(req, res){ return res.statusCode === 304; }})
```

#### Predefined Formats

- `default` - Standard output.
- `short` - Shorter than default, also including response time.
- `tiny` - The minimal.
- `dev` - Concise output colored by response status for development use.

#### Options

Morgan accepts these properties in the options object.

- `format` - Format string or Setting, see below for format tokens.
- `stream` - Output stream, defaults to `stdout`.
- `buffer` - Buffer duration, defaults to `1000 ms` when `true`.
- `immediate` - Write log line on request instead of response (for response times).
- `skip` - Function to determine if logging is skipped, called as `skip(req, res)`, defaults to `false`.

All default formats are defined this way, however the api is also public:
```js
morgan.format('name', 'string or function')
```

#### Tokens

- `:req[header]` ex: `:req[Accept]`
- `:res[header]` ex: `:res[Content-Length]`
- `:http-version`
- `:response-time`
- `:remote-addr`
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
