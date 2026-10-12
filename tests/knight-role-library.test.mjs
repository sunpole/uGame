import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {KNIGHT_ROLES,KNIGHT_DIRS,KNIGHT_ATLAS_ROWS,knightNpcRole,knightHeroRole,knightFacing,
 validateKnightUpload,safeKnightSetting,knightPaletteTone,KNIGHT_UPLOAD_WIDTH,KNIGHT_UPLOAD_HEIGHT} from '../src/knight-atlas-core.js';
test('Exactly twelve visual slots, all uniquely identifiable; no mob AI implemented',()=>{
 assert.equal(KNIGHT_ROLES.length,12);
 assert.equal(new Set(KNIGHT_ROLES.map(r=>r.id)).size,12);
 assert.deepEqual(KNIGHT_ROLES.reduce((o,r)=>(o[r.group]=(o[r.group]||0)+1,o),{}),{hero:4,npc:7,mob:1});
 assert.ok(KNIGHT_ROLES.every(r=>r.scale>0));
});
test('Four capital guides map by known zone; neutral Crossroads stays untouched',()=>{
 const cases={'loc-00001':'ruler-1','loc-00005':'ruler-2','loc-00021':'ruler-3','loc-00025':'ruler-4'};
 for(const [zone,expected] of Object.entries(cases))assert.equal(knightNpcRole({id:zone+'-guide',type:'city-guide'}),expected);
 assert.equal(knightNpcRole({id:'loc-00013-guide',type:'city-guide'}),null);
 assert.equal(knightNpcRole({id:'loc-00001-banker',type:'city-banker'}),'banker');
 assert.equal(knightNpcRole({id:'loc-00005-teleporter',type:'city-teleporter'}),'teleporter-b');
 assert.equal(knightNpcRole({id:'loc-00025-teleporter',type:'city-teleporter'}),'teleporter-b');
 assert.equal(knightNpcRole({id:'loc-00013-teleporter',type:'city-teleporter'}),'teleporter-a');
 assert.equal(knightNpcRole({id:'loc-00005-master',type:'master-npc'}),null);
});
test('Four hero types and eight compass directions correspond to real user inputs',()=>{
 assert.deepEqual(['plate','leather','cloth','hybrid'].map(archetype=>knightHeroRole({archetype})),
   ['hero-plate','hero-leather','hero-cloth','hero-hybrid']);
 assert.deepEqual(KNIGHT_DIRS,['SW','W','NW','N','NE','E','SE','S']);
 assert.deepEqual(KNIGHT_ATLAS_ROWS,[2,3,4,1,5,0,7,6]);
 const samples=[[[0,1],'S'],[[1,0],'E'],[[-1,0],'W'],[[0,-1],'N'],[[1,-1],'NE'],[[-1,-1],'NW'],[[1,1],'SE'],[[-1,1],'SW']];
 for(const [[x,y],expected] of samples)assert.equal(knightFacing({x,y}),expected);
});
test('Prevent screenshot-sized and generated AI sheets from breaking 8x11 animation',()=>{
 assert.equal(KNIGHT_UPLOAD_WIDTH,2816);
 assert.equal(KNIGHT_UPLOAD_HEIGHT,2048);
 assert.equal(validateKnightUpload(2816,2048),true);
 for(const [w,h] of [[2048,1489],[1470,1070],[1024,1024],[2816,1024]])
   assert.throws(()=>validateKnightUpload(w,h),/2816×2048/);
});
test('Scale, opacity, local palette only affect artwork, never game statistics',()=>{
 assert.equal(safeKnightSetting('hero-plate',{scale:100}).scale,3.5);
 assert.equal(safeKnightSetting('banker',{shadow:-7}).shadow,0);
 assert.equal(safeKnightSetting('teleporter-a',{scale:.05}).scale,.3);
 assert.equal(safeKnightSetting('mob-human',{enabled:false}).enabled,false);
 assert.deepEqual(knightPaletteTone([100,130,160,255],'#abcdef',false),[100,130,160,255]);
 assert.notDeepEqual(knightPaletteTone([100,130,160,255],'#abcdef',true),[100,130,160,255]);
});
test('Vendored source has all 8 directions with walk and idle frames; no web dependency',()=>{
 const read=(n)=>JSON.parse(readFileSync(new URL('../data/knight-source/'+n+'.json',import.meta.url)));
 const manifest=read('manifest'),walk=read('Walk'),idle=read('Idle'),palette=read('palette');
 assert.equal(manifest.frameSize,256);
 assert.equal(manifest.animations.Walk.frameCount,11);
 assert.equal(manifest.animations.Idle.frameCount,17);
 assert.equal(walk.dirs.length,8);assert.equal(idle.dirs.length,8);
 assert.ok(walk.dirs.every(d=>d.frames.length===11));
 assert.ok(idle.dirs.every(d=>d.frames.length===17));
 assert.ok(palette.palette.length>=30);
});
