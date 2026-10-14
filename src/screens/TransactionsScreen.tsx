import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
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
const StatementWorkspace=lazy(()=>import('@/components/StatementWorkspace').then(m=>({default:m.StatementWorkspace})));

export function TransactionsScreen() {
  const { data, deleteTransaction, deletedTransactions, restoreTransaction } = useApp();
  const [visibleCount,setVisibleCount]=useState(100);
  const [showDeleted,setShowDeleted]=useState(false);
  const [showStatements,setShowStatements]=useState(false);
  const [showTools,setShowTools]=useState(false);
  const [selected,setSelected]=useState<Transaction|null>(null);
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
    }).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt||a.id.localeCompare(b.id));
  }, [data.transactions, data.recurring, search, filters]);

  useEffect(()=>setVisibleCount(100),[search,filters]);
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
    setVisibleCount(filtered.length);
    requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));
  }

  function confirmDelete(id: string) {
    deleteTransaction(id);
    setDeleteConfirmId(null);
  }

  const totalFilteredAmount = useMemo(() => {
    return filtered.reduce((sum, t) => sum + t.amountMinor, 0)/100;
  }, [filtered]);

  return (
    <div className="px-4 pt-6 pb-28 max-w-3xl mx-auto print:max-w-none print:p-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Transactions</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filtered.length} found · Total {formatCurrency(totalFilteredAmount)}
          </p>
        </div>

        <button aria-label="Transaction tools" onClick={()=>setShowTools(true)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm print:hidden">Tools</button>
      </div>

      {/* Universal Search (Section Q & AB) */}
      <div className="flex gap-2 mb-3 print:hidden">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions"
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
          aria-label="Filter transactions"
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

      <button className="w-full mb-4 p-3 rounded-xl bg-cyan-600 text-white font-semibold print:hidden" onClick={()=>setShowStatements(true)}>Import statements & review</button>
      <Sheet wide open={showStatements} onClose={()=>setShowStatements(false)} title="Statements & reconciliation"><Suspense fallback={<p>Opening statement review…</p>}><StatementWorkspace /></Suspense></Sheet>
      <Sheet open={showTools} onClose={()=>setShowTools(false)} title="Transaction tools"><div className="grid gap-3">
        <button className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-left" onClick={()=>{setShowTools(false);setShowImport(true);}}>Upload expense template</button>
        <button className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-left" onClick={()=>{setShowTools(false);setShowExport(true);}}>Reports & export</button>
        <button className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-left" onClick={()=>{setShowTools(false);setShowAlerts(true);}}>Manual bank-message inbox</button>
        <button className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-left" onClick={()=>{setShowTools(false);setShowDeleted(true);}}>Deleted entries ({deletedTransactions.length})</button>
        <button className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-left" onClick={handlePrint}>Print filtered transactions</button>
      </div></Sheet>
      <Sheet open={showAlerts} onClose={()=>setShowAlerts(false)} title="Bank messages · Review before posting"><AlertInbox /></Sheet>
      <Sheet open={showExport} onClose={()=>setShowExport(false)} title="Reports & Export"><ExportReport /></Sheet>
      <Sheet open={showImport} onClose={()=>setShowImport(false)} title="Upload Expenses"><ImportExpenses /></Sheet>
      <Sheet open={showDeleted} onClose={()=>setShowDeleted(false)} title="Deleted Transactions">{deletedTransactions.length===0?<p>No deleted transactions.</p>:[...deletedTransactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).map(t=><div key={t.id} className="border p-3 rounded-xl mb-2 text-xs"><b>{t.heading||t.type} · {formatCurrency(t.amount)}</b><p>{t.date} · {t.type} · {t.majorCategory} · {t.person}</p><p>Deleted: {t.deletedAt?new Date(t.deletedAt).toLocaleString('en-IN'):'Unknown'}</p><button className="bg-cyan-600 text-white rounded-xl p-2 mt-2" onClick={()=>restoreTransaction(t.id)}>Restore</button></div>)}</Sheet>
      {filtered.length===0?<p className="text-sm text-slate-500 text-center py-12">{data.transactions.length?'No matching transactions.':'No transactions yet.'}</p>:<div>
        {filtered.slice(0,visibleCount).map((t,index)=>{
          const credit=['Income Misc','Lent Recovered'].includes(t.type);
          const newDate=index===0||filtered[index-1].date!==t.date;
          return <div key={t.id}>
            {newDate&&<h2 className="text-xs font-bold text-slate-500 mt-5 mb-2">{formatDate(t.date)}</h2>}
            <button onClick={()=>setSelected(t)} className="w-full text-left flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800">
              <div className="min-w-0"><p className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">{t.heading||t.person||t.majorCategory||t.type}</p><p className="text-xs text-slate-500 truncate">{[t.majorCategory,t.subCategory,t.account].filter(Boolean).join(' · ')}</p></div>
              <div className="shrink-0 text-right"><p className={credit?'font-bold text-emerald-600':'font-bold text-slate-900 dark:text-slate-100'}>{credit?'+':'−'}{formatCurrency(t.amount)}</p><p className="text-[10px] text-slate-500">{t.type}</p></div>
            </button>
          </div>;
        })}
      </div>}
      {filtered.length>visibleCount&&<button className="w-full mt-4 rounded-xl p-3 bg-slate-100 dark:bg-slate-800 text-sm print:hidden" onClick={()=>setVisibleCount(visibleCount+100)}>Show more ({visibleCount} of {filtered.length})</button>}
      <Sheet open={!!selected} onClose={()=>setSelected(null)} title="Transaction details">{selected&&<div className="space-y-3 text-sm"><b>{formatCurrency(selected.amount)} · {selected.type}</b><dl className="space-y-2">{Object.entries(selected).filter(([k,v])=>v!==undefined&&v!==''&&['date','heading','majorCategory','subCategory','account','paymentMode','person','purchasedFrom','paymentFor','incomeType','investmentType','remarks','customFields','statementReferences'].includes(k)).map(([k,v])=><div key={k}><dt className="text-xs text-slate-500">{({date:'Date',heading:'Description',majorCategory:'Category',subCategory:'Subcategory',account:'Account',paymentMode:'Payment mode',person:'Person',purchasedFrom:'Purchased from',paymentFor:'Purpose',incomeType:'Income type',investmentType:'Investment type',remarks:'Narration / remarks',customFields:'Custom fields',statementReferences:'Payment references'} as Record<string,string>)[k]||k}</dt><dd className="break-words">{typeof v==='object'?JSON.stringify(v):String(v)}</dd></div>)}</dl><div className="flex gap-3"><button className="rounded-xl bg-cyan-600 text-white px-4 py-2" onClick={()=>{setEditingTransaction(selected);setSelected(null);}}>Edit</button><button className="rounded-xl bg-rose-50 text-rose-700 px-4 py-2" onClick={()=>{setDeleteConfirmId(selected.id);setSelected(null);}}>Delete</button></div></div>}</Sheet>

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
