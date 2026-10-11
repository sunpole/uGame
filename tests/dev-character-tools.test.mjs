import test from 'node:test';
import assert from 'node:assert/strict';
import {GameState,createDefaultGameState} from '../src/game-state.js';
import {currentCharacterVitals} from '../src/character-runtime.js';
import {readFileSync} from 'node:fs';
import {devPercentZrp,devSetZrp,devLevel,devSetLevel,devSetResponsibility,
 normalizeCharacterResponsibility,availableDevCities,devCityTeleport,DevCharacterTools} from '../src/dev-character-tools.js';

const rules=JSON.parse(readFileSync(new URL('../data/character-balance-candidate.json',import.meta.url)));
const gs=()=>new GameState(createDefaultGameState());
const stubRoot={querySelector:()=>null};
test('legacy GameState v1 saves retain class, world, resources; OTV is optional',()=>{
 const old=createDefaultGameState();
 delete old.player.characterResponsibility;
 old.player.classId='scout';old.world.zoneId='loc-00225';old.resources={shard:12};
 const saved=new GameState(old).snapshot();
 assert.equal(saved.schemaVersion,1);
 assert.equal(saved.player.classId,'scout');assert.equal(saved.world.zoneId,'loc-00225');
 assert.equal(saved.resources.shard,12);
 assert.equal(saved.player.characterResponsibility,null);
 assert.deepEqual(saved.player.characterProgress,{schemaVersion:1,zrl:1,zrp:0});
});
test('ZRP ±5/10/50% changes held points only; zero stays zero; no auto-level',()=>{
 for(const [rate,result] of [[5,105],[10,110],[50,150],[-5,95],[-10,90],[-50,50]]){
   assert.equal(devPercentZrp(100,rate),result);
 }
 assert.equal(devPercentZrp(0,50),0);
 assert.equal(devPercentZrp(1,5),2);
 assert.equal(devPercentZrp(1,-5),0);
 assert.equal(devPercentZrp(3,-50),1);
 assert.equal(devPercentZrp(Number.MAX_SAFE_INTEGER,50),Number.MAX_SAFE_INTEGER);
 assert.equal(devSetZrp(0),0);
 assert.equal(devSetZrp(200000000),200000000);
 assert.throws(()=>devSetZrp(-1));
 assert.throws(()=>devSetZrp(1.5));
 const g=gs();g.setCharacterProgress({schemaVersion:1,zrl:10,zrp:100});
 const tools=new DevCharacterTools({getState:()=>g,root:stubRoot});
 assert.equal(tools.executeDevCode('2103').handled,true);
 assert.equal(g.state.player.characterProgress.zrp,150);
 assert.equal(g.state.player.characterProgress.zrl,10);
 assert.equal(tools.executeDevCode('2113').handled,true);
 assert.equal(g.state.player.characterProgress.zrp,75);
 assert.equal(tools.executeDevCode('2998').handled,false);
});
test('direct and step ZRL strictly enforce levels 1–65 without inventing XP progression',()=>{
 assert.equal(devLevel(1,-1),1);
 assert.equal(devLevel(65,1),65);
 assert.equal(devLevel(31,-1),30);
 assert.equal(devSetLevel(1),1);assert.equal(devSetLevel(65),65);
 assert.throws(()=>devSetLevel(0));
 assert.throws(()=>devSetLevel(66));
 const g=gs();g.setCharacterProgress({schemaVersion:1,zrl:64,zrp:500});
 const tools=new DevCharacterTools({getState:()=>g,root:stubRoot});
 assert.equal(tools.executeDevCode('2201').state,'ok');
 assert.equal(g.state.player.characterProgress.zrl,65);
 assert.equal(g.state.player.characterProgress.zrp,500);
 assert.equal(tools.executeDevCode('2201').state,'ok');
 assert.equal(g.state.player.characterProgress.zrl,65);
 assert.equal(tools.applyDirect('zrl',66).ok,false);
 assert.equal(tools.applyDirect('zrl',1).ok,true);
 assert.equal(g.state.player.characterProgress.zrl,1);
});
test('OTV supports explicit negative/zero/positive input but never silently sets 600 in old save',()=>{
 assert.equal(normalizeCharacterResponsibility(null),null);
 assert.equal(normalizeCharacterResponsibility(undefined),null);
 assert.equal(devSetResponsibility(0),0);
 assert.equal(devSetResponsibility(-50),-50);
 assert.equal(devSetResponsibility(600),600);
 assert.throws(()=>devSetResponsibility(1.2));
 assert.throws(()=>devSetResponsibility(1000000001));
 const g=gs();g.setCharacterDraft({schemaVersion:1,cityId:'focus',startIndex:2});
 const before=currentCharacterVitals(rules,g.state.player);
 const tools=new DevCharacterTools({root:stubRoot,getState:()=>g});
 assert.equal(tools.applyDirect('otv',600).ok,true);
 const saved=new GameState(g.snapshot());
 assert.equal(saved.state.player.characterResponsibility,600);
 assert.equal(saved.state.player.classId,'wanderer');
 const after=currentCharacterVitals(rules,saved.state.player);
 assert.equal(after.responsibility,600);
 assert.notEqual(after.values.hp,before.values.hp);
});
test('city dev teleport only to real five safe cities; no step spend and standard zone hooks',()=>{
 const zones=[{id:'city1',name:'Город 1',ordinalId:10,isSafeCity:true},
 {id:'city2',name:'Город 2',ordinalId:20,isSafeCity:true},
 {id:'city3',name:'Город 3',ordinalId:30,isSafeCity:true},
 {id:'city4',name:'Город 4',ordinalId:40,isSafeCity:true},
 {id:'city5',name:'Город 5',ordinalId:50,isSafeCity:true},
 {id:'master',name:'Master',isSafeCity:false}];
 const graph={getSafeCityZones:()=>zones,resolveZoneId:id=>zones.some(z=>z.id===id)?id:null};
 assert.equal(availableDevCities(graph).length,5);
 const calls=[];const zoneSystem={travel:target=>{
   calls.push(target);return {id:target.zoneId};
 }};
 const config={worldGraph:graph,zoneSystem,worldReady:true,
  save:()=>calls.push('save'),updateVision:()=>calls.push('vision'),playPortal:()=>calls.push('sound')};
 assert.equal(devCityTeleport(config,'master').ok,false);
 assert.equal(devCityTeleport({...config,worldReady:false},'city1').ok,false);
 assert.equal(calls.length,0);
 const got=devCityTeleport(config,'city4');
 assert.equal(got.ok,true);assert.equal(got.city.id,'city4');
 assert.deepEqual(calls,[{zoneId:'city4',entryId:'center'},'vision','sound','save']);
});
test('DEV commands persist and preserve old Step economy/saves, no bonus skill points',()=>{
 const g=gs();const before=g.snapshot(),states=[];
 const tools=new DevCharacterTools({getState:()=>g,root:stubRoot,
   save:()=>states.push(g.snapshot()),renderVitals:()=>{}});
 tools.applyDirect('zrp',10000);
 tools.executeDevCode('2101');
 tools.applyDirect('otv',170);
 tools.applyDirect('zrl',40);
 const save=new GameState(g.snapshot());
 assert.equal(save.state.player.characterProgress.zrp,10500);
 assert.equal(save.state.player.characterProgress.zrl,40);
 assert.equal(save.state.player.characterResponsibility,170);
 assert.deepEqual(save.state.stepEconomy,before.stepEconomy);
 assert.deepEqual(save.state.world,before.world);
 assert.equal(states.length,4);
});
