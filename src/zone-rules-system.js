export class ZoneRulesSystem {
  constructor({ playerController, visionSystem, onStatus } = {}) {
    this.playerController = playerController;
    this.visionSystem = visionSystem;
    this.onStatus = onStatus;
    this.current = {};
  }

  apply(rules = {}) {
    this.current = { ...rules };
    this.playerController?.setSpeedMultiplier(rules.speedMultiplier ?? 1);
    this.visionSystem?.setZoneOverride?.(rules.vision || {});

    const parts = [];
    if (rules.speedMultiplier && rules.speedMultiplier !== 1) {
      parts.push(`скорость ×${rules.speedMultiplier}`);
    }
    if (rules.vision?.darkness !== undefined) {
      parts.push(`темнота ${Math.round(rules.vision.darkness * 100)}%`);
    }
    if (rules.vision?.mode) parts.push(`vision ${rules.vision.mode}`);
    this.onStatus?.(parts.join(' · '));
  }

  clear() {
    this.current = {};
    this.playerController?.setSpeedMultiplier(1);
    this.visionSystem?.setZoneOverride?.({});
    this.onStatus?.('');
  }
}
