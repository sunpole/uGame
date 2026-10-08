import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MasterActivitySystem } from '../src/master-activity-system.js';
import { ResourceExpeditionSystem } from '../src/resource-expedition-system.js';
import { GameState } from '../src/game-state.js';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const cfg=read('data/master-activities.json');
const expConfig=read('data/resource-expeditions.json');
const spawn=(tier='T1',id='enc-quest')=>({
  encounterId:id,masterId:'stone-master-'+tier.toLowerCase(),resourceDirectionId:'stone',
  tier,expiresAt:500000,activeModules:['expedition','quest','special-event','analytics']
});
function fixture({rank=2,onReward=()=>true,snapshot=null}={}){
  const a=new MasterActivitySystem({config:cfg,getAnalyticsRank:()=>rank,onReward});
  a.initialize(snapshot);
  return a;
}
test('new activities are guarded by actual Encounter module and cannot trigger from unrelated NPC',()=>{
  const a=fixture();
  const npc={...spawn(),activeModules:['expedition']};
  assert.equal(a.acceptQuest(npc).reason,'module-not-active');
  assert.equal(a.progress(npc,'special').available,false);
  assert.equal(a.claim(npc,'analytics',{}).reason,'requirements');
});
test('a gathering quest requires acceptance, 2kg in same Encounter, one reward and survives save roundtrip',()=>{
  const rewards=[];
  const a=fixture({onReward:r=>{rewards.push(r);return true;}});
  const npc=spawn();
  assert.equal(a.progress(npc,'quest',{encounterId:'other',extractedUnits:100}).ready,false);
  assert.equal(a.acceptQuest(npc).ok,true);
  assert.equal(a.acceptQuest(npc).reason,'already-accepted');
  assert.equal(a.claim(npc,'quest',{encounterId:'other',extractedUnits:100}).ok,false);
  assert.equal(a.claim(npc,'quest',{encounterId:npc.encounterId,extractedUnits:19}).ok,false);
  const result=a.claim(npc,'quest',{encounterId:npc.encounterId,extractedUnits:20});
  assert.equal(result.ok,true);
  assert.equal(result.reward.professionXp,25);
  assert.equal(result.reward.steps,12);
  assert.equal(result.reward.reputationXp,35);
  assert.equal(a.claim(npc,'quest',{encounterId:npc.encounterId,extractedUnits:20}).reason,'already-claimed');
  assert.equal(rewards.length,1);
  const gs=new GameState();
  gs.setMasterActivities(a.snapshot());
  const restored=fixture({snapshot:new GameState(gs.snapshot()).snapshot().masterActivities});
  assert.equal(restored.progress(npc,'quest',{encounterId:npc.encounterId,extractedUnits:20}).claimed,true);
});
test('special event requires three accurate manual hits and paid item must fit inventory',()=>{
  let storageFull=true;
  const rewards=[];
  const a=fixture({onReward:reward=>{if(storageFull)return false;rewards.push(reward);return true;}});
  const npc=spawn('T4','event-t4');
  assert.equal(a.claim(npc,'special',{encounterId:npc.encounterId,precisionHits:2}).ok,false);
  const bad=a.claim(npc,'special',{encounterId:npc.encounterId,precisionHits:3});
  assert.equal(bad.reason,'inventory-full');
  assert.equal(a.progress(npc,'special',{encounterId:npc.encounterId,precisionHits:3}).claimed,false);
  storageFull=false;
  const result=a.claim(npc,'special',{encounterId:npc.encounterId,precisionHits:3});
  assert.equal(result.ok,true);
  assert.equal(result.reward.itemId,'gathering-tonic');
  assert.equal(result.reward.professionXp,140);
  assert.equal(result.reward.reputationXp,180);
  assert.equal(a.claim(npc,'special',{encounterId:npc.encounterId,precisionHits:3}).ok,false);
  assert.equal(rewards.length,1);
});
test('analytics mastery rank and 3kg current expedition requirement award bounded bonus',()=>{
  const a=fixture({rank:1});
  const npc=spawn('T3','analytics-t3');
  let state={encounterId:npc.encounterId,extractedUnits:30};
  assert.equal(a.progress(npc,'analytics',state).ready,false);
  a.getAnalyticsRank=()=>2;
  assert.equal(a.progress(npc,'analytics',{...state,extractedUnits:29}).ready,false);
  const result=a.claim(npc,'analytics',state);
  assert.equal(result.ok,true);
  assert.equal(result.reward.steps,24);
  assert.equal(result.reward.professionXp,45);
  assert.equal(result.reward.reputationXp,0);
  assert.equal(a.claim(npc,'analytics',state).reason,'already-claimed');
});
test('manual correct hit increments persistent precision counter and other outcomes do not',()=>{
  const e=new ResourceExpeditionSystem({config:expConfig,availableSteps:()=>100,
    spendSteps:()=>true,grantResource:()=>true,getAccess:()=>({ok:true})});
  e.initialize();
  const npc=spawn('T1','precision-save');
  assert.equal(e.enter(npc,1000,'T1').ok,true);
  for(let n=0;n<3;n++){
    const now=1000+n*1000;
    assert.equal(e.startManual(now),true);
    const result=e.stopManual(now+500);
    assert.equal(result.result,'точно');
  }
  assert.equal(e.run.precisionHits,3);
  const restored=new ResourceExpeditionSystem({config:expConfig});restored.initialize(e.snapshot());
  assert.equal(restored.run.precisionHits,3);
});
test('catalog exposes all six playable Master activities; old Dialogue stays legacy',()=>{
  const j=read('data/master-npcs.json');
  const mods=new Map(j.modules.map(x=>[x.id,x]));
  for(const id of ['extraction','expedition','training','analytics','quest','special-event']){
    assert.equal(mods.get(id)?.implemented,true,id);
  }
  assert.equal(mods.get('dialogue').legacy,true);
});
