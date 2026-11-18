import {accountWritesBlocked,storageName} from './accountStorage';
import {openStatementDatabase} from './statementStore';

export const recoverySources = [
 ['finance-tracker-data-v1','Legacy ledger copy'],
 ['finance-tracker-pre-v4-backup','Before the v4 migration'],
 ['finance-tracker-pre-v3-backup','Before the v3 migration'],
] as const;
export interface RecoveryCopy {id:string;source:string;label:string;raw:string;archivedAt:number;}
const range=()=>IDBKeyRange.bound('recovery:','recovery:\uffff');
export async function loadRecoveryCopies():Promise<RecoveryCopy[]> {
 const db=await openStatementDatabase();
 try{return await new Promise((resolve,reject)=>{
  const t=db.transaction('archive','readonly'),request=t.objectStore('archive').getAll(range());
  t.oncomplete=()=>resolve(request.result);t.onabort=t.onerror=()=>reject(t.error||Error('Recovery copies could not be read.'));
 });}finally{db.close();}
}
let pending:Promise<{moved:number;characters:number}>|undefined;
export function repairStorage(){
 if(pending)return pending;
 pending=moveRecoveryCopies().finally(()=>{pending=undefined;});return pending;
}
async function moveRecoveryCopies(){
 if(accountWritesBlocked())throw Error('Account data is being removed.');
 const scope=storageName('finance-tracker-data-v2');
 const hasPrimary=!!localStorage.getItem(scope);
 const copies:RecoveryCopy[]=recoverySources.flatMap(([source,label])=>{
  // An old installation may still rely on v1 if its first v2 write failed.
  if(source==='finance-tracker-data-v1'&&!hasPrimary)return [];
  const raw=localStorage.getItem(storageName(source));
  return raw===null?[]:[{id:`recovery:${Date.now()}:${crypto.randomUUID()}`,source:storageName(source),label,raw,archivedAt:Date.now()}];
 });
 if(!copies.length)return {moved:0,characters:0};
 const db=await openStatementDatabase();
 try{
  await new Promise<void>((resolve,reject)=>{
   const t=db.transaction('archive','readwrite');
   for(const copy of copies)t.objectStore('archive').add(copy,copy.id);
   // A request succeeding is not enough: wait for the transaction to commit.
   t.oncomplete=()=>resolve();t.onabort=t.onerror=()=>reject(t.error||Error('Recovery archive could not be saved. No local copies were removed.'));
  });
 }finally{db.close();}
 const saved=await loadRecoveryCopies();
 if(copies.some(copy=>!saved.some(s=>s.id===copy.id&&s.source===copy.source&&s.raw===copy.raw)))throw Error('Recovery verification failed. No local copies were removed.');
 if(accountWritesBlocked()||storageName('finance-tracker-data-v2')!==scope)throw Error('Account changed. Local copies were retained.');
 let moved=0,characters=0;
 for(const copy of copies){
  if(copy.source===storageName('finance-tracker-data-v1')&&!localStorage.getItem(scope))continue;
  // Never remove a newer copy written while the archive was being committed.
  if(localStorage.getItem(copy.source)!==copy.raw)continue;
  localStorage.removeItem(copy.source);moved++;characters+=copy.raw.length;
 }
 window.dispatchEvent(new Event('finance-recovery-archived'));
 return {moved,characters};
}
