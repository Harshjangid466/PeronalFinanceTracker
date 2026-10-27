import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
const originalWorker=fs.readFileSync('dist/sw.js','utf8');
const url=process.env.BETA_URL||'http://127.0.0.1:5187',errors=[],posts=[],external=[];
fs.mkdirSync('artifacts/beta',{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write']});
 await context.route('**/*',route=>{if(new URL(route.request().url()).hostname!=='127.0.0.1'){external.push(route.request().url());return route.abort();}if(route.request().method()==='POST')posts.push(route.request().url());return route.continue();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForLoadState('networkidle');
 await page.getByRole('heading',{name:'Your money, your setup.'}).waitFor();
 await page.screenshot({path:'artifacts/beta/welcome-desktop.png'});
 await page.getByRole('button',{name:'Get started',exact:true}).click();
 await page.getByLabel('Nickname',{exact:true}).fill('Synthetic tester');await page.getByLabel('Email for feedback replies').fill('tester@example.invalid');await page.getByLabel('What would you like to try?').selectOption('Import statements');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Set up my tracker',exact:true}).click();
 await page.getByRole('heading',{name:'Accounts & ways to pay',exact:true}).waitFor();
 await page.getByRole('button',{name:'Configure accounts & payments',exact:true}).click();
 await page.getByLabel('Account name',{exact:true}).fill('Setup bank');await page.getByRole('button',{name:'Add account and link methods',exact:true}).click();
 await page.getByLabel('Account type',{exact:true}).selectOption('Credit card');await page.getByLabel('Account name',{exact:true}).fill('Setup credit card');await page.getByRole('button',{name:'Add account and link methods',exact:true}).click();
 const linked=await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('finance-beta-data-v2'));const card=d.masters.find(m=>m.kind==='source'&&m.name==='Setup credit card'),mode=d.masters.find(m=>m.kind==='paymentMode'&&m.name==='CC');return d.sourceMappings[mode.id].includes(card.id);});assert.equal(linked,true);
 await page.screenshot({path:'artifacts/beta/account-payment-setup.png',fullPage:false});
 await page.keyboard.press('Escape');await page.waitForTimeout(250);await page.getByRole('heading',{name:'Accounts & ways to pay',exact:true}).waitFor();
 for(const title of ['Make categories yours','Set entry logic','Teach import habits','Add repeat payments','Personalise the other settings','Keep your first backup']){
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:title,exact:true}).waitFor();
  if(title==='Make categories yours'){
   await page.screenshot({path:'artifacts/beta/setup-desktop.png'});
   await page.getByRole('button',{name:'Configure Categories & subcategories',exact:true}).click();
   await page.getByRole('heading',{name:'Categories & Sub-categories',exact:true}).waitFor();assert.ok(await page.getByText('Fuel',{exact:true}).count());await page.keyboard.press('Escape');await page.waitForTimeout(250);
  }
  if(title==='Teach import habits'){
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/beta/setup-habits-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.getByRole('button',{name:'Configure Import habits',exact:true}).click();await page.getByRole('navigation',{name:'Import habit types'}).waitFor();await page.getByRole('button',{name:'Vendors',exact:true}).click();
   await page.getByRole('textbox',{name:'New vendor name',exact:true}).fill('Setup cafe');await page.getByRole('button',{name:'Add',exact:true}).click();await page.keyboard.press('Escape');await page.waitForTimeout(250);
  }
 }
 await page.getByRole('button',{name:'Open my tracker',exact:true}).click();
 const tour=page.getByRole('dialog',{name:'Home',exact:true});await tour.waitFor();await page.screenshot({path:'artifacts/beta/icon-tour-mobile.png'});
 await page.keyboard.press('Tab');assert.equal(await page.getByRole('button',{name:'Skip tour',exact:true}).evaluate(el=>el===document.activeElement),true);
 for(const title of ['Transactions','Add an entry','Recover money','Settings','Setup guide','Feedback']){await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('dialog',{name:title,exact:true}).waitFor();}
 await page.getByRole('button',{name:'Finish tour',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('finance-beta-profile-v1')).tourSeen),true);
 await page.getByRole('button',{name:'Icon tour',exact:true}).click();await page.getByRole('dialog',{name:'Home',exact:true}).waitFor();await page.getByRole('button',{name:'Skip tour',exact:true}).click();
 await page.getByRole('button',{name:'Feedback',exact:true}).waitFor();
 assert.equal(await page.locator('.home-brand').innerText(),"Synthetic tester's Personal Finance Tracker");
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('finance-beta-data-v2')).transactions.length),0);
 assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('finance-beta-data-v2')).accounts.includes('Setup bank')));
 assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('finance-beta-data-v2')).importHabits.vendors.some(v=>v.vendor==='Setup cafe')));
 await page.getByRole('button',{name:'Feedback',exact:true}).click();
 await page.getByLabel('What happened, or what would you change?').fill('Synthetic feedback: simplify setup.');
 let report=JSON.parse(await page.getByLabel('Exact feedback report').inputValue());assert.equal(report.contact,undefined);assert.equal(report.usage,undefined);
 await page.getByLabel('Include my nickname and email').check();await page.getByLabel('Include my last seven days of usage counters').check();
 report=JSON.parse(await page.getByLabel('Exact feedback report').inputValue());assert.equal(report.contact.nickname,'Synthetic tester');assert.ok(report.usage.activeDays>=1);assert.equal(report.transactions,undefined);assert.equal(report.accounts,undefined);assert.equal(report.goal,undefined);
 assert.equal(await page.getByRole('button',{name:'Send feedback',exact:true}).count(),0);
 await page.getByRole('button',{name:'Copy report',exact:true}).click();await page.getByRole('status').filter({hasText:'Report copied'}).waitFor();
 assert.equal(JSON.parse(await page.evaluate(()=>navigator.clipboard.readText())).message,'Synthetic feedback: simplify setup.');
 await page.screenshot({path:'artifacts/beta/feedback-desktop.png',fullPage:true});
 for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`artifacts/beta/feedback-${width}.png`,fullPage:true});}
 await page.reload();await page.waitForLoadState('networkidle');assert.equal(await page.getByRole('dialog',{name:'Home',exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:'Your money, your setup.'}).count(),0);
 await page.getByRole('button',{name:'Setup guide',exact:true}).click();await page.getByRole('heading',{name:'Accounts & ways to pay',exact:true}).waitFor();for(let i=0;i<6;i++)await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Open my tracker',exact:true}).click();
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 // Exercise an actual waiting worker using a temporary build-artifact revision.
 fs.writeFileSync('dist/sw.js',originalWorker.replace(/finance-tracker-v4-([a-f0-9]+)/,'finance-tracker-v4-$1-test-update'));
 await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
 await page.getByRole('button',{name:'Update and reload',exact:true}).waitFor();
 page.once('dialog',dialog=>dialog.accept());await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),page.getByRole('button',{name:'Update and reload',exact:true}).click()]);
 await page.waitForLoadState('networkidle');await page.getByRole('button',{name:'Feedback',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('finance-beta-profile-v1')).nickname),'Synthetic tester');
 fs.writeFileSync('dist/sw.js',originalWorker);
 await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'Feedback',exact:true}).waitFor();await page.getByRole('button',{name:'Feedback',exact:true}).click();await page.getByRole('heading',{name:'Help shape the beta.'}).waitFor();await context.setOffline(false);
 const other=await browser.newContext();const fresh=await other.newPage();await fresh.goto(url);await fresh.getByRole('heading',{name:'Your money, your setup.'}).waitFor();await fresh.getByRole('button',{name:'Set up later',exact:true}).click();assert.equal(await fresh.evaluate(()=>JSON.parse(localStorage.getItem('finance-beta-profile-v1')).nickname),'');assert.equal(await fresh.locator('.home-brand').innerText(),'Personal Finance Tracker');await fresh.evaluate(()=>{const key='finance-beta-profile-v1',p=JSON.parse(localStorage.getItem(key));p.nickname='A'.repeat(60);p.tourSeen=true;localStorage.setItem(key,JSON.stringify(p));});await fresh.setViewportSize({width:320,height:844});await fresh.reload();await fresh.waitForLoadState('networkidle');assert.equal(await fresh.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await other.close();
 assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);assert.deepEqual(external,[]);
 console.log('Beta UI passed: welcome, optional profile, combined account/payment linking, setup habit editing, first-use icon tour, skip/replay/persistence, starter categories, feedback consent/preview/copy, mobile 320/390, reload, separate users, production update prompt/reload and offline reload; no external requests, posts or page errors.');
 await context.close();
}finally{fs.writeFileSync('dist/sw.js',originalWorker);await browser.close();}
