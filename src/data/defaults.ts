import {canonicalSources,canonicalModes} from './model';
import type { AppData, CategoryDef, FieldConfig, CustomFieldDefinition, RuleDefinition } from './types';
export const DEFAULT_QUICK_AMOUNTS = [50, 100, 200, 500, 1000];
export const DEFAULT_CATEGORIES: CategoryDef[] = [{"name": "Food", "subCategories": ["Breakfast", "Lunch", "Dinner", "Snacks", "Tea/Coffee", "Groceries"]}, {"name": "Commute", "subCategories": ["Metro", "Bus", "Auto", "Cab", "Train", "Parking/Tolls"]}, {"name": "Fuel", "subCategories": ["Petrol", "Diesel", "CNG", "EV Charging"]}, {"name": "Housing", "subCategories": ["Rent", "Maintenance", "Domestic Help", "Repairs"]}, {"name": "Bills & Utilities", "subCategories": ["Electricity", "Water", "Gas", "Mobile"]}, {"name": "Entertainment/Internet", "subCategories": ["Broadband", "OTT", "Movies", "Gaming", "Events"]}, {"name": "Travel/Trip", "subCategories": ["Transport", "Accommodation", "Food", "Sightseeing"]}, {"name": "Shopping", "subCategories": ["Clothing", "Electronics", "Household", "Books"]}, {"name": "Health", "subCategories": ["Consultation", "Medicines", "Tests", "Fitness"]}, {"name": "Personal", "subCategories": ["Grooming", "Personal Care"]}, {"name": "Insurance & Taxes", "subCategories": ["Health Insurance", "Vehicle Insurance", "Other Insurance", "Taxes"]}, {"name": "Miscellaneous", "subCategories": ["General", "One-off", "Other"]}];
export const DEFAULT_PEOPLE: string[] = [];
export const DEFAULT_CAPEX_PURCHASED_FROM: string[] = [];
export const DEFAULT_TO_GHAR_PAYMENT_FOR = ["Family Support", "Groceries", "Bills", "Health", "Other"];
export const DEFAULT_INCOME_TYPES = ["Salary", "Freelance", "Interest", "Dividend", "Cashback/Reward", "Gift", "Tax Refund", "Other"];
export const DEFAULT_INVESTMENT_TYPES = ["Mutual Funds", "Stocks", "FD/RD", "PPF", "NPS", "EPF", "Gold", "Other"];
export const DEFAULT_ACCOUNTS = [...canonicalSources];
export const DEFAULT_PAYMENT_MODES = [...canonicalModes];
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

export const DEFAULT_PAYMENT_MODE_SOURCES: Record<string,string[]> = {Cash:['Cash']};
export const DEFAULT_RULES: RuleDefinition[] = [{id:'rule_default_cash',name:'Cash payment uses Cash account',conditions:[{field:'paymentMode',operator:'equals',value:'Cash'}],actions:[{targetField:'account',value:'Cash'}],priority:1,enabled:true,locked:false,createdAt:0,updatedAt:0}];
export function getDefaultData(): AppData {
  return {
    schemaVersion: 4,
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
    learningEnabled: false,
  };
}
