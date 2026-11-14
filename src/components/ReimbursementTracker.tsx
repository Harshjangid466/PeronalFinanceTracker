import {useState} from 'react';
import {useApp} from '@/context/AppContext';
import {reimbursementSummary,type ReimbursementClaim} from '@/data/reimbursements';
import {moneyMinor} from '@/data/statementImport';
import {formatCurrencyFull,formatDate} from '@/data/format';
import {inputStyle,buttonStyle} from './ConfigurationTools';
import {Sheet} from './Sheet';
import {TransactionForm} from './TransactionForm';

const money=(n:number)=>formatCurrencyFull(n/100);
export function ReimbursementTracker({active=true}:{active?:boolean}){
 const {allData:data,trackExpenseReimbursement,changeExpenseReimbursement}=useApp();
 const [expense,setExpense]=useState(''),[person,setPerson]=useState(''),[expected,setExpected]=useState(''),[error,setError]=useState(''),[adding,setAdding]=useState<string>();
 const claims=data.reimbursementClaims||[],current=claims.filter(c=>c.status==='active'),summaries=current.map(c=>reimbursementSummary(data,c));
 const available=data.transactions.filter(t=>t.status==='active'&&t.type==='Revenue Expense'&&t.amountMinor>0&&t.currency==='INR'&&!current.some(c=>c.expenseId===t.id)).sort((a,b)=>b.date.localeCompare(a.date));
 const selectedClaim=current.find(c=>c.id===adding),selectedSummary=selectedClaim?reimbursementSummary(data,selectedClaim):undefined;
 function run(fn:()=>void){try{fn();setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}
 return <details className="rounded-xl border border-slate-300 dark:border-slate-700 p-4 mb-4 print:hidden text-sm" data-testid="reimbursement-tracker">
  <summary className="cursor-pointer font-semibold text-base">Reimbursements · {money(summaries.filter(s=>!s.issues.length).reduce((n,s)=>n+s.remainingMinor,0))} outstanding</summary>
  <div className="mt-3 space-y-4">
   <p>Track money expected back against an expense. Enter only the share you expect back. Separate negative expense credits reduce spending on their own dates; linking them here does not post them again.</p>
   {summaries.some(s=>s.issues.length>0)&&<p className="text-amber-800 dark:text-amber-300">Some links need review and are excluded from the outstanding total.</p>}
   <details><summary className="cursor-pointer font-medium">Track an expense</summary><div className="mt-3 space-y-3">
    <label className="block">Expense<select aria-label="Reimbursement expense" className={inputStyle} value={expense} onChange={e=>{setExpense(e.target.value);const t=available.find(t=>t.id===e.target.value);setExpected(t?String(t.amountMinor/100):'');}}><option value="">Choose recorded Revenue Expense</option>{available.map(t=><option key={t.id} value={t.id}>{t.date} · {t.heading||t.majorCategory} · {money(t.amountMinor)} · {t.account}</option>)}</select></label>
    <label className="block">Expected from<input aria-label="Reimbursement expected from" className={inputStyle} value={person} onChange={e=>setPerson(e.target.value)} placeholder="Friend / merchant / employer"/></label>
    <label className="block">Amount expected back ₹<input aria-label="Reimbursement expected amount" inputMode="decimal" className={inputStyle} value={expected} onChange={e=>setExpected(e.target.value)}/></label>
    <button className={buttonStyle} onClick={()=>run(()=>{trackExpenseReimbursement(expense,person,moneyMinor(expected));setExpense('');setPerson('');setExpected('');})}>Start reimbursement tracking</button>
   </div></details>
   {error&&<p role="alert" className="text-rose-600">{error}</p>}
   {!current.length&&<p>No reimbursements are being tracked. Record the original expense first, then choose Track an expense.</p>}
   <div className="divide-y divide-slate-200 dark:divide-slate-700">{current.map(c=><Claim key={c.id} claim={c} onAddCredit={()=>setAdding(c.id)}/>)}</div>
   {claims.some(c=>c.status==='cancelled')&&<details><summary className="cursor-pointer">Stopped tracking ({claims.filter(c=>c.status==='cancelled').length})</summary><ul className="mt-2 space-y-2">{claims.filter(c=>c.status==='cancelled').map(c=><li key={c.id}>{c.person} · {money(c.expectedMinor)} expected · {formatDate(c.expenseDate)}. Tracking stopped; financial entries retained.</li>)}</ul></details>}
   <Sheet open={active&&!!selectedClaim} onClose={()=>setAdding(undefined)} title="Record reimbursement credit">{selectedSummary?.expense&&selectedClaim&&<><p className="text-sm mb-3">Confirm the credited account and date. This saves a separate expense credit and links it to {selectedClaim.person}.</p><TransactionForm key={selectedClaim.id} initialType="Revenue Expense" isModal expenseCreditOnly prefill={{amount:-selectedSummary.remainingMinor/100,majorCategory:selectedSummary.expense.majorCategory,subCategory:selectedSummary.expense.subCategory,person:selectedClaim.person,heading:`Reimbursement: ${selectedSummary.expense.heading||selectedClaim.person}`}} onSuccess={t=>run(()=>changeExpenseReimbursement(selectedClaim.id,'credit',t.id))} onClose={()=>setAdding(undefined)}/></>}</Sheet>
  </div>
 </details>;
}

function Claim({claim,onAddCredit}:{claim:ReimbursementClaim;onAddCredit:()=>void}){
 const {allData:data,changeExpenseReimbursement}=useApp(),[credit,setCredit]=useState(''),[expected,setExpected]=useState(String(claim.expectedMinor/100)),[editing,setEditing]=useState(false),[stopping,setStopping]=useState(false),[error,setError]=useState('');
 const s=reimbursementSummary(data,claim),used=new Set((data.reimbursementClaims||[]).filter(c=>c.status==='active').flatMap(c=>c.credits.map(r=>r.transactionId)));
 const candidates=data.transactions.filter(t=>t.status==='active'&&t.type==='Revenue Expense'&&t.amountMinor<0&&t.currency==='INR'&&t.date>=claim.expenseDate&&!used.has(t.id)).sort((a,b)=>b.date.localeCompare(a.date));
 function run(action:'credit'|'unlink'|'cancel'|'expected',value:string|number){try{changeExpenseReimbursement(claim.id,action,value);setError('');setCredit('');setEditing(false);}catch(e){setError(e instanceof Error?e.message:String(e));}}
 return <section className="py-4 space-y-3" aria-label={`Reimbursement from ${claim.person}`}>
  <div><h3 className="font-semibold">{claim.person} · {s.expense?.heading||'Original expense'}</h3><p className={`font-medium ${s.state==='review'?'text-amber-800 dark:text-amber-300':s.state==='settled'?'text-emerald-800 dark:text-emerald-300':''}`}>{s.state==='review'?'Needs review':s.state==='settled'?'Settled':`${money(s.remainingMinor)} outstanding`}</p></div>
  <p>Expense {money(claim.expenseAmountMinor)} · Expected {money(claim.expectedMinor)} · Received {money(s.receivedMinor)} · Net expense {money(s.netMinor)}</p>
  {s.excessMinor>0&&<p className="text-amber-800 dark:text-amber-300">Received {money(s.excessMinor)} more than expected. Review the extra credit; no adjustment was created.</p>}
  {s.issues.map((issue,i)=><p key={i} className="text-amber-800 dark:text-amber-300">{issue}</p>)}
  <ul className="space-y-2">{s.credits.map(c=><li key={c.link.transactionId}>{formatDate(c.link.date)} · {money(c.link.amountMinor)} · {c.valid?'Linked expense credit':'Changed / unavailable credit'} <button type="button" className="underline text-cyan-700 dark:text-cyan-400 ml-2 py-1" onClick={()=>run('unlink',c.link.transactionId)}>Unlink credit</button></li>)}</ul>
  <label className="block">Existing expense credit<select aria-label={`Existing reimbursement credit for ${claim.person}`} className={inputStyle} value={credit} onChange={e=>setCredit(e.target.value)}><option value="">Choose a recorded negative expense credit</option>{candidates.map(t=><option key={t.id} value={t.id}>{t.date} · {t.heading||t.account} · {money(-t.amountMinor)}</option>)}</select></label>
  <div className="flex flex-wrap gap-3"><button className={`${buttonStyle} disabled:opacity-50`} disabled={!credit||!!s.issues.length} onClick={()=>run('credit',credit)}>Link existing credit</button><button type="button" disabled={!!s.issues.length||!s.remainingMinor} className="text-cyan-700 dark:text-cyan-400 underline disabled:opacity-50" onClick={onAddCredit}>Record new credit</button></div>
  <button className="text-cyan-700 dark:text-cyan-400 underline py-1" onClick={()=>setEditing(!editing)}>Update expected amount / confirm expense changes</button>
  {editing&&<div className="space-y-2"><label className="block">Expected reimbursement ₹<input aria-label={`Updated expected amount for ${claim.person}`} className={inputStyle} value={expected} inputMode="decimal" onChange={e=>setExpected(e.target.value)}/></label><p>This confirms the current original expense amount and date. Existing credits stay separate.</p><button className={buttonStyle} onClick={()=>{try{run('expected',moneyMinor(expected));}catch(e){setError(e instanceof Error?e.message:String(e));}}}>Save expected amount</button></div>}
  <div>{stopping?<><p>Stop tracking this expectation? Its expense and credits remain in the ledger.</p><button className="underline py-2" onClick={()=>run('cancel','')}>Confirm stop tracking</button><button className="ml-4 underline" onClick={()=>setStopping(false)}>Keep tracking</button></>:<button className="underline text-slate-600 dark:text-slate-300 py-1" onClick={()=>setStopping(true)}>Stop tracking</button>}</div>
  {error&&<p role="alert" className="text-rose-600">{error}</p>}
 </section>;
}
