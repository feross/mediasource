module.exports = MediaElementWrapper

var EventEmitter = require('events')
var inherits = require('inherits')
var stream = require('stream')
var toArrayBuffer = require('to-arraybuffer')

var MediaSource = typeof window !== 'undefined' && window.MediaSource

var DEFAULT_MAX_BUFFER_DURATION = 60 // seconds

function MediaElementWrapper (elem, opts) {
  var self = this
  if (!(self instanceof MediaElementWrapper)) return new MediaElementWrapper(elem, opts)
  EventEmitter.call(self)

  if (!MediaSource) throw new Error('web browser lacks MediaSource support')

  // if (!opts) opts = {}

  self._elem = elem
  self._mediaSource = new MediaSource()
  // self._sourceBuffer = null
  // self._cb = null

  // self._type = opts.type || getType(opts.extname)
  // if (!self._type) throw new Error('missing `opts.type` or `opts.extname` options')

  self._elem.src = window.URL.createObjectURL(self._mediaSource)
}

inherits(MediaElementWrapper, EventEmitter)

/*
 * `obj` can be a previous value returned by this function
 * or a string
 */
MediaElementWrapper.prototype.getStream = function (obj) {
  var self = this

  return new MediaSourceStream(self._elem, self._mediaSource, obj)
}

inherits(MediaSourceStream, stream.Writable)

function MediaSourceStream (elem, mediaSource, obj) {
  var self = this
  stream.Writable.call(self)

  self._elem = elem
  self._mediaSource = mediaSource
  self._flowHandler = self._flow.bind(self)

  if (typeof obj === 'string') {
    // Need to create a new sourceBuffer
    if (self._mediaSource.readyState === 'open') {
      self._createSourceBuffer(obj)
    } else {
      function onSourceOpen () {
        self._mediaSource.removeEventListener('sourceopen', onSourceOpen)
        self._createSourceBuffer(obj)
      }
      self._mediaSource.addEventListener('sourceopen', onSourceOpen)
    }
  } else if (obj._sourceBuffer) {
    obj.destroy()
    self._sourceBuffer = obj._sourceBuffer // Copy over the old sourceBuffer
    self._sourceBuffer.addEventListener('updateend', self._flowHandler)
  } else {
    throw new Error('The argument to MediaElementWrapper.getStream must be a string or a previous stream returned from that function')
  }

  self._elem.addEventListener('timeupdate', self._flowHandler)

  self.on('error', function () {
    try {
      self._mediaSource.endOfStream('decode')
    } catch (err) {}
  })

  // TODO: this doesn't work when there are multiple streams attached to the same element.
  // We need to wait until they are all finished before calling this.
  self.on('finish', function () {
    self._mediaSource.endOfStream()
  })
}

MediaSourceStream.prototype.destroy = function (err) {
  var self = this
  if (self.destroyed) return
  self.destroyed = true

  self._elem.removeEventListener('timeupdate', self._flowHandler)
  if (self._sourceBuffer) {
    self._sourceBuffer.removeEventListener('updateend', self._flowHandler)
    if (self._mediaSource.readyState === 'open') {
      self._sourceBuffer.abort()
    }
  }

  if (err) self.emit('error', err)
  self.emit('close')
}

MediaSourceStream.prototype._createSourceBuffer = function (type) {
  var self = this
  if (self.destroyed) return

  if (MediaSource.isTypeSupported(type)) {
    self._sourceBuffer = self._mediaSource.addSourceBuffer(type)
    self._sourceBuffer.addEventListener('updateend', self._flowHandler)
    if (self._cb) {
      var cb = self._cb
      self._cb = null
      cb()
    }
  } else {
    // TODO: this is a change from the previous api
    self.emit('error', new Error('The provided type is not supported'))
  }
}

MediaSourceStream.prototype._write = function (chunk, encoding, cb) {
  var self = this
  if (self.destroyed) return
  if (!self._sourceBuffer) {
    self._cb = function (err) {
      if (err) return cb(err)
      self._write(chunk, encoding, cb)
    }
    return
  }

  if (self._sourceBuffer.updating) {
    return cb(new Error('Cannot append buffer while source buffer updating'))
  }

  try {
    self._sourceBuffer.appendBuffer(toArrayBuffer(chunk))
  } catch (err) {
    self.emit('error', err)
    return
  }
  self._cb = cb
}

MediaSourceStream.prototype._flow = function () {
  var self = this

  if (self.destroyed || !self._sourceBuffer || self._sourceBuffer.updating) {
    return
  }

  if (self._mediaSource.readyState === 'open') {
    // check buffer size
    if (self._getBufferDuration() > DEFAULT_MAX_BUFFER_DURATION) {
      return
    }
  }

  if (self._cb) {
    var cb = self._cb
    self._cb = null
    cb()
  }
}

var EPSILON = 0 // TODO: if this actually works, let's cut out the logic associated with it

MediaSourceStream.prototype._getBufferDuration = function () {
  var self = this

  var buffered = self._sourceBuffer.buffered
  var currentTime = self._elem.currentTime;
  var bufferEnd = -1; // end of the buffer
  // This is a little over complex because some browsers seem to separate the
  // buffered region into multiple sections with slight gaps.
  // TODO: figure out why there are gaps in the buffer. This may be due to
  // timestamp errors in mp4box, or due to browsers not liking the single-frame
  // segments mp4box generates
  for (var i = 0; i < buffered.length; i++) {
    var start = buffered.start(i);
    var end = buffered.end(i) + EPSILON;

    if (start > currentTime) {
      // Reached past the joined buffer
      break;
    } else if (bufferEnd >= 0 || currentTime <= end) {
      // Found the start/continuation of the joined buffer
      bufferEnd = end;
    }
  }

  var bufferedTime = bufferEnd - currentTime;
  if (bufferedTime < 0)
    bufferedTime = 0;

  // debug('Buffer length: %f', bufferedTime);

  return bufferedTime
}

function getType (extname) {
  if (!extname) return null
  if (extname[0] !== '.') extname = '.' + extname
  return {
    '.m4a': 'audio/mp4; codecs="mp4a.40.5"',
    '.m4v': 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
    '.webm': 'video/webm; codecs="vorbis, vp8"'
  }[extname]
}
