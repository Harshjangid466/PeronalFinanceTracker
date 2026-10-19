// Read-only verification of a supplied local statement. Never logs its password or merchants.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),ts=require('typescript');
globalThis.DOMMatrix=class DOMMatrix {};
const pdf=await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,require:p=>p.startsWith('.')?load(path.resolve(path.dirname(file),p+'.ts')):require(p),structuredClone,console,Date,Math,Set,Map});return mod.exports;}
const task=pdf.getDocument({data:new Uint8Array(fs.readFileSync(process.argv[2])),password:process.env.PDF_PASSWORD,isEvalSupported:false});
try{
 const doc=await task.promise,pages=[];
 for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),view=page.getViewport({scale:1}),text=await page.getTextContent();pages.push({width:view.width,height:view.height,items:text.items.flatMap(i=>'str'in i?[{str:i.str,x:i.transform[4],y:i.transform[5]}]:[])});}
 if(process.argv.includes('--layout'))for(const [p,page] of pages.entries())for(const i of page.items)if(/AMOUNT|CASHBACK EARNED|Previous Balance|^([\d,]+\.\d{2}\s*(Dr|Cr)?|DR|CR|D|C)$/i.test(i.str.trim()))console.log(JSON.stringify({page:p+1,...i}));
 const r=load('src/data/bankPdf.ts').parseBankPdf(pages,'verification','Test account');
 console.log(JSON.stringify({format:r.format,count:r.rows.length,debits:r.rows.filter(r=>r.direction==='debit').length,credits:r.rows.filter(r=>r.direction==='credit').length,openingMinor:r.openingMinor,debitMinor:r.debitMinor,creditMinor:r.creditMinor,closingMinor:r.closingMinor,from:r.from,to:r.to,warning:r.warning,cashback:r.cashback,earnedRowsMinor:r.rows.every(r=>r.cashbackEarnedMinor!==undefined)?r.rows.reduce((s,r)=>s+r.cashbackEarnedMinor,0):undefined,cycleCreditMinor:r.rows.filter(r=>r.cashbackCredit==='cycle').reduce((s,r)=>s+r.amountMinor,0),rebateMinor:r.rows.filter(r=>r.cashbackCredit==='rebate').reduce((s,r)=>s+r.amountMinor,0)}));
}finally{await task.destroy();}
