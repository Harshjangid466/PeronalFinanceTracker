import {useState} from 'react';
import {useApp} from '@/context/AppContext';
import {importRemovalPreview} from '@/data/entryManagement';
import {formatCurrency,formatDate} from '@/data/format';
import {Sheet} from './Sheet';
import {buttonStyle} from './ConfigurationTools';

export function RemoveStatementImport({batchId,active,onRemoved}:{batchId:string;active:boolean;onRemoved:()=>void}){
 const {allData,removeStatementImport}=useApp();const [open,setOpen]=useState(false),[deletePosted,setDeletePosted]=useState(true),[error,setError]=useState('');
 const preview=importRemovalPreview(allData,batchId);
 return <><button className="text-rose-600 underline" onClick={()=>{setOpen(true);setDeletePosted(true);setError('');}}>Remove this import</button>
  <Sheet open={active&&open} onClose={()=>setOpen(false)} title="Remove imported statement">
   <div className="space-y-4"><b className="break-all">{preview.batch?.name}</b><p>Remove this statement from import history. Its {preview.rows.length} source rows will be removed unless another import still uses them.</p>
    <label className="flex items-start gap-2"><input type="checkbox" checked={deletePosted} onChange={e=>setDeletePosted(e.target.checked)}/><span>Move {preview.deletable.length} entries created by this import to Deleted Transactions. You can restore them there.</span></label>
    <p>{preview.retained.length} existing or shared entries will be kept. Matched entries that existed before this import are not deleted.</p>
    {preview.deletable.length>0&&<details><summary>Review entries to delete ({preview.deletable.length})</summary><div className="max-h-64 overflow-y-auto">{preview.deletable.map(t=><p key={t.id} className="py-2 border-b dark:border-slate-700">{formatDate(t.date)} · {t.heading||t.type} · {formatCurrency(t.amountMinor/100)} · {t.account}</p>)}</div></details>}
    {error&&<p role="alert" className="text-rose-600">{error}</p>}
    <button className={`${buttonStyle} bg-rose-600`} onClick={()=>{try{removeStatementImport(batchId,deletePosted);setOpen(false);onRemoved();}catch(e){setError(e instanceof Error?e.message:String(e));}}}>{deletePosted?`Remove import & delete ${preview.deletable.length} entries`:'Remove import only'}</button>
   </div>
  </Sheet>
 </>;
}
