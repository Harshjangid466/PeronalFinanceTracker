import type {AppData,Transaction} from './types';
import {shiftMonth,sumMinor} from './dashboardAnalytics';
import {personalAnalysis} from './personalAnalysis';
import {configuredType,builtinTypeId,transactionTypeName} from './typeCatalog';
import {formatCurrency} from './format';

export const PATTERN_LIMITS={frequentCount:5,frequentDates:3,sharpPercent:25,sharpMinor:50000,highShare:10,miscMinor:100000,miscShare:20,capexMinor:300000,dayMinor:50000,dayMonthShare:25,dayWeekShare:50} as const;
const normal=(s:string)=>s.normalize('NFKC').trim().toLocaleLowerCase('en-IN').replace(/\s+/g,' ');
const iso=(d:Date)=>d.toISOString().slice(0,10);
const addDays=(date:string,days:number)=>iso(new Date(Date.parse(date+'T12:00:00Z')+days*86400000));
const monthDays=(month:string)=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
const money=(minor:number)=>formatCurrency(minor/100);
export const positiveShare=(part:number,total:number)=>total>0?part/total*100:undefined;
const vendorName=(t:Transaction)=>(t.purchasedFrom||t.heading||'').trim().replace(/\s+/g,' ');
const generic=(name:string)=>!name||/^(unknown|unnamed payment|unlabelled payment|upi|upi payment|bank payment|card payment|payment)$/i.test(name);
export function vendorKey(t:Transaction){return t.merchantId?'id:'+t.merchantId:'name:'+normal(vendorName(t));}
const categoryKey=(t:Transaction)=>JSON.stringify([t.transactionTypeId||builtinTypeId(t.type),t.majorCategoryId||normal(t.majorCategory||'')]);
const misc=(t:Transaction)=>!t.majorCategory.trim()||/^(misc|miscellaneous|other|others|uncategorised|uncategorized)(\s+expenses?)?$/i.test(t.majorCategory.trim());
const assetLike=(t:Transaction)=>/\b(laptop|computer|headphones?|earphones?|furniture|refrigerator|washing machine|appliance|equipment|camera|smartphone|tablet|printer|desk|sofa|vehicle|bicycle)\b/i.test([t.heading,t.remarks,t.purchasedFrom].filter(Boolean).join(' '));

function amounts(rows:Transaction[]){
 const paid=rows.filter(t=>t.amountMinor>0),credits=rows.filter(t=>t.amountMinor<0),paidMinor=sumMinor(paid),creditMinor=sumMinor(credits);
 return {rows,paid,credits,paidMinor,creditMinor,netMinor:paidMinor+creditMinor,count:paid.length,dates:[...new Set(paid.map(t=>t.date))].sort(),averageMinor:paid.length?Math.round(paidMinor/paid.length):undefined};
}
function compare(currentRows:Transaction[],previousRows:Transaction[]){
 const current=amounts(currentRows),previous=amounts(previousRows),grossDeltaMinor=current.paidMinor-previous.paidMinor,creditChangeMinor=current.creditMinor-previous.creditMinor,deltaMinor=grossDeltaMinor+creditChangeMinor;
 const frequencyMinor=previous.count?Math.round((current.count-previous.count)*previous.paidMinor/previous.count):undefined;
 return {current,previous,hasBaseline:previous.count>0,deltaMinor,grossDeltaMinor,creditChangeMinor,percentage:previous.netMinor>0?deltaMinor/previous.netMinor*100:undefined,grossPercentage:previous.paidMinor>0?grossDeltaMinor/previous.paidMinor*100:undefined,frequencyMinor,averageSizeMinor:frequencyMinor===undefined?undefined:grossDeltaMinor-frequencyMinor};
}
export interface PatternSignal {id:string;kind:'category'|'vendor'|'misc'|'day'|'recurring';title:string;reason:string;rows:Transaction[];score:number;vendorKey?:string;day?:string;transactionId?:string;}
export function canReviewCapex(data:AppData,t:Transaction):{allowed:boolean;reason:string}{
 if(t.status!=='active'||t.type!=='Revenue Expense'||t.currency!=='INR'||t.amountMinor<=0)return {allowed:false,reason:'Choose an active positive expense.'};
 if(!configuredType(data,builtinTypeId('CAPEX'))?.active)return {allowed:false,reason:'CAPEX is inactive. Review transaction types in Settings before changing this entry.'};
 if(data.transferLinks?.some(g=>g.status==='active'&&g.previousTransactions.some(x=>x.id===t.id)))return {allowed:false,reason:'This entry is part of a transfer. Review its linked movement first.'};
 if(data.cardSettlements?.some(g=>g.status==='active'&&g.replacementId===t.id))return {allowed:false,reason:'This is a reconciled card-offset expense. Review the offset before changing its financial type.'};
 if(data.reimbursementClaims?.some(g=>g.status==='active'&&(g.expenseId===t.id||g.credits.some(c=>c.transactionId===t.id))))return {allowed:false,reason:'This entry has active reimbursement links. Review those links before changing its financial type.'};
 return {allowed:true,reason:''};
}

export function spendingPatterns(data:AppData,month:string,today:string,account=''){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!/^\d{4}-\d{2}-\d{2}$/.test(today)||month>today.slice(0,7))throw Error('Choose a valid month through today.');
 const elapsed=month===today.slice(0,7)?Number(today.slice(8)):monthDays(month),end=month+'-'+String(elapsed).padStart(2,'0'),previousMonth=shiftMonth(month,-1),days=Math.min(elapsed,monthDays(previousMonth)),comparisonEnd=month+'-'+String(days).padStart(2,'0'),previousEnd=previousMonth+'-'+String(days).padStart(2,'0');
 const active=data.transactions.filter(t=>t.status==='active'&&t.type==='Revenue Expense'&&t.currency==='INR'&&Number.isSafeInteger(t.amountMinor)&&t.date<=end&&(!account||t.account===account));
 const rows=active.filter(t=>t.date.slice(0,7)===month),currentComparison=rows.filter(t=>t.date<=comparisonEnd),previous=active.filter(t=>t.date>=previousMonth+'-01'&&t.date<=previousEnd),overall=amounts(rows);
 const comparison={...compare(currentComparison,previous),days,start:month+'-01',end:comparisonEnd,previousStart:previousMonth+'-01',previousEnd,currentMinor:sumMinor(currentComparison),previousMinor:sumMinor(previous)};
 function groups(key:(t:Transaction)=>string){
  const entries=new Map<string,Transaction[]>(),old=new Map<string,Transaction[]>();
  for(const t of rows)entries.set(key(t),[...(entries.get(key(t))||[]),t]);
  for(const t of previous)old.set(key(t),[...(old.get(key(t))||[]),t]);
  return [...entries].map(([id,entries])=>({...amounts(entries),key:id,compare:compare(entries.filter(t=>t.date<=comparisonEnd),old.get(id)||[])}));
 }
 const vendors=groups(vendorKey).map(g=>({...g,name:vendorName(g.rows[0])||'Unnamed payment',named:!generic(vendorName(g.rows[0])),categories:[...new Set(g.rows.map(t=>t.majorCategory||'Uncategorised'))],share:positiveShare(g.paidMinor,overall.paidMinor)})).sort((a,b)=>b.paidMinor-a.paidMinor||a.name.localeCompare(b.name));
 const categories=groups(categoryKey).map(g=>{const t=g.rows[0],typeName=transactionTypeName(data,t),name=t.majorCategory||'Uncategorised';return {...g,name,label:t.transactionTypeId&&t.transactionTypeId!==builtinTypeId('Revenue Expense')?`${name} (${typeName})`:name,share:positiveShare(g.paidMinor,overall.paidMinor)};}).sort((a,b)=>b.paidMinor-a.paidMinor||a.label.localeCompare(b.label));
 const dayGroups=new Map<string,Transaction[]>();for(const t of rows)dayGroups.set(t.date,[...(dayGroups.get(t.date)||[]),t]);
 const dayDetails=[...dayGroups].map(([date,entries])=>{
  const weekday=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7,weekStart=addDays(date,-weekday),weekEnd=[addDays(weekStart,6),end].sort()[0],week=active.filter(t=>t.date>=weekStart&&t.date<=weekEnd),day=amounts(entries),weekPaidMinor=sumMinor(week.filter(t=>t.amountMinor>0));
  return {...day,date,weekStart,weekEnd,weekRows:week,weekPaidMinor,monthShare:positiveShare(day.paidMinor,overall.paidMinor),weekShare:positiveShare(day.paidMinor,weekPaidMinor)};
 }).sort((a,b)=>a.date.localeCompare(b.date));
 const capexCandidates=overall.paid.filter(t=>t.amountMinor>=PATTERN_LIMITS.capexMinor&&(misc(t)||assetLike(t))).sort((a,b)=>b.amountMinor-a.amountMinor||a.id.localeCompare(b.id));
 const monthly=personalAnalysis(data,month,today,account).recurring.filter(r=>!generic(r.name)).map(r=>({...r,frequency:'Monthly' as const,typicalMinor:r.monthlyMinor}));
 const weeklyGroups=new Map<string,Transaction[]>(),weeklyStart=addDays(end,-27);
 for(const t of active.filter(t=>t.amountMinor>0&&t.date>=weeklyStart&&!generic(vendorName(t)))){
  const key=JSON.stringify([vendorKey(t),t.account,categoryKey(t)]);weeklyGroups.set(key,[...(weeklyGroups.get(key)||[]),t]);
 }
 const weekly=[...weeklyGroups].flatMap(([key,entries])=>{
  const sample=[...entries].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));if(sample.length<3||sample.length>5)return [];
  const values=sample.map(t=>t.amountMinor).sort((a,b)=>a-b),mid=Math.floor(values.length/2),typicalMinor=Math.round(values.length%2?values[mid]:(values[mid-1]+values[mid])/2),last=sample[sample.length-1];
  if(last.date<addDays(end,-14)||sample.some(t=>Math.abs(t.amountMinor-typicalMinor)>typicalMinor*.15)||sample.slice(1).some((t,i)=>{const gap=(Date.parse(t.date)-Date.parse(sample[i].date))/86400000;return gap<6||gap>8;}))return [];
  return [{key:'weekly:'+key,name:vendorName(last),account:last.account,frequency:'Weekly' as const,typicalMinor,annualMinor:typicalMinor*52,rows:sample,lastDate:last.date}];
 });
 const recurring=[...monthly,...weekly].sort((a,b)=>b.typicalMinor-a.typicalMinor||a.name.localeCompare(b.name));
 const signals:PatternSignal[]=[];
 const frequent=(g:ReturnType<typeof amounts>)=>g.count>=PATTERN_LIMITS.frequentCount&&g.dates.length>=PATTERN_LIMITS.frequentDates;
 for(const g of categories){
  const c=g.compare,sharp=c.grossDeltaMinor>=PATTERN_LIMITS.sharpMinor&&(c.grossPercentage??0)>=PATTERN_LIMITS.sharpPercent;
  if(!sharp&&!frequent(g))continue;
  signals.push({id:'category:'+g.key,kind:'category',title:sharp?`${g.label}: paid spending increased ${c.grossPercentage!.toFixed(1)}%`:`${g.label}: frequent payments`,reason:sharp?`${money(c.current.paidMinor)} versus ${money(c.previous.paidMinor)} in the matched periods; ${money(c.grossDeltaMinor)} higher. ${c.current.count} paid entries versus ${c.previous.count}.`:`${money(g.paidMinor)} across ${g.count} paid entries on ${g.dates.length} dates in this view. You decide whether to change this pattern.`,rows:g.rows,score:sharp?c.grossDeltaMinor:g.paidMinor});
 }
 for(const v of vendors){if(!v.named||v.count<3||v.dates.length<3||!frequent(v)&&(v.share??0)<PATTERN_LIMITS.highShare)continue;
  signals.push({id:'vendor:'+v.key,kind:'vendor',title:`${v.name}: ${v.count} payments on ${v.dates.length} dates`,reason:`${money(v.paidMinor)} paid, ${v.share?.toFixed(1)}% of recorded paid spending. ${v.compare.hasBaseline?`Matched prior period: ${v.compare.previous.count} payments, ${money(v.compare.previous.paidMinor)}.`:'No recorded purchase baseline in the matched prior period.'}`,rows:v.rows,vendorKey:v.key,score:v.paidMinor});
 }
 const miscRows=overall.paid.filter(t=>{if(!misc(t)||t.amountMinor<PATTERN_LIMITS.miscMinor)return false;const category=categories.find(c=>c.key===categoryKey(t));return (positiveShare(t.amountMinor,category?.paidMinor||0)??0)>=PATTERN_LIMITS.miscShare;});
 for(const t of [...new Map([...miscRows,...capexCandidates].map(t=>[t.id,t])).values()])signals.push({id:'purchase:'+t.id,kind:'misc',title:`${money(t.amountMinor)} purchase to review`,reason:`${t.heading||t.purchasedFrom||'Unnamed purchase'} · ${t.majorCategory||'Uncategorised'}. Review the entries and, when appropriate, whether this belongs under CAPEX. Reclassification does not create savings.`,rows:[t],transactionId:t.id,score:t.amountMinor});
 if(overall.dates.length>=3){const concentrated=dayDetails.filter(d=>d.paidMinor>=PATTERN_LIMITS.dayMinor&&((d.monthShare??0)>=PATTERN_LIMITS.dayMonthShare||(d.weekShare??0)>=PATTERN_LIMITS.dayWeekShare)).sort((a,b)=>b.paidMinor-a.paidMinor)[0];if(concentrated)signals.push({id:'day:'+concentrated.date,kind:'day',title:`${concentrated.date}: ${concentrated.monthShare!.toFixed(1)}% of this month's paid spending`,reason:`${money(concentrated.paidMinor)} across ${concentrated.count} paid entries. ${concentrated.weekShare?.toFixed(1)}% of the recorded week ${concentrated.weekStart}–${concentrated.weekEnd}.`,rows:concentrated.rows,day:concentrated.date,score:concentrated.paidMinor});}
 if(recurring.length)signals.push({id:'recurring',kind:'recurring',title:`${recurring.length} likely recurring payment pattern${recurring.length===1?'':'s'}`,reason:recurring.slice(0,3).map(r=>`${r.name}: ${money(r.typicalMinor)} ${r.frequency.toLowerCase()}`).join('; ')+'. Observations require your review; no commitment or template has been created.',rows:[...new Map(recurring.flatMap(r=>r.rows).map(t=>[t.id,t])).values()],score:Math.max(...recurring.map(r=>r.typicalMinor))});
 signals.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 return {month,end,rows,paid:overall.paid,credits:overall.credits,grossMinor:overall.paidMinor,creditMinor:overall.creditMinor,totalMinor:overall.netMinor,count:overall.count,comparison,previousMonth,vendors,categories,days:dayDetails,capexCandidates,recurring,signals:signals.slice(0,8),signalCount:signals.length,limits:PATTERN_LIMITS};
}
export type SpendingPatternsAnalysis=ReturnType<typeof spendingPatterns>;
export type VendorPattern=SpendingPatternsAnalysis['vendors'][number];
export function visitScenario(vendor:Pick<VendorPattern,'count'|'paidMinor'>,visits:number){
 if(!vendor.count||!Number.isSafeInteger(visits)||visits<0||visits>vendor.count)throw Error('Choose a whole number of visits between zero and the recorded count.');
 return {visits,originalCount:vendor.count,baseMinor:vendor.paidMinor,reductionMinor:Math.round(vendor.paidMinor*(vendor.count-visits)/vendor.count)};
}
