import { useEffect, useState, useRef } from 'react';
import {requestNavigation,setDirty,modalStack,hasUnsavedChanges} from './NavigationGuard';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const [visible, setVisible] = useState(open);
  const id=useRef('sheet_'+Math.random().toString(36).slice(2));
  const closeRef=useRef(onClose);closeRef.current=onClose;
  function requestClose(){requestNavigation(()=>{setDirty(id.current,false);closeRef.current();});}
  useEffect(()=>{
    if(!open)return;
    modalStack.push(id.current);window.history.pushState({...window.history.state,financeModal:id.current},'');
    const back=()=>{if(modalStack[modalStack.length-1]!==id.current)return;if(hasUnsavedChanges()){const previous=window.history.state;window.history.pushState({...previous,financeModal:id.current},'');requestNavigation(()=>{window.history.replaceState(previous,'');setDirty(id.current,false);closeRef.current();});}else requestClose();};
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&modalStack[modalStack.length-1]===id.current){e.preventDefault();requestClose();}};
    window.addEventListener('popstate',back);window.addEventListener('keydown',escape);
    return()=>{setDirty(id.current,false);const index=modalStack.indexOf(id.current);if(index>=0)modalStack.splice(index,1);window.removeEventListener('popstate',back);window.removeEventListener('keydown',escape);if(window.history.state?.financeModal===id.current)window.history.replaceState({financeView:window.history.state?.financeView||'home'},'');};
  },[open]);

  useEffect(() => {
    if (open) setVisible(true);
    else {
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!visible && !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={requestClose}
      />
      <div
        className={`relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl transition-transform duration-200 ${
          open ? 'translate-y-0' : 'translate-y-full sm:translate-y-0 sm:scale-95'
        } max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <button aria-label="Back" onClick={requestClose} className="text-cyan-600 text-xs mr-2">← Back</button>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            onClick={requestClose}
            className="p-2 -mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X size={22} />
          </button>
        </div>
        <div data-finance-sheet={id.current} onChangeCapture={(e)=>{if(!(e.target as HTMLElement).closest('[data-auto-save]')&&(e.target as HTMLElement).closest('[data-finance-sheet]')===e.currentTarget)setDirty(id.current,true);}} className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
      </div>
    </div>
  );
}
