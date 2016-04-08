var express = require('express')
var morgan = require('./index')

var app = express()
app.use(morgan(':id :method :url :response-time'))
app.use(morgan('clever'))

app.get('/', function (req, res) {
    res.send('this is /')
})

app.get('/hello/world', function (req, res) {
    res.send('hello, world!')
})

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
