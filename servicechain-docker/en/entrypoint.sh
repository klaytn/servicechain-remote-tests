#!/usr/bin/env bash
set -e # exit on first error

mkdir -p /klaytn

# genesis.json
cp ./genesis.json /klaytn/genesis.json

# static-nodes.json
cp ./static-nodes.json /klaytn/static-nodes.json

# init node
ken --datadir /klaytn init /klaytn/genesis.json

# add docker-compose config to kcnd.conf
cat ./additional-node.conf >> /klaytn-docker-pkg/conf/kend.conf

# start node
/klaytn-docker-pkg/bin/kend start

sleep 20

# add parent additional node key account
parentNodeKeyAccount=`ken attach --exec "personal.importRawKey('1dd4dc19688dde6b519f3d305349fa7cbc6f5c4195e72e0d12b665b2bc39a3a1', '')" http://localhost:8551 | cut -d "\"" -f 2`
echo "parent node key account address is $parentNodeKeyAccount" >> /klaytn/log/init.log
ken attach --exec "personal.unlockAccount('$parentNodeKeyAccount', '', 999999999)" http://localhost:8551 >> /klaytn/log/init.log

tail -f /klaytn/log/kend.out