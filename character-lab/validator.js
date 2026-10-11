// Browser-only report on current candidate data; never touches GameState or saves.
import {subscribeLab} from './lab.js';
import {validateBalanceCandidate} from '../src/character-balance/validator.js';

const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
const label={pass:'Проверено',fail:'Ошибка',open:'Не покрыто'};
const decision={'principle-accepted':'Принцип принят, числа могут быть открыты',candidate:'Кандидат, не утверждено','mixed-approved-and-open':'Частично принято; есть открытые правила'};
const implementation={'calculated-only':'Только формула Lab','documented-only':'Только документация','separate-runtime':'Отдельная реализация, не связана с Lab','sandbox-input':'Только вход Lab'};
let current=null,registry=null,verified=false,working=false,revision=0;
function state(message,flag){const box=$('validation-state');box.textContent=message;box.dataset.state=flag||'open';}
function render(result){
 const s=result.summary;
 $('validation-summary').textContent=s.passed+' технических проверок пройдено · '+s.failed+' ошибок · '+s.open+' открытых зон · '+s.calculated+'/'+s.totalMetrics+' вычисляемых показателей · '+s.gameIntegrated+'/'+s.totalMetrics+' подключены к настоящему CharacterSystem.';
 $('validation-checks').innerHTML=result.checks.map(x=>'<div class="validation-check" data-check="'+esc(x.id)+'" data-state="'+x.status+'"><span class="validation-mark">'+(x.status==='pass'?'✓':x.status==='fail'?'✕':'?')+'</span><div><strong>'+esc(x.title)+'</strong><span class="validation-kind">'+esc(label[x.status])+'</span><p>'+esc(x.detail)+'</p></div></div>').join('');
 $('validation-metric-rows').innerHTML=result.rows.map(x=>
   '<tr data-validation-metric="'+esc(x.id)+'"><th scope="row">'+esc(x.name)+'</th>'+
   '<td>'+esc(label[x.calculation])+'<small>'+esc(x.calculationDetail)+'</small></td>'+
   '<td>'+esc(decision[x.decisionStatus]||x.decisionStatus)+'<small>'+esc(x.sourceRefs.join(' · '))+'</small></td>'+
   '<td>'+esc(implementation[x.implementation]||x.implementation)+(x.gameActive?' (отдельно)':'')+'</td></tr>').join('');
}
function markStale(){
 verified=false;
 state('Данные изменены. Предыдущая проверка устарела — нажмите «Проверить».','open');
 $('validation-summary').textContent='Старые результаты скрыты: необходимо повторить проверку текущего набора коэффициентов.';
 $('validation-checks').replaceChildren();
 $('validation-metric-rows').replaceChildren();
}
async function run(){
 if(!registry||!current||working)return;
 working=true;$('validation-run').disabled=true;
 state('Выполняются расчёты: 21 × 65 × 4…','open');
 // Permit paint before the synchronous audit; do not save or change input values.
 await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 const input=current,startedAt=revision;
 try{
   const result=validateBalanceCandidate({...input,registry});
   if(revision!==startedAt){ markStale();return; }
   render(result);
   verified=true;
   state(result.summary.failed?'Есть ошибки в технических проверках.':'Проверено на текущих данных; открытые вопросы показаны отдельно.',result.summary.failed?'fail':'pass');
 }catch(e){
   verified=false;state('Сбой валидатора: '+e.message,'fail');$('validation-summary').textContent='Нельзя считать формулы проверенными.';
 }finally{working=false;$('validation-run').disabled=false;if(startedAt!==revision)markStale();}
}
$('validation-run').addEventListener('click',run);
subscribeLab(next=>{
 current=next;revision++;
 $('validation-run').disabled=!registry||working;
 if(verified||working)markStale();
 else if(registry&&!working && !$('validation-summary').textContent.includes('Старые результаты'))state('Готово к проверке текущих коэффициентов.','open');
});
(async()=>{
 try{
   const resp=await fetch('../data/character-stat-registry.json',{cache:'no-store'});
   if(!resp.ok)throw Error('HTTP '+resp.status);
   registry=await resp.json();
   $('validation-run').disabled=!current;
   state('Готово к проверке текущих коэффициентов.','open');
 }catch(e){state('Не удалось загрузить реестр: '+e.message,'fail');}
})();
