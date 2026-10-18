import {useApp} from '@/context/AppContext';
import {entrySource,entrySourceLabels} from '@/data/entryManagement';
import {formatCurrency} from '@/data/format';
import type {Transaction} from '@/data/types';
import {deletionLabels} from '@/data/deletedEntries';

const labels={date:'Date',heading:'Description',majorCategory:'Category',subCategory:'Subcategory',account:'Account',paymentMode:'Payment mode',person:'Person',purchasedFrom:'Purchased from',paymentFor:'Purpose',incomeType:'Income type',investmentType:'Investment type',remarks:'Narration / remarks',customFields:'Custom fields',statementReferences:'Payment references'};
export function TransactionDetails({transaction:t,onEdit,onDelete,onRestore,onPurge}:{transaction:Transaction;onEdit:()=>void;onDelete:()=>void;onRestore:()=>void;onPurge:()=>void}){
 const {allData}=useApp(),source=entrySource(t,allData),deleted=t.status==='deleted';
 return <div className="space-y-3 text-sm">{deleted&&<p className="font-semibold text-rose-600">Deleted entry · Excluded from balances and spending.</p>}<b>{formatCurrency(t.amountMinor/100)} · {t.type}</b>
  <div><p className="text-xs text-slate-500 dark:text-slate-400">Entry origin</p><p>{entrySourceLabels[source.kind]}</p>{source.fileName&&<p className="break-all text-xs">{source.fileName}</p>}</div>
  <dl className="space-y-2">{(Object.keys(labels) as (keyof typeof labels)[]).filter(k=>t[k]!==undefined&&t[k]!=='').map(k=><div key={k}><dt className="text-xs text-slate-500 dark:text-slate-400">{labels[k]}</dt><dd className="break-words">{typeof t[k]==='object'?JSON.stringify(t[k]):String(t[k])}</dd></div>)}</dl>
  <p className="text-xs text-slate-500 dark:text-slate-400">Posted in app: {t.createdAt?new Date(t.createdAt).toLocaleString('en-IN'):'Unknown'}</p>
  {deleted&&<div className="text-xs text-slate-500 dark:text-slate-400"><p>Deleted: {t.deletedAt?new Date(t.deletedAt).toLocaleString('en-IN'):'Unknown'}</p><p>How deleted: {deletionLabels[t.deletedVia||'unknown']}. Restore this entry to edit it.</p></div>}
  <div className="flex flex-wrap gap-3">{deleted?<><button className="rounded-xl bg-cyan-600 text-white px-4 py-2" onClick={onRestore}>Restore</button><button className="rounded-xl text-rose-600 border border-rose-600 px-4 py-2" onClick={onPurge}>Delete permanently</button></>:<><button className="rounded-xl bg-cyan-600 text-white px-4 py-2" onClick={onEdit}>Edit</button><button className="rounded-xl bg-rose-50 text-rose-700 px-4 py-2" onClick={onDelete}>Delete</button></>}</div>
 </div>;
}
