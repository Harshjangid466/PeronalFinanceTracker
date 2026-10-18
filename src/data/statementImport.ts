import {rowId,type StatementRow} from './statements';
import {parseCSV} from './importExport';
export interface PdfTextItem {str:string;x:number;y:number;}
export interface PdfTextPage {width:number;items:PdfTextItem[];}
export function moneyMinor(text:string):number{
 const s=text.replace(/(?:INR|Rs\.?|₹|,|\s)/gi,'');if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error(`Invalid amount: ${text}`);
 const [whole,fraction='']=s.split('.');const value=Number(whole)*100+Number(fraction.padEnd(2,'0'));if(!Number.isSafeInteger(value))throw Error('Amount is too large');return value;
}
export function signedMoneyMinor(text:string):number{
 const negative=/^\s*-/.test(text)||/^\s*\(.*\)\s*$/.test(text);return (negative?-1:1)*moneyMinor(text.replace(/^\s*[+-]/,'').replace(/^\s*\(/,'').replace(/\)\s*$/,''));
}
export function dateISO(text:string,order:'DMY'|'MDY'='DMY'):string{
 let s=text.trim().split(/[ T]/)[0];if(!/^\d{4}-\d{2}-\d{2}$/.test(s)){
  const m=s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);if(!m)throw Error(`Unsupported date: ${text}`);
  const year=m[3].length===2?'20'+m[3]:m[3];s=`${year}-${(order==='DMY'?m[2]:m[1]).padStart(2,'0')}-${(order==='DMY'?m[1]:m[2]).padStart(2,'0')}`;
 }
 const d=new Date(s+'T00:00:00Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==s)throw Error(`Invalid date: ${text}`);return s;
}
function lines(items:PdfTextItem[]):string[]{
 const groups:{y:number;items:PdfTextItem[]}[]=[];
 for(const item of [...items].sort((a,b)=>b.y-a.y||a.x-b.x)){
  const group=groups.find(g=>Math.abs(g.y-item.y)<3);if(group)group.items.push(item);else groups.push({y:item.y,items:[item]});
 }
 return groups.map(g=>g.items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' ').replace(/\s+/g,' ').trim());
}
export function parsePaytmPages(pages:PdfTextPage[],batchId:string):StatementRow[]{
 const flat=pages.map(p=>p.items.map(i=>i.str).join(' ')).join(' ');
 if(!/Paytm\s+Statement\s+for/i.test(flat))throw Error('This is not a supported Paytm UPI statement.');
 const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
 // PDF exports vary the date spelling, spacing and dash without changing the selected period.
 const monthName='(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
 const dateToken=`(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\s*[/.-]\\s*\\d{1,2}\\s*[/.-]\\s*(?:\\d{4}|\\d{2})|\\d{1,2}\\s*${monthName}\\s*['’]?\\s*(?:\\d{4}|\\d{2}))`;
 const period=flat.replace(/[\u2010-\u2015\u2212]/g,'-').match(new RegExp(`Paytm\\s+Statement\\s+for\\s*:?\\s*(${dateToken})\\s*(?:-|to)\\s*(${dateToken})(?!\\d)`,'i'));
 if(!period)throw Error('Could not identify the statement period. The PDF must show a complete start and end date.');
 const printedDate=(text:string)=>{
  const named=text.match(/^(\d{1,2})\s*([A-Za-z]+)\s*['’]?\s*(\d{4}|\d{2})$/);
  if(!named)return dateISO(text.replace(/\s+/g,''));
  const year=named[3].length===2?'20'+named[3]:named[3];
  return dateISO(`${year}-${String(months.indexOf(named[2].slice(0,3).toUpperCase())+1).padStart(2,'0')}-${named[1].padStart(2,'0')}`);
 };
 const periodStart=printedDate(period[1]),periodEnd=printedDate(period[2]);
 if(periodStart>periodEnd)throw Error('The printed statement start date is after its end date.');
 const firstYear=Number(periodStart.slice(0,4)),lastYear=Number(periodEnd.slice(0,4));
 const rows:StatementRow[]=[];
 for(const [pageIndex,p] of pages.entries()){
  const dateItems=p.items.filter(i=>i.x<p.width*.145);const dateLines=lines(dateItems);
  const anchors=dateLines.filter(l=>/^\d{2}\s+[A-Za-z]{3}$/.test(l)).map(l=>{
   const [day,month]=l.split(' ');const candidates=p.items.filter(i=>i.x<p.width*.145&&(i.str.trim()===`${day} ${month}`||(i.str.trim()===day&&p.items.some(m=>m.x<p.width*.145&&m.str.trim()===month&&Math.abs(m.y-i.y)<3))));
   return candidates.map(i=>({day,month,y:i.y}));
  }).flat().filter((a,i,all)=>all.findIndex(b=>Math.abs(b.y-a.y)<3)===i).sort((a,b)=>b.y-a.y);
  for(let i=0;i<anchors.length;i++){
   const a=anchors[i];const bottom=anchors[i+1]?.y??40;
   const band=p.items.filter(t=>t.y<=a.y+3&&t.y>bottom+3);
   const col=(lo:number,hi:number)=>lines(band.filter(t=>t.x>=p.width*lo&&t.x<p.width*hi)).join('\n');
   const detail=col(.145,.48);const notes=col(.48,.66);const accountText=col(.66,.815).replace(/\s+/g,' ');
   const amountText=col(.815,1);const ref=detail.match(/UPI Ref No:\s*(\d+)/i);
   if(!ref)throw Error(`A Paytm row has no UPI reference (${a.day} ${a.month}, ${detail.slice(0,80)}). Nothing was imported.`);
   const amount=amountText.match(/([+-])?\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i);if(!amount)throw Error('Could not read a Paytm payment amount.');
   const accountMatch=accountText.match(/(HDFC Bank|State Bank Of India|Bank Of Baroda|Other UPI Apps?)(?:\s*-\s*(\d+))?/i);if(!accountMatch)throw Error(`Unrecognised source account in Paytm statement (${a.day} ${a.month}: ${accountText}).`);
   const account=accountMatch[1].startsWith('Other UPI')?accountText:accountMatch[1]+(accountMatch[2]?' - '+accountMatch[2]:'');
   const time=col(0,.145).match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);const hh=time?(Number(time[1])%12+(time[3].toUpperCase()==='PM'?12:0)):undefined;
   const month=months.indexOf(a.month.toUpperCase())+1;const year=firstYear!==lastYear&&month<=Number(periodEnd.slice(5,7))?lastYear:firstYear;
   const date=dateISO(`${year}-${String(month).padStart(2,'0')}-${a.day}`);if(date<periodStart||date>periodEnd)throw Error('Transaction outside statement period.');
   const amountMinor=moneyMinor(amount[2]);if(amountMinor<=0)throw Error('Zero payment row needs manual review.');
   const vendor=detail.split(/UPI ID:|UPI Ref No:/i)[0].replace(/\s+/g,' ').replace(/^(Paid to|Money sent to|Money received from|Received from)\s*/i,'').trim();
   const note=(notes.match(/Note:\s*([\s\S]*?)(?:Tag:|$)/i)?.[1]||'').replace(/\s+/g,' ').trim();
   const direction=/Transferred to Self/i.test(detail)?'self':amount[1]==='+'?'credit':amount[1]==='-'?'debit':undefined;
   if(!direction)throw Error('Could not determine payment direction.');
   rows.push({id:rowId('paytm',account,ref[1],date,amountMinor,vendor),batchId,source:'paytm',date,time:hh===undefined?undefined:`${String(hh).padStart(2,'0')}:${time![2]}`,vendor,note,account,reference:ref[1],amountMinor,direction,status:'pending',sourcePage:pageIndex+1,originalAccount:account,originalDate:`${a.day} ${a.month}`});
  }
 }
 if(!rows.length)throw Error('No readable payments found. Scanned PDFs are not supported.');
 if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Repeated reference within the statement.');
 // Reject an incomplete extraction instead of posting a partial statement.
 const paid=flat.match(/Total Money Paid\s*-?\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s*(\d+)\s*Payments? made/i);
 const received=flat.match(/Total Money Received\s*\+?\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s*(\d+)\s*Payments? received/i);
 if(!paid||!received)throw Error('Could not validate the Paytm summary totals.');
 for(const [control,direction] of [[paid,'debit'],[received,'credit']] as const){const subset=rows.filter(r=>r.direction===direction);if(subset.length!==Number(control[2])||subset.reduce((s,r)=>s+r.amountMinor,0)!==moneyMinor(control[1]))throw Error('Extracted payments do not agree with the statement summary. Nothing was imported.');}
 return rows;
}
export interface BankColumns {date:string;description:string;debit:string;credit:string;reference:string;balance:string;dateOrder:'DMY'|'MDY';amount?:string;direction?:string;amountMode?:'separate'|'signed'|'direction';positiveMeans?:'debit'|'credit';}
export function parseBankRows(grid:string[][],mapping:BankColumns,account:string,batchId:string):StatementRow[]{
 if(!account)throw Error('Select the bank account.');const headers=grid[0];const index=(name:string)=>name?headers.indexOf(name):-1;
 const mode=mapping.amountMode||'separate';
 if(index(mapping.date)<0||index(mapping.description)<0||mode==='separate'&&(index(mapping.debit)<0||index(mapping.credit)<0)||mode!=='separate'&&index(mapping.amount||'')<0||mode==='direction'&&index(mapping.direction||'')<0)throw Error('Map the date, description and payment amount/direction columns.');
 if(mode==='signed'&&!mapping.positiveMeans)throw Error('Choose whether positive amounts mean debits or credits.');
 const output:StatementRow[]=[];
 for(const [i,line] of grid.slice(1).entries()){
  if(line.every(v=>!v.trim()))continue;
  const field=(name:string)=>line[index(name)]?.trim()||'';
  let debit=0,credit=0;
  if(mode==='separate'){
   if(!field(mapping.debit)&&!field(mapping.credit))throw Error(`Row ${i+2}: debit and credit are both missing.`);
   debit=field(mapping.debit)?moneyMinor(field(mapping.debit)):0;credit=field(mapping.credit)?moneyMinor(field(mapping.credit)):0;
  }else{
   const raw=field(mapping.amount||'');if(!raw)throw Error(`Row ${i+2}: amount is missing.`);
   const negative=/^\s*-/.test(raw)||/^\s*\(.*\)\s*$/.test(raw);const amount=moneyMinor(raw.replace(/^\s*[+-]/,'').replace(/^\s*\(/,'').replace(/\)\s*$/,''));
   let direction:'debit'|'credit';
   if(mode==='signed')direction=negative?(mapping.positiveMeans==='debit'?'credit':'debit'):mapping.positiveMeans!;
   else{const label=field(mapping.direction||'').toLowerCase();if(['debit','dr','d','purchase'].includes(label))direction='debit';else if(['credit','cr','c'].includes(label))direction='credit';else throw Error(`Row ${i+2}: unrecognised debit/credit label.`);}
   if(direction==='debit')debit=amount;else credit=amount;
  }
  if(debit&&credit)throw Error(`Row ${i+2}: both debit and credit are populated.`);if(!debit&&!credit)continue;
  const date=dateISO(field(mapping.date),mapping.dateOrder),vendor=field(mapping.description),reference=field(mapping.reference),amountMinor=debit||credit;
  const id=rowId('bank',account,reference,date,amountMinor,vendor);
  if(!reference&&output.some(r=>r.id===id))throw Error('Identical bank rows without references need unique statement references.');
  output.push({id,batchId,source:'bank',date,vendor,note:vendor,account,reference,amountMinor,direction:debit?'debit':'credit',status:'pending',sourceRow:i+2,originalAccount:account,originalDate:field(mapping.date),baselineAmountMinor:field(mapping.balance)?signedMoneyMinor(field(mapping.balance)):undefined});
 }
 if(!output.length)throw Error('No debit or credit rows found.');if(new Set(output.map(r=>r.id)).size!==output.length)throw Error('Duplicate statement reference within bank file.');return output;
}
export function readBankCSV(text:string){return parseCSV(text.replace(/^\uFEFF/,''));}
