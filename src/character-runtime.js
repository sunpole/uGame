import { characterDraftResult, normalizeCharacterDraft } from './character-draft.js';

export const CHARACTER_PROGRESS_SCHEMA_VERSION = 1;
export const CHARACTER_POOL_KEYS = Object.freeze(['hp','pp','rp','jp']);

// No XP is awarded yet: the progression curve and combat reward pipeline are not live.
export function normalizeCharacterProgress(raw) {
  const level = Number.isInteger(raw?.zrl) ? Math.max(1, Math.min(65, raw.zrl)) : 1;
  const zrp = Number.isSafeInteger(raw?.zrp) && raw.zrp >= 0 ? raw.zrp : 0;
  return { schemaVersion: CHARACTER_PROGRESS_SCHEMA_VERSION, zrl: level, zrp };
}
export function normalizeCharacterPools(raw) {
  if (!raw || raw.schemaVersion !== 1 || typeof raw.profileKey !== 'string'
      || !/^(force|focus|tempo|inspire):[0-5]$/.test(raw.profileKey)) return null;
  if (!raw.current || typeof raw.current !== 'object' || Array.isArray(raw.current)) return null;
  const current={};
  for (const key of CHARACTER_POOL_KEYS) {
    const amount=raw.current[key];
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return null;
    current[key]=amount;
  }
  return {schemaVersion:1,profileKey:raw.profileKey,current};
}
export function currentCharacterVitals(rules, player) {
  const draft=normalizeCharacterDraft(player?.characterDraft);
  const progress=normalizeCharacterProgress(player?.characterProgress);
  if (!draft || !rules) return {progress,draft:null,values:null,pools:null,mainResource:null,
    responsibility:player?.characterResponsibility ?? null};
  const computed=characterDraftResult(rules,draft,{
    level:progress.zrl,
    otv:player?.characterResponsibility
  }); // original shared Lab engine, including DEV-only candidate ZRL and OTV
  const values=computed.values;
  const profileKey=draft.cityId+':'+draft.startIndex;
  const saved=normalizeCharacterPools(player?.characterPools);
  const current={};
  for(const key of CHARACTER_POOL_KEYS) {
    const max=Math.max(0,Number(values[key])||0);
    current[key]=saved?.profileKey===profileKey ? Math.min(max,saved.current[key]) : max;
  }
  return {progress,draft,values,mainResource:computed.mainResource,
    responsibility:player?.characterResponsibility ?? null,
    pools:{schemaVersion:1,profileKey,current}};
}
export function poolRatio(current,max) {
  if (!Number.isFinite(current)||!Number.isFinite(max)||max<=0) return 0;
  return Math.max(0,Math.min(1,current/max));
}
export const formatCharacterNumber = value => new Intl.NumberFormat('ru-RU',{
  maximumFractionDigits:2
}).format(value ?? 0);

// No tick(), regen, skill costs or XP grants. No offline timestamps.
export class CharacterVitalsHUD {
  constructor({ getState, persist, root=document }={}) {
    this.getState=getState;
    this.persist=persist;
    this.root=root;
    this.rules=null;
  }
  async load() {
    const response=await fetch('./data/character-balance-candidate.json',{cache:'no-store'});
    if(!response.ok) throw Error('Character HUD rules '+response.status);
    this.rules=await response.json();
    this.render();
  }
  render() {
    const gameState=this.getState?.();
    if(!gameState) return null;
    const state=currentCharacterVitals(this.rules,gameState.state?.player);
    if(state.pools && JSON.stringify(gameState.state.player.characterPools)!==JSON.stringify(state.pools)){
      gameState.setCharacterPools(state.pools);
      this.persist?.();
    }
    for(const [key,overlay] of [['hp','pp'],['rp','jp']]){
      const container=this.root.querySelector('#character-orb-'+key);
      if(!container) continue;
      const max=state.values ? Math.max(0,state.values[key]) : 0;
      const current=state.pools?.current[key] ?? null;
      const overlayMax=state.values ? Math.max(0,state.values[overlay]) : 0;
      const overlayCurrent=state.pools?.current[overlay] ?? null;
      container.style.setProperty('--orb-percent',(100*poolRatio(current,max)).toFixed(2)+'%');
      container.style.setProperty('--overlay-angle',(360*poolRatio(overlayCurrent,overlayMax)).toFixed(2)+'deg');
      container.dataset.ready=state.values?'true':'false';
      container.dataset.current=current===null?'':String(current);
      container.dataset.max=state.values?String(max):'';
      container.dataset.overlayCurrent=overlayCurrent===null?'':String(overlayCurrent);
      container.dataset.overlayMax=state.values?String(overlayMax):'';
      container.querySelector('.orb-number').textContent=state.values
        ? formatCharacterNumber(current)+' / '+formatCharacterNumber(max) : '—';
      container.querySelector('.orb-overlay-number').textContent=state.values
        ? (overlay==='pp'?'ПП ':'ЖП ')+formatCharacterNumber(overlayCurrent)+'/'+formatCharacterNumber(overlayMax)
        : (overlay==='pp'?'ПП':'ЖП')+' —';
      container.title=state.values
        ? (key==='hp'?'ХП · здоровье':'РП · '+state.mainResource)+': '+
          formatCharacterNumber(current)+' / '+formatCharacterNumber(max)+'; '+
          (overlay==='pp'?'ПП · Покров':'ЖП · Желание')+': '+
          formatCharacterNumber(overlayCurrent)+' / '+formatCharacterNumber(overlayMax)+
          '. Коэффициенты пока кандидатные; боевые эффекты не включены.'
        : 'Выберите и сохраните профиль на экране «Характеристики».';
    }
    const lvl=this.root.querySelector('#character-level');
    const xp=this.root.querySelector('#character-xp');
    if(lvl)lvl.textContent='ЗРЛ '+state.progress.zrl+' / 65';
    if(xp)xp.textContent='ЗРП '+formatCharacterNumber(state.progress.zrp)+' · порог позже';
    return state;
  }
}
