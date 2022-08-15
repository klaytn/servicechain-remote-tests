#!/usr/bin/env bash
DOCKER_COMPOSE_ENV_FILE=./env/.env-new-new

set -e # exit on first error

echo ""
echo "------------------------------------------------------"
echo "Start containers"
echo "------------------------------------------------------"
echo ""
cd servicechain-docker
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE up -d
cd ..

echo "Sleep 50 seconds because scn node needs to warm up during about 30 seconds"
sleep 50

echo ""
echo "------------------------------------------------------"
echo "Check EN Operator"
echo "------------------------------------------------------"
echo ""
cd servicechain-docker
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE exec -T EN-0 cat /klaytn/log/init.log
cd ..

echo ""
echo "------------------------------------------------------"
echo "Check SCN Operator"
echo "------------------------------------------------------"
cd servicechain-docker
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE exec -T SCN-0 cat /klaytn/log/init.log
cd ..

echo ""
echo "------------------------------------------------------"
echo "Make bridge-info.json"
echo "------------------------------------------------------"
echo ""
cd servicechain-docker
sh bridge-info/default-bridge-info.sh
cd ..

echo ""
echo "------------------------------------------------------"
echo "Test the ERC20 value transfer"
echo "------------------------------------------------------"
echo ""

cp servicechain-docker/bridge-info/bridge-info.json tests/value-transfer/config
cd tests/value-transfer
npm i
cd ERC20 && bash run_testcase.sh
cd ../../..

echo ""
echo "------------------------------------------------------"
echo "Stop containers"
echo "------------------------------------------------------"
echo ""
cd servicechain-docker
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE down
cd ..
