#!/usr/bin/env python3
# coding: utf-8
"""
Innov Project
"""

import time
import uuid

from queue import Queue
from flask import Flask, render_template, session
from flask_socketio import SocketIO, emit, join_room, leave_room
from threading import Thread

app = Flask(__name__)

app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

parties = {}
room_by_user = {}


def party_manager(room_id):
    global parties
    parties[room_id] = {"actions" : Queue(), "name":0}
    _a = parties[room_id]["actions"]
    _id = room_id

    while True:
        time.sleep(1)

        # Get an action
        try:
            action = _a.get_nowait()
            if (action['type'] == 'join'):
                print (action['uid'])
                _a.task_done() # Release the lock
        except:
            pass
        
        socketio.emit('update', {'time': time.time()}, room=_id)        

@app.route('/')
def hello_world():
    return render_template('client.html')


@socketio.on('connect')
def connect():
    # Choose a UUID
    uid = str(uuid.uuid4())
    # Set it in session var
    session['uid'] = uid


@socketio.on('looking_for_a_party')
def starting_a_party(message):
    uid = session['uid']

    global room_by_user
    global parties

    party_to_join = 0
    
    join_room(parties[party_to_join]["name"])
    room_by_user[uid] = party_to_join
    parties[party_to_join]["actions"].put_nowait({"type":"join", "uid":uid})
    emit( 'party_found', {'parties' : str(parties)})
    
@socketio.on('action')
def player_action(message):
    # Get UID of the user
    uid = session['uid']

    global parties
    
    parties[room_by_user["uid"]]["actions"].append({"type":message["type"], "uid": uid})
    

if __name__ == '__main__':
    socketio.run(app)

party0 = Thread(target=party_manager, args=(0,) )
party0.start()
