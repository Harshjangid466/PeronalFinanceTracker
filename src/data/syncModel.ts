import {validateCardSettlements} from './cardReconciliation';
import {validateEntryMetadata} from './entryManagement';
import {validateStatementRows,validateStatementBatches,validateHabits} from './statements';
import {validateAlerts} from './alerts';
import type {AppData} from './types';
export const SYNC_FORMAT=1;
export const DEFAULT_INTERVAL=1440;
export interface CloudDocument {format:1;data:AppData}
export interface CloudHead {revision:number;document:CloudDocument|null}
export interface SyncConflict {key:string;collection?:string;id?:string;local:unknown;remote:unknown}
export const stable=(value:unknown):string=>JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const equal=(a:unknown,b:unknown)=>stable(a)===stable(b);
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const idCollections=new Set(['transactions','receivables','repayments','recurring','quickExpenses','frequentTransactions','customFields','rules','actionLog','masters','bankAlerts','statementRows','statementBatches','cardSettlements']);
const tombstones=new Set(['permanentlyDeletedTransactionIds','removedStatementBatchIds']);
export function intervalMinutes(value:unknown):number|null {
  if(value===null)return null;
  if(typeof value!=='number'||!Number.isInteger(value)||value<5||value>10080)throw Error('Choose whole minutes between 5 and 10080, or manual only.');
  return value;
}
export function syncDue(last:number|undefined,interval:number|null,now:number):boolean {
  return interval!==null&&(!last||now<last||now-last>=interval*60000);
}
export function documentOf(data:AppData):CloudDocument {return {format:1,data:JSON.parse(JSON.stringify(data))};}
export function validateDocument(value:unknown):asserts value is CloudDocument {
  if(!object(value)||value.format!==1||!object(value.data))throw Error('Unsupported cloud format. Update the app before syncing.');
  const d=value.data;
  if(d.schemaVersion!==4)throw Error('Unsupported ledger schema. Update the app before syncing.');
  for(const k of ['transactions','receivables','repayments','recurring','quickExpenses','frequentTransactions','quickAmounts','categories','accounts','paymentModes','people','capexPurchasedFrom','toGharPaymentFor','incomeTypes','investmentTypes','customFields','formFields','recurringFormFields','rules','actionLog'])if(!Array.isArray(d[k]))throw Error(`Cloud ${k} must be an array.`);
  for(const k of idCollections){
    if(d[k]===undefined)continue;
    if(!Array.isArray(d[k]))throw Error(`Invalid ${k}.`);
    const ids=new Set<string>();for(const r of d[k] as unknown[]){if(!object(r)||typeof r.id!=='string'||!r.id||ids.has(r.id))throw Error(`Missing or duplicate ID in ${k}.`);ids.add(r.id);}
  }
  if(d.statementRows!==undefined)validateStatementRows(d.statementRows);
  if(d.statementBatches!==undefined)validateStatementBatches(d.statementBatches);
  if(d.bankAlerts!==undefined)validateAlerts(d.bankAlerts);
  if(d.importHabits!==undefined)validateHabits(d.importHabits);
  for(const field of ['accounts','paymentModes','people','capexPurchasedFrom','toGharPaymentFor','incomeTypes','investmentTypes'])if((d[field] as unknown[]).some(x=>typeof x!=='string'))throw Error('Invalid account/category configuration.');
  const tx=d.transactions as Record<string,unknown>[];
  for(const t of tx){
    if(!['Revenue Expense','Lent','Lent Recovered','CAPEX','To Ghar','Income Misc','Investment'].includes(String(t.type)))throw Error('Unknown transaction type.');
    if(!Number.isSafeInteger(t.amountMinor)||((t.amountMinor as number)<0&&t.type!=='Revenue Expense')||typeof t.amount!=='number'||!Number.isFinite(t.amount)||Math.abs(t.amount*100-(t.amountMinor as number))>0.01||t.currency!=='INR')throw Error('Invalid transaction money or currency.');
    if(typeof t.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||new Date(t.date).toISOString().slice(0,10)!==t.date||!['active','cancelled','deleted'].includes(String(t.status)))throw Error('Invalid transaction date/status.');
    if(!object(t.financialEffect)||Object.values(t.financialEffect).some(n=>typeof n!=='number'||!Number.isSafeInteger(n)))throw Error('Invalid financial effect.');
  }
  for(const k of tombstones)if(d[k]!==undefined&&(!Array.isArray(d[k])||(d[k] as unknown[]).some(x=>typeof x!=='string')))throw Error('Invalid deletion markers.');
  for(const collection of ['receivables','repayments','recurring','quickExpenses','frequentTransactions'])for(const row of (d[collection]||[]) as Record<string,unknown>[]){if(row.amount!==undefined&&(typeof row.amount!=='number'||!Number.isFinite(row.amount)||(row.amount<0&&!(collection==='frequentTransactions'&&row.type==='Revenue Expense'))))throw Error('Invalid financial amount.');if(row.amountMinor!==undefined&&(!Number.isSafeInteger(row.amountMinor)||(row.amountMinor as number)<0))throw Error('Invalid minor amount.');}
  const purged=new Set(d.permanentlyDeletedTransactionIds as string[]||[]),removed=new Set(d.removedStatementBatchIds as string[]||[]);
  if(tx.some(t=>purged.has(t.id as string)))throw Error('A permanently deleted record was resurrected.');
  const tids=new Set(tx.map(t=>t.id)),batches=(d.statementBatches||[]) as unknown as Record<string,unknown>[],bids=new Set(batches.map(b=>b.id));
  if(batches.some(b=>removed.has(b.id as string)))throw Error('A removed import was resurrected.');
  const rows=(d.statementRows||[]) as unknown as Record<string,unknown>[],rids=new Set(rows.map(r=>r.id));
  for(const r of rows){if(!Number.isSafeInteger(r.amountMinor)||(r.amountMinor as number)<0||!['debit','credit','self','blocked','unblocked'].includes(String(r.direction)))throw Error('Invalid statement money/direction.');if(r.transactionId&&!tids.has(r.transactionId))throw Error('Statement links to a missing transaction.');if(r.batchId&&!bids.has(r.batchId))throw Error('Statement links to a missing import.');}
  for(const r of (d.repayments||[]) as Record<string,unknown>[])if(r.receivableId&&!(d.receivables as Record<string,unknown>[]).some(x=>x.id===r.receivableId))throw Error('Repayment links to a missing receivable.');
  const groups=(d.cardSettlements||[]) as Record<string,unknown>[];
  for(const r of rows)if(r.cardSettlementId&&!groups.some(g=>g.id===r.cardSettlementId))throw Error('Missing card settlement.');
  for(const b of batches)if(Array.isArray(b.rowIds)&&b.rowIds.some(id=>!rids.has(id)))throw Error('Import contains missing statement rows.');
  validateEntryMetadata(d as unknown as AppData);validateCardSettlements(d as unknown as AppData);
  if(Array.isArray(d.masters)){const ids=new Set((d.masters as {id:string}[]).map(m=>m.id));for(const record of [...tx,...d.recurring as Record<string,unknown>[]])for(const key of ['sourceId','paymentModeId','majorCategoryId','subCategoryId','personId','merchantId','purposeId','incomeTypeId','investmentTypeId'])if(record[key]&&!ids.has(record[key] as string))throw Error('A financial record references a missing master. Restore that master or correct the record before syncing.');}
  // Reject prototype keys at the untrusted cloud boundary, including unknown fields.
  const visit=(v:unknown):void=>{if(Array.isArray(v)){v.forEach(visit);return;}if(object(v))for(const [k,x] of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))throw Error('Unsafe cloud field.');visit(x);}};visit(d);
}
export function mergeDocuments(base:CloudDocument|null,local:CloudDocument,remote:CloudDocument,choices:Record<string,'local'|'remote'>={}) {
  validateDocument(local);validateDocument(remote);if(base)validateDocument(base);
  const conflicts:SyncConflict[]=[],out:Record<string,unknown>={};
  function pick(key:string,b:unknown,l:unknown,r:unknown,collection?:string,id?:string):unknown {
    if(equal(l,r))return l;if(base&&equal(l,b))return r;if(base&&equal(r,b))return l;
    if(l===undefined&&b===undefined)return r;if(r===undefined&&b===undefined)return l;
    const c={key,collection,id,local:l,remote:r};if(!choices[key])conflicts.push(c);
    return choices[key]==='remote'?r:l;
  }
  const l=local.data as unknown as Record<string,unknown>,r=remote.data as unknown as Record<string,unknown>,b=(base?.data||{}) as Record<string,unknown>;
  for(const key of new Set([...Object.keys(l),...Object.keys(r),...Object.keys(b)])){
    if(tombstones.has(key)){out[key]=[...new Set([...(l[key] as string[]||[]),...(r[key] as string[]||[])])];continue;}
    if(idCollections.has(key)&&[l[key],r[key],b[key]].every(v=>v===undefined||Array.isArray(v))){
      const map=(a:unknown)=>new Map(((a||[]) as {id:string}[]).map(v=>[v.id,v]));const lm=map(l[key]),rm=map(r[key]),bm=map(b[key]);const records=[];
      for(const id of new Set([...lm.keys(),...rm.keys(),...bm.keys()])){const v=pick(JSON.stringify([key,id]),bm.get(id),lm.get(id),rm.get(id),key,id);if(v!==undefined)records.push(v);}out[key]=records;
    }else{const v=pick(JSON.stringify([key]),b[key],l[key],r[key]);if(v!==undefined)out[key]=v;}
  }
  // Tombstones must not silently win over a concurrent edit.
  for(const [markers,collection] of [['permanentlyDeletedTransactionIds','transactions'],['removedStatementBatchIds','statementBatches']] as const){
    const ids=new Set(out[markers] as string[]||[]);out[collection]=(out[collection] as {id:string}[]||[]).filter(row=>{
      if(!ids.has(row.id))return true;
      const key=JSON.stringify([collection,row.id]);const lr=(l[collection] as {id:string}[]||[]).find(x=>x.id===row.id),rr=(r[collection] as {id:string}[]||[]).find(x=>x.id===row.id);
      const previous=(b[collection] as {id:string}[]||[]).find(x=>x.id===row.id);
      if((lr&&!equal(lr,previous))||(rr&&!equal(rr,previous))){
        if(!conflicts.some(c=>c.key===key)&&!choices[key])conflicts.push({key,collection,id:row.id,local:lr,remote:rr});
        const selected=choices[key]==='remote'?rr:choices[key]==='local'?lr:undefined;
        if(selected){out[markers]=(out[markers] as string[]).filter(id=>id!==row.id);return true;}
      }return false;
    });
  }
  return {document:{format:1 as const,data:out as unknown as AppData},conflicts};
}
export function summary(d:CloudDocument|null){const t=d?.data.transactions||[];return {transactions:t.length,active:t.filter(t=>t.status==='active').length,expenseMinor:t.filter(t=>t.status==='active').reduce((n,t)=>n+t.financialEffect.personalExpense,0),incomeMinor:t.filter(t=>t.status==='active').reduce((n,t)=>n+t.financialEffect.income,0),statementRows:d?.data.statementRows?.length||0};}

export function changesSummary(a:CloudDocument|null,b:CloudDocument|null){
 const x=(a?.data||{}) as Record<string,unknown>,y=(b?.data||{}) as Record<string,unknown>;
 return [...new Set([...Object.keys(x),...Object.keys(y)])].filter(k=>!equal(x[k],y[k])).map(field=>{
   if(idCollections.has(field)){const old=new Map(((x[field]||[]) as {id:string}[]).map(r=>[r.id,r])),next=new Map(((y[field]||[]) as {id:string}[]).map(r=>[r.id,r]));return {field,added:[...next.keys()].filter(id=>!old.has(id)).length,removed:[...old.keys()].filter(id=>!next.has(id)).length,changed:[...next.keys()].filter(id=>old.has(id)&&!equal(old.get(id),next.get(id))).length};}
   return {field,changed:1};
 });
}
