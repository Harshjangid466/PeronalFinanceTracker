// Run against the local dev server with Playwright available via PLAYWRIGHT_MODULE.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(path.resolve('package.json')),ts=require('typescript'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,require:p=>p.startsWith('.')?load(path.resolve(path.dirname(file),p+'.ts')):require(p),structuredClone,console,Date,Math,Set,Map});return mod.exports;}
const {getDefaultData}=load('src/data/defaults.ts'),{migrateData}=load('src/data/model.ts');
const seed=migrateData(getDefaultData());seed.recurring=[];
seed.transactions=Array.from({length:40},(_,i)=>({id:`swipe-${i}`,schemaVersion:4,date:'2026-10-18',amount:25,amountMinor:2500,currency:'INR',account:'HDFC Savings A/c',paymentMode:'UPI',type:'Revenue Expense',majorCategory:'Food',subCategory:'Lunch',heading:`Swipe fixture ${i}`,remarks:'Synthetic swipe check',status:'active',createdAt:100-i,updatedAt:100-i,customFields:{},entrySource:{kind:'manual'}}));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
await page.addInitScript(seed=>{if(!localStorage.getItem('swipe-seeded')){localStorage.setItem('finance-tracker-data-v2',JSON.stringify(seed));localStorage.setItem('swipe-seeded','yes');}},seed);
await page.goto(process.env.SWIPE_TEST_URL||'http://127.0.0.1:5178/',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Transactions',exact:true}).click();
const ledger=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('finance-tracker-data-v2'))),row=()=>page.getByRole('button',{name:/^Swipe fixture 0 /}),cdp=await context.newCDPSession(page);
async function gesture(dx,dy=0,cancel=false,screenshot=false){
 await row().scrollIntoViewIfNeeded();const box=await row().boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});await page.waitForTimeout(15);}
 if(screenshot)await page.screenshot({path:process.env.SWIPE_SCREENSHOT_PATH||'transaction-swipe-delete.png'});
 await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await page.waitForTimeout(250);
}
async function noSheet(){assert.equal(await page.getByRole('heading',{name:'Confirm Deletion',exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:'Edit Revenue Expense',exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:'Transaction details',exact:true}).count(),0);}
await row().tap();await page.getByRole('heading',{name:'Transaction details',exact:true}).waitFor();await page.getByRole('button',{name:'Back',exact:true}).last().click();await page.waitForTimeout(250);
await gesture(45);await noSheet();assert.equal((await ledger()).transactions[0].status,'active');
await gesture(110,0,true);await noSheet();
await gesture(10,-100);await noSheet();assert.ok(await page.evaluate(()=>scrollY)>0);await page.evaluate(()=>scrollTo(0,0));
console.log('PASS tap, short swipe, cancelled gesture and vertical scrolling');
await page.waitForTimeout(1200); await gesture(-110);await page.getByRole('heading',{name:'Edit Revenue Expense',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Transaction details',exact:true}).count(),0);await page.getByLabel('Heading (optional)',{exact:true}).fill('Swipe edit saved');await page.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByRole('heading',{name:'Edit Revenue Expense',exact:true}).waitFor({state:'hidden'});assert.equal((await ledger()).transactions.find(t=>t.id==='swipe-0').heading,'Swipe edit saved');
await page.reload();await page.waitForLoadState('networkidle');assert.equal((await ledger()).transactions.find(t=>t.id==='swipe-0').heading,'Swipe edit saved');await page.getByRole('button',{name:'Transactions',exact:true}).click();
// Reuse the original locator for the remaining swipe checks after editing its heading.
await page.getByRole('button',{name:/^Swipe edit saved /}).click();await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Heading (optional)',{exact:true}).fill('Swipe fixture 0');await page.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByRole('heading',{name:'Edit Revenue Expense',exact:true}).waitFor({state:'hidden'});
console.log('PASS left swipe edits the correct entry; saved edit survives reload; existing detail Edit action works');
await gesture(110,0,false,true);await page.getByRole('heading',{name:'Confirm Deletion',exact:true}).waitFor();assert.equal((await ledger()).transactions.find(t=>t.id==='swipe-0').status,'active');assert.equal(await page.getByRole('heading',{name:'Transaction details',exact:true}).count(),0);await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForTimeout(250);await noSheet();assert.equal((await ledger()).transactions.find(t=>t.id==='swipe-0').status,'active');
await gesture(110);await page.getByRole('button',{name:'Yes, Delete',exact:true}).click();assert.equal((await ledger()).transactions.find(t=>t.id==='swipe-0').status,'deleted');await page.waitForTimeout(250);assert.equal(await row().count(),0);
await page.reload();await page.waitForLoadState('networkidle');assert.equal((await ledger()).transactions.find(t=>t.id==='swipe-0').status,'deleted');await page.getByRole('button',{name:'Transactions',exact:true}).click();await page.getByRole('button',{name:'Transaction tools',exact:true}).click();await page.getByRole('button',{name:/Deleted entries \(/}).click();await page.getByRole('button',{name:'Restore',exact:true}).click();assert.equal((await ledger()).transactions.find(t=>t.id==='swipe-0').status,'active');await page.getByRole('button',{name:'Back',exact:true}).last().click();await page.waitForTimeout(250);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
console.log('PASS right swipe confirmation, cancellation, recoverable deletion, reload, restore, mobile overflow and application errors');
// Keyboard activation still opens the normal detail view after a swipe.
await row().focus();await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Transaction details',exact:true}).waitFor();console.log('PASS keyboard detail access');
}finally{await browser.close();}
