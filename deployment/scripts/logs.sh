#!/bin/bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd ${DIR}

CONTAINER_NAME=$(./container-name.sh)

kubectl logs --tail 100 -f ${CONTAINER_NAME}
