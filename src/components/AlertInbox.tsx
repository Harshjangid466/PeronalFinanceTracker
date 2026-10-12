import {useState} from 'react';
import {useApp} from '@/context/AppContext';
import {parseAlert,splitAlerts,reviewAlert,duplicateAlerts,realDate,alertSources,type BankAlert} from '@/data/alerts';
import {uid} from '@/data/storage';
import {formatCurrency} from '@/data/format';
import {CORE_TRANSACTION_TYPES,type TransactionType} from '@/data/types';
import {inputStyle,buttonStyle} from './ConfigurationTools';
import {TransactionForm} from './TransactionForm';
import {Sheet} from './Sheet';
import {useDraftGuard,clearSheetDraft} from './NavigationGuard';
import {BankCapturePanel} from './BankCapturePanel';

export function AlertInbox(){
  const {allData,saveBankAlerts,updateBankAlert,restoreTransaction}=useApp();const guard=useDraftGuard();
  const sources=alertSources(allData);const [source,setSource]=useState(sources.find(s=>s.active&&s.name==='HDFC Savings A/c')?.id||'');
  const [text,setText]=useState('');const [message,setMessage]=useState('');const [filter,setFilter]=useState('Unresolved');
  const [editing,setEditing]=useState<BankAlert|null>(null);const [type,setType]=useState<TransactionType|''>('');const [posting,setPosting]=useState(false);const [reason,setReason]=useState('');
  const alerts=allData.bankAlerts||[];const reviews=alerts.map(a=>({alert:a,...reviewAlert(a,allData.transactions)}));
  const unresolved=reviews.filter(r=>!['Matched','Ignored'].includes(r.status));
  function capture(){
    const account=sources.find(s=>s.id===source&&s.active);if(!account){setMessage('Select the account these messages belong to.');return;}
    const rows=splitAlerts(text);if(!rows.length)return;const accepted:BankAlert[]=[];let rejected=0;
    for(const rawText of rows){try{accepted.push({...parseAlert(rawText),id:uid(),rawText,sourceId:account.id,account:account.name,createdAt:Date.now(),updatedAt:Date.now()} as BankAlert);}catch{rejected++;}}
    if(accepted.length)saveBankAlerts(accepted);setMessage(`${accepted.length} alerts saved for review. ${rejected} OTP/security messages rejected. No transactions posted.`);setText('');guard.clear();clearSheetDraft();
  }
  function edit(alert:BankAlert){setEditing({...alert});setType('');setReason('');}
  function change(updates:Partial<BankAlert>){if(editing){setEditing({...editing,...updates});guard.mark();}}
  function saveDetails(){if(!editing)return;if(editing.date&&!realDate(editing.date)||editing.amountMinor!==undefined&&(!Number.isSafeInteger(editing.amountMinor)||editing.amountMinor<=0)){setMessage('Enter a valid date and positive amount.');return;}
    updateBankAlert(editing.id,editing);guard.clear();clearSheetDraft();setEditing(null);
  }
  const canPost=!!editing&&!!editing.date&&realDate(editing.date)&&!!editing.amountMinor&&Number.isSafeInteger(editing.amountMinor)&&editing.amountMinor>0&&editing.kind==='payment'&&editing.direction!=='unknown'&&!!type&&((editing.direction==='credit')===['Income Misc','Lent Recovered'].includes(type));
  return <div className="space-y-4 text-sm">
    <BankCapturePanel />
    <p>Open Messages, copy a bank alert and paste it here. Separate multiple messages with a blank line. Alerts are references, not posted entries.</p>
    <label className="block">Account these messages belong to<select data-auto-save aria-label="Alert account" className={inputStyle} value={source} onChange={e=>setSource(e.target.value)}><option value="">Select account</option>{sources.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="block">Bank messages<textarea aria-label="Bank messages" className={inputStyle} rows={5} value={text} onChange={e=>{setText(e.target.value);guard.mark();}} placeholder="Paste transaction messages. Do not paste OTPs."/></label>
    <button className={buttonStyle} disabled={!text.trim()} onClick={capture}>Save alerts for review</button>
    {message&&<p role="status">{message}</p>}
    <p className="font-semibold">{alerts.length} alerts · {reviews.filter(r=>r.status==='Matched').length} matched · {unresolved.length} unresolved · {reviews.filter(r=>r.status==='Ignored').length} ignored</p>
    <p className="text-xs">{alerts.length>0&&!unresolved.length?'All captured alerts are accounted for.':'Review the unresolved alerts below.'} This does not mean your bank statement is reconciled. Missing messages and cash payments cannot be checked here.</p>
    <label>Show<select data-auto-save aria-label="Alert filter" className={inputStyle} value={filter} onChange={e=>setFilter(e.target.value)}>{['Unresolved','All','Matched','Ignored'].map(v=><option key={v}>{v}</option>)}</select></label>
    {reviews.filter(r=>filter==='All'?true:filter==='Unresolved'?!['Matched','Ignored'].includes(r.status):r.status===filter).slice().reverse().map(({alert,status,candidates,linked})=><article key={alert.id} className="border rounded-xl p-3 space-y-2">
      <p className="font-bold">{status} · {alert.amountMinor?formatCurrency(alert.amountMinor/100):'Amount needs review'}</p>
      <p>{sources.find(s=>s.id===alert.sourceId)?.name||alert.account} · {alert.date||'Date needs review'} · {alert.direction}</p>
      <p className="whitespace-pre-wrap break-words text-xs">{alert.rawText}</p>
      {alert.reference&&<p>Reference: {alert.reference}</p>}
      {duplicateAlerts(alert,alerts).length>0&&<p className="text-amber-600">Another captured alert looks similar. Review before creating an entry.</p>}
      {alert.linkedTransactionId&&status!=='Matched'&&<p className="text-amber-600">The linked entry was changed, deleted or is unavailable. Please review again.</p>}
      {linked?.status==='deleted'&&<button className={buttonStyle} onClick={()=>restoreTransaction(linked.id)}>Restore the original linked entry</button>}
      {status==='Matched'&&linked&&<p>Recorded: {linked.date} · {linked.heading||linked.type} · {formatCurrency(linked.amount)}</p>}
      {alert.ignoredReason&&<p>Reason: {alert.ignoredReason}</p>}
      {!['Matched','Ignored'].includes(status)&&<>{candidates.map(t=><div className="border-t pt-2" key={t.id}><p>{t.date} · {t.heading||t.type} · {formatCurrency(t.amount)}</p><button className={buttonStyle} onClick={()=>{updateBankAlert(alert.id,{linkedTransactionId:t.id,ignoredReason:undefined});setMessage('Linked to your existing entry. No duplicate posted.');}}>Confirm this is the same transaction</button></div>)}<button className={buttonStyle} onClick={()=>edit(alert)}>Review details / Prepare entry / Ignore</button></>}
      {['Matched','Ignored'].includes(status)&&<button className={buttonStyle} onClick={()=>updateBankAlert(alert.id,{linkedTransactionId:undefined,ignoredReason:undefined})}>Reopen for review</button>}
    </article>)}
    <Sheet open={!!editing&&!posting} title="Review alert details" onClose={()=>{guard.clear();setEditing(null);}}>{editing&&<div className="space-y-3">
      <p>Check the extracted details. Choosing a transaction type is required; a credit is not automatically income.</p>
      <label>Account<select aria-label="Correct alert account" className={inputStyle} value={editing.sourceId} onChange={e=>{const s=sources.find(s=>s.id===e.target.value);if(s)change({sourceId:s.id,account:s.name});}}>{sources.map(s=><option key={s.id} value={s.id}>{s.name}{s.active?'':' (inactive)'}</option>)}</select></label>
      <label>Amount<input aria-label="Alert amount" className={inputStyle} type="number" min="0.01" step="0.01" value={editing.amountMinor===undefined?'':editing.amountMinor/100} onChange={e=>change({amountMinor:e.target.value===''?undefined:Number(e.target.value)*100})}/></label>
      <label>Date<input aria-label="Alert date" className={inputStyle} type="date" value={editing.date||''} onChange={e=>change({date:e.target.value||undefined})}/></label>
      <label>Direction<select className={inputStyle} value={editing.direction} onChange={e=>change({direction:e.target.value as BankAlert['direction']})}>{['unknown','debit','credit'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Message kind<select className={inputStyle} value={editing.kind} onChange={e=>change({kind:e.target.value as BankAlert['kind']})}>{['payment','failed','refund','transfer','unknown'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Reference<input className={inputStyle} value={editing.reference||''} onChange={e=>change({reference:e.target.value})}/></label>
      <button className={buttonStyle} onClick={saveDetails}>Save corrected alert details</button>
      <label>Type of entry<select aria-label="Alert transaction type" className={inputStyle} value={type} onChange={e=>setType(e.target.value as TransactionType)}><option value="">Choose after review</option>{CORE_TRANSACTION_TYPES.map(v=><option key={v}>{v}</option>)}</select></label>
      <p className="text-xs">Refunds, transfers and failed payments need separate review; do not turn them into ordinary expenses. No automatic posting.</p>
      <button className={buttonStyle} disabled={!canPost} onClick={()=>{if(!canPost)return;updateBankAlert(editing.id,editing);guard.clear();clearSheetDraft();setPosting(true);}}>Open prefilled entry form</button>
      <label>Reason to ignore<input aria-label="Ignore reason" className={inputStyle} value={reason} onChange={e=>{setReason(e.target.value);guard.mark();}} placeholder="Duplicate alert, failed payment, own-account transfer…"/></label>
      <button className={buttonStyle} disabled={!reason.trim()} onClick={()=>{updateBankAlert(editing.id,{ignoredReason:reason.trim(),linkedTransactionId:undefined});guard.clear();clearSheetDraft();setEditing(null);}}>Ignore with this reason</button>
    </div>}</Sheet>
    <Sheet open={posting} title="Confirm and save transaction" onClose={()=>{setPosting(false);setEditing(null);}}>{posting&&editing&&type&&<TransactionForm key={editing.id} initialType={type} isModal prefill={{amount:editing.amountMinor!/100,date:editing.date,account:sources.find(s=>s.id===editing.sourceId)?.name||editing.account,heading:editing.merchant||'',remarks:editing.reference?`Bank reference: ${editing.reference}`:''}} onSuccess={t=>{updateBankAlert(editing.id,{linkedTransactionId:t.id,ignoredReason:undefined});setPosting(false);setEditing(null);setMessage('Transaction saved. The alert remains as a reference.');}}/>}</Sheet>
  </div>;
}
