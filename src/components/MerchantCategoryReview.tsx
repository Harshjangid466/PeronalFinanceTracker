import {useState} from 'react';
import {useApp} from '@/context/AppContext';
import {historicalCategoryPreview,type CategoryProposal} from '@/data/merchantCategories';
import {formatCurrency,formatDate} from '@/data/format';
import {Sheet} from './Sheet';
import {buttonStyle,inputStyle} from './ConfigurationTools';

export function MerchantCategoryReview(){
 const {allData:data,applyMerchantCategories,statementReady,statementError}=useApp();
 const [proposals,setProposals]=useState<CategoryProposal[]>(),[selected,setSelected]=useState<string[]>([]),[query,setQuery]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[limit,setLimit]=useState(50);
 const visible=(proposals||[]).filter(p=>`${p.vendor} ${p.oldCategory} ${p.suggestion.category} ${p.suggestion.subcategory}`.toLowerCase().includes(query.toLowerCase()));
 function refresh(){setProposals(historicalCategoryPreview(data));setSelected([]);setQuery('');setError('');setMessage('');setLimit(50);}
 function close(){setProposals(undefined);setSelected([]);setError('');}
 return <section className="rounded-xl border dark:border-slate-700 p-4 space-y-3">
  <h3 className="font-semibold">Merchant categorisation</h3>
  <p>Suggestions use recognised merchants, clues in payee names and narration, your saved rules and previous categories. Unknown or conflicting vendors stay available for review. No data is sent to an AI service.</p>
  <p className="text-xs text-slate-500">Review older expenses separately. Existing categories change only for the entries you select; amounts and statement records stay unchanged.</p>
  <button type="button" className={buttonStyle} disabled={!statementReady||!!statementError} onClick={refresh}>Review categories for older entries</button>
  {message&&<p role="status">{message}</p>}{statementError&&<p role="alert">{statementError}</p>}
  <Sheet open={proposals!==undefined} onClose={close} title="Review older entry categories">
   <div className="space-y-4"><p>{proposals?.length||0} possible changes. Select the entries to update. New category labels shown here will be added only when you apply selected changes.</p>
    <input aria-label="Find category suggestions" className={inputStyle} value={query} onChange={e=>{setQuery(e.target.value);setLimit(50);}} placeholder="Merchant or category"/>
    <div className="flex flex-wrap gap-4 text-sm"><button type="button" className="text-cyan-700 dark:text-cyan-300 underline" onClick={()=>setSelected([...new Set([...selected,...visible.slice(0,limit).map(p=>p.id)])])}>Select shown entries</button><button type="button" className="underline" onClick={()=>setSelected([])}>Clear selection</button><button type="button" className="underline" onClick={refresh}>Refresh preview</button></div>
    <div className="divide-y dark:divide-slate-700">{visible.slice(0,limit).map(p=><label key={p.id} className="flex gap-3 py-4 cursor-pointer"><input aria-label={`Categorise ${p.vendor} ${p.id}`} className="mt-1 shrink-0" type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(e.target.checked?[...selected,p.id]:selected.filter(id=>id!==p.id))}/><span className="min-w-0 flex-1 space-y-1"><span className="flex justify-between gap-2"><b className="break-words">{p.vendor||'Unnamed payee'}</b><b className="whitespace-nowrap">{formatCurrency(p.amountMinor/100)}</b></span><span className="block text-xs">{formatDate(p.date)}</span><span className="block text-sm">{p.oldCategory||'Uncategorised'}{p.oldSubcategory?` / ${p.oldSubcategory}`:''} → <b>{p.suggestion.category}{p.suggestion.subcategory?` / ${p.suggestion.subcategory}`:''}</b></span><span className="block text-xs text-slate-500">{p.suggestion.reason}</span></span></label>)}</div>
    {!visible.length&&<p>No category changes suggested. Unknown merchants need your category or a saved vendor rule.</p>}
    {visible.length>limit&&<button className={buttonStyle} onClick={()=>setLimit(limit+50)}>Show more suggestions</button>}
    {error&&<p role="alert" className="text-rose-600">{error}</p>}
    <div className="sticky bottom-0 bg-white dark:bg-slate-900 py-3 space-y-3"><button type="button" className={`${buttonStyle} w-full`} disabled={!selected.length||!statementReady||!!statementError} onClick={()=>{try{applyMerchantCategories((proposals||[]).filter(p=>selected.includes(p.id)));setMessage(`Updated categories for ${selected.length} ${selected.length===1?'entry':'entries'}. Amounts unchanged; changes recorded in history.`);close();}catch(e){setError(e instanceof Error?e.message:String(e));}}}>Apply categories to {selected.length} selected {selected.length===1?'entry':'entries'}</button><button type="button" className="w-full text-cyan-700 dark:text-cyan-300 underline" onClick={close}>Cancel without changes</button></div>
   </div>
  </Sheet>
 </section>;
}
