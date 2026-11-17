import {sharedPdfLaunch} from '@/data/sharedPdf';
import {CloudSyncPanel} from '@/components/CloudSyncPanel';
import {AccountGate} from '@/components/AccountGate';
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
import {StorageStatus} from '@/components/StorageStatus';
import {DataRecoveryBoundary} from '@/components/LocalRecovery';

type View = TabId | 'recurring';
function launchView():View{
  if(sharedPdfLaunch)return 'transactions';
  const view=window.location.hash.slice(1);
  return ['home','transactions','add','recover','settings','recurring'].includes(view)?view as View:'home';
}

function AppContent() {
  const [tab, setTab] = useState<View>(launchView);
  const [transactionsSeen,setTransactionsSeen]=useState(()=>launchView()==='transactions');
  const [importRequest,setImportRequest]=useState(0);

  const currentView=useRef<View>(tab);currentView.current=tab;
  function navigate(view: View) {
    requestNavigation(()=>{window.history.pushState({financeView:view},'',`#${view}`);if(view==='transactions')setTransactionsSeen(true);setTab(view);});
  }

  function goBack() {
    navigate('home');
  }
  function navigateHome(view:View|'imports'){
    if(view==='imports')requestNavigation(()=>{window.history.pushState({financeView:'transactions'},'','#transactions');setTransactionsSeen(true);setTab('transactions');setImportRequest(n=>n+1);});
    else navigate(view);
  }

  useEffect(()=>{
    // Allow the bank-capture sign-in callback to be consumed before cleaning the URL.
    if(!window.location.hash.includes('access_token=')&&!new URLSearchParams(window.location.search).has('code'))window.history.replaceState({financeView:currentView.current},'',window.location.pathname+`#${currentView.current}`);
    const back=()=>{if(modalStack.length)return;const previous=window.history.state?.financeView||'home';if(hasUnsavedChanges())window.history.pushState({financeView:currentView.current},'',`#${currentView.current}`);requestNavigation(()=>{window.history.replaceState({financeView:previous},'',`#${previous}`);setTab(previous);});};
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!modalStack.length)requestNavigation(()=>{setTab('home');});};
    window.addEventListener('popstate',back);window.addEventListener('keydown',escape);
    return()=>{window.removeEventListener('popstate',back);window.removeEventListener('keydown',escape);};
  },[]);
  const isRecurring = tab === 'recurring';

  return (
    <div className="app-shell min-h-screen bg-slate-50 dark:bg-slate-950">
      <NavigationGuard />
      <StorageStatus />
      <CloudSyncPanel />
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
          {tab === 'home' && <HomeScreen onNavigate={navigateHome} />}
          {tab === 'add' && <AddExpenseScreen />}
          {tab === 'recover' && <RecoverScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </>
      )}

      {transactionsSeen&&<div hidden={tab!=='transactions'}><TransactionsScreen active={tab==='transactions'} sharedLaunch={sharedPdfLaunch} importRequest={importRequest}/></div>}
      <BottomNav active={isRecurring ? 'home' : tab} onChange={(t) => navigate(t)} />
    </div>
  );
}

export default function App() {
  return (
    <AccountGate><DataRecoveryBoundary><AppProvider>
      <AppContent />
    </AppProvider></DataRecoveryBoundary></AccountGate>
  );
}
