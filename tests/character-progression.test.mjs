import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GameState,createDefaultGameState} from '../src/game-state.js';
import {currentCharacterVitals} from '../src/character-runtime.js';
import {DevCharacterTools} from '../src/dev-character-tools.js';
import {validateXpCurve} from '../src/xp-meter.js';
import {emptyCharacterAllocation,normalizeCharacterAllocation,earnedAttributePoints,
 allocationSummary,spendCharacterAttribute,settleCharacterExperience,
 awardCharacterExperience} from '../src/character-progression.js';

const curve=JSON.parse(readFileSync(new URL('../data/character-xp-curve.json',import.meta.url)));
const thresholds=validateXpCurve(curve);
const rules=JSON.parse(readFileSync(new URL('../data/character-balance-candidate.json',import.meta.url)));
const hero=()=>{const g=new GameState();g.setCharacterDraft({schemaVersion:1,cityId:'force',startIndex:3});return g;};

test('level point milestones replace +3; total 248, passive 64',()=>{
 assert.deepEqual([1,2,9,10,20,30,40,50,55,60,65].map(earnedAttributePoints),
   [0,3,24,29,61,93,130,167,189,216,248]);
 assert.equal(curve.levels.reduce((a,r)=>a+r.attributePoints,0),248);
 assert.equal(allocationSummary(65,null).passiveEarned,64);
 assert.equal(allocationSummary(1,null).passiveEarned,0);
});
test('old GameState v1 remains intact and invalid allocations are rejected',()=>{
 const old=createDefaultGameState();
 delete old.player.characterAllocation;
 old.player.classId='scout';old.world.zoneId='loc-00225';old.resources={stone:152};
 const s=new GameState(old).snapshot();
 assert.equal(s.schemaVersion,1);assert.equal(s.player.classId,'scout');
 assert.equal(s.world.zoneId,'loc-00225');assert.equal(s.resources.stone,152);
 assert.deepEqual(s.player.characterAllocation,emptyCharacterAllocation());
 for(const spent of [{vyn:999,lov:0,intel:0},{vyn:0,lov:0,intel:-1},{vyn:1,lov:1}])
  assert.deepEqual(normalizeCharacterAllocation({schemaVersion:1,spent}),emptyCharacterAllocation());
});
test('XP thresholds, multi-level carry and maximum level without XP after 65',()=>{
 assert.deepEqual(settleCharacterExperience({zrl:1,zrp:1000},thresholds),
  {schemaVersion:1,zrl:2,zrp:0,levelsGained:1,curveReady:true});
 assert.deepEqual(settleCharacterExperience({zrl:1,zrp:3001},thresholds),
  {schemaVersion:1,zrl:3,zrp:1,levelsGained:2,curveReady:true});
 assert.deepEqual(awardCharacterExperience({zrl:1,zrp:800},200,thresholds),
  {schemaVersion:1,zrl:2,zrp:0,levelsGained:1,curveReady:true});
 assert.deepEqual(settleCharacterExperience({zrl:64,zrp:1100000000},thresholds),
  {schemaVersion:1,zrl:65,zrp:0,levelsGained:1,curveReady:true});
 assert.equal(awardCharacterExperience({zrl:65,zrp:123},1500,thresholds).zrp,0);
 assert.throws(()=>awardCharacterExperience({zrl:50,zrp:0},-1,thresholds),/ЗРП/);
 assert.throws(()=>awardCharacterExperience({zrl:1,zrp:Number.MAX_SAFE_INTEGER},1,thresholds),/предел/);
});
test('missing XP table never fabricates costs or loses held XP',()=>{
 assert.deepEqual(settleCharacterExperience({zrl:1,zrp:5000},{64:1100000000}),
  {schemaVersion:1,zrl:1,zrp:5000,levelsGained:0,curveReady:false});
});
test('players independently choose allocation: no even split from Lab',()=>{
 const gs=hero();gs.setCharacterProgress({zrl:10,zrp:0});
 const before=currentCharacterVitals(rules,gs.state.player);
 assert.equal(before.allocation.free,29);
 assert.deepEqual(before.allocation.spent,{vyn:0,lov:0,intel:0});
 for(const k of ['vyn','lov','intel'])gs.allocateCharacterAttribute(k);
 for(let i=0;i<26;i++)gs.allocateCharacterAttribute('vyn');
 const after=currentCharacterVitals(rules,gs.state.player);
 assert.deepEqual(after.allocation.spent,{vyn:27,lov:1,intel:1});
 assert.equal(after.allocation.free,0);
 assert.ok(after.values.hp>before.values.hp);
 assert.ok(after.values.pp>before.values.pp);
 assert.throws(()=>gs.allocateCharacterAttribute('vyn'),/Нет свободных/);
 const afterF5=new GameState(gs.snapshot());
 assert.deepEqual(currentCharacterVitals(rules,afterF5.state.player).values,after.values);
});
test('no profile cannot spend; invalid stat blocked; +1 per click persists',()=>{
 assert.throws(()=>new GameState().allocateCharacterAttribute('vyn'),/профиль/);
 const gs=hero();gs.setCharacterProgress({zrl:2,zrp:0});
 assert.throws(()=>gs.allocateCharacterAttribute('bad'),/Неизвестная/);
 assert.deepEqual(spendCharacterAttribute(2,null,'vyn').spent,{vyn:1,lov:0,intel:0});
 gs.allocateCharacterAttribute('vyn');
 assert.equal(new GameState(gs.snapshot()).state.player.characterAllocation.spent.vyn,1);
});
test('GameState award and DEV exact/percent XP share level-up and overflow',()=>{
 const g=hero();
 assert.deepEqual({zrl:g.awardCharacterXp(2500,thresholds).zrl,zrp:g.state.player.characterProgress.zrp},
  {zrl:2,zrp:1500});
 g.awardCharacterXp(1000,thresholds);
 assert.equal(g.state.player.characterProgress.zrl,3);
 assert.equal(g.state.player.characterProgress.zrp,500);
 const restored=new GameState(g.snapshot());
 const dev=new DevCharacterTools({getState:()=>restored,root:{querySelector:()=>null},
   getThresholds:()=>thresholds});
 assert.equal(dev.applyDirect('zrp',4076).ok,true);
 assert.equal(restored.state.player.characterProgress.zrl,4);
 assert.equal(restored.state.player.characterProgress.zrp,0);
 restored.setCharacterExperience(800,thresholds);
 assert.equal(dev.executeDevCode('2103').handled,true);
 assert.equal(restored.state.player.characterProgress.zrl,4);
 assert.equal(restored.state.player.characterProgress.zrp,1200);
});
test('VYN/INT update HP/PP maxima without free healing of current pools',()=>{
 const g=hero();g.setCharacterProgress({zrl:2,zrp:0});
 const before=currentCharacterVitals(rules,g.state.player);
 g.setCharacterPools({...before.pools,current:{...before.pools.current,hp:5,pp:1}});
 g.allocateCharacterAttribute('vyn');
 g.allocateCharacterAttribute('intel');
 const after=currentCharacterVitals(rules,g.state.player);
 assert.ok(after.values.hp>before.values.hp);assert.ok(after.values.pp>before.values.pp);
 assert.equal(after.pools.current.hp,5);assert.equal(after.pools.current.pp,1);
 assert.equal(after.allocation.free,1);
});
