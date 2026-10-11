// External JSON schema v2: human-readable English stat IDs, bilingual terminology.
// Internals retain legacy ids so v0.2.57 JSON, source registry and saved data are safe.
import {createSnapshot,parseSnapshot,SNAPSHOT_KIND} from './snapshot.js';
import {STAT_TERMS,TO_PUBLIC,TO_LEGACY} from './terminology.js';
export const NAMED_SNAPSHOT_SCHEMA=2;
const ROOT_FIELDS=new Set(['kind','schemaVersion','release','sourceBaselineCommit','createdAt','status','rules','profiles','pins','selected','registry','calculations','terminology','checksum']);
const t=()=>Object.entries(STAT_TERMS).map(([,v])=>({id:v.id,code:v.code,russian:v.ru,english:v.en}));
async function sha(text){
  const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(data)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function converted(value,map){
  if(Array.isArray(value))return value.map(x=>converted(x,map));
  if(value&&typeof value==='object'){
    const result={};
    for(const [key,v] of Object.entries(value)){
      const newKey=map[key]||key;
      if(Object.hasOwn(result,newKey))throw Error('Коллизия имён при преобразовании: '+newKey);
      result[newKey]=converted(v,map);
    }
    return result;
  }
  if(typeof value==='string')return map[value]||value;
  return value;
}
export function toEnglishFieldPath(path){
  return String(path).split('.').map(x=>TO_PUBLIC[x]||x).join('.');
}
export async function createNamedSnapshot(args){
  const legacy=await createSnapshot(args);
  const {checksum,...body}=legacy;
  const named=converted(body,TO_PUBLIC);
  named.schemaVersion=NAMED_SNAPSHOT_SCHEMA;
  named.terminology=t();
  return {...named,checksum:{algorithm:'SHA-256',value:await sha(JSON.stringify(named))}};
}
export async function parseNamedSnapshot(json){
  if(typeof json!=='string'||new TextEncoder().encode(json).length>2_500_000)throw Error('Файл больше 2,5 МБ или не является JSON');
  let input;
  try{input=JSON.parse(json);}catch{throw Error('Некорректный JSON');}
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Ожидается объект JSON');
  if(input.schemaVersion===1)return parseSnapshot(json); // Old v0.2.57 snapshots unchanged.
  if(input.kind!==SNAPSHOT_KIND||input.schemaVersion!==NAMED_SNAPSHOT_SCHEMA)throw Error('Неподдерживаемый тип/версия экспорта');
  for(const key of Object.keys(input))if(!ROOT_FIELDS.has(key))throw Error('Неизвестное поле JSON: '+key);
  if(!input.checksum||input.checksum.algorithm!=='SHA-256'||!/^[0-9a-f]{64}$/.test(input.checksum.value||''))throw Error('Контрольная сумма отсутствует');
  const {checksum,...body}=input;
  if(await sha(JSON.stringify(body))!==checksum.value)throw Error('Контрольная сумма не совпала: содержимое было изменено');
  if(JSON.stringify(input.terminology)!==JSON.stringify(t()))throw Error('Таблица переводов в JSON отличается от ожидаемой');
  const {terminology,...namedBody}=body;
  const restored=converted(namedBody,TO_LEGACY);
  restored.schemaVersion=1;
  return parseSnapshot(JSON.stringify({...restored,checksum:{algorithm:'SHA-256',value:await sha(JSON.stringify(restored))}}));
}
