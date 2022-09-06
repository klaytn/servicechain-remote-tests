#!/usr/bin/env bash
set -e # exit on first error

mkdir -p /klaytn

# genesis.json
cp ./genesis.json /klaytn/genesis.json

# static-nodes.json
cp ./static-nodes.json /klaytn/static-nodes.json

# main-bridges.json
cp ./main-bridges.json /klaytn/main-bridges.json

# init node
kscn --datadir /klaytn init /klaytn/genesis.json

# add docker-compose config to kcnd.conf
cat ./additional-node.conf >> /klaytn-docker-pkg/conf/kscnd.conf

# start node
/klaytn-docker-pkg/bin/kscnd start

sleep 30

# add child additional node key account
childNodeKeyAccount=`kscn attach --exec "personal.importRawKey('6a98c76bae11151c5d74f9a007fdf689a7ca8aa3a78b1268fddf6d5df5348cf1', '')" http://localhost:8551 | cut -d "\"" -f 2`
echo "child node key account is $childNodeKeyAccount" >> /klaytn/log/init.log
kscn attach --exec "personal.unlockAccount('$childNodeKeyAccount', '', 999999999)" http://localhost:8551 >> /klaytn/log/init.log
kscn attach --exec "klay.sendTransaction({from:'$childNodeKeyAccount', to:subbridge.childOperator, value: web3.toPeb(10000000000000000000000000000000, 'KLAY')})" http://localhost:8551 >> /klaytn/log/init.log

tail -f /klaytn/log/kscnd.out