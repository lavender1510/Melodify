const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const {parseM3U,encodeM3U}=require('./playlists.cjs');
const tracks=[{id:'a',path:'C:\\Musik\\Ärztin.mp3',artist:'Ärztin',title:'Grüße',duration:42},{id:'b',path:'C:\\Musik\\B.flac',artist:'B',title:'Zwei',duration:55}];
test('Windows M3U imports BOM, relative paths, unicode and duplicate order; counts skipped entries',()=>{
 const result=parseM3U('\uFEFF#EXTM3U\r\nMusik\\B.flac\r\nC:\\Musik\\Ärztin.mp3\r\nMusik\\B.flac\r\nhttp://example.test/test.mp3\r\nmissing.mp3','C:\\test.m3u8',tracks,path.win32);
 assert.deepEqual(result,{ids:['b','a','b'],unmatched:1,remote:1});
});
test('M3U8 export round-trips exact stored order including missing filesystem entries',()=>{
 const state={tracks,favorites:['a']},playlist={trackIds:['b','a','b']};const text=encodeM3U(playlist,state);assert.equal(text.startsWith('\uFEFF#EXTM3U'),true);assert.deepEqual(parseM3U(text,'C:\\list.m3u8',tracks,path.win32).ids,playlist.trackIds);assert.deepEqual(parseM3U(encodeM3U({rule:'favorites'},state),'C:\\list.m3u8',tracks,path.win32).ids,['a']);
});
