import type {AppData} from './types';
import type {MasterItem} from './model';
export const ACCOUNT_TYPES=['CC','SB','Current','Wallet','Cash'] as const;
export type AccountType=typeof ACCOUNT_TYPES[number];
export function defaultAccountType(name:string):AccountType|undefined{
 if(name==='Cash')return 'Cash';
 if(/\bCC$/.test(name))return 'CC';
 if(/Savings A\/c$/.test(name))return 'SB';
 if(['Amazon Pay','Pluxee card'].includes(name))return 'Wallet';
}
export function compatibleModes(type:AccountType):string[]{return type==='SB'||type==='Current'?['UPI','Debit Card','Net banking','Bank Transfer']:type==='CC'?['CC']:type==='Wallet'?['Wallet']:['Cash'];}
export function mapTypedAccount(data:AppData,item:MasterItem):AppData{
 if(item.kind!=='source'||!item.accountType)return data;
 const modes=compatibleModes(item.accountType),sourceMappings={...data.sourceMappings};
 for(const mode of data.masters||[])if(mode.kind==='paymentMode'){
  const ids=(sourceMappings[mode.id]||[]).filter(id=>id!==item.id);
  sourceMappings[mode.id]=modes.includes(mode.name)?[...ids,item.id]:ids;
 }
 return {...data,sourceMappings};
}
