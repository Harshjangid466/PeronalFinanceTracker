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
import {
  addDays,
  addMonths,
  addYears,
  todayISO,
  toPaise,
  toRupees,
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
  data: AppData;
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
  const [data, setData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  // Scheduled execution for recurring payments with automaticPosting
  useEffect(() => {
    const today = todayISO();
    const dueRecurring = data.recurring.filter((r) => {
      if (!r.automaticPosting || r.status === 'Paused' || r.status === 'Cancelled') return false;
      const next = new Date(r.nextDueDate + 'T00:00:00');
      const todayDate = new Date(today + 'T00:00:00');
      return next <= todayDate && (!r.endDate || r.nextDueDate <= r.endDate);
    });

    if (dueRecurring.length === 0) return;

    setData((prev) => {
      let updated = { ...prev };
      for (const r of dueRecurring) {
        // Prevent duplicate execution for this occurrence date
        const alreadyPosted = updated.transactions.some(
          (t) => t.recurringTemplateId === r.id && t.recurringOccurrenceDate === r.nextDueDate
        );
        if (!alreadyPosted) {
          updated = postRecurringInData(updated, r.id);
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
    if (!r) return prev;

    const normType = normalizeTransactionType(r.type);
    const amount = r.amount;
    const amountMinor = r.amountMinor ?? toPaise(amount);
    const financialEffect = deriveFinancialEffect(normType, amount);

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
      person: '',
      remarks: (r.remarks ? r.remarks + ' ' : '') + '(Recurring mandate)',
      recurringTemplateId: r.id,
      recurringOccurrenceDate: r.nextDueDate,
      customFields: r.customFields || {},
      financialEffect,
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
              status: shouldContinue ? rec.status : 'Cancelled',
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
    const financialEffect = t.financialEffect || deriveFinancialEffect(normType, amount);

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
      financialEffect,
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
    let updatedTxn: Transaction | null = null;
    setData((prev) => {
      const index = prev.transactions.findIndex((t) => t.id === id);
      if (index === -1) return prev;

      const current = prev.transactions[index];
      const merged = { ...current, ...updates, updatedAt: Date.now() };

      const type = normalizeTransactionType(merged.type);
      const amount = Number(merged.amount) || 0;
      merged.type = type;
      merged.amount = amount;
      merged.amountMinor = toPaise(amount);
      merged.financialEffect = deriveFinancialEffect(type, amount);

      updatedTxn = merged;
      const nextTxns = [...prev.transactions];
      nextTxns[index] = merged;

      // Auto add person if introduced
      let nextPeople = prev.people;
      if (merged.person && !prev.people.includes(merged.person)) {
        nextPeople = [...prev.people, merged.person];
      }

      return {
        ...prev,
        transactions: nextTxns,
        people: nextPeople,
      };
    });

    return updatedTxn;
  }

  function deleteTransaction(id: string) {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  }

  // Unified Person-wise Ledger (Section G & E & F & R5)
  function getPersonLedger(personName: string): PersonLedgerItem {
    const txns = data.transactions
      .filter((t) => t.person?.trim().toLowerCase() === personName.trim().toLowerCase())
      .filter((t) => t.type === 'Lent' || t.type === 'Lent Recovered' || t.type === 'Money Lent' || t.type === 'Money Received')
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

    let totalLent = 0;
    let totalRecovered = 0;

    for (const t of txns) {
      const norm = normalizeTransactionType(t.type);
      if (norm === 'Lent') {
        totalLent += t.amount;
      } else if (norm === 'Lent Recovered') {
        totalRecovered += t.amount;
      }
    }

    const netBalance = totalLent - totalRecovered;
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
      transactions: prev.transactions.filter((t) => t.receivableId !== id),
    }));
  }

  // Recurring Management
  function addRecurring(r: Omit<Recurring, 'id' | 'createdAt' | 'nextDueDate'>): Recurring {
    const rec: Recurring = {
      ...r,
      id: uid(),
      createdAt: Date.now(),
      nextDueDate: r.startDate,
      status: 'Scheduled',
    };
    setData((prev) => ({ ...prev, recurring: [rec, ...prev.recurring] }));
    return rec;
  }

  function updateRecurring(id: string, updates: Partial<Recurring>) {
    setData((prev) => ({
      ...prev,
      recurring: prev.recurring.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  }

  function deleteRecurring(id: string) {
    setData((prev) => ({ ...prev, recurring: prev.recurring.filter((r) => r.id !== id) }));
  }

  function postRecurring(id: string) {
    setData((prev) => postRecurringInData(prev, id));
  }

  function skipRecurring(id: string) {
    setData((prev) => {
      const r = prev.recurring.find((rec) => rec.id === id);
      if (!r) return prev;
      const nextDue = computeNextDue(r);
      const shouldContinue = !r.endDate || nextDue <= r.endDate;
      return {
        ...prev,
        recurring: prev.recurring.map((rec) =>
          rec.id === id && shouldContinue ? { ...rec, nextDueDate: nextDue } : rec
        ),
      };
    });
  }

  // Quick amounts
  function addQuickAmount(amount: number) {
    if (!amount || amount <= 0) return;
    setData((prev) => {
      if (prev.quickAmounts.includes(amount)) return prev;
      return { ...prev, quickAmounts: [...prev.quickAmounts, amount].sort((a, b) => a - b) };
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
    const txns = data.transactions.slice(0, 50);
    const patternMap = new Map<string, { count: number; sample: Transaction }>();

    for (const t of txns) {
      const norm = normalizeTransactionType(t.type);
      const key = `${norm}|${t.majorCategory}|${t.subCategory}|${t.paymentMode}|${t.account}|${t.person}|${t.amount}`;
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
            : `${sample.majorCategory || sample.type} ₹${sample.amount}`;

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
    }));
  }

  function deleteCustomField(id: string) {
    setData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((f) => f.id !== id),
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
      const norm = normalizeTransactionType(t.type);
      switch (norm) {
        case 'Revenue Expense':
          revenueExpense += t.amount;
          break;
        case 'Lent':
          lent += t.amount;
          break;
        case 'CAPEX':
          capex += t.amount;
          break;
        case 'To Ghar':
          toGhar += t.amount;
          break;
        case 'Investment':
          investment += t.amount;
          break;
        case 'Lent Recovered':
          lentRecovered += t.amount;
          break;
        case 'Income Misc':
          incomeMisc += t.amount;
          break;
      }
    }

    const totalOutflow = revenueExpense + lent + capex + toGhar + investment;
    const totalInflow = lentRecovered + incomeMisc;

    const outflowPercentages = {
      revenueExpense: totalOutflow > 0 ? (revenueExpense / totalOutflow) * 100 : 0,
      lent: totalOutflow > 0 ? (lent / totalOutflow) * 100 : 0,
      capex: totalOutflow > 0 ? (capex / totalOutflow) * 100 : 0,
      toGhar: totalOutflow > 0 ? (toGhar / totalOutflow) * 100 : 0,
      investment: totalOutflow > 0 ? (investment / totalOutflow) * 100 : 0,
    };

    const inflowPercentages = {
      lentRecovered: totalInflow > 0 ? (lentRecovered / totalInflow) * 100 : 0,
      incomeMisc: totalInflow > 0 ? (incomeMisc / totalInflow) * 100 : 0,
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
      const monthsCount = Math.max(1, info.pastMonthsWithData.size);
      const threeMonthAvg = info.pastSum > 0 ? info.pastSum / monthsCount : info.current;
      const suggestedLevel = Math.round(threeMonthAvg > 0 ? threeMonthAvg : info.current);
      const usagePercentage = suggestedLevel > 0 ? Math.round((info.current / suggestedLevel) * 100) : 100;

      let warning: string | undefined = undefined;
      if (usagePercentage >= 80 && usagePercentage < 100) {
        warning = `You are at ${usagePercentage}% of your normal monthly ${cat} spending.`;
      } else if (usagePercentage >= 100 && suggestedLevel > 0) {
        warning = `Exceeded normal monthly ${cat} spending (${usagePercentage}%).`;
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
    const backupObj = {
      backupFormatVersion: 2,
      appVersion: '2.0.0',
      exportedAt: new Date().toISOString(),
      data,
    };
    return JSON.stringify(backupObj, null, 2);
  }

  function restoreBackup(jsonContent: string): { success: boolean; message: string; count?: number } {
    try {
      const parsed = JSON.parse(jsonContent);
      const backupData = parsed.data || parsed;

      if (!backupData || (!Array.isArray(backupData.transactions) && !Array.isArray(backupData.categories))) {
        return { success: false, message: 'Invalid backup file format.' };
      }

      // Merge transactions avoiding duplicates by ID
      const currentIds = new Set(data.transactions.map((t) => t.id));
      const incomingTxns: Transaction[] = [];

      for (const raw of backupData.transactions || []) {
        if (!currentIds.has(raw.id)) {
          const type = normalizeTransactionType(raw.type || 'Revenue Expense');
          const amount = Number(raw.amount) || 0;
          incomingTxns.push({
            id: raw.id || uid(),
            schemaVersion: 2,
            type,
            heading: raw.heading || '',
            amount,
            amountMinor: typeof raw.amountMinor === 'number' ? raw.amountMinor : toPaise(amount),
            currency: 'INR',
            date: raw.date || todayISO(),
            createdAt: raw.createdAt || Date.now(),
            updatedAt: raw.updatedAt || Date.now(),
            majorCategory: raw.majorCategory || '',
            subCategory: raw.subCategory || '',
            miniCategory: raw.miniCategory || '',
            paymentMode: raw.paymentMode || '',
            account: raw.account || '',
            person: raw.person || '',
            purchasedFrom: raw.purchasedFrom || '',
            paymentFor: raw.paymentFor || '',
            incomeType: raw.incomeType || '',
            investmentType: raw.investmentType || '',
            remarks: raw.remarks || '',
            recurringTemplateId: raw.recurringTemplateId,
            recurringOccurrenceDate: raw.recurringOccurrenceDate,
            customFields: raw.customFields || {},
            financialEffect: raw.financialEffect || deriveFinancialEffect(type, amount),
            status: raw.status || 'active',
            receivableId: raw.receivableId,
          });
        }
      }

      // Merge lists
      const mergedCategories = [...data.categories];
      for (const cat of backupData.categories || []) {
        const found = mergedCategories.find((c) => c.name === cat.name);
        if (!found) {
          mergedCategories.push(cat);
        } else {
          for (const sub of cat.subCategories || []) {
            if (!found.subCategories.includes(sub)) found.subCategories.push(sub);
          }
        }
      }

      const mergedAccounts = Array.from(new Set([...data.accounts, ...(backupData.accounts || [])]));
      const mergedPaymentModes = Array.from(new Set([...data.paymentModes, ...(backupData.paymentModes || [])]));
      const mergedPeople = Array.from(new Set([...data.people, ...(backupData.people || [])]));
      const mergedQuickAmounts = Array.from(new Set([...data.quickAmounts, ...(backupData.quickAmounts || [])]));
      const mergedCustomFields = [...data.customFields];
      for (const cf of backupData.customFields || []) {
        if (!mergedCustomFields.some((f) => f.id === cf.id || f.key === cf.key)) {
          mergedCustomFields.push(cf);
        }
      }

      const restoredData: AppData = {
        ...data,
        transactions: [...incomingTxns, ...data.transactions],
        categories: mergedCategories,
        accounts: mergedAccounts,
        paymentModes: mergedPaymentModes,
        people: mergedPeople,
        quickAmounts: mergedQuickAmounts,
        customFields: mergedCustomFields,
      };

      setData(restoredData);
      saveData(restoredData);

      return {
        success: true,
        message: `Backup restored successfully! Added ${incomingTxns.length} new transactions.`,
        count: incomingTxns.length,
      };
    } catch (err: any) {
      return { success: false, message: 'Failed to restore: ' + (err.message || 'Unknown error') };
    }
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
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.name !== name),
    }));
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
    setData((prev) => ({ ...prev, accounts: prev.accounts.filter((a) => a !== name) }));
  }
  function addPaymentMode(name: string) {
    setData((prev) =>
      prev.paymentModes.includes(name) ? prev : { ...prev, paymentModes: [...prev.paymentModes, name] }
    );
  }
  function deletePaymentMode(name: string) {
    setData((prev) => ({ ...prev, paymentModes: prev.paymentModes.filter((p) => p !== name) }));
  }
  function addPerson(name: string) {
    setData((prev) => (prev.people.includes(name) ? prev : { ...prev, people: [...prev.people, name] }));
  }
  function deletePerson(name: string) {
    setData((prev) => ({ ...prev, people: prev.people.filter((p) => p !== name) }));
  }

  function addCapexPurchasedFrom(name: string) {
    setData((prev) =>
      prev.capexPurchasedFrom?.includes(name)
        ? prev
        : { ...prev, capexPurchasedFrom: [...(prev.capexPurchasedFrom || []), name] }
    );
  }
  function deleteCapexPurchasedFrom(name: string) {
    setData((prev) => ({
      ...prev,
      capexPurchasedFrom: (prev.capexPurchasedFrom || []).filter((x) => x !== name),
    }));
  }

  function addToGharPaymentFor(name: string) {
    setData((prev) =>
      prev.toGharPaymentFor?.includes(name)
        ? prev
        : { ...prev, toGharPaymentFor: [...(prev.toGharPaymentFor || []), name] }
    );
  }
  function deleteToGharPaymentFor(name: string) {
    setData((prev) => ({
      ...prev,
      toGharPaymentFor: (prev.toGharPaymentFor || []).filter((x) => x !== name),
    }));
  }

  function addIncomeType(name: string) {
    setData((prev) =>
      prev.incomeTypes?.includes(name)
        ? prev
        : { ...prev, incomeTypes: [...(prev.incomeTypes || []), name] }
    );
  }
  function deleteIncomeType(name: string) {
    setData((prev) => ({
      ...prev,
      incomeTypes: (prev.incomeTypes || []).filter((x) => x !== name),
    }));
  }

  function addInvestmentType(name: string) {
    setData((prev) =>
      prev.investmentTypes?.includes(name)
        ? prev
        : { ...prev, investmentTypes: [...(prev.investmentTypes || []), name] }
    );
  }
  function deleteInvestmentType(name: string) {
    setData((prev) => ({
      ...prev,
      investmentTypes: (prev.investmentTypes || []).filter((x) => x !== name),
    }));
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
    data,
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
