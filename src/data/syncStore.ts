import type {CloudDocument} from './syncModel';
import {storageName,accountWritesBlocked} from './accountStorage';
export interface SyncState {base:CloudDocument|null;revision:number;lastSuccess?:number;enabled:boolean;recovery?:CloudDocument;conflict?:{base:CloudDocument|null;local:CloudDocument;remote:CloudDocument;revision:number}}
export const emptySyncState=():SyncState=>({base:null,revision:0,enabled:false});
export async function syncState(value?:SyncState):Promise<SyncState>{
 if(value&&accountWritesBlocked())throw Error('Account data is being removed.');
 const name=storageName('finance-sync-state');
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Sync metadata unavailable. Local records are preserved.'));});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('state',value?'readwrite':'readonly');if(value&&accountWritesBlocked()){tx.abort();reject(Error('Account data is being removed.'));return;}const store=tx.objectStore('state');const r=value?store.put(value,'current'):store.get('current');let result:SyncState;r.onsuccess=()=>{result=value||r.result||emptySyncState();};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('Sync metadata could not be saved. Local records are preserved.'));});}finally{db.close();}
}
