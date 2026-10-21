import type {AppData,Transaction} from './types';
import {dashboardAnalytics,groupExpenses,sumMinor} from './dashboardAnalytics';
import {cardKind,isCardRow} from './cardReconciliation';
import {clean,rowState,type StatementRow} from './statements';
import {compareCashback} from './cashback';
import {formatCurrency} from './format';

export const coachMoney=(minor:number)=>formatCurrency(minor/100);
const percentage=(part:number,total:number)=>total?`${(part/total*100).toFixed(1)}%`:'—';
export function spendChange(current:Transaction[],previous:Transaction[]){
 const currentMinor=sumMinor(current),previousMinor=sumMinor(previous),deltaMinor=currentMinor-previousMinor;
 const frequencyMinor=previous.length?Math.round((current.length-previous.length)*previousMinor/previous.length):undefined;
 return {currentMinor,previousMinor,deltaMinor,currentCount:current.length,previousCount:previous.length,frequencyMinor,ticketMinor:frequencyMinor===undefined?undefined:deltaMinor-frequencyMinor};
}
export function reductionScenario(petty:Transaction[],cards:Transaction[],reducePercent:number,scope:'petty'|'card'|'combined'){
 if(!Number.isFinite(reducePercent)||reducePercent<0||reducePercent>100)throw Error('Choose a reduction percentage between 0 and 100.');
 const rows=[...new Map((scope==='petty'?petty:scope==='card'?cards:[...petty,...cards]).map(t=>[t.id,t])).values()];
 return {rows,baseMinor:sumMinor(rows),reductionMinor:Math.round(sumMinor(rows)*reducePercent/100)};
}
export function spendingCoach(data:AppData,month:string,today:string,account='',pettyLimitMinor=10000){
 if(!Number.isSafeInteger(pettyLimitMinor)||pettyLimitMinor<=0)throw Error('Choose a positive petty-payment limit in paise.');
 const stats=dashboardAnalytics(data,month,today,account),batches=data.statementBatches||[],source=data.statementRows||[];
 const cardAccounts=new Set(source.filter(r=>isCardRow(r,batches)).map(r=>r.account));
 const isCard=(t:Transaction)=>t.paymentMode==='CC'||cardAccounts.has(t.account)||/\bCC\b|credit\s*card/i.test(t.account);
 const eligible=data.transactions.filter(t=>t.status==='active'&&t.currency==='INR'&&t.type==='Revenue Expense'&&t.date<=today&&(!account||t.account===account));
 const previous=eligible.filter(t=>t.date.slice(0,7)===stats.previousMonth&&Number(t.date.slice(8))<=stats.previousDays);
 const petty=stats.expenses.filter(t=>t.amountMinor>0&&t.amountMinor<=pettyLimitMinor),cards=stats.expenses.filter(isCard),overlap=petty.filter(isCard);
 const previousPetty=previous.filter(t=>t.amountMinor>0&&t.amountMinor<=pettyLimitMinor),previousCards=previous.filter(isCard);
 const vendors=groupExpenses(petty,t=>clean(t.purchasedFrom||t.heading||'Unnamed payment')).map(g=>({...g,name:g.rows[0].purchasedFrom||g.rows[0].heading||'Unnamed payment',days:new Set(g.rows.map(t=>t.date)).size}));
 const repeated=vendors.filter(g=>g.count>=3&&g.days>=2&&clean(g.name)!=='unnamed payment');
 const amounts=groupExpenses(petty,t=>String(t.amountMinor)).sort((a,b)=>b.count-a.count||b.amountMinor-a.amountMinor);
 const categoryChanges=[...new Set([...stats.expenses,...previous].map(t=>t.majorCategory||'Uncategorised'))].map(category=>{const current=stats.expenses.filter(t=>(t.majorCategory||'Uncategorised')===category),old=previous.filter(t=>(t.majorCategory||'Uncategorised')===category);return {category,rows:current,previous:old,...spendChange(current,old)};}).sort((a,b)=>b.deltaMinor-a.deltaMinor);
 const cardRows=source.filter(r=>(!account||r.account===account)&&r.date<=stats.end&&isCardRow(r,batches));
 const currentCardRows=cardRows.filter(r=>r.date.slice(0,7)===month),held=cardRows.filter(r=>r.cardHold&&!r.cardSettlementId&&r.status!=='ignored');
 const feeRows=currentCardRows.filter(r=>r.direction==='debit'&&cardKind(r)==='fee');
 const unclear=currentCardRows.filter(r=>cardKind(r)==='other'&&rowState(r,data.transactions).status==='pending');
 const payments=currentCardRows.filter(r=>r.direction==='credit'&&cardKind(r)==='payment');
 const incorrectlyPosted=payments.filter(r=>data.transactions.some(t=>t.id===r.transactionId&&t.status==='active'&&['Revenue Expense','Income Misc'].includes(t.type)));
 const refunds=currentCardRows.filter(r=>r.direction==='credit'&&cardKind(r)==='refund'&&!r.cardSettlementId&&r.status!=='ignored');
 const selectedBatches=batches.filter(b=>b.kind==='card'&&b.to<=stats.end&&b.to>=month+'-01'&&source.some(r=>(b.rowIds?b.rowIds.includes(r.id):r.batchId===b.id)&&(!account||r.account===account)));
 const latest=new Map<string,typeof selectedBatches[number]>();for(const b of [...selectedBatches].sort((a,b)=>b.to.localeCompare(a.to))){const acct=b.cashback?.account||source.find(r=>b.rowIds?b.rowIds.includes(r.id):r.batchId===b.id)?.account;if(acct&&!latest.has(acct))latest.set(acct,b);}
 const cashback=[...latest.values()].map(batch=>({batch,result:compareCashback(batch,batches,source,data.transactions)}));
 const reviewRows=source.filter(r=>(!account||r.account===account)&&r.date.slice(0,7)===month&&r.date<=today&&rowState(r,data.transactions).status==='pending');
 const habitRows=source.filter(r=>(!account||r.account===account)&&r.date.slice(0,7)===month&&r.date<=today&&r.direction==='debit'&&!r.cardSettlementId&&r.status!=='ignored'&&(!isCardRow(r,batches)||cardKind(r)==='purchase')&&r.amountMinor<=pettyLimitMinor&&(!r.transactionId||!data.transactions.some(t=>t.id===r.transactionId&&t.status==='active'&&t.type!=='Revenue Expense')));
 const weeklyPetty=stats.weekly.filter(t=>t.amountMinor>0&&t.amountMinor<=pettyLimitMinor),weeklyCards=stats.weekly.filter(isCard);
 const outlierCards=cards.filter(t=>{const prior=previousCards.filter(p=>clean(p.purchasedFrom||p.heading||'')===clean(t.purchasedFrom||t.heading||'')&&clean(t.purchasedFrom||t.heading||''));if(prior.length<3)return false;const amounts=prior.map(p=>p.amountMinor).sort((a,b)=>a-b),middle=Math.floor(amounts.length/2),median=amounts.length%2?amounts[middle]:(amounts[middle-1]+amounts[middle])/2;return median>0&&t.amountMinor>=median*2;});
 return {stats,currentMonth:month===today.slice(0,7),pettyLimitMinor,petty,cards,overlap,previous,previousPetty,previousCards,pettyChange:spendChange(petty,previousPetty),cardChange:spendChange(cards,previousCards),categoryChanges,vendors,repeated,amounts,cardCategories:groupExpenses(cards,t=>t.majorCategory),cardAccounts:groupExpenses(cards,t=>t.account),held,feeRows,unclear,payments,incorrectlyPosted,refunds,cashback,reviewRows,habitRows,weeklyPetty,weeklyCards,outlierCards};
}
export type CoachAnalysis=ReturnType<typeof spendingCoach>;
export const coachQuestions=[['petty','Where do my petty payments add up?'],['card','What is driving my card spending?'],['change','Why did my spending change?'],['week','What should I review this week?'],['income','How much income remains?'],['refunds','Which card items need attention?']] as const;
export function answerCoach(question:string,c:CoachAnalysis):{text:string;rows:Transaction[];sources:StatementRow[]}{
 const {stats:s}=c,m=coachMoney;
 if(question==='petty'){const top=c.vendors[0];return {text:`${c.petty.length} payments of ${m(c.pettyLimitMinor)} or less total ${m(sumMinor(c.petty))}, ${percentage(sumMinor(c.petty),s.expenseMinor)} of recorded personal spending.${top?` The largest petty-payment vendor/description is ${top.name}: ${m(top.amountMinor)} across ${top.count} payments.`:''} Small does not mean unnecessary.`,rows:c.petty,sources:[]};}
 if(question==='card'){const top=c.cardCategories[0];return {text:`Posted card personal expenses total ${m(sumMinor(c.cards))} across ${c.cards.length} entries.${top?` ${top.name} accounts for ${m(top.amountMinor)} (${percentage(top.amountMinor,sumMinor(c.cards))}).`:''} ${c.overlap.length} petty payments also used a card; they are part of both views, not additional spending. Pending statement purchases and capital allocations are excluded.`,rows:c.cards,sources:[]};}
 if(question==='change'){const driver=c.categoryChanges.find(g=>g.deltaMinor>0),diff=s.expenseMinor-s.previousMinor;return {text:`Recorded personal spending changed by ${m(diff)} against ${s.previousMonth}${c.currentMonth?` through day ${s.previousDays}`:''}.${driver?` The largest upward category movement is ${driver.category}: ${m(driver.deltaMinor)}.${!driver.previousCount?' No entries were recorded for it in the comparison period; this does not prove the expense is new.':''}`:''} Comparisons reflect available entries, not proven complete coverage.`,rows:[...s.expenses,...c.previous],sources:[]};}
 if(question==='week')return {text:`${s.weekStart}–${s.end}: ${m(s.weeklyMinor)} across ${s.weekly.length} personal expenses. Petty payments contribute ${m(sumMinor(c.weeklyPetty))}; card spending contributes ${m(sumMinor(c.weeklyCards))}. These groups can overlap. Previous week, same elapsed weekdays: ${m(s.previousWeeklyMinor)}. ${c.reviewRows.length} imported movements await review in the selected month.`,rows:s.weekly,sources:c.reviewRows};
 if(question==='income')return {text:s.incomeMinor===undefined?'Income is missing for this view. Enter a monthly total, or record income for the selected account, before estimating income remaining.':`${m(s.incomeMinor)} ${s.incomeSource==='entered'?'entered income':'recorded income, possibly incomplete'} less ${m(s.expenseMinor)} personal expenses leaves ${m(s.remainingMinor!)}. This excludes loans, investments, capital and household allocations, so it is neither confirmed savings nor a bank balance.`,rows:s.rows,sources:[]};
 if(question==='refunds')return {text:`${c.held.length} held movements across statements through ${s.end}; ${c.refunds.length} refund/reversal credits available for review this month; ${c.feeRows.length} fee/interest debits; ${c.incorrectlyPosted.length} bill-payment links need classification review. A held purchase is not proof that a refund is due. No entries are changed automatically.`,rows:[],sources:[...new Map([...c.held,...c.refunds,...c.feeRows,...c.incorrectlyPosted].map(r=>[r.id,r])).values()]};
 return {text:'Choose one of the guided questions. This private rules-based assistant does not interpret unrestricted chat.',rows:[],sources:[]};
}
