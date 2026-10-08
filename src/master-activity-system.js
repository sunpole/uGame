function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
const moduleFor={quest:'quest',special:'special-event',analytics:'analytics'};
const tierNumber=tier=>Math.max(1,Math.min(4,Number(String(tier||'T1').replace('T',''))||1));
export class MasterActivitySystem {
  constructor({config=null,onChange,onReward,getAnalyticsRank}={}){
    this.config=config;this.onChange=onChange;this.onReward=onReward;
    this.getAnalyticsRank=getAnalyticsRank;
    this.state={schemaVersion:1,encounters:{}};
  }
  async load(url='./data/master-activities.json'){
    if(this.config)return this;
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw Error('Master activities config failed: '+response.status);
    this.config=await response.json();
    return this;
  }
  initialize(snapshot=null){
    this.state={schemaVersion:1,encounters:{}};
    const source=snapshot?.encounters;
    if(source&&typeof source==='object'&&!Array.isArray(source)){
      for(const [id,x] of Object.entries(source).slice(-500)){
        if(!id||typeof id!=='string'||!x||typeof x!=='object')continue;
        this.state.encounters[id]={
          questAccepted:Boolean(x.questAccepted),
          questClaimed:Boolean(x.questClaimed),
          specialClaimed:Boolean(x.specialClaimed),
          analyticsClaimed:Boolean(x.analyticsClaimed)
        };
      }
    }
    return this.snapshot();
  }
  snapshot(){return clone(this.state);}
  entry(spawn){
    if(!spawn?.encounterId)return null;
    if(!this.state.encounters[spawn.encounterId]){
      this.state.encounters[spawn.encounterId]={
        questAccepted:false,questClaimed:false,specialClaimed:false,analyticsClaimed:false
      };
    }
    return this.state.encounters[spawn.encounterId];
  }
  authorized(spawn,type){
    return Boolean(spawn?.encounterId && this.config && Array.isArray(spawn.activeModules)
      && spawn.activeModules.includes(moduleFor[type]));
  }
  progress(spawn,type,run){
    if(!this.authorized(spawn,type))return {available:false,reason:'module-not-active'};
    const entry=this.entry(spawn);
    const cfg=this.config[type];
    const extracted=run?.encounterId===spawn.encounterId?Math.max(0,Math.floor(run.extractedUnits||0)):0;
    const precisionHits=run?.encounterId===spawn.encounterId?Math.max(0,Math.floor(run.precisionHits||0)):0;
    const rank=this.getAnalyticsRank?.(spawn.resourceDirectionId)||0;
    if(type==='quest')return {
      available:true,accepted:entry.questAccepted,claimed:entry.questClaimed,
      current:Math.min(extracted,cfg.targetUnits),target:cfg.targetUnits,
      ready:entry.questAccepted&&extracted>=cfg.targetUnits&&!entry.questClaimed
    };
    if(type==='special')return {
      available:true,claimed:entry.specialClaimed,current:Math.min(precisionHits,cfg.precisionHits),
      target:cfg.precisionHits,ready:precisionHits>=cfg.precisionHits&&!entry.specialClaimed
    };
    return {
      available:true,claimed:entry.analyticsClaimed,rank,
      requiredRank:cfg.minRank,current:Math.min(extracted,cfg.minExtractedUnits),
      target:cfg.minExtractedUnits,ready:rank>=cfg.minRank&&extracted>=cfg.minExtractedUnits&&!entry.analyticsClaimed
    };
  }
  acceptQuest(spawn){
    if(!this.authorized(spawn,'quest'))return {ok:false,reason:'module-not-active'};
    const entry=this.entry(spawn);
    if(entry.questAccepted)return {ok:false,reason:'already-accepted'};
    entry.questAccepted=true;
    this.publish();
    return {ok:true};
  }
  claim(spawn,type,run){
    if(!['quest','special','analytics'].includes(type))return {ok:false,reason:'unknown'};
    const status=this.progress(spawn,type,run);
    if(!status.available||!status.ready)return {ok:false,reason:status.claimed?'already-claimed':'requirements'};
    const entry=this.entry(spawn);
    const key=type==='quest'?'questClaimed':type==='special'?'specialClaimed':'analyticsClaimed';
    if(entry[key])return {ok:false,reason:'already-claimed'};
    const tier=tierNumber(spawn.tier),cfg=this.config[type];
    const reward={
      type,encounterId:spawn.encounterId,masterId:spawn.masterId,resourceDirectionId:spawn.resourceDirectionId,
      steps:tier*Math.max(0,Math.floor(cfg.stepsPerMasterTier)),
      professionXp:tier*Math.max(0,Math.floor(cfg.professionXpPerMasterTier)),
      reputationXp:type==='analytics'?0:tier*Math.max(0,Math.floor(cfg.reputationXpPerMasterTier)),
      itemId:type==='special'?cfg.itemId:null
    };
    // Set the guard before callbacks; rollback on errors. Callbacks are synchronous.
    entry[key]=true;
    try {
      if(this.onReward?.(reward)!==true){
        entry[key]=false;
        return {ok:false,reason:'inventory-full'};
      }
    } catch {
      entry[key]=false;
      return {ok:false,reason:'reward-failed'};
    }
    this.publish();
    return {ok:true,reward};
  }
  publish(){this.onChange?.(this.snapshot());}
}
