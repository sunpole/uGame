import { resolveDevCode, devAliasSuggestions } from './dev-code-aliases.js';

const GROUPS = {
  '1': 'Видимость / Vision',
  '2': 'Персонаж / Character',
  '3': 'Движение / Movement',
  '4': 'Бой / Combat',
  '5': 'Предметы / Items',
  '6': 'Мир / World',
  '7': 'Классы / Classes',
  '8': 'События / Events',
  '9': 'DEV / Сервис / Service'
};

function showStatus(element, text, state) {
  if (!element) return;
  element.textContent = text;
  element.dataset.state = state;
}

function releaseGameFocus(input, form) {
  input.blur();
  form.querySelector('button')?.blur();
}

export function initDevConsole({ execute } = {}) {
  const form = document.querySelector('#dev-console');
  const input = document.querySelector('#dev-code-input');
  const status = document.querySelector('#dev-code-status');

  if (!form || !input) return;

  const suggestions = document.querySelector('#dev-code-suggestions');
  if (suggestions) {
    const options = document.createDocumentFragment();
    for (const {value,code,language} of devAliasSuggestions()) {
      const option = document.createElement('option');
      option.value = value;
      option.label = code+' · '+(language==='ru'?'RU':'EN');
      options.append(option);
    }
    suggestions.replaceChildren(options);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const entered = input.value.trim();
    const code = resolveDevCode(entered);
    if (!code) {
      showStatus(status, 'Неизвестная команда / Unknown command · 9999 / help / помощь', 'error');
      return;
    }

    if (code === '9999') {
      window.open('https://github.com/sunpole/uGame/blob/main/docs/DEV-CODES.md', '_blank');
      showStatus(status, '9999 · справочник открыт / Reference opened', 'ok');
      releaseGameFocus(input, form);
      return;
    }

    const result = execute?.(code);
    if (result?.handled) {
      showStatus(status, result.message || `${code} · выполнено / executed`, result.state || 'ok');
      releaseGameFocus(input, form);
      return;
    }

    const group = GROUPS[code[0]] || 'Неизвестно / Unknown';
    showStatus(status, `${code} · ${group} · пока не активен / reserved`, 'reserved');
    releaseGameFocus(input, form);
  });
}
