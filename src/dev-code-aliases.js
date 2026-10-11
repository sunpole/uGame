// Canonical RU/EN command names are maintained alongside docs/DEV-CODES.md.
// Numeric codes remain the only execution IDs; this parser never evaluates code.
export const DEV_CODE_LABELS = Object.freeze([
  [
    "2101",
    "+5% текущих накопленных ЗРП",
    "+5% of currently held ZRP"
  ],
  [
    "2102",
    "+10% текущих ЗРП",
    "+10% of held ZRP"
  ],
  [
    "2103",
    "+50% текущих ЗРП",
    "+50% of held ZRP"
  ],
  [
    "2111",
    "−5% текущих ЗРП",
    "−5% of held ZRP"
  ],
  [
    "2112",
    "−10% текущих ЗРП",
    "−10% of held ZRP"
  ],
  [
    "2113",
    "−50% текущих ЗРП",
    "−50% of held ZRP"
  ],
  [
    "2201",
    "+1 ЗРЛ, максимум 65",
    "+1 maturity level, cap 65"
  ],
  [
    "2202",
    "−1 ЗРЛ, минимум 1",
    "−1 maturity level, floor 1"
  ],
  [
    "2299",
    "Панель персонажа: задать точное ЗРП, ЗРЛ 1–65, ОТВ (в том числе отрицательное), кнопки ±%",
    "Character control panel: set exact ZRP, maturity 1–65, OTV (including negative); percentage buttons"
  ],
  [
    "2399",
    "Бесплатный DEV-телепорт: список всех 5 мирных городов, выбор одного из любой локации",
    "Free DEV teleport: choose any of 5 safe cities from anywhere"
  ],
  [
    "1001",
    "Круговая видимость",
    "Circle vision"
  ],
  [
    "1002",
    "Конусная видимость",
    "Cone / flashlight"
  ],
  [
    "1003",
    "Полная видимость",
    "Full vision"
  ],
  [
    "1004",
    "Без видимости",
    "No vision"
  ],
  [
    "1101",
    "Уменьшить радиус видимости на 25",
    "Reduce vision radius by 25"
  ],
  [
    "1102",
    "Увеличить радиус видимости на 25",
    "Increase vision radius by 25"
  ],
  [
    "1103",
    "Сбросить радиус",
    "Reset vision radius"
  ],
  [
    "1201",
    "Темнота вне поля видимости 100%",
    "Darkness outside vision 100%"
  ],
  [
    "1202",
    "Темнота 90%",
    "Darkness 90%"
  ],
  [
    "1203",
    "Темнота 75%",
    "Darkness 75%"
  ],
  [
    "1399",
    "Текущая фаза дневного освещения",
    "Current daylight / game clock phase"
  ],
  [
    "3001",
    "Восполнить Stamina для рывка",
    "Refill dash stamina"
  ],
  [
    "3099",
    "Показать скорость и Stamina",
    "Show speed and stamina"
  ],
  [
    "5001",
    "Добавить тестовый предмет (stack)",
    "Add a stackable test item"
  ],
  [
    "5011",
    "Выдать тестовый шлем и ремень",
    "Grant DEV training helmet and belt"
  ],
  [
    "5099",
    "Слоты/вес рюкзака и сумки ресурсов",
    "Show bag/resource pouch slots and weight"
  ],
  [
    "6001",
    "Добавить осколок",
    "Add a shard"
  ],
  [
    "6099",
    "Показать осколки",
    "Show shard count"
  ],
  [
    "6401",
    "Добавить 1 000 Шагов",
    "Add 1,000 Steps"
  ],
  [
    "6402",
    "Списать 1 000 Шагов, долг возможен",
    "Spend 1,000 Steps; debt permitted"
  ],
  [
    "6499",
    "Показать баланс Шагов / Внимания",
    "Show Steps and Attention status"
  ],
  [
    "7001",
    "Странник",
    "Wanderer class"
  ],
  [
    "7002",
    "Разведчик",
    "Scout class"
  ],
  [
    "7003",
    "Следопыт",
    "Tracker class"
  ],
  [
    "7099",
    "Текущий класс",
    "Current class"
  ],
  [
    "8001",
    "Перезапустить первый квест",
    "Restart first quest"
  ],
  [
    "8099",
    "Статус квестов",
    "Quest status"
  ],
  [
    "8201",
    "Пересоздать события текущей зоны",
    "Recreate current-zone events"
  ],
  [
    "8202",
    "Перебросить качество Q безопасного прототипа зоны",
    "Reroll prototype safe-zone quality"
  ],
  [
    "8211",
    "Установить качество Q1 (только прототип города)",
    "Set Q1 (city prototype only)"
  ],
  [
    "8212",
    "Установить качество Q2",
    "Set Q2"
  ],
  [
    "8213",
    "Установить качество Q3",
    "Set Q3"
  ],
  [
    "8214",
    "Установить качество Q4",
    "Set Q4"
  ],
  [
    "8297",
    "История размещения событий",
    "Event placement history"
  ],
  [
    "8298",
    "Проверить конфликты заполнения спотов",
    "Check event-spot occupancy conflicts"
  ],
  [
    "8299",
    "Статус динамических событий",
    "Dynamic events status"
  ],
  [
    "8300",
    "Сводка активных мастеров по ресурсам",
    "Active Master summary by resource"
  ],
  [
    "8302",
    "Список каменных мастеров T2",
    "List active T2 Stone Masters"
  ],
  [
    "8303",
    "Список каменных мастеров T3",
    "List active T3 Stone Masters"
  ],
  [
    "8304",
    "Список каменных мастеров T4",
    "List active T4 Stone Masters"
  ],
  [
    "8312",
    "Переход к следующему каменному мастеру T2",
    "Teleport/cycle to T2 Stone Master"
  ],
  [
    "8313",
    "Переход к следующему каменному мастеру T3",
    "Teleport/cycle to T3 Stone Master"
  ],
  [
    "8314",
    "Переход к следующему каменному мастеру T4",
    "Teleport/cycle to T4 Stone Master"
  ],
  [
    "8388",
    "Диагностика последнего/ближайшего мастера и награды",
    "Last/nearest Master reward diagnostic"
  ],
  [
    "8399",
    "Пулы кандидатов и ротация спавна",
    "Candidate pools and spawn rotation"
  ],
  [
    "8400",
    "Перебросить Tier внешней зоны",
    "Reroll current external location tier"
  ],
  [
    "8401",
    "Установить T1",
    "Force T1"
  ],
  [
    "8402",
    "Установить T2",
    "Force T2"
  ],
  [
    "8403",
    "Установить T3",
    "Force T3"
  ],
  [
    "8404",
    "Установить T4",
    "Force T4"
  ],
  [
    "8499",
    "Текущий Tier, дистанция, лимиты и время",
    "Current Tier, city distance, cap and lifetime"
  ],
  [
    "8661",
    "Проверочный расход ХП, ПП, РП, ЖП",
    "Test depletion of HP, PP, RP, JP"
  ],
  [
    "8662",
    "Полное восстановление четырёх запасов",
    "Refill all four character pools"
  ],
  [
    "9001",
    "Сохранить игру",
    "Save current game state"
  ],
  [
    "9002",
    "Удалить локальный сейв, остановить автосохранение до F5",
    "Delete local save, pause autosave until reload"
  ],
  [
    "9099",
    "Статус сохранения",
    "Save status"
  ],
  [
    "9999",
    "Открыть этот двуязычный справочник",
    "Open this bilingual code reference"
  ]
].map(([code,ru,en])=>
  Object.freeze({code,ru,en})));
const SHORT_ALIASES = Object.freeze({
  "1001": [
    "видимость круг",
    "circle"
  ],
  "1002": [
    "видимость конус",
    "cone"
  ],
  "1003": [
    "полная видимость",
    "full vision"
  ],
  "1004": [
    "без видимости",
    "no vision"
  ],
  "2101": [
    "зрп +5%",
    "опыт +5%",
    "xp +5%",
    "zrp +5%"
  ],
  "2102": [
    "зрп +10%",
    "опыт +10%",
    "xp +10%",
    "zrp +10%"
  ],
  "2103": [
    "зрп +50%",
    "опыт +50%",
    "xp +50%",
    "zrp +50%"
  ],
  "2111": [
    "зрп -5%",
    "опыт -5%",
    "xp -5%",
    "zrp -5%"
  ],
  "2112": [
    "зрп -10%",
    "опыт -10%",
    "xp -10%",
    "zrp -10%"
  ],
  "2113": [
    "зрп -50%",
    "опыт -50%",
    "xp -50%",
    "zrp -50%"
  ],
  "2201": [
    "уровень +1",
    "зрл +1",
    "level +1",
    "lvl +1"
  ],
  "2202": [
    "уровень -1",
    "зрл -1",
    "level -1",
    "lvl -1"
  ],
  "2299": [
    "персонаж",
    "характеристики dev",
    "зрп",
    "опыт",
    "xp",
    "level",
    "уровень",
    "отв",
    "otv",
    "responsibility",
    "character"
  ],
  "2399": [
    "тп",
    "телепорт",
    "город",
    "телепорт город",
    "teleport",
    "tp",
    "city teleport",
    "city tp"
  ],
  "3001": [
    "стамина",
    "stamina refill"
  ],
  "5001": [
    "предмет",
    "item"
  ],
  "6401": [
    "шаги +1000",
    "steps +1000"
  ],
  "6402": [
    "шаги -1000",
    "steps -1000"
  ],
  "7001": [
    "странник",
    "wanderer"
  ],
  "7002": [
    "разведчик",
    "scout"
  ],
  "7003": [
    "следопыт",
    "tracker"
  ],
  "8661": [
    "проверить ресурсы",
    "тест ресурсов",
    "drain pools",
    "deplete pools"
  ],
  "8662": [
    "восполнить ресурсы",
    "refill pools"
  ],
  "9001": [
    "сохранить",
    "сохранить игру",
    "save",
    "save game"
  ],
  "9002": [
    "удалить сейв",
    "удалить сохранение",
    "delete save",
    "clear save"
  ],
  "9099": [
    "сейв",
    "save status"
  ],
  "9999": [
    "справка",
    "коды",
    "помощь",
    "help",
    "codes",
    "reference"
  ]
});

export function normalizeDevCommand(input) {
  return String(input ?? '').trim().toLocaleLowerCase()
    .replace(/ё/g,'е').replace(/[\u2010-\u2015\u2212]/g,'-')
    .replace(/\s+/g,' ').replace(/[.,;:!?]+$/g,'');
}

const aliasLookup = new Map();
for (const {code,ru,en} of DEV_CODE_LABELS) {
  for (const label of [ru,en,...(SHORT_ALIASES[code]||[])]) {
    const normalized=normalizeDevCommand(label);
    const previous=aliasLookup.get(normalized);
    if (previous && previous!==code) throw Error('DEV alias conflict: '+normalized);
    aliasLookup.set(normalized,code);
  }
}

// Exact safe commands only: never fuzzy-match destructive DEV operations.
export function resolveDevCode(input) {
  const normalized=normalizeDevCommand(input);
  if (/^\d{4}$/.test(normalized)) return normalized;
  return aliasLookup.get(normalized) ?? null;
}
export function devAliasSuggestions() {
  return DEV_CODE_LABELS.flatMap(({code,ru,en})=>
    [{value:ru,code,language:'ru'},{value:en,code,language:'en'}]);
}
