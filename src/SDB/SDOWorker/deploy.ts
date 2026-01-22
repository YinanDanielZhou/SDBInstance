import { TestWallet, bsv, TxOutputRef} from "scrypt-ts";
import { FeeUtxosPoolManager } from "../feeUtxosPoolManager/feeUtxosPoolManager";

export async function constructDeployTx(initialLockingScript: bsv.Script, signer: TestWallet, feeUTXO: bsv.Transaction.IUnspentOutput, feeUtxosPoolManager: FeeUtxosPoolManager, feeUTXOIndex: number) {
    const deploySatAmount = 1
    const changeAddress = feeUtxosPoolManager.getAddress()  // the change Address should be same address as the feeUTXO

    const deployTx = new bsv.Transaction()
        .feePerKb(100)
        // add p2pkh inputs for paying tx fees
        .from(feeUTXO)
        // add contract output
        .addOutput(new bsv.Transaction.Output({
            script: initialLockingScript,
            satoshis: deploySatAmount,
        }))
        .change(changeAddress);

    // must do unsignedTx.seal() first then do signedTx.uncheckedSerialize() 
    // signedTx.serialize() does NOT work but signedTx.uncheckedSerialize() does ????
    // const signedTx = deployTx.seal().sign(signingPrivKey)

    const signedTx = await signer.signTransaction(deployTx.seal(), {})
    const rawSignedTx = signedTx.uncheckedSerialize()
    // console.log(rawSignedTx)
    
    const changeOutput = {
        txId: signedTx.id,
        outputIndex: signedTx.outputs.length - 1,
        script: signedTx.outputs[signedTx.outputs.length - 1].script.toHex(),
        satoshis: signedTx.outputs[signedTx.outputs.length - 1].satoshis,
        address: changeAddress.toString(),
    } as bsv.Transaction.IUnspentOutput

    feeUtxosPoolManager.addChangeUtxo(changeOutput, feeUTXOIndex)

    return rawSignedTx
}