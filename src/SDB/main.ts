import { constructDeployTx } from "./SDOWorker/deploy";
import { getAllSDOs, getReadOnlySDObyUID, getSomeSDOs, getWritableSDObyUID  } from "./SDOWorker/fetch"

import { sCryptWalletList } from "./utils/helper";
import { FeeUtxosPoolManager } from "./feeUtxosPoolManager/feeUtxosPoolManager"
import { broadcastTxnTaal } from "./broadcastManager/broadcastManager";

import { PubKey, TestWallet, UTXO, bsv, toByteString } from "scrypt-ts"
import { mainnetAddrSDB, mainnetPriKeySDB, mainnetPubKeySDB } from "./utils/privateKey";

import { createClient } from "redis"
import { SDOOwnerWriter } from "../contracts/SDO_v7";
import { constructDeleteTx } from "./SDOWorker/delete";
import { promises as fs, write } from 'fs';
import { constructWriterUpdateTx } from "./SDOWorker/update";



const SDBAddress: bsv.Address = mainnetAddrSDB  // remain the same for all processes
const SDBPrivateKey = mainnetPriKeySDB   // remain the same for all processes
const SDBPublicKey = mainnetPubKeySDB   // remain the same for all processes
let payerAddress: bsv.Address;

let wallet!: TestWallet
let feeUtxosPoolManager!: FeeUtxosPoolManager
let success_txn_count = 0;
let failure_txn_count = 0;
let redisClient = createClient({
    url: 'redis://localhost:6379', // Assuming Redis is running on the default port on localhost
});

// Create the observer to log measured performance entries
// const obs = new PerformanceObserver((list) => {
//     const entries = list.getEntries();
//     entries.forEach((entry) => {
//         console.log(`${entry.name} duration: ${entry.duration.toFixed(2)}ms`);
//     });
// });
// obs.observe({ entryTypes: ['measure'] });

function getMeasurement(name: string, start: string, end: string) {
    let duration = performance.measure(name, start, end).duration.toFixed(2)
    // console.log(name, " duration: ", duration, " ms")
    return duration
}

let all_local_latencies : string[] = [];
let all_mp_latencies : string[] = [];

(async function main() {
    try{
        const num_ps_sharing_a_wallet = 1
        await bootup(num_ps_sharing_a_wallet)
    } catch (error) {
        console.error(error)
        return
    }
    // feeUtxosPoolManager.listFeeUtxo()

    let idleTime = 10   // add artifical idle time to prevent API rate limiting


    const deployQuantity = 50
    performance.mark("deployExpStart")
    await runDeployTestBatch(deployQuantity, idleTime)
    performance.mark("deployExpDoneMemPool")
    let expDuration = Number(getMeasurement("deployExp", "deployExpStart", "deployExpDoneMemPool"))
    console.log("Experiment duration: ", expDuration.toString(), " ms")


    // const updateQuantity = 1
    // const SDOsToBeUpdated = await getAllSDOs()
    // const SDOsToBeUpdated = ["02c23312ef"]
    
    // performance.mark("updateExpStart")
    // await runUpdateTestBatch(SDOsToBeUpdated, idleTime)
    // performance.mark("updateExpDoneMemPool")
    // let expDuration = Number(getMeasurement("updateExp", "updateExpStart", "updateExpDoneMemPool"))
    // console.log("Experiment duration: ", expDuration.toString(), " ms")

    // const whichPS = parseInt(process.argv[2])
    // const concurrency_level = "single"
    // const latencyLCFilePath = `./exp_result/latency_${concurrency_level}/process_${whichPS}_LC.txt`
    // const latencyMPFilePath = `./exp_result/latency_${concurrency_level}/process_${whichPS}_MP.txt`
    // const throughputFilePath = `./exp_result/throughput_${concurrency_level}/process_${whichPS}.txt`

    // try {
    //     await fs.appendFile(latencyLCFilePath, all_local_latencies.toString()+'\n');
    //     await fs.appendFile(latencyMPFilePath, all_mp_latencies.toString()+'\n');
    //     await fs.appendFile(throughputFilePath, updateQuantity.toString()+','+expDuration.toString()+'\n');
    //     console.log('Data successfully appended to file.');
    // } catch (err) {
    //     console.error('Error appending data to file:', err);
    // }


    // const SDOsToBeDeleted = await getAllSDOs()
    // console.log(SDOsToBeDeleted)
    // await runDeleteTestBatch(SDOsToBeDeleted, idleTime)

    setTimeout(() => {
        redisClient.disconnect();
        // redisClient.flushDb().then(() => {
        //     redisClient.disconnect();
        // })
    }, 500); 
})()

async function runDeployTestBatch(deployQuantity : number, idleTime: number) {
    let broadcastPromises: Promise<void>[] = []
    for (let i = 0; i < deployQuantity; i++) {
        performance.mark(String(i)+"_begin")
        const feeUTXOIndex = i % feeUtxosPoolManager.getUtxoCount()  // the fee utxo at this index inside feeManager will be used
        // deployPromises.push(processDeploy(feeUtxosPoolManager, i, false))    // pass a parameter bool true to be verbose
        await processDeploy("key"+i, "val"+i, feeUtxosPoolManager, feeUTXOIndex).then((rawSignedTx) => {
            let broadcastPromise = broadcastTxnTaal(rawSignedTx)
                .then((deployedTxID) => {
                    console.log("Completed broadcasting Deploy-Tx ", deployedTxID)
                    performance.mark(String(i)+"_doneMP")
                    all_mp_latencies.push(getMeasurement(String(i)+"_MP", String(i)+"_begin", String(i)+"_doneMP"))
                })
                .catch(error => {
                    console.error("Failed broadcasting Deploy-Tx with error: ", error)
                });
            broadcastPromises.push(broadcastPromise)
        }).catch((err) => {
            console.error(err)
        })
        performance.mark(String(i)+"_doneLocal")
        all_local_latencies.push(getMeasurement(String(i)+"_LC", String(i)+"_begin", String(i)+"_doneLocal"))
        await new Promise(resolve => setTimeout(resolve, idleTime))  // idle for some time to prevent running into API rate limit (ms)
    }
    await Promise.all(broadcastPromises)
}

async function processDeploy(key: string, val: string, feeUtxosPoolManager: FeeUtxosPoolManager, feeUTXOIndex: number) {
    // Deploying a new SDO instance
    let feeUTXO: bsv.Transaction.IUnspentOutput

    try {
        feeUTXO = feeUtxosPoolManager.getFeeUtxo(feeUTXOIndex)
    } catch (error) {
        console.error(error)
        return Promise.reject("Deploy fail because lack of fee utxo")
    }

    const KeyBytes = toByteString(key, true)
    const ValBytes = toByteString(val, true)

    let outputIndex = feeUTXO.outputIndex.toString(16)
    if (outputIndex.length % 2 == 1) { outputIndex = "0" + outputIndex}
    const UID = toByteString(outputIndex + feeUTXO.txId.slice(0,8))
    const initialLockingScript = bsv.Script.fromHex(SDOOwnerWriter.getInitialLockingScript(SDBAddress, SDBAddress, UID, KeyBytes, ValBytes))

    const rawSignedTx = await constructDeployTx(initialLockingScript, wallet, feeUTXO, feeUtxosPoolManager, feeUTXOIndex)
    return Promise.resolve(rawSignedTx)
}



async function runDeleteTestBatch(sdosToBeDeleted : string[], idleTime: number) {
    let broadcastPromises: Promise<void>[] = []
    for (let i = 0; i < sdosToBeDeleted.length; i++) {
        performance.mark(String(i)+"_begin")
        const feeUTXOIndex = i % feeUtxosPoolManager.getUtxoCount()  // the fee utxo at this index inside feeManager will be used

        await processDelete(sdosToBeDeleted[i], feeUtxosPoolManager, feeUTXOIndex).then((rawSignedTx) => {
            let broadcastPromise = broadcastTxnTaal(rawSignedTx)
                .then((deleteTxID) => {
                    console.log("Completed broadcasting Delete-Tx ", deleteTxID)
                    performance.mark(String(i)+"_doneMP")
                    all_mp_latencies.push(getMeasurement(String(i)+"_MP", String(i)+"_begin", String(i)+"_doneMP"))
                })
                .catch(error => {
                    console.error("Failed broadcasting Delete-Tx with error: ", error)
                });
            broadcastPromises.push(broadcastPromise)
        }).catch((err) => {
            console.error(err)
        })
        performance.mark(String(i)+"_doneLocal")
        all_local_latencies.push(getMeasurement(String(i)+"_LC", String(i)+"_begin", String(i)+"_doneLocal"))
        await new Promise(resolve => setTimeout(resolve, idleTime))  // idle for some time to prevent running into API rate limit (ms)
    }
    await Promise.all(broadcastPromises)
}

async function processDelete(SDOToBeDeleted: string, feeUtxosPoolManager: FeeUtxosPoolManager, feeUTXOIndex: number) {

    // delete a SDO instance
    let feeUTXO: bsv.Transaction.IUnspentOutput

    try {
        feeUTXO = feeUtxosPoolManager.getFeeUtxo(feeUTXOIndex)
    } catch (error) {
        console.error(error)
        return Promise.reject("Delete fail because lack of fee utxo")
    }

    const sdo = await getWritableSDObyUID(SDOToBeDeleted)
    const unlockingScript = sdo.ownerDelete(SDBPrivateKey, SDBPublicKey)
    const rawSignedTx = await constructDeleteTx(sdo, unlockingScript, wallet, feeUTXO, feeUtxosPoolManager, feeUTXOIndex);
    return rawSignedTx
}


async function runUpdateTestBatch(sdosToBeUpdated : string[], idleTime: number) {
    let broadcastPromises: Promise<void>[] = []
    for (let i = 0; i < sdosToBeUpdated.length; i++) {
        performance.mark(String(i)+"_begin")
        const feeUTXOIndex = i % feeUtxosPoolManager.getUtxoCount()  // the fee utxo at this index inside feeManager will be used
        const newVal = "sameNewValForEfficentCBORencoding"
        await processUpdate(sdosToBeUpdated[i], newVal, feeUtxosPoolManager, feeUTXOIndex).then((rawSignedTx) => {
            let broadcastPromise = broadcastTxnTaal(rawSignedTx)
                .then((updateTxID) => {
                    console.log("Completed broadcasting Update-Tx ", updateTxID)
                    performance.mark(String(i)+"_doneMP")
                    all_mp_latencies.push(getMeasurement(String(i)+"_MP", String(i)+"_begin", String(i)+"_doneMP"))
                })
                .catch(error => {
                    console.error("Failed broadcasting Update-Tx with error: ", error)
                });
            broadcastPromises.push(broadcastPromise)
        }).catch((err) => {
            console.error(err)
        })
        performance.mark(String(i)+"_doneLocal")
        all_local_latencies.push(getMeasurement(String(i)+"_LC", String(i)+"_begin", String(i)+"_doneLocal"))
        await new Promise(resolve => setTimeout(resolve, idleTime))  // idle for some time to prevent running into API rate limit (ms)
    }
    await Promise.all(broadcastPromises)
}

async function processUpdate(SDOToBeUpdatedUID: string, newVal: string, feeUtxosPoolManager: FeeUtxosPoolManager, feeUTXOIndex: number) {
    let feeUTXO: bsv.Transaction.IUnspentOutput

    try {
        feeUTXO = feeUtxosPoolManager.getFeeUtxo(feeUTXOIndex)
    } catch (error) {
        console.error(error)
        return Promise.reject("Update fail because lack of fee utxo")
    }

    const sdo = await getWritableSDObyUID(SDOToBeUpdatedUID)
    const {unlockingScript, lockingScript, nSequence} = sdo.getWriterUpdateScriptPair(newVal, SDBPrivateKey, SDBPublicKey)
    const rawSignedTx = await constructWriterUpdateTx(sdo, unlockingScript, lockingScript, nSequence, wallet, feeUTXO, feeUtxosPoolManager, feeUTXOIndex);
    return rawSignedTx
}

async function bootup(num_ps_sharing_a_wallet: number) {
    // iitializing the system settings

    try {
        // bootup functions for SDB experiments
        const whoPayFee = Math.floor(parseInt(process.argv[2]) / num_ps_sharing_a_wallet);
        wallet = sCryptWalletList[whoPayFee]

        payerAddress = await wallet.getDefaultAddress()
        console.log(`Inititializing feePoolManager with address ${payerAddress} (Payer ${whoPayFee})`)

        feeUtxosPoolManager = new FeeUtxosPoolManager(wallet, payerAddress)
    } catch (error) {
        console.error("Failed to initialize the feePoolManager with Error: ", error)
        process.exit(1)
        return
    }

    const bcSyncPromise =  feeUtxosPoolManager.syncWithBlockchain(parseInt(process.argv[2]) % num_ps_sharing_a_wallet, num_ps_sharing_a_wallet)
    // Create a client and specify the database index
    const redisPromise = redisClient.connect()

    await Promise.all([bcSyncPromise, redisPromise]).catch((error) => {
        console.error("Error: bootup phase: ", error)
    })

    // wait for 1 second so that the other processes who share the same feeUtxo account 
    // get their correct set of feeUtxos. Otherwise, some feeUtxo might be used in double-spend
    await new Promise(resolve => setTimeout(resolve, 1000))
}



