module.exports = {
  createBufferStream (stream, interval) {
    var buf = []
    var timer = null

    // flush function
    function flush () {
      timer = null
      stream.write(buf.join(''))
      buf.length = 0
    }

    // write function
    function write (str) {
      if (timer === null) {
        timer = setTimeout(flush, interval)
      }

      buf.push(str)
    }

    // return a minimal "stream"
    return { write: write }
  },
  DefaultBufferDuration: 1000
}
