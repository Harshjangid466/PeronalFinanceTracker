import type {AppData,Transaction} from './types';
import {shiftMonth,sumMinor} from './dashboardAnalytics';

const monthEnd=(month:string)=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return Math.round(sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2);};

export function personalAnalysis(data:AppData,month:string,today:string,account=''){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month>today.slice(0,7))throw Error('Choose a month through today.');
 const end=month===today.slice(0,7)?today:monthEnd(month);
 const active=data.transactions.filter(t=>t.status==='active'&&t.currency==='INR'&&t.date<=end&&(!account||t.account===account));
 const lastComplete=month===today.slice(0,7)?shiftMonth(month,-1):month;
 const history=Array.from({length:3},(_,i)=>{
  const key=shiftMonth(lastComplete,i-2),rows=active.filter(t=>t.date.slice(0,7)===key);
  const expenses=rows.filter(t=>t.type==='Revenue Expense'),incomeRows=rows.filter(t=>t.type==='Income Misc');
  const entered=account?undefined:data.monthlyIncomeMinor?.[key];
  return {month:key,expenses,incomeRows,expenseMinor:expenses.length?sumMinor(expenses):undefined,incomeMinor:entered??(incomeRows.length?sumMinor(incomeRows):undefined),incomeSource:entered!==undefined?'entered':'recorded'};
 });
 const expenseMinor=history.every(h=>h.expenseMinor!==undefined)?Math.round(history.reduce((n,h)=>n+h.expenseMinor!,0)/3):undefined;
 const incomeMinor=history.every(h=>h.incomeMinor!==undefined)?Math.round(history.reduce((n,h)=>n+h.incomeMinor!,0)/3):undefined;
 const groups=new Map<string,Transaction[]>();
 const recent=active.filter(t=>t.type==='Revenue Expense'&&t.amountMinor>0&&t.date>=shiftMonth(month,-5)+'-01');
 for(const t of recent){
  const merchant=(t.purchasedFrom||t.heading||'').trim();
  if(!merchant)continue;
  const key=JSON.stringify([merchant.toLocaleLowerCase('en-IN').replace(/\s+/g,' '),t.account,t.majorCategory,t.transactionTypeId||t.type]);
  groups.set(key,[...(groups.get(key)||[]),t]);
 }
 const recurring=[...groups.entries()].flatMap(([key,entries])=>{
  const rows=[...entries].sort((a,b)=>a.date.localeCompare(b.date)),last=rows[rows.length-1];
  // shortcut: detect monthly cadence only; add other frequencies when their evidence rules are defined.
  const sample=rows.filter(t=>t.date>=shiftMonth(last.date.slice(0,7),-2)+'-01');
  if(sample.length!==3||new Set(sample.map(t=>t.date.slice(0,7))).size!==3)return [];
  if((Date.parse(end)-Date.parse(last.date))/86400000>45)return [];
  const gaps=sample.slice(1).map((t,i)=>(Date.parse(t.date)-Date.parse(sample[i].date))/86400000),monthlyMinor=median(sample.map(t=>t.amountMinor));
  if(gaps.some(n=>n<20||n>40)||sample.some(t=>Math.abs(t.amountMinor-monthlyMinor)>monthlyMinor*.15))return [];
  return [{key,name:last.purchasedFrom||last.heading!,account:last.account,monthlyMinor,annualMinor:monthlyMinor*12,rows:sample,lastDate:last.date}];
 }).sort((a,b)=>b.monthlyMinor-a.monthlyMinor||a.name.localeCompare(b.name));
 return {history,expenseMinor,incomeMinor,recurring,end,forecastMonths:Array.from({length:3},(_,i)=>shiftMonth(month,i+1))};
}

export function personalOutlook(analysis:ReturnType<typeof personalAnalysis>,incomeOverride:number|undefined,spendingChange:number){
 if(!Number.isFinite(spendingChange)||spendingChange< -100||spendingChange>100)throw Error('Choose a spending change between -100% and 100%.');
 if(incomeOverride!==undefined&&(!Number.isSafeInteger(incomeOverride)||incomeOverride<0))throw Error('Enter a valid non-negative monthly income.');
 const incomeMinor=incomeOverride??analysis.incomeMinor;
 const expenseMinor=analysis.expenseMinor===undefined||analysis.expenseMinor<0?undefined:Math.round(analysis.expenseMinor*(1+spendingChange/100));
 const remainingMinor=incomeMinor===undefined||expenseMinor===undefined?undefined:incomeMinor-expenseMinor;
 return analysis.forecastMonths.map(month=>({month,incomeMinor,expenseMinor,remainingMinor}));
}
