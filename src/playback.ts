/** One owner for a shared audio element. Every asynchronous boundary is cancellable. */
export class PlaybackLoader {
 private current:AbortController|null=null;
 get isLoading(){return this.current!==null;}
 cancel(){this.current?.abort();this.current=null;}
 async load(audio:HTMLAudioElement,url:string,prepare:()=>Promise<void>,diagnose:()=>Promise<{ok:boolean;reason?:string}|undefined>,position=0,autoplay=true){
  this.cancel();
  const controller=new AbortController();this.current=controller;
  const signal=controller.signal;
  const timer=setTimeout(()=>controller.abort(new Error('Die Audiodatei antwortet nicht. Bitte erneut versuchen oder einen anderen Titel wählen.')),15000);
  const guarded=<T,>(promise:Promise<T>)=>new Promise<T>((resolve,reject)=>{
   const abort=()=>reject(signal.reason);
   if(signal.aborted){reject(signal.reason);return;}
   signal.addEventListener('abort',abort,{once:true});
   promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  });
  audio.pause();audio.removeAttribute('src');audio.load();
  try {
   const diagnosis=await guarded(diagnose());signal.throwIfAborted();
   if(diagnosis && !diagnosis.ok)throw new Error(diagnosis.reason||'Datei nicht verfügbar.');
   await guarded(prepare());signal.throwIfAborted();
   await new Promise<void>((resolve,reject)=>{
    const cleanup=()=>{audio.removeEventListener('loadedmetadata',ready);audio.removeEventListener('error',error);signal.removeEventListener('abort',abort);};
    const ready=()=>{cleanup();resolve();};
    const error=()=>{cleanup();reject(new Error('Audio konnte nicht dekodiert werden. Datei beschädigt oder Codec in diesem Electron-Build nicht unterstützt.'));};
    const abort=()=>{cleanup();reject(signal.reason);};
    audio.addEventListener('loadedmetadata',ready,{once:true});audio.addEventListener('error',error,{once:true});signal.addEventListener('abort',abort,{once:true});
    audio.src=url;audio.load();
   });
   signal.throwIfAborted();
   if(position>0 && Number.isFinite(audio.duration))audio.currentTime=Math.min(position,Math.max(0,audio.duration-.01));
   if(autoplay)await guarded(audio.play());
   signal.throwIfAborted();
   return true;
  } catch(error) {
   if(this.current!==controller || (signal.aborted && signal.reason?.name==='AbortError'))return false;
   audio.pause();throw error;
  } finally {clearTimeout(timer);if(this.current===controller)this.current=null;}
 }
}

/** Shuffle visits every available ID once; history makes Previous deterministic. */
export class QueueNavigator {
 private visited=new Set<string>();
 private history:string[]=[];
 private forward:string[]=[];
 reset(){this.visited.clear();this.history=[];this.forward=[];}
 next(list:string[],active:string|null,direction:1|-1,shuffle:boolean,repeat:boolean,ended:boolean,random= Math.random):string|null {
  const ids=[...new Set(list)];if(!ids.length)return null;
  if(direction===-1){
   while(this.history.length){const id=this.history.pop()!;if(ids.includes(id)){if(active)this.forward.push(active);return id;}}
   return ids[Math.max(0,ids.indexOf(active||'')-1)];
  }
  let target:string|undefined;
  while(this.forward.length && !target){const id=this.forward.pop()!;if(ids.includes(id))target=id;}
  if(!target && shuffle){
   if(active)this.visited.add(active);
   let remaining=ids.filter(id=>!this.visited.has(id));
   if(!remaining.length && (repeat || !ended)){this.visited.clear();if(active && ids.length>1)this.visited.add(active);remaining=ids.filter(id=>!this.visited.has(id));}
   if(remaining.length){target=remaining[Math.floor(random()*remaining.length)];this.visited.add(target);}
  }else if(!target){const index=ids.indexOf(active||'')+1;target=ids[index] || (repeat||!ended?ids[0]:undefined);}
  if(target && active && target!==active)this.history.push(active);
  return target||null;
 }
}
