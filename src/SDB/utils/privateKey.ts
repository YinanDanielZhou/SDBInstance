import { bsv } from 'scrypt-ts'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

const dotenvConfigPath = '.env'
dotenv.config({ path: dotenvConfigPath })

export const mainnetPriKeySDB = bsv.PrivateKey.fromWIF(process.env.MAINNET_PRIVATE_KEY_SDB as string)
export const mainnetPubKeySDB = bsv.PublicKey.fromPrivateKey(mainnetPriKeySDB)
export const mainnetAddrSDB   = mainnetPubKeySDB.toAddress()

export const mainnetPriKeyPayer1 = bsv.PrivateKey.fromWIF(process.env.MAINNET_PRIVATE_KEY_Payer_1 as string)
export const mainnetPubKeyPayer1 = bsv.PublicKey.fromPrivateKey(mainnetPriKeyPayer1)
export const mainnetAddrPayer1   = mainnetPubKeyPayer1.toAddress()

export const mainnetPriKeyPayer2 = bsv.PrivateKey.fromWIF(process.env.MAINNET_PRIVATE_KEY_Payer_2 as string)
export const mainnetPubKeyPayer2 = bsv.PublicKey.fromPrivateKey(mainnetPriKeyPayer2)
export const mainnetAddrPayer2   = mainnetPubKeyPayer2.toAddress()

export const mainnetPriKeyPayer3 = bsv.PrivateKey.fromWIF(process.env.MAINNET_PRIVATE_KEY_Payer_3 as string)
export const mainnetPubKeyPayer3 = bsv.PublicKey.fromPrivateKey(mainnetPriKeyPayer3)
export const mainnetAddrPayer3   = mainnetPubKeyPayer3.toAddress()



// set up EZ Wallet dev account
export const mainnetPriKeyEZWalletDev = bsv.PrivateKey.fromWIF(process.env.MAINNET_PRIVATE_KEY_EZ_WALLET_DEV as string)
export const mainnetPubKeyEZWalletDev = bsv.PublicKey.fromPrivateKey(mainnetPriKeyEZWalletDev)
export const mainnetAddrEZWalletDev   = mainnetPubKeyEZWalletDev.toAddress()

// set up Dental account
export const mainnetPriKeyDental = bsv.PrivateKey.fromWIF(process.env.MAINNET_PRIVATE_KEY_DENTAL as string)
export const mainnetPubKeyDental = bsv.PublicKey.fromPrivateKey(mainnetPriKeyDental)
export const mainnetAddrDental   = mainnetPubKeyDental.toAddress()