import { DummyProvider, DefaultProvider, TestWallet, bsv, Signer, Scrypt, TaalProvider, ScryptProvider } from 'scrypt-ts'
import { mainnetPriKeyPayer1, mainnetPriKeyPayer2, mainnetPriKeyPayer3, mainnetPriKeySDB, mainnetPriKeyEZWalletDev, mainnetPriKeyDental } from './privateKey'

import * as dotenv from 'dotenv'

// Load the .env file
dotenv.config()

let scryptWalletSDB, scryptWalletPayer1, scryptWalletPayer2, scryptWalletPayer3, EZWalletDev, dentalWallet

Scrypt.init({
    apiKey: 'mainnet_2sHWSO6Ja79D0DlAc3uPtSvgovaG9jcZ1yXNlJGmfC9yBUBUY',
    network: bsv.Networks.mainnet,
})
scryptWalletSDB = new TestWallet(
    mainnetPriKeySDB,
    new ScryptProvider()
)
scryptWalletPayer1 = new TestWallet(
    mainnetPriKeyPayer1,
    new ScryptProvider()
)
scryptWalletPayer2 = new TestWallet(
    mainnetPriKeyPayer2,
    new ScryptProvider()
)
scryptWalletPayer3 = new TestWallet(
    mainnetPriKeyPayer3,
    new ScryptProvider()
)
EZWalletDev = new TestWallet(
    mainnetPriKeyEZWalletDev,
    new TaalProvider("mainnet_570776b5deebcb9d280b924e0f615474")
)
dentalWallet = new TestWallet(
    mainnetPriKeyDental,
    new TaalProvider("mainnet_570776b5deebcb9d280b924e0f615474")
)


const sCryptWalletSDB = scryptWalletSDB
const sCryptWalletPayer1 = scryptWalletPayer1
const sCryptWalletPayer2 = scryptWalletPayer2
const sCryptWalletPayer3 = scryptWalletPayer3
export const sCryptWalletList = [sCryptWalletSDB, sCryptWalletPayer1, sCryptWalletPayer2, sCryptWalletPayer3]
export const EzWalletDev = EZWalletDev
export const DentalWallet = dentalWallet
// export const sCryptWalletList = [sCryptWalletSDB]


export const sleep = async (seconds: number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({})
        }, seconds * 1000)
    })
}

export function randomPrivateKey() {
    const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.mainnet)
    const publicKey = bsv.PublicKey.fromPrivateKey(privateKey)
    const address = publicKey.toAddress()
    console.log(privateKey.toString())
    console.log(publicKey.toString())
    console.log(address.toString())
    return [privateKey, publicKey, address] as const
}

// export function getRandomInt(min: number, max: number) {
//     min = Math.ceil(min)
//     max = Math.floor(max)
//     return Math.floor(Math.random() * (max - min) + min) // The maximum is exclusive and the minimum is inclusive
// }