void function (Sink) {

var _Blob, _BlobBuilder, _URL, _btoa;

void function (prefixes, urlPrefixes) {
	function find (name, prefixes) {
		var b, a = prefixes.slice();

		for (b=a.shift(); typeof b !== 'undefined'; b=a.shift()) {
			b = Function('return typeof ' + b + name + 
				'=== "undefined" ? undefined : ' +
				b + name)();

			if (b) return b;
		}
	}

	_Blob = find('Blob', prefixes);
	_BlobBuilder = find('BlobBuilder', prefixes);
	_URL = find('URL', urlPrefixes);
	_btoa = find('btoa', ['']);
}([
	'',
	'Moz',
	'WebKit',
	'MS'
], [
	'',
	'webkit'
]);

var createBlob = _Blob && _URL && function (content, type) {
	return _URL.createObjectURL(new _Blob([content], { type: type }));
};

var createBlobBuilder = _BlobBuilder && _URL && function (content, type) {
	var bb = new _BlobBuilder();
	bb.append(content);

	return _URL.createObjectURL(bb.getBlob(type));
};

var createData = _btoa && function (content, type) {
	return 'data:' + type + ';base64,' + _btoa(content);
};

var createDynURL =
	createBlob ||
	createBlobBuilder ||
	createData;

if (!createDynURL) return;

if (createBlob) createDynURL.createBlob = createBlob;
if (createBlobBuilder) createDynURL.createBlobBuilder = createBlobBuilder;
if (createData) createDynURL.createData = createData;

if (_Blob) createDynURL.Blob = _Blob;
if (_BlobBuilder) createDynURL.BlobBuilder = _BlobBuilder;
if (_URL) createDynURL.URL = _URL;

Sink.createDynURL = createDynURL;

Sink.revokeDynURL = function (url) {
	if (typeof url === 'string' && url.indexOf('data:') === 0) {
		return false;
	} else {
		return _URL.revokeObjectURL(url);
	}
};

}(this.Sink);
