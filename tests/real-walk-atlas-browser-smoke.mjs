// Real browser proof: real 8x11 sourced walking frames and Photoshop PNG export.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const folder=fileURLToPath(new URL('../artifacts/real-walk-atlas/',import.meta.url));
mkdirSync(folder,{recursive:true});
const url='http://127.0.0.1:5173/labs/real-walk-atlas.html';
const server=spawn(process.execPath,['tools/dev-server.mjs'],{cwd:root,env:{...process.env,CI:'true'},stdio:'pipe'});
let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
let browser;
async function waitForServer(){
 for(let i=0;i<100;i++){
  if(server.exitCode!==null)throw Error('Dev server quit '+output);
  try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}
  await sleep(200);
 }
 throw Error('Dev server timeout: '+output);
}
async function check(name,viewport,mobile){
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('JS '+e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push('HTTP '+r.status()+' '+r.url());});
 const activate=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
 try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>['ready','error'].includes(window.__realAtlas?.status),null,{timeout:90000});
  const state=await page.evaluate(()=>window.__realAtlas);
  assert.equal(state.status,'ready',JSON.stringify({state,errors}));
  assert.equal(state.decoded,88,'all real 11×8 PNG source frames must decode');
  assert.equal(state.frameCount,11);
  assert.deepEqual(state.sheetSize,[2816,2048]);
  assert.equal(await page.locator('#download-atlas').isEnabled(),true);
  const before=await page.evaluate(()=>window.__realAtlas.drawCount);
  await activate('[data-dir="4"]');
  assert.equal(await page.evaluate(()=>window.__realAtlas.dir),4);
  await page.waitForFunction(count=>window.__realAtlas.drawCount>count+1,before,{timeout:5000});
  assert.equal(await page.locator('[data-dir="4"]').getAttribute('aria-pressed'),'true');
  const image=await page.locator('#atlas-grid').evaluate(c=>Array.from(c.getContext('2d').getImageData(90,36,64,64).data).some(v=>v>0));
  assert.equal(image,true,'atlas preview must draw real sourced frame pixels');
  const pngFile=folder+'actual-walk-'+name+'.png';
  const pending=page.waitForEvent('download',{timeout:40000});
  await activate('#download-atlas');
  const download=await pending;
  assert.equal(download.suggestedFilename(),'uGame_real_knight_WALK_8x11.png');
  await download.saveAs(pngFile);
  const png=readFileSync(pngFile);
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),2816);
  assert.equal(png.readUInt32BE(20),2048);
  assert.equal(await page.evaluate(()=>window.__realAtlas.downloadReady),true);
  assert.deepEqual(errors,[],'No JS or network errors');
  await page.screenshot({path:folder+name+'.png',fullPage:true});
  console.log('[PASS] '+name+' real 8 directions × 11 distinct source frames, canvas animation and downloadable 2816×2048 Photoshop PNG');
 }catch(e){
  await page.screenshot({path:folder+name+'-failed.png',fullPage:true}).catch(()=>{});
  console.error('[FAIL] '+name,JSON.stringify({error:String(e),state:await page.evaluate(()=>window.__realAtlas).catch(()=>null),errors,output},null,2));
  throw e;
 }finally{await context.close();}
}
try{
 await waitForServer();
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 await check('desktop',{width:1400,height:850},false);
 await check('mobile',{width:390,height:844},true);
}finally{await browser?.close().catch(()=>{});server.kill('SIGTERM');}
