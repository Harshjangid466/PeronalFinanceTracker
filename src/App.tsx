import { useState, useEffect, useRef } from 'react';
import { AppProvider } from '@/context/AppContext';
import { BottomNav, type TabId } from '@/components/BottomNav';
import { HomeScreen } from '@/screens/HomeScreen';
import { AddExpenseScreen } from '@/screens/AddExpenseScreen';
import { TransactionsScreen } from '@/screens/TransactionsScreen';
import { RecoverScreen } from '@/screens/RecoverScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { RecurringScreen } from '@/screens/RecurringScreen';
import {NavigationGuard,requestNavigation,modalStack,hasUnsavedChanges} from '@/components/NavigationGuard';
import { ChevronLeft } from 'lucide-react';

type View = TabId | 'recurring';

function AppContent() {
  const [tab, setTab] = useState<View>('home');

  const currentView=useRef<View>(tab);currentView.current=tab;
  function navigate(view: View) {
    requestNavigation(()=>{window.history.pushState({financeView:view},'',`#${view}`);setTab(view);});
  }

  function goBack() {
    navigate('home');
  }

  useEffect(()=>{
    // Allow the bank-capture sign-in callback to be consumed before cleaning the URL.
    if(!window.location.hash.includes('access_token=')&&!new URLSearchParams(window.location.search).has('code'))window.history.replaceState({financeView:'home'},'',window.location.pathname);
    const back=()=>{if(modalStack.length)return;const previous=window.history.state?.financeView||'home';if(hasUnsavedChanges())window.history.pushState({financeView:currentView.current},'',`#${currentView.current}`);requestNavigation(()=>{window.history.replaceState({financeView:previous},'',`#${previous}`);setTab(previous);});};
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!modalStack.length)requestNavigation(()=>{setTab('home');});};
    window.addEventListener('popstate',back);window.addEventListener('keydown',escape);
    return()=>{window.removeEventListener('popstate',back);window.removeEventListener('keydown',escape);};
  },[]);
  const isRecurring = tab === 'recurring';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <NavigationGuard />
      {tab!=='home'&&!isRecurring&&<div className="max-w-md mx-auto px-4 pt-3"><button className="text-xs text-cyan-600" onClick={goBack}>← Back</button></div>}
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
