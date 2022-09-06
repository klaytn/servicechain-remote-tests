#!/usr/bin/env bash

set -e # exit on first error

bridgeInfoDir=`dirname -- "$( readlink -f -- "$0"; )"`
cd $bridgeInfoDir/..
echo "Current directory is `pwd`"

bash bridge-info/make-bridge-info.sh $bridgeInfoDir/bridge-info-template.json $bridgeInfoDir/bridge-info.json env/.env-new-new