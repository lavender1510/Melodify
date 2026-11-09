const fs = require('node:fs/promises');
const path = require('node:path');
const AUDIO_EXT = new Set(['.mp3','.flac','.wav','.ogg','.oga','.m4a','.aac','.opus']);
const inside = (file, folder) => {const relative=path.relative(folder,file);return relative==='' || (!relative.startsWith('..'+path.sep) && relative!=='..' && !path.isAbsolute(relative));};
async function discover(folder, signal, errors, out=new Set(), count={n:0}) {
  signal.throwIfAborted();
  let entries;
  try { entries=await fs.readdir(folder,{withFileTypes:true}); }
  catch(error) { errors.push(`${folder}: ${error.code || error.message}`); return out; }
  for(const entry of entries) {
    signal.throwIfAborted();
    if(++count.n>150000) throw new Error('Scanlimit von 150.000 Verzeichniseinträgen erreicht. Bitte kleinere Ordner auswählen.');
    const file=path.join(folder,entry.name);
    if(entry.isDirectory()) await discover(file,signal,errors,out,count);
    else if(entry.isFile() && AUDIO_EXT.has(path.extname(file).toLowerCase())) out.add(file);
  }
  return out;
}
function mergeScan(previous, scanned, folders, errors) {
  const byId=new Map(scanned.map(t=>[t.id,{...t,missing:false}]));
  for(const track of previous) if(!byId.has(track.id)) {
    const covered=folders.some(folder=>inside(track.path,folder));
    // A failed subtree is unknown, not proof of a missing file.
    byId.set(track.id,covered && !errors.length ? {...track,missing:true} : track);
  }
  return [...byId.values()].sort((a,b)=>a.title.localeCompare(b.title,'de'));
}
module.exports={discover,inside,mergeScan};
