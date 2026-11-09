const fs = require('node:fs/promises');
const path = require('node:path');
const VERSION = 1;
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const strings = v => Array.isArray(v) && v.every(x => typeof x === 'string');
function validate(raw, defaults) {
  if (!object(raw) || (raw.schemaVersion !== undefined && raw.schemaVersion !== VERSION)) throw new Error('Unbekannte oder ungültige Datenversion.');
  const next = {...defaults(), ...raw, schemaVersion: VERSION};
  for (const key of ['folders','favorites','favoritePlaylists']) if (!strings(next[key])) throw new Error(`Ungültiges Feld: ${key}`);
  if(next.watchFolders!==undefined && (!strings(next.watchFolders)||next.watchFolders.some(f=>!next.folders.includes(f))))throw new Error('Ungültige Ordnerüberwachung.');
  if (!Array.isArray(next.tracks) || !next.tracks.every(t => object(t) && /^[a-f0-9]{24}$/.test(t.id) && typeof t.path === 'string' && ['title','artist','album','format'].every(k => typeof t[k] === 'string') && ['duration','size','modified','addedAt'].every(k => Number.isFinite(t[k]) && t[k] >= 0))) throw new Error('Ungültige Musikbibliothek.');
  if (!Array.isArray(next.playlists) || !next.playlists.every(p => object(p) && typeof p.id === 'string' && typeof p.name === 'string' && strings(p.trackIds) && Number.isFinite(p.createdAt) && (p.rule===undefined || ['favorites','recent'].includes(p.rule)) && (p.coverImage===undefined || (typeof p.coverImage==='string' && /^data:image\/(png|jpeg|webp);base64,/.test(p.coverImage) && p.coverImage.length<3000000)))) throw new Error('Ungültige Playlists.');
  if (!Array.isArray(next.customThemes) || !next.customThemes.every(t => object(t) && ['id','name','description','background','surface','panel','text','muted','accent'].every(k=>typeof t[k] === 'string') && Number.isFinite(t.radius) && Number.isFinite(t.transparency))) throw new Error('Ungültige Themes.');
  if (typeof next.themeId !== 'string' || !object(next.settings)) throw new Error('Ungültige Einstellungen.');
  next.settings = {...defaults().settings, ...next.settings};
  for (const [key,min,max] of [['volume',0,1],['balance',-1,1],['gain',-12,12]]) if (!Number.isFinite(next.settings[key]) || next.settings[key] < min || next.settings[key] > max) throw new Error(`Ungültige Einstellung: ${key}`);
  if (!Array.isArray(next.settings.equalizer) || next.settings.equalizer.length !== 10 || !next.settings.equalizer.every(x=>Number.isFinite(x)&&x>=-12&&x<=12)) throw new Error('Ungültiger Equalizer.');
  for (const key of ['normalize','visualization','minimizeToTray']) if (typeof next.settings[key] !== 'boolean') throw new Error(`Ungültige Einstellung: ${key}`);
  for (const key of ['outputDevice','eqPreset']) if (typeof next.settings[key] !== 'string') throw new Error(`Ungültige Einstellung: ${key}`);
  if (next.session !== undefined && (!object(next.session) || !strings(next.session.queue) || !(next.session.activeId===null || typeof next.session.activeId==='string') || !Number.isFinite(next.session.position) || next.session.position<0 || !['off','all','one'].includes(next.session.repeat) || typeof next.session.shuffle!=='boolean')) throw new Error('Ungültige Wiedergabesitzung.');
  return next;
}
class StateStore {
  constructor(file, defaults) { this.file=file; this.defaults=defaults; this.tail=Promise.resolve(); this.blocked=false; this.status=null; this.recovering=false; }
  async read(file) { return validate(JSON.parse(await fs.readFile(file,'utf8')), this.defaults); }
  async load() {
    try { return await this.read(this.file); }
    catch(error) {
      if (error.code==='ENOENT') return validate(this.defaults(),this.defaults);
      this.blocked=true; this.status='Die Bibliothek ist beschädigt oder nicht lesbar. Speichern ist gesperrt. Originaldaten bleiben erhalten. Bitte Backup wiederherstellen.';
      return validate(this.defaults(),this.defaults);
    }
  }
  save(state) {
    // Validate and capture now: later mutations must never change a queued snapshot.
    let data; try { if(this.recovering)throw new Error('Wiederherstellung läuft.');if(this.blocked) throw new Error(this.status); data=JSON.stringify(validate(state,this.defaults),null,2); } catch(e) { return Promise.reject(e); }
    const operation=this.tail.then(async()=>{
      await fs.mkdir(path.dirname(this.file),{recursive:true});
      const temp=this.file+'.tmp';
      const handle=await fs.open(temp,'w');
      try { await handle.writeFile(data,'utf8'); await handle.sync(); } finally { await handle.close(); }
      // Only valid primary data may replace the last known good backup.
      try { await this.read(this.file); await fs.copyFile(this.file,this.file+'.backup.tmp'); await fs.rename(this.file+'.backup.tmp',this.file+'.backup'); }
      catch(e) { if(e.code!=='ENOENT') throw e; }
      await fs.rename(temp,this.file);
    });
    this.tail=operation.catch(()=>{}); return operation;
  }
  async recover() {
    if(this.recovering)throw new Error('Wiederherstellung läuft.');this.recovering=true;
    try {
    await this.tail;
    const recovered=await this.read(this.file+'.backup');
    // Preserve even malformed original bytes before an explicit recovery.
    try { await fs.copyFile(this.file,this.file+'.damaged-'+Date.now()); } catch(e) { if(e.code!=='ENOENT') throw e; }
    // Keep the validated backup intact; do not route recovery through backup rotation.
    await fs.mkdir(path.dirname(this.file),{recursive:true});
    const handle=await fs.open(this.file+'.recovery.tmp','w');
    try { await handle.writeFile(JSON.stringify(recovered,null,2)); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(this.file+'.recovery.tmp',this.file);
    this.blocked=false; this.status=null; return recovered;
    } finally {this.recovering=false;}
  }
  flush() { return this.tail; }
}
module.exports={StateStore,validate};
