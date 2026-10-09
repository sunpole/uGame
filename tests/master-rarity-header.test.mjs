import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WorldGraph} from '../src/world-graph.js';
import {tierChance,masterChanceByDistance,masterRarityReport} from '../src/master-rarity-audit.js';
import {ProjectHubSystem} from '../src/project-hub-system.js';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const config=read('data/world-spawn-config.json');
const world=read('data/world.json');

test('T4 1.5% is conditional chance per LT1 Master, not global guarantee',()=>{
  assert.equal(tierChance(config.masterTierByLocationTier.T1,'T4'),1.5);
  assert.equal(config.worldCapsPerResource.T4,1);
  assert.equal(config.worldCapsPerResource.T3,2);
  assert.equal(config.worldCapsPerResource.T2,3);
  assert.equal(tierChance(config.masterTierByLocationTier.T2,'T4'),4);
  assert.equal(tierChance(config.masterTierByLocationTier.T3,'T4'),9);
  assert.equal(tierChance(config.masterTierByLocationTier.T4,'T4'),18);
});
test('distance bands combine with LT NPC tiers; D2 boosts T4 over D1 but neither guarantees it',()=>{
  assert.ok(Math.abs(masterChanceByDistance(config,1,'T4')-1.557)<1e-9);
  assert.ok(Math.abs(masterChanceByDistance(config,2,'T4')-1.845)<1e-9);
  assert.ok(masterChanceByDistance(config,3,'T4')>masterChanceByDistance(config,2,'T4'));
  assert.equal(masterChanceByDistance(config,1000,'T4'),null);
});
test('225-zone world contains D1-D10 fields with four resource lines',()=>{
  const graph=new WorldGraph();
  graph.use(world);
  const zones=[...graph.zones.values()].filter(x=>!x.isSafeCity);
  const actual={};
  const counts={stone:0,wood:0,water:0,clay:0};
  for(const z of zones){
    const d=graph.distanceFromSafeCity(z.id);
    actual[d]=(actual[d]||0)+1;
    for(const resource of z.resourceDirections||[])counts[resource]++;
  }
  assert.deepEqual(actual,{'1':20,'2':28,'3':28,'4':32,'5':36,'6':32,'7':20,'8':12,'9':8,'10':4});
  assert.deepEqual(counts,{stone:220,wood:59,water:53,clay:108});
});

test('audit reports real per-resource T3/T4 cap usage, not imaginary guaranteed NPC',()=>{
  const graph=new WorldGraph();graph.use(world);
  const zones={};
  for(const z of graph.zones.values())zones[z.id]={
    ...z,location:{tier:'T1',distanceFromSafeCity:graph.distanceFromSafeCity(z.id)}
  };
  const masters=[
    {resourceDirectionId:'stone',tier:'T4'},
    {resourceDirectionId:'stone',tier:'T3'},
    {resourceDirectionId:'water',tier:'T3'},
    {resourceDirectionId:'wood',tier:'T1'}
  ];
  const report=masterRarityReport({masters,zones,config});
  assert.equal(report.hasConfig,true);
  const byId=Object.fromEntries(report.byResource.map(entry=>[entry.id,entry]));
  assert.equal(byId.stone.counts.T4,1);
  assert.equal(byId.stone.t4Cap,1);
  assert.equal(byId.water.counts.T4,0);
  assert.equal(byId.water.t4Cap,1);
  assert.equal(byId.wood.eligibleZones,59);
  assert.ok(Math.abs(byId.wood.expectedT4-.885)<1e-9);
  assert.equal(byId.clay.counts.T3,0);
  assert.equal(report.byDistance[0].zoneCount,20);
  assert.equal(report.byDistance[1].zoneCount,28);
});
test('analyzer shows a separate Tier cap report without mutating live Master data',()=>{
  const masters=[{
    resourceDirectionId:'stone',tier:'T4',masterId:'stone-t4',encounterId:'stone-t4-enc',
    displayName:'Мастер камня T4',zoneId:'loc-00002',
    activeModules:['expedition'],spotId:'spot-1',expiresAt:Date.now()+30000
  }];
  const originals=JSON.stringify(masters);
  const hub=Object.create(ProjectHubSystem.prototype);
  hub.contentElement={innerHTML:'',scrollTop:0,querySelector:()=>null,querySelectorAll:()=>[]};
  hub.setSubViewHeader=()=>{};
  hub.worldAnalyzer={getData:()=>({
    masters,zones:{'loc-00002':{
      name:'Инейный Предел',resourceDirections:['stone','water'],
      location:{tier:'T1',distanceFromSafeCity:1}
    }},
    candidatePools:{},rotations:{},balanceConfig:config
  })};
  hub.renderWorldAnalyzer({label:'Analyzer',resource:'ALL',tier:'ALL',selectedIndex:0});
  assert.match(hub.contentElement.innerHTML,/Редкие Мастера в текущем мире/);
  assert.match(hub.contentElement.innerHTML,/Камень: T3 <b>0\/2<\/b> · T4 <b>1\/1<\/b>/);
  assert.match(hub.contentElement.innerHTML,/1,50%/);
  assert.match(hub.contentElement.innerHTML,/Не гарантия одного NPC/);
  assert.equal(JSON.stringify(masters),originals);
});
test('header grows to fit button contents, reflows in two columns and caps long Steps text',()=>{
  const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
  assert.match(css,/#app\s*\{[^}]*grid-template-rows:\s*minmax\(112px,\s*auto\)/s);
  assert.match(css,/@media\s*\(max-width:\s*1150px\)\s*\{\s*\.game-chrome-header\s*\{[^}]*grid-template-columns:\s*minmax\(105px,145px\)/s);
  assert.match(css,/#steps-summary\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css,/#material-wealth\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});
