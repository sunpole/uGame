// Fresh browser contexts only: never open or overwrite the player's browser profile.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=fileURLToPath(new URL('../artifacts/city-npc-motion/',import.meta.url));
await mkdir(out,{recursive:true});
const url='http://127.0.0.1:5173/';
const server=spawn(process.execPath,['tools/dev-server.mjs'],{cwd:root,env:{...process.env,CI:'true'},stdio:'pipe'});
let log='';server.stdout.on('data',x=>log+=x);server.stderr.on('data',x=>log+=x);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
async function run(name,viewport,mobile){
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage(),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));
 const click=sel=>mobile?page.locator(sel).tap():page.locator(sel).click();
 // Bind the real Phaser instance for observation and isolated fixture placement.
 // No game code, renderer, data, inputs or save implementation is replaced.
 await page.route('**/src/main.js*',async route=>{
  const response=await route.fetch(),body=await response.text();
  assert.ok(body.includes('new Phaser.Game({'));
  await route.fulfill({response,body:body.replace('new Phaser.Game({','window.__qaGame=new Phaser.Game({')});
 });
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#hero-entrance').waitFor({state:'visible',timeout:90000});
  await click('[data-hero-archetype="plate"]');await page.locator('#hero-name').fill('Город QA');await click('#hero-create');
  await page.locator('#preflight-start').waitFor({state:'visible',timeout:90000});
  assert.equal(await page.locator('#preflight-summary').getAttribute('data-state'),'ok');await click('#preflight-start');
  await page.waitForFunction(()=>window.__ugameBoot?.phase==='playing',null,{timeout:30000});
  for(const zoneId of ['loc-00013','loc-00001','loc-00005','loc-00021','loc-00025']){
   await page.evaluate(id=>{const s=window.__qaGame.scene.getScenes(true)[0];s.zoneSystem.build(id);
    s.player.setPosition(960,850);s.zoneRulesSystem.visionSystem.setZoneOverride({mode:'full'});},zoneId);
   await page.waitForFunction(()=>{const s=window.__qaGame.scene.getScenes(true)[0];return s.interactableSystem.items.filter(i=>i.type.startsWith('city-')).every(i=>i._knightObjects?.[1]?.visible);},null,{timeout:30000});
   const models=await page.evaluate(()=>window.__qaGame.scene.getScenes(true)[0].interactableSystem.items.filter(i=>i.type.startsWith('city-')).map(i=>{
    const image=i._knightObjects[1],f=image.frame,c=image.texture.getSourceImage(),ctx=c.getContext('2d');
    const raw=ctx.getImageData(f.cutX,f.cutY,f.cutWidth,f.cutHeight).data;
    let opaque=0,minY=f.cutHeight;for(let k=3;k<raw.length;k+=4)if(raw[k]>=250){opaque++;minY=Math.min(minY,Math.floor(k/4/f.cutWidth));}
    return {id:i.id,type:i.type,key:image.texture.key,opaque,oldVisible:i.display.visible,
     labelBottom:i._label.getBounds().bottom,opaqueTop:image.getBounds().top+minY*image.scaleY};
   }));
   assert.equal(models.length,3,zoneId);
   for(const model of models){assert.ok(model.opaque>1000,'Opaque model: '+model.id);assert.equal(model.oldVisible,false);assert.ok(model.labelBottom<=model.opaqueTop-4,'Name must not overlap: '+model.id);}
   results.push({zoneId,models});await page.screenshot({path:out+name+'-'+zoneId+'.png'});
  }
  // Existing city services still work with the new, non-combat visual bodies.
  const serviceZone=await page.evaluate(()=>window.__qaGame.scene.getScenes(true)[0].zoneSystem.currentId);
  for(const [type,selector] of [['city-banker','#inventory-panel'],['city-teleporter','#interaction-panel'],['city-guide','#dialogue-panel']]){
   await page.evaluate(type=>{const s=window.__qaGame.scene.getScenes(true)[0],i=s.interactableSystem.items.find(i=>i.type===type);s.player.setPosition(i.x,i.y+30);},type);
   await page.waitForTimeout(150);await click('[data-control="action"]:visible');
   await page.locator(selector).waitFor({state:'visible'});
   await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>window.__qaGame.scene.getScenes(true)[0].zoneSystem.currentId),serviceZone,'One tap must not confirm a destination');
   await page.keyboard.press('Escape');
   await page.locator(selector).waitFor({state:'hidden'});
  }
  await page.evaluate(async()=>{const s=window.__qaGame.scene.getScenes(true)[0];s.zoneSystem.build('loc-00013');s.player.setPosition(960,850);s.zoneRulesSystem.visionSystem.setZoneOverride({mode:'full'});await s.characterView.setKnight('hero-plate',{persist:false});
   const original=s.gameState.snapshot;let snapshots=0;s.gameState.snapshot=function(){snapshots++;return original.call(this);};
   const before=JSON.stringify(s.gameState.state);try{s.persistGameState();if(snapshots!==0)throw Error('Full world cloned for synchronous save');if(JSON.stringify(s.gameState.state)!==before)throw Error('Save mutated live state');}finally{s.gameState.snapshot=original;}
   window.__qaTimes=[];const update=s.eventSpotSystem.update;s.eventSpotSystem.update=function(...args){const t=performance.now();try{return update.apply(this,args);}finally{window.__qaTimes.push(performance.now()-t);}};
   window.__qaInputLatency=[];let pressedAt=null;
   document.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')&&!e.repeat)pressedAt=performance.now();});
   new MutationObserver(()=>{if(pressedAt!==null&&!document.documentElement.dataset.characterVisualFrame?.endsWith('idle')){window.__qaInputLatency.push(performance.now()-pressedAt);pressedAt=null;}})
    .observe(document.documentElement,{attributes:true,attributeFilter:['data-character-visual-frame']});
  });
  for(const [keys,dir] of [[['ArrowRight'],'E'],[['ArrowRight','ArrowUp'],'NE'],[['ArrowUp'],'N'],[['ArrowLeft','ArrowUp'],'NW'],[['ArrowLeft'],'W'],[['ArrowLeft','ArrowDown'],'SW'],[['ArrowDown'],'S'],[['ArrowRight','ArrowDown'],'SE']]){
   for(const key of keys)await page.keyboard.down(key);
   await page.waitForFunction(d=>document.documentElement.dataset.characterVisualFrame?.startsWith(d+'-')&&!document.documentElement.dataset.characterVisualFrame?.endsWith('idle'),dir,{timeout:5000});
   await page.waitForTimeout(150);for(const key of keys)await page.keyboard.up(key);
  }
  const perf=await page.evaluate(()=>{const gl=window.__qaGame.renderer.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');return {eventUpdateMs:window.__qaTimes,inputLatencyMs:window.__qaInputLatency,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'canvas',save:JSON.parse(localStorage.getItem('ugame.save.v1'))?.schemaVersion};});
  assert.ok(perf.inputLatencyMs.length>=8,'Every turn must update a real animation frame');
  assert.equal(perf.save,1);assert.deepEqual(errors,[]);
  await page.screenshot({path:out+name+'-movement.png'});
  await writeFile(out+name+'.json',JSON.stringify({results,perf,errors},null,2));
  console.log('[PASS]',name,'15 opaque city NPCs, three services, eight movement directions, synchronous save, Pre-flight');
 }catch(e){await page.screenshot({path:out+name+'-failure.png'}).catch(()=>{});console.log('[FAIL]',name,String(e),errors);throw e;}
 finally{await context.close();}
}
try{
 for(let n=0;n<120;n++){if(server.exitCode!==null)throw Error('QA server exited: '+log);try{if(log.includes('uGame local:')&&(await fetch(url+'version.json')).ok)break;}catch{}await delay(200);if(n===119)throw Error(log);}
 const headful=process.env.UGAME_QA_HEADFUL==='1';
 browser=await chromium.launch({headless:!headful,args:headful?[]:['--use-gl=angle','--use-angle=swiftshader']});
 await run(headful?'desktop-hardware':'desktop',{width:1365,height:900},false);
 await run(headful?'mobile-hardware':'mobile',{width:390,height:844},true);
}finally{await browser?.close();server.kill('SIGTERM');}
