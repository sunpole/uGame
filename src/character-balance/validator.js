// Candidate-only evidence validator. This module NEVER applies gameplay balance.
import {METRIC_KEYS, METRICS, validateRules, pointsAt, defaultProfile, calculateCharacter} from './engine.js';

const fail = message => { throw Error(message); };
const near = (a,b) => Math.abs(a-b) <= 1e-6*Math.max(1,Math.abs(a),Math.abs(b));
const assert = (condition,message) => { if(!condition)fail(message); };
const note = (id,title,detail) => ({id,title,status:'open',detail});
const reference = (id,title,ok,detail) => ({id,title,status:ok?'pass':'open',detail});

export function validateBalanceCandidate({rules,profiles,registry}) {
  const checks=[];
  function run(id,title,fn){
    try { checks.push({id,title,status:'pass',detail:fn()||'Проверено'}); }
    catch(err){ checks.push({id,title,status:'fail',detail:String(err.message||err)}); }
  }
  run('schema','Числовая схема коэффициентов',()=>{
    validateRules(rules);
    return 'Типы, допустимые поля и структура кандидата проходят проверку.';
  });
  run('registry','Полнота и источники реестра',()=>{
    assert(registry?.records?.length===50,'Ожидалось 50 записей реестра v0.2.57');
    const ids=new Set(registry.records.map(x=>x.id));
    assert(ids.size===50,'Найдены повторяющиеся ID');
    const derived=registry.records.filter(x=>x.kind==='derived');
    assert(derived.length===24,'Ожидалось 24 производных показателя');
    for(const metric of METRIC_KEYS){
      const row=derived.find(x=>x.id===metric);
      assert(row && row.sourceRefs?.length && row.decisionStatus && row.implementation,'Нет источника или статуса для '+metric);
    }
    return '50 записей, 24 производных показателя с источниками и двумя статусами.';
  });
  let results=[];
  run('current','Текущие профили и трассы',()=>{
    assert(Array.isArray(profiles)&&profiles.length>=1&&profiles.length<=4,'Нужно 1–4 профиля');
    results=profiles.map(p=>calculateCharacter(rules,p));
    for(const r of results)for(const key of METRIC_KEYS){
      assert(Number.isFinite(r.values[key]),key+': нечисловой результат');
      assert(r.trace[key]?.length,key+': нет трассы');
    }
    assert(results.every(r=>r.unspent>=0),'Есть профили с превышением бюджета очков');
    return results.length+' профиля(ей), по 24 конечных значения и трассы, бюджет не превышен.';
  });
  run('grid','Границы: 21 × 65 × 4 = 5 460 профилей',()=>{
    let count=0;
    const variants=Object.entries(rules.cities).flatMap(([cityId,city])=>city.start.map((start,i)=>({cityId,startIndex:i,start})));
    assert(variants.length===21,'Должен быть 21 начальный профиль');
    for(const v of variants){
      assert(v.start.reduce((a,b)=>a+b,0)===10,'Стартовая сумма не равна 10');
      for(let level=1;level<=65;level++){
        const p=defaultProfile(rules,level,v.cityId,v.startIndex);
        assert(p.vyn+p.lov+p.intel===pointsAt(level,rules),'Бюджет ЗРЛ '+level);
        for(const otv of [1,600,699,700]){
          const r=calculateCharacter(rules,{...p,otv});
          for(const k of METRIC_KEYS) assert(Number.isFinite(r.values[k]),'NaN/∞: '+k+', '+level+', '+otv);
          count++;
        }
      }
    }
    assert(count===5460,'Недостаточный охват сценариев');
    return count+' рассчитанных профилей; проверены конечные числа и бюджет. Это не эталон каждого игрового эффекта.';
  });
  run('otv','Границы сотен ОТВ в текущем кандидате',()=>{
    const p=defaultProfile(rules,10,'force',3);
    const a=calculateCharacter(rules,{...p,otv:600});
    const b=calculateCharacter(rules,{...p,otv:699});
    const c=calculateCharacter(rules,{...p,otv:700});
    assert(a.blocks===6&&c.blocks===7,'Неверное количество полных сотен');
    for(const k of METRIC_KEYS)assert(near(a.values[k],b.values[k]),'Расхождение 600 и 699: '+k);
    assert(near(c.values.hp-a.values.hp,rules.perOtvBlock.hp||0),'Неверная прибавка ХП за 100 ОТВ');
    return '600 и 699 равны, 700 добавляет блок. Новые штрафы при падении ниже 600 здесь НЕ проверяются.';
  });
  run('glr','Независимый контрпример ГЛР: 100 = 1%',()=>{
    const plain=structuredClone(rules);
    plain.baseline.glr=0;plain.perLevel.glr=0;plain.perOtvBlock.glr=0;
    for(const city of Object.values(plain.cities))if(city.flat?.glr)city.flat.glr=0;
    const higher=structuredClone(plain);higher.baseline.glr=100;
    const p=defaultProfile(plain,10,'force',3);
    const a=calculateCharacter(plain,p),b=calculateCharacter(higher,p);
    for(const k of ['hps','rps','pps','jps','rgs']){
      if(near(a.values[k],0))continue;
      assert(near(b.values[k]/a.values[k],1.01),k+': неверный множитель ГЛР');
    }
    assert(near(a.values.hp,b.values.hp)&&near(a.values.rp,b.values.rp),'ГЛР не должен менять ёмкость');
    return '+100 ГЛР = +1% к рассчитанным скоростям, но не к максимумам ХП/РП.';
  });
  const acceptedLov=rules.perVyn?.def===0.1 && rules.perLov?.ukl===1 && !Object.hasOwn(rules.perLov||{},'def');
  checks.push(reference('lov','Согласованная зависимость ЛОВ/ВЫН',acceptedLov,
    acceptedLov?'ВЫН +0,1 ЗАЩ; ЛОВ +1 УКЛ, без ЛОВ→ЗАЩ.':'Текущая кандидатная правка отличается от подтверждённого правила; обсудить до утверждения.'));
  const milestone=Object.entries({'10':5,'20':5,'30':5,'40':10,'50':10,'55':10,'60':15,'65':20}).every(([l,x])=>
    rules.levelPoints?.milestones?.[l]===x)&&rules.levelPoints?.ordinary===3;
  checks.push(reference('milestones','Контрольные уровни из утверждённой таблицы',milestone,
    milestone?'Обычный прирост 3; контрольные уровни заменяют его, а не прибавляются сверху.':'Коэффициенты изменены относительно исходного эталона; это кандидатный эксперимент, а не подтверждённая новая таблица.'));
  checks.push(note('otv-new','Новая система ОТВ','Плавные потери наград 550/500, бонусов ЗРЛ, штрафы ниже 300, обучение 1→600 и рост до 50 000 не внесены в расчётное ядро.'));
  checks.push(note('passive','Стартовые пассивы и жизнеспособность','Четыре стартовых узла намеренно отложены; демонстрационная база 100 ХП не гарантирует игровой старт без них.'));
  checks.push(note('xp','ЗРП и групповой бой','Нет полной четырёхфазной модели ЗРП, монстров/боссов, групповых правил, PvP и баффов.'));
  checks.push(note('steps','Шаги и экономика','Показатели ШАГ/РГШ из Lab ещё не подключены к действующему StepSystem и сохранениям.'));
  checks.push(note('rest','Время, зарядка и воскресенье','Бонусы ×4/×8, 8+14 часов отдыха, воскресные штрафы и 40-часовое путешествие не рассчитываются в Character Balance Lab.'));
  checks.push(note('runtime','Настоящий игровой CharacterSystem','Данные расчёта не используются боевым персонажем; ручной Windows QA и балансировочный игровой тест не выполняются этим валидатором.'));
  const complete=checks.find(x=>x.id==='current')?.status==='pass' && checks.find(x=>x.id==='grid')?.status==='pass';
  const rows=(registry?.records||[]).filter(x=>x.kind==='derived').map(x=>({
    id:x.id,name:x.abbreviation+' · '+x.name,calculation:complete?'pass':'fail',
    calculationDetail:complete?'Только конечное значение/трасса на сценариях, не доказательство верной формулы':'Проверка сценариев не прошла',
    decisionStatus:x.decisionStatus,implementation:x.implementation,gameActive:x.gameActive===true,sourceRefs:x.sourceRefs||[]
  }));
  return {checks,rows,summary:{
    passed:checks.filter(x=>x.status==='pass').length,
    failed:checks.filter(x=>x.status==='fail').length,
    open:checks.filter(x=>x.status==='open').length,
    calculated:rows.filter(x=>x.calculation==='pass').length,
    gameIntegrated:rows.filter(x=>x.gameActive).length,
    totalMetrics:METRIC_KEYS.length
  },scope:'candidate-sandbox-only'};
}
