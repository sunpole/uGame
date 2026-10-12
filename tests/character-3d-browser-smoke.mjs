// Real browser QA for the isolated Quaternius 3D character lab.
// Runs in desktop and mobile Chromium with an actual WebGL renderer.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=fileURLToPath(new URL('../artifacts/character-3d/',import.meta.url));
const address='http://127.0.0.1:5173/labs/first-real-3d.html';
mkdirSync(artifacts,{recursive:true});
const server=spawn(process.execPath,['tools/dev-server.mjs'],{
 cwd:root,env:{...process.env,CI:'true'},stdio:'pipe'
});
let output='';server.stdout.on('data',x=>output+=x.toString());server.stderr.on('data',x=>output+=x.toString());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForServer(){
 for(let i=0;i<100;i++){
   if(server.exitCode!==null)throw Error('Server failed: '+output);
   try{const r=await fetch(address,{signal:AbortSignal.timeout(1000)});if(r.ok)return;}catch{}
   await sleep(200);
 }
 throw Error('Server timeout: '+output);
}
let browser;
async function check(name,viewport,mobile){
 const context=await browser.newContext({
  viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile
 });
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push('pageerror '+e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push('HTTP '+r.status()+' '+r.url());});
 try{
  await page.goto(address,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>['ready','error'].includes(window.__ugame3d?.phase),null,{timeout:90000});
  const state=await page.evaluate(()=>window.__ugame3d);
  assert.equal(state.phase,'ready',JSON.stringify({state,errors}));
  assert.equal(state.modelLoaded,true);
  assert.equal(state.webglReady,true);
  assert.ok(state.frames>2,'The WebGL renderer has not rendered a real frame');
  assert.ok(state.rigBones>=2,'Character rig bones not found — cannot simulate walking');
  assert.equal(await page.locator('#stage canvas').count(),1);
  for(const [angle,size] of [[45,0.75],[60,1],[75,1.3]]){
   const b=page.locator('[data-angle="'+angle+'"]');
   const s=page.locator('[data-scale="'+size+'"]');
   if(mobile){await b.tap();await s.tap();}else{await b.click();await s.click();}
   const actual=await page.evaluate(()=>({angle:window.__ugame3d.angle,scale:window.__ugame3d.scale}));
   assert.deepEqual(actual,{angle,scale});
   assert.equal(await b.getAttribute('aria-pressed'),'true');
   assert.equal(await s.getAttribute('aria-pressed'),'true');
  }
  const switcher=page.locator('#walk-toggle');
  mobile?await switcher.tap():await switcher.click();
  assert.equal(await page.evaluate(()=>window.__ugame3d.walk),false);
  mobile?await switcher.tap():await switcher.click();
  assert.equal(await page.evaluate(()=>window.__ugame3d.walk),true);
  const before=await page.evaluate(()=>window.__ugame3d.frames);
  if(mobile){
   const btn=page.locator('[data-move="up"]');
   await btn.dispatchEvent('pointerdown',{pointerId:1});
   await sleep(550);
   await btn.dispatchEvent('pointerup',{pointerId:1});
  }else{
   await page.keyboard.down('ArrowUp');await sleep(550);await page.keyboard.up('ArrowUp');
  }
  assert.ok((await page.evaluate(()=>window.__ugame3d.frames))>before,'Render loop stopped after inputs');
  assert.deepEqual(errors,[],'Script/network errors: '+JSON.stringify(errors));
  await page.screenshot({path:artifacts+name+'.png',fullPage:true});
  console.log('[PASS] '+name+' real neutral humanoid 3D, WebGL, 45/60/75, sizes, rig and pointer controls');
 }catch(error){
  await page.screenshot({path:artifacts+name+'-failure.png',fullPage:true}).catch(()=>{});
  console.error('[FAIL] '+name,JSON.stringify({error:String(error),state:await page.evaluate(()=>window.__ugame3d).catch(()=>null),errors,output},null,2));
  throw error;
 }finally{await context.close();}
}
try{
 await waitForServer();
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-webgl-blocklist']});
 await check('desktop',{width:1365,height:768},false);
 await check('mobile',{width:390,height:844},true);
}finally{
 await browser?.close().catch(()=>{});
 server.kill('SIGTERM');
}
