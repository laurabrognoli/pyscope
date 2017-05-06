import time
import math

class MCP3008:
	def __init__(self, clk, cs, miso, mosi):
		pass

	def read_adc(self, n_adc):
		millis = time.time() * 1000
		if n_adc == 0:
			return math.cos(millis) * 512 + 512
		return math.sin(millis / 4.2) * 512 + 512