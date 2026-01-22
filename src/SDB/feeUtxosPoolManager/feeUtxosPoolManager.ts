import { PubKey, TestWallet, Utils, bsv } from "scrypt-ts";
import { Script } from "vm";
import { mainnetAddrPayer1, mainnetAddrPayer2, mainnetAddrPayer3, mainnetAddrSDB } from '../utils/privateKey';


// Define a class named MyClass
export class FeeUtxosPoolManager {

    private _feeUtxosPool: bsv.Transaction.IUnspentOutput[]
    public signer: TestWallet
    private _address: bsv.Address

    constructor(signer: TestWallet, address: bsv.Address) {
        this._feeUtxosPool = []
        this.signer = signer
        this._address = address
    }

    async syncWithBlockchain(i = 0, n = 1) {
        console.log(`Get Fee UTXOs for ${this._address.toString()}`)
        this._feeUtxosPool = await this.signer.provider!.listUnspent(this._address);
        this._feeUtxosPool.sort((a, b) => b.satoshis - a.satoshis) // sort by descending sat
        if (n != 1)
            // n processes share a wallet, so only keep the i_th fee utxo in each n 
            this._feeUtxosPool = this._feeUtxosPool.filter((_,index) => (index - i) % n === 0)
        console.log("feeUtxosPoolManager initialized with ", this._feeUtxosPool.length, " fee utxos")
    }

    getAddress(): bsv.Address {
        return this._address
    }

    listFeeUtxo(): void {
        console.log(`There are ${this._feeUtxosPool.length} UTXOs available for payments`)
        let total = 0
        this._feeUtxosPool.forEach((utxo) => {
            console.log(`${utxo.satoshis} sats at ${utxo.txId} index ${utxo.outputIndex}`)
            total += utxo.satoshis
        })
        console.log("Total: ", total, " sats")

    }

    hasFeeUtxo(): boolean {
        return this._feeUtxosPool.length !== 0
    }

    getUtxoCount(): number {
        return this._feeUtxosPool.length;
    }

    getFeeUtxo(index: number): bsv.Transaction.IUnspentOutput {
        // if (!this.hasFeeUtxo()) {
        //     throw Error ("No Fee Utxo available in feeUtxosPoolManager")
        // }
        // return this._feeUtxosPool.shift()!
        return this._feeUtxosPool.at(index)!
    }

    addChangeUtxo(changeUtxo: bsv.Transaction.IUnspentOutput, index: number): void{
        this._feeUtxosPool[index] = changeUtxo
        // this._feeUtxosPool.push(changeUtxo)
    }

    async splitUtxos() {
        for (const utxo of this._feeUtxosPool) {
            // const halfSats =  Math.floor(utxo.satoshis / 2) - 1    // leave some for fee
            const feeAmount = 5
            const splitDegree = 2  // split into how many equal utxos
            const eachAmount = Math.floor((utxo.satoshis - feeAmount) / splitDegree)
            const splitTx = new bsv.Transaction().from(utxo)
            
            for (let _ = 0; _ < splitDegree; _++) {
                splitTx.addOutput(new bsv.Transaction.Output({
                    script: bsv.Script.buildPublicKeyHashOut(this._address),
                    satoshis: eachAmount + 1,
                }))
            }
            // splitTx.uncheckedSerialize()
            const signedTx = await this.signer.signTransaction(splitTx);
            console.log(signedTx.uncheckedSerialize());

            // console.log(splitTx.uncheckedSerialize())
            // const signedTx = await this.signer?.signAndsendTransaction(splitTx).then((response) => {
            //     console.log(response.id)
            // })
        }
    }

    async regroupUtxos(destinationAddress: bsv.Address) {
        const regroupTx = new bsv.Transaction()
        regroupTx.feePerKb(10)
        let totalSats = 0
        for (const utxo of this._feeUtxosPool) {
            totalSats += utxo.satoshis
            regroupTx.from(utxo)
        }
        regroupTx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(destinationAddress),
            satoshis: totalSats - 2
        }))
        // console.log(regroupTx.uncheckedSerialize())
        const signedTx = await this.signer?.signAndsendTransaction(regroupTx).then((response) => {
            console.log(response.id)
        })
    }

    async sendTo(destinationAddress: bsv.Address) {
        const transferTx = new bsv.Transaction()
        transferTx.feePerKb(10)
        let totalSats = 0

        const utxos_to_spend = [this._feeUtxosPool[0]]

        for (let utxo of utxos_to_spend) {
            totalSats += utxo.satoshis
            transferTx.from(utxo)
        }
        transferTx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(destinationAddress),
            satoshis: totalSats - 2
        }))
        
        const signedTx = await this.signer.signTransaction(transferTx);
        console.log(signedTx.uncheckedSerialize());

    }
}
