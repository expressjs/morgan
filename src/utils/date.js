var CLF_MONTH = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

module.exports = {
  clfdate (dateTime) {
    var date = dateTime.getUTCDate()
    var hour = dateTime.getUTCHours()
    var mins = dateTime.getUTCMinutes()
    var secs = dateTime.getUTCSeconds()
    var year = dateTime.getUTCFullYear()

    var month = CLF_MONTH[dateTime.getUTCMonth()]

    return (
      date.toString().padStart(2, '0') +
      '/' +
      month +
      '/' +
      year +
      ':' +
      hour.toString().padStart(2, '0') +
      ':' +
      mins.toString().padStart(2, '0') +
      ':' +
      secs.toString().padStart(2, '0') +
      ' +0000'
    )
  }
}
