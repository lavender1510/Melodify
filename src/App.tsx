import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {CSSProperties,DragEvent} from 'react';
import {Activity,Album,ArrowDownAZ,ArrowLeft,ArrowRight,AudioLines,Check,ChevronDown,ChevronLeft,ChevronRight,Clock3,Disc3,Folder,Headphones,Heart,Home,Import,Library, ListMusic,Maximize2,Minus,MoreHorizontal,Music2,Pause,Play,Plus,Repeat,Repeat1,RotateCcw,Search,Settings2,Shuffle,SkipBack,SkipForward,SlidersHorizontal,Volume2,VolumeX,X} from 'lucide-react';
import type {AppState,AudioSettings,Playlist,Theme,Track,ScanProgress} from './types';
import {themes,paletteCss,isLight} from './theme';
import {artworkUrl,songUrl,searchTracks,sortTracks,time,EQ_BANDS,EQ_PRESETS,presetName} from './music';

type Page='home'|'songs'|'albums'|'artists'|'folders'|'favorites'|'playlists'|'settings';
type RepeatMode='off'|'all'|'one';
const DEFAULT:AppState={folders:[],tracks:[],playlists:[],favorites:[],favoritePlaylists:[],customThemes:[],themeId:'nocturne',settings:{volume:.75,balance:0,equalizer:[0,0,0,0,0,0,0,0,0,0],eqPreset:'flat',normalize:false,gain:0,visualization:true,minimizeToTray:false,outputDevice:'default'}};
const createId=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
function Cover({track,size='small'}:{track?:Track|null;size?:'tiny'|'small'|'medium'|'large'|'hero'}){
 const [broken,setBroken]=useState(false);
 useEffect(()=>setBroken(false),[track?.id]);
 return <div className={'cover cover-'+size}>{track?.cover&&!broken?<img src={artworkUrl(track)!} onError={()=>setBroken(true)} alt="Albumcover"/>:<div className="cover-fallback"><Music2 size={size==='hero'?82:size==='large'?45:23} strokeWidth={1.25}/></div>}</div>;
}
function Visualizer({analyser,active,className='',styleType='bars'}:{analyser:AnalyserNode|null;active:boolean;className?:string;styleType?:'bars'|'wave'|'circle'}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  let frame=0;let raf=0;const data=analyser?new Uint8Array(analyser.frequencyBinCount):null;
  const paint=()=>{
   const width=canvas.clientWidth||300,height=canvas.clientHeight||100;
   if(canvas.width!==Math.round(width*devicePixelRatio)||canvas.height!==Math.round(height*devicePixelRatio)){canvas.width=Math.round(width*devicePixelRatio);canvas.height=Math.round(height*devicePixelRatio);}
   ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);ctx.clearRect(0,0,width,height);
   if(data && analyser && active)analyser.getByteFrequencyData(data);
   const count=Math.max(12,Math.floor(width/11)),gap=3,bar=Math.max(2,width/count-gap);
   const color=getComputedStyle(canvas).getPropertyValue('--accent').trim()||'#b99bff';ctx.fillStyle=color;
   if(styleType==='bars')for(let i=0;i<count;i++){const bin=data?data[Math.floor(i*.68*data.length/count)]/255:0;const amp=(active&&analyser)?Math.max(.06,bin):.07;const h=Math.max(3,amp*height*.87);ctx.globalAlpha=.3+.7*amp;ctx.fillRect(i*(bar+gap),height-h,bar,h);}
   else if(styleType==='wave'){ctx.beginPath();ctx.lineWidth=2;ctx.globalAlpha=.9;const wave=new Uint8Array(analyser?.fftSize||256);if(active&&analyser)analyser.getByteTimeDomainData(wave);for(let i=0;i<wave.length;i++){const x=i/(wave.length-1)*width,y=active&&analyser?wave[i]/255*height:height/2;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=color;ctx.stroke();}
   else {const bins=data||new Uint8Array(128),cx=width/2,cy=height/2,base=Math.min(width,height)*.2;for(let i=0;i<96;i++){const angle=i/96*Math.PI*2-Math.PI/2,amp=active&&analyser?bins[Math.floor(i/96*bins.length*.25)]/255:0;ctx.beginPath();ctx.lineWidth=2;ctx.globalAlpha=.4+amp*.6;ctx.moveTo(cx+Math.cos(angle)*base,cy+Math.sin(angle)*base);ctx.lineTo(cx+Math.cos(angle)*(base+amp*base*.8+2),cy+Math.sin(angle)*(base+amp*base*.8+2));ctx.strokeStyle=color;ctx.stroke();}}
   ctx.globalAlpha=1;frame++;raf=requestAnimationFrame(paint);
  };
  if(active)paint();else ctx.clearRect(0,0,canvas.width,canvas.height);return ()=>cancelAnimationFrame(raf);
 },[analyser,active,styleType]);
 return <canvas ref={ref} className={'visualizer '+className} aria-label="Audio-Visualisierung"/>;
}
const IconButton=({children,onClick,title,active=false,disabled=false}:{children:React.ReactNode;onClick?:()=>void;title:string;active?:boolean;disabled?:boolean})=><button className={'icon-button '+(active?'active':'')} onClick={onClick} disabled={disabled} aria-label={title} title={title}>{children}</button>;

function trackFormatLabel(src:string){
  try{
    const ext=new URL(src).pathname.split('.').pop()?.toUpperCase();
    return ext?`Format: ${ext}`:'Audioquelle unbekannt';
  }catch{return 'Audioquelle unbekannt';}
}
function audiomediaSink(element:HTMLAudioElement){
  const candidate=element as HTMLAudioElement & {setSinkId?:(sinkId:string)=>Promise<void>};
  return typeof candidate.setSinkId==='function'?candidate:null;
}
export default function App(){
 const [state,setState]=useState<AppState>(DEFAULT);
 const [loading,setLoading]=useState(true);
 const [page,setPage]=useState<Page>('home');
 const [selectedPlaylist,setSelectedPlaylist]=useState<string|null>(null);
 const [selectedArtist,setSelectedArtist]=useState<string|null>(null);
 const [selectedAlbum,setSelectedAlbum]=useState<string|null>(null);
 const [selectedFolder,setSelectedFolder]=useState<string|null>(null);
 const [search,setSearch]=useState('');
 const [sort,setSort]=useState('title');
 const [filterFav,setFilterFav]=useState(false);
 const [activeId,setActiveId]=useState<string|null>(null);
 const [queue,setQueue]=useState<string[]>([]);
 const [queueOpen,setQueueOpen]=useState(false);
 const [nowPlaying,setNowPlaying]=useState(false);
 const [playing,setPlaying]=useState(false);
 const [position,setPosition]=useState(0);
 const [duration,setDuration]=useState(0);
 const [repeat,setRepeat]=useState<RepeatMode>('off');
 const [shuffle,setShuffle]=useState(false);
 const [scanProgress,setScanProgress]=useState<ScanProgress|null>(null);
 const [toast,setToast]=useState('');
 const [actionTrack,setActionTrack]=useState<string|null>(null);
 const [themeEdit,setThemeEdit]=useState<Theme|null>(null);
 const [showThemeEditor,setShowThemeEditor]=useState(false);
 const [outputDevices,setOutputDevices]=useState<MediaDeviceInfo[]>([]);
 const [audioError,setAudioError]=useState('');
 const [playlistDialog,setPlaylistDialog]=useState(false);
 const [playlistName,setPlaylistName]=useState('');
 const [vizStyle,setVizStyle]=useState<'bars'|'wave'|'circle'>(()=>{const v=localStorage.getItem('melodify-viz-style');return v==='wave'||v==='circle'?v:'bars'});
 useEffect(()=>localStorage.setItem('melodify-viz-style',vizStyle),[vizStyle]);
 const [activeOutput,setActiveOutput]=useState('default');
 const [splash,setSplash]=useState(true);
 const audio=useRef<HTMLAudioElement>(new Audio());
 const nodes=useRef<{ctx:AudioContext;bands:BiquadFilterNode[];pan:StereoPannerNode;gain:GainNode;compressor:DynamicsCompressorNode;analyser:AnalyserNode}|null>(null);
 const [analyser,setAnalyser]=useState<AnalyserNode|null>(null);
 const queueRef=useRef<string[]>([]),activeRef=useRef<string|null>(null),repeatRef=useRef<RepeatMode>('off'),shuffleRef=useRef(false),playingRef=useRef(false);
 const tracksById=useMemo(()=>new Map(state.tracks.map(s=>[s.id,s])),[state.tracks]);
 const activeTrack=activeId?tracksById.get(activeId):undefined;
 const allThemes=[...themes,...state.customThemes];
 const theme=allThemes.find(t=>t.id===state.themeId)||themes[0];
 const style=paletteCss(theme) as CSSProperties;
 const settings=state.settings;
 const tracksRef=useRef(tracksById);tracksRef.current=tracksById;
 const tracks=state.tracks;
 const currentIndex=queue.indexOf(activeId||'');
 const notify=(message:string)=>{setToast(message);};
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3400);return()=>clearTimeout(timer);},[toast]);
 useEffect(()=>{
  if (loading) return;
  // Splash remains visible while the library initializes; animate the exit
  // only when the main UI is ready, rather than fading out on a fixed clock.
  const timer=window.setTimeout(()=>setSplash(false),900);
  return()=>window.clearTimeout(timer);
 },[loading]);
 useEffect(()=>{audio.current.crossOrigin='anonymous';audio.current.preload='auto';},[]);
 useEffect(()=>{window.melodify?.load().then(s=>setState(s)).catch(()=>notify('Bibliothek konnte nicht geladen werden.')).finally(()=>setLoading(false));const unsub=window.melodify?.onScanProgress(p=>setScanProgress(p));return()=>unsub?.();},[]);
 const persist=(patch:Partial<AppState>)=>{setState(prev=>({...prev,...patch,settings:patch.settings||prev.settings}));window.melodify?.save(patch).catch(()=>notify('Speichern fehlgeschlagen.'));};
 const updateSettings=(patch:Partial<AudioSettings>)=>{const next={...settings,...patch};persist({settings:next});};
 useEffect(()=>{queueRef.current=queue;},[queue]);useEffect(()=>{activeRef.current=activeId;},[activeId]);useEffect(()=>{repeatRef.current=repeat;},[repeat]);useEffect(()=>{shuffleRef.current=shuffle;},[shuffle]);useEffect(()=>{playingRef.current=playing;},[playing]);
 const prepareAudio=useCallback(async()=>{
  if(nodes.current) {if(nodes.current.ctx.state==='suspended')await nodes.current.ctx.resume();return;}
  const AudioContextCtor=window.AudioContext;
  const sinkId=settings.outputDevice&&settings.outputDevice!=='default'?settings.outputDevice:'';
  const ctx=new AudioContextCtor(sinkId?({sinkId} as AudioContextOptions & {sinkId:string}):undefined);
  const source=ctx.createMediaElementSource(audio.current);
  const bands=EQ_BANDS.map((freq,i)=>{const b=ctx.createBiquadFilter();b.type=i===0?'lowshelf':i===EQ_BANDS.length-1?'highshelf':'peaking';b.frequency.value=freq;b.Q.value=1;b.gain.value=settings.equalizer[i]||0;return b;});
  const pan=ctx.createStereoPanner(),gain=ctx.createGain(),compressor=ctx.createDynamicsCompressor(),analyserNode=ctx.createAnalyser();analyserNode.fftSize=256;analyserNode.smoothingTimeConstant=.82;
  let last:AudioNode=source;for(const band of bands){last.connect(band);last=band;}
  last.connect(pan);pan.connect(gain);gain.connect(compressor);compressor.connect(analyserNode);analyserNode.connect(ctx.destination);
  nodes.current={ctx,bands,pan,gain,compressor,analyser:analyserNode};setAnalyser(analyserNode);await ctx.resume();
 },[settings.equalizer]);
 useEffect(()=>{
  const a=audio.current;
  const onTime=()=>setPosition(a.currentTime||0);
  const onLoaded=()=>setDuration(Number.isFinite(a.duration)?a.duration:0);
  const onPlay=()=>{setPlaying(true);setAudioError('');};
  const onPause=()=>setPlaying(false);
  const onError=()=>{
    const error=a.error;
    const reason=error?.code===MediaError.MEDIA_ERR_ABORTED?'Wiedergabe wurde abgebrochen.':
      error?.code===MediaError.MEDIA_ERR_NETWORK?'Die Audiodatei konnte nicht gelesen werden. Prüfe den Dateipfad oder den Datenträger.':
      error?.code===MediaError.MEDIA_ERR_DECODE?'Der Decoder konnte dieses Audioformat oder den Stream nicht dekodieren.':
      error?.code===MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED?'Das Audioformat wird von der eingebauten Wiedergabe nicht unterstützt.':
      'Unbekannter Audiofehler.';
    setAudioError(`${reason} (${trackFormatLabel(a.src)})`);
    setPlaying(false);
  };
  a.addEventListener('timeupdate',onTime);a.addEventListener('loadedmetadata',onLoaded);a.addEventListener('durationchange',onLoaded);a.addEventListener('play',onPlay);a.addEventListener('pause',onPause);a.addEventListener('error',onError);
  return()=>{a.removeEventListener('timeupdate',onTime);a.removeEventListener('loadedmetadata',onLoaded);a.removeEventListener('durationchange',onLoaded);a.removeEventListener('play',onPlay);a.removeEventListener('pause',onPause);a.removeEventListener('error',onError);a.pause();};
 },[]);
 useEffect(()=>{const n=nodes.current;if(!n)return;n.bands.forEach((b,i)=>b.gain.setTargetAtTime(settings.equalizer[i]||0,n.ctx.currentTime,.02));n.pan.pan.setTargetAtTime(settings.balance,n.ctx.currentTime,.02);n.gain.gain.setTargetAtTime(Math.pow(10,settings.gain/20),n.ctx.currentTime,.02);n.compressor.threshold.value=settings.normalize?-19:0;n.compressor.ratio.value=settings.normalize?3:1;audio.current.volume=settings.volume;},[settings]);
 useEffect(()=>{audio.current.volume=settings.volume;},[settings.volume]);
 useEffect(()=>{
  let cancelled=false;
  const select=async()=>{
    const id=settings.outputDevice||'default';
    try{
      const context=nodes.current?.ctx as (AudioContext & {setSinkId?:(sinkId:string)=>Promise<void>})|undefined;
      if(context?.setSinkId){
        await context.setSinkId(id==='default'?'':id);
      }else if(id!=='default'){
        const media=audiomediaSink(audio.current);
        if(media) await media.setSinkId(id);
        else throw new Error('Dieser Electron-Build unterstützt keine direkte Auswahl des Audioausgabegeräts.');
      }
      if(!cancelled){setActiveOutput(id);setAudioError('');}
    }catch(err){
      if(!cancelled){
        const message=err instanceof DOMException?`${err.name}: ${err.message}`:String(err instanceof Error?err.message:err);
        setAudioError(`Ausgabegerät konnte nicht gewechselt werden: ${message}`);
        setActiveOutput('default');
        setState(prev=>({...prev,settings:{...prev.settings,outputDevice:'default'}}));
        window.melodify?.save({settings:{...settings,outputDevice:'default'}}).catch(()=>{});
      }
    }
  };
  void select();
  return()=>{cancelled=true};
},[settings.outputDevice]);
 const refreshOutputs=()=>{navigator.mediaDevices?.enumerateDevices().then(ds=>setOutputDevices(ds.filter(d=>d.kind==='audiooutput'))).catch(()=>{});};
 useEffect(()=>{refreshOutputs();navigator.mediaDevices?.addEventListener('devicechange',refreshOutputs);return()=>navigator.mediaDevices?.removeEventListener('devicechange',refreshOutputs);},[]);
 const startTrack=useCallback(async(id:string,order?:string[])=>{
  const track=tracksRef.current.get(id);if(!track)return;
  if(order && order.length){queueRef.current=order;setQueue(order);}else if(queueRef.current.length===0){queueRef.current=[id];setQueue([id]);}
  activeRef.current=id;setActiveId(id);setPosition(0);setAudioError('');
  const a=audio.current;
  const diagnosis=await window.melodify?.diagnoseMedia(id);
  if (diagnosis && !diagnosis.ok) {
    setPlaying(false);
    setAudioError(`„${track.title}“: ${diagnosis.reason || 'Datei nicht verfügbar.'}`);
    return;
  }
  a.pause();
  a.currentTime=0;
  a.src=songUrl(id);
  a.load();
  try{
    await prepareAudio();
    await new Promise<void>((resolve,reject)=>{
      if(a.readyState>=HTMLMediaElement.HAVE_METADATA){resolve();return;}
      const onReady=()=>{cleanup();resolve();};
      const onError=()=>{cleanup();reject(a.error||new Error('Audioquelle konnte nicht geladen werden.'));};
      const cleanup=()=>{a.removeEventListener('loadedmetadata',onReady);a.removeEventListener('error',onError);};
      a.addEventListener('loadedmetadata',onReady,{once:true});
      a.addEventListener('error',onError,{once:true});
    });
    await a.play();
  }catch(err){
    setPlaying(false);
    const detail=err instanceof Error?err.message:String(err);
    const reason=a.error?.code===MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
      ? 'Die Audiodatei kann nicht geladen oder dekodiert werden. Prüfe, ob die Datei beschädigt ist oder der Codec unterstützt wird.'
      : detail;
    setAudioError(`„${track.title}“ (${track.format}): ${reason}`);
    console.error('[Melodify] playback failed',err);
  }
 },[prepareAudio]);
 const nextTrack=useCallback((direction:1|-1=1,ended=false)=>{
  const list=queueRef.current;if(!list.length)return;
  if(ended && repeatRef.current==='one'){audio.current.currentTime=0;void audio.current.play();return;}
  const idx=list.indexOf(activeRef.current||'');let next=idx+direction;
  if(direction===1&&shuffleRef.current&&list.length>1){let candidate=idx;while(candidate===idx)candidate=Math.floor(Math.random()*list.length);next=candidate;}
  if(next<0)next=list.length-1;
  if(next>=list.length){if(repeatRef.current==='all'){next=0;}else if(ended){audio.current.pause();setPlaying(false);return;}else next=0;}
  void startTrack(list[next]);
 },[startTrack]);
 useEffect(()=>{const a=audio.current;const handler=()=>nextTrack(1,true);a.addEventListener('ended',handler);return()=>a.removeEventListener('ended',handler);},[nextTrack]);
 const togglePlay=async()=>{if(!activeRef.current){if(tracks.length)void startTrack(tracks[0].id,tracks.map(t=>t.id));return;}try{await prepareAudio();if(audio.current.paused)await audio.current.play();else audio.current.pause();}catch{notify('Audio konnte nicht gestartet werden.');}};
 const playList=(list:Track[],id?:string)=>{const ids=list.map(t=>t.id);if(ids.length)void startTrack(id||ids[0],ids);};
 const toggleFavorite=(id:string)=>persist({favorites:state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id]});
 const toggleFavoritePlaylist=(id:string)=>persist({favoritePlaylists:state.favoritePlaylists.includes(id)?state.favoritePlaylists.filter(x=>x!==id):[...state.favoritePlaylists,id]});
 const enqueue=(id:string,next=false)=>{const old=queueRef.current.filter(x=>x!==id);const index=Math.max(0,old.indexOf(activeRef.current||''));const n=next?[...old.slice(0,index+1),id,...old.slice(index+1)]:[...old,id];queueRef.current=n;setQueue(n);notify(next?'Als Nächstes hinzugefügt':'Zur Warteschlange hinzugefügt');};
 const savePlaylist=(item:Playlist)=>persist({playlists:state.playlists.some(p=>p.id===item.id)?state.playlists.map(p=>p.id===item.id?item:p):[...state.playlists,item]});
 const newPlaylist=()=>{setPlaylistName('');setPlaylistDialog(true);};
 const confirmPlaylist=()=>{const name=playlistName.trim();if(!name)return;const p={id:createId(),name,trackIds:[],createdAt:Date.now()};savePlaylist(p);setPage('playlists');setSelectedPlaylist(p.id);setPlaylistDialog(false);notify('Playlist erstellt');};
 const renamePlaylist=(p:Playlist)=>{const name=window.prompt('Playlist umbenennen',p.name);if(name?.trim())savePlaylist({...p,name:name.trim()});};
 const deletePlaylist=(p:Playlist)=>{if(!window.confirm(`Playlist „${p.name}“ wirklich löschen?`))return;persist({playlists:state.playlists.filter(x=>x.id!==p.id),favoritePlaylists:state.favoritePlaylists.filter(x=>x!==p.id)});setSelectedPlaylist(null);};
 const addToPlaylist=(trackId:string,p:Playlist)=>{if(p.trackIds.includes(trackId)){notify('Song ist bereits in dieser Playlist');return;}savePlaylist({...p,trackIds:[...p.trackIds,trackId]});setActionTrack(null);notify(`Zu „${p.name}“ hinzugefügt`);};
 const importPlaylist=async()=>{const imported=await window.melodify?.importPlaylist();if(imported?.length){setState(prev=>({...prev,playlists:[...prev.playlists,...imported]}));setPage('playlists');notify(`${imported.length} Playlist(s) importiert`);}};
 const scan=async(mode:'add'|'rescan')=>{try{const result=mode==='add'?await window.melodify?.addFolders():await window.melodify?.rescan();if(result?.tracks){setState(prev=>({...prev,tracks:result.tracks!}));notify(`${result.tracks.length} Titel in deiner Bibliothek`);}else if(result?.error)notify(result.error);if(mode==='add')window.melodify?.load().then(s=>setState(s));}catch{notify('Musikordner konnte nicht eingelesen werden.');}};
 useEffect(()=>{
  if(!('mediaSession'in navigator))return;
  const s=navigator.mediaSession;s.setActionHandler('play',()=>{void audio.current.play();});s.setActionHandler('pause',()=>audio.current.pause());s.setActionHandler('previoustrack',()=>nextTrack(-1));s.setActionHandler('nexttrack',()=>nextTrack(1));s.setActionHandler('seekto',details=>{if(details.seekTime!==undefined)audio.current.currentTime=details.seekTime;});
  return()=>{for(const action of ['play','pause','previoustrack','nexttrack','seekto'] as MediaSessionAction[]){try{s.setActionHandler(action,null)}catch{}}};
 },[nextTrack]);
 useEffect(()=>{if(!activeTrack||!('mediaSession'in navigator))return;try{navigator.mediaSession.metadata=new MediaMetadata({title:activeTrack.title,artist:activeTrack.artist,album:activeTrack.album,artwork:activeTrack.cover?[{src:artworkUrl(activeTrack)!,sizes:'512x512'}]:[]});}catch{/* Optionale Systemintegration */}},[activeTrack]);
 useEffect(()=>{if(!('mediaSession'in navigator))return;navigator.mediaSession.playbackState=playing?'playing':'paused';try{if(duration>0)navigator.mediaSession.setPositionState({duration,position:Math.min(duration,position),playbackRate:1});}catch{/* Optionale Funktion */}},[playing,duration,position]);
 useEffect(()=>window.melodify?.onMediaAction(action=>{if(action==='play-pause')void togglePlay();if(action==='next')nextTrack(1);if(action==='previous')nextTrack(-1);}),[nextTrack]);
 const handleKey=(ev:KeyboardEvent)=>{if(ev.code==='Space'&&!['INPUT','TEXTAREA','SELECT'].includes((ev.target as HTMLElement).tagName)){ev.preventDefault();void togglePlay();}if(ev.key==='Escape'){setNowPlaying(false);setQueueOpen(false);setActionTrack(null);}};
 useEffect(()=>{window.addEventListener('keydown',handleKey);return()=>window.removeEventListener('keydown',handleKey);});
 const albumKeys=useMemo(()=>[...new Set(tracks.map(t=>t.album))], [tracks]);
 const artistKeys=useMemo(()=>[...new Set(tracks.map(t=>t.artist))], [tracks]);
 const selectedP=state.playlists.find(p=>p.id===selectedPlaylist);
 let visibleTracks:Track[]=tracks;
 if(page==='favorites')visibleTracks=visibleTracks.filter(t=>state.favorites.includes(t.id));
 if(page==='albums'&&selectedAlbum)visibleTracks=visibleTracks.filter(t=>t.album===selectedAlbum);
 if(page==='artists'&&selectedArtist)visibleTracks=visibleTracks.filter(t=>t.artist===selectedArtist);
 if(page==='folders'&&selectedFolder)visibleTracks=visibleTracks.filter(t=>t.path.startsWith(selectedFolder));
 if(page==='playlists'&&selectedP)visibleTracks=selectedP.trackIds.map(id=>tracksById.get(id)).filter((s):s is Track=>!!s);
 if(filterFav)visibleTracks=visibleTracks.filter(t=>state.favorites.includes(t.id));
 visibleTracks=sortTracks(searchTracks(visibleTracks,search),sort);
 const title=page==='home'?'Deine Musik':page==='songs'?'Alle Songs':page==='albums'?selectedAlbum||'Alben':page==='artists'?selectedArtist||'Künstler':page==='folders'?selectedFolder?.split(/[\\/]/).pop()||'Ordner':page==='favorites'?'Deine Favoriten':page==='playlists'?selectedP?.name||'Playlists':'Einstellungen';
 const settingsTabs=[{name:'Audio',icon:<SlidersHorizontal size={18}/>},{name:'Darstellung',icon:<Disc3 size={18}/>},{name:'Wiedergabe',icon:<Headphones size={18}/>}];
 const [settingsTab,setSettingsTab]=useState('Audio');
 const selectPage=(p:Page)=>{setPage(p);setSearch('');setFilterFav(false);setActionTrack(null);if(p==='albums')setSelectedAlbum(null);if(p==='artists')setSelectedArtist(null);if(p==='playlists')setSelectedPlaylist(null);if(p==='folders')setSelectedFolder(null);};
 const songRow=(track:Track,index:number)=><div key={track.id} className={'song-row '+(track.id===activeId?'is-current':'')} onDoubleClick={()=>playList(visibleTracks,track.id)}>
  <button className="song-index" title="Wiedergeben" onClick={()=>playList(visibleTracks,track.id)}>{track.id===activeId&&playing?<AudioLines size={17}/>:String(index+1).padStart(2,'0')}</button>
  <div className="song-name" onClick={()=>playList(visibleTracks,track.id)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')playList(visibleTracks,track.id)}}><Cover track={track} size="tiny"/><div className="truncated"><strong>{track.title}</strong><span>{track.artist}</span></div></div>
  <span className="song-album" onClick={()=>{setPage('albums');setSelectedAlbum(track.album);}}>{track.album}</span><span className="song-added">{new Date(track.addedAt).toLocaleDateString('de-DE')}</span>
  <div className="song-duration">{time(track.duration)}</div>
  <IconButton title={state.favorites.includes(track.id)?'Aus Favoriten entfernen':'Favorisieren'} onClick={()=>toggleFavorite(track.id)} active={state.favorites.includes(track.id)}><Heart size={17} fill={state.favorites.includes(track.id)?'currentColor':'none'}/></IconButton>
  <div className="row-actions"><IconButton title="Weitere Optionen" active={actionTrack===track.id} onClick={()=>setActionTrack(actionTrack===track.id?null:track.id)}><MoreHorizontal size={19}/></IconButton>{actionTrack===track.id&&<div className="context-menu"><button onClick={()=>{enqueue(track.id,true);setActionTrack(null)}}>Als Nächstes</button><button onClick={()=>{enqueue(track.id);setActionTrack(null)}}>In Warteschlange</button>{state.playlists.map(p=><button key={p.id} onClick={()=>addToPlaylist(track.id,p)}>+ {p.name}</button>)}{state.playlists.length===0&&<span className="context-hint">Erstelle zuerst eine Playlist</span>}{page==='playlists'&&selectedP&&<button onClick={()=>savePlaylist({...selectedP,trackIds:selectedP.trackIds.filter(id=>id!==track.id)})}>Aus Playlist entfernen</button>}</div>}</div>
 </div>;
 const songList=(items:Track[])=>items.length?<div className="song-table"><div className="song-header"><span>#</span><span>TITEL</span><span>ALBUM</span><span>HINZUGEFÜGT</span><Clock3 size={15}/><span/><span/></div>{items.map(songRow)}</div>:<div className="list-empty"><Music2 size={34}/><b>Hier ist es noch ruhig</b><span>Keine Songs gefunden. Passe deine Suche an oder füge Musik hinzu.</span></div>;
 const firstAlbumTrack=(key:string)=>tracks.find(t=>t.album===key);
 const firstArtistTrack=(key:string)=>tracks.find(t=>t.artist===key);
 const renderCards=(keys:string[],kind:'album'|'artist')=><div className="album-grid">{keys.filter(k=>k.toLowerCase().includes(search.toLowerCase())||tracks.some(t=>(kind==='album'?t.album:t.artist)===k&&t.title.toLowerCase().includes(search.toLowerCase()))).map(k=>{const t=kind==='album'?firstAlbumTrack(k):firstArtistTrack(k);const list=tracks.filter(x=>(kind==='album'?x.album:x.artist)===k);return <button className="album-card" key={k} onClick={()=>{if(kind==='album')setSelectedAlbum(k);else setSelectedArtist(k);}}><Cover track={t} size="large"/><b>{k}</b><span>{kind==='album'?t?.artist:`${list.length} Titel`}</span></button>})}</div>;
 const openPlaylistSongs=(p:Playlist)=>{setSelectedPlaylist(p.id);setPage('playlists');};
 const createCustomTheme=()=>{const base={...theme,id:'custom-'+createId(),name:'Mein Theme',description:'Dein persönlicher Sound',custom:true};setThemeEdit(base);setShowThemeEditor(true);};
 const saveTheme=()=>{if(!themeEdit)return;const updated=state.customThemes.some(t=>t.id===themeEdit.id)?state.customThemes.map(t=>t.id===themeEdit.id?themeEdit:t):[...state.customThemes,themeEdit];persist({customThemes:updated,themeId:themeEdit.id});setShowThemeEditor(false);notify('Theme gespeichert');};
 const removeTheme=(id:string)=>{if(!window.confirm('Dieses eigene Theme löschen?'))return;persist({customThemes:state.customThemes.filter(t=>t.id!==id),themeId:'nocturne'});setShowThemeEditor(false);};
 const changeBG=(file:File|null)=>{if(!file||!themeEdit)return;if(file.size>4*1024*1024){notify('Hintergrundbild darf maximal 4 MB groß sein.');return;}const r=new FileReader();r.onload=()=>setThemeEdit(prev=>prev?({...prev,backgroundImage:String(r.result)}):prev);r.readAsDataURL(file);};
 const setQueueOrder=(from:number,to:number)=>{if(from<0||to<0||to>=queue.length)return;const n=[...queue];n.splice(to,0,n.splice(from,1)[0]);queueRef.current=n;setQueue(n);};
 const dragFrom=useRef<number|null>(null);
 const [repeatIcon,setRepeatIcon]=useState(false);useEffect(()=>setRepeatIcon(repeat==='one'),[repeat]);
 return <div className={'app '+(isLight(theme)?'light':'')} style={style}>
  {splash&&<div className="melodify-splash" role="status" aria-label="Melodify wird gestartet"><img src={new URL("./melodify-logo.png", document.baseURI).href} alt="Melodify"/><span>MELODIFY</span></div>}
  {playlistDialog&&<div className="modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPlaylistDialog(false)}}><form className="playlist-dialog" onSubmit={e=>{e.preventDefault();confirmPlaylist()}}><img src={new URL("./melodify-logo.png", document.baseURI).href} alt=""/><h2>Neue Playlist</h2><p>Gib deiner Sammlung einen Namen.</p><input autoFocus maxLength={100} value={playlistName} onChange={e=>setPlaylistName(e.target.value)} placeholder="z. B. Late Night Drives" aria-label="Playlistname"/><div className="dialog-actions"><button type="button" className="secondary-button" onClick={()=>setPlaylistDialog(false)}>Abbrechen</button><button className="primary-button" type="submit" disabled={!playlistName.trim()}>Erstellen</button></div></form></div>}
  <div className="background-wallpaper"/><div className="app-shell">
  <aside className="sidebar"><button className="brand" onClick={()=>selectPage('home')}><div className="brand-mark"><img src={new URL("./melodify-logo.png", document.baseURI).href} alt="Melodify"/></div><span>melodify<span className="brand-dot">.</span></span></button>
   <div className="sidebar-group"><div className="sidebar-label">ENTDECKEN</div>
    {([[Home,'Startseite','home'],[Library,'Alle Songs','songs'],[Album,'Alben','albums'],[Headphones,'Künstler','artists'],[Folder,'Ordner','folders']] as const).map(([Icon,label,p])=><button key={p} className={'sidebar-link '+(page===p?'selected':'')} onClick={()=>selectPage(p)}><Icon size={19} strokeWidth={1.8}/><span>{label}</span>{p==='songs'&&<span className="nav-count">{tracks.length}</span>}</button>)}
   </div><div className="sidebar-group"><div className="sidebar-label">DEINE SAMMLUNG</div>
    <button className={'sidebar-link '+(page==='favorites'?'selected':'')} onClick={()=>selectPage('favorites')}><Heart size={19}/><span>Favoriten</span></button>
    <button className={'sidebar-link '+(page==='playlists'?'selected':'')} onClick={()=>selectPage('playlists')}><ListMusic size={19}/><span>Playlists</span><Plus size={16} className="nav-plus" onClick={e=>{e.stopPropagation();newPlaylist()}}/></button>
    <div className="playlist-nav">{state.playlists.slice(0,6).map(p=><button key={p.id} className={'playlist-link '+(selectedPlaylist===p.id&&page==='playlists'?'focused':'')} onClick={()=>openPlaylistSongs(p)}><span className="tiny-dot"/>{p.name}</button>)}</div>
   </div><div className="sidebar-spacer"/>
   <div className="sidebar-library-info"><div className="library-info-icon"><Disc3 size={20}/></div><div><b>Deine Bibliothek</b><span>{tracks.length} Titel · {state.folders.length} Ordner</span></div></div>
   <button className={'sidebar-link settings-link '+(page==='settings'?'selected':'')} onClick={()=>selectPage('settings')}><Settings2 size={19}/><span>Einstellungen</span></button>
  </aside>
  <main className="content">
   <header className="topbar"><div className="breadcrumbs"><span>MELODIFY</span><ChevronRight size={14}/><strong>{page==='settings'?'Preferences':'Bibliothek'}</strong></div><div className="top-actions"><div className="searchbox"><Search size={17}/><input aria-label="Musik durchsuchen" placeholder="Songs, Künstler, Alben suchen ..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setSearch('')}}/>{search&&<button aria-label="Suche löschen" onClick={()=>setSearch('')}><X size={15}/></button>}<kbd>⌕</kbd></div><button className="avatar" title="Lokale Bibliothek"><Music2 size={18}/></button></div></header>
   <div className="page-scroll">
   {page==='home'&&<>
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="pulse-dot"/> DEIN SOUND. DEIN RAUM.</div><h1>Deine Musik.<br/><em>Dein Moment.</em></h1><p>Alles, was du liebst. An einem Ort, der sich nach dir anfühlt.</p><div className="hero-buttons"><button className="primary-button" onClick={()=>tracks.length?playList(tracks):void scan('add')}><Play size={17} fill="currentColor"/>{tracks.length?'Alle Songs abspielen':'Musik hinzufügen'}</button><button className="secondary-button" onClick={()=>void scan('add')}><Plus size={18}/>Ordner hinzufügen</button></div></div><div className="hero-art"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-disc"><div className="hero-disc-inner"><Music2 size={45}/></div></div><div className="hero-caption">SOUND IS A FEELING <span>↗</span></div></div></section>
    <div className="section-header"><div><span className="section-kicker">DEIN ÜBERBLICK</span><h2>Zurück in deinen Flow</h2></div><button className="text-button" onClick={()=>selectPage('songs')}>Alle Titel anzeigen <ArrowRight size={16}/></button></div>
    <div className="stats-grid"><button onClick={()=>selectPage('songs')} className="stat-card"><div className="stat-icon"><Music2 size={20}/></div><strong>{tracks.length}</strong><span>Songs in deiner Bibliothek</span></button><button onClick={()=>selectPage('albums')} className="stat-card"><div className="stat-icon"><Disc3 size={20}/></div><strong>{albumKeys.length}</strong><span>Alben entdecken</span></button><button onClick={()=>selectPage('artists')} className="stat-card"><div className="stat-icon"><Headphones size={20}/></div><strong>{artistKeys.length}</strong><span>Künstler zum Anhören</span></button><button onClick={()=>selectPage('favorites')} className="stat-card"><div className="stat-icon"><Heart size={20}/></div><strong>{state.favorites.length}</strong><span>Lieblingstracks</span></button></div>
    <div className="section-header section-top"><div><span className="section-kicker">NEULICH HINZUGEFÜGT</span><h2>Frisch in deiner Sammlung</h2></div><button className="text-button" onClick={()=>selectPage('songs')}>Bibliothek <ArrowRight size={16}/></button></div>
    {tracks.length?<div className="recent-list">{[...tracks].sort((a,b)=>b.addedAt-a.addedAt).slice(0,5).map((t,i)=><div className="recent-item" key={t.id} onClick={()=>playList(tracks,t.id)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')playList(tracks,t.id)}}><Cover track={t} size="small"/><div className="truncated"><b>{t.title}</b><span>{t.artist}</span></div><span className="recent-album">{t.album}</span><span>{time(t.duration)}</span><Play size={17}/></div>)}</div>:<div className="onboarding"><div className="onboarding-disc"><Music2 size={30}/></div><h3>Noch keine Songs? Kein Problem.</h3><p>Füge einen Ordner mit deiner Lieblingsmusik hinzu. Melodify erkennt Titel, Interpreten und Albumcover automatisch.</p><button className="primary-button" onClick={()=>void scan('add')}><Folder size={17}/>Musikordner auswählen</button></div>}
   </>}
   {page!=='home'&&page!=='settings'&&<>
    <div className="page-title-row"><div><div className="eyebrow page-eyebrow">DEINE MUSIKBIBLIOTHEK</div><h1>{title}</h1><p>{page==='playlists'&&!selectedP?'Organisiere deine Musik so, wie du sie liebst.':`${visibleTracks.length} Titel ${page==='songs'?'in deiner Sammlung':'gefunden'}`}</p></div><div className="page-buttons">{page==='playlists'?<><button className="secondary-button" onClick={()=>void importPlaylist()}><Import size={17}/>Importieren</button><button className="primary-button" onClick={newPlaylist}><Plus size={18}/>Playlist erstellen</button></>:<><button className="secondary-button" onClick={()=>void scan('rescan')}><RotateCcw size={17}/>Aktualisieren</button><button className="primary-button" onClick={()=>void scan('add')}><Plus size={18}/>Ordner hinzufügen</button></>}</div></div>
    {page==='playlists'&&!selectedP?<>{state.playlists.length?<div className="playlist-grid">{state.playlists.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=><div key={p.id} className="playlist-card"><button className="playlist-visual" onClick={()=>openPlaylistSongs(p)}><ListMusic size={35}/></button><div className="playlist-meta"><b onClick={()=>openPlaylistSongs(p)}>{p.name}</b><span>{p.trackIds.length} Titel</span></div><IconButton title="Playlist favorisieren" active={state.favoritePlaylists.includes(p.id)} onClick={()=>toggleFavoritePlaylist(p.id)}><Heart size={18} fill={state.favoritePlaylists.includes(p.id)?'currentColor':'none'}/></IconButton><IconButton title="Umbenennen" onClick={()=>renamePlaylist(p)}><Settings2 size={18}/></IconButton><IconButton title="Löschen" onClick={()=>deletePlaylist(p)}><X size={18}/></IconButton></div>)}</div>:<div className="onboarding compact"><ListMusic size={33}/><h3>Deine erste Playlist wartet.</h3><p>Erstelle eine Sammlung oder importiere M3U/M3U8.</p><button className="primary-button" onClick={newPlaylist}><Plus size={18}/>Playlist erstellen</button></div>}</>:null}
    {page==='playlists'&&selectedP&&<div className="playlist-tools"><button className="secondary-button small" onClick={()=>setSelectedPlaylist(null)}><ArrowLeft size={15}/>Alle Playlists</button><button className="secondary-button small" onClick={()=>renamePlaylist(selectedP)}>Umbenennen</button><button className="secondary-button small" onClick={()=>deletePlaylist(selectedP)}>Löschen</button><button className="primary-button small" onClick={()=>playList(visibleTracks)}><Play size={15}/>Abspielen</button></div>}
    {page==='albums'&&!selectedAlbum?renderCards(albumKeys,'album'):null}
    {page==='artists'&&!selectedArtist?renderCards(artistKeys,'artist'):null}
    {page==='folders'&&!selectedFolder?<div className="folders-list">{state.folders.map(folder=><button key={folder} className="folder-card" onClick={()=>setSelectedFolder(folder)}><Folder size={24}/><div><b>{folder.split(/[\\/]/).pop()}</b><span>{folder}</span></div><span className="folder-count">{tracks.filter(t=>t.path.startsWith(folder)).length} Songs</span><ChevronRight size={18}/></button>)}{state.folders.length===0&&<div className="onboarding compact"><Folder size={30}/><h3>Keine Musikordner</h3><p>Füge den ersten Ordner hinzu.</p><button className="primary-button" onClick={()=>void scan('add')}>Ordner auswählen</button></div>}</div>:null}
    {((page==='playlists'&&selectedP)||(page==='albums'&&selectedAlbum)||(page==='artists'&&selectedArtist)||(page==='folders'&&selectedFolder)||page==='songs'||page==='favorites')&&<>
     {(selectedAlbum||selectedArtist||selectedFolder)&&<button className="breadcrumb-back" onClick={()=>{setSelectedAlbum(null);setSelectedArtist(null);setSelectedFolder(null)}}><ChevronLeft size={17}/>Zurück zur Übersicht</button>}
     <div className="table-controls"><div className="table-title"><span>{visibleTracks.length} SONGS</span><span className="table-line"/></div><div className="filters"><IconButton title="Nur Favoriten" active={filterFav} onClick={()=>setFilterFav(!filterFav)}><Heart size={17}/></IconButton><span className="sort-label"><ArrowDownAZ size={17}/><select aria-label="Sortieren" value={sort} onChange={e=>setSort(e.target.value)}><option value="title">Titel</option><option value="artist">Künstler</option><option value="album">Album</option><option value="duration">Dauer</option><option value="added">Hinzugefügt</option></select></span><button className="secondary-button small" onClick={()=>playList(visibleTracks)} disabled={!visibleTracks.length}><Play size={15}/>Abspielen</button></div></div>
     {songList(visibleTracks)}
    </>}
   </>}
   {page==='settings'&&<><div className="page-title-row"><div><div className="eyebrow page-eyebrow">MELODIFY · PERSONALISIERUNG</div><h1>Dein Sound. Deine Regeln.</h1><p>Stell alles so ein, wie es sich für dich richtig anfühlt.</p></div></div><div className="settings-tabs">{settingsTabs.map(t=><button key={t.name} className={settingsTab===t.name?'active':''} onClick={()=>setSettingsTab(t.name)}>{t.icon}{t.name}</button>)}</div>
    {settingsTab==='Audio'&&<div className="settings-stack">
     <div className="settings-card"><div className="settings-heading"><div className="settings-heading-icon"><AudioLines size={20}/></div><div><h3>Equalizer</h3><p>Passe die Frequenzen deiner Musik an.</p></div></div><div className="field-line"><label htmlFor="eq-preset">Klangprofil</label><select id="eq-preset" value={settings.eqPreset} onChange={e=>{const name=e.target.value;updateSettings({eqPreset:name,equalizer:[...(EQ_PRESETS[name]||EQ_PRESETS.flat)]})}}>{Object.keys(EQ_PRESETS).map(n=><option key={n} value={n}>{presetName[n]}</option>)}{settings.eqPreset==='custom'&&<option value="custom">Benutzerdefiniert</option>}</select></div><div className="eq-wrap">{EQ_BANDS.map((hz,i)=><div className="eq-band" key={hz}><span>{settings.equalizer[i]>0?'+':''}{settings.equalizer[i]} dB</span><input aria-label={`${hz} Hz`} type="range" min="-12" max="12" step="1" value={settings.equalizer[i]} onChange={e=>{const arr=[...settings.equalizer];arr[i]=Number(e.target.value);updateSettings({equalizer:arr,eqPreset:'custom'});}}/><span>{hz>=1000?`${hz/1000}k`:hz}</span></div>)}</div><button className="text-button" onClick={()=>updateSettings({equalizer:[...EQ_PRESETS.flat],eqPreset:'flat'})}><RotateCcw size={15}/>Equalizer zurücksetzen</button></div>
     <div className="settings-card"><div className="settings-heading"><div className="settings-heading-icon"><Volume2 size={20}/></div><div><h3>Ausgabe & Klang</h3><p>Feinabstimmung für deine Lautsprecher und Kopfhörer.</p></div></div><div className="field-line"><label>Standardlautstärke</label><div className="value-slider"><input type="range" min="0" max="1" step="0.01" value={settings.volume} onChange={e=>updateSettings({volume:Number(e.target.value)})}/><span>{Math.round(settings.volume*100)}%</span></div></div><div className="field-line"><label>Balance <small>Links ↔ Rechts</small></label><div className="value-slider"><input type="range" min="-1" max="1" step="0.05" value={settings.balance} onChange={e=>updateSettings({balance:Number(e.target.value)})}/><span>{settings.balance===0?'Mitte':settings.balance<0?`${Math.abs(settings.balance*100).toFixed(0)}% L`:`${(settings.balance*100).toFixed(0)}% R`}</span></div></div><div className="field-line"><label>Vorverstärkung <small>–12 bis +12 dB</small></label><div className="value-slider"><input type="range" min="-12" max="12" step="1" value={settings.gain} onChange={e=>updateSettings({gain:Number(e.target.value)})}/><span>{settings.gain>0?'+':''}{settings.gain} dB</span></div></div><div className="field-line"><label htmlFor="audio-output">Ausgabegerät</label><select id="audio-output" value={settings.outputDevice} onChange={e=>updateSettings({outputDevice:e.target.value})}><option value="default">Systemstandard {activeOutput==='default'?'(aktiv)':''}</option>{outputDevices.filter(d=>d.deviceId!=='default').map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||`Audioausgabe ${i+1}`}{activeOutput===d.deviceId?' (aktiv)':''}</option>)}</select></div><div className="field-line"><div><label>Dynamikkompression</label><p>Reduziert starke Lautstärkeunterschiede. Kein Loudness-Matching pro Titel.</p></div><button type="button" role="switch" aria-checked={settings.normalize} className={'switch '+(settings.normalize?'on':'')} onClick={()=>updateSettings({normalize:!settings.normalize})}><span/></button></div><p className="note">Hinweis: Hohe Verstärkung kann Verzerrungen verursachen. Die Audioausgabe hängt vom unterstützten Dateiformat ab.</p></div>
    </div>}
    {settingsTab==='Darstellung'&&<div className="settings-stack"><div className="settings-card"><div className="settings-heading"><div className="settings-heading-icon"><Disc3 size={21}/></div><div><h3>Themes & Persönlichkeit</h3><p>Wähle einen Look oder gestalte deinen eigenen.</p></div></div><div className="theme-grid">{allThemes.map(t=><div className={'theme-card '+(t.id===theme.id?'chosen':'')} key={t.id}><button className="theme-thumb" style={{background:t.background,color:t.text,borderRadius:Math.min(t.radius,14)}} onClick={()=>persist({themeId:t.id})}><div className="theme-side" style={{background:t.surface}}/><div className="theme-preview-content"><div style={{background:t.accent}} className="theme-preview-cover"/><div><div style={{background:t.text}}/><div style={{background:t.muted}}/></div></div><span className="theme-preview-play" style={{background:t.accent}}/><span className="theme-check">{theme.id===t.id&&<Check size={13}/>}</span></button><div className="theme-name"><div><b>{t.name}</b><span>{t.description}</span></div>{t.custom&&<IconButton title="Theme bearbeiten" onClick={()=>{setThemeEdit({...t});setShowThemeEditor(true);}}><Settings2 size={15}/></IconButton>}</div></div>)}</div><button className="theme-create" onClick={createCustomTheme}><Plus size={20}/><span>Eigenes Theme erstellen</span></button></div></div>}
    {settingsTab==='Wiedergabe'&&<div className="settings-stack"><div className="settings-card"><div className="settings-heading"><div className="settings-heading-icon"><Activity size={20}/></div><div><h3>Wiedergabe & Visualisierung</h3><p>Mach aus Musik ein Erlebnis.</p></div></div><div className="field-line"><div><label>Audio-Visualisierung</label><p>Animierte Frequenzbalken während der Wiedergabe anzeigen.</p></div><button type="button" role="switch" aria-checked={settings.visualization} className={'switch '+(settings.visualization?'on':'')} onClick={()=>updateSettings({visualization:!settings.visualization})}><span/></button></div><div className="field-line"><div><label>Beim Schließen im Tray bleiben</label><p>Melodify läuft im Hintergrund weiter, bis du es im Tray beendest.</p></div><button type="button" role="switch" aria-checked={settings.minimizeToTray} className={'switch '+(settings.minimizeToTray?'on':'')} onClick={()=>{updateSettings({minimizeToTray:!settings.minimizeToTray});void window.melodify?.setMinimizeToTray(!settings.minimizeToTray)}}><span/></button></div>{settings.visualization&&<div className="field-line"><label>Visualisierungsstil</label><select value={vizStyle} onChange={e=>setVizStyle(e.target.value as 'bars'|'wave'|'circle')}><option value="bars">Frequenzbalken</option><option value="wave">Wellenform</option><option value="circle">Bass-Kreis</option></select></div>}{settings.visualization&&<div className="visualizer-preview"><Visualizer analyser={analyser} active={playing} styleType={vizStyle}/></div>}</div><div className="settings-card"><div className="settings-heading"><div className="settings-heading-icon"><Library size={20}/></div><div><h3>Musikbibliothek</h3><p>{state.folders.length} ausgewählte Ordner · {tracks.length} Titel</p></div></div>{state.folders.map(f=><div className="folder-path" key={f}><Folder size={17}/>{f}</div>)}<div className="settings-actions"><button className="secondary-button" onClick={()=>void scan('add')}><Plus size={17}/>Ordner hinzufügen</button><button className="secondary-button" onClick={()=>void scan('rescan')}><RotateCcw size={17}/>Bibliothek neu scannen</button></div></div></div>}
   </>}
   </div>
  </main></div>
  <footer className="playerbar"><div className="player-current">{activeTrack?<><button onClick={()=>setNowPlaying(true)} className="player-cover"><Cover track={activeTrack} size="small"/></button><div className="truncated"><b>{activeTrack.title}</b><span>{activeTrack.artist}</span></div><IconButton title="Favorit" active={state.favorites.includes(activeTrack.id)} onClick={()=>toggleFavorite(activeTrack.id)}><Heart size={17} fill={state.favorites.includes(activeTrack.id)?'currentColor':'none'}/></IconButton></>:<><div className="player-placeholder"><Music2 size={21}/></div><div className="truncated"><b>Bereit, wenn du es bist.</b><span>Wähle einen Song aus</span></div></>}</div>
   <div className="player-main"><div className="transport"><IconButton title="Zufallswiedergabe" active={shuffle} onClick={()=>setShuffle(!shuffle)}><Shuffle size={18}/></IconButton><IconButton title="Vorheriger Titel" onClick={()=>nextTrack(-1)}><SkipBack size={20} fill="currentColor"/></IconButton><button className="play-toggle" title={playing?'Pause':'Abspielen'} onClick={()=>void togglePlay()}>{playing?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button><IconButton title="Nächster Titel" onClick={()=>nextTrack(1)}><SkipForward size={20} fill="currentColor"/></IconButton><IconButton title="Wiederholung" active={repeat!=='off'} onClick={()=>setRepeat(r=>r==='off'?'all':r==='all'?'one':'off')}>{repeatIcon?<Repeat1 size={19}/>:<Repeat size={19}/>}</IconButton></div><div className="seekbar"><span>{time(position)}</span><input type="range" aria-label="Wiedergabeposition" min="0" max={Math.max(duration,1)} step="0.1" value={Math.min(position,Math.max(duration,1))} onChange={e=>{audio.current.currentTime=Number(e.target.value);setPosition(Number(e.target.value));}}/><span>{time(duration)}</span></div></div>
   <div className="player-extras">{settings.visualization&&<Visualizer analyser={analyser} active={playing} styleType={vizStyle} className="mini-viz"/>}<IconButton title="Warteschlange" active={queueOpen} onClick={()=>setQueueOpen(!queueOpen)}><ListMusic size={20}/></IconButton><IconButton title="Lautstärke stummschalten" onClick={()=>updateSettings({volume:settings.volume===0?.7:0})}>{settings.volume===0?<VolumeX size={18}/>:<Volume2 size={18}/>}</IconButton><input className="volume-range" aria-label="Lautstärke" type="range" min="0" max="1" step="0.01" value={settings.volume} onChange={e=>updateSettings({volume:Number(e.target.value)})}/><IconButton title="Now Playing öffnen" onClick={()=>setNowPlaying(true)}><Maximize2 size={19}/></IconButton></div>
  </footer>
  {scanProgress?.stage==='scan'&&<div className="scan-pill"><RotateCcw size={15} className="spin"/>Bibliothek wird eingelesen {scanProgress.total?`${scanProgress.current}/${scanProgress.total}`:'…'}</div>}
  {toast&&<div className="toast"><Check size={17}/>{toast}</div>}
  {audioError&&<div className="audio-error" role="alert">{audioError}<button onClick={()=>setAudioError('')}><X size={16}/></button></div>}
  {queueOpen&&<><div className="scrim" onClick={()=>setQueueOpen(false)}/><aside className="queue-drawer"><div className="drawer-header"><div><span className="section-kicker">UP NEXT</span><h2>Warteschlange</h2><p>{queue.length} Titel</p></div><IconButton title="Schließen" onClick={()=>setQueueOpen(false)}><X size={22}/></IconButton></div><div className="queue-items">{queue.map((id,i)=>{const t=tracksById.get(id);if(!t)return null;return <div key={id+'-'+i} className={'queue-item '+(id===activeId?'is-current':'')} draggable onDragStart={()=>dragFrom.current=i} onDragOver={e=>e.preventDefault()} onDrop={(e:DragEvent)=>{e.preventDefault();if(dragFrom.current!==null)setQueueOrder(dragFrom.current,i);dragFrom.current=null;}}><span className="queue-drag" title="Ziehen, um Reihenfolge zu ändern">⠿</span><button onClick={()=>void startTrack(id)}><Cover track={t} size="tiny"/></button><div className="truncated"><b>{t.title}</b><span>{t.artist}</span></div><button title="Nach oben" onClick={()=>setQueueOrder(i,i-1)} disabled={i===0}><ChevronDown size={16} style={{transform:'rotate(180deg)'}}/></button><button title="Entfernen" onClick={()=>{const n=queue.filter((_,j)=>j!==i);queueRef.current=n;setQueue(n);}}><X size={16}/></button></div>})}{queue.length===0&&<div className="list-empty">Spiele einen Song ab, um die Warteschlange zu füllen.</div>}</div></aside></>}
  {nowPlaying&&<div className="now-playing"><button className="now-close" title="Schließen" onClick={()=>setNowPlaying(false)}><ChevronDown size={25}/> Zurück zur Bibliothek</button><div className="now-glow"/><div className="now-content"><Cover track={activeTrack} size="hero"/><div className="now-info"><div className="eyebrow">NOW PLAYING</div><h1>{activeTrack?.title||'Dein nächster Lieblingssong'}</h1><p>{activeTrack?.artist||'Füge Musik hinzu, um loszulegen.'}</p><div className="now-seek"><input type="range" min="0" max={Math.max(duration,1)} step=".1" value={Math.min(position,Math.max(duration,1))} onChange={e=>audio.current.currentTime=Number(e.target.value)}/><div><span>{time(position)}</span><span>{time(duration)}</span></div></div><div className="now-controls"><IconButton title="Shuffle" active={shuffle} onClick={()=>setShuffle(!shuffle)}><Shuffle size={22}/></IconButton><IconButton title="Vorheriger" onClick={()=>nextTrack(-1)}><SkipBack size={28} fill="currentColor"/></IconButton><button className="play-toggle big" title="Play/Pause" onClick={()=>void togglePlay()}>{playing?<Pause size={26} fill="currentColor"/>:<Play size={26} fill="currentColor"/>}</button><IconButton title="Nächster" onClick={()=>nextTrack(1)}><SkipForward size={28} fill="currentColor"/></IconButton><IconButton title="Repeat" active={repeat!=='off'} onClick={()=>setRepeat(r=>r==='off'?'all':r==='all'?'one':'off')}><Repeat size={22}/></IconButton></div>{settings.visualization&&<Visualizer analyser={analyser} active={playing} styleType={vizStyle} className="now-viz"/>}</div></div></div>}
  {showThemeEditor&&themeEdit&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowThemeEditor(false)}}><div className="theme-modal"><div className="modal-header"><div><span className="section-kicker">DEIN LOOK</span><h2>Theme gestalten</h2></div><IconButton title="Schließen" onClick={()=>setShowThemeEditor(false)}><X size={22}/></IconButton></div><label>Theme-Name<input value={themeEdit.name} onChange={e=>setThemeEdit({...themeEdit,name:e.target.value})} maxLength={48}/></label><div className="color-grid">{([['background','Hintergrund'],['surface','Seitenleiste'],['panel','Panel / Karten'],['text','Text'],['muted','Sekundärer Text'],['accent','Akzent']] as const).map(([key,label])=><label key={key}><span>{label}</span><input type="color" value={themeEdit[key]} onChange={e=>setThemeEdit({...themeEdit,[key]:e.target.value})}/></label>)}</div><label>Eckenradius <strong>{themeEdit.radius}px</strong><input type="range" min="0" max="30" value={themeEdit.radius} onChange={e=>setThemeEdit({...themeEdit,radius:Number(e.target.value)})}/></label><label>Transparenz <strong>{Math.round(themeEdit.transparency*100)}%</strong><input type="range" min="0" max="0.5" step="0.01" value={themeEdit.transparency} onChange={e=>setThemeEdit({...themeEdit,transparency:Number(e.target.value)})}/></label><label>Eigenes Hintergrundbild<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>changeBG(e.target.files?.[0]||null)}/></label>{themeEdit.backgroundImage&&<button className="text-button" onClick={()=>setThemeEdit({...themeEdit,backgroundImage:undefined})}>Hintergrundbild entfernen</button>}<div className="modal-actions">{themeEdit.custom&&state.customThemes.some(t=>t.id===themeEdit.id)&&<button className="danger-button" onClick={()=>removeTheme(themeEdit.id)}>Löschen</button>}<button className="secondary-button" onClick={()=>setThemeEdit({...themes[0],id:themeEdit.id,name:themeEdit.name,custom:true})}>Zurücksetzen</button><button className="primary-button" onClick={saveTheme}><Check size={17}/>Speichern & anwenden</button></div></div></div>}
  </div>;
}
