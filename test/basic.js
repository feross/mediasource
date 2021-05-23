const fs = require('fs')
const path = require('path')
const stream = require('stream')
const test = require('tape')
const MediaElementWrapper = require('../index.js')

const FILE = fs.readFileSync(path.join(__dirname, 'test.mp4'))
const CODEC_TYPE = 'video/mp4; codecs="avc1.42e01e"'

if (!window.MediaSource) {
  test.only('MediaSource support', (t) => {
    t.pass('browser lacks support')
    t.end()
  })
}

test('basic test', t => {
  t.plan(2)

  const elem = createElem('video')
  const readable = new stream.PassThrough()
  const wrapper = new MediaElementWrapper(elem)
  const writable = wrapper.createWriteStream(CODEC_TYPE)

  readable.on('error', err => { t.fail(err) })
  writable.on('error', err => { t.fail(err) })
  elem.addEventListener('error', err => { t.fail(err) })

  elem.addEventListener('playing', () => {
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
test('call createWriteStream() twice immediately', t => {
  t.plan(3)

  const elem = createElem('video')
  const readable = new stream.PassThrough()
  const wrapper = new MediaElementWrapper(elem)

  let writable = wrapper.createWriteStream(CODEC_TYPE)

  t.doesNotThrow(() => {
    writable = wrapper.createWriteStream(writable)
  })

  readable.on('error', err => { t.fail(err) })
  writable.on('error', err => { t.fail(err) })
  elem.addEventListener('error', err => { t.fail(err) })

  elem.addEventListener('playing', () => {
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
  const elem = document.createElement(tagName)
  elem.controls = true
  elem.muted = true // make autoplay work
  elem.autoplay = true // for chrome
  document.body.insertBefore(elem, document.body.firstChild)
  return elem
}
