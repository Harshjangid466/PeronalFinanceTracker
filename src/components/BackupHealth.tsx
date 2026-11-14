import {useEffect,useState} from 'react';
import {useApp} from '@/context/AppContext';
import {backupHealth,readBackupReceipt,requestBackupDownload} from '@/data/backupHealth';

export function BackupHealth({compact=false}:{compact?:boolean}){
 const {allData:data,exportBackup,statementReady,statementError}=useApp();
 const [stored,setStored]=useState(readBackupReceipt),[notice,setNotice]=useState('');
 useEffect(()=>{const refresh=()=>setStored(readBackupReceipt());window.addEventListener('finance-backup-downloaded',refresh);window.addEventListener('focus',refresh);window.addEventListener('storage',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('finance-backup-downloaded',refresh);window.removeEventListener('focus',refresh);window.removeEventListener('storage',refresh);document.removeEventListener('visibilitychange',refresh);};},[]);
 const health=backupHealth(data,stored.receipt);
 if(compact&&!health.remind&&!stored.error&&!notice&&!statementError)return null;
 return <section className="rounded-xl border border-slate-300 dark:border-slate-700 p-4 space-y-2 text-sm" aria-label="Backup health" data-testid={compact?'backup-reminder':'backup-health'}>
  <h2 className="font-semibold">{compact?'Keep a current backup':'Backup health on this device'}</h2>
  <p>{stored.receipt?`Last backup download requested: ${new Date(stored.receipt.requestedAt).toLocaleString('en-IN')}`:'No backup download is recorded on this device.'}</p>
  {stored.receipt&&<p>{health.historyChanged?'Change history differs from the last download; download a fresh backup.':`${health.changes} logged change(s) since that request.`}{health.clockChanged?' The device clock changed; check the date and download again.':''}</p>}
  {stored.receipt&&!stored.receipt.complete&&<p className="text-amber-800 dark:text-amber-300">The last download was partial. Statement history was not fully available.</p>}
  {statementError&&<p className="text-amber-800 dark:text-amber-300">Statement history is unavailable. You can download the available records for recovery; this is a partial backup.</p>}
  {stored.error&&<p role="status" className="text-amber-800 dark:text-amber-300">{stored.error}</p>}
  {compact&&<button className="rounded-xl bg-cyan-600 text-white px-4 py-2 disabled:opacity-50" disabled={!statementReady&&!statementError} onClick={()=>{try{const result=requestBackupDownload(exportBackup());if(result.warning)setNotice(result.warning);else setNotice('');}catch(e){setNotice(e instanceof Error?e.message:String(e));}}}>{statementError?'Download partial recovery backup':'Download backup now'}</button>}
  <p className="text-xs text-slate-600 dark:text-slate-300">The browser cannot confirm the file was saved. Keep it somewhere safe. Reminders appear here after 7 days when there are new logged changes; this device's reminder history is separate from the backup.</p>
  {notice&&<p role="status" className="text-amber-800 dark:text-amber-300">{notice}</p>}
 </section>;
}
