innovGame
=========


A little game in JS for Innov Project


# Quickstart

```
vagrant up
vagrant ssh
cd /innov
export FLASK_APP=src/innov.py
python3 -m flask run
```

If you are using french locale, with locale forwarding by defautl enabled on open ssh server, it will mess up. Use this commands to sort it out :

```
export LC_ALL=C.UTF-8
export LANG=C.UTF-8
```

Browse to : http://127.0.0.1:5000/