#!/bin/sh

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DBCONF=$DIR/db.conf

if [ ! -f $DBCONF ]; then
    echo "unable to open config file ${DBCONF}"
    exit 1
fi

. $DBCONF
. $DIR/lib.sh


now=`date +'%Y-%m-%d_%H-%M-%S'`

PGPASSWORD="$DB_PASSWORD" pg_dump -h $DBHOST -U $DBUSER $DBNAME > $DBNAME-$now.sql

bzip2 -9 $DBNAME-$now.sql

