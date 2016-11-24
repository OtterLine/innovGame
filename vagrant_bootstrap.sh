#!/usr/bin/env bash

apt-get -qq update
apt-get -qq upgrade

apt-get -qq install build-essential python-software-properties python3 python3-dev python3-pip
easy_install3 -U pip  # Solve debian bug


wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
make install

pip3 install -qUr /innov/requirements.txt