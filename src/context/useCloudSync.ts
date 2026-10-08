import {useState,useEffect,useRef,useCallback} from 'react';
import type {AppData} from '@/data/types';
import {supabase,cloudConfigured,cloudTransport} from '@/data/cloudClient';
import {mergeCloud,exchangeCloud,SyncConflict,type CloudRecord} from '@/data/cloudMerge';
import {mergeBackup} from '@/data/backup';
import {migrateData} from '@/data/model';
import {getDefaultData} from '@/data/defaults';
import {hasUnsavedChanges} from '@/components/NavigationGuard';
export interface CloudSync {
  configured:boolean;email:string;connected:boolean;busy:boolean;status:string;lastSynced:number|null;error:string;conflicts:string[];differentAccount:boolean;
  sendLink:(email:string)=>Promise<void>;signOut:()=>Promise<void>;connect:(mode:'merge'|'cloud')=>Promise<void>;syncNow:(prefer?:'local'|'cloud')=>Promise<void>;
}
const ownerKey='finance-cloud-owner';
const cacheKey=(id:string)=>`finance-cloud-cache-${id}`;
const metaKey=(id:string)=>`finance-cloud-base-${id}`;
function stored<T>(key:string):T|null {try{return JSON.parse(localStorage.getItem(key)||'null') as T|null;}catch{return null;}}
export function useCloudSync(data:AppData,replace:(data:AppData)=>void):CloudSync {
  const latest=useRef(data);latest.current=data;const replaceRef=useRef(replace);replaceRef.current=replace;
  const [identity,setIdentity]=useState<{id:string;email:string}|null>(null);const identityRef=useRef(identity);identityRef.current=identity;
  const [connected,setConnected]=useState(false);const connectedRef=useRef(false);
  const [busy,setBusy]=useState(false);const running=useRef(false);const [error,setError]=useState('');const [conflicts,setConflicts]=useState<string[]>([]);
  const [status,setStatus]=useState(cloudConfigured?'Sign in to connect your devices':'Cloud setup pending');const [lastSynced,setLastSynced]=useState<number|null>(null);
  const baseRef=useRef<CloudRecord|null>(null);
  const owner=localStorage.getItem(ownerKey);const differentAccount=!!identity&&!!owner&&owner!==identity.id;
  useEffect(()=>{
    if(!supabase)return;let alive=true;
    function sessionChanged(session:{user:{id:string;email?:string}}|null){if(!alive)return;const user=session?.user;identityRef.current=user?{id:user.id,email:user.email||''}:null;setIdentity(identityRef.current);connectedRef.current=false;setConnected(false);baseRef.current=null;setError('');setConflicts([]);
      if(user){const saved=stored<CloudRecord>(metaKey(user.id));if(saved&&localStorage.getItem(ownerKey)===user.id){baseRef.current=saved;connectedRef.current=true;setConnected(true);setStatus('Checking cloud updates');}else setStatus('Choose how to connect this browser');}else setStatus('Signed out · local data retained');}
    supabase.auth.getSession().then(({data,error})=>{if(error&&alive)setError(error.message);sessionChanged(data.session);});
    const {data:listener}=supabase.auth.onAuthStateChange((event,session)=>{if(event!=='TOKEN_REFRESHED')sessionChanged(session);});
    return()=>{alive=false;listener.subscription.unsubscribe();};
  },[]);
  function remember(user:string,record:CloudRecord){localStorage.setItem(metaKey(user),JSON.stringify(record));baseRef.current=record;}
  const syncNow=useCallback(async(prefer?:'local'|'cloud')=>{
    const user=identityRef.current;if(!user||!connectedRef.current||running.current)return;
    if(!navigator.onLine){setStatus('Offline · changes saved on this device');return;}
    if(hasUnsavedChanges()){setStatus('Finish or discard the open form before syncing');return;}
    running.current=true;setBusy(true);setError('');setStatus('Syncing');const start=structuredClone(latest.current);
    try{
      const baseline=baseRef.current?.snapshot;if(!baseline)throw new Error('Reconnect this browser to start syncing.');
      if(prefer)localStorage.setItem(`finance-cloud-conflict-copy-${user.id}-${Date.now()}`,JSON.stringify({local:start,cloud:baseRef.current}));
      const result=await exchangeCloud(cloudTransport(),baseline,start,prefer);
      if(identityRef.current?.id!==user.id)return;
      // Edits made while the network request was running are kept for the next upload.
      const reconciled=mergeCloud(start,latest.current,result.snapshot,'local').snapshot;
      if(hasUnsavedChanges()){setStatus('Cloud checked · apply updates after the open form is finished');return;}
      localStorage.setItem(cacheKey(user.id),JSON.stringify(reconciled));remember(user.id,result);
      if(JSON.stringify(latest.current)!==JSON.stringify(reconciled))replaceRef.current(migrateData(reconciled));
      setConflicts([]);setLastSynced(Date.now());setStatus(JSON.stringify(reconciled)===JSON.stringify(result.snapshot)?'Synced across your devices':'Saved locally · upload pending');
    }catch(e){if(e instanceof SyncConflict){setConflicts(e.paths);localStorage.setItem(`finance-cloud-conflict-remote-${user.id}`,JSON.stringify(e.remote));setStatus('Resolve changes from another device');}else{setError(e instanceof Error?e.message:String((e as {message?:string})?.message||'Cloud sync failed.'));setStatus('Saved locally · cloud sync needs attention');}}
    finally{running.current=false;setBusy(false);}
  },[]);
  async function connect(mode:'merge'|'cloud'){
    const user=identityRef.current;if(!user||running.current)return;if(!navigator.onLine){setError('Connect to the internet first.');return;}if(hasUnsavedChanges()){setError('Finish or discard the open form first.');return;}
    if(mode==='merge'&&localStorage.getItem(ownerKey)&&localStorage.getItem(ownerKey)!==user.id){setError('This browser contains another account’s data. Use this account’s cloud data instead.');return;}
    running.current=true;setBusy(true);setError('');
    try{
      const local=structuredClone(latest.current);localStorage.setItem(`finance-before-cloud-${Date.now()}`,JSON.stringify(local));
      const transport=cloudTransport();let remote=await transport.read();const cache=stored<AppData>(cacheKey(user.id));
      let next=mode==='cloud'?(remote?.snapshot||migrateData(getDefaultData())):remote?mergeBackup(remote.snapshot,JSON.stringify(cache||local)):(cache||local);
      if(mode==='merge'){for(let tries=0;tries<5;tries++){const saved=await transport.write(remote?.revision||0,next);if(saved){remote=saved;break;}remote=await transport.read();next=remote?mergeBackup(remote.snapshot,JSON.stringify(cache||local)):(cache||local);if(tries===4)throw new Error('Another device is updating. Please try connecting again.');}}
      if(identityRef.current?.id!==user.id)return;
      const record=remote||{revision:0,snapshot:next};const previousOwner=localStorage.getItem(ownerKey);if(previousOwner&&previousOwner!==user.id)localStorage.setItem(cacheKey(previousOwner),JSON.stringify(latest.current));else next=mergeCloud(local,latest.current,next,'local').snapshot;localStorage.setItem(ownerKey,user.id);localStorage.setItem(cacheKey(user.id),JSON.stringify(next));remember(user.id,record);replaceRef.current(migrateData(next));connectedRef.current=true;setConnected(true);setLastSynced(Date.now());setStatus('Synced across your devices');
    }catch(e){setError(e instanceof Error?e.message:String((e as {message?:string})?.message||'Connection failed.'));}finally{running.current=false;setBusy(false);}
  }
  useEffect(()=>{if(!connected||!identity)return;try{localStorage.setItem(cacheKey(identity.id),JSON.stringify(data));}catch{setError('Browser storage is full. Download a backup before continuing.');}const timer=setTimeout(()=>void syncNow(),1200);return()=>clearTimeout(timer);},[data,connected,identity,syncNow]);
  useEffect(()=>{if(!connected)return;const tick=()=>{if(!document.hidden)void syncNow();};const timer=setInterval(tick,15000);window.addEventListener('online',tick);window.addEventListener('focus',tick);return()=>{clearInterval(timer);window.removeEventListener('online',tick);window.removeEventListener('focus',tick);};},[connected,syncNow]);
  return {configured:cloudConfigured,email:identity?.email||'',connected,busy,status,lastSynced,error,conflicts,differentAccount,syncNow,connect,
    async sendLink(email){if(!supabase)throw new Error('Cloud setup is pending.');const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin+'/'} });if(error)throw error;},
    async signOut(){if(running.current)throw new Error('Wait for the current sync to finish.');const {error}=await supabase!.auth.signOut({scope:'local'});if(error)throw error;connectedRef.current=false;setConnected(false);}
  };
}
