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
    onOpenChange
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
    this.config = null;
    this.currentSectionId = null;
    this.stack = [];
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
      const markdown = await fetchText(view.target);
      if (this.stack[this.stack.length - 1] !== view) return;
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

    const url = new URL(rawHref, document.baseURI);
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
