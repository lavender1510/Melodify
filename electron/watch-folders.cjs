const fs=require('node:fs');
/** A single debounced worker: file bursts and overlapping roots never start parallel scans. */
class FolderWatcher {
 constructor(scan,onError){this.scan=scan;this.onError=onError;this.watchers=new Map();this.pending=new Set();this.timer=null;this.running=false;this.closed=false;}
 configure(folders){
  for(const [folder,watcher] of this.watchers)if(!folders.includes(folder)){watcher.close();this.watchers.delete(folder);this.pending.delete(folder);}
  for(const folder of folders)if(!this.watchers.has(folder)){
   try{const watcher=fs.watch(folder,{recursive:true},()=>{this.pending.add(folder);this.schedule();});watcher.on('error',error=>{watcher.close();this.watchers.delete(folder);this.onError(folder,error);});this.watchers.set(folder,watcher);}
   catch(error){this.onError(folder,error);}
  }
 }
 schedule(){clearTimeout(this.timer);this.timer=setTimeout(()=>void this.drain(),1000);this.timer.unref?.();}
 async drain(){
  if(this.closed||this.running)return;
  this.running=true;
  try{for(const folder of this.pending){this.pending.delete(folder);const result=await this.scan(folder);if(result?.busy){this.pending.add(folder);break;}}}
  catch(error){this.onError('',error);}
  finally{this.running=false;if(this.pending.size&&!this.closed)this.schedule();}
 }
 close(){this.closed=true;clearTimeout(this.timer);this.pending.clear();for(const watcher of this.watchers.values())watcher.close();this.watchers.clear();}
}
module.exports={FolderWatcher};
