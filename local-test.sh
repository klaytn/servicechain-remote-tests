#!/usr/bin/env bash
DOCKER_COMPOSE_ENV_FILE=./env/.env-new-new

set -e # exit on first error

cd servicechain-docker

echo ""
echo "------------------------------------------------------"
echo "Start containers"
echo "------------------------------------------------------"
echo ""
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE up -d

echo "Sleep 50 seconds because scn node needs to warm up during about 30 seconds"
sleep 50

echo ""
echo "------------------------------------------------------"
echo "Check EN Operator"
echo "------------------------------------------------------"
echo ""
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE exec -T EN-0 cat /klaytn/log/init.log

echo ""
echo "------------------------------------------------------"
echo "Check SCN Operator"
echo "------------------------------------------------------"
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE exec -T SCN-0 cat /klaytn/log/init.log

echo ""
echo "------------------------------------------------------"
echo "Make bridge-info.json"
echo "------------------------------------------------------"
echo ""
sh bridge-info/default-bridge-info.sh

echo ""
echo "------------------------------------------------------"
echo "Stop containers"
echo "------------------------------------------------------"
echo ""
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE down