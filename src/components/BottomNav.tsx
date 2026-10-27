import { Home, ListPlus, Plus, Users, Settings } from 'lucide-react';

export type TabId = 'home' | 'transactions' | 'add' | 'recover' | 'settings';

interface NavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'transactions', label: 'Transactions', icon: ListPlus },
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'recover', label: 'Recover', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function BottomNav({ active, onChange }: NavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around max-w-md mx-auto h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          if (tab.id === 'add') {
            return (
              <button
                key={tab.id}
                data-tour={tab.id}
                aria-label="Add an entry"
                title="Add an entry"
                onClick={() => onChange(tab.id)}
                className="flex flex-col items-center justify-center -mt-6"
              >
                <div className="w-14 h-14 rounded-full bg-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-600/30 active:scale-95 transition-transform">
                  <Icon size={28} className="text-white" />
                </div>
              </button>
            );
          }
          return (
            <button
              key={tab.id}
              data-tour={tab.id}
              title={tab.label}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                isActive
                  ? 'text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
