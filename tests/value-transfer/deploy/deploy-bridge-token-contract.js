import Caver from 'caver-js';
import axios from "axios";
import fs from 'fs';
import {printStartHorizontalRule, printEndHorizontalRule} from '../deploy-utils.js';

const conf = JSON.parse(fs.readFileSync(process.env.bridgeInfo || '../config/bridge_info.json', 'utf8'));

async function deployBridge(url, contractOwnerKey, contractData, bridgeAbi, bridgeCode, direction) {
    const caver = new Caver(url);
    contractData.ownerAddress = caver.klay.accounts.wallet.add(contractOwnerKey).address;

    try {
        // Deploy bridge
        const instanceBridge = new caver.klay.Contract(bridgeAbi);
        contractData.contracts.bridgeContract = await instanceBridge.deploy({data: bridgeCode, arguments: [true]})
            .send({from: contractData.ownerAddress, gas: 100000000, value: 0});
        contractData.bridgeAddress = contractData.contracts.bridgeContract._address;
        console.log(`${direction} bridgeAddress: ${contractData.bridgeAddress}`);
    } catch (e) {
        console.log("Error:", e);
        process.exit(1);
    }
}

async function deployToken(url, contractOwnerKey, contractData, tokenAbi, tokenCode, tokenName, tokenSymbol, tokenDecimals, direction) {
    const caver = new Caver(url);
    contractData.ownerAddress = caver.klay.accounts.wallet.add(contractOwnerKey).address;

    try {
        // Deploy ERC20 token
        const instance = new caver.klay.Contract(tokenAbi);
        contractData.contracts.tokenContract = await instance.deploy({
            data: tokenCode,
            arguments: [contractData.bridgeAddress, tokenName, tokenSymbol, tokenDecimals]
        })
            .send({from: contractData.ownerAddress, gas: 100000000, value: 0});
        contractData.tokenAddress = contractData.contracts.tokenContract._address;
        console.log(`${direction} tokenAddress: ${contractData.tokenAddress}`);
    } catch (e) {
        console.log("Error:", e);
        process.exit(1);
    }
}

async function deployNFT(url, contractOwnerKey, contractData, tokenAbi, tokenCode, tokenName, tokenSymbol, direction) {
    const caver = new Caver(url);
    contractData.ownerAddress = caver.klay.accounts.wallet.add(contractOwnerKey).address;

    try {
        // Deploy ERC721 token
        const instance = new caver.klay.Contract(tokenAbi);
        contractData.contracts.nftContract = await instance.deploy({
            data: tokenCode,
            arguments: [contractData.bridgeAddress, tokenName, tokenSymbol]
        })
            .send({from: contractData.ownerAddress, gas: 100000000, value: 0});
        contractData.nftAddress = contractData.contracts.nftContract._address;
        console.log(`${direction} nftAddress: ${contractData.nftAddress}`);
    } catch (e) {
        console.log("Error:", e);
        process.exit(1);
    }
}

(async function BridgeAndTokenDeploy() {
    printStartHorizontalRule();

    conf.contractData = {child: {contracts: {}}, parent: {contracts: {}}}
    const childBuildPath = process.env.childBuildPath || '../build'
    const childBridgeAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/Bridge.abi`, 'utf8'));
    const childBridgeCode = fs.readFileSync(`${childBuildPath}/Bridge.bin`, 'utf8');

    await deployBridge(conf.url.child, conf.contractOwnerKey.child, conf.contractData.child, childBridgeAbi, childBridgeCode, 'Child');

    const parentBuildPath = process.env.parentBuildPath || '../build'
    const parentBridgeAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/Bridge.abi`, 'utf8'));
    const parentBridgeCode = fs.readFileSync(`${parentBuildPath}/Bridge.bin`, 'utf8');
    await deployBridge(conf.url.parent, conf.contractOwnerKey.parent, conf.contractData.parent, parentBridgeAbi, parentBridgeCode, 'Parent');

    const childTokenAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/WalletERC20.abi`, 'utf8'));
    const childTokenCode = fs.readFileSync(`${childBuildPath}/WalletERC20.bin`, 'utf8');
    await deployToken(conf.url.child, conf.contractOwnerKey.child, conf.contractData.child, childTokenAbi, childTokenCode, 'Service Chain Token L2', 'SCTL2', 18, 'Child');

    const parentTokenAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/WalletERC20.abi`, 'utf8'));
    const parentTokenCode = fs.readFileSync(`${parentBuildPath}/WalletERC20.bin`, 'utf8');
    await deployToken(conf.url.parent, conf.contractOwnerKey.parent, conf.contractData.parent, parentTokenAbi, parentTokenCode, 'Service Chain Token L1', 'SCTL1', 18, 'Parent');


    const childNFTAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/WalletERC721.abi`, 'utf8'));
    const childNFTCode = fs.readFileSync(`${childBuildPath}/WalletERC721.bin`, 'utf8');
    await deployNFT(conf.url.child, conf.contractOwnerKey.child, conf.contractData.child, childNFTAbi, childNFTCode, 'Service Chain Game L2', 'SCGL2', 'Child');

    const parentNFTAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/WalletERC721.abi`, 'utf8'));
    const parentNFTCode = fs.readFileSync(`${parentBuildPath}/WalletERC721.bin`, 'utf8');
    await deployNFT(conf.url.parent, conf.contractOwnerKey.parent, conf.contractData.parent, parentNFTAbi, parentNFTCode, 'Service Chain Game L1', 'SCGL1', 'Parent');


    await registerBridge(conf.url.child, conf.operators, conf.contractData.child, conf.contractData.parent);
    await registerToken(conf.url, conf.contractData.child, conf.contractData.parent);
    await registerNFT(conf.url, conf.contractData.child, conf.contractData.parent);
    await registerOperator(conf.operators, conf.contractData.child, conf.contractData.parent);
    const deployBridgeConfig = saveDeployBridgeConfig(conf);
    await sendValueToOperatorAndReceiver(conf, deployBridgeConfig);

    printEndHorizontalRule();
})();

function saveDeployBridgeConfig(conf) {
    const filename = process.env.deployBridgeConfig || './deploy-bridge.json';
    const deployBridge = {
        bridge: {
            parent: conf.contractData.parent.bridgeAddress,
            child: conf.contractData.child.bridgeAddress
        },
        url: {
            parent: conf.url.parent,
            child: conf.url.child
        },
        contractOwner: {
            parent: conf.contractOwnerKey.parent,
            child: conf.contractOwnerKey.child
        },
        sender: {
            parent: conf.senderKey.alice,
            child: conf.senderKey.bob
        },
        receiver: {
            parent: '0x17473dcB28994F8815f0E3879721602a83CE7BD6',
            child: '0x17473dcB28994F8815f0E3879721602a83CE7BD6'
        },
        tokens: [{
            parent: conf.contractData.parent.tokenAddress,
            child: conf.contractData.child.tokenAddress
        }],
        NFTs: [{
            parent: conf.contractData.parent.nftAddress,
            child: conf.contractData.child.nftAddress
        }]
    }

    const json = JSON.stringify(deployBridge, null, 2);
    fs.writeFile(filename, json, (err) => {
        if (err) {
            console.log("Error:", err);
            process.exit(1);
        }
    });
    return deployBridge;
}

async function registerBridge(childUrl, operators, child, parent) {
    console.log("\n\n");
    console.log(`Run below 3 commands in the Javascript console of all child bridge nodes (${operators.length} nodes total)`);
    console.log(`subbridge.registerBridge("${child.bridgeAddress}", "${parent.bridgeAddress}")`)
    console.log(`subbridge.subscribeBridge("${child.bridgeAddress}", "${parent.bridgeAddress}")`)
    console.log(`ERC20 subbridge.registerToken("${child.bridgeAddress}", "${parent.bridgeAddress}", "${child.tokenAddress}", "${parent.tokenAddress}")`)
    console.log(`NFT subbridge.registerToken("${child.bridgeAddress}", "${parent.bridgeAddress}", "${child.nftAddress}", "${parent.nftAddress}")`)
    console.log("\n\n");

    let log = 'registering bridges to the child node'
    await jsonRpcReq(childUrl, log, 'subbridge_registerBridge', [child.bridgeAddress, parent.bridgeAddress]);

    log = 'subscribing bridges to the child node'
    await jsonRpcReq(childUrl, log, 'subbridge_subscribeBridge', [child.bridgeAddress, parent.bridgeAddress]);
}

async function registerOperator(operators, child, parent) {
    for (const operator of operators) {
        // register operator
        await child.contracts.bridgeContract.methods.registerOperator(operator.child).send({
            from: child.ownerAddress,
            gas: 100000000
        });
        await parent.contracts.bridgeContract.methods.registerOperator(operator.parent).send({
            from: parent.ownerAddress,
            gas: 100000000
        });
    }

    // setOperatorThreshold
    await child.contracts.bridgeContract.methods.setOperatorThreshold(0, operators.length).send({
        from: child.ownerAddress,
        gas: 100000000
    });
    await parent.contracts.bridgeContract.methods.setOperatorThreshold(0, operators.length).send({
        from: parent.ownerAddress,
        gas: 100000000
    });

    // transferOwnership
    await child.contracts.bridgeContract.methods.transferOwnership(operators[0].child).send({
        from: child.ownerAddress,
        gas: 100000000
    });
    await parent.contracts.bridgeContract.methods.transferOwnership(operators[0].parent).send({
        from: parent.ownerAddress,
        gas: 100000000
    });
}

async function registerToken(url, child, parent) {

    // add minter
    await child.contracts.tokenContract.methods.addMinter(child.bridgeAddress).send({
        from: child.ownerAddress,
        to: child.bridgeAddress,
        gas: 100000000
    });
    await parent.contracts.tokenContract.methods.addMinter(parent.bridgeAddress).send({
        from: parent.ownerAddress,
        to: parent.bridgeAddress,
        gas: 100000000
    });

    console.log('register token to the child node');
    // register tokenAddress
    await child.contracts.bridgeContract.methods.registerToken(child.tokenAddress, parent.tokenAddress).send({
        from: child.ownerAddress,
        gas: 100000000
    });
    console.log('register token to the parent node');
    await parent.contracts.bridgeContract.methods.registerToken(parent.tokenAddress, child.tokenAddress).send({
        from: parent.ownerAddress,
        gas: 100000000
    });

    let log = 'register erc20 tokenAddress into subbridge'
    await jsonRpcReq(url.child, log, 'subbridge_registerToken', [child.bridgeAddress, parent.bridgeAddress, child.tokenAddress, parent.tokenAddress]);

    await checkRegisteredTokens(url.parent, parent.bridgeAddress);
    await checkRegisteredTokens(url.child, child.bridgeAddress);
}

async function registerNFT(url, child, parent) {
    // add minter
    await child.contracts.nftContract.methods.addMinter(child.bridgeAddress).send({
        from: child.ownerAddress,
        to: child.bridgeAddress,
        gas: 100000000
    });
    await parent.contracts.nftContract.methods.addMinter(parent.bridgeAddress).send({
        from: parent.ownerAddress,
        to: parent.bridgeAddress,
        gas: 100000000
    });

    await child.contracts.bridgeContract.methods.registerToken(child.nftAddress, parent.nftAddress).send({
        from: child.ownerAddress,
        gas: 100000000
    });
    await parent.contracts.bridgeContract.methods.registerToken(parent.nftAddress, child.nftAddress).send({
        from: parent.ownerAddress,
        gas: 100000000
    });

    let log = 'register nft tokenAddress into subbridge..'
    await jsonRpcReq(url.child, log, 'subbridge_registerToken', [child.bridgeAddress, parent.bridgeAddress, child.nftAddress, parent.nftAddress]);
    await checkRegisteredTokens(url.parent, parent.bridgeAddress);
    await checkRegisteredTokens(url.child, child.bridgeAddress);
}

async function sendValueToOperatorAndReceiver(operatorConfig, deployConfig) {
    const childCaver = new Caver(deployConfig.url.child);
    const parentCaver = new Caver(deployConfig.url.parent);

    // child
    const childKeyring = childCaver.wallet.keyring.createFromPrivateKey(operatorConfig.contractOwnerKey.child);
    childCaver.wallet.add(childKeyring);
    const childSenderAddress = childKeyring.address;

    // parent
    const parentKeyring = parentCaver.wallet.keyring.createFromPrivateKey(operatorConfig.contractOwnerKey.parent);
    parentCaver.wallet.add(parentKeyring);
    const parentSenderAddress = parentKeyring.address;

    // bob and alice address
    const bobAddress = parentCaver.klay.accounts.wallet.add(deployConfig.sender.child).address;
    const aliceAddress = childCaver.klay.accounts.wallet.add(deployConfig.sender.parent).address;

    const childGasPrice = childCaver.utils.hexToNumber(await childCaver.rpc.klay.getGasPrice());
    console.log('child gas price is ', childGasPrice);
    const parentGasPrice = childCaver.utils.hexToNumber(await parentCaver.rpc.klay.getGasPrice());
    console.log('parent gas price is ', parentGasPrice);

    await sendValueTransfer(childCaver, childSenderAddress, bobAddress, 1000000, childGasPrice, "Child[Bob]");
    await sendValueTransfer(parentCaver, parentSenderAddress, aliceAddress, 1000000, parentGasPrice, "Parent[Alice]");

    await sendValueTransfer(childCaver, childSenderAddress, deployConfig.receiver.child, 1000000, childGasPrice, "Child[Bob]");
    await sendValueTransfer(parentCaver, parentSenderAddress, deployConfig.receiver.parent, 1000000, parentGasPrice, "Parent[Alice]");

    for (const operator of operatorConfig.operators) {
        await sendValueTransfer(childCaver, childSenderAddress, operator.child, 1000000000, childGasPrice, "Child[OPERATOR]");
        await sendValueTransfer(parentCaver, parentSenderAddress, operator.parent, 1000000000, parentGasPrice, "Parent[OPERATOR]");
    }
}

async function sendValueTransfer(caver, sender, receiver, amountKLAY, gasPrice, direction) {
    const KLAYUnit = caver.utils.klayUnit.KLAY.unit;
    let senderBalance = await caver.rpc.klay.getBalance(sender);
    console.log(`${direction} sender ${sender}'s balance(before) is`, caver.utils.convertFromPeb(senderBalance, KLAYUnit).toString(), KLAYUnit);
    let receiverBalance = await caver.rpc.klay.getBalance(receiver);
    console.log(`${direction} receiver ${receiver}'s balance(before) is`, caver.utils.convertFromPeb(receiverBalance, KLAYUnit).toString(), KLAYUnit);

    let tx = caver.transaction.valueTransfer.create({
        from: sender,
        to: receiver,
        value: caver.utils.convertToPeb(amountKLAY, KLAYUnit),
        gasPrice,
        gas: 100000 // gasLimit : intrinsic gas too low
    });

    await caver.wallet.sign(sender, tx);
    // let rlpEncoding = signed.getRLPEncoding();
    await caver.rpc.klay.sendRawTransaction(tx);

    senderBalance = await caver.rpc.klay.getBalance(sender);
    console.log(`${direction} sender ${sender}'s balance(after) is`, caver.utils.convertFromPeb(senderBalance, KLAYUnit).toString(), KLAYUnit);
    receiverBalance = await caver.rpc.klay.getBalance(receiver);
    console.log(`${direction} receiver ${receiver}'s balance(after) is`, caver.utils.convertFromPeb(receiverBalance, KLAYUnit).toString(), KLAYUnit);
}

async function checkRegisteredTokens(url, bridgeAddress) {
    const registeredTokenListByBridgeContractAbi = [
        {
            constant: true,
            inputs: [],
            name: 'getRegisteredTokenList',
            outputs: [{name: '', type: 'address[]'}],
            payable: false,
            stateMutability: 'view',
            type: 'function'
        }
    ];
    const caver = new Caver(url);
    const instance = new caver.klay.Contract(registeredTokenListByBridgeContractAbi, bridgeAddress);

    const tokens = await instance.methods.getRegisteredTokenList().call();
    console.log(`${bridgeAddress} tokens ${JSON.stringify(tokens)}`);
}

async function jsonRpcReq(url, log, method, params) {
    if (typeof jsonRpcReq.id == 'undefined') jsonRpcReq.id = 0;

    console.log(log)
    const response = await axios.post(url, {
        "jsonrpc": "2.0", "method": method, "params": params, "id": jsonRpcReq.id++
    }).catch(err => {
        console.log('JSON RPC', 'method', err);
        process.exit(1);
    })
    if (response && response.data && response.data.error && response.data.error.code) {
        console.error(method, "error is ", response.data);
        process.exit(1);
    }
}
