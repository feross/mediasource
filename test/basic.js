var fs = require('fs')
var MediaSourceStream = require('../')
var stream = require('stream')
var test = require('tape')

var FILE = fs.readFileSync(__dirname + '/test.webm')

test('basic test', function (t) {
  t.plan(2)

  var elem = createElem('video')
  var readable = new stream.PassThrough()
  var writable = new MediaSourceStream(elem, { extname: '.webm' })

  readable.on('error', function (err) { t.fail(err) })
  writable.on('error', function (err) { t.fail(err) })
  elem.addEventListener('error', function (err) { t.fail(err) })

  elem.addEventListener('playing', function () {
    t.pass('got the "playing" event')
  })

  elem.addEventListener('progress', onProgress)

  function onProgress () {
    t.pass('got a "progress" event')
    elem.removeEventListener('progress', onProgress)
  }

  readable.pipe(writable)
  readable.write(FILE)
})

function createElem (tagName) {
  var elem = document.createElement(tagName)
  elem.controls = true
  elem.autoplay = true // for chrome
  elem.play() // for firefox
  document.body.appendChild(elem)
  return elem
}
