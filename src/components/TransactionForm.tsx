import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import type { Transaction, TransactionType, CustomFieldDefinition } from '@/data/types';
import { CORE_TRANSACTION_TYPES, normalizeTransactionType } from '@/data/types';
import { todayISO, formatCurrency } from '@/data/format';
import { Check, Plus, AlertCircle, Sparkles, ChevronDown, X } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { ruleDefaults, visibleField } from '@/data/model';
import { DynamicFields } from './DynamicFields';
import {useDraftGuard,requestNavigation,clearSheetDraft} from './NavigationGuard';

interface TransactionFormProps {
  initialType?: TransactionType;
  editTransaction?: Transaction | null;
  onSuccess?: (savedTxn: Transaction) => void;
  onClose?: () => void;
  prefill?: Partial<Transaction>;
  isModal?: boolean;
}

export function TransactionForm({
  initialType = 'Revenue Expense',
  editTransaction,
  onSuccess,
  onClose,
  prefill,
  isModal = false,
}: TransactionFormProps) {
  const {
    data,
    addTransaction,
    updateTransaction,
    quickAmounts,
    addPerson,
    addCategory,
    addSubCategory,
    addAccount,
    addPaymentMode,
    addCapexPurchasedFrom,
    addToGharPaymentFor,
    addIncomeType,
    addInvestmentType,
    addFrequentTransaction,
    checkPossibleDuplicate,
    detectFrequentCandidates,
  } = useApp();

  const guard=useDraftGuard();
  const isEdit = Boolean(editTransaction);
  const manualSource = useRef(Boolean(editTransaction || prefill?.account));
  const manualMode = useRef(Boolean(editTransaction || prefill?.paymentMode));
  const [type, setType] = useState<TransactionType>(
    editTransaction ? normalizeTransactionType(editTransaction.type) : initialType
  );

  const [amount, setAmount] = useState<string>(
    editTransaction ? String(editTransaction.amount) : prefill?.amount ? String(prefill.amount) : ''
  );
  const [date, setDate] = useState<string>(
    editTransaction ? editTransaction.date : prefill?.date || todayISO()
  );
  const [majorCategory, setMajorCategory] = useState<string>(
    editTransaction ? editTransaction.majorCategory : prefill?.majorCategory || ''
  );
  const [subCategory, setSubCategory] = useState<string>(
    editTransaction ? editTransaction.subCategory : prefill?.subCategory || ''
  );
  const [paymentMode, setPaymentMode] = useState<string>(
    editTransaction ? editTransaction.paymentMode : prefill?.paymentMode || (data.paymentModes.includes('UPI')?'UPI':data.paymentModes[0] || '')
  );
  const [account, setAccount] = useState<string>(
    editTransaction ? editTransaction.account : prefill?.account || (data.accounts.includes('HDFC Savings A/c')?'HDFC Savings A/c':data.accounts[0] || '')
  );
  const [person, setPerson] = useState<string>(
    editTransaction ? editTransaction.person : prefill?.person || ''
  );
  const [purchasedFrom, setPurchasedFrom] = useState<string>(
    editTransaction?.purchasedFrom || prefill?.purchasedFrom || ''
  );
  const [paymentFor, setPaymentFor] = useState<string>(
    editTransaction?.paymentFor || prefill?.paymentFor || ''
  );
  const [incomeType, setIncomeType] = useState<string>(
    editTransaction?.incomeType || prefill?.incomeType || ''
  );
  const [investmentType, setInvestmentType] = useState<string>(
    editTransaction?.investmentType || prefill?.investmentType || ''
  );
  const [heading, setHeading] = useState(editTransaction?.heading || prefill?.heading || '');
  const [remarks, setRemarks] = useState<string>(
    editTransaction ? editTransaction.remarks : prefill?.remarks || ''
  );

  // Custom fields state: Record<key, value>
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(() => {
    return editTransaction?.customFields || prefill?.customFields || {};
  });

  const [saved, setSaved] = useState(false);
  const [possibleDuplicate, setPossibleDuplicate] = useState<Transaction | null>(null);

  // Quick Add modal for dropdown values
  const [showAddOption, setShowAddOption] = useState(false);
  const [addOptionTarget, setAddOptionTarget] = useState<string>('');
  const [addOptionLabel, setAddOptionLabel] = useState<string>('');
  const [newOptionValue, setNewOptionValue] = useState<string>('');

  // Frequent suggestion banner
  const [frequentSuggestion, setFrequentSuggestion] = useState<string | null>(null);

  const resolvedDefaults=JSON.stringify(ruleDefaults(data.rules.filter(r=>data.learningEnabled||!r.isLearned),data.masters||[],{type,majorCategory,subCategory,paymentMode,account,person,purchasedFrom,paymentFor,incomeType,investmentType,...customFieldValues}));
  useEffect(()=>{
    if(isEdit)return;
    const defaults=JSON.parse(resolvedDefaults) as Record<string,string>;
    if(!manualSource.current && defaults.account)setAccount(defaults.account);
    if(!manualMode.current && defaults.paymentMode)setPaymentMode(defaults.paymentMode);
    if(defaults.majorCategory)setMajorCategory(defaults.majorCategory);
    if(defaults.subCategory)setSubCategory(defaults.subCategory);
    if(defaults.person)setPerson(defaults.person);if(defaults.purchasedFrom)setPurchasedFrom(defaults.purchasedFrom);if(defaults.paymentFor)setPaymentFor(defaults.paymentFor);if(defaults.incomeType)setIncomeType(defaults.incomeType);if(defaults.investmentType)setInvestmentType(defaults.investmentType);
    const custom=Object.fromEntries(Object.entries(defaults).filter(([key])=>data.customFields.some(f=>f.key===key)));
    if(Object.keys(custom).length)setCustomFieldValues(prev=>({...prev,...custom}));
  },[resolvedDefaults,isEdit]);
  const eligibleSources=useMemo(()=>{
    const mode=data.masters?.find(m=>m.kind==='paymentMode'&&m.name===paymentMode);
    const eligible=mode?data.sourceMappings?.[mode.id]:undefined;
    const mapped=data.accounts.filter(name=>eligible?.includes(data.masters?.find(m=>m.kind==='source'&&m.name===name)?.id||''));
    return Array.from(new Set([...(mapped.length?mapped:data.accounts),...(account?[account]:[])]));
  },[data.accounts,data.masters,data.sourceMappings,paymentMode,account]);

  // When initialType changes and not editing, update type
  useEffect(() => {
    if (!editTransaction && initialType) {
      setType(initialType);
    }
  }, [initialType, editTransaction]);

  // When majorCategory changes, reset subCategory if not in category's list
  const availableSubCategories = useMemo(() => {
    const cat = data.categories.find((c) => c.name === majorCategory);
    return cat ? cat.subCategories : [];
  }, [data.categories, majorCategory]);

  // Check duplicate when amount and date change
  useEffect(() => {
    const amtNum = parseFloat(amount);
    if (!isEdit && amtNum > 0 && date) {
      const dup = checkPossibleDuplicate({
        amount: amtNum,
        date,
        type,
        majorCategory,
        person,
      });
      setPossibleDuplicate(dup);
    } else {
      setPossibleDuplicate(null);
    }
  }, [amount, date, type, majorCategory, person, isEdit, checkPossibleDuplicate]);

  // Filter custom fields applicable to this transaction type
  const applicableCustomFields = useMemo(() => {
    return (data.customFields || [])
      .filter((f) => visibleField(f,data.customFields,customFieldValues))
      .filter((f) => !f.applicableTypes || f.applicableTypes.length === 0 || f.applicableTypes.includes(type))
      .sort((a, b) => a.order - b.order);
  }, [data.customFields, type,customFieldValues]);

  function handleQuickAmountClick(amt: number) {
    guard.mark();setAmount(String(amt));
  }

  function handleCustomFieldChange(key: string, val: any) {
    setCustomFieldValues((prev) => ({ ...prev, [key]: val }));
  }

  function openAddOption(target: string, label: string) {
    setAddOptionTarget(target);
    setAddOptionLabel(label);
    setNewOptionValue('');
    setShowAddOption(true);
  }

  function handleConfirmAddOption() {
    const val = newOptionValue.trim();
    if (!val) return;

    if (addOptionTarget === 'person') {
      addPerson(val);
      setPerson(val);
    } else if (addOptionTarget === 'majorCategory') {
      addCategory(val);
      setMajorCategory(val);
    } else if (addOptionTarget === 'subCategory') {
      if (majorCategory) {
        addSubCategory(majorCategory, val);
      }
      setSubCategory(val);
    } else if (addOptionTarget === 'account') {
      addAccount(val);
      setAccount(val);
    } else if (addOptionTarget === 'paymentMode') {
      addPaymentMode(val);
      setPaymentMode(val);
    } else if (addOptionTarget === 'purchasedFrom') {
      addCapexPurchasedFrom(val);
      setPurchasedFrom(val);
    } else if (addOptionTarget === 'paymentFor') {
      addToGharPaymentFor(val);
      setPaymentFor(val);
    } else if (addOptionTarget === 'incomeType') {
      addIncomeType(val);
      setIncomeType(val);
    } else if (addOptionTarget === 'investmentType') {
      addInvestmentType(val);
      setInvestmentType(val);
    }

    setShowAddOption(false);
  }

  const isValid = useMemo(() => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0 || !Number.isSafeInteger(Math.round(amt*100)) || Math.abs(amt*100-Math.round(amt*100))>1e-6) return false;
    if (!date) return false;

    if (type === 'Revenue Expense' && !majorCategory) return false;
    if ((type === 'Lent' || type === 'Lent Recovered') && !person.trim()) return false;
    if (type === 'CAPEX' && !majorCategory) return false;
    if (type === 'To Ghar' && !paymentFor) return false;
    if (type === 'Income Misc' && !incomeType) return false;
    if (type === 'Investment' && !investmentType) return false;

    // Check required custom fields
    for (const cf of applicableCustomFields) {
      if (cf.required) {
        const val = customFieldValues[cf.key];
        if (val === undefined || val === null || val === '' || Array.isArray(val)&&val.length===0) return false;
      }
    }

    return true;
  }, [
    amount,
    date,
    type,
    majorCategory,
    person,
    paymentFor,
    incomeType,
    investmentType,
    applicableCustomFields,
    customFieldValues,
  ]);

  function handleSubmit() {
    if (!isValid || saved) return;
    guard.clear();clearSheetDraft();

    const amt = parseFloat(amount) || 0;
    const txnPayload: Partial<Transaction> & { amount: number; type: TransactionType } = {
      type,
      amount: amt,
      date,
      majorCategory: majorCategory.trim(),
      subCategory: subCategory.trim(),
      paymentMode: paymentMode.trim(),
      account: account.trim(),
      person: person.trim(),
      purchasedFrom: purchasedFrom.trim(),
      paymentFor: paymentFor.trim(),
      incomeType: incomeType.trim(),
      investmentType: investmentType.trim(),
      heading: heading.trim(),
      remarks: remarks.trim(),
      customFields: customFieldValues,
    };

    let resultTxn: Transaction;

    if (isEdit && editTransaction) {
      const updated = updateTransaction(editTransaction.id, txnPayload);
      resultTxn = updated || editTransaction;
    } else {
      resultTxn = addTransaction(txnPayload);

      // Check if this looks like a frequent transaction
      setTimeout(() => {
        const candidates = detectFrequentCandidates();
        if (candidates.length > 0) {
          setFrequentSuggestion(candidates[0].label);
        }
      }, 500);
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      if (onSuccess) {
        onSuccess(resultTxn);
      }
      if (onClose) {
        onClose();
      } else if (!isEdit) {
        // Reset form for next entry
        setAmount('');
        setRemarks('');
      }
    }, 600);
  }

  function handleSaveAsFrequent() {
    if (!isValid) return;
    const label =
      type === 'Revenue Expense'
        ? subCategory
          ? `${majorCategory} - ${subCategory}`
          : majorCategory
        : type === 'Lent' || type === 'Lent Recovered'
        ? `${type} - ${person}`
        : `${type} ₹${amount}`;

    addFrequentTransaction({
      label,
      type,
      amount: parseFloat(amount) || undefined,
      majorCategory,
      subCategory,
      paymentMode,
      account,
      person,
      purchasedFrom,
      paymentFor,
      incomeType,
      investmentType,
      remarks,
      customFields: customFieldValues,
      useCount: 1,
    });

    setFrequentSuggestion(null);
  }

  return (
    <div onChangeCapture={guard.mark} className={`space-y-4 ${isModal ? 'p-1' : 'px-4 pt-4 pb-24 max-w-md mx-auto'}`}>
      {/* Transaction Type Selector Bar (if in Add screen or editing) */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {CORE_TRANSACTION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                guard.mark();setType(t);
                // Set default categories if switching
                if (t === 'Revenue Expense' && !majorCategory) {
                  setMajorCategory(data.categories[0]?.name || 'Food');
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                type === t
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {onClose && (
          <button
            onClick={()=>requestNavigation(()=>onClose?.())}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg ml-2 shrink-0"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Possible Duplicate Warning (Section AA) */}
      {possibleDuplicate && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Possible Duplicate:</span> An entry of{' '}
            {formatCurrency(possibleDuplicate.amount)} on {possibleDuplicate.date} ({possibleDuplicate.type}) already exists.
          </div>
        </div>
      )}

      {/* Quick Amount Bar (Section C & Home '+' requirement) */}
      {quickAmounts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Quick Amounts</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAmountClick(amt)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95 border ${
                  amount === String(amt)
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                ₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
          Amount (₹) *
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">₹</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full pl-9 pr-4 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-2xl font-bold"
            autoFocus={!isEdit}
          />
        </div>
      </div>

      {/* Date Input */}
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
          Date *
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        />
      </div>

      <div>
        <label htmlFor="transaction-heading" className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Heading (optional)</label>
        <input id="transaction-heading" type="text" value={heading} onChange={(e) => setHeading(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700" />
      </div>

      {/* TYPE-SPECIFIC FIELDS */}

      {/* 1. REVENUE EXPENSE FIELDS */}
      {type === 'Revenue Expense' && (
        <>
          {/* Major Category */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Major Category *
              </label>
              <button
                type="button"
                onClick={() => openAddOption('majorCategory', 'Category')}
                className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 font-medium"
              >
                <Plus size={14} /> Add Category
              </button>
            </div>
            <select
              value={majorCategory}
              onChange={(e) => {
                setMajorCategory(e.target.value);
                setSubCategory('');
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            >
              <option value="">Select Category</option>
              {data.categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub Category */}
          {majorCategory && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Sub-category
                </label>
                <button
                  type="button"
                  onClick={() => openAddOption('subCategory', 'Sub-category')}
                  className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 font-medium"
                >
                  <Plus size={14} /> Add Sub-category
                </button>
              </div>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              >
                <option value="">Select Sub-category</option>
                {availableSubCategories.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {/* 2. LENT FIELDS */}
      {type === 'Lent' && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Lent To (Person) *
              </label>
              <button
                type="button"
                onClick={() => openAddOption('person', 'Person')}
                className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 font-medium"
              >
                <Plus size={14} /> Add Person
              </button>
            </div>
            <select
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            >
              <option value="">Select Person</option>
              {data.people.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Increases receivable balance for this person. NOT a personal expense.
            </p>
          </div>
        </>
      )}

      {/* 3. LENT RECOVERED FIELDS */}
      {type === 'Lent Recovered' && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Received From (Person) *
              </label>
              <button
                type="button"
                onClick={() => openAddOption('person', 'Person')}
                className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 font-medium"
              >
                <Plus size={14} /> Add Person
              </button>
            </div>
            <select
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            >
              <option value="">Select Person</option>
              {data.people.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Reduces receivable balance for this person. NOT personal income.
            </p>
          </div>
        </>
      )}

      {/* 4. CAPEX FIELDS */}
      {type === 'CAPEX' && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Asset Category *
              </label>
              <button
                type="button"
                onClick={() => openAddOption('majorCategory', 'Category')}
                className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 font-medium"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <select
              value={majorCategory}
              onChange={(e) => setMajorCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            >
              <option value="">Select Asset Category</option>
              {['Electronics', 'Gadgets', 'Furniture', 'Vehicle', 'Home Appliance', 'Tools/Equipment', 'Other'].map(
                (opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Purchased From
              </label>
              <button
                type="button"
                onClick={() => openAddOption('purchasedFrom', 'Merchant')}
                className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 font-medium"
              >
                <Plus size={14} /> Add Merchant
              </button>
            </div>
            <select
              value={purchasedFrom}
              onChange={(e) => setPurchasedFrom(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            >
              <option value="">Select Merchant</option>
              {data.capexPurchasedFrom?.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* 5. TO GHAR FIELDS */}
      {type === 'To Ghar' && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Payment For *
              </label>
              <button
                type="button"
                onClick={() => openAddOption('paymentFor', 'Purpose')}
                className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 font-medium"
              >
                <Plus size={14} /> Add Option
              </button>
            </div>
            <select
              value={paymentFor}
              onChange={(e) => setPaymentFor(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            >
              <option value="">Select Purpose</option>
              {data.toGharPaymentFor?.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* 6. INCOME MISC FIELDS */}
      {type === 'Income Misc' && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Income Type *
              </label>
              <button
                type="button"
                onClick={() => openAddOption('incomeType', 'Income Type')}
                className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 font-medium"
              >
                <Plus size={14} /> Add Type
              </button>
            </div>
            <select
              value={incomeType}
              onChange={(e) => setIncomeType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            >
              <option value="">Select Income Type</option>
              {data.incomeTypes?.map((it) => (
                <option key={it} value={it}>
                  {it}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* 7. INVESTMENT FIELDS */}
      {type === 'Investment' && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Investment Type *
              </label>
              <button
                type="button"
                onClick={() => openAddOption('investmentType', 'Investment Type')}
                className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 font-medium"
              >
                <Plus size={14} /> Add Type
              </button>
            </div>
            <select
              value={investmentType}
              onChange={(e) => setInvestmentType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            >
              <option value="">Select Investment Type</option>
              {data.investmentTypes?.map((inv) => (
                <option key={inv} value={inv}>
                  {inv}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* COMMON FIELDS: Payment Mode & Source */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Payment Mode
            </label>
            <button
              type="button"
              onClick={() => openAddOption('paymentMode', 'Payment Mode')}
              className="text-[11px] text-cyan-600 dark:text-cyan-400 flex items-center font-medium"
            >
              <Plus size={12} />
            </button>
          </div>
          <select
            value={paymentMode}
            onChange={(e) => {manualMode.current=true;setPaymentMode(e.target.value);}}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          >
            {data.paymentModes.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {type === 'Income Misc' || type === 'Lent Recovered' ? 'Credited To' : 'Source'}
            </label>
            <button
              type="button"
              onClick={() => openAddOption('account', 'Source / Account')}
              className="text-[11px] text-cyan-600 dark:text-cyan-400 flex items-center font-medium"
            >
              <Plus size={12} />
            </button>
          </div>
          <select
            value={account}
            onChange={(e) => {manualSource.current=true;setAccount(e.target.value);}}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          >
            {eligibleSources.map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DYNAMIC CUSTOM FIELDS (Section M) */}
      <DynamicFields fields={(data.customFields||[]).filter(f=>!f.applicableTypes.length||f.applicableTypes.includes(type))} values={customFieldValues} onChange={handleCustomFieldChange}/>

      {/* Remarks (Section N: Unlimited text, multiline textarea) */}
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
          Remarks (optional)
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          placeholder="Add notes, details, reference numbers..."
          className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        />
      </div>

      {/* Frequent Transaction Suggestion (Section P) */}
      {frequentSuggestion && (
        <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-cyan-800 dark:text-cyan-200 font-medium text-xs mb-1">
            <Sparkles size={14} className="text-cyan-600 dark:text-cyan-400" />
            <span>Frequent Transaction Detected</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            "This looks like a frequent transaction: <strong>{frequentSuggestion}</strong>. Add it to Frequent Transactions?"
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveAsFrequent}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setFrequentSuggestion(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
            >
              Not Now
            </button>
          </div>
        </div>
      )}

      {/* Submit / Action Buttons */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || saved}
          className="w-full py-3.5 rounded-2xl bg-cyan-600 text-white font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20"
        >
          {saved ? (
            <>
              <Check size={20} /> {isEdit ? 'Updated!' : 'Saved!'}
            </>
          ) : isEdit ? (
            'Save Changes'
          ) : (
            'POST / SAVE'
          )}
        </button>

        {!isEdit && (
          <button
            type="button"
            onClick={handleSaveAsFrequent}
            disabled={!isValid || saved}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs active:scale-[0.98] transition-transform border border-slate-200 dark:border-slate-700 disabled:opacity-40"
          >
            Save as Frequent Template
          </button>
        )}
      </div>

      {/* Quick Add Option Sheet */}
      <Sheet open={showAddOption} onClose={() => setShowAddOption(false)} title={`Add ${addOptionLabel}`}>
        <div className="space-y-4">
          <input
            type="text"
            value={newOptionValue}
            onChange={(e) => setNewOptionValue(e.target.value)}
            placeholder={`Enter new ${addOptionLabel.toLowerCase()}`}
            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
            autoFocus
          />
          <button
            type="button"
            onClick={handleConfirmAddOption}
            disabled={!newOptionValue.trim()}
            className="w-full py-3 rounded-xl bg-cyan-600 text-white font-semibold active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            Add & Select
          </button>
        </div>
      </Sheet>
    </div>
  );
}
