// Explicit regeneration from the existing Windows theme sources, not a runtime dependency.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');const ts=require(path.join(root,'node_modules/typescript'));
function read(name){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'src',name),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});return exports;}
const palettes=[...read('theme.ts').themes,...read('spicetifyThemes.ts').spicetifyThemes];
if(palettes.length!==122)throw new Error('Expected 8 Melodify and 114 Spicetify palettes');
fs.writeFileSync(path.join(__dirname,'../app/src/main/assets/themes.json'),JSON.stringify(palettes,null,2)+'\n');
console.log('Synced '+palettes.length+' palettes, retaining source IDs, names and effective colors.');
