import {useState} from 'react';
import {Search, ChevronRight, X, Database, Tag, Users, Sparkles, SlidersHorizontal, ShieldCheck} from 'lucide-react';
import './SettingsWorkspace.css';

export const settingsGroups = [
  {id:'organize', title:'Accounts & ledgers', description:'Where money moves and who it belongs to.', icon:Users,
    items:[
      {id:'accounts',label:'Accounts & sources',description:'Cash, bank accounts, cards and wallets',keywords:'bank ledger source'},
      {id:'people',label:'People & ledgers',description:'People and businesses you lend to or recover from',keywords:'receivable person contacts'},
      {id:'paymentModes',label:'Payment methods',description:'UPI, cash, cards and other ways to pay',keywords:'payment modes'},
      {id:'mappings',label:'Link methods to accounts',description:'Choose which accounts each payment method offers',keywords:'mapping source payment mode'},
    ]},
  {id:'classify',title:'Categories & labels',description:'Give every entry a useful place.',icon:Tag,
    items:[
      {id:'categories',label:'Categories & subcategories',description:'Organize spending and edit the labels beneath each category',keywords:'sub-category sub category'},
      {id:'incomeTypes',label:'Income types',description:'Salary, interest and other income labels',keywords:'income misc'},
      {id:'investmentTypes',label:'Investment types',description:'Labels for investments and savings',keywords:'investment'},
      {id:'capexMerchants',label:'Purchase merchants',description:'Where you buy assets and larger purchases',keywords:'capex purchased from'},
      {id:'toGharOptions',label:'Household purposes',description:'Labels used for To Ghar entries',keywords:'family to ghar'},
    ]},
  {id:'automate',title:'Habits & rules',description:'Decide what the app suggests and applies.',icon:Sparkles,
    items:[
      {id:'habits',label:'Import habits',description:'Merchant categories, narration, vendors and review limits',keywords:'statement learning auto post timing categorisation older entries'},
      {id:'rules',label:'Entry rules',description:'If / then defaults, conditions and priorities',keywords:'logic locked learned'},
      {id:'recurring',label:'Recurring payments',description:'Scheduled entries, mandates and repeat payments',keywords:'recurring templates'},
    ]},
  {id:'personalize',title:'Entry preferences',description:'Make everyday entry work your way.',icon:SlidersHorizontal,
    items:[
      {id:'quickAmounts',label:'Quick amounts',description:'Shortcuts for amounts you enter often',keywords:'quick expense'},
      {id:'customFields',label:'Fields & dropdowns',description:'Extra questions, options and dependent fields',keywords:'dynamic custom form'},
    ]},
  {id:'protect',title:'Data & history',description:'Keep a copy and understand what changed.',icon:ShieldCheck,
    items:[
      {id:'backupRestore',label:'Backup & restore',description:'Download a JSON copy or merge a saved backup',keywords:'export import local storage'},
      {id:'audit',label:'Change history',description:'Review the action log and recorded changes',keywords:'audit action log'},
    ]},
] as const;

export type SettingsSection = typeof settingsGroups[number]['items'][number]['id'];

export function SettingsDirectory({onOpen,counts,theme,onTheme}:{onOpen:(id:SettingsSection)=>void;counts:Partial<Record<SettingsSection,number>>;theme:'light'|'dark';onTheme:(theme:'light'|'dark')=>void}) {
  const [query,setQuery]=useState('');
  const [group,setGroup]=useState('all');
  const normalized=query.trim().toLowerCase();
  const groups=settingsGroups.map(g=>({...g,items:g.items.filter(item=>(group==='all'||group===g.id)&&(!normalized||`${g.title} ${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(normalized)))})).filter(g=>g.items.length);
  return <div className="settings-workspace">
    <header className="settings-heading"><div><h1>Settings</h1><p>Set up your money, then let your habits do the work.</p></div><span className="settings-local"><Database size={15}/>Local storage</span></header>
    <div className="settings-search"><Search size={20}/><input type="search" aria-label="Search settings" placeholder="Find categories, habits, accounts…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear settings search" onClick={()=>setQuery('')}><X size={18}/></button>}</div>
    <div className="settings-layout">
      <aside className="settings-sidebar"><nav aria-label="Settings groups"><button aria-pressed={group==='all'} onClick={()=>setGroup('all')}>All settings</button>{settingsGroups.map(g=><button key={g.id} aria-pressed={group===g.id} onClick={()=>setGroup(g.id)}><g.icon size={18}/>{g.title}</button>)}</nav>
        <div className="settings-appearance"><h2>Appearance</h2><div role="group" aria-label="Theme">{(['light','dark'] as const).map(t=><button key={t} aria-pressed={theme===t} onClick={()=>onTheme(t)}>{t==='light'?'Light':'Dark'}</button>)}</div></div>
      </aside>
      <main className="settings-directory" aria-label="Settings directory">
        {groups.map(g=><section key={g.id} aria-labelledby={`settings-${g.id}`}><div className="settings-group-heading"><g.icon size={21}/><div><h2 id={`settings-${g.id}`}>{g.title}</h2><p>{g.description}</p></div></div><div className="settings-group-items">{g.items.map(item=><button key={item.id} onClick={()=>onOpen(item.id)}><span><strong>{item.label}</strong><small>{item.description}</small></span><span className="settings-row-end">{counts[item.id]!==undefined&&<span className="settings-count">{counts[item.id]}</span>}<ChevronRight size={18}/></span></button>)}</div></section>)}
        {!groups.length&&<div className="settings-empty"><h2>No settings found</h2><p>Try “categories”, “vendor” or “backup”.</p><button onClick={()=>{setQuery('');setGroup('all');}}>Show all settings</button></div>}
        <footer className="settings-storage-note"><Database size={20}/><div><strong>Your ledger is saved in this browser.</strong><p>Cloud sync is not connected. Keep a manual backup before clearing browser data or changing devices.</p><button onClick={()=>onOpen('backupRestore')}>Open backup & restore</button></div></footer>
      </main>
    </div>
  </div>;
}
