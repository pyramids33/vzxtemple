const sleep = require('./sleep.js');
const sharp = require('sharp');
const path = require('path');
const { writeFile } = require('fs/promises');

async function doRun (message, config) {
    let run = await start(message, config);
    run = await poll(run, config);
    console.log(run.messages);
    run = await generateImage(run, config);
    return run;
}

async function saveRun (run, config) {
    await writeFile(
        path.join(config.datapath,run.id+'.json'), 
        JSON.stringify(run,null,2), 
        { flag: 'w' }
    );
}

async function start (message, config) {
    const res = await fetch("https://api.openai.com/v1/threads/runs", {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer "+config.apikey,
            "OpenAI-Beta": "assistants=v1"
        },
        body: JSON.stringify({
            "assistant_id": config.assistant_id,
            "thread": {
                "messages": [
                    {"role":"user","content": message }
                ]
            }
        })
    });
    const run = await res.json();
    await saveRun(run, config);
    return run;
}

async function poll (run, config) {
    while (true) {
        if (run.status === 'queued' || run.status === 'in_progress') {
            await sleep(2500);
            const res = await fetch(
                `https://api.openai.com/v1/threads/${run.thread_id}/runs/${run.id}`, {
                method: 'GET',
                headers: {
                    "Authorization": "Bearer "+config.apikey,
                    "OpenAI-Beta": "assistants=v1"
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
                    "OpenAI-Beta": "assistants=v1"
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

    const prompt = `
    Create an image representing ENKI's statement.
    Showcase the power of the great god ENKI.
    Evoke a sense of awe and mysticism.

    ENKI: "${run.messages.data[0].content[0].text.value}"
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
    await sharp(imgBuf).resize(640,640).toFile(imgPath);
    run.imageGenerated = true;
    run.imagePath = imgPath;
    run.imagePrompt = imgJSON.data[0].revised_prompt;
    await saveRun(run, config);
    return run;
}

module.exports = {
    start, poll, generateImage, doRun, saveRun
}