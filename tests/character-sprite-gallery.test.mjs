import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_VISUALS,ORIGINAL_VISUAL_ID,FRAME_WIDTH,FRAME_HEIGHT,WALK_FRAMES,
 DIRECTIONS,isCharacterVisualId,sheetTextureKey,directionFromVector,
 drawWalkingSheet,visualScale,perspectiveDescriptor} from '../src/character-sprite-gallery.js';
import {drawPerspectiveWalkingSheet,PERSPECTIVE_SIZES} from '../src/character-perspective-studies.js';
test('Original, six neutral size/angle studies, and five retained costumes are selectable',()=>{
 assert.equal(CHARACTER_VISUALS.length,12);
 assert.equal(CHARACTER_VISUALS[0].id,ORIGINAL_VISUAL_ID);
 assert.equal(CHARACTER_VISUALS.filter(v=>v.type==='pixel').length,11);
 assert.equal(CHARACTER_VISUALS.filter(v=>v.group==='perspective').length,6);
 assert.equal(new Set(CHARACTER_VISUALS.map(v=>v.id)).size,12);
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
 assert.ok(new Set(outlines).size>=7,'Five legacy costumes and two camera angle geometries must be distinct');
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

test('Two camera angles share the same neutral shape at three deliberately different render sizes',()=>{
 const scales=['small','medium','large'].map(size=>visualScale('three-quarter-'+size));
 assert.deepEqual(scales,[0.78,1.05,1.35]);
 assert.equal(scales[0],PERSPECTIVE_SIZES.small);
 assert.equal(visualScale('original'),1.05);
 assert.equal(visualScale('blue-striped'),1.05);
 for(const angle of ['three-quarter','high-topdown']){
   for(const size of ['small','medium','large']){
     const id=angle+'-'+size;
     assert.deepEqual(perspectiveDescriptor(id),{angle,size,scale:PERSPECTIVE_SIZES[size]});
     assert.equal(sheetTextureKey(id),'ugame-angle-'+angle);
   }
 }
 assert.equal(perspectiveDescriptor('original'),null);
 assert.equal(sheetTextureKey('blue-striped'),'ugame-walk-blue-striped');
 assert.notEqual(sheetTextureKey('three-quarter-small'),sheetTextureKey('high-topdown-small'));
});
test('3/4 and high overhead studies have materially different head/body geometry on all four directions',()=>{
 const make=(angle)=>{
   const rectangles=[];
   const ctx={save(){},restore(){},translate(x,y){this.offset=[x,y]},
      clearRect(){},set fillStyle(c){this.ink=c;},get fillStyle(){return this.ink;},
      fillRect(x,y,w,h){rectangles.push({x:x+this.offset[0],y:y+this.offset[1],w,h,color:this.ink});}};
   drawPerspectiveWalkingSheet(ctx,angle);
   return rectangles;
 };
 const quarter=make('three-quarter'),high=make('high-topdown');
 assert.notDeepEqual(quarter,high);
 assert.ok(quarter.some(r=>r.color==='#303d49' && r.h===10),
   '3/4 requires longer full-length legs');
 assert.ok(high.some(r=>r.color==='#3b393c' && r.w===17 && r.h===15),
   'Higher camera requires larger visible head crown');
 assert.ok(!quarter.some(r=>r.color==='#3b393c' && r.w===17 && r.h===15));
 assert.throws(()=>drawPerspectiveWalkingSheet({},'side-view'),/Unknown camera perspective/);
});
