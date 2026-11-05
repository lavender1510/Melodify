const { app, BrowserWindow, ipcMain, dialog, nativeImage, Tray, Menu, protocol } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');

protocol.registerSchemesAsPrivileged([{ scheme: 'melodify-media', privileges: { secure: true, standard: true, stream: true, supportFetchAPI: true } }]);
const AUDIO_EXT = new Set(['.mp3', '.flac', '.wav', '.ogg', '.oga', '.m4a', '.aac', '.opus']);
const MIME = {'.mp3':'audio/mpeg','.flac':'audio/flac','.wav':'audio/wav','.ogg':'audio/ogg','.oga':'audio/ogg','.m4a':'audio/mp4','.aac':'audio/aac','.opus':'audio/ogg','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const defaults = () => ({ folders: [], tracks: [], playlists: [], favorites: [], favoritePlaylists: [], customThemes: [], themeId: 'nocturne', settings: { volume: .75, balance: 0, equalizer: [0,0,0,0,0,0,0,0,0,0], eqPreset:'flat', normalize: false, gain: 0, visualization:true, minimizeToTray:false, outputDevice:'default' } });
let state, win, tray, quitting = false, scanning = false;
const mediaFiles = new Map();
const storeFile = () => path.join(app.getPath('userData'), 'library.json');
const artDir = () => path.join(app.getPath('userData'), 'covers');
const saveState = async () => { const p = storeFile(); await fsp.mkdir(path.dirname(p),{recursive:true}); const temp=p+'.tmp'; await fsp.writeFile(temp,JSON.stringify(state,null,2),'utf8'); await fsp.rename(temp,p); };
const safeArray = (a, max=50000) => Array.isArray(a) ? a.slice(0,max) : [];
function registerMedia() {
  mediaFiles.clear(); for (const track of state.tracks) { if (track.id && track.path) mediaFiles.set(track.id,track.path); }
}
async function restore() { try { const raw = JSON.parse(await fsp.readFile(storeFile(),'utf8')); const def=defaults(); state={...def,...raw, folders:safeArray(raw.folders,200), tracks:safeArray(raw.tracks), playlists:safeArray(raw.playlists,1000), favorites:safeArray(raw.favorites), favoritePlaylists:safeArray(raw.favoritePlaylists), customThemes:safeArray(raw.customThemes,100), settings:{...def.settings,...raw.settings}}; } catch { state=defaults(); } registerMedia(); }
const idFor = p => crypto.createHash('sha256').update(path.resolve(p).toLowerCase()).digest('hex').slice(0,24);
function notifyProgress(payload) { if (win && !win.isDestroyed()) win.webContents.send('scan:progress',payload); }
async function listFiles(folder, out, count = {n:0}) {
  if (count.n > 150000) return;
  let entries; try { entries = await fsp.readdir(folder,{withFileTypes:true}); } catch { return; }
  for (const entry of entries) {
    if (count.n++ > 150000) break;
    const p=path.join(folder,entry.name);
    // Symbolische Links absichtlich nicht verfolgen (Zyklen vermeiden).
    if (entry.isDirectory()) await listFiles(p,out,count);
    else if (entry.isFile() && AUDIO_EXT.has(path.extname(entry.name).toLowerCase())) out.push(p);
  }
}
async function readTrack(p, known) {
  try {
    const stat=await fsp.stat(p); const id=idFor(p);
    if (known && known.size===stat.size && known.modified===stat.mtimeMs) return known;
    const { parseFile } = await import('music-metadata');
    const { common, format } = await parseFile(p,{ duration:true });
    let cover = false;
    const pictures=common.picture || [];
    const picture=pictures[0];
    const cachePath=path.join(artDir(),id+'.'+(picture?.format==='image/png'?'png':'jpg'));
    if (picture && /^image\/(png|jpeg|jpg)$/.test(picture.format) && picture.data.length<12*1024*1024) {
      await fsp.mkdir(artDir(),{recursive:true}); await fsp.writeFile(cachePath,Buffer.from(picture.data)); cover=true;
    } else {
      const base=path.dirname(p);
      for (const candidate of ['cover.jpg','folder.jpg','front.jpg','cover.png','folder.png']) {
        try { const src=path.join(base,candidate); const st=await fsp.stat(src); if(st.isFile() && st.size<12*1024*1024) { await fsp.mkdir(artDir(),{recursive:true}); const ext=path.extname(src); await fsp.copyFile(src,path.join(artDir(),id+ext)); cover=true; break; } } catch { /* Kein Cover vorhanden */ }
      }
    }
    return { id, path:p, title: String(common.title || path.parse(p).name), artist: String(common.artist || 'Unbekannter Interpret'), album: String(common.album || 'Unbekanntes Album'), duration: Number(format.duration || 0), year: common.year || null, trackNo:common.track?.no || null, cover, size: stat.size, modified:stat.mtimeMs, addedAt:known?.addedAt || Date.now(), format: path.extname(p).slice(1).toUpperCase() };
  } catch (e) {
    // Ungültige Audiodateien trotzdem in der Bibliothek anzeigen.
    try { const st=await fsp.stat(p); const id=idFor(p); return {id,path:p,title:path.parse(p).name,artist:'Unbekannter Interpret',album:'Unbekanntes Album',duration:0,year:null,trackNo:null,cover:false,size:st.size,modified:st.mtimeMs,addedAt:known?.addedAt||Date.now(),format:path.extname(p).slice(1).toUpperCase(),readError:true}; } catch { return null; }
  }
}
async function scan() {
  if (scanning) return {busy:true,tracks:state.tracks}; scanning=true;
  try {
    notifyProgress({stage:'scan',current:0,total:0});
    const paths=[]; for (const folder of state.folders) await listFiles(folder,paths);
    const unique=[...new Set(paths)]; const existing=new Map(state.tracks.map(t=>[t.path,t])); const next=[];
    // In kleinen Batches parsen, um UI und Datenträger nicht zu blockieren.
    for(let i=0;i<unique.length;i+=4) { const results=await Promise.all(unique.slice(i,i+4).map(p=>readTrack(p,existing.get(p)))); next.push(...results.filter(Boolean)); if(i%24===0 || i+4>=unique.length) notifyProgress({stage:'scan',current:Math.min(i+4,unique.length),total:unique.length}); }
    state.tracks=next.sort((a,b)=>a.title.localeCompare(b.title,'de')); registerMedia(); await saveState(); notifyProgress({stage:'done',current:unique.length,total:unique.length}); return {tracks:state.tracks};
  } catch(err) { notifyProgress({stage:'error',message:err.message}); return {error:err.message,tracks:state.tracks}; }
  finally {scanning=false;}
}
function mediaHandler(request) {
  try {
    const u=new URL(request.url); const id=decodeURIComponent(u.pathname.slice(1));
    if (!/^[a-f0-9]{24}$/.test(id)) return new Response('Not found',{status:404});
    if (u.hostname==='track') {
      const file=mediaFiles.get(id); if (!file) return new Response('Not found',{status:404});
      return serveFile(file,request);
    }
    if (u.hostname==='art') {
      const cover=['.jpg','.png'].map(ext=>path.join(artDir(),id+ext)).find(fs.existsSync);
      if (!cover) return new Response('Not found',{status:404});
      return serveFile(cover,request);
    }
  } catch { /* Ungültige URL */ }
  return new Response('Not found',{status:404});
}
async function serveFile(file,request) {
  try {
    const stat=await fsp.stat(file); const size=stat.size; const range=request.headers.get('range');
    let start=0,end=size-1,status=200;
    if (range) { const m=/^bytes=(\d*)-(\d*)$/.exec(range); if(!m) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}}); if(m[1]) start=Number(m[1]); if(m[2]) end=Number(m[2]); if(!m[1] && m[2]) {start=Math.max(0,size-Number(m[2]));end=size-1;} if(start>=size || end<start) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});end=Math.min(size-1,end);status=206; }
    const headers={ 'Content-Type': MIME[path.extname(file).toLowerCase()]||'application/octet-stream', 'Accept-Ranges':'bytes','Content-Length':String(Math.max(0,end-start+1)) };
    if (status===206) headers['Content-Range']=`bytes ${start}-${end}/${size}`;
    return new Response(request.method==='HEAD'?null:Readable.toWeb(fs.createReadStream(file,{start,end})),{status,headers});
  } catch {return new Response('File unavailable',{status:404});}
}
function createTray() {
  const iconPath=path.join(__dirname,'../public/melodify-logo.png');
  if(!fs.existsSync(iconPath)) return;
  let icon=nativeImage.createFromPath(iconPath).resize({width:18,height:18});
  if(icon.isEmpty()) return; tray=new Tray(icon);tray.setToolTip('Melodify');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Melodify öffnen',click:()=>win?.show()},{label:'Beenden',click:()=>{quitting=true;app.quit();}}]));tray.on('double-click',()=>win?.show());
}
function createWindow() {
  win=new BrowserWindow({width:1350,height:850,minWidth:900,minHeight:610,backgroundColor:'#0c0e13',title:'Melodify',show:false,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:false,webSecurity:true}});
  win.once('ready-to-show',()=>win.show());
  win.on('close',event=>{if(!quitting && state.settings.minimizeToTray && tray){event.preventDefault();win.hide();}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{ const local=process.env.MELODIFY_DEV_URL || 'file://';if(!url.startsWith(local)) event.preventDefault();});
  if(process.env.MELODIFY_DEV_URL) win.loadURL(process.env.MELODIFY_DEV_URL);
  else win.loadFile(path.join(__dirname,'../dist/index.html'));
}
app.whenReady().then(async()=> {
  await restore(); protocol.handle('melodify-media',mediaHandler);createWindow();createTray();
  ipcMain.handle('state:load',()=>state);
  ipcMain.handle('state:save',async(_event,patch)=>{
    // Nur zugelassene Präferenzen und benutzerdefinierte Sammlungen übernehmen.
    if(patch && typeof patch==='object') {
      for(const key of ['playlists','favorites','favoritePlaylists','customThemes']) if(Array.isArray(patch[key])) state[key]=safeArray(patch[key],key==='playlists'?1000:50000);
      if(typeof patch.themeId==='string') state.themeId=patch.themeId.slice(0,120);
      if(patch.settings && typeof patch.settings==='object') state.settings={...state.settings,...patch.settings};
    }
    await saveState();return state;
  });
  ipcMain.handle('library:add-folder',async()=>{ const result=await dialog.showOpenDialog(win,{title:'Musikordner auswählen',properties:['openDirectory','multiSelections']}); if(!result.canceled){state.folders=[...new Set([...state.folders,...result.filePaths])];await saveState();return scan();}return {cancelled:true};});
  ipcMain.handle('library:rescan',()=>scan());
  ipcMain.handle('settings:tray',async(_e,v)=>{state.settings.minimizeToTray=Boolean(v); await saveState();return true;});
  ipcMain.handle('window:show',()=>win?.show());
  ipcMain.handle('playlists:import',async()=>{
    const result=await dialog.showOpenDialog(win,{title:'Playlist importieren',properties:['openFile','multiSelections'],filters:[{name:'M3U Playlists',extensions:['m3u','m3u8']}]}); if(result.canceled)return [];
    const imported=[];const tracksByPath=new Map(state.tracks.map(t=>[path.normalize(t.path).toLowerCase(),t.id]));
    for(const file of result.filePaths){try {const content=await fsp.readFile(file,'utf8');const songIds=[];for(const line of content.replace(/^\uFEFF/,'').split(/\r?\n/)){const entry=line.trim();if(!entry || entry.startsWith('#') || /^(https?:|[a-z]+:\/\/)/i.test(entry))continue;const absolute=path.isAbsolute(entry)?entry:path.resolve(path.dirname(file),entry);const id=tracksByPath.get(path.normalize(absolute).toLowerCase());if(id)songIds.push(id);}const item={id:crypto.randomUUID(),name:path.parse(file).name,trackIds:songIds,createdAt:Date.now()};state.playlists.push(item);imported.push(item);}catch{ /* Fehlerhafte M3U ignorieren */ }}await saveState();return imported;
  });
});
app.on('before-quit',()=>{quitting=true;});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();else win?.show();});
