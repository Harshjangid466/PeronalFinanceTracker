import { useState, useRef, useEffect, lazy, Suspense } from 'react';
const ImportHabitsSettings=lazy(()=>import('@/components/ImportHabitsSettings').then(m=>({default:m.ImportHabitsSettings})));
import {clearSheetDraft} from '@/components/NavigationGuard';
import {getTheme, setTheme, type Theme} from '@/data/theme';
import { useApp } from '@/context/AppContext';
import type { CustomFieldDefinition, CustomFieldType, TransactionType } from '@/data/types';
import { CORE_TRANSACTION_TYPES } from '@/data/types';
import {
  Tag,
  CreditCard,
  User,
  FormInput,
  Zap,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Check,
  X,
  Building,
  Home,
  Briefcase,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { MastersManager, MappingManager, RulesManager, AuditViewer, ExtendedFieldsManager } from '@/components/ConfigurationTools';
import { RecurringScreen } from './RecurringScreen';

type SettingsSection =
  | 'categories'
  | 'accounts'
  | 'paymentModes'
  | 'people'
  | 'quickAmounts'
  | 'customFields'
  | 'capexMerchants'
  | 'toGharOptions'
  | 'incomeTypes'
  | 'investmentTypes'
  | 'backupRestore'
  | 'habits' | 'sync' | 'rules' | 'mappings' | 'audit' | 'recurring';

export function SettingsScreen() {
  const [theme, updateTheme] = useState<Theme>(getTheme);
  const {
    data,
    addCategory,
    deleteCategory,
    updateCategory,
    addSubCategory,
    deleteSubCategory,
    addAccount,
    deleteAccount,
    addPaymentMode,
    deletePaymentMode,
    addPerson,
    deletePerson,
    addCapexPurchasedFrom,
    deleteCapexPurchasedFrom,
    addToGharPaymentFor,
    deleteToGharPaymentFor,
    addIncomeType,
    deleteIncomeType,
    addInvestmentType,
    deleteInvestmentType,
    quickAmounts,
    addQuickAmount,
    updateQuickAmount,
    deleteQuickAmount,
    reorderQuickAmounts,
    customFields,
    addCustomField,
    updateCustomField,
    deleteCustomField,
    reorderCustomFields,
    exportBackup,
    restoreBackup,
  } = useApp();

  const [section, setSection] = useState<SettingsSection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(()=>{const editRule=()=>setSection('rules');window.addEventListener('finance-edit-rule',editRule);return()=>window.removeEventListener('finance-edit-rule',editRule);},[]);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  function handleExportFile() {
    const jsonStr = exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (!window.confirm('Merge this backup with your current data? Existing transaction IDs and records will be retained.')) return;
        const res = restoreBackup(content);
        if (res.success) {
          setRestoreStatus(res.message);
        } else {
          setRestoreStatus('Error: ' + res.message);
        }
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  }

  function handleSyncNow() {
    alert('Cloud sync is not connected yet. Your data is stored in this browser. Use Backup & Restore to save a copy.');
  }

  const sections: Array<{
    id: SettingsSection;
    label: string;
    icon: any;
    count?: number | string;
    badge?: string;
  }> = [
    {id:'habits',label:'Statement import habits',icon:Sparkles},
    {id:'rules',label:'Rules & Logic',icon:Sparkles},
    {id:'mappings',label:'Payment Mode → Source mappings',icon:CreditCard},
    {id:'audit',label:'Action Log',icon:FormInput},
    {id:'recurring',label:'Recurring & Mandates',icon:RefreshCw},
    { id: 'quickAmounts', label: 'Quick Amounts', icon: Zap, count: quickAmounts.length },
    { id: 'customFields', label: 'Dynamic Custom Fields', icon: FormInput, count: customFields.length },
    { id: 'categories', label: 'Categories & Sub-categories', icon: Tag, count: data.categories.length },
    { id: 'accounts', label: 'Sources / Accounts', icon: CreditCard, count: data.accounts.length },
    { id: 'paymentModes', label: 'Payment Modes', icon: CreditCard, count: data.paymentModes.length },
    { id: 'people', label: 'People (Receivables)', icon: User, count: data.people.length },
    { id: 'capexMerchants', label: 'CAPEX Merchants', icon: Building, count: data.capexPurchasedFrom?.length || 0 },
    { id: 'toGharOptions', label: 'To Ghar Purposes', icon: Home, count: data.toGharPaymentFor?.length || 0 },
    { id: 'incomeTypes', label: 'Income Misc Types', icon: Briefcase, count: data.incomeTypes?.length || 0 },
    { id: 'investmentTypes', label: 'Investment Types', icon: TrendingUp, count: data.investmentTypes?.length || 0 },
    { id: 'backupRestore', label: 'Backup & Restore', icon: Download, badge: 'v4 JSON' },
    { id: 'sync', label: 'Multi-Device Sync', icon: RefreshCw, badge: 'Offline-Ready' },
  ];

  return (
    <div className="px-4 pt-6 pb-28 max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Customise fields, dropdowns, and backups</p>
      </div>

      <section aria-label="Appearance" className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Theme</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">Choose your preferred appearance.</p>
        <div className="flex gap-2" role="group" aria-label="Theme">
          {(['dark','light'] as const).map(choice => <button key={choice} aria-pressed={theme === choice} onClick={() => {setTheme(choice); updateTheme(choice);}} className={`flex-1 rounded-xl py-2 text-sm font-medium border ${theme === choice ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'}`}>{choice === 'dark' ? 'Dark' : 'Light'}</button>)}
        </div>
      </section>

      {/* Sync Status Banner (Section X) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <RefreshCw size={16} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {syncStatus === 'synced' ? 'Synchronized' : 'Offline Storage Active'}
            </p>
            <p className="text-[11px] text-slate-400">Saved in this browser · Cloud sync not connected</p>
          </div>
        </div>

        <button
          onClick={handleSyncNow}
          disabled={syncStatus === 'syncing'}
          className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50"
        >
          {syncStatus === 'syncing' ? 'Checking...' : syncStatus === 'synced' ? 'Done!' : 'SYNC NOW'}
        </button>
      </div>

      {/* Section List */}
      <div className="space-y-2">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className="w-full flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-700 active:scale-[0.98] transition-all hover:border-cyan-500 text-left shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <Icon size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{s.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                    {s.badge}
                  </span>
                )}
                {s.count !== undefined && (
                  <span className="text-xs font-semibold text-slate-400">{s.count}</span>
                )}
                <ChevronDown size={16} className="text-slate-400" />
              </div>
            </button>
          );
        })}
      </div>

      <Sheet wide open={section==='habits'} onClose={()=>setSection(null)} title="Statement import habits"><Suspense fallback={<p>Opening habits…</p>}><ImportHabitsSettings /></Suspense></Sheet>
      <Sheet open={section==='rules'} onClose={()=>setSection(null)} title="Rules & Logic"><RulesManager /></Sheet>
      <Sheet open={section==='mappings'} onClose={()=>setSection(null)} title="Payment Mode → Source mappings"><MappingManager /></Sheet>
      <Sheet open={section==='audit'} onClose={()=>setSection(null)} title="Action Log"><AuditViewer /></Sheet>
      <Sheet open={section==='recurring'} onClose={()=>setSection(null)} title="Recurring & Mandates"><RecurringScreen /></Sheet>
      {/* Hidden file input for restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 1. QUICK AMOUNTS MANAGER (Section C) */}
      <Sheet open={section === 'quickAmounts'} onClose={() => setSection(null)} title="Quick Amounts Configuration">
        <QuickAmountsManager
          amounts={quickAmounts}
          onAdd={addQuickAmount}
          onUpdate={updateQuickAmount}
          onDelete={deleteQuickAmount}
          onReorder={reorderQuickAmounts}
        />
      </Sheet>

      {/* 2. DYNAMIC CUSTOM FIELDS MANAGER (Section M) */}
      <Sheet open={section === 'customFields'} onClose={() => setSection(null)} title="Custom Fields & Dropdowns">
        <ExtendedFieldsManager />
      </Sheet>

      {/* 3. CATEGORIES & SUBCATEGORIES */}
      <Sheet open={section === 'categories'} onClose={() => setSection(null)} title="Categories & Sub-categories">
        <MastersManager kind="category" />
      </Sheet>

      {/* 4. SOURCES / ACCOUNTS */}
      <Sheet open={section === 'accounts'} onClose={() => setSection(null)} title="Sources / Accounts">
        <MastersManager kind="source" />
      </Sheet>

      {/* 5. PAYMENT MODES */}
      <Sheet open={section === 'paymentModes'} onClose={() => setSection(null)} title="Payment Modes">
        <MastersManager kind="paymentMode" />
      </Sheet>

      {/* 6. PEOPLE */}
      <Sheet open={section === 'people'} onClose={() => setSection(null)} title="People (Ledgers)">
        <MastersManager kind="person" />
      </Sheet>

      {/* 7. CAPEX MERCHANTS */}
      <Sheet open={section === 'capexMerchants'} onClose={() => setSection(null)} title="CAPEX Merchants">
        <MastersManager kind="merchant" />
      </Sheet>

      {/* 8. TO GHAR OPTIONS */}
      <Sheet open={section === 'toGharOptions'} onClose={() => setSection(null)} title="To Ghar Purposes">
        <MastersManager kind="purpose" />
      </Sheet>

      {/* 9. INCOME TYPES */}
      <Sheet open={section === 'incomeTypes'} onClose={() => setSection(null)} title="Income Misc Types">
        <MastersManager kind="incomeType" />
      </Sheet>

      {/* 10. INVESTMENT TYPES */}
      <Sheet open={section === 'investmentTypes'} onClose={() => setSection(null)} title="Investment Types">
        <MastersManager kind="investmentType" />
      </Sheet>

      {/* 11. BACKUP & RESTORE (Section V) */}
      <Sheet open={section === 'backupRestore'} onClose={() => setSection(null)} title="Backup & Restore">
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export your entire financial dataset including all transactions, custom fields, dropdowns, and configurations to a standard versioned JSON file.
          </p>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Export Backup
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Compatible with iCloud Drive, Windows, iOS and iPad.
            </p>
            <button
              onClick={handleExportFile}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform"
            >
              <Download size={16} /> Download Backup (.json)
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Restore from Backup
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Validates schema, preserves IDs, merges without creating duplicate records.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold active:scale-95 transition-transform"
            >
              <Upload size={16} /> Choose Backup File to Restore
            </button>

            {restoreStatus && (
              <p
                className={`text-xs font-medium p-2.5 rounded-lg ${
                  restoreStatus.startsWith('Error')
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                    : 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                }`}
              >
                {restoreStatus}
              </p>
            )}
          </div>
        </div>
      </Sheet>

      {/* 12. MULTI-DEVICE SYNC (Section X) */}
      <Sheet open={section === 'sync'} onClose={() => setSection(null)} title="Multi-Device Cloud Sync">
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            The Personal Finance Tracker works 100% offline-first. Transactions are safely persisted in local browser storage on your device.
          </p>

          <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-800 rounded-2xl p-3.5 space-y-2">
            <h3 className="text-xs font-bold text-cyan-900 dark:text-cyan-200">Sync Architecture</h3>
            <p className="text-[11px] text-cyan-800 dark:text-cyan-300 leading-relaxed">
              Local/Offline Data ↔ Sync Layer ↔ Supabase Cloud ↔ Other Devices (iPhone, iPad, Windows).
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleSyncNow}
              disabled={syncStatus === 'syncing'}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform"
            >
              <RefreshCw size={16} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
              {syncStatus === 'syncing' ? 'Syncing with local storage...' : 'Sync Now'}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENT: QUICK AMOUNTS MANAGER (Section C)
// -------------------------------------------------------------
function QuickAmountsManager({
  amounts,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: {
  amounts: number[];
  onAdd: (amt: number) => void;
  onUpdate: (index: number, amt: number) => void;
  onDelete: (index: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [newAmount, setNewAmount] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Add, edit, delete, or reorder quick amounts. No artificial limit.
      </p>

      {/* Add new amount */}
      <div className="flex gap-2">
        <input
          type="number"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          placeholder="New amount (e.g. 750)"
          className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
        />
        <button
          onClick={() => {
            const val = parseFloat(newAmount);
            if (val > 0) {
              onAdd(val);
              setNewAmount('');
            }
          }}
          className="px-3 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* List */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {amounts.map((amt, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button
                  disabled={idx === 0}
                  onClick={() => onReorder(idx, idx - 1)}
                  className="text-slate-400 disabled:opacity-30"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  disabled={idx === amounts.length - 1}
                  onClick={() => onReorder(idx, idx + 1)}
                  className="text-slate-400 disabled:opacity-30"
                >
                  <ChevronDown size={12} />
                </button>
              </div>

              {editingIndex === idx ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    className="w-24 px-2 py-1 rounded bg-white dark:bg-slate-900 border text-xs"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const v = parseFloat(editVal);
                      if (v > 0) {
                        onUpdate(idx, v);clearSheetDraft();
                        setEditingIndex(null);
                      }
                    }}
                    className="text-green-600"
                  >
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingIndex(null)} className="text-slate-400">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  ₹{amt.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {editingIndex !== idx && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingIndex(idx);
                    setEditVal(String(amt));
                  }}
                  className="p-1 text-slate-400 hover:text-cyan-600"
                >
                  <Edit2 size={14} />
                </button>
                <button onClick={() => onDelete(idx)} className="p-1 text-slate-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENT: DYNAMIC CUSTOM FIELDS MANAGER (Section M)
// -------------------------------------------------------------
function CustomFieldsManager({
  customFields,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: {
  customFields: CustomFieldDefinition[];
  onAdd: (field: Omit<CustomFieldDefinition, 'id'>) => CustomFieldDefinition;
  onUpdate: (id: string, field: Partial<CustomFieldDefinition>) => void;
  onDelete: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CustomFieldType>('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newOptionsStr, setNewOptionsStr] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);

  function handleCreateField() {
    if (!newLabel.trim()) return;
    const options =
      newType === 'dropdown' || newType === 'multiSelect'
        ? newOptionsStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const key = 'cf_' + newLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

    onAdd({
      key,
      label: newLabel.trim(),
      type: newType,
      required: newRequired,
      enabled: true,
      order: customFields.length,
      applicableTypes: selectedTypes,
      options,
    });

    setNewLabel('');
    setNewOptionsStr('');
    setNewRequired(false);
    setSelectedTypes([]);
    setShowAddForm(false);
  }

  function toggleTypeSelection(t: TransactionType) {
    if (selectedTypes.includes(t)) {
      setSelectedTypes(selectedTypes.filter((x) => x !== t));
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Support arbitrary number of custom fields, dropdowns, and sub-questions.
        </p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95 shrink-0"
        >
          <Plus size={14} /> Add Field
        </button>
      </div>

      {/* Add Field Form */}
      {showAddForm && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Create Custom Field
          </h4>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Field Label / Question *
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Project Code, Tax Deductible, Expense Location"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Field Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as CustomFieldType)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs outline-none"
              >
                <option value="text">Text (Single Line)</option>
                <option value="longText">Long Text (Multiline)</option>
                <option value="number">Number</option>
                <option value="decimal">Decimal</option>
                <option value="date">Date</option>
                <option value="dropdown">Dropdown (Select)</option>
                <option value="boolean">Yes / No (Boolean)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="rounded accent-cyan-600"
                />
                Required
              </label>
            </div>
          </div>

          {(newType === 'dropdown' || newType === 'multiSelect') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Dropdown Options (comma separated)
              </label>
              <input
                type="text"
                value={newOptionsStr}
                onChange={(e) => setNewOptionsStr(e.target.value)}
                placeholder="e.g. Option 1, Option 2, Option 3"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Applicable Transaction Types (leave empty for All)
            </label>
            <div className="flex flex-wrap gap-1">
              {CORE_TRANSACTION_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTypeSelection(t)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                    selectedTypes.includes(t)
                      ? 'bg-cyan-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreateField}
              disabled={!newLabel.trim()}
              className="flex-1 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95 disabled:opacity-40"
            >
              Save Field
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Field List */}
      <div className="space-y-2">
        {customFields.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            No dynamic custom fields configured yet. Tap "Add Field" to create one.
          </p>
        ) : (
          customFields.map((cf, idx) => (
            <div
              key={cf.id}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      disabled={idx === 0}
                      onClick={() => onReorder(idx, idx - 1)}
                      className="text-slate-400 disabled:opacity-30"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      disabled={idx === customFields.length - 1}
                      onClick={() => onReorder(idx, idx + 1)}
                      className="text-slate-400 disabled:opacity-30"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {cf.label} {cf.required && <span className="text-rose-500">*</span>}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Type: {cf.type} · Applicable:{' '}
                      {cf.applicableTypes?.length > 0 ? cf.applicableTypes.join(', ') : 'All'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdate(cf.id, { enabled: !cf.enabled })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      cf.enabled ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {cf.enabled ? 'Enabled' : 'Hidden'}
                  </button>
                  <button onClick={() => onDelete(cf.id)} className="p-1 text-slate-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {cf.options && cf.options.length > 0 && (
                <div className="pt-1 border-t border-slate-200 dark:border-slate-700/60">
                  <p className="text-[10px] text-slate-400">Options: {cf.options.join(', ')}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENT: CATEGORIES MANAGER
// -------------------------------------------------------------
function CategoriesManager({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubCategory,
  onDeleteSubCategory,
}: {
  categories: { name: string; subCategories: string[] }[];
  onAddCategory: (name: string) => void;
  onUpdateCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
  onAddSubCategory: (category: string, name: string) => void;
  onDeleteSubCategory: (category: string, name: string) => void;
}) {
  const [newCat, setNewCat] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [newSubCat, setNewSubCat] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="New category name"
          className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
        />
        <button
          onClick={() => {
            if (newCat.trim()) {
              onAddCategory(newCat.trim());
              setNewCat('');
            }
          }}
          className="px-3 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {categories.map((cat) => (
          <div
            key={cat.name}
            className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="flex items-center justify-between p-2.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}
                  className="text-slate-400"
                >
                  {expandedCat === cat.name ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {editingCat === cat.name ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="text"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-white dark:bg-slate-900 border text-xs"
                    />
                    <button
                      onClick={() => {
                        if (editCatName.trim()) {
                          onUpdateCategory(cat.name, editCatName.trim());
                          setEditingCat(null);
                        }
                      }}
                      className="text-green-600"
                    >
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingCat(null)} className="text-slate-400">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {cat.name} ({cat.subCategories.length})
                  </span>
                )}
              </div>

              {editingCat !== cat.name && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingCat(cat.name);
                      setEditCatName(cat.name);
                    }}
                    className="p-1 text-slate-400 hover:text-cyan-600"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => onDeleteCategory(cat.name)} className="p-1 text-slate-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {expandedCat === cat.name && (
              <div className="px-3 pb-3 space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                {cat.subCategories.map((sub) => (
                  <div
                    key={sub}
                    className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-slate-800"
                  >
                    <span className="text-xs text-slate-700 dark:text-slate-300">{sub}</span>
                    <button
                      onClick={() => onDeleteSubCategory(cat.name, sub)}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-1.5 mt-2">
                  <input
                    type="text"
                    value={newSubCat}
                    onChange={(e) => setNewSubCat(e.target.value)}
                    placeholder="New sub-category"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border text-xs"
                  />
                  <button
                    onClick={() => {
                      if (newSubCat.trim()) {
                        onAddSubCategory(cat.name, newSubCat.trim());
                        setNewSubCat('');
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENT: SIMPLE LIST MANAGER (For accounts, modes, people, etc.)
// -------------------------------------------------------------
function SimpleListManager({
  items,
  onAdd,
  onDelete,
  placeholder,
}: {
  items: string[];
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
  placeholder: string;
}) {
  const [newItem, setNewItem] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
        />
        <button
          onClick={() => {
            if (newItem.trim()) {
              onAdd(newItem.trim());
              setNewItem('');
            }
          }}
          className="px-3 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200"
          >
            <span>{item}</span>
            <button onClick={() => onDelete(item)} className="p-1 text-slate-400 hover:text-red-500">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
