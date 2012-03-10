sink.js
=======

sink.js is a javascript library dedicated for audio output. Features include buffer fill callbacks, synchronous write, asynchronous write, ring buffers and recording. Currently supported platforms are Firefox 4+ and Chrome with Web Audio API enabled in ``` about:flags ```. Additional platforms, such as a flash fallback can be added as plugins, but are currently not featured, nor will ever be enabled by default. For a platform to be added as enabled by default, it needs to be reliable in terms of latency and stability. Flash fallbacks – for example – cannot offer this kind of reliability and the sound will always be flaky at best.

Usage
-----

To create a sink, the following function is available:

```

var sink = Sink([callback=null], [channelCount=2], [preBufferSize=4096], [sampleRate=44100])

```

Currently, it is recommended to check that you are actually running at the sample rate that you specified, so when you create a sink, get the samplerate reference always from its ``` .sampleRate ``` property.

The callback is fed with two arguments, the buffer to fill and the channel count of the buffer. For example, to play back stereo noise, you can do the following:

```javascript

var sink = Sink(function(buffer, channelCount){
	var i;
	for (i=0; i<buffer.length; i++){
		buffer[i] = Math.random() - 0.5;
	}
});

```

Note that `buffer` is interleaved and therefore the samples should be written as :

```javascript 
[
    channel1, channel2, ... channelN,	// frame 1
    channel1, channel2, ... channelN,	// frame 2
    ...	                                // ...
]
``` 

For example, to play back a 440Hz sine wave in stereo, you can do :

```javascript
var k, v, n = 0;
var sink = Sink(function(buffer){
	for (var j=0; j<buffer.length; j+=2, n++) {
        	v = Math.sin(k*n);
        	buffer[j] = v;
        	buffer[j+1] = v;
    	}
}, 2); // 2 channels ... which is already the default

k = 2*Math.PI*440/sink.sampleRate;
```

Note also that the length of the `buffer` can vary, only sure thing is that it is less than `preBufferSize`.

To write, you can use the ``` .write(buffer, [delay=undefined]) ``` method. The default writing mode is "async" where the specified buffer will be mixed with existing data. If a delay is not specified, the system will automatically create a delay to try to compensate the latency. The delay is specified as number of samples.

Another mode of writing is "sync". You can set this by changing your sink's ``` .writeMode ``` property to "sync". In the "sync" write mode, the delay is disregarded and instead all written buffers will be appended right after the previous one has been exhausted. To get the current sample offset in the "sync" write mode, you can use the ``` .getSyncWriteOffset() ``` method.

Beware of writing zero-length buffers, as they will induce NaNs to your buffers. This can be a bad thing especially if written in the "sync" mode and combined with some effects processing in a callback.

To bring the sink to a force stop, you can use the ``` .kill() ``` method. But so far, this doesn't work in Chrome, and the Chrome's AudioContext can't be taken down. This will be fixed as soon as possible. Also, beware of creating multiple sinks to avoid unexpected results.

### Recording

Recording can be done by creating an instance of the recording, like this:

```javascript

var recording = sink.record();

// And when you want to stop recording:

recording.stop();

// To join the recording into a single buffer:

var buffer = recording.join();

```

### Ring buffer

Here's an example how to use the ring buffer:

```javascript

// Enable & create the ring buffer

sink.ringBuffer = new Float32Array(sink.sampleRate * sink.channelCount);

// Get or modify the current offset of the ring buffer.

console.log(sink.ringOffset);

```

That would create a ring buffer of the length of a single second, and you can manipulate that anyway you want, and use it together with callbacks and / or writing.

Projects using sink.js
----------------------

* [aurora.js](https://github.com/jensnockert/aurora.js) A JS-powered video and audio playback framework.
* [Audiolet](https://github.com/oampo/Audiolet) A comphrehensive, graph based audio synthesis / composition library for JS.
* [audiolib.js](https://github.com/jussi-kalliokoski/audiolib.js) A full-fletched audio synthesis / processing framework.
