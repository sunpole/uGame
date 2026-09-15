const GROUPS = {
  '1': 'Vision',
  '2': 'Player',
  '3': 'Movement',
  '4': 'Combat',
  '5': 'Items',
  '6': 'World',
  '7': 'Classes',
  '8': 'Events',
  '9': 'Dev / Service'
};

function showStatus(element, text, state) {
  if (!element) return;
  element.textContent = text;
  element.dataset.state = state;
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
      showStatus(status, 'Нужно 4 цифры', 'error');
      return;
    }

    if (code === '9999') {
      window.open('https://github.com/sunpole/uGame/blob/main/docs/DEV-CODES.md', '_blank');
      showStatus(status, '9999 · справочник открыт', 'ok');
      input.select();
      return;
    }

    const result = execute?.(code);
    if (result?.handled) {
      showStatus(status, result.message || `${code} · выполнено`, result.state || 'ok');
      input.select();
      return;
    }

    const group = GROUPS[code[0]] || 'Unknown';
    showStatus(status, `${code} · ${group} · пока не активен`, 'reserved');
    input.select();
  });
}
