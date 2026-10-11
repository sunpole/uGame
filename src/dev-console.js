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

  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const code = input.value.trim();

    if (!/^\d{4}$/.test(code)) {
      showStatus(status, 'Нужно 4 цифры / Enter four digits', 'error');
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
      showStatus(status, result.message || `${code} · выполнено`, result.state || 'ok');
      releaseGameFocus(input, form);
      return;
    }

    const group = GROUPS[code[0]] || 'Неизвестно / Unknown';
    showStatus(status, `${code} · ${group} · пока не активен / reserved`, 'reserved');
    releaseGameFocus(input, form);
  });
}
