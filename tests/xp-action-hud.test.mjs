import test from 'node:test';
import assert from 'node:assert/strict';
import { xpMeterModel, xpFormatNumber, xpFormatPercent, renderXpMeter } from '../src/xp-meter.js';
import { actionProgress, ActionMeter } from '../src/action-meter.js';

const fakeRoot=()=>{
  const el=new Map();
  return {
    querySelector(sel){
      if(!el.has(sel))el.set(sel,{style:{},textContent:'',dataset:{},
        attributes:{},setAttribute(k,v){this.attributes[k]=v;}});
      return el.get(sel);
    }
  };
};
test('XP thresholds: only accepted 64→65 cost, no invented formulas for 1–63',()=>{
  for(const level of [1,10,31,63]){
    const m=xpMeterModel({zrl:level,zrp:104008});
    assert.equal(m.level,level);assert.equal(m.current,104008);
    assert.equal(m.known,false);assert.equal(m.needed,null);
    assert.equal(m.earned,null);assert.equal(m.remaining,null);
  }
  const last=xpMeterModel({zrl:64,zrp:275000000});
  assert.equal(last.needed,1100000000);
  assert.equal(last.earned,25);assert.equal(last.remaining,75);
  const max=xpMeterModel({zrl:65,zrp:77777});
  assert.deepEqual(max,{level:65,current:0,needed:0,earned:0,remaining:0,known:true,maxLevel:true});
});
test('XP percent uses consistent numerator and denominator, finite and capped',()=>{
  const m=xpMeterModel({zrl:24,zrp:104008},{24:457800});
  assert.equal(m.needed,457800);
  assert.ok(Math.abs(m.earned+(m.remaining)-100)<1e-6);
  assert.ok(Math.abs(m.earned-22.7199)<.01);
  assert.equal(xpFormatNumber(457800),'457 800'.replace(/ /g,' '));
  assert.match(xpFormatPercent(m.earned),/^22,72%$/);
  assert.equal(xpMeterModel({zrl:64,zrp:99999999999}).earned,100);
});
test('Bottom XP bar renders real known/unknown/max states without overwriting save',()=>{
 const root=fakeRoot();
 renderXpMeter(root,{zrl:31,zrp:525});
 assert.equal(root.querySelector('#character-xp').textContent,'ЗРП 525 / — · порог уточняется');
 assert.equal(root.querySelector('#xp-bottom-percent').textContent,'—% / —%');
 assert.equal(root.querySelector('#xp-bottom-fill').style.width,'0.00%');
 renderXpMeter(root,{zrl:64,zrp:550000000});
 assert.match(root.querySelector('#character-xp').textContent,/550.*1.*100/);
 assert.equal(root.querySelector('#xp-bottom-fill').style.width,'50.00%');
 assert.equal(root.querySelector('#xp-bottom-percent').textContent,'50,00% / 50,00%');
 renderXpMeter(root,{zrl:65,zrp:12345});
 assert.equal(root.querySelector('#character-xp').textContent,'ЗРП 0 / 0 · МАКС');
 assert.equal(root.querySelector('#xp-bottom-fill').style.width,'0.00%');
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
