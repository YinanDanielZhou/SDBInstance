import { TestWallet, bsv, TxOutputRef} from "scrypt-ts";
import { FeeUtxosPoolManager } from "../feeUtxosPoolManager/feeUtxosPoolManager";
import { SDOOwnerWriter } from "../../contracts/SDO_v7";

export async function constructDeleteTx(sdo: SDOOwnerWriter, unlockingScript: bsv.Script, signer: TestWallet, feeUTXO: bsv.Transaction.IUnspentOutput, feeUtxosPoolManager: FeeUtxosPoolManager, feeUTXOIndex: number) {

    const changeAddress = feeUtxosPoolManager.getAddress()  // the change Address should be same address as the feeUTXO

    const deleteTx = new bsv.Transaction().feePerKb(100)
    deleteTx.addInput(new bsv.Transaction.Input(
        {
            prevTxId: sdo.txId,
            outputIndex: sdo.outIndex,
            script: bsv.Script.fromHex(sdo.getLockingScript()),
            satoshis: sdo.satoshis,
        }),
        bsv.Script.fromASM(""), 
        1
    )
    deleteTx.from(feeUTXO)

    deleteTx.setInputScript(0, unlockingScript)
    deleteTx.change(changeAddress)

    const signedDeleteTx = await signer.signTransaction(deleteTx)
    // console.log("----------------------Delete SDOOwnerWriter ----------------------")
    // console.log(signedDeleteTx.id)
    // console.log(signedDeleteTx.toString()) 
    // console.log(signedDeleteTx.verify())

    const changeOutputIndex = signedDeleteTx.outputs.length - 1
    const changeOutput = {
        txId: signedDeleteTx.id,
        outputIndex: changeOutputIndex,
        script: signedDeleteTx.outputs[changeOutputIndex].script.toHex(),
        satoshis: signedDeleteTx.outputs[changeOutputIndex].satoshis,
        address: changeAddress.toString(),
    } as bsv.Transaction.IUnspentOutput

    feeUtxosPoolManager.addChangeUtxo(changeOutput, feeUTXOIndex)

    return signedDeleteTx.uncheckedSerialize()
    
}