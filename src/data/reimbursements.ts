import type {AppData,Transaction} from './types';
export interface ReimbursementCredit {transactionId:string;amountMinor:number;date:string;}
export interface ReimbursementClaim {id:string;expenseId:string;expenseAmountMinor:number;expenseDate:string;expectedMinor:number;person:string;credits:ReimbursementCredit[];status:'active'|'cancelled';createdAt:number;updatedAt:number;}
const expenseEntry=(t:Transaction|undefined)=>!!t&&t.status==='active'&&t.type==='Revenue Expense'&&t.amountMinor>0&&t.currency==='INR';
const creditEntry=(t:Transaction|undefined)=>!!t&&t.status==='active'&&t.type==='Revenue Expense'&&t.amountMinor<0&&t.currency==='INR';
const validDate=(s:string)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function reimbursementSummary(data:AppData,claim:ReimbursementClaim){
 const expense=data.transactions.find(t=>t.id===claim.expenseId),issues:string[]=[];
 if(!expenseEntry(expense)||expense!.amountMinor!==claim.expenseAmountMinor||expense!.date!==claim.expenseDate)issues.push('Original expense changed or is unavailable. Check it before relying on the outstanding amount.');
 const credits=claim.credits.map(link=>{const transaction=data.transactions.find(t=>t.id===link.transactionId);const valid=creditEntry(transaction)&&-transaction!.amountMinor===link.amountMinor&&transaction!.date===link.date&&link.date>=claim.expenseDate;if(!valid)issues.push('A linked credit changed or is unavailable. Remove its link and review the corrected entry.');return {link,transaction,valid};});
 const receivedMinor=credits.filter(c=>c.valid).reduce((s,c)=>s+c.link.amountMinor,0);
 return {expense,credits,issues,receivedMinor,remainingMinor:Math.max(0,claim.expectedMinor-receivedMinor),excessMinor:Math.max(0,receivedMinor-claim.expectedMinor),netMinor:claim.expenseAmountMinor-receivedMinor,state:claim.status==='cancelled'?'cancelled':issues.length?'review':receivedMinor>=claim.expectedMinor?'settled':'open'};
}
export function trackReimbursement(data:AppData,expenseId:string,person:string,expectedMinor:number,id:string,now:number):AppData{
 const t=data.transactions.find(t=>t.id===expenseId);
 if(!expenseEntry(t))throw Error('Choose an active positive Revenue Expense.');
 if(!person.trim())throw Error('Enter who you expect the reimbursement from.');
 if(!Number.isSafeInteger(expectedMinor)||expectedMinor<=0||expectedMinor>t!.amountMinor)throw Error('Expected reimbursement must be positive and no more than the expense.');
 if(data.reimbursementClaims?.some(c=>c.id===id||c.status==='active'&&c.expenseId===expenseId))throw Error('This expense is already being tracked.');
 const claim:ReimbursementClaim={id,expenseId,expenseAmountMinor:t!.amountMinor,expenseDate:t!.date,expectedMinor,person:person.trim(),credits:[],status:'active',createdAt:now,updatedAt:now};
 return {...data,reimbursementClaims:[claim,...(data.reimbursementClaims||[])]};
}
export function changeReimbursement(data:AppData,id:string,action:'credit'|'unlink'|'cancel'|'expected',value:string|number,now:number):AppData{
 const claim=data.reimbursementClaims?.find(c=>c.id===id&&c.status==='active');if(!claim)throw Error('Active reimbursement not found.');
 let next={...claim,updatedAt:now};
 if(action==='cancel')next.status='cancelled';
 if(action==='unlink')next.credits=next.credits.filter(c=>c.transactionId!==value);
 if(action==='expected'){
  const t=data.transactions.find(t=>t.id===claim.expenseId);
  if(!expenseEntry(t)||!Number.isSafeInteger(value)||Number(value)<=0||Number(value)>t!.amountMinor)throw Error('Choose an active expense and a positive expected amount no larger than it.');
  if(claim.credits.some(c=>c.date<t!.date))throw Error('A credit now predates the expense. Review or unlink it before updating the expectation.');
  next={...next,expectedMinor:Number(value),expenseAmountMinor:t!.amountMinor,expenseDate:t!.date};
 }
 if(action==='credit'){
  if(reimbursementSummary(data,claim).issues.length)throw Error('Resolve the changed expense or credit links first.');
  const t=data.transactions.find(t=>t.id===value);
  if(!creditEntry(t)||t!.date<claim.expenseDate)throw Error('Choose a negative Revenue Expense credit dated on or after the original expense. Income and loan repayments are separate.');
  if(data.reimbursementClaims?.some(c=>c.status==='active'&&c.credits.some(x=>x.transactionId===value)))throw Error('This credit is already allocated to a reimbursement.');
  next.credits=[...next.credits,{transactionId:t!.id,amountMinor:-t!.amountMinor,date:t!.date}];
  if(!Number.isSafeInteger(next.credits.reduce((n,c)=>n+c.amountMinor,0)))throw Error('Reimbursement credit total exceeds supported amount limits.');
 }
 return {...data,reimbursementClaims:data.reimbursementClaims!.map(c=>c.id===id?next:c)};
}
export function validateReimbursements(data:AppData){
 if(data.reimbursementClaims!==undefined&&!Array.isArray(data.reimbursementClaims))throw Error('Invalid reimbursement history');
 const ids=new Set<string>(),expenses=new Set<string>(),credits=new Set<string>();
 for(const c of data.reimbursementClaims||[]){
  if(!c||typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof c.expenseId!=='string'||!c.expenseId||typeof c.person!=='string'||!c.person.trim()||!['active','cancelled'].includes(c.status)||!Number.isSafeInteger(c.expenseAmountMinor)||c.expenseAmountMinor<=0||!Number.isSafeInteger(c.expectedMinor)||c.expectedMinor<=0||c.expectedMinor>c.expenseAmountMinor||!validDate(c.expenseDate)||!Array.isArray(c.credits)||!Number.isFinite(c.createdAt)||!Number.isFinite(c.updatedAt))throw Error('Invalid reimbursement claim');ids.add(c.id);
  const local=new Set<string>();for(const r of c.credits){if(!r||typeof r.transactionId!=='string'||!r.transactionId||r.transactionId===c.expenseId||local.has(r.transactionId)||!Number.isSafeInteger(r.amountMinor)||r.amountMinor<=0||!validDate(r.date)||r.date<c.expenseDate)throw Error('Invalid reimbursement credit');local.add(r.transactionId);if(c.status==='active'){if(credits.has(r.transactionId))throw Error('A credit is allocated more than once');credits.add(r.transactionId);}}
  if(!Number.isSafeInteger(c.credits.reduce((n,r)=>n+r.amountMinor,0)))throw Error('Invalid reimbursement total');
  if(c.status==='active'){if(expenses.has(c.expenseId))throw Error('An expense is tracked more than once');expenses.add(c.expenseId);}
 }
}
