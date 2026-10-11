// Full real Chromium E2E for registry, sticky comparison, export/import, responsive UI.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const url='http://127.0.0.1:5173/character-lab/';
const artifacts=fileURLToPath(new URL('../artifacts/character-admin/',import.meta.url));
const server=spawn(process.execPath,['tools/dev-server.mjs'],{cwd:root,stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'true'}});
let out='',browser;
server.stdout.on('data',x=>out+=String(x).slice(-1800));
server.stderr.on('data',x=>out+=String(x).slice(-1800));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function waitServer(){
 for(let i=0;i<120;i++){
   if(server.exitCode!==null)throw Error('Server exited: '+out);
   try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}
   await wait(200);
 }
 throw Error('Server not ready: '+out);
}
async function check(label,viewport,isMobile){
 const context=await browser.newContext({viewport,isMobile,hasTouch:isMobile,acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('JS '+String(e)));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push('HTTP '+r.status()+' '+r.url());});
 try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.locator('#registry-list .registry-entry').first().waitFor({timeout:15000});
   assert.equal(await page.locator('#registry-list .registry-entry').count(),50);
   assert.equal(await page.locator('#profiles .profile').count(),4);
   await page.locator('#validation-run').click({timeout:20000});
   await page.waitForFunction(()=>!document.querySelector('#validation-run')?.disabled && document.querySelector('#validation-state')?.textContent.includes('Проверено на текущих'),null,{timeout:20000});
   assert.equal(await page.locator('[data-check="grid"]').getAttribute('data-state'),'pass');
   assert.equal(await page.locator('[data-check="otv-new"]').getAttribute('data-state'),'open');
   assert.equal(await page.locator('[data-check="runtime"]').getAttribute('data-state'),'open');
   assert.equal(await page.locator('#validation-metric-rows tr').count(),24);
   assert.match(await page.locator('#validation-summary').innerText(),/0\/24 подключены/);
   await page.locator('#coefficients').evaluate(e=>e.open=true);
   const validatorRule=page.locator('input[data-rule="perVyn.hp"]');
   await validatorRule.fill('21');
   assert.match(await page.locator('#validation-state').innerText(),/устарела/);
   assert.equal(await page.locator('#validation-checks .validation-check').count(),0,'Old green results must be cleared');
   await page.locator('#validation-run').click({timeout:20000});
   await page.waitForFunction(()=>!document.querySelector('#validation-run')?.disabled && document.querySelector('#validation-state')?.textContent.includes('Проверено на текущих'),null,{timeout:20000});
   assert.equal(await page.locator('[data-check="grid"]').getAttribute('data-state'),'pass');
   await validatorRule.fill('10');
   assert.match(await page.locator('#validation-state').innerText(),/устарела/);
   // Formula constructor: three types can coexist on one stat, every edit affects real calculation.
   const perVyn=page.locator('[data-dependency-group="perVyn"]');
   await perVyn.locator('[data-dep-add]').click();
   await page.locator('#dependency-dialog[open]').waitFor();
   await page.locator('#dependency-metric').selectOption('hp');
   await page.locator('#dependency-kind').selectOption('more');
   await page.locator('#dependency-value').fill('10');
   await page.locator('#dependency-save').click();
   assert.equal((await page.locator('tr[data-metric="hp"] td').nth(1).innerText()).trim(),'225');
   await perVyn.locator('[data-dep-add]').click();
   await page.locator('#dependency-metric').selectOption('hp');
   await page.locator('#dependency-kind').selectOption('increased');
   await page.locator('#dependency-value').fill('5');
   await page.locator('#dependency-save').click();
   assert.equal((await page.locator('tr[data-metric="hp"] td').nth(1).innerText()).trim(),'281,25');
   assert.equal(await perVyn.locator('[data-dep-edit][data-metric="hp"]').count(),3);
   // Replace inherited ATK by a new RP dependency through the same dialog.
   await perVyn.locator('[data-dep-edit][data-metric="atk"][data-kind="flat"]').click();
   await page.locator('#dependency-metric').selectOption('rp');
   await page.locator('#dependency-kind').selectOption('flat');
   await page.locator('#dependency-value').fill('2');
   await page.locator('#dependency-save').click();
   assert.equal(await perVyn.locator('[data-dep-edit][data-metric="atk"]').count(),0);
   assert.equal((await page.locator('tr[data-metric="atk"] td').nth(1).innerText()).trim(),'4');
   assert.equal((await page.locator('tr[data-metric="rp"] td').nth(1).innerText()).trim(),'60');
   await perVyn.locator('[data-dep-edit][data-metric="rp"][data-kind="flat"]').click();
   await page.locator('#dependency-delete').click();
   assert.equal((await page.locator('tr[data-metric="rp"] td').nth(1).innerText()).trim(),'50');
   // JSON retains the modified dependency graph and importing it restores the graph, not just numbers.
   const builderDownload=page.waitForEvent('download',{timeout:15000});
   await page.locator('#export-snapshot').click();
   const builderFile=await builderDownload;
   const builderJson=readFileSync(await builderFile.path(),'utf8');
   const builderObject=JSON.parse(builderJson);
   assert.equal(builderObject.rules.ruleModifiers.perConstitution.health.more,10);
   assert.equal(builderObject.rules.ruleModifiers.perConstitution.health.increased,5);
   assert.equal(builderObject.rules.ruleModifiers.perConstitution.attack.flat,null);
   await page.locator('#reset-rules').click();
   assert.equal((await page.locator('tr[data-metric="hp"] td').nth(1).innerText()).trim(),'150');
   await page.locator('#snapshot-file').setInputFiles({name:'edited-dependencies.json',mimeType:'application/json',buffer:Buffer.from(builderJson)});
   await page.locator('#import-review[open]').waitFor();
   await page.locator('#apply-import').click();
   assert.equal((await page.locator('tr[data-metric="hp"] td').nth(1).innerText()).trim(),'281,25');
   assert.equal(await perVyn.locator('[data-dep-edit][data-metric="hp"]').count(),3);
   await page.locator('#reset-rules').click();
   assert.equal((await page.locator('tr[data-metric="hp"] td').nth(1).innerText()).trim(),'150');
   // Seven+ pinned rows: sticky area may use nearly full screen, not a fixed 37vh.
   for(const key of ['vyn','lov','intel','otv','level','mainResource','ust','glr']){
     await page.locator('#pin-add-select').selectOption(key);
     await page.locator('#pin-add').click();
   }
   assert.ok((await page.locator('#pinned-comparison .pin-label').count())>=12);
   const pinScroll=await page.locator('#pin-table-scroll').evaluate(el=>({
     cssMax:getComputedStyle(el).maxHeight,win:window.innerHeight,height:el.getBoundingClientRect().height
   }));
   assert.ok(parseFloat(pinScroll.cssMax)>pinScroll.win*0.68,'Pin panel should grow close to viewport height');
   assert.ok(pinScroll.height<=pinScroll.win,'Pinned content scrolls within viewport');
   const inputPin=page.locator('[data-pin-value="otv"][data-pin-profile="0"]');
   assert.equal((await inputPin.innerText()).trim(),'1');
   await inputPin.click();
   assert.match(await page.locator('#pin-detail-list').innerText(),/Полных сотен ОТВ/);
   await page.locator('#pin-detail-close').click();
   const costPin=page.locator('[data-pin-value="ust"][data-pin-profile="0"]');
   assert.equal((await costPin.evaluate(el=>el.firstChild?.textContent||'')).replace(/[^0-9]/g,''),'1001');
   assert.match(await costPin.innerText(),/10,01%/);
   await costPin.focus();
   assert.match(await page.locator('#pin-hover-card').innerText(),/ЖП > 0/);
   await costPin.click();
   assert.match(await page.locator('#pin-detail-list').innerText(),/ЖП > 0/);
   assert.match(await page.locator('#pin-detail-list').innerText(),/1000/);
   await page.locator('#pin-detail-close').click();
   await page.locator('#coefficients').evaluate(e=>e.open=true);
   await page.locator('#rule-search').fill('ГЛР');
   const perLevel=page.locator('[data-dependency-group="perLevel"]');
   await perLevel.locator('[data-dep-add]').click();
   await page.locator('#dependency-metric').selectOption('glr');
   await page.locator('#dependency-kind').selectOption('increased');
   await page.locator('#dependency-value').fill('100');
   await page.locator('#dependency-save').click();
   await page.locator('#rule-search').fill('');
   // 100% increased GLR/level must amplify GLR and every linked regeneration.
   const perLevelGlr=page.locator('[data-dependency-group="perLevel"] [data-mod-metric="glr"][data-mod-kind="increased"]');
   assert.equal(await perLevelGlr.count(),1);
   const boosted=await page.evaluate(async()=>{
     const {getLabState}=await import('./lab.js');
     const {calculateCharacter}=await import('../src/character-balance/engine.js');
     const current=getLabState(),profile=current.profiles[0];
     const withBoost=calculateCharacter(current.rules,profile);
     const without=structuredClone(current.rules);
     delete without.ruleModifiers.perLevel.glr.increased;
     delete without.ruleModifiers.perLevel.glr;
     delete without.ruleModifiers.perLevel;
     delete without.ruleModifiers;
     const basic=calculateCharacter(without,profile);
     return {glr:[basic.values.glr,withBoost.values.glr],
       regens:['hps','rps','pps','jps','rgs'].map(k=>[k,basic.values[k],withBoost.values[k]])};
   });
   assert.ok(boosted.glr[1]>boosted.glr[0]);
   for(const [key,without,withBoost] of boosted.regens)
     assert.ok(withBoost>without,key+' not amplified by increased GLR');
   await page.locator('#reset-rules').click();
   assert.equal((await page.locator('[data-pin-value="glr"][data-pin-profile="0"]').innerText()).trim(),'0,05');
   await page.locator('#registry-search').fill('глобальная регенерация');
   assert.equal(await page.locator('#registry-list .registry-entry').count(),1);
   assert.match(await page.locator('#registry-list').innerText(),/ГЛР/);
   await page.locator('#registry-search').fill('');
   await page.locator('#registry-kind').selectOption('system');
   assert.equal(await page.locator('#registry-list .registry-entry').count(),17);
   await page.locator('#registry-kind').selectOption('all');
   const pin=page.locator('tr[data-metric="pp"] button[data-pin="pp"]');
   await pin.click();
   assert.equal(await pin.getAttribute('aria-pressed'),'true');
   assert.match(await page.locator('#pinned-comparison').innerText(),/ПП · Покров/);
   await page.locator('#profile-count').selectOption('2');
   assert.equal(await page.locator('#profiles .profile').count(),2);
   assert.equal(await page.locator('#pinned-comparison .pin-head').count(),3);
   await page.locator('#coefficients').evaluate(e=>e.open=true);
   const hp=page.locator('input[data-rule="perVyn.hp"]');
   await hp.fill('20');
   assert.equal((await page.locator('tr[data-metric="hp"] td').nth(1).innerText()).trim(),'200');
   assert.match(await page.locator('#pinned-comparison').innerText(),/200/);
   const promise=page.waitForEvent('download',{timeout:15000});
   await page.locator('#export-snapshot').click();
   const download=await promise;
   assert.match(download.suggestedFilename(),/uGame-character-lab-english-ids/);
   const snapshot=readFileSync(await download.path(),'utf8');
   const data=JSON.parse(snapshot);
   assert.equal(data.profiles.length,2);assert.equal(data.rules.perConstitution.health,20);
   assert.equal(data.registry.records.length,50);
   assert.equal(data.calculations[0].values.health,200);
   assert.ok(data.checksum.value.length===64);
   await hp.fill('10');
   assert.equal((await page.locator('tr[data-metric="hp"] td').nth(1).innerText()).trim(),'150');
   await page.locator('#snapshot-file').setInputFiles({name:'build.json',mimeType:'application/json',buffer:Buffer.from(snapshot)});
   await page.locator('#import-review[open]').waitFor({timeout:15000});
   assert.match(await page.locator('#import-diff').innerText(),/perConstitution.health/);
   await page.locator('#apply-import').click();
   assert.equal((await page.locator('tr[data-metric="hp"] td').nth(1).innerText()).trim(),'200');
   assert.equal(await page.locator('#profile-count').inputValue(),'2');
   const corrupted=structuredClone(data);corrupted.rules.perConstitution.health=100;
   await page.locator('#snapshot-file').setInputFiles({name:'tampered.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupted))});
   assert.match(await page.locator('#lab-status').innerText(),/Импорт отклонён: Контрольная сумма/);
   assert.equal((await page.locator('tr[data-metric="hp"] td').nth(1).innerText()).trim(),'200');
   const scrolled=await page.evaluate(()=>{
     window.scrollTo(0,document.documentElement.scrollHeight);
     const el=document.querySelector('#pinned-panel');
     const rect=el.getBoundingClientRect();
     return {sticky:rect.top>=-1&&rect.top<40,documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
   });
   assert.equal(scrolled.sticky,true,'Pinned top should stay visible while scrolling');
   assert.ok(scrolled.documentWidth<=scrolled.viewportWidth+4,'Page must not overflow horizontally outside own tables');
   assert.deepEqual(errors,[]);
   console.log('[PASS] Character Admin '+label+': 50 registry entries, 17 systems, pinned 1–4, live formulas, JSON roundtrip, tamper rejected, sticky');
 }catch(e){
   mkdirSync(artifacts,{recursive:true});
   try{await page.screenshot({path:artifacts+label+'-failed.png',fullPage:true,timeout:6000});}catch{}
   console.error('[FAIL] Character Admin '+label+':',e.message,errors,out);
   throw e;
 }finally{await context.close();}
}
try{
 await waitServer();
 browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 await check('desktop',{width:1365,height:768},false);
 await check('mobile',{width:390,height:844},true);
}finally{await browser?.close();server.kill('SIGTERM');}
