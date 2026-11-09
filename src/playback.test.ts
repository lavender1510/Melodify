import {afterEach,describe,expect,it,vi} from 'vitest';
import {PlaybackLoader,QueueNavigator} from './playback';
class AudioStub extends EventTarget {
 src='';currentTime=0;duration=200;paused=true;ready=true;
 pause=vi.fn(()=>{this.paused=true;});play=vi.fn(async()=>{this.paused=false;});
 removeAttribute(){this.src='';}load(){if(this.src&&this.ready)queueMicrotask(()=>this.dispatchEvent(new Event('loadedmetadata')));}
}
const audio=(a:AudioStub)=>a as unknown as HTMLAudioElement;
const ready=async()=>{};
afterEach(()=>vi.useRealTimers());
describe('playback ownership',()=>{
 it('late diagnosis cannot replace the latest song',async()=>{
  const loader=new PlaybackLoader(),a=new AudioStub();let resolve!:(v:{ok:boolean})=>void;
  const old=loader.load(audio(a),'old',ready,()=>new Promise(r=>resolve=r));
  const latest=loader.load(audio(a),'new',ready,async()=>({ok:true}));
  expect(await old).toBe(false);expect(await latest).toBe(true);resolve({ok:true});await Promise.resolve();expect(a.src).toBe('new');expect(a.play).toHaveBeenCalledTimes(1);
 });
 it('cancel and 100 rapid switches leave only the last source active',async()=>{
  const loader=new PlaybackLoader(),a=new AudioStub();const jobs=Array.from({length:100},(_,i)=>loader.load(audio(a),String(i),ready,async()=>({ok:true})));
  const results=await Promise.all(jobs);expect(results.filter(Boolean)).toHaveLength(1);expect(a.src).toBe('99');expect(a.play).toHaveBeenCalledTimes(1);
 });
 it('times out hung metadata, then remains usable',async()=>{
  vi.useFakeTimers();const loader=new PlaybackLoader(),a=new AudioStub();a.ready=false;
  const pending=loader.load(audio(a),'hung',ready,async()=>({ok:true}));const checked=expect(pending).rejects.toThrow('antwortet nicht');await vi.advanceTimersByTimeAsync(15000);await checked;
  a.ready=true;const recovery=loader.load(audio(a),'good',ready,async()=>({ok:true}));await vi.advanceTimersByTimeAsync(1);expect(await recovery).toBe(true);
 });
 it('diagnosis errors, decode errors and play rejection allow retry',async()=>{
  const loader=new PlaybackLoader(),a=new AudioStub();await expect(loader.load(audio(a),'missing',ready,async()=>({ok:false,reason:'Datei fehlt'}))).rejects.toThrow('Datei fehlt');
  a.ready=false;const broken=loader.load(audio(a),'broken',ready,async()=>({ok:true}));await new Promise(r=>setTimeout(r,0));a.dispatchEvent(new Event('error'));await expect(broken).rejects.toThrow('Codec');
  a.ready=true;a.play.mockRejectedValueOnce(new Error('device gone'));await expect(loader.load(audio(a),'device',ready,async()=>({ok:true}))).rejects.toThrow('device gone');expect(await loader.load(audio(a),'retry',ready,async()=>({ok:true}),42)).toBe(true);expect(a.currentTime).toBe(42);
 });
 it('restoration loads metadata without autoplay when requested',async()=>{const loader=new PlaybackLoader(),a=new AudioStub();await loader.load(audio(a),'restore',ready,async()=>({ok:true}),100,false);expect(a.currentTime).toBe(100);expect(a.play).not.toHaveBeenCalled();});
});
describe('queue navigation',()=>{
 it('shuffle visits a full cycle once and stops when repeat is off',()=>{const q=new QueueNavigator(),ids=['a','b','c','d'];let active='a';const played=[active];for(let i=0;i<3;i++){active=q.next(ids,active,1,true,false,true,()=>0)!;played.push(active);}expect(new Set(played).size).toBe(4);expect(q.next(ids,active,1,true,false,true,()=>0)).toBeNull();});
 it('previous and next follow listening history',()=>{const q=new QueueNavigator(),ids=['a','b','c'];const next=q.next(ids,'a',1,true,false,false,()=>.99);expect(next).toBe('c');expect(q.next(ids,next,-1,true,false,false)).toBe('a');expect(q.next(ids,'a',1,true,false,false)).toBe('c');});
 it('repeat starts another cycle and removed tracks are skipped',()=>{const q=new QueueNavigator();expect(q.next(['a','b'],'a',1,true,true,true,()=>0)).toBe('b');expect(q.next(['a','b'],'b',1,true,true,true,()=>0)).toBe('a');expect(q.next(['a'],'a',1,false,false,true)).toBeNull();expect(q.next([],null,1,true,true,true)).toBeNull();});
});
