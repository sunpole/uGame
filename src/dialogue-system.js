export class DialogueSystem {
  constructor({ eventSystem, panel, speakerElement, textElement, nextButton, onOpenChange } = {}) {
    this.eventSystem = eventSystem;
    this.panel = panel;
    this.speakerElement = speakerElement;
    this.textElement = textElement;
    this.nextButton = nextButton;
    this.onOpenChange = onOpenChange;
    this.dialogues = {};
    this.current = null;
    this.index = 0;
    this.loaded = false;

    this.nextButton?.addEventListener('click', () => this.advance());
    window.addEventListener('keydown', (event) => {
      if (!this.isOpen()) return;
      if (!['KeyE', 'Space', 'Enter'].includes(event.code)) return;
      event.preventDefault();
      event.stopPropagation();
      this.advance();
    }, true);
  }

  async load(url = './data/dialogues.json') {
    if (this.loaded) return;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Dialogue load failed: ${response.status}`);
    this.dialogues = await response.json();
    this.loaded = true;
  }

  async start(id) {
    if (!this.loaded) await this.load();
    const dialogue = this.dialogues[id];
    if (!dialogue?.lines?.length) return false;

    this.current = { id, ...dialogue };
    this.index = 0;
    this.panel?.removeAttribute('hidden');
    this.onOpenChange?.(true);
    this.eventSystem?.emit('dialogue:open', { id });
    this.render();
    return true;
  }

  isOpen() {
    return Boolean(this.current);
  }

  render() {
    if (!this.current) return;
    const line = this.current.lines[this.index];
    if (this.speakerElement) this.speakerElement.textContent = line.speaker || this.current.speaker || '';
    if (this.textElement) this.textElement.textContent = line.text || '';
    if (this.nextButton) this.nextButton.textContent = this.index >= this.current.lines.length - 1 ? 'Закрыть' : 'Дальше';
  }

  advance() {
    if (!this.current) return;
    if (this.index < this.current.lines.length - 1) {
      this.index += 1;
      this.render();
      return;
    }
    this.close(true);
  }

  close(completed = false) {
    if (!this.current) return;
    const id = this.current.id;
    this.current = null;
    this.index = 0;
    this.panel?.setAttribute('hidden', '');
    this.onOpenChange?.(false);
    this.eventSystem?.emit('dialogue:close', { id, completed });
    if (completed) {
      this.eventSystem?.emit('dialogue:complete', { id });
      this.eventSystem?.emit('quest:signal', { key: `dialogue:${id}` });
    }
  }
}
