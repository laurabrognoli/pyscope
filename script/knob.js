document.body.addEventListener('touchmove', function(event) { // prevents scrolling
  event.preventDefault();
}, false); 

(function( $ ) {
    $.fn.knob = function(min, max) {
        this.filter("knob").each(function() {
        	var knob = $(this);
        	var num_sprites = 100;

        	value = parseInt(knob.attr('value')) || min;
        	function setValue(val) {
        		if (val < min) val = min;
        		else if (val > max) val = max;

        		knob.attr('value', val);
        		value = val;

        		var percentage = (value - min) / (max - min);
        		var image_index = Math.floor(percentage * num_sprites);

        		knob.css('background-position-y', (-64 * image_index) + 'px');
                $(knob).trigger('change', [value]);
        	}

        	setValue(value); // aggiorno in caso non sia gia' settato

        	knob.Touchable();
        	knob.bind('touchablemove', function (event, touchable) {
        		setValue(value - touchable.currentDelta.y);
        	});
        });
        return this;
    };
}( jQuery ));