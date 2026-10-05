import type { AppData, Transaction } from './types';
import { getDefaultData, DEFAULT_QUICK_AMOUNTS, DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_PAYMENT_MODES, DEFAULT_CAPEX_PURCHASED_FROM, DEFAULT_TO_GHAR_PAYMENT_FOR, DEFAULT_INCOME_TYPES, DEFAULT_INVESTMENT_TYPES } from './defaults';
import { normalizeTransactionType, deriveFinancialEffect } from './types';

const STORAGE_KEY_V2 = 'finance-tracker-data-v2';
const STORAGE_KEY_V1 = 'finance-tracker-data-v1';

export function loadData(): AppData {
  try {
    let raw = localStorage.getItem(STORAGE_KEY_V2);
    let isV1 = false;
    if (!raw) {
      raw = localStorage.getItem(STORAGE_KEY_V1);
      isV1 = true;
    }

    if (!raw) return getDefaultData();

    const parsed = JSON.parse(raw) as Partial<AppData> & { [key: string]: any };
    const defaults = getDefaultData();

    // Migrate transactions
    const rawTxns = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    const migratedTxns: Transaction[] = rawTxns.map((t: any) => {
      const type = normalizeTransactionType(t.type || 'Revenue Expense');
      const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
      const amountMinor = typeof t.amountMinor === 'number' ? t.amountMinor : Math.round(amount * 100);
      const financialEffect = t.financialEffect || deriveFinancialEffect(type, amount);

      return {
        id: t.id || uid(),
        schemaVersion: 2,
        type,
        heading: t.heading || '',
        amount,
        amountMinor,
        currency: 'INR',
        date: t.date || new Date().toISOString().slice(0, 10),
        createdAt: t.createdAt || Date.now(),
        updatedAt: t.updatedAt || t.createdAt || Date.now(),
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
    });

    // Merge categories (preserve user categories, add any missing defaults)
    const existingCategories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const categoryMap = new Map<string, string[]>();
    for (const cat of existingCategories) {
      categoryMap.set(cat.name, Array.isArray(cat.subCategories) ? [...cat.subCategories] : []);
    }
    for (const defCat of DEFAULT_CATEGORIES) {
      if (!categoryMap.has(defCat.name)) {
        categoryMap.set(defCat.name, [...defCat.subCategories]);
      } else {
        const currentSubs = categoryMap.get(defCat.name)!;
        for (const sub of defCat.subCategories) {
          if (!currentSubs.includes(sub)) currentSubs.push(sub);
        }
      }
    }
    const mergedCategories = Array.from(categoryMap.entries()).map(([name, subCategories]) => ({
      name,
      subCategories,
    }));

    // Merge accounts / sources
    const existingAccounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
    const mergedAccounts = Array.from(new Set([...existingAccounts, ...DEFAULT_ACCOUNTS]));

    // Merge payment modes
    const existingPaymentModes = Array.isArray(parsed.paymentModes) ? parsed.paymentModes : [];
    const mergedPaymentModes = Array.from(new Set([...existingPaymentModes, ...DEFAULT_PAYMENT_MODES]));

    const result: AppData = {
      schemaVersion: 2,
      transactions: migratedTxns,
      receivables: Array.isArray(parsed.receivables) ? parsed.receivables : defaults.receivables,
      repayments: Array.isArray(parsed.repayments) ? parsed.repayments : defaults.repayments,
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : defaults.recurring,
      quickExpenses: Array.isArray(parsed.quickExpenses) ? parsed.quickExpenses : defaults.quickExpenses,
      frequentTransactions: Array.isArray(parsed.frequentTransactions) ? parsed.frequentTransactions : defaults.frequentTransactions,
      quickAmounts: Array.isArray(parsed.quickAmounts) && parsed.quickAmounts.length > 0 ? parsed.quickAmounts : [...DEFAULT_QUICK_AMOUNTS],
      categories: mergedCategories,
      accounts: mergedAccounts,
      paymentModes: mergedPaymentModes,
      people: Array.isArray(parsed.people) ? parsed.people : defaults.people,
      capexPurchasedFrom: Array.isArray(parsed.capexPurchasedFrom) ? parsed.capexPurchasedFrom : [...DEFAULT_CAPEX_PURCHASED_FROM],
      toGharPaymentFor: Array.isArray(parsed.toGharPaymentFor) ? parsed.toGharPaymentFor : [...DEFAULT_TO_GHAR_PAYMENT_FOR],
      incomeTypes: Array.isArray(parsed.incomeTypes) ? parsed.incomeTypes : [...DEFAULT_INCOME_TYPES],
      investmentTypes: Array.isArray(parsed.investmentTypes) ? parsed.investmentTypes : [...DEFAULT_INVESTMENT_TYPES],
      customFields: Array.isArray(parsed.customFields) ? parsed.customFields : defaults.customFields,
      formFields: Array.isArray(parsed.formFields) ? parsed.formFields : defaults.formFields,
      recurringFormFields: Array.isArray(parsed.recurringFormFields) ? parsed.recurringFormFields : defaults.recurringFormFields,
    };

    // If loaded from V1, save immediately to V2
    if (isV1) {
      saveData(result);
    }

    return result;
  } catch (err) {
    console.error('Error loading data from localStorage, falling back to defaults:', err);
    return getDefaultData();
  }
}

export function saveData(data: AppData): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY_V2, serialized);
    // Also keep backward-compatible sync
    localStorage.setItem(STORAGE_KEY_V1, serialized);
  } catch {
    // Storage full or unavailable
  }
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
