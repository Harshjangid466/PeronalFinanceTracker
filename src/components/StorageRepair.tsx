import {useState} from 'react';
import {repairStorage} from '@/data/storageRecovery';

export function StorageRepair(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <div className="space-y-2 text-sm"><p>A backup download does not free browser storage. Repair moves older recovery copies into the app’s database, verifies them, then frees their local-storage space. Your current ledger stays unchanged.</p>
 <button type="button" disabled={busy} className="rounded-xl border px-4 py-3 font-semibold" onClick={async()=>{
  setBusy(true);setMessage('');
  try{const result=await repairStorage();setMessage(result.moved?`${result.moved} older copies preserved and moved. Now press Save transaction again. This repair has not posted your entry. Older copies remain downloadable in Backup & restore.`:'No older copies could be moved. Storage has not been repaired. Keep your backup and share the save error details; do not clear website data.');}
  catch{setMessage('Repair could not finish. Your current ledger was not changed; original copies were retained unless already verified in the recovery archive. Keep your backup and do not clear website data.');}
  finally{setBusy(false);}
 }}>{busy?'Preserving recovery copies…':'Repair storage safely'}</button>
 {message&&<p role="status">{message}</p>}</div>;
}
