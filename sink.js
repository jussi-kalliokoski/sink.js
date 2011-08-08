(function (global){
/**
 * Creates a Sink according to specified parameters, if possible.
 *
 * @param {Function} readFn A callback to handle the buffer fills.
 * @param {number} channelCount Channel count.
 * @param {number} preBufferSize (Optional) Specifies a pre-buffer size to control the amount of latency.
 * @param {number} sampleRate Sample rate (ms).
*/
	function Sink(readFn, channelCount, preBufferSize, sampleRate){
		var	sinks	= Sink.sinks,
			dev;
		for (dev in sinks){
			if (sinks.hasOwnProperty(dev) && sinks[dev].enabled){
				try{
					return new sinks[dev](readFn, channelCount, preBufferSize, sampleRate);
				} catch(e1){console.error(e1);}
			}
		}

		throw "No audio sink available.";
	}

	function Recording(bindTo){
		this.boundTo = bindTo;
		this.buffers = [];
		bindTo.activeRecordings.push(this);
	}

	Recording.prototype = {
		add: function(buffer){
			this.buffers.push(buffer);
		}, clear: function(){
			this.buffers = [];
		}, stop: function(){
			var	recordings = this.boundTo.activeRecordings,
				i;
			for (i=0; i<recordings.length; i++){
				if (recordings[i] === this){
					recordings.splice(i--, 1);
				}
			}
		}, join: function(){
			var	bufferLength	= 0,
				bufPos		= 0,
				buffers		= this.buffers,
				newArray,
				n, i, l		= buffers.length;

			for (i=0; i<l; i++){
				bufferLength += buffers[i].length;
			}
			newArray = new Float32Array(bufferLength);
			for (i=0; i<l; i++){
				for (n=0; n<buffers[i].length; n++){
					newArray[bufPos + n] = buffers[i][n];
				}
				bufPos += buffers[i].length;
			}
			return newArray;
		}
	};

	function SinkClass(){
	}

	Sink.SinkClass		= SinkClass;

	SinkClass.prototype = {
		sampleRate: 44100,
		channelCount: 2,
		preBufferSize: 4096,
		writeMode: 'async',
		previousHit: 0,
		ringBuffer: null,
		ringOffset: 0,
		start: function(readFn, channelCount, preBufferSize, sampleRate){
			this.channelCount	= isNaN(channelCount) ? this.channelCount: channelCount;
			this.preBufferSize	= isNaN(preBufferSize) ? this.preBufferSize : preBufferSize;
			this.sampleRate		= isNaN(sampleRate) ? this.sampleRate : sampleRate;
			this.readFn		= readFn;
			this.activeRecordings	= [];
			this.previousHit	= +new Date;
			this.asyncBuffers	= [];
			this.syncBuffers	= [];
		},
		process: function(){
			this.ringBuffer && this.ringSpin.apply(this, arguments);
			this.writeBuffersSync.apply(this, arguments);
			this.readFn && this.readFn.apply(this, arguments);
			this.writeBuffersAsync.apply(this, arguments);
			this.recordData.apply(this, arguments);
			this.previousHit = +new Date;
		},
		record: function(){
			return new Recording(this);
		},
		recordData: function(buffer){
			var	activeRecs	= this.activeRecordings,
				i, l		= activeRecs.length;
			for (i=0; i<l; i++){
				activeRecs[i].add(buffer);
			}
		},
		writeBuffersAsync: function(buffer){
			var	buffers		= this.asyncBuffers,
				l		= buffer.length,
				buf,
				bufLength,
				i, n;
			if (buffers){
				for (i=0; i<buffers.length; i++){
					buf		= buffers[i];
					bufLength	= buf.length;
					for (n=0; n < l && n < bufLength; n++){
						if (buf.d){
							buf.d--;
						} else {
							buffer[n] += buf.b[n];
						}
					}
					buffers[i] = buf.subarray(n);
					i >= bufLength && buffers.splice(i--, 1);
				}
			}
		},
		writeBuffersSync: function(buffer){
			var	buffers		= this.syncBuffers,
				l		= buffer.length,
				i		= 0,
				soff		= 0;
			for(;i<l && buffers.length; i++){
				buffer[i] += buffers[0][soff];
				if (buffers[0].length <= soff){
					buffers.splice(0, 1);
					soff = 0;
					continue;
				}
				soff++;
			}
			if (buffers.length){
				buffers[0] = buffers[0].subarray(soff);
			}
		},
		writeBufferAsync: function(buffer, delay){
			var	buffers		= this.asyncBuffers;
			buffers.push({
				b: buffer,
				d: isNaN(delay) ? (+new Date - this.previousHit) / 1000 * this.sampleRate : delay
			});
			return buffers.length;
		},
		writeBufferSync: function(buffer){
			var	buffers		= this.syncBuffers;
			buffers.push(buffer);
			return buffers.length;
		},
		writeBuffer: function(){
			this[this.writeMode === 'async' ? 'writeBufferAsync' : 'writeBufferSync'].apply(this, arguments);
		},
		getSyncWriteOffset: function(){
			var	buffers		= this.syncBuffers,
				offset		= 0,
				i;
			for (i=0; i<buffers.length; i++){
				offset += buffers[i].length;
			}
			return offset;
		},
		ringSpin: function(buffer){
			var	ring	= this.ringBuffer,
				l	= buffer.length,
				m	= ring.length,
				n	= this.ringOffset,
				i;
			for (i=0; i<l; i++){
				buffer[i] = ring[n];
				n = (n + 1) % m;
			}
			this.ringOffset = n;
		}
	};

	function sinks(type, constructor, prototype, disabled){
		prototype = prototype || constructor.prototype;
		constructor.prototype = new Sink.SinkClass();
		constructor.prototype.type = type;
		constructor.enabled = !disabled;
		for (disabled in prototype){
			if (prototype.hasOwnProperty(disabled)){
				constructor.prototype[disabled] = prototype[disabled];
			}
		}
		sinks[type] = constructor;
	}

	sinks('moz', function(){
		var	self			= this,
			currentWritePosition	= 0,
			tail			= null,
			audioDevice		= new Audio(),
			written, currentPosition, available, soundData,
			timer; // Fix for https://bugzilla.mozilla.org/show_bug.cgi?id=630117
		self.start.apply(self, arguments);
		// TODO: All sampleRate & preBufferSize combinations don't work quite like expected, fix this.

		function bufferFill(){
			if (tail){
				written = audioDevice.mozWriteAudio(tail);
				currentWritePosition += written;
				if (written < tail.length){
					tail = tail.subarray(written);
					return tail;
				}
				tail = null;
			}

			currentPosition = audioDevice.mozCurrentSampleOffset();
			available = Number(self.currentPosition + self.preBufferSize * self.channelCount - currentWritePosition);
			if (available > 0){
				soundData = new Float32Array(available);
				self.process(soundData, self.channelCount);
				written = audioDevice.mozWriteAudio(soundData);
				if (written < soundData.length){
					tail = soundData.subarray(written);
				}
				currentWritePosition += written;
			}
		}

		audioDevice.mozSetup(self.channelCount, self.sampleRate);

		self.kill = Sink.doInterval(bufferFill, 20);
		self._bufferFill = bufferFill;
	});

	sinks('webkit', function(readFn, channelCount, preBufferSize, sampleRate){
		var	self		= this,
			// For now, we have to accept that the AudioContext is at 48000Hz, or whatever it decides.
			context		= new (window.AudioContext || webkitAudioContext)(/*sampleRate*/),
			node		= context.createJavaScriptNode(preBufferSize, 0, channelCount);
		self.start.apply(self, arguments);

		function bufferFill(e){
			var	outputBuffer	= e.outputBuffer,
				channelCount	= outputBuffer.numberOfChannels,
				i, n, l		= outputBuffer.length,
				size		= outputBuffer.size,
				channels	= new Array(channelCount),
				soundData	= new Float32Array(l * channelCount);

			for (i=0; i<channelCount; i++){
				channels[i] = outputBuffer.getChannelData(i);
			}

			self.process(soundData, self.channelCount);

			for (i=0; i<l; i++){
				for (n=0; n < channelCount; n++){
					channels[n][i] = soundData[i * self.channelCount + n];
				}
			}
		}

		node.onaudioprocess = bufferFill;
		node.connect(context.destination);

		self.sampleRate		= context.sampleRate;
		self.channelCount	= channelCount;
		/* Keep references in order to avoid garbage collection removing the listeners, working around http://code.google.com/p/chromium/issues/detail?id=82795 */
		self._context		= context;
		self._node		= node;
		self._callback		= bufferFill;
	}, {
		//TODO: Do something here.
		kill: function(){}
	});

	sinks('dummy', function(){
		var 	self		= this;
		self.start.apply(self, arguments);
		
		function bufferFill(){
			var	soundData = new Float32Array(self.preBufferSize * self.channelCount);
			self.process(soundData, self.channelCount);
		}

		self.kill = Sink.doInterval(bufferFill, self.preBufferSize / self.sampleRate * 1000);

		self._callback		= bufferFill;
	}, null, true);

	Sink.sinks		= Sink.devices = sinks;
	Sink.Recording		= Recording;

	Sink.doInterval		= function(callback, timeout){
		var timer, id, prev;
		if (Sink.doInterval.backgroundWork || Sink.devices.moz.backgroundWork){
			if (window.MozBlobBuilder){
				prev	= new MozBlobBuilder();
				prev.append('setInterval(function(){ postMessage("tic"); }, ' + timeout + ');');
				id	= window.URL.createObjectURL(prev.getBlob());
				timer	= new Worker(id);
				timer.onmessage = function(){
					callback();
				};
				return function(){
					timer.terminate();
					window.URL.revokeObjectURL(id);
				};
			}
			id = prev = +new Date + '';
			function messageListener(e){
				if (e.source === window && e.data === id && prev < +new Date){
					prev = +new Date + timeout;
					callback();
				}
				window.postMessage(id, '*');
			}
			window.addEventListener('message', messageListener, true);
			window.postMessage(id, '*');
			return function(){
				window.removeEventListener('message', messageListener);
			};
		} else {
			timer = setInterval(callback, timeout);
			return function(){
				clearInterval(timer);
			};
		}
	};

	global.Sink = Sink;
}(function(){ return this; }()));
