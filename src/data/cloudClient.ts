import {createClient} from '@supabase/supabase-js';
import type {AppData} from './types';
import type {CloudTransport,CloudRecord} from './cloudMerge';
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
export const cloudConfigured=!!url&&!!key;
export const supabase=cloudConfigured?createClient(url!,key!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export function cloudTransport():CloudTransport {
  if(!supabase)throw new Error('Cloud connection is not configured yet.');
  const client=supabase;
  return {
    async read(){const {data,error}=await client.from('finance_state').select('revision,snapshot').maybeSingle();if(error)throw error;return data as CloudRecord|null;},
    async write(expected:number,snapshot:AppData){const {data,error}=await client.rpc('save_finance_state',{expected_revision:expected,new_snapshot:snapshot});if(error)throw error;return data?.[0] as CloudRecord||null;}
  };
}
