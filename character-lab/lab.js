import { METRICS, METRIC_KEYS, validateRules, pointsAt, defaultProfile, calculateCharacter } from '../src/character-balance/engine.js';
import {SOURCE_GROUPS, GROUP_LABELS, availableModifiers, hasSourceModifier, setSourceModifier, removeSourceModifier, sourceGroup} from '../src/character-balance/modifiers.js';
import {labelForStat} from '../src/character-balance/terminology.js';

const $ = (q) => document.querySelector(q);
const esc = (x) => String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fmt = (x) => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:6}).format(x);
const editGroups = {
  baseline:'Исходные базы (демонстрационные)', perVyn:'За 1 ВЫН', perLov:'За 1 ЛОВ',
  perInt:'За 1 ИНТ', perLevel:'За 1 ЗРЛ', perOtvBlock:'За полные 100 ОТВ',
  'desireBonuses.positive':'ЖП > 0', 'desireBonuses.zero':'ЖП = 0', caps:'Предлагаемые максимумы'
};
let original, rules, profiles, selected='hp';
const subscribers=new Set();
export function getLabState(){
  if(!rules||!profiles)throw Error('Лаборатория ещё не загружена');
  return {rules:structuredClone(rules),profiles:structuredClone(profiles),selected};
}
export function subscribeLab(fn){
  subscribers.add(fn);
  if(rules&&profiles)fn(getLabState());
  return ()=>subscribers.delete(fn);
}
export function applyLabState(next){
  validateRules(next.rules);
  if(!Array.isArray(next.profiles)||next.profiles.length<1||next.profiles.length>4)throw Error('Импорт: нужно от одного до четырёх профилей');
  for(const p of next.profiles)calculateCharacter(next.rules,p);
  if(!METRIC_KEYS.includes(next.selected))throw Error('Импорт: некорректный показатель');
  rules=structuredClone(next.rules);
  profiles=structuredClone(next.profiles);
  selected=next.selected;
  $('#profile-count').value=String(profiles.length);
  renderForms();renderRules();renderResults();
  status('Импорт применён ТОЛЬКО в песочнице — игровой баланс неизменен');
}
function status(t,error=false){$('#lab-status').textContent=t;$('#lab-status').dataset.error=String(error);}
function numberInput(label,path,value){
  return '<label>'+esc(label)+'<input type="number" step="any" data-key="'+esc(path)+'" value="'+esc(value)+'"></label>';
}
function choice(label,path,value,options){
  return '<label>'+esc(label)+'<select data-key="'+esc(path)+'">'+options.map(([v,t])=>'<option value="'+esc(v)+'"'+(String(v)===String(value)?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>';
}
function form(p,i){
  const c=rules.cities[p.cityId],budget=pointsAt(p.level,rules);
  return '<article class="profile" data-profile="'+i+'"><h3>Профиль '+(i+1)+' · '+esc(c.mainResource)+'</h3><div class="inputs">'+
    numberInput('ЗРЛ (1–65)','level',p.level)+
    choice('Столица','cityId',p.cityId,Object.entries(rules.cities).map(([k,v])=>[k,v.name]))+
    choice('Стартовый вариант','startIndex',p.startIndex,c.start.map((a,j)=>[j,a.join(' / ')]))+
    numberInput(labelForStat('otv'),'otv',p.otv)+
    numberInput(labelForStat('vyn'),'vyn',p.vyn)+numberInput(labelForStat('lov'),'lov',p.lov)+
    numberInput(labelForStat('intel'),'intel',p.intel)+choice('Желание','desireMode',p.desireMode,[['positive','ЖП > 0'],['zero','ЖП = 0']])+
    '</div><div class="points" data-points>'+(p.vyn+p.lov+p.intel)+' / '+budget+'</div><div class="warning-line" data-warnings></div>'+
    '<details><summary>Все независимые базы + временные модификаторы пассивов/экипировки</summary><p class="hint">Их ввод не меняет настоящие игровые системы.</p><div class="base-grid">'+
    METRIC_KEYS.map(k=>numberInput('База · '+labelForStat(k,METRICS[k]),'base.'+k,p.baseOverrides[k]??rules.baseline[k])+
      numberInput('Доп. · '+METRICS[k],'extra.'+k,p.extraFlat[k]??0)).join('')+
    '</div></details></article>';
}
function renderForms(){
  $('#profiles').style.setProperty('--count',String(profiles.length));
  $('#profiles').innerHTML=profiles.map(form).join('');
}
function renderTrace(results){
  $('#formula-detail').open=true;
  const box=$('#formula-trace');box.className='trace-grid';box.style.setProperty('--count',String(results.length));
  box.innerHTML=results.map((r,i)=>'<article class="trace-card"><h3>Профиль '+(i+1)+' · ЗРЛ '+profiles[i].level+'</h3><strong>'+
    esc(METRICS[selected])+': '+fmt(r.values[selected])+'</strong><ol>'+
    r.trace[selected].map(t=>'<li>'+esc(t.source)+': <b>'+fmt(t.amount)+'</b> → '+fmt(t.accumulated)+'</li>').join('')+
    '</ol><p class="hint">База + плоские значения → проценты → ГЛР → кап. Округление только для показа.</p></article>').join('');
}
function renderResults(){
  let results;
  try{results=profiles.map(p=>calculateCharacter(rules,p));}catch(e){status('Ошибка вычисления: '+e.message,true);return;}
  $('#comparison-head').innerHTML='<tr><th scope="col">Показатель</th>'+results.map((r,i)=>
    '<th scope="col">Профиль '+(i+1)+'<small style="display:block">'+esc(r.city)+' · ЗРЛ '+profiles[i].level+'</small></th>').join('')+'</tr>';
  $('#comparison-body').innerHTML=METRIC_KEYS.map(k=>
    '<tr role="button" tabindex="0" aria-selected="'+String(selected===k)+'" data-metric="'+k+'"><td>'+esc(METRICS[k])+'</td>'+
    results.map(r=>'<td>'+fmt(r.values[k])+'</td>').join('')+'</tr>').join('')+
    '<tr><td>Нераспределённые очки ВЫН/ЛОВ/ИНТ</td>'+results.map(r=>'<td>'+fmt(r.unspent)+'</td>').join('')+'</tr>'+
    '<tr><td>Свободных пассивных очков (без стартового)</td>'+results.map(r=>'<td>'+r.passivePoints+'</td>').join('')+'</tr>'+
    '<tr><td>Целых дополнительных ячеек</td>'+results.map(r=>'<td>'+r.extra.usableBonusSlots+'</td>').join('')+'</tr>';
  results.forEach((r,i)=>{
    const card=$('#profiles').querySelector('[data-profile="'+i+'"]');
    if(!card)return;
    const points=card.querySelector('[data-points]');
    points.textContent=r.spent+' / '+r.budget+' очков · свободно '+r.unspent+' · пассивов '+r.passivePoints;
    points.classList.toggle('invalid',r.unspent<0);
    card.querySelector('[data-warnings]').textContent=r.warnings.join(' ');
  });
  renderTrace(results);
  for(const subscriber of subscribers)subscriber(getLabState());
}
const kindLabels={flat:'Плоский',increased:'Складываемый %',more:'Умножающий %'};
function renderRules(){
  let html='';
  for(const path of SOURCE_GROUPS){
    const entries=availableModifiers(rules,path),native=sourceGroup(rules,path);
    const cards=Object.entries(entries).flatMap(([metric,types])=>Object.entries(types).map(([kind,value])=>{
      const direct=kind==='flat'&&Object.hasOwn(native,metric)&&!Object.hasOwn(rules.ruleModifiers?.[path]?.[metric]||{},'flat');
      const attrs=direct?'data-rule="'+esc(path+'.'+metric)+'"':
        'data-mod-group="'+esc(path)+'" data-mod-metric="'+esc(metric)+'" data-mod-kind="'+esc(kind)+'"';
      return '<div class="dependency-row" data-dependency="'+esc(path+'.'+metric+'.'+kind)+'">'+
        '<label><span class="dependency-name">'+esc(labelForStat(metric,METRICS[metric]))+'</span><small>'+esc(kindLabels[kind])+'</small>'+
        '<input type="number" step="any" '+attrs+' value="'+esc(value)+'" aria-label="'+esc(METRICS[metric]+' '+kindLabels[kind])+'"></label>'+
        '<button type="button" class="dependency-edit" data-dep-edit data-group="'+esc(path)+'" data-metric="'+esc(metric)+'" data-kind="'+esc(kind)+'" aria-label="Изменить или удалить '+esc(METRICS[metric]+' '+kindLabels[kind])+'">⋯ Изменить</button></div>';
    })).join('');
    html+='<div class="rules-section dependency-section" data-dependency-group="'+esc(path)+'">'+
      '<div class="dependency-section-heading"><h3>'+esc(GROUP_LABELS[path])+'</h3>'+
      '<button type="button" data-dep-add="'+esc(path)+'">+ Добавить характеристику</button></div>'+
      '<div class="dependency-list">'+(cards||'<p class="hint">Нет бонусов · можно добавить</p>')+'</div></div>';
  }
  html+='<div class="rules-section"><h3>Предлагаемые максимумы (это пределы, не зависимости)</h3><div class="rules-grid">'+
    Object.entries(rules.caps).map(([k,v])=>'<label>'+esc(METRICS[k])+'<input type="number" step="any" data-rule="caps.'+esc(k)+'" value="'+esc(v)+'"></label>').join('')+'</div></div>';
  html+='<div class="rules-section"><h3>Очки ЗРЛ</h3><div class="rules-grid">'+
    '<label>Обычный уровень<input type="number" step="1" data-rule="levelPoints.ordinary" value="'+esc(rules.levelPoints.ordinary)+'"></label>'+
    Object.entries(rules.levelPoints.milestones).map(([k,v])=>'<label>ЗРЛ '+esc(k)+'<input type="number" step="1" data-rule="levelPoints.milestones.'+esc(k)+'" value="'+esc(v)+'"></label>').join('')+'</div></div>';
  for(const [id,city] of Object.entries(rules.cities)){
    html+='<div class="rules-section"><h3>Другие процентные бонусы · '+esc(city.name)+'</h3><div class="rules-grid">'+
      Object.entries(city.percent||{}).map(([k,v])=>'<label>'+esc(METRICS[k])+' (%)<input type="number" step="any" data-rule="cities.'+esc(id)+'.percent.'+esc(k)+'" value="'+esc(v)+'"></label>').join('')+
      (city.regenFromMaxRpPercent!=null?'<label>% макс. РП/сек<input type="number" step="any" data-rule="cities.'+esc(id)+'.regenFromMaxRpPercent" value="'+esc(city.regenFromMaxRpPercent)+'"></label>':'')+'</div></div>';
  }
  $('#rule-editor').innerHTML=html;
}
function resetProfiles(){
  profiles=[defaultProfile(rules,1,'force',3),defaultProfile(rules,10,'focus',3),
    defaultProfile(rules,40,'tempo',3),defaultProfile(rules,65,'inspire',1)];
  renderForms();renderResults();
}
function onProfileChange(e){
  const input=e.target;if(!(input instanceof HTMLInputElement||input instanceof HTMLSelectElement))return;
  const card=input.closest('[data-profile]');if(!card)return;
  const i=Number(card.dataset.profile),key=input.dataset.key,p=profiles[i];if(!key)return;
  if(input.type==='number'&&(input.value.trim()===''||!Number.isFinite(Number(input.value))))return;
  const value=input.type==='number'?Number(input.value):input.value;
  const previous=structuredClone(p);
  try{
    if(key.startsWith('base.')) p.baseOverrides[key.slice(5)]=value;
    else if(key.startsWith('extra.')) p.extraFlat[key.slice(6)]=value;
    else if(['level','cityId','startIndex'].includes(key)){
      const level=key==='level'?value:p.level,cityId=key==='cityId'?value:p.cityId;
      const index=key==='startIndex'?value:key==='cityId'?0:p.startIndex;
      profiles[i]=defaultProfile(rules,level,cityId,index);
      profiles[i].otv=key==='level'?(level>=3?600:1):p.otv;
      profiles[i].desireMode=p.desireMode;
      profiles[i].baseOverrides={...p.baseOverrides};
      profiles[i].extraFlat={...p.extraFlat};
      renderForms();
    }else p[key]=value;
    calculateCharacter(rules,profiles[i]);renderResults();
    status('Пересчитано · без сохранения');
  }catch(err){profiles[i]=previous;status(err.message,true);}
}
function applyCandidate(next,message){
  validateRules(next);
  for(const p of profiles)calculateCharacter(next,p);
  rules=next;renderResults();status(message||'Зависимость изменена только в лаборатории');
}
function onRuleChange(e){
  const input=e.target;
  if(!(input instanceof HTMLInputElement)||input.value.trim()===''||!(input.dataset.rule||input.dataset.modGroup))return;
  const value=Number(input.value);if(!Number.isFinite(value))return;
  const next=structuredClone(rules);
  try{
    if(input.dataset.modGroup){
      setSourceModifier(next,input.dataset.modGroup,input.dataset.modMetric,input.dataset.modKind,value,METRIC_KEYS);
    }else{
      const keys=input.dataset.rule.split('.');let obj=next;
      for(const key of keys.slice(0,-1))obj=obj[key];
      obj[keys.at(-1)]=value;
    }
    applyCandidate(next,'Пересчитано с новым коэффициентом · только Lab');
  }catch(err){status('Некорректное правило: '+err.message,true);}
}
let dialogEdit=null;
function showDependencyDialog(path,metric=null,kind='flat'){
  const opts=Object.entries(METRICS);
  dialogEdit={path,metric,kind};
  const adding=metric===null;
  const candidate=adding?opts.flatMap(([id])=>['flat','increased','more'].map(t=>[id,t])).find(([id,t])=>!hasSourceModifier(rules,path,id,t)):null;
  if(adding&&!candidate){status('Все 72 сочетания характеристики и типа уже добавлены');return;}
  $('#dependency-dialog-title').textContent=(adding?'Добавить зависимость':'Изменить или удалить зависимость')+' · '+GROUP_LABELS[path];
  $('#dependency-metric').innerHTML=opts.map(([id,name])=>'<option value="'+esc(id)+'">'+esc(labelForStat(id,name))+'</option>').join('');
  $('#dependency-metric').value=adding?candidate[0]:metric;
  $('#dependency-kind').value=adding?candidate[1]:kind;
  $('#dependency-value').value=adding?'1':availableModifiers(rules,path)[metric]?.[kind]??0;
  $('#dependency-delete').hidden=adding;
  $('#dependency-message').textContent=adding?'Можно добавить любой ещё не занятый тип для той же характеристики.':'Замена удалит старую связь и создаст выбранную. Удаление обратимо кнопкой «Вернуть стандарт».';
  $('#dependency-dialog').showModal();
}
function saveDependency(){
  if(!dialogEdit)return;
  const metric=$('#dependency-metric').value,kind=$('#dependency-kind').value,value=Number($('#dependency-value').value);
  if($('#dependency-value').value.trim()===''||!Number.isFinite(value)){
    $('#dependency-message').textContent='Введите конечное число.';return;
  }
  const old=dialogEdit,duplicate=hasSourceModifier(rules,old.path,metric,kind);
  if(duplicate&&(old.metric!==metric||old.kind!==kind)){
    $('#dependency-message').textContent='Такая связь уже существует. Измените её числовое значение в строке или выберите другой тип.';return;
  }
  const next=structuredClone(rules);
  try{
    if(old.metric!==null)removeSourceModifier(next,old.path,old.metric,old.kind);
    setSourceModifier(next,old.path,metric,kind,value,METRIC_KEYS);
    applyCandidate(next);
    renderRules();$('#dependency-dialog').close();dialogEdit=null;
  }catch(err){$('#dependency-message').textContent=err.message;}
}
function deleteDependency(){
  if(!dialogEdit||dialogEdit.metric===null)return;
  const next=structuredClone(rules);
  try{
    removeSourceModifier(next,dialogEdit.path,dialogEdit.metric,dialogEdit.kind);
    applyCandidate(next,'Связь удалена в лаборатории');
    renderRules();$('#dependency-dialog').close();dialogEdit=null;
  }catch(err){$('#dependency-message').textContent=err.message;}
}
async function boot(){
  try{
    const response=await fetch('../data/character-balance-candidate.json',{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status+' при загрузке правил');
    original=await response.json();validateRules(original);rules=structuredClone(original);
    resetProfiles();renderRules();
    $('#assumptions').innerHTML='<ul class="note-list">'+rules.notes.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
      Object.entries(rules.interpretations).map(([k,v])=>'<p class="hint"><b>'+esc(k)+'</b>: '+esc(v)+'</p>').join('')+
      '<p>Бонусы четырёх стартовых пассивов не заданы — их нужно вычислить позже. Очки от предметов/квестов не предполагаются автоматически.</p>';
    $('#profile-count').addEventListener('change',e=>{
      const n=Number(e.target.value);profiles=profiles.slice(0,n);
      while(profiles.length<n)profiles.push(defaultProfile(rules,[1,10,40,65][profiles.length]));
      renderForms();renderResults();
    });
    $('#reset-profiles').addEventListener('click',()=>{resetProfiles();$('#profile-count').value='4';status('Сценарии сброшены');});
    $('#reset-rules').addEventListener('click',()=>{rules=structuredClone(original);resetProfiles();renderRules();status('Вернулись стандартные формулы и профили');});
    $('#profiles').addEventListener('change',onProfileChange);
    $('#profiles').addEventListener('input',e=>{
      if(e.target instanceof HTMLInputElement && e.target.type==='number' && e.target.dataset.key!=='level')onProfileChange(e);
    });
    $('#rule-editor').addEventListener('input',onRuleChange);
    $('#rule-editor').addEventListener('click',e=>{
      const add=e.target.closest('[data-dep-add]');
      if(add){showDependencyDialog(add.dataset.depAdd);return;}
      const edit=e.target.closest('[data-dep-edit]');
      if(edit)showDependencyDialog(edit.dataset.group,edit.dataset.metric,edit.dataset.kind);
    });
    $('#dependency-save').addEventListener('click',saveDependency);
    $('#dependency-delete').addEventListener('click',deleteDependency);
    $('#dependency-cancel').addEventListener('click',()=>{$('#dependency-dialog').close();dialogEdit=null;});
    $('#dependency-dialog').addEventListener('close',()=>{dialogEdit=null;});
    $('#comparison-body').addEventListener('click',e=>{
      const row=e.target.closest('[data-metric]');if(row){selected=row.dataset.metric;renderResults();}
    });
    $('#comparison-body').addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){const row=e.target.closest('[data-metric]');if(row){e.preventDefault();selected=row.dataset.metric;renderResults();}}
    });
    status('Изолированная лаборатория готова · четыре профиля');
  }catch(err){status('Не удалось запустить лабораторию: '+err.message,true);$('#profiles').textContent=err.message;}
}
boot();
