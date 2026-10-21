import {useEffect,useMemo,useRef,useState} from 'react';
import type {AppData,Transaction} from '@/data/types';
import {cloudSnapshot} from '@/data/cloudSummary';
import {AI_MODEL,AI_PATH,validReport,type AIReport,type AISummary,type AIFact} from '@/data/cloudContract';
import {coachMoney as money} from '@/data/spendingCoach';
import {Sheet} from './Sheet';
import './CloudIntelligence.css';

type Snapshot=ReturnType<typeof cloudSnapshot>;
function FactChart({facts,comparison,onInspect}:{facts:AIFact[];comparison:boolean;onInspect:(id:string)=>void}){
 const max=Math.max(1,...facts.flatMap(f=>[Math.abs(f.currentMinor||0),Math.abs(comparison?f.previousMinor||0:0)]));
 return <div className="ai-bars" aria-label={comparison?'AI selected current and previous figures':'AI selected recorded figures'}>{facts.map(f=><button key={f.id} onClick={()=>onInspect(f.id)} aria-label={`Inspect ${f.label}`}><span>{f.label}<b>{f.currentMinor===null?'Unknown':money(f.currentMinor)}</b></span><i><i style={{width:Math.abs(f.currentMinor||0)/max*100+'%'}}/></i>{comparison&&<><small>Comparison {f.previousMinor===null?'unknown':money(f.previousMinor)}</small><i className="ai-prior"><i style={{width:Math.abs(f.previousMinor||0)/max*100+'%'}}/></i></>}</button>)}</div>;
}
export function CloudIntelligence({data,month,today,account,limit,history,onInspect}:{data:AppData;month:string;today:string;account:string;limit:number;history:AISummary['history'];onInspect:(title:string,rows:Transaction[])=>void}){
 const snapshot=useMemo(()=>cloudSnapshot(data,month,today,account,limit,history),[data,month,today,account,limit,history]);
 const fingerprint=JSON.stringify(snapshot.payload);
 const [review,setReview]=useState<Snapshot|null>(null),[consent,setConsent]=useState(false),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [result,setResult]=useState<{snapshot:Snapshot;report:AIReport}|null>(null),[detail,setDetail]=useState<{title:string;text:string}|null>(null);
 const controller=useRef<AbortController|null>(null),generation=useRef(0);
 useEffect(()=>{generation.current++;controller.current?.abort();controller.current=null;setBusy(false);setReview(null);setConsent(false);setCode('');setResult(null);setError('');setDetail(null);},[fingerprint,data]);
 useEffect(()=>()=>{generation.current++;controller.current?.abort();},[]);
 function close(){generation.current++;controller.current?.abort();controller.current=null;setBusy(false);setReview(null);setConsent(false);setCode('');}
 function prepare(){setError('');setConsent(false);setReview(snapshot);}
 function inspectFact(id:string){const e=result?.snapshot.evidence[id];if(!e)return;if(e.rows.length)onInspect(e.label,e.rows);else setDetail({title:e.label,text:'This figure comes from an entered total or source review count. Source movements are available in Transactions → Imports & review. They are never added to posted spending.'});}
 async function send(){
  if(!review||!consent||busy||code.length<32)return;
  const current=++generation.current,abort=new AbortController();controller.current=abort;setBusy(true);setError('');
  const timer=setTimeout(()=>abort.abort(),50000);
  try{
   const response=await fetch(AI_PATH,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+code},body:JSON.stringify(review.payload),signal:abort.signal});
   if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Cloud AI is not available on this server yet. Local charts remain available.');
   const body=await response.json();
   if(!response.ok)throw Error(typeof body.error==='string'?body.error:'AI analysis could not be completed.');
   if(body.provider!=='OpenAI'||body.model!==AI_MODEL||!validReport(body.report,review.payload))throw Error('The AI response could not be verified.');
   if(generation.current!==current)return;
   setResult({snapshot:review,report:body.report});setReview(null);setConsent(false);setCode('');
  }catch(e){if(generation.current===current){setError(abort.signal.aborted?'Request stopped or timed out. Review before sending again.':e instanceof Error?e.message:'Cloud analysis failed.');setConsent(false);}}
  finally{clearTimeout(timer);if(generation.current===current){setBusy(false);controller.current=null;}}
 }
 return <div className="ai-workspace">
  <div className="ai-heading"><div><span className="fin-eyebrow">Cloud intelligence · OpenAI</span><h3>{result?result.report.headline:'A deeper look at your spending'}</h3><small>Petty payments · card concentration · income remainder</small></div><button className="ai-primary" onClick={prepare} disabled={busy||!snapshot.payload.facts.some(f=>f.count>0||f.currentMinor!==null&&f.currentMinor!==0)}>{result?'Review new analysis':'Review data for AI'}</button></div>
  {result&&<><div className="ai-result-caption">Analysed {result.snapshot.payload.month} through {result.snapshot.payload.through} · {result.snapshot.payload.scope} · {AI_MODEL}</div><div className="ai-insights">{result.report.insights.map((insight,i)=><article key={i}><div className="ai-card-title"><span>{String(i+1).padStart(2,'0')}</span><small>{insight.confidence==='tentative'?'Possible explanation':'Observed pattern'} · AI suggestion</small></div><h4>{insight.title}</h4><FactChart facts={insight.factIds.map(id=>result.snapshot.payload.facts.find(f=>f.id===id)!)} comparison={insight.chart==='comparison'} onInspect={inspectFact}/><p>{insight.observation}</p><details><summary>Suggested next step</summary><p>{insight.action}</p></details></article>)}</div><button className="fin-text-button" onClick={()=>setResult(null)}>Clear AI results</button></>}
  <p className="fin-caption">AI suggestions can be wrong. Charts use recorded figures; tap bars for evidence. Each request needs your review and uses paid API access.</p>
  <Sheet title="Review what AI receives" open={!!review} onClose={close} wide>{review&&<div className="ai-review" data-auto-save>
   <p><b>To OpenAI via this app’s Netlify server.</b> Monthly totals, category labels, anonymous vendor/card groups, six-month recorded spending, weekday totals and source review counts.</p>
   <p>Vendor/account names, transaction IDs, exact payment dates/times, narrations, PDFs and passwords are excluded. Category names may contain your own labels: check them below.</p>
   <div className="ai-review-summary"><span>{review.payload.month}<small>Selected month</small></span><span>{review.payload.facts.length}<small>Aggregate facts</small></span><span>INR paise<small>100 paise = ₹1</small></span></div>
   <details><summary>Exact financial JSON to be sent</summary><pre aria-label="Exact AI financial payload">{JSON.stringify(review.payload,null,2)}</pre></details>
   <p className="fin-caption">Response storage is disabled for this request. OpenAI’s standard abuse-monitoring retention may still apply. <a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer">Provider data controls</a>. Results and access code stay in this screen’s memory and are cleared on reload.</p>
   <details><summary>Connection setup</summary><p>The server needs an OpenAI API key and a separate private analysis access code. Enter that access code below; never enter the OpenAI key here. This personal-app connection is not multi-user sign-in.</p></details>
   <label>Private analysis access code<input aria-label="Private analysis access code" type="password" value={code} disabled={busy} maxLength={256} autoComplete="off" onChange={e=>setCode(e.target.value)}/></label>
   <label className="ai-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>I reviewed this summary and agree to send it to OpenAI for this analysis.</label>
   <div role="status" aria-live="polite">{busy?'Analysing the reviewed summary…':error}</div>
   <div className="ai-review-actions"><button onClick={close}>{busy?'Stop waiting':'Cancel'}</button><button className="ai-primary" disabled={!consent||busy||code.length<32} onClick={send}>{busy?'Analysing…':'Send reviewed summary'}</button></div>
   {busy&&<small>Stopping cannot recall data already sent or guarantee cancellation of provider charges.</small>}
  </div>}</Sheet>
  <Sheet title={detail?.title||'Figure evidence'} open={!!detail} onClose={()=>setDetail(null)}><p>{detail?.text}</p></Sheet>
 </div>;
}
