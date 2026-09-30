import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { Frequency, TransactionType } from '@/data/types';
import { formatCurrency, formatDate, formatDateShort, daysFromToday, todayISO } from '@/data/format';
import { Plus, Repeat, Trash2, Check, SkipForward, Calendar } from 'lucide-react';
import { Sheet } from '@/components/Sheet';

export function RecurringScreen() {
  const { data, addRecurring, deleteRecurring, postRecurring, skipRecurring } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('Expense');
  const [majorCategory, setMajorCategory] = useState(data.categories[0]?.name ?? '');
  const [subCategory, setSubCategory] = useState('');
  const [account, setAccount] = useState(data.accounts[0] ?? '');
  const [paymentMode, setPaymentMode] = useState(data.paymentModes[0] ?? '');
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [customIntervalDays, setCustomIntervalDays] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [automaticPosting, setAutomaticPosting] = useState(false);

  const subCategories = data.categories.find((c) => c.name === majorCategory)?.subCategories ?? [];

  const upcoming = useMemo(
    () =>
      data.recurring
        .filter((r) => daysFromToday(r.nextDueDate) >= 0)
        .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
    [data.recurring]
  );

  const allRecurring = useMemo(
    () => [...data.recurring].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
    [data.recurring]
  );

  function resetForm() {
    setDescription('');
    setAmount('');
    setType('Expense');
    setMajorCategory(data.categories[0]?.name ?? '');
    setSubCategory('');
    setAccount(data.accounts[0] ?? '');
    setPaymentMode(data.paymentModes[0] ?? '');
    setFrequency('Monthly');
    setCustomIntervalDays('');
    setStartDate(todayISO());
    setEndDate('');
    setAutomaticPosting(false);
  }

  function handleAdd() {
    if (!description.trim() || !amount) return;
    addRecurring({
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      majorCategory,
      subCategory,
      account,
      paymentMode,
      frequency,
      customIntervalDays: frequency === 'Custom' ? parseInt(customIntervalDays) || 1 : undefined,
      startDate,
      endDate: endDate || undefined,
      automaticPosting,
    });
    resetForm();
    setShowAdd(false);
  }

  return (
    <div className="px-4 pt-6 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recurring</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium active:scale-95 transition-transform"
        >
          <Plus size={18} /> Add
        </button>
      </div>

      {/* Upcoming section */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={18} className="text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upcoming</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 px-1">No upcoming recurring payments.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((r) => {
              const days = daysFromToday(r.nextDueDate);
              return (
                <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`} · {formatDateShort(r.nextDueDate)} · {r.frequency}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {r.majorCategory}{r.subCategory ? ` → ${r.subCategory}` : ''} · {r.account}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0 ml-2">{formatCurrency(r.amount)}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => postRecurring(r.id)}
                      className="flex-1 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> Post Now
                    </button>
                    <button
                      onClick={() => skipRecurring(r.id)}
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1"
                    >
                      <SkipForward size={14} /> Skip
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All recurring */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Repeat size={18} className="text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">All Recurring ({data.recurring.length})</h2>
        </div>
        {allRecurring.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
            No recurring transactions yet. Tap "Add" to create one.
          </p>
        ) : (
          <div className="space-y-2">
            {allRecurring.map((r) => (
              <div key={r.id} className="flex items-start justify-between bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 group">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.description}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatCurrency(r.amount)} · {r.frequency} · Next: {formatDate(r.nextDueDate)}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {r.majorCategory}{r.subCategory ? ` → ${r.subCategory}` : ''} · {r.account}
                    {r.automaticPosting ? ' · Auto' : ''}
                  </p>
                </div>
                <button
                  onClick={() => deleteRecurring(r.id)}
                  className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add recurring sheet */}
      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="New Recurring Payment">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Description *</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Internet Bill" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Amount *</label>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-xl font-bold" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Transaction Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as TransactionType)} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500">
              {(['Expense', 'Income', 'Transfer', 'Credit Card Payment'] as TransactionType[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Category</label>
            <select value={majorCategory} onChange={(e) => { setMajorCategory(e.target.value); setSubCategory(''); }} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500">
              {data.categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          {subCategories.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Sub-category</label>
              <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="">None</option>
                {subCategories.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Account</label>
            <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500">
              {data.accounts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Payment Mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500">
              {data.paymentModes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Frequency *</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500">
              {(['Weekly', 'Monthly', 'Yearly', 'Custom'] as Frequency[]).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          {frequency === 'Custom' && (
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Custom Interval (days)</label>
              <input type="number" value={customIntervalDays} onChange={(e) => setCustomIntervalDays(e.target.value)} placeholder="e.g. 15" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Start Date *</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">End Date (optional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Automatic Posting</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Auto-post when due date arrives</p>
            </div>
            <button
              onClick={() => setAutomaticPosting(!automaticPosting)}
              className={`relative w-12 h-7 rounded-full transition-colors ${automaticPosting ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${automaticPosting ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <button onClick={handleAdd} disabled={!description.trim() || !amount} className="w-full py-3 rounded-xl bg-cyan-600 text-white font-semibold active:scale-[0.98] transition-transform disabled:opacity-40">
            Save Recurring
          </button>
        </div>
      </Sheet>
    </div>
  );
}
