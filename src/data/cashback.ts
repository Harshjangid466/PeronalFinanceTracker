import {rowState,type StatementBatch,type StatementRow} from './statements';
import type {Transaction} from './types';

export function cashbackCreditKind(note:string,direction:string):StatementRow['cashbackCredit']{
 if(direction!=='credit')return undefined;
 if(/\bcash\s?back\s+credit(?:ed)?\b/i.test(note))return 'cycle';
 if(/\bfuel\s+cash\s?back\s+rebates?\b/i.test(note))return 'rebate';
 return undefined;
}
export function cashbackRows(batch:StatementBatch,rows:StatementRow[]){return rows.filter(r=>batch.rowIds?batch.rowIds.includes(r.id):r.batchId===batch.id);}
export function cashbackTotals(batch:StatementBatch,rows:StatementRow[],transactions:Transaction[]=[]){
 const selected=cashbackRows(batch,rows),account=batch.cashback?.account||selected[0]?.account;
 const complete=selected.length===batch.count&&selected.length===new Set(selected.map(r=>r.id)).size&&selected.every(r=>r.account===account);
 const earned=complete&&selected.every(r=>r.cashbackEarnedMinor!==undefined)?selected.reduce((s,r)=>s+r.cashbackEarnedMinor!,0):undefined;
 const actual=selected.filter(r=>r.cashbackCredit||cashbackCreditKind(r.note,r.direction));
 const cycle=actual.filter(r=>(r.cashbackCredit||cashbackCreditKind(r.note,r.direction))==='cycle').reduce((s,r)=>s+r.amountMinor,0);
 const rebates=actual.filter(r=>(r.cashbackCredit||cashbackCreditKind(r.note,r.direction))==='rebate').reduce((s,r)=>s+r.amountMinor,0);
 const recordedIds=new Set(actual.filter(r=>['posted','matched'].includes(rowState(r,transactions).status)).map(r=>r.transactionId));
 const recorded=transactions.filter(t=>t.status==='active'&&t.type==='Income Misc'&&recordedIds.has(t.id)).reduce((s,t)=>s+t.amountMinor,0);
 return {account,complete,earned,cycle,rebates,actual,recorded,earnedVerified:earned!==undefined&&earned===batch.cashback?.earnedMinor,creditedVerified:complete&&batch.cashback?.creditedMinor!==undefined&&cycle===batch.cashback.creditedMinor};
}
export function compareCashback(batch:StatementBatch,batches:StatementBatch[],rows:StatementRow[],transactions:Transaction[]=[]){
 const current=cashbackTotals(batch,rows,transactions);
 const base={current,previous:undefined as StatementBatch|undefined,expectedMinor:undefined as number|undefined,varianceMinor:undefined as number|undefined};
 if(!current.account)return {...base,status:'unverified',message:'Choose a statement account to compare cashback.'};
 const sameAccount=batches.filter(b=>b.source==='bank'&&b.kind==='card'&&cashbackTotals(b,rows).account===current.account);
 const conflicts=(copies:StatementBatch[])=>new Set(copies.filter(b=>b.cashback).map(b=>JSON.stringify([b.cashback!.account,b.cashback!.earnedMinor,b.cashback!.creditedMinor]))).size>1;
 if(conflicts([...sameAccount.filter(b=>b.from===batch.from&&b.to===batch.to),batch]))return {...base,status:'unverified',message:'Copies of this statement disagree on cashback controls. Review the source files.'};
 const older=sameAccount.filter(b=>b.to<batch.from).sort((a,b)=>b.to.localeCompare(a.to)||b.from.localeCompare(a.from));
 if(!older.length)return {...base,status:'missing',message:'Import the preceding statement for this account to check expected versus credited cashback.'};
 const candidates=older.filter(b=>b.to===older[0].to),previous=candidates.find(b=>b.cashback)||candidates[0];
 if(new Set(candidates.map(b=>b.from)).size>1||conflicts(candidates))return {...base,status:'unverified',message:'Previous statement copies disagree. Resolve their period or cashback controls first.'};
 const previousTotals=cashbackTotals(previous,rows),withPrevious={...base,previous};
 if(Date.parse(batch.from+'T00:00:00Z')-Date.parse(previous.to+'T00:00:00Z')!==86400000)return {...withPrevious,status:'missing',message:'There is a gap between statement periods. Import the intervening statement before comparing cashback.'};
 if(!previousTotals.earnedVerified||!current.creditedVerified)return {...withPrevious,status:'unverified',message:'Earned or credited cashback could not be verified against its printed summary and transaction rows. Review the source; no amount is assumed.'};
 const expectedMinor=previousTotals.earned!,varianceMinor=current.cycle-expectedMinor;
 return {...withPrevious,expectedMinor,varianceMinor,status:varianceMinor===0?'matched':'variance',message:varianceMinor===0?'Previous earned cashback agrees with the current cycle credit.':varianceMinor<0?'Less cashback was credited than expected. Check delayed rewards, exclusions or reversals with the issuer.':'More cashback was credited than expected. Check earlier-cycle adjustments; no balancing entry was created.'};
}
