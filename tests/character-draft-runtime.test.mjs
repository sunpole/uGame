import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState, createDefaultGameState, GAME_STATE_SCHEMA_VERSION } from '../src/game-state.js';
import { normalizeCharacterDraft, characterDraftProfile, characterDraftResult, METRIC_KEYS } from '../src/character-draft.js';
import { calculateCharacter, defaultProfile } from '../src/character-balance/engine.js';

const rules=JSON.parse(readFileSync(new URL('../data/character-balance-candidate.json',import.meta.url)));

test('old GameState v1 saves safely gain only a null optional draft and preserve every existing field',()=>{
  const old=createDefaultGameState();
  delete old.player.characterDraft;
  old.player.classId='scout';
  old.world.zoneId='loc-00225';
  old.resources={stone:93};
  old.inventory={'rock':12};
  old.stepEconomy.balance=1234;
  old.masterActivities.encounters={x:{phase:'pending'}};
  old.worldSpawnState.zones={'loc-00001':{tier:2}};
  const state=new GameState(old).snapshot();
  assert.equal(GAME_STATE_SCHEMA_VERSION,1);
  assert.equal(state.schemaVersion,1);
  assert.equal(state.player.classId,'scout');
  assert.equal(state.player.characterDraft,null);
  assert.equal(state.world.zoneId,'loc-00225');
  assert.equal(state.resources.stone,93);
  assert.equal(state.stepEconomy.balance,1234);
  assert.equal(state.inventory.rock,12);
  assert.equal(state.masterActivities.encounters.x.phase,'pending');
  assert.equal(state.worldSpawnState.zones['loc-00001'].tier,2);
});
test('draft persists by explicit choice only, is deeply sanitized, and can be cleared',()=>{
  const game=new GameState();
  assert.equal(game.state.player.characterDraft,null);
  game.setCharacterDraft({schemaVersion:1,cityId:'inspire',startIndex:2,otv:99999,extraFlat:{hp:9999999}});
  assert.deepEqual(game.snapshot().player.characterDraft,
    {schemaVersion:1,cityId:'inspire',startIndex:2});
  const restored=new GameState(game.snapshot());
  assert.deepEqual(restored.state.player.characterDraft,
    {schemaVersion:1,cityId:'inspire',startIndex:2});
  restored.setCharacterDraft({schemaVersion:1,cityId:'force',startIndex:100});
  assert.equal(restored.state.player.characterDraft,null);
  restored.setCharacterDraft(null);
  assert.equal(restored.snapshot().player.characterDraft,null);
  for(const input of [{cityId:'force',startIndex:0}, {schemaVersion:2,cityId:'force',startIndex:0},
    {schemaVersion:1,cityId:'inspire',startIndex:3},
    {schemaVersion:1,cityId:'force',startIndex:'0'},
    {schemaVersion:1,cityId:'crossroads',startIndex:0}]){
    assert.equal(normalizeCharacterDraft(input),null);
  }
});
test('runtime preview uses exactly the Lab engine and original candidate rules, no new coefficients',()=>{
  for(const [cityId,index] of [['force',3],['focus',2],['tempo',4],['inspire',2]]){
    const draft={schemaVersion:1,cityId,startIndex:index};
    const {profile,values,...other}=characterDraftResult(rules,draft);
    const lab=calculateCharacter(rules,defaultProfile(rules,1,cityId,index));
    assert.deepEqual(values,lab.values);
    assert.deepEqual(other.trace,lab.trace);
    assert.equal(Object.keys(values).length,METRIC_KEYS.length);
    assert.equal(profile.level,1);
    assert.equal(profile.otv,1);
    assert.equal(profile.vyn+profile.lov+profile.intel,10);
  }
});
