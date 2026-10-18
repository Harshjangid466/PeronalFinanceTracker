import {useState} from 'react';
import {useApp} from '@/context/AppContext';
import {masterFields} from '@/data/model';
import {inputStyle,buttonStyle} from './ConfigurationTools';

const labels={majorCategory:'Category',subCategory:'Subcategory',person:'Person',account:'Account',paymentMode:'Payment mode',purchasedFrom:'Purchased from',paymentFor:'Purpose',incomeType:'Income type',investmentType:'Investment type'};
type Field=keyof typeof labels;
export function StatementReviewSelect({field,value,category='',onChange}:{field:Field;value:string;category?:string;onChange:(value:string)=>void}){
 const app=useApp(),{data,allData}=app;const [adding,setAdding]=useState(false),[name,setName]=useState(''),[error,setError]=useState('');
 const lists:Record<Field,string[]>={majorCategory:data.categories.map(c=>c.name),subCategory:data.categories.find(c=>c.name===category)?.subCategories||[],person:data.people,account:data.accounts,paymentMode:data.paymentModes,purchasedFrom:data.capexPurchasedFrom,paymentFor:data.toGharPaymentFor,incomeType:data.incomeTypes,investmentType:data.investmentTypes};
 const options=[...new Set([...(value?[value]:[]),...lists[field]])],disabled=field==='subCategory'&&!category;
 function add(){try{
  const trimmed=name.trim();if(!trimmed)throw Error('Enter a name.');
  const parent=allData.masters?.find(m=>m.kind==='category'&&m.name===category)?.id;
  if(allData.masters?.some(m=>m.kind===masterFields[field]&&m.name.toLowerCase()===trimmed.toLowerCase()&&!m.active&&(field!=='subCategory'||m.parentId===parent)))throw Error('This value is inactive. Enable it in Settings first.');
  const selected=lists[field].find(n=>n.toLowerCase()===trimmed.toLowerCase())||trimmed;
  if(!lists[field].includes(selected)){
   const adders:Record<Field,(name:string)=>void>={majorCategory:app.addCategory,subCategory:n=>app.addSubCategory(category,n),person:app.addPerson,account:app.addAccount,paymentMode:app.addPaymentMode,purchasedFrom:app.addCapexPurchasedFrom,paymentFor:app.addToGharPaymentFor,incomeType:app.addIncomeType,investmentType:app.addInvestmentType};
   adders[field](selected);
  }
  onChange(selected);setAdding(false);setName('');setError('');
 }catch(e){setError(e instanceof Error?e.message:String(e));}}
 return <div className="space-y-2"><div className="flex items-center justify-between gap-2"><label htmlFor={`statement-review-${field}`}>{labels[field]}</label><button type="button" className="text-cyan-600 text-xs" disabled={disabled} onClick={()=>{setAdding(!adding);setName('');setError('');}}>Add new {labels[field].toLowerCase()}</button></div>
  <select id={`statement-review-${field}`} aria-label={`Review ${field}`} className={inputStyle} disabled={disabled} value={value} onChange={e=>onChange(e.target.value)}><option value="">{disabled?'Choose a category first':`Choose ${labels[field].toLowerCase()}`}</option>{options.map(o=><option key={o}>{o}</option>)}</select>
  {adding&&<div className="flex flex-wrap gap-2"><input aria-label={`New ${labels[field].toLowerCase()}`} className={`${inputStyle} flex-1 min-w-0`} value={name} onChange={e=>setName(e.target.value)} placeholder={`New ${labels[field].toLowerCase()}`}/><button type="button" className={buttonStyle} onClick={add}>Add &amp; select</button></div>}
  {error&&<p role="alert" className="text-rose-600">{error}</p>}
 </div>;
}
