import {createClient} from '@supabase/supabase-js';
import {validateDocument} from '../../src/data/syncModel';
type Environment=Record<string,string|undefined>;
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function bodyOf(request:Request){
 const reader=request.body?.getReader();if(!reader)throw Error('Empty request');const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8000000){await reader.cancel();throw Error('Payload too large');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
export async function accountSync(request:Request,env:Environment,provider:typeof fetch=fetch){
 if(request.method!=='POST')return reply(405,{error:'POST required.'});
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply(403,{error:'Open sync from this app.'});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply(415,{error:'JSON required.'});
 if(env.ACCOUNT_SYNC_ENABLED!=='true')return reply(503,{error:'Cloud sync is not activated on this server.'});
 const url=env.SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY,publishable=env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key||!publishable)return reply(503,{error:'Cloud account server configuration is incomplete.'});
 let body:Record<string,unknown>;try{body=await bodyOf(request);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return reply(400,{error:'Invalid or oversized request.'});}
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:provider}});
 try{
   if(body.action==='status'){
     if(typeof body.userId!=='string'||typeof body.probe!=='string'||body.probe.length>100)return reply(400,{error:'Invalid status probe.'});
     const {data,error}=await db.from('finance_sync_accounts').select('deleted').eq('user_id',body.userId).eq('probe',body.probe).maybeSingle();
     if(error)return reply(503,{error:'Account status unavailable.'});return reply(200,{deleted:data?.deleted===true});
   }
   const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
   if(!token||token.length>12000)return reply(401,{error:'Sign in again to sync.'});
   const identity=await db.auth.getUser(token);if(identity.error||!identity.data.user)return reply(401,{error:'Sign in again to sync.'});
   const user=identity.data.user;
   const registered=await db.from('finance_sync_accounts').upsert({user_id:user.id},{onConflict:'user_id',ignoreDuplicates:true});if(registered.error)throw Error('registry');
   const account=await db.from('finance_sync_accounts').select('probe,deleted').eq('user_id',user.id).single();if(account.error)throw Error('registry');
   if(account.data.deleted && body.action!=='delete')return reply(410,{error:'Account deleted.',deleted:true});
   if(body.action==='read'){
     const head=await db.from('finance_sync_documents').select('revision,document').eq('user_id',user.id).maybeSingle();if(head.error)throw Error('read');
     return reply(200,{revision:head.data?.revision||0,document:head.data?.document||null,probe:account.data.probe});
   }
   if(body.action==='commit'){
     if(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<0||typeof body.restore!=='boolean')return reply(400,{error:'Invalid revision.'});
     try{validateDocument(body.document);}catch(e){return reply(400,{error:e instanceof Error?e.message:'Invalid document.'});}
     const saved=await db.rpc('finance_sync_commit',{p_user_id:user.id,p_expected:body.expectedRevision,p_document:body.document,p_restore:body.restore});if(saved.error)throw Error('commit');
     return reply(saved.data.conflict?409:200,saved.data);
   }
   if(body.action==='backups'){
     const found=await db.from('finance_sync_backups').select('backup_key,revision,created_at').eq('user_id',user.id).order('created_at',{ascending:false});if(found.error)throw Error('backups');return reply(200,{backups:found.data});
   }
   if(body.action==='backup'){
     if(typeof body.key!=='string'||!/^(\d{4}-\d{2}-\d{2}|pre-restore)$/.test(body.key))return reply(400,{error:'Invalid backup.'});
     const found=await db.from('finance_sync_backups').select('document,revision').eq('user_id',user.id).eq('backup_key',body.key).single();if(found.error||!found.data)return reply(404,{error:'Recovery copy unavailable.'});return reply(200,found.data);
   }
   if(body.action==='delete'){
     if(typeof body.password!=='string'||body.password.length>1024||body.confirm!=='DELETE')return reply(400,{error:'Password and DELETE confirmation required.'});
     const auth=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:provider}});
     const reauth=await auth.auth.signInWithPassword({email:user.email||'',password:body.password});
     if(reauth.error||reauth.data.user?.id!==user.id)return reply(403,{error:'Reauthentication failed.'});
     // Persist a minimal deletion marker so offline devices can purge when they reconnect.
     const mark=await db.from('finance_sync_accounts').update({deleted:true}).eq('user_id',user.id);if(mark.error)throw Error('mark');
     const deleted=await db.auth.admin.deleteUser(user.id);
     if(deleted.error){await db.from('finance_sync_accounts').update({deleted:false}).eq('user_id',user.id);return reply(503,{error:'Account deletion did not complete. Retry.'});}
     return reply(200,{deleted:true});
   }
   return reply(400,{error:'Unknown account operation.'});
 }catch{return reply(503,{error:'Cloud account operation failed. Local records are preserved; retry later.'});}
}
export default(request:Request)=>accountSync(request,(globalThis as typeof globalThis&{process?:{env:Environment}}).process?.env||{});
export const config={path:'/api/account-sync',rateLimit:{action:'rate_limit',aggregateBy:['ip','domain'],windowLimit:120,windowSize:60}};
