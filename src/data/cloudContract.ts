export const AI_MODEL='gpt-5.6-terra';
export const AI_PATH='/api/financial-analysis';
export const MAX_AI_BYTES=60000;
export type FactKind='total'|'category'|'vendor'|'card'|'weekday'|'trend'|'allocation'|'review'|'petty-vendor'|'petty-amount'|'income-trend';
export interface AIFact {id:string;kind:FactKind;label:string;currentMinor:number|null;previousMinor:number|null;count:number;previousCount:number|null;}
export interface AISummary {version:1;currency:'INR';month:string;through:string;comparisonMonth:string;comparisonDays:number;scope:'all accounts'|'one account';incomeBasis:'entered'|'recorded';history:'ready'|'loading'|'error';pettyLimitMinor:number;facts:AIFact[];}
export interface AIInsight {title:string;observation:string;action:string;confidence:'observed'|'tentative';chart:'comparison'|'ranking';factIds:string[];}
export interface AIReport {headline:string;insights:AIInsight[];}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const integer=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&Math.abs(v)<=1e13;
const nullable=(v:unknown)=>v===null||integer(v);
const kinds=['total','category','vendor','card','weekday','trend','allocation','review','petty-vendor','petty-amount','income-trend'];
export function validSummary(v:unknown):v is AISummary{
 if(!object(v)||!exact(v,['version','currency','month','through','comparisonMonth','comparisonDays','scope','incomeBasis','history','pettyLimitMinor','facts']))return false;
 if(v.version!==1||v.currency!=='INR'||typeof v.month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.month)||typeof v.through!=='string'||!/^\d{4}-\d{2}-(0[1-9]|[12]\d|3[01])$/.test(v.through)||!v.through.startsWith(v.month)||typeof v.comparisonMonth!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.comparisonMonth))return false;
 if(!integer(v.comparisonDays)||Number(v.comparisonDays)<0||Number(v.comparisonDays)>31||(typeof v.scope!=='string'||!['all accounts','one account'].includes(v.scope))||(typeof v.incomeBasis!=='string'||!['entered','recorded'].includes(v.incomeBasis))||(typeof v.history!=='string'||!['ready','loading','error'].includes(v.history))||!integer(v.pettyLimitMinor)||Number(v.pettyLimitMinor)<=0)return false;
 if(!Array.isArray(v.facts)||v.facts.length<1||v.facts.length>120)return false;
 const ids=new Set();
 return v.facts.every(f=>{if(!object(f)||!exact(f,['id','kind','label','currentMinor','previousMinor','count','previousCount'])||!text(f.id,12)||!/^f\d+$/.test(f.id)||ids.has(f.id)||(typeof f.kind!=='string'||!kinds.includes(f.kind))||!text(f.label,96)||!nullable(f.currentMinor)||!nullable(f.previousMinor)||!integer(f.count)||Number(f.count)<0||!(f.previousCount===null||integer(f.previousCount)&&Number(f.previousCount)>=0))return false;ids.add(f.id);return true;});
}
export function validReport(v:unknown,summary:AISummary):v is AIReport{
 if(!object(v)||!exact(v,['headline','insights'])||!text(v.headline,100)||!Array.isArray(v.insights)||v.insights.length<1||v.insights.length>5)return false;
 const ids=new Set(summary.facts.map(f=>f.id));
 return v.insights.every(i=>object(i)&&exact(i,['title','observation','action','confidence','chart','factIds'])&&text(i.title,80)&&text(i.observation,240)&&text(i.action,160)&&typeof i.confidence==='string'&&['observed','tentative'].includes(i.confidence)&&typeof i.chart==='string'&&['comparison','ranking'].includes(i.chart)&&Array.isArray(i.factIds)&&i.factIds.length>0&&i.factIds.length<=6&&new Set(i.factIds).size===i.factIds.length&&i.factIds.every(id=>typeof id==='string'&&ids.has(id)));
}
export function reportSchema(summary:AISummary){
 const string={type:'string'};
 return {type:'object',additionalProperties:false,required:['headline','insights'],properties:{headline:{...string,maxLength:100},insights:{type:'array',minItems:1,maxItems:5,items:{type:'object',additionalProperties:false,required:['title','observation','action','confidence','chart','factIds'],properties:{title:{...string,maxLength:80},observation:{...string,maxLength:240},action:{...string,maxLength:160},confidence:{type:'string',enum:['observed','tentative']},chart:{type:'string',enum:['comparison','ranking']},factIds:{type:'array',minItems:1,maxItems:6,items:{type:'string',enum:summary.facts.map(f=>f.id)}}}}}}};
}
