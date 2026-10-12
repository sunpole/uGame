import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_VISUALS,ORIGINAL_VISUAL_ID,FRAME_WIDTH,FRAME_HEIGHT,WALK_FRAMES,
 DIRECTIONS,isCharacterVisualId,sheetTextureKey,directionFromVector,
 drawWalkingSheet} from '../src/character-sprite-gallery.js';
test('Original is first, uniquely selectable, plus five distinct character outfits',()=>{
 assert.equal(CHARACTER_VISUALS.length,6);
 assert.equal(CHARACTER_VISUALS[0].id,ORIGINAL_VISUAL_ID);
 assert.equal(CHARACTER_VISUALS.filter(v=>v.type==='pixel').length,5);
 assert.equal(new Set(CHARACTER_VISUALS.map(v=>v.id)).size,6);
 for(const v of CHARACTER_VISUALS){
   assert.equal(isCharacterVisualId(v.id),true);
   assert.ok(v.label.length>5&&v.note.length>10);
   assert.equal(Object.isFrozen(v),true);
 }
 assert.equal(isCharacterVisualId('not-in-pack'),false);
 assert.equal(sheetTextureKey('blue-striped'),'ugame-walk-blue-striped');
});
test('Each walking study produces a full atlas of sixteen 32x48 four-way frames',()=>{
 assert.equal(DIRECTIONS.length,4);assert.equal(WALK_FRAMES,4);
 let outlines=[];
 for(const v of CHARACTER_VISUALS.filter(x=>x.type==='pixel')){
   const calls=[];
   const ctx={
     save(){calls.push('save');},restore(){calls.push('restore');},
     translate(x,y){calls.push(['translate',x,y]);},
     clearRect(x,y,w,h){calls.push(['clear',w,h]);},
     fillRect(x,y,w,h){calls.push(['rect',x,y,w,h,this.fillStyle]);},
     set fillStyle(v){this._color=v;},get fillStyle(){return this._color;},
     imageSmoothingEnabled:true
   };
   drawWalkingSheet(ctx,v.id);
   assert.deepEqual(calls[0],['clear',FRAME_WIDTH*WALK_FRAMES,FRAME_HEIGHT*DIRECTIONS.length]);
   assert.equal(calls.filter(x=>x==='save').length,16);
   assert.equal(calls.filter(x=>x==='restore').length,16);
   assert.ok(calls.filter(x=>Array.isArray(x)&&x[0]==='rect').length>160);
   outlines.push(calls.filter(x=>Array.isArray(x)&&x[0]==='rect').slice(0,55).join('|'));
 }
 assert.equal(new Set(outlines).size,5,'Different variants must have different visible costumes');
 assert.throws(()=>drawWalkingSheet({clearRect(){}},'unknown'),/Unknown/);
});
test('Walk directions choose four cardinal poses with stable diagonal tie',()=>{
 assert.equal(directionFromVector({x:1,y:0}),'right');
 assert.equal(directionFromVector({x:-1,y:0}),'left');
 assert.equal(directionFromVector({x:0,y:1}),'down');
 assert.equal(directionFromVector({x:0,y:-1}),'up');
 assert.equal(directionFromVector({x:0,y:0}),'down');
 assert.equal(directionFromVector({x:1,y:-1}),'up');
});
