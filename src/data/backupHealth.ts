import type {AppData} from './types';
import {storageName,accountWritesBlocked} from './accountStorage';
import {todayISO} from './format';
export interface BackupReceipt {requestedAt:number;lastActionId:string|null;complete:boolean;}
export const BACKUP_HEALTH_KEY='finance-backup-health';
export function readBackupReceipt():{receipt?:BackupReceipt;error?:string}{
 try{const raw=localStorage.getItem(storageName(BACKUP_HEALTH_KEY));if(!raw)return {};const value=JSON.parse(raw);if(!value||!Number.isFinite(value.requestedAt)||value.requestedAt<=0||typeof value.complete!=='boolean'||value.lastActionId!==null&&typeof value.lastActionId!=='string')throw Error();return {receipt:value};}catch{return {error:'Backup reminder history could not be read. Download a fresh backup and keep the file safely.'};}
}
export function backupHealth(data:AppData,receipt:BackupReceipt|undefined,now=Date.now()){
 const index=receipt?.lastActionId?data.actionLog.findIndex(a=>a.id===receipt.lastActionId):-1;
 const historyChanged=!!receipt?.lastActionId&&index<0,clockChanged=!!receipt&&receipt.requestedAt>now;
 const changes=historyChanged?undefined:data.actionLog.slice(index+1).filter(a=>a.actionType!=='backup').length;
 const hasRecords=!!(data.transactions.length||data.statementRows?.length||data.actionLog.some(a=>a.actionType!=='backup'));
 const ageDays=receipt?Math.max(0,Math.floor((now-receipt.requestedAt)/86400000)):undefined;
 const remind=receipt?(!receipt.complete||historyChanged||clockChanged||!!changes&&(ageDays??0)>=7):hasRecords;
 return {changes,historyChanged,clockChanged,ageDays,remind};
}
export function requestBackupDownload(json:string):{receipt:BackupReceipt;warning?:string}{
 const backup=JSON.parse(json);if(!backup.data||!Array.isArray(backup.data.transactions))throw Error('Backup content is unavailable.');
 const receipt:BackupReceipt={requestedAt:Date.now(),lastActionId:backup.data.actionLog?.slice(-1)[0]?.id||null,complete:backup.statementHistoryComplete===true};
 const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),link=document.createElement('a');
 try{link.href=url;link.download=`finance_tracker_${receipt.complete?'backup':'partial_backup'}_${todayISO()}.json`;document.body.appendChild(link);link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 let warning:string|undefined;
 try{if(accountWritesBlocked())throw Error();localStorage.setItem(storageName(BACKUP_HEALTH_KEY),JSON.stringify(receipt));}catch{warning='Download requested, but the reminder could not be updated. Check that the file was saved.';}
 window.dispatchEvent(new Event('finance-backup-downloaded'));
 return {receipt,warning};
}
