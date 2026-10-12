import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import type {
  AppData,
  Transaction,
  Receivable,
  Repayment,
  Recurring,
  QuickExpense,
  FrequentTransaction,
  CategoryDef,
  FieldConfig,
  CustomFieldDefinition,
  TransactionType,
  FinancialEffect,
} from '@/data/types';
import {
  deriveFinancialEffect,
  normalizeTransactionType,
} from '@/data/types';
import { loadData, saveData, uid } from '@/data/storage';
import { migrateData, projectMasters, financialEffect, dependencies, idFields, masterFields, patternKey, type MasterItem, type MasterKind } from '@/data/model';
import { auditChanges } from '@/data/audit';
import { mergeBackup } from '@/data/backup';
import type {BankAlert} from '@/data/alerts';
import {mergeCaptured} from '@/data/captureProtocol';
import {useBankCapture,type BankCapture} from './useBankCapture';
import {
  addDays,
  addMonths,
  addYears,
  todayISO,
  toPaise,
  toRupees,
  allocatePercentages,
} from '@/data/format';

export interface PersonLedgerItem {
  person: string;
  totalLent: number;
  totalRecovered: number;
  netBalance: number; // positive = owes me, negative = I owe person
  status: 'owes_me' | 'i_owe' | 'settled';
  transactions: Transaction[];
}

export interface DashboardMetrics {
  totalOutflow: number;
  revenueExpense: number;
  lent: number;
  capex: number;
  toGhar: number;
  investment: number;
  outflowPercentages: {
    revenueExpense: number;
    lent: number;
    capex: number;
    toGhar: number;
    investment: number;
  };
  totalInflow: number;
  lentRecovered: number;
  incomeMisc: number;
  inflowPercentages: {
    lentRecovered: number;
    incomeMisc: number;
  };
  netReceivables: number;
}

export interface BudgetGuidance {
  category: string;
  threeMonthAvg: number;
  currentSpending: number;
  suggestedLevel: number;
  usagePercentage: number;
  warning?: string;
}

export interface SmallExpenseInsight {
  count: number;
  cumulativeTotal: number;
  description: string;
  transactions: Transaction[];
}

interface AppContextValue {
  bankCapture:BankCapture;
  saveBankAlerts: (alerts:BankAlert[])=>void;
  updateBankAlert: (id:string, updates:Partial<BankAlert>)=>void;
  data: AppData;
  allData: AppData;
  deletedTransactions: Transaction[];
  restoreTransaction: (id:string)=>void;
  configure: (updates:Partial<AppData>)=>void;
  logAction: (action:string, entity:string, description:string)=>void;
  manageMaster: (item:MasterItem)=>void;
  removeMaster: (id:string)=>void;
  importTransactions: (rows:Partial<Transaction>[])=>number;
  // Transactions
  addTransaction: (t: Partial<Transaction> & { amount: number; type: TransactionType; date?: string }) => Transaction;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Transaction | null;
  deleteTransaction: (id: string) => void;
  // Receivables & Ledgers
  getPersonLedger: (person: string) => PersonLedgerItem;
  getAllPersonLedgers: () => PersonLedgerItem[];
  addReceivable: (r: Omit<Receivable, 'id' | 'createdAt'>) => Receivable;
  addRepayment: (r: Omit<Repayment, 'id' | 'createdAt'>) => Repayment;
  getReceivableOutstanding: (receivableId: string) => number;
  getReceivableRecovered: (receivableId: string) => number;
  deleteReceivable: (id: string) => void;
  // Recurring
  addRecurring: (r: Omit<Recurring, 'id' | 'createdAt' | 'nextDueDate'>) => Recurring;
  updateRecurring: (id: string, updates: Partial<Recurring>) => void;
  deleteRecurring: (id: string) => void;
  postRecurring: (id: string) => void;
  skipRecurring: (id: string) => void;
  // Quick & Frequent Transactions
  quickAmounts: number[];
  addQuickAmount: (amount: number) => void;
  updateQuickAmount: (index: number, amount: number) => void;
  deleteQuickAmount: (index: number) => void;
  reorderQuickAmounts: (from: number, to: number) => void;
  frequentTransactions: FrequentTransaction[];
  addFrequentTransaction: (f: Omit<FrequentTransaction, 'id' | 'createdAt'>) => FrequentTransaction;
  deleteFrequentTransaction: (id: string) => void;
  detectFrequentCandidates: () => Array<Omit<FrequentTransaction, 'id' | 'createdAt'>>;
  // Legacy quick expenses
  addQuickExpense: (q: Omit<QuickExpense, 'id' | 'createdAt'>) => QuickExpense;
  deleteQuickExpense: (id: string) => void;
  recordQuickExpense: (id: string) => void;
  // Custom Fields
  customFields: CustomFieldDefinition[];
  addCustomField: (field: Omit<CustomFieldDefinition, 'id'>) => CustomFieldDefinition;
  updateCustomField: (id: string, field: Partial<CustomFieldDefinition>) => void;
  deleteCustomField: (id: string) => void;
  reorderCustomFields: (fromIndex: number, toIndex: number) => void;
  // Metrics & Derivations
  computeMetrics: (transactions: Transaction[]) => DashboardMetrics;
  getBudgetGuidance: () => BudgetGuidance[];
  getSmallExpensesInsight: (threshold?: number) => SmallExpenseInsight;
  checkPossibleDuplicate: (t: { amount: number; date: string; type: TransactionType; majorCategory?: string; person?: string }) => Transaction | null;
  // Settings / Lists
  addCategory: (name: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  deleteCategory: (name: string) => void;
  addSubCategory: (category: string, name: string) => void;
  deleteSubCategory: (category: string, name: string) => void;
  addAccount: (name: string) => void;
  deleteAccount: (name: string) => void;
  addPaymentMode: (name: string) => void;
  deletePaymentMode: (name: string) => void;
  addPerson: (name: string) => void;
  deletePerson: (name: string) => void;
  addCapexPurchasedFrom: (name: string) => void;
  deleteCapexPurchasedFrom: (name: string) => void;
  addToGharPaymentFor: (name: string) => void;
  deleteToGharPaymentFor: (name: string) => void;
  addIncomeType: (name: string) => void;
  deleteIncomeType: (name: string) => void;
  addInvestmentType: (name: string) => void;
  deleteInvestmentType: (name: string) => void;
  updateFormFields: (fields: FieldConfig[]) => void;
  updateRecurringFormFields: (fields: FieldConfig[]) => void;
  addFormFieldOption: (fieldKey: string, option: string) => void;
  // Backup & Restore
  exportBackup: () => string;
  restoreBackup: (jsonContent: string) => { success: boolean; message: string; count?: number };
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [allData, setStoredData] = useState<AppData>(() => loadData());
  const bankCapture=useBankCapture(alerts=>setStoredData(prev=>auditChanges(prev,migrateData({...prev,bankAlerts:mergeCaptured(prev.bankAlerts||[],alerts)}))));
  const data = useMemo(()=>({...allData,transactions:allData.transactions.filter(t=>t.status==='active')}),[allData]);
  function setData(update: AppData | ((prev:AppData)=>AppData)) {
    setStoredData(prev=>{
      const next=typeof update==='function'?update(structuredClone(prev)):update;
      return auditChanges(prev,migrateData(next));
    });
  }
  function configure(updates:Partial<AppData>) { setData(prev=>({...prev,...updates})); }
  function saveBankAlerts(alerts:BankAlert[]) {setData(prev=>({...prev,bankAlerts:[...(prev.bankAlerts||[]),...alerts]}));}
  function updateBankAlert(id:string, updates:Partial<BankAlert>) {setData(prev=>({...prev,bankAlerts:(prev.bankAlerts||[]).map(a=>a.id===id?{...a,...updates,id:a.id,updatedAt:Date.now()}:a)}));}
  function logAction(action:string,entity:string,description:string) {
    setStoredData(prev=>({...prev,actionLog:[...prev.actionLog,{id:uid(),timestamp:Date.now(),actionType:action,entityType:entity,entityId:entity,description}]}));
  }
  function restoreTransaction(id:string) { setData(prev=>({...prev,transactions:prev.transactions.map(t=>t.id===id?{...t,status:'active',deletedAt:undefined,updatedAt:Date.now()}:t)})); }
  function manageMaster(item:MasterItem) {
    if(allData.masters?.some(m=>m.id!==item.id&&m.kind===item.kind&&m.parentId===item.parentId&&m.name.toLowerCase()===item.name.toLowerCase()))throw new Error('That name already exists.');
    setData(prev=>{
      const existing=prev.masters?.find(m=>m.id===item.id);
      if(prev.masters?.some(m=>m.id!==item.id && m.kind===item.kind && m.parentId===item.parentId && m.name.toLowerCase()===item.name.toLowerCase()))throw new Error('That name already exists.');
      const masters=existing?prev.masters!.map(m=>m.id===item.id?{...item,updatedAt:Date.now()}:m):[...(prev.masters||[]),item];
      let next=projectMasters({...prev,masters});
      if(item.kind==='dropdownOption' && existing) {
        const owner=prev.customFields.find(f=>f.id===item.parentId);
        if(owner) {
          for(const key of ['transactions','recurring','frequentTransactions','quickExpenses'] as const)(next as unknown as Record<string,unknown>)[key]=next[key].map(record=>{const t=record as unknown as {customFields?:Record<string,unknown>};const values={...t.customFields};if(Array.isArray(values[owner.key]))values[owner.key]=(values[owner.key] as unknown[]).map((v:unknown)=>v===existing.name?item.name:v);else if(values[owner.key]===existing.name)values[owner.key]=item.name;return {...record,customFields:values};});
          next.customFields=next.customFields.map(f=>{const copy={...f};if(f.parentFieldKey===owner.key){if(f.parentOptionValue===existing.name)copy.parentOptionValue=item.name;if(f.dependentOptions&&existing.name in f.dependentOptions){copy.dependentOptions={...f.dependentOptions,[item.name]:f.dependentOptions[existing.name]};delete copy.dependentOptions[existing.name];}}if(f.id===owner.id&&f.dependentOptions)copy.dependentOptions=Object.fromEntries(Object.entries(f.dependentOptions).map(([key,values])=>[key,values.map(value=>value===existing.name?item.name:value)]));return copy;});
        }
      }
      const refresh=(record:Record<string,unknown>)=>{
        const copy={...record};
        for(const [field,kind] of Object.entries(masterFields))if(kind===item.kind && (copy[idFields[field]]===item.id || existing && copy[field]===existing.name)) {copy[field]=item.name; copy[idFields[field]]=item.id;}
        return copy;
      };
      for(const key of ['transactions','recurring','frequentTransactions','quickExpenses','receivables','repayments'] as const) (next as unknown as Record<string,unknown>)[key]=next[key].map(r=>refresh(r as unknown as Record<string,unknown>));
      next.rules=next.rules.map(r=>({...r,enabled:!item.active && [...r.conditions,...r.actions].some(c=>c.valueId===item.id)?false:r.enabled,conditions:r.conditions.map(c=>c.valueId===item.id?{...c,value:item.name}:c),actions:r.actions.map(c=>c.valueId===item.id?{...c,value:item.name}:c)}));
      return next;
    });
  }
  function removeMaster(id:string) {
    const item=allData.masters?.find(m=>m.id===id); if(!item)return;
    const refs=dependencies(allData,item);
    if(refs.transactions || refs.rules.length || refs.recurring || refs.mappings.length || refs.templates || refs.children)throw new Error('This value is referenced. Deactivate or resolve dependencies first.');
    setData(prev=>projectMasters({...prev,masters:prev.masters?.filter(m=>m.id!==id)}));
  }
  function importTransactions(rows:Partial<Transaction>[]) {
    const now=Date.now();
    setData(prev=>({...prev,transactions:[...rows.map(row=>({...row,id:uid(),schemaVersion:4,type:row.type!,amount:row.amount!,amountMinor:Math.round(row.amount!*100),currency:'INR' as const,date:row.date!,createdAt:now,updatedAt:now,majorCategory:row.majorCategory||'',subCategory:row.subCategory||'',account:row.account||'',paymentMode:row.paymentMode||'',person:row.person||'',remarks:row.remarks||'',customFields:row.customFields||{},financialEffect:financialEffect(row.type!,Math.round(row.amount!*100)),status:'active' as const})),...prev.transactions]}));
    logAction('import','transactions',`Imported ${rows.length} transactions`); return rows.length;
  }

  useEffect(() => {
    saveData(allData);
  }, [allData]);

  // Scheduled execution for recurring payments with automaticPosting
  useEffect(() => {
    const today = todayISO();
    const dueRecurring = data.recurring.filter((r) => {
      if (!r.automaticPosting || r.status === 'Paused' || r.status === 'Cancelled' || r.status==='Completed') return false;
      const next = new Date(r.nextDueDate + 'T00:00:00');
      const todayDate = new Date(today + 'T00:00:00');
      return next <= todayDate && (!r.endDate || r.nextDueDate <= r.endDate);
    });

    if (dueRecurring.length === 0) return;

    setData((prev) => {
      let updated = { ...prev };
      for (const template of dueRecurring) {
        let r=updated.recurring.find(x=>x.id===template.id);
        while(r && r.nextDueDate<=today && r.status!=='Completed' && r.status!=='Cancelled' && (!r.endDate||r.nextDueDate<=r.endDate)) {
          const date=r.nextDueDate;
          if(updated.transactions.some(t=>t.recurringTemplateId===r!.id&&t.recurringOccurrenceDate===date)||updated.skippedOccurrences?.includes(`${r.id}|${date}`)) {
            updated={...updated,recurring:updated.recurring.map(x=>x.id===r!.id?{...x,nextDueDate:computeNextDue(x)}:x)};
          }else updated=postRecurringInData(updated,r.id);
          r=updated.recurring.find(x=>x.id===template.id);
          if(r?.nextDueDate===date)break;
        }
      }
      return updated;
    });
  }, []);

  // Compute next due date for recurring
  function computeNextDue(r: Recurring): string {
    const from = r.nextDueDate;
    switch (r.frequency) {
      case 'Weekly':
        return addDays(from, 7);
      case 'Monthly':
        return addMonths(from, 1);
      case 'Quarterly':
        return addMonths(from, 3);
      case 'Half-yearly':
        return addMonths(from, 6);
      case 'Yearly':
        return addYears(from, 1);
      case 'Custom':
        return addDays(from, r.customIntervalDays ?? 1);
      default:
        return addMonths(from, 1);
    }
  }

  function postRecurringInData(prev: AppData, id: string): AppData {
    const r = prev.recurring.find((rec) => rec.id === id);
    if (!r || r.status==='Cancelled' || r.status==='Completed' || r.status==='Paused') return prev;
    if (prev.transactions.some(t=>t.recurringTemplateId===id && t.recurringOccurrenceDate===r.nextDueDate) || prev.skippedOccurrences?.includes(`${id}|${r.nextDueDate}`)) return prev;

    const normType = normalizeTransactionType(r.type);
    const amount = r.amount;
    const amountMinor = r.amountMinor ?? toPaise(amount);
    const effects = financialEffect(normType, amountMinor);

    const txn: Transaction = {
      id: uid(),
      schemaVersion: 2,
      type: normType,
      heading: r.description,
      amount,
      amountMinor,
      currency: 'INR',
      date: r.nextDueDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      majorCategory: r.majorCategory || '',
      subCategory: r.subCategory || '',
      paymentMode: r.paymentMode || '',
      account: r.account || '',
      person: r.person||'',purchasedFrom:r.purchasedFrom,paymentFor:r.paymentFor,incomeType:r.incomeType,investmentType:r.investmentType,
      remarks: (r.remarks ? r.remarks + ' ' : '') + '(Recurring mandate)',
      recurringTemplateId: r.id,
      recurringOccurrenceDate: r.nextDueDate,
      customFields: r.customFields || {},
      financialEffect: effects,
      status: 'active',
    };

    const nextDue = computeNextDue(r);
    const shouldContinue = !r.endDate || nextDue <= r.endDate;

    return {
      ...prev,
      transactions: [txn, ...prev.transactions],
      recurring: prev.recurring.map((rec) =>
        rec.id === id
          ? {
              ...rec,
              nextDueDate: nextDue,
              status: shouldContinue ? 'Scheduled' : 'Completed',
            }
          : rec
      ),
    };
  }

  // Transaction operations
  function addTransaction(t: Partial<Transaction> & { amount: number; type: TransactionType; date?: string }): Transaction {
    const normType = normalizeTransactionType(t.type);
    const amount = Number(t.amount) || 0;
    const amountMinor = t.amountMinor ?? toPaise(amount);
    const date = t.date || todayISO();
    const effects = financialEffect(normType, amountMinor);

    const newTxn: Transaction = {
      id: uid(),
      schemaVersion: 2,
      type: normType,
      heading: t.heading || '',
      amount,
      amountMinor,
      currency: 'INR',
      date,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      majorCategory: t.majorCategory || '',
      subCategory: t.subCategory || '',
      miniCategory: t.miniCategory || '',
      paymentMode: t.paymentMode || '',
      account: t.account || '',
      person: t.person || '',
      purchasedFrom: t.purchasedFrom || '',
      paymentFor: t.paymentFor || '',
      incomeType: t.incomeType || '',
      investmentType: t.investmentType || '',
      remarks: t.remarks || '',
      recurringTemplateId: t.recurringTemplateId,
      recurringOccurrenceDate: t.recurringOccurrenceDate,
      customFields: t.customFields || {},
      financialEffect: effects,
      status: t.status || 'active',
      receivableId: t.receivableId,
    };

    setData((prev) => {
      const nextTxns = [newTxn, ...prev.transactions];
      let nextPeople = prev.people;
      if (t.person && !prev.people.includes(t.person)) {
        nextPeople = [...prev.people, t.person];
      }
      let nextAccounts = prev.accounts;
      if (t.account && !prev.accounts.includes(t.account)) {
        nextAccounts = [...prev.accounts, t.account];
      }
      return {
        ...prev,
        transactions: nextTxns,
        people: nextPeople,
        accounts: nextAccounts,
      };
    });

    return newTxn;
  }

  function updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    const current=allData.transactions.find(t=>t.id===id);if(!current)return null;
    const merged={...current,...updates,updatedAt:Date.now()};
    for(const field of Object.keys(masterFields))if(field in updates)delete (merged as unknown as Record<string,unknown>)[idFields[field]];
    merged.type=normalizeTransactionType(merged.type);merged.amountMinor=toPaise(merged.amount);merged.amount=merged.amountMinor/100;merged.financialEffect=financialEffect(merged.type,merged.amountMinor);
    setData(prev=>({...prev,transactions:prev.transactions.map(t=>t.id===id?merged:t),people:merged.person&&!prev.people.includes(merged.person)?[...prev.people,merged.person]:prev.people}));
    return merged;
  }

  function deleteTransaction(id: string) {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => t.id === id ? {...t,status:'deleted',deletedAt:Date.now(),updatedAt:Date.now()} : t),
    }));
  }

  // Unified Person-wise Ledger (Section G & E & F & R5)
  function getPersonLedger(personName: string): PersonLedgerItem {
    const txns = data.transactions
      .filter((t) => t.person?.trim().toLowerCase() === personName.trim().toLowerCase())
      .filter((t) => normalizeTransactionType(t.type) === 'Lent' || normalizeTransactionType(t.type) === 'Lent Recovered')
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

    let totalLent = 0;
    let totalRecovered = 0;

    for (const t of txns) {
      const norm = normalizeTransactionType(t.type);
      if (norm === 'Lent') {
        totalLent += t.amountMinor;
      } else if (norm === 'Lent Recovered') {
        totalRecovered += t.amountMinor;
      }
    }

    totalLent /= 100; totalRecovered /= 100;
    const netBalance = Math.round((totalLent - totalRecovered)*100)/100;
    const status: PersonLedgerItem['status'] =
      netBalance > 0 ? 'owes_me' : netBalance < 0 ? 'i_owe' : 'settled';

    return {
      person: personName,
      totalLent,
      totalRecovered,
      netBalance,
      status,
      transactions: txns,
    };
  }

  function getAllPersonLedgers(): PersonLedgerItem[] {
    const peopleSet = new Set<string>();
    // Collect from transactions
    for (const t of data.transactions) {
      if (t.person?.trim()) {
        const norm = normalizeTransactionType(t.type);
        if (norm === 'Lent' || norm === 'Lent Recovered') {
          peopleSet.add(t.person.trim());
        }
      }
    }
    // Collect from people list
    for (const p of data.people) {
      if (p.trim()) peopleSet.add(p.trim());
    }
    // Collect from receivables
    for (const r of data.receivables) {
      if (r.person?.trim()) peopleSet.add(r.person.trim());
    }

    const ledgers: PersonLedgerItem[] = [];
    for (const p of peopleSet) {
      ledgers.push(getPersonLedger(p));
    }

    return ledgers.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
  }

  // Receivables backwards-compatible helpers
  function addReceivable(r: Omit<Receivable, 'id' | 'createdAt'>): Receivable {
    const recId = uid();
    const rec: Receivable = { ...r, id: recId, createdAt: Date.now() };

    // Record as Lent transaction in the central engine
    addTransaction({
      type: 'Lent',
      amount: r.amount,
      date: r.date,
      majorCategory: 'Lent',
      subCategory: '',
      paymentMode: '',
      account: r.account,
      person: r.person,
      remarks: r.reason,
      receivableId: recId,
    });

    setData((prev) => ({
      ...prev,
      receivables: [rec, ...prev.receivables],
    }));

    return rec;
  }

  function addRepayment(r: Omit<Repayment, 'id' | 'createdAt'>): Repayment {
    const rep: Repayment = { ...r, id: uid(), createdAt: Date.now() };

    // Find person associated with receivableId
    const rec = data.receivables.find((x) => x.id === r.receivableId);
    const person = rec?.person || '';

    // Record as Lent Recovered transaction in the central engine
    addTransaction({
      type: 'Lent Recovered',
      amount: r.amount,
      date: r.date,
      majorCategory: 'Lent Recovered',
      subCategory: '',
      paymentMode: '',
      account: r.account,
      person,
      remarks: r.remarks || 'Repayment received',
      receivableId: r.receivableId,
    });

    setData((prev) => ({
      ...prev,
      repayments: [rep, ...prev.repayments],
    }));

    return rep;
  }

  function getReceivableRecovered(receivableId: string): number {
    return data.transactions
      .filter((t) => normalizeTransactionType(t.type) === 'Lent Recovered' && t.receivableId === receivableId)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function getReceivableOutstanding(receivableId: string): number {
    const recTxn = data.transactions.find(
      (t) => normalizeTransactionType(t.type) === 'Lent' && t.receivableId === receivableId
    );
    const initial = recTxn ? recTxn.amount : data.receivables.find((r) => r.id === receivableId)?.amount || 0;
    return initial - getReceivableRecovered(receivableId);
  }

  function deleteReceivable(id: string) {
    setData((prev) => ({
      ...prev,
      receivables: prev.receivables.filter((r) => r.id !== id),
      repayments: prev.repayments.filter((r) => r.receivableId !== id),
      transactions: prev.transactions.map((t) => t.receivableId === id ? {...t,status:'deleted',deletedAt:Date.now(),updatedAt:Date.now()} : t),
    }));
  }

  // Recurring Management
  function addRecurring(r: Omit<Recurring, 'id' | 'createdAt' | 'nextDueDate'>): Recurring {
    const rec: Recurring = {
      ...r,
      id: uid(),
      createdAt: Date.now(),
      nextDueDate: r.startDate,
      status: r.status || 'Scheduled',amountMinor:toPaise(r.amount),
    };
    setData((prev) => ({ ...prev, recurring: [rec, ...prev.recurring] }));
    return rec;
  }

  function updateRecurring(id: string, updates: Partial<Recurring>) {
    setData((prev) => ({
      ...prev,
      recurring: prev.recurring.map(r=>{if(r.id!==id)return r;const next={...r,...updates};if(updates.amount!==undefined)next.amountMinor=toPaise(updates.amount);for(const field of Object.keys(masterFields))if(field in updates)delete (next as unknown as Record<string,unknown>)[idFields[field]];return next;}),
    }));
  }

  function deleteRecurring(id: string) {
    setData((prev) => ({ ...prev, recurring: prev.recurring.map((r) => r.id===id?{...r,status:'Cancelled'}:r) }));
  }

  function postRecurring(id: string) {
    const occurrence=data.recurring.find(r=>r.id===id)?.nextDueDate;
    setData(prev=>prev.recurring.find(r=>r.id===id)?.nextDueDate===occurrence?postRecurringInData(prev,id):prev);
  }

  function skipRecurring(id: string) {
    setData((prev) => {
      const r = prev.recurring.find((rec) => rec.id === id);
      if (!r) return prev;
      const nextDue = computeNextDue(r);
      const shouldContinue = !r.endDate || nextDue <= r.endDate;
      return {
        ...prev,
        skippedOccurrences:[...(prev.skippedOccurrences||[]),`${r.id}|${r.nextDueDate}`],
        recurring: prev.recurring.map((rec) =>
          rec.id === id ? { ...rec, nextDueDate: nextDue,status:shouldContinue?'Scheduled':'Completed' } : rec
        ),
      };
    });
  }

  // Quick amounts
  function addQuickAmount(amount: number) {
    if (!amount || amount <= 0) return;
    setData((prev) => {
      if (prev.quickAmounts.includes(amount)) return prev;
      return { ...prev, quickAmounts: [...prev.quickAmounts, amount] };
    });
  }

  function updateQuickAmount(index: number, amount: number) {
    if (!amount || amount <= 0) return;
    setData((prev) => {
      const next = [...prev.quickAmounts];
      next[index] = amount;
      return { ...prev, quickAmounts: next };
    });
  }

  function deleteQuickAmount(index: number) {
    setData((prev) => ({
      ...prev,
      quickAmounts: prev.quickAmounts.filter((_, i) => i !== index),
    }));
  }

  function reorderQuickAmounts(from: number, to: number) {
    setData((prev) => {
      const next = [...prev.quickAmounts];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...prev, quickAmounts: next };
    });
  }

  // Frequent Transactions
  function addFrequentTransaction(f: Omit<FrequentTransaction, 'id' | 'createdAt'>): FrequentTransaction {
    const item: FrequentTransaction = {
      ...f,
      id: uid(),
      createdAt: Date.now(),
      useCount: 1,
    };
    setData((prev) => ({
      ...prev,
      frequentTransactions: [item, ...prev.frequentTransactions],
    }));
    return item;
  }

  function deleteFrequentTransaction(id: string) {
    setData((prev) => ({
      ...prev,
      frequentTransactions: prev.frequentTransactions.filter((f) => f.id !== id),
    }));
  }

  // Auto-detect repeated transaction patterns (Section P)
  function detectFrequentCandidates(): Array<Omit<FrequentTransaction, 'id' | 'createdAt'>> {
    const txns = data.transactions;
    const patternMap = new Map<string, { count: number; sample: Transaction }>();

    for (const t of txns) {
      const norm = normalizeTransactionType(t.type);
      const key = patternKey(t);
      if (data.suppressedPatterns?.includes(key)) continue;
      const entry = patternMap.get(key) || { count: 0, sample: t };
      entry.count += 1;
      patternMap.set(key, entry);
    }

    const candidates: Array<Omit<FrequentTransaction, 'id' | 'createdAt'>> = [];
    for (const [, { count, sample }] of patternMap.entries()) {
      if (count >= 2) {
        // Check if already in frequentTransactions
        const alreadySaved = data.frequentTransactions.some(
          (f) =>
            f.type === sample.type &&
            f.majorCategory === sample.majorCategory &&
            f.subCategory === sample.subCategory &&
            f.amount === sample.amount &&
            f.account === sample.account
        );
        if (!alreadySaved) {
          const label = sample.subCategory
            ? `${sample.majorCategory} - ${sample.subCategory}`
            : sample.person
            ? `${sample.type} - ${sample.person}`
            : `${sample.majorCategory || sample.type} · ₹${sample.amount}`;

          candidates.push({
            label,
            type: sample.type,
            amount: sample.amount,
            majorCategory: sample.majorCategory,
            subCategory: sample.subCategory,
            paymentMode: sample.paymentMode,
            account: sample.account,
            person: sample.person,
            remarks: sample.remarks,
            useCount: count,
            purchasedFrom:sample.purchasedFrom,paymentFor:sample.paymentFor,incomeType:sample.incomeType,investmentType:sample.investmentType,customFields:sample.customFields,
          });
        }
      }
    }
    return candidates;
  }

  // Legacy quick expenses
  function addQuickExpense(q: Omit<QuickExpense, 'id' | 'createdAt'>): QuickExpense {
    const quick: QuickExpense = { ...q, id: uid(), createdAt: Date.now() };
    setData((prev) => ({ ...prev, quickExpenses: [quick, ...prev.quickExpenses] }));
    return quick;
  }

  function deleteQuickExpense(id: string) {
    setData((prev) => ({ ...prev, quickExpenses: prev.quickExpenses.filter((q) => q.id !== id) }));
  }

  function recordQuickExpense(id: string) {
    const q = data.quickExpenses.find((e) => e.id === id);
    if (!q) return;
    addTransaction({
      type: 'Revenue Expense',
      amount: q.amount,
      date: todayISO(),
      majorCategory: q.majorCategory,
      subCategory: q.subCategory,
      paymentMode: q.paymentMode,
      account: q.account,
      person: '',
      remarks: q.label,
    });
  }

  // Custom Fields (Section M)
  function addCustomField(field: Omit<CustomFieldDefinition, 'id'>): CustomFieldDefinition {
    const newField: CustomFieldDefinition = {
      ...field,
      id: 'cf_' + uid(),
    };
    setData((prev) => ({
      ...prev,
      customFields: [...prev.customFields, newField],
    }));
    return newField;
  }

  function updateCustomField(id: string, updates: Partial<CustomFieldDefinition>) {
    setData((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      masters:prev.masters?.map(m=>m.kind==='dropdownOption'&&m.parentId===id&&updates.options?{...m,active:updates.options.includes(m.name)}:m),
    }));
  }

  function deleteCustomField(id: string) {
    setData((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f) => f.id===id?{...f,enabled:false,active:false}:f),
    }));
  }

  function reorderCustomFields(fromIndex: number, toIndex: number) {
    setData((prev) => {
      const next = [...prev.customFields];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return {
        ...prev,
        customFields: next.map((f, i) => ({ ...f, order: i })),
      };
    });
  }

  // Duplicate Check (Section AA)
  function checkPossibleDuplicate(candidate: {
    amount: number;
    date: string;
    type: TransactionType;
    majorCategory?: string;
    person?: string;
  }): Transaction | null {
    const match = data.transactions.find((t) => {
      if (t.amount !== candidate.amount) return false;
      if (t.date !== candidate.date) return false;
      if (normalizeTransactionType(t.type) !== normalizeTransactionType(candidate.type)) return false;
      if (candidate.majorCategory && t.majorCategory === candidate.majorCategory) return true;
      if (candidate.person && t.person === candidate.person) return true;
      return true;
    });
    return match || null;
  }

  // Centralized Financial Effect Derivation / Dashboard Metrics (Section L, R, AE)
  function computeMetrics(transactions: Transaction[]): DashboardMetrics {
    let revenueExpense = 0;
    let lent = 0;
    let capex = 0;
    let toGhar = 0;
    let investment = 0;
    let lentRecovered = 0;
    let incomeMisc = 0;

    for (const t of transactions) {
      if(t.status!=='active')continue;
      const effect=financialEffect(t.type,t.amountMinor);
      revenueExpense+=effect.personalExpense;lent+=effect.receivableIncrease;capex+=effect.capex;toGhar+=effect.toGhar;investment+=effect.investment;lentRecovered+=effect.receivableDecrease;incomeMisc+=effect.income;
    }

    revenueExpense/=100; lent/=100; capex/=100; toGhar/=100; investment/=100; lentRecovered/=100; incomeMisc/=100;
    const totalOutflow = Math.round((revenueExpense + lent + capex + toGhar + investment)*100)/100;
    const totalInflow = lentRecovered + incomeMisc;

    const outflowShares = allocatePercentages([revenueExpense, lent, capex, toGhar, investment]);
    const inflowShares = allocatePercentages([lentRecovered, incomeMisc]);
    const outflowPercentages = {
      revenueExpense: outflowShares[0],
      lent: outflowShares[1],
      capex: outflowShares[2],
      toGhar: outflowShares[3],
      investment: outflowShares[4],
    };

    const inflowPercentages = {
      lentRecovered: inflowShares[0],
      incomeMisc: inflowShares[1],
    };

    // Calculate all-time net receivables
    const allLedgers = getAllPersonLedgers();
    const netReceivables = allLedgers
      .filter((l) => l.netBalance > 0)
      .reduce((sum, l) => sum + l.netBalance, 0);

    return {
      totalOutflow,
      revenueExpense,
      lent,
      capex,
      toGhar,
      investment,
      outflowPercentages,
      totalInflow,
      lentRecovered,
      incomeMisc,
      inflowPercentages,
      netReceivables,
    };
  }

  // Simple Historical Budget Guidance (Section T)
  function getBudgetGuidance(): BudgetGuidance[] {
    const today = todayISO();
    const curMonthKey = today.slice(0, 7);

    // Compute previous 3 months keys
    const m1Key = addMonths(today.slice(0, 7) + '-01', -1).slice(0, 7);
    const m2Key = addMonths(today.slice(0, 7) + '-01', -2).slice(0, 7);
    const m3Key = addMonths(today.slice(0, 7) + '-01', -3).slice(0, 7);
    const pastMonths = [m1Key, m2Key, m3Key];

    const categoryMap = new Map<string, { current: number; pastSum: number; pastMonthsWithData: Set<string> }>();

    for (const t of data.transactions) {
      if (normalizeTransactionType(t.type) !== 'Revenue Expense') continue;
      const cat = t.majorCategory || 'Misc';
      const mKey = t.date.slice(0, 7);

      const entry = categoryMap.get(cat) || { current: 0, pastSum: 0, pastMonthsWithData: new Set<string>() };
      if (mKey === curMonthKey) {
        entry.current += t.amount;
      } else if (pastMonths.includes(mKey)) {
        entry.pastSum += t.amount;
        entry.pastMonthsWithData.add(mKey);
      }
      categoryMap.set(cat, entry);
    }

    const guidanceList: BudgetGuidance[] = [];
    for (const [cat, info] of categoryMap.entries()) {
      if (info.pastMonthsWithData.size < 3) continue;
      const monthsCount = 3;
      const threeMonthAvg = info.pastSum > 0 ? info.pastSum / monthsCount : info.current;
      const suggestedLevel = Math.round(threeMonthAvg > 0 ? threeMonthAvg : info.current);
      const usagePercentage = suggestedLevel > 0 ? Math.round((info.current / suggestedLevel) * 100) : 100;

      let warning: string | undefined = undefined;
      if (usagePercentage >= 80 && usagePercentage < 100) {
        warning = `You are at ${usagePercentage}% of your normal monthly ${cat} spending.`;
      } else if (usagePercentage >= 100 && suggestedLevel > 0) {
        warning = `Above your usual spending for ${cat} (${usagePercentage}%).`;
      }

      guidanceList.push({
        category: cat,
        threeMonthAvg: Math.round(threeMonthAvg),
        currentSpending: Math.round(info.current),
        suggestedLevel,
        usagePercentage,
        warning,
      });
    }

    return guidanceList.sort((a, b) => b.currentSpending - a.currentSpending);
  }

  // Repeated Small Expense Insight (Section P & S)
  function getSmallExpensesInsight(threshold: number = 100): SmallExpenseInsight {
    const today = todayISO();
    const curMonthKey = today.slice(0, 7);

    const smallTxns = data.transactions.filter(
      (t) =>
        t.date.slice(0, 7) === curMonthKey &&
        normalizeTransactionType(t.type) === 'Revenue Expense' &&
        t.amount > 0 &&
        t.amount <= threshold
    );

    const cumulativeTotal = smallTxns.reduce((sum, t) => sum + t.amount, 0);
    const count = smallTxns.length;
    const description = `${count} small expenses (≤ ₹${threshold}) totaling ₹${cumulativeTotal.toLocaleString('en-IN')} this month`;

    return {
      count,
      cumulativeTotal,
      description,
      transactions: smallTxns,
    };
  }

  // Backup & Restore (Section V)
  function exportBackup(): string {
    logAction('backup','backup','Downloaded complete backup');
    const backupObj = {
      backupFormatVersion: 4,
      appVersion: '4.0.0',
      exportedAt: new Date().toISOString(),
      data: allData,
    };
    return JSON.stringify(backupObj, null, 2);
  }

  function restoreBackup(jsonContent: string): { success: boolean; message: string; count?: number } {
    try {
      const restored=mergeBackup(allData,jsonContent);
      const count=restored.transactions.length-allData.transactions.length;
      setData(restored); logAction('restore','backup',`Merged backup: ${count} added transactions, configuration and history preserved`);
      return {success:true,message:`Backup merged. Added ${count} transactions; existing records were retained.`,count};
    } catch(error) {return {success:false,message:error instanceof Error?error.message:'Invalid backup'};}
  }

  // Settings helpers
  function addCategory(name: string) {
    setData((prev) => {
      if (prev.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return prev;
      return { ...prev, categories: [...prev.categories, { name, subCategories: [] }] };
    });
  }
  function updateCategory(oldName: string, newName: string) {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.name === oldName ? { ...c, name: newName } : c)),
      transactions: prev.transactions.map((t) => (t.majorCategory === oldName ? { ...t, majorCategory: newName } : t)),
    }));
  }
  function deleteCategory(name: string) {
    const item=allData.masters?.find(m=>m.kind==='category' && m.name===name);
    if(item)manageMaster({...item,active:false});
  }
  function addSubCategory(category: string, name: string) {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.name === category && !c.subCategories.includes(name)
          ? { ...c, subCategories: [...c.subCategories, name] }
          : c
      ),
    }));
  }
  function deleteSubCategory(category: string, name: string) {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.name === category
          ? { ...c, subCategories: c.subCategories.filter((s) => s !== name) }
          : c
      ),
    }));
  }

  function addAccount(name: string) {
    setData((prev) => (prev.accounts.includes(name) ? prev : { ...prev, accounts: [...prev.accounts, name] }));
  }
  function deleteAccount(name: string) {
    const item=allData.masters?.find(m=>m.kind==='source' && m.name===name);
    if(item)manageMaster({...item,active:false});
  }
  function addPaymentMode(name: string) {
    setData((prev) =>
      prev.paymentModes.includes(name) ? prev : { ...prev, paymentModes: [...prev.paymentModes, name] }
    );
  }
  function deletePaymentMode(name: string) {
    const item=allData.masters?.find(m=>m.kind==='paymentMode' && m.name===name);
    if(item)manageMaster({...item,active:false});
  }
  function addPerson(name: string) {
    setData((prev) => (prev.people.includes(name) ? prev : { ...prev, people: [...prev.people, name] }));
  }
  function deletePerson(name: string) {
    const item=allData.masters?.find(m=>m.kind==='person' && m.name===name);
    if(item)manageMaster({...item,active:false});
  }

  function addCapexPurchasedFrom(name: string) {
    setData((prev) =>
      prev.capexPurchasedFrom?.includes(name)
        ? prev
        : { ...prev, capexPurchasedFrom: [...(prev.capexPurchasedFrom || []), name] }
    );
  }
  function deleteCapexPurchasedFrom(name: string) {
    const item=allData.masters?.find(m=>m.kind==='merchant' && m.name===name);
    if(item)manageMaster({...item,active:false});
  }

  function addToGharPaymentFor(name: string) {
    setData((prev) =>
      prev.toGharPaymentFor?.includes(name)
        ? prev
        : { ...prev, toGharPaymentFor: [...(prev.toGharPaymentFor || []), name] }
    );
  }
  function deleteToGharPaymentFor(name: string) {
    const item=allData.masters?.find(m=>m.kind==='purpose' && m.name===name);
    if(item)manageMaster({...item,active:false});
  }

  function addIncomeType(name: string) {
    setData((prev) =>
      prev.incomeTypes?.includes(name)
        ? prev
        : { ...prev, incomeTypes: [...(prev.incomeTypes || []), name] }
    );
  }
  function deleteIncomeType(name: string) {
    const item=allData.masters?.find(m=>m.kind==='incomeType' && m.name===name);
    if(item)manageMaster({...item,active:false});
  }

  function addInvestmentType(name: string) {
    setData((prev) =>
      prev.investmentTypes?.includes(name)
        ? prev
        : { ...prev, investmentTypes: [...(prev.investmentTypes || []), name] }
    );
  }
  function deleteInvestmentType(name: string) {
    const item=allData.masters?.find(m=>m.kind==='investmentType' && m.name===name);
    if(item)manageMaster({...item,active:false});
  }

  function updateFormFields(fields: FieldConfig[]) {
    setData((prev) => ({ ...prev, formFields: fields }));
  }
  function updateRecurringFormFields(fields: FieldConfig[]) {
    setData((prev) => ({ ...prev, recurringFormFields: fields }));
  }
  function addFormFieldOption(fieldKey: string, option: string) {
    setData((prev) => ({
      ...prev,
      formFields: prev.formFields.map((f) =>
        f.key === fieldKey && f.options && !f.options.includes(option)
          ? { ...f, options: [...f.options, option] }
          : f
      ),
    }));
  }

  const value: AppContextValue = {
    bankCapture,
    saveBankAlerts,updateBankAlert,
    data, allData, deletedTransactions:allData.transactions.filter(t=>t.status==='deleted'),restoreTransaction,configure,logAction,manageMaster,removeMaster,importTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getPersonLedger,
    getAllPersonLedgers,
    addReceivable,
    addRepayment,
    getReceivableOutstanding,
    getReceivableRecovered,
    deleteReceivable,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    postRecurring,
    skipRecurring,
    quickAmounts: data.quickAmounts || [],
    addQuickAmount,
    updateQuickAmount,
    deleteQuickAmount,
    reorderQuickAmounts,
    frequentTransactions: data.frequentTransactions || [],
    addFrequentTransaction,
    deleteFrequentTransaction,
    detectFrequentCandidates,
    addQuickExpense,
    deleteQuickExpense,
    recordQuickExpense,
    customFields: data.customFields || [],
    addCustomField,
    updateCustomField,
    deleteCustomField,
    reorderCustomFields,
    computeMetrics,
    getBudgetGuidance,
    getSmallExpensesInsight,
    checkPossibleDuplicate,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    deleteSubCategory,
    addAccount,
    deleteAccount,
    addPaymentMode,
    deletePaymentMode,
    addPerson,
    deletePerson,
    addCapexPurchasedFrom,
    deleteCapexPurchasedFrom,
    addToGharPaymentFor,
    deleteToGharPaymentFor,
    addIncomeType,
    deleteIncomeType,
    addInvestmentType,
    deleteInvestmentType,
    updateFormFields,
    updateRecurringFormFields,
    addFormFieldOption,
    exportBackup,
    restoreBackup,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export type { TransactionType };
