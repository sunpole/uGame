import test from 'node:test';
import {
  worldMapFitScale, worldMapFitCamera, worldMapFocusCamera,
  worldMapZoomAt, worldMapPan, WORLD_MAP_MAX_SCALE
} from '../src/world-map-camera.js';

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

test('world map exposes viewport, zoom and full-world actions without scrollbars',()=>{
  const {hub,content,control}=mockHub();
  control('#world-map-find-me','');
  hub.worldMap={getData:()=>({
    currentZoneId:'loc-00013',
    zones:Array.from({length:225},(_,i)=>({
      id:'loc-'+String(i+1).padStart(5,'0'),
      name:'Локация '+i,biome:'forest',
      worldMap:{diamondX:(i%15)*2-14,diamondY:Math.floor(i/15)*2-14}
    }))
  })};
  const view={type:'world-map',selectedId:'loc-00001'};
  hub.renderWorldMap(view);
  assert.match(content.innerHTML,/id="world-map-viewport"/);
  assert.match(content.innerHTML,/id="world-map-zoom-in"/);
  assert.match(content.innerHTML,/id="world-map-zoom-out"/);
  assert.match(content.innerHTML,/id="world-map-fit"/);
  assert.doesNotMatch(content.innerHTML,/class="world-map-scroll"/);
  assert.equal((content.innerHTML.match(/data-world-map-zone=/g)||[]).length,225);
  assert.match(content.innerHTML,/Показать меня на карте/);
});

test('world map camera fits full 225-zone stage inside desktop and mobile viewport',()=>{
  for(const viewport of [{viewportWidth:940,viewportHeight:530},{viewportWidth:355,viewportHeight:350}]){
    const bounds={...viewport,mapWidth:2120,mapHeight:2120};
    const fit=worldMapFitCamera(bounds);
    assert.ok(fit.scale>0&&fit.scale<=1);
    assert.ok(fit.scale*2120<=viewport.viewportWidth+1);
    assert.ok(fit.scale*2120<=viewport.viewportHeight+1);
    assert.ok(fit.x>=0&&fit.y>=0);
    assert.equal(fit.scale,worldMapFitScale(viewport.viewportWidth,viewport.viewportHeight,2120,2120));
  }
});

test('Find Me focuses requested zone in middle without altering zone identity',()=>{
  const bounds={viewportWidth:940,viewportHeight:530,mapWidth:2120,mapHeight:2120};
  const mapZone={id:'loc-00154',x:960,y:1040};
  const camera=worldMapFocusCamera(bounds,mapZone);
  assert.ok(Math.abs(camera.x+camera.scale*mapZone.x-bounds.viewportWidth/2)<0.01);
  assert.ok(Math.abs(camera.y+camera.scale*mapZone.y-bounds.viewportHeight/2)<0.01);
  assert.equal(mapZone.id,'loc-00154');
});

test('wheel zoom stays anchored under cursor, pan stays bounded and zoom has limits',()=>{
  const bounds={viewportWidth:940,viewportHeight:530,mapWidth:2120,mapHeight:2120};
  const camera=worldMapFocusCamera(bounds,{x:1000,y:1000});
  const point={x:350,y:240};
  const before={x:(point.x-camera.x)/camera.scale,y:(point.y-camera.y)/camera.scale};
  const zoomed=worldMapZoomAt(camera,bounds,point,camera.scale*1.2);
  assert.ok(Math.abs((point.x-zoomed.x)/zoomed.scale-before.x)<0.01);
  assert.ok(Math.abs((point.y-zoomed.y)/zoomed.scale-before.y)<0.01);
  const panned=worldMapPan(zoomed,bounds,100000,-100000);
  assert.ok(Number.isFinite(panned.x)&&Number.isFinite(panned.y));
  const min=worldMapZoomAt(camera,bounds,point,0);
  const max=worldMapZoomAt(camera,bounds,point,100);
  assert.ok(min.scale>=worldMapFitScale(940,530,2120,2120)*0.75);
  assert.equal(max.scale,WORLD_MAP_MAX_SCALE);
});
