import type { AppData } from './types';
import { getDefaultData } from './defaults';

const STORAGE_KEY = 'finance-tracker-data-v1';

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const defaults = getDefaultData();
    return {
      transactions: parsed.transactions ?? defaults.transactions,
      receivables: parsed.receivables ?? defaults.receivables,
      repayments: parsed.repayments ?? defaults.repayments,
      recurring: parsed.recurring ?? defaults.recurring,
      quickExpenses: parsed.quickExpenses ?? defaults.quickExpenses,
      categories: parsed.categories ?? defaults.categories,
      accounts: parsed.accounts ?? defaults.accounts,
      paymentModes: parsed.paymentModes ?? defaults.paymentModes,
      people: parsed.people ?? defaults.people,
      formFields: parsed.formFields ?? defaults.formFields,
      recurringFormFields: parsed.recurringFormFields ?? defaults.recurringFormFields,
    };
  } catch {
    return getDefaultData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable — app still works in-memory
  }
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
