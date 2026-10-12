import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
export const captureConfigured=!!url&&!!key;
export const captureAuth=captureConfigured?createClient(url!,key!,{auth:{storageKey:'finance-capture-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export const captureEndpoint=url?`${url}/rest/v1/rpc/ingest_bank_capture`:'';
export const capturePublicKey=key||'';
export async function captureRpc(userId:string,name:string,args:Record<string,unknown>={}){
  if(!captureAuth)throw new Error('Automatic capture setup is not available yet.');
  const {data,error}=await captureAuth.auth.getSession();if(error)throw error;
  if(!data.session||data.session.user.id!==userId)throw new Error('Sign in again before continuing.');
  const identity=await captureAuth.auth.getUser(data.session.access_token);
  if(identity.error||identity.data.user?.id!==userId)throw new Error('Sign in again before continuing.');
  const pinned=createClient(url!,key!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:`Bearer ${data.session.access_token}`}}});
  const result=await pinned.rpc(name,args);if(result.error)throw new Error(result.error.code==='PGRST202'?'Automatic capture database setup is pending.':result.error.message);return result.data;
}
