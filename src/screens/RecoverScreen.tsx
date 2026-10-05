import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate } from '@/data/format';
import { Plus, Users, ArrowUpRight, ArrowDownLeft, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { TransactionForm } from '@/components/TransactionForm';
import { PersonLedgerModal } from '@/components/PersonLedgerModal';
import type { Transaction } from '@/data/types';

export function RecoverScreen() {
  const { getAllPersonLedgers } = useApp();
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'owes_me' | 'i_owe' | 'settled'>('all');

  // Modals
  const [activeFormType, setActiveFormType] = useState<'Lent' | 'Lent Recovered' | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const allLedgers = useMemo(() => getAllPersonLedgers(), [getAllPersonLedgers]);

  // Overall totals across ledgers
  const totals = useMemo(() => {
    let totalLent = 0;
    let totalRecovered = 0;
    let netReceivable = 0; // people who owe me
    let netPayable = 0; // people I owe

    for (const l of allLedgers) {
      totalLent += l.totalLent;
      totalRecovered += l.totalRecovered;
      if (l.netBalance > 0) {
        netReceivable += l.netBalance;
      } else if (l.netBalance < 0) {
        netPayable += Math.abs(l.netBalance);
      }
    }

    return { totalLent, totalRecovered, netReceivable, netPayable };
  }, [allLedgers]);

  const filteredLedgers = useMemo(() => {
    return allLedgers.filter((l) => {
      if (search && !l.person.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTab === 'owes_me' && l.netBalance <= 0) return false;
      if (filterTab === 'i_owe' && l.netBalance >= 0) return false;
      if (filterTab === 'settled' && l.netBalance !== 0) return false;
      return true;
    });
  }, [allLedgers, search, filterTab]);

  return (
    <div className="px-4 pt-6 pb-28 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Receivables</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Unified Person-wise Ledgers</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveFormType('Lent')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            <ArrowUpRight size={14} /> Lent
          </button>
          <button
            onClick={() => setActiveFormType('Lent Recovered')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            <ArrowDownLeft size={14} /> Recovered
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-3.5 text-white shadow-sm">
          <p className="text-[11px] text-emerald-100 font-medium">Net To Recover (Owed to you)</p>
          <p className="text-2xl font-extrabold mt-0.5">{formatCurrency(totals.netReceivable)}</p>
          <p className="text-[10px] text-emerald-200 mt-1">Total Lent: {formatCurrency(totals.totalLent)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Recovered</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
            {formatCurrency(totals.totalRecovered)}
          </p>
          {totals.netPayable > 0 ? (
            <p className="text-[10px] text-rose-500 font-semibold mt-1">
              You owe: {formatCurrency(totals.netPayable)}
            </p>
          ) : (
            <p className="text-[10px] text-emerald-500 font-semibold mt-1">No pending payables</p>
          )}
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search person..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { id: 'all', label: `All (${allLedgers.length})` },
            { id: 'owes_me', label: `Owes Me (${allLedgers.filter((l) => l.netBalance > 0).length})` },
            { id: 'i_owe', label: `I Owe (${allLedgers.filter((l) => l.netBalance < 0).length})` },
            { id: 'settled', label: `Settled (${allLedgers.filter((l) => l.netBalance === 0).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filterTab === tab.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Person Ledgers List */}
      <div className="space-y-2">
        {filteredLedgers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-2">No people found.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Record a "Lent" transaction to start tracking balances.
            </p>
          </div>
        ) : (
          filteredLedgers.map((l) => {
            const isOwed = l.netBalance > 0;
            const isPayable = l.netBalance < 0;
            const isSettled = l.netBalance === 0;

            return (
              <div
                key={l.person}
                onClick={() => setSelectedPerson(l.person)}
                className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isOwed
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : isPayable
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {l.person.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{l.person}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {l.transactions.length} transactions · Lent {formatCurrency(l.totalLent)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="text-right">
                      <p
                        className={`text-sm font-extrabold ${
                          isOwed
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isPayable
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {isOwed ? '+' : ''}
                        {formatCurrency(l.netBalance)}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400">
                        {isOwed ? 'Owes you' : isPayable ? 'You owe' : 'Settled'}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 shrink-0" />
                  </div>
                </div>

                {/* Mini progress bar showing recovery ratio */}
                {l.totalLent > 0 && (
                  <div className="mt-2.5 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (l.totalRecovered / l.totalLent) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Lent / Recovered Entry Modal */}
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

      {/* Person Unified Ledger Modal */}
      <PersonLedgerModal
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onLendMore={(p) => {
          setSelectedPerson(null);
          setActiveFormType('Lent');
        }}
        onRecordRecovery={(p) => {
          setSelectedPerson(null);
          setActiveFormType('Lent Recovered');
        }}
        onEditTransaction={(txn) => {
          setSelectedPerson(null);
          setEditingTransaction(txn);
        }}
      />

      {/* Edit Transaction Modal */}
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
