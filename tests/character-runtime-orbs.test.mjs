import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GameState,createDefaultGameState} from '../src/game-state.js';
import {CHARACTER_POOL_KEYS,currentCharacterVitals,normalizeCharacterProgress,normalizeCharacterPools,poolRatio} from '../src/character-runtime.js';
import {characterDraftResult} from '../src/character-draft.js';
const rules=JSON.parse(readFileSync(new URL('../data/character-balance-candidate.json',import.meta.url)));
test('old saves gain ZRL 1, ZRP 0 and no invented origin or combat pools',()=>{
 const old=createDefaultGameState();
 delete old.player.characterProgress;
 delete old.player.characterPools;
 old.world.zoneId='loc-00225';old.resources={stone:175};
 const gs=new GameState(old);const p=gs.snapshot();
 assert.equal(p.schemaVersion,1);assert.deepEqual(p.player.characterProgress,{schemaVersion:1,zrl:1,zrp:0});
 assert.equal(p.player.characterPools,null);assert.equal(p.player.characterDraft,null);
 assert.equal(p.world.zoneId,'loc-00225');assert.equal(p.resources.stone,175);
 const status=currentCharacterVitals(rules,p.player);
 assert.equal(status.values,null);
 assert.equal(status.pools,null);
});
test('ZRL/ZRP reject injection, invalid numbers and never award experience automatically',()=>{
 assert.deepEqual(normalizeCharacterProgress({zrl:999,zrp:12.5}),{schemaVersion:1,zrl:65,zrp:0});
 assert.deepEqual(normalizeCharacterProgress({zrl:-9,zrp:-1}),{schemaVersion:1,zrl:1,zrp:0});
 assert.deepEqual(normalizeCharacterProgress({zrl:1,zrp:100}),{schemaVersion:1,zrl:1,zrp:100});
 const game=new GameState();
 assert.equal(game.snapshot().player.characterProgress.zrp,0);
});
test('saved draft provides all 4 pools from exactly the Character Balance Lab engine',()=>{
 const gs=new GameState();
 gs.setCharacterDraft({schemaVersion:1,cityId:'inspire',startIndex:2});
 const expected=characterDraftResult(rules,gs.state.player.characterDraft).values;
 const snapshot=currentCharacterVitals(rules,gs.state.player);
 assert.equal(snapshot.progress.zrl,1);assert.equal(snapshot.progress.zrp,0);
 for(const key of CHARACTER_POOL_KEYS){
   assert.equal(snapshot.values[key],expected[key]);
   assert.equal(snapshot.pools.current[key],Math.max(0,expected[key]));
 }
 gs.setCharacterPools(snapshot.pools);
 const afterF5=new GameState(gs.snapshot());
 assert.deepEqual(currentCharacterVitals(rules,afterF5.state.player).pools,snapshot.pools);
 assert.equal(afterF5.snapshot().player.characterProgress.zrp,0);
});
test('stored current pools are finite, capped to maxima and never change unrelated game fields',()=>{
 const game=new GameState();
 game.setCharacterDraft({schemaVersion:1,cityId:'focus',startIndex:2});
 const orig=currentCharacterVitals(rules,game.state.player);
 const pools={...orig.pools,current:{...orig.pools.current, hp:0,pp:1e9,rp:5,jp:3}};
 game.setCharacterPools(pools);
 const cur=currentCharacterVitals(rules,game.state.player);
 assert.equal(cur.pools.current.hp,0);
 assert.equal(cur.pools.current.pp,Math.max(0,cur.values.pp));
 assert.equal(cur.pools.current.rp,Math.min(5,Math.max(0,cur.values.rp)));
 assert.equal(cur.pools.current.jp,Math.min(3,Math.max(0,cur.values.jp)));
 assert.equal(normalizeCharacterPools({...pools,current:{...pools.current,hp:-1}}),null);
 assert.equal(normalizeCharacterPools({...pools,current:{...pools.current,rp:Infinity}}),null);
 assert.equal(normalizeCharacterPools({...pools,profileKey:'../injected'}),null);
 assert.equal(game.state.player.classId,'wanderer');
 const old=cur.pools;
 game.setCharacterDraft({schemaVersion:1,cityId:'tempo',startIndex:1});
 const newly=currentCharacterVitals(rules,game.state.player);
 assert.notDeepEqual(newly.pools,old);
 for(const k of CHARACTER_POOL_KEYS)assert.equal(newly.pools.current[k],Math.max(0,newly.values[k]));
});
test('ratio handles empty, invalid, zero pools without visual overflow',()=>{
 assert.equal(poolRatio(100,100),1);assert.equal(poolRatio(50,100),.5);
 assert.equal(poolRatio(900,100),1);assert.equal(poolRatio(-3,100),0);
 assert.equal(poolRatio(0,0),0);assert.equal(poolRatio(Infinity,100),0);
});
