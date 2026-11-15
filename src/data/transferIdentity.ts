import type {AppData} from './types';
import type {StatementRow} from './statements';
export const sameTransferMovement=(a:StatementRow,b:StatementRow)=>a.id===b.id||!!a.reference&&a.reference===b.reference&&a.account===b.account&&a.date===b.date&&a.direction===b.direction&&a.amountMinor===b.amountMinor;
export function linkedTransfer(data:Pick<AppData,'transferLinks'>,row:StatementRow){return data.transferLinks?.find(g=>g.status==='active'&&g.originalRows.some(r=>sameTransferMovement(r,row)));}
