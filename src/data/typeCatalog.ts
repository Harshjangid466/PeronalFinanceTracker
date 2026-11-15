import {CORE_TRANSACTION_TYPES,type AppData,type TransactionType} from './types';
import type {MasterItem,MasterKind} from './model';
export const builtinTypeId=(type:string)=>'transaction-type:'+type;
export const recordTypeId=(record:Record<string,unknown>)=>String(record.transactionTypeId||builtinTypeId(String(record.type||'Revenue Expense')));
export function configuredTypes(data:Pick<AppData,'masters'>,includeInactive=false):MasterItem[]{
 const items=data.masters?.filter(m=>m.kind==='transactionType');
 return (items?.length?items:CORE_TRANSACTION_TYPES.map((name,order)=>({id:builtinTypeId(name),kind:'transactionType' as const,name,baseType:name,active:true,order,updatedAt:0}))).filter(m=>includeInactive||m.active).sort((a,b)=>a.order-b.order);
}
export const typeOptionValue=(item:MasterItem)=>item.id===builtinTypeId(item.baseType||'')?item.baseType!:item.id;
export function configuredType(data:Pick<AppData,'masters'>,value:string){return configuredTypes(data,true).find(m=>m.id===value||typeOptionValue(m)===value||m.name===value);}
export function transactionTypeName(data:Pick<AppData,'masters'>,record:{type:string;transactionTypeId?:string}){return configuredType(data,record.transactionTypeId||builtinTypeId(record.type))?.name||record.type;}
export function matchesType(record:{type:string;transactionTypeId?:string},value:string){return !value||CORE_TRANSACTION_TYPES.includes(value as TransactionType)?!value||record.type===value:record.transactionTypeId===value;}
export function categoryKind(type:TransactionType='Revenue Expense',typeId=builtinTypeId(type)):'category'|'typeCategory'{return typeId===builtinTypeId('Revenue Expense')?'category':'typeCategory';}
export function categoriesForType(data:Pick<AppData,'masters'>,type:TransactionType='Revenue Expense',typeId=builtinTypeId(type)){
 const kind=categoryKind(type,typeId),masters=data.masters||[],parentId=kind==='category'?undefined:typeId;
 return masters.filter(m=>m.kind===kind&&m.parentId===parentId&&m.active).sort((a,b)=>a.order-b.order).map(m=>({id:m.id,name:m.name,subCategories:masters.filter(s=>s.kind===(kind==='category'?'subCategory':'typeSubCategory')&&s.parentId===m.id&&s.active).sort((a,b)=>a.order-b.order).map(s=>s.name)}));
}
export function recordFieldKind(field:string,record:Record<string,unknown>,fallback?:MasterKind):MasterKind|undefined{
 if(field==='majorCategory')return categoryKind(record.type as TransactionType,recordTypeId(record));
 if(field==='subCategory')return categoryKind(record.type as TransactionType,recordTypeId(record))==='category'?'subCategory':'typeSubCategory';
 return fallback;
}
export function categoryMaster(data:Pick<AppData,'masters'>,type:TransactionType,typeId:string,field:'majorCategory'|'subCategory',name:string,category:string,id:string,now:number):MasterItem{
 const trimmed=name.trim();if(!trimmed)throw Error('Enter a name.');
 const mainKind=categoryKind(type,typeId),kind=field==='majorCategory'?mainKind:mainKind==='category'?'subCategory':'typeSubCategory';
 const parentId=field==='majorCategory'?mainKind==='typeCategory'?typeId:undefined:categoriesForType(data,type,typeId).find(c=>c.name===category)?.id;
 if(field==='subCategory'&&!parentId)throw Error('Choose an active category first.');
 const existing=data.masters?.find(m=>m.kind===kind&&m.parentId===parentId&&m.name.toLowerCase()===trimmed.toLowerCase());
 if(existing&&!existing.active)throw Error('This value is inactive. Reactivate it in Settings first.');
 return existing||{id,kind,parentId,name:trimmed,active:true,order:(data.masters||[]).filter(m=>m.kind===kind&&m.parentId===parentId).length,updatedAt:now};
}
export function fieldReferencesMaster(record:Record<string,unknown>,field:string,item:MasterItem,fallback?:MasterKind,idField?:string){
 if(recordFieldKind(field,record,fallback)!==item.kind)return false;
 if(idField&&record[idField])return record[idField]===item.id;
 const parent=field==='majorCategory'&&item.kind==='typeCategory'?recordTypeId(record):field==='subCategory'?record.majorCategoryId:undefined;
 return record[field]===item.name&&item.parentId===parent;
}
export function validateTypeCatalog(data:AppData){
 const masters=data.masters||[];
 for(const m of masters){
  if(m.kind==='transactionType'&&(!CORE_TRANSACTION_TYPES.includes(m.baseType!)||m.parentId||!m.name.trim()||CORE_TRANSACTION_TYPES.includes(m.name as TransactionType)&&m.id!==builtinTypeId(m.name)||CORE_TRANSACTION_TYPES.some(t=>m.id===builtinTypeId(t)&&m.baseType!==t)))throw Error('Choose a valid financial behaviour. Built-in transaction behaviours cannot change.');
  if(m.kind==='typeCategory'&&!masters.some(p=>p.id===m.parentId&&p.kind==='transactionType'))throw Error('A category needs its own transaction type.');
  if(m.kind==='typeSubCategory'&&!masters.some(p=>p.id===m.parentId&&p.kind==='typeCategory'))throw Error('A subcategory needs its own parent category.');
 }
 for(const record of [...data.transactions,...data.frequentTransactions,...data.quickExpenses,...data.recurring]){
  const r=record as unknown as Record<string,unknown>;if(!r.transactionTypeId)continue;
  const type=masters.find(m=>m.id===r.transactionTypeId&&m.kind==='transactionType');
  if(!type||type.baseType!==r.type)throw Error('A recorded transaction type has missing or changed financial behaviour. Restore its definition before continuing.');
 }
}
