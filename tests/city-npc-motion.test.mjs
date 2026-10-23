import test from 'node:test';
import assert from 'node:assert/strict';
import {knightNpcRole,isKnightRole,knightSourcePalette} from '../src/knight-atlas-core.js';
import {WorldSpawnStateSystem} from '../src/world-spawn-state-system.js';
import {EventSpotSystem} from '../src/event-spot-system.js';

test('Source RGBA colors keep full opacity, with or without a leading hash',()=>{
 const colors=knightSourcePalette({palette:['00000000','94b5c0ff','#94b5c0ff'],
  bands:{runtime:['transparent','keep','keep']}},'#abcdef');
 assert.deepEqual(colors,[[0,0,0,0],[148,181,192,255],[148,181,192,255]]);
});

test('Every city service and guard, including Crossroads, has a real model role',()=>{
 for(const zone of ['loc-00001','loc-00005','loc-00013','loc-00021','loc-00025'])
  for(const type of ['city-banker','city-teleporter','city-guide'])
   assert.ok(isKnightRole(knightNpcRole({type,id:zone+'-'+type})),zone+' '+type);
});

test('Compact master occupancy preserves exact slot ownership without cloning module payloads',()=>{
 const system=new WorldSpawnStateSystem();
 const spawns=[{zoneId:'A',spotId:'a'},{zoneId:'A',spotId:'b'},{zoneId:'B',spotId:'c'}];
 // Occupancy must not touch heavy module data that is irrelevant to a slot query.
 for(const spawn of spawns)Object.defineProperty(spawn,'activeModules',{enumerable:true,get(){throw Error('Heavy payload cloned');}});
 system.state.activeMasterSpawns=spawns;
 const got=system.getMasterOccupancy('A');
 assert.equal(got.count,2);assert.deepEqual([...got.spotIds],['a','b']);
 got.spotIds.add('foreign');
 assert.deepEqual([...system.getMasterOccupancy('A').spotIds],['a','b']);
 assert.equal(system.getMasterOccupancy('absent').count,0);
});

test('Event slot checks use compact occupancy and retain master/event non-overlap',()=>{
 const system=new EventSpotSystem({worldSpawnStateSystem:{
  getLocationTier:()=>({tier:'T1'}),getSpawnCapacity:()=>3,
  getMasterOccupancy:()=>({count:1,spotIds:new Set(['master-slot'])}),
  getActiveMasters(){throw Error('Full master records must not be cloned for slot queries');}
 }});
 const zone={id:'A',eventSpots:[{id:'master-slot'},{id:'event-1'},{id:'event-2'}]};
 assert.equal(system.desiredSlots(zone,{}),2);
 assert.deepEqual([...system.masterSpotIds('A')],['master-slot']);
});

test('A world event tick reads each tier once and refreshes its cache on the next tick',()=>{
 let reads=0,stateId='first';
 const zone={id:'A',eventSpots:[]};
 const system=new EventSpotSystem({worldGraph:{zones:new Map([['A',zone]])},
  worldSpawnStateSystem:{getLocationTier(){reads++;return {stateId,tier:'T1',spawnCapacity:0,expiresAt:100000};},
   getSpawnCapacity(){throw Error('Already in the tick tier snapshot');},
   getMasterOccupancy:()=>({count:0,spotIds:new Set()})}});
 system.initialized=true;
 system.state.zones.A={locationTierStateId:'first',events:[]};
 system.update(1000);
 assert.equal(reads,1,'One tier snapshot per zone and tick');
 reads=0;stateId='second';system.update(2000);
 assert.equal(reads,1);assert.equal(system.state.zones.A.locationTierStateId,'second');
 stateId='third';assert.equal(system.locationTier('A').stateId,'third','No stale cache between ticks');
});
