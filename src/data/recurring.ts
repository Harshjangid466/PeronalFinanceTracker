import type {AppData,Recurring} from './types';
import {addDays,addMonths} from './format';
export function nextRecurringDate(r:Recurring):string{
 if(r.frequency==='Weekly')return addDays(r.nextDueDate,7);
 if(r.frequency==='Custom')return Number.isInteger(r.customIntervalDays)&&r.customIntervalDays!>0?addDays(r.nextDueDate,r.customIntervalDays!):r.nextDueDate;
 const months={Monthly:1,Quarterly:3,'Half-yearly':6,Yearly:12}[r.frequency]||1;
 const month=addMonths(r.nextDueDate.slice(0,7)+'-01',months).slice(0,7);
 const [year,m]=month.split('-').map(Number),last=new Date(Date.UTC(year,m,0)).getUTCDate();
 const anchor=r.scheduleDay||Number(r.startDate.slice(-2));
 return `${month}-${String(Math.min(anchor,last)).padStart(2,'0')}`;
}
export function recurringIsDue(r:Recurring,today:string){
 const validDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
 return !!r.automaticPosting&&validDate(r.nextDueDate)&&validDate(r.startDate)&&(!r.endDate||validDate(r.endDate))&&r.nextDueDate>=r.startDate&&(!r.scheduleDay||Number.isInteger(r.scheduleDay)&&r.scheduleDay>=1&&r.scheduleDay<=31)&&!['Paused','Cancelled','Completed'].includes(r.status||'')&&r.nextDueDate<=today&&(!r.endDate||r.nextDueDate<=r.endDate)&&(r.frequency!=='Custom'||Number.isInteger(r.customIntervalDays)&&r.customIntervalDays!>0);
}
export function processRecurringDue(data:AppData,today:string,post:(data:AppData,id:string)=>AppData):AppData{
 let next=data;
 for(const template of data.recurring){let r=next.recurring.find(x=>x.id===template.id);
  while(r&&recurringIsDue(r,today)){
   const date=r.nextDueDate;
   if(next.transactions.some(t=>t.recurringTemplateId===r!.id&&t.recurringOccurrenceDate===date)||next.skippedOccurrences?.includes(`${r.id}|${date}`)){
    const due=nextRecurringDate(r);next={...next,recurring:next.recurring.map(x=>x.id===r!.id?{...x,nextDueDate:due,status:x.endDate&&due>x.endDate?'Completed':'Scheduled'}:x)};
   }else next=post(next,r.id);
   r=next.recurring.find(x=>x.id===template.id);if(r?.nextDueDate===date)break;
  }
 }
 return next;
}
