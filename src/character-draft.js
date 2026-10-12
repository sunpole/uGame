import { defaultProfile, calculateCharacter, METRICS, METRIC_KEYS, validateRules } from './character-balance/engine.js';

// Character profile is a *separate, explicitly saved simulation draft*.
// No city of origin, stats, level or OTV are assigned to gameplay automatically.
const CITY_IDS = Object.freeze(['force', 'focus', 'tempo', 'inspire']);
export const CHARACTER_DRAFT_SCHEMA_VERSION = 1;
export function normalizeCharacterDraft(raw) {
  if (raw == null) return null; // Old saves remain undecided, never silently assigned "force".
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)
      || raw.schemaVersion !== CHARACTER_DRAFT_SCHEMA_VERSION
      || !CITY_IDS.includes(raw.cityId)
      || !Number.isInteger(raw.startIndex)
      || raw.startIndex < 0
      || raw.startIndex >= (raw.cityId === 'inspire' ? 3 : 6)) return null;
  return { schemaVersion: 1, cityId: raw.cityId, startIndex: raw.startIndex };
}
export function characterDraftProfile(rules, draft, overrides = {}) {
  validateRules(rules);
  const checked=normalizeCharacterDraft(draft);
  if (!checked) throw Error('Не выбран пробный профиль персонажа');
  // DEV can test candidate ZRL/OTV formula without introducing XP thresholds
  // or claiming automatic allocation of level points in live gameplay.
  const level = Number.isInteger(overrides.level) && overrides.level >= 1 && overrides.level <= 65
    ? overrides.level : 1;
  const profile=defaultProfile(rules, level, checked.cityId, checked.startIndex);
  if(Number.isSafeInteger(overrides.otv)) profile.otv=overrides.otv;
  // Live character spends level points manually; Lab still uses defaultProfile's
  // hypothetical even split when no allocation override is supplied.
  if(overrides.allocation && typeof overrides.allocation==='object') {
    const start=rules.cities[checked.cityId].start[checked.startIndex];
    const spent=overrides.allocation;
    for(const [key,i] of [['vyn',0],['lov',1],['intel',2]]) {
      if(!Number.isSafeInteger(spent[key])||spent[key]<0)throw Error('Invalid spent points: '+key);
      profile[key]=start[i]+spent[key];
    }
  }
  return profile;
}
export function characterDraftResult(rules, draft, overrides = {}) {
  const profile=characterDraftProfile(rules,draft,overrides);
  return {profile, ...calculateCharacter(rules,profile)};
}
export {METRICS,METRIC_KEYS};
