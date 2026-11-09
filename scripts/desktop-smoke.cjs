const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'melodify-desktop-'));
 const executablePath=process.argv[2]||require('electron');
 const args=process.argv[2]?[]:[path.resolve(__dirname,'..')];args.push('--user-data-dir='+path.join(root,'profile'));
 if(process.platform==='linux'){args.push('--no-sandbox','--disable-gpu');if(!process.env.DISPLAY)args.push('--ozone-platform=headless');}
 const env={...process.env,XDG_CONFIG_HOME:path.join(root,'config'),XDG_CACHE_HOME:path.join(root,'cache'),APPDATA:path.join(root,'appdata'),LOCALAPPDATA:path.join(root,'localappdata')};
 let app;
 const launch=()=>electron.launch({executablePath,args,env,timeout:30000});
 try {
  app=await launch();let page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>!!window.melodify);await page.waitForSelector('.melodify-splash',{state:'detached'});
  const security=await app.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration};});assert.deepEqual(security,{sandbox:true,contextIsolation:true,nodeIntegration:false});
  const initial=await page.evaluate(()=>window.melodify.load());assert.equal(initial.tracks.length,0);assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
  // Only the native picker is stubbed; scan, metadata, media protocol and Web Audio are real.
  const music=path.join(root,'music');await fs.mkdir(music);await fs.writeFile(path.join(music,'A.wav'),require('./wav-fixture.cjs')());await fs.writeFile(path.join(music,'B.wav'),require('./wav-fixture.cjs')());
  await app.evaluate(({dialog},directory)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[directory]});},music);
  await page.getByRole('button',{name:'Musikordner auswählen',exact:true}).click();
  await page.waitForFunction(async()=>(await window.melodify.load()).tracks.length===2);
  await page.getByRole('button',{name:'Alle Songs',exact:false}).first().click();
  await page.getByTitle('Wiedergeben',{exact:true}).first().click();await page.waitForSelector('.playerbar button[title="Pause"]');
  await page.waitForFunction(()=>Number(document.querySelector('input[aria-label="Wiedergabeposition"]').value)>0);
  for(let i=0;i<10;i++)await page.getByTitle('Nächster Titel',{exact:true}).click();
  await page.waitForSelector('.playerbar button[title="Pause"]');assert.equal(await page.locator('.audio-error').count(),0);
  await page.getByTitle('Pause',{exact:true}).click();
  const scanned=await page.evaluate(()=>window.melodify.load());assert.equal(scanned.tracks.every(t=>t.duration>3.9),true);
  await fs.unlink(path.join(music,'B.wav'));await page.evaluate(()=>window.melodify.rescan());
  const rescanned=await page.evaluate(()=>window.melodify.load());assert.equal(rescanned.tracks.length,2);assert.equal(rescanned.tracks.find(t=>t.title==='B').missing,true);
  // Native Chromium prompt was replaced with the app's own form.
  await page.getByRole('button',{name:'Playlists',exact:true}).click();await page.getByRole('button',{name:'Playlist erstellen',exact:true}).first().click();await page.getByRole('textbox',{name:'Playlistname'}).fill('Smoke Playlist');await page.getByRole('button',{name:'Erstellen',exact:true}).click();
  await page.getByRole('button',{name:'Umbenennen',exact:true}).click();await page.getByRole('textbox',{name:'Playlistname'}).fill('Umbenannt');await page.getByRole('button',{name:'Speichern',exact:true}).click();
  let saved=await page.evaluate(()=>window.melodify.load());assert.equal(saved.playlists[0].name,'Umbenannt');
  const invalid=await page.evaluate(()=>window.melodify.save({settings:{volume:9}}).then(()=>false,()=>true));assert.equal(invalid,true);
  const dataPath=await app.evaluate(({app})=>app.getPath('userData'));assert.equal(dataPath.startsWith(root),true);
  await app.close();app=null;
  // Seed a previous session in the isolated profile, as a former app run would.
  const stored=JSON.parse(await fs.readFile(path.join(dataPath,'library.json'),'utf8'));
  stored.session={activeId:stored.tracks[0].id,queue:[stored.tracks[0].id,'kept-missing-id'],position:42,repeat:'all',shuffle:true};
  await fs.writeFile(path.join(dataPath,'library.json'),JSON.stringify(stored));
  app=await launch();page=await app.firstWindow();await page.waitForFunction(()=>!!window.melodify);await page.waitForSelector('.melodify-splash',{state:'detached'});
  await app.close();app=await launch();page=await app.firstWindow();await page.waitForFunction(()=>!!window.melodify);await page.waitForSelector('.melodify-splash',{state:'detached'});
  saved=await page.evaluate(()=>window.melodify.load());assert.equal(saved.playlists[0].name,'Umbenannt');assert.equal(saved.session.position,42);assert.deepEqual(saved.session.queue,[saved.tracks[0].id,'kept-missing-id']);assert.equal(await page.getByTitle('Abspielen',{exact:true}).count()>0,true);
  assert.deepEqual(errors,[]);console.log('Desktop smoke passed: sandbox/preload, playlist create/rename, IPC validation, real scan/playback, rapid skips, missing-file retention, clean close, restart/session paused.');
 } finally {if(app)await app.close().catch(()=>{});await fs.rm(root,{recursive:true,force:true,maxRetries:5});}
})().catch(error=>{console.error(error);process.exitCode=1;});
