import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateRules, pointsAt, defaultProfile, calculateCharacter, METRIC_KEYS } from '../src/character-balance/engine.js';
const rules=JSON.parse(fs.readFileSync(new URL('../data/character-balance-candidate.json',import.meta.url),'utf8'));

test('schema and 21 starter variants from four capitals',()=>{
  assert.equal(validateRules(rules),true);
  assert.deepEqual(Object.values(rules.cities).map(c=>c.start.length),[6,6,6,3]);
});
test('level points: ordinary and milestone replacements',()=>{
  assert.equal(pointsAt(1,rules),10);
  assert.equal(pointsAt(10,rules),39);
  assert.equal(pointsAt(40,rules),140);
  assert.equal(pointsAt(65,rules),258);
  assert.equal(pointsAt(65,rules)-pointsAt(64,rules),20);
});
test('level1 force: baseline 100 HP, 10 RP, starter 5/3/2; PP is positive',()=>{
  const x=calculateCharacter(rules,defaultProfile(rules,1,'force',3));
  assert.equal(x.values.hp,150);
  assert.equal(x.values.rp,50);
  assert.equal(x.values.pp,7);
  assert.equal(x.values.jp,3);
  assert.equal(x.values.atk,9);
  assert.equal(x.values.glr,0.05);
  assert.ok(Math.abs(x.values.rps-1.1000055)<1e-8);
  assert.equal(x.passivePoints,0);
});
test('OTV scenario: from level 3, 600 OTV gives six whole blocks',()=>{
  const p=defaultProfile(rules,3,'force',3);
  const x=calculateCharacter(rules,p);
  const without=calculateCharacter(rules,{...p,otv:1});
  assert.equal(x.blocks,6);
  for(const k of ['hp','rp','jp','glr'])assert.equal(x.values[k]-without.values[k],6);
});
test('OTV 600 and 699 have identical benefits, 700 adds one block',()=>{
  const p=defaultProfile(rules,10,'force',3);
  const a=calculateCharacter(rules,{...p,otv:600});
  const b=calculateCharacter(rules,{...p,otv:699});
  const c=calculateCharacter(rules,{...p,otv:700});
  assert.deepEqual(a.values,b.values);
  assert.equal(c.values.hp-a.values.hp,1);
});
test('GLR 100=1%; affects all five regen rates but not HP/RP capacities',()=>{
  const p=defaultProfile(rules,10,'force',3);
  const x=calculateCharacter(rules,p);
  const noGlr=structuredClone(rules);noGlr.perLevel.glr=0;noGlr.perOtvBlock.glr=0;
  const no=calculateCharacter(noGlr,p);
  const mult=1+x.values.glr/10000;
  for(const k of ['hps','rps','pps','jps','rgs'])assert.ok(Math.abs(x.values[k]/no.values[k]-mult)<1e-7,k);
  assert.equal(x.values.hp,no.values.hp);assert.equal(x.values.rp,no.values.rp);
});
test('ЖП>0 and ЖП=0 are mutually exclusive sets',()=>{
  const p=defaultProfile(rules,10,'force',3);
  const on=calculateCharacter(rules,p),off=calculateCharacter(rules,{...p,desireMode:'zero'});
  assert.ok(on.values.hps>off.values.hps);assert.ok(off.values.rps>on.values.rps);
  assert.ok(off.values.uvm>on.values.uvm);assert.ok(on.values.ust>off.values.ust);
  assert.equal(off.values.glr,on.values.glr+1);
});
test('Tempo +1% max RP per second; Inspiration +20% RP capacity',()=>{
  const tempo=calculateCharacter(rules,defaultProfile(rules,1,'tempo',0));
  const inspiration=calculateCharacter(rules,defaultProfile(rules,1,'inspire',0));
  assert.ok(tempo.values.rps>tempo.values.rp*0.01);
  assert.equal(inspiration.values.rp,66);
});
test('every stat produces numeric value and formula trace',()=>{
  const x=calculateCharacter(rules,defaultProfile(rules,65,'force',3));
  for(const k of METRIC_KEYS){assert.ok(Number.isFinite(x.values[k]),k);assert.ok(x.trace[k].length,k);}
});
test('reject unknown coefficients or negative allocated stats without modifying source',()=>{
  const old=JSON.stringify(rules),bad=structuredClone(rules);bad.perLevel.badMetric=1;
  assert.throws(()=>validateRules(bad),/неизвестный/);
  assert.throws(()=>calculateCharacter(rules,{...defaultProfile(rules),vyn:-1}),/неотрицательными/);
  assert.equal(JSON.stringify(rules),old);
});
test('hard cap is visible in trace',()=>{
  const m=structuredClone(rules);m.perLevel.ska=1000;
  const x=calculateCharacter(m,defaultProfile(m,65));
  assert.equal(x.values.ska,9999);assert.ok(x.capped.includes('ska'));
  assert.match(x.trace.ska.at(-1).source,/Верхний предел/);
});
