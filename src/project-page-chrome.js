import { GameClockSystem } from './game-clock-system.js';
import { InterfaceSettingsSystem } from './interface-settings.js';

const ROOT = new URL('../', import.meta.url);
const SESSION_KEY = 'ugame.session.startedAt.v1';
const ZONE_KEY = 'ugame.session.zone.v1';
const SAVE_KEY = 'ugame.save.v1';

function safeStorage(kind) {
  try { return globalThis[kind] || null; } catch { return null; }
}

function pad2(value) {
  return String(Math.max(0, Math.floor(Number(value) || 0))).padStart(2, '0');
}

function durationLabel(ms) {
  const total = Math.max(0, Math.floor(Number(ms) || 0) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

function environmentLabel() {
  const host = location.hostname;
  if (host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return 'LOCAL';
  if (host === 'sunpole.github.io') return 'PAGES';
  return 'WEB';
}

function timezoneLabel(date = new Date()) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes ? `${zone} · UTC${sign}${hours}:${pad2(minutes)}` : `${zone} · UTC${sign}${hours}`;
}

function readJson(storage, key) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function resolveBuild(environment, version) {
  if (environment === 'LOCAL') {
    const data = await fetchJson('/__ugame/meta.json');
    if (typeof data?.commit === 'string' && data.commit) return `SHA ${data.commit.slice(0, 7)}`;
  }
  if (environment === 'PAGES') {
    const data = await fetchJson('https://api.github.com/repos/sunpole/uGame/commits/main');
    if (typeof data?.sha === 'string' && data.sha) return `SHA ${data.sha.slice(0, 7)}`;
  }
  return `BUILD ${version || '—'}`;
}

function className(id) {
  return {
    wanderer: 'Странник',
    scout: 'Разведчик',
    tracker: 'Следопыт'
  }[id] || id || '—';
}

function markup(pageTitle) {
  return {
    header: `
      <div class="ugc-brand"><a href="${new URL('./', ROOT).href}">uGame</a><span>${pageTitle}</span></div>
      <div class="ugc-character"><strong id="ugc-character">Персонаж · —</strong><span id="ugc-location-top">Локация —</span></div>
      <div id="ugc-resources" class="ugc-resources"><span>Камень 0</span><span>Дерево 0</span><span>Вода 0</span><span>Внимание 0</span></div>
    `,
    footer: `
      <div class="ugc-footer-block ugc-version"><strong id="ugc-version">v—</strong></div>
      <div class="ugc-footer-block"><span id="ugc-build">BUILD —</span><span id="ugc-env">—</span></div>
      <div class="ugc-footer-block"><span>Сессия</span><strong id="ugc-session">00:00:00</strong></div>
      <div class="ugc-footer-block"><span id="ugc-location">Локация —</span></div>
      <div class="ugc-footer-block"><span>🎮</span><strong id="ugc-game-clock">01.01.2026 · 00:00:00 · 🌙 Ночь · ×12</strong></div>
      <div class="ugc-footer-block ugc-real"><span id="ugc-real-date">—</span><strong id="ugc-real-clock">--:--:--</strong><span id="ugc-timezone">—</span></div>
    `
  };
}

export async function initProjectPageChrome({ pageTitle = document.title } = {}) {
  if (document.querySelector('.ugc-page-header')) return;

  new InterfaceSettingsSystem();

  document.documentElement.classList.add('ugc-page');
  const parts = markup(pageTitle);
  const header = document.createElement('div');
  header.className = 'ugc-page-header';
  header.innerHTML = parts.header;
  const footer = document.createElement('div');
  footer.className = 'ugc-page-footer';
  footer.innerHTML = parts.footer;
  document.body.prepend(header);
  document.body.append(footer);

  const local = safeStorage('localStorage');
  const session = safeStorage('sessionStorage');
  const save = readJson(local, SAVE_KEY) || {};
  const zoneSession = readJson(session, ZONE_KEY) || {};
  let sessionStartedAt = Number(session?.getItem(SESSION_KEY));
  if (!Number.isFinite(sessionStartedAt) || sessionStartedAt <= 0) {
    sessionStartedAt = Date.now();
    try { session?.setItem(SESSION_KEY, String(sessionStartedAt)); } catch {}
  }

  const [versionData, resourcesData, worldData] = await Promise.all([
    fetchJson(new URL('version.json', ROOT)),
    fetchJson(new URL('data/resources.json', ROOT)),
    fetchJson(new URL('data/world.json', ROOT))
  ]);

  const version = String(versionData?.version || '—');
  const environment = environmentLabel();
  document.querySelector('#ugc-version').textContent = `v${version}`;
  document.querySelector('#ugc-env').textContent = environment;
  document.querySelector('#ugc-build').textContent = await resolveBuild(environment, version);

  const currentClass = className(save?.player?.classId);
  document.querySelector('#ugc-character').textContent = `Персонаж · Класс ${currentClass}`;

  const resourceMap = new Map((resourcesData?.resources || []).map((item) => [item.id, item]));
  const values = save?.resources || {};
  const resourceHost = document.querySelector('#ugc-resources');
  resourceHost.replaceChildren();
  for (const id of ['stone', 'wood', 'water', 'attention']) {
    const item = resourceMap.get(id);
    if (!item) continue;
    const span = document.createElement('span');
    span.textContent = `${item.name} ${Number(values[id] || 0)}`;
    resourceHost.append(span);
  }

  const zoneId = save?.world?.zoneId || zoneSession?.zoneId || null;
  const zone = (worldData?.zones || []).find((item) => item.id === zoneId) || null;
  const zoneName = zone ? `${zone.name} · ${zone.id}` : (zoneId || 'Локация —');
  document.querySelector('#ugc-location-top').textContent = zoneName;

  const gameClock = new GameClockSystem({ element: document.querySelector('#ugc-game-clock') });
  gameClock.start();

  const tick = () => {
    const now = Date.now();
    const date = new Date(now);
    document.querySelector('#ugc-session').textContent = durationLabel(now - sessionStartedAt);
    const enteredAt = Number(zoneSession?.enteredAt);
    const zoneTail = Number.isFinite(enteredAt) && enteredAt > 0 ? ` · в зоне ${durationLabel(now - enteredAt)}` : '';
    document.querySelector('#ugc-location').textContent = `${zoneName}${zoneTail}`;
    document.querySelector('#ugc-real-date').textContent = new Intl.DateTimeFormat('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' }).format(date);
    document.querySelector('#ugc-real-clock').textContent = new Intl.DateTimeFormat('ru-RU', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(date);
    document.querySelector('#ugc-timezone').textContent = timezoneLabel(date);
  };
  tick();
  window.setInterval(tick, 1000);
}
