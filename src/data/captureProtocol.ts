import {parseAlert,type BankAlert} from './alerts';
export interface CaptureRow {sequence:number;source_id:string;source_label:string;message_text:string;captured_at:string;received_at:string}
export function captureToken(bytes:Uint8Array):string {if(bytes.length!==32)throw new Error('A capture key needs 32 random bytes.');return 'cap_'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export function captureRequest(token:string,id:string,text:string,receivedAt:string){
  if(!/^cap_[0-9a-f]{64}$/.test(token)||!/^[-A-Za-z0-9_.:+|]{1,128}$/.test(id)||!text.trim()||text.length>10000||Number.isNaN(Date.parse(receivedAt)))throw new Error('Invalid capture request.');
  parseAlert(text);return {p_token:token,p_capture_id:id,p_text:text,p_captured_at:receivedAt,p_version:1};
}
export function captureRows(rows:CaptureRow[],userId:string):BankAlert[]{
  return rows.map(r=>{if(!Number.isSafeInteger(r.sequence)||r.sequence<=0||!/^[-A-Za-z0-9_]{1,128}$/.test(r.source_id)||typeof r.source_label!=='string'||typeof r.message_text!=='string'||Number.isNaN(Date.parse(r.received_at)))throw new Error('Invalid incoming alert.');
    return {...parseAlert(r.message_text),id:`capture_${userId}_${r.sequence}`,sourceId:r.source_id,account:r.source_label,rawText:r.message_text,createdAt:Date.parse(r.received_at),updatedAt:Date.parse(r.received_at)} as BankAlert;
  });
}
export function mergeCaptured(existing:BankAlert[],incoming:BankAlert[]):BankAlert[]{const ids=new Set(existing.map(a=>a.id));return [...existing,...incoming.filter(a=>{if(ids.has(a.id))return false;ids.add(a.id);return true;})];}
export function capturePersisted(ids:string[],raw:string|null):boolean {try{const value=JSON.parse(raw||'null');const found=new Set((value?.bankAlerts||[]).map((a:BankAlert)=>a.id));return ids.every(id=>found.has(id));}catch{return false;}}
export function captureCheckpoint(raw:string|null,savedData:string|null):number {
  if(!raw)return 0;const checkpoint=JSON.parse(raw);
  if(!checkpoint||!Number.isSafeInteger(checkpoint.sequence)||checkpoint.sequence<0||!Array.isArray(checkpoint.ids)||checkpoint.sequence>0&&!checkpoint.ids.length||!checkpoint.ids.every((id:unknown)=>typeof id==='string'&&id.length>0))throw new Error('Capture checkpoint needs recovery.');
  return capturePersisted(checkpoint.ids,savedData)?checkpoint.sequence:0;
}
