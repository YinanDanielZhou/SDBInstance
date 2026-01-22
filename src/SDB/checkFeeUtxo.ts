
import { sCryptWalletList } from "./utils/helper";
import { FeeUtxosPoolManager } from "./feeUtxosPoolManager/feeUtxosPoolManager"

import { PubKey, TestWallet, UTXO, bsv, toByteString } from "scrypt-ts"


let payerAddress: bsv.Address;

let wallet!: TestWallet
let feeUtxosPoolManager!: FeeUtxosPoolManager

(async function main() {
    try{
        const num_ps_sharing_a_wallet = 1
        await bootup(num_ps_sharing_a_wallet)
    } catch (error) {
        console.error(error)
        return
    }

    feeUtxosPoolManager.listFeeUtxo()

})()


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

    await feeUtxosPoolManager.syncWithBlockchain(parseInt(process.argv[2]) % num_ps_sharing_a_wallet, num_ps_sharing_a_wallet)
    // Create a client and specify the database index

    // wait for 1 second so that the other processes who share the same feeUtxo account 
    // get their correct set of feeUtxos. Otherwise, some feeUtxo might be used in double-spend
    await new Promise(resolve => setTimeout(resolve, 1000))
}



