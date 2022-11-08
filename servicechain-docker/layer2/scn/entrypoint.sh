#!/usr/bin/env bash
set -e # exit on first error

mkdir -p /klaytn

# genesis.json
cp ./../genesis.json /klaytn/genesis.json

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

# create bob account : 0xc930c3a3223cf42a9675f438a458f617fa6e8e15
bobAccount=`kscn attach --exec "personal.importRawKey('acde2106c99ba64672a7912e904774643d78eb1ca3aa614ef10725b82a72f047', '')" http://localhost:8551 | cut -d "\"" -f 2`
echo "bob account is $bobAccount" >> /klaytn/log/init.log

# log child and parent operator
childOperator=`kscn attach --exec "subbridge.childOperator" http://localhost:8551 | cut -d "\"" -f 2`
parentOperator=`kscn attach --exec "subbridge.parentOperator" http://localhost:8551 | cut -d "\"" -f 2`
echo "child operator is $childOperator" >> /klaytn/log/init.log
echo "parent operator is $parentOperator" >> /klaytn/log/init.log

# transfer balance to parent operator
parentNodeKeyAccount='0x25c274e622c4deb1dcfa211e75b7b4671cdb0db2'
echo "parent node account is $parentNodeKeyAccount" >> /klaytn/log/init.log
kscn attach --exec "personal.unlockAccount('$parentNodeKeyAccount', '', 999999999)" http://172.16.100.12:8551 >> /klaytn/log/init.log
kscn attach --exec "klay.sendTransaction({from:'$parentNodeKeyAccount', to:'$parentOperator', value: web3.toPeb(10000000000000000000000000000000, 'KLAY')})" http://172.16.100.12:8551 >> /klaytn/log/init.log

tail -f /klaytn/log/kscnd.out
