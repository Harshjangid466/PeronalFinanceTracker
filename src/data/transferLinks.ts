import type {AppData,Transaction} from './types';
import {rowState,directionOf,reconciliationControls,validateStatementRows,type StatementRow} from './statements';
import {linkedTransfer,sameTransferMovement} from './transferIdentity';

export interface TransferLink {id:string;status:'active'|'undone';createdAt:number;updatedAt:number;rowIds:string[];originalRows:StatementRow[];previousTransactions:Transaction[];reason:string;}
export function transferLocks(data:Pick<AppData,'transferLinks'>,id:string){return !!data.transferLinks?.some(g=>g.status==='active'&&g.previousTransactions.some(t=>t.id===id));}
export function previewTransfer(data:AppData,ids:string[]){
 if(ids.length!==2||new Set(ids).size!==2)throw Error('Choose one outgoing and one incoming movement.');
 const rows=ids.map(id=>{const r=data.statementRows?.find(r=>r.id===id);if(!r||r.cardSettlementId||r.cardHold||linkedTransfer(data,r))throw Error('A movement is missing, on hold or already linked. Undo its existing link first.');return r;});
 const debit=rows.find(r=>r.direction==='debit'),credit=rows.find(r=>r.direction==='credit');
 if(!debit||!credit||!debit.account||!credit.account||debit.account===credit.account||debit.amountMinor!==credit.amountMinor)throw Error('Transfers need equal opposite amounts in two different accounts. Fees must be reviewed separately.');
 for(const r of rows)if(!(data.statementBatches||[]).some(b=>(b.rowIds?b.rowIds.includes(r.id):b.id===r.batchId)&&reconciliationControls(b,data.statementRows||[],data.transactions).populationComplete))throw Error('Restore the complete source statement before linking this movement.');
 const linked=data.transactions.filter(t=>t.status==='active'&&rows.some(r=>r.transactionId===t.id));
 for(const r of rows){const t=linked.find(t=>t.id===r.transactionId);if(r.transactionId&&(!t||rowState(r,data.transactions).status==='pending'||!['Revenue Expense','Income Misc'].includes(t.type)))throw Error('A linked app entry changed or affects another ledger. Review it before linking a transfer.');}
 if(rows.some(r=>!r.transactionId&&data.transactions.some(t=>t.status==='active'&&!linked.some(x=>x.id===t.id)&&t.account===r.account&&t.date===r.date&&Math.abs(t.amountMinor)===r.amountMinor&&directionOf(t)===r.direction)))throw Error('An unlinked app entry may already record this movement. Match or correct it in statement review first.');
 if(linked.some(t=>data.reimbursementClaims?.some(c=>c.status==='active'&&(c.expenseId===t.id||c.credits.some(x=>x.transactionId===t.id)))))throw Error('Stop reimbursement tracking for these entries before treating them as a transfer.');
 const affectedRows=(data.statementRows||[]).filter(r=>rows.some(x=>sameTransferMovement(x,r))||linked.some(t=>r.transactionId===t.id));
 if(affectedRows.some(r=>r.cardSettlementId||r.cardHold||linkedTransfer(data,r)))throw Error('Related source evidence is held or already linked to another reconciliation.');
 return {rows,debit,credit,linked,affectedRows,amountMinor:debit.amountMinor};
}
export function applyTransfer(data:AppData,ids:string[],options:{id:string;now:number;reason:string;confirmed:boolean}):AppData{
 const p=previewTransfer(data,ids);if(!options.confirmed)throw Error('Confirm that both accounts belong to you and review the app entries being excluded.');
 if(!options.reason.trim())throw Error('Enter a transfer description.');if(data.transferLinks?.some(g=>g.id===options.id))throw Error('This transfer link already exists.');
 const group:TransferLink={id:options.id,status:'active',createdAt:options.now,updatedAt:options.now,rowIds:[...ids],originalRows:structuredClone(p.affectedRows),previousTransactions:structuredClone(p.linked),reason:options.reason.trim()};
 const next={...data,transferLinks:[group,...(data.transferLinks||[])],transactions:data.transactions.map(t=>p.linked.some(x=>x.id===t.id)?{...t,status:'deleted' as const,deletedVia:'transfer-link' as const,deletedAt:options.now,updatedAt:options.now}:t)};
 return applyTransferState(next);
}
export function undoTransfer(data:AppData,id:string,now:number):AppData{
 const g=data.transferLinks?.find(g=>g.id===id&&g.status==='active');if(!g)throw Error('Active transfer link not found.');
 if(g.originalRows.some(r=>!(data.statementBatches||[]).some(b=>b.rowIds?b.rowIds.includes(r.id):b.id===r.batchId)))throw Error('Restore or re-import the original statements before undoing this transfer. Its source history is incomplete.');
 for(const old of g.previousTransactions){const t=data.transactions.find(t=>t.id===old.id);if(!t||t.status!=='deleted'||t.deletedVia!=='transfer-link'||t.updatedAt!==g.createdAt)throw Error('An excluded entry changed. Undo would overwrite it; restore its matching history first.');}
 const originals=new Map(g.previousTransactions.map(t=>[t.id,t])),sources=new Map(g.originalRows.map(r=>[r.id,r]));
 const rows=(data.statementRows||[]).map(r=>sources.has(r.id)?restoreSource(r,sources.get(r.id)!):r);for(const old of g.originalRows)if(!rows.some(r=>r.id===old.id))rows.push(structuredClone(old));
 const transactions=data.transactions.map(t=>{const original=originals.get(t.id);return original?{...structuredClone(original),...t,status:'active' as const,deletedVia:original.deletedVia,deletedAt:original.deletedAt,updatedAt:now}:t;});
 return {...data,transferLinks:data.transferLinks!.map(x=>x.id===id?{...x,status:'undone',updatedAt:now}:x),statementRows:rows,transactions};
}
const restoreSource=(current:StatementRow,old:StatementRow):StatementRow=>({...current,...structuredClone(old),transferLinkId:undefined});
export function validateTransferLinks(data:AppData){
 if(data.transferLinks!==undefined&&!Array.isArray(data.transferLinks))throw Error('Invalid transfer history');
 const ids=new Set<string>(),used:StatementRow[]=[],usedTransactions=new Set<string>();
 for(const g of data.transferLinks||[]){
  if(!g||typeof g.id!=='string'||!g.id||ids.has(g.id)||!['active','undone'].includes(g.status)||!Number.isFinite(g.createdAt)||!Number.isFinite(g.updatedAt)||typeof g.reason!=='string'||!g.reason.trim()||!Array.isArray(g.rowIds)||g.rowIds.length!==2||new Set(g.rowIds).size!==2||!Array.isArray(g.originalRows)||!Array.isArray(g.previousTransactions))throw Error('Invalid transfer link');ids.add(g.id);validateStatementRows(g.originalRows);
  const selected=g.originalRows.filter(r=>g.rowIds.includes(r.id)),d=selected.find(r=>r.direction==='debit'),c=selected.find(r=>r.direction==='credit');
  if(selected.length!==2||!d||!c||!d.account||!c.account||d.account===c.account||d.amountMinor!==c.amountMinor||g.originalRows.some(r=>r.transferLinkId||r.cardSettlementId)||new Set(g.previousTransactions.map(t=>t.id)).size!==g.previousTransactions.length)throw Error('Transfer source snapshots disagree');
  for(const t of g.previousTransactions)if(!t||t.status!=='active'||!['Revenue Expense','Income Misc'].includes(t.type)||t.currency!=='INR'||!Number.isSafeInteger(t.amountMinor)||!t.amountMinor||t.amountMinor<0&&t.type!=='Revenue Expense'||!g.originalRows.some(r=>r.transactionId===t.id&&r.account===t.account&&r.date===t.date&&r.amountMinor===Math.abs(t.amountMinor)&&r.direction===directionOf(t)))throw Error('Transfer entry snapshot disagrees with its source');
  if(g.originalRows.some(r=>!selected.some(x=>sameTransferMovement(r,x))&&!g.previousTransactions.some(t=>r.transactionId===t.id&&r.account===t.account&&r.date===t.date&&r.amountMinor===Math.abs(t.amountMinor)&&r.direction===directionOf(t))))throw Error('Unrelated source evidence in transfer history');
  if(g.status==='active'){
   for(const row of data.statementRows||[]){if(row.transferLinkId!==g.id&&!g.originalRows.some(r=>r.id===row.id))continue;const source=g.originalRows.find(r=>sameTransferMovement(r,row));if(!source||source.account!==row.account||source.amountMinor!==row.amountMinor||source.date!==row.date||source.direction!==row.direction||row.transactionId&&data.transactions.some(t=>t.id===row.transactionId&&t.status==='active'))throw Error('Current transfer evidence disagrees with its source history');}
   if(g.originalRows.some(r=>used.some(x=>sameTransferMovement(r,x))||data.cardSettlements?.some(s=>s.status==='active'&&s.originalRows.some(x=>sameTransferMovement(r,x)))))throw Error('Source evidence belongs to more than one reconciliation');used.push(...g.originalRows);
   for(const old of g.previousTransactions){const t=data.transactions.find(t=>t.id===old.id);if(usedTransactions.has(old.id)||!t||t.status!=='deleted'||t.deletedVia!=='transfer-link'||t.amountMinor!==old.amountMinor||t.account!==old.account||t.date!==old.date||t.type!==old.type||t.currency!==old.currency)throw Error('An active transfer exclusion is missing, changed or was restored separately');usedTransactions.add(old.id);}
  }
 }
}
export function applyTransferState(data:AppData):AppData{
 validateTransferLinks(data);const groups=structuredClone(data.transferLinks||[]);
 const statementRows=data.statementRows?.map(row=>{
  const g=linkedTransfer({transferLinks:groups},row);
  if(!g){if(!row.transferLinkId)return row;const old=groups.find(g=>g.id===row.transferLinkId&&g.status==='undone')?.originalRows.find(r=>r.id===row.id);if(!old)throw Error('Transfer source history is missing. Restore its complete backup.');return restoreSource(row,old);}
  const original=g.originalRows.find(r=>r.id===row.id);
  if(original&&(original.account!==row.account||original.amountMinor!==row.amountMinor||original.date!==row.date||original.direction!==row.direction))throw Error('A linked transfer movement changed. Undo the transfer before editing its source.');
  if(row.transactionId&&data.transactions.some(t=>t.id===row.transactionId&&t.status==='active'))throw Error('An active app entry conflicts with linked transfer evidence.');
  if(!original)g.originalRows.push({...row,transferLinkId:undefined});
  return {...row,transferLinkId:g.id,transactionId:undefined,status:'ignored' as const,reason:'Own-account transfer: '+g.reason};
 });
 return {...data,...(data.transferLinks?{transferLinks:groups}:{}),statementRows};
}
