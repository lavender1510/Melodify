import {useLayoutEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
/** Fixed-height rows share the existing page scroller; only the viewport plus overscan mounts. */
export function VirtualSongRows({count,renderRow}:{count:number;renderRow:(index:number)=>ReactNode}){
 const root=useRef<HTMLDivElement>(null);
 const [range,setRange]=useState({start:0,end:40});
 useLayoutEffect(()=>{
  const host=root.current,pane=host?.closest('.page-scroll');if(!host||!(pane instanceof HTMLElement))return;
  let frame=0;
  const measure=()=>{
   const offset=host.getBoundingClientRect().top-pane.getBoundingClientRect().top+pane.scrollTop;
   const start=Math.max(0,Math.min(count-1,Math.floor((pane.scrollTop-offset)/66)-8));
   const end=Math.min(count,start+Math.ceil(pane.clientHeight/66)+16);
   setRange(prev=>prev.start===start&&prev.end===end?prev:{start,end});
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
  const resize=new ResizeObserver(schedule);resize.observe(pane);pane.addEventListener('scroll',schedule,{passive:true});measure();
  return()=>{cancelAnimationFrame(frame);resize.disconnect();pane.removeEventListener('scroll',schedule);};
 },[count]);
 if(count<=200)return <>{Array.from({length:count},(_,i)=>renderRow(i))}</>;
 const start=Math.min(range.start,Math.max(0,count-1)),end=Math.min(count,Math.max(start,range.end));
 return <div ref={root} className="virtual-songs" style={{height:count*66,position:'relative'}}><div style={{position:'absolute',top:start*66,left:0,right:0}}>{Array.from({length:end-start},(_,i)=>renderRow(start+i))}</div></div>;
}
