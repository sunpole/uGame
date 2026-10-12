// Real desktop/mobile Chromium: local CC0 walk sprites, Phaser NPC, role PNG import, F5 persistence.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=fileURLToPath(new URL('../artifacts/knight-roles/',import.meta.url));mkdirSync(dir,{recursive:true});
const url='http://127.0.0.1:5173/';const delay=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['tools/dev-server.mjs'],{cwd:root,env:{...process.env,CI:'true'},stdio:'pipe'});
let output='';server.stdout.on('data',x=>output+=x);server.stderr.on('data',x=>output+=x);
async function waitServer(){for(let n=0;n<110;n++){try{if((await fetch(url+'version.json',{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}await delay(200);}throw Error('server '+output);}
let browser;
async function check(name,viewport,mobile){
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('JS '+e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico')&&!r.url().includes('/assets/textures/biomes/'))errors.push('HTTP '+r.status()+' '+r.url());});
 const click=async(sel)=>mobile?page.locator(sel).tap():page.locator(sel).click();
 try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!document.querySelector('#hero-entrance')?.hidden||
   document.querySelector('#preflight-summary')?.dataset.state==='fail',null,{timeout:90000});
  await click('[data-hero-archetype="plate"]');await page.locator('#hero-name').fill('Рыцарь QA');
  await click('#hero-create');
  await page.waitForFunction(()=>document.querySelector('#preflight-start')?.hidden===false||
   document.querySelector('#preflight-summary')?.dataset.state==='fail',null,{timeout:90000});
  const pre=await page.locator('#preflight-screen').innerText();
  assert.equal(await page.locator('#preflight-summary').getAttribute('data-state'),'ok',pre);
  await click('#preflight-start');
  await page.waitForFunction(()=>window.__ugameBoot?.phase==='playing',null,{timeout:30000});
  await click('#project-hub-open');await click('[data-hub-section="game"]');
  await click('[data-hub-item="knight-library"]');
  await page.locator('#knight-role-library').waitFor({timeout:10000});
  assert.equal(await page.locator('[data-knight-role]').count(),12);
  await page.waitForFunction(()=>document.querySelector('#knight-role-preview')?.getAttribute('src')?.startsWith('data:image/png'),null,{timeout:60000});
  assert.equal(await page.locator('#knight-role-preview').evaluate(img=>img.naturalWidth),128);
  const scale=page.locator('#knight-role-scale');
  await scale.evaluate(el=>{el.value='1.25';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('#knight-scale-value').innerText(),'1.25');
  const shadow=page.locator('#knight-role-shadow');
  await shadow.evaluate(el=>{el.value='0.55';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('#knight-shadow-value').innerText(),'55%');
  await click('#knight-role-hero');
  await page.waitForFunction(()=>document.documentElement.dataset.characterVisual==='knight-role',null,{timeout:90000});
  assert.equal(await page.locator('html').getAttribute('data-character-visual-scale'),'1.25');
  await click('#project-hub-close');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(()=>/^E-[0-9]+$/.test(document.documentElement.dataset.characterVisualFrame||''),null,{timeout:10000});
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(()=>document.documentElement.dataset.characterVisualFrame==='E-idle',null,{timeout:10000});
  const current=await page.evaluate(()=>JSON.parse(localStorage.getItem('ugame.save.v1')));
  assert.equal(current.player.characterVisual,undefined);
  await click('#project-hub-open');await click('[data-hub-section="game"]');await click('[data-hub-item="knight-library"]');
  // Wrong resolution screenshot must fail clearly, without corrupting existing visual.
  const bad=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=2048;c.height=1489;return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#knight-role-upload').setInputFiles({name:'incorrect.png',mimeType:'image/png',buffer:Buffer.from(bad,'base64')});
  await page.waitForFunction(()=>document.querySelector('#knight-role-status')?.textContent?.includes('2816×2048'),null,{timeout:15000});
  // Exact transparent sheet, with 88 visibly different colored frames, all arranged in 8x11 grid.
  const sample=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=2816;c.height=2048;
   const x=c.getContext('2d');
   for(let row=0;row<8;row++)for(let col=0;col<11;col++){
    x.fillStyle=row%2?'#9f3445':'#b9c6d3';
    x.fillRect(col*256+108,row*256+60,40,65);
    x.fillStyle='#202a35';x.fillRect(col*256+122+(col%4),row*256+92,7,11);
   }
   return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#knight-role-upload').setInputFiles({name:'my-knight.png',mimeType:'image/png',buffer:Buffer.from(sample,'base64')});
  await page.waitForFunction(()=>document.querySelector('#knight-role-status')?.textContent?.includes('сохранён для роли'),null,{timeout:60000});
  assert.match(await page.locator('#knight-role-file').innerText(),/my-knight\.png/);
  await click('[data-knight-role="banker"]');
  await page.locator('#knight-role-library').waitFor();
  await page.waitForFunction(()=>document.querySelector('#knight-role-preview')?.getAttribute('src')?.startsWith('data:image/png'),null,{timeout:60000});
  await click('#project-hub-close');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.querySelector('#hero-entrance')?.hidden||document.querySelector('#preflight-summary')?.dataset.state==='fail',null,{timeout:90000});
  await click('#hero-continue');
  await page.waitForFunction(()=>document.querySelector('#preflight-start')?.hidden===false||document.querySelector('#preflight-summary')?.dataset.state==='fail',null,{timeout:90000});
  assert.equal(await page.locator('#preflight-summary').getAttribute('data-state'),'ok','F5 Pre-flight must pass');
  await click('#preflight-start');
  await page.waitForFunction(()=>window.__ugameBoot?.phase==='playing',null,{timeout:90000});
  await page.waitForFunction(()=>document.documentElement.dataset.characterVisual==='knight-role',null,{timeout:90000});
  await click('#project-hub-open');await click('[data-hub-section="game"]');await click('[data-hub-item="knight-library"]');
  assert.match(await page.locator('#knight-role-file').innerText(),/my-knight\.png/);
  assert.equal(await page.locator('#knight-role-scale').inputValue(),'1.25');
  assert.equal(await page.locator('#knight-role-shadow').inputValue(),'0.55');
  await click('#knight-role-original');
  assert.equal(await page.locator('html').getAttribute('data-character-visual'),'original');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:dir+name+'.png',fullPage:true});
  console.log('[PASS] '+name+' Pre-flight, real 8-way Phaser player, 12 roles, scale/shadow, PNG import and persistent F5');
 }catch(e){
  await page.screenshot({path:dir+name+'-failure.png',fullPage:true}).catch(()=>{});
  console.error('[FAIL]',name,JSON.stringify({error:String(e),errors,html:await page.locator('body').innerText().catch(()=>''),boot:await page.evaluate(()=>window.__ugameBoot).catch(()=>null)},null,2).slice(0,7000));
  throw e;
 }finally{await context.close();}
}
try{await waitServer();browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});await check('desktop',{width:1365,height:768},false);await check('mobile',{width:390,height:844},true);}finally{await browser?.close().catch(()=>{});server.kill('SIGTERM');}
