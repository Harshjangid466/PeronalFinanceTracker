const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
const cache=new Map(),tables={finance_sync_accounts:[],finance_sync_documents:[],finance_sync_backups:[]};
class Query{
 constructor(table){this.table=table;this.filters=[];this.action='select';}
 select(){return this;}eq(k,v){this.filters.push([k,v]);return this;}order(){return this;}
 upsert(v){this.action='upsert';this.value=v;return this;}update(v){this.action='update';this.value=v;return this;}
 async execute(single=false){const rows=tables[this.table];if(this.action==='upsert'&&!rows.some(x=>x.user_id===this.value.user_id))rows.push({...this.value,probe:'probe-'+this.value.user_id,deleted:false});const selected=rows.filter(x=>this.filters.every(([k,v])=>x[k]===v));if(this.action==='update')selected.forEach(x=>Object.assign(x,this.value));return {data:single?(selected[0]||null):selected,error:null};}
 maybeSingle(){return this.execute(true);}single(){return this.execute(true);}then(a,b){return this.execute().then(a,b);}
}
const db={from:t=>new Query(t),auth:{getUser:async token=>({data:{user:token.startsWith('valid-')?{id:token.slice(6),email:token.slice(6)+'@example.test'}:null},error:null}),admin:{deleteUser:async id=>{tables.finance_sync_documents=tables.finance_sync_documents.filter(x=>x.user_id!==id);tables.finance_sync_backups=tables.finance_sync_backups.filter(x=>x.user_id!==id);return {error:null};}}},rpc:async(_name,p)=>{const head=tables.finance_sync_documents.find(x=>x.user_id===p.p_user_id);if((head?.revision||0)!==p.p_expected)return {data:{conflict:true,revision:head?.revision||0}};const next={user_id:p.p_user_id,revision:(head?.revision||0)+1,document:p.p_document};tables.finance_sync_documents=tables.finance_sync_documents.filter(x=>x.user_id!==p.p_user_id);tables.finance_sync_documents.push(next);return {data:{revision:next.revision},error:null};}};
const createClient=(_url,key)=>key==='service'?db:{auth:{signInWithPassword:async({email,password})=>({data:{user:password==='correct-password'?{id:email.split('@')[0]}:null},error:password==='correct-password'?null:Error('wrong')})}};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:p=>p==='@supabase/supabase-js'?{createClient}:p.startsWith('.')?load(path.resolve(path.dirname(file),p+'.ts')):require(p),structuredClone,console,Date,Math,Set,Map,Number,JSON,URL,Request,Response,TextEncoder,TextDecoder,Uint8Array,fetch});return m.exports;}
const {accountSync}=load('netlify/functions/account-sync.ts'),{getDefaultData}=load('src/data/defaults.ts'),{migrateData}=load('src/data/model.ts'),{documentOf}=load('src/data/syncModel.ts');
const env={ACCOUNT_SYNC_ENABLED:'true',SUPABASE_URL:'https://synthetic.invalid',SUPABASE_SERVICE_ROLE_KEY:'service',SUPABASE_PUBLISHABLE_KEY:'public'};
function request(body,token='valid-alice',origin='https://app.test'){return new Request('https://app.test/api/account-sync',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});}
(async()=>{
 assert.equal((await accountSync(request({action:'read'}),{})).status,503);
 assert.equal((await accountSync(request({action:'read'},'invalid'),env)).status,401);
 assert.equal((await accountSync(request({action:'read'},'valid-alice','https://evil.test'),env)).status,403);
 tables.finance_sync_documents.push({user_id:'bob',revision:7,document:documentOf(migrateData(getDefaultData()))});
 let result=await accountSync(request({action:'read',userId:'bob'}),env);assert.equal((await result.json()).document,null);
 const doc=documentOf(migrateData(getDefaultData()));
 result=await accountSync(request({action:'commit',expectedRevision:0,document:doc,restore:false,userId:'bob'}),env);assert.equal(result.status,200);assert.equal(tables.finance_sync_documents.find(x=>x.user_id==='bob').revision,7);assert.equal(tables.finance_sync_documents.find(x=>x.user_id==='alice').revision,1);
 assert.equal((await accountSync(request({action:'commit',expectedRevision:0,document:doc,restore:false}),env)).status,409);
 assert.equal((await accountSync(request({action:'commit',expectedRevision:1,document:{...doc,format:99},restore:false}),env)).status,400);
 tables.finance_sync_backups.push({user_id:'bob',backup_key:'2026-10-28',document:doc});
 result=await accountSync(request({action:'backup',key:'2026-10-28',userId:'bob'}),env);assert.equal(result.status,404);
 assert.equal((await accountSync(request({action:'delete',password:'wrong',confirm:'DELETE'}),env)).status,403);
 assert.equal((await accountSync(request({action:'delete',password:'correct-password',confirm:'DELETE'}),env)).status,200);
 assert.equal(tables.finance_sync_documents.some(x=>x.user_id==='alice'),false);assert.equal(tables.finance_sync_documents.some(x=>x.user_id==='bob'),true);
 result=await accountSync(request({action:'read'}),env);assert.equal(result.status,410);
 result=await accountSync(request({action:'status',userId:'alice',probe:'wrong'},'invalid'),env);assert.equal((await result.json()).deleted,false);
 result=await accountSync(request({action:'status',userId:'alice',probe:'probe-alice'},'invalid'),env);assert.equal((await result.json()).deleted,true);
 console.log('Server boundary checks passed: disabled config, invalid identity, origin, user isolation, revision conflict, payload validation, backup isolation, reauthentication, deletion, private status probe.');
})().catch(e=>{console.error(e);process.exitCode=1;});
