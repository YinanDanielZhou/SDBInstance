import axios from 'axios';
import { Outpoint, Signer, UTXO, bsv } from 'scrypt-ts';

import { SDOOwnerWriter } from "../../contracts/SDO_v7";

const BCSynchronizer_URL = 'http://localhost:3000';

// Function to fetch user by ID from the server
export async function getWritableSDObyUID(UID: string) : Promise<SDOOwnerWriter> {
    return new Promise<SDOOwnerWriter>((resolve, reject) => {
        return axios.get(`${BCSynchronizer_URL}/sdo/${UID}`)
                    .then((response) => {
                        const sdoInfo = response.data
                        const sdo = new SDOOwnerWriter(sdoInfo.ls, sdoInfo.txid, sdoInfo.outIndex, sdoInfo.sat)
                        resolve(sdo)
                    })
                    .catch((error) => {
                        console.error(`Get SDO by UID ${UID} failed because of error: ${error.response}`)
                        reject()
                    })
    });
}

export async function getReadOnlySDObyUID(UID: string) : Promise<string> {
    return new Promise<string>((resolve, reject) => {
        return axios.get(`${BCSynchronizer_URL}/sdoRO/${UID}`)
                    .then((response) => {
                        resolve(response.data)
                    })
                    .catch((error) => {
                        reject(`Get readonly SDO by UID ${UID} failed because of error: ${error.response}`)
                    })
    })
}

export async function getAllSDOs() : Promise<string[]>{
    let SDOarray: string[] = []
    await axios.get(`${BCSynchronizer_URL}/allsdo`)
        .then((response) => {
            SDOarray = response.data
        })
        .catch((error) => {
            console.error('Error:', error);
        })
    return SDOarray
}


export async function getSomeSDOs(n: number) : Promise<string[]>{
    let SDOarray: string[] = []
    await axios.get(`${BCSynchronizer_URL}/somesdo/${n}`)
        .then((response) => {
            SDOarray = response.data
        })
        .catch((error) => {
            console.error('Error:', error);
        })
    return SDOarray
}