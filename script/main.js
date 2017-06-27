//client (gira sul dispositivo dell'utente)

'use strict';

open_connecting_overlay();

//indirizzo ip del server con cui il client comunica
var socket = io('10.0.16.1:8001');

var canvas_container = $('#canvas-container');
var canvas = $('canvas.screen-canvas');
var pannello = $('#pannello');
var mega_contenitore = $('#mega-contenitore');

var canvas_context = document.getElementsByClassName('screen-canvas')[0].getContext('2d');
var canvas_dimensions = [];

var active_channels = {};
var active_measures = [];
var measureIndex = 0;

var stop_drawing = false;

var voltsPerDiv = {
	'1': 2,
	'2': 2
};

var horizontalZoom = {
	'1': 3,
	'2': 3
};

//eseguita ogni volta che il canvas viene ridimensionato (di fatto solo all'avvio)
function resize_canvas() {
	var width = canvas.width();
	var height = Math.round(width * 4.0/5.0);
	canvas_context = null;
	canvas.remove();

	canvas_container.append("<canvas class=\"screen-canvas\" width=\"" + width + "\" height=\"" + height + "\"></canvas>");
	canvas = $('canvas.screen-canvas');
	canvas_context = document.getElementsByClassName('screen-canvas')[0].getContext('2d');

	mega_contenitore.css('height', 'calc(' + height + 'px - 52px)');

	canvas_context.fillStyle = '#000';
	canvas_context.fillRect(0, 0, width, height);
	draw_grid(canvas, canvas_context);
}

//vertical zoom
//min = 0.5 V/div, max = 5 V/div, default = 2 V/div
$('knob#ch1_scale')
	.knob(0.5, 5, 2, true)
	.on('change', function (ev, new_val) {
		voltsPerDiv['1'] = new_val;
	});

$('knob#ch2_scale')
	.knob(0.5, 5, 2, true)
	.on('change', function (ev, new_val) {
		voltsPerDiv['2'] = new_val;
	});

//horizontal zoom
// min = 1, max = 5, default = 2
$('knob#ch1_horiz_zoom')
	.knob(1, 5, 2, false)
	.on('change', function (ev, new_val) {
		horizontalZoom['1'] = Math.round(new_val);
	});

$('knob#ch2_horiz_zoom')
	.knob(1, 5, 2, false)
	.on('change', function (ev, new_val) {
		horizontalZoom['2'] = Math.round(new_val);
	});

var pulsanti_laterali = $('div.container-interruttori > button');
var prototipiPannelli = $('.prototipo-pannello');

$('.prototipo-pannello#default').show();

//gestisce i pulsanti laterali e ne regola lo stato (attivo/disattivo)
pulsanti_laterali.click(function (event) {
	var target = $(event.currentTarget);
	var excludedButtonsIds = [];
	if (target.attr('excludes')) 
		excludedButtonsIds = target.attr('excludes').split(',');

	excludedButtonsIds.forEach(function (id) {
		$('#' + id).removeClass('active');
	});

	var id_pannello = target.attr('apri-pannello');	
	if (!id_pannello) {
		target.addClass('active');
		return;
	}

	prototipiPannelli.hide();
	if (target.hasClass('active')) {
		target.removeClass('active');
		$('.prototipo-pannello#default').show();
	} else {
		target.addClass('active');
		$('#' + id_pannello).show();
	}
});

$(document).ready(function () {
	resize_canvas();
});

$(window).resize(function () {
	resize_canvas();
});

//colore dei canali
var channel_colours = {
	'1': '#5cb85c',
	'2': '#31B0D5'
};

function get_first_enabled_channel() {
	var min = Infinity;
	for (var key in active_channels)
		if (active_channels[key] && key < min) min = key;

	return min;
}

//overlay prima che la connessione sia stata stabilita
function open_connecting_overlay() {
	$('body').prepend('<div id="overlay-container"><h1>Connecting...</h1></div>');
	$('#overlay-container').css('opacity', 1);
	$('.blur').addClass('active');
}

function remove_overlay() {
	$('.blur').removeClass('active');
	$('#overlay-container').css('opacity', 0).remove();
}

//per resettare lo stato del canvas
function clear_canvas() {
	canvas_context.fillStyle = '#000';
	canvas_context.fillRect(0, 0, canvas.width(), canvas.height());

	draw_grid(canvas, canvas_context);
	canvas_context.fillStyle = "#004066";
	canvas_context.fillRect(
		0,
		0,
		canvas.width(),
		31
		);

	canvas_context.fillRect(
		0,
		canvas.height() - 31,
		canvas.width(),
		canvas.height()
		);
}

socket.on('connect', function () {
	console.log('Connected');
	remove_overlay();
});

socket.on('state', function (state_object) {
	//console.log('New state from server', state_object);
	if (state_object.fft) {
		$('#time-button').removeClass('active');
		$('#fft-button').addClass('active');	
	} else {
		$('#fft-button').removeClass('active');
		$('#time-button').addClass('active');	
	}
});

socket.on('disconnect', function () {
	console.log('Disconnected');
	open_connecting_overlay();
});

//sweep verticale, di default a zero
var verticalSweep = {
	'1': 0,
	'2': 0
}
// costante per calibrare lo step di sweep verticale
var verticalSweepK = 0.012;
var voltsPerDivK = 0.28;

//gestisce lo sweep verticale
$('button.sweep').click(function (evt) {
	var target = $(evt.currentTarget);
	var channel = target.attr('channel-id');

	if (target.hasClass('reset')) {
		verticalSweep[channel] = 0;
		return;
	}

	var multiplier = target.hasClass('plus') ? +1.0 : -1.0;
	var sweepAmount = verticalSweepK * voltsPerDiv[channel] * multiplier;
	verticalSweep[channel] += sweepAmount;
});

//gestisce le misure
$('button.measure-enable').click(function (evt) {
	var target = $(evt.currentTarget);

	var channel = $('input[name=measure-channel]:checked').val();
	var type = target.attr('measure-type');

	var measureObject = {
		channel: channel,
		measure: new Measure(type)
	};

	active_measures[measureIndex] = measureObject;
	measureIndex = (measureIndex + 1) % 3;
});

var div_coord = {
	1: 0.17,
	2: 0.67
};

//ogni volta che vengono ricevuti nuovi dati
socket.on('data', function (object) {
	if (stop_drawing) {
		return;
	}

	var channel_id = object.channel_id;

	if (channel_id == get_first_enabled_channel()) clear_canvas();
	var sig = object.sig;

	canvas_context.fillStyle = channel_colours[channel_id];
	canvas_context.font = 'bold 15px monospace';
	canvas_context.fillText(
		voltsPerDiv[channel_id].toFixed(1) + ' V/div', 
		div_coord[channel_id] * canvas.width(), 
		22);

	var measure_coord = [0.05, 0.37, 0.7];

	active_measures.forEach(function (measureObject, index) {
		if (channel_id != measureObject.channel) return;

		measureObject.measure.newSet(sig);

		canvas_context.fillText(
			measureObject.measure.getFormattedString(), 
			measure_coord[index] * canvas.width(), 
			canvas.height() - 10);
	});
	
	sig = $.map(sig, function (val) {
		return (voltsPerDivK * val + verticalSweep[channel_id]) / voltsPerDiv[channel_id];
	});

	var skip_step = horizontalZoom[channel_id];
	if (skip_step > 1) {
		for (var i = sig.length - 1; i >= 0; i -= skip_step) {
			sig.splice(i, skip_step - 1);
		}
	}

	var fft = object.fft;

	var x_step = (canvas.width() - 4) / (sig.length - 1);
	var height_2 = canvas.height() / 2;

	canvas_context.beginPath();
	canvas_context.lineWidth = 4;
	canvas_context.strokeStyle = channel_colours[channel_id];

	if (!fft) { //tempo
		canvas_context.moveTo(2, height_2 + sig[0] * -(height_2 - 4));
		for (var i = 1; i < sig.length; i++) {
			canvas_context.lineTo(2 + i * x_step, height_2 + sig[i] * -(height_2 - 4));
		}
	}
	else { //frequenza
		canvas_context.moveTo(5, height_2 + sig[0] * -(height_2));
		for (var i = 1; i < sig.length; i++) {
			canvas_context.lineTo(5 + i * x_step, height_2 + sig[i] * -(height_2));
		}
	}
	
	canvas_context.stroke();
});

//pulsante di stop
$('#stop_toggle').change(function (evt) {
	var enable = evt.currentTarget.checked;
	stop_drawing = enable;
});

$('#channel-toggles > input').change(function (evt) {
	if (evt.currentTarget.id == 'stop_toggle') {
		return;
	}

	var enable = evt.currentTarget.checked;
	var currentTarget = $(evt.currentTarget);
	var ch_id = currentTarget.attr('channel-id');
	active_channels[ch_id] = enable;

	if (!enable) {
		var found = false;
		for (var k in active_channels)
			if (active_channels[k]) {
				found = true;
				break;
			}

		if (!found) clear_canvas();
	}

	socket.emit((enable ? 'enable' : 'disable') + '_channel', {channel_id: ch_id});
});

$('#time-button').click(function () {
	socket.emit('disable_fft');
});


$('#fft-button').click(function () {
	socket.emit('enable_fft');
});
