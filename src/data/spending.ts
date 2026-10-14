import type {Transaction} from './types';
export function spendingSummary(transactions:Transaction[],month:string,today:string){
 const expenses=transactions.filter(t=>t.status==='active'&&t.type==='Revenue Expense');
 const sum=(rows:Transaction[])=>rows.reduce((s,t)=>s+t.amountMinor,0);
 const current=expenses.filter(t=>t.date.slice(0,7)===month);
 const categories=new Map<string,number>();for(const t of current)categories.set(t.majorCategory||'Uncategorised',(categories.get(t.majorCategory||'Uncategorised')||0)+t.amountMinor);
 const date=new Date(today+'T12:00:00Z'),day=(date.getUTCDay()+6)%7;
 const iso=(offset:number)=>new Date(date.getTime()+offset*86400000).toISOString().slice(0,10);
 const weekStart=iso(-day),previousStart=iso(-day-7),previousEnd=iso(-7);
 const weekly=expenses.filter(t=>t.date>=weekStart&&t.date<=today);
 const previous=expenses.filter(t=>t.date>=previousStart&&t.date<=previousEnd);
 const vendors=new Map<string,{amountMinor:number;count:number}>();for(const t of weekly){const vendor=t.purchasedFrom||t.heading||'Unnamed payment';const v=vendors.get(vendor)||{amountMinor:0,count:0};v.amountMinor+=t.amountMinor;v.count++;vendors.set(vendor,v);}
 return {totalMinor:sum(current),count:current.length,categories:[...categories].sort((a,b)=>b[1]-a[1]),weekStart,weeklyMinor:sum(weekly),previousMinor:sum(previous),weeklyCount:weekly.length,vendors:[...vendors].sort((a,b)=>b[1].count-a[1].count||b[1].amountMinor-a[1].amountMinor).slice(0,3)};
}
