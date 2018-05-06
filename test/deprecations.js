var morgan = require('..')
var assert = require('assert')

describe('morgan() deprecations', function () {
  var originalConsoleError
  var errors = []
  function getErrors () {
    return errors.map(e => removeANSI(e.toString('utf8')))
  }
  before(function () {
    originalConsoleError = process.stderr.write

    process.stderr.write = function write (chunk, encoding) {
      errors.push(Buffer.from(chunk, encoding))
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
    assert(getErrors()[0].startsWith('morgan deprecated morgan(options): use morgan("combined", options) instead'))
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
