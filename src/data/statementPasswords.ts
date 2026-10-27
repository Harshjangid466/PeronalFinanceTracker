// Device-local vault, deliberately separate from ledger backups and action logs.
// Encryption protects stored values, not against scripts running in this app's origin.
const database='finance-beta-statement-passwords';
function open():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{const r=indexedDB.open(database,1);r.onupgradeneeded=()=>r.result.createObjectStore('vault');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Password storage is unavailable on this device.'));});
}
async function record<T>(mode:IDBTransactionMode,request:(store:IDBObjectStore)=>IDBRequest):Promise<T>{
 const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('vault',mode),r=request(tx.objectStore('vault'));let value:T;r.onsuccess=()=>{value=r.result;};tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(Error('Password storage is unavailable on this device.'));});}finally{db.close();}
}
let keyPromise:Promise<CryptoKey>|undefined;
function key(){
 return keyPromise??=(async()=>{
  const existing=await record<CryptoKey|undefined>('readonly',s=>s.get('key'));if(existing)return existing;
  const generated=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  try{await record('readwrite',s=>s.add(generated,'key'));return generated;}catch(e){const winner=await record<CryptoKey|undefined>('readonly',s=>s.get('key'));if(winner)return winner;throw e;}
 })().catch(e=>{keyPromise=undefined;throw e;});
}
export async function getStatementPassword(account:string):Promise<string>{
 const saved=await record<{iv:Uint8Array;encrypted:ArrayBuffer}|undefined>('readonly',s=>s.get(['password',account]));if(!saved)return '';
 try{return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:saved.iv},await key(),saved.encrypted));}
 catch{throw Error('Saved PDF password could not be opened. Forget it and enter it again.');}
}
export async function saveStatementPassword(account:string,password:string){
 if(!account||!password)throw Error('Choose an account and enter its PDF password.');
 const iv=crypto.getRandomValues(new Uint8Array(12)),encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(),new TextEncoder().encode(password));
 await record('readwrite',s=>s.put({iv,encrypted},['password',account]));
}
export async function forgetStatementPassword(account:string){await record('readwrite',s=>s.delete(['password',account]));}
