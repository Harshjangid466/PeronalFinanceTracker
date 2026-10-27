import {useApp} from '@/context/AppContext';
import {categoryUnavailable,resolveSuggestion,type MerchantSuggestion} from '@/data/merchantCategories';
import {buttonStyle} from './ConfigurationTools';

export function MerchantSuggestionCard({suggestion,category,subcategory,onApply}:{suggestion?:MerchantSuggestion;category:string;subcategory:string;onApply:(s:MerchantSuggestion)=>void}){
 const {data,addCategory,addSubCategory}=useApp();
 if(!suggestion||categoryUnavailable(data,suggestion))return null;
 const s=resolveSuggestion(suggestion,data.categories),existing=data.categories.find(c=>c.name===s.category);
 const missing=!existing||!!s.subcategory&&!existing.subCategories.includes(s.subcategory);
 const selected=category===s.category&&subcategory===s.subcategory&&!missing;
 return <div aria-label="Merchant category suggestion" className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-slate-800 p-3 space-y-2 text-sm">
  <p className="font-semibold">Suggested category: {s.category}{s.subcategory?` / ${s.subcategory}`:''}</p>
  <p className="text-xs text-slate-600 dark:text-slate-300">{s.reason}. Check the purpose of this payment before saving.</p>
  <button type="button" className={buttonStyle} disabled={selected} onClick={()=>{if(!existing)addCategory(s.category);if(s.subcategory&&!existing?.subCategories.includes(s.subcategory))addSubCategory(s.category,s.subcategory);onApply(s);}}>{selected?'Category selected':missing?'Add category & use suggestion':'Use suggested category'}</button>
 </div>;
}
