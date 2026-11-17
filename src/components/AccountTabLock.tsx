import {useEffect,useState,type ReactNode} from 'react';
export function AccountTabLock({id,children}:{id:string;children:ReactNode}){
 const [allowed,setAllowed]=useState(false),[error,setError]=useState('Opening your ledger. If Finance is open in another tab or app window, close that window to continue here.');
 useEffect(()=>{let alive=true,release:(()=>void)|undefined;const controller=new AbortController();
   // Older browsers still get the synchronous stale-write check in storage.ts.
   if(!navigator.locks){setAllowed(true);return;}
   void navigator.locks.request(`finance-account:${id}`,{signal:controller.signal},async lock=>{
     if(!alive)return;if(!lock){setError('This account is already open in another tab. Close that tab and reload this one.');return;}
     await new Promise<void>(resolve=>{release=resolve;if(alive)setAllowed(true);else resolve();});
   }).catch(()=>{if(alive&&!controller.signal.aborted)setError('Account storage could not be locked. Reload to retry.');});
   return()=>{alive=false;controller.abort();release?.();};
 },[id]);
 return allowed?<>{children}</>:<main className="opening-ledger" role="status"><h1>Opening your ledger</h1><p>{error}</p><small>Your records stay in this browser. No data is being cleared.</small></main>;
}
