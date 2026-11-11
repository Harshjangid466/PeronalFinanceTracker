import type { AppData, Transaction } from './types';
import { migrateData } from './model';
import { normalizeTransactionType } from './types';
import {validateAlerts} from './alerts';
import {validateStatementRows,mergeStatementRows,type StatementBatch} from './statements';
export function mergeBackup(current:AppData, text:string):AppData {
  const parsed=JSON.parse(text); const source=parsed.data || parsed;
  if (parsed.backupFormatVersion && parsed.backupFormatVersion>4)throw new Error('This backup was made by a newer app version.');
  if (!source || !Array.isArray(source.transactions))throw new Error('A backup must contain a transactions array.');
  if(source.bankAlerts!==undefined)validateAlerts(source.bankAlerts);
  if(source.statementRows!==undefined)validateStatementRows(source.statementRows);
  const arrayKeys=['transactions','receivables','repayments','recurring','quickExpenses','frequentTransactions','quickAmounts','categories','accounts','paymentModes','people','capexPurchasedFrom','toGharPaymentFor','incomeTypes','investmentTypes','customFields','formFields','recurringFormFields','rules','actionLog','masters','suppressedPatterns','skippedOccurrences','deactivatedAccounts','deactivatedPaymentModes','deactivatedCategories','deactivatedPeople'];
  arrayKeys.push('bankAlerts');
  arrayKeys.push('statementBatches');
  arrayKeys.push('dismissedHabitSuggestions');
  arrayKeys.push('cardSettlements');
  for(const key of arrayKeys) if(source[key]!==undefined && !Array.isArray(source[key]))throw new Error(`Invalid ${key} in backup.`);
  const ids=new Set<string>();
  for(const t of source.transactions){
    if(!t.id || typeof t.id!=='string')throw new Error('Transaction IDs are required.');
    if(ids.has(t.id))throw new Error('Duplicate transaction IDs in the backup.'); ids.add(t.id);
    if(!Number.isFinite(t.amountMinor ?? Number(t.amount)*100) || ((t.amountMinor ?? Number(t.amount)*100)<0&&normalizeTransactionType(t.type)!=='Revenue Expense'))throw new Error('Invalid transaction amount.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(t.date) || Number.isNaN(Date.parse(t.date)))throw new Error('Invalid transaction date.');
    if(t.status && !['active','cancelled','deleted'].includes(t.status))throw new Error('Invalid transaction status.');
  }
  const incoming=migrateData({...structuredClone(current),...source,cardSettlements:source.cardSettlements||[],masters:source.masters,sourceMappings:source.sourceMappings,transactions:source.transactions.map((t:Transaction)=>({...t,type:normalizeTransactionType(t.type),customFields:t.customFields || {},status:t.status || 'active'}))});
  const result={...structuredClone(incoming),...structuredClone(current)} as AppData & Record<string,unknown>;
  result.permanentlyDeletedTransactionIds=[...new Set([...(current.permanentlyDeletedTransactionIds||[]),...(incoming.permanentlyDeletedTransactionIds||[])])];
  result.removedStatementBatchIds=[...new Set([...(current.removedStatementBatchIds||[]),...(incoming.removedStatementBatchIds||[])])];
  for(const key of arrayKeys){
    const old=(current as unknown as Record<string,unknown[]>)[key] || []; const next=(incoming as unknown as Record<string,unknown[]>)[key] || [];
    const merged=new Map<string,unknown>();
    const identify=(v:unknown)=>typeof v==='object' && v!==null ? String((v as {id?:string;name?:string}).id || (v as {name?:string}).name || JSON.stringify(v)) : JSON.stringify(v);
    for(const v of old)merged.set(identify(v),structuredClone(v));
    for(const v of next){const id=identify(v); if(!merged.has(id))merged.set(id,structuredClone(v)); else if(key==='statementBatches') {
      const old=merged.get(id) as StatementBatch,incoming=v as StatementBatch;
      if(incoming.cashback){
        if(old.from!==incoming.from||old.to!==incoming.to||old.count!==incoming.count||old.source!==incoming.source)throw Error('Statement details conflict in the backup.');
        if(old.cashback&&(['account','earnedMinor','creditedMinor'] as const).some(k=>old.cashback![k]!==incoming.cashback![k]))throw Error('Cashback summary conflicts in the backup.');
        merged.set(id,{...old,cashback:structuredClone(incoming.cashback)});
      }
    } else if(key==='categories') {
      const cat=merged.get(id) as {subCategories:string[]}; cat.subCategories=Array.from(new Set([...cat.subCategories,...(v as {subCategories:string[]}).subCategories]));
    }}
    result[key]=Array.from(merged.values());
  }
  result.sourceMappings={...incoming.sourceMappings,...current.sourceMappings};
  result.paymentModeSources={...incoming.paymentModeSources,...current.paymentModeSources};
  result.statementRows=mergeStatementRows(current.statementRows||[],source.statementRows||[]);
  result.importHabits=current.importHabits||source.importHabits;
  result.monthlyIncomeMinor={...incoming.monthlyIncomeMinor,...current.monthlyIncomeMinor};
  return migrateData(result);
}
