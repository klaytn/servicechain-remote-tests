#!/usr/bin/env bash
set -e # exit on first error
source ../config/setting.env
node deploy-bridge-token-contract.js
node erc20-airdrop.js
node erc721-mint.js
