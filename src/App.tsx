import { useState } from 'react';
import { AppProvider } from '@/context/AppContext';
import { BottomNav, type TabId } from '@/components/BottomNav';
import { HomeScreen } from '@/screens/HomeScreen';
import { AddExpenseScreen } from '@/screens/AddExpenseScreen';
import { TransactionsScreen } from '@/screens/TransactionsScreen';
import { RecoverScreen } from '@/screens/RecoverScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { RecurringScreen } from '@/screens/RecurringScreen';
import { ChevronLeft } from 'lucide-react';

type View = TabId | 'recurring';

function AppContent() {
  const [tab, setTab] = useState<View>('home');

  function navigate(view: View) {
    setTab(view);
  }

  function goBack() {
    setTab('home');
  }

  const isRecurring = tab === 'recurring';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {isRecurring ? (
        <div>
          <div className="flex items-center gap-2 px-4 pt-4">
            <button onClick={goBack} className="flex items-center gap-1 text-sm font-medium text-cyan-600 dark:text-cyan-400">
              <ChevronLeft size={20} /> Back
            </button>
          </div>
          <RecurringScreen />
        </div>
      ) : (
        <>
          {tab === 'home' && <HomeScreen onNavigate={navigate} />}
          {tab === 'transactions' && <TransactionsScreen />}
          {tab === 'add' && <AddExpenseScreen />}
          {tab === 'recover' && <RecoverScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </>
      )}

      <BottomNav active={isRecurring ? 'home' : tab} onChange={(t) => navigate(t)} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
