import {flushStatementArchive} from './statementStore';
import {accountAuth,accountsEnabled} from './accountClient';
import {accountStorageName,blockAccountWrites} from './accountStorage';
import type {CloudHead,CloudDocument} from './syncModel';
export const cloudEnabled=accountsEnabled&&import.meta.env.VITE_CLOUD_SYNC_ENABLED==='true';
export class CloudError extends Error{constructor(message:string,public status:number){super(message);}}
export async function purgeAccount(id:string){
 blockAccountWrites();
 localStorage.setItem(accountStorageName('finance-account-purge-pending',id),'true');
 window.dispatchEvent(new Event('finance-account-purge-start'));
 await flushStatementArchive().catch(()=>{});
 const claimed=localStorage.getItem('finance-legacy-claimed')===id;
 const suffix=`:user:${id}`;
 const names=['finance-statement-history','finance-statement-passwords','finance-sync-state'];
 await Promise.all(names.flatMap(name=>[accountStorageName(name,id),...(claimed&&name!=='finance-sync-state'?[name]:[])]).map(name=>new Promise<void>((resolve,reject)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=()=>resolve();r.onerror=r.onblocked=()=>reject(Error('Close other app tabs, then retry deleting device copies.'));})));
 if(claimed){for(const key of ['finance-tracker-data-v1','finance-tracker-data-v2','finance-tracker-pre-v3-backup','finance-tracker-pre-v4-backup','finance-legacy-claimed'])localStorage.removeItem(key);}
 for(const key of Object.keys(localStorage))if(key.endsWith(suffix))localStorage.removeItem(key);
 localStorage.removeItem('finance-account-last-owner');
 window.dispatchEvent(new Event('finance-account-deleted'));
}
async function request(body:unknown,token?:string){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{const response=await fetch('/api/account-sync',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body),signal:controller.signal});const result=await response.json();if(!response.ok)throw new CloudError(result.error||'Cloud request failed.',response.status);return result;}finally{clearTimeout(timer);}
}
export async function checkAccountDeletion(id:string){
 const probe=localStorage.getItem(accountStorageName('finance-account-probe',id));if(!cloudEnabled||!probe||!navigator.onLine)return false;
 const result=await request({action:'status',userId:id,probe});if(result.deleted){await purgeAccount(id);return true;}return false;
}
export async function cloudRequest(action:string,body:Record<string,unknown>={}){
 if(!cloudEnabled||!accountAuth)throw Error('Cloud sync is not configured.');
 const {data,error}=await accountAuth.auth.getSession();if(error||!data.session)throw new CloudError('Sign in again.',401);
 const id=data.session.user.id;
 try{const result=await request({action,...body},data.session.access_token);
   if(typeof result.probe==='string'){localStorage.setItem(accountStorageName('finance-account-probe',id),result.probe);localStorage.setItem('finance-account-last-owner',id);}
   return result;
 }catch(e){if(e instanceof CloudError&&(e.status===401||e.status===410)){if(e.status===410)await purgeAccount(id);else await checkAccountDeletion(id);}throw e;}
}
export const readCloud=():Promise<CloudHead>=>cloudRequest('read');
export const commitCloud=(expectedRevision:number,document:CloudDocument,restore=false):Promise<{revision:number;backupWarning?:string}>=>cloudRequest('commit',{expectedRevision,document,restore});
