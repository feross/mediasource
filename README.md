# mediasource [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url]

[travis-image]: https://img.shields.io/travis/feross/mediasource.svg?style=flat
[travis-url]: https://travis-ci.org/feross/mediasource
[npm-image]: https://img.shields.io/npm/v/mediasource.svg?style=flat
[npm-url]: https://npmjs.org/package/mediasource
[downloads-image]: https://img.shields.io/npm/dm/mediasource.svg?style=flat
[downloads-url]: https://npmjs.org/package/mediasource

### MediaSource API as a node.js Writable stream

[![Sauce Test Status](https://saucelabs.com/browser-matrix/mediasource.svg)](https://saucelabs.com/u/mediasource)

Stream video/audio into a `<video>` or `<audio>` tag by treating the html tag as a node.js Writable stream.

This package is used by [WebTorrent](http://webtorrent.io) (along with other approaches)
to support media streaming.

## install

```
npm install mediasource
```

## usage

```js
var MediaSourceStream = require('mediasource')

function createElem (tagName) {
  var elem = document.createElement(tagName)
  elem.controls = true
  elem.autoplay = true // for chrome
  elem.play() // for firefox
  document.body.appendChild(elem)
  return elem
}

var elem = createElem('video')

var readable = // ... get a readable stream from somewhere
var writable = new MediaSourceStream(elem, { extname: '.webm' })

elem.addEventListener('error', function (err) {
  // listen for errors on the video/audio element directly
})

readable.pipe(writable)

// media should start playing now!
```

### options

#### opts.type

Explicitly set the MediaSource SourceBuffer's mime type (recommended).

#### opts.extname

Use a file extension (.m4a, .m4v, .mp4, .mp3, .webm) to infer the MediaSource SourceBuffer's mime type.

### errors

Handle errors by listening to the `'error'` event on the `<video>` or `<audio>` tag.

## license

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).
