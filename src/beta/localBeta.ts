import {BETA_VERSION} from './config';

const key='finance-beta-profile-v1';
export interface BetaProfile {welcomed:boolean;nickname:string;email:string;goal:string;completed:string[];tourSeen?:boolean}
const blank:BetaProfile={welcomed:false,nickname:'',email:'',goal:'',completed:[]};
export function readProfile():BetaProfile {
  try {const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'?{welcomed:value.welcomed===true,tourSeen:value.tourSeen===true,nickname:typeof value.nickname==='string'?value.nickname:'',email:typeof value.email==='string'?value.email:'',goal:typeof value.goal==='string'?value.goal:'',completed:Array.isArray(value.completed)?value.completed.filter((v:unknown)=>typeof v==='string'):[]}:blank;}catch{return blank;}
}
export function saveProfile(profile:BetaProfile){localStorage.setItem(key,JSON.stringify(profile));}

const usageKey='finance-beta-usage-v1';
const screens=['home','transactions','add','recover','settings','recurring','feedback'];
const actions=['import','backup','restore','entry-created'];
interface Day {seconds:number;sessions:number;features:Record<string,number>}
type Usage=Record<string,Day>;
function dateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function lastSeven(){return Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return dateKey(d);});}
function readUsage():Usage {
  try {
    const raw=JSON.parse(localStorage.getItem(usageKey)||'{}'),result:Usage={};
    const count=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>=0?Number(value):0;
    for(const date of lastSeven()){
      const day=raw?.[date];if(!day||typeof day!=='object')continue;
      const features:Record<string,number>={};
      for(const label of [...screens.map(v=>`screen:${v}`),...actions.map(v=>`action:${v}`)])if(day.features?.[label])features[label]=count(day.features[label]);
      result[date]={seconds:count(day.seconds),sessions:count(day.sessions),features};
    }
    return result;
  }catch{return {};}
}
export function countUsage(kind:'session'|'screen'|'action'|'time',value='',seconds=0){
  if(kind==='screen'&&!screens.includes(value)||kind==='action'&&!actions.includes(value))return;
  const old=readUsage(),usage:Usage={};for(const day of lastSeven())if(old[day])usage[day]=old[day];
  const day=usage[dateKey()]||{seconds:0,sessions:0,features:{}};
  if(kind==='session')day.sessions++;
  if(kind==='time')day.seconds+=Math.max(0,Math.min(15,seconds));
  if(kind==='screen'||kind==='action') {const label=`${kind}:${value}`;day.features[label]=(day.features[label]||0)+1;}
  usage[dateKey()]=day;try{localStorage.setItem(usageKey,JSON.stringify(usage));}catch{/* Optional counters must not interrupt financial work. */}
}
export function usageSummary(){
  const saved=readUsage(),days=lastSeven().map(k=>saved[k]).filter(Boolean),features:Record<string,number>={};
  for(const day of days)for(const [name,count]of Object.entries(day.features))features[name]=(features[name]||0)+count;
  return {period:'Last 7 days',activeDays:days.length,sessions:days.reduce((n,d)=>n+d.sessions,0),approximateActiveMinutes:Math.round(days.reduce((n,d)=>n+d.seconds,0)/60),features};
}
export function buildFeedback(input:{kind:string;message:string;expected:string;includeContact:boolean;includeUsage:boolean},profile:BetaProfile){
  // Deliberate allowlist: never accept app state, logs, URLs or financial records here.
  return JSON.stringify({betaVersion:BETA_VERSION,kind:input.kind,message:input.message,expected:input.expected,...(input.includeContact?{contact:{nickname:profile.nickname,email:profile.email}}:{}),...(input.includeUsage?{usage:usageSummary()}:{} )},null,2);
}
export function clearUsage(){localStorage.removeItem(usageKey);}
