export type TransactionType =
  | 'Expense'
  | 'Income'
  | 'Transfer'
  | 'Money Lent'
  | 'Money Received'
  | 'Reimbursement'
  | 'Refund'
  | 'Credit Card Payment';

export const TRANSACTION_TYPES: TransactionType[] = [
  'Expense',
  'Income',
  'Transfer',
  'Money Lent',
  'Money Received',
  'Reimbursement',
  'Refund',
  'Credit Card Payment',
];

export const EXPENSE_TYPES: TransactionType[] = ['Expense'];

export function isPersonalExpense(type: TransactionType): boolean {
  return type === 'Expense';
}

export type Frequency = 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO date yyyy-mm-dd
  majorCategory: string;
  subCategory: string;
  paymentMode: string;
  account: string;
  person: string;
  remarks: string;
  createdAt: number;
  receivableId?: string; // link to receivable if this is a "Money Lent" for someone
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

export interface CategoryDef {
  name: string;
  subCategories: string[];
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
  transactions: Transaction[];
  receivables: Receivable[];
  repayments: Repayment[];
  recurring: Recurring[];
  quickExpenses: QuickExpense[];
  categories: CategoryDef[];
  accounts: string[];
  paymentModes: string[];
  people: string[];
  formFields: FieldConfig[];
  recurringFormFields: FieldConfig[];
}
