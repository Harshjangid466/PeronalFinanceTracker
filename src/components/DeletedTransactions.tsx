import {useMemo,useState} from 'react';
import {useApp} from '@/context/AppContext';
import type {Transaction} from '@/data/types';
import {formatCurrency,formatDate} from '@/data/format';
import {entrySource,entrySourceLabels} from '@/data/entryManagement';
import {deletionLabels,emptyDeletedFilters,filterDeletedEntries} from '@/data/deletedEntries';
import {cardOffsetLocks,cardOffsetRestoreBlock} from '@/data/cardReconciliation';

export function DeletedTransactions({onReview,onPurge}:{onReview:(t:Transaction)=>void;onPurge:(id:string)=>void}){
 const {allData,deletedTransactions,restoreTransaction}=useApp(),[filters,setFilters]=useState({...emptyDeletedFilters});
 const rows=useMemo(()=>filterDeletedEntries(allData,filters),[allData,filters]);
 const accounts=[...new Set(deletedTransactions.map(t=>t.account).filter(Boolean))].sort();
 const field='mt-1 block w-full rounded-xl p-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100';
 const invalid=filters.min!==''&&filters.max!==''&&Number(filters.min)>Number(filters.max)||filters.postedFrom&&filters.postedTo&&filters.postedFrom>filters.postedTo||filters.deletedFrom&&filters.deletedTo&&filters.deletedFrom>filters.deletedTo;
 return <div data-auto-save className="space-y-3">
  <label className="block text-xs">Search deleted entries<input type="search" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} className={field} placeholder="Vendor, narration or filename"/></label>
  <details className="border dark:border-slate-700 rounded-xl p-3"><summary className="text-sm font-semibold cursor-pointer">Filters & sorting</summary><div className="grid grid-cols-2 gap-3 mt-3 text-xs">
   <label>Entry origin<select aria-label="Entry origin" className={field} value={filters.origin} onChange={e=>setFilters({...filters,origin:e.target.value})}><option value="">All origins</option>{Object.entries(entrySourceLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <label>Account<select aria-label="Account" className={field} value={filters.account} onChange={e=>setFilters({...filters,account:e.target.value})}><option value="">All accounts</option>{accounts.map(a=><option key={a}>{a}</option>)}</select></label>
   <label>How deleted<select aria-label="How deleted" className={field} value={filters.method} onChange={e=>setFilters({...filters,method:e.target.value})}><option value="">All methods</option>{Object.entries(deletionLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <label>Sort by<select aria-label="Sort by" className={field} value={filters.sort} onChange={e=>setFilters({...filters,sort:e.target.value})}><option value="deleted-newest">Recently deleted</option><option value="posted-newest">Recently posted</option><option value="date-newest">Transaction date</option><option value="amount-highest">Highest amount</option><option value="amount-lowest">Lowest amount</option></select></label>
   {([['min','Minimum amount (₹)','number'],['max','Maximum amount (₹)','number'],['postedFrom','Posted from','date'],['postedTo','Posted to','date'],['deletedFrom','Deleted from','date'],['deletedTo','Deleted to','date']] as const).map(([key,label,type])=><label key={key} className="min-w-0">{label}<input type={type} min={type==='number'?'0':undefined} step={type==='number'?'0.01':undefined} className={`${field} min-w-0`} value={filters[key]} onChange={e=>setFilters({...filters,[key]:e.target.value})}/></label>)}
  </div></details>
  <div className="flex items-center justify-between text-xs"><p>{rows.length} of {deletedTransactions.length} deleted entries</p><button className="text-cyan-600 underline" onClick={()=>setFilters({...emptyDeletedFilters})}>Clear filters</button></div>
  {invalid&&<p role="alert" className="text-xs text-rose-600">Check the ranges: the minimum or start date must come before the maximum or end date.</p>}
  <p className="text-xs text-slate-500">Posted means when the entry was recorded in this app. Older deletion methods may be unrecorded.</p>
  {rows.length===0?<p className="text-sm text-slate-500">{deletedTransactions.length?'No deleted entries match these filters.':'No deleted transactions.'}</p>:rows.map(t=>{const source=entrySource(t,allData);return <div key={t.id} className="border dark:border-slate-700 p-3 rounded-xl text-xs space-y-1">
   <b>{t.heading||t.type} · {formatCurrency(t.amountMinor/100)}</b><p>{formatDate(t.date)} · {t.majorCategory} · {t.account}</p><p>{entrySourceLabels[source.kind]}{source.fileName&&<> · <span className="break-all">{source.fileName}</span></>}</p>
   <p>Posted: {t.createdAt?new Date(t.createdAt).toLocaleString('en-IN'):'Unknown'}</p><p>Deleted: {t.deletedAt?new Date(t.deletedAt).toLocaleString('en-IN'):'Unknown'}</p><p>How deleted: {deletionLabels[t.deletedVia||'unknown']}</p>
   {cardOffsetRestoreBlock(allData,t.id)&&<p>{cardOffsetRestoreBlock(allData,t.id)}</p>}
   <div className="flex flex-wrap gap-3 pt-2"><button className="text-cyan-600 underline" aria-label={`Review deleted entry ${t.id}`} onClick={()=>onReview(t)}>Review</button><button disabled={!!cardOffsetRestoreBlock(allData,t.id)} className="bg-cyan-600 text-white rounded-xl p-2 disabled:opacity-40" onClick={()=>restoreTransaction(t.id)}>Restore</button><button disabled={cardOffsetLocks(allData,t.id)} className="text-rose-600 underline disabled:opacity-40" aria-label={`Permanently delete entry ${t.id}`} onClick={()=>onPurge(t.id)}>Delete permanently</button></div>
  </div>;})}
 </div>;
}
