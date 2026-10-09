// Read-only balance diagnostics. Never changes RNG, rotation or caps.
const RESOURCE_IDS = ['stone','wood','water','clay'];
export const MASTER_RESOURCE_LABELS = Object.freeze({
  stone:'Камень',wood:'Дерево',water:'Вода',clay:'Глина'
});
export function tierChance(weights, tier) {
  const entries=Object.entries(weights||{}).map(([id,value])=>[id,Number(value)])
    .filter(([,value])=>Number.isFinite(value)&&value>0);
  const total=entries.reduce((sum,[,weight])=>sum+weight,0);
  if(!total)return 0;
  const weight=entries.find(([id])=>id===tier)?.[1]||0;
  return 100*weight/total;
}
export function masterChanceByDistance(config,distance,tier='T4') {
  const bands=config?.distanceBands||[];
  const band=bands.find(x=>Number(distance)>=Number(x.min)&&Number(distance)<=Number(x.max));
  if(!band)return null;
  const entries=Object.entries(band.weights||{});
  const total=entries.reduce((sum,[,weight])=>sum+Math.max(0,Number(weight)||0),0);
  if(!total)return 0;
  return entries.reduce((sum,[locationTier,weight])=>{
    const share=Math.max(0,Number(weight)||0)/total;
    return sum+share*tierChance(config?.masterTierByLocationTier?.[locationTier],tier);
  },0);
}
export function masterRarityReport({masters=[],zones={},config=null}={}) {
  const active=Array.isArray(masters)?masters:[];
  const zoneList=Object.values(zones||{}).filter(zone=>!zone.isSafeCity);
  const caps=config?.worldCapsPerResource||{};
  const byResource=RESOURCE_IDS.map(id=>{
    const inWorld=active.filter(spawn=>spawn.resourceDirectionId===id);
    const eligible=zoneList.filter(zone=>zone.resourceDirections?.includes(id));
    const counts=Object.fromEntries(['T1','T2','T3','T4'].map(tier=>[tier,inWorld.filter(x=>x.tier===tier).length]));
    const expectedT4=eligible.reduce((sum,zone)=>{
      const locTier=zone.location?.tier;
      return sum+tierChance(config?.masterTierByLocationTier?.[locTier], 'T4')/100;
    },0);
    return {id,label:MASTER_RESOURCE_LABELS[id],eligibleZones:eligible.length,active:inWorld.length,
      counts,expectedT4:eligible.length?expectedT4:null,
      t3Cap:Number(caps.T3)||null,t4Cap:Number(caps.T4)||null};
  });
  const distances=[...new Set(zoneList.map(zone=>Number(zone.location?.distanceFromSafeCity))
    .filter(v=>Number.isFinite(v)&&v>0))].sort((a,b)=>a-b);
  return {
    byResource,
    locationTierT1Chance:tierChance(config?.masterTierByLocationTier?.T1,'T4'),
    byDistance:distances.map(distance=>({
      distance,zoneCount:zoneList.filter(z=>Number(z.location?.distanceFromSafeCity)===distance).length,
      t4Chance:masterChanceByDistance(config,distance,'T4')
    })),
    hasConfig:Boolean(config?.masterTierByLocationTier)
  };
}
