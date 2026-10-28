const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/data/pdfText.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports});
const {readPdfTextContent}=mod.exports;
(async()=>{
 const stream=new ReadableStream({start(c){c.enqueue({items:[{str:'first'}],styles:{font1:{fontFamily:'serif'}},lang:null});c.enqueue({items:[{str:'second'}],styles:{font2:{fontFamily:'sans-serif'}},lang:'en-IN'});c.close();}});
 const result=await readPdfTextContent({isPureXfa:false,streamTextContent:()=>stream});assert.equal(result.items.map(i=>i.str).join(' '),'first second');assert.equal(result.lang,'en-IN');assert.equal(Object.keys(result.styles).length,2);assert.equal(stream.locked,false);console.log('PASS PDF chunks retain order, language and font styles; reader lock released');
 const failed=new ReadableStream({start(c){c.error(Error('Synthetic extraction failure'));}});await assert.rejects(()=>readPdfTextContent({isPureXfa:false,streamTextContent:()=>failed}),/Synthetic extraction failure/);assert.equal(failed.locked,false);console.log('PASS PDF extraction errors propagate and release the reader lock');
 const xfa={items:[],styles:{},lang:null};assert.equal(await readPdfTextContent({isPureXfa:true,getTextContent:async()=>xfa,streamTextContent:()=>{throw Error('XFA must use its own extraction');}}),xfa);console.log('PASS XFA documents preserve the native text extraction path');
})().catch(e=>{console.error(e);process.exitCode=1;});
