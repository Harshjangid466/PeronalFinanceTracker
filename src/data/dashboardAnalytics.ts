import type {AppData,Transaction} from './types';
import {rowState} from './statements';

export const sumMinor=(rows:Transaction[])=>rows.reduce((sum,t)=>sum+t.amountMinor,0);
const iso=(d:Date)=>d.toISOString().slice(0,10);
export function shiftMonth(month:string,offset:number){return iso(new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-1+offset,1))).slice(0,7);}
const monthDays=(month:string)=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
export function groupExpenses(rows:Transaction[],key:(t:Transaction)=>string){
 const groups=new Map<string,{name:string;amountMinor:number;count:number;rows:Transaction[]}>();
 for(const t of rows){const name=key(t)||'Uncategorised',g=groups.get(name)||{name,amountMinor:0,count:0,rows:[]};g.amountMinor+=t.amountMinor;g.count++;g.rows.push(t);groups.set(name,g);}
 return [...groups.values()].sort((a,b)=>b.amountMinor-a.amountMinor||a.name.localeCompare(b.name));
}
export function dashboardAnalytics(data:AppData,month:string,today:string,account=''){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Choose a valid dashboard month.');
 const active=data.transactions.filter(t=>t.status==='active'&&t.currency==='INR'&&t.date<=today&&(!account||t.account===account));
 const cutoff=month===today.slice(0,7)?Number(today.slice(8)):month>today.slice(0,7)?0:monthDays(month);
 const end=month+'-'+String(Math.max(1,cutoff)).padStart(2,'0');
 const scoped=(key:string)=>active.filter(t=>t.date.slice(0,7)===key);
 const rows=scoped(month),expenses=rows.filter(t=>t.type==='Revenue Expense'),previousMonth=shiftMonth(month,-1);
 const previousDays=month===today.slice(0,7)?Math.min(cutoff,monthDays(previousMonth)):monthDays(previousMonth);
 const previous=active.filter(t=>t.type==='Revenue Expense'&&t.date.slice(0,7)===previousMonth&&Number(t.date.slice(8))<=previousDays);
 const expenseMinor=sumMinor(expenses),previousMinor=sumMinor(previous);
 const enteredIncome=account?undefined:data.monthlyIncomeMinor?.[month],recordedIncome=rows.filter(t=>t.type==='Income Misc');
 const incomeMinor=enteredIncome??(recordedIncome.length?sumMinor(recordedIncome):undefined);
 const incomeSource=enteredIncome!==undefined?'entered':'recorded';
 const days=Array.from({length:monthDays(month)},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0'),entries=expenses.filter(t=>t.date===date);return {date,day:i+1,rows:entries,amountMinor:sumMinor(entries),elapsed:i<cutoff};});
 let cumulative=0,previousCumulative=0;
 const curve=Array.from({length:Math.max(days.length,previousDays)},(_,i)=>{const day=i+1;cumulative+=days[i]?.amountMinor||0;previousCumulative+=sumMinor(previous.filter(t=>Number(t.date.slice(8))===day));return {day,elapsed:i<cutoff,cumulativeMinor:cumulative,previousMinor:previousCumulative};});
 const trend=Array.from({length:6},(_,i)=>{const key=shiftMonth(month,i-5),entries=scoped(key),incomeEntries=entries.filter(t=>t.type==='Income Misc'),override=account?undefined:data.monthlyIncomeMinor?.[key];return {month:key,expenseMinor:sumMinor(entries.filter(t=>t.type==='Revenue Expense')),incomeMinor:override??(incomeEntries.length?sumMinor(incomeEntries):undefined),hasEntries:entries.length>0};});
 const endDate=new Date(end+'T12:00:00Z'),weekday=(endDate.getUTCDay()+6)%7,offset=(n:number)=>iso(new Date(endDate.getTime()+n*86400000));
 const weekStart=offset(-weekday),previousWeekStart=offset(-weekday-7),previousWeekEnd=offset(-7);
 const allExpenses=active.filter(t=>t.type==='Revenue Expense');
 const weekly=allExpenses.filter(t=>t.date>=weekStart&&t.date<=end),previousWeekly=allExpenses.filter(t=>t.date>=previousWeekStart&&t.date<=previousWeekEnd);
 const allocations=(['Revenue Expense','CAPEX','To Ghar','Investment','Lent','Lent Recovered'] as const).map(type=>({type,amountMinor:sumMinor(rows.filter(t=>t.type===type)),rows:rows.filter(t=>t.type===type)}));
 const pending=(data.statementRows||[]).filter(r=>r.date.slice(0,7)===month&&r.date<=today&&(!account||r.account===account)&&rowState(r,data.transactions).status==='pending');
 const weekdays=Array.from({length:7},(_,i)=>{const matching=days.filter(d=>d.elapsed&&(new Date(d.date+'T12:00:00Z').getUTCDay()+6)%7===i),entries=matching.flatMap(d=>d.rows),total=sumMinor(entries);return {label:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],amountMinor:total,averageMinor:matching.length?Math.round(total/matching.length):0,days:matching.length,rows:entries};});
 const small=expenses.filter(t=>t.amountMinor<=10000);
 return {month,end,cutoff,rows,expenses,expenseMinor,previousMinor,previousMonth,previousDays,incomeMinor,incomeSource,recordedIncome,remainingMinor:incomeMinor===undefined?undefined:incomeMinor-expenseMinor,days,curve,trend,allocations,pending,weekStart,weekly,weeklyMinor:sumMinor(weekly),previousWeeklyMinor:sumMinor(previousWeekly),categories:groupExpenses(expenses,t=>t.majorCategory),merchants:groupExpenses(expenses,t=>t.purchasedFrom||t.heading||'Unnamed payment'),accounts:groupExpenses(expenses,t=>t.account||'No account'),modes:groupExpenses(expenses,t=>t.paymentMode||'No payment mode'),weekdays,small,smallMinor:sumMinor(small),activeDays:days.filter(d=>d.rows.length).length};
}
