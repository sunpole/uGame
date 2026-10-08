function clone(value) { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
const directions = new Set(['stone', 'wood', 'water', 'clay']);
const skills = ['tier', 'extraction', 'analytics', 'efficiency'];
const nonnegative = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
function cleanDirection(raw) {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const points = {};
  for (const id of skills) points[id] = Math.min(id === 'tier' ? 7 : 5, nonnegative(value.skills?.[id]));
  return {
    xp: Math.min(1_000_000_000, nonnegative(value.xp)),
    skills: points,
    trainingEncounters: Array.isArray(value.trainingEncounters)
      ? [...new Set(value.trainingEncounters.filter(x=>typeof x==='string'&&x))].slice(-300) : [],
    buffs: value.buffs && typeof value.buffs === 'object'
      ? Object.fromEntries(Object.entries(value.buffs)
        .filter(([id,expiresAt])=>['gathering-food','gathering-tonic'].includes(id) && Number.isSafeInteger(expiresAt)&&expiresAt>0))
      : {},
    expeditionCount: nonnegative(value.expeditionCount),
    harvestedUnits: nonnegative(value.harvestedUnits),
    manualAttempts: nonnegative(value.manualAttempts),
    autoCycles: nonnegative(value.autoCycles)
  };
}
export class ResourceProfessionSystem {
  constructor({config=null,onChange}={}) {
    this.config=config;
    this.onChange=onChange;
    this.state={schemaVersion:1,directions:{}};
  }
  async load(url='./data/resource-professions.json') {
    if(this.config)return this;
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw Error('Resource professions config failed: '+response.status);
    this.config=await response.json();
    return this;
  }
  initialize(snapshot=null) {
    this.state={schemaVersion:1,directions:{}};
    for(const direction of directions) {
      this.state.directions[direction]=cleanDirection(snapshot?.directions?.[direction]);
    }
    return this.snapshot();
  }
  snapshot(){return clone(this.state);}
  get(id){return directions.has(id)?clone(this.state.directions[id]||cleanDirection(null)):null;}
  raw(id){if(!directions.has(id))return null;if(!this.state.directions[id])this.state.directions[id]=cleanDirection(null);return this.state.directions[id];}
  level(id) {
    const raw=this.raw(id);
    return raw ? Math.min(Number(this.config?.professionLevelMax)||20,1+Math.floor(Math.sqrt(raw.xp/40))) : 0;
  }
  availablePoints(id) {
    const raw=this.raw(id);
    return raw ? Math.max(0,(this.level(id)-1)*(Number(this.config?.skillPointsPerLevel)||1)
      - skills.reduce((sum,key)=>sum+raw.skills[key],0)):0;
  }
  requirement(tier){return this.config?.tierRequirements?.find(x=>x.tier===tier)||null;}
  trainedTier(id){const raw=this.raw(id);return raw?'T'+(1+raw.skills.tier):null;}
  access(id,tier,relationshipLevel=0) {
    const raw=this.raw(id),req=this.requirement(tier);
    if(!raw||!req)return {ok:false,reason:'invalid'};
    const level=this.level(id),reputation=nonnegative(relationshipLevel);
    const rank=raw.skills.tier;
    return {
      ok: rank+1>=Number(tier.slice(1)) && level>=req.professionLevel && reputation>=req.reputationLevel,
      level,reputation,rank,
      requiredLevel:req.professionLevel,requiredReputation:req.reputationLevel,
      requiredRank:Number(tier.slice(1))-1
    };
  }
  invest(id,skillId) {
    const raw=this.raw(id),node=this.config?.skillNodes?.find(x=>x.id===skillId);
    if(!raw||!node)return {ok:false,reason:'unknown'};
    if(raw.skills[skillId]>=node.maxRank)return {ok:false,reason:'max'};
    if(this.availablePoints(id)<=0)return {ok:false,reason:'no-points'};
    if(skillId==='tier') {
      const nextRank=raw.skills.tier+1;
      const target=this.requirement('T'+(nextRank+1));
      if(this.level(id)<Number(target?.professionLevel))return {ok:false,reason:'level',requiredLevel:target.professionLevel};
    }
    raw.skills[skillId]+=1;
    this.publish();
    return {ok:true,rank:raw.skills[skillId],points:this.availablePoints(id)};
  }
  addXp(id,rawAmount,{kind='manual',units=0,cycles=1}={}) {
    const raw=this.raw(id),amount=nonnegative(rawAmount);
    if(!raw||amount<=0)return 0;
    const bonus=1+raw.skills.analytics*.10;
    const granted=Math.max(1,Math.round(amount*bonus));
    raw.xp=Math.min(1_000_000_000,raw.xp+granted);
    raw.harvestedUnits+=nonnegative(units);
    if(kind==='auto')raw.autoCycles+=nonnegative(cycles);
    else raw.manualAttempts+=1;
    this.publish();
    return granted;
  }
  recordExpedition(id) {
    const raw=this.raw(id);
    if(!raw)return;
    raw.expeditionCount+=1;
    this.publish();
  }
  practice(spawn,{onReputation}={}) {
    const id=spawn?.resourceDirectionId;
    const raw=this.raw(id);
    if(!raw||!spawn?.encounterId||!Array.isArray(spawn.activeModules) || !spawn.activeModules.includes('training'))
      return {ok:false,reason:'module-not-active'};
    if(raw.trainingEncounters.includes(spawn.encounterId))return {ok:false,reason:'already-trained'};
    const xp=Number(this.config?.trainingReputationXpByTier?.[spawn.tier])||40;
    raw.trainingEncounters.push(spawn.encounterId);
    raw.trainingEncounters=raw.trainingEncounters.slice(-300);
    this.publish();
    onReputation?.(spawn.masterId,xp);
    this.addXp(id,Math.round(xp/3),{kind:'training'});
    return {ok:true,reputationXp:xp,professionXp:Math.round(xp/3)};
  }
  activateBuff(id,itemId,now=Date.now()) {
    const raw=this.raw(id),buff=this.config?.buffItems?.find(x=>x.id===itemId);
    if(!raw||!buff)return {ok:false,reason:'unknown-buff'};
    if(raw.buffs[itemId] && raw.buffs[itemId]>now)return {ok:false,reason:'already-active'};
    raw.buffs[itemId]=now+Math.round(buff.durationSeconds*1000);
    this.publish();
    return {ok:true,expiresAt:raw.buffs[itemId]};
  }
  modifiers(id,{now=Date.now(),hasTool=false}={}) {
    const raw=this.raw(id);
    if(!raw)return {yieldMultiplier:1,xpMultiplier:1,stepsMultiplier:1,autoRateMultiplier:1};
    const buffs=raw.buffs;
    const tonic=Number(buffs['gathering-tonic']||0)>now;
    const food=Number(buffs['gathering-food']||0)>now;
    return {
      yieldMultiplier:(tonic?1.3:1)*(hasTool?1.15:1),
      xpMultiplier:food?1.25:1,
      stepsMultiplier:Math.max(.5,1-raw.skills.efficiency*.1),
      autoRateMultiplier:1+raw.skills.extraction*.05,
      manualExtraUnits:Math.floor(raw.skills.extraction/2),
      toolActive:Boolean(hasTool),
      foodActive:food,tonicActive:tonic
    };
  }
  publish(){this.onChange?.(this.snapshot());}
}
