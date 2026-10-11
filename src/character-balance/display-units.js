// Presentation-only interpretations of candidate Character Balance Lab scores.
// Sources: docs/CHARACTER-BALANCE-LAB.md and data/character-stat-registry.json.
// These DO NOT alter formulas, caps, exports, combat odds or real Phaser speeds.
const FORMAT = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 10 });
const PERCENT_100 = Object.freeze({
  def: '100 ЗАЩ = 1% предполагаемого снижения урона; боевой расчёт ещё не реализован.',
  ukl: '100 УКЛ = 1% предполагаемого уклонения; боевой шанс ещё не реализован.',
  toch: '100 ТОЧ = 1% показателя точности; реальный расчёт попадания ещё не реализован.',
  krsh: '100 КРШ = 1% предполагаемого критического шанса; бой ещё не реализован.',
  uvm: '100 УВМ = 1% сокращения перезарядки; 10 сек → 9,9 сек при 100 УВМ.',
  ust: '100 УСТ = 1% снижения стоимости умения; применение умений ещё не подключено.',
  usu: '100 УСУ = 1% предлагаемого усиления умений; применение ещё не подключено.',
  glr: '100 ГЛР = +1% к рассчитанной скорости регенерации, не +100% и не баллы/сек.'
});
export function metricInterpretation(key, value) {
  if (!Number.isFinite(value)) return null;
  if (Object.hasOwn(PERCENT_100, key)) {
    return {
      text: FORMAT.format(value / 100) + '%',
      description: PERCENT_100[key],
      kind: 'percent'
    };
  }
  if (key === 'ska') return {
    text: FORMAT.format(value / 100) + ' атак/с',
    description: 'Черновик: 100 СКА = 1 атака/сек; базовая частота и анимация настоящей игры пока не определены.',
    kind: 'rate'
  };
  if (key === 'skp') return {
    text: FORMAT.format(value / 100) + ' px/с',
    description: 'Черновик: 100 СКП = 1 px/сек. Это НЕ измеренная скорость движения Phaser.',
    kind: 'rate'
  };
  if (key === 'kru') return {
    text: '+' + FORMAT.format(value) + '% к крит. урону',
    description: 'Черновик: 100 КРУ = +100% дополнительного критического урона; боевой расчёт не реализован.',
    kind: 'percent'
  };
  return null; // HP/RP, raw attack, slots, weight etc. have no approved % conversion.
}
