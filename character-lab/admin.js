import { METRICS, METRIC_KEYS, calculateCharacter } from '../src/character-balance/engine.js';
import { createSnapshot, parseSnapshot, diffSnapshot } from '../src/character-balance/snapshot.js';
import { subscribeLab, getLabState, applyLabState } from './lab.js';

const $=(s)=>document.querySelector(s);
const esc=(x)=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fmt=(x)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:6}).format(x);
const MAX_DIFF_SHOWN=90;
let registry=null, state=null, pins=['hp','hps','rp','rps'], preview=null;
function notice(message,error=false){
  const el=$('#lab-status');el.textContent=message;el.dataset.error=String(error);
}
function pinButtons(){
  for(const row of $('#comparison-body').querySelectorAll('tr[data-metric]')){
    const k=row.dataset.metric;
    const cell=row.cells[0];
    if(!cell.querySelector('.pin-toggle')){
      const button=document.createElement('button');
      button.type='button';button.className='pin-toggle';button.dataset.pin=k;
      button.textContent='📌';button.title='Закрепить / открепить показатель '+METRICS[k];
      cell.prepend(button);
    }
    const button=cell.querySelector('.pin-toggle');
    button.setAttribute('aria-pressed',String(pins.includes(k)));
    button.setAttribute('aria-label',(pins.includes(k)?'Открепить: ':'Закрепить: ')+METRICS[k]);
  }
}
function renderPinned(){
  const body=$('#pinned-comparison'),count=$('#pin-count');
  count.textContent=pins.length+' показателей · '+(state?.profiles.length||0)+' профилей';
  if(!state){body.innerHTML='<p class="pin-empty">Загрузка профилей…</p>';return;}
  if(!pins.length){body.innerHTML='<p class="pin-empty">Выбери 📌 рядом с любой характеристикой в таблице. Доступны все 24 показателя.</p>';return;}
  const results=state.profiles.map(p=>calculateCharacter(state.rules,p));
  const headers='<div class="pin-head">Показатель</div>'+state.profiles.map((p,i)=>'<div class="pin-head">Профиль '+(i+1)+' · ЗРЛ '+p.level+'</div>').join('');
  const rows=pins.map(k=>'<div class="pin-label"><button type="button" class="pin-remove" data-unpin="'+esc(k)+'" aria-label="Убрать '+esc(METRICS[k])+'">×</button><span>'+esc(METRICS[k])+'</span></div>'+
      results.map(r=>'<div>'+fmt(r.values[k])+'</div>').join('')).join('');
  body.innerHTML='<div class="pinned-grid" style="--profiles:'+state.profiles.length+'">'+headers+rows+'</div>';
}
function badgeText(status){
  return ({'calculated-only':'Расчёт в Lab','sandbox-input':'Вход Lab','documented-only':'Не реализовано','separate-runtime':'Отдельно в игре'})[status]||status;
}
function renderRegistry(){
  if(!registry)return;
  const q=$('#registry-search').value.trim().toLocaleLowerCase('ru-RU');
  const kind=$('#registry-kind').value,status=$('#registry-status').value;
  let rows=registry.records.filter(x=>(kind==='all'||x.kind===kind)&&(status==='all'||x.implementation===status));
  if(q)rows=rows.filter(x=>[x.id,x.abbreviation,x.name,x.meaning,x.notes,x.formula,...x.sourceRefs,...x.sourceRules].join(' ').toLocaleLowerCase('ru-RU').includes(q));
  $('#registry-count').textContent='· '+rows.length+' из '+registry.records.length;
  $('#registry-list').innerHTML=rows.map(x=>'<details class="registry-entry"><summary><strong>'+esc(x.abbreviation)+' · '+esc(x.name)+'</strong><span class="registry-status">'+esc(badgeText(x.implementation))+'</span></summary>'+
    '<p>'+esc(x.meaning)+'</p><p class="registry-meta"><b>Единица:</b> '+esc(x.unit)+'<br><b>Формула / правило:</b> '+esc(x.formula)+'<br><b>Источники начисления:</b> '+esc(x.sourceRules.length?x.sourceRules.join(', '):'сценарий или событие')+'<br>'+
    '<b>Статус решения:</b> '+esc(x.decisionStatus)+'<br><b>В действующей игре:</b> '+(x.gameActive?'собственная отдельная реализация':'нет')+
    '<br><b>Документы:</b> '+x.sourceRefs.map(esc).join('; ')+'</p><p>'+esc(x.notes||'')+'</p></details>').join('')||'<p class="hint">Совпадений нет. Измените запрос или фильтр.</p>';
}
function togglePin(key){
  if(!METRIC_KEYS.includes(key))return;
  pins=pins.includes(key)?pins.filter(x=>x!==key):[...pins,key];
  pinButtons();renderPinned();
}
async function saveJson(snapshot){
  const json=JSON.stringify(snapshot,null,2);
  const blob=new Blob([json],{type:'application/json;charset=utf-8'});
  const href=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=href;
  a.download='uGame-character-lab-v0.2.57-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),800);
}
async function exportAll(){
  if(!registry||!state){notice('Данные ещё загружаются',true);return;}
  try{
    const snapshot=await createSnapshot({...getLabState(),pins,registry});
    await saveJson(snapshot);
    notice('JSON выгружен: правила, 1–4 билда, реестр, формулы и предупреждения. В игру не применено.');
  }catch(e){notice('Экспорт: '+e.message,true);}
}
function previewText(diff){
  const lines=[
    'Файл проверен: схема, SHA-256, 24 метрики, совпадение расчётов и реестра.',
    'Изменённых параметров правил: '+diff.ruleChanges.length,
    'Изменённые профили: '+(diff.profileChanges.join(', ')||'нет'),
    'Количество профилей: '+diff.previousCount+' → '+diff.nextCount,
    'Закреплено: '+diff.previousPins.join(', ')+' → '+diff.nextPins.join(', '),
    'База исходников отличается: '+(diff.sourceChanged?'ДА, импорт должен быть заблокирован':'нет'),
    '',
    ...diff.ruleChanges.slice(0,MAX_DIFF_SHOWN).map(x=>x.field+': '+x.previous+' → '+x.next)
  ];
  if(diff.ruleChanges.length>MAX_DIFF_SHOWN)lines.push('…ещё '+(diff.ruleChanges.length-MAX_DIFF_SHOWN)+' изменённых параметров');
  return lines.join('\n');
}
async function importFile(file){
  if(!file)return;
  try{
    if(file.size>2_500_000)throw Error('Файл слишком большой');
    const snapshot=await parseSnapshot(await file.text());
    if(snapshot.sourceBaselineCommit!==registry.sourceBaselineCommit)throw Error('Не совпадает исходный коммит базовой модели');
    if(JSON.stringify(snapshot.registry)!==JSON.stringify(registry))throw Error('Реестр в JSON отличается от проверенного реестра игры. Автоматически заменять его нельзя.');
    const before=await createSnapshot({...getLabState(),pins,registry});
    const delta=diffSnapshot(before,snapshot);
    preview=snapshot;
    $('#import-diff').textContent=previewText(delta);
    $('#import-review').showModal();
    notice('Импорт прочитан и проверен. Для применения в песочнице требуется подтверждение.');
  }catch(e){preview=null;notice('Импорт отклонён: '+e.message,true);}
}
async function init(){
  try{
    const response=await fetch('../data/character-stat-registry.json',{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status());
    registry=await response.json();
    if(!Array.isArray(registry.records)||registry.records.length<45||registry.schemaVersion!==1)throw Error('Реестр неполный');
    const ids=new Set(registry.records.map(x=>x.id));
    for(const key of METRIC_KEYS)if(!ids.has(key))throw Error('Реестр не содержит '+key);
    $('#registry-search').addEventListener('input',renderRegistry);
    $('#registry-kind').addEventListener('change',renderRegistry);
    $('#registry-status').addEventListener('change',renderRegistry);
    $('#comparison-body').addEventListener('click',e=>{
      const button=e.target.closest('button[data-pin]');
      if(!button)return;
      e.stopImmediatePropagation();e.preventDefault();
      togglePin(button.dataset.pin);
    },true);
    $('#pinned-comparison').addEventListener('click',e=>{
      const button=e.target.closest('button[data-unpin]');
      if(button)togglePin(button.dataset.unpin);
    });
    $('#clear-pins').addEventListener('click',()=>{pins=[];pinButtons();renderPinned();});
    $('#export-snapshot').addEventListener('click',exportAll);
    $('#import-snapshot').addEventListener('click',()=>$('#snapshot-file').click());
    $('#snapshot-file').addEventListener('change',async e=>{
      const file=e.target.files?.[0];e.target.value='';await importFile(file);
    });
    $('#cancel-import').addEventListener('click',()=>{$('#import-review').close();preview=null;});
    $('#apply-import').addEventListener('click',()=>{
      if(!preview)return;
      try{
        applyLabState({rules:preview.rules,profiles:preview.profiles,selected:preview.selected});
        pins=[...preview.pins];
        pinButtons();renderPinned();
        $('#import-review').close();preview=null;
        notice('Снимок применён ТОЛЬКО в этой вкладке: игровой баланс/сейвы не затронуты.');
      }catch(e){notice('Не удалось применить JSON: '+e.message,true);}
    });
    renderRegistry();
    subscribeLab(next=>{
      state=next;pinButtons();renderPinned();
    });
    notice('Реестр и админ-инструменты готовы · безопасная песочница');
  }catch(e){notice('Не удалось загрузить реестр/админку: '+e.message,true);}
}
init();
