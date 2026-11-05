import type {Theme} from './types';
export const themes:Theme[]=[
{id:'nocturne',name:'Nocturne',description:'Tiefes Anthrazit · Orchid',background:'#0b0d12',surface:'#151821',panel:'#1b1e29',text:'#f5f3fc',muted:'#9695aa',accent:'#b99bff',radius:16,transparency:0},
{id:'velvet',name:'Velvet Hour',description:'Rauchpflaume · Rosé',background:'#171019',surface:'#271b2b',panel:'#322438',text:'#fff1f7',muted:'#bba5b9',accent:'#ff9dc8',radius:19,transparency:0},
{id:'ocean',name:'Deep Current',description:'Nachtblau · Aqua',background:'#08161d',surface:'#0e2530',panel:'#173340',text:'#e5fcff',muted:'#91b1b9',accent:'#65e1e4',radius:15,transparency:0},
{id:'forest',name:'Moss & Mist',description:'Waldgrün · Salbei',background:'#101813',surface:'#1a291f',panel:'#24392c',text:'#f0fff0',muted:'#a0b3a4',accent:'#a3e8b4',radius:16,transparency:0},
{id:'amber',name:'Amber Haze',description:'Espresso · Gold',background:'#171311',surface:'#29201b',panel:'#352920',text:'#fff8ea',muted:'#c7ad97',accent:'#ffcb86',radius:14,transparency:0},
{id:'cloud',name:'Ivory Bloom',description:'Porzellan · Flieder',background:'#f4f1f6',surface:'#fffafd',panel:'#ede7f0',text:'#2b2435',muted:'#81768c',accent:'#855bc9',radius:17,transparency:0},
{id:'cosmos',name:'Cosmic Bloom',description:'Galaxie · Magenta',background:'#100d24',surface:'#1a1534',panel:'#282047',text:'#faf6ff',muted:'#b5a3d6',accent:'#e49aff',radius:22,transparency:.08},
{id:'silver',name:'Lunar Glass',description:'Schiefer · Eisblau',background:'#121720',surface:'#1b2430',panel:'#273140',text:'#f3f7ff',muted:'#a5b2c1',accent:'#a0cfff',radius:12,transparency:.12}
];
export function isLight(t:Theme){const hex=t.background.replace('#',''); const v=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));return (v[0]*.299+v[1]*.587+v[2]*.114)>155}
export function paletteCss(t:Theme):Record<string,string>{return {'--bg':t.background,'--surface':t.surface,'--panel':t.panel,'--text':t.text,'--muted':t.muted,'--accent':t.accent,'--radius':`${t.radius}px`,'--transparency':String(t.transparency),'--surface-opacity':`${Math.round((1-t.transparency)*100)}%`,'--background-image':t.backgroundImage?`url("${t.backgroundImage}")`:'none'}}
