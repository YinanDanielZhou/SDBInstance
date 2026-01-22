import axios from 'axios';
import { bsv } from 'scrypt-ts';

export async function broadcastTxnTaal(tx: string): Promise<any> {
    const apiUrl = 'https://arc.taal.com/v1/tx';
    const TaalAPIKey = process.env.TAAL_MAINNET_API_KEY || '';
    
    try {
        const response = await axios.post(apiUrl, tx, {
            headers: {
                'Content-Type': 'text/plain',
                'Authorization': TaalAPIKey
            }
        });
        
        // console.log('broadcast API response:', {
        //     status: response.status + ' ' + response.statusText, 
        //     txStatus: response.data.txStatus,
        //     txid: response.data.txid
        // });
        return response.data.txid;
    } catch (error) {
        console.error('Batch broadcast API Error:', error);
        throw error;
    }
}