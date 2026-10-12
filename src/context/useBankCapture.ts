import {useEffect,useRef,useState} from 'react';
import {captureAuth,captureConfigured,captureRpc,captureEndpoint,capturePublicKey} from '@/data/captureClient';
import {captureRows,captureToken,capturePersisted,captureCheckpoint,type CaptureRow} from '@/data/captureProtocol';
import type {BankAlert} from '@/data/alerts';
export interface CaptureDevice {id:string;source_id:string;source_label:string;name:string;expires_at:string;revoked_at?:string|null}
const ownerKey='finance-capture-owner';
export function useBankCapture(add:(alerts:BankAlert[])=>void){
  const addRef=useRef(add);addRef.current=add;const userRef=useRef<{id:string;email:string}|null>(null);const epoch=useRef(0);const busy=useRef(false);
  const [user,setUser]=useState<{id:string;email:string}|null>(null);const [connected,setConnected]=useState(false);const [status,setStatus]=useState('Sign in to connect automatic bank alerts');const [error,setError]=useState('');const [devices,setDevices]=useState<CaptureDevice[]>([]);
  const [connection,setConnection]=useState<{token:string;source:string;expires:string}|null>(null);
  const [lastReceived,setLastReceived]=useState<string|null>(null);
  const tickRef=useRef<()=>Promise<void>>(async()=>{});
  const belongs=(id:string)=>[localStorage.getItem(ownerKey),localStorage.getItem('finance-cloud-owner')].every(owner=>!owner||owner===id);
  const differentAccount=!!user&&!belongs(user.id);
  useEffect(()=>{if(!captureAuth)return;let alive=true,seenEvent=false;
    const update=(session:{user:{id:string;email?:string}}|null)=>{if(!alive)return;const next=session?{id:session.user.id,email:session.user.email||''}:null;if(next?.id===userRef.current?.id)return;epoch.current++;userRef.current=next;setUser(next);setConnected(!!next&&localStorage.getItem(ownerKey)===next.id);setDevices([]);setConnection(null);setLastReceived(null);setError('');};
    captureAuth.auth.getSession().then(({data,error})=>{if(!alive||seenEvent)return;if(error)setError(error.message);else update(data.session);}).catch(()=>{if(alive)setError('Could not check sign-in.');});
    const {data:listener}=captureAuth.auth.onAuthStateChange((event,session)=>{if(event!=='TOKEN_REFRESHED'){seenEvent=true;update(session);}});
    return()=>{alive=false;epoch.current++;listener.subscription.unsubscribe();};
  },[]);
  async function refreshDevices(){const u=userRef.current;if(!u)return;const generation=epoch.current;const rows=await captureRpc(u.id,'list_bank_capture_devices');if(epoch.current===generation)setDevices(rows||[]);}
  tickRef.current=async()=>{
    const u=userRef.current;if(!u||!belongs(u.id)||localStorage.getItem(ownerKey)!==u.id||busy.current||!navigator.onLine||document.hidden)return;
    const generation=epoch.current;const active=()=>epoch.current===generation&&userRef.current?.id===u.id&&belongs(u.id)&&localStorage.getItem(ownerKey)===u.id;
    busy.current=true;
    try{const key=`finance-capture-cursor-${u.id}`;const cursor=captureCheckpoint(localStorage.getItem(key),localStorage.getItem('finance-tracker-data-v2'));
      const rows=await captureRpc(u.id,'read_bank_captures',{p_after:cursor}) as CaptureRow[];if(!active())return;
      if(!Array.isArray(rows))throw new Error('Invalid capture response.');
      if(!rows.length){setStatus('Connected · waiting for new bank alerts');setError('');return;}
      const alerts=captureRows(rows,u.id);addRef.current(alerts);
      // Advance only after the existing app has successfully saved this batch.
      await new Promise<void>(resolve=>setTimeout(resolve,150));if(!active())return;
      const persisted=capturePersisted(alerts.map(a=>a.id),localStorage.getItem('finance-tracker-data-v2'));
      if(!persisted)throw new Error('Received alerts could not be saved on this device. Download a backup and check available storage. Cloud copies are retained.');
      localStorage.setItem(key,JSON.stringify({sequence:Math.max(...rows.map(r=>r.sequence)),ids:alerts.map(a=>a.id)}));setLastReceived(rows[rows.length-1].received_at);setStatus(rows.length===100?'Saved a batch of alerts · more may be waiting':'Received bank alerts saved for review');setError('');
    }catch(e){if(active()){setError(e instanceof Error?e.message:'Capture check failed.');setStatus('Automatic capture needs attention');}}
    finally{busy.current=false;}
  };
  useEffect(()=>{if(!connected)return;void tickRef.current();const tick=()=>void tickRef.current();const timer=setInterval(tick,30000);window.addEventListener('focus',tick);window.addEventListener('online',tick);return()=>{clearInterval(timer);window.removeEventListener('focus',tick);window.removeEventListener('online',tick);};},[connected,user?.id]);
  return {configured:captureConfigured,email:user?.email||'',connected,status,error,devices,connection,lastReceived,differentAccount,endpoint:captureEndpoint,publicKey:capturePublicKey,
    async signIn(email:string){if(!captureAuth)throw new Error('Automatic capture setup is not available yet.');const {error}=await captureAuth.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin+'/'}});if(error)throw error;},
    async verifyCode(email:string,token:string){if(!captureAuth)throw new Error('Automatic capture setup is not available yet.');if(!/^\d{6}$/.test(token.trim()))throw new Error('Enter the six-digit code from your email.');const {error}=await captureAuth.auth.verifyOtp({email:email.trim(),token:token.trim(),type:'email'});if(error)throw error;},
    async connect(){const u=userRef.current;if(!u)return;if(!belongs(u.id))throw new Error('This browser contains another account’s data. Use that account or a separate browser profile.');const generation=epoch.current;await refreshDevices();if(generation!==epoch.current)return;localStorage.setItem(ownerKey,u.id);setConnected(true);setStatus('Connected · checking for bank alerts');},
    async pair(sourceId:string,label:string){const u=userRef.current;if(!u||!belongs(u.id)||localStorage.getItem(ownerKey)!==u.id)throw new Error('Connect this browser first.');const generation=epoch.current;
      const token=captureToken(crypto.getRandomValues(new Uint8Array(32)));const rows=await captureRpc(u.id,'pair_bank_capture_device',{p_token:token,p_source_id:sourceId,p_source_label:label,p_name:'iPhone bank alerts'});
      if(generation!==epoch.current)return;setConnection({token,source:label,expires:rows[0].expires_at});await refreshDevices();},
    async revoke(id:string){const u=userRef.current;if(!u)return;await captureRpc(u.id,'revoke_bank_capture_device',{p_id:id});setConnection(null);await refreshDevices();},
    refreshDevices,syncNow:()=>tickRef.current(),hideConnection:()=>setConnection(null),
    async recover(){const u=userRef.current;if(!u||!belongs(u.id)||localStorage.getItem(ownerKey)!==u.id)throw new Error('Connect this browser first.');localStorage.removeItem(`finance-capture-cursor-${u.id}`);await tickRef.current();},
    async signOut(){if(!captureAuth)return;const {error}=await captureAuth.auth.signOut({scope:'local'});if(error)throw error;}
  };
}
export type BankCapture=ReturnType<typeof useBankCapture>;
