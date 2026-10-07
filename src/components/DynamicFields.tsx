import type {CustomFieldDefinition} from '@/data/types';
import {visibleField} from '@/data/model';
import {inputStyle} from './ConfigurationTools';
export function DynamicFields({fields,values,onChange}:{fields:CustomFieldDefinition[];values:Record<string,unknown>;onChange:(key:string,value:unknown)=>void}) {
  return <>{[...fields].sort((a,b)=>a.order-b.order).filter(f=>visibleField(f,fields,values)).map(f=>{
    const value=values[f.key];const scoped=f.parentFieldKey?f.dependentOptions?.[String(values[f.parentFieldKey])]:undefined;const choices=scoped?.length?scoped.filter(option=>f.options?.includes(option)):f.options||[];
    return <label key={f.id} className="block text-xs space-y-1">{f.label}{f.required?' *':''}
      {f.type==='boolean'?<select aria-label={f.label} className={inputStyle} value={value===undefined?'':String(value)} onChange={e=>onChange(f.key,e.target.value===''?undefined:e.target.value==='true')}><option value="">Select</option><option value="true">Yes</option><option value="false">No</option></select>:
      f.type==='multiSelect'?<select aria-label={f.label} multiple className={inputStyle} value={Array.isArray(value)?value.map(String):[]} onChange={e=>onChange(f.key,Array.from(e.target.selectedOptions,o=>o.value))}>{choices.map(o=><option key={o}>{o}</option>)}</select>:
      f.type==='dropdown'?<select aria-label={f.label} className={inputStyle} value={String(value??'')} onChange={e=>onChange(f.key,e.target.value)}><option value="">Select {f.label}</option>{Array.from(new Set([...choices,...(value&&!choices.includes(String(value))?[String(value)]:[])])).map(o=><option key={o}>{o}</option>)}</select>:
      f.type==='longText'?<textarea aria-label={f.label} rows={3} className={inputStyle} value={String(value??'')} onChange={e=>onChange(f.key,e.target.value)}/>:
      <input aria-label={f.label} className={inputStyle} type={f.type==='date'?'date':['number','decimal'].includes(f.type)?'number':'text'} step={f.type==='decimal'?'any':'1'} value={String(value??'')} onChange={e=>onChange(f.key,e.target.value)}/>}
    </label>;
  })}</>;
}
