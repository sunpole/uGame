import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ContainerSystem } from '../src/container-system.js';
import { InventoryPanelSystem } from '../src/inventory-panel-system.js';
import { matchesInventoryItem, inventoryCategory, compareInventoryStacks } from '../src/inventory-management.js';
const data=JSON.parse(readFileSync(new URL('../data/containers.json',import.meta.url),'utf8'));
const catalog={
  loaded:true,
  get(id){
    const match=/^(stone|wood|water|clay)-(t[1-8])$/.exec(id);
    if(match) return {id,name:({stone:'Камень',wood:'Древесина',water:'Вода',clay:'Глина'})[match[1]]+' '+match[2].toUpperCase(),
      resourceId:match[1],tier:match[2].toUpperCase(),type:'resource',tags:['resource','material'],massStorage:true,
      unitKg:.1,weightKg:.1,stackLimit:500,storageMode:'physical'};
    if(id==='simple-field-tool')return {id,name:'Полевой инструмент',type:'misc',tags:['item','tool'],weightKg:.6,
      stackLimit:1,storageMode:'physical'};
    if(id==='quest-token')return {id,name:'Квестовый жетон',type:'quest',tags:['quest','item'],weightKg:.1,
      stackLimit:10,storageMode:'physical'};
    return null;
  },
  require(id){return this.get(id)||{id,name:id,tags:['item'],type:'unknown',weightKg:1,stackLimit:1,storageMode:'physical'};}
};
function fixture(){
  const events=[];
  const containers=new ContainerSystem({itemCatalog:catalog,
    eventSystem:{emit:(name,payload)=>events.push({name,payload})}});
  const configs=data.containers.map(raw=>({
    ...raw,enabled:raw.enabled!==false,allowedTags:raw.allowedTags||[],
    allowedItemIds:raw.allowedItemIds||[],slotKeys:raw.slotKeys||[],maxWeightKg:raw.maxWeightKg??null
  }));
  containers.configs=new Map(configs.map(x=>[x.id,x]));
  containers.state={schemaVersion:1,containers:{}};
  for(const config of configs) {
    containers.state.containers[config.id]=containers.restoreContainer(config,null);
  }
  containers.loaded=true;
  return {containers,events};
}
const total=(c,id)=>Object.values(c.state.containers).flatMap(c=>c.kind==='grid'?c.slots:Object.values(c.slots))
  .reduce((n,s)=>n+(s?.itemId===id?s.quantity:0),0);

test('search finds Russian names, Tier and ID and categorizes resources, equipment and quests',()=>{
  const t=catalog.get('stone-t8');
  assert.equal(matchesInventoryItem(t,{search:'камень'}),true);
  assert.equal(matchesInventoryItem(t,{search:'T8',tier:'T8',category:'resource'}),true);
  assert.equal(matchesInventoryItem(t,{tier:'T1'}),false);
  assert.equal(matchesInventoryItem(t,{search:'wood'}),false);
  assert.equal(inventoryCategory(t),'resource');
  assert.equal(inventoryCategory(catalog.get('quest-token')),'quest');
  assert.ok(compareInventoryStacks({itemId:'stone-t8',quantity:1},{itemId:'stone-t1',quantity:1},catalog,'tier')<0);
});
test('resource chest is a real 48-cell bank-only resource store; unrelated item cannot enter',()=>{
  const {containers:c}=fixture();
  assert.equal(c.config('resourceChest').access,'local');
  assert.equal(c.config('resourceChest').slotCount,48);
  assert.equal(c.isAllowed('resourceChest','stone-t8'),true);
  assert.equal(c.isAllowed('resourceChest','simple-field-tool'),false);
  assert.equal(c.addTo('resourceChest','simple-field-tool',1).added,0);
  assert.equal(c.addTo('resourceChest','stone-t8',40).added,40);
  assert.equal(c.container('resourceChest').slots[0].itemId,'stone-t8');
});
test('sorting stacks by Tier consolidates identical resource cells without losing mass',()=>{
  const {containers:c,events}=fixture(),pack=c.container('backpack');
  pack.slots[0]={itemId:'stone-t1',quantity:120};
  pack.slots[1]={itemId:'wood-t8',quantity:4};
  pack.slots[2]={itemId:'stone-t1',quantity:80};
  pack.slots[3]={itemId:'stone-t8',quantity:25};
  const before=total(c,'stone-t1');
  const mass=c.weightKg('backpack');
  const res=c.organize('backpack',{by:'tier',merge:true});
  assert.equal(res.ok,true);
  assert.equal(res.freedSlots,1);
  assert.equal(c.container('backpack').slots[0].itemId,'stone-t8');
  assert.equal(total(c,'stone-t1'),before);
  assert.equal(c.weightKg('backpack'),mass);
  assert.equal(events.filter(e=>e.name==='containers:changed').length,1);
});
test('dragging merges partial same stacks and swaps different stacks without duplication',()=>{
  const {containers:c}=fixture(),pack=c.container('backpack');
  pack.slots[0]={itemId:'stone-t1',quantity:120};
  pack.slots[1]={itemId:'stone-t1',quantity:450};
  pack.slots[2]={itemId:'wood-t8',quantity:30};
  assert.deepEqual(c.moveWithin('backpack',0,1),{moved:50,merged:true});
  assert.equal(pack.slots[0].quantity,70);
  assert.equal(pack.slots[1].quantity,500);
  assert.equal(c.moveWithin('backpack',0,2).swapped,true);
  assert.equal(total(c,'stone-t1'),570);
  assert.equal(total(c,'wood-t8'),30);
});
test('slot-targeted transfer obeys destination stack limit, weight and allowed resource tags',()=>{
  const {containers:c}=fixture(),pack=c.container('backpack'),chest=c.container('resourceChest');
  pack.slots[0]={itemId:'stone-t8',quantity:350};
  assert.equal(c.moveToSlot('backpack',0,'resourceChest',4).moved,350);
  assert.equal(chest.slots[4].quantity,350);
  assert.equal(pack.slots[0],null);
  assert.equal(c.moveToSlot('resourceChest',4,'backpack',3).moved,350);
  assert.equal(pack.slots[3].quantity,350);
  pack.slots[1]={itemId:'simple-field-tool',quantity:1};
  assert.equal(c.moveToSlot('backpack',1,'resourceChest',0).moved,0);
  assert.equal(total(c,'simple-field-tool'),1);
});
test('confirmed discard supports partial and full stacks, rejects invalid quantities without changing saves',()=>{
  const {containers:c,events}=fixture(),pack=c.container('backpack');
  pack.slots[0]={itemId:'stone-t2',quantity:50};
  const old=c.snapshot();
  assert.equal(c.discardFrom('backpack',0,0).removed,0);
  assert.equal(c.discardFrom('backpack',0,100).removed,0);
  assert.deepEqual(c.snapshot(),old);
  assert.equal(c.discardFrom('backpack',0,17).removed,17);
  assert.equal(pack.slots[0].quantity,33);
  assert.equal(c.discardFrom('backpack',0,33).removed,33);
  assert.equal(pack.slots[0],null);
  assert.equal(events.filter(e=>e.payload.detail.reason==='discard-confirmed').length,2);
});
test('equipment inventory statistics accept object-shaped slots without .filter crash',()=>{
  const {containers:c}=fixture();
  const ui=Object.create(InventoryPanelSystem.prototype);
  ui.containerSystem=c;ui.itemCatalog=catalog;
  ui.statsElement={textContent:''};ui.searchQuery='';ui.categoryFilter='all';ui.tierFilter='all';
  ui.renderStats(c.config('equipment'));
  assert.match(ui.statsElement.textContent,/найдено 0/);
});
