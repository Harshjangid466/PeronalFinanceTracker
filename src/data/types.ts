import {financialEffect} from './model';
import type { MasterItem } from './model';
import type { BankAlert } from './alerts';
import type {ImportHabits,StatementRow,StatementBatch} from './statements';

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
  personalExpense: number; // integer paise
  income: number;
  receivableIncrease: number;
  receivableDecrease: number;
  capex: number;
  investment: number;
  toGhar?: number;
}

export function deriveFinancialEffect(type: TransactionType, amount: number): FinancialEffect { return financialEffect(normalizeTransactionType(type),Math.round(amount*100)); }

export interface Transaction {
  statementReferences?:string[];
  id: string;
  customFieldIds?:Record<string,string>; customOptionIds?:Record<string,string[]>;
  sourceId?: string; paymentModeId?: string; majorCategoryId?: string; subCategoryId?: string; personId?: string; merchantId?: string; purposeId?: string; incomeTypeId?: string; investmentTypeId?: string;
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
  status: 'active' | 'cancelled' | 'deleted';
  deletedAt?: number;
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
  person?:string; purchasedFrom?:string; paymentFor?:string; incomeType?:string; investmentType?:string;
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
  status?: 'Scheduled' | 'Posted' | 'Skipped' | 'Paused' | 'Cancelled' | 'Completed';
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
  active?: boolean;
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

// -------------------------------------------------------------
// ACTION LOG / AUDIT LOG (Section 17)
// -------------------------------------------------------------
export interface ActionLogRecord {
  id: string;
  timestamp: number;
  actionType: string;
  entityType: string;
  entityId?: string;
  description: string;
  beforeValue?: any;
  afterValue?: any;
}

// -------------------------------------------------------------
// RULES & LOGIC ENGINE (Section 19, 20, 21)
// -------------------------------------------------------------
export type RuleConditionField =
  | 'transactionType'
  | 'majorCategory'
  | 'subCategory'
  | 'paymentMode'
  | 'account'
  | 'person'
  | 'purchasedFrom'
  | 'paymentFor'
  | 'incomeType'
  | 'investmentType'
  | string;

export interface RuleCondition {
  field: RuleConditionField;
  operator: 'equals' | 'notEquals' | 'contains';
  value: string;
  valueId?: string;
}

export type RuleActionField =
  | 'account'
  | 'paymentMode'
  | 'majorCategory'
  | 'subCategory'
  | string;

export interface RuleAction {
  targetField: RuleActionField;
  value: string;
  valueId?: string;
}

export interface RuleDefinition {
  id: string;
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number; // lower number = higher priority (1 is highest)
  enabled: boolean;
  locked: boolean; // locked user rules have highest priority
  isLearned?: boolean;
  userEdited?: boolean;
  createdAt: number;
  updatedAt: number;
}

// -------------------------------------------------------------
// DEPENDENCY CHECK RESULT (Section 14, 15, 16)
// -------------------------------------------------------------
export interface DependencyCheckResult {
  itemType: string;
  itemName: string;
  historicalTransactionsCount: number;
  paymentModeMappings: string[];
  referencingRules: RuleDefinition[];
  recurringTemplatesCount: number;
  summary: string;
}

export interface AppData {
  monthlyIncomeMinor?:Record<string,number>;
  importHabits?:ImportHabits;
  statementRows?:StatementRow[];
  statementBatches?:StatementBatch[];
  bankAlerts?: BankAlert[];
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
  // Extended configuration & audit
  rules: RuleDefinition[];
  actionLog: ActionLogRecord[];
  paymentModeSources: Record<string, string[]>;
  deactivatedAccounts?: string[];
  deactivatedPaymentModes?: string[];
  deactivatedCategories?: string[];
  deactivatedPeople?: string[];
  learningEnabled?: boolean;
  masters?: MasterItem[];
  sourceMappings?: Record<string,string[]>;
  suppressedPatterns?: string[];
  skippedOccurrences?: string[];
}
