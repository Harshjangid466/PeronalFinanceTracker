import {clean,type ImportHabits,type StatementRow} from './statements';
import type {Transaction} from './types';
export function suggestHabits(rows:StatementRow[],habits:ImportHabits,txns:Transaction[]){
 const groups=new Map<string,StatementRow[]>(),seen=new Set<string>();
 for(const r of rows){const identity=r.transactionId||r.id;if(seen.has(identity))continue;seen.add(identity);if(r.direction!=='debit'||!clean(r.vendor)||habits.vendors.some(v=>v.prefix?clean(r.vendor).startsWith(clean(v.vendor)):clean(v.vendor)===clean(r.vendor)))continue;const key=clean(r.vendor);groups.set(key,[...(groups.get(key)||[]),r]);}
 return [...groups.entries()].flatMap(([key,rs])=>{
  const dates=new Set(rs.map(r=>r.date));if(rs.length<3||dates.size<2)return [];
  const amounts=new Map<number,number>(),notes=new Map<string,number>();for(const r of rs){amounts.set(r.amountMinor,(amounts.get(r.amountMinor)||0)+1);const note=clean(r.note);if(note&&!/^(upi|payment|pay|sent using paytm upi)$/.test(note))notes.set(note,(notes.get(note)||0)+1);}
  const linked=rs.flatMap(r=>txns.filter(t=>t.id===r.transactionId&&t.status==='active'&&t.type==='Revenue Expense'));
  const categories=new Set(linked.map(t=>t.majorCategory).filter(Boolean));
  const narrationCategories=new Set(rs.flatMap(r=>habits.narrations.filter(h=>h.enabled&&h.action==='post'&&h.terms.some(t=>(` ${clean(r.note)} `).includes(` ${clean(t)} `))).map(h=>h.category)));
  const category=categories.size===1?[...categories][0]:categories.size===0&&narrationCategories.size===1?[...narrationCategories][0]:'';
  const times=rs.filter(r=>r.time);const morning=times.filter(r=>{const d=new Date(r.date+'T12:00:00Z').getUTCDay();return d>0&&d<6&&r.time!>=habits.morningStart&&r.time!<=habits.morningEnd;}).length;
  const hours=new Map<number,number>();for(const r of times){const hour=Number(r.time!.slice(0,2));if(Number.isInteger(hour)&&hour>=0&&hour<24){const start=Math.floor(hour/2)*2;hours.set(start,(hours.get(start)||0)+1);}}
  const timeWindows=[...hours].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,2);
  const sorted=[...amounts].sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
  const orderedDates=[...dates].sort();
  return [{id:'vendor:'+key,vendor:rs[0].vendor,count:rs.length,days:dates.size,from:orderedDates[0],to:orderedDates[orderedDates.length-1],minMinor:Math.min(...rs.map(r=>r.amountMinor)),maxMinor:Math.max(...rs.map(r=>r.amountMinor)),amounts:sorted.slice(0,3),notes:[...notes].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).slice(0,3),timed:times.length,morning,timeWindows,category,conflicting:categories.size>1||narrationCategories.size>1}];
 }).sort((a,b)=>b.count-a.count||a.vendor.localeCompare(b.vendor));
}
