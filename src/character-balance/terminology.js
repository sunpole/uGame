// Explicit public terminology for Character Balance Lab.
// Legacy identifiers remain internal for old snapshot compatibility; exports use
// meaningful English identifiers and bilingual Russian/English labels.
export const STAT_TERMS=Object.freeze({
  vyn:{id:'constitution',code:'CON',ru:'ВЫН · Выносливость',en:'Constitution'},
  lov:{id:'dexterity',code:'DEX',ru:'ЛОВ · Ловкость',en:'Dexterity'},
  intel:{id:'intelligence',code:'INT',ru:'ИНТ · Интеллект',en:'Intelligence'},
  otv:{id:'responsibility',code:'RESP',ru:'ОТВ · Ответственность',en:'Responsibility'},
  hp:{id:'health',code:'HP',ru:'ХП · Здоровье',en:'Health'},
  hps:{id:'healthRegeneration',code:'HP Regen',ru:'ХПС · Здоровье/сек',en:'Health Regeneration'},
  rp:{id:'resource',code:'RP',ru:'РП · Основной ресурс',en:'Resource'},
  rps:{id:'resourceRegeneration',code:'RP Regen',ru:'РПС · Ресурс/сек',en:'Resource Regeneration'},
  pp:{id:'ward',code:'WARD',ru:'ПП · Покров',en:'Ward'},
  pps:{id:'wardRegeneration',code:'Ward Regen',ru:'ППС · Покров/сек',en:'Ward Regeneration'},
  jp:{id:'desire',code:'DESIRE',ru:'ЖП · Желание',en:'Desire'},
  jps:{id:'desireRegeneration',code:'Desire Regen',ru:'ЖПС · Желание/сек',en:'Desire Regeneration'},
  atk:{id:'attack',code:'ATK',ru:'АТК · Атака',en:'Attack'},
  def:{id:'defense',code:'DEF',ru:'ЗАЩ · Защита',en:'Defense'},
  ukl:{id:'evasion',code:'EVA',ru:'УКЛ · Уклонение',en:'Evasion'},
  toch:{id:'accuracy',code:'ACC',ru:'ТОЧ · Точность',en:'Accuracy'},
  ska:{id:'attackSpeed',code:'ATK SPD',ru:'СКА · Скорость атаки',en:'Attack Speed'},
  skp:{id:'movementSpeed',code:'MOVE SPD',ru:'СКП · Скорость движения',en:'Movement Speed'},
  kru:{id:'criticalPower',code:'CRIT DMG',ru:'КРУ · Сила критического удара',en:'Critical Damage'},
  krsh:{id:'criticalChance',code:'CRIT CHANCE',ru:'КРШ · Шанс критического удара',en:'Critical Chance'},
  uvm:{id:'cooldownReduction',code:'CDR',ru:'УВМ · Уменьшение перезарядки',en:'Cooldown Reduction'},
  ust:{id:'skillCostReduction',code:'COST RED',ru:'УСТ · Снижение стоимости умений',en:'Skill Cost Reduction'},
  usu:{id:'skillPower',code:'SKILL POWER',ru:'УСУ · Сила умений',en:'Skill Power'},
  glr:{id:'globalRegeneration',code:'GLOBAL REGEN',ru:'ГЛР · Глобальная регенерация',en:'Global Regeneration'},
  steps:{id:'steps',code:'STEPS',ru:'ШАГ · Максимум Шагов',en:'Steps Capacity'},
  rgs:{id:'cityStepRegeneration',code:'STEP REGEN',ru:'РГШ · Шагов/сек (город)',en:'City Step Regeneration'},
  slots:{id:'inventorySlots',code:'SLOTS',ru:'МКЯ · Дополнительные ячейки',en:'Inventory Slots'},
  slotWeight:{id:'slotCapacity',code:'SLOT CAP',ru:'МВЯ · Кг на ячейку',en:'Slot Capacity'}
});
export const PUBLIC_RULE_GROUPS=Object.freeze({
  perVyn:'perConstitution',perLov:'perDexterity',perInt:'perIntelligence',
  perOtvBlock:'perResponsibilityBlock'
});
export const PUBLIC_SPECIAL_IDS=Object.freeze({
  lovHps:'dexterityHealthRegeneration',
  globRegeneration:'globalRegenerationRule',
  cityRpsPps:'cityResourceAndWardRegeneration'
});
export const TERM_LABELS=Object.freeze(Object.fromEntries(
  Object.entries(STAT_TERMS).map(([k,v])=>[k,v.ru+' / '+v.code+' — '+v.en])
));
export function labelForStat(id,fallback=''){
  return TERM_LABELS[id]||fallback||String(id);
}
export const TO_PUBLIC=Object.freeze({
  ...Object.fromEntries(Object.entries(STAT_TERMS).map(([key,v])=>[key,v.id])),
  ...PUBLIC_RULE_GROUPS,...PUBLIC_SPECIAL_IDS
});
export const TO_LEGACY=Object.freeze(Object.fromEntries(Object.entries(TO_PUBLIC).map(([k,v])=>[v,k])));
const ids=Object.values(TO_PUBLIC);
if(new Set(ids).size!==ids.length)throw Error('Duplicate public stat identifiers');
