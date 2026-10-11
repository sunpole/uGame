import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {METRIC_KEYS,calculateCharacter,defaultProfile,validateRules} from '../src/character-balance/engine.js';
import {availableModifiers,hasSourceModifier,setSourceModifier,removeSourceModifier} from '../src/character-balance/modifiers.js';
import {createSnapshot,parseSnapshot,diffSnapshot} from '../src/character-balance/snapshot.js';
const get=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const defaults=get('../data/character-balance-candidate.json'),registry=get('../data/character-stat-registry.json');
const first=rules=>defaultProfile(rules,1,'force',3);
const check=rules=>calculateCharacter(rules,first(rules));
const eq=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,'Expected '+a+' = '+b);
test('default candidate untouched: VYN5 gives 150HP, 9ATK',()=>{
 const old=check(defaults);assert.equal(old.values.hp,150);assert.equal(old.values.atk,9);
 assert.equal(defaults.ruleModifiers,undefined);
});
test('add same HP to flat + increased + more, factor order and source trace',()=>{
 const r=structuredClone(defaults);
 setSourceModifier(r,'perVyn','hp','flat',12,METRIC_KEYS);
 setSourceModifier(r,'perVyn','hp','increased',10,METRIC_KEYS);
 setSourceModifier(r,'perVyn','hp','more',5,METRIC_KEYS);
 const x=check(r); // 100 base + 5*12 = 160; increased 5*10=50%, more 5*5=25%
 eq(x.values.hp,300);
 assert.match(x.trace.hp.map(a=>a.source).join('|'),/increased/);
 assert.match(x.trace.hp.map(a=>a.source).join('|'),/more/);
 assert.deepEqual(Object.keys(availableModifiers(r,'perVyn').hp).sort(),['flat','increased','more']);
 assert.equal(check(defaults).values.hp,150);
});
test('two independent more sources multiply rather than adding their percentages',()=>{
 const r=structuredClone(defaults);
 setSourceModifier(r,'perVyn','hp','more',10,METRIC_KEYS);
 setSourceModifier(r,'perLevel','hp','more',20,METRIC_KEYS);
 eq(check(r).values.hp,150*1.5*1.2);
});
test('remove ATK only from VYN and later reset using pristine candidate',()=>{
 const r=structuredClone(defaults);
 removeSourceModifier(r,'perVyn','atk','flat');
 assert.equal(hasSourceModifier(r,'perVyn','atk','flat'),false);
 assert.equal(check(r).values.atk,4);
 setSourceModifier(r,'perVyn','atk','flat',2,METRIC_KEYS);
 assert.equal(check(r).values.atk,14);
 eq(check(defaults).values.atk,9);
});
test('add entirely absent metric and then remove it without affecting other properties',()=>{
 const r=structuredClone(defaults);
 assert.equal(hasSourceModifier(r,'perVyn','rp','flat'),false);
 setSourceModifier(r,'perVyn','rp','flat',5,METRIC_KEYS);
 assert.equal(check(r).values.rp,95);
 removeSourceModifier(r,'perVyn','rp','flat');
 assert.equal(check(r).values.rp,70);
 assert.equal(r.ruleModifiers,undefined);
});
test('modifier schema refuses unknown kinds, nonfinite values and deletion of unknown flat',()=>{
 const r=structuredClone(defaults);
 r.ruleModifiers={perVyn:{hp:{multiply:5}}};
 assert.throws(()=>validateRules(r),/Неизвестный тип/);
 r.ruleModifiers={perVyn:{hp:{increased:Infinity}}};
 assert.throws(()=>validateRules(r),/Некорректный/);
 r.ruleModifiers={perVyn:{rp:{flat:null}}};
 assert.throws(()=>validateRules(r),/Некорректный/);
});
test('JSON export/import keeps changed dependencies, trace and checksum intact',async()=>{
 const r=structuredClone(defaults),p=[first(r)];
 setSourceModifier(r,'perVyn','hp','more',7,METRIC_KEYS);
 removeSourceModifier(r,'perVyn','atk','flat');
 const a=await createSnapshot({rules:r,profiles:p,pins:['hp'],selected:'hp',registry});
 const parsed=await parseSnapshot(JSON.stringify(a));
 assert.deepEqual(parsed.rules.ruleModifiers,r.ruleModifiers);
 assert.equal(parsed.calculations[0].values.hp,check(r).values.hp);
 const vanilla=await createSnapshot({rules:defaults,profiles:[first(defaults)],pins:['hp'],selected:'hp',registry});
 assert.ok(diffSnapshot(vanilla,parsed).ruleChanges.some(x=>x.field==='ruleModifiers.perVyn.hp.more'));
 const broken=structuredClone(parsed);broken.rules.ruleModifiers.perVyn.hp.more=10000;
 await assert.rejects(parseSnapshot(JSON.stringify(broken)),/Контрольная сумма/);
});
