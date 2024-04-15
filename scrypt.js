import { bsv, TestWallet, Addr, findSig, PubKey } from 'scrypt-ts';

import {
    ContentType,
    OrdiNFTP2PKH,
    OrdiProvider,
    OrdiMethodCallOptions,
} from 'scrypt-ord';

import { readFileSync } from 'fs'

const network = bsv.Networks.testnet;
//const privKey = bsv.PrivateKey.fromRandom(network);
const privKey = bsv.PrivateKey.fromWIF('cSVXxqhzqyRKq4xT5c4zXGpP8EhY1557sbmeoKQrfEiqRocFPA5R');
const address = privKey.toAddress();
const publicKey = privKey.toPublicKey();
//console.log(privKey.toString());
console.log(address.toString());
console.log(publicKey.toString());

const img = readFileSync('../vzx/run_rOtuO7PxhCvdW3bxpWZRHja5.jpeg').toString('base64');

async function main() {

    const signer = new TestWallet(privKey, new OrdiProvider(network));
    const balance = await signer.getBalance(address);
    console.log('balance', balance);

    const p2pkh = new OrdiNFTP2PKH(Addr(address.toByteString()));
    await p2pkh.connect(signer);

    // inscribe image into contract instance
    const mintTx = await p2pkh.inscribeImage(img, ContentType.JPEG);
    console.log(`Mint tx: ${mintTx.id}`)

    const receiver = new OrdiNFTP2PKH(Addr(address.toByteString()));

    const { tx: transferTx } = await p2pkh.methods.unlock(
        (sigResponses) => findSig(sigResponses, publicKey),
        PubKey(publicKey.toByteString()),
        {
            transfer: receiver,
            pubKeyOrAddrToSign: publicKey,
        }
    );
}

main().catch(e => console.error(e.message));
