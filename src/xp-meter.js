import { normalizeCharacterProgress } from './character-runtime.js';

// Immutable v0.2.72 fallback if the new data file cannot be read.
// Unknown thresholds are never invented.
export const APPROVED_LEVEL_THRESHOLDS=Object.freeze({64:1100000000});
let activeThresholds=APPROVED_LEVEL_THRESHOLDS;

export function validateXpCurve(config) {
  if(config?.schemaVersion!==1||config?.maxLevel!==65||
     !Array.isArray(config.levels)||config.levels.length!==65)
    throw Error('XP curve must contain levels 1–65');
  const thresholds={};
  let total=0,previous=0;
  for(const [index,row] of config.levels.entries()) {
    if(row.level!==index+1||!Number.isSafeInteger(row.requiredXp)||
       !Number.isSafeInteger(row.referenceMobXp)||
       !Number.isSafeInteger(row.attributePoints)||
       row.requiredXp<0||row.referenceMobXp<0||row.attributePoints<0)
      throw Error('Invalid XP curve row '+(index+1));
    if(index===64){
      if(row.requiredXp!==0||row.referenceMobXp!==0)
        throw Error('Level 65 must be MAX');
    }else{
      if(row.requiredXp<=0||(index>0&&row.requiredXp<previous))
        throw Error('XP thresholds must be monotonically increasing');
      previous=row.requiredXp;
      thresholds[row.level]=row.requiredXp;
      total+=row.requiredXp;
    }
  }
  if(total!==3067443826||config.totalRequiredXp!==total||
     thresholds[1]!==1000||thresholds[2]!==2000||thresholds[64]!==1100000000)
    throw Error('XP curve disagrees with accepted totals');
  return Object.freeze(thresholds);
}
export async function loadXpThresholds(fetchConfig=fetch){
  const response=await fetchConfig('./data/character-xp-curve.json',{cache:'no-store'});
  if(!response.ok)throw Error('XP curve HTTP '+response.status);
  const thresholds=validateXpCurve(await response.json());
  activeThresholds=thresholds;
  return thresholds;
}
export function xpMeterModel(progress,thresholds=activeThresholds) {
  const {zrl,zrp}=normalizeCharacterProgress(progress);
  if(zrl===65)return {level:65,current:0,needed:0,earned:0,remaining:0,known:true,maxLevel:true};
  const target=thresholds[zrl];
  if(!Number.isSafeInteger(target)||target<=0)return {
    level:zrl,current:zrp,needed:null,earned:null,remaining:null,known:false,maxLevel:false
  };
  const earned=Math.max(0,Math.min(100,zrp/target*100));
  return {level:zrl,current:zrp,needed:target,earned,remaining:100-earned,known:true,maxLevel:false};
}
export const xpFormatNumber=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n);
export const xpFormatPercent=n=>new Intl.NumberFormat('ru-RU',{
  minimumFractionDigits:2,maximumFractionDigits:2
}).format(n)+'%';
export function renderXpMeter(root,progress){
  const state=xpMeterModel(progress);
  const level=root.querySelector('#xp-bottom-level');
  const text=root.querySelector('#character-xp');
  const percent=root.querySelector('#xp-bottom-percent');
  const fill=root.querySelector('#xp-bottom-fill');
  if(level)level.textContent='ЗРЛ '+state.level+'/65';
  if(text)text.textContent=state.maxLevel?'ЗРП 0 / 0 · МАКС':
    'ЗРП '+xpFormatNumber(state.current)+' / '+
    (state.known?xpFormatNumber(state.needed):'— · порог уточняется');
  if(percent)percent.textContent=state.maxLevel?'MAX · 0% / 0%':
    state.known?xpFormatPercent(state.earned)+' / '+xpFormatPercent(state.remaining):'—% / —%';
  if(fill)fill.style.width=(state.known&&!state.maxLevel?state.earned:0).toFixed(2)+'%';
  root.querySelector('#xp-bottom-band')?.setAttribute('data-threshold-known',String(state.known));
  return state;
}
