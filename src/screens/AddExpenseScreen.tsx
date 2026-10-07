import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { TransactionForm } from '@/components/TransactionForm';
import { Sheet } from '@/components/Sheet';
import { FrequentSuggestions } from '@/components/FrequentSuggestions';
import { Zap, X, Clock } from 'lucide-react';
import { formatCurrency } from '@/data/format';
import type { FrequentTransaction, Transaction } from '@/data/types';

export function AddExpenseScreen() {
  const { frequentTransactions, deleteFrequentTransaction } = useApp();
  const [showFrequentSheet, setShowFrequentSheet] = useState(false);
  const [selectedFrequent, setSelectedFrequent] = useState<FrequentTransaction | null>(null);

  function handleSelectFrequent(f: FrequentTransaction) {
    setSelectedFrequent(f);
    setShowFrequentSheet(false);
  }

  return (
    <div className="px-4 pt-6 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quick Entry</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Review, adjust and POST</p>
        </div>

        {frequentTransactions.length > 0 && (
          <button
            onClick={() => setShowFrequentSheet(true)}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800"
          >
            <Zap size={14} /> Frequent ({frequentTransactions.length})
          </button>
        )}
      </div>


      {/* Horizontal Frequent Chips if any */}
      {frequentTransactions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-1">
          {frequentTransactions.slice(0, 5).map((f) => (
            <button
              key={f.id}
              onClick={() => handleSelectFrequent(f)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0 hover:border-cyan-500 transition-colors"
            >
              <Clock size={12} className="text-cyan-600 dark:text-cyan-400" />
              <span>{f.label}</span>
              {f.amount ? <span className="font-bold text-slate-900 dark:text-slate-100">₹{f.amount}</span> : null}
            </button>
          ))}
        </div>
      )}

      <FrequentSuggestions />
      {/* Primary Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
        <TransactionForm
          key={selectedFrequent ? selectedFrequent.id : 'default-form'}
          initialType={selectedFrequent ? selectedFrequent.type : 'Revenue Expense'}
          prefill={selectedFrequent ? {
            amount: selectedFrequent.amount,
            majorCategory: selectedFrequent.majorCategory,
            subCategory: selectedFrequent.subCategory,
            paymentMode: selectedFrequent.paymentMode,
            account: selectedFrequent.account,
            person: selectedFrequent.person,
            purchasedFrom: selectedFrequent.purchasedFrom,
            paymentFor: selectedFrequent.paymentFor,
            incomeType: selectedFrequent.incomeType,
            investmentType: selectedFrequent.investmentType,
            remarks: selectedFrequent.remarks,
            customFields: selectedFrequent.customFields,
          } : undefined}
          onSuccess={() => {
            setSelectedFrequent(null);
          }}
        />
      </div>


      {/* Frequent Transactions Sheet */}
      <Sheet open={showFrequentSheet} onClose={() => setShowFrequentSheet(false)} title="Frequent Transactions">
        {frequentTransactions.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
            No frequent transactions saved yet.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Tap a template to pre-fill the form for review before posting:
            </p>
            {frequentTransactions.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700"
              >
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => handleSelectFrequent(f)}
                >
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{f.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {f.type} {f.amount ? `· ${formatCurrency(f.amount)}` : ''} · {f.account || 'Default'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => handleSelectFrequent(f)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => deleteFrequentTransaction(f.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}
