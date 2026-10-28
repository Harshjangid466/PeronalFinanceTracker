import {useEffect,useState,type ReactNode} from 'react';
export function AccountTabLock({id,children}:{id:string;children:ReactNode}){
 const [allowed,setAllowed]=useState(false),[error,setError]=useState('Opening account storage. If this account is open in another tab, close that tab to continue here.');
 useEffect(()=>{let alive=true,release:(()=>void)|undefined;const controller=new AbortController();
   if(!navigator.locks){setError('This browser cannot safely coordinate account storage. Use an updated browser.');return;}
   void navigator.locks.request(`finance-account:${id}`,{signal:controller.signal},async lock=>{
     if(!alive)return;if(!lock){setError('This account is already open in another tab. Close that tab and reload this one.');return;}
     await new Promise<void>(resolve=>{release=resolve;if(alive)setAllowed(true);else resolve();});
   }).catch(()=>{if(alive&&!controller.signal.aborted)setError('Account storage could not be locked. Reload to retry.');});
   return()=>{alive=false;controller.abort();release?.();};
 },[id]);
 return allowed?<>{children}</>:<p role="status" className="p-4">{error}</p>;
}
