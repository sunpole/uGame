import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {xpMeterModel,xpFormatNumber,xpFormatPercent,renderXpMeter,
  validateXpCurve,loadXpThresholds} from '../src/xp-meter.js';
import {actionProgress, ActionMeter} from '../src/action-meter.js';

const curve=JSON.parse(readFileSync(new URL('../data/character-xp-curve.json',import.meta.url)));
const fakeRoot=()=>{
  const el=new Map();
  return {querySelector(sel){
    if(!el.has(sel))el.set(sel,{style:{},textContent:'',dataset:{},
      attributes:{},setAttribute(k,v){this.attributes[k]=v;}});
    return el.get(sel);
  }};
};
test('All 64 approved level-up thresholds have integrity, correct sum and point grants',async()=>{
  const thresholds=validateXpCurve(curve);
  assert.equal(Object.keys(thresholds).length,64);
  assert.equal(curve.totalRequiredXp,3067443826);
  assert.equal(curve.levels.reduce((a,r)=>a+r.requiredXp,0),3067443826);
  assert.deepEqual([thresholds[1],thresholds[2],thresholds[20],thresholds[40],
    thresholds[60],thresholds[64]],[1000,2000,92499,1863153,240309835,1100000000]);
  assert.equal(curve.levels.reduce((a,r)=>a+r.attributePoints,0),248);
  assert.equal(curve.levels[64].requiredXp,0);
  await loadXpThresholds(async(path,opts)=>{
    assert.equal(path,'./data/character-xp-curve.json');
    assert.equal(opts.cache,'no-store');
    return {ok:true,json:async()=>curve};
  });
  for(const zrl of [1,2,3,10,20,24,31,63,64]){
    const model=xpMeterModel({zrl,zrp:0});
    assert.equal(model.known,true);
    assert.equal(model.needed,curve.levels[zrl-1].requiredXp);
  }
  assert.deepEqual(xpMeterModel({zrl:65,zrp:77777}),
    {level:65,current:0,needed:0,earned:0,remaining:0,known:true,maxLevel:true});
});
test('XP percentages use level thresholds, clamp, do not mutate or level DEV save',()=>{
 const progress={zrl:24,zrp:104008};
 const m=xpMeterModel(progress);
 assert.equal(m.needed,161280);
 assert.ok(Math.abs(m.earned+m.remaining-100)<1e-6);
 assert.equal(xpFormatNumber(457800),'457 800');
 assert.equal(xpMeterModel({zrl:64,zrp:99999999999}).earned,100);
 assert.equal(xpMeterModel({zrl:2,zrp:2000}).level,2);
 assert.deepEqual(progress,{zrl:24,zrp:104008});
 assert.match(xpFormatPercent(m.earned),/%$/);
});
test('Bottom HUD renders 31 / 64 / MAX using accepted real numbers',()=>{
 const root=fakeRoot();
 renderXpMeter(root,{zrl:31,zrp:525});
 assert.equal(root.querySelector('#character-xp').textContent,'ЗРП 525 / 463 986');
 assert.equal(root.querySelector('#xp-bottom-band').attributes['data-threshold-known'],'true');
 assert.equal(root.querySelector('#xp-bottom-fill').style.width,'0.11%');
 renderXpMeter(root,{zrl:64,zrp:550000000});
 assert.match(root.querySelector('#character-xp').textContent,/550.*1.*100/);
 assert.equal(root.querySelector('#xp-bottom-fill').style.width,'50.00%');
 assert.equal(root.querySelector('#xp-bottom-percent').textContent,'50,00% / 50,00%');
 renderXpMeter(root,{zrl:65,zrp:12345});
 assert.equal(root.querySelector('#character-xp').textContent,'ЗРП 0 / 0 · МАКС');
 assert.equal(root.querySelector('#xp-bottom-fill').style.width,'0.00%');
});
test('Malformed or altered XP configs are rejected before becoming active',()=>{
 assert.throws(()=>validateXpCurve({...curve,totalRequiredXp:1}),/totals/);
 const invalid=structuredClone(curve);invalid.levels[32].requiredXp=-1;
 assert.throws(()=>validateXpCurve(invalid),/Invalid/);
 const last=structuredClone(curve);last.levels[63].requiredXp=1100000001;
 assert.throws(()=>validateXpCurve(last),/totals/);
});
test('Action meter reports actual elapsed time for 100ms or 3s casts',()=>{
 assert.equal(actionProgress(-500,3000),0);
 assert.equal(actionProgress(1500,3000),50);
 assert.equal(actionProgress(3000,3000),100);
 assert.equal(actionProgress(100,100),100);
 assert.equal(actionProgress(20,100),20);
 const root=fakeRoot();
 let clock=0,id=0;
 const callbacks=new Map();
 const meter=new ActionMeter({root,clock:()=>clock,
   requestFrame:cb=>{callbacks.set(++id,cb);return id;},
   cancelFrame:n=>callbacks.delete(n)});
 const frame=()=>{const [key,cb]=callbacks.entries().next().value;callbacks.delete(key);cb();};
 meter.start({label:'Тестовый долгий каст',durationMs:3000},0);
 assert.equal(root.querySelector('#action-meter').dataset.state,'casting');
 clock=1500;frame();
 assert.equal(root.querySelector('#action-meter').attributes['aria-valuenow'],'50');
 clock=3000;frame();
 assert.equal(root.querySelector('#action-meter').dataset.state,'completed');
 meter.start({label:'Частая атака',durationMs:100},clock);
 clock=3050;frame();
 assert.equal(root.querySelector('#action-meter').attributes['aria-valuenow'],'50');
 meter.destroy();
 assert.equal(callbacks.size,0,'No animation frames left after destroy');
});
