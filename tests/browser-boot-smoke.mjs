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

    await activate('#preflight-start');
    await page.waitForFunction(() => window.__ugameBoot?.phase === 'playing', null, { timeout: 15000 });
    assert.equal(await page.locator('#app').getAttribute('aria-hidden'), 'false');
    assert.ok(await page.locator('#game canvas').count() >= 1, 'Phaser canvas did not mount');

    // Check real navigation and full enlarged world, not only a mocked renderWorldMap.
    await activate('#project-hub-open');
    // Project Hub defaults to the Project section, not the Game section.
    await activate('[data-hub-section="game"]');
    await activate('[data-hub-item="world-map"]');
    await page.getByText('Мир uGame · 225 локаций').waitFor({ timeout: 10000 });
    assert.equal(await page.locator('[data-world-map-zone]').count(), 225);
    assert.equal(await page.locator('[data-world-map-zone].is-city').count(), 5);
    assert.equal(await page.locator('[data-world-map-zone].is-current').count(), 1);
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
      await input.press('Enter');
      await page.locator('#dev-code-status').getByText(expected).waitFor({ timeout: 10000 });
    };
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
    await page.waitForFunction(() =>
      document.querySelector('#preflight-start')?.hidden === false ||
      document.querySelector('#preflight-summary')?.dataset.state === 'fail',
    null, { timeout: 75000 });
    assert.equal(await page.locator('#preflight-summary').getAttribute('data-state'), 'ok',
      'Browser F5 caused Pre-flight failure');
    await activate('#preflight-start');
    await page.waitForFunction(() => window.__ugameBoot?.phase === 'playing', null, { timeout: 15000 });
    assert.match(await page.locator('#character-class').innerText(), /Разведчик/);
    const afterReload = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('ugame.save.v1') || 'null'));
    assert.equal(afterReload?.player?.classId, 'scout', 'class reverted after F5');
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
