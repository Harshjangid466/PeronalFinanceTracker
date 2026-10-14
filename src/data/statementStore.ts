import {validateStatementRows,validateStatementBatches,type StatementRow,type StatementBatch} from './statements';
const DB='finance-statement-history';
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('archive');r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result);});}
export async function loadStatementArchive():Promise<{rows:StatementRow[];batches:StatementBatch[]}>{
 const db=await open();try{return await new Promise((resolve,reject)=>{const t=db.transaction('archive','readonly');const r=t.objectStore('archive').get('current');r.onsuccess=()=>{try{const v=r.result||{rows:[],batches:[]};validateStatementRows(v.rows);validateStatementBatches(v.batches);resolve(v);}catch(e){reject(e);}};r.onerror=()=>reject(r.error);});}finally{db.close();}
}
let queue=Promise.resolve();
let lastSnapshot='';
export function saveStatementArchive(rows:StatementRow[],batches:StatementBatch[]):Promise<void>{
 const snapshot=structuredClone({rows,batches});
 const signature=JSON.stringify(snapshot);if(signature===lastSnapshot)return queue;lastSnapshot=signature;
 const save=queue.catch(()=>{}).then(async()=>{const db=await open();try{await new Promise<void>((resolve,reject)=>{const t=db.transaction('archive','readwrite');t.objectStore('archive').put(snapshot,'current');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}finally{db.close();}});
 queue=save.catch(error=>{if(lastSnapshot===signature)lastSnapshot='';throw error;});return queue;
}
