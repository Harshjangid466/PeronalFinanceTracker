import {visibleField} from './model';
import {CORE_TRANSACTION_TYPES,type Transaction,type AppData} from './types';
export const commonHeaders=['Date','Amount','Transaction Type','Heading','Major Category','Sub-category','Payment Mode','Source','Person','Remarks'];
export function parseCSV(text:string):string[][] {
  const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw new Error('CSV has an unclosed quoted field.');if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
export const csvCell=(value:unknown)=>'"'+String(typeof value==='object'?JSON.stringify(value):value??'').replace(/"/g,'""')+'"';
export function buildCSV(headers:string[],rows:unknown[][]):string{return '\ufeff'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');}
export interface ImportPreview {row:number;transaction:Partial<Transaction>;errors:string[];warnings:string[];duplicate:boolean}
const fields:Record<string,string>={'Date':'date','Amount':'amount','Amount (INR)':'amount','Transaction Type':'type','Heading':'heading','Major Category':'majorCategory','Sub-category':'subCategory','Payment Mode':'paymentMode','Source':'account','Source / Account':'account','Person':'person','Remarks':'remarks','Purchased From':'purchasedFrom','Payment For':'paymentFor','Income Type':'incomeType','Investment Type':'investmentType'};
export function previewImport(rows:string[][],data:AppData):ImportPreview[]{if(!rows.length)return [];const headers=rows[0].map(s=>String(s).replace(/^\ufeff/,'').trim());if(!headers.includes('Date') || !headers.some(h=>h==='Amount'||h==='Amount (INR)'))throw new Error('Date and Amount columns are required.');
  const seen=new Set<string>();return rows.slice(1).filter(r=>r.some(Boolean)).map((row,index)=>{
    const record:Record<string,unknown>={customFields:{}};
    headers.forEach((h,i)=>{if(fields[h])record[fields[h]]=String(row[i]??'').trim();else {const cf=data.customFields.find(f=>h===f.label || h===f.key || h===`Custom: ${f.label}`);if(cf)(record.customFields as Record<string,unknown>)[cf.key]=row[i]??'';}});
    record.type ||= 'Revenue Expense'; record.amount=Number(String(record.amount||'').replace(/[₹,]/g,''));
    const t=record as Partial<Transaction>; const errors:string[]=[];const warnings:string[]=[];
    const date=String(t.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)errors.push('Date must be a real YYYY-MM-DD date.');
    if(!Number.isFinite(t.amount)||!t.amount||(t.amount<0&&t.type!=='Revenue Expense')||!Number.isSafeInteger(Math.round(t.amount*100)))errors.push('Amount must be nonzero; only revenue expense credits may be negative.');
    if(t.amount!==undefined && Math.abs(t.amount*100-Math.round(t.amount*100))>1e-6)errors.push('Amount must have at most two decimal places.');
    if(!CORE_TRANSACTION_TYPES.includes(t.type!))errors.push('Unknown transaction type.');
    if(['Lent','Lent Recovered'].includes(t.type!)&&!t.person)errors.push('Person is required.');
    if(['Revenue Expense','CAPEX'].includes(t.type!)&&!t.majorCategory)errors.push('Major Category is required.');
    if(t.type==='To Ghar'&&!t.paymentFor)errors.push('Payment For is required.');if(t.type==='Income Misc'&&!t.incomeType)errors.push('Income Type is required.');if(t.type==='Investment'&&!t.investmentType)errors.push('Investment Type is required.');
    const custom=t.customFields||{};
    const applicable=data.customFields.filter(f=>!f.applicableTypes.length||f.applicableTypes.includes(t.type!));
    for(const cf of applicable){const value=custom[cf.key];if(value!==undefined && value!==''){
      if(cf.type==='multiSelect'){try{custom[cf.key]=String(value).startsWith('[')?JSON.parse(String(value)):String(value).split(';').map(s=>s.trim());if(!Array.isArray(custom[cf.key]))errors.push(`${cf.label} needs a list.`);}catch{errors.push(`${cf.label} needs a valid list.`);}}
      if(cf.type==='boolean'){if(!['true','false','yes','no','1','0'].includes(String(value).toLowerCase()))errors.push(`${cf.label} needs true or false.`);else custom[cf.key]=['true','yes','1'].includes(String(value).toLowerCase());}
      if(cf.type==='number'){if(!Number.isFinite(Number(value)))errors.push(`${cf.label} needs a number.`);else custom[cf.key]=Number(value);}
    }}
    for(const cf of applicable){if(!visibleField(cf,applicable,custom))continue;const value=custom[cf.key];if(cf.required&&(value===undefined||value===''||Array.isArray(value)&&!value.length))errors.push(`${cf.label} is required.`);if(['dropdown','multiSelect'].includes(cf.type)&&value!==undefined&&value!==''){const selected=Array.isArray(value)?value:[value];if(selected.some(v=>!cf.options?.includes(String(v))))errors.push(`${cf.label} contains an unknown option.`);}}
    t.customFields=custom;
    if(t.account&&!data.accounts.includes(t.account))warnings.push('New source: review in Settings after import.');if(t.paymentMode&&!data.paymentModes.includes(t.paymentMode))warnings.push('New payment mode.');
    const key=JSON.stringify([t.date,t.type,t.amount,t.majorCategory||'',t.person||'',t.remarks||'']);
    const duplicate=seen.has(key)||data.transactions.some(old=>JSON.stringify([old.date,old.type,old.amount,old.majorCategory||'',old.person||'',old.remarks||''])===key);seen.add(key);
    return {row:index+2,transaction:t,errors,warnings,duplicate};
  });
}
