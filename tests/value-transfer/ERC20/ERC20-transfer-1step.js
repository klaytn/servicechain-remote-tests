const Caver = require('caver-js');
const fs = require('fs');

const conf = JSON.parse(fs.readFileSync(process.env.transferConfig || 'transfer-config.json', 'utf8'));

const childBuildPath = process.env.childBuildPath || '../build'
const parentBuildPath = process.env.parentBuildPath || '../build'
const childTokenAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/ServiceChainToken.abi`, 'utf8'));
const parentTokenAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/ServiceChainToken.abi`, 'utf8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function parentTokenTransfer() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- parent sent to bob ${testcase} START -------------------------`)
  const scnCaver = new Caver(conf.url.child);
  const scnInstance = new scnCaver.klay.Contract(childTokenAbi, conf.contract.child.token);

  const enCaver = new Caver(conf.url.parent);
  const enInstance = new enCaver.klay.Contract(parentTokenAbi, conf.contract.parent.token);

  conf.sender.child.address = scnCaver.klay.accounts.wallet.add(conf.sender.child.key).address;
  conf.sender.parent.address = enCaver.klay.accounts.wallet.add(conf.sender.parent.key).address;
  const bob = "0xd40b6909eb7085590e1c26cb3becc25368e249e9";
  
  try {
    let balance = await scnInstance.methods.balanceOf(bob).call();
    console.log("bob balance (before) :", balance);

    // Transfer main chain to service chain
    const amount = 100
    const receipt = await enInstance.methods.requestValueTransfer(amount, bob, 0, []).send({from:conf.sender.parent.address, gas: 1000000});
    // Wait event to be transferred to child chain and contained into new block
    await sleep(6000);

    // Check bob balance in Service Chain
    const afterBalance = await scnInstance.methods.balanceOf(bob).call();
    console.log("bob balance (after) :", afterBalance);
    if( (parseInt(balance) + amount) != parseInt(afterBalance)) {
      console.log("Receipt is ", JSON.stringify(receipt, null, 2));
      console.error("Error: send amount ", amount, " is not applied. before = ", balance, " after = ", afterBalance);
      process.exit(1);
    }
  } catch (e) {
    console.log("Error:", e);
    process.exit(1);
  }
  console.log(`------------------------- ${testcase} END -------------------------`)
}

async function childTokenTransfer() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- child send to alice ${testcase} START -------------------------`)
  const scnCaver = new Caver(conf.url.child);
  const scnInstance = new scnCaver.klay.Contract(childTokenAbi, conf.contract.child.token);

  const enCaver = new Caver(conf.url.parent);
  const enInstance = new enCaver.klay.Contract(parentTokenAbi, conf.contract.parent.token);

  conf.sender.child.address = scnCaver.klay.accounts.wallet.add(conf.sender.child.key).address;
  conf.sender.parent.address = enCaver.klay.accounts.wallet.add(conf.sender.parent.key).address;
  const alice = "0xc40b6909eb7085590e1c26cb3becc25368e249e9";

  try {
    const balance = await enInstance.methods.balanceOf(alice).call();
    console.log("alice balance (before) :", balance);

    // Transfer main chain to service chain
    const amount = 100
    const receipt = await scnInstance.methods.requestValueTransfer(amount, alice, 0, []).send({from:conf.sender.child.address, gas: 1000000});
    // Wait event to be transferred to child chain and contained into new block
    await sleep(6000);

    // Check alice balance in Service Chain
    const afterBalance = await enInstance.methods.balanceOf(alice).call();
    console.log("alice balance (after) :", afterBalance);
    if( (parseInt(balance) + amount) != parseInt(afterBalance)) {
      console.log("Receipt is ", JSON.stringify(receipt, null, 2));
      console.error("Error: send amount ", amount, " is not applied. before = ", balance, " after = ", afterBalance);
      process.exit(1);
    }
  } catch (e) {
    console.log("Error:", e);
    process.exit(1);
  }
  console.log(`------------------------- ${testcase} END -------------------------`)
}

(async function testErc20ValueTransfer() {
  await parentTokenTransfer()
  await childTokenTransfer()
})()