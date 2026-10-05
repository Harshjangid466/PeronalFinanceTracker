export type TransactionType =
  | 'Revenue Expense'
  | 'Lent'
  | 'Lent Recovered'
  | 'CAPEX'
  | 'To Ghar'
  | 'Income Misc'
  | 'Investment';

export const CORE_TRANSACTION_TYPES: TransactionType[] = [
  'Revenue Expense',
  'Lent',
  'Lent Recovered',
  'CAPEX',
  'To Ghar',
  'Income Misc',
  'Investment',
];

// Backward-compatible alias list
export const ALL_TRANSACTION_TYPES: string[] = [
  ...CORE_TRANSACTION_TYPES,
  'Expense',
  'Income',
  'Transfer',
  'Money Lent',
  'Money Received',
  'Reimbursement',
  'Refund',
  'Credit Card Payment',
];

export function normalizeTransactionType(type: string): TransactionType {
  if (type === 'Revenue Expense' || type === 'Expense') return 'Revenue Expense';
  if (type === 'Lent' || type === 'Money Lent') return 'Lent';
  if (type === 'Lent Recovered' || type === 'Money Received' || type === 'Reimbursement' || type === 'Refund') return 'Lent Recovered';
  if (type === 'CAPEX') return 'CAPEX';
  if (type === 'To Ghar') return 'To Ghar';
  if (type === 'Income Misc' || type === 'Income') return 'Income Misc';
  if (type === 'Investment') return 'Investment';
  return 'Revenue Expense';
}

export function isPersonalExpense(type: string): boolean {
  return normalizeTransactionType(type) === 'Revenue Expense';
}

export type Frequency = 'Weekly' | 'Monthly' | 'Quarterly' | 'Half-yearly' | 'Yearly' | 'Custom';

export interface FinancialEffect {
  personalExpense: number; // in Rupees
  income: number;
  receivableIncrease: number;
  receivableDecrease: number;
  capex: number;
  investment: number;
}

export function deriveFinancialEffect(type: TransactionType, amount: number): FinancialEffect {
  const norm = normalizeTransactionType(type);
  switch (norm) {
    case 'Revenue Expense':
      return {
        personalExpense: amount,
        income: 0,
        receivableIncrease: 0,
        receivableDecrease: 0,
        capex: 0,
        investment: 0,
      };
    case 'Lent':
      return {
        personalExpense: 0,
        income: 0,
        receivableIncrease: amount,
        receivableDecrease: 0,
        capex: 0,
        investment: 0,
      };
    case 'Lent Recovered':
      return {
        personalExpense: 0,
        income: 0,
        receivableIncrease: 0,
        receivableDecrease: amount,
        capex: 0,
        investment: 0,
      };
    case 'CAPEX':
      return {
        personalExpense: 0,
        income: 0,
        receivableIncrease: 0,
        receivableDecrease: 0,
        capex: amount,
        investment: 0,
      };
    case 'Income Misc':
      return {
        personalExpense: 0,
        income: amount,
        receivableIncrease: 0,
        receivableDecrease: 0,
        capex: 0,
        investment: 0,
      };
    case 'Investment':
      return {
        personalExpense: 0,
        income: 0,
        receivableIncrease: 0,
        receivableDecrease: 0,
        capex: 0,
        investment: amount,
      };
    case 'To Ghar':
      return {
        personalExpense: 0,
        income: 0,
        receivableIncrease: 0,
        receivableDecrease: 0,
        capex: 0,
        investment: 0,
      };
    default:
      return {
        personalExpense: amount,
        income: 0,
        receivableIncrease: 0,
        receivableDecrease: 0,
        capex: 0,
        investment: 0,
      };
  }
}

export interface Transaction {
  id: string;
  schemaVersion: number;
  type: TransactionType;
  heading?: string;
  amount: number; // in Rupees
  amountMinor: number; // in integer Paise (₹500 = 50000 paise)
  currency: 'INR';
  date: string; // ISO date yyyy-mm-dd
  createdAt: number;
  updatedAt: number;
  majorCategory: string;
  subCategory: string;
  miniCategory?: string;
  paymentMode: string;
  account: string; // Source or Credited To
  person: string; // Lent To or Received From
  purchasedFrom?: string; // For CAPEX
  paymentFor?: string; // For To Ghar
  incomeType?: string; // For Income Misc
  investmentType?: string; // For Investment
  remarks: string;
  recurringTemplateId?: string;
  recurringOccurrenceDate?: string;
  customFields?: Record<string, any>;
  financialEffect: FinancialEffect;
  status: 'active' | 'cancelled';
  receivableId?: string; // link to receivable if applicable
}

export interface Repayment {
  id: string;
  receivableId: string;
  amount: number;
  date: string;
  account: string;
  remarks: string;
  createdAt: number;
}

export interface Receivable {
  id: string;
  person: string;
  amount: number;
  date: string;
  reason: string;
  account: string;
  createdAt: number;
}

export interface Recurring {
  id: string;
  description: string;
  amount: number;
  amountMinor?: number;
  majorCategory: string;
  subCategory: string;
  account: string;
  paymentMode: string;
  frequency: Frequency;
  customIntervalDays?: number;
  startDate: string;
  nextDueDate: string;
  endDate?: string;
  automaticPosting: boolean;
  type: TransactionType;
  remarks?: string;
  status?: 'Scheduled' | 'Posted' | 'Skipped' | 'Paused' | 'Cancelled';
  customFields?: Record<string, any>;
  createdAt: number;
}

export interface QuickExpense {
  id: string;
  label: string;
  amount: number;
  majorCategory: string;
  subCategory: string;
  paymentMode: string;
  account: string;
  createdAt: number;
}

export interface FrequentTransaction {
  id: string;
  label: string;
  type: TransactionType;
  amount?: number;
  majorCategory?: string;
  subCategory?: string;
  paymentMode?: string;
  account?: string;
  person?: string;
  purchasedFrom?: string;
  paymentFor?: string;
  incomeType?: string;
  investmentType?: string;
  remarks?: string;
  customFields?: Record<string, any>;
  createdAt: number;
  useCount?: number;
}

export interface CategoryDef {
  name: string;
  subCategories: string[];
}

export type CustomFieldType =
  | 'text'
  | 'longText'
  | 'number'
  | 'decimal'
  | 'date'
  | 'dropdown'
  | 'multiSelect'
  | 'boolean';

export interface CustomFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  enabled: boolean;
  order: number;
  applicableTypes: TransactionType[]; // Empty array means all types
  options?: string[]; // for dropdown or multiSelect
  parentFieldKey?: string; // key of parent dropdown field
  parentOptionValue?: string; // value that triggers these options
  dependentOptions?: Record<string, string[]>; // e.g. { "Food": ["Lunch", "Dinner"], "Commute": ["Metro", "Bus"] }
}

export interface FieldConfig {
  key: string;
  label: string;
  enabled: boolean;
  required: boolean;
  order: number;
  type: 'text' | 'dropdown' | 'date' | 'number';
  options?: string[];
}

export interface AppData {
  schemaVersion: number;
  transactions: Transaction[];
  receivables: Receivable[];
  repayments: Repayment[];
  recurring: Recurring[];
  quickExpenses: QuickExpense[];
  frequentTransactions: FrequentTransaction[];
  quickAmounts: number[];
  categories: CategoryDef[];
  accounts: string[];
  paymentModes: string[];
  people: string[];
  capexPurchasedFrom: string[];
  toGharPaymentFor: string[];
  incomeTypes: string[];
  investmentTypes: string[];
  customFields: CustomFieldDefinition[];
  formFields: FieldConfig[];
  recurringFormFields: FieldConfig[];
}
