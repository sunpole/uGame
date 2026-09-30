const BASE = '../docs/project-journal/';

const elements = {
  current: document.querySelector('#current-content'),
  list: document.querySelector('#record-list'),
  count: document.querySelector('#result-count'),
  updated: document.querySelector('#index-updated'),
  search: document.querySelector('#search'),
  status: document.querySelector('#status-filter'),
  type: document.querySelector('#type-filter'),
  tag: document.querySelector('#tag-filter'),
  flag: document.querySelector('#flag-filter'),
  clear: document.querySelector('#clear-filters'),
  dialog: document.querySelector('#record-dialog'),
  dialogMeta: document.querySelector('#dialog-meta'),
  dialogContent: document.querySelector('#dialog-content'),
  closeDialog: document.querySelector('#close-dialog')
};

const state = {
  index: null,
  records: []
};

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
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const decodedHref = href.replaceAll('&amp;', '&');
    const safe = /^(https?:\/\/|\.\.?\/|#)/.test(decodedHref) ? href : '#';
    return `<a href="${safe}">${label}</a>`;
  });
  return text;
}

function renderMarkdown(markdown = '') {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const html = [];
  let listType = null;
  let inCode = false;
  let codeLines = [];

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  for (const rawLine of lines) {
    if (rawLine.trim().startsWith('```')) {
      closeList();
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
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

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        html.push('<ul>');
      }
      html.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        html.push('<ol>');
      }
      html.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      closeList();
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    closeList();
    html.push(`<p>${inlineMarkdown(line.trim())}</p>`);
  }

  if (inCode) html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  closeList();
  return html.join('\n');
}

async function fetchText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function uniqueValues(records, getter) {
  return [...new Set(records.flatMap(getter).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'ru'));
}

function populateSelect(select, values) {
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
}

function chip(value, className = '') {
  return `<span class="chip ${className}">${escapeHtml(value)}</span>`;
}

function matchesFilters(record) {
  const query = elements.search.value.trim().toLocaleLowerCase('ru');
  const status = elements.status.value;
  const type = elements.type.value;
  const tag = elements.tag.value;
  const flag = elements.flag.value;

  if (status && record.status !== status) return false;
  if (type && record.type !== type) return false;
  if (tag && !record.tags.includes(tag)) return false;
  if (flag && !record.flags.includes(flag)) return false;
  if (query && !record.searchText.includes(query)) return false;
  return true;
}

function renderList() {
  const visible = state.records.filter(matchesFilters);
  elements.count.textContent = `Показано ${visible.length} из ${state.records.length}`;

  if (!visible.length) {
    elements.list.innerHTML = '<div class="empty-state">По текущим фильтрам записей нет.</div>';
    return;
  }

  elements.list.innerHTML = visible.map((record) => {
    const tags = record.tags.slice(0, 6).map((value) => chip(`#${value}`)).join('');
    const flags = record.flags.map((value) => chip(value)).join('');
    return `
      <button class="record-card" type="button" data-record-id="${escapeHtml(record.id)}">
        <div class="record-topline">
          <strong>${escapeHtml(record.id)}</strong>
          <span>${escapeHtml(record.date)}</span>
        </div>
        <h3>${escapeHtml(record.title)}</h3>
        <div class="chips">
          ${chip(record.status, `status-${record.status}`)}
          ${chip(record.type)}
          ${flags}
          ${tags}
        </div>
      </button>
    `;
  }).join('');

  for (const button of elements.list.querySelectorAll('[data-record-id]')) {
    button.addEventListener('click', () => openRecord(button.dataset.recordId));
  }
}

function openRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;

  elements.dialogMeta.innerHTML = [
    `<strong>${escapeHtml(record.id)}</strong>`,
    escapeHtml(record.date),
    escapeHtml(record.type),
    escapeHtml(record.status),
    `<a href="${BASE}${escapeHtml(record.path)}">Markdown</a>`
  ].join(' · ');
  elements.dialogContent.innerHTML = renderMarkdown(record.markdown);
  elements.dialog.showModal();
  elements.dialogContent.scrollTop = 0;
}

function clearFilters() {
  elements.search.value = '';
  elements.status.value = '';
  elements.type.value = '';
  elements.tag.value = '';
  elements.flag.value = '';
  renderList();
  elements.search.focus();
}

async function loadCurrent() {
  try {
    const markdown = await fetchText(`${BASE}CURRENT.md`);
    elements.current.classList.remove('loading');
    elements.current.innerHTML = renderMarkdown(markdown);
  } catch (error) {
    elements.current.classList.remove('loading');
    elements.current.classList.add('error');
    elements.current.textContent = `Не удалось загрузить CURRENT.md: ${error.message}`;
  }
}

async function loadRecords() {
  const index = await fetchJson(`${BASE}index.json`);
  if (!Array.isArray(index.records)) throw new Error('index.json: records must be an array');
  state.index = index;
  elements.updated.textContent = index.updated ? `index updated: ${index.updated}` : '';

  state.records = await Promise.all(index.records.map(async (metadata) => {
    const markdown = await fetchText(`${BASE}${metadata.path}`);
    const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
    const flags = Array.isArray(metadata.flags) ? metadata.flags : [];
    const searchText = [
      metadata.id,
      metadata.title,
      metadata.date,
      metadata.type,
      metadata.status,
      ...tags,
      ...flags,
      markdown
    ].join(' ').toLocaleLowerCase('ru');

    return { ...metadata, tags, flags, markdown, searchText };
  }));

  state.records.sort((a, b) => b.id.localeCompare(a.id, 'ru', { numeric: true }));
  populateSelect(elements.status, uniqueValues(state.records, (record) => [record.status]));
  populateSelect(elements.type, uniqueValues(state.records, (record) => [record.type]));
  populateSelect(elements.tag, uniqueValues(state.records, (record) => record.tags));
  populateSelect(elements.flag, uniqueValues(state.records, (record) => record.flags));
  renderList();
}

for (const element of [elements.search, elements.status, elements.type, elements.tag, elements.flag]) {
  element.addEventListener('input', renderList);
  element.addEventListener('change', renderList);
}

elements.clear.addEventListener('click', clearFilters);
elements.closeDialog.addEventListener('click', () => elements.dialog.close());
elements.dialog.addEventListener('click', (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

loadCurrent();
loadRecords().catch((error) => {
  elements.count.textContent = 'Ошибка загрузки Project Journal';
  elements.list.innerHTML = `<div class="empty-state error">${escapeHtml(error.message)}</div>`;
});
