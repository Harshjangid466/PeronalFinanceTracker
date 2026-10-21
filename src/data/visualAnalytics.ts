import type {Transaction} from './types';
import {sumMinor} from './dashboardAnalytics';

export interface WaterfallInput {key:string;label:string;valueMinor:number;rows:Transaction[];total?:boolean;}
export function waterfallSteps(inputs:WaterfallInput[]){
 let running=0;
 const steps=inputs.map(input=>{const from=input.total?0:running,to=input.total?input.valueMinor:running+input.valueMinor;running=to;return {...input,fromMinor:from,toMinor:to};});
 const min=Math.min(0,...steps.flatMap(s=>[s.fromMinor,s.toMinor])),max=Math.max(0,...steps.flatMap(s=>[s.fromMinor,s.toMinor]));
 return {steps,min,max,range:Math.max(1,max-min)};
}
export interface WeightedTile {key:string;label:string;account:string;amountMinor:number;rows:Transaction[];}
export function treemapTiles(items:WeightedTile[]){
 const positive=items.filter(i=>i.amountMinor>0).sort((a,b)=>b.amountMinor-a.amountMinor||a.key.localeCompare(b.key));
 const result:(WeightedTile&{x:number;y:number;width:number;height:number})[]=[];
 function split(group:WeightedTile[],x:number,y:number,width:number,height:number){
  if(!group.length)return;if(group.length===1){result.push({...group[0],x,y,width,height});return;}
  const total=group.reduce((n,i)=>n+i.amountMinor,0);let left=0,index=0;while(index<group.length-1&&(left<total/2||index===0)){left+=group[index].amountMinor;index++;}
  const ratio=left/total;
  if(width>=height){split(group.slice(0,index),x,y,width*ratio,height);split(group.slice(index),x+width*ratio,y,width*(1-ratio),height);}
  else{split(group.slice(0,index),x,y,width,height*ratio);split(group.slice(index),x,y+height*ratio,width,height*(1-ratio));}
 }
 split(positive,0,0,100,100);return result;
}
export function cardCategoryTiles(rows:Transaction[]){
 const groups=new Map<string,WeightedTile>();for(const t of rows){const key=JSON.stringify([t.account,t.majorCategory||'Uncategorised']),g=groups.get(key)||{key,label:t.majorCategory||'Uncategorised',account:t.account||'No account',amountMinor:0,rows:[]};g.amountMinor+=t.amountMinor;g.rows.push(t);groups.set(key,g);}return treemapTiles([...groups.values()]);
}
export function pettyBubbles(rows:Transaction[]){
 const limits=[2500,5000,10000,20000,50000],groups=new Map<string,{key:string;day:number;band:number;amountMinor:number;rows:Transaction[]}>();
 for(const t of rows){const band=limits.findIndex(n=>t.amountMinor<=n);if(band<0)continue;const day=Number(t.date.slice(8)),key=day+':'+band,g=groups.get(key)||{key,day,band,amountMinor:0,rows:[]};g.rows.push(t);g.amountMinor+=t.amountMinor;groups.set(key,g);}
 return [...groups.values()].sort((a,b)=>a.day-b.day||a.band-b.band);
}
export function disjointSpending(petty:Transaction[],cards:Transaction[]){
 const cardIds=new Set(cards.map(t=>t.id)),pettyIds=new Set(petty.map(t=>t.id));
 return [{key:'petty',label:'Petty, non-card',rows:petty.filter(t=>!cardIds.has(t.id))},{key:'overlap',label:'Petty on cards',rows:petty.filter(t=>cardIds.has(t.id))},{key:'card',label:'Other card expenses',rows:cards.filter(t=>!pettyIds.has(t.id))}].map(g=>({...g,amountMinor:sumMinor(g.rows)}));
}
