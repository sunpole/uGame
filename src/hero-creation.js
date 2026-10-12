import { GameState } from './game-state.js';
import { initializeHeroProfile } from './hero-start-profile.js';
import { normalizeHeroIdentity, heroPortraitPath, HERO_CAPITAL_BY_ARCHETYPE } from './hero-identity.js';

export const HERO_SAVE_KEY = 'ugame.save.v1';
export const HERO_BACKUP_PREFIX = 'ugame.save.v1.hero-backup.';
export const HERO_ARCHETYPES = Object.freeze([
  Object.freeze({id:'plate',name:'Латный воин',subtitle:'Латы и меч'}),
  Object.freeze({id:'leather',name:'Бретёр',subtitle:'Кожа и сталь'}),
  Object.freeze({id:'cloth',name:'Служитель',subtitle:'Ткань и посох'}),
  Object.freeze({id:'hybrid',name:'Воин духовного сана',subtitle:'Вера, ткань и броня'})
]);
export function makeNewHeroState(identity) {
  const checked=normalizeHeroIdentity({...identity,schemaVersion:1,
    capitalId: identity?.capitalId ?? HERO_CAPITAL_BY_ARCHETYPE[identity?.archetype]});
  if(!checked)throw Error('Имя: от 2 до 24 символов; выберите образ и пол');
  const game=new GameState();
  game.setHeroIdentity(checked);
  // Reuse the EXISTING character candidate engine rather than inventing live coefficients.
  return initializeHeroProfile(game.snapshot()).state;
}
export function storedHero(storage) {
  let raw;
  try{raw=storage?.getItem(HERO_SAVE_KEY);}catch{return {kind:'unavailable'};}
  if(raw==null)return {kind:storage?'empty':'unavailable'};
  try{
    const data=JSON.parse(raw);
    if(!data || data.schemaVersion!==1 || !data.player || typeof data.player!=='object')
      return {kind:'invalid'};
    return {kind:'existing',raw,identity:normalizeHeroIdentity(data.player.heroIdentity),
      savedAt:data.savedAt||null};
  }catch{return {kind:'invalid'};}
}
function stamp() {
  return new Date().toISOString().replace(/[:.]/g,'-');
}
export function archiveAndReplace(storage,originalRaw,replacementState) {
  if(!storage)throw Error('Хранилище браузера недоступно — сохранение невозможно');
  const before=storage.getItem(HERO_SAVE_KEY);
  if(before!==originalRaw)throw Error('Сохранение изменилось. Перезагрузите страницу.');
  let backupKey=null;
  if(before!==null) {
    backupKey=HERO_BACKUP_PREFIX+stamp();
    if(storage.getItem(backupKey)!==null)throw Error('Имя резервной копии уже существует');
    // Backup first. If storage is full, do not replace the original save.
    storage.setItem(backupKey,before);
  }
  try{
    const record={...replacementState,schemaVersion:1,savedAt:new Date().toISOString()};
    storage.setItem(HERO_SAVE_KEY,JSON.stringify(record));
    return {backupKey,record};
  }catch(error){
    if(before!==null)storage.setItem(HERO_SAVE_KEY,before);
    else storage.removeItem(HERO_SAVE_KEY);
    throw error;
  }
}
function latestBackup(storage){
  try{
    const keys=[];
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i);
      if(key?.startsWith(HERO_BACKUP_PREFIX))keys.push(key);
    }
    return keys.sort().at(-1)||null;
  }catch{return null;}
}
function setText(root,selector,text) {
  const el=root.querySelector(selector);if(el)el.textContent=text;
}
export function openHeroEntrance({root=document,storage}={}) {
  // Accessing localStorage itself can throw SecurityError (private/sandbox mode).
  if(storage===undefined) {
    try { storage=globalThis.localStorage; } catch { storage=null; }
  }
  const gate=root.querySelector('#hero-entrance');
  if(!gate)return Promise.reject(new Error('Не найден экран выбора героя'));
  const saved=storedHero(storage);
  const originalRaw=saved.raw??null;
  const panel=gate.querySelector('#hero-create-panel');
  const chooser=gate.querySelector('#hero-choose-panel');
  const continueButton=gate.querySelector('#hero-continue');
  const restoreButton=gate.querySelector('#hero-restore');
  const nameInput=gate.querySelector('#hero-name');
  const portraits=[...gate.querySelectorAll('[data-hero-image]')];
  const status=gate.querySelector('#hero-message');
  const consent=gate.querySelector('#hero-replace-confirm');
  let archetype='plate', gender='male';
  const preview=()=>{
    // All four portraits update together; no per-card gender mismatch.
    for(const portrait of portraits){
      const target=heroPortraitPath(portrait.dataset.heroImage,gender);
      if(target&&portrait.getAttribute('src')!==target)portrait.src=target;
      const name=HERO_ARCHETYPES.find(item=>item.id===portrait.dataset.heroImage)?.name||'Герой';
      portrait.alt=name+(gender==='female'?' — женский образ':' — мужской образ');
    }
    for(const button of gate.querySelectorAll('[data-hero-archetype]'))
      button.setAttribute('aria-pressed',String(button.dataset.heroArchetype===archetype));
    for(const button of gate.querySelectorAll('[data-hero-gender]'))
      button.setAttribute('aria-pressed',String(button.dataset.heroGender===gender));
  };
  setText(gate,'#hero-existing-name',saved.kind==='existing'?
    (saved.identity?.name||'Герой из предыдущей версии'):'Новый герой');
  setText(gate,'#hero-last-save',saved.savedAt?
    'Сохранено: '+new Date(saved.savedAt).toLocaleString('ru-RU'):'');
  setText(gate,'#hero-help',saved.kind==='existing'?
    'Текущая игра останется без изменений, если выбрать «Продолжить».':
    'Создайте героя один раз. Позже игра будет предлагать продолжить.');
  continueButton.hidden=saved.kind!=='existing';
  restoreButton.hidden=!latestBackup(storage);
  chooser.hidden=saved.kind==='empty';
  panel.hidden=saved.kind!=='empty';
  if(saved.kind==='invalid'||saved.kind==='unavailable'){
    panel.hidden=true;chooser.hidden=false;continueButton.hidden=false;
    continueButton.textContent='Играть без сохранения';
    gate.querySelector('#hero-new').hidden=true;
    setText(gate,'#hero-help','Сохранение повреждено или хранилище недоступно. Вы можете играть временно без сохранения; старые данные не будут удалены или перезаписаны.');
  }
  gate.hidden=false;
  preview();
  const showCreate=()=>{
    chooser.hidden=true;panel.hidden=false;nameInput.focus();
    consent.checked=false;
    gate.querySelector('#hero-consent-line').hidden=saved.kind!=='existing';
    status.textContent='';
  };
  if(saved.kind==='empty')gate.querySelector('#hero-consent-line').hidden=true;
  const showChoose=()=>{panel.hidden=true;chooser.hidden=false;status.textContent='';};
  return new Promise(resolve=>{
    const finish=(mode)=>{gate.hidden=true;resolve(mode);};
    continueButton.onclick=()=>{
      try{
        if(saved.kind==='existing'&&saved.identity){
          const old=JSON.parse(originalRaw);
          const seeded=initializeHeroProfile(old);
          if(seeded.changed)archiveAndReplace(storage,originalRaw,seeded.state);
        }
        finish('continue');
      }catch(error){
        // Never discard the old v0.2.70 save if quota/crypto prevents migration.
        setText(gate,'#hero-help','Не удалось создать профиль: '+
          (error?.message||error)+'. Старое сохранение не изменено.');
      }
    };
    gate.querySelector('#hero-new').onclick=showCreate;
    gate.querySelector('#hero-back').onclick=showChoose;
    for(const button of gate.querySelectorAll('[data-hero-archetype]'))
      button.onclick=()=>{archetype=button.dataset.heroArchetype;preview();};
    for(const button of gate.querySelectorAll('[data-hero-gender]'))
      button.onclick=()=>{gender=button.dataset.heroGender;preview();};
    nameInput.oninput=()=>{status.textContent='';};
    gate.querySelector('#hero-create-form').onsubmit=(event)=>{
      event.preventDefault();
      try{
        if(saved.kind==='existing'&&!consent.checked)
          throw Error('Подтвердите создание нового героя вместо текущего');
        const state=makeNewHeroState({name:nameInput.value,archetype,gender});
        archiveAndReplace(storage,originalRaw,state);
        finish('created');
      }catch(error){status.textContent=error.message||String(error);}
    };
    restoreButton.onclick=()=>{
      try{
        const key=latestBackup(storage);
        if(!key||!confirm('Восстановить предыдущего героя? Текущая игра будет сохранена в резервную копию.'))return;
        const backup=storage.getItem(key);
        const parsed=JSON.parse(backup);
        if(parsed?.schemaVersion!==1)throw Error('Архив имеет неподдерживаемую версию');
        archiveAndReplace(storage,originalRaw,parsed);
        finish('restored');
      }catch(error){setText(gate,'#hero-help',error.message||String(error));}
    };
  });
}
