import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { isPersonalExpense, CORE_TRANSACTION_TYPES, normalizeTransactionType } from '@/data/types';
import type { Transaction, TransactionType } from '@/data/types';
import { formatCurrency, formatDate, todayISO } from '@/data/format';
import { Search, SlidersHorizontal, X, Trash2, Edit2, Download, Printer, FileText } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import {searchableText} from '@/data/model';
import {ExportReport,ImportExpenses} from '@/components/ReportTools';
import { TransactionForm } from '@/components/TransactionForm';
import {AlertInbox} from '@/components/AlertInbox';

export function TransactionsScreen() {
  const { data, deleteTransaction, deletedTransactions, restoreTransaction } = useApp();
  const [showDeleted,setShowDeleted]=useState(false);
  const [showAlerts,setShowAlerts]=useState(false);
  const [showExport,setShowExport]=useState(false);
  const [showImport,setShowImport]=useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    type: '',
    majorCategory: '',
    subCategory: '',
    person: '',
    account: '',
    paymentMode: '',
    dateFrom: '',
    dateTo: '',
  });

  // Universal Search across ALL fields + Custom fields (Section Q & AB)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return data.transactions.filter((t) => {
      if (q) {
        // Include all present and future transaction fields and linked recurring details.
        const recurring=data.recurring.find(r=>r.id===t.recurringTemplateId);
        const searchable=searchableText({...t,recurring}).toLowerCase();

        if (!searchable.includes(q)) return false;
      }

      if (filters.type && normalizeTransactionType(t.type) !== normalizeTransactionType(filters.type)) return false;
      if (filters.majorCategory && t.majorCategory !== filters.majorCategory) return false;
      if (filters.subCategory && t.subCategory !== filters.subCategory) return false;
      if (filters.person && t.person !== filters.person) return false;
      if (filters.account && t.account !== filters.account) return false;
      if (filters.paymentMode && t.paymentMode !== filters.paymentMode) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;

      return true;
    });
  }, [data.transactions, search, filters]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  function clearFilters() {
    setFilters({
      type: '',
      majorCategory: '',
      subCategory: '',
      person: '',
      account: '',
      paymentMode: '',
      dateFrom: '',
      dateTo: '',
    });
  }

  // Export CSV Report (Section Y)
  function handleExportCSV() {
    setShowExport(true);
  }

  function handlePrint() {
    window.print();
  }

  function confirmDelete(id: string) {
    deleteTransaction(id);
    setDeleteConfirmId(null);
  }

  const totalFilteredAmount = useMemo(() => {
    return filtered.reduce((sum, t) => sum + t.amount, 0);
  }, [filtered]);

  return (
    <div className="px-4 pt-6 pb-28 max-w-md mx-auto print:max-w-none print:p-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Transactions</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filtered.length} found · Total {formatCurrency(totalFilteredAmount)}
          </p>
        </div>

        {/* Export / Print Actions (Section Y) */}
        <div className="flex items-center gap-1.5 print:hidden">
          <button
            onClick={handleExportCSV}
            title="Export CSV"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-600 transition-colors"
          >
            <Download size={18} />
          </button>
          <button
            onClick={handlePrint}
            title="Print Report"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-600 transition-colors"
          >
            <Printer size={18} />
          </button>
        </div>
      </div>

      {/* Universal Search (Section Q & AB) */}
      <div className="flex gap-2 mb-3 print:hidden">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all fields, amounts, remarks, custom..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
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

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3 print:hidden">
          {Object.entries(filters).map(([k, v]) => {
            if (!v) return null;
            return (
              <span
                key={k}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 text-xs font-medium"
              >
                <span>{k}: {v}</span>
                <button
                  onClick={() => setFilters({ ...filters, [k]: '' })}
                  className="hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
          <button
            onClick={clearFilters}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline px-1"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3 text-xs"><button className="px-3 py-2 rounded-xl bg-cyan-600 text-white" onClick={()=>setShowImport(true)}>Upload expenses</button><button className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700" onClick={()=>setShowDeleted(true)}>Deleted Transactions ({deletedTransactions.length})</button><button className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700" onClick={()=>setShowExport(true)}>Reports / Export</button></div>
      <button className="w-full mb-3 p-3 rounded-xl bg-cyan-600 text-white font-semibold" onClick={()=>setShowAlerts(true)}>Check bank messages / Alert inbox</button>
      <Sheet open={showAlerts} onClose={()=>setShowAlerts(false)} title="Bank messages · Review before posting"><AlertInbox /></Sheet>
      <Sheet open={showExport} onClose={()=>setShowExport(false)} title="Reports & Export"><ExportReport /></Sheet>
      <Sheet open={showImport} onClose={()=>setShowImport(false)} title="Upload Expenses"><ImportExpenses /></Sheet>
      <Sheet open={showDeleted} onClose={()=>setShowDeleted(false)} title="Deleted Transactions">{deletedTransactions.length===0?<p>No deleted transactions.</p>:deletedTransactions.map(t=><div key={t.id} className="border p-3 rounded-xl mb-2 text-xs"><b>{t.heading||t.type} · {formatCurrency(t.amount)}</b><p>{t.date} · {t.type} · {t.majorCategory} · {t.person}</p><p>Deleted: {t.deletedAt?new Date(t.deletedAt).toLocaleString('en-IN'):'Unknown'}</p><button className="bg-cyan-600 text-white rounded-xl p-2 mt-2" onClick={()=>restoreTransaction(t.id)}>Restore</button></div>)}</Sheet>
      {/* Transaction List */}
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">
          {data.transactions.length === 0 ? 'No transactions yet.' : 'No matching transactions found.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const normType = normalizeTransactionType(t.type);
            const isExp = normType === 'Revenue Expense';
            const isLent = normType === 'Lent';
            const isRec = normType === 'Lent Recovered';
            const isInc = normType === 'Income Misc';

            return (
              <div
                key={t.id}
                className="flex items-start justify-between bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 hover:border-cyan-500 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isExp
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                          : isLent
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : isRec
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : isInc
                          ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300'
                          : 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                      }`}
                    >
                      {t.type}
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 break-words">
                      {t.heading || t.majorCategory || t.type}
                      {t.subCategory ? ` · ${t.subCategory}` : ''}
                      {t.person ? ` · ${t.person}` : ''}
                      {t.purchasedFrom ? ` · ${t.purchasedFrom}` : ''}
                      {t.paymentFor ? ` · ${t.paymentFor}` : ''}
                      {t.incomeType ? ` · ${t.incomeType}` : ''}
                      {t.investmentType ? ` · ${t.investmentType}` : ''}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {formatDate(t.date)}
                    {t.account ? ` · ${t.account}` : ''}
                    {t.paymentMode ? ` · ${t.paymentMode}` : ''}
                  </p>

                  {t.remarks && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 whitespace-pre-wrap break-words">
                      {t.remarks}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end shrink-0 ml-3">
                  <span
                    className={`text-sm font-extrabold ${
                      isExp
                        ? 'text-rose-600 dark:text-rose-400'
                        : isInc || isRec
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {isExp ? '-' : isInc || isRec ? '+' : ''}
                    {formatCurrency(t.amount)}
                  </span>

                  {/* EDIT & DELETE ACTIONS (Section O) */}
                  <div className="flex items-center gap-1 mt-1 print:hidden">
                    <button
                      onClick={() => setEditingTransaction(t)}
                      className="p-1 text-slate-400 hover:text-cyan-600 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(t.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters Sheet */}
      <Sheet open={showFilters} onClose={() => setShowFilters(false)} title="Filter Transactions">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Transaction Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-sm"
            >
              <option value="">All Types</option>
              {CORE_TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Category
            </label>
            <select
              value={filters.majorCategory}
              onChange={(e) => setFilters({ ...filters, majorCategory: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-sm"
            >
              <option value="">All Categories</option>
              {data.categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Person
            </label>
            <select
              value={filters.person}
              onChange={(e) => setFilters({ ...filters, person: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-sm"
            >
              <option value="">All People</option>
              {data.people.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Source / Account
            </label>
            <select
              value={filters.account}
              onChange={(e) => setFilters({ ...filters, account: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-sm"
            >
              <option value="">All Sources</option>
              {data.accounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Mode
            </label>
            <select
              value={filters.paymentMode}
              onChange={(e) => setFilters({ ...filters, paymentMode: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-sm"
            >
              <option value="">All Payment Modes</option>
              {data.paymentModes.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={() => setShowFilters(false)}
              className="flex-1 py-2.5 rounded-xl bg-cyan-600 text-white font-semibold text-xs active:scale-95"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Reset
            </button>
          </div>
        </div>
      </Sheet>

      {/* EDIT MODAL (Section O) */}
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

      {/* DELETE CONFIRMATION MODAL (Section O) */}
      <Sheet
        open={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete this transaction? You can restore it from Deleted Transactions. All dashboard totals, receivable balances, and historical metrics will automatically recalculate.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => deleteConfirmId && confirmDelete(deleteConfirmId)}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm active:scale-95 transition-transform"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
