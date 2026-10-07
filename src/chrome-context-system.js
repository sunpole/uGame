const SESSION_KEY = 'ugame.session.startedAt.v1';
const ZONE_KEY = 'ugame.session.zone.v1';

function safeSessionStorage() {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
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
  const host = window.location.hostname;
  if (host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    return 'LOCAL';
  }
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
  const offset = minutes
    ? `UTC${sign}${hours}:${pad2(minutes)}`
    : `UTC${sign}${hours}`;
  return `${zone} · ${offset}`;
}

function percentLabel(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const fixed = number >= 10 ? number.toFixed(Math.min(1, digits)) : number.toFixed(digits);
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function zoneDetails(zone) {
  const parts = ['LT —', 'Биом —'];
  const speed = Number(zone?.rules?.speedMultiplier);
  const darkness = Number(zone?.rules?.vision?.darkness);
  if (Number.isFinite(speed)) parts.push(`скорость ×${speed.toFixed(2)}`);
  if (Number.isFinite(darkness)) parts.push(`темнота ${Math.round(darkness * 100)}%`);
  return parts;
}

export class ChromeContextSystem {
  constructor({
    versionElement,
    buildElement,
    environmentElement,
    sessionElement,
    locationPrimaryElement,
    locationSecondaryElement,
    realDateElement,
    realClockElement,
    realTimezoneElement,
    headerLocationElement
  } = {}) {
    this.versionElement = versionElement;
    this.buildElement = buildElement;
    this.environmentElement = environmentElement;
    this.sessionElement = sessionElement;
    this.locationPrimaryElement = locationPrimaryElement;
    this.locationSecondaryElement = locationSecondaryElement;
    this.realDateElement = realDateElement;
    this.realClockElement = realClockElement;
    this.realTimezoneElement = realTimezoneElement;
    this.headerLocationElement = headerLocationElement;
    this.storage = safeSessionStorage();
    this.sessionStartedAt = this.restoreSessionStart();
    this.currentZone = null;
    this.zoneRuntimeStatus = '';
    this.locationTierContext = null;
    this.zoneEnteredAt = this.restoreZoneState()?.enteredAt || Date.now();
    this.timer = null;
    this.version = '';
    this.environment = environmentLabel();
  }

  restoreSessionStart() {
    const raw = this.storage?.getItem(SESSION_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    const now = Date.now();
    try { this.storage?.setItem(SESSION_KEY, String(now)); } catch {}
    return now;
  }

  restoreZoneState() {
    try {
      const raw = this.storage?.getItem(ZONE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed.zoneId !== 'string' || !Number.isFinite(Number(parsed.enteredAt))) return null;
      return { zoneId: parsed.zoneId, enteredAt: Number(parsed.enteredAt) };
    } catch {
      return null;
    }
  }

  async loadBuildContext() {
    try {
      const response = await fetch('./version.json', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data?.version) {
          this.version = String(data.version);
          if (this.versionElement) this.versionElement.textContent = `v${this.version}`;
        }
      }
    } catch {}

    if (this.environmentElement) this.environmentElement.textContent = this.environment;

    let commit = '';
    if (this.environment === 'LOCAL') {
      try {
        const response = await fetch('/__ugame/meta.json', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          commit = typeof data?.commit === 'string' ? data.commit : '';
        }
      } catch {}
    } else if (this.environment === 'PAGES') {
      try {
        const response = await fetch('https://api.github.com/repos/sunpole/uGame/commits/main', {
          cache: 'no-store',
          headers: { Accept: 'application/vnd.github+json' }
        });
        if (response.ok) {
          const data = await response.json();
          commit = typeof data?.sha === 'string' ? data.sha : '';
        }
      } catch {}
    }

    if (this.buildElement) {
      this.buildElement.textContent = commit
        ? `SHA ${commit.slice(0, 7)}`
        : `BUILD ${this.version || '—'}`;
      this.buildElement.title = commit || 'Точный commit недоступен; показан version/build fallback.';
    }
  }

  setZone(zone) {
    if (!zone?.id) return;
    const restored = this.restoreZoneState();
    if (restored?.zoneId === zone.id) {
      this.zoneEnteredAt = restored.enteredAt;
    } else if (this.currentZone?.id !== zone.id) {
      this.zoneEnteredAt = Date.now();
    }

    this.currentZone = zone;
    try {
      this.storage?.setItem(ZONE_KEY, JSON.stringify({
        zoneId: zone.id,
        enteredAt: this.zoneEnteredAt
      }));
    } catch {}
    this.renderLocation(Date.now());
  }

  setZoneRuntimeStatus(text = '') {
    this.zoneRuntimeStatus = String(text || '').trim();
    this.renderLocation(Date.now());
  }

  setLocationTierContext(context = null) {
    this.locationTierContext = context && typeof context === 'object' ? { ...context } : null;
    this.renderLocation(Date.now());
  }

  start() {
    this.stop();
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    const now = Date.now();
    const date = new Date(now);
    if (this.sessionElement) this.sessionElement.textContent = durationLabel(now - this.sessionStartedAt);
    if (this.realDateElement) {
      this.realDateElement.textContent = new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    }
    if (this.realClockElement) {
      this.realClockElement.textContent = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    }
    if (this.realTimezoneElement) this.realTimezoneElement.textContent = timezoneLabel(date);
    this.renderLocation(now);
  }

  renderLocation(now = Date.now()) {
    const zone = this.currentZone;
    const context = this.locationTierContext;

    if (this.locationPrimaryElement) {
      if (!zone) {
        this.locationPrimaryElement.textContent = 'Локация —';
      } else if (context?.isSafeCity) {
        this.locationPrimaryElement.textContent = (zone.name || zone.id) + ' · ' + zone.id + ' · ГОРОД · D0';
      } else if (context?.tier) {
        this.locationPrimaryElement.textContent = (zone.name || zone.id) + ' · ' + zone.id + ' · LT ' + context.tier + ' · D' + (context.distanceFromSafeCity ?? '—');
      } else {
        this.locationPrimaryElement.textContent = (zone.name || zone.id) + ' · ' + zone.id;
      }
    }

    if (this.headerLocationElement) {
      if (!zone) {
        this.headerLocationElement.textContent = 'Локация: —';
        this.headerLocationElement.title = '';
      } else if (context?.isSafeCity) {
        this.headerLocationElement.textContent = 'Город · D0';
        this.headerLocationElement.title = (zone.name || zone.id) + ': безопасный город';
      } else if (context?.tier) {
        const chance = percentLabel(context.currentTierChance);
        const bonus = Math.round((Number(context.locationBonus) || 0) * 100);
        this.headerLocationElement.textContent = 'LT ' + context.tier + ' · D' + (context.distanceFromSafeCity ?? '—') + ' · P ' + chance + '% · +' + bonus + '%';
        if (context?.probabilityProfile) {
          const p = context.probabilityProfile;
          this.headerLocationElement.title = (zone.name || zone.id) + ': T1 ' + percentLabel(p.T1) + '% · T2 ' + percentLabel(p.T2) + '% · T3 ' + percentLabel(p.T3) + '% · T4 ' + percentLabel(p.T4) + '%';
        }
      } else {
        this.headerLocationElement.textContent = 'LT —';
        this.headerLocationElement.title = '';
      }
    }

    if (this.locationSecondaryElement) {
      const details = [];
      if (context?.isSafeCity) {
        details.push('Safe City');
      } else if (context?.tier) {
        const chance = percentLabel(context.currentTierChance);
        const bonus = Math.round((Number(context.locationBonus) || 0) * 100);
        details.push('P(' + context.tier + ') ' + chance + '%');
        details.push('бонус +' + bonus + '%');
        details.push('capacity ' + (context.spawnCapacity ?? '—'));
      } else if (zone) {
        details.push(...zoneDetails(zone));
      } else {
        details.push('LT —', 'Биом —');
      }

      if (zone?.biome) details.push('биом ' + zone.biome);
      const speed = Number(zone?.rules?.speedMultiplier);
      const darkness = Number(zone?.rules?.vision?.darkness);
      if (Number.isFinite(speed)) details.push('скорость ×' + speed.toFixed(2));
      if (Number.isFinite(darkness)) details.push('темнота ' + Math.round(darkness * 100) + '%');
      if (this.zoneRuntimeStatus && !details.includes(this.zoneRuntimeStatus)) details.push(this.zoneRuntimeStatus);

      this.locationSecondaryElement.textContent = details.join(' · ') + ' · в зоне ' + durationLabel(now - this.zoneEnteredAt);
      if (context?.probabilityProfile) {
        const p = context.probabilityProfile;
        this.locationSecondaryElement.title = 'Шансы Location Tier при D' + (context.distanceFromSafeCity ?? '—') + ': T1 ' + percentLabel(p.T1) + '% · T2 ' + percentLabel(p.T2) + '% · T3 ' + percentLabel(p.T3) + '% · T4 ' + percentLabel(p.T4) + '%';
      } else {
        this.locationSecondaryElement.title = '';
      }
    }
  }
}

export { durationLabel, environmentLabel, timezoneLabel };
