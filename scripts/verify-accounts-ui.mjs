// Synthetic local browser only. All authentication HTTP requests are intercepted.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'});
const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const token=id=>{const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');return `${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,exp:Math.floor(Date.now()/1000)+3600})}.synthetic`;};
const makeSession=id=>({access_token:token(id),refresh_token:'synthetic-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id,aud:'authenticated',role:'authenticated',email:`${id}@example.test`,app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()}});
let active='alice',verifyCalls=0;
await context.route('https://accounts-test.invalid/**',async route=>{
 const req=route.request(),url=req.url();const body=req.postDataJSON?.();
 if(url.includes('/verify')) {verifyCalls++;if(body?.token_hash==='expired'){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({msg:'Invitation expired',error_code:'otp_expired'})});return;}}
 if(url.includes('/token')&&body?.email)active=body.email.split('@')[0];
 await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify((url.includes('/token')||url.includes('/verify'))?makeSession(active):url.includes('/user')?makeSession(active).user:{})});
});
try{
 await page.goto(process.env.ACCOUNTS_TEST_URL||'http://127.0.0.1:5184');await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
 await page.evaluate(()=>localStorage.setItem('finance-tracker-data-v2',JSON.stringify({schemaVersion:4,transactions:[{id:'synthetic-expense',type:'Revenue Expense',amount:125,amountMinor:12500,currency:'INR',date:'2026-10-28',status:'active',account:'Cash',paymentMode:'Cash',majorCategory:'Misc',subCategory:'',person:'',remarks:'Synthetic fixture',customFields:{},createdAt:1,updatedAt:1,syntheticUnknown:'transaction-preserved'}],rules:[],syntheticUnknown:'preserve'})));
 async function login(id){await page.getByLabel('Email',{exact:true}).fill(id+'@example.test');await page.getByLabel('Password',{exact:true}).fill('Synthetic-password-123');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('button',{name:'Start with a separate ledger'}).waitFor();}
 await login('alice');await page.getByRole('button',{name:/These records belong to me/}).click();await page.getByRole('button',{name:'Account & sync',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('finance-tracker-data-v2:user:alice')).syntheticUnknown),'preserve');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('finance-tracker-data-v2:user:alice')).transactions[0].amountMinor),12500);
 await page.getByRole('button',{name:'Account & sync',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
 await login('bob');assert.equal(await page.getByRole('button',{name:/These records belong to me/}).count(),0);
 await page.getByRole('button',{name:'Start with a separate ledger'}).click();await page.getByRole('button',{name:'Account & sync',exact:true}).waitFor();
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('finance-tracker-data-v2:user:bob')).syntheticUnknown),undefined);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('finance-tracker-data-v2')).syntheticUnknown),'preserve');
 await page.reload();await page.getByRole('button',{name:'Account & sync',exact:true}).waitFor();
 await page.getByRole('button',{name:'Account & sync',exact:true}).click();await page.getByLabel('New password').fill('Changed-synthetic-password-456');await page.getByRole('button',{name:'Save password'}).click();await page.getByRole('button',{name:'Account & sync',exact:true}).waitFor();
 await page.getByRole('button',{name:'Account & sync',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
 await page.goto((process.env.ACCOUNTS_TEST_URL||'http://127.0.0.1:5184')+'/?token_hash=synthetic-invite&type=invite');await page.getByLabel('New password').waitFor();assert.equal(verifyCalls,1,'StrictMode must consume single-use token once');assert.equal(await page.getByRole('button',{name:'Back',exact:true}).count(),0);
 await page.getByLabel('New password').fill('Invited-password-123');await page.getByRole('button',{name:'Save password'}).click();await page.getByRole('button',{name:'Account & sync',exact:true}).waitFor();
 await page.getByRole('button',{name:'Account & sync',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
 await page.goto((process.env.ACCOUNTS_TEST_URL||'http://127.0.0.1:5184')+'/?token_hash=expired&type=invite');await page.getByText('Invitation expired',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Account & sync',exact:true}).count(),0);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.goto((process.env.ACCOUNTS_TEST_URL||'http://127.0.0.1:5184')+'/?token_hash=synthetic-recovery&type=recovery');await page.getByLabel('New password').waitFor();assert.equal(await page.getByRole('button',{name:'Back',exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('Accounts browser checks passed: login, claim, isolated new account, logout, reload, password change, single-use invitation, mandatory password setup, expired invitation, mobile width, console.');
}finally{await context.close();await browser.close();}
