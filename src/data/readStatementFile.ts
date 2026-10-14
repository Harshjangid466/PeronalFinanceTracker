import {parsePaytmPages,type PdfTextItem} from './statementImport';
import {readSelectedFile} from './selectedFile';
export async function readPaytmFile(file:File,batchId:string,onProgress:(message:string)=>void){
 if(file.size>25*1024*1024)throw Error('Choose a PDF below 25 MB.');
 if(!file.size)throw Error('The selected PDF is empty or has not downloaded. Save a local copy in Files → On My iPhone and try again.');
 onProgress('Reading selected PDF…');const data=new Uint8Array(await readSelectedFile(file));
 onProgress('Opening PDF reader…');
 const pdf=await import('pdfjs-dist/legacy/build/pdf.mjs');const worker=await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');pdf.GlobalWorkerOptions.workerSrc=worker.default;
 const task=pdf.getDocument({data,isEvalSupported:false});
 try{
  const doc=await task.promise;if(doc.numPages>300)throw Error('Import at most 300 PDF pages at a time.');
  const pages=[];for(let i=1;i<=doc.numPages;i++){
   onProgress(`Reading page ${i} of ${doc.numPages}`);const page=await doc.getPage(i);const content=await page.getTextContent();
   const items:PdfTextItem[]=content.items.flatMap(item=>'str'in item?[{str:item.str,x:item.transform[4],y:item.transform[5]}]:[]);
   pages.push({width:page.getViewport({scale:1}).width,items});page.cleanup();
  }
  return parsePaytmPages(pages,batchId);
 }finally{await task.destroy();}
}
