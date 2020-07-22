#!/bin/bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd ${DIR}

CONTAINER_NAME=$(./container-name.sh)

kubectl exec ${CONTAINER_NAME} -it -- /bin/sh
