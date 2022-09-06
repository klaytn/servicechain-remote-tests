#!/usr/bin/env bash
set -e # exit on first error

mkdir -p /klaytn

# genesis.json
cp ./genesis.json /klaytn/genesis.json

# static-nodes.json
cp ./static-nodes.json /klaytn/static-nodes.json

# init node
kpn --datadir /klaytn init /klaytn/genesis.json

# add docker-compose config to kcnd.conf
cat ./additional-node.conf >> /klaytn-docker-pkg/conf/kpnd.conf

# start node
/klaytn-docker-pkg/bin/kpnd start

sleep 1
tail -f /klaytn/log/kpnd.out
