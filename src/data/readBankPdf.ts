import {readSelectedFile} from './selectedFile';
import {readPdfTextContent} from './pdfText';
import {parseBankPdf,type BankPdfPage} from './bankPdf';
export async function readBankPdf(file:File,batchId:string,account:string,password:string,onProgress:(message:string)=>void){
 const bytes=new Uint8Array(await readSelectedFile(file));onProgress('Opening bank statement…');
 const pdf=await import('pdfjs-dist/legacy/build/pdf.mjs'),worker=await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');pdf.GlobalWorkerOptions.workerSrc=worker.default;
 const task=pdf.getDocument({data:bytes,password,isEvalSupported:false});let ocr:Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>|undefined;
 try{
  const doc=await task.promise;if(doc.numPages>100)throw Error('Import up to 100 bank PDF pages at a time.');const pages:BankPdfPage[]=[];
  const first=await doc.getPage(1),firstText=await readPdfTextContent(first);const scanned=firstText.items.filter(i=>'str'in i&&i.str.trim()).length<10;
  if(scanned){onProgress('Loading local scan reader. The first use downloads reading tools, not your statement.');const engine=await import('tesseract.js');ocr=await engine.createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/ocr',workerBlobURL:false,logger:m=>{if(m.status==='recognizing text')onProgress(`Reading scan… ${Math.round(m.progress*100)}%`);}});}
  for(let n=1;n<=doc.numPages;n++){
   onProgress(`Reading ${scanned?'scanned ':''}page ${n} of ${doc.numPages}`);const page=n===1?first:await doc.getPage(n),view=page.getViewport({scale:1});
   if(ocr){const canvas=document.createElement('canvas'),scale=Math.min(2.2,1800/view.width),viewport=page.getViewport({scale});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const context=canvas.getContext('2d');if(!context)throw Error('Could not open the scan reader on this device.');await page.render({canvas,canvasContext:context,viewport}).promise;const {data}=await ocr.recognize(canvas,{}, {text:true,tsv:true});const items=(data.tsv||'').split('\n').slice(1).flatMap(line=>{const c=line.split('\t');if(c[0]!=='5'||!c[11]?.trim())return [];return [{str:c[11],x:Number(c[6])/scale,y:view.height-(Number(c[7])+Number(c[9]))/scale}];});pages.push({width:view.width,height:view.height,items,ocr:true});canvas.width=canvas.height=0;}
   else{const content=n===1?firstText:await readPdfTextContent(page);pages.push({width:view.width,height:view.height,items:content.items.flatMap(i=>'str'in i?[{str:i.str,x:i.transform[4],y:i.transform[5]}]:[])});}
   page.cleanup();
  }
  onProgress('Checking source totals and balances…');return parseBankPdf(pages,batchId,account);
 }catch(e){if(e instanceof Error&&e.name==='PasswordException')throw Error('This statement needs its PDF password, or the password is incorrect. Enter it and select the file again.');throw e;}
 finally{await ocr?.terminate();await task.destroy();}
}
