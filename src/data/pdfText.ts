import type {PDFPageProxy} from 'pdfjs-dist';
type TextContent=Awaited<ReturnType<PDFPageProxy['getTextContent']>>;

export async function readPdfTextContent(page:PDFPageProxy):Promise<TextContent>{
 if(page.isPureXfa)return page.getTextContent();
 // PDF.js uses for-await on this stream, which is unavailable in some Safari versions.
 const reader=page.streamTextContent().getReader();
 const text:TextContent={items:[],styles:Object.create(null),lang:null};
 try{
  while(true){
   const {value,done}=await reader.read();if(done)break;
   text.lang??=value.lang;Object.assign(text.styles,value.styles);text.items.push(...value.items);
  }
  return text;
 }finally{reader.releaseLock();}
}
