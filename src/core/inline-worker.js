void function (Sink) {

/**
 * Creates an inline worker using a data/blob URL, if possible.
 *
 * @static Sink
 *
 * @arg {String} script
 *
 * @return {Worker} A web worker, or null if impossible to create.
*/

var define = Object.defineProperty ? function (obj, name, value) {
	Object.defineProperty(obj, name, {
		value: value,
		configurable: true,
		writable: true
	});
} : function (obj, name, value) {
	obj[name] = value;
};

function terminate () {
	define(this, 'terminate', this._terminate);

	Sink.revokeDynURL(this._url);

	delete this._url;
	delete this._terminate;
	return this.terminate();
}

function inlineWorker (script) {
	function wrap (type, content, typeName) {
		try {
			var url = type(content, 'text/javascript');
			var worker = new Worker(url);

			define(worker, '_url', url);
			define(worker, '_terminate', worker.terminate);
			define(worker, 'terminate', terminate);

			if (inlineWorker.type) return worker;

			inlineWorker.type = typeName;
			inlineWorker.createURL = type;

			return worker;
		} catch (e) {
			return null;
		}
	}

	var createDynURL = Sink.createDynURL;
	var worker;

	if (inlineWorker.createURL) {
		return wrap(inlineWorker.createURL, script, inlineWorker.type);
	}

	worker = wrap(createDynURL.createBlob, script, 'blob');
	if (worker) return worker;

	worker = wrap(createDynURL.createBlobBuilder, script, 'blobbuilder');
	if (worker) return worker;

	worker = wrap(createDynURL.createData, script, 'data');

	return worker;
}

Sink.EventEmitter.call(inlineWorker);

inlineWorker.test = function () {
	inlineWorker.ready = inlineWorker.working = false;
	inlineWorker.type = '';
	inlineWorker.createURL = null;

	var worker = inlineWorker('this.onmessage=function(e){postMessage(e.data)}');
	var data = 'inlineWorker';

	function ready (success) {
		if (inlineWorker.ready) return;

		inlineWorker.ready = true;
		inlineWorker.working = success;
		inlineWorker.emit('ready', [success]);
		inlineWorker.off('ready');

		if (success && worker) {
			worker.terminate();
		}

		worker = null;
	}

	if (!worker) {
		setTimeout(function () {
			ready(false);
		}, 0);
	} else {
		worker.onmessage = function (e) {
			ready(e.data === data);
		};

		worker.postMessage(data);

		setTimeout(function () {
			ready(false);
		}, 1000);
	}
};

Sink.inlineWorker = inlineWorker;

inlineWorker.test();

}(this.Sink);
