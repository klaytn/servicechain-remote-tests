#!/usr/bin/env bash
DOCKER_COMPOSE_ENV_FILE=./env/.env-new-new

set -e # exit on first error
echo ""
echo "------------------------------------------------------"
echo "Stop containers"
echo "------------------------------------------------------"
echo ""
cd servicechain-docker
docker-compose -f docker-compose-servicechain.yml --env-file $DOCKER_COMPOSE_ENV_FILE down
cd ..
