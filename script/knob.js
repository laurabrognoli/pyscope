document.body.addEventListener('touchmove', function(event) { // prevents scrolling
  event.preventDefault();
}, false); 

(function( $ ) {
    $.fn.knob = function(min, max, default_val, invert) {
        this.filter("knob").each(function() {
        	var knob = $(this);
        	var num_sprites = 100;
            var initRun = true;

        	function setValue(val) {
        		if (val < min) val = min;
        		else if (val > max) val = max;

        		knob.attr('value', val); 
        		value = val;

        		var percentage = (value - min) / (max - min);
                if (initRun && invert) {
                    percentage = 1.0 - percentage;
                    initRun = false;
                }

        		var image_index = Math.floor(percentage * num_sprites);

                if (invert)
                    val = (1.0 - percentage) * (max - min) + min;

        		knob.css('background-position-y', (-64 * image_index) + 'px');
                $(knob).trigger('change', [val]);
        	}
            setValue(default_val || min);

        	knob.Touchable();
        	knob.bind('touchablemove', function (event, touchable) {
        		setValue(value - touchable.currentDelta.y);
        	});
        });
        return this;
    };
}( jQuery ));