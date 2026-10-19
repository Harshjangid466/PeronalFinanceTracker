// Isolated mobile browser; optional PDF path/password stay local and out of logs.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:p=>p.startsWith('.')?load(path.resolve(path.dirname(file),p+'.ts')):require(p),structuredClone,console,Date,Math,Set,Map});return m.exports;}
const seed=load('src/data/model.ts').migrateData(load('src/data/defaults.ts').getDefaultData());seed.recurring=[];seed.transactions=[];seed.accounts=['Test card A','Test card B'];
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 await page.addInitScript(seed=>{if(!localStorage.getItem('password-test-seed')){localStorage.setItem('finance-tracker-data-v2',JSON.stringify(seed));localStorage.setItem('password-test-seed','yes');}},seed);
 await page.goto(process.env.STATEMENT_TEST_URL||'http://127.0.0.1:5178/',{waitUntil:'networkidle'});
 const result=await page.evaluate(async()=>{
  const v=await import('/src/data/statementPasswords.ts');
  await Promise.all([v.saveStatementPassword('Test card A','synthetic-A'),v.saveStatementPassword('Test card B','synthetic-B')]);
  const a=await v.getStatementPassword('Test card A'),b=await v.getStatementPassword('Test card B'),missing=await v.getStatementPassword('Unknown');
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('finance-statement-passwords');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const stored=await new Promise((resolve,reject)=>{const r=db.transaction('vault').objectStore('vault').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();
  return {a,b,missing,hasPlaintext:JSON.stringify(stored).includes('synthetic-'),nonExtractable:stored.some(x=>x instanceof CryptoKey&&!x.extractable)};
 });
 assert.deepEqual(result,{a:'synthetic-A',b:'synthetic-B',missing:'',hasPlaintext:false,nonExtractable:true});
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.evaluate(async()=>(await import('/src/data/statementPasswords.ts')).getStatementPassword('Test card A')),'synthetic-A');
 console.log('PASS encrypted vault, separate accounts, concurrent saves and reload');
 async function workspace(){await page.getByRole('button',{name:'Transactions',exact:true}).click();await page.getByRole('tab',{name:'Imports & review',exact:true}).click();await page.getByRole('button',{name:'Monthly reconciliation',exact:true}).click();}
 const snapshot=()=>page.evaluate(async()=>{const data=JSON.parse(localStorage.getItem('finance-tracker-data-v2')),archive=await(await import('/src/data/statementStore.ts')).loadStatementArchive();return {...data,statementRows:archive.rows,statementBatches:archive.batches};});
 await workspace();await page.getByLabel('Statement account',{exact:true}).selectOption('Test card A');await page.getByText('Saved password ready.',{exact:false}).waitFor();
 assert.equal(await page.getByLabel('PDF password',{exact:true}).inputValue(),'');
 await page.getByRole('button',{name:'Forget saved password',exact:true}).click();await page.getByText('Saved password forgotten for this account.',{exact:true}).waitFor();
 assert.equal(await page.evaluate(async()=>(await import('/src/data/statementPasswords.ts')).getStatementPassword('Test card A')),'');
 assert.equal(await page.evaluate(async()=>(await import('/src/data/statementPasswords.ts')).getStatementPassword('Test card B')),'synthetic-B');
 console.log('PASS saved password indication and account-specific Forget control');
 if(process.argv[2]){
  assert.ok(process.env.PDF_PASSWORD,'Provide PDF_PASSWORD for local-source verification');
  await page.getByLabel('PDF password',{exact:true}).fill('incorrect-test-password');await page.getByLabel('Choose statement',{exact:true}).setInputFiles(process.argv[2]);
  await page.getByText(/This statement needs its PDF password/).waitFor();assert.equal(await page.getByRole('button',{name:'Import statement',exact:true}).count(),0);
  await page.getByLabel('PDF password',{exact:true}).fill(process.env.PDF_PASSWORD);await page.getByLabel('Choose statement',{exact:true}).setInputFiles(process.argv[2]);
  await page.getByRole('button',{name:'Import statement',exact:true}).waitFor({timeout:30000});
  assert.match(await page.getByRole('status').allTextContents().then(a=>a.join(' ')),/11 movements checked/);
  const before=await snapshot();assert.equal(before.transactions.length,0);assert.equal(before.statementRows.length,0);assert.ok(!JSON.stringify(before).includes(process.env.PDF_PASSWORD));
  await page.getByRole('button',{name:'Import statement',exact:true}).click();await page.getByText(/Import saved/).waitFor();await page.waitForFunction(async()=>(await(await import('/src/data/statementStore.ts')).loadStatementArchive()).rows.length===11);
  await page.reload({waitUntil:'networkidle'});await workspace();await page.getByLabel('Statement account',{exact:true}).selectOption('Test card A');await page.getByText('Saved password ready.',{exact:false}).waitFor();
  assert.equal(await page.getByLabel('PDF password',{exact:true}).inputValue(),'');await page.getByLabel('Choose statement',{exact:true}).setInputFiles(process.argv[2]);await page.getByRole('button',{name:'Import statement',exact:true}).waitFor({timeout:30000});await page.getByRole('button',{name:'Import statement',exact:true}).click();await page.getByText(/Import saved/).waitFor();
  await page.waitForFunction(async()=>(await(await import('/src/data/statementStore.ts')).loadStatementArchive()).batches.length===2);
  const after=await snapshot();assert.equal(after.transactions.length,0);assert.equal(after.statementRows.length,11);assert.equal(after.statementRows.filter(r=>r.direction==='credit').length,5);assert.equal(after.statementBatches.length,2);assert.ok(!JSON.stringify(after).includes(process.env.PDF_PASSWORD));
  const {mergeBackup}=load('src/data/backup.ts'),roundtrip=mergeBackup(seed,JSON.stringify(after));assert.equal(roundtrip.statementRows.length,11);assert.equal(roundtrip.statementBatches.length,2);assert.equal(roundtrip.transactions.length,0);
  assert.equal(after.statementRows.reduce((s,r)=>s+(r.direction==='credit'?r.amountMinor:0),0),379454);
  console.log('PASS local Axis PDF: wrong password blocked; 11 rows, totals, saved-password re-upload, no duplicates, reload and backup roundtrip');
  assert.equal(after.statementRows.reduce((s,r)=>s+(r.cashbackEarnedMinor||0),0),69100);assert.equal(after.statementBatches[0].cashback.earnedMinor,69100);assert.equal(after.statementBatches[0].cashback.creditedMinor,19600);
  const panel=()=>page.getByRole('region',{name:'Cashback reconciliation',exact:true});await panel().getByText(/Import the preceding statement/).waitFor();
  const currentId=after.statementBatches[0].id;
  await page.evaluate(async()=>{
   const store=await import('/src/data/statementStore.ts'),a=await store.loadStatementArchive();
   a.rows.push({id:'synthetic-prior-reward',batchId:'synthetic-prior',date:'2026-09-01',source:'bank',vendor:'Synthetic prior purchase',note:'Synthetic fixture',account:'Test card A',reference:'synthetic-prior',amountMinor:1000000,direction:'debit',status:'pending',cashbackEarnedMinor:20000});
   a.batches.push({id:'synthetic-prior',source:'bank',kind:'card',name:'synthetic-prior.pdf',createdAt:1,from:'2026-08-17',to:'2026-09-16',count:1,cashback:{account:'Test card A',earnedMinor:20000,creditedMinor:0}});await store.saveStatementArchive(a.rows,a.batches);
  });
  await page.reload({waitUntil:'networkidle'});await workspace();await page.getByLabel('Statement batch',{exact:true}).selectOption(currentId);await panel().getByText(/Shortfall: ₹4/).waitFor();
  assert.match(await panel().innerText(),/Pending rewards · not income/);assert.match(await panel().innerText(),/₹691/);assert.match(await panel().innerText(),/₹20.53/);
  await panel().getByRole('button',{name:/Review cashback credit.*₹196$/}).click();assert.equal(await page.getByLabel('Review transaction type',{exact:true}).inputValue(),'Income Misc');assert.equal(await page.getByLabel('Review incomeType',{exact:true}).inputValue(),'Cashback');
  await page.getByRole('button',{name:'Post & review next',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('finance-tracker-data-v2')).transactions.length===1);await page.getByRole('button',{name:'Back',exact:true}).last().click();
  let posted=await snapshot();assert.equal(posted.transactions[0].amountMinor,19600);assert.equal(posted.transactions[0].type,'Income Misc');assert.equal(posted.transactions[0].incomeType,'Cashback');assert.equal(posted.transactions[0].financialEffect.income,19600);assert.ok(posted.incomeTypes.includes('Cashback'));
  await page.getByLabel('Statement status',{exact:true}).selectOption('all');const credit=posted.statementRows.find(r=>r.cashbackCredit==='cycle');await page.locator('tbody tr').filter({hasText:credit.note}).getByRole('button',{name:'Reopen',exact:true}).click();await page.getByRole('button',{name:'Save changes to posted entry',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).last().click();
  posted=await snapshot();assert.equal(posted.transactions.length,1);assert.equal(posted.transactions[0].amountMinor,19600);
  await page.reload({waitUntil:'networkidle'});await workspace();await page.getByLabel('Statement batch',{exact:true}).selectOption(currentId);await panel().getByText(/Shortfall: ₹4/).waitFor();assert.match(await panel().innerText(),/Cashback income posted\s+₹196/);
  const backed=mergeBackup(seed,JSON.stringify(await snapshot()));assert.equal(backed.transactions.length,1);assert.equal(backed.statementBatches.find(b=>b.id===currentId).cashback.earnedMinor,69100);
  console.log('PASS cashback UI: earned metadata, missing prior source, exact shortfall, actual-credit income, repeat-post prevention and reload/backup');
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('PASS mobile layout and no browser errors');
 await context.close();
}finally{await browser.close();}
