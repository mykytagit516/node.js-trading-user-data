#!/bin/bash

kubectl get pods | grep 'user-data' | awk 'NR==1{print $1}'
