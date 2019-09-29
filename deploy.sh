#!/bin/bash
set -xe

if [ $TRAVIS_BRANCH == 'master' ] ; then
  eval "$(ssh-agent -s)"
  ssh-add
  npm install
  rsync -rq --delete --rsync-path="mkdir -p api.zachhuxford.io && rsync" \
  $TRAVIS_BUILD_DIR/ travis@ec2-52-89-255-49.us-west-2.compute.amazonaws.com:api.zachhuxford.io
else
  echo "Not deploying, since this branch isn't master."
fi
