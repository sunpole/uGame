// Real browser QA for isolated CC0 8-dir paper-doll preparation lab.
// Tests actually decoded external source frames in desktop and mobile Chromium.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=fileURLToPath(new URL('../artifacts/character-2d/',import.meta.url));
mkdirSync(dir,{recursive:true});
const url='http://127.0.0.1:5173/labs/free-2d-eight-way.html';
const server=spawn(process.execPath,['tools/dev-server.mjs'],{cwd:root,stdio:'pipe',env:{...process.env,CI:'true'}});
let output='';
server.stdout.on('data',d=>output+=d.toString());server.stderr.on('data',d=>output+=d.toString());
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
async function waitForServer(){
 for(let i=0;i<90;i++){
  if(server.exitCode!==null)throw Error('Dev server stopped '+output);
  try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}
  await delay(200);
 }
 throw Error('Dev server timeout '+output);
}
async function run(name,viewport,mobile){
 const context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push('JS '+e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push('HTTP '+r.status()+' '+r.url());});
 const activate=async sel=>mobile?await page.locator(sel).tap():await page.locator(sel).click();
 try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>['ready','error'].includes(window.__ugame2d?.phase),null,{timeout:90000});
  const state=await page.evaluate(()=>window.__ugame2d);
  assert.equal(state.phase,'ready',JSON.stringify({state,errors}));
  assert.equal(state.frameSize,256);
  assert.equal(state.sourceFrames,224,'17 idle + 11 walk × 8 actual sourced frames');
  await page.waitForFunction(()=>window.__ugame2d.rendered>=4&&window.__ugame2d.pixels>20);
  const hash=()=>page.locator('#actor').evaluate(c=>c.toDataURL('image/png'));
  const base=await hash();
  // Ensure the source frames actually differ in visual content when rotating.
  await activate('[data-dir="3"]');
  assert.equal(await page.evaluate(()=>window.__ugame2d.dir),3);
  assert.notEqual(await hash(),base,'8 real directions should differ visually');
  for(const [d,compass] of [[2,'NW'],[4,'NE'],[5,'E'],[6,'SE'],[7,'S'],[0,'SW'],[1,'W']]){
    await activate('[data-dir="'+d+'"]');
    assert.equal(await page.evaluate(()=>window.__ugame2d.dir),d,compass);
  }
  await activate('[data-dir="7"]');
  const first=await hash();
  await activate('[data-color="burgundy"]');
  assert.equal(await page.evaluate(()=>window.__ugame2d.color),'burgundy');
  assert.notEqual(await hash(),first,'Palette variant must alter actual canvas pixels');
  await activate('[data-color="ivory"]');
  assert.equal(await page.evaluate(()=>window.__ugame2d.color),'ivory');
  await activate('[data-color="base"]');
  await activate('[data-scale="1.3"]');
  assert.equal(await page.evaluate(()=>window.__ugame2d.scale),1.3);
  await activate('#toggle-walk');
  assert.equal(await page.evaluate(()=>window.__ugame2d.anim),'Idle');
  await page.waitForFunction(()=>window.__ugame2d.rendered>20,null,{timeout:15000});
  await activate('#toggle-walk');
  assert.equal(await page.evaluate(()=>window.__ugame2d.anim),'Walk');
  // Movement mode with physical keys on desktop; touchscreen uses direction tap on mobile.
  if(!mobile){await page.keyboard.down('ArrowUp');await delay(350);await page.keyboard.up('ArrowUp');}
  else await activate('[data-dir="3"]');
  assert.equal(await page.evaluate(()=>window.__ugame2d.dir),3);
  assert.deepEqual(errors,[],'No failed source requests or JS exceptions');
  await page.screenshot({path:dir+name+'.png',fullPage:true});
  console.log('[PASS] '+name+': REAL 8-way CC0 frames, idle/walk, recolor, scale, canvas pixels');
 }catch(e){
  await page.screenshot({path:dir+name+'-failure.png',fullPage:true}).catch(()=>{});
  console.error('[FAIL] '+name,JSON.stringify({error:String(e),state:await page.evaluate(()=>window.__ugame2d).catch(()=>null),errors,output},null,2));
  throw e;
 }finally{await context.close();}
}
try{
 await waitForServer();
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 await run('desktop',{width:1365,height:768},false);
 await run('mobile',{width:390,height:844},true);
}finally{
 await browser?.close().catch(()=>{});
 server.kill('SIGTERM');
}
