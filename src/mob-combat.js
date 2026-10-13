// First PvE vertical slice: deterministic per-mob state. No global balance changes.
export const MOB_ATTACK_SPEED_UNIT = 100; // same provisional 100 units = 1 hit/sec notation as character lab
export const MOB_XP_HP_DIVISOR = 10; // candidate for the first ordinary mob only

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const distance = (a, b) => Math.hypot(finite(a.x)-finite(b.x), finite(a.y)-finite(b.y));

export function validateMob(def) {
  if (!def || typeof def.id !== 'string' || !def.id ||
      typeof def.name !== 'string' || !def.name ||
      !Number.isInteger(def.level) || def.level < 1 ||
      !def.spawn || !def.spawn.zoneId ||
      !Number.isFinite(def.spawn.x) || !Number.isFinite(def.spawn.y)) throw Error('Invalid mob identity/spawn');
  for (const key of ['hp','hps','speed','attackSpeed','critChance','critMultiplier','attack','attackRadius',
    'aggroRadius','socialRadius','chaseRadius','defense','evasion']) {
    if (!Number.isFinite(def[key]) || def[key] < 0) throw Error('Invalid mob stat: '+key);
  }
  if (def.hp <= 0 || def.chaseRadius <= 0 || def.critChance > 100 || def.critMultiplier < 1)
    throw Error('Invalid mob combat limits');
  return def;
}

export function mobExperience(def) {
  validateMob(def);
  return Math.floor(def.hp / MOB_XP_HP_DIVISOR);
}

export function createMobState(def, position = def.spawn) {
  validateMob(def);
  return { x:position.x, y:position.y, home:{x:position.x,y:position.y},
    hp:def.hp, alive:true, mode:'idle', alerted:false, attackCooldown:0, rewarded:false };
}
export function alertMob(state) {
  if (!state?.alive) return false;
  const changed = !state.alerted;
  state.alerted = true;
  state.mode = 'chase';
  return changed;
}
export function damageMob(state, def, amount, { random = Math.random } = {}) {
  if (!state?.alive || !Number.isFinite(amount) || amount <= 0) return {hit:false,killed:false,damage:0};
  if (random() * 100 < def.evasion) return {hit:false,killed:false,damage:0,evaded:true};
  const dealt = Math.max(1, Math.round(amount-def.defense));
  state.hp = Math.max(0, state.hp-dealt);
  const newlyAlerted = state.hp > 0 ? alertMob(state) : false;
  const killed = state.hp === 0;
  if (killed) {state.alive=false;state.mode='dead';state.alerted=false;}
  return {hit:true,killed,damage:dealt,newlyAlerted};
}
export function mobAttackDamage(def, random=Math.random) {
  const crit=random() * 100 < def.critChance;
  return {damage:Math.max(0,Math.round(def.attack * (crit ? def.critMultiplier : 1))),crit};
}
function toward(state,target,step,canMove) {
  const d=distance(state,target);
  if (!d) return false;
  const ratio=Math.min(1,step/d);
  const x=state.x+(target.x-state.x)*ratio,y=state.y+(target.y-state.y)*ratio;
  if (!canMove(x,y)) return false;
  state.x=x;state.y=y;
  return true;
}
// A chase radius is a *leash from spawn*, not the detection radius.
// Leaving that leash immediately cancels pursuit and eventually resets the mob.
export function tickMob(state,def,player,seconds,{canMove=()=>true,attack=()=>{},random=Math.random}={}) {
  if (!state?.alive) return state;
  const dt=Math.max(0,Math.min(0.1,finite(seconds)));
  state.attackCooldown=Math.max(0,state.attackCooldown-dt);
  if (state.hp<def.hp) state.hp=Math.min(def.hp,state.hp+def.hps*dt);
  const playerAlive=player && player.hp>0;
  const fromHome=playerAlive?distance(state.home,player):Infinity;
  if (state.mode==='chase' && (!playerAlive || fromHome>def.chaseRadius ||
      distance(state.home,state)>def.chaseRadius)) {
    state.mode='return';state.alerted=false;
  }
  if (state.mode==='idle' && def.aggressive && def.aggroRadius>0 &&
      playerAlive && distance(state,player)<=def.aggroRadius &&
      fromHome<=def.chaseRadius) alertMob(state);
  if (state.mode==='chase' && playerAlive) {
    const targetDistance=distance(state,player);
    if (targetDistance>def.attackRadius) {
      toward(state,player,Math.min(def.speed*dt,
        Math.max(0,targetDistance-def.attackRadius)),canMove);
    } else if (state.attackCooldown<=0 && def.attackSpeed>0 && def.attack>0) {
      attack(mobAttackDamage(def,random));
      state.attackCooldown=MOB_ATTACK_SPEED_UNIT/def.attackSpeed;
    }
  }
  if (state.mode==='return') {
    if (distance(state,state.home)<=1) {
      state.x=state.home.x;state.y=state.home.y;
      state.mode='idle';state.hp=def.hp;state.attackCooldown=0;
    } else toward(state,state.home,def.speed*dt,canMove);
  }
  return state;
}
