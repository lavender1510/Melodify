export interface Track { id:string; path:string; title:string; artist:string; album:string; duration:number; year:number|null; trackNo:number|null; cover:boolean; size:number; modified:number; addedAt:number; format:string; readError?:boolean }
export interface Playlist {id:string;name:string;trackIds:string[];createdAt:number}
export interface AudioSettings {volume:number;balance:number;equalizer:number[];eqPreset:string;normalize:boolean;gain:number;visualization:boolean;minimizeToTray:boolean;outputDevice:string}
export interface Theme {id:string;name:string;description:string;background:string;surface:string;panel:string;text:string;muted:string;accent:string;radius:number;transparency:number;backgroundImage?:string;custom?:boolean}
export interface AppState {folders:string[];tracks:Track[];playlists:Playlist[];favorites:string[];favoritePlaylists:string[];customThemes:Theme[];themeId:string;settings:AudioSettings}
export interface ScanProgress {stage:string;current?:number;total?:number;message?:string}
export interface DesktopAPI {load():Promise<AppState>;save(patch:Partial<AppState>):Promise<AppState>;addFolders():Promise<{tracks?:Track[];cancelled?:boolean;error?:string}>;rescan():Promise<{tracks?:Track[];error?:string}>;importPlaylist():Promise<Playlist[]>;setMinimizeToTray(v:boolean):Promise<boolean>;showWindow():Promise<void>;onScanProgress(cb:(p:ScanProgress)=>void):()=>void;onMediaAction(cb:(action:string)=>void):()=>void}
declare global {interface Window {melodify?:DesktopAPI}}
