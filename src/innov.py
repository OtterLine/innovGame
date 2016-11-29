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
    parties[room_id] = {"actions" : Queue(), name:"1"}
    _a = parties[room_id]["actions"]
    _id = room_id
    
    while True:
        socketio.sleep(1)
        
        # Get an action
        action = _a.get()

        socketio.emit('Update', {'time': time.time()}, room=_id)

        # Release the lock
        _a.task_done()
        
@app.route('/')
def hello_world():
    return render_template('client.html')

@socketio.on('connect')
def connect(message):
    # Choose a UUID
    uid = str(uuid.uuid4())
    # Set it in session var
    session['uid'] = uid
    
    join_room(parties[0]["name"])

    
@socketio.on('looking_for_a_party')
def starting_a_party(message):
    # # if (redis.get_queue("player_looking_for_a_party")) : 
    # emit('starting_party', {'starting_angle': 0, 'adversary_name' : 'nimag42', 'other': str(message)})
    # # else
    # #    emit('wait_for_party', {})

    # global parties
    # if !parties:
    #     parties.add(socketio.start_background_task(target=party_manager))
    # else:
    #     pass
    # # Launch a thread for handling this party, or connect the user to the room if already existing
    # # thread = PartyManager(user...)
    # # or
    # # Add "new user" event in Redis' thread's queue
    uid = session['uid']

    global room_by_user
    global parties
    
    room_by_user[uid] = "1"
    parties["1"]["actions"].append({"type":"join", "uid":uid})

@socketio.on('action')
def player_action(message):
    # Get UID of the user
    uid = session['uid']

    global parties
    
    parties["1"]["actions"].append({"type":message["type"], "uid": uid})
    

if __name__ == '__main__':
    socketio.run(app)
