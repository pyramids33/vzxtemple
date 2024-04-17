const { bsv } = require('scrypt-ts');

const network = bsv.Networks.mainnet;
// const privKey = bsv.PrivateKey.fromRandom(network);
const privKey = bsv.PrivateKey.fromWIF('KynFbWPBw7awJKoYeMbSVNMkqSNWxaEDYSURen3xhB85geMK1GuC');
const address = privKey.toAddress(network);
const publicKey = privKey.toPublicKey();
console.log(privKey.toString());
console.log(address.toString());
console.log(publicKey.toString());
// mint 1Mt4GMvJykj6QwFmiPpqPL8rAa9zFwGdeN
// change/recv 15bs5b9LyDujZPSRgonEDNY4H7ueVyp9Gu
