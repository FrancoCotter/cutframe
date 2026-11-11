import { samplingRegions, patchColors, paletteFromPatches, createSceneStabilizer } from './scene-palette.js';

const excluded = '.cutframe, .cutframe-provider, .cutframe-language, [data-cutframe-probe], [data-cutframe-sampling-ui]';
export const samplingDefaults = { enabled: true, patchSize: 100, resolution: 20, interval: 500, changeThreshold: 8, settleMs: 1000, debug: false };
const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;

export function createBackdropSampler(page, surface, onSample, initial = {}) {
  let config, stabilizer;
  let source = null, explicitSource = null, frame = 0, wakeTimer = 0, destroyed = false;
  let lastRead = -Infinity, lastDiscovery = -Infinity, blockedUntil = 0, lastResult;
  let reads = 0, successes = 0, lastDurationMs = 0;
  const atlas = document.createElement('canvas');
  const context = atlas.getContext('2d', { willReadFrequently: true });
  const overlay = document.createElement('div');
  overlay.setAttribute('data-palette-ignore', '');
  overlay.setAttribute('data-cutframe-sampling-ui', '');
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '2147483000', pointerEvents: 'none' });

  const eligible = element => {
    if (!(element instanceof HTMLCanvasElement) || !element.isConnected || element.closest(excluded)) return false;
    const box = element.getBoundingClientRect(), target = surface.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < .95 || style.mixBlendMode !== 'normal' || style.filter !== 'none') return false;
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const parentStyle = getComputedStyle(ancestor);
      if (Number(parentStyle.opacity) < .95 || parentStyle.mixBlendMode !== 'normal' || parentStyle.filter !== 'none') return false;
    }
    if (style.transform !== 'none') {
      const matrix = new DOMMatrixReadOnly(style.transform);
      if (!matrix.is2D || Math.abs(matrix.b) > .001 || Math.abs(matrix.c) > .001) return false;
    }
    const visibleTarget = { left: Math.max(0, target.left), right: Math.min(innerWidth, target.right), top: Math.max(0, target.top), bottom: Math.min(innerHeight, target.bottom) };
    const overlap = Math.max(0, Math.min(box.right, visibleTarget.right) - Math.max(box.left, visibleTarget.left)) * Math.max(0, Math.min(box.bottom, visibleTarget.bottom) - Math.max(box.top, visibleTarget.top));
    const visibleArea = Math.max(0, visibleTarget.right - visibleTarget.left) * Math.max(0, visibleTarget.bottom - visibleTarget.top);
    return box.width >= 32 && box.height >= 32 && overlap / Math.max(1, visibleArea) >= .6;
  };
  const discover = () => {
    if (explicitSource) return eligible(explicitSource) ? explicitSource : null;
    const target = surface.getBoundingClientRect();
    // Bounded canvas discovery, without creating or touching another renderer's context.
    const candidates = Array.from(page.ownerDocument.querySelectorAll('canvas')).slice(0, 64).filter(eligible);
    candidates.sort((a, b) => {
      const area = element => { const box = element.getBoundingClientRect(); return Math.min(box.width, target.width) * Math.min(box.height, target.height); };
      return area(b) - area(a);
    });
    return candidates[0] || null;
  };
  const showRegions = regions => {
    overlay.replaceChildren();
    if (!config.debug) { overlay.remove(); return; }
    if (!overlay.isConnected) document.body.append(overlay);
    for (const region of regions) {
      const box = document.createElement('span');
      Object.assign(box.style, { position: 'absolute', left: `${region.rect.x}px`, top: `${region.rect.y}px`, width: `${region.rect.width}px`, height: `${region.rect.height}px`, border: '1px dashed #fff', boxShadow: '0 0 0 1px #111', color: '#fff', background: '#1112', font: '11px Arial,sans-serif', padding: '4px', textShadow: '0 1px 3px #000' });
      box.textContent = region.name;
      overlay.append(box);
    }
  };
  const report = result => {
    lastResult = result;
    onSample(result);
  };
  const capture = (canvas = source, force = false) => {
    const now = performance.now();
    if (destroyed || !config.enabled || document.hidden || !context || now < blockedUntil || !force && now - lastRead < config.interval) return false;
    if (!canvas || !eligible(canvas)) return false;
    const target = surface.getBoundingClientRect();
    if (target.bottom <= 0 || target.top >= innerHeight || target.right <= 0 || target.left >= innerWidth) { overlay.remove(); return false; }
    if (source !== canvas) { source = canvas; stabilizer = createSceneStabilizer(config); }
    const sourceBox = canvas.getBoundingClientRect();
    const regions = samplingRegions(target, sourceBox, config.patchSize);
    const resolution = config.resolution;
    lastRead = now;
    reads++;
    atlas.width = resolution * regions.length;
    atlas.height = resolution;
    try {
      regions.forEach((region, index) => {
        const r = region.rect;
        context.drawImage(canvas, (r.x - sourceBox.x) * canvas.width / sourceBox.width, (r.y - sourceBox.y) * canvas.height / sourceBox.height, r.width * canvas.width / sourceBox.width, r.height * canvas.height / sourceBox.height, index * resolution, 0, resolution, resolution);
      });
      // One getImageData call for all patches. GPU-to-CPU work can still stall.
      const image = context.getImageData(0, 0, atlas.width, atlas.height);
      const patches = regions.map((region, index) => {
        const pixels = new Uint8ClampedArray(resolution * resolution * 4);
        for (let row = 0; row < resolution; row++) {
          const offset = (row * atlas.width + index * resolution) * 4;
          pixels.set(image.data.subarray(offset, offset + resolution * 4), row * resolution * 4);
        }
        return { ...region, ...patchColors(pixels) };
      });
      if (patches.some(patch => patch.coverage < .95)) throw new Error('transparent-frame');
      const palette = paletteFromPatches(patches);
      if (!palette) throw new Error('empty-frame');
      const held = stabilizer.push(palette, now);
      successes++;
      lastDurationMs = Math.round((performance.now() - now) * 100) / 100;
      showRegions(regions);
      report({ status: 'sampled', palette: held.palette, pending: held.pending, kind: palette.sceneKind,
        source: `canvas${canvas.id ? '#' + canvas.id : ''}`, sourceElement: canvas,
        regions: patches.map(patch => ({ name: patch.name, rect: patch.rect, color: patch.colors[0] ? paletteColor(patch.colors[0].color) : null, coverage: patch.coverage })),
        clusters: palette.clusters, resolution, patchSize: config.patchSize,
      });
      return true;
    } catch (error) {
      blockedUntil = now + (error.name === 'SecurityError' ? 10000 : 1000);
      overlay.remove();
      const status = error.name === 'SecurityError' ? 'blocked-origin' : ['transparent-frame', 'empty-frame'].includes(error.message) ? error.message : 'readback-failed';
      report({ status, palette: lastResult?.palette || null, source: `canvas${canvas.id ? '#' + canvas.id : ''}`, sourceElement: canvas, regions: [], clusters: [], pending: false });
      return false;
    }
  };
  const tick = now => {
    frame = 0;
    if (destroyed || !config.enabled) return;
    if (!document.hidden) {
      const target = surface.getBoundingClientRect();
      if (target.bottom <= 0 || target.top >= innerHeight || target.right <= 0 || target.left >= innerWidth) { overlay.remove(); schedule(); return; }
      if (now - lastDiscovery >= 1500 || !source?.isConnected) {
        lastDiscovery = now;
        const next = discover();
        if (next !== source) { source = next; stabilizer = createSceneStabilizer(config); lastRead = -Infinity; blockedUntil = 0; lastResult = null; }
        if (!source && lastResult?.status !== 'no-readable-canvas') { overlay.remove(); report({ status: 'no-readable-canvas', palette: null, regions: [], clusters: [], pending: false }); }
      }
      capture();
    }
    schedule();
  };
  function schedule(delay = config.interval) {
    if (destroyed || !config.enabled || document.hidden) return;
    // Register from a later task so normal renderer RAF callbacks are already queued.
    // Reading inside this RAF observes their current frame before browser compositing.
    wakeTimer = setTimeout(() => { wakeTimer = 0; frame = requestAnimationFrame(tick); }, delay);
  }
  const configure = (next = {}) => {
    const merged = { ...samplingDefaults, ...config, ...next };
    config = { enabled: merged.enabled !== false, debug: merged.debug === true,
      patchSize: Math.round(bounded(merged.patchSize, 100, 24, 300)), resolution: Math.round(bounded(merged.resolution, 20, 8, 32)),
      interval: bounded(merged.interval, 500, 250, 5000), changeThreshold: bounded(merged.changeThreshold, 8, 2, 30), settleMs: bounded(merged.settleMs, 1000, 250, 5000),
    };
    stabilizer = createSceneStabilizer(config);
    lastRead = lastDiscovery = -Infinity;
    blockedUntil = 0;
    cancelAnimationFrame(frame);
    clearTimeout(wakeTimer);
    frame = 0;
    if (!config.debug) overlay.remove();
    if (config.enabled) schedule(0);
    else { overlay.remove(); report({ status: 'disabled', palette: null, regions: [], clusters: [], pending: false }); }
  };
  const visibility = () => { overlay.remove(); lastRead = -Infinity; cancelAnimationFrame(frame); clearTimeout(wakeTimer); frame = 0; schedule(0); };
  document.addEventListener('visibilitychange', visibility);
  configure(initial === false ? { enabled: false } : initial);
  return {
    configure,
    capture,
    setSource(element) {
      if (element != null && !(element instanceof HTMLCanvasElement)) throw new TypeError('Backdrop source must be a canvas or null.');
      explicitSource = element; source = null; lastResult = null; lastDiscovery = -Infinity;
    },
    get config() { return { ...config }; },
    get stats() { return { reads, successes, lastDurationMs, status: lastResult?.status || 'initializing' }; },
    destroy() { destroyed = true; cancelAnimationFrame(frame); clearTimeout(wakeTimer); overlay.remove(); document.removeEventListener('visibilitychange', visibility); },
  };
}

function paletteColor(color) { return '#' + [color.r, color.g, color.b].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join(''); }
