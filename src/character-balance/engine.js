import { availableModifiers, validateSourceModifiers } from './modifiers.js';
// Character Balance Lab — independent pure calculator. No GameState, SaveSystem or runtime imports.
const NAMES = {
  hp: 'ХП · здоровье', hps: 'ХПС · здоровье/сек', rp: 'РП · основной ресурс', rps: 'РПС · ресурс/сек',
  jp: 'ЖП · Желание', jps: 'ЖПС · Желание/сек', pp: 'ПП · Покров', pps: 'ППС · Покров/сек',
  atk: 'АТК · атака', def: 'ЗАЩ · защита', ukl: 'УКЛ · уклонение', toch: 'ТОЧ · точность',
  ska: 'СКА · скорость атаки', skp: 'СКП · движение', kru: 'КРУ · сила крита', krsh: 'КРШ · шанс крита',
  uvm: 'УВМ · уменьшение КД', ust: 'УСТ · снижение стоимости', usu: 'УСУ · сила умений',
  glr: 'ГЛР · глобальный реген', steps: 'ШАГ · максимум Шагов', rgs: 'РГШ · Шагов/сек (город)',
  slots: 'МКЯ · дополнительные ячейки (дробно)', slotWeight: 'МВЯ · кг на ячейку'
};
export const METRICS = Object.freeze({ ...NAMES });
export const METRIC_KEYS = Object.freeze(Object.keys(NAMES));
const assertNumber = (value, path) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw Error(path + ': ожидается конечное число');
};
export function validateRules(rules) {
  if (!rules || rules.schemaVersion !== 1) throw Error('Неверная схема Character Balance Lab');
  for (const group of ['baseline', 'perVyn', 'perLov', 'perInt', 'perLevel', 'perOtvBlock', 'caps']) {
    if (!rules[group] || typeof rules[group] !== 'object' || Array.isArray(rules[group])) throw Error('Нет группы ' + group);
    for (const [key, value] of Object.entries(rules[group])) {
      if (!METRIC_KEYS.includes(key)) throw Error(group + '.' + key + ': неизвестный показатель');
      assertNumber(value, group + '.' + key);
    }
  }
  for (const key of METRIC_KEYS) assertNumber(rules.baseline[key], 'baseline.' + key);
  for (const [state, values] of Object.entries(rules.desireBonuses || {})) {
    if (!['zero', 'positive'].includes(state)) throw Error('Неизвестное состояние Желания');
    for (const [key, value] of Object.entries(values)) {
      if (!METRIC_KEYS.includes(key)) throw Error('desireBonuses.' + state + '.' + key + ': неизвестный показатель');
      assertNumber(value, 'desireBonuses.' + state + '.' + key);
    }
  }
  if (!rules.desireBonuses?.positive || !rules.desireBonuses?.zero) throw Error('Нужны оба состояния Желания');
  if (!Number.isInteger(rules.levelPoints?.ordinary) || rules.levelPoints.ordinary < 0) throw Error('levelPoints.ordinary');
  for (const [level, pts] of Object.entries(rules.levelPoints.milestones || {})) {
    if (!Number.isInteger(Number(level)) || +level < 2 || +level > 65 || !Number.isInteger(pts) || pts < 0) throw Error('levelPoints.milestones');
  }
  if (Object.keys(rules.cities || {}).length !== 4) throw Error('Нужно 4 столицы');
  for (const [id, city] of Object.entries(rules.cities)) {
    if (!city.name || !city.mainResource || !Array.isArray(city.start)) throw Error('cities.' + id);
    for (const start of city.start) if (!Array.isArray(start) || start.length !== 3 || start.reduce((a,b)=>a+b,0)!==10 || start.some(x=>!Number.isInteger(x)||x<0)) throw Error('cities.' + id + '.start: неверная сумма 10');
    for (const [key, value] of Object.entries(city.flat || {})) { if (!METRIC_KEYS.includes(key)) throw Error(id + '.flat.' + key); assertNumber(value, id + '.flat.' + key); }
    for (const [key, value] of Object.entries(city.percent || {})) { if (!['hp','rp','hps','rps','pps'].includes(key)) throw Error(id + '.percent.' + key); assertNumber(value, id + '.percent.' + key); }
    if (city.regenFromMaxRpPercent != null) assertNumber(city.regenFromMaxRpPercent, id + '.regenFromMaxRpPercent');
  }
  validateSourceModifiers(rules,METRIC_KEYS);
  return true;
}
export function pointsAt(level, rules) {
  if (!Number.isInteger(level) || level < 1 || level > 65) throw Error('ЗРЛ должен быть 1–65');
  let total = 10;
  for (let lvl=2;lvl<=level;lvl++) total += rules.levelPoints.milestones[String(lvl)] ?? rules.levelPoints.ordinary;
  return total;
}
export function defaultProfile(rules, level=1, cityId='force', startIndex=3) {
  validateRules(rules);
  const city = rules.cities[cityId];
  if (!city) throw Error('Неизвестная столица: ' + cityId);
  const start = city.start[startIndex % city.start.length];
  const extra = pointsAt(level, rules)-10;
  const alloc = start.map((n,i)=>n+Math.floor(extra/3)+(i<extra%3?1:0));
  return { level, cityId, startIndex:startIndex%city.start.length, vyn:alloc[0], lov:alloc[1], intel:alloc[2], otv:level>=3?600:1,
    desireMode:'positive', baseOverrides:{}, extraFlat:{} };
}
const round = n => Number(n.toFixed(9));
export function calculateCharacter(rules, profile) {
  validateRules(rules);
  const {level,cityId,desireMode='positive'} = profile;
  if (!Number.isInteger(level)||level<1||level>65) throw Error('Некорректный уровень');
  const city = rules.cities[cityId];
  if (!city) throw Error('Некорректная столица');
  if (!['positive','zero'].includes(desireMode)) throw Error('Некорректное состояние Желания');
  for(const stat of ['vyn','lov','intel','otv']) assertNumber(profile[stat],stat);
  if (['vyn','lov','intel'].some(k=>profile[k]<0 || !Number.isInteger(profile[k]))) throw Error('Очки ВЫН/ЛОВ/ИНТ должны быть целыми и неотрицательными');
  const trace=Object.fromEntries(METRIC_KEYS.map(key=>[key,[]]));
  const values=Object.fromEntries(METRIC_KEYS.map(key=>[key,0]));
  function add(key, delta, label) {
    if (!METRIC_KEYS.includes(key)) throw Error('Неизвестный показатель: ' + key);
    assertNumber(delta,label); values[key]+=delta;
    if (delta!==0 || label.startsWith('База')) trace[key].push({source:label, amount:round(delta), accumulated:round(values[key])});
  }
  const increased=Object.fromEntries(METRIC_KEYS.map(key=>[key,0]));
  const increasedSources=Object.fromEntries(METRIC_KEYS.map(key=>[key,[]]));
  const more=[];
  function accumulateIncreased(key,pct,label){
    increased[key]+=pct;
    increasedSources[key].push(label+': '+round(pct)+'%');
  }
  function addGroup(path,mult,label){
    for (const [key,types] of Object.entries(availableModifiers(rules,path))) {
      if(types.flat!==undefined)add(key,types.flat*mult,label+': '+mult+' × '+types.flat);
      if(types.increased!==undefined)accumulateIncreased(key,mult*types.increased,label+' '+mult+' × '+types.increased+'%');
      if(types.more!==undefined)more.push({key,factor:1+mult*types.more/100,label:label+': more '+mult+' × '+types.more+'%'});
    }
  }
  const base=availableModifiers(rules,'baseline');
  for (const key of METRIC_KEYS) add(key,base[key]?.flat??0,'База: '+(base[key]?.flat??0));
  for (const [key,value] of Object.entries(profile.baseOverrides||{})) {
    if(!METRIC_KEYS.includes(key)) throw Error('baseOverrides.' + key);
    assertNumber(value,'baseOverrides.' + key);
    const starting=base[key]?.flat??0;
    add(key,value-starting,'Переопределение базы: '+value+' − '+starting);
  }
  for(const [key,types] of Object.entries(base)){
    if(types.increased!==undefined)accumulateIncreased(key,types.increased,'База '+types.increased+'%');
    if(types.more!==undefined)more.push({key,factor:1+types.more/100,label:'База: more '+types.more+'%'});
  }
  addGroup('perVyn',profile.vyn,'ВЫН');
  addGroup('perLov',profile.lov,'ЛОВ');
  addGroup('perInt',profile.intel,'ИНТ');
  addGroup('perLevel',level,'ЗРЛ');
  // Truncate toward zero for negative OTV pending an explicit negative-rating rule.
  const blocks=Math.trunc(profile.otv/100);
  addGroup('perOtvBlock',blocks,'Полные сотни ОТВ');
  addGroup('cities.'+cityId+'.flat',1,'Столица '+city.name);
  addGroup('desireBonuses.'+desireMode,1,desireMode==='positive'?'ЖП > 0':'ЖП = 0');
  for(const [key,rate] of Object.entries(profile.extraFlat||{}))add(key,rate,'Пробные внешние бонусы: 1 × '+rate);
  const applyPct=(key,pct,label)=>{
    if (!pct) return;
    const base=values[key], delta=base*pct/100;
    add(key,delta,label + ': ' + round(base) + ' × ' + round(pct) + '%');
  };
  // Phase 1: all flat sources are accumulated above. Increased percentages are
  // additive for the same statistic, while every more source multiplies in order.
  // Crucially, cross-stat dependencies must consume these FINAL upstream results,
  // not the raw flat total (GLR→5 regens and RP→Tempo RPS).
  for (const key of METRIC_KEYS)if(increased[key]!==0){
    applyPct(key,increased[key],'Суммарные increased ['+increasedSources[key].join('; ')+']');
  }
  for (const part of more){
    assertNumber(part.factor,part.label);
    const before=values[part.key],next=before*part.factor;
    assertNumber(next,part.label);
    add(part.key,next-before,part.label+' × '+round(part.factor));
  }
  const capped=[];
  // A dependent regeneration must use the same GLR as the visible capped metric.
  if(rules.caps.glr!==undefined && values.glr>rules.caps.glr){
    add('glr',rules.caps.glr-values.glr,'Верхний предел '+rules.caps.glr);
    capped.push('glr');
  }
  // Phase 2: legacy city special cases and dependent calculations.
  // This preserves all historical results when ruleModifiers is absent.
  applyPct('rp',city.percent?.rp||0,'Столица: % к запасу РП');
  if (city.regenFromMaxRpPercent) add('rps',values.rp*city.regenFromMaxRpPercent/100,'Темп: максимум РП '+round(values.rp)+' × '+city.regenFromMaxRpPercent+'%/сек');
  applyPct('hps',(city.percent?.hps||0)+profile.lov*0.01,'Бонусы к ХПС (столица + 0,01% за ЛОВ)');
  applyPct('rps',city.percent?.rps||0,'Бонус столицы к РПС');
  applyPct('pps',city.percent?.pps||0,'Бонус столицы к ППС');
  // Phase 3: one common global regeneration multiplier from the FINAL GLR.
  const glrPct=values.glr/100;
  for (const key of ['hps','rps','pps','jps','rgs']){
    applyPct(key,glrPct,'ГЛР: '+round(values.glr)+' / 100 = '+round(glrPct)+'%');
  }
  for (const [key,cap] of Object.entries(rules.caps)) {
    if(key==='glr')continue;
    if(values[key]>cap){add(key,cap-values[key],'Верхний предел '+cap);capped.push(key);}
  }
  for (const key of METRIC_KEYS) values[key]=round(values[key]);
  const budget=pointsAt(level,rules);
  const spent=profile.vyn+profile.lov+profile.intel;
  const warnings=[];
  if (spent>budget) warnings.push('Избыток ВЫН/ЛОВ/ИНТ: потрачено ' + spent + ', доступно ' + budget + '; сравнение НЕ является допустимым билдом.');
  if(values.hp<=0) warnings.push('ХП ≤ 0: нет рассчитанной гарантии выживаемости (стартовые пассивы пока не заданы).');
  if(values.rp<=0) warnings.push('РП ≤ 0: невозможно оплачивать некоторые умения.');
  if(profile.otv<0) warnings.push('Отрицательные ОТВ: количество сотен округляется к нулю, это временная интерпретация.');
  if(capped.length) warnings.push('Достигнуты верхние пределы: ' + capped.map(k=>METRICS[k]).join(', ') + '.');
  return {values,trace,budget,spent,unspent:budget-spent,passivePoints:level-1,blocks,city:city.name,mainResource:city.mainResource,capped,warnings,
    extra:{ usableBonusSlots:Math.max(0,Math.floor(values.slots+1e-9)), attackPerSecond: values.ska/100, glrPercent:values.glr/100,
      criticalChancePercent: values.krsh/100, dodgePercent:values.ukl/100, defensePercent:values.def/100,
      desireRegenCondition:'РП 100% непрерывно 3 секунды; затем ЖПС работает, пока РП остаётся полным.' }};
}
