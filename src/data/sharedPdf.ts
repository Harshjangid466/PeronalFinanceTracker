export interface SharedPdfLaunch {id?:string; error?:string;}
// Capture before the account gate or navigation cleans a callback URL.
const params=new URLSearchParams(window.location.search);
export const sharedPdfLaunch:SharedPdfLaunch|undefined=params.has('sharedPdf')||params.has('sharedPdfError')?{id:params.get('sharedPdf')||undefined,error:params.get('sharedPdfError')||undefined}:undefined;
export function sharedPdfError(code?:string){return code==='large'?'Share one PDF smaller than 25 MB.':code==='storage'?'The shared PDF could not be stored on this device. Choose the file in Import instead.':code==='invalid'?'Share one PDF attachment, rather than an email or a link.':'This shared PDF has expired or was already opened. Share it again, or choose it from Files.';}
const reads=new Map<string,Promise<File>>();
export function takeSharedPdf(id:string):Promise<File>{
 if(reads.has(id))return reads.get(id)!;
 const result=(async()=>{
  if(!/^[\da-f-]{36}$/i.test(id)||!('serviceWorker'in navigator))throw Error(sharedPdfError());
  const registration=await navigator.serviceWorker.getRegistration();
  const worker=navigator.serviceWorker.controller||registration?.active;
  if(!worker)throw Error('Open the installed app once while online, then share the PDF again.');
  return new Promise<File>((resolve,reject)=>{
   const channel=new MessageChannel();
   const timer=setTimeout(()=>{channel.port1.close();reject(Error('Could not receive the PDF. Share it again or choose it from Files.'));},10000);
   channel.port1.onmessage=({data})=>{clearTimeout(timer);channel.port1.close();if(data.file instanceof File)resolve(data.file);else reject(Error(sharedPdfError(data.error)));};
   worker.postMessage({type:'take-shared-pdf',id},[channel.port2]);
  });
 })();
 reads.set(id,result);return result;
}
export function forgetSharedPdf(id?:string){if(id)reads.delete(id);}
