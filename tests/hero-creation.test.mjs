import test from 'node:test';
import assert from 'node:assert/strict';
import {GameState,createDefaultGameState,normalizeGameState} from '../src/game-state.js';
import {normalizeHeroIdentity,heroPortraitPath,HERO_ARCHETYPES,HERO_GENDERS,HERO_CAPITAL_BY_ARCHETYPE,HERO_CAPITAL_BONUSES} from '../src/hero-identity.js';
import {HERO_SAVE_KEY,HERO_BACKUP_PREFIX,makeNewHeroState,storedHero,archiveAndReplace,openHeroEntrance} from '../src/hero-creation.js';
import {secureHeroStartIndex,initializeHeroProfile,HERO_START_COUNTS} from '../src/hero-start-profile.js';
import { currentCharacterVitals } from '../src/character-runtime.js';
import { readFileSync } from 'node:fs';
const rules=JSON.parse(readFileSync(new URL('../data/character-balance-candidate.json',import.meta.url),'utf8'));

const memory=()=>{
 const map=new Map();
 return {get length(){return map.size;},key:i=>[...map.keys()][i]||null,
   getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),
   removeItem:k=>map.delete(k)};
};
const identity={schemaVersion:1,name:'Антоний',gender:'female',archetype:'hybrid'};
const selectedIdentity={...identity,capitalId:'inspire'};
test('cosmetic identity has eight separate real portrait names, with no stat bonuses',()=>{
 assert.deepEqual(HERO_ARCHETYPES,['plate','leather','cloth','hybrid']);
 assert.deepEqual(HERO_GENDERS,['male','female']);
 const names=new Set();
 for(const archetype of HERO_ARCHETYPES)for(const gender of HERO_GENDERS){
   const path=heroPortraitPath(archetype,gender);
   assert.match(path,/^\.\/assets\/characters\/Изображение ChatGPT 11 окт\. 2026 г\., 22_45_5[1-8]-[1-8]\.png$/);
   names.add(path);
 }
 assert.equal(names.size,8);
 assert.equal(heroPortraitPath('../save','male'),null);
 assert.equal(normalizeHeroIdentity({...identity,name:'  Антоний   М.  '}).name,'Антоний М.');
 for(const name of ['','X','a'.repeat(25),'<img>'])
   assert.equal(normalizeHeroIdentity({...identity,name}),null);
 assert.equal(normalizeHeroIdentity({...identity,gender:'other'}),null);
});
test('four accepted capital bonus cards match UGD-0038 decisions, without live stat effects',()=>{
 assert.deepEqual(HERO_CAPITAL_BONUSES.map(x=>x.capitalId),['force','focus','tempo','inspire']);
 assert.deepEqual(HERO_CAPITAL_BONUSES.map(x=>x.primary),[
   '+1 РПС','+50 РП','+1% РПС','+20% максимума РП']);
 assert.deepEqual(HERO_CAPITAL_BONUSES.map(x=>x.details),[
   '+10 СИЛ · +10 ЗАЩ · +1% ХПС',
   '+10 КОН · +10 СКА · +1% РПС',
   '+10 ТЕМП · +10 УКЛ · +1% ППС',
   '+5 ВДОХ · +10 ЖП · +1 ГЛР · +5 СКП'
 ]);
 assert.deepEqual(HERO_CAPITAL_BONUSES.map(x=>x.start),["Старт: +5 ВЫН; ещё 5 очков — ЛОВ/ИНТ","Старт: +5 ЛОВ; ещё 5 очков — ВЫН/ИНТ","Старт: +5 ИНТ; ещё 5 очков — ВЫН/ЛОВ","Старт: +3 ВЫН, +3 ЛОВ, +3 ИНТ; ещё 1 — случайно"]);
 for(const capital of HERO_CAPITAL_BONUSES)
   assert.equal(HERO_CAPITAL_BY_ARCHETYPE[capital.archetype],capital.capitalId);
 assert.equal(normalizeHeroIdentity({...identity,capitalId:'force'}),null,
   'One picture cannot impersonate another capital');
 assert.deepEqual(normalizeHeroIdentity(selectedIdentity),selectedIdentity);
});
test('new hero keeps gameplay defaults and connects the existing candidate character profile',()=>{
 const full=makeNewHeroState(identity),baseline=createDefaultGameState();
 assert.equal(full.schemaVersion,1);
 assert.deepEqual(full.player.heroIdentity,selectedIdentity);
 assert.equal(full.player.classId,'wanderer');
 assert.equal(full.player.characterDraft.cityId,'inspire');
 assert.ok(Number.isInteger(full.player.characterDraft.startIndex));
 assert.ok(full.player.characterDraft.startIndex>=0&&full.player.characterDraft.startIndex<=2);
 assert.equal(full.player.characterPools,null);
 assert.deepEqual(full.world,baseline.world);
 assert.equal(full.stepEconomy.balance,baseline.stepEconomy.balance);
 assert.equal(full.player.characterProgress.zrl,1);
 assert.equal(full.player.characterProgress.zrp,0);
 const vitals=currentCharacterVitals(rules,full.player);
 assert.equal(vitals.draft.cityId,'inspire');
 assert.ok(vitals.pools?.current.hp>0);
 for(const k of ['hp','pp','rp','jp'])
   assert.equal(vitals.pools.current[k],vitals.values[k]);
 const points=rules.cities.inspire.start[full.player.characterDraft.startIndex];
 assert.equal(points.reduce((sum,n)=>sum+n,0),10);
 const after=normalizeGameState(full);
 assert.deepEqual(after.player.heroIdentity,selectedIdentity);
 assert.deepEqual(new GameState(after).snapshot().player.heroIdentity,selectedIdentity);
});
test('old v1 saves stay valid and undecided without retroactive forced identity',()=>{
 const old=createDefaultGameState();
 delete old.player.heroIdentity;
 const normalized=normalizeGameState(old);
 assert.equal(normalized.player.heroIdentity,null);
 assert.equal(normalized.player.characterDraft,null);
 const storage=memory();
 storage.setItem(HERO_SAVE_KEY,JSON.stringify(old));
 assert.equal(storedHero(storage).kind,'existing');
 assert.equal(storedHero(storage).identity,null);
});
test('replacing a save requires unmodified original and creates full restorable backup first',()=>{
 const storage=memory(),old=JSON.stringify({...createDefaultGameState(),savedAt:'2026-10-11T00:00:00.000Z'});
 storage.setItem(HERO_SAVE_KEY,old);
 const next=makeNewHeroState(identity);
 assert.throws(()=>archiveAndReplace(storage,'wrong',next),/изменилось/);
 assert.equal(storage.getItem(HERO_SAVE_KEY),old);
 const {backupKey}=archiveAndReplace(storage,old,next);
 assert.ok(backupKey.startsWith(HERO_BACKUP_PREFIX));
 assert.equal(storage.getItem(backupKey),old);
 const current=JSON.parse(storage.getItem(HERO_SAVE_KEY));
 assert.equal(current.player.heroIdentity.name,'Антоний');
 assert.equal(storedHero(storage).identity.gender,'female');
});
test('storage failure never overwrites existing user save',()=>{
 const storage=memory(),old=JSON.stringify(createDefaultGameState());
 storage.setItem(HERO_SAVE_KEY,old);
 const failing={...storage,setItem:(key,value)=>{
   if(key.startsWith(HERO_BACKUP_PREFIX))throw Error('quota');
   storage.setItem(key,value);
 }};
 assert.throws(()=>archiveAndReplace(failing,old,makeNewHeroState(identity)),/quota/);
 assert.equal(storage.getItem(HERO_SAVE_KEY),old);
 storage.setItem(HERO_SAVE_KEY,'not json');
 assert.equal(storedHero(storage).kind,'invalid');
});

test('privacy restricted localStorage getter is handled before onboarding',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try {
   Object.defineProperty(globalThis,'localStorage',{
     configurable:true,get(){throw new Error('SecurityError');}
   });
   await assert.rejects(openHeroEntrance({root:{querySelector:()=>null}}),
     /Не найден экран выбора героя/);
 }finally{
   if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);
   else delete globalThis.localStorage;
 }
});

test('capital starting profile chooses only accepted ten-point distributions',()=>{
 const caps=['force','focus','tempo','inspire'];
 assert.deepEqual(HERO_START_COUNTS,{force:6,focus:6,tempo:6,inspire:3});
 for(const cap of caps){
   for(let i=0;i<HERO_START_COUNTS[cap];i++){
     const idx=secureHeroStartIndex(cap,()=>i);
     assert.equal(idx,i);
     assert.equal(rules.cities[cap].start[idx].reduce((sum,n)=>sum+n,0),10);
   }
 }
 let attempts=0;
 assert.equal(secureHeroStartIndex('inspire',()=>attempts++===0?0xffffffff:0),0,
   'Rejection sampling rejects out-of-range words and tries again');
 assert.equal(attempts,2);
 assert.throws(()=>secureHeroStartIndex('inspire',()=>-1),/случайное/);
});
test('v0.2.70 existing hero gets one draft and safe backup, never rerolls on next F5',()=>{
 const old=new GameState();
 old.setHeroIdentity(selectedIdentity);
 old.setClassId('scout');
 old.setCharacterProgress({schemaVersion:1,zrl:9,zrp:123});
 const snapshot=old.snapshot();
 snapshot.world.zoneId='loc-00025';
 const {state:next,changed}=initializeHeroProfile(snapshot,{randomUint32:()=>2});
 assert.equal(changed,true);
 assert.equal(next.player.characterDraft.cityId,'inspire');
 assert.equal(next.player.characterDraft.startIndex,2);
 assert.equal(next.player.characterProgress.zrl,9);
 assert.equal(next.player.characterProgress.zrp,123);
 assert.equal(next.player.classId,'scout');
 assert.equal(next.world.zoneId,'loc-00025');
 assert.equal(snapshot.player.characterDraft,null,'source must stay untouched');
 const storage=memory(),original=JSON.stringify(snapshot);
 storage.setItem(HERO_SAVE_KEY,original);
 const {backupKey}=archiveAndReplace(storage,original,next);
 assert.equal(storage.getItem(backupKey),original);
 const again=initializeHeroProfile(JSON.parse(storage.getItem(HERO_SAVE_KEY)),{randomUint32:()=>0});
 assert.equal(again.changed,false);
 assert.equal(again.state.player.characterDraft.startIndex,2);
});
test('old identities without capital use image origin; no hero identity is never auto-migrated',()=>{
 const legacy=createDefaultGameState();
 assert.equal(initializeHeroProfile(legacy).changed,false);
 const oldHero=createDefaultGameState();
 oldHero.player.heroIdentity=identity;
 const seed=initializeHeroProfile(oldHero,{randomUint32:()=>1});
 assert.equal(seed.draft.cityId,'inspire');
 assert.equal(seed.draft.startIndex,1);
 const custom=createDefaultGameState();
 custom.player.heroIdentity=selectedIdentity;
 custom.player.characterDraft={schemaVersion:1,cityId:'focus',startIndex:4};
 const preserved=initializeHeroProfile(custom);
 assert.equal(preserved.changed,false,'Existing saved draft must never be replaced');
 assert.deepEqual(preserved.state.player.characterDraft,custom.player.characterDraft);
});
