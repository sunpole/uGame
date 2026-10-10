import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSnapshot, parseSnapshot, diffSnapshot, SNAPSHOT_KIND } from '../src/character-balance/snapshot.js';
import { METRIC_KEYS, defaultProfile, calculateCharacter } from '../src/character-balance/engine.js';
const read = path => JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const rules=read('../data/character-balance-candidate.json');
const registry=read('../data/character-stat-registry.json');
const profiles=()=>[defaultProfile(rules,1,'force',3),defaultProfile(rules,10,'focus',2),defaultProfile(rules,40,'tempo',1),defaultProfile(rules,65,'inspire',1)];

test('fourth pass: all 24 metric ids and full source registry unique with required provenance',()=>{
 const derived=registry.records.filter(x=>x.kind==='derived');
 const all=new Set(registry.records.map(x=>x.id));
 assert.equal(registry.records.length,50);
 assert.equal(all.size,50);
 assert.equal(derived.length,24);
 assert.deepEqual(new Set(derived.map(x=>x.id)),new Set(METRIC_KEYS));
 for(const entry of registry.records){
   assert.ok(entry.abbreviation&&entry.name&&entry.meaning&&entry.unit&&entry.formula,entry.id);
   assert.ok(Array.isArray(entry.sourceRefs)&&entry.sourceRefs.length,entry.id);
   assert.ok(entry.implementation&&entry.decisionStatus,entry.id);
 }
 assert.equal(registry.records.filter(x=>x.kind==='input').length,5);
 assert.equal(registry.records.filter(x=>x.kind==='origin').length,4);
 assert.equal(registry.records.filter(x=>x.kind==='system').length,17);
});
test('fourth pass: 100 UVM =1% cooldown, not 10%; original sample 10→9 is typo',()=>{
 const cooldown=(base,points)=>base*(1-points/10000);
 assert.equal(cooldown(10,100),9.9);
 assert.equal(cooldown(10,1000),9);
 assert.equal(cooldown(10,2000),8);
 const uv=registry.records.find(x=>x.id==='uvm');
 assert.match(uv.notes,/9,9/);
});
test('fourth pass: accepted LOV→UKL; VYN→DEF; GLR = ×(1+glr/10000)',()=>{
 assert.equal(rules.perVyn.def,0.1);
 assert.equal(rules.perLov.ukl,1);
 assert.equal(Object.hasOwn(rules.perLov,'def'),false);
 assert.equal((1+100/10000),1.01);
});
test('sandbox full 1–4 profile export/import and identical formula traces',async()=>{
 for(let i=1;i<=4;i++){
   const pins=['hp','rp','glr','ukl'];
   const x=await createSnapshot({rules,registry,profiles:profiles().slice(0,i),pins,selected:'glr'});
   assert.equal(x.kind,SNAPSHOT_KIND);
   assert.equal(x.calculations.length,i);
   assert.match(x.checksum.value,/^[0-9a-f]{64}$/);
   const restored=await parseSnapshot(JSON.stringify(x,null,2));
   assert.deepEqual(restored.profiles,x.profiles);
   assert.deepEqual(restored.calculations[0].trace,x.calculations[0].trace);
   assert.equal(restored.calculations[i-1].values.hp,calculateCharacter(rules,profiles()[i-1]).values.hp);
   assert.deepEqual(restored.pins,pins);
 }
});
test('snapshot diff reports only real changes to formula, profiles and pins',async()=>{
 const a=await createSnapshot({rules,registry,profiles:profiles().slice(0,2),pins:['hp'],selected:'hp'});
 const variant=structuredClone(rules);variant.perVyn.hp=20;
 const modified=profiles().slice(0,2);
 modified[0].otv=700;
 const b=await createSnapshot({rules:variant,registry,profiles:modified,pins:['hp','pp'],selected:'hp'});
 const diff=diffSnapshot(a,b);
 assert.ok(diff.ruleChanges.some(x=>x.field==='perVyn.hp'&&x.previous==='10'&&x.next==='20'));
 assert.deepEqual(diff.profileChanges,[1]);
 assert.deepEqual(diff.nextPins,['hp','pp']);
 assert.equal(diff.sourceChanged,false);
});
test('snapshot import rejects edited checksum, missing metrics and unsupported versions',async()=>{
 const s=await createSnapshot({rules,registry,profiles:profiles().slice(0,2),pins:['hp'],selected:'hp'});
 const changed=structuredClone(s);changed.rules.perLov.ukl=999;
 await assert.rejects(parseSnapshot(JSON.stringify(changed)),/Контрольная сумма/);
 const changed2=structuredClone(s);changed2.release='0.2.99';
 await assert.rejects(parseSnapshot(JSON.stringify(changed2)),/Версия редактора/);
 const changed3=structuredClone(s);changed3.schemaVersion=2;
 await assert.rejects(parseSnapshot(JSON.stringify(changed3)),/Неподдерживаемый/);
 const changed4=structuredClone(s);changed4.profiles[0].extraFlat.bad=1;
 await assert.rejects(parseSnapshot(JSON.stringify(changed4)),/Контрольная сумма/);
});
test('snapshot export blocks invalid metric pins and invalid 5th build',async()=>{
 await assert.rejects(createSnapshot({rules,registry,profiles:profiles(),pins:['bogus'],selected:'hp'}),/закреплённые/);
 await assert.rejects(createSnapshot({rules,registry,profiles:[...profiles(),profiles()[0]],pins:[],selected:'hp'}),/1–4/);
 await assert.rejects(createSnapshot({rules,registry,profiles:profiles().slice(0,1),pins:['hp','hp'],selected:'hp'}),/закреплённые/);
});
