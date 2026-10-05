import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { Transaction, TransactionType } from '@/data/types';
import { normalizeTransactionType } from '@/data/types';
import {
  formatCurrency,
  formatDateShort,
  todayISO,
  getMonthStart,
  getPreviousMonthStart,
  getYearStart,
  addMonths,
} from '@/data/format';
import {
  Receipt,
  Users,
  Building,
  Home,
  Briefcase,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  PieChart,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { TransactionForm } from '@/components/TransactionForm';
import { CategoryDrillDownModal } from '@/components/CategoryDrillDownModal';
import { PersonLedgerModal } from '@/components/PersonLedgerModal';

type NavTarget = 'home' | 'transactions' | 'add' | 'recover' | 'settings' | 'recurring';
type PeriodOption = 'current_month' | 'previous_month' | 'year' | 'all' | 'custom';

export function HomeScreen({ onNavigate }: { onNavigate: (tab: NavTarget) => void }) {
  const {
    data,
    computeMetrics,
    getBudgetGuidance,
    getSmallExpensesInsight,
    getAllPersonLedgers,
  } = useApp();

  // Period Selector State
  const [period, setPeriod] = useState<PeriodOption>('current_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Modals state
  const [activeFormType, setActiveFormType] = useState<TransactionType | null>(null);
  const [drillDownCategory, setDrillDownCategory] = useState<TransactionType | null>(null);
  const [ledgerPerson, setLedgerPerson] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Compute period transactions
  const periodTransactions = useMemo(() => {
    const today = todayISO();
    let fromDate = '';
    let toDate = '';

    if (period === 'current_month') {
      fromDate = getMonthStart(today);
      toDate = today;
    } else if (period === 'previous_month') {
      fromDate = getPreviousMonthStart(today);
      const nextMonthFirst = getMonthStart(today);
      toDate = nextMonthFirst;
    } else if (period === 'year') {
      fromDate = getYearStart(today);
      toDate = today;
    } else if (period === 'custom') {
      fromDate = customFrom;
      toDate = customTo;
    }

    return data.transactions.filter((t) => {
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      return true;
    });
  }, [data.transactions, period, customFrom, customTo]);

  // Derived metrics from transaction engine
  const metrics = useMemo(() => computeMetrics(periodTransactions), [computeMetrics, periodTransactions]);

  // Spending habits: Month-on-month comparison (Section S)
  const momComparison = useMemo(() => {
    const today = todayISO();
    const curMonthKey = today.slice(0, 7);
    const prevMonthKey = addMonths(today.slice(0, 7) + '-01', -1).slice(0, 7);

    const curSpend = data.transactions
      .filter((t) => t.date.slice(0, 7) === curMonthKey && normalizeTransactionType(t.type) === 'Revenue Expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const prevSpend = data.transactions
      .filter((t) => t.date.slice(0, 7) === prevMonthKey && normalizeTransactionType(t.type) === 'Revenue Expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const diff = curSpend - prevSpend;
    const pct = prevSpend > 0 ? (diff / prevSpend) * 100 : 0;

    return { curSpend, prevSpend, diff, pct };
  }, [data.transactions]);

  // Historical budget guidance (Section T)
  const budgetGuidance = useMemo(() => getBudgetGuidance(), [getBudgetGuidance]);
  const budgetAlerts = useMemo(() => budgetGuidance.filter((b) => b.warning), [budgetGuidance]);

  // Repeated small expenses insight (Section P & S)
  const smallExpenses = useMemo(() => getSmallExpensesInsight(100), [getSmallExpensesInsight]);

  // All person ledgers for who owes me
  const allLedgers = useMemo(() => getAllPersonLedgers(), [getAllPersonLedgers]);
  const peopleWhoOweMe = useMemo(() => allLedgers.filter((l) => l.netBalance > 0), [allLedgers]);
  const peopleIOwe = useMemo(() => allLedgers.filter((l) => l.netBalance < 0), [allLedgers]);

  // Large function buttons configuration (Section B)
  const functionButtons = [
    {
      type: 'Revenue Expense' as TransactionType,
      label: 'Revenue Expense',
      description: 'Daily living & personal expenses',
      icon: Receipt,
      colorClass: 'from-cyan-600 to-teal-600',
      badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    },
    {
      type: 'Lent' as TransactionType,
      label: 'Lent',
      description: 'Money given to someone',
      icon: ArrowUpRight,
      colorClass: 'from-indigo-600 to-blue-600',
      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    },
    {
      type: 'Lent Recovered' as TransactionType,
      label: 'Lent Recovered',
      description: 'Money received back',
      icon: ArrowDownLeft,
      colorClass: 'from-emerald-600 to-teal-700',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    {
      type: 'CAPEX' as TransactionType,
      label: 'CAPEX',
      description: 'Capital asset purchases',
      icon: Building,
      colorClass: 'from-purple-600 to-violet-700',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    },
    {
      type: 'To Ghar' as TransactionType,
      label: 'To Ghar',
      description: 'Transfers/purchases for home',
      icon: Home,
      colorClass: 'from-amber-600 to-orange-600',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    },
    {
      type: 'Income Misc' as TransactionType,
      label: 'Income Misc',
      description: 'Salary, freelance, refunds',
      icon: Briefcase,
      colorClass: 'from-teal-600 to-emerald-600',
      badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    },
    {
      type: 'Investment' as TransactionType,
      label: 'Investment',
      description: 'Stocks, MF, FD, books',
      icon: TrendingUp,
      colorClass: 'from-blue-600 to-sky-700',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    },
  ];

  return (
    <div className="px-4 pt-6 pb-28 space-y-5 max-w-md mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Finance Tracker</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Personal Wealth & Allocations</p>
        </div>
        <button
          onClick={() => onNavigate('recover')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 text-xs font-semibold"
        >
          <Users size={14} />
          <span>Ledgers</span>
        </button>
      </div>

      {/* SECTION B: 7 LARGE FUNCTION BUTTONS */}
      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quick Log by Type
          </span>
          <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">Select type to enter</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {functionButtons.map((btn, index) => {
            const Icon = btn.icon;
            const isFullWidth = index === 0; // First button (Revenue Expense) spans full width
            return (
              <button
                key={btn.type}
                onClick={() => setActiveFormType(btn.type)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all hover:border-cyan-500 text-left ${
                  isFullWidth ? 'col-span-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white border-transparent' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isFullWidth
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-bold truncate ${
                      isFullWidth ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {btn.label}
                  </p>
                  <p
                    className={`text-[11px] truncate ${
                      isFullWidth ? 'text-cyan-100' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {btn.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION R: UNIFIED DASHBOARD */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        {/* Period Selector (Section R) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <PieChart size={16} className="text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-sm font-bold">Unified Dashboard</h2>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'current_month', label: 'Current Month' },
              { id: 'previous_month', label: 'Previous Month' },
              { id: 'year', label: 'Year' },
              { id: 'all', label: 'All-Time' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as PeriodOption)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  period === p.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION R1: MAJOR OUTFLOW / ALLOCATION VIEW */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Outflow / Allocation
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {formatCurrency(metrics.totalOutflow)}
            </span>
          </div>

          {/* Allocation Outflow Items (Clickable Drilldowns: R3) */}
          <div className="space-y-1.5">
            {[
              {
                type: 'Revenue Expense' as TransactionType,
                label: 'Revenue Expense',
                amount: metrics.revenueExpense,
                pct: metrics.outflowPercentages.revenueExpense,
                color: 'bg-cyan-500',
              },
              {
                type: 'Lent' as TransactionType,
                label: 'Lent (Receivables)',
                amount: metrics.lent,
                pct: metrics.outflowPercentages.lent,
                color: 'bg-indigo-500',
              },
              {
                type: 'CAPEX' as TransactionType,
                label: 'CAPEX',
                amount: metrics.capex,
                pct: metrics.outflowPercentages.capex,
                color: 'bg-purple-500',
              },
              {
                type: 'To Ghar' as TransactionType,
                label: 'To Ghar',
                amount: metrics.toGhar,
                pct: metrics.outflowPercentages.toGhar,
                color: 'bg-amber-500',
              },
              {
                type: 'Investment' as TransactionType,
                label: 'Investment',
                amount: metrics.investment,
                pct: metrics.outflowPercentages.investment,
                color: 'bg-blue-500',
              },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => setDrillDownCategory(item.type)}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 hover:border-cyan-500 transition-colors"
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <span className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="font-semibold text-slate-500 w-10 text-right">
                      {item.pct.toFixed(0)}%
                    </span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </div>
                {/* Progress Visual */}
                <div className="mt-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION R2: INFLOW VIEW (SEPARATE FROM OUTFLOW) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Inflow
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(metrics.totalInflow)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDrillDownCategory('Lent Recovered')}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 hover:border-emerald-500 transition-colors text-left"
            >
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Lent Recovered</span>
                <span className="text-emerald-600 font-bold">{metrics.inflowPercentages.lentRecovered.toFixed(0)}%</span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(metrics.lentRecovered)}
              </p>
            </button>

            <button
              onClick={() => setDrillDownCategory('Income Misc')}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 hover:border-emerald-500 transition-colors text-left"
            >
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Income Misc</span>
                <span className="text-emerald-600 font-bold">{metrics.inflowPercentages.incomeMisc.toFixed(0)}%</span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(metrics.incomeMisc)}
              </p>
            </button>
          </div>
        </div>

        {/* RECEIVABLES SUMMARY (Who owes me & Whom I owe: R5) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Receivables (Who owes you)</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metrics.netReceivables)}
            </p>
          </div>
          <button
            onClick={() => onNavigate('recover')}
            className="flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400"
          >
            <span>View All ({peopleWhoOweMe.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* SECTION S & T: SPENDING ANALYSIS & HISTORICAL BUDGET */}
      <div className="space-y-3">
        {/* Month-on-month comparison */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Month-on-Month Expense</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(momComparison.curSpend)}
              </span>
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                  momComparison.diff > 0
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                    : momComparison.diff < 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {momComparison.diff >= 0 ? '+' : ''}
                {momComparison.pct.toFixed(0)}% vs last month
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <span>Last month: {formatCurrency(momComparison.prevSpend)}</span>
          </div>
        </div>

        {/* Small expenses cumulative insight badge (Section P & S) */}
        {smallExpenses.count >= 2 && (
          <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-800 rounded-2xl p-3 flex items-start gap-2.5">
            <Sparkles size={16} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-cyan-900 dark:text-cyan-200">Small Expense Impact</p>
              <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-0.5">
                {smallExpenses.description}. Small recurring expenses add up significantly!
              </p>
            </div>
          </div>
        )}

        {/* Historical Budget Guidance alerts (Section T) */}
        {budgetAlerts.length > 0 && (
          <div className="space-y-1.5">
            {budgetAlerts.slice(0, 2).map((b) => (
              <div
                key={b.category}
                className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300"
              >
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <p className="font-bold">{b.category} Budget Alert</p>
                  <p className="mt-0.5">{b.warning}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT TRANSACTIONS (with Edit / Delete) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent Transactions</h2>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5"
          >
            <span>View all</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {data.transactions.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-2">No transactions recorded yet.</p>
            <button
              onClick={() => setActiveFormType('Revenue Expense')}
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400"
            >
              Add your first transaction
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {data.transactions.slice(0, 6).map((t) => (
              <div
                key={t.id}
                onClick={() => setEditingTransaction(t)}
                className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {t.majorCategory || t.type}
                    {t.subCategory ? ` · ${t.subCategory}` : ''}
                    {t.person ? ` · ${t.person}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatDateShort(t.date)} · {t.type} · {t.account || t.paymentMode}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span
                    className={`text-xs font-bold ${
                      normalizeTransactionType(t.type) === 'Revenue Expense'
                        ? 'text-rose-600 dark:text-rose-400'
                        : normalizeTransactionType(t.type) === 'Income Misc' ||
                          normalizeTransactionType(t.type) === 'Lent Recovered'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {normalizeTransactionType(t.type) === 'Revenue Expense'
                      ? '-'
                      : normalizeTransactionType(t.type) === 'Income Misc' ||
                        normalizeTransactionType(t.type) === 'Lent Recovered'
                      ? '+'
                      : ''}
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: ADD TRANSACTION FOR SELECTED FUNCTION BUTTON */}
      <Sheet
        open={Boolean(activeFormType)}
        onClose={() => setActiveFormType(null)}
        title={`New ${activeFormType || ''}`}
      >
        {activeFormType && (
          <TransactionForm
            initialType={activeFormType}
            isModal={true}
            onSuccess={() => setActiveFormType(null)}
            onClose={() => setActiveFormType(null)}
          />
        )}
      </Sheet>

      {/* MODAL 2: CATEGORY DRILL-DOWN MODAL */}
      <CategoryDrillDownModal
        open={Boolean(drillDownCategory)}
        onClose={() => setDrillDownCategory(null)}
        categoryType={drillDownCategory}
        periodTransactions={periodTransactions}
        onEditTransaction={(txn) => {
          setDrillDownCategory(null);
          setEditingTransaction(txn);
        }}
        onOpenLedger={(personName) => {
          setDrillDownCategory(null);
          setLedgerPerson(personName);
        }}
      />

      {/* MODAL 3: PERSON UNIFIED LEDGER MODAL */}
      <PersonLedgerModal
        person={ledgerPerson}
        onClose={() => setLedgerPerson(null)}
        onLendMore={(p) => {
          setLedgerPerson(null);
          setActiveFormType('Lent');
        }}
        onRecordRecovery={(p) => {
          setLedgerPerson(null);
          setActiveFormType('Lent Recovered');
        }}
        onEditTransaction={(txn) => {
          setLedgerPerson(null);
          setEditingTransaction(txn);
        }}
      />

      {/* MODAL 4: EDIT TRANSACTION MODAL */}
      <Sheet
        open={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
        title={`Edit ${editingTransaction?.type || 'Transaction'}`}
      >
        {editingTransaction && (
          <TransactionForm
            editTransaction={editingTransaction}
            isModal={true}
            onSuccess={() => setEditingTransaction(null)}
            onClose={() => setEditingTransaction(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
