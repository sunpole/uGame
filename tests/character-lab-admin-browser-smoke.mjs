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
   assert.equal(await page.locator('[data-check="grid"]').getAttribute('data-state'),'pass');
   assert.equal(await page.locator('[data-check="otv-new"]').getAttribute('data-state'),'open');
   assert.equal(await page.locator('[data-check="runtime"]').getAttribute('data-state'),'open');
   assert.equal(await page.locator('#validation-metric-rows tr').count(),24);
   assert.match(await page.locator('#validation-summary').innerText(),/0\/24 подключены/);
   await page.locator('#coefficients').evaluate(e=>e.open=true);
   const validatorRule=page.locator('input[data-rule="perVyn.hp"]');
   await validatorRule.fill('21');
   assert.match(await page.locator('#validation-state').innerText(),/устарела/);
   await page.locator('#validation-run').click({timeout:20000});
   assert.equal(await page.locator('[data-check="grid"]').getAttribute('data-state'),'pass');
   await validatorRule.fill('10');
   assert.match(await page.locator('#validation-state').innerText(),/устарела/);
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
   assert.match(download.suggestedFilename(),/uGame-character-lab-v0.2.57/);
   const snapshot=readFileSync(await download.path(),'utf8');
   const data=JSON.parse(snapshot);
   assert.equal(data.profiles.length,2);assert.equal(data.rules.perVyn.hp,20);
   assert.equal(data.registry.records.length,50);
   assert.equal(data.calculations[0].values.hp,200);
   assert.ok(data.checksum.value.length===64);
   await hp.fill('10');
   assert.equal((await page.locator('tr[data-metric="hp"] td').nth(1).innerText()).trim(),'150');
   await page.locator('#snapshot-file').setInputFiles({name:'build.json',mimeType:'application/json',buffer:Buffer.from(snapshot)});
   await page.locator('#import-review[open]').waitFor({timeout:15000});
   assert.match(await page.locator('#import-diff').innerText(),/perVyn.hp/);
   await page.locator('#apply-import').click();
   assert.equal((await page.locator('tr[data-metric="hp"] td').nth(1).innerText()).trim(),'200');
   assert.equal(await page.locator('#profile-count').inputValue(),'2');
   const corrupted=structuredClone(data);corrupted.rules.perVyn.hp=100;
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
