export const HERO_IDENTITY_SCHEMA_VERSION=1;
export const HERO_ARCHETYPES=Object.freeze(['plate','leather','cloth','hybrid']);
export const HERO_GENDERS=Object.freeze(['male','female']);
/** UI sequence only: city #1–#4. Changes no live RPG stats until approved implementation. */
export const HERO_CAPITAL_BY_ARCHETYPE=Object.freeze({
  plate:'force',leather:'focus',cloth:'tempo',hybrid:'inspire'
});
export const HERO_CAPITAL_BONUSES=Object.freeze([
  Object.freeze({number:1,archetype:'plate',capitalId:'force',resource:'Сила',
    primary:'+1 РПС',details:'+10 СИЛ · +10 ЗАЩ · +1% ХПС',start:'Старт: +5 ВЫН; ещё 5 очков — ЛОВ/ИНТ'}),
  Object.freeze({number:2,archetype:'leather',capitalId:'focus',resource:'Концентрация',
    primary:'+50 РП',details:'+10 КОН · +10 СКА · +1% РПС',start:'Старт: +5 ЛОВ; ещё 5 очков — ВЫН/ИНТ'}),
  Object.freeze({number:3,archetype:'cloth',capitalId:'tempo',resource:'Темп',
    primary:'+1% РПС',details:'+10 ТЕМП · +10 УКЛ · +1% ППС',start:'Старт: +5 ИНТ; ещё 5 очков — ВЫН/ЛОВ'}),
  Object.freeze({number:4,archetype:'hybrid',capitalId:'inspire',resource:'Вдохновение',
    primary:'+20% максимума РП',details:'+5 ВДОХ · +10 ЖП · +1 ГЛР · +5 СКП',start:'Старт: +3 ВЫН, +3 ЛОВ, +3 ИНТ; ещё 1 — случайно'})
]);
export function normalizeHeroIdentity(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  const name=typeof input.name==='string'?input.name.trim().replace(/\s+/g,' '):'';
  if(input.schemaVersion!==1||name.length<2||name.length>24||
     /[<>\u0000-\u001f\u007f]/.test(name)||
     !HERO_ARCHETYPES.includes(input.archetype)||
     !HERO_GENDERS.includes(input.gender))return null;
  // Optional for backward compatibility with saved identities predating capital choice.
  const capitalId=input.capitalId==null?null:input.capitalId;
  if(capitalId!==null&&capitalId!==HERO_CAPITAL_BY_ARCHETYPE[input.archetype])return null;
  return {schemaVersion:1,name,gender:input.gender,archetype:input.archetype,
    ...(capitalId?{capitalId}:{})};
}
// Original author-supplied filenames; no renaming or local conversion required.
export const HERO_PORTRAIT_FILES = Object.freeze({
  "plate": {
    "male": "Изображение ChatGPT 11 окт. 2026 г., 22_45_51-1.png",
    "female": "Изображение ChatGPT 11 окт. 2026 г., 22_45_52-2.png"
  },
  "leather": {
    "male": "Изображение ChatGPT 11 окт. 2026 г., 22_45_53-3.png",
    "female": "Изображение ChatGPT 11 окт. 2026 г., 22_45_54-4.png"
  },
  "cloth": {
    "male": "Изображение ChatGPT 11 окт. 2026 г., 22_45_55-5.png",
    "female": "Изображение ChatGPT 11 окт. 2026 г., 22_45_56-6.png"
  },
  "hybrid": {
    "male": "Изображение ChatGPT 11 окт. 2026 г., 22_45_57-7.png",
    "female": "Изображение ChatGPT 11 окт. 2026 г., 22_45_58-8.png"
  }
});
export function heroPortraitPath(archetype,gender){
  if(!HERO_ARCHETYPES.includes(archetype)||!HERO_GENDERS.includes(gender))return null;
  return './assets/characters/'+HERO_PORTRAIT_FILES[archetype][gender];
}
