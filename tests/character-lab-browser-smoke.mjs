// Real Chromium Character Balance Lab E2E (standalone DEV page; no game saves).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const url='http://127.0.0.1:5173/character-lab/';
const delay=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
const artifacts=fileURLToPath(new URL('../artifacts/character-lab/',import.meta.url));
let output='';
const server=spawn(process.execPath,['tools/dev-server.mjs'],{
  cwd:root,env:{...process.env,CI:'true'},stdio:['ignore','pipe','pipe']
});
server.stdout.on('data',v=>{output+=String(v).slice(-3000);});
server.stderr.on('data',v=>{output+=String(v).slice(-3000);});
let browser;
async function waitForServer(){
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw Error('Dev server exited: '+output);
    try{const r=await fetch(url,{signal:AbortSignal.timeout(1000)});if(r.ok)return;}catch{}
    await delay(200);
  }
  throw Error('Dev server not reachable: '+output);
}
async function smoke(profile){
  const context=await browser.newContext({viewport:profile.viewport,isMobile:profile.mobile,hasTouch:profile.mobile});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push('JS: '+String(error)));
  page.on('response',response=>{
    if(response.status()>=400 && !response.url().endsWith('favicon.ico'))errors.push('HTTP '+response.status()+': '+response.url());
  });
  try{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
    await page.locator('.profile').first().waitFor({timeout:12000}); // Wait for real state, not transient status copy.
    await page.locator('#registry-list .registry-entry').first().waitFor({timeout:12000}); // Admin registry / pinned listeners ready.
    assert.equal(await page.locator('.profile').count(),4);
    assert.equal(await page.locator('tbody tr[data-metric]').count(),24);
    const hp=page.locator('tr[data-metric="hp"] td').nth(1);
    assert.equal((await hp.innerText()).trim(),'150');
    await page.locator('#profile-count').selectOption('2');
    assert.equal(await page.locator('.profile').count(),2);
    await page.locator('#profile-count').selectOption('4');
    assert.equal(await page.locator('.profile').count(),4);
    const rating=page.locator('.profile').first().locator('input[data-key="otv"]');
    await rating.fill('600');assert.equal((await hp.innerText()).trim(),'156');
    await rating.fill('699');assert.equal((await hp.innerText()).trim(),'156');
    await rating.fill('700');assert.equal((await hp.innerText()).trim(),'157');
    // Real browser unit interpretation must update together with editable candidate scores.
    const firstCard=page.locator('.profile').first();
    await firstCard.locator('details').evaluate(el=>{el.open=true;});
    const setCandidateScore=async(key,target)=>{
      const cell=page.locator('tr[data-metric="'+key+'"] td').nth(1);
      const before=Number((await cell.evaluate(el=>el.firstChild?.textContent||'')).replace(/\s/g,'').replace(',','.'));
      assert.ok(Number.isFinite(before),'Raw Lab score unreadable: '+key);
      await firstCard.locator('input[data-key="extra.'+key+'"]').fill(String(target-before));
      return cell;
    };
    const evasion=await setCandidateScore('ukl',24);
    assert.match(await evasion.innerText(),/^24\s+=\s+0,24%/);
    const attackSpeed=await setCandidateScore('ska',420);
    assert.match(await attackSpeed.innerText(),/^420\s+=\s+4,2 атак\/с/);
    await page.locator('#pin-add-select').selectOption('ukl');
    await page.locator('#pin-add').click();
    const evasionPin=page.locator('[data-pin-value="ukl"][data-pin-profile="0"]');
    assert.match(await evasionPin.innerText(),/24\s+=\s+0,24%/);
    await evasionPin.click();
    assert.match(await page.locator('#pin-detail-list').innerText(),/0,24%/);
    await page.locator('#pin-detail-close').click();
    await page.locator('tr[data-metric="ukl"]').click();
    assert.match(await page.locator('#formula-trace .trace-card').first().innerText(),/0,24%/);
    // Reset these temporary examples before existing regression assertions.
    await page.getByRole('button',{name:'Сбросить профили'}).click();
    await page.locator('tr[data-metric="rps"]').click();
    assert.equal(await page.locator('#formula-detail[open] .trace-card').count(),4);
    await page.locator('#coefficients').evaluate(el=>{el.open=true;});
    await page.locator('input[data-rule="perVyn.hp"]').fill('20');
    assert.equal((await hp.innerText()).trim(),'207');
    await page.getByRole('button',{name:'Вернуть стандарт'}).click();
    assert.equal((await hp.innerText()).trim(),'150');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+4),true,
      'Unexpected horizontal overflow outside scrollable results table');
    assert.deepEqual(errors,[]);
    console.log('[PASS] Character Lab '+profile.name+': profiles 1–4, OTV, formulas, live rules, reset');
  }catch(err){
    mkdirSync(artifacts,{recursive:true});
    try{await page.screenshot({path:artifacts+profile.name+'-failed.png',fullPage:true,timeout:5000});}catch{}
    console.error('[FAIL] Character Lab '+profile.name+': '+err.message,errors,output);
    throw err;
  }finally{await context.close();}
}
try{
  await waitForServer();
  browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
  await smoke({name:'desktop',viewport:{width:1365,height:768},mobile:false});
  await smoke({name:'mobile',viewport:{width:390,height:844},mobile:true});
}finally{await browser?.close();server.kill('SIGTERM');}
