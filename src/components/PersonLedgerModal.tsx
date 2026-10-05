import { useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate } from '@/data/format';
import type { Transaction } from '@/data/types';
import { normalizeTransactionType } from '@/data/types';
import { Plus, ArrowDownLeft, ArrowUpRight, Trash2, Edit2, CheckCircle2 } from 'lucide-react';

interface PersonLedgerModalProps {
  person: string | null;
  onClose: () => void;
  onLendMore: (person: string) => void;
  onRecordRecovery: (person: string) => void;
  onEditTransaction: (txn: Transaction) => void;
}

export function PersonLedgerModal({
  person,
  onClose,
  onLendMore,
  onRecordRecovery,
  onEditTransaction,
}: PersonLedgerModalProps) {
  const { getPersonLedger, deleteTransaction } = useApp();

  if (!person) return null;

  const ledger = getPersonLedger(person);

  return (
    <Sheet open={Boolean(person)} onClose={onClose} title={`${person}'s Ledger`}>
      <div className="space-y-4">
        {/* Net Status Card */}
        <div
          className={`rounded-2xl p-4 text-white shadow-md ${
            ledger.netBalance > 0
              ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
              : ledger.netBalance < 0
              ? 'bg-gradient-to-br from-rose-600 to-red-700'
              : 'bg-gradient-to-br from-slate-600 to-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold opacity-90">
              {ledger.netBalance > 0
                ? 'Owes You (Receivable)'
                : ledger.netBalance < 0
                ? 'You Owe (Payable)'
                : 'Settled'}
            </span>
            {ledger.netBalance === 0 && <CheckCircle2 size={18} className="opacity-90" />}
          </div>
          <p className="text-3xl font-extrabold mt-1">
            {formatCurrency(Math.abs(ledger.netBalance))}
          </p>
          <div className="flex justify-between items-center text-xs opacity-90 mt-2 pt-2 border-t border-white/20">
            <span>Total Lent: {formatCurrency(ledger.totalLent)}</span>
            <span>Total Recovered: {formatCurrency(ledger.totalRecovered)}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onLendMore(person)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            <ArrowUpRight size={16} /> Lend More
          </button>
          <button
            onClick={() => onRecordRecovery(person)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            <ArrowDownLeft size={16} /> Record Recovery
          </button>
        </div>

        {/* Chronological Ledger Transactions */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            History ({ledger.transactions.length})
          </h3>
          {ledger.transactions.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No transactions recorded for {person}.</p>
          ) : (
            <div className="space-y-2">
              {ledger.transactions.map((t) => {
                const norm = normalizeTransactionType(t.type);
                const isLent = norm === 'Lent';
                return (
                  <div
                    key={t.id}
                    className="flex items-start justify-between bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 shrink-0 ${
                          isLent
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                        }`}
                      >
                        {isLent ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {isLent ? 'Lent' : 'Recovered'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDate(t.date)} · {t.account || t.paymentMode || 'Cash'}
                        </p>
                        {t.remarks && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {t.remarks}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className={`text-xs font-bold ${
                          isLent
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isLent ? '-' : '+'}
                        {formatCurrency(t.amount)}
                      </span>
                      <button
                        onClick={() => onEditTransaction(t)}
                        className="p-1 text-slate-400 hover:text-cyan-600"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this ledger transaction?')) {
                            deleteTransaction(t.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
