// Synthetic data only; exercises real browser quota and IndexedDB commits.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5218','--strictPort'],{stdio:'ignore',windowsHide:true});
const url='http://127.0.0.1:5218/';
let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const p=await context.newPage();await p.goto(url,{waitUntil:'networkidle'});
 const result=await p.evaluate(async()=>{
  const {newAccountData}=await import('/src/data/newAccountData.ts');
  const {loadData,saveData}=await import('/src/data/storage.ts');
  const key='finance-tracker-data-v2',oldKey='finance-tracker-data-v1';
  const data=newAccountData();data.syntheticUnknown='preserve';data.actionLog=[];
  localStorage.setItem(key,JSON.stringify(data));
  // A distinct old copy can contain records missing from today's ledger.
  const older=JSON.stringify({...data,syntheticRecoveryOnly:'older entry',padding:'x'.repeat(700000)});
  localStorage.setItem(oldKey,older);
  let lo=0,hi=6000000;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);try{localStorage.setItem('synthetic-unrelated', 'x'.repeat(mid));lo=mid;}catch{hi=mid-1;}}
  localStorage.setItem('synthetic-unrelated','x'.repeat(lo));
  const next=loadData();next.transactions.push({id:'quota-entry',type:'Revenue Expense',amount:12.34,amountMinor:1234,currency:'INR',date:'2026-11-18',status:'active',heading:'Synthetic quota entry',customFields:{preserve:true}});
  const before=localStorage.getItem(key);let failed=false;try{saveData(next,true);}catch{failed=true;}
  // Exporting a backup cannot change localStorage capacity.
  const backup=JSON.stringify(next);let failedAfterBackup=false;try{saveData(next,true);}catch{failedAfterBackup=true;}
  window.syntheticRepair={next,before,older,unrelated:localStorage.getItem('synthetic-unrelated')};
  return {failed,failedAfterBackup,unchanged:localStorage.getItem(key)===before,backupCreated:backup.length>0};
 });
 assert.deepEqual(result,{failed:true,failedAfterBackup:true,unchanged:true,backupCreated:true});
 console.log('PASS reproduced real quota rejection before and after backup; original ledger intact');
 const repaired=await p.evaluate(async()=>{
  const {repairStorage,loadRecoveryCopies}=await import('/src/data/storageRecovery.ts');
  const {saveData,loadData}=await import('/src/data/storage.ts');
  const f=window.syntheticRepair;const repair=await repairStorage();
  const copies=await loadRecoveryCopies();const unchanged=localStorage.getItem('finance-tracker-data-v2')===f.before;
  saveData(f.next,true);
  return {repair,unchanged,archived:copies.some(c=>c.raw===f.older),removed:localStorage.getItem('finance-tracker-data-v1')===null,unrelated:localStorage.getItem('synthetic-unrelated')===f.unrelated,ids:loadData().transactions.map(t=>t.id)};
 });
 assert.equal(repaired.unchanged,true);assert.equal(repaired.archived,true);assert.equal(repaired.removed,true);assert.equal(repaired.unrelated,true);assert(repaired.ids.includes('quota-entry'));
 await p.reload({waitUntil:'networkidle'});
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('finance-tracker-data-v2')).transactions.some(t=>t.id==='quota-entry')),true);
 console.log('PASS verified archive frees quota; new entry survives reload; original recovery copy and unrelated data preserved');
 const safety=await p.evaluate(async()=>{
  const {repairStorage}=await import('/src/data/storageRecovery.ts');
  localStorage.removeItem('synthetic-unrelated');
  const key='finance-tracker-pre-v4-backup',raw='{original recovery bytes}';localStorage.setItem(key,raw);
  const original=IDBObjectStore.prototype.add;
  IDBObjectStore.prototype.add=function(...args){const request=original.apply(this,args);this.transaction.abort();return request;};
  let rejected=false;try{await repairStorage();}catch{rejected=true;}finally{IDBObjectStore.prototype.add=original;}
  const retained=localStorage.getItem(key)===raw;
  // Simulate another tab replacing a recovery copy before verification finishes.
  const transaction=IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction=function(...args){const tx=transaction.apply(this,args);if(args[1]==='readonly')localStorage.setItem(key,'newer recovery bytes');return tx;};
  try{await repairStorage();}finally{IDBDatabase.prototype.transaction=transaction;}
  return {rejected,retained,newerRetained:localStorage.getItem(key)==='newer recovery bytes'};
 });
 assert.deepEqual(safety,{rejected:true,retained:true,newerRetained:true});
 console.log('PASS aborted archive retains original; concurrent replacement is never removed');
 await p.getByRole('button',{name:'Add',exact:true}).click();
 await p.getByLabel('Amount in rupees',{exact:true}).fill('47.21');
 await p.getByLabel('Entry category',{exact:true}).selectOption({index:1});
 await p.getByLabel('Payee / merchant / heading (optional)',{exact:true}).fill('UI quota retry');
 await p.evaluate(()=>{
  localStorage.setItem('finance-tracker-data-v1',JSON.stringify({olderOnly:true,padding:'x'.repeat(700000)}));
  let lo=0,hi=6000000;while(lo<hi){const mid=Math.ceil((lo+hi)/2);try{localStorage.setItem('synthetic-unrelated','x'.repeat(mid));lo=mid;}catch{hi=mid-1;}}
  localStorage.setItem('synthetic-unrelated','x'.repeat(lo));
 });
 await p.getByRole('button',{name:'Save transaction',exact:true}).click();
 await p.getByRole('button',{name:'Repair storage safely',exact:true}).waitFor();
 assert.equal(await p.getByLabel('Amount in rupees').inputValue(),'47.21');
 await p.getByRole('button',{name:'Repair storage safely',exact:true}).click();
 await p.getByRole('status').filter({hasText:'Now press Save transaction again'}).waitFor();
 assert.equal(await p.getByLabel('Amount in rupees').inputValue(),'47.21');
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('finance-tracker-data-v2')).transactions.filter(t=>t.heading==='UI quota retry').length),0);
 await p.getByRole('button',{name:'Save transaction',exact:true}).click();
 await p.getByText('Saved on this device',{exact:true}).waitFor();
 await p.reload({waitUntil:'networkidle'});
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('finance-tracker-data-v2')).transactions.filter(t=>t.heading==='UI quota retry'&&t.amountMinor===4721).length),1);
 await p.getByRole('button',{name:'Settings',exact:true}).click();
 await p.getByRole('button',{name:/^Backup & restore/}).click();
 const archived=p.getByRole('button',{name:/Legacy ledger copy \(preserved archive\)/});await archived.first().waitFor();
 const download=p.waitForEvent('download');await archived.first().click();
 const fs=await import('node:fs');const contents=fs.readFileSync(await (await download).path(),'utf8');
 assert.equal(JSON.parse(contents).syntheticRecoveryOnly,'older entry');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('PASS mobile form retains draft; repair does not post; explicit retry posts once and survives reload; exact old copy downloads');
 const legacyOnly=await p.evaluate(async()=>{
  const {setStorageOwner}=await import('/src/data/accountStorage.ts');
  const {repairStorage}=await import('/src/data/storageRecovery.ts');
  setStorageOwner('synthetic-legacy-only');
  const key='finance-tracker-data-v1:user:synthetic-legacy-only';localStorage.setItem(key,'legacy primary must survive');
  try{await repairStorage();return localStorage.getItem(key)==='legacy primary must survive';}finally{setStorageOwner(null);}
 });
 assert.equal(legacyOnly,true);console.log('PASS legacy-only primary is never archived away; repair respects account scope');
}finally{await browser?.close();server.kill();}
