import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import {
  GROUND_TEXTURE_ASSETS, BiomeTextureSettingsSystem, normalizeGroundTexturePath
} from '../src/ground-texture-system.js';

const files=[
  {id:'south',name:'ground_1024.jpg',old:'south_256.jpg'},
  {id:'city-south',name:'city_ground_1024.jpg',old:'city_south_512.jpg'}
];
const prefix='./assets/textures/biomes/';
const config=JSON.parse(readFileSync(new URL('../data/biome-textures.json',import.meta.url),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('../data/preflight-manifest.json',import.meta.url),'utf8'));
const manifestText=JSON.stringify(manifest);

test('South scene files, Biome settings, preflight and original JPEG filenames are identical',()=>{
  for (const {id,name,old} of files){
    assert.equal(config.textures.find(x=>x.id===id)?.textureFile,prefix+name,id);
    assert.ok(GROUND_TEXTURE_ASSETS.some(x=>x.file===prefix+name),'Phaser loader missing '+name);
    assert.ok(manifestText.includes(prefix+name),'Pre-flight missing '+name);
    assert.ok(!manifestText.includes(old),'Legacy filename still required: '+old);
    assert.ok(!GROUND_TEXTURE_ASSETS.some(x=>x.file.endsWith(old)),'Legacy Phaser texture remains');
    assert.ok(existsSync(new URL('../assets/textures/biomes/'+name,import.meta.url)),'Original asset missing '+name);
    assert.ok(!existsSync(new URL('../assets/textures/biomes/'+old,import.meta.url)),'Legacy JPEG still tracked: '+old);
    const buffer=readFileSync(new URL('../assets/textures/biomes/'+name,import.meta.url));
    assert.deepEqual([...buffer.subarray(0,3)],[0xff,0xd8,0xff],'Invalid JPEG marker '+name);
    assert.ok(buffer.length>100000,'Unexpected tiny placeholder: '+name);
    assert.equal(statSync(new URL('../assets/textures/biomes/'+name,import.meta.url)).size,buffer.length);
  }
});
test('Legacy Biome Lab local textureFile paths migrate to original names without touching other values',async()=>{
  const originalFetch=globalThis.fetch;
  const originalLocalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const localData={
    schemaVersion:1,
    textures:{
      south:{textureFile:prefix+'south_256.jpg',scalePercent:83,opacityPercent:71,enabled:false},
      'city-south':{textureFile:prefix+'city_south_512.jpg',scalePercent:65,opacityPercent:27}
    }
  };
  const captured=JSON.stringify(localData);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>captured,setItem:()=>{throw Error('Must not rewrite browser saves');}}});
  globalThis.fetch=async()=>({ok:true,json:async()=>config});
  try{
    assert.equal(normalizeGroundTexturePath(prefix+'south_256.jpg'),prefix+'ground_1024.jpg');
    assert.equal(normalizeGroundTexturePath(prefix+'city_south_512.jpg'),prefix+'city_ground_1024.jpg');
    const system=await new BiomeTextureSettingsSystem().load();
    assert.equal(system.get('south').textureFile,prefix+'ground_1024.jpg');
    assert.equal(system.get('city-south').textureFile,prefix+'city_ground_1024.jpg');
    assert.equal(system.get('south').scalePercent,83);
    assert.equal(system.get('south').opacityPercent,71);
    assert.equal(system.get('south').enabled,false);
    assert.equal(system.get('city-south').scalePercent,65);
    assert.equal(system.get('city-south').opacityPercent,27);
  }finally{
    globalThis.fetch=originalFetch;
    if(originalLocalStorage)Object.defineProperty(globalThis,'localStorage',originalLocalStorage);
    else delete globalThis.localStorage;
  }
});
