import { useApp } from '@/context/AppContext';
import { isPersonalExpense } from '@/data/types';
import { formatCurrency, isSameDay, isSameMonth, formatDateShort, daysFromToday, todayISO } from '@/data/format';
import { TrendingUp, Calendar, Users, Receipt } from 'lucide-react';
type NavTarget = 'home' | 'transactions' | 'add' | 'recover' | 'settings' | 'recurring';

export function HomeScreen({ onNavigate }: { onNavigate: (tab: NavTarget) => void }) {
  const { data, getReceivableOutstanding } = useApp();

  const todayExpense = data.transactions
    .filter((t) => isPersonalExpense(t.type) && isSameDay(t.date))
    .reduce((sum, t) => sum + t.amount, 0);

  const monthExpense = data.transactions
    .filter((t) => isPersonalExpense(t.type) && isSameMonth(t.date))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalToRecover = data.receivables.reduce(
    (sum, r) => sum + Math.max(0, getReceivableOutstanding(r.id)),
    0
  );

  const upcomingRecurring = data.recurring
    .filter((r) => {
      const days = daysFromToday(r.nextDueDate);
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .slice(0, 5);

  const recentTransactions = data.transactions.slice(0, 8);

  return (
    <div className="px-4 pt-6 pb-24 space-y-5 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Finance</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <Receipt size={16} />
            <span className="text-xs font-medium">Today</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(todayExpense)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs font-medium">This Month</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(monthExpense)}</p>
        </div>
      </div>

      {/* Recover card */}
      <button
        onClick={() => onNavigate('recover')}
        className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-50">
            <Users size={18} />
            <span className="text-sm font-medium">To Recover</span>
          </div>
          <span className="text-2xl font-bold text-white">{formatCurrency(totalToRecover)}</span>
        </div>
      </button>

      {/* Upcoming recurring */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-500 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upcoming Payments</h2>
          </div>
          <button
            onClick={() => onNavigate('recurring')}
            className="text-xs font-medium text-cyan-600 dark:text-cyan-400"
          >
            Manage
          </button>
        </div>
        {upcomingRecurring.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 px-1">No upcoming recurring payments this week.</p>
        ) : (
          <div className="space-y-2">
            {upcomingRecurring.map((r) => {
              const days = daysFromToday(r.nextDueDate);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`} · {formatDateShort(r.nextDueDate)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(r.amount)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Transactions</h2>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-medium text-cyan-600 dark:text-cyan-400"
          >
            View all
          </button>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">No transactions yet.</p>
            <button
              onClick={() => onNavigate('add')}
              className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 dark:text-cyan-400"
            >
              Add your first expense
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {t.majorCategory || t.type}
                    {t.subCategory ? ` · ${t.subCategory}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateShort(t.date)} · {t.type}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold shrink-0 ml-2 ${
                    isPersonalExpense(t.type)
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isPersonalExpense(t.type) ? '-' : '+'}
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400 dark:text-slate-600 pt-2">
        {todayISO()}
      </p>
    </div>
  );
}
