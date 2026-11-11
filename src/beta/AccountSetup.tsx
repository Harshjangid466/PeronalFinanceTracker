import {useState} from 'react';
import {useApp} from '@/context/AppContext';
import {uid} from '@/data/storage';
import {MastersManager,MappingManager,inputStyle,buttonStyle} from '@/components/ConfigurationTools';
import {clearSheetDraft} from '@/components/NavigationGuard';
import {type MasterItem} from '@/data/model';

const kinds={'Current account':['UPI','Debit Card','Net banking','Bank Transfer'],Bank:['UPI','Debit Card','Net banking','Bank Transfer'],'Credit card':['CC'],Wallet:['Wallet'],Cash:['Cash']};
export function AccountSetup(){
 const {allData,configure}=useApp();
 const [kind,setKind]=useState<keyof typeof kinds>('Bank'),[name,setName]=useState(''),[methods,setMethods]=useState<string[]>(kinds.Bank),[status,setStatus]=useState('');
 const activeMethods=(allData.masters||[]).filter(m=>m.kind==='paymentMode'&&m.active);
 function save(){
  const label=name.trim();if(!label||!activeMethods.some(m=>methods.includes(m.name))){setStatus('Enter an account name and choose at least one way to pay.');return;}
  const existing=allData.masters?.find(m=>m.kind==='source'&&m.name.toLowerCase()===label.toLowerCase());
  if(existing){setStatus('That account already exists. Edit its payment links below.');return;}
  const source:MasterItem={id:uid(),kind:'source',name:label,accountType:kind==='Bank'?'SB':kind==='Current account'?'Current':kind==='Credit card'?'CC':kind,active:true,order:allData.accounts.length,updatedAt:Date.now()};
  const sourceMappings={...allData.sourceMappings};
  for(const method of activeMethods.filter(m=>methods.includes(m.name)))sourceMappings[method.id]=[...new Set([...(sourceMappings[method.id]||[]),source.id])];
  configure({masters:[...(allData.masters||[]),source],sourceMappings});clearSheetDraft();setName('');setStatus(`${label} added with its payment links.`);
 }
 return <div className="space-y-5 text-sm"><p><strong>Account = where the money comes from.</strong> For example, “My bank” or “My credit card”. <strong>Payment method = how you pay</strong>, such as UPI or Credit Card. A credit card account is linked to the Credit Card method here in one step.</p>
 <label className="block">Account type<select aria-label="Account type" className={inputStyle} value={kind} onChange={e=>{const next=e.target.value as keyof typeof kinds;setKind(next);setMethods(kinds[next]);}}>{Object.keys(kinds).map(k=><option key={k}>{k}</option>)}</select></label>
 <label className="block">Account name<input className={inputStyle} maxLength={100} value={name} placeholder={kind==='Credit card'?'My credit card':'My bank'} onChange={e=>setName(e.target.value)}/></label>
 <fieldset data-auto-save><legend className="font-semibold">Ways to pay from this account</legend>{activeMethods.map(m=><label className="flex gap-2 items-center py-2" key={m.id}><input type="checkbox" checked={methods.includes(m.name)} onChange={e=>setMethods(e.target.checked?[...methods,m.name]:methods.filter(v=>v!==m.name))}/>{m.name==='CC'?'Credit Card':m.name}</label>)}</fieldset>
 <button className={buttonStyle} onClick={save}>Add account and link methods</button><p role="status">{status}</p>
 <h3 className="font-bold">Your accounts and payment links</h3><div data-auto-save><MappingManager/></div>
 <details><summary>Edit, rename or remove accounts</summary><MastersManager kind="source"/></details>
 <details><summary>Customise payment methods</summary><MastersManager kind="paymentMode"/></details>
 </div>;
}
