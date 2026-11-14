import type {AppData} from './types';
import {reconciliationControls,reconciliationAdvice} from './statements';

export type ReconciliationState='missing'|'review'|'unverified'|'reviewed';
export const reconciliationLabels:Record<ReconciliationState,string>={missing:'No statement',review:'Needs review',unverified:'Balances unverified',reviewed:'Reviewed'};
export function previousMonth(today=new Date()):string{
 return monthAt(today.getFullYear(),today.getMonth()-1);
}
function monthAt(year:number,month:number):string{
 const date=new Date(year,month,1);
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}
function validDate(value:string):boolean{
 return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}

// A month groups statements by their end date; it does not certify calendar-day coverage.
export function accountReconciliation(data:AppData,month:string){
 if(!/^\d{4}-\d{2}$/.test(month)||!validDate(month+'-01'))throw Error('Choose a valid statement month.');
 const [year,monthNumber]=month.split('-').map(Number);
 const months=Array.from({length:6},(_,i)=>monthAt(year,monthNumber-6+i));
 const rows=data.statementRows||[],transactions=data.transactions;
 const periods=(data.statementBatches||[]).map(batch=>{
  const controls=reconciliationControls(batch,rows,transactions);
  const accounts=[...new Set(controls.rows.map(r=>r.account))];
  const validPeriod=validDate(batch.from)&&validDate(batch.to)&&batch.from<=batch.to;
  return {...controls,batch,accounts,validPeriod};
 });
 const banks=periods.filter(p=>p.batch.source==='bank');
 const sourceMasters=(data.masters||[]).filter(m=>m.kind==='source');
 const names=new Set([...sourceMasters.filter(m=>m.active&&m.accountType&&m.accountType!=='Cash').map(m=>m.name),...banks.flatMap(p=>p.accounts),...rows.filter(r=>r.source==='paytm').map(r=>r.account)]);
 names.delete('Cash');
 for(const m of sourceMasters)if(m.accountType==='Cash')names.delete(m.name);
 const unassigned=banks.filter(p=>p.batch.to.slice(0,7)===month&&(!p.accounts.length||!p.validPeriod));
 const accounts=[...names].map(account=>{
  const historyForAccount=banks.filter(p=>p.accounts.includes(account));
  const forMonth=(target:string)=>{
   const selected=historyForAccount.filter(p=>p.batch.to.slice(0,7)===target);
   const selectedRows=[...new Map(selected.flatMap(p=>p.rows.filter(r=>r.account===account)).map(r=>[r.id,r])).values()].map(r=>['matched','posted'].includes(r.status)&&!r.transactionId?{...r,status:'pending' as const}:r);
   const counts={matched:0,posted:0,ignored:0,pending:0};
   for(const r of selectedRows)counts[r.status]++;
   const unlinked=transactions.filter(t=>t.status==='active'&&t.account===account&&selected.some(p=>p.validPeriod&&t.date>=p.batch.from&&t.date<=p.batch.to)&&!data.cardSettlements?.some(g=>g.status==='active'&&g.replacementId===t.id)&&!selectedRows.some(r=>r.transactionId===t.id&&['matched','posted'].includes(r.status)));
   const issues=selected.some(p=>!p.validPeriod||!p.populationComplete||p.accounts.length!==1||p.balanceDifference!==undefined&&p.balanceDifference!==0);
   const held=selectedRows.filter(r=>r.cardHold&&!r.cardSettlementId).length;
   const state:ReconciliationState=!selected.length?'missing':issues||counts.pending||unlinked.length||held?'review':selected.some(p=>p.balanceDifference===undefined)?'unverified':'reviewed';
   return {periods:selected,rows:selectedRows,unlinked,...counts,held,state};
  };
  const current=forMonth(month);
  const reviewedMonths=new Set([...new Set(historyForAccount.map(p=>p.batch.to.slice(0,7)))].filter(m=>forMonth(m).state==='reviewed'));
  return {account,...current,
   latestTo:historyForAccount.filter(p=>p.validPeriod).map(p=>p.batch.to).sort().reverse()[0],
   latestReviewedTo:historyForAccount.filter(p=>reviewedMonths.has(p.batch.to.slice(0,7))).map(p=>p.batch.to).sort().reverse()[0],
   history:months.map(m=>({month:m,state:forMonth(m).state})),
   debitMinor:current.rows.filter(r=>r.direction==='debit').reduce((sum,r)=>sum+r.amountMinor,0),
   creditMinor:current.rows.filter(r=>r.direction==='credit').reduce((sum,r)=>sum+r.amountMinor,0),
   noCandidate:current.rows.filter(r=>r.status==='pending'&&['debit','credit'].includes(r.direction)&&reconciliationAdvice(r,transactions).candidates.length===0).length,
   upiRows:new Set(periods.filter(p=>p.batch.source==='paytm'&&p.batch.to.slice(0,7)===month).flatMap(p=>p.rows.filter(r=>r.account===account).map(r=>r.id))).size
  };
 });
 return {month,months,accounts,unassigned};
}
