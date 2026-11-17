import {useEffect,useState} from 'react';
import {CheckCircle2,AlertTriangle,Download} from 'lucide-react';
import {useApp} from '@/context/AppContext';
import {requestBackupDownload} from '@/data/backupHealth';

export function StorageStatus(){
 const {exportBackup,statementError,data}=useApp();
 const installed=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone;
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{const failed=(event:Event)=>setError((event as CustomEvent<string>).detail),saved=()=>setError('');window.addEventListener('finance-storage-error',failed);window.addEventListener('finance-storage-saved',saved);return()=>{window.removeEventListener('finance-storage-error',failed);window.removeEventListener('finance-storage-saved',saved);};},[]);
 const warning=statementError||error;
 return <div className={`storage-status ${warning?'storage-warning':''}`}>
  {warning?<section role="alert" aria-label="Save warning"><AlertTriangle size={20} aria-hidden="true"/><div><strong>Some changes are not saved</strong><p>{warning}</p><p>Keep any unfinished entry open. A backup includes recorded entries, not an unsaved form.</p><button onClick={()=>{try{const result=requestBackupDownload(exportBackup());setNotice(result.warning||'Backup download requested. Check the file in Downloads.');}catch(e){setNotice(e instanceof Error?e.message:String(e));}}}><Download size={16} aria-hidden="true"/>Download available records</button>{notice&&<p role="status">{notice}</p>}</div></section>:<span><CheckCircle2 size={14} aria-hidden="true"/>Entries are stored in this browser. Keep a separate backup.</span>}
  {!warning&&!data.transactions.length&&<p className="storage-location-note">No entries in this {installed?'Home Screen app':'browser'}. On iPhone, Safari and the Home Screen app keep separate records. Open the version with your data to download a backup.</p>}
 </div>;
}
