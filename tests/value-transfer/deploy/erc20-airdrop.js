import Caver from 'caver-js';
import fs from 'fs';
import {printStartHorizontalRule, printEndHorizontalRule} from '../deploy-utils.js';

const conf = JSON.parse(fs.readFileSync(process.env.deployBridgeConfig || './deploy-bridge.json', 'utf8'));

const childBuildPath = process.env.childBuildPath || '../build'
const parentBuildPath = process.env.parentBuildPath || '../build'
const childTokenAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/WalletERC20.abi`, 'utf8'));
const parentTokenAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/WalletERC20.abi`, 'utf8'));

(async function main() {
    printStartHorizontalRule();

    for (let i = 0; i < conf.tokens.length; i++) {
        await airdrop(conf.url.child, conf.contractOwner.child, conf.sender.child, 10000, conf.tokens[i].child, childTokenAbi, 'Airdrop to Bob');
        await airdrop(conf.url.parent, conf.contractOwner.parent, conf.sender.parent, 10000, conf.tokens[i].parent, parentTokenAbi, 'Airdrop to Alice');
    }

    printEndHorizontalRule();
})();

async function airdrop(url, contractOwnerKey, receiverKey, amount, tokenAddress, tokenAbi, direction) {
    const caver = new Caver(url);

    const owner = caver.klay.accounts.wallet.add(contractOwnerKey).address;
    const receiver = caver.klay.accounts.wallet.add(receiverKey).address;
    const tokenContract = new caver.klay.Contract(tokenAbi, tokenAddress);

    const beforeBalance = await tokenContract.methods.balanceOf(receiver).call();
    console.log(`${direction} balance (before) : ${beforeBalance}`);
    const receipt = await tokenContract.methods.transfer(receiver, amount).send({from: owner, gas: 1000000});
    const afterBalance = await tokenContract.methods.balanceOf(receiver).call();
    console.log(`${direction} balance (after) : ${afterBalance}`);

    if ((parseInt(beforeBalance) + amount) !== parseInt(afterBalance)) {
        console.log("Receipt is ", JSON.stringify(receipt, null, 2));
        console.error("Error: send amount ", amount, " is not applied. before = ", beforeBalance, " after = ", afterBalance);
        process.exit(1);
    }
}
