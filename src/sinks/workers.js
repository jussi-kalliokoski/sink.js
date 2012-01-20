(function (Sink) {

/**
 * A Sink class for the Media Streams Processing API and/or Web Audio API in a Web Worker.
*/

Sink.sinks('worker', function () {
	var	self		= this,
		global		= (function(){ return this; }()),
		soundData	= null,
		outBuffer	= null,
		zeroBuffer	= null;
	self.start.apply(self, arguments);

	// Let's see if we're in a worker.

	importScripts();

	function mspBufferFill (e) {
		self.ready || self.initMSP(e);

		var	channelCount	= self.channelCount,
			l		= e.audioLength,
			n, i;

		soundData	= soundData && soundData.length === l * channelCount ? soundData : new Float32Array(l * channelCount);
		outBuffer	= outBuffer && outBuffer.length === soundData.length ? outBuffer : new Float32Array(l * channelCount);
		zeroBuffer	= zeroBuffer && zeroBuffer.length === soundData.length ? zeroBuffer : new Float32Array(l * channelCount);

		soundData.set(zeroBuffer);
		outBuffer.set(zeroBuffer);

		self.process(soundData, self.channelCount);

		for (n=0; n<channelCount; n++) {
			for (i=0; i<l; i++) {
				outBuffer[n * e.audioLength + i] = soundData[n + i * channelCount];
			}
		}

		e.writeAudio(outBuffer);
	}

	function waBufferFill(e) {
		self.ready || self.initWA(e);

		var	outputBuffer	= e.outputBuffer,
			channelCount	= outputBuffer.numberOfChannels,
			i, n, l		= outputBuffer.length,
			size		= outputBuffer.size,
			channels	= new Array(channelCount),
			tail;
		
		soundData	= soundData && soundData.length === l * channelCount ? soundData : new Float32Array(l * channelCount);
		zeroBuffer	= zeroBuffer && zeroBuffer.length === soundData.length ? zeroBuffer : new Float32Array(l * channelCount);
		soundData.set(zeroBuffer);

		for (i=0; i<channelCount; i++) {
			channels[i] = outputBuffer.getChannelData(i);
		}

		self.process(soundData, self.channelCount);

		for (i=0; i<l; i++) {
			for (n=0; n < channelCount; n++) {
				channels[n][i] = soundData[i * self.channelCount + n];
			}
		}
	}

	global.onprocessmedia	= mspBufferFill;
	global.onaudioprocess	= waBufferFill;

	self._mspBufferFill	= mspBufferFill;
	self._waBufferFill	= waBufferFill;

}, {
	ready: false,

	initMSP: function (e) {
		this.channelCount	= e.audioChannels;
		this.sampleRate		= e.audioSampleRate;
		this.bufferSize		= e.audioLength * this.channelCount;
		this.ready		= true;
		this.emit('ready', []);
	},

	initWA: function (e) {
		var b = e.outputBuffer;
		this.channelCount	= b.numberOfChannels;
		this.sampleRate		= b.sampleRate;
		this.bufferSize		= b.length * this.channelCount;
		this.ready		= true;
		this.emit('ready', []);
	},
});

}(this.Sink));
