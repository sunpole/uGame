import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMobState,damageMob,alertMob,tickMob,mobExperience,mobAttackDamage} from '../src/mob-combat.js';
const data=JSON.parse(readFileSync(new URL('../data/mobs.json',import.meta.url),'utf8'));
const def=data.mobs[0];
test('Forest thief authored fields and 33 XP from exactly 330 HP',()=>{
 assert.equal(data.schemaVersion,1);
 assert.equal(def.name,'Лесной вор');
 assert.equal(def.level,3);
 assert.equal(def.aggressive,false);
 assert.equal(def.social,false);
 assert.equal(def.socialRadius,0);
 assert.equal(def.spawn.zoneId,'loc-00009');
 assert.equal(def.hp,330);assert.equal(def.hps,5);
 assert.equal(def.rp,null);assert.equal(def.rps,null);
 assert.equal(def.speed,60);assert.equal(def.attackSpeed,80);
 assert.equal(def.critChance,4);assert.equal(def.critMultiplier,2);
 assert.equal(def.attack,12);assert.equal(def.attackRadius,10);
 assert.equal(def.aggroRadius,0);assert.equal(def.chaseRadius,450);
 assert.equal(def.defense,12);assert.equal(def.evasion,0);
 assert.deepEqual(def.abilities,[]);
 assert.equal(def.artRole,'mob-human');
 assert.equal(def.suggestedLocalPng,'uGame_real_knight_WALK_8x11_green.png');
 assert.equal(mobExperience(def),33);
});
test('Passive mob does not aggro at point blank range without an actual hit',()=>{
 const state=createMobState(def);
 let attacks=0;
 for(let i=0;i<100;i++)tickMob(state,def,{x:state.x,y:state.y,hp:100},.1,{attack:()=>attacks++});
 assert.equal(state.mode,'idle');assert.equal(state.alerted,false);assert.equal(attacks,0);
});
test('Existing Impulse 50 damage is reduced by 12 defense; hit starts pursuit',()=>{
 const state=createMobState(def),d=damageMob(state,def,50,{random:()=>.99});
 assert.equal(d.damage,38);
 assert.equal(state.hp,292);
 assert.equal(d.newlyAlerted,true);
 assert.equal(state.mode,'chase');
});
test('After hit mob runs at 60 px/s, returns home when player crosses spawn leash 450',()=>{
 const state=createMobState(def),startX=state.x;
 alertMob(state);
 tickMob(state,def,{x:startX+200,y:state.y,hp:100},.1);
 assert.ok(state.x>startX&&state.x-startX<=6.01);
 tickMob(state,def,{x:startX+451,y:state.y,hp:100},.1);
 assert.equal(state.mode,'return');
 for(let i=0;i<40;i++)tickMob(state,def,{x:startX+900,y:state.y,hp:100},.1);
 assert.equal(state.mode,'idle');assert.equal(state.x,startX);assert.equal(state.hp,def.hp);
});
test('Monster HPS 5 only restores up to max',()=>{
 const state=createMobState(def);
 damageMob(state,def,50);
 const n=state.hp;
 tickMob(state,def,{x:state.x+200,y:state.y,hp:100},.1);
 assert.equal(state.hp,n+.5);
});
test('80 attack speed means one swing per 1.25 s; 4% critical ×2',()=>{
 const state=createMobState(def),hits=[];
 alertMob(state);
 tickMob(state,def,{x:state.x,y:state.y,hp:100},.1,{random:()=>0,attack:x=>hits.push(x)});
 assert.equal(hits.length,1);assert.deepEqual(hits[0],{damage:24,crit:true});
 for(let i=0;i<10;i++)tickMob(state,def,{x:state.x,y:state.y,hp:100},.1,{random:()=>.5,attack:x=>hits.push(x)});
 assert.equal(hits.length,1);
 for(let i=0;i<3;i++)tickMob(state,def,{x:state.x,y:state.y,hp:100},.1,{random:()=>.5,attack:x=>hits.push(x)});
 assert.equal(hits.length,2);assert.deepEqual(hits[1],{damage:12,crit:false});
 assert.deepEqual(mobAttackDamage(def,()=>0),{damage:24,crit:true});
});
test('Dead mob cannot attack or be rewarded a second time',()=>{
 const state=createMobState(def);
 const result=damageMob(state,def,1000);
 assert.equal(result.killed,true);
 assert.equal(state.alive,false);assert.equal(state.hp,0);
 assert.deepEqual(damageMob(state,def,1000),{hit:false,killed:false,damage:0});
 let swings=0;tickMob(state,def,{x:state.x,y:state.y,hp:100},.1,{attack:()=>swings++});
 assert.equal(swings,0);
});
test('Future aggressive mob supports configurable 200px detection and no city metadata in stats',()=>{
 const aggressive={...def,aggressive:true,aggroRadius:200};
 const state=createMobState(aggressive);
 tickMob(state,aggressive,{x:state.x+201,y:state.y,hp:100},.1);
 assert.equal(state.mode,'idle');
 tickMob(state,aggressive,{x:state.x+199,y:state.y,hp:100},.1);
 assert.equal(state.mode,'chase');
});
