#!/bin/bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd ${DIR}

CONTAINER_NAME=$(./container-name.sh)

kubectl delete pod ${CONTAINER_NAME}
