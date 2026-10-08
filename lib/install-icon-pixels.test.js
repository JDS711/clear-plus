import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inflateSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/generate-icons.mjs']);
function smokePixels(path) {
 const png=fs.readFileSync(path);let width,height,depth,type;const idat=[];
 for(let offset=8;offset<png.length;){const len=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8),data=png.subarray(offset+8,offset+8+len);if(kind==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];type=data[9];}if(kind==='IDAT')idat.push(data);offset+=len+12;}
 assert.equal(depth,8);assert.equal(type,6);const bytes=inflateSync(Buffer.concat(idat)),stride=width*4,pixels=Buffer.alloc(stride*height);
 const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
 for(let y=0;y<height;y++){const start=y*(stride+1),filter=bytes[start];assert.ok(filter<=4);for(let x=0;x<stride;x++){const i=y*stride+x,left=x>=4?pixels[i-4]:0,up=y?pixels[i-stride]:0,corner=y&&x>=4?pixels[i-stride-4]:0;const predictor=filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth(left,up,corner);pixels[i]=(bytes[start+1+x]+predictor)&255;}}
 let white=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>128&&pixels[i]>220&&pixels[i+1]>220&&pixels[i+2]>220)white++;
 return {width,height,white};
}
for(const [name,size] of [['icon-512-v6.png',512],['icon-192-v6.png',192],['apple-touch-icon-v6.png',180]])test(`${name} contains visible white smoke, not just a blue tile`,()=>{
 const result=smokePixels('public/icons/'+name);assert.equal(result.width,size);assert.equal(result.height,size);assert.ok(result.white>size*size*.02 && result.white<size*size*.2,`white pixels: ${result.white}`);
});
test('manifest and browser/Windows icons use the repaired version',()=>{
 const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));assert.ok(manifest.icons.every(icon=>icon.src.includes('-v6.png')));
 const ico=fs.readFileSync('public/icons/favicon-v6.ico');assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),4);
 assert.deepEqual(fs.readFileSync('public/favicon.ico'),ico);
});

test('older installed-app icon addresses resolve to the complete current artwork',()=>{
 for(const version of ['', '-v1', '-v2', '-v3', '-v4', '-v5']) {
  for(const [stem, current] of [['icon-192','icon-192-v6.png'],['icon-512','icon-512-v6.png'],['apple-touch-icon','apple-touch-icon-v6.png']]) assert.deepEqual(fs.readFileSync('public/icons/'+stem+version+'.png'),fs.readFileSync('public/icons/'+current));
  assert.deepEqual(fs.readFileSync('public/icons/favicon'+version+'.ico'),fs.readFileSync('public/icons/favicon-v6.ico'));
 }
 assert.match(fs.readFileSync('index.html','utf8'),/manifest\.webmanifest\?v=7/);
 const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));assert.ok(config.headers.some(rule=>rule.source==='/icons/:path*'&&rule.headers.some(header=>header.key==='Cache-Control'&&header.value.includes('no-cache'))));
});
