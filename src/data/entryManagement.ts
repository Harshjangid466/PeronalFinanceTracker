import type {AppData,Transaction} from './types';
import type {StatementBatch,StatementRow} from './statements';
import {cardOffsetLocks} from './cardReconciliation';

export const entrySourceLabels={manual:'Manual','paytm-pdf':'Paytm PDF','bank-pdf':'Monthly reconciliation PDF','excel-csv':'Excel / CSV import',recurring:'Recurring','bank-alert':'Bank alert',legacy:'Older / unknown'};
export function statementEntrySource(row:StatementRow,batch?:StatementBatch):NonNullable<Transaction['entrySource']>{
 return {kind:row.source==='paytm'?'paytm-pdf':batch?.name.toLowerCase().endsWith('.pdf')?'bank-pdf':batch?'excel-csv':'legacy',batchId:batch?.id||row.batchId,fileName:batch?.name};
}
export function entrySource(t:Transaction,data:Pick<AppData,'statementRows'|'statementBatches'>&Partial<Pick<AppData,'actionLog'>>):NonNullable<Transaction['entrySource']>{
 if(t.entrySource)return t.entrySource;
 if(t.recurringTemplateId)return {kind:'recurring'};
 const row=data.statementRows?.find(r=>r.transactionId===t.id&&r.status==='posted');
 const batch=data.statementBatches?.find(b=>b.id===row?.batchId);
 const creation=data.actionLog?.find(a=>a.entityType==='transactions'&&a.entityId===t.id&&a.actionType==='create');
 if(row&&(batch&&Number.isFinite(t.createdAt)&&t.createdAt<batch.createdAt||creation&&!(creation.afterValue as Partial<Transaction>|undefined)?.statementReferences?.includes(row.reference)))return {kind:'legacy'};
 return row?statementEntrySource(row,batch):{kind:'legacy'};
}
const contains=(b:StatementBatch,r:StatementRow)=>b.rowIds?b.rowIds.includes(r.id):r.batchId===b.id;
export function importRemovalPreview(data:AppData,id:string){
 const batch=data.statementBatches?.find(b=>b.id===id),others=(data.statementBatches||[]).filter(b=>b.id!==id);
 const rows=batch?(data.statementRows||[]).filter(r=>contains(batch,r)):[];
 const linked=data.transactions.filter(t=>t.entrySource?.batchId===id||rows.some(r=>r.transactionId===t.id));
 const deletable=linked.filter(t=>t.status==='active'&&entrySource(t,data).batchId===id&&!others.some(b=>(data.statementRows||[]).some(r=>r.transactionId===t.id&&contains(b,r))));
 return {batch,rows,deletable,retained:linked.filter(t=>t.status==='active'&&!deletable.some(d=>d.id===t.id))};
}
export function applyRemovalTombstones(data:AppData):AppData{
 const removed=new Set(data.removedStatementBatchIds||[]),purged=new Set(data.permanentlyDeletedTransactionIds||[]);
 const batches=(data.statementBatches||[]).filter(b=>!removed.has(b.id));
 return {...data,transactions:data.transactions.filter(t=>!purged.has(t.id)),statementBatches:batches,
  statementRows:(data.statementRows||[]).filter(r=>!removed.has(r.batchId)||batches.some(b=>contains(b,r))).map(r=>r.transactionId&&purged.has(r.transactionId)?{...r,transactionId:undefined,status:'ignored' as const,reason:'Linked entry permanently deleted by you'}:r),
  bankAlerts:data.bankAlerts?.map(a=>a.linkedTransactionId&&purged.has(a.linkedTransactionId)?{...a,linkedTransactionId:undefined,ignoredReason:'Linked entry permanently deleted by you'}:a)};
}
export function removeStatementImport(data:AppData,id:string,deletePosted:boolean):AppData{
 const preview=importRemovalPreview(data,id);if(!preview.batch)return data;
 if(data.cardSettlements?.some(g=>g.status==='active'&&g.originalRows.some(r=>preview.rows.some(x=>x.id===r.id))))throw Error('Undo the card offset before removing a statement used by that offset.');
 const ids=new Set(deletePosted?preview.deletable.map(t=>t.id):[]),now=Date.now();
 const transactions=data.transactions.map(t=>{
  const source=entrySource(t,data),next=source.batchId===id?{...t,entrySource:source}:t;
  return ids.has(t.id)?{...next,status:'deleted' as const,deletedVia:'import-removal' as const,deletedAt:now,updatedAt:now}:next;
 });
 return applyRemovalTombstones({...data,transactions,removedStatementBatchIds:[...new Set([...(data.removedStatementBatchIds||[]),id])]});
}
export function permanentlyDeleteEntry(data:AppData,id:string):AppData{
 if(cardOffsetLocks(data,id))throw Error('Undo the card offset before permanently deleting its original entries.');
 const t=data.transactions.find(t=>t.id===id);if(!t||t.status!=='deleted')throw Error('Only an entry in Deleted Transactions can be permanently deleted.');
 return applyRemovalTombstones({...data,permanentlyDeletedTransactionIds:[...new Set([...(data.permanentlyDeletedTransactionIds||[]),id])],skippedOccurrences:t.recurringTemplateId&&t.recurringOccurrenceDate?[...new Set([...(data.skippedOccurrences||[]),`${t.recurringTemplateId}|${t.recurringOccurrenceDate}`])]:data.skippedOccurrences});
}
export function validateEntryMetadata(data:AppData){
 for(const t of data.transactions)if(t.deletedVia!==undefined&&!['individual','import-removal','import-undo','receivable-removal','cc-offset'].includes(t.deletedVia))throw Error('Invalid deletion method');
 for(const key of ['permanentlyDeletedTransactionIds','removedStatementBatchIds'] as const){const ids=data[key];if(ids!==undefined&&(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length))throw Error('Invalid deletion history');}
 for(const t of data.transactions){const s=t.entrySource;if(s!==undefined&&(!s||typeof s!=='object'||!Object.prototype.hasOwnProperty.call(entrySourceLabels,s.kind)||s.batchId!==undefined&&typeof s.batchId!=='string'||s.fileName!==undefined&&typeof s.fileName!=='string'))throw Error('Invalid entry source');}
}
