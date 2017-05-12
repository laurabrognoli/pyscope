'use strict';

open_connecting_overlay();

var socket = io('localhost:8001');
//var socket = io('192.168.1.113:8001');

var canvas_container = $('#canvas-container');
var canvas = $('canvas.screen-canvas');
var pannello = $('#pannello');
var mega_contenitore = $('#mega-contenitore');

var canvas_context = document.getElementsByClassName('screen-canvas')[0].getContext('2d');
var canvas_dimensions = [];

var active_channels = {};

var stop_drawing = false;

function resize_canvas() {
	var width = canvas.width();
	var height = Math.round(width * 4/5);
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

var pulsanti_laterali = $('div.container-interruttori > button');

pulsanti_laterali.click(function (event) {
	console.log(pulsanti_laterali);
	pulsanti_laterali.removeClass('active');
	var bottone = $(event.currentTarget);
	console.log(bottone);
	bottone.addClass('active');
	var id_pannello = bottone.attr('apri-pannello'); // TODO: aggiungere controlli
	var nuovo_pannello = $('#' + id_pannello);
	pannello.html(nuovo_pannello.html());
});

$(document).ready(function () {
	// TODO: togliere animazione di caricamento
	resize_canvas();
});

$(window).resize(function () {
	resize_canvas();
});

var channel_colours = {
	'1': '#449D44',
	'2': '#31B0D5',
	'3': '#EC971F'
};

function get_first_enabled_channel() {
	var min = Infinity;
	for (var key in active_channels)
		if (active_channels[key] && key < min) min = key;

	return min;
}

function open_connecting_overlay() {
	$('body').prepend('<div id="overlay-container"><h1>Connecting...</h1></div>');
	$('#overlay-container').css('opacity', 1);
	$('.blur').addClass('active');
}

function remove_overlay() {
	$('.blur').removeClass('active');
	$('#overlay-container').css('opacity', 0).remove();
}

function clear_canvas() {
	canvas_context.fillStyle = '#000';
	canvas_context.fillRect(0, 0, canvas.width(), canvas.height());

	draw_grid(canvas, canvas_context);
}

socket.on('connect', function () {
	console.log('Connected');
	remove_overlay();
});

socket.on('state', function (state_object) {
	console.log('New state from server', state_object);
	if (state_object.fft) {
		$('#time-button').removeClass('active');
		$('#fft-button').addClass('active');	
	} else if (!($('#qam-button').hasClass('active') || $('#meas-button').hasClass('active'))) {
		$('#fft-button').removeClass('active');
		$('#time-button').addClass('active');	
	}
});

socket.on('disconnect', function () {
	console.log('Disconnected');
	open_connecting_overlay();
})

var scaleFactors = {
	'1': 0.1,
	'2': 0.1
};

$('knob#ch1_scale')
	.knob(1, 9)
	.on('change', function (ev, new_val) {
		scaleFactors['1'] = new_val / 5;
	});

$('knob#ch2_scale')
	.knob(1, 9)
	.on('change', function (ev, new_val) {
		scaleFactors['2'] = new_val / 5;
	});

socket.on('data', function (object) {
	if (stop_drawing) {
		return;
	}

	var channel_id = object.channel_id;

	if (channel_id == get_first_enabled_channel()) clear_canvas();
	var sig = object.sig;

	sig = $.map(sig, function (el) {
		return 1.0 * el * scaleFactors[channel_id];
	});

	var fft = object.fft;

	var x_step = (canvas.width() - 4) / (sig.length - 1);
	var height_2 = canvas.height() / 2;

	canvas_context.beginPath();
	canvas_context.lineWidth = 1.8;
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

$('#mega-contenitore button').click(function (evt) {
	var currentTarget = $(evt.currentTarget);
	if (currentTarget.attr('id') == 'fft-button') {
		socket.emit('enable_fft');
	}
	else {
		socket.emit('disable_fft')
	}
});
