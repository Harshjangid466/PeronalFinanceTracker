import {canonicalSources,canonicalModes,canonicalPeople,canonicalCategories} from './model';
import type { AppData, CategoryDef, FieldConfig, CustomFieldDefinition, RuleDefinition } from './types';

export const DEFAULT_QUICK_AMOUNTS = [15, 20, 25, 50, 100, 200, 500, 1000];

const LEGACY_CATEGORIES: CategoryDef[] = [
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

export const DEFAULT_CATEGORIES: CategoryDef[] = canonicalCategories.map(name => {
 const legacy = LEGACY_CATEGORIES.find(c => c.name === name || ({'Delhi Flat expense':'Delhi flat expense','Annual Expenditure':'Annual Expense','Travel/Trip':'Travel trip'} as Record<string,string>)[name] === c.name);
 return {name,subCategories:[...(legacy?.subCategories || [])]};
});

export const DEFAULT_ACCOUNTS = [...canonicalSources];

export const DEFAULT_PAYMENT_MODES = [...canonicalModes];

export const DEFAULT_PEOPLE = [...canonicalPeople];

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

export const DEFAULT_PAYMENT_MODE_SOURCES: Record<string, string[]> = {
  Cash: ['Cash'],
  UPI: ['HDFC Savings A/c', 'BOB Savings A/c', 'SBI Savings A/c', 'RGB Savings A/c'],
  CC: [
    'HDFC Swiggy CC',
    'Amazon ICICI CC',
        'Flipkart Axis CC',
    'ICICI Coral CC',
    'Scapia Federal CC',
        'BOB ICAI CC',
    'SBI PhonePe CC',
    'Axis Neo CC',
      ],
  'Net banking': ['HDFC Savings A/c', 'BOB Savings A/c', 'SBI Savings A/c', 'RGB Savings A/c'],
  Splitwise: ['Splitwise'],
  Wallet: ['Amazon Pay', 'Pluxee card'],
};

export const DEFAULT_RULES: RuleDefinition[] = [
  {
    id: 'rule_default_cash',
    name: 'Cash Payment → Cash Source',
    conditions: [{ field: 'paymentMode', operator: 'equals', value: 'Cash' }],
    actions: [{ targetField: 'account', value: 'Cash' }],
    priority: 1,
    enabled: true,
    locked: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'rule_lent_siddharth',
    name: 'Lent to Siddharth → SBI Savings A/c',
    conditions: [
      { field: 'transactionType', operator: 'equals', value: 'Lent' },
      { field: 'person', operator: 'equals', value: 'Siddharth Bhardwaj' },
    ],
    actions: [{ targetField: 'account', value: 'SBI Savings A/c' }],
    priority: 2,
    enabled: true,
    locked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'rule_to_ghar_sbi',
    name: 'To Ghar → SBI Savings A/c',
    conditions: [{ field: 'transactionType', operator: 'equals', value: 'To Ghar' }],
    actions: [{ targetField: 'account', value: 'SBI Savings A/c' }],
    priority: 3,
    enabled: true,
    locked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'rule_capex_amazon',
    name: 'Amazon CAPEX → ICICI Amazon CC',
    conditions: [
      { field: 'transactionType', operator: 'equals', value: 'CAPEX' },
      { field: 'purchasedFrom', operator: 'equals', value: 'Amazon' },
    ],
    actions: [{ targetField: 'account', value: 'Amazon ICICI CC' }],
    priority: 4,
    enabled: true,
    locked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'rule_capex_flipkart',
    name: 'Flipkart CAPEX → Axis Flipkart CC',
    conditions: [
      { field: 'transactionType', operator: 'equals', value: 'CAPEX' },
      { field: 'purchasedFrom', operator: 'equals', value: 'Flipkart' },
    ],
    actions: [{ targetField: 'account', value: 'Flipkart Axis CC' }],
    priority: 5,
    enabled: true,
    locked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'rule_capex_myntra',
    name: 'Myntra CAPEX → Axis Flipkart CC',
    conditions: [
      { field: 'transactionType', operator: 'equals', value: 'CAPEX' },
      { field: 'purchasedFrom', operator: 'equals', value: 'Myntra' },
    ],
    actions: [{ targetField: 'account', value: 'Flipkart Axis CC' }],
    priority: 6,
    enabled: true,
    locked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'rule_entertainment_cc',
    name: 'Entertainment/Internet → SBI PhonePe CC',
    conditions: [{ field: 'majorCategory', operator: 'equals', value: 'Entertainment/Internet' }],
    actions: [
      { targetField: 'paymentMode', value: 'CC' },
      { targetField: 'account', value: 'SBI PhonePe CC' },
    ],
    priority: 7,
    enabled: true,
    locked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'rule_default_rev_exp_source',
    name: 'Default Revenue Expense → HDFC Savings A/c',
    conditions: [{ field: 'transactionType', operator: 'equals', value: 'Revenue Expense' }],
    actions: [{ targetField: 'account', value: 'HDFC Savings A/c' }],
    priority: 8,
    enabled: true,
    locked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export function getDefaultData(): AppData {
  return {
    schemaVersion: 3,
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
    people: [...DEFAULT_PEOPLE],
    capexPurchasedFrom: [...DEFAULT_CAPEX_PURCHASED_FROM],
    toGharPaymentFor: [...DEFAULT_TO_GHAR_PAYMENT_FOR],
    incomeTypes: [...DEFAULT_INCOME_TYPES],
    investmentTypes: [...DEFAULT_INVESTMENT_TYPES],
    customFields: [...DEFAULT_CUSTOM_FIELDS],
    formFields: DEFAULT_FORM_FIELDS.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
    recurringFormFields: DEFAULT_RECURRING_FORM_FIELDS.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
    rules: DEFAULT_RULES.map((r) => ({
      ...r,
      conditions: r.conditions.map((c) => ({ ...c })),
      actions: r.actions.map((a) => ({ ...a })),
    })),
    actionLog: [
      {
        id: 'init_log',
        timestamp: Date.now(),
        actionType: 'initialize',
        entityType: 'system',
        description: 'Personal Finance Tracker system initialized',
      },
    ],
    paymentModeSources: { ...DEFAULT_PAYMENT_MODE_SOURCES },
    learningEnabled: true,
  };
}
