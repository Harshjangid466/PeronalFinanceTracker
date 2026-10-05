import { useState, useMemo } from 'react';
import { Sheet } from '@/components/Sheet';
import { useApp, type PersonLedgerItem } from '@/context/AppContext';
import type { Transaction, TransactionType } from '@/data/types';
import { normalizeTransactionType } from '@/data/types';
import { formatCurrency, formatDate } from '@/data/format';
import { Users, ChevronRight, ArrowUpRight, ArrowDownLeft, Trash2, Edit2, Plus, Sparkles } from 'lucide-react';

interface CategoryDrillDownModalProps {
  open: boolean;
  onClose: () => void;
  categoryType: TransactionType | null;
  periodTransactions: Transaction[];
  onEditTransaction: (txn: Transaction) => void;
  onOpenLedger: (person: string) => void;
}

export function CategoryDrillDownModal({
  open,
  onClose,
  categoryType,
  periodTransactions,
  onEditTransaction,
  onOpenLedger,
}: CategoryDrillDownModalProps) {
  const { data, getAllPersonLedgers, deleteTransaction } = useApp();
  const [selectedSubCat, setSelectedSubCat] = useState<string | null>(null);

  // Filter transactions for this category type
  const txns = useMemo(() => {
    if (!categoryType) return [];
    return periodTransactions.filter(
      (t) => normalizeTransactionType(t.type) === normalizeTransactionType(categoryType)
    );
  }, [categoryType, periodTransactions]);

  const totalAmount = useMemo(() => {
    return txns.reduce((sum, t) => sum + t.amount, 0);
  }, [txns]);

  // Breakdown aggregations
  const majorCategoryBreakdown = useMemo(() => {
    if (categoryType !== 'Revenue Expense') return [];
    const map = new Map<string, number>();
    for (const t of txns) {
      const cat = t.majorCategory || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categoryType, txns, totalAmount]);

  const subCategoryBreakdown = useMemo(() => {
    if (!selectedSubCat) return [];
    const filtered = txns.filter((t) => t.majorCategory === selectedSubCat);
    const subTotal = filtered.reduce((sum, t) => sum + t.amount, 0);
    const map = new Map<string, number>();
    for (const t of filtered) {
      const sub = t.subCategory || 'General';
      map.set(sub, (map.get(sub) || 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: subTotal > 0 ? (amount / subTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [selectedSubCat, txns]);

  // Capex breakdowns
  const capexBreakdown = useMemo(() => {
    if (categoryType !== 'CAPEX') return { byCat: [], byMerchant: [] };
    const catMap = new Map<string, number>();
    const merchantMap = new Map<string, number>();
    for (const t of txns) {
      const cat = t.majorCategory || 'General';
      const m = t.purchasedFrom || 'Other';
      catMap.set(cat, (catMap.get(cat) || 0) + t.amount);
      merchantMap.set(m, (merchantMap.get(m) || 0) + t.amount);
    }
    return {
      byCat: Array.from(catMap.entries()).map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      })).sort((a, b) => b.amount - a.amount),
      byMerchant: Array.from(merchantMap.entries()).map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      })).sort((a, b) => b.amount - a.amount),
    };
  }, [categoryType, txns, totalAmount]);

  // To Ghar breakdown
  const toGharBreakdown = useMemo(() => {
    if (categoryType !== 'To Ghar') return [];
    const map = new Map<string, number>();
    for (const t of txns) {
      const pf = t.paymentFor || 'General';
      map.set(pf, (map.get(pf) || 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categoryType, txns, totalAmount]);

  // Income Misc breakdown
  const incomeBreakdown = useMemo(() => {
    if (categoryType !== 'Income Misc') return [];
    const map = new Map<string, number>();
    for (const t of txns) {
      const it = t.incomeType || 'Other';
      map.set(it, (map.get(it) || 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categoryType, txns, totalAmount]);

  // Investment breakdown
  const investmentBreakdown = useMemo(() => {
    if (categoryType !== 'Investment') return [];
    const map = new Map<string, number>();
    for (const t of txns) {
      const inv = t.investmentType || t.majorCategory || 'Other';
      map.set(inv, (map.get(inv) || 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categoryType, txns, totalAmount]);

  // Lent Recovered person breakdown
  const lentRecoveredBreakdown = useMemo(() => {
    if (categoryType !== 'Lent Recovered') return [];
    const map = new Map<string, number>();
    for (const t of txns) {
      const p = t.person || 'Unknown';
      map.set(p, (map.get(p) || 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categoryType, txns, totalAmount]);

  // Unified Ledgers for Lent
  const allLedgers = useMemo(() => {
    if (categoryType !== 'Lent') return [];
    return getAllPersonLedgers();
  }, [categoryType, getAllPersonLedgers]);

  const peopleWhoOweMe = useMemo(() => allLedgers.filter((l) => l.netBalance > 0), [allLedgers]);
  const peopleIOwe = useMemo(() => allLedgers.filter((l) => l.netBalance < 0), [allLedgers]);

  if (!categoryType) return null;

  return (
    <Sheet open={open} onClose={() => { setSelectedSubCat(null); onClose(); }} title={`${categoryType} Breakdown`}>
      <div className="space-y-4">
        {/* Total Summary Card */}
        <div className="bg-gradient-to-br from-cyan-600 to-teal-700 rounded-2xl p-4 text-white shadow-md">
          <p className="text-xs text-cyan-100 font-medium">Selected Period Total</p>
          <p className="text-3xl font-extrabold mt-1">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-cyan-100/90 mt-1">{txns.length} transactions recorded</p>
        </div>

        {/* 1. REVENUE EXPENSE DRILLDOWN (R4) */}
        {categoryType === 'Revenue Expense' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {selectedSubCat ? `${selectedSubCat} Sub-categories` : 'Major Categories'}
              </h3>
              {selectedSubCat && (
                <button
                  onClick={() => setSelectedSubCat(null)}
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400"
                >
                  ← Back to Categories
                </button>
              )}
            </div>

            {!selectedSubCat ? (
              <div className="space-y-2">
                {majorCategoryBreakdown.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setSelectedSubCat(item.name)}
                    className="w-full text-left bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(item.amount)}
                        </span>
                        <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 w-12 text-right">
                          {item.percentage.toFixed(0)}%
                        </span>
                        <ChevronRight size={16} className="text-slate-400" />
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-600 rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {subCategoryBreakdown.map((item) => (
                  <div
                    key={item.name}
                    className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(item.amount)}
                        </span>
                        <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                          {item.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-600 rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. LENT DRILLDOWN (R5: People Who Owe Me & People I Owe) */}
        {categoryType === 'Lent' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                People Who Owe Me (Net Receivable)
              </h3>
              {peopleWhoOweMe.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-2">No outstanding receivables.</p>
              ) : (
                <div className="space-y-2">
                  {peopleWhoOweMe.map((l) => (
                    <button
                      key={l.person}
                      onClick={() => onOpenLedger(l.person)}
                      className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-cyan-600 dark:text-cyan-400" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{l.person}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Lent {formatCurrency(l.totalLent)} · Recovered {formatCurrency(l.totalRecovered)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(l.netBalance)}
                        </span>
                        <ChevronRight size={16} className="text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {peopleIOwe.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  People I Owe (Net Payable)
                </h3>
                <div className="space-y-2">
                  {peopleIOwe.map((l) => (
                    <button
                      key={l.person}
                      onClick={() => onOpenLedger(l.person)}
                      className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-red-500" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{l.person}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Lent {formatCurrency(l.totalLent)} · Recovered {formatCurrency(l.totalRecovered)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(l.netBalance)}
                        </span>
                        <ChevronRight size={16} className="text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. LENT RECOVERED DRILLDOWN (R6) */}
        {categoryType === 'Lent Recovered' && (
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Recovery by Person
            </h3>
            <div className="space-y-2">
              {lentRecoveredBreakdown.map((item) => (
                <button
                  key={item.name}
                  onClick={() => onOpenLedger(item.name)}
                  className="w-full text-left bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {item.percentage.toFixed(0)}%
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. CAPEX DRILLDOWN (R7) */}
        {categoryType === 'CAPEX' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                By Asset Category
              </h3>
              <div className="space-y-2">
                {capexBreakdown.byCat.map((item) => (
                  <div key={item.name} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                      <div className="flex gap-2 items-center">
                        <span className="font-bold">{formatCurrency(item.amount)}</span>
                        <span className="text-xs text-cyan-600 font-semibold">{item.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {capexBreakdown.byMerchant.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  By Purchased From (Merchant)
                </h3>
                <div className="space-y-2">
                  {capexBreakdown.byMerchant.map((item) => (
                    <div key={item.name} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                        <div className="flex gap-2 items-center">
                          <span className="font-bold">{formatCurrency(item.amount)}</span>
                          <span className="text-xs text-cyan-600 font-semibold">{item.percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-600 rounded-full" style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. TO GHAR DRILLDOWN (R8) */}
        {categoryType === 'To Ghar' && (
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Breakdown by Payment For
            </h3>
            <div className="space-y-2">
              {toGharBreakdown.map((item) => (
                <div key={item.name} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                    <div className="flex gap-2 items-center">
                      <span className="font-bold">{formatCurrency(item.amount)}</span>
                      <span className="text-xs text-amber-600 font-semibold">{item.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. INCOME MISC DRILLDOWN (R9) */}
        {categoryType === 'Income Misc' && (
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Breakdown by Income Type
            </h3>
            <div className="space-y-2">
              {incomeBreakdown.map((item) => (
                <div key={item.name} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                    <div className="flex gap-2 items-center">
                      <span className="font-bold text-emerald-600">{formatCurrency(item.amount)}</span>
                      <span className="text-xs text-emerald-600 font-semibold">{item.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. INVESTMENT DRILLDOWN (R10) */}
        {categoryType === 'Investment' && (
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Breakdown by Investment Type
            </h3>
            <div className="space-y-2">
              {investmentBreakdown.map((item) => (
                <div key={item.name} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                    <div className="flex gap-2 items-center">
                      <span className="font-bold text-blue-600">{formatCurrency(item.amount)}</span>
                      <span className="text-xs text-blue-600 font-semibold">{item.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Underlying Transactions List with Edit / Delete */}
        <div className="pt-2">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Transactions ({txns.length})
          </h3>
          {txns.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No transactions in this category for selected period.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {txns.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {t.majorCategory || t.type}
                      {t.subCategory ? ` · ${t.subCategory}` : ''}
                      {t.person ? ` · ${t.person}` : ''}
                      {t.purchasedFrom ? ` · ${t.purchasedFrom}` : ''}
                      {t.paymentFor ? ` · ${t.paymentFor}` : ''}
                      {t.incomeType ? ` · ${t.incomeType}` : ''}
                      {t.investmentType ? ` · ${t.investmentType}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {formatDate(t.date)} · {t.account || t.paymentMode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(t.amount)}
                    </span>
                    <button
                      onClick={() => onEditTransaction(t)}
                      className="p-1 text-slate-400 hover:text-cyan-600"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this transaction?')) {
                          deleteTransaction(t.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
