import {describe,expect,it} from 'vitest';
import {spicetifyFamilies,spicetifyThemes} from './spicetifyThemes';
import {themes} from './theme';
const color = /^#[0-9a-f]{6}$/i;
describe('Spicetify imported palettes',()=>{
 it('imports all 114 configured schemes from 14 theme families',()=>{
   expect(spicetifyThemes).toHaveLength(114);
   expect(spicetifyFamilies).toHaveLength(14);
 });
 it('has unique stable IDs and every required color',()=>{
   expect(new Set(spicetifyThemes.map(x=>x.id)).size).toBe(spicetifyThemes.length);
   for(const theme of spicetifyThemes){
     for(const key of ['background','surface','panel','text','muted','accent'] as const)
       expect(theme[key],theme.name+' '+key).toMatch(color);
     expect(theme.description.startsWith('Spicetify · ')).toBe(true);
   }
 });
 it('does not replace the eight built-in Melodify themes',()=>{
   expect(themes).toHaveLength(8);
   expect(spicetifyThemes.every(x=>!themes.some(t=>t.id===x.id))).toBe(true);
 });
});
