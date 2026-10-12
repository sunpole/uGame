import { normalizeCharacterProgress } from './character-runtime.js';
// Project Journal UGD-0038 #44-53: only the 64→65 threshold is accepted.
// Missing thresholds are intentionally shown as unknown, never fabricated.
export const APPROVED_LEVEL_THRESHOLDS=Object.freeze({64:1100000000});
export function xpMeterModel(progress,thresholds=APPROVED_LEVEL_THRESHOLDS) {
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
