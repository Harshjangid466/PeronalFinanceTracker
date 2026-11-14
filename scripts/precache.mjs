import fs from 'node:fs';import crypto from 'node:crypto';
const assets=fs.readdirSync('dist/assets').map(name=>'/assets/'+name);const hash=crypto.createHash('sha256').update(assets.join('|')).update(fs.readFileSync('public/sw.js')).update(fs.readFileSync('public/share-target.js')).digest('hex').slice(0,12);
let worker=fs.readFileSync('public/sw.js','utf8').replace('finance-tracker-v2','finance-tracker-v4-'+hash).replace('const ASSETS = [','const ASSETS = '+JSON.stringify(assets)+' .concat([').replace('icon-512.svg"];','icon-512.svg"]);');fs.writeFileSync('dist/sw.js',worker);
console.log('Offline cache includes '+assets.length+' production assets.');
