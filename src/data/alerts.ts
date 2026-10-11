import type {AppData, Transaction} from './types';

export interface BankAlert {
  id:string; rawText:string; sourceId:string; account:string; amountMinor?:number; date?:string;
  direction:'debit'|'credit'|'unknown'; kind:'payment'|'failed'|'refund'|'transfer'|'unknown';
  reference?:string; merchant?:string; createdAt:number; updatedAt:number;
  linkedTransactionId?:string; ignoredReason?:string;
}
export function realDate(value:string):boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
export function parseAlert(rawText:string):Partial<BankAlert> {
  if(/\bOTP\b|one[ -]time password|verification code/i.test(rawText))throw new Error('OTP/security messages are not transaction alerts. They have not been saved.');
  const amounts=[...rawText.matchAll(/(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d+)?)(?!\d)/gi)];
  const money=amounts.find(m=>!/(?:balance|bal|limit)\s*[:=]?\s*$/i.test(rawText.slice(0,m.index)));
  const amount=money&&/^[\d,]+(?:\.\d{1,2})?$/.test(money[1])?Number(money[1].replace(/,/g,'')):undefined;
  let date:string|undefined;const iso=rawText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const dmy=rawText.match(/\b(\d{2})[\/-](\d{2})[\/-](\d{4}|\d{2})\b/);
  if(iso)date=iso[1];else if(dmy)date=`${dmy[3].length===2?'20'+dmy[3]:dmy[3]}-${dmy[2]}-${dmy[1]}`;
  if(date&&!realDate(date))date=undefined;
  const kind=/\bfailed\b|declined|unsuccessful/i.test(rawText)?'failed':/refund|reversal|reversed/i.test(rawText)?'refund':/own account|self transfer/i.test(rawText)?'transfer':/debited|credited|spent|paid|purchase|received/i.test(rawText)?'payment':'unknown';
  const direction=/credited|received|refund/i.test(rawText)?'credit':/debited|spent|paid|purchase/i.test(rawText)?'debit':'unknown';
  const reference=rawText.match(/(?:UTR|UPI\s*(?:Ref(?:erence)?(?:\s*No)?|Txn(?:\s*ID)?)|Ref(?:erence)?(?:\s*No)?|Txn\s*(?:ID|No))\s*[:#.-]?\s*([A-Z0-9]{6,})/i)?.[1];
  const merchant=rawText.match(/(?:\bto\b|\bat\b)\s+([^\n,;.]+?)(?=\s+(?:on|via|using|ref|avl|available)\b|$)/i)?.[1]?.trim();
  return {rawText,amountMinor:amount!==undefined&&amount>0&&Number.isSafeInteger(Math.round(amount*100))?Math.round(amount*100):undefined,date,direction,kind,reference,merchant};
}
export function splitAlerts(text:string):string[] {return text.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);}
const credit=(t:Transaction)=>['Income Misc','Lent Recovered'].includes(t.type);
export function compatible(alert:BankAlert,t:Transaction):boolean {
  if(t.status!=='active'||alert.amountMinor===undefined||t.amountMinor!==alert.amountMinor)return false;
  if(alert.sourceId?t.sourceId!==alert.sourceId:t.account!==alert.account)return false;
  if(alert.direction!=='unknown'&&credit(t)!==(alert.direction==='credit'))return false;
  if(!alert.date||!realDate(alert.date))return false;
  return Math.abs(Date.parse(alert.date)-Date.parse(t.date))<=3*86400000;
}
export function reviewAlert(alert:BankAlert,transactions:Transaction[]) {
  const linked=transactions.find(t=>t.id===alert.linkedTransactionId);
  const candidates=transactions.filter(t=>compatible(alert,t));
  const status=alert.ignoredReason?'Ignored':linked&&compatible(alert,linked)?'Matched':alert.linkedTransactionId||!alert.date||!alert.amountMinor||alert.kind!=='payment'||alert.direction==='unknown'||candidates.length?'Needs review':'Possible missing entry';
  return {status,candidates,linked};
}
export function duplicateAlerts(alert:BankAlert,all:BankAlert[]):BankAlert[] {
  return all.filter(a=>a.id!==alert.id&&a.sourceId===alert.sourceId&&(alert.reference&&a.reference===alert.reference||a.rawText.trim()===alert.rawText.trim()));
}
export function validateAlerts(value:unknown):asserts value is BankAlert[] {
  if(!Array.isArray(value))throw new Error('Invalid alert inbox in backup.');const ids=new Set<string>();
  for(const a of value){if(!a||typeof a.id!=='string'||!a.id||ids.has(a.id)||typeof a.rawText!=='string'||typeof a.account!=='string'||typeof a.sourceId!=='string'||!['debit','credit','unknown'].includes(a.direction)||!['payment','failed','refund','transfer','unknown'].includes(a.kind)||!Number.isFinite(a.createdAt)||!Number.isFinite(a.updatedAt)||a.amountMinor!==undefined&&(!Number.isSafeInteger(a.amountMinor)||a.amountMinor<=0)||a.date!==undefined&&!realDate(a.date)||a.linkedTransactionId!==undefined&&typeof a.linkedTransactionId!=='string'||a.ignoredReason!==undefined&&typeof a.ignoredReason!=='string')throw new Error('Invalid saved transaction alert.');ids.add(a.id);}
}
export function alertSources(data:AppData){return (data.masters||[]).filter(m=>m.kind==='source');}
