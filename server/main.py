import socketio
import eventlet
import eventlet.wsgi
from flask import Flask, render_template
import time
import math
from multiprocessing import Process
import numpy as np

eventlet.monkey_patch()

sio = socketio.Server()
app = Flask(__name__)

state = {'fft': False}

def new_thread():
    sig = np.array([math.sin(2*6.28*10*i) for i in range(4096)])
    i = 0
    while True:
        if not state['fft']:
            a = sig[i%4096:(i+256)%4096]
        else:
            m = (np.fft.fft(sig)).real
            a = (2.0/256 * np.abs(m[:128]))

        sio.emit('data', {
                'channel_id': '1',
                'fft': state['fft'],
                'sig': a.tolist(),
                'step_x': 1,
                'step_y': 1
            }, room='ch_1')

        sio.emit('data', {
                'fft': state['fft'],
                'sig': [1 for i in range(128)],
                'channel_id': '2',
                'step_x': 1,
                'step_y': 1
            }, room='ch_2')

        i = (i+1)%4096
        time.sleep(0.3)

eventlet.spawn(new_thread)

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
    # wrap Flask application with engineio's middleware
    app = socketio.Middleware(sio, app)

    # deploy as an eventlet WSGI server
    eventlet.wsgi.server(eventlet.listen(('localhost', 8001)), app)