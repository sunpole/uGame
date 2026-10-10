// Independent repeatable 3-pass audit (not game runtime).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { METRIC_KEYS, pointsAt, validateRules, defaultProfile, calculateCharacter } from '../src/character-balance/engine.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const raw=readFileSync(root+'ugame_anton_info.txt');
const source=raw.toString('utf8').replace(/\r/g,'');
const rows=source.split('\n');
const journal=readFileSync(root+'docs/project-journal/records/UGD-0038-anton-character-stats-draft.md','utf8');
const register=JSON.parse(readFileSync(root+'data/character-source-audit-register.json','utf8'));
const rules=JSON.parse(readFileSync(root+'data/character-balance-candidate.json','utf8'));
const read=(file)=>readFileSync(root+file,'utf8');

test('LAYER 1 / immutable original blob and full nonempty line coverage',()=>{
  const gitSha=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex');
  assert.equal(gitSha,'161f14b3b232cf0d7283a4387211fad588c7707f','The owner original file must remain unchanged');
  assert.equal(rows.length,register.originalLines);
  const actualNonempty=rows.filter(r=>r.trim()).length;
  assert.equal(actualNonempty,register.originalNonEmptyLines);
  const count=new Array(rows.length+1).fill(0);
  for(const section of register.sourceSegments){
    assert.ok(section.subject&&section.status,'Unclassified section');
    assert.ok(section.first>=1&&section.last<=rows.length&&section.first<=section.last);
    for(let i=section.first;i<=section.last;i++)count[i]++;
  }
  for(let i=1;i<=rows.length;i++)assert.equal(count[i],1,'Original source line '+i+' must be classified exactly once');
  assert.match(rows[14],/ВЫНОСЛИВОСТЬ/);
  assert.match(rows[16],/ЛОВКОСТЬ/);
  assert.match(rows[382],/улокнен|уклонен/i);
  assert.match(rows[382],/вын за защиту/i);
  assert.match(rows[390],/ячейка/i);
});

test('LAYER 2 / each discussion decision 1..93 indexed once, source text verifiable',()=>{
  const seen=new Set();
  for(const b of register.discussionDecisionBlocks){
    for(let i=b.first;i<=b.last;i++){
      assert.ok(!seen.has(i),'duplicate decision '+i);
      seen.add(i);
      assert.match(journal,new RegExp('(?:№'+i+'(?!\\d)|-\\s*\\*\\*'+i+'(?:\\s|:|\\*))'),'UGD-0038 absent decision '+i);
    }
  }
  assert.equal(seen.size,93);
  assert.deepEqual([...seen].sort((a,b)=>a-b),Array.from({length:93},(_,i)=>i+1));
  assert.match(journal,/отменил гипотезу о допустимом нулевом итоговом стартовом Покрове/);
  assert.match(journal,/За 1 ВЫН/);
  assert.match(journal,/ЛОВ.*0 ЗАЩ/);
  assert.match(journal,/1,1 млрд ЗРП/);
  assert.match(journal,/ПРИНЯТО А/);
});

test('LAYER 2 / all 24 calculator fields are mapped and none of 16 connected systems is accidentally claimed fully implemented',()=>{
  assert.equal(validateRules(rules),true);
  const base=Object.keys(rules.baseline);
  assert.equal(METRIC_KEYS.length,24);
  assert.deepEqual(new Set(base),new Set(METRIC_KEYS));
  assert.equal(register.systems.length,16);
  for(const item of register.systems){
    assert.ok(['partial','missing','separate-runtime'].includes(item.coverage),item.id);
    for(const p of item.actual)assert.equal(existsSync(root+p),true,'missing referenced file '+p);
  }
  // Four base scores and grouping should not be confused with game save runtime.
  assert.doesNotMatch(read('src/main.js'),/character-balance\/engine\.js/);
  assert.match(read('src/step-system.js'),/10000/);
  assert.match(read('docs/STEPS-ECONOMY.md'),/100,?000,?000|100 000 000/);
  assert.ok(register.ruleResolutions.some(x=>x.id==='lov-dodge'&&x.status==='resolved'));
  assert.ok(register.ruleResolutions.some(x=>x.id==='hp-base'&&x.status==='open'));
});

test('LAYER 3 / 21 distinct origins and level 1–65 conserve points and return 24 finite results',()=>{
  const configs=Object.entries(rules.cities).flatMap(([id,city])=>city.start.map((start,i)=>({id,i,start})));
  assert.equal(configs.length,21);
  let iterations=0;
  for(const {id,i,start} of configs){
    assert.equal(start.reduce((a,b)=>a+b,0),10);
    for(let level=1;level<=65;level++){
      const p=defaultProfile(rules,level,id,i);
      assert.equal(p.vyn+p.lov+p.intel,pointsAt(level,rules));
      for(const otv of [1,600,699,700]){
        const r=calculateCharacter(rules,{...p,otv});
        assert.equal(Object.keys(r.values).length,24);
        for(const v of Object.values(r.values))assert.ok(Number.isFinite(v));
        assert.equal(r.values.pp>=5,true,'Level1 PP direct value must be positive for nonnegative inputs');
        assert.equal(r.warnings.some(s=>s.includes('Избыток')),false);
        iterations++;
      }
    }
  }
  assert.equal(iterations,21*65*4);
});

test('LAYER 3 / milestone point replacement, +5 shroud, and endgame 64/65',()=>{
  for(const [level,gain] of [[2,3],[10,5],[20,5],[30,5],[40,10],[50,10],[55,10],[60,15],[65,20]])
    assert.equal(pointsAt(level,rules)-pointsAt(level-1,rules),gain,'level '+level);
  assert.equal(pointsAt(65,rules),258);
  for(const level of [1,10,40,65]){
    const p=defaultProfile(rules,level);
    const zeroInt=calculateCharacter(rules,{...p,intel:0});
    assert.ok(zeroInt.values.pp>=5*level);
  }
});

test('LAYER 3 / later authoritative author correction overrides old +0.01 DEF/LOV',()=>{
  assert.equal(rules.perVyn.def,0.1);
  assert.equal(rules.perLov.ukl,1);
  assert.equal(Object.hasOwn(rules.perLov,'def'),false);
  const a=defaultProfile(rules,10,'force',3);
  const x=calculateCharacter(rules,a), y=calculateCharacter(rules,{...a,lov:a.lov+1});
  assert.equal(y.values.def,x.values.def);
  assert.equal(y.values.ukl,x.values.ukl+1);
});

test('LAYER 3 / OTV 600→699 no benefit, 700 another block, GLR exactly 100 = 1%',()=>{
  const p=defaultProfile(rules,10);
  const a=calculateCharacter(rules,{...p,otv:600}),b=calculateCharacter(rules,{...p,otv:699}),c=calculateCharacter(rules,{...p,otv:700});
  assert.deepEqual(a.values,b.values);
  assert.equal(c.values.hp-a.values.hp,1);
  assert.equal(c.values.glr-a.values.glr,1);
  assert.equal(c.blocks,7);
  assert.equal(100/10000,0.01);
  assert.equal(a.extra.glrPercent,a.values.glr/100);
  const neg=calculateCharacter(rules,{...p,otv:-150});
  assert.ok(neg.warnings.some(s=>s.includes('Отрицательные ОТВ')));
});

test('LAYER 3 / sample 100 HP is not a proof of startup HP survivability',()=>{
  let zeroHp=0;
  const copy=structuredClone(rules);copy.baseline.hp=0;
  for(const [cityId,c] of Object.entries(copy.cities))
    for(let i=0;i<c.start.length;i++)
      if(calculateCharacter(copy,defaultProfile(copy,1,cityId,i)).values.hp<=0)zeroHp++;
  assert.equal(zeroHp,2,'Exactly two start profiles require HP contribution from future mandatory passive');
});
