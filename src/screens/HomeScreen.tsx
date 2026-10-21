import {useState} from 'react';
import {Plus,Users,Repeat,ChevronRight} from 'lucide-react';
import {useApp} from '@/context/AppContext';
import {CORE_TRANSACTION_TYPES,type Transaction,type TransactionType} from '@/data/types';
import {formatCurrency,formatDateShort} from '@/data/format';
import {AnalyticsDashboard} from '@/components/AnalyticsDashboard';
import {FrequentSuggestions} from '@/components/FrequentSuggestions';
import {Sheet} from '@/components/Sheet';
import {TransactionForm} from '@/components/TransactionForm';

type NavTarget='home'|'transactions'|'add'|'recover'|'settings'|'recurring';
export function HomeScreen({onNavigate}:{onNavigate:(tab:NavTarget)=>void}){
 const {data}=useApp();
 const [activeFormType,setActiveFormType]=useState<TransactionType|null>(null),[editing,setEditing]=useState<Transaction|null>(null),[quickOpen,setQuickOpen]=useState(false);
 const recent=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,6);
 return <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-6">
  <header className="flex flex-wrap items-center justify-between gap-3 text-xs"><span className="font-bold text-slate-500 dark:text-slate-400">Finance Tracker</span><nav aria-label="Dashboard actions" className="flex items-center gap-4"><button className="flex items-center gap-1 text-cyan-700 dark:text-cyan-300" onClick={()=>onNavigate('recover')}><Users size={14}/>Ledgers</button><button className="flex items-center gap-1 text-cyan-700 dark:text-cyan-300" onClick={()=>onNavigate('recurring')}><Repeat size={14}/>Recurring</button><button className="flex items-center gap-1 bg-cyan-600 text-white px-3 py-2 rounded-lg" onClick={()=>setQuickOpen(true)}><Plus size={15}/>New entry</button></nav></header>
  <AnalyticsDashboard onEdit={setEditing}/>
  <details className="text-sm text-slate-600 dark:text-slate-300"><summary className="cursor-pointer">Suggested entry shortcuts</summary><div className="mt-3"><FrequentSuggestions/></div></details>
  <section aria-label="Recent transactions" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5"><div className="flex items-center justify-between mb-3"><h2 className="font-semibold">Recent transactions</h2><button className="text-xs text-cyan-600 flex items-center" onClick={()=>onNavigate('transactions')}>View all<ChevronRight size={14}/></button></div>{recent.length?recent.map(t=><button key={t.id} className="flex items-center justify-between gap-4 w-full py-3 border-b last:border-0 border-slate-100 dark:border-slate-800 text-left" onClick={()=>setEditing(t)}><span className="min-w-0"><b className="block text-sm truncate">{t.heading||t.majorCategory||t.type}</b><small className="text-slate-500 dark:text-slate-400">{formatDateShort(t.date)} · {t.type} · {t.account||t.paymentMode}</small></span><strong className="text-sm whitespace-nowrap">{formatCurrency(t.amountMinor/100)}</strong></button>):<div className="text-sm text-slate-500 py-5">No entries yet. <button className="text-cyan-600 underline" onClick={()=>setActiveFormType('Revenue Expense')}>Add your first expense</button>.</div>}</section>
  <Sheet open={quickOpen} onClose={()=>setQuickOpen(false)} title="New entry"><div className="space-y-2">{CORE_TRANSACTION_TYPES.map(type=><button key={type} className="block w-full rounded-xl p-4 text-left bg-slate-50 dark:bg-slate-800" onClick={()=>{setQuickOpen(false);setActiveFormType(type);}}>{type}</button>)}</div></Sheet>
  <Sheet open={!!activeFormType} onClose={()=>setActiveFormType(null)} title={`New ${activeFormType||'entry'}`}>{activeFormType&&<TransactionForm initialType={activeFormType} isModal onSuccess={()=>setActiveFormType(null)} onClose={()=>setActiveFormType(null)}/>}</Sheet>
  <Sheet open={!!editing} onClose={()=>setEditing(null)} title={`Edit ${editing?.type||'Transaction'}`}>{editing&&<TransactionForm editTransaction={editing} isModal onSuccess={()=>setEditing(null)} onClose={()=>setEditing(null)}/>}</Sheet>
 </main>;
}
