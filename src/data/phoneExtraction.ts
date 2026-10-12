import {realDate} from './alerts';
// These constants mirror the native Match Text actions in IPHONE_MINIMAL_CAPTURE.md.
export const HDFC_AMOUNT_PATTERN='(?im)^Sent[ \\t]+Rs\\.?[ \\t]*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)[ \\t]*$';
export const HDFC_DATE_PATTERN='(?im)^On[ \\t]+([0-9]{2})/([0-9]{2})/([0-9]{2}|[0-9]{4})[ \\t]*$';
export function previewHdfcExtraction(localMessage:string){
  if(/\bOTP\b|\bPIN\b|one[ -]time|passcode|password|verification|authentication|ओटीपी|failed|declined|unsuccessful|refund|reversal|reversed|self transfer|own account/i.test(localMessage))return null;
  if(!/^From HDFC Bank A\/C \*?[Xx0-9]+\s*$/m.test(localMessage))return null;
  const amounts=[...localMessage.matchAll(/^Sent[ \t]+Rs\.?[ \t]*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)[ \t]*$/gmi)];
  if(amounts.length!==1)return null;
  const [whole,fraction='']=amounts[0][1].replace(/,/g,'').split('.');
  const amountMinor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(amountMinor)||amountMinor<=0||amountMinor>1000000000000)return null;
  const dates=[...localMessage.matchAll(/^On[ \t]+([0-9]{2})\/([0-9]{2})\/([0-9]{2}|[0-9]{4})[ \t]*$/gmi)];
  let transactionDate='';
  if(dates.length===1){const [,day,month,year]=dates[0];const date=`${year.length===2?'20'+year:year}-${month}-${day}`;if(!realDate(date))return null;transactionDate=date;}
  return {amountMinor,direction:'debit' as const,transactionDate};
}
