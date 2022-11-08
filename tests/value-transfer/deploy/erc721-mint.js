import Caver from 'caver-js';
import fs from 'fs';
import {printStartHorizontalRule, printEndHorizontalRule} from '../deploy-utils.js';

const conf = JSON.parse(fs.readFileSync(process.env.deployBridgeConfig || './deploy-bridge.json', 'utf8'));

const childBuildPath = process.env.childBuildPath || '../build';
const parentBuildPath = process.env.parentBuildPath || '../build';

const childNFTAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/WalletERC721.abi`, 'utf8'));
const parentNFTAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/WalletERC721.abi`, 'utf8'));

const baseArray  = new Uint8Array(new SharedArrayBuffer(1));

(async function parentAndChildTransfer() {
  printStartHorizontalRule();

  const capacity = 10;
  let startIndex = 0;
  for(let i = 0; i < conf.NFTs.length; i++) {
    startIndex = await mint(conf.url.child, conf.contractOwner.child, conf.sender.child, conf.NFTs[i].child, childNFTAbi, capacity, startIndex, 'Mint NFT to Bob');
    startIndex = await mint(conf.url.parent, conf.contractOwner.parent, conf.sender.parent, conf.NFTs[i].parent, parentNFTAbi, capacity, startIndex, 'Mint NFT to Alice');
  }

  printEndHorizontalRule();
})();

async function mint(url, contractOwnerKey, receiverKey, tokenAddress, tokenAbi, capacity, startIndex, direction) {
  const caver = new Caver(url);

  const owner = caver.klay.accounts.wallet.add(contractOwnerKey).address;
  const receiver = caver.klay.accounts.wallet.add(receiverKey).address;
  const tokenContract = new caver.klay.Contract(tokenAbi, tokenAddress);

  const endId = startIndex + capacity;
  for(let i = startIndex; i < endId; i++) {
    let tokenId = getSerialTokenId();
    if(await exist(tokenContract, tokenId)) continue;

    let tokenURI = `https://klaymarket.io/nft/mint/ids/${tokenId}`;
    await tokenContract.methods.mintWithTokenURI(receiver, tokenId, tokenURI).send({from: owner, gas: 1000000});
    let tokenOwner = await tokenContract.methods.ownerOf(tokenId).call();
    console.log(`${direction} : Current owner: ${owner}`);
    console.log(`${direction} (${tokenOwner}) has a ${tokenId} tokenId with ${tokenURI}`);
  }
  return endId;
}

function getSerialTokenId() {
  Atomics.add(baseArray, 0, 1);
  return Atomics.load(baseArray,0);
}

async function exist(tokenContract, tokenId) {
  try {
    const owner = await tokenContract.methods.ownerOf(tokenId).call();
    console.error(`${tokenId} already exists by ${owner}`);
    return true;
  } catch (e) {
    // console.error(`Success empty`, e);
    return false;
  }
}
