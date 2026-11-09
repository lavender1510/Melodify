const {_electron:electron}=require('playwright');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const crypto=require('node:crypto');const assert=require('node:assert/strict');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'melodify-perf-'));const results=[];let app;
 try{
  const profile=path.join(root,'profile');await fs.mkdir(profile);
  const base={schemaVersion:1,folders:[],tracks:[],playlists:[],favorites:[],favoritePlaylists:[],customThemes:[],themeId:'nocturne',settings:{volume:.75,balance:0,gain:0,equalizer:Array(10).fill(0),normalize:false,visualization:true,minimizeToTray:false,outputDevice:'default',eqPreset:'flat'}};
  for(const count of [1000,10000,50000]){
   const tracks=Array.from({length:count},(_,i)=>({id:crypto.createHash('sha256').update(String(i)).digest('hex').slice(0,24),path:path.join(root,'music',i+'.flac'),title:'Song '+i,artist:i%10?'Künstler':'Björk',album:'Album '+(i%100),format:'FLAC',addedAt:i,duration:180,year:2020,trackNo:1,size:1000,modified:1,cover:false}));
   await fs.writeFile(path.join(profile,'library.json'),JSON.stringify({...base,tracks}));
   const args=[path.resolve(__dirname,'..'),'--user-data-dir='+profile];if(process.platform==='linux'){args.push('--no-sandbox','--disable-gpu');if(!process.env.DISPLAY)args.push('--ozone-platform=headless');}
   const start=performance.now();app=await electron.launch({executablePath:require('electron'),args,env:{...process.env,XDG_CONFIG_HOME:path.join(root,'config'),XDG_CACHE_HOME:path.join(root,'cache')}});const page=await app.firstWindow();await page.waitForSelector('.melodify-splash',{state:'detached'});const startupMs=performance.now()-start;
   await page.getByRole('button',{name:'Alle Songs',exact:false}).first().click();await page.waitForSelector('.song-row');const mounted=await page.locator('.song-row').count();assert.ok(mounted<100,'song rows must be virtualized');
   const searchStart=performance.now();await page.getByRole('textbox',{name:'Musik durchsuchen'}).fill('bjork flac');await page.waitForFunction(n=>document.querySelector('.table-title')?.textContent.includes(n+' SONGS'),count/10);const searchUiMs=performance.now()-searchStart;
   await page.locator('.page-scroll').evaluate(pane=>{pane.scrollTop=pane.scrollHeight;});await page.waitForFunction(n=>[...document.querySelectorAll('.song-index')].some(e=>e.textContent===String(n)),count/10);
   const metrics=await app.evaluate(({app})=>app.getAppMetrics().map(m=>({type:m.type,workingSetKiB:m.memory.workingSetSize,peakWorkingSetKiB:m.memory.peakWorkingSetSize})));
   const result={entries:count,startupMs:Math.round(startupMs),searchUiMs:Math.round(searchUiMs),mountedRows:mounted,processes:metrics};results.push(result);console.log(JSON.stringify(result));
   if(count===50000){await fs.mkdir('work',{recursive:true});await page.screenshot({path:'work/library-50000.png'});}
   await app.close();app=null;
  }
  await fs.mkdir('work',{recursive:true});await fs.writeFile('work/library-performance.json',JSON.stringify(results,null,2));
 }finally{if(app)await app.close().catch(()=>{});await fs.rm(root,{recursive:true,force:true,maxRetries:5});}
})().catch(e=>{console.error(e);process.exitCode=1;});
