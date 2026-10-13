// Targeted real Chromium desktop/mobile QA: Forest Thief passive -> hit -> chase -> XP.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=fileURLToPath(new URL('../artifacts/forest-thief/',import.meta.url));mkdirSync(out,{recursive:true});
const url='http://127.0.0.1:5173/';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const server=spawn(process.execPath,['tools/dev-server.mjs'],{cwd:root,env:{...process.env,CI:'true'},stdio:'pipe'});
let output='';server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b);
async function waitServer(){
 for(let n=0;n<120;n++){
  try{if((await fetch(url+'version.json',{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}
  await wait(200);
 }
 throw Error('Server not ready '+output);
}
let browser;
async function run(name,viewport,mobile){
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.stack||String(e)));
 page.on('response',r=>{
  if(r.status()<400)return;
  const path=new URL(r.url()).pathname;
  if(r.status()===404&&(path==='/favicon.ico'||path.startsWith('/assets/textures/biomes/')))return;
  errors.push(r.status()+' '+r.url());
 });
 async function click(selector){if(mobile)await page.locator(selector).tap();else await page.locator(selector).click();}
 async function dev(code){
  await page.locator('#dev-code-input').fill(String(code));
  await page.locator('#dev-code-input').press('Enter');
  return await page.locator('#dev-code-status').innerText();
 }
 try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!document.querySelector('#hero-entrance')?.hidden||
    document.querySelector('#preflight-summary')?.dataset.state==='fail',null,{timeout:90000});
  await click('[data-hero-archetype="plate"]');
  await page.locator('#hero-name').fill('Лесной QA');
  await click('#hero-create');
  await page.waitForFunction(()=>document.querySelector('#preflight-start')?.hidden===false||
    document.querySelector('#preflight-summary')?.dataset.state==='fail',null,{timeout:90000});
  assert.equal(await page.locator('#preflight-summary').getAttribute('data-state'),'ok');
  await click('#preflight-start');
  await page.waitForFunction(()=>window.__ugameBoot?.phase==='playing',null,{timeout:90000});
  assert.match(await dev('8590'),/Лесной вор/);
  assert.match(await dev('8599'),/330\/330 ХП · idle/);
  await wait(750);
  assert.match(await dev('8599'),/330\/330 ХП · idle/,'Passive mob must never aggro at rest');
  // DEV QA only; do not change real skill cost or hero invulnerability rules.
  assert.match(await dev('8673'),/ВКЛ/);
  assert.match(await dev('8672'),/ВКЛ/);
  await page.keyboard.down('ArrowRight');await wait(310);await page.keyboard.up('ArrowRight');
  await page.keyboard.press('1');
  await wait(600);
  const afterHit=await dev('8599');
  assert.match(afterHit,/Лесной вор · (?:[12]\d\d|3[012]\d)\/330 ХП · chase/,'Impulse must damage and aggro the mob: '+afterHit);
  // Enemy approaches when aggroed; 12 further casts leave plenty of margin despite +5 HPS.
  for(let i=0;i<13;i++){await page.keyboard.press('1');await wait(375);}
  const afterKill=await dev('8599');
  assert.match(afterKill,/0\/330 ХП · dead/,'Mob should be defeated: '+afterKill);
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('ugame.save.v1')));
  assert.ok(save?.player?.characterProgress,'Expected existing GameState save');
  assert.equal(save.player.characterProgress.zrp,33,'One 330HP mob grants exactly 33XP');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:out+name+'.png',fullPage:true});
  console.log('[PASS]',name,'v0.2.78 real Phaser, passive, hit→chase, death→33 ZRP');
 }catch(error){
  await page.screenshot({path:out+name+'-failure.png',fullPage:true}).catch(()=>{});
  console.error('[FAIL]',name,String(error),JSON.stringify({errors,boot:await page.evaluate(()=>window.__ugameBoot).catch(()=>null)},null,2));
  throw error;
 }finally{await context.close();}
}
try{await waitServer();browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 await run('desktop',{width:1365,height:768},false);
 await run('mobile',{width:390,height:844},true);
}finally{await browser?.close().catch(()=>{});server.kill('SIGTERM');}
