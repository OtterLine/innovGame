#!/usr/bin/env python3
# coding: utf-8
"""
Innov Project
"""

from flask import Flask
app = Flask(__name__)


@app.route('/')
def hello_world():
    return 'Hello, World!'

if __name__ == "__main__":
    app.run()
