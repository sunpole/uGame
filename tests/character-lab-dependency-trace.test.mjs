import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {METRIC_KEYS,calculateCharacter,defaultProfile} from '../src/character-balance/engine.js';
import {setSourceModifier} from '../src/character-balance/modifiers.js';
import {PIN_KEYS, PIN_INPUTS, pinInfo} from '../src/character-balance/pins.js';
import {createSnapshot,parseSnapshot} from '../src/character-balance/snapshot.js';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const base=read('../data/character-balance-candidate.json'),registry=read('../data/character-stat-registry.json');
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-8,label+': '+a+' !== '+b);
const first=r=>defaultProfile(r,1,'force',3);

test('ALL 24 output metrics use their own flat/increased/more; each stacked % actually changes value',()=>{
 for(const key of METRIC_KEYS){
   const rules=structuredClone(base);
   rules.baseline[key]=100; // non-zero independent anchor even for derived metrics
   const ref=calculateCharacter(rules,first(rules));
   const modified=structuredClone(rules);
   setSourceModifier(modified,'perVyn',key,'increased',10,METRIC_KEYS); // 5 VYN = +50%
   setSourceModifier(modified,'perVyn',key,'more',5,METRIC_KEYS); // 5 VYN = ×1.25
   const x=calculateCharacter(modified,first(modified));
   near(x.values[key],ref.values[key]*1.5*1.25,key+' 50% increased ×25% more');
   assert.ok(x.trace[key].some(t=>/Суммарные increased/.test(t.source)),key+' inc trace');
   assert.ok(x.trace[key].some(t=>/more/.test(t.source)),key+' more trace');
   const flat=structuredClone(rules);
   setSourceModifier(flat,'perVyn',key,'flat',2,METRIC_KEYS);
   const y=calculateCharacter(flat,first(flat));
   assert.ok(y.values[key]>ref.values[key],key+' flat effect must increase');
 }
});
test('GLR flat/increased/more must each propagate into all five regeneration outputs',()=>{
 const seed=structuredClone(base);
 seed.baseline.glr=100;
 seed.perLevel.glr=0;
 seed.perOtvBlock.glr=0;
 for(const city of Object.values(seed.cities))if(Object.hasOwn(city.flat,'glr'))city.flat.glr=0;
 const p=first(seed),normal=calculateCharacter(seed,p);
 const paths=['hps','rps','pps','jps','rgs'];
 // Test each input kind independently.
 for(const [kind,value,expectedGlr] of [['flat',100,200],['increased',100,200],['more',100,200]]){
   const rules=structuredClone(seed);
   setSourceModifier(rules,'perLevel','glr',kind,value,METRIC_KEYS);
   const x=calculateCharacter(rules,p);
   near(x.values.glr,expectedGlr,kind+' GLR');
   for(const k of paths){
     near(x.values[k]/normal.values[k],(1+expectedGlr/10000)/(1+100/10000),kind+'→'+k);
     assert.match(x.trace[k].at(-1).source,/ГЛР:/,kind+' should leave GLR source trace');
   }
 }
});
test('Global regen uses visible CAPPED GLR, not uncapped upstream value',()=>{
 const rules=structuredClone(base);
 rules.baseline.glr=20000;
 const x=calculateCharacter(rules,first(rules));
 assert.equal(x.values.glr,9999);
 assert.ok(x.capped.includes('glr'));
 for(const k of ['hps','rps','pps','jps','rgs'])assert.match(x.trace[k].at(-1).source,/9999/,k+' trace must name capped GLR');
});
test('Tempo RP-based regen consumes final RP with multiplicative source modifiers',()=>{
 const rules=structuredClone(base);
 const p=defaultProfile(rules,1,'tempo',0);
 const before=calculateCharacter(rules,p);
 const modified=structuredClone(rules);
 setSourceModifier(modified,'perLevel','rp','more',100,METRIC_KEYS);
 const after=calculateCharacter(modified,p);
 near(after.values.rp,2*before.values.rp,'RP more');
 const multiplier=1+after.values.glr/10000;
 const deltaRps=(after.values.rps-before.values.rps)/multiplier;
 near(deltaRps,(after.values.rp-before.values.rp)*.01,'Tempo links RP->RPS after more');
 assert.match(after.trace.rps.map(t=>t.source).join('|'),/Темп: максимум РП/);
});
test('source characteristics and origin can be pinned and remain valid through snapshot export/import',async()=>{
 const p=first(base),r=calculateCharacter(base,p);
 for(const k of PIN_KEYS){
   const info=pinInfo(k,p,r);
   assert.ok(info.label&&info.lines.length>=2,k);
   if(METRIC_KEYS.includes(k))assert.ok(info.lines.some(x=>x.includes('База:')),k+' should expose trace');
 }
 assert.equal(pinInfo('otv',p,r).value,1);
 assert.equal(pinInfo('vyn',p,r).value,5);
 assert.equal(pinInfo('mainResource',p,r).value,'СИЛ');
 assert.equal(pinInfo('ust',p,r).lines.some(x=>x.includes('ЖП > 0')),true,'1001 UST must expose Desire');
 assert.equal(PIN_KEYS.length,33);
 assert.equal(Object.keys(PIN_INPUTS).length,9);
 const pins=['hp','vyn','lov','intel','otv','mainResource','level','unspent','ust'];
 const snap=await createSnapshot({rules:base,profiles:[p],pins,selected:'hp',registry});
 const restored=await parseSnapshot(JSON.stringify(snap));
 assert.deepEqual(restored.pins,pins);
 const bad=structuredClone(snap);bad.pins=['str'];
 await assert.rejects(parseSnapshot(JSON.stringify(bad)),/Контрольная сумма/);
});
