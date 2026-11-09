import {dateISO,moneyMinor,type PdfTextItem} from './statementImport';
import {rowId,type StatementRow,type CashbackSummary} from './statements';
import {checkStatement} from './statementChecks';
import {cashbackCreditKind,cashbackTotals} from './cashback';
export interface BankPdfPage{width:number;height:number;items:PdfTextItem[];ocr?:boolean;}
export interface BankPdfResult{rows:StatementRow[];kind:'bank'|'card';format:string;openingMinor:number;closingMinor:number;debitMinor:number;creditMinor:number;from?:string;to?:string;warning?:string;cashback?:CashbackSummary;}
const numeric=/^[+-]?(?:[\d,]+\.\d{2}|\.00)(?:\s*(?:DR|CR|D|C))?$/i;
function amount(s:string){return moneyMinor(s.replace(/^[+\-]/,'').replace(/\s*(DR|CR|D|C)$/i,'').replace(/^\.00$/,'0.00'));}
function signed(s:string,card=false){return (/^-/.test(s)||(card?/CR$/i.test(s):/DR$/i.test(s))?-1:1)*amount(s);}
function lines(items:PdfTextItem[]){const out:{y:number;items:PdfTextItem[];text:string}[]=[];for(const i of [...items].filter(i=>i.str.trim()).sort((a,b)=>b.y-a.y||a.x-b.x)){let l=out.find(l=>Math.abs(l.y-i.y)<2.5);if(!l){l={y:i.y,items:[],text:''};out.push(l);}l.items.push(i);}return out.map(l=>({...l,items:l.items.sort((a,b)=>a.x-b.x),text:l.items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' ').replace(/\s+/g,' ').trim()}));}
function controlsBelow(page:BankPdfPage,pattern:RegExp,count:number,minX=0){const ls=lines(page.items);const header=ls.find(l=>pattern.test(l.text));if(!header)throw Error('Statement summary labels could not be read.');const line=ls.find(l=>l.y<header.y&&header.y-l.y<50&&l.items.filter(i=>i.x>=minX&&(numeric.test(i.str.replace(/[`₹]/g,'').trim())||/^\d+$/.test(i.str.trim()))).length>=count);if(!line)throw Error('Statement summary amounts could not be read.');return line.items.filter(i=>i.x>=minX&&(numeric.test(i.str.replace(/[`₹]/g,'').trim())||/^\d+$/.test(i.str.trim()))).map(i=>i.str.replace(/[`₹]/g,'').trim());}
function sourceDate(s:string){const m=s.match(/^(\d{2})\s+([A-Za-z]{3})\s+(\d{2}|\d{4})$/);if(!m)return dateISO(s.split('|')[0]);const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase())+1;if(!month)throw Error('Invalid statement date');return dateISO(`${m[1]}/${month}/${m[3]}`);}
function printedPeriod(pages:BankPdfPage[],format:string):{from:string;to:string}|undefined{
 const pattern=/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}/g;
 for(const p of pages.slice(0,2)){
  let text='';
  if(format==='Axis card'){const label=p.items.find(i=>i.str==='Statement Period');if(label)text=lines(p.items.filter(i=>i.x>=label.x-20&&i.x<label.x+110&&i.y<=label.y+3&&i.y>label.y-25)).map(l=>l.text).join(' ');}
  else{const label=lines(p.items).find(l=>/Statement\s+period|Statement From|Billing Period|From\s*:\s*\d/i.test(l.text));if(label){text=label.text.slice(label.text.search(/Statement\s+period|Statement From|Billing Period|From\s*:/i));if((text.match(pattern)||[]).length<2)text+=' '+lines(p.items.filter(i=>i.y<label.y&&i.y>label.y-20)).map(l=>l.text).join(' ');}}
  const dates=text.match(pattern);if(!dates||dates.length<2)continue;
  const parse=(date:string)=>{if(/^\d{1,2}[/-]/.test(date))return dateISO(date);const pieces=date.replace(/,/g,'').split(/\s+/),day=/^\d/.test(pieces[0])?pieces[0]:pieces[1],name=/^\d/.test(pieces[0])?pieces[1]:pieces[0],year=pieces[2],month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(name.slice(0,3).toLowerCase())+1;return dateISO(`${day}/${month}/${year}`);};
  const from=parse(dates[0]),to=parse(dates[1]);if(from>to)throw Error('Printed statement period is unclear.');return {from,to};
 }
 return undefined;
}
function mode(note:string,kind:'bank'|'card'){return /\bUPI\b/i.test(note)?'UPI':/\b(NEFT|RTGS|IMPS|NET\s?BANKING|BBPS|MB\/IB)\b/i.test(note)?'Net banking':kind==='card'?'CC':undefined;}
function vendorFrom(note:string){const upi=note.match(/UPI-(.*?)(?:-[\w.]+@|@)/i)||note.match(/UPI\/(?:DR|CR)\/\d+\/([^/]+)/i);return (upi?.[1]||note).replace(/^UPI-/i,'').replace(/\s+/g,' ').trim();}
export function parseBankPdf(pages:BankPdfPage[],batchId:string,account:string):BankPdfResult{
 const text=pages.slice(0,2).flatMap(p=>p.items.map(i=>i.str)).join(' ');
 const format=/Withdrawal Amt\./i.test(text)&&/Narration/i.test(text)?'HDFC bank':/STATEMENT OF ACCOUNT/i.test(text)&&/State Bank of India/i.test(text)?'SBI bank':/Axis Bank|Axisbank|AXIS/i.test(text)&&/MERCHANT CATEGORY/i.test(text)?'Axis card':/Swiggy HDFC|HDFC Bank Credit Cards/i.test(text)?'HDFC card':/ICICI Bank/i.test(text)&&/SerNo/i.test(text)?'ICICI card':/SBI Card/i.test(text)?'SBI card':/BOB\s?CARD|BOB Financial/i.test(text)?'BOB card':'';
 if(!format)throw Error('This PDF format is not recognised. Use CSV/XLSX column mapping instead.');
 const period=printedPeriod(pages,format);
 const kind=format.endsWith('bank')?'bank':'card';let openingMinor=0,closingMinor=0,debitMinor=0,creditMinor=0,drCount:number|undefined,crCount:number|undefined;
 if(kind==='bank'){
  const last=pages.find(p=>lines(p.items).some(l=>/Opening Balance.*Dr Count|Brought Forward/.test(l.text)));if(!last)throw Error('Bank statement summary is missing.');
  const values=controlsBelow(last,format==='HDFC bank'?/Opening Balance.*Dr Count/:/Brought Forward/,6);
  openingMinor=signed(values[0]);drCount=Number(values[1]);crCount=Number(values[2]);debitMinor=amount(values[3]);creditMinor=amount(values[4]);closingMinor=signed(values[5]);
 }else if(format==='Axis card'){
  const v=controlsBelow(pages[0],/Previous Balance.*Payments.*Credits.*Purchase/,7);openingMinor=signed(v[0],true);creditMinor=amount(v[1])+amount(v[2]);debitMinor=amount(v[3])+amount(v[4])+amount(v[5]);closingMinor=signed(v[6],true);
 }else if(format==='HDFC card'){
  const v=controlsBelow(pages[0],/PREVIOUS STATEMENT DUES/,5);openingMinor=signed(v[0],true);creditMinor=amount(v[1]);debitMinor=amount(v[2])+amount(v[3]);closingMinor=signed(v[4],true);
 }else if(format==='ICICI card'){
  const v=controlsBelow(pages[0],/Previous Balance.*Purchases.*Cash Advances/,4,pages[0].width*.34);openingMinor=signed(v[0],true);debitMinor=amount(v[1])+amount(v[2]);creditMinor=amount(v[3]);
  const due=lines(pages[0].items).find(l=>/Total Amount due/i.test(l.text));const n=pages[0].items.filter(i=>due&&i.y<due.y&&due.y-i.y<25&&i.x<pages[0].width*.32&&numeric.test(i.str.replace(/[`₹]/g,'').trim())).sort((a,b)=>b.y-a.y)[0];if(!n)throw Error('Card closing balance could not be read.');closingMinor=signed(n.str.replace(/[`₹]/g,''),true);
 }else if(format==='SBI card'){
  const v=controlsBelow(pages[0],/Previous Balance.*Total Outstanding/,5);openingMinor=signed(v[0],true);creditMinor=amount(v[1]);debitMinor=amount(v[2])+amount(v[3]);closingMinor=signed(v[4],true);
 }else{
  const page=pages[0],label=page.items.filter(i=>/^Opening$/i.test(i.str)).sort((a,b)=>b.y-a.y)[0];if(!label)throw Error('Scanned statement opening balance label is unclear.');const values=page.items.filter(i=>label.y-i.y>5&&label.y-i.y<30&&numeric.test(i.str.trim())).sort((a,b)=>a.x-b.x);if(values.length!==4)throw Error('Scanned statement summary could not be validated.');const v=values.map(i=>i.str);openingMinor=signed(v[0],true);creditMinor=amount(v[1]);debitMinor=amount(v[2]);closingMinor=signed(v[3],true);
 }
 const rows:StatementRow[]=[];let running=openingMinor;const fingerprints=new Map<string,number>();const observations=new Set<string>();let cashback:CashbackSummary|undefined;
 let cashbackSummaryInvalid=false;
 for(const p of pages){if(lines(p.items).some(l=>/^Cashback Earned\s+Cashback Credited$/i.test(l.text))){try{const v=controlsBelow(p,/^Cashback Earned\s+Cashback Credited$/i,2);const c={account,earnedMinor:signed(v[0]),creditedMinor:amount(v[1])};if(cashback&&JSON.stringify(cashback)!==JSON.stringify(c))throw Error('Conflicting cashback summaries');cashback=c;}catch{cashbackSummaryInvalid=true;observations.add('Cashback summary could not be verified; compare its source before recognising rewards.');}}}
 if(cashbackSummaryInvalid)cashback=undefined;
 for(const [pageNo,p] of pages.entries()){
  const ls=lines(p.items);let dateX=0,dateEnd=0,descStart=0,descEnd=0,amountStart=0,amountEnd=p.width,headerY=p.height,footerY=60,refStart=0,refEnd=0,cashbackStart:number|undefined;
  if(format==='HDFC bank'){dateEnd=65;descStart=65;descEnd=282;refStart=282;refEnd=358;amountStart=400;footerY=ls.find(l=>/STATEMENT SUMMARY/.test(l.text))?.y||65;const head=ls.find(l=>/Date.*Narration.*Withdrawal/.test(l.text));headerY=head?.y||(pageNo?625:0);}
  if(format==='SBI bank'){dateEnd=77;descStart=138;descEnd=300;refStart=300;refEnd=339;amountStart=340;footerY=55;const head=p.items.find(i=>i.str.trim()==='Balance'&&i.x>p.width*.8);if(!head)continue;headerY=head.y;footerY=ls.find(l=>/Statement Summary/.test(l.text))?.y||footerY;}
  if(format==='Axis card'){const head=ls.find(l=>/DATE.*TRANSACTION DETAILS.*AMOUNT/.test(l.text));if(!head)continue;headerY=head.y;dateEnd=head.items.find(i=>i.str==='DATE')!.x+40;descStart=dateEnd;descEnd=head.items.find(i=>/MERCHANT CATEGORY/.test(i.str))!.x-25;amountStart=head.items.find(i=>/AMOUNT/.test(i.str))!.x-25;const rewards=head.items.find(i=>/CASHBACK EARNED/.test(i.str));amountEnd=rewards?rewards.x-20:p.width;cashbackStart=rewards?amountEnd:undefined;}
  if(format==='HDFC card'){const head=ls.find(l=>/DATE & TIME.*TRANSACTION DESCRIPTION/.test(l.text));if(!head)continue;headerY=head.y;dateX=160;dateEnd=250;descStart=250;descEnd=515;amountStart=515;amountEnd=566;footerY=ls.find(l=>/Cash Back Summary/.test(l.text))?.y||30;}
  if(format==='ICICI card'){const head=ls.find(l=>/Date.*SerNo.*Transaction Details/.test(l.text));if(!head)continue;headerY=head.y;dateX=200;dateEnd=250;refStart=250;refEnd=304;descStart=304;descEnd=440;amountStart=518;footerY=ls.find(l=>/International Spends/.test(l.text))?.y||100;}
  if(format==='SBI card'){const head=ls.find(l=>/Date.*Amount/.test(l.text));if(!head)continue;headerY=head.y;dateEnd=65;descStart=65;descEnd=360;amountStart=365;amountEnd=430;footerY=160;}
  if(format==='BOB card'){const head=p.items.find(i=>/^Date$/i.test(i.str)&&i.x<p.width*.12&&p.items.some(j=>/Particulars/i.test(j.str)&&Math.abs(i.y-j.y)<10));if(!head)continue;headerY=head.y;dateEnd=p.width*.12;refStart=dateEnd;refEnd=p.width*.19;descStart=refEnd;descEnd=p.width*.56;amountStart=p.width*.86;footerY=100;}
  const end=ls.find(l=>l.y<headerY&&l.y>footerY&&/^(?:\*+\s*)?End of (?:Statement|Transactions)\b|^Cash\s?Back Summary\b|^Rewards? Summary\b/i.test(l.text));
  if(end){footerY=end.y;observations.add('Detected the transaction table boundary; excluded the following statement/reward summary from movements.');}
  const scale=format==='BOB card'?1:p.width/(format==='HDFC bank'?638:format==='SBI bank'?595:format==='SBI card'?611:format==='ICICI card'?595:format==='HDFC card'?595:p.width);
  const col=(band:PdfTextItem[],lo:number,hi:number)=>lines(band.filter(i=>i.x>=lo*scale&&i.x<hi*scale)).map(l=>l.text).join(' ');
  const anchors=ls.filter(l=>l.y<headerY-3&&l.y>footerY).flatMap(l=>{const s=col(l.items,dateX,dateEnd).trim();if(/^\d{2}[/-]\d{2}[/-](?:\d{4}|\d{2})(?:\|.*)?$/.test(s)||/^\d{2}\s+[A-Za-z]{3}\s+\d{2}$/.test(s))return [{y:l.y,date:s}];return [];});
  if(format==='HDFC bank'&&pageNo&&rows.length){const continuation=col(p.items.filter(i=>i.y<headerY&&i.y>(anchors[0]?.y??footerY)+3),descStart,descEnd);if(continuation){const last=rows[rows.length-1];last.note+=' '+continuation;last.vendor=vendorFrom(last.note);last.paymentMode=mode(last.note,kind);}}
  for(const [index,a] of anchors.entries()){
   const tolerance=format==='SBI bank'||p.ocr?8:3;const bottom=anchors[index+1]?.y??footerY;const band=p.items.filter(i=>i.y<=a.y+tolerance&&i.y>bottom+tolerance);
   const note=col(band,descStart,descEnd).trim();if(!note)throw Error(`Page ${pageNo+1}: payment description is missing.`);
   const date=sourceDate(a.date),rawValueDate=kind==='bank'?col(band,format==='HDFC bank'?358:77,format==='HDFC bank'?400:138).trim():'';
   const valueDate=rawValueDate?sourceDate(rawValueDate):undefined;
   if(period&&(date<period.from||date>period.to)&&(!valueDate||valueDate<period.from||valueDate>period.to)){
    if(kind==='card'&&date<period.from)observations.add('The card lists transaction dates before its printed billing period. Original dates are retained; debit and credit totals were checked against this statement.');
    else throw Error(`Movement ${date} is outside printed period ${period.from}–${period.to}. Check the source.`);
   }let minor=0,direction:'debit'|'credit',balance:number|undefined;
   if(kind==='bank'){
    const debit=col(band,amountStart,format==='HDFC bank'?488:417).trim().replace(/^[-–]$/,'');const credit=col(band,format==='HDFC bank'?488:417,format==='HDFC bank'?560:495).trim().replace(/^[-–]$/,'');
    const d=debit?amount(debit):0,c=credit?amount(credit):0;if((d>0)===(c>0))throw Error(`Page ${pageNo+1}: debit/credit columns are unclear.`);minor=d||c;direction=d?'debit':'credit';const raw=col(band,format==='HDFC bank'?560:495,p.width/scale).trim();balance=signed(raw);
    running+=direction==='credit'?minor:-minor;if(running!==balance)throw Error(`Page ${pageNo+1}: running balance does not agree. Nothing imported.`);
   }else{
    // Amounts belong to the dated baseline, not the entire space before the next date.
    const amountLines=lines(band.filter(i=>i.x>=amountStart*scale&&i.x<amountEnd*scale)).filter(l=>/\d/.test(l.text)).sort((x,y)=>Math.abs(x.y-a.y)-Math.abs(y.y-a.y));
    const closest=amountLines[0];if(!closest||Math.abs(closest.y-a.y)>12)throw Error(`Page ${pageNo+1}: no amount aligned with movement ${date}. Nothing imported.`);
    if(amountLines.length>1)observations.add('Excluded non-row amounts below a dated movement. All retained debit/credit amounts were checked against the source totals.');
    const raw=closest.text.replace(/[₹`]/g,'').replace(/(^|\s)C\s+(?=\d)/,'$1').trim();const m=raw.match(/^([+\-])?\s*([\d,]+\.\d{2})\s*(DR|CR|D|C)?$/i);if(!m)throw Error(`Page ${pageNo+1}: card amount is unclear.`);minor=amount(m[2]);direction=m[1]==='+'||/^(CR|C)$/i.test(m[3]||'')?'credit':'debit';
   }
   if(!minor)throw Error('Zero movement needs manual inspection.');const reference=(refEnd?col(band,refStart,refEnd).replace(/^[-–]$/,''):'')||note.match(/Ref#\s*(\d+)|UPI\/(?:DR|CR)\/(\d+)/i)?.slice(1).find(Boolean)||'';
   let cashbackEarnedMinor:number|undefined;
   if(cashbackStart!==undefined){const raw=col(band.filter(i=>Math.abs(i.y-a.y)<=tolerance),cashbackStart,p.width/scale).trim().replace(/[₹`]/g,'');const m=raw.match(/^([\d,]+\.\d{2})\s*(CR|DR)$/i);if(m)cashbackEarnedMinor=amount(m[1])*(m[2].toUpperCase()==='CR'?1:-1);else observations.add('Some earned cashback cells could not be read. Rewards remain unverified; financial movement totals were checked separately.');}
   const vendor=vendorFrom(note),key=`${date}|${minor}|${direction}|${vendor}`,ordinal=(fingerprints.get(key)||0)+1;fingerprints.set(key,ordinal);
   rows.push({id:reference?rowId('bank',account,reference,date,minor,vendor):rowId('bank',account,'',date,minor,vendor)+'|'+direction+'|'+ordinal,batchId,source:'bank',date,valueDate,time:a.date.match(/\|\s*(\d{2}:\d{2})/)?.[1],vendor,note,account,reference,amountMinor:minor,direction,status:'pending',sourcePage:pageNo+1,originalAccount:account,originalDate:a.date,paymentMode:mode(note,kind),cashbackEarnedMinor,cashbackCredit:kind==='card'?cashbackCreditKind(note,direction):undefined});
  }
 }
 const {difference}=checkStatement(rows,{kind,openingMinor,closingMinor,debitMinor,creditMinor,drCount,crCount,allowRoundedClosing:format==='SBI card'||format==='HDFC card'});
 if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Repeated source references need inspection.');
 if(cashback){const totals=cashbackTotals({id:batchId,source:'bank',name:'',createdAt:0,from:'',to:'',kind:'card',count:rows.length,cashback},rows);if(!totals.earnedVerified||!totals.creditedVerified)observations.add('Cashback source totals do not fully agree with reward rows. Review cashback separately; no reward income has been created.');}
 return {rows,kind,format,openingMinor,closingMinor,debitMinor,creditMinor,cashback,...period,warning:[...observations,difference?`${format==='SBI card'?'SBI':'HDFC'} outstanding is rounded: ₹${difference/100} differs from exact movement arithmetic. Retained for reconciliation; no adjustment entry created.`:'',pages.some(p=>p.ocr)?'Scanned statement: totals agree, but check merchant names, dates and references during review.':'',!period?'Printed period was not recognised. Confirm the full statement date range, including days without movements.':''].filter(Boolean).join(' ')||undefined};
}
