import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { isPersonalExpense, TRANSACTION_TYPES } from '@/data/types';
import { formatCurrency, formatDate, todayISO } from '@/data/format';
import { Search, SlidersHorizontal, X, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/Sheet';

export function TransactionsScreen() {
  const { data, deleteTransaction } = useApp();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    majorCategory: '',
    account: '',
    paymentMode: '',
    dateFrom: '',
    dateTo: '',
  });

  const filtered = useMemo(() => {
    return data.transactions.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        const text = `${t.majorCategory} ${t.subCategory} ${t.person} ${t.remarks} ${t.type} ${t.account}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (filters.type && t.type !== filters.type) return false;
      if (filters.majorCategory && t.majorCategory !== filters.majorCategory) return false;
      if (filters.account && t.account !== filters.account) return false;
      if (filters.paymentMode && t.paymentMode !== filters.paymentMode) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      return true;
    });
  }, [data.transactions, search, filters]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  function clearFilters() {
    setFilters({ type: '', majorCategory: '', account: '', paymentMode: '', dateFrom: '', dateTo: '' });
  }

  return (
    <div className="px-4 pt-6 pb-24 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Transactions</h1>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className="relative px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
        >
          <SlidersHorizontal size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">
          {data.transactions.length === 0 ? 'No transactions yet.' : 'No matching transactions.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {t.majorCategory || t.type}
                  {t.subCategory ? ` · ${t.subCategory}` : ''}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatDate(t.date)} · {t.type}
                  {t.account ? ` · ${t.account}` : ''}
                  {t.person ? ` · ${t.person}` : ''}
                </p>
                {t.remarks && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{t.remarks}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span
                  className={`text-sm font-semibold ${
                    isPersonalExpense(t.type)
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isPersonalExpense(t.type) ? '-' : '+'}
                  {formatCurrency(t.amount)}
                </span>
                <button
                  onClick={() => deleteTransaction(t.id)}
                  className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters sheet */}
      <Sheet open={showFilters} onClose={() => setShowFilters(false)} title="Filters">
        <div className="space-y-4">
          <FilterSelect label="Transaction Type" value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} options={TRANSACTION_TYPES} />
          <FilterSelect label="Category" value={filters.majorCategory} onChange={(v) => setFilters({ ...filters, majorCategory: v })} options={data.categories.map((c) => c.name)} />
          <FilterSelect label="Account" value={filters.account} onChange={(v) => setFilters({ ...filters, account: v })} options={data.accounts} />
          <FilterSelect label="Payment Mode" value={filters.paymentMode} onChange={(v) => setFilters({ ...filters, paymentMode: v })} options={data.paymentModes} />
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Date From</label>
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Date To</label>
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-sm flex items-center justify-center gap-1.5">
              <X size={16} /> Clear all filters
            </button>
          )}
        </div>
      </Sheet>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
