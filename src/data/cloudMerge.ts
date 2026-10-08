import type {AppData} from './types';
export interface CloudRecord {revision:number;snapshot:AppData}
export interface MergeResult {snapshot:AppData;conflicts:string[]}
const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;
const same=(a:unknown,b:unknown):boolean=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const identified=(v:unknown):v is Array<Record<string,unknown>&{id:string}>=>Array.isArray(v)&&v.every(x=>object(x)&&typeof x.id==='string');
export function mergeCloud(base:AppData,local:AppData,remote:AppData,prefer?:'local'|'cloud'):MergeResult {
  const conflicts:string[]=[];
  function merge(b:unknown,l:unknown,r:unknown,path:string):unknown {
    if(same(l,r))return l;
    if(same(l,b))return r;
    if(same(r,b))return l;
    // These labels are projections of stable masters/mappings, rebuilt after merging.
    if(['accounts','paymentModes','people','categories','capexPurchasedFrom','toGharPaymentFor','incomeTypes','investmentTypes','paymentModeSources'].includes(path))return l;
    if(typeof l==='number'&&typeof r==='number'&&/\.(createdAt|updatedAt|timestamp)$/.test(path))return path.endsWith('.createdAt')?Math.min(l,r):Math.max(l,r);
    if(identified(l)&&identified(r)&&(b===undefined||identified(b))){
      const before=new Map((b||[]).map(x=>[x.id,x]));const left=new Map(l.map(x=>[x.id,x]));const right=new Map(r.map(x=>[x.id,x]));
      return [...new Set([...left.keys(),...right.keys()])].map(id=>merge(before.get(id),left.get(id),right.get(id),`${path}[${id}]`)).filter(x=>x!==undefined);
    }
    if(object(l)&&object(r)&&(b===undefined||object(b))){
      return Object.fromEntries([...new Set([...Object.keys(l),...Object.keys(r),...Object.keys(b||{})])].map(k=>[k,merge(b?.[k],l[k],r[k],path?`${path}.${k}`:k)]).filter(([,v])=>v!==undefined));
    }
    // Skips are append-only occurrence IDs; each device's additions must survive.
    if(path==='skippedOccurrences'&&Array.isArray(l)&&Array.isArray(r))return [...new Set([...l,...r])];
    conflicts.push(path);return prefer==='cloud'?r:l;
  }
  return {snapshot:structuredClone(merge(base,local,remote,'') as AppData),conflicts};
}
export interface CloudTransport {read():Promise<CloudRecord|null>;write(expected:number,snapshot:AppData):Promise<CloudRecord|null>}
export class SyncConflict extends Error {
  constructor(public paths:string[],public remote:CloudRecord){super('Both devices changed the same information. Choose which version to keep.');}
}
export async function exchangeCloud(transport:CloudTransport,base:AppData,local:AppData,prefer?:'local'|'cloud'):Promise<CloudRecord>{
  for(let attempt=0;attempt<5;attempt++){
    const remote=await transport.read();
    const merged=remote?mergeCloud(base,local,remote.snapshot,prefer):{snapshot:local,conflicts:[]};
    if(remote&&merged.conflicts.length&&!prefer)throw new SyncConflict(merged.conflicts,remote);
    if(remote&&same(remote.snapshot,merged.snapshot))return remote;
    const written=await transport.write(remote?.revision||0,merged.snapshot);
    if(written)return written;
  }
  throw new Error('Another device is updating. Your changes remain saved locally; try Sync Now again.');
}
