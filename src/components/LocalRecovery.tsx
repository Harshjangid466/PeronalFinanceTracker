import {Component,useEffect,useState,type ReactNode} from 'react';
import {storageName} from '@/data/accountStorage';
import {loadRecoveryCopies,type RecoveryCopy} from '@/data/storageRecovery';

const copies=[['finance-tracker-data-v2','Current saved ledger'],['finance-tracker-data-v1','Legacy ledger copy'],['finance-tracker-pre-v4-backup','Before the v4 migration'],['finance-tracker-pre-v3-backup','Before the v3 migration']] as const;
export function LocalRecovery(){
 const [archived,setArchived]=useState<RecoveryCopy[]>([]),[archiveError,setArchiveError]=useState('');
 useEffect(()=>{let active=true;const read=()=>loadRecoveryCopies().then(copies=>{if(active){setArchived(copies);setArchiveError('');}}).catch(()=>{if(active)setArchiveError('Archived recovery copies could not be opened. Keep website data and try again.');});void read();window.addEventListener('finance-recovery-archived',read);return()=>{active=false;window.removeEventListener('finance-recovery-archived',read);};},[]);
 const available=copies.flatMap(([key,label])=>{try{const raw=localStorage.getItem(storageName(key));if(!raw)return [];let count='Unreadable JSON';try{const data=JSON.parse(raw);count=`${Array.isArray(data.transactions)?data.transactions.length:0} entries`;}catch{/* Keep the raw copy available. */}return [{key,label,raw,count}];}catch{return [];}});
 const all=[...available,...archived.map(copy=>({key:copy.id,label:`${copy.label} (preserved archive)`,raw:copy.raw,count:'Exact original recovery copy'}))];
 return <section className="local-recovery"><h3>Look for older saved copies</h3><p>Download a copy before trying a restore. Raw ledger copies may omit statement history; use the full backup when available. Compare older copies first. Nothing here replaces your current records.</p>{all.map(copy=><button key={copy.key} onClick={()=>{const url=URL.createObjectURL(new Blob([copy.raw],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`finance-recovery-${copy.key.replace(/[^a-zA-Z0-9-]/g,'_')}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}}><span>{copy.label}<small>{copy.count}</small></span><span>Download</span></button>)}{archiveError&&<p role="alert">{archiveError}</p>}{!all.length&&<p>No saved copies could be read in this browser. Check backups from the original device.</p>}</section>;
}
export class DataRecoveryBoundary extends Component<{children:ReactNode},{error:boolean}>{
 state={error:false};
 static getDerivedStateFromError(){return {error:true};}
 render(){return this.state.error?<main className="recovery-page"><h1>Your saved data could not be opened</h1><p>It has not been replaced. Keep this browser's website data and download any available copies below.</p><LocalRecovery/><button onClick={()=>window.location.reload()}>Try opening again</button></main>:this.props.children;}
}
