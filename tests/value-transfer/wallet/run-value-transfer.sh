#!/usr/bin/env bash
set -e # exit on first error
source ../config/setting.env
node erc20-transfer-1step.js
node erc20-transfer-2step.js
node erc721-transfer-2step.js
