const { bsv, TestWallet, Addr, findSig, PubKey } = require('scrypt-ts');

const {
    ContentType,
    OrdiNFTP2PKH,
    OrdiProvider,
    OrdiMethodCallOptions,
} = require('scrypt-ord');

const { readFileSync } = require('node:fs');

const network = bsv.Networks.testnet;
//const privKey = bsv.PrivateKey.fromRandom(network);
// const privKey = bsv.PrivateKey.fromWIF('cSVXxqhzqyRKq4xT5c4zXGpP8EhY1557sbmeoKQrfEiqRocFPA5R');
// const address = privKey.toAddress();
// const publicKey = privKey.toPublicKey();
// console.log(privKey.toString());
// console.log(address.toString());
// console.log(publicKey.toString());
// mint mwyCjy2UTTEGZQNDBu8xpdgxf1msEmgxZq
// recv mka3MLuMnHVhFhUiGT3PfWs2FLb3mYCWpk

/*
const img = readFileSync('./data/run_RU7ErHzLkJNdSWP33k2a8sNi.jpg').toString('base64');

// change key / address (default key in TestWallet)
const changeKey = bsv.PrivateKey.fromWIF('cTd12PT12PVGGewQTKxLRVhbRyziQ8mL527v82PFMzFDdFzCfM8z');
const changeAddress = changeKey.toAddress();
console.log('change', changeKey.toAddress().toString());

// mint key: use to inscribe, gen for each NFT. user to fund mint key
const mintKey = bsv.PrivateKey.fromWIF('cNxY9sy2wwBnjuKWptKDA7AecMctd36tYGRKQz4FDfFhpJCLERJM');
const mintAddress = mintKey.toAddress();
console.log('mint', mintAddress.toString());

// transfer nft to receive address
const xferKey = bsv.PrivateKey.fromWIF('cV4GudHeWSPYfSV22TfcoCyCh5oujSTgA8FTCH7UFk9FiutCMCkw');
const xferAddress = xferKey.toAddress();
console.log('xfer', xferAddress.toString());

async function main() {

    const signer = new TestWallet(mintKey, new OrdiProvider(network));
    //const balance = await signer.getBalance(mintAddress);
    const p2pkh = new OrdiNFTP2PKH(Addr(mintAddress.toByteString()));
    await p2pkh.connect(signer);
    
    const mintTx = await p2pkh.inscribeImage(img, ContentType.JPG);
    console.log(`Mint tx: ${mintTx.id}`)

    const receiver = new OrdiNFTP2PKH(Addr(xferAddress.toByteString()));

    const ct = await p2pkh.methods.unlock(
        (sigResponses) => findSig(sigResponses, mintKey.toPublicKey()),
        PubKey(mintKey.toPublicKey().toByteString()),
        {
            transfer: receiver,
            pubKeyOrAddrToSign: mintKey.toPublicKey(),
            tokenChangeAddress: changeAddress
        }
    );

    console.log(`Tfer tx: ${ct.tx.id}`);
}

main().catch(e => console.error(e.message));
*/