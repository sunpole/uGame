import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ContainerSystem } from '../src/container-system.js';
import { InventoryPanelSystem } from '../src/inventory-panel-system.js';
import { matchesInventoryItem, inventoryCategory, compareInventoryStacks, discardProtection } from '../src/inventory-management.js';
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
  assert.equal(c.item(c.container('backpack').slots[0].itemId).tier,'T8');
  assert.equal(c.item(c.container('backpack').slots[1].itemId).tier,'T8');
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

test('bulk move emits a single save, skips non-resources in the chest and retains contents',()=>{
  const {containers:c,events}=fixture();
  const pack=c.container('backpack');
  pack.slots[0]={itemId:'stone-t1',quantity:50};
  pack.slots[1]={itemId:'stone-t8',quantity:20};
  pack.slots[2]={itemId:'simple-field-tool',quantity:1};
  const result=c.transferAll('backpack','resourceChest');
  assert.deepEqual({moved:result.moved,movedStacks:result.movedStacks,skipped:result.skipped},
    {moved:70,movedStacks:2,skipped:1});
  assert.equal(total(c,'stone-t1'),50);
  assert.equal(total(c,'stone-t8'),20);
  assert.equal(total(c,'simple-field-tool'),1);
  assert.equal(pack.slots[2].itemId,'simple-field-tool');
  assert.equal(events.filter(e=>e.name==='containers:changed').length,1);
  assert.equal(events[0].payload.detail.reason,'transfer-all');
  const reverse=c.transferAll('resourceChest','backpack');
  assert.equal(reverse.moved,70);
  assert.equal(total(c,'stone-t1'),50);
});
test('bulk transfer honors one nearly-full stack and leaves remainder in original slot',()=>{
  const {containers:c,events}=fixture();
  const pack=c.container('backpack'),bank=c.container('bank');
  pack.slots[0]={itemId:'stone-t1',quantity:20};
  bank.slots.fill(null);
  for(let i=0;i<bank.slots.length;i++)bank.slots[i]={itemId:'wood-t8',quantity:500};
  bank.slots[0]={itemId:'stone-t1',quantity:499};
  const result=c.transferAll('backpack','bank');
  assert.equal(result.moved,1);
  assert.equal(result.remaining,19);
  assert.equal(bank.slots[0].quantity,500);
  assert.equal(pack.slots[0].quantity,19);
  assert.equal(total(c,'stone-t1'),519);
  assert.equal(events.length,1);
  const retry=c.transferAll('backpack','bank');
  assert.equal(retry.moved,0);
  assert.equal(pack.slots[0].quantity,19);
  assert.equal(events.length,1);
});
test('bulk transfer validates source and destination without generating save events',()=>{
  const {containers:c,events}=fixture();
  c.container('backpack').slots[0]={itemId:'stone-t1',quantity:5};
  assert.equal(c.transferAll('backpack','backpack').moved,0);
  assert.equal(c.transferAll('equipment','bank').moved,0);
  assert.equal(c.transferAll('backpack','resourcePouch').moved,0);
  assert.equal(c.transferAll('missing','bank').moved,0);
  assert.equal(total(c,'stone-t1'),5);
  assert.equal(events.length,0);
});
test('bulk transfer can move only filtered resources while preserving quest items',()=>{
  const {containers:c}=fixture();
  const pack=c.container('backpack');
  pack.slots[0]={itemId:'stone-t3',quantity:10};
  pack.slots[1]={itemId:'quest-token',quantity:1};
  const result=c.transferAll('backpack','bank',{filter:item=>item.tags.includes('resource')});
  assert.equal(result.moved,10);
  assert.equal(pack.slots[1].itemId,'quest-token');
  assert.equal(c.container('bank').slots[0].itemId,'stone-t3');
});
test('every inventory sorting mode preserves item quantities and total weight',()=>{
  for(const by of ['name','tier','category','quantity','weight']) {
    const {containers:c}=fixture(),pack=c.container('backpack');
    pack.slots[0]={itemId:'stone-t1',quantity:75};
    pack.slots[1]={itemId:'quest-token',quantity:2};
    pack.slots[2]={itemId:'wood-t8',quantity:14};
    pack.slots[3]={itemId:'stone-t1',quantity:15};
    const before=c.snapshot(),oldKg=c.weightKg('backpack');
    const result=c.organize('backpack',{by,merge:true});
    assert.equal(result.ok,true,by);
    assert.equal(result.freedSlots,1,by);
    assert.equal(c.weightKg('backpack'),oldKg,by);
    for(const id of ['stone-t1','quest-token','wood-t8']){
      const old=before.containers.backpack.slots.filter(x=>x?.itemId===id).reduce((n,x)=>n+x.quantity,0);
      assert.equal(total(c,id),old,by+' '+id);
    }
  }
});
test('deleting valuables requires УДАЛИТЬ when value reaches one Attention or is unknown',()=>{
  const cheap={...catalog.get('stone-t1'),baseValue:1};
  const costly={...catalog.get('stone-t1'),baseValue:5000};
  const stacked={...catalog.get('stone-t1'),baseValue:100};
  assert.equal(discardProtection(cheap,1).typed,false);
  assert.equal(discardProtection(costly,1).typed,true);
  assert.equal(discardProtection(stacked,49).typed,false);
  assert.equal(discardProtection(stacked,50).typed,true);
  assert.equal(discardProtection(catalog.get('quest-token'),1).typed,true);
  assert.equal(discardProtection(catalog.get('simple-field-tool'),1).reason,'Цена пока не определена');
});
test('deletion UI refuses wrong typed word, cancel and invalid quantities without changes',()=>{
  const {containers:c}=fixture();
  const pack=c.container('backpack');pack.slots[0]={itemId:'stone-t8',quantity:10};
  const ui=Object.create(InventoryPanelSystem.prototype);
  ui.containerSystem=c;
  ui.itemCatalog={get:()=>({baseValue:5000})};
  let status='',calls=0,words=['5','удалить'];
  ui.setStatus=t=>{status=t;};
  const former=globalThis.window;
  globalThis.window={
    prompt:()=>{calls++;return words.shift()??null;},
    confirm:()=>{throw Error('should not ask final confirmation without exact typed word');}
  };
  try{
    assert.equal(ui.confirmDiscard('backpack',0,{...catalog.get('stone-t8'),baseValue:5000},10),false);
    assert.equal(pack.slots[0].quantity,10);
    assert.equal(calls,2);
    assert.match(status,/отменено/i);
    words=['-1'];
    assert.equal(ui.confirmDiscard('backpack',0,{...catalog.get('stone-t8'),baseValue:5000},10),false);
    assert.equal(pack.slots[0].quantity,10);
  }finally{globalThis.window=former;}
});
test('deletion UI confirms explicit УДАЛИТЬ and removes exactly the selected units once',()=>{
  const {containers:c,events}=fixture();
  const pack=c.container('backpack');pack.slots[0]={itemId:'stone-t8',quantity:50};
  const item={...catalog.get('stone-t8'),baseValue:5000};
  const ui=Object.create(InventoryPanelSystem.prototype);
  ui.containerSystem=c;ui.itemCatalog={get:()=>({baseValue:5000})};
  ui.setStatus=()=>{};
  const original=globalThis.window;
  let confirmed=0;let values=['12','УДАЛИТЬ'];
  globalThis.window={prompt:()=>values.shift(),confirm:()=>{confirmed++;return true;}};
  try{
    assert.equal(ui.confirmDiscard('backpack',0,item,50),true);
    assert.equal(pack.slots[0].quantity,38);
    assert.equal(confirmed,1);
    assert.equal(events.filter(x=>x.payload.detail.reason==='discard-confirmed').length,1);
  }finally{globalThis.window=original;}
});
