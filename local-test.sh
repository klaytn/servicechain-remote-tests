#!/usr/bin/env bash
DOCKER_COMPOSE_ENV_FILE=./env/.env-new-new

set -e # exit on first error

cd servicechain-docker

echo "Start containers"
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE up -d

echo "Sleep 50 seconds because scn node needs to warm up during about 30 seconds"
sleep 50

echo "Check EN Operator"
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE exec -T EN-0 cat /klaytn/log/init.log

echo "Check SCN Operator"
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE exec -T SCN-0 cat /klaytn/log/init.log

echo "Stop containers"
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE down