import test from 'node:test';
import assert from 'node:assert/strict';
import { metricInterpretation } from '../src/character-balance/display-units.js';
import { calculateCharacter, defaultProfile } from '../src/character-balance/engine.js';
import { pinInfo } from '../src/character-balance/pins.js';
import { readFileSync } from 'node:fs';

const rules=JSON.parse(readFileSync(new URL('../data/character-balance-candidate.json',import.meta.url),'utf8'));

test('documented 100-to-1% scores are not erroneously displayed as full percents',()=>{
  for(const key of ['ukl','def','toch','krsh','uvm','ust','usu','glr']){
    assert.equal(metricInterpretation(key,24)?.text,'0,24%',key);
    assert.equal(metricInterpretation(key,100)?.text,'1%',key);
    assert.equal(metricInterpretation(key,250)?.text,'2,5%',key);
    assert.equal(metricInterpretation(key,9999)?.text,'99,99%',key);
  }
  assert.match(metricInterpretation('uvm',100).description,/10 сек → 9,9 сек/);
});
test('attack rate and movement rate are explicitly candidate units, not production Phaser speeds',()=>{
  assert.equal(metricInterpretation('ska',420).text,'4,2 атак/с');
  assert.match(metricInterpretation('ska',420).description,/Черновик/);
  assert.equal(metricInterpretation('skp',250).text,'2,5 px/с');
  assert.match(metricInterpretation('skp',250).description,/НЕ измеренная скорость/);
  assert.equal(metricInterpretation('kru',120).text,'+120% к крит. урону');
});
test('tiny/zero/negative/fractional candidates retain honest precision, unconverted stats have no invented percentages',()=>{
  assert.equal(metricInterpretation('ukl',0.01).text,'0,0001%');
  assert.equal(metricInterpretation('ukl',0).text,'0%');
  assert.equal(metricInterpretation('ust',-100).text,'-1%');
  assert.equal(metricInterpretation('uvm',NaN),null);
  for(const key of ['hp','hps','rp','pp','atk','slots','slotWeight','steps','rgs']){
    assert.equal(metricInterpretation(key,420),null,key);
  }
});
test('display-only helper cannot alter balance candidate, legacy IDs, pinned number or serialized calculator result',()=>{
  const profile=defaultProfile(rules,10,'focus',3);
  const before=calculateCharacter(rules,profile);
  const saved=JSON.stringify(before);
  const chosen=before.values.ukl;
  const interpreted=metricInterpretation('ukl',chosen);
  assert.equal(interpreted.text,new Intl.NumberFormat('ru-RU',{maximumFractionDigits:10}).format(chosen/100)+'%');
  const detail=pinInfo('ukl',profile,before);
  assert.equal(detail.value,chosen,'Pins retain the raw score for export and snapshot compatibility');
  assert.ok(detail.lines.some(s=>s.includes(interpreted.text)));
  assert.equal(JSON.stringify(calculateCharacter(rules,profile)),saved);
});
