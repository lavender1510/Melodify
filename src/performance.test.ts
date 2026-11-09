import {expect,it} from 'vitest';import {searchTracks,sortTracks} from './music';import type {Track} from './types';
for(const size of [1000,10000,50000])it(`search and sort ${size} metadata entries`,()=>{
 const tracks=Array.from({length:size},(_,i)=>({id:String(i),path:`C:/Musik/${i}.flac`,title:`Song ${i}`,artist:i%10?'Künstler':'Björk',album:`Album ${i%100}`,format:'FLAC',addedAt:i,duration:180,year:2020,trackNo:1,size:1000,modified:1,cover:false} satisfies Track));
 const before=performance.now();const result=sortTracks(searchTracks(tracks,'bjork flac'),'title');const elapsed=performance.now()-before;
 expect(result).toHaveLength(size/10);console.log(JSON.stringify({entries:size,searchSortMs:Math.round(elapsed*100)/100,heapMiB:Math.round(process.memoryUsage().heapUsed/1024/1024)}));
 // A broad regression bound, not a promise of UI latency or total process memory.
 expect(elapsed).toBeLessThan(5000);
});
