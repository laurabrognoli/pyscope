"use strict";

var GRID_HORIZONTAL_NUM = 9;

function draw_grid(canvas, ctx) {
	var height = canvas.height();
	var width = canvas.width();

	var pixel_num = width / GRID_HORIZONTAL_NUM + 1;
	var GRID_VERTICAL_NUM = Math.round(height / pixel_num) - 1;
	if (GRID_VERTICAL_NUM % 2 == 0)
		GRID_VERTICAL_NUM++;

	// colore globale per tutta la griglia
	ctx.strokeStyle = 'rgba(246,248,255,0.65)';

	// parte orizzontale --------

	// prima riga centrale
	ctx.beginPath();
	ctx.lineWidth = 1.1;

	ctx.moveTo(3, height / 2);
	ctx.lineTo(width - 3, height / 2);

	ctx.stroke();

	// piu' sottile per le altre linee
	ctx.lineWidth = 1;
	// (horiz_num - 1) / 2
	for (var i = 0; i <= Math.floor(GRID_VERTICAL_NUM / 2); i++) {
		// linea sopra e sotto specchiate (+- offset)
		var offset = pixel_num * i;

		ctx.beginPath();
		ctx.moveTo(3, height / 2 + offset);
		ctx.lineTo(width - 3, height / 2 + offset);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(3, height / 2 - offset);
		ctx.lineTo(width - 3, height / 2 - offset);
		ctx.stroke();
	}

	// --------------------------

	// parte verticale --------

	// prima riga centrale
	ctx.beginPath();
	ctx.lineWidth = 1.1;

	ctx.moveTo(width / 2, 3);
	ctx.lineTo(width / 2, height - 3);

	ctx.stroke();

	// piu' sottile per le altre linee
	ctx.lineWidth = 1;
	// (horiz_num - 1) / 2
	for (var i = 0; i <= Math.floor(GRID_HORIZONTAL_NUM / 2); i++) {
		// linea sopra e sotto specchiate (+- offset)
		var offset = pixel_num * i;

		ctx.beginPath();
		ctx.moveTo(width / 2 + offset, 3);
		ctx.lineTo(width / 2 + offset, height - 3);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(width / 2 - offset, 3);
		ctx.lineTo(width / 2 - offset, height - 3);
		ctx.stroke();
	}

	// --------------------------
}
