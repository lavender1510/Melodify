// Run against generated fixtures; results describe this exact Electron build only.
const {app,BrowserWindow,protocol}=require('electron');
const fs=require('node:fs/promises');const path=require('node:path');const {serveFile}=require('./media-server.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'codec-test',privileges:{secure:true,standard:true,stream:true,supportFetchAPI:true,corsEnabled:true}}]);
(async()=>{
 const directory=process.argv.at(-1);if(!directory)throw new Error('Fixture directory required');
 await app.whenReady();protocol.handle('codec-test',request=>{const name=new URL(request.url).pathname.slice(1);return /^[a-z0-9.-]+$/.test(name)?serveFile(path.join(directory,name),request):new Response(null,{status:404});});
 const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true}});await win.loadURL('data:text/html,<html lang="de"><body>Codec smoke</body></html>');
 const results=[];
 for(const name of ['tone.mp3','tone.flac','tone.wav','tone.ogg','tone.opus','tone.aac','tone.m4a','corrupt.mp3','missing.mp3']){
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const a=new Audio();a.crossOrigin='anonymous';a.preload='auto';
   const ctx=new AudioContext(),source=ctx.createMediaElementSource(a),eq=ctx.createBiquadFilter(),gain=ctx.createGain(),pan=ctx.createStereoPanner(),compressor=ctx.createDynamicsCompressor(),analyser=ctx.createAnalyser();
   source.connect(eq);eq.connect(pan);pan.connect(gain);gain.connect(compressor);compressor.connect(analyser);analyser.connect(ctx.destination);
   try {
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('timeout')),8000);a.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve();},{once:true});a.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('media error '+a.error?.code));},{once:true});a.src=${JSON.stringify('codec-test://track/'+name)};a.load();});
    await ctx.resume();await a.play();await new Promise(r=>setTimeout(r,350));const first=a.currentTime;
    a.pause();a.currentTime=.25;await a.play();await new Promise(r=>setTimeout(r,250));
    const bins=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(bins);
    const sink=typeof ctx.setSinkId==='function';if(sink)await ctx.setSinkId('');
    return {file:${JSON.stringify(name)},ok:first>0&&a.currentTime>.25&&bins.some(v=>v>0),duration:a.duration,firstTime:first,seekResumeTime:a.currentTime,webAudioSignal:bins.some(v=>v>0),defaultSink:sink};
   }catch(error){return {file:${JSON.stringify(name)},ok:false,error:String(error),mediaCode:a.error?.code};}
   finally{a.pause();a.removeAttribute('src');a.load();await ctx.close();}
  })()`);
  results.push(result);console.log(JSON.stringify(result));
 }
 await fs.mkdir('work',{recursive:true});
 await fs.writeFile(path.join('work','codec-results-'+process.platform+'.json'),JSON.stringify({electron:process.versions.electron,chromium:process.versions.chrome,platform:process.platform,results},null,2));
 const valid=results.slice(0,7);if(valid.some(r=>!r.ok && ![3,4].includes(r.mediaCode)))throw new Error('Supported fixture failed for an unexpected reason');
 if(!valid.find(r=>r.file==='tone.wav').ok || results.slice(7).some(r=>r.ok))throw new Error('WAV playback/error recovery regression');
 win.destroy();app.quit();
})().catch(e=>{console.error(e);app.exit(1);});
