export const HERO_IDENTITY_SCHEMA_VERSION=1;
export const HERO_ARCHETYPES=Object.freeze(['plate','leather','cloth','hybrid']);
export const HERO_GENDERS=Object.freeze(['male','female']);
export function normalizeHeroIdentity(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  const name=typeof input.name==='string'?input.name.trim().replace(/\s+/g,' '):'';
  if(input.schemaVersion!==1||name.length<2||name.length>24||
     /[<>\u0000-\u001f\u007f]/.test(name)||
     !HERO_ARCHETYPES.includes(input.archetype)||
     !HERO_GENDERS.includes(input.gender))return null;
  return {schemaVersion:1,name,gender:input.gender,archetype:input.archetype};
}
export function heroPortraitPath(archetype,gender){
  if(!HERO_ARCHETYPES.includes(archetype)||!HERO_GENDERS.includes(gender))return null;
  return './assets/characters/'+archetype+'-'+gender+'.webp';
}
