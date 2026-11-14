import {useState} from 'react';
import {useApp} from '@/context/AppContext';
import {previewTransfer} from '@/data/transferLinks';
import {linkedTransfer} from '@/data/transferIdentity';
import {formatCurrencyFull,formatDate} from '@/data/format';
import {inputStyle,buttonStyle} from './ConfigurationTools';
import type {StatementRow} from '@/data/statements';

const label=(r:StatementRow)=>`${r.date} · ${r.account} · ${formatCurrencyFull(r.amountMinor/100)} · ${r.vendor}`;
export function TransferLinksPanel(){
 const {allData:data,statementReady,statementError,linkTransfer,unlinkTransfer}=useApp();
 const [out,setOut]=useState(''),[incoming,setIncoming]=useState(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[error,setError]=useState(''),[undo,setUndo]=useState('');
 const available=(data.statementRows||[]).filter(r=>!r.cardSettlementId&&!r.cardHold&&!linkedTransfer(data,r));
 const debit=available.find(r=>r.id===out),credits=available.filter(r=>r.direction==='credit'&&debit&&r.account!==debit.account&&r.amountMinor===debit.amountMinor).sort((a,b)=>Math.abs(Date.parse(a.date)-Date.parse(debit!.date))-Math.abs(Date.parse(b.date)-Date.parse(debit!.date)));
 let preview:ReturnType<typeof previewTransfer>|undefined,problem='';if(out&&incoming)try{preview=previewTransfer(data,[out,incoming]);}catch(e){problem=e instanceof Error?e.message:String(e);}
 function run(fn:()=>void){try{fn();setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}
 const groups=(data.transferLinks||[]).filter(g=>g.status==='active');
 return <details className="rounded-xl border border-slate-300 dark:border-slate-700 p-4" data-testid="transfer-links">
  <summary className="cursor-pointer font-semibold text-base">Link own-account transfers</summary>
  <div className="mt-3 space-y-3">
   <p>Link an outgoing bank / wallet movement to the matching incoming movement, including a credit-card repayment. Amounts must agree; fees stay separate. Suggestions are not confirmed matches.</p>
   {!statementReady||statementError?<p role="status">{statementError?'Statement history is unavailable. Restore access before linking transfers.':'Opening statement history…'}</p>:<>
    <label className="block">Outgoing movement<select aria-label="Transfer outgoing movement" className={inputStyle} value={out} onChange={e=>{setOut(e.target.value);setIncoming('');setConfirmed(false);setError('');}}><option value="">Choose outgoing movement</option>{available.filter(r=>r.direction==='debit').sort((a,b)=>b.date.localeCompare(a.date)).map(r=><option key={r.id} value={r.id}>{label(r)}</option>)}</select></label>
    {out&&<label className="block">Incoming movement<select aria-label="Transfer incoming movement" className={inputStyle} value={incoming} onChange={e=>{setIncoming(e.target.value);setConfirmed(false);setError('');}}><option value="">Choose equal credit in another account</option>{credits.map(r=><option key={r.id} value={r.id}>{label(r)}</option>)}</select>{!credits.length&&<span className="block mt-2 text-slate-600 dark:text-slate-300">No equal incoming movement is available. Upload the destination statement or review held / already linked rows first.</span>}</label>}
    {problem&&<p role="alert" className="text-amber-800 dark:text-amber-300">{problem}</p>}
    {preview&&<div className="border-l-2 border-cyan-600 pl-3 space-y-2">
     <p>{preview.debit.account} → {preview.credit.account} · <strong>{formatCurrencyFull(preview.amountMinor/100)}</strong></p>
     <p>{formatDate(preview.debit.date)} outgoing · {formatDate(preview.credit.date)} incoming. Check the payment reference and both account statements.</p>
     <p>{preview.linked.length?`${preview.linked.length} linked app entry / entries will be excluded from spending and income. They stay in Deleted entries until you undo this transfer.`:'Both statement movements will be retained as ignored own-account transfers. No expense or income is added.'}</p>
     {preview.linked.length>0&&<ul>{preview.linked.map(t=><li key={t.id}>{t.heading||t.type} · {t.account} · {formatCurrencyFull(t.amountMinor/100)}</li>)}</ul>}
     <label className="block">Transfer description<input aria-label="Transfer description" className={inputStyle} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);}} placeholder="Card repayment / wallet funding / own transfer"/></label>
     <label className="flex gap-2 items-start"><input aria-label="Confirm own-account transfer" type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>Both accounts belong to me. These are the same transfer, and I have checked the entries being excluded.</span></label>
     <button type="button" className={`${buttonStyle} disabled:opacity-50`} disabled={!confirmed||!reason.trim()} onClick={()=>run(()=>{linkTransfer([out,incoming],reason,confirmed);setOut('');setIncoming('');setReason('');setConfirmed(false);})}>Link transfer</button>
    </div>}
    {error&&<p role="alert" className="text-rose-600">{error}</p>}
    <h3 className="font-semibold">Linked transfers ({groups.length})</h3>
    {!groups.length&&<p>No transfers linked yet. Original source amounts and dates are always retained.</p>}
    <ul className="space-y-3">{groups.map(g=>{const d=g.originalRows.find(r=>r.id===g.rowIds[0]),c=g.originalRows.find(r=>r.id===g.rowIds[1]);return <li key={g.id} className="border-l-2 border-slate-300 dark:border-slate-600 pl-3 space-y-2"><p className="font-medium">{g.reason}</p><p>{d&&label(d)}<br/>{c&&label(c)}</p>{undo===g.id?<div><p>Undo restores both source review states and {g.previousTransactions.length} original app entry / entries. Their original expense or income effect will return.</p><button className="text-cyan-700 dark:text-cyan-400 underline py-2" onClick={()=>run(()=>{unlinkTransfer(g.id);setUndo('');})}>Confirm undo transfer</button><button className="ml-4 underline" onClick={()=>setUndo('')}>Keep linked</button></div>:<button className="text-cyan-700 dark:text-cyan-400 underline py-2" onClick={()=>setUndo(g.id)}>Undo transfer link</button>}</li>;})}</ul>
   </>}
  </div>
 </details>;
}
