import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  AppData,
  Transaction,
  Receivable,
  Repayment,
  Recurring,
  QuickExpense,
  CategoryDef,
  FieldConfig,
  TransactionType,
} from '@/data/types';
import { loadData, saveData, uid } from '@/data/storage';
import { addDays, addMonths, addYears, todayISO } from '@/data/format';

interface AppContextValue {
  data: AppData;
  // Transactions
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  deleteTransaction: (id: string) => void;
  // Receivables
  addReceivable: (r: Omit<Receivable, 'id' | 'createdAt'>) => Receivable;
  addRepayment: (r: Omit<Repayment, 'id' | 'createdAt'>) => Repayment;
  getReceivableOutstanding: (receivableId: string) => number;
  getReceivableRecovered: (receivableId: string) => number;
  deleteReceivable: (id: string) => void;
  // Recurring
  addRecurring: (r: Omit<Recurring, 'id' | 'createdAt' | 'nextDueDate'>) => Recurring;
  deleteRecurring: (id: string) => void;
  postRecurring: (id: string) => void;
  skipRecurring: (id: string) => void;
  // Quick expenses
  addQuickExpense: (q: Omit<QuickExpense, 'id' | 'createdAt'>) => QuickExpense;
  deleteQuickExpense: (id: string) => void;
  recordQuickExpense: (id: string) => void;
  // Settings
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
  updateFormFields: (fields: FieldConfig[]) => void;
  updateRecurringFormFields: (fields: FieldConfig[]) => void;
  addFormFieldOption: (fieldKey: string, option: string) => void;
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

  // Auto-post recurring transactions that are due and have automaticPosting on
  useEffect(() => {
    const due = data.recurring.filter((r) => {
      if (!r.automaticPosting) return false;
      const next = new Date(r.nextDueDate + 'T00:00:00');
      const today = new Date(todayISO() + 'T00:00:00');
      return next <= today && (!r.endDate || r.nextDueDate <= r.endDate);
    });
    if (due.length === 0) return;
    setData((prev) => {
      let updated = { ...prev };
      for (const r of due) {
        updated = postRecurringInData(updated, r.id);
      }
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addTransaction(t: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const txn: Transaction = { ...t, id: uid(), createdAt: Date.now() };
    setData((prev) => ({ ...prev, transactions: [txn, ...prev.transactions] }));
    // Auto-add person if new
    if (t.person && !data.people.includes(t.person)) {
      setData((prev) => ({ ...prev, people: [...prev.people, t.person] }));
    }
    return txn;
  }

  function deleteTransaction(id: string) {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  }

  function addReceivable(r: Omit<Receivable, 'id' | 'createdAt'>): Receivable {
    const rec: Receivable = { ...r, id: uid(), createdAt: Date.now() };
    setData((prev) => ({ ...prev, receivables: [rec, ...prev.receivables] }));
    // Also create a "Money Lent" transaction so it doesn't count as personal expense
    const txn: Transaction = {
      id: uid(),
      type: 'Money Lent',
      amount: r.amount,
      date: r.date,
      majorCategory: 'Recover',
      subCategory: '',
      paymentMode: '',
      account: r.account,
      person: r.person,
      remarks: r.reason,
      createdAt: Date.now(),
      receivableId: rec.id,
    };
    setData((prev) => ({ ...prev, transactions: [txn, ...prev.transactions] }));
    if (r.person && !data.people.includes(r.person)) {
      setData((prev) => ({ ...prev, people: [...prev.people, r.person] }));
    }
    return rec;
  }

  function addRepayment(r: Omit<Repayment, 'id' | 'createdAt'>): Repayment {
    const rep: Repayment = { ...r, id: uid(), createdAt: Date.now() };
    setData((prev) => ({ ...prev, repayments: [rep, ...prev.repayments] }));
    // Also create a "Money Received" transaction
    const txn: Transaction = {
      id: uid(),
      type: 'Money Received',
      amount: r.amount,
      date: r.date,
      majorCategory: 'Recover',
      subCategory: '',
      paymentMode: '',
      account: r.account,
      person: '',
      remarks: 'Repayment',
      createdAt: Date.now(),
      receivableId: r.receivableId,
    };
    setData((prev) => ({ ...prev, transactions: [txn, ...prev.transactions] }));
    return rep;
  }

  function getReceivableRecovered(receivableId: string): number {
    return data.repayments
      .filter((r) => r.receivableId === receivableId)
      .reduce((sum, r) => sum + r.amount, 0);
  }

  function getReceivableOutstanding(receivableId: string): number {
    const rec = data.receivables.find((r) => r.id === receivableId);
    if (!rec) return 0;
    return rec.amount - getReceivableRecovered(receivableId);
  }

  function deleteReceivable(id: string) {
    setData((prev) => ({
      ...prev,
      receivables: prev.receivables.filter((r) => r.id !== id),
      repayments: prev.repayments.filter((r) => r.receivableId !== id),
      transactions: prev.transactions.filter((t) => t.receivableId !== id),
    }));
  }

  function computeNextDue(r: Recurring): string {
    const from = r.nextDueDate;
    switch (r.frequency) {
      case 'Weekly':
        return addDays(from, 7);
      case 'Monthly':
        return addMonths(from, 1);
      case 'Yearly':
        return addYears(from, 1);
      case 'Custom':
        return addDays(from, r.customIntervalDays ?? 1);
      default:
        return addMonths(from, 1);
    }
  }

  function addRecurring(r: Omit<Recurring, 'id' | 'createdAt' | 'nextDueDate'>): Recurring {
    const rec: Recurring = { ...r, id: uid(), createdAt: Date.now(), nextDueDate: r.startDate };
    setData((prev) => ({ ...prev, recurring: [rec, ...prev.recurring] }));
    return rec;
  }

  function deleteRecurring(id: string) {
    setData((prev) => ({ ...prev, recurring: prev.recurring.filter((r) => r.id !== id) }));
  }

  function postRecurringInData(prev: AppData, id: string): AppData {
    const r = prev.recurring.find((rec) => rec.id === id);
    if (!r) return prev;
    const txn: Transaction = {
      id: uid(),
      type: r.type,
      amount: r.amount,
      date: r.nextDueDate,
      majorCategory: r.majorCategory,
      subCategory: r.subCategory,
      paymentMode: r.paymentMode,
      account: r.account,
      person: '',
      remarks: r.description + ' (recurring)',
      createdAt: Date.now(),
    };
    const nextDue = computeNextDue(r);
    const shouldContinue = !r.endDate || nextDue <= r.endDate;
    return {
      ...prev,
      transactions: [txn, ...prev.transactions],
      recurring: prev.recurring.map((rec) =>
        rec.id === id && shouldContinue ? { ...rec, nextDueDate: nextDue } : rec
      ),
    };
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
    const txn: Transaction = {
      id: uid(),
      type: 'Expense',
      amount: q.amount,
      date: todayISO(),
      majorCategory: q.majorCategory,
      subCategory: q.subCategory,
      paymentMode: q.paymentMode,
      account: q.account,
      person: '',
      remarks: q.label,
      createdAt: Date.now(),
    };
    setData((prev) => ({ ...prev, transactions: [txn, ...prev.transactions] }));
  }

  function addCategory(name: string) {
    setData((prev) => {
      if (prev.categories.some((c) => c.name === name)) return prev;
      return { ...prev, categories: [...prev.categories, { name, subCategories: [] }] };
    });
  }
  function updateCategory(oldName: string, newName: string) {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.name === oldName ? { ...c, name: newName } : c)),
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
    setData((prev) => prev.accounts.includes(name) ? prev : { ...prev, accounts: [...prev.accounts, name] });
  }
  function deleteAccount(name: string) {
    setData((prev) => ({ ...prev, accounts: prev.accounts.filter((a) => a !== name) }));
  }
  function addPaymentMode(name: string) {
    setData((prev) => prev.paymentModes.includes(name) ? prev : { ...prev, paymentModes: [...prev.paymentModes, name] });
  }
  function deletePaymentMode(name: string) {
    setData((prev) => ({ ...prev, paymentModes: prev.paymentModes.filter((p) => p !== name) }));
  }
  function addPerson(name: string) {
    setData((prev) => prev.people.includes(name) ? prev : { ...prev, people: [...prev.people, name] });
  }
  function deletePerson(name: string) {
    setData((prev) => ({ ...prev, people: prev.people.filter((p) => p !== name) }));
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
    deleteTransaction,
    addReceivable,
    addRepayment,
    getReceivableOutstanding,
    getReceivableRecovered,
    deleteReceivable,
    addRecurring,
    deleteRecurring,
    postRecurring,
    skipRecurring,
    addQuickExpense,
    deleteQuickExpense,
    recordQuickExpense,
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
    updateFormFields,
    updateRecurringFormFields,
    addFormFieldOption,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export type { TransactionType };
