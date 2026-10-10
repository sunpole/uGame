import { METRICS, METRIC_KEYS, validateRules, pointsAt, defaultProfile, calculateCharacter } from '../src/character-balance/engine.js';

const $ = (q) => document.querySelector(q);
const esc = (x) => String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fmt = (x) => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:6}).format(x);
const editGroups = {
  baseline:'Исходные базы (демонстрационные)', perVyn:'За 1 ВЫН', perLov:'За 1 ЛОВ',
  perInt:'За 1 ИНТ', perLevel:'За 1 ЗРЛ', perOtvBlock:'За полные 100 ОТВ',
  'desireBonuses.positive':'ЖП > 0', 'desireBonuses.zero':'ЖП = 0', caps:'Предлагаемые максимумы'
};
let original, rules, profiles, selected='hp';
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
    numberInput('ОТВ','otv',p.otv)+
    numberInput('ВЫН','vyn',p.vyn)+numberInput('ЛОВ','lov',p.lov)+
    numberInput('ИНТ','intel',p.intel)+choice('Желание','desireMode',p.desireMode,[['positive','ЖП > 0'],['zero','ЖП = 0']])+
    '</div><div class="points" data-points>'+(p.vyn+p.lov+p.intel)+' / '+budget+'</div><div class="warning-line" data-warnings></div>'+
    '<details><summary>Все независимые базы + временные модификаторы пассивов/экипировки</summary><p class="hint">Их ввод не меняет настоящие игровые системы.</p><div class="base-grid">'+
    METRIC_KEYS.map(k=>numberInput('База · '+METRICS[k],'base.'+k,p.baseOverrides[k]??rules.baseline[k])+
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
}
function renderRules(){
  let html='';
  for(const [path,name] of Object.entries(editGroups)){
    const group=path.split('.').reduce((obj,k)=>obj[k],rules);
    html+='<div class="rules-section"><h3>'+esc(name)+'</h3><div class="rules-grid">'+
      Object.entries(group).map(([k,v])=>'<label>'+esc(METRICS[k]||k)+'<input type="number" step="any" data-rule="'+esc(path+'.'+k)+'" value="'+v+'"></label>').join('')+'</div></div>';
  }
  html+='<div class="rules-section"><h3>Очки ЗРЛ</h3><div class="rules-grid"><label>Обычный уровень<input type="number" step="1" data-rule="levelPoints.ordinary" value="'+rules.levelPoints.ordinary+'"></label>'+
    Object.entries(rules.levelPoints.milestones).map(([k,v])=>'<label>ЗРЛ '+k+'<input type="number" step="1" data-rule="levelPoints.milestones.'+k+'" value="'+v+'"></label>').join('')+'</div></div>';
  for(const [id,city] of Object.entries(rules.cities)){
    html+='<div class="rules-section"><h3>Столица · '+esc(city.name)+'</h3><div class="rules-grid">'+
      Object.entries(city.flat).map(([k,v])=>'<label>'+esc(METRICS[k])+' (flat)<input type="number" step="any" data-rule="cities.'+id+'.flat.'+k+'" value="'+v+'"></label>').join('')+
      Object.entries(city.percent||{}).map(([k,v])=>'<label>'+esc(METRICS[k])+' (%)<input type="number" step="any" data-rule="cities.'+id+'.percent.'+k+'" value="'+v+'"></label>').join('')+
      (city.regenFromMaxRpPercent!=null?'<label>% макс. РП/сек<input type="number" step="any" data-rule="cities.'+id+'.regenFromMaxRpPercent" value="'+city.regenFromMaxRpPercent+'"></label>':'')+'</div></div>';
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
function onRuleChange(e){
  const input=e.target;if(!(input instanceof HTMLInputElement)||!input.dataset.rule||input.value.trim()==='')return;
  const value=Number(input.value);if(!Number.isFinite(value))return;
  const next=structuredClone(rules),keys=input.dataset.rule.split('.');
  let obj=next;for(const key of keys.slice(0,-1)) obj=obj[key];
  obj[keys.at(-1)]=value;
  try{validateRules(next);profiles.forEach(p=>calculateCharacter(next,p));rules=next;renderResults();status('Коэффициент изменён только в DEV-лаборатории');}
  catch(err){status('Некорректное правило: '+err.message,true);}
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
    $('#reset-rules').addEventListener('click',()=>{rules=structuredClone(original);resetProfiles();renderRules();status('Формулы сброшены');});
    $('#profiles').addEventListener('change',onProfileChange);
    $('#profiles').addEventListener('input',e=>{
      if(e.target instanceof HTMLInputElement && e.target.type==='number' && e.target.dataset.key!=='level')onProfileChange(e);
    });
    $('#rule-editor').addEventListener('input',onRuleChange);
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
