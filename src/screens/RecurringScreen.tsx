import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {visibleField} from '@/data/model';
import type { Recurring, Frequency, TransactionType } from '@/data/types';
import { CORE_TRANSACTION_TYPES } from '@/data/types';
import { formatCurrency, formatDate, formatDateShort, daysFromToday, todayISO } from '@/data/format';
import { Plus, Repeat, Trash2, Check, SkipForward, Calendar, Pause, Play, Clock } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import {DynamicFields} from '@/components/DynamicFields';

export function RecurringScreen() {
  const { data, addRecurring, updateRecurring, deleteRecurring, postRecurring, skipRecurring } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [status,setStatus]=useState<Recurring['status']>('Scheduled');
  const [formError,setFormError]=useState('');
  const [editing,setEditing]=useState<string|null>(null);
  const [nextDate,setNextDate]=useState(todayISO());
  const [customValues,setCustomValues]=useState<Record<string,unknown>>({});
  const [person,setPerson]=useState('');
  const [merchant,setMerchant]=useState('');
  const [purpose,setPurpose]=useState('');
  const [income,setIncome]=useState('');
  const [investment,setInvestment]=useState('');

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('Revenue Expense');
  const [majorCategory, setMajorCategory] = useState(data.categories[0]?.name ?? 'Bills & Utilities');
  const [subCategory, setSubCategory] = useState('');
  const [account, setAccount] = useState(data.accounts[0] ?? '');
  const [paymentMode, setPaymentMode] = useState(data.paymentModes[0] ?? 'UPI');
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [customIntervalDays, setCustomIntervalDays] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [automaticPosting, setAutomaticPosting] = useState(true);
  const [remarks, setRemarks] = useState('');

  const subCategories = data.categories.find((c) => c.name === majorCategory)?.subCategories ?? [];

  const upcoming = useMemo(
    () =>
      data.recurring
        .filter((r) => r.status !== 'Cancelled' && r.status !== 'Paused' && r.status !== 'Completed')
        .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
    [data.recurring]
  );

  const allRecurring = useMemo(
    () => [...data.recurring].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
    [data.recurring]
  );

  function resetForm() {
    setDescription('');setStatus('Scheduled');setFormError('');
    setAmount('');
    setType('Revenue Expense');
    setMajorCategory(data.categories[0]?.name ?? 'Bills & Utilities');
    setSubCategory('');
    setAccount(data.accounts[0] ?? '');
    setPaymentMode(data.paymentModes[0] ?? 'UPI');
    setFrequency('Monthly');
    setCustomIntervalDays('');
    setStartDate(todayISO());
    setEndDate('');
    setAutomaticPosting(true);
    setRemarks('');setPerson('');setMerchant('');setPurpose('');setIncome('');setInvestment('');setCustomValues({});
  }

  function handleAdd() {
    const money=Number(amount);const required=data.customFields.filter(f=>f.required&&(!f.applicableTypes.length||f.applicableTypes.includes(type))&&visibleField(f,data.customFields,customValues));
    if (!description.trim() || !Number.isFinite(money)||money<=0||Math.abs(money*100-Math.round(money*100))>1e-6||!Number.isSafeInteger(Math.round(money*100))||nextDate<startDate||(endDate&&endDate<nextDate)||frequency==='Custom'&&(!Number.isInteger(Number(customIntervalDays))||Number(customIntervalDays)<1)) {setFormError('Check the description, amount, dates and interval.');return;}
    if(['Lent','Lent Recovered'].includes(type)&&!person||['Revenue Expense','CAPEX'].includes(type)&&!majorCategory||type==='To Ghar'&&!purpose||type==='Income Misc'&&!income||type==='Investment'&&!investment||required.some(f=>customValues[f.key]===undefined||customValues[f.key]===''||Array.isArray(customValues[f.key])&&!(customValues[f.key] as unknown[]).length)){setFormError('Complete the required fields for this transaction type.');return;}
    const payload = {
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      majorCategory,
      subCategory,
      account,
      paymentMode,
      frequency,
      customIntervalDays: frequency === 'Custom' ? parseInt(customIntervalDays) || 1 : undefined,
      startDate,
      endDate: endDate || undefined,
      automaticPosting,
      remarks: remarks.trim(),
      status,person,purchasedFrom:merchant,paymentFor:purpose,incomeType:income,investmentType:investment,customFields:customValues,
    };
    if(editing)updateRecurring(editing,{...payload,nextDueDate:nextDate});
    else {const created=addRecurring(payload);updateRecurring(created.id,{nextDueDate:nextDate});}
    setEditing(null);
    resetForm();
    setShowAdd(false);
  }

  function togglePause(r: any) {
    const nextStatus = r.status === 'Paused' ? 'Scheduled' : 'Paused';
    updateRecurring(r.id, { status: nextStatus });
  }

  return (
    <div className="px-4 pt-6 pb-28 max-w-md mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recurring</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">EMIs, Subscriptions & Mandates</p>
        </div>
        <button
          onClick={() => {resetForm();setEditing(null);setNextDate(todayISO());setCustomValues({});setShowAdd(true);}}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform"
        >
          <Plus size={16} /> Add EMI / Mandate
        </button>
      </div>

      <p className="text-xs text-slate-500">Automatic posting runs on app opening. Background/server posting is not connected.</p>
      {/* Upcoming Section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className="text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Due Soon ({upcoming.length})
          </h2>
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500">No upcoming recurring mandates scheduled.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.slice(0, 5).map((r) => {
              const days = daysFromToday(r.nextDueDate);
              const isDueToday = days === 0;
              const isOverdue = days < 0;

              return (
                <div
                  key={r.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-700 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-700'
                              : isDueToday
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300'
                          }`}
                        >
                          {isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : `In ${days} days`}
                        </span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {r.description}
                        </p>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Due: {formatDate(r.nextDueDate)} · {r.frequency}
                        {r.automaticPosting ? ' · Auto-post enabled' : ' · Manual'}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {r.majorCategory} · {r.account || r.paymentMode}
                      </p>
                    </div>

                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 shrink-0 ml-2">
                      {formatCurrency(r.amount)}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                    <button
                      onClick={() => postRecurring(r.id)}
                      className="flex-1 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> Post Now
                    </button>
                    <button
                      onClick={() => skipRecurring(r.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1"
                    >
                      <SkipForward size={14} /> Skip
                    </button>
                    <button
                      onClick={() => togglePause(r)}
                      title={r.status === 'Paused' ? 'Resume' : 'Pause'}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs"
                    >
                      {r.status === 'Paused' ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Mandates */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Repeat size={16} className="text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            All Recurring Mandates ({allRecurring.length})
          </h2>
        </div>

        {allRecurring.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No mandates configured.</p>
        ) : (
          <div className="space-y-2">
            {allRecurring.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 group shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {r.description}
                    </p>
                    {r.status === 'Paused' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                        Paused
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatCurrency(r.amount)} · {r.frequency} · Next: {formatDateShort(r.nextDueDate)}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {r.majorCategory} · {r.account}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button onClick={()=>{setEditing(r.id);setStatus(r.status);setDescription(r.description);setAmount(String(r.amount));setType(r.type);setMajorCategory(r.majorCategory);setSubCategory(r.subCategory);setAccount(r.account);setPaymentMode(r.paymentMode);setFrequency(r.frequency);setCustomIntervalDays(String(r.customIntervalDays||''));setStartDate(r.startDate);setNextDate(r.nextDueDate);setEndDate(r.endDate||'');setAutomaticPosting(r.automaticPosting);setRemarks(r.remarks||'');setCustomValues(r.customFields||{});setPerson(r.person||'');setMerchant(r.purchasedFrom||'');setPurpose(r.paymentFor||'');setIncome(r.incomeType||'');setInvestment(r.investmentType||'');setShowAdd(true);}}>Edit</button><span className="text-xs">{r.status}</span>
                  <button
                    onClick={() => togglePause(r)}
                    className="p-1.5 text-slate-400 hover:text-cyan-600"
                  >
                    {r.status === 'Paused' ? <Play size={15} /> : <Pause size={15} />}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this recurring mandate?')) {
                        deleteRecurring(r.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Recurring Sheet */}
      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title={editing?'Edit EMI / Mandate':'New EMI / Mandate'}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Description *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. WiFi Bill, Netflix, House Rent, EMI"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-base font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
              >
                {CORE_TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Frequency *
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
              >
                {(['Weekly', 'Monthly', 'Quarterly', 'Half-yearly', 'Yearly', 'Custom'] as Frequency[]).map(
                  (f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {frequency === 'Custom' && (
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Custom Interval (Days)
              </label>
              <input
                type="number"
                value={customIntervalDays}
                onChange={(e) => setCustomIntervalDays(e.target.value)}
                placeholder="e.g. 15"
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Category
            </label>
            <select
              value={majorCategory}
              onChange={(e) => {
                setMajorCategory(e.target.value);
                setSubCategory('');
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
            >
              {data.categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {subCategories.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Sub-category
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
              >
                <option value="">None</option>
                {subCategories.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Account / Source
              </label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
              >
                {data.accounts.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
              >
                {data.paymentModes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {setStartDate(e.target.value);if(!editing)setNextDate(e.target.value);}}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                End Date (optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none text-xs"
              />
            </div>
          </div>

          <label className="block text-xs">Next due date<input className="w-full border rounded-xl p-2" type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)}/></label>
          {(['Lent','Lent Recovered'].includes(type))&&<label className="block text-xs">Person<input className="w-full border rounded-xl p-2" value={person} onChange={e=>setPerson(e.target.value)}/></label>}
          {type==='CAPEX'&&<label className="block text-xs">Purchased From<input className="w-full border rounded-xl p-2" value={merchant} onChange={e=>setMerchant(e.target.value)}/></label>}
          {type==='To Ghar'&&<label className="block text-xs">Payment For<input className="w-full border rounded-xl p-2" value={purpose} onChange={e=>setPurpose(e.target.value)}/></label>}
          {type==='Income Misc'&&<label className="block text-xs">Income Type<input className="w-full border rounded-xl p-2" value={income} onChange={e=>setIncome(e.target.value)}/></label>}
          {type==='Investment'&&<label className="block text-xs">Investment Type<input className="w-full border rounded-xl p-2" value={investment} onChange={e=>setInvestment(e.target.value)}/></label>}
          <label className="block text-xs">Remarks<textarea className="w-full border rounded-xl p-2" value={remarks} onChange={e=>setRemarks(e.target.value)}/></label>
          <DynamicFields fields={data.customFields.filter(f=>!f.applicableTypes.length||f.applicableTypes.includes(type))} values={customValues} onChange={(key,value)=>setCustomValues({...customValues,[key]:value})}/>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Automatic Posting</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Posts overdue entries when you open the app. Server background posting is not connected.</p>
            </div>
            <button
              type="button"
              onClick={() => setAutomaticPosting(!automaticPosting)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                automaticPosting ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  automaticPosting ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <label className="block text-xs">Status<select className="w-full p-2 rounded-xl border dark:bg-slate-800" value={status} onChange={e=>setStatus(e.target.value as Recurring['status'])}>{['Scheduled','Paused','Completed','Cancelled'].map(value=><option key={value}>{value}</option>)}</select></label>{formError&&<p role="alert" className="text-rose-600 text-xs">{formError}</p>}
          <button
            onClick={handleAdd}
            disabled={!description.trim() || !amount}
            className="w-full py-3 rounded-xl bg-cyan-600 text-white font-semibold text-sm active:scale-95 disabled:opacity-40"
          >
            Save Mandate
          </button>
        </div>
      </Sheet>
    </div>
  );
}
