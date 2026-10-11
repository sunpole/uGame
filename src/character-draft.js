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
export function characterDraftProfile(rules, draft) {
  validateRules(rules);
  const checked=normalizeCharacterDraft(draft);
  if (!checked) throw Error('Не выбран пробный профиль персонажа');
  // Fixed comparison inputs until level/Responsibility earning is implemented.
  return defaultProfile(rules, 1, checked.cityId, checked.startIndex);
}
export function characterDraftResult(rules, draft) {
  const profile=characterDraftProfile(rules,draft);
  return {profile, ...calculateCharacter(rules,profile)};
}
export {METRICS,METRIC_KEYS};
