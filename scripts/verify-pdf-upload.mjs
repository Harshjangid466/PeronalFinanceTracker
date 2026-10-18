import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const readerSource=fs.readFileSync('src/data/readStatementFile.ts','utf8');
const pdfSpecifier=readerSource.match(/import\('([^']*pdfjs-dist[^']*)'\)/)[1];
const workerSpecifier=readerSource.match(/import\('([^']*pdf\.worker[^']*)'\)/)[1].replace('?url','');
// Model missing browser APIs in a separate process so the library's polyfills run normally.
if(process.argv.includes('--compat')){
 delete Promise.withResolvers;delete Promise.try;delete Map.prototype.getOrInsertComputed;
}
globalThis.DOMMatrix=require('@napi-rs/canvas').DOMMatrix;
const pdf=await import(pathToFileURL(require.resolve(pdfSpecifier)).href);
const workerURL=pathToFileURL(require.resolve(workerSpecifier)).href;
let fixturePeriod="13 JUL'26 - 12 OCT'26";
function fixture(){
 const texts=[[10,780,`Paytm Statement for ${fixturePeriod}`],[10,760,'Total Money Paid - Rs.25 1 Payments made'],[10,740,'Total Money Received + Rs.0 0 Payments received'],[22,700,'12 Oct'],[22,685,'09:00 AM'],[91,700,'Paid to TEST SHOP'],[91,670,'UPI Ref No: 000012345678'],[288,700,'Note: Food'],[414,700,'HDFC Bank -'],[414,685,'80'],[492,702,'- Rs.25']];
 const stream=texts.map(([x,y,text])=>`BT /F1 10 Tf ${x} ${y} Td (${text}) Tj ET`).join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let out='%PDF-1.4\n';const offsets=[0];for(const [i,obj] of objects.entries()){offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${obj}\nendobj\n`;}
 const xref=Buffer.byteLength(out);out+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>`${String(o).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new TextEncoder().encode(out).buffer;
}
let permission=true,readStarted=false;
const file={name:'synthetic-paytm.pdf',size:fixture().byteLength,arrayBuffer:async()=>{if(!permission)throw Error('Selected file access expired before reading began');readStarted=true;return fixture();}};
class PickerFileReader {
 result=null;error=null;onload=null;onerror=null;onabort=null;
 readAsArrayBuffer(file){if(file.unreadable){queueMicrotask(()=>this.onerror?.());return;}if(!permission)throw Error('Selected file access expired before reading began');readStarted=true;this.result=file.data??fixture();queueMicrotask(()=>this.onload?.());}
 abort(){this.onabort?.();}
}
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module:mod,exports:mod.exports,require:p=>p===pdfSpecifier?pdf:p.endsWith('?url')?{default:workerURL}:p.startsWith('.')?load(path.resolve(path.dirname(file),p+'.ts')):require(p),structuredClone,console,Date,Math,Set,Map,ArrayBuffer,Uint8Array,FileReader:PickerFileReader,setTimeout,clearTimeout});return mod.exports;
}
const {readPaytmFile}=load('src/data/readStatementFile.ts');const progress=[];
const result=readPaytmFile(file,'test-batch',m=>progress.push(m));
if(!process.argv.includes('--compat'))permission=false;
try{const rows=await result;assert.equal(readStarted,true);assert.equal(rows.length,1);assert.equal(rows[0].amountMinor,2500);assert.equal(rows[0].date,'2026-10-12');assert.equal(rows[0].note,'Food');assert.ok(progress.length);permission=true;await assert.rejects(()=>readPaytmFile({...file,size:0},'test-batch',()=>{}),/empty|downloaded/);const {readSelectedFile}=load('src/data/selectedFile.ts');await assert.rejects(()=>readSelectedFile({...file,unreadable:true}),/On My iPhone/);console.log(`PASS ${process.argv.includes('--compat')?'PDF parses without latest Promise/Map APIs':'Selected PDF reading starts before picker access expires'}`);
 for(const period of ["1 OCT'26 - 16 OCT'26",'01 October 2026 to 16 October 2026','01/10/2026 - 16/10/2026']){
  fixturePeriod=period;const parsed=await readPaytmFile(file,'custom-period',()=>{});assert.equal(parsed.length,1);assert.equal(parsed[0].date,'2026-10-12');assert.equal(parsed[0].amountMinor,2500);
 }console.log('PASS custom-period PDFs through the file reader and PDF.js');
 // Optional local source files are read only; never add financial PDFs to the repository.
 for(const filePath of process.argv.slice(2).filter(arg=>!arg.startsWith('--'))){
  const buffer=fs.readFileSync(filePath),data=buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
  const parsed=await readPaytmFile({name:path.basename(filePath),size:buffer.byteLength,data},'source-check',()=>{});
  assert.ok(parsed.length);console.log(`PASS source PDF ${parsed.length} rows; printed counts and amounts validated`);
 }
}
catch(error){console.error('FAIL PDF upload:',error.message);process.exitCode=1;}
