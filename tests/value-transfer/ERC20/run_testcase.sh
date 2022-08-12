#!/usr/bin/env bash
set -e # exit on first error
source setting-001.source
node ERC20-deploy.js
node ERC20-transfer-1step.js
node ERC20-transfer-2step.js