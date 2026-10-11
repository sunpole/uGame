import { currentCharacterVitals, normalizeCharacterPools } from './character-runtime.js';

export const SKILL_SLOT_COUNT = 7;
export const RADIAL_IMPULSE = Object.freeze({
  slot:1, cost:35, cooldownMs:300, durationMs:300, startRadius:1, radius:75, damage:50
});
const POOL_KEYS=Object.freeze(['hp','pp','rp','jp']);
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
    canCast=()=>true,root=document}={}){
    Object.assign(this,{getGameState,getRules,save,renderVitals,animate,getTargets,canCast,root});
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
    this.updateUI();
  }
  destroy(){
    this.root.removeEventListener('keydown',this.boundKey);
    this.root.querySelector('#skill-hotbar')?.removeEventListener('click',this.boundClick);
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
  cast(slot,now=Date.now()){
    if(slot!==1){this.feedback('Слот '+slot+' пока свободен');return {ok:false,reason:'empty'};}
    if(!this.canCast()){this.feedback('Навык доступен только в игровом мире');return {ok:false,reason:'blocked'};}
    const value=this.state();
    if(!value?.vitals.pools){this.feedback('Сначала сохраните профиль персонажа');return {ok:false,reason:'profile'};}
    if(now-this.lastCastAt<RADIAL_IMPULSE.cooldownMs){
      this.feedback('Откат навыка');
      return {ok:false,reason:'cooldown'};
    }
    const {gs,vitals}=value;
    const paid=spendImpulse(vitals.pools.current);
    if(!paid.ok){this.feedback(paid.reason);return {ok:false,reason:'resources'};}
    gs.setCharacterPools({...vitals.pools,current:paid.next});
    this.lastCastAt=now;
    if(paid.spentRp>0)this.fullRpSince=null;
    this.save?.();this.renderVitals?.();
    this.feedback('Импульс · −'+paid.spentJp.toFixed(1)+' ЖП · −'+
      paid.spentRp.toFixed(1)+' РП · 50 урона',true);
    // Animation calls onWave every frame with a fresh radius. Targets are hit
    // on crossing the expanding wave, once each; no invented monsters.
    const origin=this.animate?.({
      ...RADIAL_IMPULSE, getTargets:this.getTargets,
      hit:(targets,centre,radius,seen)=>applyPulseHits(targets,centre,radius,seen)
    });
    this.updateUI(now);
    return {ok:true,...paid,origin};
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
    const remain=Math.max(0,RADIAL_IMPULSE.cooldownMs-(now-this.lastCastAt));
    first.style.setProperty('--skill-cooldown',((remain/RADIAL_IMPULSE.cooldownMs)*100)+'%');
    first.dataset.cooldownMs=String(Math.ceil(remain));
    const state=this.state();
    const pool=state?.vitals.pools?.current;
    first.dataset.affordable=pool&&pool.jp+pool.rp>=RADIAL_IMPULSE.cost?'true':'false';
  }
}
