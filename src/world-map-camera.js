// Presentation-only world map camera. Coordinates are map-stage CSS pixels.
export const WORLD_MAP_FOCUS_SCALE = 0.92;
export const WORLD_MAP_MAX_SCALE = 2.25;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function worldMapFitScale(viewportWidth, viewportHeight, mapWidth, mapHeight) {
  if (!(viewportWidth > 0 && viewportHeight > 0 && mapWidth > 0 && mapHeight > 0)) return 1;
  return Math.min(1, Math.max(0.01, (viewportWidth - 28) / mapWidth),
    Math.max(0.01, (viewportHeight - 28) / mapHeight));
}

export function worldMapClampCamera(camera, bounds) {
  const { viewportWidth: w, viewportHeight: h, mapWidth, mapHeight } = bounds;
  if (!(w > 0 && h > 0 && mapWidth > 0 && mapHeight > 0)) return { ...camera };
  const minScale = worldMapFitScale(w, h, mapWidth, mapHeight) * 0.75;
  const scale = clamp(Number(camera.scale) || 1, minScale, WORLD_MAP_MAX_SCALE);
  const scaledWidth = mapWidth * scale;
  const scaledHeight = mapHeight * scale;
  // Even at the outermost map edge, permit putting the focused zone at screen centre.
  const x = scaledWidth <= w ? (w - scaledWidth) / 2 :
    clamp(Number(camera.x) || 0, w / 2 - scaledWidth, w / 2);
  const y = scaledHeight <= h ? (h - scaledHeight) / 2 :
    clamp(Number(camera.y) || 0, h / 2 - scaledHeight, h / 2);
  return { scale, x, y };
}

export function worldMapFitCamera(bounds) {
  const scale = worldMapFitScale(bounds.viewportWidth, bounds.viewportHeight,
    bounds.mapWidth, bounds.mapHeight);
  return worldMapClampCamera({
    scale,
    x: (bounds.viewportWidth - bounds.mapWidth * scale) / 2,
    y: (bounds.viewportHeight - bounds.mapHeight * scale) / 2
  }, bounds);
}

export function worldMapFocusCamera(bounds, mapPoint, requestedScale = WORLD_MAP_FOCUS_SCALE) {
  const scale = Math.max(worldMapFitScale(bounds.viewportWidth, bounds.viewportHeight,
    bounds.mapWidth, bounds.mapHeight), requestedScale);
  return worldMapClampCamera({
    scale,
    x: bounds.viewportWidth / 2 - mapPoint.x * scale,
    y: bounds.viewportHeight / 2 - mapPoint.y * scale
  }, bounds);
}

export function worldMapZoomAt(camera, bounds, screenPoint, requestedScale) {
  const nextScale = worldMapClampCamera({ ...camera, scale: requestedScale }, bounds).scale;
  const ratio = nextScale / camera.scale;
  return worldMapClampCamera({
    scale: nextScale,
    x: screenPoint.x - (screenPoint.x - camera.x) * ratio,
    y: screenPoint.y - (screenPoint.y - camera.y) * ratio
  }, bounds);
}

export function worldMapPan(camera, bounds, dx, dy) {
  return worldMapClampCamera({ ...camera, x: camera.x + dx, y: camera.y + dy }, bounds);
}
