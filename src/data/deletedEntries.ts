import type {Transaction,AppData} from './types';
import {entrySource,entrySourceLabels} from './entryManagement';

export const deletionLabels={individual:'Deleted individually', 'import-removal':'Import removed', 'import-undo':'Import posting undone', 'receivable-removal':'Linked receivable deleted','cc-offset':'Card purchase/refund offset',unknown:'Not recorded'};
export const emptyDeletedFilters={search:'',origin:'',account:'',method:'',min:'',max:'',postedFrom:'',postedTo:'',deletedFrom:'',deletedTo:'',sort:'deleted-newest'};
export type DeletedFilters=typeof emptyDeletedFilters;
export function localTimestampDay(timestamp?:number){
 if(!timestamp||!Number.isFinite(timestamp))return '';
 const d=new Date(timestamp);if(Number.isNaN(d.getTime()))return '';
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function filterDeletedEntries(data:AppData,f:DeletedFilters){
 const within=(day:string,from:string,to:string)=>(!from||!!day&&day>=from)&&(!to||!!day&&day<=to);
 return data.transactions.filter(t=>{
  if(t.status!=='deleted')return false;
  const source=entrySource(t,data),method=t.deletedVia||'unknown';
  if(f.origin&&source.kind!==f.origin||f.account&&t.account!==f.account||f.method&&method!==f.method)return false;
  if(f.min&&t.amountMinor<Math.round(Number(f.min)*100)||f.max&&t.amountMinor>Math.round(Number(f.max)*100))return false;
  if(!within(localTimestampDay(t.createdAt),f.postedFrom,f.postedTo)||!within(localTimestampDay(t.deletedAt),f.deletedFrom,f.deletedTo))return false;
  return !f.search.trim()||[t.heading,t.person,t.account,t.majorCategory,t.subCategory,t.remarks,t.date,t.paymentMode,source.fileName,entrySourceLabels[source.kind],deletionLabels[method]].join(' ').toLowerCase().includes(f.search.trim().toLowerCase());
 }).sort((a,b)=>{
  const result=f.sort==='posted-newest'?b.createdAt-a.createdAt:f.sort==='amount-highest'?b.amountMinor-a.amountMinor:f.sort==='amount-lowest'?a.amountMinor-b.amountMinor:f.sort==='date-newest'?b.date.localeCompare(a.date):(b.deletedAt||0)-(a.deletedAt||0);
  return result||b.createdAt-a.createdAt||a.id.localeCompare(b.id);
 });
}
