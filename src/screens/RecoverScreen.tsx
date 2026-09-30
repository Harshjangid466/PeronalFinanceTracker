import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, todayISO } from '@/data/format';
import { Plus, Users, Trash2, History } from 'lucide-react';
import { Sheet } from '@/components/Sheet';

export function RecoverScreen() {
  const { data, addReceivable, addRepayment, getReceivableOutstanding, getReceivableRecovered, deleteReceivable } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [showRepay, setShowRepay] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedReceivableId, setSelectedReceivableId] = useState<string | null>(null);

  // Add form
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [account, setAccount] = useState(data.accounts[0] ?? '');

  // Repay form
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(todayISO());
  const [repayAccount, setRepayAccount] = useState(data.accounts[0] ?? '');
  const [repayRemarks, setRepayRemarks] = useState('');

  const totalToRecover = useMemo(
    () => data.receivables.reduce((sum, r) => sum + Math.max(0, getReceivableOutstanding(r.id)), 0),
    [data.receivables, data.repayments]
  );
  const totalRecovered = useMemo(
    () => data.repayments.reduce((sum, r) => sum + r.amount, 0),
    [data.repayments]
  );
  const outstanding = totalToRecover;

  // Group by person
  const personOutstanding = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of data.receivables) {
      const out = Math.max(0, getReceivableOutstanding(r.id));
      map.set(r.person, (map.get(r.person) ?? 0) + out);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [data.receivables, data.repayments]);

  function handleAddReceivable() {
    if (!person.trim() || !amount) return;
    addReceivable({
      person: person.trim(),
      amount: parseFloat(amount),
      date,
      reason: reason.trim(),
      account,
    });
    setPerson('');
    setAmount('');
    setReason('');
    setDate(todayISO());
    setShowAdd(false);
  }

  function handleAddRepayment() {
    if (!selectedReceivableId || !repayAmount) return;
    addRepayment({
      receivableId: selectedReceivableId,
      amount: parseFloat(repayAmount),
      date: repayDate,
      account: repayAccount,
      remarks: repayRemarks.trim(),
    });
    setRepayAmount('');
    setRepayRemarks('');
    setRepayDate(todayISO());
    setShowRepay(false);
  }

  const selectedReceivable = data.receivables.find((r) => r.id === selectedReceivableId);
  const selectedRepayments = data.repayments.filter((r) => r.receivableId === selectedReceivableId);

  return (
    <div className="px-4 pt-6 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recover</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium active:scale-95 transition-transform"
        >
          <Plus size={18} /> Add
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total</p>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalToRecover)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Recovered</p>
          <p className="text-base font-bold text-green-600 dark:text-green-400">{formatCurrency(totalRecovered)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Outstanding</p>
          <p className="text-base font-bold text-red-600 dark:text-red-400">{formatCurrency(outstanding)}</p>
        </div>
      </div>

      {/* Person-wise outstanding */}
      {personOutstanding.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Person-wise Outstanding</h2>
          <div className="space-y-2">
            {personOutstanding.map(([p, amt]) => (
              <div key={p} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p}</span>
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receivables list */}
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">All Receivables</h2>
      {data.receivables.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
          No receivables yet. Tap "Add" to record money you paid for someone.
        </p>
      ) : (
        <div className="space-y-2">
          {data.receivables.map((r) => {
            const recovered = getReceivableRecovered(r.id);
            const out = getReceivableOutstanding(r.id);
            const isFullyRecovered = out <= 0;
            return (
              <div
                key={r.id}
                className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${
                  isFullyRecovered
                    ? 'border-green-200 dark:border-green-800'
                    : 'border-slate-100 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.person}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatDate(r.date)} · {formatCurrency(r.amount)}
                    </p>
                    {r.reason && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{r.reason}</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-green-600 dark:text-green-400">Recovered: {formatCurrency(recovered)}</span>
                      <span className="text-xs text-red-600 dark:text-red-400">Outstanding: {formatCurrency(Math.max(0, out))}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteReceivable(r.id)}
                    className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {!isFullyRecovered && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        setSelectedReceivableId(r.id);
                        setRepayAmount('');
                        setRepayDate(todayISO());
                        setRepayAccount(r.account);
                        setShowRepay(true);
                      }}
                      className="flex-1 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform"
                    >
                      Record Repayment
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReceivableId(r.id);
                        setShowHistory(true);
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium"
                    >
                      <History size={16} />
                    </button>
                  </div>
                )}
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${r.amount > 0 ? (recovered / r.amount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add receivable sheet */}
      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="New Receivable">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Person *</label>
            <input type="text" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Who owes you?" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Amount *</label>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-xl font-bold" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Reason</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What was it for?" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Payment Account</label>
            <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500">
              {data.accounts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button onClick={handleAddReceivable} disabled={!person.trim() || !amount} className="w-full py-3 rounded-xl bg-cyan-600 text-white font-semibold active:scale-[0.98] transition-transform disabled:opacity-40">
            Save Receivable
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            This will be recorded as "Money Lent" and will NOT count as your personal expense.
          </p>
        </div>
      </Sheet>

      {/* Repayment sheet */}
      <Sheet open={showRepay} onClose={() => setShowRepay(false)} title={`Repayment from ${selectedReceivable?.person ?? ''}`}>
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Total</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(selectedReceivable?.amount ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-green-600 dark:text-green-400">Recovered</span>
              <span className="font-semibold">{formatCurrency(selectedReceivable ? getReceivableRecovered(selectedReceivable.id) : 0)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-red-600 dark:text-red-400">Outstanding</span>
              <span className="font-semibold">{formatCurrency(selectedReceivable ? Math.max(0, getReceivableOutstanding(selectedReceivable.id)) : 0)}</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Repay Amount *</label>
            <input type="number" inputMode="decimal" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} placeholder="0" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-xl font-bold" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Date</label>
            <input type="date" value={repayDate} onChange={(e) => setRepayDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Received In</label>
            <select value={repayAccount} onChange={(e) => setRepayAccount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500">
              {data.accounts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Remarks</label>
            <input type="text" value={repayRemarks} onChange={(e) => setRepayRemarks(e.target.value)} placeholder="Optional" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <button onClick={handleAddRepayment} disabled={!repayAmount} className="w-full py-3 rounded-xl bg-cyan-600 text-white font-semibold active:scale-[0.98] transition-transform disabled:opacity-40">
            Record Repayment
          </button>
        </div>
      </Sheet>

      {/* History sheet */}
      <Sheet open={showHistory} onClose={() => setShowHistory(false)} title={`History - ${selectedReceivable?.person ?? ''}`}>
        {selectedRepayments.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No repayments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {selectedRepayments.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatCurrency(r.amount)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(r.date)} · {r.account}</p>
                  {r.remarks && <p className="text-xs text-slate-400 dark:text-slate-500">{r.remarks}</p>}
                </div>
                <span className="text-xs font-medium text-green-600 dark:text-green-400">Received</span>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}
