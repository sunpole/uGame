// Portable sandbox snapshot. Deliberately no GameState / SaveSystem / Phaser import.
import { validateRules, calculateCharacter, METRIC_KEYS } from './engine.js';
import { PIN_KEYS } from './pins.js';
export const SNAPSHOT_KIND='ugame.character-balance.sandbox';
export const SNAPSHOT_SCHEMA=1;
const allowedProfiles=new Set(['level','cityId','startIndex','vyn','lov','intel','otv','desireMode','baseOverrides','extraFlat']);
const allowedRoot=new Set(['kind','schemaVersion','release','sourceBaselineCommit','createdAt','status','rules','profiles','pins','selected','registry','calculations','checksum']);
function onlyKeys(value,allowed,description){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error(description+': нужен объект');
  for(const key of Object.keys(value))if(!allowed.has(key))throw Error(description+': неизвестное поле '+key);
}
function plainNumber(x,description){
  if(typeof x!=='number'||!Number.isFinite(x))throw Error(description+': ожидается конечное число');
}
function validateProfile(p,rules){
  onlyKeys(p,allowedProfiles,'Профиль');
  for(const k of ['level','vyn','lov','intel','otv','startIndex'])plainNumber(p[k],'Профиль.'+k);
  if(!Number.isInteger(p.level)||p.level<1||p.level>65)throw Error('ЗРЛ должен быть 1–65');
  if(!Number.isInteger(p.startIndex)||p.startIndex<0||p.startIndex>=rules.cities[p.cityId]?.start.length)throw Error('Некорректный стартовый вариант');
  if(!['zero','positive'].includes(p.desireMode))throw Error('Некорректное состояние Желания');
  if(Math.abs(p.otv)>1e9)throw Error('ОТВ превышает допустимый диапазон для песочницы');
  for(const k of ['baseOverrides','extraFlat']){
    onlyKeys(p[k]||{},new Set(METRIC_KEYS),'Профиль.'+k);
    for(const [key,v] of Object.entries(p[k]||{}))plainNumber(v,k+'.'+key);
  }
  return calculateCharacter(rules,p);
}
function validateRegistry(registry){
  onlyKeys(registry,new Set(['schemaVersion','release','status','sourceBaselineCommit','priority','records','knownConflicts']),'Реестр');
  if(registry.schemaVersion!==1||!Array.isArray(registry.records)||!Array.isArray(registry.knownConflicts))throw Error('Неизвестная версия реестра');
  if(registry.records.length<40||registry.records.length>250)throw Error('Неверное число записей реестра');
  const ids=new Set();
  for(const item of registry.records){
    if(!item||typeof item.id!=='string'||ids.has(item.id)||!item.name||!Array.isArray(item.sourceRefs))throw Error('Неверный или повторяющийся id реестра');
    ids.add(item.id);
  }
  for(const key of METRIC_KEYS)if(!ids.has(key))throw Error('Реестр пропустил '+key);
}
async function hash(text){
  const bytes=new TextEncoder().encode(text);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function createSnapshot({rules,profiles,pins,selected,registry}){
  validateRules(rules);validateRegistry(registry);
  if(!Array.isArray(profiles)||profiles.length<1||profiles.length>4)throw Error('Можно экспортировать 1–4 профиля');
  if(!Array.isArray(pins)||pins.some(k=>!PIN_KEYS.includes(k))||new Set(pins).size!==pins.length)throw Error('Некорректные закреплённые метрики');
  if(!METRIC_KEYS.includes(selected))throw Error('Некорректный выделенный показатель');
  const calculations=profiles.map(p=>validateProfile(p,rules));
  const body={kind:SNAPSHOT_KIND,schemaVersion:SNAPSHOT_SCHEMA,release:'0.2.57',
    sourceBaselineCommit:registry.sourceBaselineCommit,createdAt:new Date().toISOString(),status:'candidate-not-applied',
    rules:structuredClone(rules),profiles:structuredClone(profiles),pins:[...pins],selected,
    registry:structuredClone(registry),calculations};
  const checksum={algorithm:'SHA-256',value:await hash(JSON.stringify(body))};
  return {...body,checksum};
}
export async function parseSnapshot(json){
  if(typeof json!=='string'||new TextEncoder().encode(json).byteLength>2_500_000)throw Error('Файл больше 2,5 МБ или не является JSON');
  let object;
  try{object=JSON.parse(json);}catch{throw Error('Некорректный JSON');}
  onlyKeys(object,allowedRoot,'Снимок');
  if(object.kind!==SNAPSHOT_KIND||object.schemaVersion!==SNAPSHOT_SCHEMA)throw Error('Неподдерживаемый тип/версия экспорта');
  if(object.status!=='candidate-not-applied')throw Error('Файл с недопустимым статусом публикации');
  if(object.release!=='0.2.57')throw Error('Версия редактора отличается: импорт заблокирован, нужна миграция');
  if(!object.checksum||object.checksum.algorithm!=='SHA-256'||!/^[0-9a-f]{64}$/.test(object.checksum.value||''))throw Error('Контрольная сумма отсутствует');
  const {checksum,...body}=object;
  if(await hash(JSON.stringify(body))!==checksum.value)throw Error('Контрольная сумма не совпала: содержимое было изменено');
  validateRules(object.rules);validateRegistry(object.registry);
  if(!Array.isArray(object.profiles)||object.profiles.length<1||object.profiles.length>4)throw Error('Число профилей должно быть 1–4');
  const calculated=object.profiles.map(p=>validateProfile(p,object.rules));
  if(JSON.stringify(calculated)!==JSON.stringify(object.calculations))throw Error('Расчётные результаты не соответствуют правилам/профилям');
  if(!Array.isArray(object.pins)||object.pins.some(k=>!PIN_KEYS.includes(k))||new Set(object.pins).size!==object.pins.length)throw Error('Некорректные закрепления');
  if(!METRIC_KEYS.includes(object.selected))throw Error('Некорректный выбранный показатель');
  return object;
}
function flatten(obj,prefix=''){
  return Object.entries(obj||{}).flatMap(([key,value])=>{
    const full=prefix?prefix+'.'+key:key;
    if(value&&typeof value==='object'&&!Array.isArray(value))return flatten(value,full);
    return [[full,JSON.stringify(value)]];
  });
}
export function diffSnapshot(before,after){
  const old=new Map(flatten(before.rules)),next=new Map(flatten(after.rules));
  const changed=[...new Set([...old.keys(),...next.keys()])].filter(k=>old.get(k)!==next.get(k)).map(k=>({field:k,previous:old.get(k)??'отсутствует',next:next.get(k)??'отсутствует'}));
  const profileChanges=[];
  const max=Math.max(before.profiles.length,after.profiles.length);
  for(let i=0;i<max;i++)if(JSON.stringify(before.profiles[i])!==JSON.stringify(after.profiles[i]))profileChanges.push(i+1);
  return {ruleChanges:changed,profileChanges,previousCount:before.profiles.length,nextCount:after.profiles.length,previousPins:before.pins,nextPins:after.pins,sourceChanged:before.sourceBaselineCommit!==after.sourceBaselineCommit};
}
