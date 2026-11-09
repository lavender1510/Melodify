import type {AppState,Playlist} from './types';
/** Smart collections use only local metadata. Manual lists keep every stored ID. */
export function playlistIds(playlist:Playlist,state:Pick<AppState,'tracks'|'favorites'>):string[]{
 if(playlist.rule==='favorites')return [...state.favorites];
 if(playlist.rule==='recent')return [...state.tracks].sort((a,b)=>b.addedAt-a.addedAt).slice(0,100).map(t=>t.id);
 return playlist.trackIds;
}
export function moveItem<T>(items:T[],from:number,to:number):T[]{
 if(from<0||to<0||from>=items.length||to>=items.length)return items;
 const next=[...items];next.splice(to,0,next.splice(from,1)[0]);return next;
}
