import type {AppData, CategoryDef, Transaction} from './types';
import type {ImportHabits, StatementRow} from './statements';

export interface MerchantSuggestion {category:string;subcategory:string;reason:string;merchant:string;source:'merchant'|'vendor'|'narration'|'history';}
const normal=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const includes=(text:string,term:string)=>(` ${normal(text)} `).includes(` ${normal(term)} `);
const merchants=[
 {name:"McDonald's",aliases:['mcdonalds','mcdonald s','mc donalds','mc donald s','macdonalds','macdonald s','macd'],category:'Food',subcategory:''},
 {name:'Cult.fit',aliases:['cultfit','cult fit','curefit','cure fit'],category:'Subscriptions',subcategory:'Gym membership'},
 {name:'YouTube',aliases:['youtube','you tube'],category:'Subscriptions',subcategory:'YouTube'},
 {name:'Flipkart',aliases:['flipkart'],category:'Shopping',subcategory:''},
 {name:'Amazon',aliases:['amazon','amzn'],category:'Shopping',subcategory:''},
 {name:'Myntra',aliases:['myntra'],category:'Shopping',subcategory:'Clothing'},
 {name:'Swiggy',aliases:['swiggy'],category:'Food',subcategory:''},
 {name:'Zomato',aliases:['zomato'],category:'Food',subcategory:''},
 {name:'Dominos',aliases:['dominos','domino s'],category:'Food',subcategory:''},
 {name:'KFC',aliases:['kfc'],category:'Food',subcategory:''},
 {name:'Starbucks',aliases:['starbucks'],category:'Food',subcategory:'Coffee'},
 {name:'Netflix',aliases:['netflix'],category:'Subscriptions',subcategory:'OTT'},
 {name:'Burger King',aliases:['burger king'],category:'Food',subcategory:''},
 {name:'Pizza Hut',aliases:['pizza hut'],category:'Food',subcategory:''},
 {name:'Subway',aliases:['subway'],category:'Food',subcategory:''},
 {name:'Blinkit',aliases:['blinkit'],category:'Food',subcategory:'Groceries'},
 {name:'Zepto',aliases:['zepto'],category:'Food',subcategory:'Groceries'},
 {name:'BigBasket',aliases:['bigbasket','big basket'],category:'Food',subcategory:'Groceries'},
 {name:'DMart',aliases:['dmart','d mart'],category:'Food',subcategory:'Groceries'},
 {name:'Uber',aliases:['uber'],category:'Commute',subcategory:'Uber'},
 {name:'Ola',aliases:['ola cabs','olacabs'],category:'Commute',subcategory:'Taxi'},
 {name:'Rapido',aliases:['rapido'],category:'Commute',subcategory:'Rapido'},
 {name:'Indian Oil',aliases:['indian oil','indianoil','iocl'],category:'Commute',subcategory:'Fuel'},
 {name:'Bharat Petroleum',aliases:['bharat petroleum','bpcl'],category:'Commute',subcategory:'Fuel'},
 {name:'Hindustan Petroleum',aliases:['hindustan petroleum','hpcl'],category:'Commute',subcategory:'Fuel'},
 {name:'IRCTC',aliases:['irctc'],category:'Travel/Trip',subcategory:'Trains'},
 {name:'MakeMyTrip',aliases:['makemytrip','make my trip'],category:'Travel/Trip',subcategory:''},
 {name:'Goibibo',aliases:['goibibo'],category:'Travel/Trip',subcategory:''},
 {name:'IndiGo',aliases:['indigo airlines','interglobe aviation'],category:'Travel/Trip',subcategory:'Flights'},
 {name:'Air India',aliases:['air india'],category:'Travel/Trip',subcategory:'Flights'},
 {name:'Nykaa',aliases:['nykaa'],category:'Shopping',subcategory:'Personal care'},
 {name:'Meesho',aliases:['meesho'],category:'Shopping',subcategory:''},
 {name:'Ajio',aliases:['ajio'],category:'Shopping',subcategory:'Clothing'},
 {name:'Decathlon',aliases:['decathlon'],category:'Shopping',subcategory:'Sports'},
 {name:'Croma',aliases:['croma'],category:'Shopping',subcategory:'Electronics'},
 {name:'Reliance Digital',aliases:['reliance digital'],category:'Shopping',subcategory:'Electronics'},
 {name:'Tata 1mg',aliases:['1mg','tata 1mg'],category:'Health',subcategory:'Medicine'},
 {name:'Netmeds',aliases:['netmeds'],category:'Health',subcategory:'Medicine'},
 {name:'PharmEasy',aliases:['pharmeasy'],category:'Health',subcategory:'Medicine'},
 {name:'Apollo Pharmacy',aliases:['apollo pharmacy'],category:'Health',subcategory:'Medicine'},
 {name:'Microsoft 365',aliases:['microsoft 365','msft 365'],category:'Subscriptions',subcategory:'Software'},
 {name:'Adobe',aliases:['adobe'],category:'Subscriptions',subcategory:'Software'},
 {name:'OpenAI',aliases:['openai','chatgpt'],category:'Subscriptions',subcategory:'Software'},
 {name:'Disney Hotstar',aliases:['hotstar','jiohotstar'],category:'Subscriptions',subcategory:'OTT'},
 {name:'SonyLIV',aliases:['sonyliv','sony liv'],category:'Subscriptions',subcategory:'OTT'},
 {name:'Zee5',aliases:['zee5'],category:'Subscriptions',subcategory:'OTT'},
 {name:'BookMyShow',aliases:['bookmyshow'],category:'Entertainment/Internet',subcategory:'Movies'},
 {name:'PVR INOX',aliases:['pvr','inox'],category:'Entertainment/Internet',subcategory:'Movies'},
 {name:'Spotify',aliases:['spotify'],category:'Subscriptions',subcategory:'Music'},
];
const unsafe=/\b(?:failed|refund|reversal|reversed|cashback|cash back|reimburs\w*|lent|loan|transfer|business|partnership|partneship|split|share|repayment|bill payment|payment received|payment thank|to ghar|cash withdrawal|annual fee|joining fee|late fee|finance charge|interest|surcharge|gst)\b/;

// Suggestions never decide a credit's accounting treatment or a subscription's frequency.
export function suggestMerchantCategory(vendor:string,note:string,habits?:ImportHabits,history:Transaction[]=[]):MerchantSuggestion|undefined {
 const text=normal(vendor+' '+note);
 if(unsafe.test(text))return;
 const vendorRules=(habits?.vendors||[]).filter(h=>h.enabled&&normal(h.vendor)&&(h.prefix?normal(vendor).startsWith(normal(h.vendor)):normal(vendor)===normal(h.vendor)));
 const notes=(habits?.narrations||[]).filter(h=>h.enabled&&h.terms.some(t=>normal(t)&&includes(note,t)));
 if([...notes,...vendorRules].some(h=>h.action==='ignore'))return;
 const rules=notes.length?notes:vendorRules;
 if(rules.length){
  if(new Set(rules.map(r=>`${r.category}|${r.subcategory}|${r.action}|${'type' in r?r.type:''}`)).size!==1)return;
  const rule=rules[0];
  if(!rule.category||('type' in rule&&rule.type!=='Revenue Expense'))return;
  return {category:rule.category,subcategory:rule.subcategory,merchant:vendor,source:notes.length?'narration':'vendor',reason:notes.length?'Your narration rule':'Your vendor habit'};
 }
 const genericPayee=/^(?:upi|paytm|razorpay|payu|cashfree|phonepe|google pay|gpay|cred|bbps|online payment|merchant)(?:\s+(?:merchant|payments?|qr|\d+))*$/.test(normal(vendor));
 const previous=genericPayee?[]:history.filter(t=>t.status==='active'&&t.type==='Revenue Expense'&&t.amountMinor>0&&normal(t.heading||t.purchasedFrom||'')===normal(vendor)&&normal(vendor)&&t.majorCategory&&!unsafe.test(normal(t.remarks)));
 if(previous.length){
  const choices=new Set(previous.map(t=>JSON.stringify([t.majorCategory,t.subCategory])));
  if(choices.size!==1)return;
  return {category:previous[0].majorCategory,subcategory:previous[0].subCategory,merchant:vendor,source:'history',reason:'Your previous categories for this payee agree'};
 }
 // Qualified services need their own rules; marketplace identity alone is insufficient.
 if(/\b(?:amazon pay|amazon prime|prime video|amazon web services|aws|swiggy instamart|swiggy dineout)\b/.test(text))return;
 const found=merchants.filter(m=>m.aliases.some(alias=>includes(text,alias)));
 if(found.length>1)return;
 if(!found.length){
  const clues=[
   {terms:/\b(?:restaurant|restaurants|cafe|cafeteria|bakery|bakers|dhaba|pizzeria|diner|biryani|food)\b/,category:'Food',subcategory:''},
   {terms:/\b(?:groceries|grocery|supermarket|supermarkets|vegetables|fruits|kirana)\b/,category:'Food',subcategory:'Groceries'},
   {terms:/\b(?:fuels?|petrol|petroleum|diesel|filling station)\b/,category:'Commute',subcategory:'Fuel'},
   {terms:/\b(?:gym|fitness|yoga|pilates)\b/,category:'Subscriptions',subcategory:'Gym membership'},
   {terms:/\b(?:pharmacy|pharmaceuticals|chemist|medicines?)\b/,category:'Health',subcategory:'Medicine'},
   {terms:/\b(?:hospital|clinic|diagnostic|diagnostics|dental|doctor)\b/,category:'Health',subcategory:'Medical care'},
   {terms:/\b(?:cinema|cinemas|multiplex|movie tickets)\b/,category:'Entertainment/Internet',subcategory:'Movies'},
   {terms:/\b(?:taxi|cab|cabs|rickshaw|metro ticket)\b/,category:'Commute',subcategory:''},
   {terms:/\b(?:hotel|hotels|resort|resorts|homestay)\b/,category:'Travel/Trip',subcategory:'Hotels'},
   {terms:/\b(?:airlines|airways|flight ticket)\b/,category:'Travel/Trip',subcategory:'Flights'},
   {terms:/\b(?:broadband|wifi|wi fi|internet bill)\b/,category:'Bills & Utilities',subcategory:'Internet/Wi-Fi'},
   {terms:/\b(?:electricity|power bill|water bill|piped gas)\b/,category:'Bills & Utilities',subcategory:''},
   {terms:/\b(?:salon|barber|haircut|hair cut)\b/,category:'Personal',subcategory:'Grooming'},
  ].filter(c=>c.terms.test(text));
  if(clues.length!==1)return;
  return {category:clues[0].category,subcategory:clues[0].subcategory,merchant:vendor,source:'narration',reason:'Category clue in payee / narration; check before saving'};
 }
 const m=found[0];
 return {category:m.category,subcategory:m.subcategory,merchant:m.name,source:'merchant',reason:`Recognised ${m.name} in payee / narration`};
}

export function categoryUnavailable(data:Pick<AppData,'masters'>,suggestion:MerchantSuggestion):boolean {
 const parent=data.masters?.find(m=>m.kind==='category'&&normal(m.name)===normal(suggestion.category));
 return !!parent&&!parent.active||!!suggestion.subcategory&&!!data.masters?.some(m=>m.kind==='subCategory'&&m.parentId===parent?.id&&normal(m.name)===normal(suggestion.subcategory)&&!m.active);
}
export function resolveSuggestion(s:MerchantSuggestion,categories:CategoryDef[]):MerchantSuggestion {
 // Beta keeps fuel separate from commuting; use an existing dedicated category.
 if(s.category==='Commute'&&s.subcategory==='Fuel'){const fuel=categories.find(c=>normal(c.name)==='fuel');if(fuel)return {...s,category:fuel.name,subcategory:''};}
 const category=categories.find(c=>normal(c.name)===normal(s.category));
 return {...s,category:category?.name||s.category,subcategory:category?.subCategories.find(n=>normal(n)===normal(s.subcategory))||s.subcategory};
}
export function withSuggestionCategory(categories:CategoryDef[],s:MerchantSuggestion):CategoryDef[]{
 const category=categories.find(c=>c.name===s.category);
 return category?categories.map(c=>c===category?{...c,subCategories:[...new Set([...c.subCategories,...(s.subcategory?[s.subcategory]:[])])]}:c):[...categories,{name:s.category,subCategories:s.subcategory?[s.subcategory]:[]}];
}
export function rememberMerchant(habits:ImportHabits,vendor:string,category:string,subcategory:string):ImportHabits {
 if(!normal(vendor)||!category.trim())throw Error('Enter a payee and choose a category before remembering it.');
 const existing=habits.vendors.find(h=>normal(h.vendor)===normal(vendor));
 const rule={...existing,id:existing?.id||'merchant-'+Date.now(),vendor:vendor.trim(),enabled:true,action:'review' as const,prefix:false,category,subcategory,type:'Revenue Expense' as const,...(existing?.maxAmountMinor===undefined?{}:{maxAmountMinor:existing.maxAmountMinor})};
 return {...habits,vendors:[rule,...habits.vendors.filter(h=>normal(h.vendor)!==normal(vendor))]};
}
export function statementCategorySuggestion(row:StatementRow,data:Pick<AppData,'importHabits'|'categories'|'masters'|'transactions'>):MerchantSuggestion|undefined {
 if(row.direction!=='debit'||row.cardKind&&row.cardKind!=='purchase')return;
 const s=suggestMerchantCategory(row.vendor,row.note,data.importHabits,data.transactions);
 if(!s)return;
 const resolved=resolveSuggestion(s,data.categories);
 return categoryUnavailable(data,resolved)?undefined:resolved;
}

export interface CategoryProposal {id:string;before:string;vendor:string;date:string;amountMinor:number;oldCategory:string;oldSubcategory:string;suggestion:MerchantSuggestion;}
const snapshot=(t:Transaction)=>JSON.stringify(t);
export function historicalCategoryPreview(data:AppData):CategoryProposal[]{
 return data.transactions.filter(t=>t.status==='active'&&t.type==='Revenue Expense'&&t.amountMinor>0&&!data.cardSettlements?.some(g=>g.status==='active'&&(g.replacementId===t.id||g.previousTransactions.some(p=>p.id===t.id)))).flatMap(t=>{
  const sources=(data.statementRows||[]).filter(r=>r.transactionId===t.id);
  if(sources.some(r=>r.direction!=='debit'||r.cardSettlementId||r.cardKind&&r.cardKind!=='purchase'))return [];
  const vendor=sources[0]?.vendor||t.heading||t.purchasedFrom||'';
  const s=suggestMerchantCategory(vendor,[t.remarks,...sources.map(r=>r.note)].join(' '),data.importHabits,data.transactions.filter(h=>h.id!==t.id));
  if(!s)return [];
  const suggestion=resolveSuggestion(s,data.categories);
  if(categoryUnavailable(data,suggestion)||t.majorCategory===suggestion.category&&t.subCategory===suggestion.subcategory)return [];
  return [{id:t.id,before:snapshot(t),vendor,date:t.date,amountMinor:t.amountMinor,oldCategory:t.majorCategory,oldSubcategory:t.subCategory,suggestion}];
 });
}
export function applyCategoryProposals(data:AppData,proposals:CategoryProposal[],now:number):AppData {
 if(!proposals.length||new Set(proposals.map(p=>p.id)).size!==proposals.length)throw Error('Select entries once before applying categories.');
 const fresh=historicalCategoryPreview(data);
 for(const p of proposals){const current=fresh.find(f=>f.id===p.id);if(!current||current.before!==p.before||JSON.stringify(current.suggestion)!==JSON.stringify(p.suggestion))throw Error('An entry or rule changed. Refresh the preview before applying.');}
 let categories=data.categories;
 const transactions=data.transactions.map(t=>{
  const proposal=proposals.find(p=>p.id===t.id);if(!proposal)return t;
  const s=proposal.suggestion;categories=withSuggestionCategory(categories,s);
  const updated={...t,majorCategory:s.category,subCategory:s.subcategory,updatedAt:now};
  delete updated.majorCategoryId;delete updated.subCategoryId;
  return updated;
 });
 return {...data,categories,transactions};
}
