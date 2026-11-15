import { Home, ListPlus, Plus, Users, Settings } from 'lucide-react';
export type TabId = 'home' | 'transactions' | 'add' | 'recover' | 'settings';
interface NavProps { active: TabId; onChange: (tab: TabId) => void; }
const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'transactions', label: 'Transactions', icon: ListPlus },
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'recover', label: 'Recover', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;
export function BottomNav({ active, onChange }: NavProps) {
  return <nav className="app-navigation" aria-label="Main navigation"><div>
    {tabs.map(({id,label,icon:Icon}) => <button key={id} onClick={()=>onChange(id)} aria-current={active===id?'page':undefined} className={id==='add'?'navigation-add':undefined}>
      <span className="navigation-icon"><Icon size={22} aria-hidden="true"/></span><span>{label}</span>
    </button>)}
  </div></nav>;
}
