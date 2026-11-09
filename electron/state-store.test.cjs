const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {StateStore,validate}=require('./state-store.cjs');
const defaults=()=>({folders:[],tracks:[],playlists:[],favorites:[],favoritePlaylists:[],customThemes:[],themeId:'nocturne',settings:{volume:.75,balance:0,gain:0,equalizer:Array(10).fill(0),normalize:false,visualization:true,minimizeToTray:false,outputDevice:'default',eqPreset:'flat'}});
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'melodify-store-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const file=path.join(dir,'library.json');return {file,store:new StateStore(file,defaults)};}
test('legacy migration preserves playlists, favorites, custom themes and unknown metadata',()=>{
 const raw=defaults();raw.playlists=[{id:'p',name:'Meine Liste',trackIds:['missing'],createdAt:1}];raw.favorites=['missing'];raw.customThemes=[{id:'custom',name:'Eigene',description:'x',background:'#fff',surface:'#fff',panel:'#fff',text:'#000',muted:'#aaa',accent:'#def',radius:5,transparency:0,backgroundImage:'data:image/png;base64,AAAA'}];raw.customField={keep:true};
 const migrated=validate(raw,defaults);assert.equal(migrated.schemaVersion,1);for(const key of Object.keys(raw))assert.deepEqual(migrated[key],raw[key]);assert.equal(raw.schemaVersion,undefined);
});
test('100 concurrent snapshots serialize and capture their original values',async t=>{
 const {file,store}=await fixture(t);const state=defaults();const jobs=[];
 for(let i=0;i<100;i++){state.themeId='theme-'+i;jobs.push(store.save(state));}await Promise.all(jobs);await store.flush();
 assert.equal(JSON.parse(await fs.readFile(file)).themeId,'theme-99');assert.equal(JSON.parse(await fs.readFile(file+'.backup')).themeId,'theme-98');
});
test('corrupt primary blocks writes, explicit recovery preserves bytes and valid backup',async t=>{
 const {file,store}=await fixture(t);await store.save(defaults());await store.save({...defaults(),themeId:'second'});await fs.writeFile(file,'{broken');
 const reopened=new StateStore(file,defaults);await reopened.load();assert.equal(reopened.blocked,true);await assert.rejects(reopened.save(defaults()));assert.equal(await fs.readFile(file,'utf8'),'{broken');
 const recovered=await reopened.recover();assert.equal(recovered.themeId,'nocturne');assert.equal(reopened.blocked,false);const damaged=(await fs.readdir(path.dirname(file))).find(f=>f.includes('.damaged-'));assert.equal(await fs.readFile(path.join(path.dirname(file),damaged),'utf8'),'{broken');assert.equal(JSON.parse(await fs.readFile(file+'.backup')).themeId,'nocturne');
});
test('future schema, invalid settings and nested payloads reject without writing',async t=>{
 const {file,store}=await fixture(t);await store.save(defaults());const before=await fs.readFile(file,'utf8');
 for(const patch of [{schemaVersion:2},{settings:{...defaults().settings,volume:9}},{playlists:[{id:'bad'}]},{tracks:[null]},{customThemes:[null]},{session:{queue:[],position:NaN}},{settings:{...defaults().settings,equalizer:[0]}}])await assert.rejects(store.save({...defaults(),...patch}));
 assert.equal(await fs.readFile(file,'utf8'),before);await store.save({...defaults(),themeId:'still-usable'});
});
test('invalid or missing backup never overwrites a damaged primary',async t=>{
 const {file,store}=await fixture(t);await fs.writeFile(file,'broken');await store.load();await assert.rejects(store.recover());await fs.writeFile(file+'.backup','[]');await assert.rejects(store.recover());assert.equal(await fs.readFile(file,'utf8'),'broken');
});
test('write error rejects but queue can recover',async t=>{
 const {file,store}=await fixture(t);await fs.mkdir(file+'.tmp');await assert.rejects(store.save(defaults()));await fs.rmdir(file+'.tmp');await store.save(defaults());assert.equal(JSON.parse(await fs.readFile(file)).themeId,'nocturne');
});
