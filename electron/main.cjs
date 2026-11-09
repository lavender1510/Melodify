const { app, BrowserWindow, ipcMain, dialog, nativeImage, Tray, Menu, protocol } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
// Explicit CLI profiles also let desktop tests run without touching personal data.
const profile=app.commandLine.getSwitchValue('user-data-dir');
if(profile)app.setPath('userData',path.resolve(profile));
const primaryInstance=app.requestSingleInstanceLock();
if(!primaryInstance){app.quit();process.exit(0);}
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});

protocol.registerSchemesAsPrivileged([{ scheme: 'melodify-media', privileges: { secure: true, standard: true, stream: true, supportFetchAPI: true, corsEnabled: true } }]);
const {parseM3U,encodeM3U}=require('./playlists.cjs');
const {FolderWatcher}=require('./watch-folders.cjs');
const {StateStore,validate} = require('./state-store.cjs');
const {discover,mergeScan} = require('./library.cjs');
const {serveFile} = require('./media-server.cjs');
const defaults = () => ({ folders: [], tracks: [], playlists: [], favorites: [], favoritePlaylists: [], customThemes: [], themeId: 'nocturne', settings: { volume: .75, balance: 0, equalizer: [0,0,0,0,0,0,0,0,0,0], eqPreset:'flat', normalize: false, gain: 0, visualization:true, minimizeToTray:false, outputDevice:'default' } });
let state, win, tray, quitting = false, scanning = false, scanController, store, watcher;
const mediaFiles = new Map();
const storeFile = () => path.join(app.getPath('userData'), 'library.json');
const artDir = () => path.join(app.getPath('userData'), 'covers');
const saveState = () => store.save(state);
function handle(channel,callback){ipcMain.handle(channel,(event,...args)=>{if(event.sender!==win?.webContents || event.senderFrame!==win.webContents.mainFrame)throw new Error('Unzulässiger IPC-Absender.');return callback(event,...args);});}
function registerMedia() {
  mediaFiles.clear(); for (const track of state.tracks) mediaFiles.set(track.id,track.path);
}
async function restore() {
  store=new StateStore(storeFile(),defaults);
  state=await store.load(); registerMedia();
}
const publicState = () => ({...state, storageError:store.status});
function ensureWritable() { if(store.blocked) throw new Error(store.status); }
const idFor = p => crypto.createHash('sha256').update(path.resolve(p).toLowerCase()).digest('hex').slice(0,24);
function notifyProgress(payload) { if (win && !win.isDestroyed()) win.webContents.send('scan:progress',payload); }
async function readTrack(p, known) {
  try {
    const stat=await fsp.stat(p); const id=idFor(p);
    if (known && known.size===stat.size && known.modified===stat.mtimeMs) return {...known,missing:false};
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
    return { id, path:p, title: String(common.title || path.parse(p).name), artist: String(common.artist || 'Unbekannter Interpret'), album: String(common.album || 'Unbekanntes Album'), genre:(common.genre||[]).join(', '), duration: Number(format.duration || 0), year: common.year || null, trackNo:common.track?.no || null, cover, size: stat.size, modified:stat.mtimeMs, addedAt:known?.addedAt || Date.now(), format: path.extname(p).slice(1).toUpperCase() };
  } catch (e) {
    // Ungültige Audiodateien trotzdem in der Bibliothek anzeigen.
    try { const st=await fsp.stat(p); const id=idFor(p); return {id,path:p,title:path.parse(p).name,artist:'Unbekannter Interpret',album:'Unbekanntes Album',duration:0,year:null,trackNo:null,cover:false,size:st.size,modified:st.mtimeMs,addedAt:known?.addedAt||Date.now(),format:path.extname(p).slice(1).toUpperCase(),readError:true}; } catch { return null; }
  }
}
async function scan(folder) {
  ensureWritable();
  if (scanning) return {busy:true,tracks:state.tracks};
  if(folder !== undefined && !state.folders.includes(folder)) throw new Error('Unbekannter Musikordner.');
  scanning=true; scanController=new AbortController();
  const signal=scanController.signal, folders=folder?[folder]:[...state.folders];
  try {
    notifyProgress({stage:'scan',current:0,total:0});
    const paths=new Set(), errors=[];
    for (const directory of folders) await discover(directory,signal,errors,paths);
    const unique=[...paths], existing=new Map(state.tracks.map(t=>[t.path,t])), next=[];
    for(let i=0;i<unique.length;i+=4) {
      signal.throwIfAborted();
      const results=await new Promise((resolve,reject)=>{
        const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);};
        const abort=()=>{cleanup();reject(signal.reason);};
        const timer=setTimeout(()=>{cleanup();reject(new Error('Metadaten-Lesezeit überschritten. Scan wurde ohne Bibliotheksänderung beendet.'));},15000);
        signal.addEventListener('abort',abort,{once:true});
        Promise.all(unique.slice(i,i+4).map(p=>readTrack(p,existing.get(p)))).then(v=>{cleanup();resolve(v);},e=>{cleanup();reject(e);});
      });
      next.push(...results.filter(Boolean));
      notifyProgress({stage:'scan',current:Math.min(i+4,unique.length),total:unique.length});
    }
    signal.throwIfAborted();
    // Keep references and metadata when a source disappears. Partial scans retain other roots.
    state={...state,tracks:mergeScan(state.tracks,next,folders,errors),folderStatus:{...state.folderStatus,...Object.fromEntries(folders.map(f=>[f,{scannedAt:Date.now(),errors:errors.filter(e=>e.startsWith(f)),status:errors.some(e=>e.startsWith(f))?'error':'ready'}]))}};
    registerMedia(); await saveState();
    notifyProgress({stage:'done',current:unique.length,total:unique.length,message:errors.join('\n')});
    return {tracks:state.tracks,errors};
  } catch(err) {
    const cancelled=signal.aborted;
    notifyProgress({stage:cancelled?'cancelled':'error',message:cancelled?'Scan abgebrochen. Bibliothek unverändert.':err.message});
    return {cancelled,error:cancelled?undefined:err.message,tracks:state.tracks};
  } finally {scanning=false;scanController=null;}
}
async function mediaHandler(request) {
  try {
    const u = new URL(request.url);
    const id = decodeURIComponent(u.pathname.slice(1));
    if (!/^[a-f0-9]{24}$/.test(id)) return new Response('Not found', { status: 404 });

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
          'Access-Control-Allow-Headers': 'Range,Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    if (u.hostname === 'track') {
      const file = mediaFiles.get(id);
      if (!file) return new Response('Not found', { status: 404 });
      return serveFile(file, request);
    }

    if (u.hostname === 'art') {
      const cover = ['.jpg', '.png'].map(ext => path.join(artDir(), id + ext)).find(fs.existsSync);
      if (!cover) return new Response('Not found', { status: 404 });
      return serveFile(cover, request);
    }
  } catch (error) {
    console.error('[Melodify] media request failed:', error);
  }
  return new Response('Not found', { status: 404 });
}


function createTray() {
  const iconPath=path.join(app.getAppPath(),'public','melodify-logo.png');
  if(!fs.existsSync(iconPath)) return;
  let icon=nativeImage.createFromPath(iconPath).resize({width:18,height:18});
  if(icon.isEmpty()) return; tray=new Tray(icon);tray.setToolTip('Melodify');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Melodify öffnen',click:()=>win?.show()},{label:'Beenden',click:()=>{quitting=true;app.quit();}}]));tray.on('double-click',()=>win?.show());
}
function createWindow() {
  win=new BrowserWindow({width:1350,height:850,minWidth:900,minHeight:610,backgroundColor:'#0c0e13',title:'Melodify',icon:fs.existsSync(path.join(app.getAppPath(),'build','icon.ico')) ? path.join(app.getAppPath(),'build','icon.ico') : (fs.existsSync(path.join(app.getAppPath(),'public','melodify-logo.png')) ? path.join(app.getAppPath(),'public','melodify-logo.png') : undefined),show:false,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  win.once('ready-to-show',()=>win.show());
  let closeReady=false, closePending=false, closeTimer;
  const finishClose=()=>{if(closeReady)return;closeReady=true;clearTimeout(closeTimer);store.flush().finally(()=>{if(!win.isDestroyed())win.close();});};
  const ack=(event,saved=true)=>{if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)return;if(!saved){clearTimeout(closeTimer);closePending=false;quitting=false;return;}finishClose();};
  ipcMain.on('session:closed',ack);
  win.on('closed',()=>{clearTimeout(closeTimer);ipcMain.removeListener('session:closed',ack);});
  win.on('close',event=>{
    if(!quitting && state.settings.minimizeToTray && tray){event.preventDefault();win.hide();return;}
    if(closeReady)return;
    event.preventDefault();if(closePending)return;closePending=true;scanController?.abort();
    win.webContents.send('session:closing');closeTimer=setTimeout(finishClose,3000);
  });
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{ const target=process.env.MELODIFY_DEV_URL || require('node:url').pathToFileURL(path.join(__dirname,'../dist/index.html')).href;if(url!==target) event.preventDefault();});
  if(process.env.MELODIFY_DEV_URL) win.loadURL(process.env.MELODIFY_DEV_URL);
  else win.loadFile(path.join(__dirname,'../dist/index.html'));
}
app.whenReady().then(async()=> {
  if (process.platform==='win32') app.setAppUserModelId('dev.lyvt.melodify');
  await restore(); watcher=new FolderWatcher(folder=>scan(folder),(folder,error)=>notifyProgress({stage:'error',message:`Ordnerüberwachung ${folder}: ${error.message}`}));if(!store.blocked)watcher.configure(state.watchFolders||[]); protocol.handle('melodify-media',mediaHandler);createWindow();createTray();
  handle('media:diagnose', async (_event, id) => {
    if (typeof id !== 'string' || !/^[a-f0-9]{24}$/.test(id)) return {ok:false,reason:'Ungültige Titel-ID.'};
    const file = mediaFiles.get(id);
    if (!file) return {ok:false,reason:'Titel ist nicht in der Medienbibliothek registriert. Bitte Bibliothek neu scannen.'};
    try {
      const stat = await fsp.stat(file);
      await fsp.access(file, fs.constants.R_OK);
      if (!stat.isFile() || !stat.size) return {ok:false,reason:'Die Musikdatei ist leer oder keine reguläre Datei.'};
      return {ok:true,format:path.extname(file).slice(1).toUpperCase(),size:stat.size};
    } catch (error) {
      const code = error && error.code;
      return {ok:false,reason:code === 'ENOENT'
        ? 'Die Musikdatei wurde verschoben oder gelöscht. Bitte Bibliothek neu scannen.'
        : code === 'EACCES' || code === 'EPERM'
          ? 'Kein Lesezugriff auf die Musikdatei. Prüfe die Windows-Dateiberechtigungen.'
          : 'Die Musikdatei ist nicht lesbar. Prüfe den Datenträger und scanne erneut.'};
    }
  });
  handle('state:load',()=>publicState());
  handle('state:recover',async()=>{if(scanning)throw new Error('Bitte zuerst den Scan abbrechen.');state=await store.recover();registerMedia();watcher.configure(state.watchFolders||[]);return publicState();});
  handle('state:save',async(_event,patch)=>{
    ensureWritable();
    if(!patch || typeof patch!=='object' || Array.isArray(patch)) throw new Error('Ungültige Daten.');
    const allowed={};
    for(const key of ['playlists','favorites','favoritePlaylists','customThemes','themeId','session']) if(Object.hasOwn(patch,key)) allowed[key]=patch[key];
    if(Object.hasOwn(patch,'settings')) allowed.settings={...state.settings,...patch.settings};
    const candidate=validate({...state,...allowed},defaults);
    state=candidate; await saveState();return publicState();
  });
  handle('library:add-folder',async()=>{ ensureWritable(); if(scanning)throw new Error('Bitte laufenden Scan abwarten oder abbrechen.'); const result=await dialog.showOpenDialog(win,{title:'Musikordner auswählen',properties:['openDirectory','multiSelections']}); if(!result.canceled){state.folders=[...new Set([...state.folders,...result.filePaths])];await saveState();return scan();}return {cancelled:true};});
  handle('library:rescan',(_event,folder)=>scan(folder));
  handle('library:watch',async(_event,folder,enabled)=>{ensureWritable();if(!state.folders.includes(folder)||typeof enabled!=='boolean')throw new Error('Ungültiger Musikordner.');state={...state,watchFolders:enabled?[...new Set([...(state.watchFolders||[]),folder])]:(state.watchFolders||[]).filter(f=>f!==folder)};await saveState();watcher.configure(state.watchFolders);return publicState();});
  handle('library:cancel',()=>{scanController?.abort();return true;});
  handle('library:remove',async(_event,folder)=>{
    ensureWritable(); if(scanning)throw new Error('Bitte laufenden Scan zuerst abbrechen.');
    if(typeof folder!=='string' || !state.folders.includes(folder))throw new Error('Unbekannter Musikordner.');
    // Remove the source only, never music files, metadata, favorites or playlist links.
    state={...state,folders:state.folders.filter(f=>f!==folder),watchFolders:(state.watchFolders||[]).filter(f=>f!==folder)};watcher.configure(state.watchFolders);await saveState();return publicState();
  });
  handle('playlists:export',async(_event,id)=>{
    const playlist=state.playlists.find(p=>p.id===id);if(!playlist)throw new Error('Unbekannte Playlist.');
    const result=await dialog.showSaveDialog(win,{title:'Playlist exportieren',defaultPath:playlist.name.replace(/[<>:"/\\|?*]/g,'_')+'.m3u8',filters:[{name:'M3U8 / M3U',extensions:['m3u8','m3u']}]});
    if(result.canceled)return false;
    await fsp.writeFile(result.filePath,encodeM3U(playlist,state),'utf8');return true;
  });
  handle('settings:tray',async(_e,v)=>{ensureWritable();if(typeof v!=='boolean')throw new Error('Ungültige Einstellung.');state.settings.minimizeToTray=v; await saveState();return true;});
  handle('window:show',()=>win?.show());
  handle('playlists:import',async()=>{
    ensureWritable();
    const result=await dialog.showOpenDialog(win,{title:'Playlist importieren',properties:['openFile','multiSelections'],filters:[{name:'M3U Playlists',extensions:['m3u','m3u8']}]}); if(result.canceled)return {playlists:[],warnings:[]};
    const imported=[],errors=[];
    for(const file of result.filePaths){
      try {
        const {ids,unmatched,remote}=parseM3U(await fsp.readFile(file,'utf8'),file,state.tracks);
        const item={id:crypto.randomUUID(),name:path.parse(file).name,trackIds:ids,createdAt:Date.now()};
        state.playlists.push(item);imported.push(item);
        if(unmatched||remote)errors.push(`${item.name}: ${unmatched} lokale Einträge nicht gefunden; ${remote} Online-Einträge übersprungen.`);
      }catch(error){errors.push(`${path.basename(file)}: ${error.message}`);}
    }
    await saveState();return {playlists:imported,warnings:errors};

  });
});
app.on('before-quit',()=>{quitting=true;watcher?.close();scanController?.abort();});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();else win?.show();});
