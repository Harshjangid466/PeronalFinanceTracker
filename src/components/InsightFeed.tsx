import {useMemo,useState} from 'react';
import {useApp} from '@/context/AppContext';
import {insightFeed} from '@/data/insightFeed';
import {coachMoney as money,type CoachAnalysis} from '@/data/spendingCoach';
import type {Transaction} from '@/data/types';
import type {StatementRow} from '@/data/statements';

export function InsightFeed({analysis,account,onInspect,onSources}:{analysis:CoachAnalysis;account:string;onInspect:(title:string,rows:Transaction[])=>void;onSources:(title:string,rows:StatementRow[])=>void}){
 const {allData:data,statementReady,statementError}=useApp();
 const [filter,setFilter]=useState('all'),[expanded,setExpanded]=useState(false);
 const findings=useMemo(()=>insightFeed(analysis,data,account,statementError?'error':statementReady?'ready':'loading'),[analysis,data,account,statementReady,statementError]);
 const visible=findings.filter(f=>filter==='all'||f.kind===filter),reviewCount=findings.filter(f=>f.kind==='review').length;
 return <section className="insight-feed" aria-label="What changed and needs attention">
  <header><div><h3>What changed. What needs attention.</h3><p>Ranked review signals first, then measurable spending drivers. {reviewCount} review signals; some share the same entries.</p></div></header>
  <div className="insight-filters" role="group" aria-label="Insight filters" data-auto-save>{[['all','All insights'],['review','Needs review'],['change','Changes explained']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>{setFilter(id);setExpanded(false);}}>{label}</button>)}</div>
  {!visible.length&&<p className="analytics-note">No {filter==='review'?'review signals are established from the loaded evidence':'changes can be explained from the available records'} for this view. This does not establish complete coverage of unimported activity.</p>}
  <div className="insight-list">{visible.slice(0,expanded?visible.length:4).map(f=><article key={f.id} data-testid={`insight-${f.id}`}>
   <div className="insight-title"><span className={f.kind==='review'?'insight-review':'insight-observed'}>{f.kind==='review'?'Review candidate':'Observed change'}</span><h4>{f.title}</h4></div>
   <p>{f.explanation}</p><p className="insight-next"><b>Next step:</b> {f.nextStep}</p>
   <details><summary>Show calculation &amp; evidence</summary><dl>{f.basis.map((b,i)=><div key={i}><dt>{b.label}</dt><dd>{b.amountMinor===undefined?b.text:money(b.amountMinor)}</dd></div>)}</dl><p className="analytics-note">Frequency/average-size and category/vendor views are alternative explanations of the same entries; do not add them together. Review states are current states for movements dated through the selected period.</p><div className="insight-actions">{f.rows.length>0&&<button className="analytics-link" onClick={()=>onInspect(f.title,f.rows)}>Review {f.rows.length} supporting entries</button>}{f.sources.length>0&&<button className="analytics-link" onClick={()=>onSources(f.title,f.sources)}>Review {f.sources.length} source movements</button>}{!f.rows.length&&!f.sources.length&&<small>Based on the stated input figures or availability of history; no transaction evidence is invented.</small>}</div></details>
  </article>)}</div>
  {visible.length>4&&<button className="analytics-link insight-show" onClick={()=>setExpanded(!expanded)}>{expanded?'Show fewer insights':`Show all ${visible.length} insights`}</button>}
 </section>;
}
