function Measure (type) {
	var supportedTypes = ['vpp', 'vmax', 'vmin'];

	var _self = this;

	// -------- new set -------------

	var callbacksNewSet = {};
	callbacksNewSet['vmax'] = function (data) {
		_self.vmax = Number.NEGATIVE_INFINITY;

		data.forEach(function (val) {
			if (val > _self.vmax) _self.vmax = val;
		});
		console.log(val);
	};

	callbacksNewSet['vmin'] = function (data) {
		_self.vmin = Number.POSITIVE_INFINITY;

		data.forEach(function (val) {
			if (val < _self.vmin) _self.vmin = val;
		});
		console.log(val);
	};

	callbacksNewSet['vpp'] = function (data) {
		callbacksNewSet['vmax'](data);
		callbacksNewSet['vmin'](data);

		_self.vpp = _self.vmax - _self.vmin;
		console.log(val);
	};

	// ----------- get value -----------

	var callbacksGetValue = {};
	callbacksGetValue['vmax'] = function () {return _self.vmax};
	callbacksGetValue['vmin'] = function () {return _self.vmin};
	callbacksGetValue['vpp'] = function () {return _self.vpp};

	// ---------- formatted string ---------

	var callbacksFormattedString = {};
	callbacksFormattedString['vmax'] = function () {return _self.vmax.toFixed(3) + ' V'};
	callbacksFormattedString['vmin'] = function () {return _self.vmin.toFixed(3) + ' V'};
	callbacksFormattedString['vpp'] = function () {return _self.vpp.toFixed(3) + ' V'};

	type = type.toLowerCase();

	if (supportedTypes.indexOf(type) == -1) {
		throw "Invalid measure type";
	}

	this.newSet = callbacksNewSet[type];
	this.getValue = callbacksGetValue[type];
	this.getFormattedString	 = callbacksFormattedString[type];

	return this;
}