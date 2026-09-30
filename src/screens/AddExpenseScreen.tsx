import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { FieldConfig, TransactionType } from '@/data/types';
import { TRANSACTION_TYPES } from '@/data/types';
import { todayISO, formatCurrency } from '@/data/format';
import { uid } from '@/data/storage';
import { Check, Plus, Zap, X, ChevronDown } from 'lucide-react';
import { Sheet } from '@/components/Sheet';

const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000];

export function AddExpenseScreen() {
  const { data, addTransaction, addQuickExpense, recordQuickExpense, deleteQuickExpense, addFormFieldOption, addCategory, addAccount, addPaymentMode, addPerson } = useApp();

  const enabledFields = useMemo(
    () => data.formFields.filter((f) => f.enabled).sort((a, b) => a.order - b.order),
    [data.formFields]
  );

  const blankForm = useMemo(() => {
    const form: Record<string, string> = {};
    for (const f of data.formFields) {
      if (f.key === 'date') form[f.key] = todayISO();
      else if (f.key === 'type') form[f.key] = 'Expense';
      else form[f.key] = '';
    }
    return form;
  }, [data.formFields]);

  const [form, setForm] = useState<Record<string, string>>(blankForm);
  const [showQuickExpenses, setShowQuickExpenses] = useState(false);
  const [showSaveQuick, setShowSaveQuick] = useState(false);
  const [quickLabel, setQuickLabel] = useState('');
  const [showAddOption, setShowAddOption] = useState(false);
  const [addOptionField, setAddOptionField] = useState<FieldConfig | null>(null);
  const [newOption, setNewOption] = useState('');
  const [saved, setSaved] = useState(false);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function getFieldOptions(field: FieldConfig): string[] {
    switch (field.key) {
      case 'majorCategory':
        return data.categories.map((c) => c.name);
      case 'subCategory':
        return data.categories.find((c) => c.name === form.majorCategory)?.subCategories ?? [];
      case 'paymentMode':
        return data.paymentModes;
      case 'account':
        return data.accounts;
      case 'person':
        return data.people;
      case 'type':
        return TRANSACTION_TYPES;
      default:
        return field.options ?? [];
    }
  }

  function validate(): boolean {
    for (const f of enabledFields) {
      if (f.required && !form[f.key]?.trim()) return false;
    }
    return true;
  }

  function handleSubmit() {
    if (!validate()) return;
    addTransaction({
      type: (form.type as TransactionType) || 'Expense',
      amount: parseFloat(form.amount) || 0,
      date: form.date || todayISO(),
      majorCategory: form.majorCategory || '',
      subCategory: form.subCategory || '',
      paymentMode: form.paymentMode || '',
      account: form.account || '',
      person: form.person || '',
      remarks: form.remarks || '',
    });
    setSaved(true);
    setTimeout(() => {
      setForm(blankForm);
      setSaved(false);
    }, 800);
  }

  function handleSaveAsQuick() {
    setQuickLabel('');
    setShowSaveQuick(true);
  }

  function confirmSaveQuick() {
    if (!quickLabel.trim()) return;
    addQuickExpense({
      label: quickLabel.trim(),
      amount: parseFloat(form.amount) || 0,
      majorCategory: form.majorCategory || '',
      subCategory: form.subCategory || '',
      paymentMode: form.paymentMode || '',
      account: form.account || '',
    });
    setShowSaveQuick(false);
  }

  function openAddOption(field: FieldConfig) {
    setAddOptionField(field);
    setNewOption('');
    setShowAddOption(true);
  }

  function confirmAddOption() {
    if (!addOptionField || !newOption.trim()) return;
    addFormFieldOption(addOptionField.key, newOption.trim());
    // Also add to the underlying data (categories, accounts, etc.)
    if (addOptionField.key === 'majorCategory') {
      addCategory(newOption.trim());
    } else if (addOptionField.key === 'account') {
      addAccount(newOption.trim());
    } else if (addOptionField.key === 'paymentMode') {
      addPaymentMode(newOption.trim());
    } else if (addOptionField.key === 'person') {
      addPerson(newOption.trim());
    }
    setForm((prev) => ({ ...prev, [addOptionField.key]: newOption.trim() }));
    setShowAddOption(false);
  }

  return (
    <div className="px-4 pt-6 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add Expense</h1>
        <button
          onClick={() => setShowQuickExpenses(true)}
          className="flex items-center gap-1 text-sm font-medium text-cyan-600 dark:text-cyan-400"
        >
          <Zap size={16} /> Quick
        </button>
      </div>

      {/* Quick amount buttons */}
      {enabledFields.some((f) => f.key === 'amount') && (
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setField('amount', String(amt))}
                className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm active:scale-95 transition-transform border border-slate-200 dark:border-slate-700"
              >
                {formatCurrency(amt)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-3">
        {enabledFields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={form[field.key] ?? ''}
            onChange={(v) => setField(field.key, v)}
            options={getFieldOptions(field)}
            onAddOption={() => openAddOption(field)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <button
          onClick={handleSubmit}
          disabled={!validate()}
          className="w-full py-4 rounded-2xl bg-cyan-600 text-white font-semibold text-lg active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {saved ? (
            <>
              <Check size={22} /> Saved!
            </>
          ) : (
            'Save Transaction'
          )}
        </button>
        <button
          onClick={handleSaveAsQuick}
          className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm active:scale-[0.98] transition-transform border border-slate-200 dark:border-slate-700"
        >
          Save as Quick Expense
        </button>
      </div>

      {/* Quick expenses sheet */}
      <Sheet open={showQuickExpenses} onClose={() => setShowQuickExpenses(false)} title="Quick Expenses">
        {data.quickExpenses.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
            No quick expenses yet. Fill out a transaction and tap "Save as Quick Expense" to create one.
          </p>
        ) : (
          <div className="space-y-2">
            {data.quickExpenses.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{q.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(q.amount)} · {q.majorCategory}
                    {q.subCategory ? ` → ${q.subCategory}` : ''} · {q.account}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={() => {
                      recordQuickExpense(q.id);
                      setShowQuickExpenses(false);
                      setSaved(true);
                      setTimeout(() => setSaved(false), 800);
                    }}
                    className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform"
                  >
                    Record
                  </button>
                  <button
                    onClick={() => deleteQuickExpense(q.id)}
                    className="p-2 text-slate-400 hover:text-red-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Sheet>

      {/* Save as quick expense sheet */}
      <Sheet open={showSaveQuick} onClose={() => setShowSaveQuick(false)} title="Save Quick Expense">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Label</label>
            <input
              type="text"
              value={quickLabel}
              onChange={(e) => setQuickLabel(e.target.value)}
              placeholder="e.g. Office Lunch"
              className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <p>Amount: {formatCurrency(parseFloat(form.amount) || 0)}</p>
            <p>Category: {form.majorCategory}{form.subCategory ? ` → ${form.subCategory}` : ''}</p>
            <p>Account: {form.account}</p>
          </div>
          <button
            onClick={confirmSaveQuick}
            disabled={!quickLabel.trim()}
            className="w-full py-3 rounded-xl bg-cyan-600 text-white font-semibold active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </Sheet>

      {/* Add option sheet */}
      <Sheet open={showAddOption} onClose={() => setShowAddOption(false)} title={`Add ${addOptionField?.label ?? ''}`}>
        <div className="space-y-4">
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="New option name"
            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
            autoFocus
          />
          <button
            onClick={confirmAddOption}
            disabled={!newOption.trim()}
            className="w-full py-3 rounded-xl bg-cyan-600 text-white font-semibold active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  options,
  onAddOption,
}: {
  field: FieldConfig;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onAddOption: () => void;
}) {
  const [focused, setFocused] = useState(false);

  if (field.type === 'number') {
    return (
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border outline-none focus:ring-2 focus:ring-cyan-500 transition-all ${
            field.key === 'amount' ? 'text-2xl font-bold' : ''
          } ${focused ? 'border-cyan-500' : 'border-slate-200 dark:border-slate-700'}`}
          placeholder="0"
        />
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>
    );
  }

  if (field.type === 'dropdown') {
    return (
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 appearance-none"
          >
            <option value="">Select {field.label}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={onAddOption}
              className="p-1 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded"
            >
              <Plus size={18} />
            </button>
            <ChevronDown size={18} className="text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
    );
  }

  // text
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
        placeholder={`Enter ${field.label.toLowerCase()}`}
      />
    </div>
  );
}
