import {useRef,useState,type ReactNode} from 'react';
import {Edit2,Trash2} from 'lucide-react';

export function SwipeTransactionRow({children,onEdit,onDelete}:{children:ReactNode;onEdit:()=>void;onDelete:()=>void}){
 const gesture=useRef<{id:number;x:number;y:number;horizontal:boolean}|null>(null);
 const suppressClick=useRef(false);
 const [offset,setOffset]=useState(0);
 function reset(){gesture.current=null;setOffset(0);}
 return <div className="relative overflow-hidden" style={{touchAction:'pan-y pinch-zoom'}}
  onPointerDown={e=>{
   if(!e.isPrimary){reset();return;}
   if(e.button!==0)return;
   suppressClick.current=false;
   gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,horizontal:false};
  }}
  onPointerMove={e=>{
   const g=gesture.current;if(!g||g.id!==e.pointerId)return;
   const dx=e.clientX-g.x,dy=e.clientY-g.y;
   if(!g.horizontal){
    if(Math.abs(dy)>10&&Math.abs(dy)>=Math.abs(dx)){reset();return;}
    if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.5)return;
    g.horizontal=true;suppressClick.current=true;e.currentTarget.setPointerCapture(e.pointerId);
   }
   setOffset(Math.max(-120,Math.min(120,dx)));
  }}
  onPointerUp={e=>{
   const g=gesture.current;if(!g||g.id!==e.pointerId)return;
   const dx=e.clientX-g.x;reset();
   if(g.horizontal&&Math.abs(dx)>=72){if(dx>0)onDelete();else onEdit();}
  }}
  onPointerCancel={reset}
  // Touch capture transfers from the child button; only reset when this wrapper loses it.
  onLostPointerCapture={e=>{if(e.target===e.currentTarget)reset();}}
  onClickCapture={e=>{if(suppressClick.current&&e.detail!==0){e.preventDefault();e.stopPropagation();}}}>
  <div aria-hidden="true" className={`absolute inset-0 flex items-center justify-between px-4 text-white text-sm font-semibold ${offset>0?'bg-rose-600':'bg-cyan-700'} ${offset===0?'invisible':''}`}>
   <span className="flex items-center gap-2">{offset>0&&<><Trash2 size={18}/>Delete</>}</span>
   <span className="flex items-center gap-2">{offset<0&&<>Edit<Edit2 size={18}/></>}</span>
  </div>
  <div className={`relative ${offset===0?'transition-transform duration-150 motion-reduce:transition-none':''}`} style={{transform:`translateX(${offset}px)`}}>{children}</div>
 </div>;
}
