import type {AppData, Transaction, TransactionType} from './types';

export interface VendorHabit {id:string;vendor:string;enabled:boolean;action:'post'|'ignore'|'review';category:string;subcategory:string;type:TransactionType;maxAmountMinor?:number;prefix?:boolean;}
export interface NarrationHabit {id:string;terms:string[];enabled:boolean;action:'post'|'ignore'|'review';category:string;subcategory:string;}
export interface ImportHabits {version:1;vendors:VendorHabit[];narrations:NarrationHabit[];morningEnabled:boolean;morningStart:string;morningEnd:string;morningAutoPost:boolean;unusualMultiplier:number;}
export interface StatementRow {id:string;batchId:string;source:'paytm'|'bank';date:string;valueDate?:string;time?:string;vendor:string;note:string;account:string;reference:string;amountMinor:number;direction:'debit'|'credit'|'self';status:'pending'|'posted'|'matched'|'ignored';transactionId?:string;reason?:string;baselineAmountMinor?:number;sourceRow?:number;sourcePage?:number;originalAccount?:string;originalDate?:string;paymentMode?:string;}
export interface StatementBatch {id:string;source:'paytm'|'bank';name:string;createdAt:number;from:string;to:string;count:number;rowIds?:string[];openingMinor?:number;closingMinor?:number;kind?:'bank'|'card'|'pluxee';sourceFormat?:string;sourceWarning?:string;}
export interface Classification {action:'post'|'ignore'|'review';category:string;subcategory:string;type:TransactionType;reason:string;}
export const clean=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function rowId(source:string,account:string,ref:string,date:string,minor:number,vendor:string){
 const key=ref?`${source}|${account}|${ref}`:`${source}|${account}|${date}|${minor}|${vendor}`;
 return `statement:${key}`;
}
export const narrationDefaults: NarrationHabit[]=[
 {id:'nhpv',terms:['nhpv'],enabled:true,action:'ignore',category:'',subcategory:''},
 {id:'food',terms:['food','foo','dood'],enabled:true,action:'post',category:'Food',subcategory:'Food'},
 {id:'dinner',terms:['dinner'],enabled:true,action:'post',category:'Food',subcategory:'Dinner'},
 {id:'groceries',terms:['groceries'],enabled:true,action:'post',category:'Food',subcategory:'Groceries'},
 {id:'commute',terms:['commute','commu','commut','commutr','fommute','petrol'],enabled:true,action:'post',category:'Commute',subcategory:''},
 {id:'misc',terms:['misc','misv','essentials','medicine','medinice','hair cut','gift'],enabled:true,action:'post',category:'Misc',subcategory:''},
];
export function classify(row:StatementRow,habits:ImportHabits,history:StatementRow[]=[]):Classification{
 const result=(action:Classification['action'],category:string,subcategory:string,reason:string,type:TransactionType='Revenue Expense'):Classification=>({action,category,subcategory,reason,type});
 if(row.direction==='self'||/\b(atm|cash withdrawal)\b/i.test(row.vendor))return result('ignore','','','Own-account / cash transfer');
 if(row.direction!=='debit')return result('review','','','Credit needs your transaction type');
 const note=clean(row.note);
 const blocked=/\b(failed|refund|reversal|reversed|reimburs\w*|lent|loan|business|partnership|partneship|to ghar|split|share)\b/.test(note);
 const nh=habits.narrations.filter(h=>h.enabled&&h.terms.some(t=>{const n=clean(t);return n&&(` ${note} `).includes(` ${n} `);}));
 const ignore=nh.find(h=>h.action==='ignore');if(ignore)return result('ignore','','',`Narration: ${ignore.terms.join(', ')}`);
 const vendorRules=habits.vendors.filter(h=>h.enabled&&(h.prefix?clean(row.vendor).startsWith(clean(h.vendor)):clean(h.vendor)===clean(row.vendor)));
 if(new Set(vendorRules.map(v=>`${v.action}|${v.category}|${v.subcategory}|${v.type}`)).size>1)return result('review','','','Overlapping vendor habits conflict');
 const vendor=vendorRules[0];
 // Narration is authoritative; overlapping food-specific terms refine generic Food.
 const specific=nh.find(h=>h.id==='dinner'||h.id==='groceries');const matched=specific?[specific]:nh;
 const distinct=new Set(matched.map(h=>`${h.action}|${h.category}|${h.subcategory}`));
 if(distinct.size>1)return result('review','','','Narration gives conflicting classifications');
 const rule=matched[0];
 const generic=!note||/^(upi|upiintent|mopsupitxn|true|pay|payment|merchant qr|verified paytm (account|merchant)|pay to .*|payment to .*|payment for \d+|\d+)$/.test(note);
 if(blocked&&!vendor?.action.includes('ignore'))return result('review',rule?.category||'','','Complex narration needs review');
 if(!rule&&!generic&&vendor?.action!=='ignore')return result('review',vendor?.category||'',vendor?.subcategory||'','Unrecognised narration; habit not applied');
 const unusual=vendor?.maxAmountMinor!==undefined&&row.amountMinor>vendor.maxAmountMinor;
 const samples=history.filter(r=>r.source==='paytm'&&r.id!==row.id&&r.direction==='debit'&&clean(r.vendor)===clean(row.vendor)&&['posted','matched'].includes(r.status)).map(r=>r.amountMinor).sort((a,b)=>a-b);
 const median=samples.length?samples[Math.floor(samples.length/2)]:0;
 if(unusual||(samples.length>=3&&row.amountMinor>median*habits.unusualMultiplier))return result('review',rule?.category||vendor?.category||'',rule?.subcategory||vendor?.subcategory||'','Amount outside the usual range');
 if(rule){
  if(rule.action==='review')return result('review',rule.category,rule.subcategory,'Narration rule requires review');
  if(!vendor)return result('review',rule.category,rule.subcategory,'New vendor: confirm the narration classification');
  const conflicts=vendor&&vendor.action==='post'&&vendor.category!==rule.category;
  return result(conflicts?'review':'post',rule.category,rule.subcategory,conflicts?'Narration overrides a conflicting vendor habit; confirm once':'Narration rule');
 }
 if(vendor)return result(vendor.action,vendor.category,vendor.subcategory,vendor.action==='ignore'?'Your vendor exclusion':'Your vendor habit',vendor.type);
 const weekday=new Date(row.date+'T12:00:00Z').getUTCDay();
 if(habits.morningEnabled&&weekday>0&&weekday<6&&row.time&&row.time>=habits.morningStart&&row.time<=habits.morningEnd&&[1500,5000].includes(row.amountMinor))return result(habits.morningAutoPost?'post':'review','Commute','Auto','Weekday morning fare habit');
 return result('review','','','New or unmapped vendor');
}
export function directionOf(t:Transaction):'debit'|'credit'{return ['Income Misc','Lent Recovered'].includes(t.type)?'credit':'debit';}
export function candidates(row:StatementRow,txns:Transaction[],reserved:Set<string>=new Set()):Transaction[]{
 return txns.filter(t=>t.status==='active'&&!reserved.has(t.id)&&t.account===row.account&&directionOf(t)===row.direction&&t.amountMinor===row.amountMinor&&t.date===row.date);
}
export function rowState(row:StatementRow,txns:Transaction[]):StatementRow{
 if(!row.transactionId)return row;
 const t=txns.find(t=>t.id===row.transactionId);
 if(!t||t.status!=='active'||t.date!==row.date||t.account!==row.account||t.amountMinor!==row.amountMinor||directionOf(t)!==row.direction)return {...row,status:'pending',reason:'Linked entry changed or was deleted; review again'};
 return row;
}
export function saveStatementPosting(txns:Transaction[],row:StatementRow,proposed:Transaction):{transactions:Transaction[];saved:Transaction}{
 const linked=txns.find(t=>t.id===row.transactionId&&t.status==='active');
 if(txns.some(t=>t.status==='active'&&t.id!==linked?.id&&row.reference&&t.account===row.account&&t.statementReferences?.includes(row.reference)))throw Error('An entry with this payment reference already exists. Match or edit that entry.');
 const saved=linked?{...linked,...proposed,id:linked.id,createdAt:linked.createdAt,statementReferences:[...new Set([...(linked.statementReferences||[]),...(proposed.statementReferences||[])])]}:proposed;
 if(linked){const identifiers:Record<string,string>={account:'sourceId',paymentMode:'paymentModeId',majorCategory:'majorCategoryId',subCategory:'subCategoryId',person:'personId',purchasedFrom:'merchantId',paymentFor:'purposeId',incomeType:'incomeTypeId',investmentType:'investmentTypeId'};for(const [field,id] of Object.entries(identifiers))if(linked[field as keyof Transaction]!==saved[field as keyof Transaction])delete (saved as unknown as Record<string,unknown>)[id];}
 if(linked&&linked.majorCategory!==saved.majorCategory)delete saved.subCategoryId;
 return {saved,transactions:linked?txns.map(t=>t.id===linked.id?saved:t):[saved,...txns]};
}
export function batchUndoCandidates(batch:StatementBatch,rows:StatementRow[],txns:Transaction[]):string[]{
 return rows.filter(r=>r.batchId===batch.id&&r.status==='posted'&&r.reason!=='Reviewed manually'&&rowState(r,txns).status==='posted').flatMap(r=>{
  const t=txns.find(t=>t.id===r.transactionId);return t&&t.status==='active'&&t.updatedAt===t.createdAt&&t.statementReferences?.includes(r.reference)?[t.id]:[];
 });
}
export function reconciliationControls(batch:StatementBatch,rows:StatementRow[],txns:Transaction[]){
 const selected=rows.filter(r=>batch.rowIds?batch.rowIds.includes(r.id):r.batchId===batch.id).map(r=>rowState(r,txns));
 const amounts=(rs:StatementRow[],direction:'debit'|'credit')=>rs.filter(r=>r.direction===direction).reduce((sum,r)=>sum+r.amountMinor,0);
 const states=['matched','posted','ignored','pending'] as const;
 const counts=Object.fromEntries(states.map(status=>[status,selected.filter(r=>r.status===status).length])) as Record<typeof states[number],number>;
 const movements=amounts(selected,'credit')-amounts(selected,'debit');
 const balanceDifference=batch.openingMinor!==undefined&&batch.closingMinor!==undefined?batch.openingMinor+(batch.kind==='card'?-movements:movements)-batch.closingMinor:undefined;
 return {rows:selected,counts,populationComplete:selected.length===batch.count&&selected.length===new Set(selected.map(r=>r.id)).size,debitMinor:amounts(selected,'debit'),creditMinor:amounts(selected,'credit'),pendingDebitMinor:amounts(selected.filter(r=>r.status==='pending'),'debit'),pendingCreditMinor:amounts(selected.filter(r=>r.status==='pending'),'credit'),balanceDifference};
}
export function reconciliationAdvice(row:StatementRow,txns:Transaction[]){
 const sameAccount=txns.filter(t=>t.status==='active'&&t.account===row.account&&directionOf(t)===row.direction);
 const refs=sameAccount.filter(t=>row.reference&&t.statementReferences?.includes(row.reference));
 const exact=candidates(row,txns);
 const nearAmount=sameAccount.filter(t=>t.date===row.date&&Math.abs(t.amountMinor-row.amountMinor)<=100);
 const nearDate=row.source==='bank'?sameAccount.filter(t=>t.amountMinor===row.amountMinor&&Math.abs(Date.parse(t.date)-Date.parse(row.date))<=3*86400000):[];
 const options=refs.length?refs:exact.length?exact:nearAmount.length?nearAmount:nearDate;
 if(options.length>1)return {kind:'ambiguous',message:'Several existing entries could relate to this row. Confirm the payment reference or vendor before choosing one.',candidates:options};
 if(options.length===1){const t=options[0];
  if(t.amountMinor!==row.amountMinor)return {kind:'amount',message:`Possible amount difference: statement minus app is ${(row.amountMinor-t.amountMinor)/100} INR. Inspect the receipt before correcting the existing entry.`,varianceMinor:row.amountMinor-t.amountMinor,candidates:options};
  if(t.date!==row.date)return {kind:'date',message:`Possible timing difference: app date ${t.date}, statement date ${row.date}. Check transaction versus settlement date; this is a candidate, not a confirmed match.`,candidates:options};
  return {kind:'match',message:'Date, account, direction and amount agree. Confirm the reference/vendor and link the existing entry.',candidates:options};
 }
 if(row.direction==='credit')return {kind:'credit',message:'Review whether this is reimbursement, repayment, refund, own-account funding or income. A credit is not automatically income.',candidates:[]};
 if(row.direction==='self'||/\b(atm|transfer)\b/i.test(row.vendor))return {kind:'transfer',message:'Possible own-account or cash movement. Confirm the other side, then ignore it for expense posting.',candidates:[]};
 return {kind:'missing',message:'No candidate found in the recorded entries. Review the purpose, then post it or ignore it with a reason. This alone does not prove a missing expense.',candidates:[]};
}
export function mergeStatementRows(old:StatementRow[],incoming:StatementRow[]):StatementRow[]{
 const map=new Map(old.map(r=>[r.id,r]));
 for(const r of incoming){const existing=map.get(r.id);if(existing&&(existing.amountMinor!==r.amountMinor||existing.date!==r.date||existing.account!==r.account||existing.direction!==r.direction))throw Error('The same statement reference has conflicting details. Review the file.');if(!existing)map.set(r.id,r);}
 return [...map.values()];
}
export function validateStatementRows(value:unknown):asserts value is StatementRow[]{
 if(!Array.isArray(value))throw Error('Invalid statement history');const ids=new Set<string>();
 for(const r of value){if(!r||typeof r.id!=='string'||ids.has(r.id)||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||new Date(r.date+'T00:00:00Z').toISOString().slice(0,10)!==r.date||!Number.isSafeInteger(r.amountMinor)||r.amountMinor<=0||!['debit','credit','self'].includes(r.direction)||!['pending','posted','matched','ignored'].includes(r.status)||!['paytm','bank'].includes(r.source)||['vendor','account','note','reference','batchId'].some(k=>typeof r[k]!=='string'))throw Error('Invalid statement row');if(r.valueDate!==undefined&&(typeof r.valueDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.valueDate)||Number.isNaN(Date.parse(r.valueDate))||new Date(r.valueDate+'T00:00:00Z').toISOString().slice(0,10)!==r.valueDate))throw Error('Invalid statement value date');ids.add(r.id);}
}
export function validateHabits(value:unknown):asserts value is ImportHabits{
 const h=value as ImportHabits;if(!h||h.version!==1||!Array.isArray(h.vendors)||!Array.isArray(h.narrations)||!Number.isFinite(h.unusualMultiplier)||h.unusualMultiplier<1||![h.morningStart,h.morningEnd].every(t=>typeof t==='string'&&/^\d{2}:\d{2}$/.test(t)))throw Error('Invalid statement habit settings');
 for(const r of [...h.vendors,...h.narrations])if(!r||typeof r.id!=='string'||typeof r.enabled!=='boolean'||!['post','ignore','review'].includes(r.action)||typeof r.category!=='string'||typeof r.subcategory!=='string')throw Error('Invalid habit rule');
 for(const v of h.vendors)if(typeof v.vendor!=='string'||!['Revenue Expense','CAPEX','Lent','Lent Recovered','To Ghar','Income Misc','Investment'].includes(v.type)||(v.maxAmountMinor!==undefined&&(!Number.isSafeInteger(v.maxAmountMinor)||v.maxAmountMinor<0)))throw Error('Invalid vendor habit');
 for(const r of h.narrations)if(!Array.isArray(r.terms)||r.terms.some(t=>typeof t!=='string'))throw Error('Invalid narration terms');
}
export function validateStatementBatches(value:unknown):asserts value is StatementBatch[]{
 if(!Array.isArray(value))throw Error('Invalid statement imports');const ids=new Set<string>();
 for(const b of value){if(!b||typeof b.id!=='string'||ids.has(b.id)||!['paytm','bank'].includes(b.source)||typeof b.name!=='string'||!Number.isFinite(b.createdAt)||!Number.isSafeInteger(b.count)||b.count<1||!/^\d{4}-\d{2}-\d{2}$/.test(b.from)||!/^\d{4}-\d{2}-\d{2}$/.test(b.to)||b.from>b.to||b.kind!==undefined&&!['bank','card','pluxee'].includes(b.kind)||[b.openingMinor,b.closingMinor].some(n=>n!==undefined&&!Number.isSafeInteger(n))||b.rowIds!==undefined&&(!Array.isArray(b.rowIds)||b.rowIds.some((id:unknown)=>typeof id!=='string')||new Set(b.rowIds).size!==b.rowIds.length))throw Error('Invalid statement import');ids.add(b.id);}
}
export function classifyImport(rows:StatementRow[],data:AppData,habits:ImportHabits){
 const known=data.statementRows||[];const reserved=new Set(known.filter(r=>r.source===rows[0]?.source&&r.transactionId).map(r=>r.transactionId!));
 return rows.map(row=>{
  const saved=known.find(r=>r.id===row.id);if(saved)return {row:saved,classification:classify(saved,habits,known),matches:[],existing:true};
  const references=data.transactions.filter(t=>t.status==='active'&&t.statementReferences?.includes(row.reference)&&row.reference&&t.account===row.account&&t.date===row.date&&t.amountMinor===row.amountMinor&&directionOf(t)===row.direction);
  const matches=references.length?references:candidates(row,data.transactions,reserved);
  // Even a single amount/date candidate needs confirmation without an exact payment reference.
  const classification=classify(row,habits,known);
  const near=data.transactions.some(t=>t.status==='active'&&t.account===row.account&&directionOf(t)===row.direction&&t.date===row.date&&Math.abs(t.amountMinor-row.amountMinor)<=100);
  const exactReference=references.length===1&&!reserved.has(references[0].id);
  if(exactReference)reserved.add(references[0].id);
  if(matches.length||near||row.source==='bank'||!data.accounts.includes(row.account)||classification.type!=='Revenue Expense')classification.action='review';
  if(matches.length)classification.reason=references.length?'Reference match; confirm link':'Possible existing entry; confirm before posting';
  else if(near)classification.reason='Possible amount discrepancy with an existing entry';
  else if(row.source==='bank')classification.reason='Bank reconciliation: review unmatched row';
  else if(!data.accounts.includes(row.account))classification.reason='Choose the credited/debited account during review';
  return {row,classification,matches,existing:false,exactReference};
 });
}
