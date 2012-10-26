void function (Sink) {

var cubeb

try {
	cubeb = require('cubeb')
} catch (e) {
	return
}

var getContext = function () {
	var ctx

	return function () {
		ctx = new cubeb.Context(
			"sink.js " + process.pid + ' ' + new Date()
		);

		getContext = function () { return ctx; };

		return ctx;
	}
}();

var streamCount = 0;

Sink.sinks('cubeb', function () {
	var self = this;

	self.start.apply(self, arguments);

	self._ctx = getContext();
	self._stream = new cubeb.Stream(
		self._ctx,
		self._ctx.name + ' ' + streamCount++,
		cubeb.SAMPLE_FLOAT32LE,
		self.channelCount,
		self.sampleRate,
		self.bufferSize,
		self._latency,
		function (frameCount) {
			var buffer = new Buffer(
				4 * frameCount * self.channelCount);
			var soundData = new Float32Array(buffer);

			self.process(soundData, self.channelCount);

			self._stream.write(buffer);
			self._stream.release();
		},
		function (state) {}
	);

	self._stream.start();
}, {
	_ctx: null,
	_stream: null,
	_latency: 250,
	bufferSize: 4096,

	kill: function () {
		this._stream.stop();
		this.emit('kill');
	}
	
});

}(this.Sink);
