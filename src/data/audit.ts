import type { AppData, ActionLogRecord } from './types';
import { stableId } from './model';
export function auditChanges(before:AppData, after:AppData):AppData {
  const logs:ActionLogRecord[]=[]; const timestamp=Date.now();
  for(const key of Object.keys(after)) {
    if(['actionLog','schemaVersion','paymentModeSources','sourceMappings'].includes(key))continue;
    const old=(before as unknown as Record<string,unknown>)[key]; const next=(after as unknown as Record<string,unknown>)[key];
    if(JSON.stringify(old)===JSON.stringify(next))continue;
    if(Array.isArray(old) && Array.isArray(next) && [...old,...next].every(v=>v && typeof v==='object' && 'id' in v)) {
      const a=new Map(old.map(v=>[v.id,v])); const b=new Map(next.map(v=>[v.id,v]));
      for(const id of new Set([...a.keys(),...b.keys()])) {
        const prev=a.get(id), value=b.get(id); if(JSON.stringify(prev)===JSON.stringify(value))continue;
        const action=!prev?'create':!value?'delete':value.status==='deleted' && prev.status!=='deleted'?'delete':prev.status==='deleted' && value.status==='active'?'restore':value.active===false && prev.active!==false?'deactivate':value.active===true && prev.active===false?'reactivate':'edit';
        logs.push({id:`log_${timestamp}_${logs.length}_${Math.random().toString(36).slice(2,8)}`,timestamp,actionType:action,entityType:key,entityId:String(id),description:`${action} ${value?.name || value?.heading || value?.label || value?.description || key}`,beforeValue:prev,afterValue:value});
      }
    } else logs.push({id:`log_${timestamp}_${logs.length}_${Math.random().toString(36).slice(2,8)}`,timestamp,actionType:'configuration',entityType:key,entityId:stableId('config',key),description:`Changed ${key}`,beforeValue:old,afterValue:next});
  }
  if(JSON.stringify(before.sourceMappings)!==JSON.stringify(after.sourceMappings))logs.push({id:`mapping_${timestamp}_${Math.random().toString(36).slice(2,8)}`,timestamp,actionType:'configuration',entityType:'sourceMappings',entityId:'sourceMappings',description:'Changed payment mode/source mappings',beforeValue:before.sourceMappings,afterValue:after.sourceMappings});
  return {...after,actionLog:[...(after.actionLog||[]),...logs]};
}
