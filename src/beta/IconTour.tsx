import {useLayoutEffect,useRef,useState} from 'react';
import {readProfile,saveProfile} from './localBeta';

const stops=[
 {id:'home',title:'Home',text:'See your spending overview, insights and recent entries.'},
 {id:'transactions',title:'Transactions',text:'Search and edit entries. Imports & review is where you import statements and check pending payments.'},
 {id:'add',title:'Add an entry',text:'Use the plus button to record an expense, income, investment or another money movement.'},
 {id:'recover',title:'Recover money',text:'Track money lent to people and record recoveries.'},
 {id:'settings',title:'Settings',text:'Change accounts and payment links, categories, habits, rules and backups whenever you need.'},
 {id:'setup',title:'Setup guide',text:'Run the guided setup again without clearing your existing records.'},
 {id:'feedback',title:'Feedback',text:'Preview and copy feedback for Harsh. Contact details and usage counters are optional; financial data is not attached automatically.'},
];
export function IconTour({onClose}:{onClose:()=>void}){
 const [step,setStep]=useState(0),[rect,setRect]=useState<DOMRect|null>(null);
 const dialog=useRef<HTMLDivElement>(null),next=useRef<HTMLButtonElement>(null),previousFocus=useRef<HTMLElement|null>(null);
 const stop=stops[step];
 function finish(){try{saveProfile({...readProfile(),tourSeen:true});}catch{/* The tour must remain dismissible if storage is full. */}onClose();}
 useLayoutEffect(()=>{previousFocus.current=document.activeElement as HTMLElement;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;previousFocus.current?.focus();};},[]);
 useLayoutEffect(()=>{
  const update=()=>setRect(document.querySelector(`[data-tour="${stop.id}"]`)?.getBoundingClientRect()||null);
  update();next.current?.focus();window.addEventListener('resize',update);window.addEventListener('scroll',update,true);
  return()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
 },[stop.id]);
 const below=rect&&rect.top<window.innerHeight/2;
 return <div className="beta-tour" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}if(e.key==='Tab'){const items=dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}>
 {rect&&<div className="beta-tour-highlight" style={{top:rect.top-4,left:rect.left-4,width:rect.width+8,height:rect.height+8}}/>}
 <div ref={dialog} className="beta-tour-card" role="dialog" aria-modal="true" aria-labelledby="beta-tour-title" aria-describedby="beta-tour-description" style={below?{top:rect.bottom+16}:{bottom:rect?window.innerHeight-rect.top+16:100}}>
 <small>Quick tour · {step+1} of {stops.length}</small><h2 id="beta-tour-title">{stop.title}</h2><p id="beta-tour-description">{stop.text}</p><div className="beta-actions"><button onClick={finish}>Skip tour</button>{step>0&&<button onClick={()=>setStep(step-1)}>Back</button>}<button ref={next} className="beta-primary" onClick={()=>step===stops.length-1?finish():setStep(step+1)}>{step===stops.length-1?'Finish tour':'Next'}</button></div>
 </div></div>;
}
