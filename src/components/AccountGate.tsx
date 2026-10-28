import {newAccountData} from '@/data/newAccountData';
import {requestNavigation} from './NavigationGuard';
import {AccountTabLock} from './AccountTabLock';
import {cloudEnabled,checkAccountDeletion,purgeAccount} from '@/data/cloudSyncClient';
import {useEffect, useState, type ReactNode} from 'react';
import type {Session} from '@supabase/supabase-js';
import {accountAuth, accountsEnabled, accountRedirect, accountPasswordCallback, consumeAccountCallback} from '@/data/accountClient';
import {accountStorageName, setStorageOwner} from '@/data/accountStorage';

const input='w-full rounded border border-slate-500 bg-transparent p-2';
const button='rounded border border-slate-500 px-3 py-2 disabled:opacity-50';
export function AccountGate({children}: {children: ReactNode}) {
  const [session,setSession]=useState<Session|null>(null),[checked,setChecked]=useState(false);
  const [ready,setReady]=useState(false),[manage,setManage]=useState(false),[passwordFlow,setPasswordFlow]=useState(accountPasswordCallback);
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [purging,setPurging]=useState(false);
  const [legacy,setLegacy]=useState(false);
  useEffect(()=>{
    if(!accountAuth)return;
    let alive=true,seen=false;let mountedOwner:string|undefined;
    const update=(next:Session|null)=>{
      if(!alive || (!next && accountPasswordCallback))return;
      if(mountedOwner!==undefined && mountedOwner!==(next?.user.id||'')) {window.location.reload();return;}
      mountedOwner=next?.user.id||'';
      setStorageOwner(next?.user.id||null);setSession(next);setChecked(true);
      if(next){
        const initialized=localStorage.getItem(accountStorageName('finance-account-initialized',next.user.id));
        setReady(!!initialized);
        setLegacy(!localStorage.getItem('finance-legacy-claimed') && !!(localStorage.getItem('finance-tracker-data-v2')||localStorage.getItem('finance-tracker-data-v1')));
      }else setReady(false);
    };
    const {data}=accountAuth.auth.onAuthStateChange((event,next)=>{if(next||!accountPasswordCallback)seen=true;if(event==='PASSWORD_RECOVERY'){setPasswordFlow(true);setManage(true);}update(next);});
    consumeAccountCallback().then(()=>accountAuth!.auth.getSession()).then(({data,error})=>{if(!alive||seen)return;if(error){setMessage(error.message);setChecked(true);}else update(data.session);}).catch(e=>{if(alive){setMessage(e instanceof Error?e.message:'Could not check account. Reload to retry.');setChecked(true);}});
    return()=>{alive=false;data.subscription.unsubscribe();};
  },[]);
  useEffect(()=>{
    if(!cloudEnabled)return;
    const deleted=()=>{setReady(false);setChecked(false);void accountAuth!.auth.signOut({scope:'local'}).finally(()=>window.location.reload());};
    const start=()=>setPurging(true);
    const check=()=>{const id=localStorage.getItem('finance-account-last-owner');if(id)void (localStorage.getItem(accountStorageName('finance-account-purge-pending',id))?purgeAccount(id):checkAccountDeletion(id)).catch(()=>{});};
    window.addEventListener('finance-account-purge-start',start);window.addEventListener('finance-account-deleted',deleted);window.addEventListener('online',check);check();
    return()=>{window.removeEventListener('finance-account-purge-start',start);window.removeEventListener('finance-account-deleted',deleted);window.removeEventListener('online',check);};
  },[]);
  async function run(action:()=>Promise<void>){setBusy(true);setMessage('');try{await action();}catch(e){setMessage(e instanceof Error?e.message:'Account action failed.');}finally{setBusy(false);}}
  async function initialize(copy:boolean){
    if(!session)return;
    const id=session.user.id;
    if(copy){
      if(localStorage.getItem('finance-legacy-claimed'))throw Error('Existing browser data has already been assigned.');
      const raw=localStorage.getItem('finance-tracker-data-v2')||localStorage.getItem('finance-tracker-data-v1');
      if(!raw)throw Error('No existing ledger found.');
      const parsed=JSON.parse(raw);if(!Array.isArray(parsed.transactions))throw Error('Existing ledger is invalid. Restore a backup first.');
      const archive=await new Promise<unknown>((resolve,reject)=>{
        const request=indexedDB.open('finance-statement-history',1);
        request.onupgradeneeded=()=>request.result.createObjectStore('archive');
        request.onerror=()=>reject(Error('Could not read statement history.'));
        request.onsuccess=()=>{const db=request.result;const tx=db.transaction('archive','readonly'),read=tx.objectStore('archive').get('current');read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(Error('Could not read statement history.'));tx.oncomplete=()=>db.close();};
      });
      if(archive)await new Promise<void>((resolve,reject)=>{
        const request=indexedDB.open(accountStorageName('finance-statement-history',id),1);
        request.onupgradeneeded=()=>request.result.createObjectStore('archive');request.onerror=()=>reject(Error('Could not copy statement history.'));
        request.onsuccess=()=>{const db=request.result,tx=db.transaction('archive','readwrite');tx.objectStore('archive').put(archive,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=tx.onabort=()=>{db.close();reject(Error('Could not copy statement history.'));};};
      });
      localStorage.setItem(accountStorageName('finance-tracker-data-v2',id),raw);
      localStorage.setItem('finance-legacy-claimed',id);
    }
    if(!copy)localStorage.setItem(accountStorageName('finance-tracker-data-v2',id),JSON.stringify(newAccountData()));
    localStorage.setItem(accountStorageName('finance-account-initialized',id),'true');setReady(true);
  }
  if(!accountsEnabled)return <>{children}</>;
  const shell=(content:ReactNode)=><main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-6"><section className="mx-auto max-w-md space-y-4"><h1 className="text-xl font-semibold">Account &amp; sync</h1>{content}{message&&<p role="status">{message}</p>}</section></main>;
  if(purging)return shell(<p>Removing deleted account device copies. Close other app tabs and reload if cleanup cannot finish.</p>);
  if(!accountAuth)return shell(<p>Account setup is not configured. Configure the Supabase URL and publishable key before enabling accounts. Existing device data is preserved.</p>);
  if(!checked)return shell(<p>Checking your account…</p>);
  if(!session)return shell(<form className="space-y-3" onSubmit={e=>{e.preventDefault();void run(async()=>{const {error}=await accountAuth!.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;setPassword('');});}}>
    <p>Invited users only. Sign in to access your account’s data on this device.</p>
    <label className="block">Email<input className={input} type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label className="block">Password<input className={input} type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
    <button className={button} disabled={busy}>Sign in</button>
    <button className={button} type="button" disabled={busy||!email.trim()} onClick={()=>void run(async()=>{const {error}=await accountAuth!.auth.resetPasswordForEmail(email.trim(),{redirectTo:accountRedirect()});if(error)throw error;setMessage('If the account is eligible, a recovery email will arrive.');})}>Forgot password</button>
    <p>Open your invitation email to accept an invitation and set your password. Cloud sync is optional and requires separate server configuration.</p>
  </form>);
  // Invitations also arrive as authenticated sessions. Require setting a password before entering.
  if(passwordFlow||manage)return shell(<div className="space-y-3"><p>{session.user.email}</p><form className="space-y-3" onSubmit={e=>{e.preventDefault();void run(async()=>{const {error}=await accountAuth!.auth.updateUser({password});if(error)throw error;setPassword('');setPasswordFlow(false);setManage(false);setMessage('Password updated.');});}}><label className="block">New password<input className={input} type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className={button} disabled={busy}>Save password</button></form>{!passwordFlow&&<button className={button} disabled={busy} onClick={()=>setManage(false)}>Back</button>}<button className={button} disabled={busy} onClick={()=>void run(async()=>{const {error}=await accountAuth!.auth.signOut({scope:'local'});if(error)throw error;window.location.reload();})}>Sign out</button><p>Signing out keeps local changes on this device; it does not upload them. Sync now before signing out if you need those changes on another device. Cloud sync and deletion controls are available in the ledger when configured.</p></div>);
  if(!ready){
    const raw=localStorage.getItem('finance-tracker-data-v2')||localStorage.getItem('finance-tracker-data-v1');
    let count:number|undefined;try{count=JSON.parse(raw||'{}').transactions?.length;}catch{/* Preserve unreadable data. */}
    return shell(<div className="space-y-3"><p>Signed in as {session.user.email}. Choose this device’s starting data. No financial records will be uploaded.</p>{legacy&&<><p>Unassigned browser ledger: {count??'unreadable'} transactions. Only claim it if it belongs to this account. The original copy remains intact; saved PDF passwords are not copied.</p><button className={button} disabled={busy||count===undefined} onClick={()=>void run(()=>initialize(true))}>These records belong to me — copy to my account</button></>}<button className={button} disabled={busy} onClick={()=>void run(()=>initialize(false))}>Start with a separate ledger</button><button className={button} onClick={()=>requestNavigation(()=>setManage(true))}>Manage account</button></div>);
  }
  return <><div className="bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100 px-4 py-2 text-sm flex justify-between"><span>{session.user.email} · {cloudEnabled?'Cloud sync available':'Device only'}</span><button className="underline" onClick={()=>requestNavigation(()=>setManage(true))}>Account &amp; sync</button></div><AccountTabLock id={session.user.id}>{children}</AccountTabLock></>;
}
