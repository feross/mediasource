var fs = require('fs')
var MediaElementWrapper = require('../')
var path = require('path')
var stream = require('stream')
var test = require('tape')

var FILE = fs.readFileSync(path.join(__dirname, 'test.mp4'))
var CODEC_TYPE = 'video/mp4; codecs="avc1.42e01e"'

if (!window.MediaSource) {
  test.only('MediaSource support', (t) => {
    t.pass('browser lacks support')
    t.end()
  })
}

test('basic test', function (t) {
  t.plan(2)

  var elem = createElem('video')
  var readable = new stream.PassThrough()
  var wrapper = new MediaElementWrapper(elem)
  var writable = wrapper.createWriteStream(CODEC_TYPE)

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

// Don't fail when createWriteStream() is called twice before mediasource opens
// See: https://github.com/feross/mediasource/pull/5
test('call createWriteStream() twice immediately', function (t) {
  t.plan(3)

  var elem = createElem('video')
  var readable = new stream.PassThrough()
  var wrapper = new MediaElementWrapper(elem)

  var writable = wrapper.createWriteStream(CODEC_TYPE)

  t.doesNotThrow(function () {
    writable = wrapper.createWriteStream(writable)
  })

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
  elem.muted = true // make autoplay work
  elem.autoplay = true // for chrome
  document.body.insertBefore(elem, document.body.firstChild)
  return elem
}
