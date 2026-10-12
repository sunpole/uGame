import { normalizeCharacterProgress } from './character-runtime.js';
import { getXpThresholds } from './xp-meter.js';

export const DEV_XP_PERCENT_CODES=Object.freeze({
  '2101':5,'2102':10,'2103':50,'2111':-5,'2112':-10,'2113':-50
});
export const DEV_LEVEL_CODES=Object.freeze({'2201':1,'2202':-1});
export const DEV_PANEL_CODES=Object.freeze({character:'2299',city:'2399'});

// DEV percentages change currently stored ZRP, not percent-to-next-level.
// Accepted XP thresholds do not add auto-leveling or real combat XP grants.
export function devPercentZrp(current,percent) {
  const base=Number.isSafeInteger(current)&&current>=0?current:0;
  if(!Number.isFinite(percent)||Math.abs(percent)>100)return base;
  const change=base===0?0:Math.max(1,Math.round(base*Math.abs(percent)/100));
  return Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,
    base+(percent<0?-change:change)));
}
export function devSetZrp(raw) {
  if (!Number.isSafeInteger(raw)||raw<0)throw Error('ЗРП / ZRP: 0…'+Number.MAX_SAFE_INTEGER);
  return raw;
}
export function devLevel(current,delta) {
  const old=normalizeCharacterProgress({zrl:current,zrp:0}).zrl;
  return Math.min(65,Math.max(1,old+delta));
}
export function devSetLevel(value) {
  if(!Number.isInteger(value)||value<1||value>65)throw Error('ЗРЛ / Level: 1–65');
  return value;
}
export function normalizeCharacterResponsibility(value) {
  // Negative responsibility remains possible per discussion, no assigned
  // start value or reputation rewards are invented.
  return Number.isSafeInteger(value)&&Math.abs(value)<=1000000000?value:null;
}
export function devSetResponsibility(value) {
  if(normalizeCharacterResponsibility(value)===null)
    throw Error('ОТВ / Responsibility: −1 000 000 000…1 000 000 000');
  return value;
}
export function availableDevCities(worldGraph) {
  return (worldGraph?.getSafeCityZones?.()||[]).filter(city=>
    city.isSafeCity===true&&city.id===worldGraph.resolveZoneId(city.id))
    .sort((a,b)=>(Number(a.ordinalId)||0)-(Number(b.ordinalId)||0));
}
export function devCityTeleport({worldGraph,zoneSystem,worldReady,save,updateVision,playPortal},cityId) {
  if(!worldReady)return {ok:false,reason:'Мир ещё загружается / World is loading'};
  const city=availableDevCities(worldGraph).find(city=>city.id===cityId);
  if(!city)return {ok:false,reason:'Неизвестный город / Unknown safe city'};
  // Keep full ZoneSystem transition hooks, including world save and
  // existing encounter/timer cleanup. No StepSystem spendService calls.
  const traveled=zoneSystem?.travel?.({zoneId:city.id,entryId:'center'});
  if(traveled?.id!==city.id)return {ok:false,reason:'Переход не выполнен / Travel failed'};
  updateVision?.();playPortal?.();save?.();
  return {ok:true,city};
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('ru-RU');

export class DevCharacterTools {
  constructor({getState,save,renderVitals,getWorld,travel,onOverlayChange,
    getThresholds=getXpThresholds,root=document}={}){
    Object.assign(this,{getState,save,renderVitals,getWorld,travel,onOverlayChange,getThresholds,root});
    this.panel=root.querySelector?.('#dev-character-panel')||null;
    this.currentMode='character';
    this.installPanel();
  }
  installPanel(){
    if(!this.panel)return;
    this.panel.querySelector('[data-dev-close]')?.addEventListener('click',()=>this.close());
    this.panel.addEventListener('click',event=>{
      if(event.target===this.panel){this.close();return;}
      const action=event.target.closest?.('[data-dev-action]');
      if(!action)return;
      const mode=action.dataset.devAction;
      if(mode==='zrp'||mode==='zrl'||mode==='otv'){
        const input=this.panel.querySelector('[data-dev-input="'+mode+'"]');
        const value=Number(input?.value);
        if(!input?.value.trim()||!Number.isSafeInteger(value))return this.status('Нужно целое число / Integer required',false);
        const result=this.applyDirect(mode,value);
        this.status(result.message,result.ok);
        this.renderPanel('character');
      } else if(mode==='city'){
        const result=this.travel?.(action.dataset.devCityId);
        this.status(result?.ok?'Бесплатный DEV-телепорт / Free DEV teleport: '+result.city.name:
          (result?.reason||'Телепорт недоступен / Teleport unavailable'),Boolean(result?.ok));
        if(result?.ok)this.close();
      }else if(mode==='xp-percent'||mode==='level-step'){
        const result=this.executeDevCode(action.dataset.devCode);
        this.status(result.message,result.state==='ok');
        this.renderPanel('character');
      }
    });
  }
  status(message,ok){
    const element=this.panel?.querySelector('#dev-character-result');
    if(element){element.textContent=message;element.dataset.state=ok?'ok':'error';}
  }
  open(mode='character'){
    if(!this.panel)return false;
    this.panel.hidden=false;
    this.renderPanel(mode);this.onOverlayChange?.();
    return true;
  }
  close(){if(!this.panel)return;this.panel.hidden=true;this.onOverlayChange?.();}
  applyDirect(kind,value){
    try{
      const gs=this.getState?.();
      if(!gs)return {ok:false,message:'Нет персонажа / Character unavailable'};
      const previous=gs.state.player.characterProgress;
      if(kind==='zrp') gs.setCharacterExperience(devSetZrp(value),this.getThresholds());
      else if(kind==='zrl') gs.setCharacterProgress({...previous,zrl:devSetLevel(value)});
      else if(kind==='otv') gs.setCharacterResponsibility(devSetResponsibility(value));
      else return {ok:false,message:'Неизвестное поле / Unknown field'};
      this.save?.();this.renderVitals?.();
      return {ok:true,message:'Сохранено / Saved: '+kind.toUpperCase()+' = '+fmt(value)};
    }catch(error){return {ok:false,message:error.message};}
  }
  executeDevCode(code){
    if(code===DEV_PANEL_CODES.character||code===DEV_PANEL_CODES.city){
      this.open(code===DEV_PANEL_CODES.character?'character':'city');
      return {handled:true,state:'ok',message:code+' · Панель открыта / Panel opened'};
    }
    const percent=DEV_XP_PERCENT_CODES[code],change=DEV_LEVEL_CODES[code];
    if(percent===undefined&&change===undefined)return {handled:false};
    const gs=this.getState?.();
    if(!gs)return {handled:true,state:'warn',message:'Сначала запустите игру / Start game first'};
    const old=gs.state.player.characterProgress;
    const next=percent!==undefined
      ? {...old,zrp:devPercentZrp(old.zrp,percent)}
      : {...old,zrl:devLevel(old.zrl,change)};
    if(percent!==undefined) gs.setCharacterExperience(next.zrp,this.getThresholds());
    else gs.setCharacterProgress(next);
    this.save?.();this.renderVitals?.();
    const field=percent!==undefined?'ЗРП / ZRP':'ЗРЛ / Level';
    const message=code+' · '+field+' '+(percent!==undefined
      ?(percent>0?'+':'')+percent+'% текущего / of current'
      :(change>0?'+1':'−1'))+' → '+fmt(percent!==undefined?next.zrp:next.zrl);
    return {handled:true,state:'ok',message};
  }
  renderPanel(mode=this.currentMode){
    if(!this.panel)return;
    this.currentMode=mode;
    const content=this.panel.querySelector('#dev-character-content');
    const gs=this.getState?.();
    const p=gs?.state.player;
    if(!content)return;
    if(mode==='city'){
      const cities=availableDevCities(this.getWorld?.());
      content.innerHTML='<p>Бесплатный DEV-телепорт в любой мирный город из любой зоны. Без Шагов и долга.<br>'+
        '<small>Free DEV travel to any safe city, from anywhere. No Step cost or debt.</small></p>'+
        '<div class="dev-tool-city-list">'+cities.map(city=>
          '<button type="button" data-dev-action="city" data-dev-city-id="'+esc(city.id)+'">'+
          esc(city.name)+' <small>('+esc(city.id)+')</small></button>').join('')+'</div>';
      return;
    }
    const zrl=p?.characterProgress?.zrl??1,zrp=p?.characterProgress?.zrp??0;
    const otv=p?.characterResponsibility;
    const percentButtons=Object.entries(DEV_XP_PERCENT_CODES).map(([code,amount])=>
      '<button type="button" data-dev-action="xp-percent" data-dev-code="'+code+'">'+
      (amount>0?'+':'')+amount+'% <small>'+code+'</small></button>').join('');
    content.innerHTML='<p><strong>ЗРЛ '+fmt(zrl)+'/65 · ЗРП '+fmt(zrp)+
      ' · ОТВ '+(otv===null||otv===undefined?'не задано / unset':fmt(otv))+'</strong></p>'+
      '<p>Проценты меняют <strong>накопленный ЗРП</strong>, НЕ процент до нового уровня. '+
      'Задание ЗРП через DEV теперь проводит переходы ЗРЛ по утверждённой таблице. При нулевом опыте сначала задайте число.<br>'+
      '<small>Percent adjusts currently held XP, NOT percent-to-next-level; crossed thresholds grant levels.</small></p>'+
      '<div class="dev-tool-pct">'+percentButtons+'</div>'+
      '<div class="dev-tool-fields">'+
      '<label>ЗРП / XP <input data-dev-input="zrp" type="number" min="0" step="1" value="'+esc(zrp)+'"></label>'+
      '<button type="button" data-dev-action="zrp">Задать ЗРП / Set XP</button>'+
      '<label>ЗРЛ / Level <input data-dev-input="zrl" type="number" min="1" max="65" step="1" value="'+esc(zrl)+'"></label>'+
      '<button type="button" data-dev-action="zrl">Задать ЗРЛ / Set level</button>'+
      '<label>ОТВ / Responsibility <input data-dev-input="otv" type="number" step="1" value="'+esc(otv??'')+'"></label>'+
      '<button type="button" data-dev-action="otv">Задать ОТВ / Set OTV</button>'+
      '</div><div class="dev-tool-pct">'+
      [['2201','+1 ЗРЛ / Level'],['2202','−1 ЗРЛ / Level']].map(([code,label])=>
        '<button type="button" data-dev-action="level-step" data-dev-code="'+code+'">'+label+' <small>'+code+'</small></button>').join('')+'</div>'+
      '<p class="dev-tool-note">Изменение ЗРЛ/ОТВ — DEV-проверка кандидатных формул. '+
      'Не начисляет очки навыков/ЗРП, не утверждает баланс и не меняет XP-кривую.<br>'+
      'DEV-only candidate calculations; no skill points, XP awards or new balance rules.</p>';
  }
}
