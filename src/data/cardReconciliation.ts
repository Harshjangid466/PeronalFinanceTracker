import type {AppData,Transaction} from './types';
import {rowState,directionOf,reconciliationControls,validateStatementRows,type StatementRow,type StatementBatch} from './statements';
import {cashbackCreditKind} from './cashback';

export const cardKindLabels={purchase:'Purchase',payment:'Bill payment',cashback:'Cashback',refund:'Refund / reversal',fee:'Fee / interest',other:'Other — review'};
export type CardKind=keyof typeof cardKindLabels;
export interface CardSettlement {id:string;account:string;createdAt:number;updatedAt:number;status:'active'|'undone';rowIds:string[];originalRows:StatementRow[];previousTransactions:Transaction[];differenceMinor:number;replacementId?:string;reason:string;bookingDate:string;}
export interface CardOffsetDetails {date:string;category:string;subcategory?:string;reason:string;confirmed:boolean;customFields?:Record<string,unknown>;}
export function isCardRow(row:StatementRow,batches:StatementBatch[]){return row.source==='bank'&&batches.some(b=>b.kind==='card'&&(b.rowIds?b.rowIds.includes(row.id):b.id===row.batchId));}
export function cardKind(row:StatementRow):CardKind{
 if(row.cardKind)return row.cardKind;
 const note=row.note+' '+row.vendor;
 if(/\bcash\s?back\b.*\b(?:reversal|reversed|revoked|clawback|debit)\b/i.test(note))return 'cashback';
 if(row.direction==='credit'){
  if(row.cashbackCredit||cashbackCreditKind(note,row.direction))return 'cashback';
  if(/\b(?:bbps payment|payment received|payment thank|payment - thank|credit card payment|autopay|auto debit payment|neft payment|imps payment)\b/i.test(note))return 'payment';
  if(/\b(?:refund|reversal|reversed|cancelled|canceled|flipkart|amazon|myntra)\b/i.test(note))return 'refund';
  return 'other';
 }
 if(row.direction!=='debit')return 'other';
 if(/\b(?:payment reversal|payment returned|cash withdrawal|cash advance)\b/i.test(note))return 'other';
 if(/\b(?:interest|finance charge|late fee|annual fee|joining fee|surcharge|gst|service tax)\b/i.test(note))return 'fee';
 return 'purchase';
}
export function cardRowAvailable(row:StatementRow){return !row.cardSettlementId&&row.status!=='ignored';}
export function cardOffsetCandidates(row:StatementRow,rows:StatementRow[],batches:StatementBatch[]){
 const merchant=(s:string)=>s.toLowerCase().replace(/\b(?:refund|reversal|reversed|payments?|internet|pvt|ltd|private|limited)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(' ')[0];
 return rows.filter(r=>r.id!==row.id&&r.account===row.account&&r.direction!==row.direction&&isCardRow(r,batches)&&cardRowAvailable(r)&&(r.direction==='credit'?['refund','other'].includes(cardKind(r)):cardKind(r)==='purchase')&&(row.direction==='debit'?r.date>=row.date:r.date<=row.date)).map(r=>({row:r,differenceMinor:(row.direction==='debit'?row.amountMinor-r.amountMinor:r.amountMinor-row.amountMinor),sameMerchant:!!merchant(row.vendor)&&merchant(row.vendor)===merchant(r.vendor)})).sort((a,b)=>Number(a.differenceMinor!==0)-Number(b.differenceMinor!==0)||Number(b.sameMerchant)-Number(a.sameMerchant)||Math.abs(a.differenceMinor)-Math.abs(b.differenceMinor)||a.row.date.localeCompare(b.row.date));
}
export function previewCardOffset(data:AppData,ids:string[]){
 if(ids.length<2||new Set(ids).size!==ids.length)throw Error('Select at least one purchase and one refund, without repeated rows.');
 const rows=ids.map(id=>{const row=data.statementRows?.find(r=>r.id===id);if(!row||!isCardRow(row,data.statementBatches||[])||!cardRowAvailable(row))throw Error('A selected movement is missing, already offset or ignored.');return row;});
 const account=rows[0].account;if(!account||rows.some(r=>r.account!==account))throw Error('Offset movements from the same card account only.');
 if(rows.some(r=>!(data.statementBatches||[]).some(b=>b.kind==='card'&&(b.rowIds?b.rowIds.includes(r.id):b.id===r.batchId)&&reconciliationControls(b,data.statementRows||[],data.transactions).populationComplete)))throw Error('A selected statement has incomplete source rows. Restore or re-import it before offsetting.');
 if(rows.some(r=>r.direction==='credit'&&cardKind(r)==='other'))throw Error('Check the unclassified credit and change its movement type to Refund / reversal before offsetting it.');
 if(rows.some(r=>r.direction==='debit'?cardKind(r)!=='purchase':r.direction!=='credit'||cardKind(r)!=='refund'))throw Error('Select purchases and refunds only. Bill payments, cashback and fees cannot be offset as purchases.');
 const debits=rows.filter(r=>r.direction==='debit'),credits=rows.filter(r=>r.direction==='credit');if(!debits.length||!credits.length)throw Error('Select both debit purchases and credit refunds.');
 if(credits.some(r=>r.date<debits.map(r=>r.date).sort()[0]))throw Error('A refund predates every selected purchase; review the pairing.');
 const debitMinor=debits.reduce((s,r)=>s+r.amountMinor,0),creditMinor=credits.reduce((s,r)=>s+r.amountMinor,0),differenceMinor=debitMinor-creditMinor;
 if(!Number.isSafeInteger(differenceMinor))throw Error('Selected totals exceed safe amount limits.');
 const linked=rows.flatMap(r=>r.transactionId?[data.transactions.find(t=>t.id===r.transactionId)]:[]).filter((t):t is Transaction=>!!t&&t.status==='active');
 if(new Set(linked.map(t=>t.id)).size!==linked.length)throw Error('Two selected rows link to the same ledger entry. Review duplicate source links first.');
 for(const r of rows){const t=linked.find(t=>t.id===r.transactionId);if(t&&(rowState(r,data.transactions).status==='pending'||t.type!==(r.direction==='debit'?'Revenue Expense':'Income Misc')))throw Error('A linked entry changed or is not a personal expense/refund income. Review it before offsetting.');}
 const affected=new Set([...ids,...(data.statementRows||[]).filter(r=>r.transactionId&&linked.some(t=>t.id===r.transactionId)&&['posted','matched'].includes(rowState(r,data.transactions).status)).map(r=>r.id)]);
 return {rows,account,debitMinor,creditMinor,differenceMinor,linked,affectedRows:(data.statementRows||[]).filter(r=>affected.has(r.id))};
}
export function applyCardOffset(data:AppData,ids:string[],options:CardOffsetDetails&{id:string;now:number}):AppData{
 const p=previewCardOffset(data,ids);
 if(p.rows.some(r=>!p.linked.some(t=>t.id===r.transactionId)&&data.transactions.some(t=>t.status==='active'&&t.account===r.account&&t.date===r.date&&t.amountMinor===r.amountMinor&&directionOf(t)===r.direction)))throw Error('A possible existing unlinked ledger entry needs review. Link it, or confirm a separate payment in normal review before offsetting.');
 if(!options.confirmed)throw Error('Confirm the selected source rows and ledger changes before offsetting.');
 if(!options.reason.trim())throw Error('Enter a cancellation or reversal reason.');
 if(p.differenceMinor<0)throw Error('Refunds exceed purchases. Review the excess separately; it cannot be booked as an expense.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(options.date)||Number.isNaN(Date.parse(options.date))||new Date(options.date+'T00:00:00Z').toISOString().slice(0,10)!==options.date)throw Error('Choose a valid expense booking date.');
 if(data.cardSettlements?.some(g=>g.id===options.id))throw Error('This offset was already saved.');
 if(p.differenceMinor>0&&(!data.categories.some(c=>c.name===options.category)||options.subcategory&&!data.categories.some(c=>c.name===options.category&&c.subCategories.includes(options.subcategory!))))throw Error('Choose an expense category and valid subcategory for the difference.');
 if(p.differenceMinor>0&&!data.accounts.includes(p.account))throw Error('Choose an active card account before booking the difference.');
 if(p.differenceMinor>0&&(!data.paymentModes.includes('CC')||data.masters?.some(m=>!m.active&&((m.kind==='source'&&m.name===p.account)||(m.kind==='category'&&m.name===options.category)||(m.kind==='paymentMode'&&m.name==='CC')))))throw Error('Choose an active account, expense category and CC payment mode.');
 const replacementId=p.differenceMinor>0?'card-net-'+options.id:undefined,idsToDelete=new Set(p.linked.map(t=>t.id)),affected=new Set(p.affectedRows.map(r=>r.id));
 const group:CardSettlement={id:options.id,account:p.account,status:'active',createdAt:options.now,updatedAt:options.now,rowIds:[...ids],originalRows:structuredClone(p.affectedRows),previousTransactions:structuredClone(p.linked),differenceMinor:p.differenceMinor,replacementId,reason:options.reason.trim(),bookingDate:options.date};
 let transactions=data.transactions.map(t=>idsToDelete.has(t.id)?{...t,status:'deleted' as const,deletedVia:'cc-offset' as const,deletedAt:options.now,updatedAt:options.now}:t);
 if(replacementId){const first=p.rows.filter(r=>r.direction==='credit').sort((a,b)=>b.date.localeCompare(a.date))[0],batch=data.statementBatches?.find(b=>b.rowIds?b.rowIds.includes(first.id):b.id===first.batchId);const t:Transaction={id:replacementId,schemaVersion:4,type:'Revenue Expense',amount:p.differenceMinor/100,amountMinor:p.differenceMinor,currency:'INR',date:options.date,createdAt:options.now,updatedAt:options.now,majorCategory:options.category,subCategory:options.subcategory||'',account:p.account,paymentMode:'CC',person:'',heading:'Unrefunded card difference',remarks:options.reason.trim(),customFields:options.customFields||{},status:'active',financialEffect:{personalExpense:p.differenceMinor,income:0,receivableIncrease:0,receivableDecrease:0,capex:0,investment:0,toGhar:0},entrySource:{kind:batch?.name.toLowerCase().endsWith('.pdf')?'bank-pdf':'excel-csv',batchId:batch?.id,fileName:batch?.name}};transactions=[t,...transactions];}
 return {...data,transactions,cardSettlements:[group,...(data.cardSettlements||[])],statementRows:data.statementRows?.map(r=>affected.has(r.id)?{...r,transactionId:undefined,status:'ignored',cardHold:undefined,cardSettlementId:group.id,reason:'Confirmed card offset: '+group.reason}:r)};
}
export function undoCardOffset(data:AppData,id:string,now:number):AppData{
 const g=data.cardSettlements?.find(g=>g.id===id&&g.status==='active');if(!g)throw Error('Active offset not found.');
 for(const t of g.previousTransactions){const current=data.transactions.find(x=>x.id===t.id);if(!current||current.status!=='deleted'||current.deletedVia!=='cc-offset'||current.updatedAt!==g.createdAt)throw Error('An original entry changed after offsetting. Undo would overwrite it; review manually.');}
 const replacement=data.transactions.find(t=>t.id===g.replacementId);if(g.replacementId&&(!replacement||replacement.status!=='active'||replacement.amountMinor!==g.differenceMinor||replacement.account!==g.account||replacement.date!==g.bookingDate||replacement.type!=='Revenue Expense'))throw Error('The net expense amount, date, account or status changed. Review it before undoing this offset.');
 const originals=new Map(g.previousTransactions.map(t=>[t.id,t])),rows=new Map(g.originalRows.map(r=>[r.id,r]));
 const restored=data.statementRows?.map(r=>rows.has(r.id)?restoreCardSource(r,rows.get(r.id)!):r)||[];for(const r of g.originalRows)if(!restored.some(x=>x.id===r.id))restored.push(structuredClone(r));
 return {...data,transactions:data.transactions.map(t=>originals.has(t.id)?{...structuredClone(originals.get(t.id)!),updatedAt:now}:t.id===g.replacementId?{...t,status:'deleted',deletedVia:'cc-offset',deletedAt:now,updatedAt:now}:t),statementRows:restored,cardSettlements:data.cardSettlements!.map(x=>x.id===id?{...x,status:'undone',updatedAt:now}:x)};
}
function restoreCardSource(current:StatementRow,original:StatementRow):StatementRow{return {...current,...structuredClone(original),cardSettlementId:undefined,cardHold:original.cardHold,transactionId:original.transactionId,reason:original.reason,cashbackEarnedMinor:current.cashbackEarnedMinor??original.cashbackEarnedMinor,cashbackCredit:current.cashbackCredit??original.cashbackCredit};}
export function cardOffsetLocks(data:Pick<AppData,'cardSettlements'>,transactionId:string){return data.cardSettlements?.some(g=>g.status==='active'&&(g.previousTransactions.some(t=>t.id===transactionId)||g.originalRows.some(r=>r.transactionId===transactionId)))||false;}
export function cardOffsetRestoreBlock(data:Pick<AppData,'cardSettlements'>,transactionId:string){
 if(cardOffsetLocks(data,transactionId))return 'Undo the card offset in CC review to restore its original entries together.';
 if(data.cardSettlements?.some(g=>g.status==='undone'&&g.replacementId===transactionId))return 'This net expense belongs to an undone offset. Review the original card movements to create a new offset; restoring it would count the expense twice.';
 return '';
}
export function validateCardSettlements(data:AppData){
 const ids=new Set<string>(),used=new Set<string>();if(data.cardSettlements!==undefined&&!Array.isArray(data.cardSettlements))throw Error('Invalid card offsets');
 for(const g of data.cardSettlements||[]){if(!g||typeof g.id!=='string'||ids.has(g.id)||!g.account||!['active','undone'].includes(g.status)||!Number.isFinite(g.createdAt)||!Number.isFinite(g.updatedAt)||!Number.isSafeInteger(g.differenceMinor)||g.differenceMinor<0||typeof g.reason!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(g.bookingDate)||!Array.isArray(g.rowIds)||g.rowIds.length<2||new Set(g.rowIds).size!==g.rowIds.length||!Array.isArray(g.previousTransactions)||!Array.isArray(g.originalRows))throw Error('Invalid card offset');ids.add(g.id);validateStatementRows(g.originalRows);
  const selected=g.originalRows.filter(r=>g.rowIds.includes(r.id));if(selected.length!==g.rowIds.length||selected.some(r=>r.account!==g.account||r.source!=='bank'||(r.direction==='debit'?cardKind(r)!=='purchase':r.direction!=='credit'||cardKind(r)!=='refund'))||selected.reduce((s,r)=>s+(r.direction==='debit'?r.amountMinor:-r.amountMinor),0)!==g.differenceMinor||!selected.some(r=>r.direction==='debit')||!selected.some(r=>r.direction==='credit')||g.originalRows.some(r=>r.cardSettlementId)||new Set(g.previousTransactions.map(t=>t?.id)).size!==g.previousTransactions.length||g.previousTransactions.some(t=>!t||typeof t.id!=='string'||t.status!=='active'||!['Revenue Expense','Income Misc'].includes(t.type)||!Number.isSafeInteger(t.amountMinor)||t.amountMinor<=0||t.account!==g.account||t.currency!=='INR'||!g.originalRows.some(r=>r.transactionId===t.id&&r.amountMinor===t.amountMinor&&r.date===t.date&&r.direction===directionOf(t)))||(g.differenceMinor>0?typeof g.replacementId!=='string'||!g.replacementId:g.replacementId!==undefined)||Number.isNaN(Date.parse(g.bookingDate))||new Date(g.bookingDate+'T00:00:00Z').toISOString().slice(0,10)!==g.bookingDate)throw Error('Card offset source snapshots disagree');
  if(g.status==='undone'&&g.replacementId&&data.transactions.some(t=>t.id===g.replacementId&&t.status==='active'))throw Error('The net expense of an undone offset cannot remain active. Restore the matching ledger and offset history together.');
  if(g.status==='active'){for(const r of g.originalRows){if(used.has(r.id))throw Error('A source movement belongs to more than one active offset');used.add(r.id);}for(const id of new Set([...g.previousTransactions.map(t=>t.id),...g.originalRows.flatMap(r=>r.transactionId?[r.transactionId]:[])])){const current=data.transactions.find(x=>x.id===id);if(current&&(g.previousTransactions.some(t=>t.id===id)?current.status!=='deleted':current.status==='active'))throw Error('An offset original is still active; restore the matching ledger and offset history together.');}}
 }
}
export function applyCardOffsetState(data:AppData):AppData{
 validateCardSettlements(data);const membership=new Map((data.cardSettlements||[]).filter(g=>g.status==='active').flatMap(g=>g.originalRows.map(r=>[r.id,g] as const)));
 return {...data,statementRows:data.statementRows?.map(r=>{const g=membership.get(r.id);if(!g){if(!r.cardSettlementId)return r;const old=data.cardSettlements?.find(g=>g.id===r.cardSettlementId&&g.status==='undone'),source=old?.originalRows.find(x=>x.id===r.id);if(!source)throw Error('Offset history is missing for a source row. Restore its complete backup.');return restoreCardSource(r,source);}const source=g.originalRows.find(x=>x.id===r.id)!;if(source.amountMinor!==r.amountMinor||source.direction!==r.direction||source.account!==r.account||source.date!==r.date)throw Error('An offset source movement changed. Review the source backup.');return {...r,transactionId:undefined,cardHold:undefined,cardSettlementId:g.id,status:'ignored',reason:'Confirmed card offset: '+g.reason};})};
}
