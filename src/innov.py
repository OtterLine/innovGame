#!/usr/bin/env python3
# coding: utf-8
"""
Innov Project
"""

import time
import uuid
import random
import math

from queue import Queue
from flask import Flask, render_template, session
from flask_socketio import SocketIO, emit, join_room, leave_room
from threading import Thread

app = Flask(__name__, static_url_path='/static')

app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

parties = {}
room_by_user = {}

def randn_bm(mean,sigma):
    u = random.random()
    v = random.random()
    x = math.sqrt(-2.0*math.log(u))*math.cos(2.0*math.pi*v)
    return x*sigma + mean

def randn_bimodal(mean_1, sigma_1, mean_2, sigma_2):
    u = random.random()
    if u > 0.5:
        return randn_bm(mean_1, sigma_1)
    return randn_bm(mean_2, sigma_2)

def party_manager(room_id):
    global parties
    parties[room_id] = {"actions" : Queue(), "name":0, "players" : {}, "foods": []}
    _a = parties[room_id]["actions"]
    _p = parties[room_id]["players"]
    _f = parties[room_id]["foods"]
    _id = room_id

    # Generate some foods
    for i in range(10):
        _f.append({"ttl":60*3+random.random()*60, "angle":random.random()*2*math.pi, "radius":randn_bimodal(200+200/4, 200/12, 200 - 200/4, 200/12)})

    while True:
        start_time = time.time()
        
        # Pop food
        if (random.random() > 0.95):
            food = {"ttl":60*3 + random.random()*60, "angle":random.random()*2*math.pi, "radius":randn_bimodal(200+200/4, 200/12, 200 - 200/4, 200/12)}
            _f.append(food)
            socketio.emit('action', {"type":"pop_food", "uid":'0', "food":food}, room=_id)
        
        # Get an action
        try:
            action = _a.get_nowait()
            if (action['type'] == 'join'):
                print ("New player : " + str(action['uid']))
                _p[action['uid']] = {'uid' : action['uid'], 'angle' : 0.0, 'jumping' : False, 'jumping_progress' : 0, "direction" : 1}
                socketio.emit('action', {"type":"join", "uid": action["uid"], "player":_p[action["uid"]]}, room=_id)
            elif (action['type'] == 'flip'):
                _p[action['uid']]['direction'] *= -1
                socketio.emit('action', {"type":action["type"], "uid":action["uid"]}, room=_id)
            else:
                socketio.emit('action', {"type":action["type"], "uid":action["uid"]}, room=_id)
        except:
            pass
        else:
            _a.task_done() # Release the lock

        # Update position
        for i in _p:
            _p[i]['angle'] += _p[i]['direction'] * 0.01;
            
        # Update food ttl
        i = 0
        while i < len(_f):
            _f[i]['ttl']-=1
            if (_f[i]['ttl'] <= 0):
                _f.pop(i)
            else:
                i+=1

        time_to_sleep = 1/60.0 - ((time.time()-start_time))
        if (time_to_sleep > 0):
            time.sleep(time_to_sleep)
        else :
            print("Oups ! " + str(time_to_sleep))

@app.route('/')
def game_view():
    return render_template('jeu-multi.html')

@app.route('/debug')
def debug_view():
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

    global parties

    party_to_join = 0
    session['room'] = party_to_join
    
    join_room(parties[party_to_join]["name"])

    parties[party_to_join]["actions"].put_nowait({"type":"join", "uid":uid})
    
    players = parties[party_to_join]["players"]
    foods = parties[party_to_join]["foods"]

    emit('party_found', {'uid':uid, 'starting_angle' : 0, "players": players, "foods": foods})
    
@socketio.on('action')
def player_action(message):
    # Get UID of the user
    uid = session['uid']
    room = session['room']
    
    global parties
    
    parties[room]["actions"].put_nowait({"type":message["type"], "uid": uid})
    

if __name__ == '__main__':
    socketio.run(app)

party0 = Thread(target=party_manager, args=(0,) )
party0.start()
