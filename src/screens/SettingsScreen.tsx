import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import {clearSheetDraft} from '@/components/NavigationGuard';
const ImportHabitsSettings=lazy(()=>import('@/components/ImportHabitsSettings').then(m=>({default:m.ImportHabitsSettings})));
import {getTheme, setTheme, type Theme} from '@/data/theme';
import { useApp } from '@/context/AppContext';
import {Download, Upload, Plus, Trash2, Edit2, ChevronDown, ChevronUp, Check, X} from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { MastersManager, MappingManager, RulesManager, AuditViewer, ExtendedFieldsManager } from '@/components/ConfigurationTools';
import { RecurringScreen } from './RecurringScreen';
import {SettingsDirectory, type SettingsSection} from '@/components/SettingsDirectory';

export function SettingsScreen({initialSection,editorOnly=false,onEditorClose}:{initialSection?:SettingsSection;editorOnly?:boolean;onEditorClose?:()=>void}) {
  const [theme, updateTheme] = useState<Theme>(getTheme);
  const {
    data,
    quickAmounts,
    addQuickAmount,
    updateQuickAmount,
    deleteQuickAmount,
    reorderQuickAmounts,
    customFields,
    exportBackup,
    restoreBackup,
  } = useApp();

  const [section, setSection] = useState<SettingsSection | null>(initialSection||null);
  useEffect(()=>{if(initialSection)setSection(initialSection);},[initialSection]);
  function closeSection(){setSection(null);onEditorClose?.();}
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(()=>{const editRule=()=>setSection('rules');window.addEventListener('finance-edit-rule',editRule);return()=>window.removeEventListener('finance-edit-rule',editRule);},[]);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);


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

  return (
    <div>
      {!editorOnly&&<><div className="max-w-5xl mx-auto px-5 pt-5"><button className="text-cyan-600 underline min-h-11" onClick={()=>window.dispatchEvent(new Event('beta-open-guide'))}>New here? Open the setup guide</button></div>
      <SettingsDirectory theme={theme} onTheme={choice=>{setTheme(choice);updateTheme(choice);}} onOpen={setSection} counts={{accounts:data.accounts.length,people:data.people.length,paymentModes:data.paymentModes.length,categories:data.categories.length,rules:data.rules.length,quickAmounts:quickAmounts.length,customFields:customFields.length,recurring:data.recurring.length}} /></>}
      <div className="settings-editor">
      <Sheet wide open={section==='habits'} onClose={closeSection} title="Statement import habits"><Suspense fallback={<p>Opening habits…</p>}><ImportHabitsSettings /></Suspense></Sheet>
      <Sheet wide open={section==='rules'} onClose={closeSection} title="Entry rules"><RulesManager /></Sheet>
      <Sheet wide open={section==='mappings'} onClose={closeSection} title="Link methods to accounts"><MappingManager /></Sheet>
      <Sheet wide open={section==='audit'} onClose={closeSection} title="Change history"><AuditViewer /></Sheet>
      <Sheet wide open={section==='recurring'} onClose={closeSection} title="Recurring & Mandates"><RecurringScreen /></Sheet>
      {/* Hidden file input for restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 1. QUICK AMOUNTS MANAGER (Section C) */}
      <Sheet wide open={section === 'quickAmounts'} onClose={closeSection} title="Quick Amounts Configuration">
        <QuickAmountsManager
          amounts={quickAmounts}
          onAdd={addQuickAmount}
          onUpdate={updateQuickAmount}
          onDelete={deleteQuickAmount}
          onReorder={reorderQuickAmounts}
        />
      </Sheet>

      {/* 2. DYNAMIC CUSTOM FIELDS MANAGER (Section M) */}
      <Sheet wide open={section === 'customFields'} onClose={closeSection} title="Custom Fields & Dropdowns">
        <ExtendedFieldsManager />
      </Sheet>

      {/* 3. CATEGORIES & SUBCATEGORIES */}
      <Sheet wide open={section === 'categories'} onClose={closeSection} title="Categories & Sub-categories">
        <MastersManager kind="category" />
      </Sheet>

      {/* 4. SOURCES / ACCOUNTS */}
      <Sheet wide open={section === 'accounts'} onClose={closeSection} title="Accounts & sources">
        <MastersManager kind="source" />
      </Sheet>

      {/* 5. PAYMENT MODES */}
      <Sheet wide open={section === 'paymentModes'} onClose={closeSection} title="Payment Modes">
        <MastersManager kind="paymentMode" />
      </Sheet>

      {/* 6. PEOPLE */}
      <Sheet wide open={section === 'people'} onClose={closeSection} title="People (Ledgers)">
        <MastersManager kind="person" />
      </Sheet>

      {/* 7. CAPEX MERCHANTS */}
      <Sheet wide open={section === 'capexMerchants'} onClose={closeSection} title="CAPEX Merchants">
        <MastersManager kind="merchant" />
      </Sheet>

      {/* 8. TO GHAR OPTIONS */}
      <Sheet wide open={section === 'toGharOptions'} onClose={closeSection} title="To Ghar Purposes">
        <MastersManager kind="purpose" />
      </Sheet>

      {/* 9. INCOME TYPES */}
      <Sheet wide open={section === 'incomeTypes'} onClose={closeSection} title="Income Misc Types">
        <MastersManager kind="incomeType" />
      </Sheet>

      {/* 10. INVESTMENT TYPES */}
      <Sheet wide open={section === 'investmentTypes'} onClose={closeSection} title="Investment Types">
        <MastersManager kind="investmentType" />
      </Sheet>

      {/* 11. BACKUP & RESTORE (Section V) */}
      <Sheet wide open={section === 'backupRestore'} onClose={closeSection} title="Backup & Restore">
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

      </div>
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
