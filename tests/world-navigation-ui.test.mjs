import test from 'node:test';
import assert from 'node:assert/strict';
import { ProjectHubSystem } from '../src/project-hub-system.js';

function mockHub() {
  const hub=Object.create(ProjectHubSystem.prototype);
  const handlers=new Map();
  const selectors=new Map();
  const content={
    innerHTML:'',scrollTop:0,
    querySelectorAll:()=>[],
    querySelector:(key)=>selectors.get(key)||null
  };
  hub.contentElement=content;
  hub.setSubViewHeader=()=>{};
  return {hub,content,selectors,handlers,
    control(id,initial) {
      const obj={value:initial,listeners:{},addEventListener(key,callback){this.listeners[key]=callback;}};
      selectors.set(id,obj);
      return obj;
    }};
}
function master(id,resource,tier='T1',zoneId='loc-00021') {
  return {masterId:id,encounterId:id,displayName:'Мастер '+resource,
    resourceDirectionId:resource,tier,zoneId,spotId:id+'-spot',
    efficiencyMultiplier:1,expiresAt:Date.now()+60_000,activeModules:['expedition']};
}
test('analyzer has real All/Stone/Wood/Water/Clay filters, not hard-coded stone-only',()=>{
  const {hub,content,control}=mockHub();
  const select=control('#world-analyzer-resource','ALL');
  control('#world-analyzer-tier','ALL');
  hub.worldAnalyzer={getData:()=>({
    masters:[master('s1','stone'),master('s2','stone'),master('w1','wood'),
      master('a1','water'),master('c1','clay')],
    zones:{'loc-00021':{name:'Золотой Оазис',biome:'sand',location:{tier:'T1',distanceFromSafeCity:1}}},
    rotations:{},candidatePools:{}
  })};
  const view={type:'world-analyzer',resource:'ALL',tier:'ALL',selectedIndex:0};
  hub.renderWorldAnalyzer(view);
  assert.match(content.innerHTML,/Все \(5\)/);
  assert.match(content.innerHTML,/Камень \(2\)/);
  assert.match(content.innerHTML,/Дерево \(1\)/);
  assert.match(content.innerHTML,/Вода \(1\)/);
  assert.match(content.innerHTML,/Глина \(1\)/);
  assert.match(content.innerHTML,/выбран: <b>1 из 5<\/b>/);
  assert.match(content.innerHTML,/Мастер wood/);
  select.value='wood';
  select.listeners.change();
  assert.equal(view.resource,'wood');
  assert.match(content.innerHTML,/по фильтру: <b>1<\/b>/);
  assert.doesNotMatch(content.innerHTML,/world-analyzer-card[^]*?Мастер stone/);
  assert.match(content.innerHTML,/Мастер wood/);
});
test('world map pins current zone separately from selected zone and exposes Find Me action',()=>{
  const {hub,content,control,selectors}=mockHub();
  const action=control('#world-map-find-me','');
  hub.worldMap={getData:()=>({
    currentZoneId:'loc-00021',
    zones:[
      {id:'loc-00001',name:'Белый Венец',isSafeCity:true,biome:'snow',
        worldMap:{diamondX:0,diamondY:0}},
      {id:'loc-00021',name:'Золотой Оазис',isSafeCity:true,biome:'sand',
        worldMap:{diamondX:-3,diamondY:4}}
    ]
  })};
  const view={type:'world-map',selectedId:'loc-00001'};
  hub.renderWorldMap(view);
  assert.match(content.innerHTML,/⌖ Сейчас: Золотой Оазис/);
  assert.match(content.innerHTML,/Показать меня на карте/);
  assert.match(content.innerHTML,/world-map-player-marker/);
  assert.match(content.innerHTML,/⌖ ВЫ ЗДЕСЬ/);
  assert.match(content.innerHTML,/is-current/);
  assert.match(content.innerHTML,/is-selected/);
  assert.equal(view.selectedId,'loc-00001');
  let focused=false;
  // Simulate Find Me. The re-render is allowed even when scrollIntoView isn't present.
  action.listeners.click();
  assert.equal(view.selectedId,'loc-00021');
  assert.match(content.innerHTML,/⌖ Сейчас: Золотой Оазис/);
});
test('master filter preserves selected Tier, resets selection index, supports empty resources',()=>{
  const {hub,content,control}=mockHub();
  const resource=control('#world-analyzer-resource','stone');
  const tier=control('#world-analyzer-tier','T4');
  hub.worldAnalyzer={getData:()=>({
    masters:[master('s1','stone','T4'),master('w1','wood','T1')],
    zones:{'loc-00021':{name:'Оазис',location:{tier:'T1'}}},
    rotations:{},candidatePools:{}
  })};
  const view={type:'world-analyzer',resource:'stone',tier:'T4',selectedIndex:99};
  hub.renderWorldAnalyzer(view);
  assert.equal(view.selectedIndex,0);
  assert.match(content.innerHTML,/Мастер stone/);
  resource.value='clay';resource.listeners.change();
  assert.match(content.innerHTML,/Нет active master под текущим фильтром/);
  assert.match(content.innerHTML,/по фильтру: <b>0<\/b>/);
  assert.equal(view.selectedIndex,0);
});
