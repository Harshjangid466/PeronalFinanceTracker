import type {Transaction} from './types';
import {directionOf,reconciliationControls,type StatementBatch,type StatementRow} from './statements';
import type {CardSettlement} from './cardReconciliation';

export function importSummary(batch:StatementBatch,rows:StatementRow[],transactions:Transaction[],settlements:CardSettlement[]=[]){
 const controls=reconciliationControls(batch,rows,transactions);
 const linked=new Set(controls.rows.filter(r=>r.status==='posted'||r.status==='matched').map(r=>r.transactionId));
 for(const g of settlements)if(g.status==='active'&&g.replacementId&&transactions.some(t=>t.id===g.replacementId&&t.entrySource?.batchId===batch.id))linked.add(g.replacementId);
 const recorded=[...new Map(transactions.filter(t=>t.status==='active'&&linked.has(t.id)).map(t=>[t.id,t])).values()].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt||a.id.localeCompare(b.id));
 const expenses=recorded.filter(t=>t.type==='Revenue Expense');
 const sum=(ts:Transaction[])=>ts.reduce((s,t)=>s+t.amountMinor,0);
 const groups=new Map<string,Transaction[]>();
 for(const t of expenses){const category=t.majorCategory||'Uncategorised',group=groups.get(category)||[];group.push(t);groups.set(category,group);}
 const categories=[...groups].map(([category,transactions])=>({category,transactions,amountMinor:sum(transactions),count:transactions.length})).sort((a,b)=>b.amountMinor-a.amountMinor||a.category.localeCompare(b.category));
 return {controls,recorded,expenses,categories,expenseMinor:sum(expenses),otherOutflowMinor:sum(recorded.filter(t=>t.type!=='Revenue Expense'&&directionOf(t)==='debit')),expenseCreditMinor:-sum(expenses.filter(t=>t.amountMinor<0)),creditMinor:sum(recorded.filter(t=>t.type!=='Revenue Expense'&&directionOf(t)==='credit'))};
}
