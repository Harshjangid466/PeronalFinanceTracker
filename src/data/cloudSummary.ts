import type {AppData,Transaction} from './types';
import {spendingCoach} from './spendingCoach';
import {groupExpenses,sumMinor} from './dashboardAnalytics';
import {clean} from './statements';
import type {AISummary,AIFact,FactKind} from './cloudContract';

export function cloudSnapshot(data:AppData,month:string,today:string,account='',limit=10000,history:AISummary['history']='ready'){
 const c=spendingCoach(data,month,today,account,limit),s=c.stats,facts:AIFact[]=[];
 const evidence:Record<string,{label:string;rows:Transaction[]}>={};
 function add(kind:FactKind,label:string,currentMinor:number|null,previousMinor:number|null,rows:Transaction[]=[],previous:Transaction[]=[],localLabel=label){
  const id='f'+facts.length;facts.push({id,kind,label:label.replace(/[\u0000-\u001f]/g,' ').slice(0,96)||'Unlabelled',currentMinor,previousMinor,count:rows.length,previousCount:previousMinor===null?null:previous.length});
  evidence[id]={label:localLabel,rows:[...new Map([...rows,...previous].map(t=>[t.id,t])).values()]};
 }
 add('total','Personal spending',s.expenseMinor,s.previousMinor,s.expenses,c.previous);
 add('total','Petty personal spending',sumMinor(c.petty),sumMinor(c.previousPetty),c.petty,c.previousPetty);
 add('total','Card personal spending',sumMinor(c.cards),sumMinor(c.previousCards),c.cards,c.previousCards);
 add('total','Petty and card overlap (already in both)',sumMinor(c.overlap),null,c.overlap);
 add('total','Income',s.incomeMinor??null,null,s.incomeSource==='recorded'?s.recordedIncome:[]);
 add('total','Income less personal spending; not confirmed savings',s.remainingMinor??null,null,s.expenses);
 for(const g of c.categoryChanges.sort((a,b)=>Math.abs(b.deltaMinor)-Math.abs(a.deltaMinor)).slice(0,16))add('category',g.category,g.currentMinor,g.previousMinor,g.rows,g.previous);
 const vendors=groupExpenses(s.expenses,t=>clean(t.purchasedFrom||t.heading||'Unnamed')).slice(0,12);
 vendors.forEach((g,i)=>{const previous=c.previous.filter(t=>clean(t.purchasedFrom||t.heading||'Unnamed')===g.name);add('vendor',`Vendor ${i+1}`,g.amountMinor,sumMinor(previous),g.rows,previous,g.rows[0].purchasedFrom||g.rows[0].heading||'Unnamed vendor');});
 c.cardAccounts.slice(0,10).forEach((g,i)=>{const previous=c.previousCards.filter(t=>t.account===g.name);add('card',`Card ${i+1}`,g.amountMinor,sumMinor(previous),g.rows,previous,g.name);});
 c.vendors.slice(0,6).forEach((g,i)=>{const previous=c.previousPetty.filter(t=>clean(t.purchasedFrom||t.heading||'Unnamed payment')===clean(g.name));add('petty-vendor',`Petty vendor ${i+1}`,g.amountMinor,sumMinor(previous),g.rows,previous,g.name);});
 for(const g of c.amounts.slice(0,6)){const previous=c.previousPetty.filter(t=>t.amountMinor===Number(g.name));add('petty-amount',`Petty payments of INR ${Number(g.name)/100}`,g.amountMinor,sumMinor(previous),g.rows,previous);}
 for(const g of s.trend)add('income-trend',g.month,g.incomeMinor??null,null);
 for(const g of s.weekdays)add('weekday',g.label,g.amountMinor,null,g.rows);
 for(const g of s.trend)add('trend',g.month,g.hasEntries?g.expenseMinor:null,null,data.transactions.filter(t=>t.status==='active'&&t.currency==='INR'&&t.type==='Revenue Expense'&&t.date.slice(0,7)===g.month&&t.date<=today&&(!account||t.account===account)));
 for(const g of s.allocations.filter(g=>g.type!=='Revenue Expense'))add('allocation',g.type,g.amountMinor,null,g.rows);
 for(const [label,rows] of [['Pending imported movements',c.reviewRows],['Held card movements',c.held],['Card fees in source only',c.feeRows],['Card payments in source only',c.payments],['Refund credits in source only',c.refunds]] as const){
  add('review',label,history==='ready'?rows.reduce((n,r)=>n+r.amountMinor,0):null,null);
  facts[facts.length-1].count=history==='ready'?rows.length:0;
 }
 const payload:AISummary={version:1,currency:'INR',month,through:s.end,comparisonMonth:s.previousMonth,comparisonDays:s.previousDays,scope:account?'one account':'all accounts',incomeBasis:s.incomeSource==='entered'?'entered':'recorded',history,pettyLimitMinor:limit,facts};
 // Only payload crosses the network. Local evidence includes private names and identifiers.
 return {payload,evidence};
}
