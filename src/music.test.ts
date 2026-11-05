import {expect,test} from 'vitest';
import {time,searchTracks,sortTracks,EQ_PRESETS} from './music';
import type {Track} from './types';
const make=(title:string,artist:string,duration:number):Track=>({id:title,path:'C:/'+title,title,artist,album:'Album',duration,year:null,trackNo:null,cover:false,size:1,modified:1,addedAt:1,format:'MP3'});
test('Zeitformatierung',()=>{expect(time(61)).toBe('1:01');expect(time(NaN)).toBe('0:00');});
test('Suche über Titel und Interpreten',()=>{const songs=[make('Dream','Ada',60),make('Rain','Ben',99)];expect(searchTracks(songs,'aDa')).toHaveLength(1);expect(sortTracks(songs,'duration')[0].title).toBe('Rain');});
test('Equalizer Presets bestehen aus 10 Bändern',()=>{for(const p of Object.values(EQ_PRESETS))expect(p).toHaveLength(10);});
