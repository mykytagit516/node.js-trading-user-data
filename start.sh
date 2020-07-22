#!/bin/bash

docker rm -f trading-zoo-user-data
docker rmi hub.cgblockchain.com/trading-zoo/user-data

npm --production=false i
npm run build

./build.sh
./run.sh
