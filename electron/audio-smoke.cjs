const { app, BrowserWindow, protocol } = require('electron');
const {serveFile} = require('./media-server.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');

protocol.registerSchemesAsPrivileged([
  { scheme: 'melodify-test', privileges: { secure: true, standard: true, stream: true, supportFetchAPI: true, corsEnabled: true } }
]);

function wavPcm16(seconds=0.4, sampleRate=44100){
  const samples=Math.floor(seconds*sampleRate), dataSize=samples*2, buffer=Buffer.alloc(44+dataSize);
  buffer.write('RIFF',0);buffer.writeUInt32LE(36+dataSize,4);buffer.write('WAVE',8);
  buffer.write('fmt ',12);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);
  buffer.writeUInt32LE(sampleRate,24);buffer.writeUInt32LE(sampleRate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);
  buffer.write('data',36);buffer.writeUInt32LE(dataSize,40);
  for(let i=0;i<samples;i++) buffer.writeInt16LE(Math.round(Math.sin(i/sampleRate*2*Math.PI*440)*8000),44+i*2);
  return buffer;
}

(async()=>{
  await app.whenReady();
  const temp=path.join(app.getPath('temp'),'melodify-audio-smoke.wav');
  await fs.writeFile(temp,wavPcm16());
  protocol.handle('melodify-test',request=>serveFile(temp,request));

  const html=`<!doctype html><html><body><audio id="a" crossorigin="anonymous"></audio><script>
    const a=document.getElementById('a');
    window.result=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('audio decode timeout')),8000);
      a.addEventListener('canplaythrough',async()=>{
        try{await a.play();clearTimeout(timer);setTimeout(()=>resolve({duration:a.duration,readyState:a.readyState,currentTime:a.currentTime}),250);}
        catch(e){clearTimeout(timer);reject(e);}
      },{once:true});
      a.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('media error code '+(a.error&&a.error.code)));},{once:true});
      a.src='melodify-test://track/test';
      a.load();
    });
  </script></body></html>`;
  const win=new BrowserWindow({show:false,width:400,height:200,webPreferences:{sandbox:true,contextIsolation:true}});
  await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
  const result=await win.webContents.executeJavaScript('window.result.then(x=>({ok:true,...x})).catch(e=>({ok:false,error:String(e)}))');
  if(!result.ok) throw new Error('Audio smoke test failed: '+result.error);
  if(!(result.duration>0 && result.readyState>=3 && result.currentTime>0)) throw new Error('Audio smoke test did not advance playback.');
  console.log('Audio smoke test passed:',result);
  win.destroy();
  await fs.rm(temp,{force:true});
  app.quit();
})().catch(error=>{console.error(error);app.exit(1);});
