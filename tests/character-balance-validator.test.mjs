import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateBalanceCandidate} from '../src/character-balance/validator.js';
import {defaultProfile} from '../src/character-balance/engine.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const rules=read('../data/character-balance-candidate.json');
const registry=read('../data/character-stat-registry.json');
const one=()=>[defaultProfile(rules,1,'force',3)];
const run=(r=rules,p=one(),reg=registry)=>validateBalanceCandidate({rules:r,profiles:p,registry:reg});

test('validator: current candidate covers 24 metrics and 5460 profiles, not game integration',()=>{
 const a=run();
 assert.equal(a.summary.failed,0);
 assert.equal(a.summary.calculated,24);
 assert.equal(a.summary.gameIntegrated,0);
 assert.equal(a.summary.totalMetrics,24);
 for(const id of ['schema','registry','current','grid','otv','glr','lov','milestones'])
   assert.equal(a.checks.find(x=>x.id===id)?.status,'pass',id);
 assert.match(a.checks.find(x=>x.id==='grid').detail,/5460/);
 assert.ok(a.rows.every(x=>x.implementation==='calculated-only'&&!x.gameActive));
});

test('validator: open mechanisms never masquerade as passed calculation or accepted mechanics',()=>{
 const a=run();
 for(const id of ['otv-new','passive','xp','steps','rest','runtime'])
   assert.equal(a.checks.find(x=>x.id===id)?.status,'open',id);
 assert.ok(a.summary.open>=6);
 assert.equal(a.scope,'candidate-sandbox-only');
 assert.ok(a.rows.every(x=>x.decisionStatus),'Decision status must be shown for every metric');
});

test('validator: corrupted data and invalid profile produce failures and no 24/24 green claim',()=>{
 const bad=structuredClone(rules);bad.baseline.hp=Infinity;
 const a=run(bad);
 assert.ok(a.summary.failed>0);
 assert.equal(a.summary.calculated,0);
 const missing=structuredClone(registry);missing.records.pop();
 assert.equal(run(rules,one(),missing).checks.find(x=>x.id==='registry').status,'fail');
 const invalid=one();invalid[0].vyn=9999;
 const r=run(rules,invalid);
 assert.equal(r.checks.find(x=>x.id==='current').status,'fail');
 assert.equal(r.summary.calculated,0);
});

test('validator: deliberate candidate departure from approved LOV and level table is flagged, not silently approved',()=>{
 const changed=structuredClone(rules);
 changed.perLov.def=0.01;changed.levelPoints.ordinary=4;
 const a=run(changed);
 assert.equal(a.checks.find(x=>x.id==='lov').status,'open');
 assert.equal(a.checks.find(x=>x.id==='milestones').status,'open');
 assert.ok(a.checks.find(x=>x.id==='otv-new').status==='open');
});
