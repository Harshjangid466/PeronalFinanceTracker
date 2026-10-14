export function readSelectedFile(file:File):Promise<ArrayBuffer>{
 // Start inside the picker event: an installed iPhone app may release file access after it returns.
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  const fail=()=>reject(Error('This file could not be read. Save a copy in Files → On My iPhone, then select that copy.'));
  const timer=setTimeout(()=>{reader.abort();fail();},30000);
  reader.onload=()=>{clearTimeout(timer);if(reader.result instanceof ArrayBuffer)resolve(reader.result);else fail();};
  reader.onerror=reader.onabort=()=>{clearTimeout(timer);fail();};
  try{reader.readAsArrayBuffer(file);}catch{clearTimeout(timer);fail();}
 });
}
