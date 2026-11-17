import {useMemo,useState} from 'react';
import type {AppData,Transaction} from '@/data/types';
import {personalAnalysis,personalOutlook} from '@/data/personalAnalysis';
import {formatCurrencyFull,formatDate} from '@/data/format';
import {moneyMinor} from '@/data/statementImport';
import './PersonalAnalysis.css';

const money=(n:number|undefined)=>n===undefined?'Unknown':formatCurrencyFull(n/100);
const monthName=(month:string)=>new Date(month+'-01T12:00:00Z').toLocaleDateString('en-IN',{month:'short',year:'numeric'});

export function PersonalAnalysis({data,month,today,account,onInspect}:{data:AppData;month:string;today:string;account:string;onInspect:(title:string,rows:Transaction[])=>void}){
 const analysis=useMemo(()=>personalAnalysis(data,month,today,account),[data,month,today,account]);
 const [income,setIncome]=useState(''),[change,setChange]=useState(0);
 let incomeOverride:number|undefined,error='';
 try{if(income.trim())incomeOverride=moneyMinor(income);}catch{error='Enter monthly income as a non-negative rupee amount with up to two decimal places.';}
 const outlook=personalOutlook(analysis,incomeOverride,change),first=outlook[0];
 return <div className="fin-view personal-analysis">
  <div className="fin-chart-heading"><div><h3>Plan the next three months</h3><span>After {monthName(month)} · {account||'All accounts'}</span></div></div>
  <p className="personal-analysis-intro">Explore what could remain from your income if recent personal spending continues. Start with the evidence, then try a change. <span className="personal-analysis-mobile-hint">Swipe tables sideways to see all figures and evidence links.</span></p>
  <details className="fin-subdetails" open><summary>Three completed months behind the estimate</summary>
   <div className="personal-analysis-table" tabIndex={0} role="region" aria-label="Planning history"><table><thead><tr><th scope="col">Month</th><th scope="col">Income</th><th scope="col">Net personal spending</th><th scope="col">Evidence</th></tr></thead><tbody>{analysis.history.map(h=><tr key={h.month}><th scope="row">{monthName(h.month)}</th><td>{money(h.incomeMinor)}<small>{h.incomeMinor===undefined?'No income recorded':h.incomeSource==='entered'?'Entered monthly total':'Recorded · may be incomplete'}</small></td><td>{money(h.expenseMinor)}<small>{h.expenses.length} posted entries</small></td><td><button className="fin-text-button" disabled={!h.expenses.length&&!h.incomeRows.length} onClick={()=>onInspect('Planning evidence: '+monthName(h.month),[...h.expenses,...h.incomeRows])}>View entries</button></td></tr>)}</tbody></table></div>
   <p className="fin-caption">Averages use these three months only. Expense credits reduce spending on their own dates. Entered income replaces recorded income for that month; it has no supporting ledger entry. Account views use recorded income only.</p>
  </details>
  <div className="personal-analysis-assumptions" data-auto-save>
   <label>Expected monthly income (₹)<input aria-label="Planning monthly income" aria-invalid={!!error} aria-describedby="planning-income-help" inputMode="decimal" value={income} placeholder={analysis.incomeMinor===undefined?'Enter an estimate':(analysis.incomeMinor/100).toFixed(2)} onChange={e=>setIncome(e.target.value)}/><small id="planning-income-help">{error||'Leave blank to use the historical average. Changes stay in this view and do not edit your records.'}</small></label>
   <label>Personal spending change: {change>0?'+':''}{change}%<input type="range" aria-label="Planning spending change" min="-100" max="100" step="5" value={change} onChange={e=>setChange(Number(e.target.value))}/><small>Compared with the three-month average. Negative reduces spending.</small></label>
  </div>
  <button className="fin-text-button" onClick={()=>{setIncome('');setChange(0);}}>Reset planning assumptions</button>
  {error?<p role="alert" className="personal-analysis-warning">{error}</p>:<>
   {first.expenseMinor===undefined&&<p className="personal-analysis-warning">An outlook needs personal spending entries in all three baseline months and a non-negative average. Missing records are unknown, not zero spending.</p>}
   {first.incomeMinor===undefined&&<p className="personal-analysis-warning">Income is missing in at least one baseline month. Enter expected monthly income above to explore a remainder.</p>}
   <div className="personal-analysis-table" tabIndex={0} role="region" aria-label="Three month personal outlook"><table><caption>Illustrative monthly outlook</caption><thead><tr><th scope="col">Month</th><th scope="col">Income estimate</th><th scope="col">Spending estimate</th><th scope="col">Income remainder</th></tr></thead><tbody>{outlook.map(p=><tr key={p.month}><th scope="row">{monthName(p.month)}</th><td>{money(p.incomeMinor)}</td><td>{money(p.expenseMinor)}</td><td className={p.remainingMinor!==undefined&&p.remainingMinor<0?'personal-analysis-warning':''}><strong>{money(p.remainingMinor)}</strong></td></tr>)}</tbody></table></div>
  </>}
  <p className="fin-caption">Estimates repeat the same monthly assumptions; they do not predict seasonality or future payments. Remainder excludes investments, capital purchases, household allocations and lending. It is neither confirmed savings nor a bank balance. Pending imports are excluded; recorded history may be incomplete.</p>
  <section className="personal-analysis-recurring" aria-label="Recurring payment candidates"><div className="fin-chart-heading"><div><h3>Payments that repeat monthly</h3><span>Three similar payments in consecutive months</span></div></div>
   {analysis.recurring.length?<div className="personal-analysis-candidates">{analysis.recurring.map(g=><button key={g.key} aria-label={'Review repeated payments: '+g.name+' · '+g.account} onClick={()=>onInspect('Repeated-payment evidence: '+g.name,g.rows)}><span><b>{g.name}</b><small>{g.account||'No account'} · last recorded {formatDate(g.lastDate)}</small><small>{g.rows.length} supporting entries · review pattern</small></span><span><strong>{money(g.monthlyMinor)} / month</strong><small>{money(g.annualMinor)} / year if continued</small></span></button>)}</div>:<p className="fin-empty">No monthly pattern established. Candidates need three consecutive months, one payment per month, similar amounts and a recent payment.</p>}
   <p className="fin-caption">These are review candidates, not confirmed subscriptions or cancellation suggestions. Amounts may vary by up to 15%; intervals must be 20–40 days, with the latest payment within 45 days of {formatDate(analysis.end)}. Annual cost is the median payment × 12. These payments already contribute to spending; they are not added again to the outlook.</p>
  </section>
 </div>;
}
