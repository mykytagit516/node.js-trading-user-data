#!/bin/bash

jsonbin=`which json`
semverbin=`which semver`

if [[ -z $jsonbin || ! -x $jsonbin || -z $semverbin || ! -x $semverbin ]]; then
    echo "json and semver commands are requirement. Please install:"
    echo "   npm install -g json semver"
    exit 1
fi

scope='patch'
argScope=$1

if [[ $argScope == 'minor' ]]; then
    scope='minor'
fi

current=`json -f config/default.json app.version`
nextver=`semver $current --increment $scope`
version="v${nextver}"
lastcommit=`git log --pretty=format:%B -1 | cat`

echo current=$current
echo nextver=$nextver
echo version=$version
echo lastcommit=$lastcommit

git diff-index --quiet HEAD --
rc=$?

if [[ $rc != 0 ]]; then
    echo "There are uncommitted changes. Please finish and then continue"
    git st
    exit
fi

git checkout master
git pull

json -I -f config/default.json -e "this.app.version='$nextver'"
git add config/default.json
git commit -m "version bump '$nextver'"

git tag -a $nextver -m "$nextver $lastcommit"

git push
git push --tag
