import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { FieldConfig } from '@/data/types';
import { Plus, Trash2, ChevronDown, ChevronUp, Edit2, Check, X, GripVertical, Tag, CreditCard, User, FormInput } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { uid } from '@/data/storage';

type SettingsSection = 'categories' | 'accounts' | 'paymentModes' | 'people' | 'formConfig';

export function SettingsScreen() {
  const {
    data,
    addCategory, deleteCategory, updateCategory, addSubCategory, deleteSubCategory,
    addAccount, deleteAccount,
    addPaymentMode, deletePaymentMode,
    addPerson, deletePerson,
    updateFormFields,
  } = useApp();

  const [section, setSection] = useState<SettingsSection | null>(null);

  const sections: { id: SettingsSection; label: string; icon: typeof Tag; count: number }[] = [
    { id: 'categories', label: 'Categories', icon: Tag, count: data.categories.length },
    { id: 'accounts', label: 'Accounts', icon: CreditCard, count: data.accounts.length },
    { id: 'paymentModes', label: 'Payment Modes', icon: CreditCard, count: data.paymentModes.length },
    { id: 'people', label: 'People', icon: User, count: data.people.length },
    { id: 'formConfig', label: 'Form Fields', icon: FormInput, count: data.formFields.length },
  ];

  return (
    <div className="px-4 pt-6 pb-24 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Settings</h1>

      <div className="space-y-2">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className="w-full flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
                  <Icon size={20} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 dark:text-slate-500">{s.count}</span>
                <ChevronDown size={18} className="text-slate-400" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500">Finance Tracker V1 · Offline PWA</p>
      </div>

      {/* Categories section */}
      <Sheet open={section === 'categories'} onClose={() => setSection(null)} title="Categories">
        <CategoriesManager
          categories={data.categories}
          onAddCategory={addCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
          onAddSubCategory={addSubCategory}
          onDeleteSubCategory={deleteSubCategory}
        />
      </Sheet>

      {/* Accounts section */}
      <Sheet open={section === 'accounts'} onClose={() => setSection(null)} title="Accounts">
        <SimpleListManager items={data.accounts} onAdd={addAccount} onDelete={deleteAccount} placeholder="New account name" />
      </Sheet>

      {/* Payment modes section */}
      <Sheet open={section === 'paymentModes'} onClose={() => setSection(null)} title="Payment Modes">
        <SimpleListManager items={data.paymentModes} onAdd={addPaymentMode} onDelete={deletePaymentMode} placeholder="New payment mode" />
      </Sheet>

      {/* People section */}
      <Sheet open={section === 'people'} onClose={() => setSection(null)} title="People">
        <SimpleListManager items={data.people} onAdd={addPerson} onDelete={deletePerson} placeholder="New person name" />
      </Sheet>

      {/* Form config section */}
      <Sheet open={section === 'formConfig'} onClose={() => setSection(null)} title="Form Fields">
        <FormConfigManager fields={data.formFields} onSave={updateFormFields} />
      </Sheet>
    </div>
  );
}

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
  const [newCategory, setNewCategory] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [newSubCat, setNewSubCat] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category"
          className="flex-1 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        />
        <button
          onClick={() => { if (newCategory.trim()) { onAddCategory(newCategory.trim()); setNewCategory(''); } }}
          className="px-3 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium active:scale-95 transition-transform"
        >
          <Plus size={18} />
        </button>
      </div>

      {categories.map((cat) => (
        <div key={cat.name} className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}
                className="text-slate-400"
              >
                {expandedCat === cat.name ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {editingCat === cat.name ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="text"
                    value={editCatName}
                    onChange={(e) => setEditCatName(e.target.value)}
                    className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-sm"
                  />
                  <button onClick={() => { if (editCatName.trim()) { onUpdateCategory(cat.name, editCatName.trim()); setEditingCat(null); } }} className="text-green-600"><Check size={16} /></button>
                  <button onClick={() => setEditingCat(null)} className="text-slate-400"><X size={16} /></button>
                </div>
              ) : (
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{cat.name}</span>
              )}
            </div>
            {editingCat !== cat.name && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setEditingCat(cat.name); setEditCatName(cat.name); }} className="p-1 text-slate-400 hover:text-cyan-600"><Edit2 size={16} /></button>
                <button onClick={() => onDeleteCategory(cat.name)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            )}
          </div>
          {expandedCat === cat.name && (
            <div className="px-3 pb-3 space-y-1.5">
              {cat.subCategories.map((sub) => (
                <div key={sub} className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400">{sub}</span>
                  <button onClick={() => onDeleteSubCategory(cat.name, sub)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
              <div className="flex gap-1.5 mt-2">
                <input
                  type="text"
                  value={newSubCat}
                  onChange={(e) => setNewSubCat(e.target.value)}
                  placeholder="New sub-category"
                  className="flex-1 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
                />
                <button
                  onClick={() => { if (newSubCat.trim()) { onAddSubCategory(cat.name, newSubCat.trim()); setNewSubCat(''); } }}
                  className="px-2 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-medium"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SimpleListManager({ items, onAdd, onDelete, placeholder }: { items: string[]; onAdd: (name: string) => void; onDelete: (name: string) => void; placeholder: string }) {
  const [newItem, setNewItem] = useState('');
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        />
        <button
          onClick={() => { if (newItem.trim()) { onAdd(newItem.trim()); setNewItem(''); } }}
          className="px-3 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium active:scale-95 transition-transform"
        >
          <Plus size={18} />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No items yet.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2.5 border border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
              <button onClick={() => onDelete(item)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormConfigManager({ fields, onSave }: { fields: FieldConfig[]; onSave: (fields: FieldConfig[]) => void }) {
  const [localFields, setLocalFields] = useState<FieldConfig[]>(() => fields.map((f) => ({ ...f })));
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');

  const arr = localFields;

  function moveUp(index: number) {
    if (index === 0) return;
    const newArr = [...localFields];
    const tmpOrder = arr[index].order;
    newArr[index].order = newArr[index - 1].order;
    newArr[index - 1].order = tmpOrder;
    newArr.sort((a, b) => a.order - b.order);
    setLocalFields(newArr);
  }

  function moveDown(index: number) {
    if (index === localFields.length - 1) return;
    const newArr = [...localFields];
    const tmpOrder = arr[index].order;
    newArr[index].order = newArr[index + 1].order;
    newArr[index + 1].order = tmpOrder;
    newArr.sort((a, b) => a.order - b.order);
    setLocalFields(newArr);
  }

  function toggleEnabled(key: string) {
    setLocalFields(localFields.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f));
  }

  function toggleRequired(key: string) {
    setLocalFields(localFields.map((f) => f.key === key ? { ...f, required: !f.required } : f));
  }

  function renameField(key: string) {
    if (!editLabel.trim()) return;
    setLocalFields(localFields.map((f) => f.key === key ? { ...f, label: editLabel.trim() } : f));
    setEditingField(null);
  }

  function addField() {
    if (!newFieldLabel.trim()) return;
    const key = 'custom_' + uid();
    const maxOrder = Math.max(...localFields.map((f) => f.order));
    setLocalFields([...localFields, { key, label: newFieldLabel.trim(), enabled: true, required: false, order: maxOrder + 1, type: 'text' }]);
    setNewFieldLabel('');
  }

  function removeField(key: string) {
    setLocalFields(localFields.filter((f) => f.key !== key));
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Toggle fields on/off, rename them, reorder, and set required fields. Changes apply to the Add Expense form.
      </p>

      {arr.map((field, index) => (
        <div key={field.key} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <GripVertical size={16} className="text-slate-300" />
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveUp(index)} disabled={index === 0} className="text-slate-400 disabled:opacity-30"><ChevronUp size={14} /></button>
              <button onClick={() => moveDown(index)} disabled={index === arr.length - 1} className="text-slate-400 disabled:opacity-30"><ChevronDown size={14} /></button>
            </div>
            {editingField === field.key ? (
              <div className="flex items-center gap-1 flex-1">
                <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-sm" autoFocus />
                <button onClick={() => renameField(field.key)} className="text-green-600"><Check size={16} /></button>
                <button onClick={() => setEditingField(null)} className="text-slate-400"><X size={16} /></button>
              </div>
            ) : (
              <span className={`text-sm font-medium flex-1 ${field.enabled ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}`}>{field.label}</span>
            )}
            {editingField !== field.key && (
              <button onClick={() => { setEditingField(field.key); setEditLabel(field.label); }} className="p-1 text-slate-400 hover:text-cyan-600"><Edit2 size={16} /></button>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 ml-8">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <input type="checkbox" checked={field.enabled} onChange={() => toggleEnabled(field.key)} className="rounded accent-cyan-600" />
              Enabled
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <input type="checkbox" checked={field.required} onChange={() => toggleRequired(field.key)} className="rounded accent-cyan-600" />
              Required
            </label>
            {field.key.startsWith('custom_') && (
              <button onClick={() => removeField(field.key)} className="text-slate-300 hover:text-red-500 ml-auto"><Trash2 size={16} /></button>
            )}
          </div>
        </div>
      ))}

      {/* Add new field */}
      <div className="flex gap-2 pt-2">
        <input
          type="text"
          value={newFieldLabel}
          onChange={(e) => setNewFieldLabel(e.target.value)}
          placeholder="New field name"
          className="flex-1 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        />
        <button onClick={addField} className="px-3 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium active:scale-95 transition-transform">
          <Plus size={18} />
        </button>
      </div>

      <button
        onClick={() => onSave(localFields)}
        className="w-full py-3 rounded-xl bg-cyan-600 text-white font-semibold active:scale-[0.98] transition-transform"
      >
        Save Form Configuration
      </button>
    </div>
  );
}
