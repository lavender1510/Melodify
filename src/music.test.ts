import {expect,test} from 'vitest';
import {time,searchTracks,sortTracks,EQ_PRESETS} from './music';
import type {Track} from './types';
const make=(title:string,artist:string,duration:number):Track=>({id:title,path:'C:/'+title,title,artist,album:'Album',duration,year:null,trackNo:null,cover:false,size:1,modified:1,addedAt:1,format:'MP3'});
test('Zeitformatierung',()=>{expect(time(61)).toBe('1:01');expect(time(NaN)).toBe('0:00');});
test('Suche über Titel und Interpreten',()=>{const songs=[make('Dream','Ada',60),make('Rain','Ben',99)];expect(searchTracks(songs,'aDa')).toHaveLength(1);expect(sortTracks(songs,'duration')[0].title).toBe('Rain');});
test('Equalizer Presets bestehen aus 10 Bändern',()=>{for(const p of Object.values(EQ_PRESETS))expect(p).toHaveLength(10);});

test('Suche findet Songs über Titel, Künstler und Album unabhängig von Großschreibung',()=>{
 const a=make('Midnight Drive','Lana Del Rey',180);
 a.album='Born To Die';
 const b=make('Dreams','Fleetwood Mac',180);
 b.album='Rumours';
 const songs=[a,b];
 expect(searchTracks(songs,'midnight')).toEqual([a]);
 expect(searchTracks(songs,'LANA')).toEqual([a]);
 expect(searchTracks(songs,'born to die')).toEqual([a]);
 expect(searchTracks(songs,'fleetwood')).toEqual([b]);
 expect(searchTracks(songs,'unbekannt')).toEqual([]);
 expect(searchTracks(songs,'  ')).toEqual(songs);
});
test('Suche unterstützt mehrere Wörter, Akzente und deutsche Sonderzeichen',()=>{
 const one=make('Über den Wolken','Björk',200);
 one.album='Schöne Nächte';
 const two=make('Ueber den Wolken','Andere',210);
 const tracks=[one,two];
 expect(searchTracks(tracks,'bjork schöne')).toEqual([one]);
 expect(searchTracks(tracks,'über wolken')).toEqual([one]);
 expect(searchTracks(tracks,'schoene')).toEqual([]);
 expect(searchTracks(tracks,'UBER')).toEqual([one]);
});
