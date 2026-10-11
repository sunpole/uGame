import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GameState} from '../src/game-state.js';
import {currentCharacterVitals} from '../src/character-runtime.js';
import {SKILL_SLOT_COUNT,RADIAL_IMPULSE,spendImpulse,regenerateVitals,pulseRadius,
  applyPulseHits,applyPlayerDamage,CharacterSkillSystem} from '../src/character-skills.js';

const rules=JSON.parse(readFileSync(new URL('../data/character-balance-candidate.json',import.meta.url)));
const gs=()=>{const g=new GameState();g.setCharacterDraft({schemaVersion:1,cityId:'focus',startIndex:2});return g;};
const root={querySelector:()=>null,addEventListener:()=>{},removeEventListener:()=>{}};
test('7 slots and 300ms impulse radius 1→75 cost 35 and damage 50 are exact',()=>{
 assert.equal(SKILL_SLOT_COUNT,7);
 assert.deepEqual({cost:RADIAL_IMPULSE.cost,cooldown:RADIAL_IMPULSE.cooldownMs,
   duration:RADIAL_IMPULSE.durationMs,start:RADIAL_IMPULSE.startRadius,
   radius:RADIAL_IMPULSE.radius,damage:RADIAL_IMPULSE.damage},
   {cost:35,cooldown:300,duration:300,start:1,radius:75,damage:50});
 assert.equal(pulseRadius(0),1);
 assert.equal(pulseRadius(150),38);
 assert.equal(pulseRadius(300),75);
 assert.equal(pulseRadius(9999),75);
});
test('Desire-first skill payments are atomic: insufficient combined pools do not spend',()=>{
 const first=spendImpulse({hp:90,pp:30,rp:100,jp:20});
 assert.equal(first.ok,true);
 assert.equal(first.spentJp,20);assert.equal(first.spentRp,15);
 assert.deepEqual(first.next,{hp:90,pp:30,rp:85,jp:0});
 const second=spendImpulse({hp:80,pp:40,rp:10,jp:20});
 assert.equal(second.ok,false);
 assert.equal(second.next,undefined);
 const allDesire=spendImpulse({hp:20,pp:10,rp:20,jp:38});
 assert.equal(allDesire.spentRp,0);assert.equal(allDesire.next.jp,3);
});
test('radial damage crosses each damageable enemy once, ignores masters and out-of-range',()=>{
 const hits=[];
 const target=(x,y,id)=>({x,y,isEnemy:true,receiveDamage:(damage,context)=>hits.push({id,damage,skill:context.skill})});
 const close=target(20,0,'close'),far=target(75,0,'edge'),out=target(80,0,'outside');
 const protectedMaster={x:1,y:1,isEnemy:false,receiveDamage:()=>assert.fail('Master cannot be hit')};
 const seen=new Set();
 assert.equal(applyPulseHits([close,far,out,protectedMaster],{x:0,y:0},20,seen),1);
 assert.equal(applyPulseHits([close,far,out,protectedMaster],{x:0,y:0},75,seen),1);
 assert.equal(applyPulseHits([close,far,out,protectedMaster],{x:0,y:0},75,seen),0);
 assert.deepEqual(hits,[{id:'close',damage:50,skill:'radial-impulse'},
   {id:'edge',damage:50,skill:'radial-impulse'}]);
});
test('candidate regeneration obeys caps for HP PP RP; JP only after 3s full RP',()=>{
 const max={hp:100,pp:50,rp:80,jp:30,hps:2,pps:3,rps:10,jps:4};
 const start={hp:60,pp:10,rp:70,jp:3};
 const without=regenerateVitals(start,max,1);
 assert.deepEqual(without,{hp:62,pp:13,rp:80,jp:3});
 const withDesire=regenerateVitals(without,max,3,{desireAllowed:true});
 assert.deepEqual(withDesire,{hp:68,pp:22,rp:80,jp:15});
 assert.deepEqual(regenerateVitals(withDesire,max,100,{desireAllowed:true}),
   {hp:100,pp:50,rp:80,jp:30});
});
test('skill runtime casts once per 300ms and persists each valid payment, not empty slots',()=>{
 const state=gs(),events=[];
 const skills=new CharacterSkillSystem({root,getGameState:()=>state,getRules:()=>rules,
   canCast:()=>true,animate:config=>{events.push(config);return {x:0,y:0};},
   save:()=>events.push('saved'),renderVitals:()=>events.push('render')});
 const initial=currentCharacterVitals(rules,state.state.player);
 assert.ok(initial.pools.current.rp+initial.pools.current.jp>=35);
 const r=skills.cast(1,1000);
 assert.equal(r.ok,true);
 assert.equal(state.snapshot().player.characterPools.current.rp,
   initial.pools.current.rp-r.spentRp);
 assert.equal(state.snapshot().player.characterPools.current.jp,
   initial.pools.current.jp-r.spentJp);
 assert.equal(skills.cast(1,1100).reason,'cooldown');
 assert.equal(skills.cast(2,1400).reason,'empty');
 assert.equal(events.filter(x=>x==='saved').length,1);
 assert.equal(events.filter(x=>typeof x==='object'&&x.damage===50).length,1);
});
test('closed game gives zero offline regen; DEV 8661/8662 affect only isolated saved pools',()=>{
 const state=gs(),save=()=>{},system=new CharacterSkillSystem({root,
   getGameState:()=>state,getRules:()=>rules,save,renderVitals:()=>{}});
 const full=currentCharacterVitals(rules,state.state.player);
 system.tick(1000); // first call establishes session clock, no offline credit
 assert.equal(state.state.player.characterPools,null);
 const drain=system.executeDevCode('8661');
 assert.equal(drain.handled,true);assert.equal(drain.state,'ok');
 let before=currentCharacterVitals(rules,state.state.player);
 assert.ok(before.pools.current.hp<=full.values.hp);
 assert.equal(system.executeDevCode('8662').state,'ok');
 before=currentCharacterVitals(rules,state.state.player);
 for(const key of ['hp','pp','rp','jp'])assert.equal(before.pools.current[key],Math.max(0,full.values[key]));
 assert.equal(state.state.player.characterProgress.zrp,0);
});

test('DEV anomaly toggles are session-only; no cooldown and free casting retain exact damage',()=>{
 const game=gs(),events=[];
 const sys=new CharacterSkillSystem({root,getGameState:()=>game,getRules:()=>rules,
   canCast:()=>true,animate:config=>{events.push(config);return {x:0,y:0};}});
 const before=currentCharacterVitals(rules,game.state.player).pools.current;
 assert.equal(sys.executeDevCode('8671').state,'ok');
 assert.equal(sys.executeDevCode('8673').state,'ok');
 assert.equal(sys.anomalies.noCooldown,true);
 assert.equal(sys.anomalies.freeSkills,true);
 assert.equal(sys.cast(1,1000).ok,true);
 assert.equal(sys.cast(1,1001).ok,true,'one millisecond is legal with no cooldown');
 const after=currentCharacterVitals(rules,game.state.player).pools.current;
 assert.deepEqual(after,before,'free skill casts may not debit RP/JP');
 assert.equal(events.length,2,'both real impulse animations run');
 assert.equal(events[0].damage,50,'existing damage unchanged');
 assert.equal(sys.executeDevCode('8671').message.includes('ВЫКЛ'),true);
 assert.equal(sys.anomalies.noCooldown,false);
 assert.equal(sys.cast(1,1100).reason,'cooldown');
 assert.equal(sys.executeDevCode('8673').message.includes('ВЫКЛ'),true);
 assert.equal(sys.anomalies.freeSkills,false);
 assert.deepEqual(new CharacterSkillSystem({root}).anomalies,
   {noCooldown:false,immortal:false,freeSkills:false},'F5/new runtime resets flags');
 assert.equal(game.snapshot().player.devAnomalies,undefined,'flags must not enter saves');
});
test('HP guard clamps to 1 only while immortal; full refill includes Stamina',()=>{
 assert.equal(applyPlayerDamage(40,100,{immortal:true}),1);
 assert.equal(applyPlayerDamage(40,100),0);
 assert.equal(applyPlayerDamage(40,5,{immortal:true}),35);
 const game=gs(),calls=[];
 const sys=new CharacterSkillSystem({root,getGameState:()=>game,getRules:()=>rules,
   refillStamina:()=>calls.push('stamina'),save:()=>calls.push('saved')});
 assert.equal(sys.executeDevCode('8672').state,'ok');
 assert.equal(sys.damagePlayer(99999),1);
 assert.equal(currentCharacterVitals(rules,game.state.player).pools.current.hp,1);
 assert.equal(sys.executeDevCode('8661').state,'ok');
 assert.equal(currentCharacterVitals(rules,game.state.player).pools.current.hp,1,
   'Immortality must also protect from DEV diagnostics');
 const full=sys.executeDevCode('8674');
 assert.equal(full.state,'ok');
 assert.deepEqual(calls.filter(v=>v==='stamina'),['stamina']);
 const vitals=currentCharacterVitals(rules,game.state.player);
 for(const k of ['hp','pp','rp','jp'])assert.equal(vitals.pools.current[k],vitals.values[k]);
 sys.setAnomaly('immortal',false);
 assert.equal(sys.damagePlayer(99999),0);
 assert.equal(sys.anomalies.immortal,false);
});

test('8674 refills Stamina even before a character profile exists',()=>{
 const game=new GameState(),calls=[];
 const sys=new CharacterSkillSystem({root,getGameState:()=>game,getRules:()=>rules,
   refillStamina:()=>calls.push('stamina')});
 assert.equal(sys.executeDevCode('8674').state,'warn');
 assert.deepEqual(calls,['stamina']);
 assert.equal(game.state.player.characterPools,null);
});
