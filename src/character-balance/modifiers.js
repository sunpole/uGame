// Optional relationship builder, isolated from game runtime.
// 'increased' contributions add together; independent 'more' sources multiply afterward.
export const MODIFIER_KINDS=Object.freeze(['flat','increased','more']);
export const SOURCE_GROUPS=Object.freeze([
  'baseline','perVyn','perLov','perInt','perLevel','perOtvBlock',
  'desireBonuses.positive','desireBonuses.zero',
  'cities.force.flat','cities.focus.flat','cities.tempo.flat','cities.inspire.flat'
]);
export const GROUP_LABELS=Object.freeze({
  baseline:'Исходные базы',perVyn:'За 1 ВЫН',perLov:'За 1 ЛОВ',
  perInt:'За 1 ИНТ',perLevel:'За 1 ЗРЛ',perOtvBlock:'За 100 ОТВ',
  'desireBonuses.positive':'Желание > 0','desireBonuses.zero':'Желание = 0',
  'cities.force.flat':'Столица · Сила','cities.focus.flat':'Столица · Концентрация',
  'cities.tempo.flat':'Столица · Темп','cities.inspire.flat':'Столица · Вдохновение'
});
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
export function sourceGroup(rules,path){
  if(!SOURCE_GROUPS.includes(path))throw Error('Неизвестная группа: '+path);
  const group=path.split('.').reduce((o,key)=>o?.[key],rules);
  if(!group||typeof group!=='object'||Array.isArray(group))throw Error('Не найдена группа '+path);
  return group;
}
export function availableModifiers(rules,path){
  const legacy=sourceGroup(rules,path);
  const changes=rules.ruleModifiers?.[path]||{};
  const result={};
  for(const metric of new Set([...Object.keys(legacy),...Object.keys(changes)])){
    const edit=changes[metric]||{};
    const flat=own(edit,'flat')?edit.flat:legacy[metric];
    const slot={};
    if(flat!==undefined && flat!==null)slot.flat=flat;
    for(const kind of ['increased','more'])if(own(edit,kind))slot[kind]=edit[kind];
    if(Object.keys(slot).length)result[metric]=slot;
  }
  return result;
}
export function hasSourceModifier(rules,path,metric,kind){
  return own(availableModifiers(rules,path)[metric]||{},kind);
}
export function setSourceModifier(rules,path,metric,kind,value,metricKeys){
  if(!metricKeys.includes(metric)||!MODIFIER_KINDS.includes(kind))throw Error('Неизвестная характеристика/тип');
  const legacy=sourceGroup(rules,path);
  if(typeof value!=='number'||!Number.isFinite(value))throw Error('Некорректное число для модификатора');
  rules.ruleModifiers??={};
  rules.ruleModifiers[path]??={};
  rules.ruleModifiers[path][metric]??={};
  rules.ruleModifiers[path][metric][kind]=value;
  // No mutation of the source baseline object; keep edits explicit and portable.
  if(!hasSourceModifier(rules,path,metric,kind))throw Error('Модификатор не добавлен');
  return rules;
}
export function removeSourceModifier(rules,path,metric,kind){
  const legacy=sourceGroup(rules,path);
  const mods=rules.ruleModifiers?.[path]?.[metric];
  if(kind==='flat'&&own(legacy,metric)){
    rules.ruleModifiers??={};rules.ruleModifiers[path]??={};
    rules.ruleModifiers[path][metric]??={};
    rules.ruleModifiers[path][metric].flat=null;
  } else if(mods) {
    delete mods[kind];
    if(!Object.keys(mods).length)delete rules.ruleModifiers[path][metric];
  }
  if(rules.ruleModifiers?.[path]&&!Object.keys(rules.ruleModifiers[path]).length)delete rules.ruleModifiers[path];
  if(rules.ruleModifiers&&!Object.keys(rules.ruleModifiers).length)delete rules.ruleModifiers;
  return rules;
}
export function validateSourceModifiers(rules,metricKeys){
  if(rules.ruleModifiers===undefined)return true;
  const all=rules.ruleModifiers;
  if(!all||typeof all!=='object'||Array.isArray(all))throw Error('ruleModifiers: ожидается объект');
  for(const [path,metrics] of Object.entries(all)){
    const legacy=sourceGroup(rules,path);
    if(!metrics||typeof metrics!=='object'||Array.isArray(metrics))throw Error('ruleModifiers.'+path+': нужен объект');
    for(const [metric,types] of Object.entries(metrics)){
      if(!metricKeys.includes(metric))throw Error('Неизвестная характеристика: '+metric);
      if(!types||typeof types!=='object'||Array.isArray(types))throw Error('ruleModifiers: требуются типы');
      for(const [kind,value] of Object.entries(types)){
        if(!MODIFIER_KINDS.includes(kind))throw Error('Неизвестный тип модификатора: '+kind);
        if(value===null&&kind==='flat'&&own(legacy,metric))continue;
        if(typeof value!=='number'||!Number.isFinite(value))throw Error('Некорректный '+path+'.'+metric+'.'+kind);
      }
    }
  }
  return true;
}
