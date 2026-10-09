import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WorldSpawnStateSystem } from '../src/world-spawn-state-system.js';
import { MasterProcessSystem } from '../src/master-process-system.js';
import { CharacterMasterRelationshipSystem } from '../src/character-master-relationship-system.js';
import { InteractableSystem, masterFarewellDisplay } from '../src/interactable-system.js';
import { ResourceExpeditionView } from '../src/resource-expedition-view.js';

const spawn=(encounterId='reward-and-expedition')=>({
  masterId:'stone-master-t1',encounterId,zoneId:'loc-test',spotId:'spot-test',
  tier:'T1',resourceDirectionId:'stone',activeModules:['expedition','extraction'],
  expiresAt:300_000,expeditionCompletedAt:0
});
function worldWith(spawnValue) {
  const world=new WorldSpawnStateSystem({worldGraph:{
    zones:new Map(),resourceDirectionsFor:()=>[]},masterCatalog:{loaded:true},eventSystem:{on(){},emit(){}}
  });
  world.initialized=true;
  world.config={worldCapsPerResource:{T2:3,T3:2,T4:1}};
  world.state.activeMasterSpawns=[{...spawnValue}];
  return world;
}
test('Expedition depleted during running reward waits for Process before 30s farewell',()=>{
  const world=worldWith(spawn('sequential-a'));
  const done=80_000,processEndsAt=110_000;
  assert.equal(world.markExpeditionDepleted('sequential-a',done,30_000,processEndsAt),true);
  const result=world.getMasterSpawn('sequential-a');
  assert.equal(result.masterFarewellStartsAt,processEndsAt);
  assert.equal(result.expeditionCompletedAt,done);
  assert.equal(result.expiresAt,140_000);
  assert.equal(world.markExpeditionDepleted('sequential-a',90_000,30_000,160_000),false);
  const asItem={...result,masterRewardState:'running',masterProcessEndsAt:processEndsAt};
  assert.deepEqual(masterFarewellDisplay(asItem,90_000),{
    waiting:true,text:'УХОЖУ ПОСЛЕ НАГРАДЫ',visible:true
  });
  assert.equal(masterFarewellDisplay(asItem,90_500).visible,false);
  assert.equal(masterFarewellDisplay({...asItem,masterRewardState:'ready'},109_999).waiting,true);
  assert.deepEqual(masterFarewellDisplay({...asItem,masterRewardState:'ready'},110_000),{
    waiting:false,text:'УХОЖУ ЧЕРЕЗ 00:30',visible:true
  });
  assert.equal(masterFarewellDisplay({...asItem,masterRewardState:'ready'},125_000).text,'УХОЖУ ЧЕРЕЗ 00:15');
  assert.equal(masterFarewellDisplay({...asItem,masterRewardState:'ready'},140_000).text,'УХОЖУ ЧЕРЕЗ 00:00');
});
test('Process started after depleted mine receives full 60s and extends saved NPC deadline',()=>{
  const world=worldWith(spawn('sequential-late'));
  const relationship=new CharacterMasterRelationshipSystem();
  relationship.initialize();
  world.markExpeditionDepleted('sequential-late',80_000,30_000);
  assert.equal(world.getMasterSpawn('sequential-late').expiresAt,110_000);
  const process=new MasterProcessSystem({relationshipSystem:relationship,worldSpawnStateSystem:world,
    interactionPanel:{showActions(){},showMessage(){}},grantResource:()=>true});
  process.profiles.set('stone-basic',{
    id:'stone-basic',resourceDirectionId:'stone',moduleId:'extraction',
    label:'Бесплатный камень',durationSeconds:60,rewardRangeKg:{min:.1,max:.1}
  });
  const late=world.getMasterSpawn('sequential-late');
  assert.equal(process.openExtraction(late,90_000),true);
  const active=relationship.getActiveProcess(late.masterId);
  assert.equal(active.endsAt,150_000,'full 60s, not 20s truncated to original NPC lifetime');
  assert.equal(world.getMasterSpawn('sequential-late').masterFarewellStartsAt,150_000);
  assert.equal(world.getMasterSpawn('sequential-late').expiresAt,180_000);
  process.update(150_001,true);
  assert.equal(relationship.getActiveProcess(late.masterId),null);
  assert.equal(relationship.getPendingRewards(late.masterId).length,1,
    'reward remains pending, not cancelled by old NPC expiry');
});
test('Offline restore keeps farewell queued until Process end and expires strictly after +30s',()=>{
  const original=worldWith(spawn('offline-seq'));
  original.markExpeditionDepleted('offline-seq',50_000,30_000,120_000);
  const snapshot=original.snapshot();
  const restored=worldWith(spawn('offline-seq'));
  restored.state=snapshot;
  restored.refreshMasterSpawns(100_000,{publish:false});
  assert.ok(restored.getMasterSpawn('offline-seq'));
  restored.refreshMasterSpawns(140_000,{publish:false});
  assert.ok(restored.getMasterSpawn('offline-seq'));
  restored.refreshMasterSpawns(149_999,{publish:false});
  assert.ok(restored.getMasterSpawn('offline-seq'));
  restored.refreshMasterSpawns(150_000,{publish:false});
  assert.equal(restored.getMasterSpawn('offline-seq'),null);
});
test('The Phaser NPC shows one numeric Process timer and a flashing nonnumeric departure warning',()=>{
  const objects=[];
  function element(x,y,name='draw') {
    const o={
      x,y,name,active:true,text:'',visible:true,
      width:34,height:40,alpha:1,
      setDepth(){return this;},setOrigin(){return this;},setName(n){this.name=n;return this;},
      setSize(){return this;},setStrokeStyle(){return this;},
      setScale(){return this;},setRotation(){return this;},
      setText(value){this.text=String(value);return this;},
      setPosition(a,b){this.x=a;this.y=b;return this;},
      setVisible(value){this.visible=Boolean(value);return this;},
      add(){return this;},destroy(){this.active=false}
    };
    objects.push(o);return o;
  }
  const scene={
    add:{
      ellipse:(x,y)=>element(x,y,'ellipse'),circle:(x,y)=>element(x,y,'circle'),
      container:(x,y)=>element(x,y,'container'),text:(x,y,text)=>{const o=element(x,y,'text');o.text=String(text);return o;}
    },
    tweens:{add(){},killTweensOf(){}}
  };
  const sys=new InteractableSystem({scene});
  const npc=sys.add({id:'master-interactable:seq',type:'master-npc',label:'Камень',
    x:200,y:200,masterTier:'T1',masterEncounterId:'seq',
    masterRewardState:'running',masterRewardAvailable:true,
    masterProcessEndsAt:110_000,masterExpeditionCompletedAt:80_000,
    masterFarewellStartsAt:110_000,expiresAt:140_000});
  assert.equal(npc._timerLabel,undefined,'no third generic NPC TTL during farewell');
  assert.ok(npc._masterProcessTimer);
  assert.ok(npc._masterExpeditionTimer);
  sys.updateCountdowns(90_000);
  assert.equal(npc._masterProcessTimer.text,'00:20');
  assert.equal(npc._masterExpeditionTimer.text,'УХОЖУ ПОСЛЕ НАГРАДЫ');
  assert.equal(npc._masterExpeditionTimer.visible,true);
  sys.updateCountdowns(90_500);
  assert.equal(npc._masterExpeditionTimer.visible,false);
  sys.setMasterRewardState(npc,'ready');
  sys.updateCountdowns(110_000);
  assert.equal(npc._masterProcessTimer,null);
  assert.equal(npc._masterExpeditionTimer.text,'УХОЖУ ЧЕРЕЗ 00:30');
  assert.equal(npc._masterExpeditionTimer.visible,true);
  sys.setItemTransform(npc,{x:250,y:230});
  assert.equal(npc._masterExpeditionTimer.y,117);
  const timer=npc._masterExpeditionTimer;
  assert.equal(sys.remove(npc.id),true);
  assert.equal(timer.active,false);
});
test('Legacy saved depleted NPC without queued-start field still counts down normally',()=>{
  const legacy={expeditionCompletedAt:10_000,expiresAt:40_000,masterRewardState:'claimed'};
  assert.deepEqual(masterFarewellDisplay(legacy,10_000),{
    waiting:false,text:'УХОЖУ ЧЕРЕЗ 00:30',visible:true
  });
});
test('Expedition view toggles manual/finished UI within one reserved activity slot',()=>{
  const fields=new Map();
  for(const id of ['manual-zone','activity-placeholder','active-controls','result-controls',
    'bar','pointer','percent','tier'])fields.set(id,{hidden:false,style:{},setAttribute(){}});
  const run={resourceId:'stone',tier:'T1',status:'active',mode:'paused',stockUnits:100,
    initialUnits:100,extractedUnits:0,cargoUnits:0,spentSteps:0,
    manualAttempts:0,precisionHits:0,refundSteps:0,autoCycles:0,masterId:'stone-master-t1',
    startedAt:1_000,endsAt:200_000};
  const view=Object.create(ResourceExpeditionView.prototype);
  view.system={run,meterPosition:()=>.5};
  view.root={hidden:false,querySelector:()=>null};
  view.getSteps=()=>1000;view.getRelationship=()=>null;view.getProfession=()=>null;
  view.feedback='';view.lastMode=null;view.lastStatus=null;
  view.field=id=>fields.get(id)||null;
  view.put=()=>{};
  view.render(20_000);
  assert.equal(fields.get('activity-placeholder').hidden,false);
  assert.equal(fields.get('manual-zone').hidden,true);
  assert.equal(fields.get('result-controls').hidden,true);
  run.mode='manual';run.manualStartedAt=19_500;
  view.render(20_000);
  assert.equal(fields.get('activity-placeholder').hidden,true);
  assert.equal(fields.get('manual-zone').hidden,false);
  run.mode='paused';run.status='depleted';run.stockUnits=0;
  view.render(20_000);
  assert.equal(fields.get('activity-placeholder').hidden,true);
  assert.equal(fields.get('manual-zone').hidden,true);
  assert.equal(fields.get('result-controls').hidden,false);
  const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
  assert.match(css,/\.expedition-realm-activity-slot\s*\{[^}]*min-height:\s*260px/s);
  assert.match(css,/\.expedition-realm-cavern\s*\{[^}]*height:\s*clamp\(/s);
});
