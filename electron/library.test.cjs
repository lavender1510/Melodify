const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {discover,inside,mergeScan}=require('./library.cjs');
const track=(id,file)=>({id,path:file,title:id});
test('root containment uses path boundaries',()=>{assert.equal(inside('/music-other/a.mp3','/music'),false);assert.equal(inside('/music/album/a.mp3','/music'),true);});
test('partial rescan retains missing metadata and other roots, rediscovery clears missing',()=>{
 const old=[track('a','/music/a.mp3'),track('b','/other/b.mp3')];const merged=mergeScan(old,[],['/music'],[]);assert.equal(merged.find(t=>t.id==='a').missing,true);assert.deepEqual(merged.find(t=>t.id==='b'),old[1]);assert.equal(mergeScan(merged,[old[0]],['/music'],[]).find(t=>t.id==='a').missing,false);
});
test('unreadable root does not prove files missing',()=>{const old=[track('a','/music/a.mp3')];assert.deepEqual(mergeScan(old,[],['/music'],['/music: EACCES']),old);});
test('scan discovers supported candidates, ignores symlink loops and reports errors',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'melodify-library-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.writeFile(path.join(root,'a.MP3'),'x');await fs.writeFile(path.join(root,'b.txt'),'x');if(process.platform!=='win32')await fs.symlink(root,path.join(root,'loop'));
 const controller=new AbortController(),errors=[];assert.equal((await discover(root,controller.signal,errors)).size,1);await discover(path.join(root,'missing'),controller.signal,errors);assert.equal(errors.length,1);controller.abort();await assert.rejects(discover(root,controller.signal,errors));assert.equal(await fs.readFile(path.join(root,'a.MP3'),'utf8'),'x');
});
