import { GameState } from './game-state.js';
import { normalizeCharacterDraft } from './character-draft.js';
import { normalizeHeroIdentity, HERO_CAPITAL_BY_ARCHETYPE } from './hero-identity.js';

// Allowed ten-point combinations are already defined in Character Balance Lab.
// No new coefficient, level rule, city stat modifier, or XP curve is introduced here.
export const HERO_START_COUNTS=Object.freeze({
  force:6,focus:6,tempo:6,inspire:3
});
export function secureHeroStartIndex(cityId,randomUint32=()=>{
  if(!globalThis.crypto?.getRandomValues)
    throw Error('Безопасный генератор случайности недоступен');
  const data=new Uint32Array(1);
  globalThis.crypto.getRandomValues(data);
  return data[0];
}){
  const count=HERO_START_COUNTS[cityId];
  if(!count)throw Error('Неизвестная столица героя');
  const limit=Math.floor(4294967296/count)*count;
  for(let attempts=0;attempts<128;attempts++){
    const value=randomUint32();
    if(!Number.isSafeInteger(value)||value<0||value>0xffffffff)
      throw Error('Неверное случайное значение');
    if(value<limit)return value%count;
  }
  throw Error('Не удалось безопасно выбрать начальную комбинацию');
}
export function initializeHeroProfile(state,{randomUint32}={}){
  const identity=normalizeHeroIdentity(state?.player?.heroIdentity);
  if(!identity)return {state,changed:false,reason:'legacy-no-identity'};
  if(normalizeCharacterDraft(state.player.characterDraft))
    return {state,changed:false,reason:'existing-profile'};
  const cityId=identity.capitalId??HERO_CAPITAL_BY_ARCHETYPE[identity.archetype];
  if(!HERO_START_COUNTS[cityId])
    return {state,changed:false,reason:'invalid-capital'};
  // Existing saves get exactly one profile, persisted before Phaser auto-save.
  const draft={schemaVersion:1,cityId,
    startIndex:secureHeroStartIndex(cityId,randomUint32)};
  const game=new GameState(state);
  game.setCharacterDraft(draft);
  return {state:game.snapshot(),changed:true,draft,reason:'initialized'};
}
