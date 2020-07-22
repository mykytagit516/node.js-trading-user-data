#!/bin/sh

port=''
if [ "${DBPORT}" ]; then
    port=" -p ${DBPORT}"
fi
POSTGRESQL_CMD="psql -h ${DBHOST} ${port} -U ${DBUSER} "
