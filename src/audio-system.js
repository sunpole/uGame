const PATTERNS = {
  interact: { frequency: 520, duration: 0.055, gain: 0.035 },
  portal: { frequency: 290, duration: 0.16, gain: 0.045, endFrequency: 620 },
  chest: { frequency: 660, duration: 0.12, gain: 0.04, endFrequency: 880 },
  resource: { frequency: 780, duration: 0.08, gain: 0.035, endFrequency: 980 },
  dash: { frequency: 180, duration: 0.06, gain: 0.03, endFrequency: 110 },
  quest: { frequency: 740, duration: 0.14, gain: 0.04, endFrequency: 1040 }
};

export class AudioSystem {
  constructor() {
    this.context = null;
    this.enabled = true;
    this.unlocked = false;

    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  unlock() {
    if (!this.enabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') this.context.resume();
    this.unlocked = true;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  play(name = 'interact') {
    if (!this.enabled) return;
    if (!this.context || !this.unlocked) {
      this.unlock();
      if (!this.context) return;
    }

    const pattern = PATTERNS[name] || PATTERNS.interact;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(pattern.frequency, now);
    if (pattern.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(pattern.endFrequency, now + pattern.duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(pattern.gain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + pattern.duration);

    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + pattern.duration + 0.01);
  }
}
