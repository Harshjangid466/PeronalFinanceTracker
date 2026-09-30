import type { AppData, CategoryDef, FieldConfig } from './types';

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  {
    name: 'Food',
    subCategories: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Coffee', 'Groceries'],
  },
  {
    name: 'Commute',
    subCategories: ['Metro', 'Bus', 'Auto', 'Uber', 'Taxi', 'Fuel'],
  },
  {
    name: 'Bills & Utilities',
    subCategories: ['Mobile Recharge', 'Internet/Wi-Fi', 'Electricity', 'Other'],
  },
  {
    name: 'Subscriptions',
    subCategories: ['OTT', 'Software', 'Other'],
  },
  {
    name: 'Shopping',
    subCategories: ['Clothing', 'Electronics', 'Household', 'Other'],
  },
  {
    name: 'Health',
    subCategories: ['Medicine', 'Doctor', 'Other'],
  },
  {
    name: 'Personal',
    subCategories: ['Grooming', 'Miscellaneous'],
  },
];

export const DEFAULT_ACCOUNTS = [
  'HDFC Credit Card',
  'ICICI Credit Card',
  'HDFC Savings',
  'ICICI Savings',
  'Cash',
  'UPI',
];

export const DEFAULT_PAYMENT_MODES = [
  'UPI',
  'Credit Card',
  'Debit Card',
  'Cash',
  'Net Banking',
  'Wallet',
];

export const DEFAULT_FORM_FIELDS: FieldConfig[] = [
  { key: 'amount', label: 'Amount', enabled: true, required: true, order: 0, type: 'number' },
  { key: 'date', label: 'Date', enabled: true, required: true, order: 1, type: 'date' },
  { key: 'type', label: 'Transaction Type', enabled: true, required: true, order: 2, type: 'dropdown', options: ['Expense', 'Income', 'Transfer', 'Money Lent', 'Money Received', 'Reimbursement', 'Refund', 'Credit Card Payment'] },
  { key: 'majorCategory', label: 'Major Category', enabled: true, required: true, order: 3, type: 'dropdown' },
  { key: 'subCategory', label: 'Sub-category', enabled: true, required: false, order: 4, type: 'dropdown' },
  { key: 'paymentMode', label: 'Payment Mode', enabled: true, required: false, order: 5, type: 'dropdown' },
  { key: 'account', label: 'Account', enabled: true, required: false, order: 6, type: 'dropdown' },
  { key: 'person', label: 'Person', enabled: true, required: false, order: 7, type: 'dropdown' },
  { key: 'remarks', label: 'Remarks', enabled: true, required: false, order: 8, type: 'text' },
];

export const DEFAULT_RECURRING_FORM_FIELDS: FieldConfig[] = [
  { key: 'description', label: 'Description', enabled: true, required: true, order: 0, type: 'text' },
  { key: 'amount', label: 'Amount', enabled: true, required: true, order: 1, type: 'number' },
  { key: 'type', label: 'Transaction Type', enabled: true, required: true, order: 2, type: 'dropdown', options: ['Expense', 'Income', 'Transfer', 'Credit Card Payment'] },
  { key: 'majorCategory', label: 'Category', enabled: true, required: true, order: 3, type: 'dropdown' },
  { key: 'subCategory', label: 'Sub-category', enabled: true, required: false, order: 4, type: 'dropdown' },
  { key: 'account', label: 'Account', enabled: true, required: false, order: 5, type: 'dropdown' },
  { key: 'paymentMode', label: 'Payment Mode', enabled: true, required: false, order: 6, type: 'dropdown' },
  { key: 'frequency', label: 'Frequency', enabled: true, required: true, order: 7, type: 'dropdown', options: ['Weekly', 'Monthly', 'Yearly', 'Custom'] },
  { key: 'customIntervalDays', label: 'Custom Interval (days)', enabled: true, required: false, order: 8, type: 'number' },
  { key: 'startDate', label: 'Start Date', enabled: true, required: true, order: 9, type: 'date' },
  { key: 'endDate', label: 'End Date', enabled: true, required: false, order: 10, type: 'date' },
  { key: 'automaticPosting', label: 'Automatic Posting', enabled: true, required: false, order: 11, type: 'text' },
];

export function getDefaultData(): AppData {
  return {
    transactions: [],
    receivables: [],
    repayments: [],
    recurring: [],
    quickExpenses: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, subCategories: [...c.subCategories] })),
    accounts: [...DEFAULT_ACCOUNTS],
    paymentModes: [...DEFAULT_PAYMENT_MODES],
    people: [],
    formFields: DEFAULT_FORM_FIELDS.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
    recurringFormFields: DEFAULT_RECURRING_FORM_FIELDS.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
  };
}
