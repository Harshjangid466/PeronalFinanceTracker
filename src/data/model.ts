import type { AppData, Transaction, RuleDefinition, CustomFieldDefinition } from './types';
import {validateAlerts} from './alerts';
import {validateStatementRows,validateHabits,validateStatementBatches} from './statements';
import {applyRemovalTombstones,validateEntryMetadata} from './entryManagement';
import {applyCardOffsetState} from './cardReconciliation';

export type MasterKind = 'source' | 'paymentMode' | 'category' | 'subCategory' | 'person' | 'merchant' | 'purpose' | 'incomeType' | 'investmentType' | 'dropdownOption';
export interface MasterItem { id: string; kind: MasterKind; name: string; active: boolean; order: number; parentId?: string; updatedAt: number }
export const canonicalSources = ['Cash','HDFC Savings A/c','BOB Savings A/c','SBI Savings A/c','RGB Savings A/c','HDFC Swiggy CC','Amazon ICICI CC','Flipkart Axis CC','ICICI Coral CC','Scapia Federal CC','BOB ICAI CC','SBI PhonePe CC','Axis Neo CC','Amazon Pay','Pluxee card','Splitwise'];
export const canonicalModes = ['Cash','UPI','CC','Net banking','Splitwise','Wallet'];
export const canonicalPeople = ['Siddharth Bhardwaj','VBL Pepsi Business'];
export const canonicalCategories = ['Food','Commute','Entertainment/Internet','Delhi Flat expense','Annual Expenditure','Travel/Trip','Misc'];
const aliases: Partial<Record<MasterKind, Record<string,string>>> = {
  source: {'Split wise':'Splitwise','ICICI Amazon CC':'Amazon ICICI CC','ICICI Amazon Pay CC':'Amazon ICICI CC','Axis Flipkart CC':'Flipkart Axis CC','Scapia CC':'Scapia Federal CC','BOB CC':'BOB ICAI CC','Pluxee':'Pluxee card','SBI Phonepe CC':'SBI PhonePe CC'},
  category: {'Delhi flat expense':'Delhi Flat expense','Annual Expense':'Annual Expenditure','Travel trip':'Travel/Trip'},
  paymentMode: {'Credit Card':'CC','Net Banking':'Net banking'}, person: {'Siddharth':'Siddharth Bhardwaj'},
};
export const canonicalName = (kind: MasterKind, name: string) => aliases[kind]?.[name] || name;
export function stableId(kind: string, name: string): string {
  let hash = 2166136261; for (const c of name) hash = Math.imul(hash ^ c.charCodeAt(0),16777619);
  return `${kind}_${(hash >>> 0).toString(36)}`;
}
export const masterFields: Record<string,MasterKind> = {account:'source',paymentMode:'paymentMode',majorCategory:'category',subCategory:'subCategory',person:'person',purchasedFrom:'merchant',paymentFor:'purpose',incomeType:'incomeType',investmentType:'investmentType'};
export const idFields: Record<string,string> = {account:'sourceId',paymentMode:'paymentModeId',majorCategory:'majorCategoryId',subCategory:'subCategoryId',person:'personId',purchasedFrom:'merchantId',paymentFor:'purposeId',incomeType:'incomeTypeId',investmentType:'investmentTypeId'};
export const listFields: Record<string, MasterKind> = {accounts:'source',paymentModes:'paymentMode',people:'person',capexPurchasedFrom:'merchant',toGharPaymentFor:'purpose',incomeTypes:'incomeType',investmentTypes:'investmentType'};
export function migrateData(input: AppData): AppData {
  validateEntryMetadata(input);
  const data = applyCardOffsetState(applyRemovalTombstones(structuredClone(input)));
  if(data.monthlyIncomeMinor&&(typeof data.monthlyIncomeMinor!=='object'||Array.isArray(data.monthlyIncomeMinor)||Object.entries(data.monthlyIncomeMinor).some(([month,value])=>!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Number.isSafeInteger(value)||value<0)))throw Error('Invalid monthly income figures');
  data.statementRows ||= []; data.statementBatches ||= []; validateStatementRows(data.statementRows);
  validateStatementBatches(data.statementBatches);
  if(data.importHabits)validateHabits(data.importHabits);
  if(data.dismissedHabitSuggestions&&(!Array.isArray(data.dismissedHabitSuggestions)||data.dismissedHabitSuggestions.some(id=>typeof id!=='string')))throw Error('Invalid dismissed habit suggestions');
  data.bankAlerts ||= []; validateAlerts(data.bankAlerts);
  const upgrading = data.schemaVersion < 4 || !data.masters;
  data.masters ||= []; data.sourceMappings ||= {}; data.suppressedPatterns ||= [];
  data.rules ||= []; data.actionLog ||= []; data.learningEnabled ??= true;
  const ensure = (kind: MasterKind, raw: string, parentId?: string, active = true): MasterItem | undefined => {
    if (!raw) return undefined;
    const name = upgrading ? canonicalName(kind, raw) : raw;
    let item = data.masters!.find(m=>m.kind===kind && m.name===name && m.parentId===parentId);
    if (!item) { item = {id:stableId(kind,(parentId || '')+name),kind,name,active,order:data.masters!.filter(m=>m.kind===kind).length,updatedAt:Date.now(),parentId}; data.masters!.push(item); }
    return item;
  };
  for (const [key,kind] of Object.entries(listFields)) for (const name of (data as unknown as Record<string,string[]>)[key] || []) ensure(kind,name);
  for (const cat of data.categories) { const parent=ensure('category',cat.name); for (const sub of cat.subCategories) ensure('subCategory',sub,parent?.id); }
  if (upgrading) {
    canonicalSources.forEach(n=>ensure('source',n)); canonicalModes.forEach(n=>ensure('paymentMode',n)); canonicalPeople.forEach(n=>ensure('person',n)); canonicalCategories.forEach(n=>ensure('category',n));
  }
  if(upgrading){for(const [key,kind] of Object.entries({deactivatedAccounts:'source',deactivatedPaymentModes:'paymentMode',deactivatedCategories:'category',deactivatedPeople:'person'} as Record<string,MasterKind>))for(const name of (data as unknown as Record<string,string[]>)[key]||[]){const item=ensure(kind,name);if(item)item.active=false;}}
  const attach = (record: Record<string,unknown>) => {
    for (const [field,kind] of Object.entries(masterFields)) {
      const name=String(record[field] || '');
      const parentId=kind==='subCategory' ? String(record.majorCategoryId || '') : undefined;
      const referenced=data.masters!.find(m=>m.id===record[idFields[field]]&&m.kind===kind);
      const item=referenced || ensure(kind,name,parentId,false);
      if (item) { record[field]=item.name; record[idFields[field]]=item.id; }
    }
  };
  data.transactions.forEach(t=>{
    attach(t as unknown as Record<string,unknown>);
    t.amountMinor = Math.round(t.amountMinor ?? t.amount*100); t.amount=t.amountMinor/100; t.schemaVersion=4;
    t.financialEffect = financialEffect(t.type,t.amountMinor);
  });
  [...data.recurring,...data.frequentTransactions,...data.quickExpenses,...data.receivables,...data.repayments].forEach(t=>attach(t as unknown as Record<string,unknown>));
  for (const cf of data.customFields) for (const option of [...(cf.options || []),...Object.values(cf.dependentOptions||{}).flat()]) ensure('dropdownOption', option,cf.id);
  for (const rule of data.rules) for (const part of [...rule.conditions,...rule.actions]) {
    const field='field' in part ? part.field : part.targetField;
    const custom=data.customFields.find(f=>f.key===field);const kind=masterFields[field] || (custom&&['dropdown','multiSelect'].includes(custom.type)?'dropdownOption':undefined);
    if (kind && !part.valueId) { const item=ensure(kind,part.value,custom?.id,false); if(item){ part.valueId=item.id; part.value=item.name; } }
  }
  if (upgrading) {
    for (const [mode,sources] of Object.entries(data.paymentModeSources || {})) {
      const pm=ensure('paymentMode',mode); if (!pm) continue;
      data.sourceMappings[pm.id]=Array.from(new Set([...(data.sourceMappings[pm.id] || []),...sources.map(s=>ensure('source',s,undefined,false)?.id).filter((s):s is string=>!!s)]));
    }
  }
  for(const t of data.transactions) {
    t.customFieldIds=Object.fromEntries(data.customFields.map(f=>[f.key,f.id]));
    t.customOptionIds={};
    for(const f of data.customFields.filter(f=>f.type==='dropdown'||f.type==='multiSelect')) {
      const value=t.customFields?.[f.key];const names=Array.isArray(value)?value.map(String):value===undefined?[]:[String(value)];
      t.customOptionIds[f.id]=names.map(name=>data.masters!.find(m=>m.kind==='dropdownOption'&&m.parentId===f.id&&m.name===name)?.id).filter((id):id is string=>!!id);
    }
  }
  data.schemaVersion=4;
  return projectMasters(data);
}
export function projectMasters(data: AppData): AppData {
  const active=(kind:MasterKind)=>data.masters!.filter(m=>m.kind===kind && m.active).sort((a,b)=>a.order-b.order);
  for (const [key,kind] of Object.entries(listFields)) (data as unknown as Record<string,unknown>)[key]=active(kind).map(m=>m.name);
  data.customFields=data.customFields.map(f=>({...f,options:f.type==='dropdown'||f.type==='multiSelect'?active('dropdownOption').filter(o=>o.parentId===f.id).map(o=>o.name):f.options}));
  data.categories=active('category').map(m=>({name:m.name,subCategories:active('subCategory').filter(s=>s.parentId===m.id).map(s=>s.name)}));
  return data;
}
export function financialEffect(type: string, paise: number) {
  return {personalExpense:type==='Revenue Expense'?paise:0,income:type==='Income Misc'?paise:0,receivableIncrease:type==='Lent'?paise:0,receivableDecrease:type==='Lent Recovered'?paise:0,capex:type==='CAPEX'?paise:0,investment:type==='Investment'?paise:0,toGhar:type==='To Ghar'?paise:0};
}
export const isActive = (t: Transaction) => t.status==='active';
const ruleTier=(rule:RuleDefinition)=>rule.id==='rule_default_rev_exp_source'&&!rule.userEdited?3:rule.isLearned?2:1;
export function ruleDefaults(rules: RuleDefinition[], masters: MasterItem[], fields: Record<string,unknown>): Record<string,string> {
  const result:Record<string,string>={};
  for (const rule of [...rules].filter(r=>r.enabled).sort((a,b)=>Number(b.locked)-Number(a.locked)||ruleTier(a)-ruleTier(b)||a.priority-b.priority)) {
    if (!rule.conditions.every(c=>{
      const raw=c.field==='transactionType'?fields.type:fields[c.field];
      const expected=c.valueId?masters.find(m=>m.id===c.valueId)?.name:c.value;
      if(expected===undefined)return false;
      const actual=String(raw??'');
      return c.operator==='notEquals'?actual!==expected:c.operator==='contains'?actual.toLowerCase().includes(expected.toLowerCase()):actual===expected;
    }))continue;
    for (const action of rule.actions) if (!(action.targetField in result)) {
      const item=action.valueId?masters.find(m=>m.id===action.valueId):undefined;
      if (action.valueId && (!item || !item.active))continue;
      result[action.targetField]=item?.name ?? action.value;
    }
  }
  return result;
}
export function visibleField(field: CustomFieldDefinition, all: CustomFieldDefinition[], values: Record<string,unknown>, path=new Set<string>()): boolean {
  if (!field.enabled || field.active===false || path.has(field.key))return false;
  if(!field.parentFieldKey)return true;
  const parent=all.find(f=>f.key===field.parentFieldKey);
  if(!parent)return false;
  path.add(field.key);
  return visibleField(parent,all,values,path) && (field.parentOptionValue ? (Array.isArray(values[parent.key]) ? (values[parent.key] as unknown[]).includes(field.parentOptionValue) : String(values[parent.key]??'')===field.parentOptionValue) : values[parent.key]!=='' && values[parent.key]!==undefined);
}
export function searchableText(value:unknown):string { if(Array.isArray(value))return value.map(searchableText).join(' ');if(value&&typeof value==='object')return Object.entries(value).map(([key,item])=>key+' '+searchableText(item)).join(' ');return String(value??'').toLowerCase();}
export function patternKey(t: Partial<Transaction>): string {
  return JSON.stringify([t.type,t.majorCategory,t.subCategory,t.paymentMode,t.account,t.person,t.purchasedFrom,t.paymentFor,t.incomeType,t.investmentType,Math.round((t.amount||0)/10)*10,Object.entries(t.customFields||{}).sort()]);
}
export function dependencies(data: AppData, item: MasterItem) {
  const fields=Object.entries(masterFields).filter(([,kind])=>kind===item.kind).map(([f])=>f);
  const references=(record:Record<string,unknown>)=>fields.some(f=>record[idFields[f]]?record[idFields[f]]===item.id:record[f]===item.name);
  const customField=item.kind==='dropdownOption'?data.customFields.find(f=>f.id===item.parentId):undefined;
  const isReferenced=(record:Record<string,unknown>)=>{const custom=(record.customFields||{}) as Record<string,unknown>;return references(record)||!!customField&&(Array.isArray(custom[customField.key])?(custom[customField.key] as unknown[]).includes(item.name):custom[customField.key]===item.name);};
  const rules=data.rules.filter(r=>[...r.conditions,...r.actions].some(c=>c.valueId===item.id));
  return {transactions:data.transactions.filter(t=>references(t as unknown as Record<string,unknown>) || customField && (Array.isArray(t.customFields?.[customField.key])?(t.customFields![customField.key] as unknown[]).includes(item.name):t.customFields?.[customField.key]===item.name)).length,rules,
    recurring:data.recurring.filter(r=>isReferenced(r as unknown as Record<string,unknown>)).length,
    mappings:Object.entries(data.sourceMappings || {}).filter(([key,val])=>key===item.id || val.includes(item.id)).map(([key])=>data.masters?.find(m=>m.id===key)?.name || key),
    templates:[...data.frequentTransactions,...data.quickExpenses].filter(t=>isReferenced(t as unknown as Record<string,unknown>)).length,
    children:(data.masters?.filter(m=>m.parentId===item.id).length || 0)+(customField?data.customFields.filter(f=>f.parentFieldKey===customField.key&&(f.parentOptionValue===item.name||!!f.dependentOptions?.[item.name])).length:0)};
}

