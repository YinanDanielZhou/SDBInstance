import { TestWallet, bsv, TxOutputRef} from "scrypt-ts";
import { FeeUtxosPoolManager } from "../feeUtxosPoolManager/feeUtxosPoolManager";
import { SDOOwnerWriter } from "../../contracts/SDO_v7";

export async function constructWriterUpdateTx(sdo: SDOOwnerWriter, unlockingScript: bsv.Script, lockingScript: string, nSequence: number, signer: TestWallet, feeUTXO: bsv.Transaction.IUnspentOutput, feeUtxosPoolManager: FeeUtxosPoolManager, feeUTXOIndex: number) {

    const changeAddress = feeUtxosPoolManager.getAddress()  // the change Address should be same address as the feeUTXO

    const updateTx = new bsv.Transaction().feePerKb(100)

    updateTx.addInput(new bsv.Transaction.Input(
        {
            prevTxId: sdo.txId,
            outputIndex: sdo.outIndex,
            script: bsv.Script.fromHex(sdo.getLockingScript()),
            satoshis: sdo.satoshis,
            sequenceNumber: nSequence
        }),
        bsv.Script.fromASM(""), 
        1
    )

    updateTx.setInputScript(0, unlockingScript)

    updateTx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromHex(lockingScript),
        satoshis: 1,
    }))

    updateTx.from(feeUTXO)

    updateTx.change(changeAddress)

    const signedUpdateTx = await signer.signTransaction(updateTx)
    // console.log("----------------------Update SDO ----------------------")
    // console.log(signedUpdateTx.id)
    // console.log(signedUpdateTx.toString()) 
    // console.log(signedUpdateTx.verify())

    const changeOutputIndex = signedUpdateTx.outputs.length - 1
    const changeOutput = {
        txId: signedUpdateTx.id,
        outputIndex: changeOutputIndex,
        script: signedUpdateTx.outputs[changeOutputIndex].script.toHex(),
        satoshis: signedUpdateTx.outputs[changeOutputIndex].satoshis,
        address: changeAddress.toString(),
    } as bsv.Transaction.IUnspentOutput

    feeUtxosPoolManager.addChangeUtxo(changeOutput, feeUTXOIndex)

    return signedUpdateTx.uncheckedSerialize()
}
