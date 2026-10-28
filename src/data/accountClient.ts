import {createClient} from '@supabase/supabase-js';
const params = new URLSearchParams(window.location.search);
export const accountCallbackType = params.get('type') || new URLSearchParams(window.location.hash.slice(1)).get('type');
export const accountPasswordCallback = accountCallbackType === 'invite' || accountCallbackType === 'recovery';
const callbackToken = params.get('token_hash');
export const accountsEnabled = import.meta.env.VITE_ACCOUNTS_ENABLED === 'true';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const accountAuth = accountsEnabled && url && key ? createClient(url, key, {
  auth: {storageKey: 'finance-account-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce'},
}) : null;
export const accountRedirect = () => window.location.origin + window.location.pathname;

// Share consumption across React StrictMode mounts: email tokens are single-use.
let callbackPromise: Promise<void> | undefined;
export function consumeAccountCallback(): Promise<void> {
  return callbackPromise ??= (async()=>{
    if (!accountAuth || !callbackToken || !accountPasswordCallback) return;
    const {error}=await accountAuth.auth.verifyOtp({token_hash:callbackToken,type:accountCallbackType as 'invite'|'recovery'});
    if(error) throw error;
    window.history.replaceState(null,'',accountRedirect());
  })();
}
