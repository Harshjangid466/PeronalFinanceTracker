// Synthetic ledgers only. External requests are blocked; live browser data is never opened.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:p=>p.startsWith('.')?load(path.resolve(path.dirname(file),p+'.ts')):require(p),structuredClone,console,Date,Math,Set,Map});return m.exports;}
const {getDefaultData}=load('src/data/defaults.ts'),{migrateData,financialEffect}=load('src/data/model.ts');
const seed=getDefaultData();seed.transactions=[];seed.recurring=[];seed.monthlyIncomeMinor={};seed.statementRows=[];seed.statementBatches=[];
for(const month of ['08','09','10']){
 const date=`2026-${month}-05`;
 seed.transactions.push({id:'service-'+month,schemaVersion:4,type:'Revenue Expense',amount:500,amountMinor:50000,currency:'INR',date,createdAt:1,updatedAt:1,account:'HDFC Savings A/c',paymentMode:'UPI',majorCategory:'Food',subCategory:'',person:'',heading:'Monthly service',remarks:'Synthetic planning fixture',status:'active',customFields:{},financialEffect:financialEffect('Revenue Expense',50000)});
 seed.monthlyIncomeMinor[`2026-${month}`]=100000;
}
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-17T12:00:00+05:30'));
  await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  await page.addInitScript(seed=>{if(!localStorage.getItem('planning-fixture')){localStorage.setItem('finance-tracker-data-v2',JSON.stringify(seed));localStorage.setItem('planning-fixture','yes');}},migrateData(structuredClone(seed)));
  await page.goto(process.env.DASHBOARD_TEST_URL||'http://127.0.0.1:5184/',{waitUntil:'networkidle'});
  const homeTab=name=>page.getByRole('tablist',{name:'Home sections',exact:true}).getByRole('tab',{name,exact:true});
  await homeTab('Insights').click();await page.getByRole('button',{name:'Open detailed analysis',exact:true}).click();
  await page.getByRole('tab',{name:'Planning',exact:true}).click();
  const outlook=page.getByRole('region',{name:'Three month personal outlook',exact:true});
  await outlook.waitFor();
  await page.evaluate(()=>document.documentElement.classList.remove('dark'));
  assert.match(await outlook.innerText(),/Dec 2026/);assert.match(await outlook.innerText(),/Feb 2027/);
  assert.equal(await outlook.getByText('₹500',{exact:true}).count(),6);
  const before=await page.evaluate(()=>localStorage.getItem('finance-tracker-data-v2'));
  await page.getByLabel('Planning monthly income',{exact:true}).fill('2000');
  assert.equal(await outlook.getByText('₹1,500',{exact:true}).count(),3);
  await page.getByLabel('Planning spending change',{exact:true}).fill('-50');
  assert.equal(await outlook.getByText('₹1,750',{exact:true}).count(),3);
  await page.getByLabel('Planning monthly income',{exact:true}).fill('0');
  assert.equal(await outlook.getByText('-₹250',{exact:true}).count(),3);
  await page.getByLabel('Planning monthly income',{exact:true}).fill('-1');
  await page.getByRole('alert').waitFor();assert.equal(await outlook.count(),0);
  await page.getByRole('button',{name:'Reset planning assumptions',exact:true}).click();
  await outlook.waitFor();
  const candidate=page.getByRole('button',{name:'Review repeated payments: Monthly service · HDFC Savings A/c',exact:true});
  assert.match(await candidate.innerText(),/₹6,000/);
  if(process.env.DASHBOARD_SCREENSHOT_DIR){fs.mkdirSync(process.env.DASHBOARD_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DASHBOARD_SCREENSHOT_DIR,`personal-planning-${width}.png`),fullPage:true});}
  await candidate.click();
  await page.getByRole('heading',{name:'Repeated-payment evidence: Monthly service',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Edit analytics transaction service-/}).count(),3);
  await page.keyboard.press('Escape');
  await page.getByLabel('Analytics account',{exact:true}).selectOption('HDFC Savings A/c');
  assert.match(await outlook.innerText(),/Unknown/);
  await page.getByLabel('Planning monthly income',{exact:true}).fill('2000');
  assert.equal(await outlook.getByText('₹1,500',{exact:true}).count(),3);
  await page.getByLabel('Analytics account',{exact:true}).selectOption('');
  assert.equal(await page.getByLabel('Planning monthly income',{exact:true}).inputValue(),'');
  await page.getByLabel('Analytics month',{exact:true}).fill('2026-01');
  assert.match(await page.getByRole('region',{name:'Recurring payment candidates'}).innerText(),/No monthly pattern established/);
  assert.match(await outlook.innerText(),/Unknown/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByLabel('Analytics month',{exact:true}).fill('2026-11');
  assert.equal(await page.evaluate(()=>localStorage.getItem('finance-tracker-data-v2')),before);
  await page.reload({waitUntil:'networkidle'});await homeTab('Insights').click();await page.getByRole('button',{name:'Open detailed analysis',exact:true}).click();await page.getByRole('tab',{name:'Planning',exact:true}).click();
  assert.equal(await outlook.getByText('₹500',{exact:true}).count(),6);
  assert.equal(await page.evaluate(()=>localStorage.getItem('finance-tracker-data-v2')),before);
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  if(process.env.DASHBOARD_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.DASHBOARD_SCREENSHOT_DIR,`personal-planning-${width}-dark.png`),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(`PASS personal planning ${width}px: outlook, scenarios, validation, evidence, filters, empty history, reload and unchanged storage.`);
  await context.close();
 }
}finally{await browser.close();}
