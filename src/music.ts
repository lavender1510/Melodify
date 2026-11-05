import type {Track} from './types';
export const songUrl=(id:string)=>`melodify-media://track/${id}`;
export const artworkUrl=(t:Track)=>t.cover?`melodify-media://art/${t.id}`:null;
export const time=(s:number)=>{if(!Number.isFinite(s)||s<0)return '0:00';let sec=Math.floor(s);return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;};
export function searchTracks(tracks:Track[],query:string){let q=query.trim().toLocaleLowerCase('de');return q?tracks.filter(t=>[t.title,t.artist,t.album,t.format].some(v=>v.toLocaleLowerCase('de').includes(q))):tracks;}
export function sortTracks(tracks:Track[],sort:string):Track[]{const copy=[...tracks];switch(sort){case 'artist':return copy.sort((a,b)=>a.artist.localeCompare(b.artist,'de'));case 'album':return copy.sort((a,b)=>a.album.localeCompare(b.album,'de'));case 'duration':return copy.sort((a,b)=>b.duration-a.duration);case 'added':return copy.sort((a,b)=>b.addedAt-a.addedAt);default:return copy.sort((a,b)=>a.title.localeCompare(b.title,'de'));}}
export const EQ_BANDS=[60,170,310,600,1000,3000,6000,12000,14000,16000];
export const EQ_PRESETS:Record<string,number[]>={flat:[0,0,0,0,0,0,0,0,0,0],bass:[6,5,4,2,0,-1,-1,0,0,0],vocal:[-2,-1,0,2,3,4,3,1,0,-1],rock:[4,3,1,-1,-2,1,3,4,4,3],jazz:[3,2,0,1,2,2,1,2,3,3],electronic:[5,4,2,0,-1,1,2,4,5,5],classical:[3,2,1,0,0,0,1,2,3,4]};
export const presetName:Record<string,string>={flat:'Neutral',bass:'Bass Boost',vocal:'Vocals',rock:'Rock',jazz:'Jazz',electronic:'Electronic',classical:'Klassik',custom:'Benutzerdefiniert'};
