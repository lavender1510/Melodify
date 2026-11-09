const {test}=require('node:test');const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');const {FolderWatcher}=require('./watch-folders.cjs');
function fixture(scan,onError=()=>{}){const handles=new Map();const watcher=new FolderWatcher(scan,onError,(folder,_options,callback)=>{const handle=new EventEmitter();handle.closed=false;handle.close=()=>{handle.closed=true;};handle.fire=callback;handles.set(folder,handle);return handle;});return {watcher,handles};}
test('file bursts coalesce into one scan, removing roots closes handles',async t=>{
 const calls=[];const {watcher,handles}=fixture(async folder=>{calls.push(folder);return {};});t.after(()=>watcher.close());watcher.configure(['/music']);for(let i=0;i<100;i++)handles.get('/music').fire();assert.equal(watcher.pending.size,1);await watcher.drain();assert.deepEqual(calls,['/music']);watcher.configure([]);assert.equal(handles.get('/music').closed,true);
});
test('busy scanner preserves pending root for retry; errors are visible',async t=>{
 let busy=true;const errors=[];const {watcher,handles}=fixture(async()=>({busy}),(...args)=>errors.push(args));t.after(()=>watcher.close());watcher.configure(['/music']);handles.get('/music').fire();await watcher.drain();assert.equal(watcher.pending.has('/music'),true);busy=false;await watcher.drain();assert.equal(watcher.pending.size,0);handles.get('/music').emit('error',new Error('device removed'));assert.equal(errors[0][0],'/music');assert.equal(handles.get('/music').closed,true);
});
test('a running worker never overlaps another drain',async t=>{
 let release;let calls=0;const {watcher}=fixture(()=>{calls++;return new Promise(resolve=>release=resolve);});t.after(()=>watcher.close());watcher.pending.add('/music');const first=watcher.drain();await watcher.drain();assert.equal(calls,1);release({});await first;
});
