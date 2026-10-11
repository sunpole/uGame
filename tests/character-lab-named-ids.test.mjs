import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAT_TERMS,TO_PUBLIC,TO_LEGACY,labelForStat} from '../src/character-balance/terminology.js';
import {createNamedSnapshot,parseNamedSnapshot,toEnglishFieldPath} from '../src/character-balance/named-snapshot.js';
import {createSnapshot} from '../src/character-balance/snapshot.js';
import {METRIC_KEYS,defaultProfile,calculateCharacter} from '../src/character-balance/engine.js';
import {PIN_KEYS} from '../src/character-balance/pins.js';
import {setSourceModifier,removeSourceModifier} from '../src/character-balance/modifiers.js';
const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const rules=load('../data/character-balance-candidate.json'),registry=load('../data/character-stat-registry.json');
const build=()=>[defaultProfile(rules,1,'force',3),defaultProfile(rules,65,'inspire',1)];
const args=()=>({rules,registry,profiles:build(),selected:'hp',pins:['hp','vyn','lov','intel','otv','glr','ust']});

test('terms: all 24 derived metrics plus 4 inputs have unique real-English identifiers',()=>{
 for(const id of [...METRIC_KEYS,'vyn','lov','intel','otv']){
   assert.ok(STAT_TERMS[id]?.id,id);
   assert.ok(STAT_TERMS[id]?.code,id);
   assert.ok(STAT_TERMS[id]?.en,id);
   assert.ok(labelForStat(id).includes(STAT_TERMS[id].en));
   assert.equal(TO_LEGACY[TO_PUBLIC[id]],id);
 }
 assert.equal(STAT_TERMS.vyn.code,'CON');
 assert.equal(STAT_TERMS.lov.code,'DEX');
 assert.equal(STAT_TERMS.intel.code,'INT');
 assert.equal(STAT_TERMS.otv.code,'RESP');
 assert.equal(toEnglishFieldPath('ruleModifiers.perVyn.glr.more'),'ruleModifiers.perConstitution.globalRegeneration.more');
 assert.equal(Object.keys(STAT_TERMS).length,28);
});

test('JSON v2 exports semantic identifiers EVERYWHERE; no transliterated stat field names',async()=>{
 const a=await createNamedSnapshot(args());
 assert.equal(a.schemaVersion,2);
 assert.equal(a.profiles[0].constitution,5);
 assert.equal(a.profiles[0].responsibility,1);
 assert.equal(a.profiles[0].vyn,undefined);
 assert.ok(a.rules.perConstitution.health===10);
 assert.ok(a.rules.perResponsibilityBlock.globalRegeneration===1);
 assert.equal(a.registry.records.find(x=>x.id==='constitution')?.abbreviation,'ВЫН');
 assert.ok(a.calculations[0].values.health>0);
 assert.ok(Array.isArray(a.calculations[0].trace.globalRegeneration));
 assert.equal(a.pins.includes('constitution'),true);
 assert.equal(a.selected,'health');
 const json=JSON.stringify(a);
 for(const legacy of ['vyn','lov','intel','otv','perVyn','perLov','perInt','perOtvBlock','ukl','toch','glr','rgs','ust','usu','uvm']){
   assert.equal(new RegExp('"' + legacy + '"\\s*:').test(json),false,legacy+' must not be serialized as a JSON key');
 }
 for(const short of ['Constitution','Dexterity','Intelligence','Responsibility']){
   assert.ok(json.includes(short),short+' bilingual term exists');
 }
});

test('JSON v2 round-trip preserves candidate formulas, profiles, sources and exact calculation traces',async()=>{
 const changed=structuredClone(rules);
 setSourceModifier(changed,'perVyn','hp','more',7,METRIC_KEYS);
 setSourceModifier(changed,'perVyn','hp','increased',15,METRIC_KEYS);
 removeSourceModifier(changed,'perVyn','atk','flat');
 setSourceModifier(changed,'perOtvBlock','glr','more',5,METRIC_KEYS);
 const profiles=build();
 const pins=['vyn','lov','intel','otv','glr','rgs','ust','hp'];
 const source={rules:changed,registry,profiles,selected:'glr',pins};
 const published=await createNamedSnapshot(source);
 assert.equal(published.rules.ruleModifiers.perConstitution.health.more,7);
 assert.equal(published.rules.ruleModifiers.perConstitution.attack.flat,null);
 assert.equal(published.rules.ruleModifiers.perResponsibilityBlock.globalRegeneration.more,5);
 const restored=await parseNamedSnapshot(JSON.stringify(published));
 assert.deepEqual(restored.rules,changed);
 assert.deepEqual(restored.profiles,profiles);
 assert.deepEqual(restored.registry,registry);
 assert.deepEqual(restored.pins,pins);
 assert.deepEqual(restored.calculations[1].trace,calculateCharacter(changed,profiles[1]).trace);
 assert.equal(restored.schemaVersion,1,'internal decoding returns legacy-compatible state');
});

test('v0.2.57 original JSON v1 remains importable with no changes to user values',async()=>{
 const original=await createSnapshot(args());
 const imported=await parseNamedSnapshot(JSON.stringify(original));
 assert.deepEqual(imported.rules,original.rules);
 assert.deepEqual(imported.profiles,original.profiles);
 assert.deepEqual(imported.pins,original.pins);
});

test('named JSON rejects tampering and incompatible terminology or unknown schema',async()=>{
 const source=await createNamedSnapshot(args());
 const tampered=structuredClone(source);
 tampered.rules.perConstitution.health=9999;
 await assert.rejects(parseNamedSnapshot(JSON.stringify(tampered)),/Контрольная сумма/);
 const altered=structuredClone(source);
 altered.terminology[0].english='SomethingElse';
 // Recalculate is impossible without changing hash; checksum mismatch protects metadata.
 await assert.rejects(parseNamedSnapshot(JSON.stringify(altered)),/Контрольная сумма/);
 const unknown=structuredClone(source);unknown.schemaVersion=3;
 await assert.rejects(parseNamedSnapshot(JSON.stringify(unknown)),/Неподдерживаемый/);
});
