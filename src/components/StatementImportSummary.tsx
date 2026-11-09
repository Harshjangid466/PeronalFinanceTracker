import {useState} from 'react';
import {useApp} from '@/context/AppContext';
import {importSummary} from '@/data/importSummary';
import {formatCurrency,formatDate} from '@/data/format';
import type {StatementBatch} from '@/data/statements';
import type {Transaction} from '@/data/types';
import {Sheet} from './Sheet';

export function StatementImportSummary({batch,active,onEdit}:{batch:StatementBatch;active:boolean;onEdit:(t:Transaction)=>void}){
 const {allData}=useApp();const summary=importSummary(batch,allData.statementRows||[],allData.transactions,allData.cardSettlements);
 const {controls,recorded,expenses,categories,expenseMinor}=summary;
 const [selection,setSelection]=useState<string|null|undefined>(),[limit,setLimit]=useState(50);
 const selected=selection===null?recorded:expenses.filter(t=>(t.majorCategory||'Uncategorised')===selection);
 const open=(category:string|null)=>{setSelection(category);setLimit(50);};
 return <section aria-label="Import summary" className="rounded-xl border dark:border-slate-700 p-4 space-y-4">
  <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-lg">Import summary</h3><p className="text-xs text-slate-500 dark:text-slate-400 break-all">{batch.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(batch.from)}–{formatDate(batch.to)}</p></div><span className="text-sm font-semibold">{controls.counts.pending?`${controls.counts.pending} to review`:controls.populationComplete?'Review complete':'Check source rows'}</span></div>
  <p className="text-sm">{controls.counts.posted} posted · {controls.counts.matched} matched · {controls.counts.ignored} ignored · {controls.counts.pending} pending</p>
  {!controls.populationComplete&&<p role="alert" className="text-rose-600">Imported row count does not agree with the saved statement. Check or restore this import.</p>}
  <div><p className="text-sm text-slate-500 dark:text-slate-400">Recorded personal spending</p><p className="text-2xl font-semibold">{formatCurrency(expenseMinor/100)}</p><p className="text-xs text-slate-500 dark:text-slate-400">{expenses.length} expense entr{expenses.length===1?'y':'ies'} · Net of expense credits; posted and matched entries counted once.</p></div>
  {categories.length>0?<div className="space-y-1">{categories.map(c=><button key={c.category} aria-label={`View import category ${c.category}`} className="block w-full text-left py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500" onClick={()=>open(c.category)}><span className="flex justify-between gap-3"><b>{c.category}</b><span>{formatCurrency(c.amountMinor/100)}</span></span><span className="flex justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1"><span>{c.count} payment{c.count===1?'':'s'}</span><span>{expenseMinor?Math.round(c.amountMinor/expenseMinor*1000)/10:0}% of recorded spending</span></span><span className="block h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden"><span className="block h-full bg-cyan-600 rounded-full" style={{width:`${expenseMinor?c.amountMinor/expenseMinor*100:0}%`}}/></span></button>)}</div>:<p className="text-slate-500 dark:text-slate-400">No personal expenses recorded from this import yet. Pending and ignored rows are excluded.</p>}
  {expenses.length>0&&<p className="text-xs text-slate-500 dark:text-slate-400">Largest category: {categories[0].category}. Average expense: {formatCurrency(Math.round(expenseMinor/expenses.length)/100)}.</p>}
  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1"><p>Expense credits reducing spending: {formatCurrency(summary.expenseCreditMinor/100)}.</p><p>Other recorded outflows: {formatCurrency(summary.otherOutflowMinor/100)} · Other recorded credits: {formatCurrency(summary.creditMinor/100)}. Excluded from personal spending.</p><p>Source movements: {formatCurrency(controls.debitMinor/100)} paid · {formatCurrency(controls.creditMinor/100)} received. These totals also include pending and ignored rows.</p></div>
  <button className="text-cyan-600 font-semibold underline" disabled={!recorded.length} onClick={()=>open(null)}>View all {recorded.length} recorded transactions</button>
  <Sheet open={active&&selection!==undefined} onClose={()=>setSelection(undefined)} title={selection===null?'Imported transactions':`${selection||''} transactions`}>
   <div className="space-y-3"><p>{selected.length} transaction{selected.length===1?'':'s'}. Edit an entry to correct its category; the summary updates automatically.</p>{selected.slice(0,limit).map(t=><article key={t.id} className="border-b dark:border-slate-700 py-3 space-y-1"><div className="flex items-start justify-between gap-3"><b>{t.heading||t.person||t.majorCategory||t.type}</b><span className="whitespace-nowrap">{formatCurrency(t.amountMinor/100)}</span></div><p>{formatDate(t.date)} · {t.account}</p><p>{t.majorCategory||t.type}{t.subCategory?` / ${t.subCategory}`:''}{t.person?` · ${t.person}`:''}</p><p className="text-xs text-slate-500 dark:text-slate-400">{t.type} · {t.paymentMode}{t.remarks?` · ${t.remarks}`:''}</p><button className="text-cyan-600 underline" aria-label={`Edit imported transaction ${t.id}`} onClick={()=>onEdit(t)}>Edit transaction</button></article>)}{!selected.length&&<p>No transactions remain in this category.</p>}{selected.length>limit&&<button className="text-cyan-600 underline" onClick={()=>setLimit(limit+50)}>Show more transactions</button>}</div>
  </Sheet>
 </section>;
}

