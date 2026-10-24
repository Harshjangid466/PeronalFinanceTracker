import {useState} from 'react';
import {Plus,Users,Repeat,ChevronRight,MoreHorizontal,Wallet} from 'lucide-react';
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
 const [homeSection,setHomeSection]=useState('overview');
 const [activeFormType,setActiveFormType]=useState<TransactionType|null>(null),[editing,setEditing]=useState<Transaction|null>(null),[quickOpen,setQuickOpen]=useState(false);
 const recent=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,3);
 return <main className="premium-home max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-6">
  <header className="home-app-header"><span className="home-brand"><Wallet size={20} strokeWidth={1.6}/>Finance</span><nav aria-label="Dashboard actions"><button className="home-new-entry" onClick={()=>setQuickOpen(true)}><Plus size={17}/>New entry</button><details className="home-more"><summary aria-label="More home actions"><MoreHorizontal size={21}/></summary><div><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');onNavigate('recover');}}><Users size={16}/>Ledgers</button><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');onNavigate('recurring');}}><Repeat size={16}/>Recurring</button></div></details></nav></header>
  <AnalyticsDashboard onEdit={setEditing} onSectionChange={setHomeSection}/>
  {homeSection==='overview'&&<section aria-label="Recent transactions" className="home-recent"><div className="flex items-center justify-between mb-3"><h2 className="font-semibold">Recent transactions</h2><button className="text-xs text-cyan-600 flex items-center" onClick={()=>onNavigate('transactions')}>View all<ChevronRight size={14}/></button></div>{recent.length?recent.map(t=><button key={t.id} className="flex items-center justify-between gap-4 w-full py-3 border-b last:border-0 border-slate-100 dark:border-slate-800 text-left" onClick={()=>setEditing(t)}><span className="min-w-0"><b className="block text-sm truncate">{t.heading||t.majorCategory||t.type}</b><small className="text-slate-500 dark:text-slate-400">{formatDateShort(t.date)} · {t.type} · {t.account||t.paymentMode}</small></span><strong className="text-sm whitespace-nowrap">{formatCurrency(t.amountMinor/100)}</strong></button>):<div className="text-sm text-slate-500 py-5">No entries yet. <button className="text-cyan-600 underline" onClick={()=>setActiveFormType('Revenue Expense')}>Add your first expense</button>.</div>}</section>}
  {homeSection==='overview'&&<details className="home-shortcuts"><summary>Suggested entry shortcuts</summary><div className="mt-3"><FrequentSuggestions/></div></details>}
  <Sheet open={quickOpen} onClose={()=>setQuickOpen(false)} title="New entry"><div className="space-y-2">{CORE_TRANSACTION_TYPES.map(type=><button key={type} className="block w-full rounded-xl p-4 text-left bg-slate-50 dark:bg-slate-800" onClick={()=>{setQuickOpen(false);setActiveFormType(type);}}>{type}</button>)}</div></Sheet>
  <Sheet open={!!activeFormType} onClose={()=>setActiveFormType(null)} title={`New ${activeFormType||'entry'}`}>{activeFormType&&<TransactionForm initialType={activeFormType} isModal onSuccess={()=>setActiveFormType(null)} onClose={()=>setActiveFormType(null)}/>}</Sheet>
  <Sheet open={!!editing} onClose={()=>setEditing(null)} title={`Edit ${editing?.type||'Transaction'}`}>{editing&&<TransactionForm editTransaction={editing} isModal onSuccess={()=>setEditing(null)} onClose={()=>setEditing(null)}/>}</Sheet>
 </main>;
}
