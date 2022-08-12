# servicechain-remote-tests

## Use docker-compose for setting parent and child docker image
### Parameters in env file
- PARENT_KLAYTN_DOCKER_IMAGE is a docker image name of the parent chain. The parent chain can be EN node. The parent chain version is the latest version, the development version or a specific version. You can change the version using the docker image tag in the env file you want to test.
- CHILD_KLAYTN_DOCKER_IMAGE is a docker image name of the child chain. The child chain can be SCN, SPN or SEN nodes. The child chain version is the latest version, the development version or a specific version. You can change the version using the docker image tag in the env file you want to test.
- PARENT_PUBLISHED_HOST_PORT will be published on the host machine. If you set it to 8451, you can access the 8451 port of parent container on your machine like http://127.0.0.1:8451 
- CHILD_PUBLISHED_HOST_PORT will be published on the host machine. If you set it to 8351, you can access the 8351 port of child container on your machine like http://127.0.0.1:8351

### Start or stop services using env file
```shell
cd servicechain-docker
docker-compose -f docker-compose-servicechain.yml --env-file ./env/.env-new-new up -d
docker-compose -f docker-compose-servicechain.yml --env-file ./env/.env-new-new down
```

### Nodes information of containers
- CN(Consensus Node) : Container name is CN-0
- PN(Proxy Node) : Container name is PN-0
- EN(Endpoint Node) : Container name is EN-0
- SCN(Service chain Consensus Node) : Container name is SCN-0

## Do testing in local
```shell
sh local-test.sh
```