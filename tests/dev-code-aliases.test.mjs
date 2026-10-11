import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEV_CODE_LABELS,resolveDevCode,normalizeDevCommand,devAliasSuggestions} from '../src/dev-code-aliases.js';
const docs=readFileSync(new URL('../docs/DEV-CODES.md',import.meta.url),'utf8');
const fromDocumentation=[...docs.matchAll(/^\|\s*`(\d{4})`\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/gm)]
  .map(m=>({code:m[1],ru:m[2].trim().replace(/\*\*|`/g,''),en:m[3].trim().replace(/\*\*|`/g,'')}));
test('every active DEV code has Russian and English exact typed aliases from documentation',()=>{
  assert.equal(DEV_CODE_LABELS.length,71);
  assert.deepEqual(DEV_CODE_LABELS,fromDocumentation,
    'Update the shared alias registry whenever docs/DEV-CODES.md changes');
  for(const {code,ru,en} of DEV_CODE_LABELS){
    assert.equal(resolveDevCode(code),code);
    assert.equal(resolveDevCode(ru),code,'Russian DEV alias '+code);
    assert.equal(resolveDevCode(en),code,'English DEV alias '+code);
    assert.equal(resolveDevCode(en.toUpperCase()),code);
  }
  assert.equal(devAliasSuggestions().length,DEV_CODE_LABELS.length*2);
});
test('short commands work in both languages and accept minus sign/whitespace variations',()=>{
 const cases=[
   ['зрп +5%','2101'],['XP +5%','2101'],['Опыт   +10%','2102'],
   ['xp +50%','2103'],['ЗРП −5%','2111'],['XP -10%','2112'],
   ['опыт -50%','2113'],['УРОВЕНЬ +1','2201'],['level -1','2202'],
   ['отв','2299'],['OTV','2299'],['персонаж','2299'],
   ['ТП','2399'],['teleport','2399'],['city tp','2399'],
   ['сохранить','9001'],['SAVE','9001'],
   ['без кд','8671'],['NO CD','8671'],['бессмертие','8672'],['god mode','8672'],
   ['бесплатные скилы','8673'],['free casts','8673'],
   ['восстановить все','8674'],['full refill','8674'],
   ['помощь','9999'],['help','9999'],['справка','9999'],
   ['удалить сохранение','9002'],['delete save','9002']
 ];
 for(const [text,expected] of cases)assert.equal(resolveDevCode(text),expected,text);
 assert.equal(normalizeDevCommand('  ЁЛКА   −5%  '),'елка -5%');
});
test('ambiguous, unsafe, partial, unknown and destructive near-matches never execute',()=>{
 for(const input of ['',null,'9','900','00000','+5','telepor','сохран','clear',
  'DELETE ALL SAVES','удалить','wipe','save; delete','9002 extra',
  'отв 999','eval(1)','../main','зрп +500%']){
   assert.equal(resolveDevCode(input),null,String(input));
 }
 assert.equal(resolveDevCode('9002'),'9002','existing exact destructive code is unchanged');
 assert.equal(resolveDevCode('1234'),'1234','unknown four digit codes still handled as reserved');
});
