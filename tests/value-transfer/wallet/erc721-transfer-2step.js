import Caver from 'caver-js';
import assert from "assert";
import fs from 'fs';
import {printStartHorizontalRule, printEndHorizontalRule} from '../deploy-utils.js';

const conf = JSON.parse(fs.readFileSync(process.env.deployBridgeConfig || './deploy-bridge.json', 'utf8'));

const childBuildPath = process.env.childBuildPath || '../build';
const parentBuildPath = process.env.parentBuildPath || '../build';

const childBridgeAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/Bridge.abi`, 'utf8'));
const parentBridgeAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/Bridge.abi`, 'utf8'));

const childNFTAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/WalletERC721.abi`, 'utf8'));
const parentNFTAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/WalletERC721.abi`, 'utf8'));

(async function parentAndChildTransfer() {
    printStartHorizontalRule();

    const childCaver = new Caver(conf.url.child);
    const parentCaver = new Caver(conf.url.parent);

    const childBridgeContract = new childCaver.klay.Contract(childBridgeAbi, conf.bridge.child);
    const parentBridgeContract = new parentCaver.klay.Contract(parentBridgeAbi, conf.bridge.parent);

    const childBob = childCaver.klay.accounts.wallet.add(conf.sender.child).address;
    const parentAlice = parentCaver.klay.accounts.wallet.add(conf.sender.parent).address;

    // if no receiver is defined, then child receiver use the same parent address.
    const childAlice = conf.receiver.child || parentAlice;
    // if no receiver is defined, then parent receiver use the same child address.
    const parentBob = conf.receiver.parent || childBob;

    for (let i = 0; i < conf.tokens.length; i++) {
        const childTokenAddress = conf.NFTs[i].child;
        const parentTokenAddress = conf.NFTs[i].parent;

        const childNFTContract = new childCaver.klay.Contract(childNFTAbi, childTokenAddress);
        const parentNFTContract = new parentCaver.klay.Contract(parentNFTAbi, parentTokenAddress);

        let nft = await getFirstOwnerToken(childNFTContract, childBob);
        if(nft.tokenId === undefined) continue;
        console.log(`Bob's tokenId: ${nft.tokenId}, tokenURI: ${nft.tokenURI}`);
        await sendNFT(childBridgeContract, childNFTContract, childBob, parentNFTContract, parentBob, nft.tokenId, nft.tokenURI, "Child -> Parent");

        nft = await getFirstOwnerToken(parentNFTContract, parentAlice);
        if(nft.tokenId === undefined) continue;
        console.log(`Alice's tokenId: ${nft.tokenId}, tokenURI: ${nft.tokenURI}`);
        await sendNFT(parentBridgeContract, parentNFTContract, parentAlice, childNFTContract, childAlice, nft.tokenId, nft.tokenURI, "Parent -> Child");
    }

    printEndHorizontalRule();
})();

async function sendNFT(senderBridgeContract, senderNFTContract, sender, receiverNFTContract, receiver, tokenId, tokenURI, direction) {

    try {
        let owner = await senderNFTContract.methods.ownerOf(tokenId).call();
        console.log(`${direction} : Current chain's owner: ${owner}`);
        console.log(`${direction} : Transfer the tokenId (${tokenId}) to  ${receiver}`);

        await senderNFTContract.methods.approve(senderBridgeContract._address, tokenId).send({
            from: sender,
            gas: 1000000
        })
        await senderBridgeContract.methods.requestERC721Transfer(senderNFTContract._address, receiver, tokenId, []).send({
            from: sender,
            gas: 1000000
        })
        await sleep(3000)

        let newOwner = await receiverNFTContract.methods.ownerOf(tokenId).call();
        assert(receiver === newOwner, `different value: receiver is ${receiver}, new owner is ${newOwner}`);
        console.log(`${direction} : The other side chain's new owner: ${newOwner}`);
    } catch (e) {
        console.log("Error:", e);
        process.exit(1);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getFirstOwnerToken(tokenContract, account) {
    try {
        const balance = await tokenContract.methods.balanceOf(account).call();
        console.log('Total nft balance is', balance);
        if(balance === 0)
            return {};

        const tokenId = await tokenContract.methods.tokenOfOwnerByIndex(account, 0).call();
        // console.log('The first tokenId is', tokenId);
        const tokenURI = await tokenContract.methods.tokenURI(tokenId).call();
        // console.log('tokenURI is', JSON.stringify(tokenURI));
        return {tokenId, tokenURI};
    } catch (e) {
        console.error('getFirstOwnerToken()', e);
        return {};
    }
}
