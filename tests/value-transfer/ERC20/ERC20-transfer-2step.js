const Caver = require('caver-js');
const fs = require('fs');

const conf = JSON.parse(fs.readFileSync(process.env.transferConfig, 'utf8'));

const childBuildPath = process.env.childBuildPath || '../build'
const parentBuildPath = process.env.parentBuildPath || '../build'

const childBridgeAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/Bridge.abi`, 'utf8'));
const parentBridgeAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/Bridge.abi`, 'utf8'));

const childTokenAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/ServiceChainToken.abi`, 'utf8'));
const parentTokenAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/ServiceChainToken.abi`, 'utf8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function parentTokenTransfer() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- parent send to bob ${testcase} START -------------------------`)
  const scnCaver = new Caver(conf.url.child);
  const scnInstance = new scnCaver.klay.Contract(childTokenAbi, conf.contract.child.token);

  const enCaver = new Caver(conf.url.parent);
  const enInstance = new enCaver.klay.Contract(parentTokenAbi, conf.contract.parent.token);
  const enInstanceBridge = new enCaver.klay.Contract(parentBridgeAbi, conf.contract.parent.bridge);

  conf.sender.child.address = scnCaver.klay.accounts.wallet.add(conf.sender.child.key).address;
  conf.sender.parent.address = enCaver.klay.accounts.wallet.add(conf.sender.parent.key).address;
  const bob = "0xd40b6909eb7085590e1c26cb3becc25368e249e9";

  try {
    let balance = await scnInstance.methods.balanceOf(bob).call();
    console.log("bob balance:", balance);

    // Transfer main chain to service chain
    console.log("requestValueTransfer..")
    let amount = 100;
    await enInstance.methods.approve(conf.contract.parent.bridge, amount).send({from:conf.sender.parent.address, to: conf.contract.parent.token, gas: 1000000})
    await enInstanceBridge.methods.requestERC20Transfer(conf.contract.parent.token, bob, amount, 0, []).send({from:conf.sender.parent.address, gas: 1000000})
    // Wait event to be transferred to child chain and contained into new block
    await sleep(6000);

    // Check bob balance in Service Chain
    balance = await scnInstance.methods.balanceOf(bob).call();
    console.log("bob balance:", balance);
    console.log(`------------------------- ${testcase} END -------------------------`)
  } catch (e) {
    console.log("Error:", e);
    process.exit(1);
  }
}

async function childTokenTransfer() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- child send to alice ${testcase} START -------------------------`)
  const scnCaver = new Caver(conf.url.child);
  const scnInstance = new scnCaver.klay.Contract(childTokenAbi, conf.contract.child.token);
  const scnInstanceBridge = new scnCaver.klay.Contract(childBridgeAbi, conf.contract.child.bridge);

  const enCaver = new Caver(conf.url.parent);
  const enInstance = new enCaver.klay.Contract(parentTokenAbi, conf.contract.parent.token);

  conf.sender.child.address = scnCaver.klay.accounts.wallet.add(conf.sender.child.key).address;
  conf.sender.parent.address = enCaver.klay.accounts.wallet.add(conf.sender.parent.key).address;
  const alice = "0xc40b6909eb7085590e1c26cb3becc25368e249e9";

  try {
    let balance = await enInstance.methods.balanceOf(alice).call();
    console.log("alice balance:", balance);

    // Transfer main chain to service chain
    console.log("requestValueTransfer..")
    let amount = 100;
    await scnInstance.methods.approve(conf.contract.child.bridge, amount).send({from:conf.sender.child.address, to: conf.contract.child.token, gas: 1000000})
    await scnInstanceBridge.methods.requestERC20Transfer(conf.contract.child.token, alice, amount, 0, []).send({from:conf.sender.child.address, gas: 1000000})
    // Wait event to be transferred to child chain and contained into new block
    await sleep(6000);

    // Check alice balance in Service Chain
    balance = await enInstance.methods.balanceOf(alice).call();
    console.log("alice balance:", balance);
    console.log(`------------------------- ${testcase} END -------------------------`)
  } catch (e) {
    console.log("Error:", e);
    process.exit(1);
  }
}

(async function testErc20ValueTransferStep2() {
  await parentTokenTransfer()
  await childTokenTransfer()
})()
