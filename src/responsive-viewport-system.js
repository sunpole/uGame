export class ResponsiveViewportSystem {
  constructor({
    scene,
    host,
    baseWidth = 960,
    baseHeight = 540,
    onChange = null
  } = {}) {
    this.scene = scene;
    this.host = host;
    this.baseWidth = Math.max(1, Number(baseWidth) || 960);
    this.baseHeight = Math.max(1, Number(baseHeight) || 540);
    this.onChange = onChange;
    this.metrics = {
      renderWidth: this.baseWidth,
      renderHeight: this.baseHeight,
      worldWidth: this.baseWidth,
      worldHeight: this.baseHeight,
      zoom: 1,
      offsetX: 0
    };
    this.resizeObserver = null;
    this.frame = 0;
  }

  measure() {
    const renderWidth = Math.max(1, Number(this.host?.clientWidth) || this.baseWidth);
    const renderHeight = Math.max(1, Number(this.host?.clientHeight) || this.baseHeight);
    const zoom = Math.max(0.01, renderHeight / this.baseHeight);
    const worldWidth = Math.max(this.baseWidth, renderWidth / zoom);
    return {
      renderWidth,
      renderHeight,
      worldWidth,
      worldHeight: this.baseHeight,
      zoom,
      offsetX: Math.max(0, (worldWidth - this.baseWidth) / 2)
    };
  }

  apply() {
    const previous = this.metrics;
    const next = this.measure();
    this.metrics = next;

    const camera = this.scene?.cameras?.main;
    if (camera) {
      camera.setZoom(next.zoom);
      camera.setBounds(0, 0, next.worldWidth, next.worldHeight);
      camera.setScroll(0, 0);
    }

    this.onChange?.(next, previous);
    return next;
  }

  schedule() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.apply();
      });
    });
  }

  start() {
    this.apply();
    if (this.host && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.schedule());
      this.resizeObserver.observe(this.host);
    }
    window.addEventListener('resize', this.boundResize = () => this.schedule());
    return this.metrics;
  }

  stop() {
    this.resizeObserver?.disconnect();
    if (this.boundResize) window.removeEventListener('resize', this.boundResize);
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  snapshot() {
    return { ...this.metrics };
  }
}
