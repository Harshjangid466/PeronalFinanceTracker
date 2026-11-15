import {useMemo,useState} from 'react';
import {useApp} from '@/context/AppContext';
import {accountReconciliation,previousMonth,reconciliationLabels,type ReconciliationState} from '@/data/accountReconciliation';
import {formatCurrencyFull,formatDate} from '@/data/format';
import {inputStyle} from './ConfigurationTools';

const stateStyle:Record<ReconciliationState,string>={
 missing:'text-slate-600 dark:text-slate-300',review:'text-amber-800 dark:text-amber-300',
 unverified:'text-amber-800 dark:text-amber-300',reviewed:'text-emerald-800 dark:text-emerald-300'
};
const monthLabel=(month:string)=>new Date(month+'-01T12:00:00').toLocaleDateString('en-IN',{month:'short',year:'numeric'});
const money=(minor:number)=>formatCurrencyFull(minor/100);

export function AccountReconciliation({onReviewBatch}:{onReviewBatch:(id:string)=>void}){
 const {allData:data,statementReady,statementError}=useApp();
 const [month,setMonth]=useState(()=>previousMonth());
 const summary=useMemo(()=>statementReady&&!statementError?accountReconciliation(data,month):undefined,[data,month,statementReady,statementError]);
 return <details className="rounded-xl border border-slate-300 dark:border-slate-700 p-4" data-testid="account-reconciliation">
  <summary className="cursor-pointer font-semibold text-base">Account reconciliation &amp; missing statements</summary>
  {!summary?<p className="mt-3" role="status">{statementError?'Statement history is unavailable. Restore access before checking completeness.':'Opening statement history…'}</p>:<div className="mt-4 space-y-4">
   <div className="sm:flex sm:items-end sm:justify-between gap-4 space-y-3 sm:space-y-0">
    <p className="text-slate-600 dark:text-slate-300 max-w-xl">Check each account before closing your month. Months below refer to the statement end date; the exact billing period is shown for each import.</p>
    <label className="block shrink-0">Statement ending month<input aria-label="Statement ending month" type="month" className={inputStyle} value={month} onChange={e=>{const value=e.target.value;if(/^\d{4}-\d{2}$/.test(value)&&Number(value.slice(5))>=1&&Number(value.slice(5))<=12&&Number(value.slice(0,4))>=1000)setMonth(value);}}/></label>
   </div>
   <p aria-live="polite">{summary.accounts.filter(a=>a.state==='reviewed').length} reviewed · {summary.accounts.filter(a=>a.state==='review'||a.state==='unverified').length} need attention · {summary.accounts.filter(a=>a.state==='missing').length} have no statement ending in {monthLabel(month)}.</p>
   <p className="text-xs text-slate-600 dark:text-slate-300">Reviewed means the imported rows and balances agree and the recorded links are current. It does not prove every day or every transaction is covered. Ignored transfers and other exclusions remain separate from expenses. Paytm covers UPI activity only.</p>
   {summary.unassigned.length>0&&<div role="alert" className="border-l-4 border-amber-600 pl-3"><p>{summary.unassigned.length} import(s) cannot be assigned reliably to an account or period. Check the source rows; these imports do not establish account coverage.</p>{summary.unassigned.map(p=><button key={p.batch.id} type="button" className="block text-cyan-700 dark:text-cyan-400 underline py-2 break-all text-left" onClick={()=>onReviewBatch(p.batch.id)}>Check import: {p.batch.name}</button>)}</div>}
   {!summary.accounts.length&&<p>Add a CC, SB, Current or Wallet account in Settings, then upload its statement here. Cash does not need a statement.</p>}
   <div className="divide-y divide-slate-200 dark:divide-slate-700">
    {summary.accounts.map(a=><details key={a.account} className="py-3" data-testid="reconciliation-account" aria-label={a.account}>
     <summary className="cursor-pointer"><span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1"><strong className="break-words">{a.account}</strong><span className={`text-sm font-semibold ${stateStyle[a.state]}`}>{reconciliationLabels[a.state]}</span></span><span className="block mt-1 text-xs text-slate-600 dark:text-slate-300">{a.latestTo?`Latest statement ends ${formatDate(a.latestTo)}`:'No bank / card / wallet statement recorded'}{a.latestReviewedTo?` · Latest reviewed period ends ${formatDate(a.latestReviewedTo)}`:''}</span></summary>
     <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" aria-label={`Statement history for ${a.account}`}>
       {a.history.map(h=><button key={h.month} type="button" aria-pressed={h.month===month} onClick={()=>setMonth(h.month)} className={`rounded-lg border px-3 py-2 text-left ${h.month===month?'border-cyan-600':'border-slate-200 dark:border-slate-700'} ${stateStyle[h.state]}`}><span className="block text-xs">{monthLabel(h.month)}</span><span className="font-medium">{reconciliationLabels[h.state]}</span></button>)}
      </div>
      {!a.periods.length?<p>No bank / card / wallet statement ending in {monthLabel(month)} is recorded for this account. Upload the statement if one was issued.{a.upiRows>0?` ${a.upiRows} Paytm UPI rows are available, but do not cover other account activity.`:''}</p>:<>
       <p>{a.matched} matched existing · {a.posted} posted · {a.ignored} ignored · <strong>{a.pending} need review</strong></p>
       {a.held>0&&<p className="text-amber-800 dark:text-amber-300">{a.held} movement(s) on hold for later reconciliation.</p>}
       <p>Source debits {money(a.debitMinor)} · Source credits {money(a.creditMinor)}. Repeated source rows are counted once.</p>
       {a.noCandidate>0&&<p className="text-amber-800 dark:text-amber-300">{a.noCandidate} pending movement(s) have no candidate in the app. Check their purpose before adding an entry; they may be transfers, refunds or repayments.</p>}
       {a.unlinked.length>0&&<details><summary className="cursor-pointer text-amber-800 dark:text-amber-300">{a.unlinked.length} app entry / entries not linked to these statements</summary><ul className="mt-2 space-y-1">{a.unlinked.map(t=><li key={t.id} className="break-words">{formatDate(t.date)} · {t.heading||t.type} · {money(t.amountMinor)}</li>)}</ul><p className="mt-2 text-xs">These may be timing differences or missing links. Open the statement review to inspect them; no entries are changed here.</p></details>}
       <ul className="space-y-3">{a.periods.map(p=><li key={p.batch.id} className="border-l-2 border-slate-300 dark:border-slate-600 pl-3 space-y-1">
        <p className="font-medium">{p.validPeriod?`${formatDate(p.batch.from)} – ${formatDate(p.batch.to)}`:'Invalid statement period — check source'}</p><p className="text-xs break-all text-slate-600 dark:text-slate-300">{p.batch.name}</p>
        <p>{p.rows.length} / {p.batch.count} source rows present.{!p.populationComplete?' Source rows are missing or inconsistent.':''}{p.accounts.length!==1?' Multiple accounts share these balance controls; inspect the original statement.':''}</p>
        <p>{p.balanceDifference===undefined?'Opening / closing balances not provided; arithmetic is unverified.':p.balanceDifference===0?'Opening, movements and closing balance agree.':`Balance difference ${money(p.balanceDifference)}. Review the printed totals and any source rounding warning.`}</p>
        {p.batch.sourceWarning&&<p className="text-xs text-amber-800 dark:text-amber-300">{p.batch.sourceWarning}</p>}
        <button type="button" className="text-cyan-700 dark:text-cyan-400 underline py-2" onClick={()=>onReviewBatch(p.batch.id)}>Open statement review</button>
       </li>)}</ul>
      </>}
     </div>
    </details>)}
   </div>
  </div>}
 </details>;
}
