

const { readFileSync } = require('fs');
const sharp = require('sharp');

const img = readFileSync('./data/run_RU7ErHzLkJNdSWP33k2a8sNi.jpg');

sharp(img).withExifMerge({
    IFD0: { ImageDescription: "suckit" }
}).resize(640,640).toFile('./test.jpg');