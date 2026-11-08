// The tracked Windows icon already contains the official Melodify artwork.
// Extract its largest PNG frame for the renderer so header, splash and
// installer always display the same logo, even from file:// builds.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const icon = fs.readFileSync(path.join(__dirname,'..','build','icon.ico'));
assert.equal(icon.readUInt16LE(0),0,'Invalid ICO header');
assert.equal(icon.readUInt16LE(2),1,'Expected Windows icon');
const count=icon.readUInt16LE(4);
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
let largest=null;
for(let index=0;index<count;index++){
 const offset=6+index*16;
 const size=icon.readUInt32LE(offset+8);
 const pos=icon.readUInt32LE(offset+12);
 const image=icon.subarray(pos,pos+size);
 if(pos+size>icon.length||!image.subarray(0,8).equals(pngSignature))continue;
 const width=image.readUInt32BE(16);
 const height=image.readUInt32BE(20);
 if(!largest||width*height>largest.width*largest.height) largest={image,width,height};
}
if(!largest)throw new Error('No PNG image found in Melodify icon.ico');
if(largest.width<128||largest.height<128)throw new Error('Melodify icon resolution is too small');
const output=path.join(__dirname,'..','public','melodify-logo.png');
if(!fs.existsSync(output)||!fs.readFileSync(output).equals(largest.image)){
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,largest.image);
}
console.log(`Melodify brand logo ready: ${largest.width}x${largest.height}`);
