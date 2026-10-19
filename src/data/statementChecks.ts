import type {StatementRow} from './statements';

// Validate both sides separately: equal missing debits and credits must not cancel out.
export function checkStatement(rows:StatementRow[],source:{kind:'bank'|'card';openingMinor:number;closingMinor:number;debitMinor:number;creditMinor:number;drCount?:number;crCount?:number;allowRoundedClosing?:boolean}){
 const debits=rows.filter(r=>r.direction==='debit'),credits=rows.filter(r=>r.direction==='credit');
 const debitMinor=debits.reduce((s,r)=>s+r.amountMinor,0),creditMinor=credits.reduce((s,r)=>s+r.amountMinor,0);
 const difference=source.closingMinor-(source.openingMinor+(source.kind==='card'?source.debitMinor-source.creditMinor:source.creditMinor-source.debitMinor));
 const rounded=!!source.allowRoundedClosing&&source.closingMinor%100===0&&Math.abs(difference)<=50;
 const issues:string[]=[],rupees=(n:number)=>`₹${(n/100).toFixed(2)}`;
 if(!rows.length)issues.push('No dated movements were extracted.');
 if(debitMinor!==source.debitMinor)issues.push(`Debits: source ${rupees(source.debitMinor)}, extracted ${rupees(debitMinor)}; difference ${rupees(debitMinor-source.debitMinor)}.`);
 if(creditMinor!==source.creditMinor)issues.push(`Credits (including repayments and refunds): source ${rupees(source.creditMinor)}, extracted ${rupees(creditMinor)}; difference ${rupees(creditMinor-source.creditMinor)}.`);
 if(source.drCount!==undefined&&source.drCount!==debits.length)issues.push(`Debit count: source ${source.drCount}, extracted ${debits.length}.`);
 if(source.crCount!==undefined&&source.crCount!==credits.length)issues.push(`Credit count: source ${source.crCount}, extracted ${credits.length}.`);
 if(difference!==0&&!rounded)issues.push(`Printed opening, debit/credit totals and closing balance differ by ${rupees(difference)}. The summary itself needs checking.`);
 if(issues.length)throw Error(`Statement checks need review. ${issues.join(' ')} Nothing imported; no balancing entry was invented. Check missing rows, debit/credit markers or table boundaries, or use CSV/XLSX.`);
 return {debitMinor,creditMinor,difference,rounded};
}
