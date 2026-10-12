// Runtime bookkeeping for accepted UGD-0038 level/attribute rules.
// No combat, quest XP, tree nodes or automatic stat allocations are created here.
export const MAX_CHARACTER_LEVEL=65;
export const STAT_KEYS=Object.freeze(['vyn','lov','intel']);
export const LEVEL_POINT_MILESTONES=Object.freeze({
  10:5,20:5,30:5,40:10,50:10,55:10,60:15,65:20
});
export const emptyCharacterAllocation=()=>({schemaVersion:1,spent:{vyn:0,lov:0,intel:0}});
export function normalizeCharacterAllocation(raw){
  const v=raw?.spent;
  if(raw?.schemaVersion!==1||!v||typeof v!=='object'||Array.isArray(v))return emptyCharacterAllocation();
  const spent={};
  for(const key of STAT_KEYS){
    if(!Number.isSafeInteger(v[key])||v[key]<0||v[key]>258)return emptyCharacterAllocation();
    spent[key]=v[key];
  }
  // An invalid legacy/tampered allocation cannot inject unlimited stats.
  if(spent.vyn+spent.lov+spent.intel>248)return emptyCharacterAllocation();
  return {schemaVersion:1,spent};
}
export function earnedAttributePoints(level){
  const target=Math.max(1,Math.min(65,Number.isInteger(level)?level:1));
  let points=0;
  for(let zrl=2;zrl<=target;zrl++)points+=LEVEL_POINT_MILESTONES[zrl]??3;
  return points;
}
export function allocationSummary(level,raw){
  const {spent}=normalizeCharacterAllocation(raw);
  const used=spent.vyn+spent.lov+spent.intel;
  const earned=earnedAttributePoints(level);
  return {spent,used,earned,free:Math.max(0,earned-used),
    passiveEarned:Math.max(0,Math.min(MAX_CHARACTER_LEVEL,level)-1),
    passiveRootFree:true};
}
export function spendCharacterAttribute(level,raw,stat){
  if(!STAT_KEYS.includes(stat))throw Error('Неизвестная характеристика');
  const info=allocationSummary(level,raw);
  if(info.free<1)throw Error('Нет свободных очков характеристик');
  return {schemaVersion:1,spent:{...info.spent,[stat]:info.spent[stat]+1}};
}
// ZRP is current-level XP, not total lifetime XP. Every overflow carries forward.
// If the curve is temporarily unavailable, preserve XP rather than invent a threshold.
export function settleCharacterExperience(progress,thresholds){
  let zrl=Number.isInteger(progress?.zrl)?Math.max(1,Math.min(65,progress.zrl)):1;
  let zrp=Number.isSafeInteger(progress?.zrp)&&progress.zrp>=0?progress.zrp:0;
  if(zrl===MAX_CHARACTER_LEVEL)return {schemaVersion:1,zrl,zrp:0,levelsGained:0,curveReady:true};
  let gained=0,ready=true;
  while(zrl<MAX_CHARACTER_LEVEL){
    const needed=thresholds?.[zrl];
    if(!Number.isSafeInteger(needed)||needed<=0){ready=false;break;}
    if(zrp<needed)break;
    zrp-=needed;
    zrl++;gained++;
  }
  if(zrl===MAX_CHARACTER_LEVEL)zrp=0;
  return {schemaVersion:1,zrl,zrp,levelsGained:gained,curveReady:ready};
}
export function awardCharacterExperience(progress,amount,thresholds){
  if(!Number.isSafeInteger(amount)||amount<0)throw Error('ЗРП: требуется неотрицательное целое число');
  if(progress?.zrl===MAX_CHARACTER_LEVEL)return settleCharacterExperience(progress,thresholds);
  const have=Number.isSafeInteger(progress?.zrp)&&progress.zrp>=0?progress.zrp:0;
  if(!Number.isSafeInteger(have+amount))throw Error('Превышен безопасный предел ЗРП');
  return settleCharacterExperience({...progress,zrp:have+amount},thresholds);
}
