var Sink = require('../sink').Sink;

function SineWave (sampleRate, frequency) {
	var phase = 0;
	var pi2 = Math.PI * 2;
	var coEff = frequency / sampleRate * 0.5;
	return function () {
		phase = (phase + coEff) % 1;
		return Math.sin(phase * pi2);
	};
}

var oscs;
var dev = Sink(function (buffer, channelCount) {
	console.log('Filling data...');
	for (var i=0; i<buffer.length; i+=channelCount) {
		for (var n=0; n<channelCount; n++) {
			buffer[i+n] = oscs[n]()
		}
	}
});

oscs = [SineWave(dev.sampleRate, 440), SineWave(dev.sampleRate, 660)];

setInterval(function () {
	console.log(dev.sampleRate)
}, 10000);
