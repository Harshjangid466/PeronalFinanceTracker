import fs from 'node:fs';
fs.mkdirSync('public/ocr',{recursive:true});
fs.copyFileSync('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
fs.copyFileSync('node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt','public/ocr/worker.min.js.LICENSE.txt');
fs.copyFileSync('node_modules/tesseract.js/LICENSE.md','public/ocr/tesseract-LICENSE.md');
fs.copyFileSync('node_modules/tesseract.js-core/LICENSE','public/ocr/core-LICENSE.txt');
for(const name of fs.readdirSync('node_modules/tesseract.js-core'))if(/\.wasm(?:\.js)?$/.test(name))fs.copyFileSync('node_modules/tesseract.js-core/'+name,'public/ocr/'+name);
fs.copyFileSync('node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz','public/ocr/eng.traineddata.gz');
console.log('Local OCR assets prepared (loaded only for scanned statements).');
