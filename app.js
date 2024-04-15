const express = require('express');
require('express-async-errors');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { readFile } = require('node:fs/promises');

const pray = require('./pray.js');

if (process.argv.length < 3) {
    console.error('provide config file');
    process.exit(1);
}
const config = JSON.parse(readFileSync(process.argv[2]));
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

app.post('/api/pray', express.json(), 
async function (req, res) {
    let message = req.body.message;
    let run = await pray.doRun(message, config);
    let imageBase64 = (await readFile(run.imagePath)).toString('base64');

    res.status(200).json({ 
        id: run.id,
        imageBase64,
        message: run.messages.data[0].content[0].text.value
    });
});

app.listen(3001, () => console.log('listening'));