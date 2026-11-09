const path=require('node:path');
function parseM3U(content,file,tracks,paths=path){
 const byPath=new Map(tracks.map(t=>[paths.normalize(t.path).toLowerCase(),t.id]));
 const ids=[];let unmatched=0,remote=0;
 for(const line of content.replace(/^\uFEFF/,'').split(/\r?\n/)){
  const entry=line.trim();if(!entry||entry.startsWith('#'))continue;
  if(/^[a-z]+:\/\//i.test(entry)||/^https?:/i.test(entry)){remote++;continue;}
  const absolute=paths.isAbsolute(entry)?entry:paths.resolve(paths.dirname(file),entry);
  const id=byPath.get(paths.normalize(absolute).toLowerCase());if(id)ids.push(id);else unmatched++;
 }
 return {ids,unmatched,remote};
}
function playlistIds(playlist,state){
 return playlist.rule==='favorites'?state.favorites:playlist.rule==='recent'?[...state.tracks].sort((a,b)=>b.addedAt-a.addedAt).slice(0,100).map(t=>t.id):playlist.trackIds;
}
function encodeM3U(playlist,state){
 const byId=new Map(state.tracks.map(t=>[t.id,t]));const lines=['#EXTM3U'];
 for(const id of playlistIds(playlist,state)){const t=byId.get(id);if(t)lines.push('#EXTINF:'+Math.round(t.duration)+','+(t.artist+' - '+t.title).replace(/[\r\n]/g,' '),t.path.replace(/[\r\n]/g,''));}
 return '\uFEFF'+lines.join('\r\n')+'\r\n';
}
module.exports={parseM3U,encodeM3U,playlistIds};
