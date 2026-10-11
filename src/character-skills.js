import { currentCharacterVitals, normalizeCharacterPools } from './character-runtime.js';

export const SKILL_SLOT_COUNT = 7;
export const RADIAL_IMPULSE = Object.freeze({
  slot:1, cost:35, cooldownMs:300, durationMs:300, startRadius:1, radius:75, damage:50
});
const POOL_KEYS=Object.freeze(['hp','pp','rp','jp']);
export const DEV_SKILL_ANOMALIES=Object.freeze([
  Object.freeze({key:'noCooldown',code:'8671',icon:'⏱',label:'Без КД',title:'DEV: навыки без перезарядки'}),
  Object.freeze({key:'immortal',code:'8672',icon:'✚',label:'Бессмертие',title:'DEV: ХП не ниже 1'}),
  Object.freeze({key:'freeSkills',code:'8673',icon:'∞',label:'Без затрат',title:'DEV: навыки без расхода ЖП/РП'})
]);
export function applyPlayerDamage(currentHp,damage,{immortal=false}={}) {
  if(!Number.isFinite(currentHp)||currentHp<0||!Number.isFinite(damage)||damage<0)
    return currentHp;
  return Math.max(immortal?1:0,currentHp-damage);
}
const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
const cap=(value,maximum)=>Math.max(0,Math.min(Math.max(0,maximum),value));

export function spendImpulse(pools, cost=RADIAL_IMPULSE.cost) {
  if (!pools || !POOL_KEYS.every(k=>finite(pools[k])&&pools[k]>=0) ||
      !finite(cost)||cost<0) return {ok:false,reason:'Нет сохранённого профиля'};
  if (pools.jp+pools.rp+1e-9<cost) return {ok:false,reason:'Недостаточно ЖП + РП'};
  const spentJp=Math.min(pools.jp,cost),spentRp=Math.max(0,cost-spentJp);
  return {ok:true,spentJp,spentRp,
    next:{...pools,jp:Math.max(0,pools.jp-spentJp),
      rp:Math.max(0,pools.rp-spentRp)}};
}

// Pure regeneration math: derived rates from the single Lab engine, no new bases.
export function regenerateVitals(current,values,seconds,{desireAllowed=false}={}) {
  if(!current||!values||!finite(seconds)||seconds<=0) return current;
  const next={...current};
  for(const [key,rate] of [['hp','hps'],['pp','pps'],['rp','rps'],['jp','jps']]){
    const regen=key==='jp'&&!desireAllowed?0:Math.max(0,Number(values[rate])||0);
    next[key]=cap((Number(current[key])||0)+regen*seconds,Number(values[key])||0);
  }
  return next;
}
export function pulseRadius(elapsedMs) {
  const t=Math.max(0,Math.min(1,(Number(elapsedMs)||0)/RADIAL_IMPULSE.durationMs));
  return RADIAL_IMPULSE.startRadius+
    (RADIAL_IMPULSE.radius-RADIAL_IMPULSE.startRadius)*t;
}
// No PvE combatants yet: only explicitly registered damageable enemies with
// receiveDamage() can be hit. Masters/service NPCs must NEVER be attackable.
export function applyPulseHits(targets,origin,radius,alreadyHit=new Set()) {
  let count=0;
  for(const target of targets||[]){
    if(!target||target.isEnemy!==true||typeof target.receiveDamage!=='function'||
        alreadyHit.has(target)||!finite(target.x)||!finite(target.y))continue;
    if(Math.hypot(target.x-origin.x,target.y-origin.y)>radius)continue;
    alreadyHit.add(target);
    target.receiveDamage(RADIAL_IMPULSE.damage,{skill:'radial-impulse',origin});
    count++;
  }
  return count;
}

export class CharacterSkillSystem {
  constructor({getGameState,getRules,save,renderVitals,animate,getTargets=()=>[],
    canCast=()=>true,refillStamina=()=>{},root=document}={}){
    Object.assign(this,{getGameState,getRules,save,renderVitals,animate,getTargets,canCast,refillStamina,root});
    // Session-only QA switches: never mutate the canonical save or character balance.
    this.anomalies={noCooldown:false,immortal:false,freeSkills:false};
    this.boundAnomalyClick=(event)=>{
      const button=event.target.closest?.('[data-dev-anomaly-remove]');
      if(button)this.setAnomaly(button.dataset.devAnomalyRemove,false);
    };
    this.lastCastAt=-Infinity;this.lastTickAt=null;this.fullRpSince=null;
    this.nextSaveAt=0;this.lastUiAt=0;this.lastReason='';
    this.boundKey=(e)=>this.onKey(e);
    this.boundClick=(e)=>{
      const slot=e.target.closest?.('[data-skill-slot]');
      if(slot)this.cast(Number(slot.dataset.skillSlot));
    };
  }
  bind() {
    this.root.addEventListener('keydown',this.boundKey);
    this.root.querySelector('#skill-hotbar')?.addEventListener('click',this.boundClick);
    this.root.querySelector('#dev-anomaly-bar')?.addEventListener('click',this.boundAnomalyClick);
    this.renderAnomalies();
    this.updateUI();
  }
  destroy(){
    this.root.removeEventListener('keydown',this.boundKey);
    this.root.querySelector('#skill-hotbar')?.removeEventListener('click',this.boundClick);
    this.root.querySelector('#dev-anomaly-bar')?.removeEventListener('click',this.boundAnomalyClick);
  }
  onKey(event){
    if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||
        !/^[1-7]$/.test(event.key)||event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    if(!this.canCast())return;
    event.preventDefault();
    this.cast(Number(event.key));
  }
  state(){
    const gs=this.getGameState?.(),rules=this.getRules?.();
    return gs&&rules?{gs,vitals:currentCharacterVitals(rules,gs.state.player)}:null;
  }
  setAnomaly(key,enabled) {
    if(!Object.prototype.hasOwnProperty.call(this.anomalies,key))return false;
    this.anomalies[key]=Boolean(enabled);
    if(key==='immortal'&&enabled)this.damagePlayer(0);
    this.renderAnomalies();
    this.updateUI();
    return this.anomalies[key];
  }
  renderAnomalies(){
    const bar=this.root.querySelector('#dev-anomaly-bar');
    if(!bar)return;
    const doc=bar.ownerDocument||document;
    const nodes=[];
    for(const def of DEV_SKILL_ANOMALIES){
      if(!this.anomalies[def.key])continue;
      const buff=doc.createElement('span');
      buff.className='dev-anomaly-buff';
      buff.dataset.devAnomaly=def.key;
      buff.title=def.title;
      const icon=doc.createElement('span');
      icon.className='dev-anomaly-icon';
      icon.textContent=def.icon;
      const name=doc.createElement('span');
      name.className='dev-anomaly-label';
      name.textContent=def.label;
      const remove=doc.createElement('button');
      remove.type='button';
      remove.className='dev-anomaly-remove';
      remove.dataset.devAnomalyRemove=def.key;
      remove.setAttribute('aria-label','Снять '+def.label);
      remove.title='Отключить / Remove '+def.label;
      remove.textContent='×';
      buff.append(icon,name,remove);
      nodes.push(buff);
    }
    bar.replaceChildren(...nodes);
    bar.hidden=nodes.length===0;
  }
  // Central HP damage entry point for future combat; no real PvE damage pipeline yet.
  damagePlayer(amount){
    const state=this.state();
    if(!state?.vitals.pools)return null;
    const current=state.vitals.pools.current;
    const hp=applyPlayerDamage(current.hp,amount,{immortal:this.anomalies.immortal});
    if(hp!==current.hp){
      state.gs.setCharacterPools({...state.vitals.pools,current:{...current,hp}});
      this.save?.();this.renderVitals?.();
    }
    return hp;
  }
  cast(slot,now=Date.now()){
    if(slot!==1){this.feedback('Слот '+slot+' пока свободен');return {ok:false,reason:'empty'};}
    if(!this.canCast()){this.feedback('Навык доступен только в игровом мире');return {ok:false,reason:'blocked'};}
    const value=this.state();
    if(!value?.vitals.pools){this.feedback('Сначала сохраните профиль персонажа');return {ok:false,reason:'profile'};}
    if(!this.anomalies.noCooldown&&now-this.lastCastAt<RADIAL_IMPULSE.cooldownMs){
      this.feedback('Откат навыка');
      return {ok:false,reason:'cooldown'};
    }
    const {gs,vitals}=value;
    const paid=this.anomalies.freeSkills
      ? {ok:true,spentJp:0,spentRp:0,next:vitals.pools.current}
      : spendImpulse(vitals.pools.current);
    if(!paid.ok){this.feedback(paid.reason);return {ok:false,reason:'resources'};}
    if(!this.anomalies.freeSkills)gs.setCharacterPools({...vitals.pools,current:paid.next});
    this.lastCastAt=now;
    if(paid.spentRp>0)this.fullRpSince=null;
    this.save?.();this.renderVitals?.();
    this.feedback('Импульс · '+(this.anomalies.freeSkills?'DEV без затрат':
      '−'+paid.spentJp.toFixed(1)+' ЖП · −'+paid.spentRp.toFixed(1)+' РП')+
      ' · 50 урона',true);
    // Animation calls onWave every frame with a fresh radius. Targets are hit
    // on crossing the expanding wave, once each; no invented monsters.
    const origin=this.animate?.({
      ...RADIAL_IMPULSE, getTargets:this.getTargets,
      hit:(targets,centre,radius,seen)=>applyPulseHits(targets,centre,radius,seen)
    });
    this.updateUI(now);
    return {ok:true,...paid,origin};
  }
  // Manual QA only: expose 4 pool depletion and refill without pretending
  // the world already has combat damage sources or altering balance formulas.
  executeDevCode(code) {
    const anomaly=DEV_SKILL_ANOMALIES.find(item=>item.code===code);
    if(anomaly){
      const active=this.setAnomaly(anomaly.key,!this.anomalies[anomaly.key]);
      return {handled:true,state:'ok',message:code+' · '+anomaly.label+
        ' · '+(active?'ВКЛ / ON':'ВЫКЛ / OFF')};
    }
    if(!['8661','8662','8674'].includes(code))return {handled:false};
    const state=this.state();
    if(!state?.vitals.pools)return {handled:true,state:'warn',
      message:code+' · Сначала сохраните профиль персонажа'};
    const {gs,vitals}=state;
    const current={};
    for(const key of POOL_KEYS) {
      const max=Math.max(0,vitals.values[key]||0);
      const drain={hp:20,pp:10,rp:15,jp:10}[key];
      current[key]=code==='8661'?Math.max(0,vitals.pools.current[key]-drain):max;
    }
    gs.setCharacterPools({...vitals.pools,current});
    this.fullRpSince=null;
    if(code==='8674')this.refillStamina?.();
    this.save?.();this.renderVitals?.();this.updateUI();
    this.feedback(code==='8661'?'DEV: списаны тестовые ХП/ПП/РП/ЖП':
      code==='8674'?'DEV: четыре ресурса и Stamina полностью восстановлены':
      'DEV: все четыре запаса восстановлены',true);
    return {handled:true,state:'ok',message:code==='8661'
      ?'8661 · тестовый расход четырёх ресурсов; наблюдайте регенерацию шаров'
      :code==='8674'?'8674 · ХП/ПП/РП/ЖП + Stamina 100%'
      :'8662 · все четыре ресурса пополнены'};
  }
  tick(now=Date.now()){
    if(this.lastTickAt===null){this.lastTickAt=now;this.updateUI(now);return;}
    const dt=Math.max(0,now-this.lastTickAt);this.lastTickAt=now;
    const value=this.state();
    if(!value?.vitals.pools){this.fullRpSince=null;this.updateUI(now);return;}
    const {gs,vitals}=value,current=vitals.pools.current,max=vitals.values;
    // Desire starts 3s after RP becomes completely full. Only while RP stays full.
    if(max.rp>0&&current.rp>=max.rp-1e-9){
      if(this.fullRpSince===null)this.fullRpSince=now;
    }else this.fullRpSince=null;
    const result=regenerateVitals(current,max,dt/1000,{
      desireAllowed:this.fullRpSince!==null&&now-this.fullRpSince>=3000
    });
    // The DEV safety floor is enforced even if a future damage path wrote 0.
    if(this.anomalies.immortal&&max.hp>=1)result.hp=Math.max(1,result.hp);
    if(POOL_KEYS.some(k=>result[k]!==current[k])){
      gs.setCharacterPools({...vitals.pools,current:result});
      this.renderVitals?.();
      // Throttle storage writes; skill casts are saved synchronously.
      if(now>=this.nextSaveAt){this.save?.();this.nextSaveAt=now+1000;}
    }
    if(now-this.lastUiAt>=50){this.updateUI(now);this.lastUiAt=now;}
  }
  feedback(message,ok=false){
    this.lastReason=message;
    const el=this.root.querySelector('#skill-hotbar-status');
    if(el){el.textContent=message;el.dataset.ok=ok?'true':'false';}
  }
  updateUI(now=Date.now()){
    const first=this.root.querySelector('[data-skill-slot="1"]');
    if(!first)return;
    const remain=this.anomalies.noCooldown?0:
      Math.max(0,RADIAL_IMPULSE.cooldownMs-(now-this.lastCastAt));
    first.style.setProperty('--skill-cooldown',((remain/RADIAL_IMPULSE.cooldownMs)*100)+'%');
    first.dataset.cooldownMs=String(Math.ceil(remain));
    const state=this.state();
    const pool=state?.vitals.pools?.current;
    first.dataset.affordable=this.anomalies.freeSkills||
      (pool&&pool.jp+pool.rp>=RADIAL_IMPULSE.cost)?'true':'false';
    first.dataset.freeSkills=this.anomalies.freeSkills?'true':'false';
  }
}
