// Real browser boot-gate smoke test. Run after installing Playwright + Chromium:
//   npm install --no-save --package-lock=false playwright@1.56.1
//   npx playwright install chromium --with-deps
//   node tests/browser-boot-smoke.mjs
// Unlike node --test unit checks, this tests the exact HTML -> Pre-flight -> Phaser -> World path.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseUrl = 'http://127.0.0.1:5173/';
const artifactDir = fileURLToPath(new URL('../artifacts/browser-smoke/', import.meta.url));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let serverOutput = '';
let browser;

async function waitForServer(child) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Dev server exited early: ' + serverOutput);
    try {
      const response = await fetch(baseUrl + 'version.json', { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* server has not started yet */ }
    await delay(200);
  }
  throw new Error('Dev server did not start: ' + serverOutput);
}

async function checkViewport(profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: 1,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    javaScriptEnabled: true
  });
  const page = await context.newPage();
  const activate = async (selector) => {
    const locator = page.locator(selector);
    if (profile.mobile) await locator.tap();
    else await locator.click();
  };
  const heroAssetRequests=[];
  page.on('request', request=>{
    if(new URL(request.url()).pathname.startsWith('/assets/characters/'))
      heroAssetRequests.push({method:request.method(),url:request.url()});
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack || String(error)));
  // A missing optional user-supplied biome image is allowed: Pre-flight uses a
  // built-in flat ground fallback. Other failed app requests still fail the QA.
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const pathname = new URL(response.url()).pathname;
    if (response.status() === 404 &&
        (pathname.startsWith('/assets/textures/biomes/') || pathname === '/favicon.ico')) return;
    errors.push('HTTP ' + response.status() + ': ' + response.url());
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (/Failed to load resource: the server responded with a status of 404/.test(message.text())) return;
    errors.push('Console: ' + message.text());
  });
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // A fresh browser must create a hero after Pre-flight, before Phaser writes a save.
    await page.waitForFunction(() => !document.querySelector('#hero-entrance')?.hidden ||
      document.querySelector('#preflight-summary')?.dataset.state==='fail',
      null,{timeout:75000});
    assert.equal(await page.locator('#hero-create-panel').isVisible(),true);
    assert.equal(await page.locator('#preflight-start').isHidden(),true);
    assert.equal(await page.locator('.hero-capital-card').count(),4,
      'Four capital portrait cards must appear side-by-side on the creation screen');
    assert.equal(await page.locator('[data-hero-image]').count(),4);
    for(const [i,bonus] of ['+1 РПС','+50 РП','+1% РПС','+20% максимума РП'].entries()) {
      const card=page.locator('.hero-capital-card').nth(i);
      assert.match(await card.innerText(),new RegExp('Столица '+(i+1)));
      assert.ok((await card.innerText()).includes(bonus),'Missing approved capital bonus '+bonus);
    }
    const desktopGrid=await page.locator('#hero-capital-grid').evaluate(el=>{
      const style=getComputedStyle(el);return {columns:style.gridTemplateColumns,
        scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
    });
    if(!profile.mobile)assert.equal(desktopGrid.columns.split(' ').length,4,
      'Desktop hero gallery should show four visible portrait columns');
    assert.equal(heroAssetRequests.filter(req=>req.method==='HEAD').length,8,
      'Pre-flight must check all eight hero assets without downloading PNG bodies');
    assert.ok(heroAssetRequests.filter(req=>req.method==='GET').length<=2,
      'Pre-flight eagerly downloaded multi-megabyte portraits');

    assert.equal(await page.evaluate(()=>localStorage.getItem('ugame.save.v1')),null,
      'Startup gate must not overwrite an undecided save');
    const portraits=await page.evaluate(async()=>{
      const archetypes=['plate','leather','cloth','hybrid'],genders=['male','female'];
      return Promise.all(archetypes.flatMap(a=>genders.map(async(g)=>{
        const {heroPortraitPath}=await import('./src/hero-identity.js');
        const url=heroPortraitPath(a,g);
        const response=await fetch(url,{cache:'no-store'});
        if(!response.ok)return {url,status:response.status};
        const bmp=await createImageBitmap(await response.blob());
        const result={url,status:response.status,width:bmp.width,height:bmp.height};
        bmp.close();return result;
      })));
    });
    assert.equal(portraits.length,8);
    for(const portrait of portraits){
      assert.equal(portrait.status,200,'Hero portrait missing: '+portrait.url);
      assert.ok(portrait.height>portrait.width*2,'Hero asset lost tall aspect ratio: '+portrait.url);
    }
    const expectFourPortraits=async(expected)=> {
      const paths=await page.locator('[data-hero-image]').evaluateAll(imgs=>
        imgs.map(img=>img.getAttribute('src')));
      assert.equal(paths.length,4);
      paths.forEach((path,i)=>assert.ok(path.endsWith(expected[i]),
        'Portrait '+i+' did not change with shared M/Ж toggle: '+path));
    };
    await expectFourPortraits(['22_45_51-1.png','22_45_53-3.png',
      '22_45_55-5.png','22_45_57-7.png']);
    await activate('[data-hero-gender="female"]');
    await expectFourPortraits(['22_45_52-2.png','22_45_54-4.png',
      '22_45_56-6.png','22_45_58-8.png']);
    await activate('[data-hero-archetype="leather"]');
    assert.equal(await page.locator('[data-hero-archetype="leather"]').getAttribute('aria-pressed'),'true');
    await activate('[data-hero-gender="male"]');
    await expectFourPortraits(['22_45_51-1.png','22_45_53-3.png',
      '22_45_55-5.png','22_45_57-7.png']);
    await activate('[data-hero-archetype="hybrid"]');
    await activate('[data-hero-gender="female"]');
    await page.locator('#hero-name').fill('Антоний QA');
    await activate('#hero-create');
    await page.waitForFunction(()=>document.querySelector('#hero-entrance')?.hidden===true);
    const heroSaved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ugame.save.v1')));
    assert.deepEqual(heroSaved.player.heroIdentity,{
      schemaVersion:1,name:'Антоний QA',gender:'female',archetype:'hybrid',capitalId:'inspire'
    });
    assert.equal(heroSaved.player.characterDraft,null);

    if (profile.mobile) {
      const layoutWidth = await page.evaluate(() => document.documentElement.clientWidth);
      assert.ok(layoutWidth <= profile.viewport.width + 4,
        'Mobile content inflated viewport to ' + layoutWidth + 'px (device ' + profile.viewport.width + 'px)');
    }
    await page.waitForFunction(() =>
      document.querySelector('#preflight-start')?.hidden === false ||
      document.querySelector('#preflight-summary')?.dataset.state === 'fail',
    null, { timeout: 75000 });
    const diagnostic = await page.locator('#preflight-screen').innerText();
    if (await page.locator('#preflight-summary').getAttribute('data-state') === 'fail') {
      throw new Error('Browser Pre-flight failed:\\n' + diagnostic);
    }
    assert.match(diagnostic, /225 зон · 5 городов · 840 переходов/);
    assert.match(diagnostic, /ВСЕ ПРОВЕРКИ ЗЕЛЁНЫЕ/);
    assert.equal(await page.locator('.preflight-row[data-state="fail"]').count(), 0);
    assert.equal(await page.evaluate(() => window.__ugameBoot?.phase), 'ready-waiting-user');

    // Real Chromium image decoding: exact artist filenames at original resolution.
    // This catches missing South-city textures that earlier preflight tolerated.
    const southTextures=await page.evaluate(async()=>{
      const names=['ground_1024.jpg','city_ground_1024.jpg'];
      return Promise.all(names.map(async(name)=>{
        const response=await fetch('./assets/textures/biomes/'+name,{cache:'no-store'});
        if(!response.ok)return {name,status:response.status};
        const image=await createImageBitmap(await response.blob());
        const result={name,status:response.status,width:image.width,height:image.height};
        image.close?.();
        return result;
      }));
    });
    for(const asset of southTextures){
      assert.equal(asset.status,200,'South texture missing: '+asset.name);
      assert.equal(asset.width,1024,'Incorrect original texture width: '+asset.name);
      assert.equal(asset.height,1024,'Incorrect original texture height: '+asset.name);
    }

    await activate('#preflight-start');
    await page.waitForFunction(() => window.__ugameBoot?.phase === 'playing', null, { timeout: 15000 });
    assert.equal(await page.locator('#app').getAttribute('aria-hidden'), 'false');
    assert.ok(await page.locator('#game canvas').count() >= 1, 'Phaser canvas did not mount');

    // Real in-game Character Draft: never auto-create a profile in an old save.
    assert.equal(await page.locator('#character-stats-open').count(),1);
    assert.equal(await page.locator('#character-orb-hp').getAttribute('data-ready'),'false');
    assert.equal(await page.locator('#character-orb-rp').getAttribute('data-ready'),'false');
    assert.match(await page.locator('#character-level').innerText(),/ЗРЛ 1 \/ 65/);
    assert.match(await page.locator('#character-xp').innerText(),/ЗРП 0/);
    assert.match(await page.locator('#header-stamina').innerText(),/Stamina/);
    await activate('#character-stats-open');
    await page.locator('#character-draft-panel').waitFor({timeout:10000});
    assert.equal(await page.locator('[data-character-stat]').count(),24);
    assert.match(await page.locator('#character-draft-status').innerText(),/не записан/);
    assert.match(await page.locator('#character-draft-panel').innerText(),/НЕ ВЛИЯЕТ НА ИГРУ/);
    await page.selectOption('#character-draft-city','focus');
    await page.locator('#character-draft-start').waitFor();
    await page.selectOption('#character-draft-start','2');
    await activate('#character-draft-save');
    assert.match(await page.locator('#character-draft-status').innerText(),/Сохранён/);
    const candidateSaved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ugame.save.v1')||'null'));
    assert.deepEqual(candidateSaved?.player?.characterDraft,
      {schemaVersion:1,cityId:'focus',startIndex:2});
    assert.equal(candidateSaved.player.classId,'wanderer','Draft must not change actual class');
    assert.equal(candidateSaved.schemaVersion,1,'Old SaveSystem schema preserved');
    assert.equal(candidateSaved.player.characterProgress.zrl,1);
    assert.equal(candidateSaved.player.characterProgress.zrp,0);
    await page.waitForFunction(()=>document.querySelector('#character-orb-hp')?.dataset.ready==='true');
    for(const key of ['hp','rp']){
      const o=page.locator('#character-orb-'+key);
      assert.equal(await o.getAttribute('data-ready'),'true');
      assert.ok(Number(await o.getAttribute('data-max'))>0,'Missing max '+key);
      assert.ok(Number(await o.getAttribute('data-current'))>0,'Missing current '+key);
      assert.ok(await o.locator('.orb-shell').isVisible(),'Orb hidden '+key);
      assert.ok((await o.locator('.orb-overlay-number').innerText()).length>3);
    }
    for(const key of ['hp','pp','rp','jp']){
      assert.ok(Number.isFinite(candidateSaved.player.characterPools.current[key]),'Invalid pool '+key);
    }
    const orbLayout=await page.evaluate(()=>{
      const left=document.querySelector('#character-orb-hp .orb-shell').getBoundingClientRect();
      const right=document.querySelector('#character-orb-rp .orb-shell').getBoundingClientRect();
      const shell=document.querySelector('.character-progress-block').getBoundingClientRect();
      return {left:{l:left.left,r:left.right,w:left.width},right:{l:right.left,r:right.right,w:right.width},
        shell:{l:shell.left,r:shell.right}};
    });
    assert.ok(orbLayout.left.w>=35&&orbLayout.right.w>=35,'Orbs too small');
    assert.ok(orbLayout.left.r<=orbLayout.right.l,'Orbs overlap');
    assert.ok(orbLayout.left.l>=orbLayout.shell.l-3 && orbLayout.right.r<=orbLayout.shell.r+3,
      'Orbs exceed progress panel '+JSON.stringify(orbLayout));
    await activate('#project-hub-close');

    // Real seven-slot hotbar and keyboard impulse, not only Node simulation.
    assert.equal(await page.locator('[data-skill-slot]').count(),7);
    const first=page.locator('[data-skill-slot="1"]');
    assert.ok(await first.isVisible(),'First combat skill not visible');
    const beforeSkill=await page.evaluate(()=>
      JSON.parse(localStorage.getItem('ugame.save.v1')||'null').player.characterPools.current);
    await page.keyboard.press('1');
    await page.waitForFunction((previous)=>{
      const pools=JSON.parse(localStorage.getItem('ugame.save.v1')||'null')?.player?.characterPools?.current;
      return pools&&pools.jp+pools.rp<previous.jp+previous.rp-30;
    },beforeSkill,{timeout:10000});
    const afterSkill=await page.evaluate(()=>
      JSON.parse(localStorage.getItem('ugame.save.v1')||'null').player.characterPools.current);
    assert.ok(Math.abs((beforeSkill.jp+beforeSkill.rp)-(afterSkill.jp+afterSkill.rp)-35)<2,
      'Impulse must debit 35 Desire then RP: '+JSON.stringify({beforeSkill,afterSkill}));
    assert.match(await page.locator('#skill-hotbar-status').innerText(),/Импульс/);
    assert.equal(await page.locator('[data-skill-slot="2"]').count(),1);
    await activate('[data-skill-slot="2"]');
    assert.match(await page.locator('#skill-hotbar-status').innerText(),/свободен/);
    const afterEmpty=await page.evaluate(()=>
      JSON.parse(localStorage.getItem('ugame.save.v1')||'null').player.characterPools.current);
    assert.ok(Math.abs(afterEmpty.rp+afterEmpty.jp-afterSkill.rp-afterSkill.jp)<3,
      'Empty second slot may not spend resource');
    // Confirm UI and actual click hit target on mobile, including all seven keys.
    const barLayout=await page.evaluate(()=>{
      const parent=document.querySelector('#skill-hotbar').getBoundingClientRect();
      const slots=[...document.querySelectorAll('[data-skill-slot]')].map(el=>{
        const r=el.getBoundingClientRect();
        return {left:r.left,right:r.right,width:r.width};
      });
      return {parent:{left:parent.left,right:parent.right},slots,viewport:innerWidth};
    });
    assert.ok(barLayout.slots.every(r=>r.width>=30&&r.left>=0&&r.right<=barLayout.viewport),
      'Skill bar must fit desktop/mobile viewport '+JSON.stringify(barLayout));
    // DEV test depletion proves HP+PP arcs and RP+JP orbs regenerate
    // without introducing fake combat enemies or off-session restoration.
    const probeInput=page.locator('#dev-code-input');
    await probeInput.fill('8661');
    await activate('#dev-console button[type="submit"]');
    await page.waitForFunction(()=>
      document.querySelector('#dev-code-status')?.textContent?.includes('8661'),null,{timeout:10000});
    const depleted=await page.evaluate(()=>
      JSON.parse(localStorage.getItem('ugame.save.v1')||'null').player.characterPools.current);
    assert.ok(depleted.hp<=beforeSkill.hp&&depleted.pp<=beforeSkill.pp);
    await page.waitForTimeout(1200);
    const regenerated=await page.evaluate(()=>
      JSON.parse(localStorage.getItem('ugame.save.v1')||'null').player.characterPools.current);
    assert.ok(regenerated.hp>=depleted.hp&&regenerated.rp>=depleted.rp,
      'Online regeneration must replenish current HP and RP');
    await probeInput.fill('8662');
    await activate('#dev-console button[type="submit"]');
    await page.waitForFunction(()=>
      document.querySelector('#dev-code-status')?.textContent?.includes('8662'),null,{timeout:10000});
    // Session-only DEV anomaly buffs: enable by code or RU/EN alias, remove with ×.
    const submitSkillDev=async(text,id)=>{
      await probeInput.fill(text);
      await activate('#dev-console button[type="submit"]');
      await page.waitForFunction(code=>document.querySelector('#dev-code-status')
        ?.textContent?.includes(code),id,{timeout:10000});
    };
    await submitSkillDev('без кд','8671');
    await page.locator('[data-dev-anomaly="noCooldown"]').waitFor();
    await submitSkillDev('free casts','8673');
    await page.locator('[data-dev-anomaly="freeSkills"]').waitFor();
    assert.equal(await first.getAttribute('data-free-skills'),'true');
    assert.equal(await first.getAttribute('data-cooldown-ms'),'0');
    const freeBefore=await page.evaluate(()=>
      JSON.parse(localStorage.getItem('ugame.save.v1')||'null').player.characterPools.current);
    await page.keyboard.press('1');
    await page.keyboard.press('1');
    const freeAfter=await page.evaluate(()=>
      JSON.parse(localStorage.getItem('ugame.save.v1')||'null').player.characterPools.current);
    assert.ok(freeAfter.rp>=freeBefore.rp-0.001&&freeAfter.jp>=freeBefore.jp-0.001,
      'DEV free casts must not spend JP/RP');
    await activate('[data-dev-anomaly-remove="freeSkills"]');
    assert.equal(await page.locator('[data-dev-anomaly="freeSkills"]').count(),0);
    await submitSkillDev('бессмертие','8672');
    await page.locator('[data-dev-anomaly="immortal"]').waitFor();
    await activate('[data-dev-anomaly-remove="immortal"]');
    assert.equal(await page.locator('[data-dev-anomaly="immortal"]').count(),0);
    await submitSkillDev('полное восстановление','8674');
    await submitSkillDev('no cd','8671');
    assert.equal(await page.locator('[data-dev-anomaly]').count(),0,
      'Repeated code must disable no cooldown buff');


    // Check real navigation and full enlarged world, not only a mocked renderWorldMap.
    await activate('#project-hub-open');
    // Project Hub defaults to the Project section, not the Game section.
    await activate('[data-hub-section="game"]');
    await activate('[data-hub-item="world-map"]');
    await page.getByText('Мир uGame · 225 локаций').waitFor({ timeout: 10000 });
    assert.equal(await page.locator('[data-world-map-zone]').count(), 225);
    assert.equal(await page.locator('[data-world-map-zone].is-city').count(), 5);
    assert.equal(await page.locator('[data-world-map-zone].is-current').count(), 1);
    const mapViewport=page.locator('#world-map-viewport');
    // All five cities, including long titles and the highlighted player city,
    // must fit *inside* their diamonds at the actual 100% / 175% / 225% layout
    // zoom in real Chromium (desktop and mobile). Temporarily focus each tile
    // without changing the in-memory world-map camera, then restore DOM styles.
    const cityFit=await mapViewport.evaluate(el=>{
      const stage=el.querySelector('.world-map-stage');
      const layer=el.querySelector('.world-map-camera-layer');
      const before={zoom:stage.style.zoom,left:layer.style.left,top:layer.style.top};
      const report=[];
      try{
        const cities=[...stage.querySelectorAll('[data-world-map-zone].is-city')];
        for(const scale of [1,1.75,2.25]){
          stage.style.zoom=String(scale);
          for(const city of cities){
            const css=getComputedStyle(city);
            layer.style.left=(el.clientWidth/2-parseFloat(css.left)*scale)+'px';
            layer.style.top=(el.clientHeight/2-parseFloat(css.top)*scale)+'px';
            const r=city.getBoundingClientRect();
            const cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;
            const radius=r.width/2;
            const label=city.querySelector('.world-map-tile-inner');
            const children=[...label.children].filter(child=>
              child.matches('strong,small,em'));
            const rects=children.map(node=>{
              const b=node.getBoundingClientRect();
              const corners=[[b.left,b.top],[b.right,b.top],
                [b.left,b.bottom],[b.right,b.bottom]];
              const intrusion=Math.max(...corners.map(([x,y])=>
                Math.abs(x-cx)+Math.abs(y-cy)-radius));
              return {text:node.textContent,tag:node.tagName,
                width:b.width,height:b.height,intrusion};
            });
            report.push({id:city.dataset.worldMapZone,
              scale,cityName:city.querySelector('strong').textContent,
              radius,rects});
          }
        }
      }finally{
        stage.style.zoom=before.zoom;
        layer.style.left=before.left;
        layer.style.top=before.top;
      }
      return report;
    });
    assert.equal(cityFit.length,15,'Expected 5 cities at 3 distinct zoom levels');
    for(const c of cityFit){
      assert.equal(c.rects.length,4,'City must have title, id, city type and role/biome: '+c.id);
      for(const box of c.rects){
        assert.ok(box.width>0&&box.height>0,'City label hidden: '+JSON.stringify(c));
        assert.ok(box.intrusion<=2*c.scale,
          'Text escapes the diamond: '+JSON.stringify({id:c.id,scale:c.scale,...box}));
      }
    }
    for(const c of cityFit.filter(c=>c.scale===2.25)){
      assert.ok(c.rects[1].text.startsWith('loc-'),'City ID must remain visible');
      assert.equal(c.rects[2].text,'ГОРОД');
      assert.match(c.rects[3].text,/ · /,'City specialization and biome still shown');
    }
    const metrics=async()=>mapViewport.evaluate(el=>{
      const stage=el.querySelector('.world-map-stage');
      const layer=el.querySelector('.world-map-camera-layer');
      const a=stage.getBoundingClientRect(),b=el.getBoundingClientRect();
      const style=getComputedStyle(stage);
      return {scale:Number(style.zoom),x:a.left-b.left,y:a.top-b.top,
        transform:style.transform,willChange:style.willChange,
        wrapperZoom:getComputedStyle(layer).zoom,
        stageWidth:a.width,stageHeight:a.height,
        viewportWidth:b.width,viewportHeight:b.height,
        scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,
        scrollHeight:el.scrollHeight,clientHeight:el.clientHeight};
    });
    // Every diamond and its upright labels must use the *same layout zoom*.
    // Check true browser screen coordinates rather than class names alone.
    const assertSharedGeometry=async()=>mapViewport.evaluate(el=>{
      const stage=el.querySelector('.world-map-stage');
      const bounds=stage.getBoundingClientRect();
      const scale=Number(getComputedStyle(stage).zoom);
      const viewportRect=el.getBoundingClientRect();
      // Chromium may skip the contents of tiles outside the viewport.
      // Inspect only painted, fully visible diamonds; offscreen child spans
      // can legitimately report a zero-sized bounding box.
      const tiles=[...stage.querySelectorAll('[data-world-map-zone]')];
      const candidates=tiles.filter(tile=>{
        const r=tile.getBoundingClientRect();
        const cx=r.left+r.width/2,cy=r.top+r.height/2;
        return cx>viewportRect.left+12&&cx<viewportRect.right-12&&
          cy>viewportRect.top+12&&cy<viewportRect.bottom-12;
      }).slice(0,8);
      return candidates.map(tile=>{
        const r=tile.getBoundingClientRect();
        const label=tile.querySelector('.world-map-tile-inner').getBoundingClientRect();
        const css=getComputedStyle(tile);
        const expectedX=bounds.left+parseFloat(css.left)*scale;
        const expectedY=bounds.top+parseFloat(css.top)*scale;
        return {id:tile.dataset.worldMapZone,
          errorX:Math.abs((r.left+r.width/2)-expectedX),
          errorY:Math.abs((r.top+r.height/2)-expectedY),
          labelX:Math.abs((label.left+label.width/2)-(r.left+r.width/2)),
          labelY:Math.abs((label.top+label.height/2)-(r.top+r.height/2))};
      });
    });
    async function checkCrispTiles(){
      const info=await metrics();
      assert.equal(info.transform,'none','No cached transform bitmap on the entire map');
      assert.notEqual(info.willChange,'transform','No pre-rasterized will-change transform layer');
      assert.equal(info.wrapperZoom,'1','Pan wrapper must not scale');
      const samples=await assertSharedGeometry();
      assert.ok(samples.length>0,'At least one visible tile must retain its label');
      for(const p of samples){
        assert.ok(p.errorX<2&&p.errorY<2,
          'Tile detached from shared camera at '+p.id+': '+JSON.stringify(p));
        assert.ok(p.labelX<2&&p.labelY<2,
          'Tile label drifts away from diamond '+p.id+': '+JSON.stringify(p));
      }
    }
    const initial=await metrics();
    assert.ok(initial.scale>0.6&&initial.scale<1.5,'Start at medium-scale current location');
    await checkCrispTiles();
    assert.equal(await page.locator('.world-map-scroll').count(),0,'Old scroll container still exists');
    assert.equal(await mapViewport.evaluate(el=>getComputedStyle(el).overflow),'hidden');
    await activate('#world-map-fit');
    const overview=await metrics();
    await checkCrispTiles();
    assert.ok(overview.scale<initial.scale,'Overview must zoom out');
    assert.ok(overview.stageWidth<=overview.viewportWidth+2,'Fit does not fit map width');
    assert.ok(overview.stageHeight<=overview.viewportHeight+2,'Fit does not fit map height');
    await activate('#world-map-find-me');
    const focused=await metrics();
    await checkCrispTiles();
    assert.ok(focused.scale>overview.scale,'Find Me must zoom back to medium scale');
    // On mobile the now-visible toolbar labels push the map below the fold.
    // Scroll the actual viewport into view before CDP touch gestures.
    await mapViewport.scrollIntoViewIfNeeded();
    const centre=await mapViewport.boundingBox();
    if(!centre)throw Error('Map viewport not measurable');
    if(!profile.mobile){
      await page.mouse.move(centre.x+centre.width/2,centre.y+centre.height/2);
      await page.mouse.wheel(0,-600);
      await page.waitForTimeout(160);
      const zoomed=await metrics();
      await checkCrispTiles();
      assert.ok(zoomed.scale>focused.scale,'Mouse wheel must zoom in');
      await page.mouse.down();
      await page.mouse.move(centre.x+centre.width/2+80,centre.y+centre.height/2+36,{steps:8});
      await page.mouse.up();
      const dragged=await metrics();
      assert.ok(Math.abs(dragged.x-zoomed.x)>8||Math.abs(dragged.y-zoomed.y)>8,
        'Dragging map must pan the canvas');
    }else{
      // CDP synthesizes real multi-touch input through Chromium, not a JS mock.
      const session=await context.newCDPSession(page);
      const cx=centre.x+centre.width/2,cy=centre.y+centre.height/2;
      const touch=(x,y,id)=>({x,y,id});
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',
        touchPoints:[touch(cx-38,cy,1),touch(cx+38,cy,2)]});
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',
        touchPoints:[touch(cx-70,cy,1),touch(cx+70,cy,2)]});
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.waitForTimeout(120);
      const pinched=await metrics();
      await checkCrispTiles();
      assert.ok(pinched.scale>focused.scale,'Two-finger pinch must zoom on mobile');
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(cx,cy,1)]});
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(cx-42,cy-30,1)]});
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const moved=await metrics();
      assert.ok(Math.abs(moved.x-pinched.x)>5||Math.abs(moved.y-pinched.y)>5,
        'Single-finger mobile swipe must pan');
    }
    await activate('#world-map-find-me');
    assert.equal(await page.locator('[data-world-map-zone].is-current.is-selected').count(), 1);

    await activate('#project-hub-back');
    await activate('[data-hub-section="tools"]');
    await activate('[data-hub-item="world-analyzer"]');
    await page.locator('#world-analyzer-resource').waitFor({ timeout: 10000 });
    await activate('#project-hub-close');
    assert.equal(await page.locator('#project-hub').isHidden(), true);

    // Regression: a real user-controlled save survives browser F5 in the enlarged
    // 225-zone world. Playwright uses a fresh isolated origin; no user saves touched.
    const dev = async (code, expected) => {
      const input = page.locator('#dev-code-input');
      await input.fill(code);
      await activate('#dev-console button[type="submit"]');
      await page.waitForFunction((message) =>
        document.querySelector('#dev-code-status')?.textContent?.includes(message),
      expected, { timeout: 10000 });
    };
    // Bilingual DEV controls: live XP %, ZRL, signed OTV, free 5-city travel.
    // Actual RU/EN command entry (not just bilingual labels); numeric API remains.
    assert.equal(await page.locator('#dev-code-suggestions option').count(),142);
    const inputBox=await page.locator('#dev-code-input').boundingBox();
    assert.ok(inputBox.width>=85&&inputBox.x+inputBox.width<=profile.viewport.width+4,
      'DEV bilingual input must remain visible on '+profile.name);
    await dev('тп','2399');
    assert.equal(await page.locator('[data-dev-action="city"]').count(),5);
    await activate('[data-dev-close]');
    await dev('teleport','2399');
    assert.equal(await page.locator('[data-dev-action="city"]').count(),5);
    await activate('[data-dev-close]');
    await dev('персонаж','2299');
    await activate('[data-dev-close]');
    await dev('xp +5%','2101');
    await dev('зрп -10%','2112');
    await dev('save','9001');
    await dev('сохранить','9001');
    await dev('2299','2299');
    const devPanel=page.locator('#dev-character-panel');
    assert.equal(await devPanel.isVisible(),true);
    await page.locator('[data-dev-input="zrp"]').fill('1000');
    await activate('[data-dev-action="zrp"]');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ugame.save.v1')||'null')
      ?.player?.characterProgress?.zrp===1000);
    await activate('[data-dev-code="2101"]');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ugame.save.v1')||'null')
      ?.player?.characterProgress?.zrp===1050);
    await page.locator('[data-dev-input="zrl"]').fill('30');
    await activate('[data-dev-action="zrl"]');
    await page.locator('[data-dev-input="otv"]').fill('600');
    await activate('[data-dev-action="otv"]');
    assert.equal(await page.locator('[data-dev-input="zrl"]').inputValue(),'30');
    assert.equal(await page.locator('[data-dev-input="otv"]').inputValue(),'600');
    assert.equal((await page.locator('#dev-character-content').innerText()).includes('English'),false);
    await activate('[data-dev-close]');
    await dev('2201','ЗРЛ');
    await dev('2113','ЗРП');
    const afterDev=await page.evaluate(()=>JSON.parse(localStorage.getItem('ugame.save.v1')||'null'));
    assert.equal(afterDev.player.characterProgress.zrl,31);
    assert.equal(afterDev.player.characterProgress.zrp,525);
    assert.equal(afterDev.player.characterResponsibility,600);
    assert.equal(afterDev.schemaVersion,1);
    assert.equal(await page.locator('#character-level').innerText(),'ЗРЛ 31 / 65');
    assert.match(await page.locator('#character-xp').innerText(),/525/);
    await dev('2399','2399');
    assert.equal(await page.locator('[data-dev-action="city"]').count(),5);
    const priorSteps=await page.evaluate(()=>JSON.parse(localStorage.getItem('ugame.save.v1')||'null')?.stepEconomy);
    await activate('[data-dev-city-id="loc-00025"]');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ugame.save.v1')||'null')
      ?.world?.zoneId==='loc-00025');
    assert.equal(await devPanel.isHidden(),true);
    const stepsAfterTp=await page.evaluate(()=>JSON.parse(localStorage.getItem('ugame.save.v1')||'null')?.stepEconomy);
    assert.equal(stepsAfterTp.debt,priorSteps.debt,'DEV teleport must not create Step debt');
    assert.ok(stepsAfterTp.balance>=priorSteps.balance,'DEV teleport must cost no Steps');
    await dev('2399','2399');
    await activate('[data-dev-city-id="loc-00013"]');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ugame.save.v1')||'null')
      ?.world?.zoneId==='loc-00013');

    await dev('7002', '7002 · Класс: Разведчик');
    await dev('9001', '9001 · Состояние сохранено');
    const beforeReload = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('ugame.save.v1') || 'null'));
    assert.ok(beforeReload, 'DEV 9001 did not create a browser save');
    assert.equal(beforeReload.schemaVersion, 1);
    assert.equal(beforeReload.player?.classId, 'scout');
    assert.equal(beforeReload.world?.zoneId, 'loc-00013');
    assert.equal(Object.keys(beforeReload.worldSpawnState?.zones || {}).length, 220);
    assert.equal(beforeReload.containers?.schemaVersion, 1);
    const sampleZone = beforeReload.worldSpawnState.zones['loc-00026'];
    assert.ok(sampleZone?.tier, 'outer-ring zone Tier was not saved');

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector('#hero-entrance')?.hidden ||
      document.querySelector('#preflight-summary')?.dataset.state==='fail',
      null,{timeout:75000});
    assert.equal(await page.locator('#hero-continue').isVisible(),true);
    assert.match(await page.locator('#hero-existing-name').innerText(),/Антоний QA/);
    await activate('#hero-continue');
    await page.waitForFunction(() =>
      document.querySelector('#preflight-start')?.hidden === false ||
      document.querySelector('#preflight-summary')?.dataset.state === 'fail',
    null, { timeout: 75000 });
    assert.equal(await page.locator('#preflight-summary').getAttribute('data-state'), 'ok',
      'Browser F5 caused Pre-flight failure');
    await activate('#preflight-start');
    await page.waitForFunction(() => window.__ugameBoot?.phase === 'playing', null, { timeout: 15000 });
    assert.match(await page.locator('#character-class').innerText(), /Разведчик/);
    assert.match(await page.locator('#character-name').innerText(),/Антоний QA/);
    const preservedHero=await page.evaluate(()=>JSON.parse(localStorage.getItem('ugame.save.v1'))?.player?.heroIdentity);
    assert.deepEqual(preservedHero,{schemaVersion:1,name:'Антоний QA',gender:'female',archetype:'hybrid',capitalId:'inspire'});
    // Draft survives F5 independently from the live class and old world save.
    await activate('#character-stats-open');
    await page.locator('#character-draft-panel').waitFor({timeout:10000});
    assert.equal(await page.locator('#character-draft-city').inputValue(),'focus');
    assert.equal(await page.locator('#character-draft-start').inputValue(),'2');
    assert.equal(await page.locator('#character-orb-hp').getAttribute('data-ready'),'true');
    assert.equal(await page.locator('#character-orb-rp').getAttribute('data-ready'),'true');
    assert.equal(await page.locator('#character-level').innerText(),'ЗРЛ 31 / 65');
    assert.match(await page.locator('#character-xp').innerText(),/ЗРП 525/);
    assert.match(await page.locator('#character-draft-status').innerText(),/Сохранён/);
    await activate('#project-hub-close');
    const afterReload = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('ugame.save.v1') || 'null'));
    assert.equal(afterReload?.player?.classId, 'scout', 'class reverted after F5');
    assert.equal(afterReload?.player?.characterProgress?.zrl,31);
    assert.equal(afterReload?.player?.characterProgress?.zrp,525);
    assert.equal(afterReload?.player?.characterResponsibility,600);
    assert.match(await page.locator('#character-level').innerText(),/31 \/ 65/);
    assert.equal(afterReload?.world?.zoneId, beforeReload.world.zoneId, 'save restored wrong zone');
    assert.equal(Object.keys(afterReload?.worldSpawnState?.zones || {}).length, 220);
    assert.deepEqual(afterReload.worldSpawnState.zones['loc-00026'], sampleZone,
      'F5 unexpectedly rerolled unexpired outer-ring Location Tier');

    assert.equal(errors.length, 0, profile.name + ' browser errors:\n' + errors.join('\n'));
    console.log('[PASS] ' + profile.name + ': Pre-flight, Phaser, 225-zone map, analyzer and save/F5 restore');
  } catch (error) {
    mkdirSync(artifactDir, { recursive: true });
    const screenshot = artifactDir + profile.name + '-failure.png';
    try { await page.screenshot({ path: screenshot, fullPage: true, timeout: 5000 }); } catch { /* best effort */ }
    const details = await page.evaluate(() => ({
      phase: window.__ugameBoot?.phase || 'unknown',
      bootError: window.__ugameBoot?.error || null,
      preflight: document.querySelector('#preflight-screen')?.innerText?.slice(-2500) || '',
      world: document.querySelector('#quest-status')?.textContent || '',
      devStatus: document.querySelector('#dev-code-status')?.textContent || '',
      devInput: document.querySelector('#dev-code-input')?.value || '',
      startButtonHitTest: (() => {
        const button = document.querySelector('#preflight-start');
        if (!button) return null;
        const rect = button.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        return {
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          topElement: document.elementFromPoint(x, y)?.outerHTML?.slice(0, 200) || null,
          viewport: { width: innerWidth, height: innerHeight }
        };
      })()
    })).catch(() => null);
    console.error('[FAIL] ' + profile.name, JSON.stringify({ details, errors, serverOutput, screenshot }, null, 2));
    throw error;
  } finally {
    await context.close();
  }
}

const server = spawn(process.execPath, ['tools/dev-server.mjs'], {
  cwd: root,
  env: { ...process.env, CI: 'true' },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', (data) => { serverOutput += String(data).slice(-3000); });
server.stderr.on('data', (data) => { serverOutput += String(data).slice(-3000); });
try {
  await waitForServer(server);
  browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']
  });
  await checkViewport({ name: 'desktop', viewport: { width: 1365, height: 768 }, mobile: false });
  await checkViewport({ name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true });
  console.log('[PASS] Browser startup smoke test: both viewports.');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
