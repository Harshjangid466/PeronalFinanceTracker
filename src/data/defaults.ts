import type { AppData, CategoryDef, FieldConfig, CustomFieldDefinition } from './types';

export const DEFAULT_QUICK_AMOUNTS = [15, 20, 25, 50, 100, 200, 500, 1000];

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  {
    name: 'Food',
    subCategories: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Coffee', 'Groceries'],
  },
  {
    name: 'Commute',
    subCategories: ['Metro', 'Rapido', 'Cab Expense-Home', 'Bus', 'Auto', 'Uber', 'Taxi', 'Fuel'],
  },
  {
    name: 'Delhi flat expense',
    subCategories: ['Wifi/Postpaid', 'Rent', 'Maid', 'Electricity', 'Cook', 'Groceries', 'Maintenance', 'Other'],
  },
  {
    name: 'Entertainment/Internet',
    subCategories: ['OTT', 'Movies', 'Gaming', 'Events', 'Broadband', 'Other'],
  },
  {
    name: 'Annual Expense',
    subCategories: ['Insurance', 'Taxes', 'Domain/Hosting', 'Club Membership', 'Vehicle Service', 'Other'],
  },
  {
    name: 'Travel trip',
    subCategories: ['Flights', 'Trains', 'Hotels', 'Food & Sightseeing', 'Local Transport', 'Other'],
  },
  {
    name: 'Bills & Utilities',
    subCategories: ['Mobile Recharge', 'Internet/Wi-Fi', 'Electricity', 'Water', 'Piped Gas', 'Other'],
  },
  {
    name: 'Subscriptions',
    subCategories: ['OTT', 'Software', 'Gym', 'News', 'Other'],
  },
  {
    name: 'Shopping',
    subCategories: ['Clothing', 'Electronics', 'Footwear', 'Household', 'Books', 'Other'],
  },
  {
    name: 'Health',
    subCategories: ['Medicine', 'Doctor Consultation', 'Lab Tests', 'Fitness', 'Other'],
  },
  {
    name: 'Personal',
    subCategories: ['Grooming', 'Self Care', 'Miscellaneous'],
  },
  {
    name: 'Misc',
    subCategories: ['General', 'One-off', 'Cash Discrepancy', 'Other'],
  },
];

export const DEFAULT_ACCOUNTS = [
  'Split wise',
  'Cash',
  'HDFC Savings A/c',
  'BOB Savings A/c',
  'SBI Savings A/c',
  'RGB Savings A/c',
  'Axis Bank CC',
  'ICICI Amazon Pay CC',
  'HDFC Swiggy CC',
  'BOB CC',
  'SBI PhonePe CC',
  'Axis Flipkart CC',
  'Axis Neo CC',
  'Scapia CC',
  'ICICI Coral CC',
  'Pluxee',
];

export const DEFAULT_PAYMENT_MODES = [
  'UPI',
  'Cash',
  'Splitwise',
  'CC',
  'Net banking',
  'Debit Card',
  'Wallet',
];

export const DEFAULT_CAPEX_PURCHASED_FROM = [
  'Amazon',
  'Flipkart',
  'Myntra',
  'Apple Store',
  'Croma',
  'Reliance Digital',
  'Tata CLiQ',
  'Local Store',
  'Other',
];

export const DEFAULT_TO_GHAR_PAYMENT_FOR = [
  'To Papa/Mummy',
  'Paid For',
  'Purchased Something',
  'Medicine/Health',
  'Groceries/Ration',
  'Bills/Recharge',
  'Other',
];

export const DEFAULT_INCOME_TYPES = [
  'Salary',
  'Freelance',
  'Cashback/Reward',
  'Interest',
  'Dividend',
  'Gift',
  'Tax Refund',
  'Consulting',
  'Other',
];

export const DEFAULT_INVESTMENT_TYPES = [
  'Zerodha',
  'Coin-MF',
  'FD',
  'Books',
  'PPF',
  'NPS',
  'Stocks',
  'Gold',
  'Mutual Funds',
  'Other',
];

export const DEFAULT_FORM_FIELDS: FieldConfig[] = [
  { key: 'amount', label: 'Amount', enabled: true, required: true, order: 0, type: 'number' },
  { key: 'date', label: 'Date', enabled: true, required: true, order: 1, type: 'date' },
  { key: 'type', label: 'Transaction Type', enabled: true, required: true, order: 2, type: 'dropdown', options: ['Revenue Expense', 'Lent', 'Lent Recovered', 'CAPEX', 'To Ghar', 'Income Misc', 'Investment'] },
  { key: 'majorCategory', label: 'Major Category', enabled: true, required: true, order: 3, type: 'dropdown' },
  { key: 'subCategory', label: 'Sub-category', enabled: true, required: false, order: 4, type: 'dropdown' },
  { key: 'paymentMode', label: 'Payment Mode', enabled: true, required: false, order: 5, type: 'dropdown' },
  { key: 'account', label: 'Source / Account', enabled: true, required: false, order: 6, type: 'dropdown' },
  { key: 'person', label: 'Person', enabled: true, required: false, order: 7, type: 'dropdown' },
  { key: 'remarks', label: 'Remarks', enabled: true, required: false, order: 8, type: 'text' },
];

export const DEFAULT_RECURRING_FORM_FIELDS: FieldConfig[] = [
  { key: 'description', label: 'Description', enabled: true, required: true, order: 0, type: 'text' },
  { key: 'amount', label: 'Amount', enabled: true, required: true, order: 1, type: 'number' },
  { key: 'type', label: 'Transaction Type', enabled: true, required: true, order: 2, type: 'dropdown', options: ['Revenue Expense', 'Investment', 'CAPEX', 'To Ghar'] },
  { key: 'majorCategory', label: 'Category', enabled: true, required: true, order: 3, type: 'dropdown' },
  { key: 'subCategory', label: 'Sub-category', enabled: true, required: false, order: 4, type: 'dropdown' },
  { key: 'account', label: 'Account / Source', enabled: true, required: false, order: 5, type: 'dropdown' },
  { key: 'paymentMode', label: 'Payment Mode', enabled: true, required: false, order: 6, type: 'dropdown' },
  { key: 'frequency', label: 'Frequency', enabled: true, required: true, order: 7, type: 'dropdown', options: ['Weekly', 'Monthly', 'Quarterly', 'Half-yearly', 'Yearly', 'Custom'] },
  { key: 'customIntervalDays', label: 'Custom Interval (days)', enabled: true, required: false, order: 8, type: 'number' },
  { key: 'startDate', label: 'Start Date', enabled: true, required: true, order: 9, type: 'date' },
  { key: 'endDate', label: 'End Date', enabled: true, required: false, order: 10, type: 'date' },
  { key: 'automaticPosting', label: 'Automatic Posting', enabled: true, required: false, order: 11, type: 'text' },
];

export const DEFAULT_CUSTOM_FIELDS: CustomFieldDefinition[] = [];

export function getDefaultData(): AppData {
  return {
    schemaVersion: 2,
    transactions: [],
    receivables: [],
    repayments: [],
    recurring: [],
    quickExpenses: [],
    frequentTransactions: [],
    quickAmounts: [...DEFAULT_QUICK_AMOUNTS],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, subCategories: [...c.subCategories] })),
    accounts: [...DEFAULT_ACCOUNTS],
    paymentModes: [...DEFAULT_PAYMENT_MODES],
    people: [],
    capexPurchasedFrom: [...DEFAULT_CAPEX_PURCHASED_FROM],
    toGharPaymentFor: [...DEFAULT_TO_GHAR_PAYMENT_FOR],
    incomeTypes: [...DEFAULT_INCOME_TYPES],
    investmentTypes: [...DEFAULT_INVESTMENT_TYPES],
    customFields: [...DEFAULT_CUSTOM_FIELDS],
    formFields: DEFAULT_FORM_FIELDS.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
    recurringFormFields: DEFAULT_RECURRING_FORM_FIELDS.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
  };
}
