const Caver = require('caver-js');
const axios = require('axios');
const fs = require('fs')

const conf = JSON.parse(fs.readFileSync(process.env.bridgeInfo || '../config/bridge_info.json', 'utf8'));

async function deploy(url, sender, info, bridgeAbi, bridgeCode, tokenAbi, tokenCode) {
    const caver = new Caver(url);
    sender.address = caver.klay.accounts.wallet.add(sender.key).address;

    try {
        // Deploy bridge
        const instanceBridge = new caver.klay.Contract(bridgeAbi);
        info.newInstanceBridge = await instanceBridge.deploy({data: bridgeCode, arguments: [true]})
            .send({from: sender.address, gas: 100000000, value: 0});
        info.bridge = info.newInstanceBridge._address;
        console.log(`info.bridge: ${info.bridge}`);

        // Deploy ERC20 token
        const instance = new caver.klay.Contract(tokenAbi);
        info.newInstance = await instance.deploy({data: tokenCode, arguments: [info.newInstanceBridge._address]})
            .send({from: sender.address, gas: 100000000, value: 0});
        info.token = info.newInstance._address;
        console.log(`info.token: ${info.token}`);
    } catch (e) {
        console.log("Error:", e);
        process.exit(1);
    }
}

(async function TokenDeploy() {
    const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
    console.log(`------------------------- ${testcase} START -------------------------`)

    conf.contract = {child: {}, parent: {}}
    const childBuildPath = process.env.childBuildPath || '../build'
    const childBridgeAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/Bridge.abi`, 'utf8'));
    const childBridgeCode = fs.readFileSync(`${childBuildPath}/Bridge.bin`, 'utf8');
    const childTokenAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/ServiceChainToken.abi`, 'utf8'));
    const childTokenCode = fs.readFileSync(`${childBuildPath}/ServiceChainToken.bin`, 'utf8');

    await deploy(conf.url.child, conf.sender.child, conf.contract.child, childBridgeAbi, childBridgeCode, childTokenAbi, childTokenCode);

    const parentBuildPath = process.env.parentBuildPath || '../build'
    const parentBridgeAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/Bridge.abi`, 'utf8'));
    const parentBridgeCode = fs.readFileSync(`${parentBuildPath}/Bridge.bin`, 'utf8');
    const parentTokenAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/ServiceChainToken.abi`, 'utf8'));
    const parentTokenCode = fs.readFileSync(`${parentBuildPath}/ServiceChainToken.bin`, 'utf8');
    await deploy(conf.url.parent, conf.sender.parent, conf.contract.parent, parentBridgeAbi, parentBridgeCode, parentTokenAbi, parentTokenCode);

    // add minter
    await conf.contract.child.newInstance.methods.addMinter(conf.contract.child.bridge).send({
        from: conf.sender.child.address,
        to: conf.contract.child.bridge,
        gas: 100000000,
        value: 0
    });
    await conf.contract.parent.newInstance.methods.addMinter(conf.contract.parent.bridge).send({
        from: conf.sender.parent.address,
        to: conf.contract.parent.bridge,
        gas: 100000000,
        value: 0
    });

    // register token
    await conf.contract.child.newInstanceBridge.methods.registerToken(conf.contract.child.token, conf.contract.parent.token).send({
        from: conf.sender.child.address,
        gas: 100000000,
        value: 0
    });
    await conf.contract.parent.newInstanceBridge.methods.registerToken(conf.contract.parent.token, conf.contract.child.token).send({
        from: conf.sender.parent.address,
        gas: 100000000,
        value: 0
    });

    for (const bridge of conf.bridges) {
        // register operator
        await conf.contract.child.newInstanceBridge.methods.registerOperator(bridge.child.operator).send({
            from: conf.sender.child.address,
            gas: 100000000,
            value: 0
        });
        await conf.contract.parent.newInstanceBridge.methods.registerOperator(bridge.parent.operator).send({
            from: conf.sender.parent.address,
            gas: 100000000,
            value: 0
        });
    }

    // setOperatorThreshold
    await conf.contract.child.newInstanceBridge.methods.setOperatorThreshold(0, conf.bridges.length).send({
        from: conf.sender.child.address,
        gas: 100000000,
        value: 0
    });
    await conf.contract.parent.newInstanceBridge.methods.setOperatorThreshold(0, conf.bridges.length).send({
        from: conf.sender.parent.address,
        gas: 100000000,
        value: 0
    });

    // transferOwnership
    await conf.contract.child.newInstanceBridge.methods.transferOwnership(conf.bridges[0].child.operator).send({
        from: conf.sender.child.address,
        gas: 100000000,
        value: 0
    });
    await conf.contract.parent.newInstanceBridge.methods.transferOwnership(conf.bridges[0].parent.operator).send({
        from: conf.sender.parent.address,
        gas: 100000000,
        value: 0
    });

    const filename = process.env.transferConfig || 'transfer-config.json';
    fs.writeFile(filename, JSON.stringify(conf), (err) => {
        if (err) {
            console.log("Error:", err);
            process.exit(1);
        }
    })

    // Initialize service chain configuration with three logs via interaction with attached console
    console.log("############################################################################");
    console.log(`Run below 3 commands in the Javascript console of all child bridge nodes (${conf.bridges.length} nodes total)`);
    console.log(`subbridge.registerBridge("${conf.contract.child.bridge}", "${conf.contract.parent.bridge}")`)
    console.log(`subbridge.subscribeBridge("${conf.contract.child.bridge}", "${conf.contract.parent.bridge}")`)
    console.log(`subbridge.registerToken("${conf.contract.child.bridge}", "${conf.contract.parent.bridge}", "${conf.contract.child.token}", "${conf.contract.parent.token}")`)
    console.log("############################################################################");

    const url = conf.url.child
    let log = 'registering bridges to the child node'
    await jsonRpcReq(url, log, 'subbridge_registerBridge', [conf.contract.child.bridge, conf.contract.parent.bridge]);

    log = 'subscribing bridges to the child node'
    await jsonRpcReq(url, log, 'subbridge_subscribeBridge', [conf.contract.child.bridge, conf.contract.parent.bridge]);

    log = 'register token to subbridge..'
    await jsonRpcReq(url, log, 'subbridge_registerToken', [conf.contract.child.bridge, conf.contract.parent.bridge, conf.contract.child.token, conf.contract.parent.token]);

    console.log(`------------------------- ${testcase} END -------------------------`)
})();

async function jsonRpcReq(url, log, method, params) {
    if (typeof jsonRpcReq.id == 'undefined') jsonRpcReq.id = 0;

    console.log(log)
    const response = await axios.post(url, {
        "jsonrpc": "2.0", "method": method, "params": params, "id": jsonRpcReq.id++
    }).catch(err => {
        console.log(err)
        process.exit(1);
    })
    if( response && response.data && response.data.error && response.data.error.code) {
        console.error(method, "error is ", response.data);
       process.exit(1);
    }
}