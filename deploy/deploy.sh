#!/bin/bash
set -xe

if [ $TRAVIS_BRANCH == 'master' ] ; then
  eval "$(ssh-agent -s)"
  ssh-add
  npm install
  sed -i -e "s/\$lastfm_api_key/$lastfm_api_key/g" config.js
  sed -i -e "s/devMode: true/devMode: false/g" config.js
  rsync -rq --delete $TRAVIS_BUILD_DIR/ travis@ec2-52-89-255-49.us-west-2.compute.amazonaws.com:/home/ubuntu/api.zachhuxford.io
else
  echo "Not deploying, since this branch isn't master."
fi
