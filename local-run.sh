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
cp servicechain-docker/bridge-info/bridge-info.json tests/value-transfer/config

echo ""
echo "------------------------------------------------------"
echo "Deploy bridge and token contracts for value transfer"
echo "------------------------------------------------------"
echo ""

cd tests/value-transfer
npm i
cd deploy && bash deploy-contracts.sh
cd ../../..

echo ""
echo "------------------------------------------------------"
echo "Test the value transfer for wallet"
echo "------------------------------------------------------"
echo ""

cd tests/value-transfer
#npm i
cd wallet && bash run-value-transfer.sh
cd ../../..


DOWN_SKIP_FLAG=$1
if [[ "${DOWN_SKIP_FLAG}" == "down-skip" ]]; then
  echo "Down command is skipped!"
else
  echo ""
  echo "------------------------------------------------------"
  echo "Stop containers"
  echo "------------------------------------------------------"
  echo ""
  echo "Down command is checked!"
  cd servicechain-docker
  docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE down
  cd ..
fi
