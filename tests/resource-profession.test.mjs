import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ResourceProfessionSystem } from '../src/resource-profession-system.js';
import { ResourceExpeditionSystem } from '../src/resource-expedition-system.js';
import { CharacterMasterRelationshipSystem } from '../src/character-master-relationship-system.js';
import { GameState } from '../src/game-state.js';
const load = path => JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const config=load('data/resource-professions.json');
const expeditionConfig=load('data/resource-expeditions.json');
function profession(snapshot=null){
  const p=new ResourceProfessionSystem({config});
  p.initialize(snapshot);
  return p;
}
test('four independent profession directions and default T1 access survive v1 save roundtrip',()=>{
  const p=profession();
  assert.equal(p.level('stone'),1);
  assert.equal(p.access('stone','T1',0).ok,true);
  assert.equal(p.access('stone','T2',10).ok,false);
  assert.equal(p.availablePoints('stone'),0);
  p.addXp('stone',160);
  assert.equal(p.level('stone'),3);
  assert.equal(p.level('wood'),1);
  assert.equal(p.availablePoints('stone'),2);
  const state=new GameState();
  state.setResourceProfessions(p.snapshot());
  const restored=profession(new GameState(state.snapshot()).snapshot().resourceProfessions);
  assert.equal(restored.level('stone'),3);
  assert.equal(restored.level('wood'),1);
  assert.equal(restored.availablePoints('stone'),2);
});
test('tier permits require tree branch, earned level and relationship with that NPC',()=>{
  const p=profession();
  p.addXp('stone',4840);
  assert.equal(p.level('stone'),12);
  for(let i=0;i<7;i++){
    const entry=p.invest('stone','tier');
    assert.equal(entry.ok,true,'tier upgrade '+i+' permitted');
  }
  assert.equal(p.trainedTier('stone'),'T8');
  assert.equal(p.access('stone','T8',4).ok,false);
  assert.equal(p.access('stone','T8',5).ok,true);
  assert.equal(p.access('wood','T8',8).ok,false);
  assert.equal(p.invest('stone','tier').ok,false);
  assert.equal(p.availablePoints('stone'),4);
});
test('skill tree cannot be reset and does not spend unearned points',()=>{
  const p=profession();
  assert.equal(p.invest('stone','analytics').reason,'no-points');
  p.addXp('stone',40);
  assert.equal(p.invest('stone','analytics').ok,true);
  assert.equal(p.availablePoints('stone'),0);
  assert.equal(p.invest('stone','extraction').reason,'no-points');
  assert.equal(p.addXp('stone',10),11);
  assert.equal(p.get('stone').skills.analytics,1);
});
test('training is a one-per-encounter action and NPC reputations are independent',()=>{
  const p=profession();
  const relation=new CharacterMasterRelationshipSystem();relation.initialize();
  const first={encounterId:'a',masterId:'stone-master-t1',tier:'T1',resourceDirectionId:'stone',activeModules:['training','expedition']};
  const second={...first,encounterId:'b',masterId:'stone-master-t2',tier:'T2'};
  const callback=(id,xp)=>relation.addRelationshipXp(id,xp);
  assert.equal(p.practice(first,{onReputation:callback}).ok,true);
  assert.equal(p.practice(first,{onReputation:callback}).reason,'already-trained');
  assert.equal(relation.get(first.masterId).relationshipXp,50);
  assert.equal(p.practice(second,{onReputation:callback}).ok,true);
  assert.equal(relation.get(first.masterId).relationshipXp,50);
  assert.equal(relation.get(second.masterId).relationshipXp,75);
  assert.equal(p.get('stone').trainingEncounters.length,2);
  assert.equal(p.practice({...first,encounterId:'c',activeModules:['expedition']},{onReputation:callback}).reason,'module-not-active');
});
test('food and tonic are real-time, tool, XP and rank bonuses affect profession calculations',()=>{
  const p=profession();
  p.addXp('wood',4840);
  p.invest('wood','extraction');
  p.invest('wood','extraction');
  p.invest('wood','analytics');
  p.invest('wood','efficiency');
  const t0=1_000;
  const food=p.activateBuff('wood','gathering-food',t0);
  const tonic=p.activateBuff('wood','gathering-tonic',t0);
  assert.equal(food.ok,true);
  assert.equal(tonic.ok,true);
  assert.equal(p.activateBuff('wood','gathering-food',t0+100).reason,'already-active');
  const m=p.modifiers('wood',{now:2_000,hasTool:true});
  assert.ok(m.yieldMultiplier>1.4);
  assert.equal(m.xpMultiplier,1.25);
  assert.equal(m.autoRateMultiplier,1.1);
  assert.equal(m.manualExtraUnits,1);
  assert.equal(m.stepsMultiplier,.9);
  assert.equal(p.modifiers('wood',{now:950_000,hasTool:false}).yieldMultiplier,1);
  assert.equal(p.modifiers('wood',{now:950_000,hasTool:false}).xpMultiplier,1);
});
test('all 8 inventory tiers are defined but only 4 resource directions are live',()=>{
  const data=load('data/resources.json');
  const resources=data.resources.filter(x=>x.massStorage);
  assert.deepEqual(new Set(resources.map(x=>x.id)),new Set(['stone','wood','water','clay']));
  for(const resource of resources) assert.deepEqual(resource.tiers,['T1','T2','T3','T4','T5','T6','T7','T8']);
  assert.equal(expeditionConfig.maxParticipants,12);
});
test('T4 expedition accepts unlocked T8, calculates profession and Master XP, and grants T8 cargo exactly once',()=>{
  const p=profession();
  p.addXp('stone',4840);
  for(let i=0;i<7;i++)assert.equal(p.invest('stone','tier').ok,true);
  const grants=[],xp=[],now=1_000;
  let steps=500;
  const encounter={masterId:'stone-master-t4',encounterId:'T8-1',tier:'T4',resourceDirectionId:'stone',
    expiresAt:300_000,efficiencyMultiplier:1.6};
  const e=new ResourceExpeditionSystem({
    config:expeditionConfig,
    availableSteps:()=>steps,
    spendSteps:count=>{if(count>steps)return false;steps-=count;return true;},
    addSteps:count=>{steps+=count;},
    getAccess:(_,tier)=>p.access('stone',tier,5),
    getModifiers:(id,at)=>p.modifiers(id,{now:at,hasTool:false}),
    grantResource:(id,amount,tier)=>{grants.push({id,amount,tier});return true;},
    grantRelationshipXp:(id,amount)=>xp.push({id,amount}),
    grantProfessionXp:(id,amount,detail)=>p.addXp(id,amount,detail)
  });
  e.initialize();
  assert.equal(e.enter(encounter,now,'T8').ok,true);
  assert.equal(e.run.tier,'T8');
  assert.equal(e.run.initialUnits,350);
  e.startManual(now);
  const hit=e.stopManual(now+500);
  assert.equal(hit.ok,true);
  assert.equal(hit.minedUnits,5);
  assert.equal(p.get('stone').harvestedUnits,5);
  assert.equal(e.leave(1800),true);
  assert.equal(e.claim(),true);
  assert.deepEqual(grants,[{id:'stone',amount:.5,tier:'T8'}]);
  assert.equal(e.claim(),false);
  assert.ok(xp[0].amount>20);
});
