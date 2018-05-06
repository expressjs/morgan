var morgan = require('..')
var assert = require('assert')

describe('morgan() deprecations', function () {
  var originalConsoleError
  var errors = []
  function getErrors () {
    return errors.map(function (e) { return removeANSI(e.toString('utf8')) })
  }
  before(function () {
    originalConsoleError = process.stderr.write

    process.stderr.write = function write (chunk, encoding) {
      /* eslint node/no-deprecated-api: 0 */ // this is actually trying to be compat with older node
      errors.push(Buffer.from ? Buffer.from(chunk, encoding) : new Buffer(chunk, encoding))
    }
  })
  after(function () {
    if (originalConsoleError) {
      process.stderr.write = originalConsoleError
    }
  })

  it('should tell you to use morgan "combined" if format arg is an object', function () {
    morgan({})
    assert.equal(getErrors().length, 1)
    assert(startsWith(getErrors()[0], 'morgan deprecated morgan(options): use morgan("combined", options) instead'))
  })

  it('regex removes all ANSI characters', function () {
    const sampleString = '\u001b[36;1mmorgan\u001b[22;39m \u001b[33;1mdeprecated\u001b[22;39m \u001b[0mmorgan(options): use morgan("combined", options)'
    const expectedStripped = 'morgan deprecated morgan(options): use morgan("combined", options)'
    assert.equal(removeANSI(sampleString), expectedStripped)
  })
})

var ANSI_REGEX = /\u001b\[.*?m/g
function removeANSI (string) {
  return string.replace(ANSI_REGEX, '')
}
function startsWith (string, preffix) {
  return string.lastIndexOf(preffix, 0) === 0
}
