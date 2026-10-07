import { GROUND_TEXTURE_ASSETS } from './ground-texture-system.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function inlineMarkdown(value = '') {
  let text = escapeHtml(value);
  text = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const decodedHref = href.replaceAll('&amp;', '&');
    const safe = /^(https?:\/\/|\.\.?\/|\/|#)/.test(decodedHref) ? href : '#';
    return '<a href="' + safe + '">' + label + '</a>';
  });
  return text;
}

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderMarkdown(markdown = '') {
  const lines = String(markdown).replaceAll('\r\n', '\n').split('\n');
  const html = [];
  let listType = null;
  let inCode = false;
  let codeLines = [];

  const closeList = () => {
    if (!listType) return;
    html.push('</' + listType + '>');
    listType = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];

    if (rawLine.trim().startsWith('```')) {
      closeList();
      if (inCode) {
        html.push('<pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    const line = rawLine.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }

    if (line.trim() === '---') {
      closeList();
      html.push('<hr>');
      continue;
    }

    if (index + 1 < lines.length && line.includes('|') && isTableSeparator(lines[index + 1])) {
      closeList();
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      html.push('<div class="project-hub-table-wrap"><table><thead><tr>' +
        headers.map((cell) => '<th>' + inlineMarkdown(cell) + '</th>').join('') +
        '</tr></thead><tbody>' +
        rows.map((row) => '<tr>' + headers.map((_header, cellIndex) => '<td>' + inlineMarkdown(row[cellIndex] || '') + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push('<h' + level + '>' + inlineMarkdown(heading[2]) + '</h' + level + '>');
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        html.push('<ul>');
      }
      html.push('<li>' + inlineMarkdown(bullet[1]) + '</li>');
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        html.push('<ol>');
      }
      html.push('<li>' + inlineMarkdown(ordered[1]) + '</li>');
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      closeList();
      html.push('<blockquote>' + inlineMarkdown(quote[1]) + '</blockquote>');
      continue;
    }

    closeList();
    html.push('<p>' + inlineMarkdown(line.trim()) + '</p>');
  }

  if (inCode) html.push('<pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
  closeList();
  return html.join('\n');
}

async function fetchText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
  return response.json();
}

export class ProjectHubSystem {
  constructor({
    openButton,
    overlay,
    titleElement,
    breadcrumbElement,
    navElement,
    contentElement,
    backButton,
    closeButton,
    onOpenChange,
    interfaceSettings,
    biomeTextureSettings,
    worldAnalyzer
  }) {
    this.openButton = openButton;
    this.overlay = overlay;
    this.titleElement = titleElement;
    this.breadcrumbElement = breadcrumbElement;
    this.navElement = navElement;
    this.contentElement = contentElement;
    this.backButton = backButton;
    this.closeButton = closeButton;
    this.onOpenChange = onOpenChange;
    this.interfaceSettings = interfaceSettings;
    this.biomeTextureSettings = biomeTextureSettings;
    this.worldAnalyzer = worldAnalyzer;
    this.config = null;
    this.currentSectionId = null;
    this.stack = [];
    this.currentDocumentBase = document.baseURI;
    this.boundKeydown = (event) => this.handleKeydown(event);

    this.openButton?.addEventListener('click', () => this.open());
    this.closeButton?.addEventListener('click', () => this.close());
    this.backButton?.addEventListener('click', () => this.back());
    this.contentElement?.addEventListener('click', (event) => this.handleContentClick(event));
  }

  get isOpen() {
    return Boolean(this.overlay && !this.overlay.hidden);
  }

  async load() {
    this.config = await fetchJson('./data/project-hub.json');
    if (!Array.isArray(this.config?.sections)) throw new Error('project-hub.json: sections must be an array');
    this.currentSectionId = this.config.defaultSection || this.config.sections[0]?.id || null;
    if (this.isOpen) this.renderRoot();
  }

  open() {
    if (!this.overlay) return;
    this.overlay.hidden = false;
    document.body.classList.add('project-hub-open');
    document.addEventListener('keydown', this.boundKeydown);
    this.stack = [];
    this.renderRoot();
    this.onOpenChange?.(true);
    this.closeButton?.focus();
  }

  close() {
    if (!this.overlay || this.overlay.hidden) return;
    this.overlay.hidden = true;
    document.body.classList.remove('project-hub-open');
    document.removeEventListener('keydown', this.boundKeydown);
    this.stack = [];
    this.onOpenChange?.(false);
    this.openButton?.focus();
  }

  back() {
    if (!this.stack.length) {
      this.close();
      return;
    }
    this.stack.pop();
    this.renderCurrent();
  }

  handleKeydown(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (this.stack.length) this.back();
    else this.close();
  }

  renderCurrent() {
    const view = this.stack[this.stack.length - 1];
    if (!view) {
      this.renderRoot();
      return;
    }

    if (view.type === 'document') {
      this.renderDocument(view);
      return;
    }

    if (view.type === 'journal') {
      this.renderJournal(view);
      return;
    }

    if (view.type === 'settings') {
      this.renderSettings(view);
      return;
    }

    if (view.type === 'biome-lab') {
      this.renderBiomeLab(view);
      return;
    }

    if (view.type === 'world-analyzer') {
      this.renderWorldAnalyzer(view);
      return;
    }

    this.renderRoot();
  }

  renderRoot() {
    this.backButton.hidden = true;
    this.titleElement.textContent = 'Project Hub';
    this.breadcrumbElement.textContent = 'uGame / Hub';

    if (!this.config) {
      this.navElement.innerHTML = '';
      this.contentElement.innerHTML = '<div class="project-hub-loading">Загрузка навигации…</div>';
      return;
    }

    const section = this.config.sections.find((item) => item.id === this.currentSectionId)
      || this.config.sections[0];
    this.currentSectionId = section?.id || null;

    this.navElement.innerHTML = this.config.sections.map((item) =>
      '<button type="button" data-hub-section="' + escapeHtml(item.id) + '" data-active="' + String(item.id === this.currentSectionId) + '">' +
      escapeHtml(item.label) + '</button>'
    ).join('');

    for (const button of this.navElement.querySelectorAll('[data-hub-section]')) {
      button.addEventListener('click', () => {
        this.currentSectionId = button.dataset.hubSection;
        this.renderRoot();
      });
    }

    this.contentElement.innerHTML = [
      '<div class="project-hub-section-heading">',
      '<div><span class="project-hub-kicker">Раздел</span><h2>' + escapeHtml(section?.label || 'Project Hub') + '</h2></div>',
      '<span class="project-hub-origin">' + escapeHtml(window.location.host || 'local') + '</span>',
      '</div>',
      '<div class="project-hub-card-grid">',
      ...(section?.items || []).map((item) => [
        '<button class="project-hub-card" type="button" data-hub-item="' + escapeHtml(item.id) + '">',
        '<strong>' + escapeHtml(item.label) + '</strong>',
        '<span>' + escapeHtml(item.description || '') + '</span>',
        '<em>' + (item.type === 'external' ? 'Откроется отдельно ↗' : item.type === 'close' ? 'Вернуться' : 'Открыть →') + '</em>',
        '</button>'
      ].join('')),
      '</div>'
    ].join('');

    for (const button of this.contentElement.querySelectorAll('[data-hub-item]')) {
      button.addEventListener('click', () => {
        const item = section.items.find((entry) => entry.id === button.dataset.hubItem);
        if (item) this.activateItem(item);
      });
    }
    this.contentElement.scrollTop = 0;
  }

  activateItem(item) {
    if (item.type === 'close') {
      this.close();
      return;
    }

    if (item.type === 'external') {
      const url = new URL(item.target, document.baseURI);
      window.open(url.href, '_blank', 'noopener,noreferrer');
      return;
    }

    if (item.type === 'document') {
      this.stack.push({ type: 'document', label: item.label, target: item.target });
      this.renderCurrent();
      return;
    }

    if (item.type === 'journal') {
      this.stack.push({ type: 'journal', label: item.label, target: item.target });
      this.renderCurrent();
      return;
    }

    if (item.type === 'settings') {
      this.stack.push({ type: 'settings', label: item.label });
      this.renderCurrent();
      return;
    }

    if (item.type === 'biome-lab') {
      this.stack.push({ type: 'biome-lab', label: item.label, selectedId: 'grass' });
      this.renderCurrent();
      return;
    }

    if (item.type === 'world-analyzer') {
      this.stack.push({ type: 'world-analyzer', label: item.label, tier: 'ALL', resource: 'stone', selectedIndex: 0 });
      this.renderCurrent();
    }
  }

  renderWorldAnalyzer(view) {
    this.setSubViewHeader(view.label || 'DEV World Analyzer', 'uGame / DEV / World Analyzer');
    const data = this.worldAnalyzer?.getData?.();
    if (!data) {
      this.contentElement.innerHTML = '<div class="project-hub-error">World runtime ещё не готов.</div>';
      return;
    }

    const allMasters = Array.isArray(data.masters) ? data.masters : [];
    const filtered = allMasters.filter((spawn) =>
      (!view.resource || view.resource === 'ALL' || spawn.resourceDirectionId === view.resource) &&
      (!view.tier || view.tier === 'ALL' || spawn.tier === view.tier)
    );
    if (view.selectedIndex >= filtered.length) view.selectedIndex = Math.max(0, filtered.length - 1);
    if (view.selectedIndex < 0) view.selectedIndex = 0;
    const selected = filtered[view.selectedIndex] || null;

    const tierOptions = ['ALL','T1','T2','T3','T4'].map((tier) =>
      '<option value="' + tier + '"' + (view.tier === tier ? ' selected' : '') + '>' + (tier === 'ALL' ? 'Все Tier' : tier) + '</option>'
    ).join('');

    const cards = filtered.map((spawn, index) => {
      const zone = data.zones?.[spawn.zoneId] || {};
      const location = zone.location || {};
      const remaining = Math.max(0, Math.ceil((Number(spawn.expiresAt) - Date.now()) / 60000));
      const selectedAttr = index === view.selectedIndex ? 'true' : 'false';
      return [
        '<button type="button" class="world-analyzer-card" data-world-index="' + index + '" data-selected="' + selectedAttr + '">',
        '<span><strong>' + escapeHtml(spawn.displayName || spawn.masterId) + '</strong><b>' + escapeHtml(spawn.tier) + '</b></span>',
        '<small>' + escapeHtml((zone.name || spawn.zoneId) + ' · ' + (zone.biome || '—') + ' · LT ' + (location.tier || '—') + ' · D' + (location.distanceFromSafeCity ?? '—')) + '</small>',
        '<em>×' + escapeHtml(Number(spawn.efficiencyMultiplier || 1).toFixed(2)) + ' · ~' + remaining + ' мин · ' + escapeHtml(spawn.spotId || '') + '</em>',
        '</button>'
      ].join('');
    }).join('') || '<div class="project-hub-empty">Нет active master под текущим фильтром.</div>';

    let detail = '<div class="world-analyzer-empty">Выберите active master.</div>';
    if (selected) {
      const zone = data.zones?.[selected.zoneId] || {};
      const location = zone.location || {};
      const rotation = data.rotations?.[selected.resourceDirectionId + ':' + selected.tier] || {};
      const pool = data.candidatePools?.[selected.resourceDirectionId + ':' + selected.tier] || [];
      const remainingSec = Math.max(0, Math.ceil((Number(selected.expiresAt) - Date.now()) / 1000));
      const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
      const ss = String(remainingSec % 60).padStart(2, '0');
      detail = [
        '<div class="world-analyzer-detail">',
        '<h3>' + escapeHtml(selected.displayName || selected.masterId) + ' · ' + escapeHtml(selected.tier) + '</h3>',
        '<div class="world-analyzer-kpis">',
        '<span>Zone <b>' + escapeHtml(zone.name || selected.zoneId) + '</b></span>',
        '<span>Biome <b>' + escapeHtml(zone.biome || '—') + '</b></span>',
        '<span>Location <b>' + escapeHtml(location.tier || '—') + ' / D' + escapeHtml(location.distanceFromSafeCity ?? '—') + '</b></span>',
        '<span>P(Location) <b>' + escapeHtml(location.currentTierChance ?? '—') + '%</b></span>',
        '<span>Bonus <b>+' + Math.round((Number(location.locationBonus) || 0) * 100) + '%</b></span>',
        '<span>Encounter <b>' + mm + ':' + ss + '</b></span>',
        '<span>Multiplier <b>×' + Number(selected.efficiencyMultiplier || 1).toFixed(2) + '</b></span>',
        '<span>Requested <b>' + escapeHtml(selected.requestedTier || selected.tier) + '</b></span>',
        '</div>',
        '<p>Candidate pool: <b>' + pool.length + '</b> · Rotation round: <b>' + escapeHtml(rotation.round || 1) + '</b> · visited: <b>' + escapeHtml(rotation.visitedZoneIds?.length || 0) + '</b></p>',
        '<p class="world-analyzer-zones">Pool: ' + escapeHtml(pool.join(', ') || '—') + '<br>Visited: ' + escapeHtml((rotation.visitedZoneIds || []).join(', ') || '—') + '</p>',
        '<button id="world-analyzer-teleport" type="button">Телепорт к Master</button>',
        '</div>'
      ].join('');
    }

    this.contentElement.innerHTML = [
      '<div class="world-analyzer-toolbar">',
      '<label>Ресурс <select id="world-analyzer-resource"><option value="stone">Stone</option></select></label>',
      '<label>Tier <select id="world-analyzer-tier">' + tierOptions + '</select></label>',
      '<button id="world-analyzer-prev" type="button">← Previous</button>',
      '<button id="world-analyzer-next" type="button">Next →</button>',
      '<button id="world-analyzer-refresh" type="button">Обновить</button>',
      '<span>Active: <b>' + allMasters.length + '</b> · filtered: <b>' + filtered.length + '</b></span>',
      '</div>',
      '<div class="world-analyzer-layout"><div class="world-analyzer-list">' + cards + '</div>' + detail + '</div>'
    ].join('');

    const tierSelect = this.contentElement.querySelector('#world-analyzer-tier');
    tierSelect?.addEventListener('change', () => { view.tier = tierSelect.value; view.selectedIndex = 0; this.renderWorldAnalyzer(view); });
    this.contentElement.querySelector('#world-analyzer-refresh')?.addEventListener('click', () => this.renderWorldAnalyzer(view));
    this.contentElement.querySelector('#world-analyzer-prev')?.addEventListener('click', () => {
      if (!filtered.length) return;
      view.selectedIndex = (view.selectedIndex - 1 + filtered.length) % filtered.length;
      this.renderWorldAnalyzer(view);
    });
    this.contentElement.querySelector('#world-analyzer-next')?.addEventListener('click', () => {
      if (!filtered.length) return;
      view.selectedIndex = (view.selectedIndex + 1) % filtered.length;
      this.renderWorldAnalyzer(view);
    });
    for (const button of this.contentElement.querySelectorAll('[data-world-index]')) {
      button.addEventListener('click', () => { view.selectedIndex = Number(button.dataset.worldIndex) || 0; this.renderWorldAnalyzer(view); });
    }
    this.contentElement.querySelector('#world-analyzer-teleport')?.addEventListener('click', () => {
      if (!selected) return;
      const ok = this.worldAnalyzer?.teleport?.(selected.encounterId);
      if (ok) this.close();
    });
    this.contentElement.scrollTop = 0;
  }
  renderSettings(view) {
    this.setSubViewHeader(view.label || 'Настройки интерфейса', 'uGame / Настройки');
    const enabled = Boolean(this.interfaceSettings?.isTextSelectionEnabled?.());

    this.contentElement.innerHTML = [
      '<div class="project-hub-settings">',
      '<div class="project-hub-setting-row">',
      '<div>',
      '<strong>Выделение текста</strong>',
      '<span>По умолчанию выключено, чтобы drag/click по игре не выделял интерфейс. Поля ввода остаются выделяемыми всегда.</span>',
      '</div>',
      '<button id="project-hub-text-selection" type="button" data-state="' + (enabled ? 'on' : 'off') + '">' +
      (enabled ? 'ВКЛ' : 'ВЫКЛ') +
      '</button>',
      '</div>',
      '</div>'
    ].join('');

    const button = this.contentElement.querySelector('#project-hub-text-selection');
    button?.addEventListener('click', () => {
      const next = this.interfaceSettings?.toggleTextSelection?.();
      button.dataset.state = next ? 'on' : 'off';
      button.textContent = next ? 'ВКЛ' : 'ВЫКЛ';
    });
    this.contentElement.scrollTop = 0;
  }


  async renderBiomeLab(view) {
    this.setSubViewHeader(view.label || 'Biome Visual Lab', 'uGame / DEV / Biome Visual Lab');
    this.contentElement.innerHTML = '<div class="project-hub-loading">Загрузка настроек текстур…</div>';

    try {
      await this.biomeTextureSettings?.load?.();
      if (this.stack[this.stack.length - 1] !== view) return;

      const entries = this.biomeTextureSettings?.list?.() || [];
      const selected = entries.find((entry) => entry.id === view.selectedId) || entries[0];
      if (!selected) {
        this.contentElement.innerHTML = '<div class="project-hub-error">Biome texture config пуст.</div>';
        return;
      }
      view.selectedId = selected.id;

      const slotOptions = entries.map((entry) => {
        const area = entry.city ? 'город' : 'вне города';
        return '<option value="' + escapeHtml(entry.id) + '"' + (entry.id === selected.id ? ' selected' : '') + '>' +
          escapeHtml(entry.textureName + ' · ' + area + ' · ' + entry.biome) + '</option>';
      }).join('');

      const assetOptions = GROUND_TEXTURE_ASSETS.map((asset) =>
        '<option value="' + escapeHtml(asset.file) + '"' + (asset.file === selected.textureFile ? ' selected' : '') + '>' +
        escapeHtml(asset.label) + '</option>'
      ).join('');

      this.contentElement.innerHTML = [
        '<div class="biome-lab">',
        '<div class="biome-lab-controls">',
        '<label class="biome-lab-field biome-lab-field-wide"><span>Слот биома</span><select id="biome-lab-slot">' + slotOptions + '</select></label>',
        '<div class="biome-lab-meta"><span>biome: <b>' + escapeHtml(selected.biome) + '</b></span><span>тип: <b>' + (selected.city ? 'город' : 'вне города') + '</b></span><span>id: <b>' + escapeHtml(selected.id) + '</b></span></div>',
        '<label class="biome-lab-field"><span>Название текстуры</span><input id="biome-lab-name" type="text" value="' + escapeHtml(selected.textureName) + '"></label>',
        '<label class="biome-lab-field"><span>Файл текстуры</span><select id="biome-lab-file">' + assetOptions + '</select></label>',
        '<label class="biome-lab-field biome-lab-field-wide"><span>Путь</span><input id="biome-lab-path" type="text" readonly value="' + escapeHtml(selected.textureFile) + '"></label>',
        '<div class="biome-lab-number-row">',
        '<label class="biome-lab-field"><span>Масштаб · 1–10 000%</span><div class="biome-lab-stepper"><button type="button" data-scale-step="-10">−10</button><input id="biome-lab-scale" type="number" min="1" max="10000" step="1" value="' + selected.scalePercent + '"><button type="button" data-scale-step="10">+10</button></div></label>',
        '<label class="biome-lab-field"><span>Opacity · 0–100%</span><div class="biome-lab-stepper"><button type="button" data-opacity-step="-5">−5</button><input id="biome-lab-opacity" type="number" min="0" max="100" step="1" value="' + selected.opacityPercent + '"><button type="button" data-opacity-step="5">+5</button></div></label>',
        '</div>',
        '<label class="biome-lab-enabled"><input id="biome-lab-enabled" type="checkbox"' + (selected.enabled ? ' checked' : '') + '><span>Текстура включена</span></label>',
        '<div class="biome-lab-actions"><button id="biome-lab-reset" type="button">Сбросить этот слот</button><button id="biome-lab-apply" class="primary" type="button">Применить</button><span id="biome-lab-status"></span></div>',
        '</div>',
        '<div class="biome-lab-preview-wrap">',
        '<div class="biome-lab-preview-title"><strong>Предпросмотр биома</strong><span>tile / repeat · тот же scale + opacity</span></div>',
        '<div id="biome-lab-preview" class="biome-lab-preview"><div class="biome-lab-preview-label"></div></div>',
        '</div>',
        '</div>'
      ].join('');

      const q = (selector) => this.contentElement.querySelector(selector);
      const slot = q('#biome-lab-slot');
      const name = q('#biome-lab-name');
      const file = q('#biome-lab-file');
      const path = q('#biome-lab-path');
      const scale = q('#biome-lab-scale');
      const opacity = q('#biome-lab-opacity');
      const enabled = q('#biome-lab-enabled');
      const preview = q('#biome-lab-preview');
      const status = q('#biome-lab-status');

      const clamp = (value, min, max, fallback) => {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
      };

      const updatePreview = () => {
        const scaleValue = clamp(scale?.value, 1, 10000, 100);
        const opacityValue = clamp(opacity?.value, 0, 100, 100);
        if (path) path.value = file?.value || '';
        if (!preview) return;
        preview.style.backgroundImage = enabled?.checked && file?.value ? 'url("' + file.value + '")' : 'none';
        preview.style.backgroundRepeat = 'repeat';
        const tilePx = 1024 * scaleValue / 100;
        preview.style.backgroundSize = tilePx + 'px ' + tilePx + 'px';
        preview.style.setProperty('--biome-preview-opacity', String(opacityValue / 100));
        preview.dataset.enabled = String(Boolean(enabled?.checked));
        const label = preview.querySelector('.biome-lab-preview-label');
        if (label) label.textContent = scaleValue + '% · opacity ' + opacityValue + '% · ' + (enabled?.checked ? 'ON' : 'OFF');
      };

      slot?.addEventListener('change', () => {
        view.selectedId = slot.value;
        this.renderBiomeLab(view);
      });

      file?.addEventListener('change', updatePreview);
      name?.addEventListener('input', updatePreview);
      scale?.addEventListener('input', updatePreview);
      opacity?.addEventListener('input', updatePreview);
      enabled?.addEventListener('change', updatePreview);

      for (const button of this.contentElement.querySelectorAll('[data-scale-step]')) {
        button.addEventListener('click', () => {
          scale.value = String(clamp(Number(scale.value) + Number(button.dataset.scaleStep), 1, 10000, 100));
          updatePreview();
        });
      }

      for (const button of this.contentElement.querySelectorAll('[data-opacity-step]')) {
        button.addEventListener('click', () => {
          opacity.value = String(clamp(Number(opacity.value) + Number(button.dataset.opacityStep), 0, 100, 100));
          updatePreview();
        });
      }

      q('#biome-lab-apply')?.addEventListener('click', () => {
        const next = this.biomeTextureSettings?.update?.(selected.id, {
          textureName: name?.value?.trim() || selected.textureName,
          textureFile: file?.value || selected.textureFile,
          scalePercent: clamp(scale?.value, 1, 10000, 100),
          opacityPercent: clamp(opacity?.value, 0, 100, 100),
          enabled: Boolean(enabled?.checked)
        });
        if (status) {
          status.textContent = next ? 'Применено · сохранено локально' : 'Не удалось применить';
          status.dataset.state = next ? 'ok' : 'error';
        }
        updatePreview();
      });

      q('#biome-lab-reset')?.addEventListener('click', () => {
        this.biomeTextureSettings?.reset?.(selected.id);
        this.renderBiomeLab(view);
      });

      updatePreview();
      this.contentElement.scrollTop = 0;
    } catch (error) {
      this.contentElement.innerHTML = '<div class="project-hub-error">Biome Visual Lab: ' + escapeHtml(error.message) + '</div>';
    }
  }

  setSubViewHeader(label, breadcrumb) {
    this.backButton.hidden = false;
    this.titleElement.textContent = label;
    this.breadcrumbElement.textContent = breadcrumb;
    this.navElement.innerHTML = '';
  }

  async renderDocument(view) {
    this.setSubViewHeader(view.label, 'uGame / Документы / ' + view.label);
    this.contentElement.innerHTML = '<div class="project-hub-loading">Загрузка документа…</div>';
    try {
      const resolvedTarget = new URL(view.target, document.baseURI);
      const markdown = await fetchText(resolvedTarget.href);
      if (this.stack[this.stack.length - 1] !== view) return;
      this.currentDocumentBase = resolvedTarget.href;
      this.contentElement.innerHTML = '<article class="project-hub-markdown">' + renderMarkdown(markdown) + '</article>';
      this.contentElement.scrollTop = 0;
    } catch (error) {
      this.contentElement.innerHTML = '<div class="project-hub-error">Не удалось загрузить документ: ' + escapeHtml(error.message) + '</div>';
    }
  }

  async renderJournal(view) {
    this.setSubViewHeader(view.label, 'uGame / Project Journal');
    this.contentElement.innerHTML = '<div class="project-hub-loading">Загрузка Project Journal…</div>';
    try {
      const index = await fetchJson(view.target);
      if (this.stack[this.stack.length - 1] !== view) return;
      const records = Array.isArray(index.records) ? [...index.records] : [];
      records.sort((a, b) => String(b.id).localeCompare(String(a.id), 'ru', { numeric: true }));

      this.contentElement.innerHTML = [
        '<div class="project-hub-journal-tools">',
        '<input id="project-hub-journal-search" type="search" placeholder="Поиск по ID, названию, status, tag…" autocomplete="off">',
        '<span>' + records.length + ' записей · updated ' + escapeHtml(index.updated || '—') + '</span>',
        '</div>',
        '<div id="project-hub-journal-list" class="project-hub-journal-list"></div>'
      ].join('');

      const search = this.contentElement.querySelector('#project-hub-journal-search');
      const list = this.contentElement.querySelector('#project-hub-journal-list');
      const renderList = () => {
        const query = (search?.value || '').trim().toLocaleLowerCase('ru');
        const visible = records.filter((record) => {
          if (!query) return true;
          return [
            record.id,
            record.title,
            record.status,
            record.type,
            ...(record.tags || []),
            ...(record.flags || [])
          ].join(' ').toLocaleLowerCase('ru').includes(query);
        });

        list.innerHTML = visible.map((record) => [
          '<button class="project-hub-record" type="button" data-record-id="' + escapeHtml(record.id) + '">',
          '<span><strong>' + escapeHtml(record.id) + '</strong><em>' + escapeHtml(record.status || '') + '</em></span>',
          '<b>' + escapeHtml(record.title || '') + '</b>',
          '<small>' + escapeHtml((record.tags || []).slice(0, 6).map((tag) => '#' + tag).join(' ')) + '</small>',
          '</button>'
        ].join('')).join('') || '<div class="project-hub-empty">Ничего не найдено.</div>';

        for (const button of list.querySelectorAll('[data-record-id]')) {
          button.addEventListener('click', () => {
            const record = records.find((entry) => entry.id === button.dataset.recordId);
            if (!record) return;
            const base = new URL('./docs/project-journal/', document.baseURI);
            const target = new URL(record.path, base).href;
            this.stack.push({ type: 'document', label: record.id + ' · ' + record.title, target });
            this.renderCurrent();
          });
        }
      };

      search?.addEventListener('input', renderList);
      renderList();
      this.contentElement.scrollTop = 0;
    } catch (error) {
      this.contentElement.innerHTML = '<div class="project-hub-error">Не удалось загрузить журнал: ' + escapeHtml(error.message) + '</div>';
    }
  }

  handleContentClick(event) {
    const link = event.target.closest?.('a');
    if (!link || !this.contentElement.contains(link)) return;
    const rawHref = link.getAttribute('href');
    if (!rawHref || rawHref === '#') return;

    const url = new URL(rawHref, this.currentDocumentBase || document.baseURI);
    if (url.origin === window.location.origin && url.pathname.endsWith('.md')) {
      event.preventDefault();
      const label = url.pathname.split('/').pop() || 'Документ';
      this.stack.push({ type: 'document', label, target: url.href });
      this.renderCurrent();
      return;
    }

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      event.preventDefault();
      window.open(url.href, '_blank', 'noopener,noreferrer');
    }
  }
}

export { renderMarkdown };
