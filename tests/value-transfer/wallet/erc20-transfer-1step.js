import Caver from 'caver-js';
import fs from 'fs';
import {printStartHorizontalRule, printEndHorizontalRule} from '../deploy-utils.js';

const conf = JSON.parse(fs.readFileSync(process.env.deployBridgeConfig || './deploy-bridge.json', 'utf8'));

const childBuildPath = process.env.childBuildPath || '../build'
const parentBuildPath = process.env.parentBuildPath || '../build'
const childTokenAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/WalletERC20.abi`, 'utf8'));
const parentTokenAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/WalletERC20.abi`, 'utf8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async function erc20ValueTransferStep1() {
  printStartHorizontalRule();

  const childCaver = new Caver(conf.url.child);
  const parentCaver = new Caver(conf.url.parent);

  const childBob = childCaver.klay.accounts.wallet.add(conf.sender.child).address;
  const parentAlice = parentCaver.klay.accounts.wallet.add(conf.sender.parent).address;

  // if no receiver is defined, then child receiver use the same parent address.
  const childAlice = conf.receiver.child || parentAlice;
  // if no receiver is defined, then parent receiver use the same child address.
  const parentBob = conf.receiver.parent || childBob;

  for(let i = 0; i < conf.tokens.length; i++) {
    const childTokenAddress = conf.tokens[i].child;
    const parentTokenAddress = conf.tokens[i].parent;
    const childTokenContract = new childCaver.klay.Contract(childTokenAbi, childTokenAddress);
    const parentTokenContract = new parentCaver.klay.Contract(parentTokenAbi, parentTokenAddress);

    await tokenTransfer(parentTokenContract, parentAlice, childTokenContract, childAlice, 100, 'Parent -> Child');
    await tokenTransfer(childTokenContract, childBob, parentTokenContract, parentBob, 100, 'Child -> Parent');
  }

  printEndHorizontalRule();
})();

async function tokenTransfer(senderTokenContract, sender, receiverTokenContract, receiver, amount, direction) {
  try {
    let senderBalance = await senderTokenContract.methods.balanceOf(sender).call();
    console.log(`${direction} : sender balance (before) : ${senderBalance}`);

    const receiverBalance = await receiverTokenContract.methods.balanceOf(receiver).call();
    console.log(`${direction} : receiver balance (before) : ${receiverBalance}`);

    // Transfer main chain to service chain
    const receipt = await senderTokenContract.methods.requestValueTransfer(amount, receiver, 0, []).send({from: sender, gas: 1000000});

    // Wait event to be transferred to child chain and contained into new block
    await sleep(6000);

    // Check bob balance in Service Chain
    const afterSenderBalance = await senderTokenContract.methods.balanceOf(sender).call();
    console.log(`${direction} : sender balance (after) : ${afterSenderBalance}`);
    const afterReceiverBalance = await receiverTokenContract.methods.balanceOf(receiver).call();
    console.log(`${direction} : receiver balance (after) : ${afterReceiverBalance}`);
    if( (parseInt(receiverBalance) + amount) !== parseInt(afterReceiverBalance)) {
      console.log("Receipt is ", JSON.stringify(receipt, null, 2));
      console.error("Error: send amount ", amount, " is not applied. before = ", receiverBalance, " after = ", afterReceiverBalance);
      process.exit(1);
    }
  } catch (e) {
    console.log("Error:", e);
    process.exit(1);
  }
}
