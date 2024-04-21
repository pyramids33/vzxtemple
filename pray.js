const sleep = require('./sleep.js');
const sharp = require('sharp');
const path = require('path');
const { readFile, writeFile } = require('fs/promises');

const { bsv, TestWallet, Addr, findSig, PubKey, SmartContract } = require('scrypt-ts');

const {
    ContentType,
    OrdiNFTP2PKH,
    OrdiProvider,
    OrdiMethodCallOptions,
} = require('scrypt-ord');

function mintKeyPath (mintAddress,config) {
    return path.join(config.datapath, mintAddress.toString()+'_key');
}
async function newMintKey (config) {
    const mintKey = bsv.PrivateKey.fromRandom(config.network);
    const mintAddress = mintKey.toAddress(config.network);
    await writeFile(mintKeyPath(mintAddress,config), mintKey.toWIF(), { flag: 'w' });
    return mintKey;   
}
async function getMintKey (mintAddress, config) {
    const buf = await readFile(mintKeyPath(mintAddress,config));
    const mintKey = bsv.PrivateKey.fromWIF(buf.toString().trim());
    return mintKey;
}

async function doRun (mintAddress, message, config) {
    let run = await startRun(mintAddress, message, config);
    run = await pollRun(run, config);
    run = await generateImage(run, config);
    return run;
}

async function saveRun (run, config) {
    await writeFile(
        path.join(config.datapath, run.id+'.json'), 
        JSON.stringify(run, null, 2), 
        { flag: 'w' }
    );
}

async function startRun (mintAddress, message, config) {
    const res = await fetch("https://api.openai.com/v1/threads/runs", {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer "+config.apikey,
            "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({
            "assistant_id": config.assistant_id,
            "thread": {
                "messages": [
                    {"role":"user","content": message }
                ],
                "tool_resources": {
                    "file_search": { "vector_store_ids": [ config.vectorstore_id ] }
                }
            }
        })
    });
    const run = await res.json();
    run.bsvAddress = mintAddress.toString();
    await saveRun(run, config);
    return run;
}

async function pollRun (run, config) {
    while (true) {
        if (run.status === 'queued' || run.status === 'in_progress') {
            await sleep(2500);
            const res = await fetch(
                `https://api.openai.com/v1/threads/${run.thread_id}/runs/${run.id}`, {
                method: 'GET',
                headers: {
                    "Authorization": "Bearer "+config.apikey,
                    "OpenAI-Beta": "assistants=v2"
                }
            });
            run = await res.json();
            await saveRun(run, config);
            continue;
        } else if (run.status === 'completed') {
            const res = await fetch(
                `https://api.openai.com/v1/threads/${run.thread_id}/messages`, {
                method: 'GET',
                headers: {
                    "Authorization": "Bearer "+config.apikey,
                    "OpenAI-Beta": "assistants=v2"
                }
            });
            const body = await res.json();
            run.messages = body;
            await saveRun(run, config);
            break;
        } else {
            break;
        }
    }
    return run;
}

async function generateImage(run, config) {

    const enkiMessage = run.messages.data[0].content[0].text.value;
    const prompt = `
    Create an image representing ENKI's statement.
    Showcase the power of the great god ENKI.
    Evoke a sense of awe and mysticism.

    ENKI: "${enkiMessage}"
    `;

    const res = await fetch(
        `https://api.openai.com/v1/images/generations`, {
        method: 'POST',
        headers: {
            "Authorization": "Bearer "+config.apikey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": "dall-e-3",
            "prompt": prompt,
            "n": 1,
            "size": "1024x1024",
            "style": "vivid",
            "response_format": "b64_json"
        })
    });

    const imgJSON = await res.json();
    const imgBuf = Buffer.from(imgJSON.data[0].b64_json, 'base64');
    const imgPath = path.join(config.datapath,run.id+'.jpg');

    await sharp(imgBuf)
    .withExifMerge({ IFD0: { ImageDescription: enkiMessage }})
    .resize(640,640)
    .toFile(imgPath);

    run.imageGenerated = true;
    run.imagePath = imgPath;
    run.imagePrompt = prompt;
    run.revisedPrompt = imgJSON.data[0].revised_prompt;

    await saveRun(run, config);
    return run;
}

async function mintOrdinal (mintKey, xferAddress, html, config) {
    const mintAddress = mintKey.toAddress();
    const signer = new TestWallet(mintKey, new OrdiProvider(config.network));
    const p2pkh = new OrdiNFTP2PKH(Addr(mintAddress.toByteString()));
    await p2pkh.connect(signer);

    const mintTx = await p2pkh.inscribe({ content: html, contentType: ContentType.HTML });

    const receiver = new OrdiNFTP2PKH(Addr(xferAddress.toByteString()));

    //
    // Mostly copied from OrdinalNFT.getDefaultTxBuilder
    // Just wanted to update the changeAddress
    //
    p2pkh.bindTxBuilder('unlock', async function (current, options, n) {
        let changeAddress;
        if (options.tokenChangeAddress) {
            changeAddress = options.tokenChangeAddress;
        } else {
            changeAddress = await current.signer.getDefaultAddress();
        }
        const nexts = [];
        const tx = new bsv.Transaction();
        tx.addInput(current.buildContractInput());

        const recipient = options.transfer;
        if (recipient) {
            if (!(recipient instanceof SmartContract)) {
                throw new Error('Transfer option must be of type `SmartContract`.');
            }
            tx.addOutput(new bsv.Transaction.Output({ script: recipient.lockingScript, satoshis: 1 }));
            nexts.push({ instance: recipient, balance: 1, atOutputIndex: nexts.length });
        } else {
            throw new Error('No NFTReceiver found!');
        }

        const feePerKb = await current.provider?.getFeePerKb();
        tx.feePerKb(feePerKb);
        tx.change(changeAddress);
        if (options.sequence !== undefined) {
            tx.setInputSequence(0, options.sequence);
        }
        if (options.lockTime) {
            const _sequence = options.sequence !== undefined ? options.sequence : 0xfffffffe;
            tx.setInputSequence(0, _sequence);
            tx.setLockTime(options.lockTime);
        }
        return Promise.resolve({ tx, atInputIndex: 0, nexts: nexts });
    });

    const ctran = await p2pkh.methods.unlock(
        (sigResponses) => findSig(sigResponses, mintKey.toPublicKey()),
        PubKey(mintKey.toPublicKey().toByteString()),
        {
            transfer: receiver,
            pubKeyOrAddrToSign: mintKey.toPublicKey(),
            tokenChangeAddress: config.changeAddress
        }
    );

    return {
        mintTx,
        xferTx: ctran.tx
    }
}

module.exports = {
    startRun, 
    pollRun, 
    generateImage, 
    doRun, 
    saveRun, 
    newMintKey, 
    getMintKey,
    mintOrdinal
}
