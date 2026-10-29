import type { Map as MapLibreMap } from 'maplibre-gl';

export type QualityTier = 'high' | 'low';

export function monitorQuality(map: MapLibreMap, onTier: (tier: QualityTier) => void, onFps: (fps: number) => void) {
  const started = performance.now();
  let forceFrame = 0;
  let frames = 0;
  let slowStarted = 0;
  let lastReport = started;
  let stopped = false;
  let slowReported = false;
  const debug = new URLSearchParams(window.location.search).has('debug');
  const sample = () => {
    if (stopped) return;
    frames += 1;
    const now = performance.now();
    if (now - lastReport >= 500) {
      const elapsed = now - lastReport;
      const fps = Math.round(frames * 1000 / elapsed);
      onFps(fps);
      frames = 0;
      lastReport = now;
      const underBudget = fps < 35;
      if (now - started >= 2000 && underBudget) {
        if (!slowStarted) slowStarted = now;
        if (now - slowStarted >= 3000 && !slowReported) { slowReported = true; onTier('low'); }
      } else slowStarted = 0;
    }
  };
  map.on('render', sample);
  // Sample actual MapLibre frames during initial load; keep sampling in debug mode.
  const warmup = (now: number) => {
    if (stopped || (!debug && now - started >= 5000)) return;
    map.triggerRepaint();
    forceFrame = requestAnimationFrame(warmup);
  };
  forceFrame = requestAnimationFrame(warmup);
  return () => { stopped = true; cancelAnimationFrame(forceFrame); map.off('render', sample); };
}
