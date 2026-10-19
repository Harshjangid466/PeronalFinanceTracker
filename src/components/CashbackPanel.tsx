import {compareCashback} from '@/data/cashback';
import {formatCurrency,formatDate} from '@/data/format';
import {rowState,type StatementBatch,type StatementRow} from '@/data/statements';
import type {Transaction} from '@/data/types';

export function CashbackPanel({batch,batches,rows,transactions,onReview}:{batch:StatementBatch;batches:StatementBatch[];rows:StatementRow[];transactions:Transaction[];onReview?:(row:StatementRow)=>void}){
 const result=compareCashback(batch,batches,rows,transactions),c=result.current;
 if(!batch.cashback&&!c.actual.length&&c.earned===undefined)return null;
 return <section aria-label="Cashback reconciliation" className="rounded-xl border dark:border-slate-700 p-4 space-y-3">
  <h3 className="font-semibold">Cashback</h3>
  <div className="grid grid-cols-2 gap-3 text-xs">
   <div>Earned for next cycle<p className="font-semibold">{c.earnedVerified?formatCurrency(c.earned!/100):'Unverified'}</p><p className="text-slate-500">Pending rewards · not income</p></div>
   <div>Cycle cashback credited<p className="font-semibold">{c.creditedVerified?formatCurrency(c.cycle/100):'Unverified'}</p>{!c.creditedVerified&&c.cycle>0&&<p className="text-amber-700">Detected credits {formatCurrency(c.cycle/100)} · check printed total</p>}</div>
   <div>Other cashback / fuel rebates<p className="font-semibold">{formatCurrency(c.rebates/100)}</p><p className="text-slate-500">Separate from cycle comparison</p></div>
   <div>Cashback income posted<p className="font-semibold">{formatCurrency(c.recorded/100)}</p><p className="text-slate-500">From actual credits only</p></div>
  </div>
  {result.previous&&<p className="text-xs">Previous statement: {formatDate(result.previous.from)} – {formatDate(result.previous.to)}{result.expectedMinor!==undefined?` · Expected credit ${formatCurrency(result.expectedMinor/100)}`:''}</p>}
  <p role="status" className={`text-xs ${result.status==='variance'||result.status==='unverified'?'text-amber-700':''}`}>{result.message}{result.varianceMinor!==undefined&&result.varianceMinor!==0?` ${result.varianceMinor<0?'Shortfall':'Excess'}: ${formatCurrency(Math.abs(result.varianceMinor)/100)}.`:''}</p>
  {onReview&&c.actual.filter(r=>rowState(r,transactions).status==='pending').map(r=><button key={r.id} type="button" className="block text-xs text-cyan-600 underline" onClick={()=>onReview(r)}>Review cashback credit · {formatDate(r.date)} · {formatCurrency(r.amountMinor/100)}</button>)}
 </section>;
}
