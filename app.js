const express = require('express');
require('express-async-errors');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { readFile } = require('node:fs/promises');

const { bsv, TestWallet } = require('scrypt-ts');
const { OrdiProvider } = require('scrypt-ord');

const pray = require('./pray.js');

if (process.argv.length < 3) {
    console.error('provide config file');
    process.exit(1);
}

const config = JSON.parse(readFileSync(process.argv[2]));

//convert from string to network
config.network = bsv.Networks.get(config.network);
config.changeKey = bsv.PrivateKey.fromWIF(config.changeKey);
config.changeAddress = config.changeKey.toAddress();

const app = express();

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

app.get('/static/:name', function (req, res) {
    res.sendFile(req.params.name, { root: path.join(__dirname, 'www') });
});

app.get('/api/pray/image', function (req, res) {
    res.sendFile(req.query.id+'.png', { root: path.join(__dirname, config.datapath) });
});

app.post('/api/mintkey', express.json(), 
async function (req, res) {
    const mintKey = await pray.newMintKey(config);
    const mintAddress = mintKey.toAddress();
    res.json({ mintAddress: mintAddress.toString() })
});

app.post('/api/balance', express.json(), 
async function (req, res) {
    const mintAddress = bsv.Address.fromString(req.body.mintAddress);
    const mintKey = await pray.getMintKey(mintAddress, config);
    const signer = new TestWallet(mintKey, new OrdiProvider(config.network));
    const balance = await signer.getBalance(mintAddress);
    const funded = (balance.confirmed + balance.unconfirmed) > config.minOfferingSats;
    res.json({ balance: balance, funded, minimum: config.minOfferingSats });
});

app.post('/api/pray', express.json(), 
async function (req, res) {
    console.log(req.body);

    const mintAddress = bsv.Address.fromString(req.body.mintAddress, config.network);
    const xferAddress = bsv.Address.fromString(req.body.xferAddress, config.network);
    const mintKey = await pray.getMintKey(mintAddress, config);
    const signer = new TestWallet(mintKey, new OrdiProvider(config.network));
    const balance = await signer.getBalance(mintAddress);

    console.log(balance);
    
    if ((balance.confirmed + balance.unconfirmed) < config.minOfferingSats) {
        res.status(400).json({ error: 'balance too low < '+config.minOfferingSats });
    }

    const message = req.body.message;
    const run = await pray.doRun(mintAddress, message, config);
    const imageBase64 = (await readFile(run.imagePath)).toString('base64');
    const enkiMessage = run.messages.data[0].content[0].text.value;
    const html = `
        <html>
        <head><title>vzxtemple</title></head>
        <body style="display:flex;flex-direction:column">
        <p>${enkiMessage.replace(/[^a-z\s]/gi, '')}</p>
        <img src="data:image/png;base64,${imageBase64}">
        </body>
        </html>
    `;

    console.log('do mint');
    const { mintTx, xferTx } = await pray.mintOrdinal(mintKey, xferAddress, html, config);
    
    res.status(200).json({ 
        id: run.id,
        html,
        mintTx: mintTx.id,
        xferTx: xferTx.id
    });
});

app.listen(3001, () => console.log('listening'));