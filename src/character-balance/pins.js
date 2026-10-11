// UI-only pinned comparison helpers. No game state, saves or balance changes.
import {METRICS, METRIC_KEYS} from './engine.js';
export const PIN_INPUTS=Object.freeze({
  level:'ЗРЛ · уровень',
  vyn:'ВЫН · Выносливость',
  lov:'ЛОВ · Ловкость',
  intel:'ИНТ · Интеллект',
  otv:'ОТВ · Ответственность',
  city:'Столица происхождения',
  mainResource:'СИЛ / КОН / ТЕМП / ВДОХ · тип ресурса',
  desireMode:'Желание · состояние',
  unspent:'Свободные очки ВЫН/ЛОВ/ИНТ'
});
export const PIN_KEYS=Object.freeze([...METRIC_KEYS,...Object.keys(PIN_INPUTS)]);
export const PIN_LABELS=Object.freeze({...METRICS,...PIN_INPUTS});
export function pinInfo(key,profile,result){
  if(!PIN_KEYS.includes(key))throw Error('Некорректная закреплённая характеристика: '+key);
  const input={
    level:profile.level,vyn:profile.vyn,lov:profile.lov,intel:profile.intel,
    otv:profile.otv,city:result.city,mainResource:result.mainResource,
    desireMode:profile.desireMode==='positive'?'ЖП > 0':'ЖП = 0',
    unspent:result.unspent
  };
  if(key in PIN_INPUTS){
    const lines=[PIN_LABELS[key]+': '+input[key]];
    if(['vyn','lov','intel'].includes(key))lines.push('Очки назначены в карточке профиля; сумма '+result.spent+' из '+result.budget+'.');
    else if(key==='otv')lines.push('Полных сотен ОТВ: '+result.blocks+'. Рейтинг задан в карточке профиля.');
    else if(key==='level')lines.push('Уровень задан в карточке профиля; бюджет очков: '+result.budget+'.');
    else lines.push('Источник: карточка профиля и параметры выбранной столицы.');
    return {label:PIN_LABELS[key],value:input[key],lines};
  }
  const value=result.values[key],traces=result.trace[key]||[];
  return {label:METRICS[key],value,lines:[
    METRICS[key]+': '+value,
    ...traces.map(entry=>entry.source+'; изменение '+entry.amount+' → '+entry.accumulated),
    ...(result.capped.includes(key)?['Внимание: действует верхний предел.']:[]),
    'Модель: кандидатная Character Balance Lab, НЕ живой игровой баланс.'
  ]};
}
