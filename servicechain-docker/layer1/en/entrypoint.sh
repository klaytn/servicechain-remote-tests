#!/usr/bin/env bash
set -e # exit on first error

mkdir -p /klaytn

# genesis.json
cp ./../genesis.json /klaytn/genesis.json

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

# create alice account : 0x01dabcf70a08df30536ce523494303148b8f4c4d
aliceAccount=`ken attach --exec "personal.importRawKey('483bb95b5becd97b05fe280f215795de15eb9b31aaba9fe27625a372e59f556c', '')" http://localhost:8551 | cut -d "\"" -f 2`
echo "alice account address is $aliceAccount" >> /klaytn/log/init.log

tail -f /klaytn/log/kend.out
