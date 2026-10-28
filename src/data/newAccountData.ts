import {getDefaultData} from './defaults';
import {migrateData} from './model';
export function newAccountData(){
 const defaults=getDefaultData();
 return migrateData({...defaults,schemaVersion:4,masters:[],sourceMappings:{},paymentModeSources:{},rules:[],customFields:[],people:[],accounts:['Cash','Bank account','Credit card'],paymentModes:['Cash','UPI','CC','Net banking'],categories:['Food','Transport','Utilities','Shopping','Health','Subscriptions','Misc'].map(name=>({name,subCategories:[]})),capexPurchasedFrom:[],toGharPaymentFor:[],incomeTypes:['Salary','Interest','Other'],investmentTypes:['Other']});
}
