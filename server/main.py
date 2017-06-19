#server (gira sul Raspberry Pi)

import socketio
import eventlet
import eventlet.wsgi
from flask import Flask, render_template
import time
import math
from multiprocessing import Process
import numpy as np
import Adafruit_GPIO.SPI as SPI
import Adafruit_MCP3008

#inizializzazione dei pin utilizzati per la comunicazione RPi-ADC
CLK  = 18
MISO = 22
MOSI = 24
CS   = 25
mcp = Adafruit_MCP3008.MCP3008(clk=CLK, cs=CS, miso=MISO, mosi=MOSI)

eventlet.monkey_patch()

sio = socketio.Server()
app = Flask(__name__)

state = {'fft': False}

#thread che si occupa di elaborare e trasmettere il segnale
def reader_thread():
    #le istruzioni relative al secondo canale sono commentate e quindi non eseguite

    ch1_sig = [0] * 512
    #ch2_sig = [0] * 256

    last_send = 0.0

    while True:
        for i in range(1, 512):
            ch1_sig[i - 1] = ch1_sig[i]
            #ch2_sig[i - 1] = ch2_sig[i]

        # (/ 512.0 - 1) se input range [-5; +5], se [0; +5] allora (/ 1024.0)
        # input range [0; +5], quindi n / 1024.0 * 5
        ch1_sig[511] = mcp.read_adc(0) / 1024.0 * 5
        #ch2_sig[255] = mcp.read_adc(1) / 1024.0 * 5

        ch1_fft_sig = []
        #ch2_fft_sig = []

        if state['fft']:
            ch1_fft_tmp = (np.fft.fft(ch1_sig)).real
            #ch2_fft_tmp = (np.fft.fft(ch2_sig)).real
            
            ch1_fft_sig = (1.0/512 * np.abs(ch1_fft_tmp[:256])).tolist()
            #ch2_fft_sig = (1.0/256 * np.abs(ch2_fft_tmp[:128])).tolist()

        #per evitare di sovraccaricare il client si aspetta del tempo prima di inviare nuovi dati
        if time.time() - last_send > 0.3:
            sio.emit('data', {
                    'channel_id': '1',
                    'fft': state['fft'],
                    'sig': ch1_fft_sig if state['fft'] else ch1_sig,
                    'step_x': 1,
                    'step_y': 1
                }, room='ch_1')

            """sio.emit('data', {
                    'fft': state['fft'],
                    'sig': ch2_fft_sig if state['fft'] else ch2_sig,
                    'channel_id': '2',
                    'step_x': 1,
                    'step_y': 1
                }, room='ch_2')"""

            last_send = time.time()

        time.sleep(0.000000001)

#main thread, gestisce le richieste
eventlet.spawn(reader_thread)

@app.route('/')
def index():
    """Serve the client-side application."""
    return render_template('index.html')

@sio.on('enable_channel', namespace='/')
def enable_channel(sid, message):
    sio.enter_room(sid, 'ch_' + message['channel_id'])
    print(sid, " si e' aggiunto a ch ", message['channel_id'])

@sio.on('disable_channel', namespace='/')
def disable_channel(sid, message):
    sio.leave_room(sid, 'ch_' + message['channel_id'])
    print(sid, " ha lasciato ch ", message['channel_id'])

@sio.on('enable_fft', namespace='/')
def enable_fft(sid):
    state['fft'] = True
    sio.emit('state', state)
    print("fft enabled to ", sid)

@sio.on('disable_fft', namespace='/')
def disable_fft(sid):
    state['fft'] = False
    sio.emit('state', state)
    print("fft disabled to ", sid)    

@sio.on('connect', namespace='/')
def connect(sid, environ):
    print("connect ", sid)
    sio.emit('state', state)

@sio.on('disconnect', namespace='/')
def disconnect(sid):
    print('disconnect ', sid)

if __name__ == '__main__':
    app = socketio.Middleware(sio, app)

    #specifica l'indirizzo IP della macchina su cui far girare il server (IP RPi)
    eventlet.wsgi.server(eventlet.listen(('192.168.69.200', 8001)), app)
