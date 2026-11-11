import { colorDistance, contrast, hex, lab, parseColor } from './palette.js';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const black = parseColor('#000000'), white = parseColor('#ffffff');
const inkFor = color => contrast(black, color) >= contrast(white, color) ? black : white;
const chroma = color => Math.hypot(...lab(color).slice(1));

export function samplingRegions(target, source, size = 100) {
  const width = Math.min(size, source.width), height = Math.min(size, source.height);
  if (width <= 0 || height <= 0) return [];
  const cx = target.x + target.width / 2, cy = target.y + target.height / 2;
  return [
    ['top', cx, target.y - size / 2 - 8, 1],
    ['bottom', cx, target.y + target.height + size / 2 + 8, 2],
    ['left', target.x - size / 2 - 8, cy, 1],
    ['right', target.x + target.width + size / 2 + 8, cy, 1],
    ['center', cx, cy, .5],
  ].map(([name, x, y, weight]) => ({
    name, weight,
    rect: { x: clamp(x - width / 2, source.x, source.x + source.width - width), y: clamp(y - height / 2, source.y, source.y + source.height - height), width, height },
  }));
}

/** Each patch keeps a color distribution, rather than becoming an averaged RGB value. */
export function patchColors(data) {
  const bins = new Map();
  let valid = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 250) continue;
    valid++;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const bin = bins.get(key) || { color: { r: data[i], g: data[i + 1], b: data[i + 2], a: 1 }, count: 0 };
    bin.count++;
    bins.set(key, bin);
  }
  return { coverage: valid / Math.max(1, data.length / 4), colors: [...bins.values()].sort((a, b) => b.count - a.count).slice(0, 16).map(bin => ({ color: bin.color, share: bin.count / Math.max(1, valid) })) };
}

function accentFor(color, surface) {
  if (contrast(color, surface) >= 3) return color;
  const end = inkFor(surface);
  for (let step = 1; step <= 20; step++) {
    const t = step / 20;
    const candidate = { r: color.r * (1 - t) + end.r * t, g: color.g * (1 - t) + end.g * t, b: color.b * (1 - t) + end.b * t, a: 1 };
    // Check rounded colors: these are the values actually written to CSS.
    const rounded = parseColor(hex(candidate));
    if (contrast(rounded, surface) >= 3) return rounded;
  }
  return end;
}

export function paletteFromPatches(patches) {
  const samples = patches.flatMap(patch => patch.colors.map(color => ({ color: color.color, weight: color.share * patch.weight, region: patch.name })));
  const groups = [];
  for (const sample of samples.sort((a, b) => b.weight - a.weight)) {
    let group = groups.find(item => colorDistance(item.color, sample.color) < 10);
    if (!group) { group = { color: sample.color, weight: 0 }; groups.push(group); }
    group.weight += sample.weight;
  }
  groups.sort((a, b) => b.weight - a.weight);
  if (!groups.length) return null;
  const total = groups.reduce((sum, group) => sum + group.weight, 0);
  const main = groups[0];
  const uniform = main.weight / total >= .92;
  const surface = main.color;
  const foreground = inkFor(surface);
  const candidates = groups.filter(group => group.weight / total >= .06 && colorDistance(group.color, surface) >= 16);
  candidates.sort((a, b) => (b.weight / total + Math.min(chroma(b.color), 65) / 160) - (a.weight / total + Math.min(chroma(a.color), 65) / 160));
  const accent = accentFor(candidates[0]?.color || surface, surface);
  const accentForeground = inkFor(accent);
  return {
    background: hex(surface), surface: hex(surface), foreground: hex(foreground), muted: hex(foreground),
    accent: hex(accent), accentForeground: hex(accentForeground),
    sceneKind: uniform ? 'uniform' : 'multicolor',
    clusters: groups.slice(0, 8).map(group => ({ color: hex(group.color), share: Math.round(group.weight / total * 1000) / 1000 })),
    sources: { surface: 'Five-region scene dominant', foreground: 'Contrast against sampled surface', accent: candidates.length ? 'Scene secondary color / contrast adjustment' : 'Single-color scene / tonal accent', accentForeground: 'Contrast against scene accent' },
  };
}

/** Hysteresis: small noise and brief flashes do not replace the committed palette. */
export function createSceneStabilizer({ changeThreshold = 8, settleMs = 1000 } = {}) {
  let committed, candidate, since = 0;
  const distance = (a, b) => Math.max(colorDistance(parseColor(a.surface), parseColor(b.surface)), colorDistance(parseColor(a.accent), parseColor(b.accent)) * .5);
  return {
    push(next, now) {
      if (!committed) { committed = next; return { palette: committed, pending: false }; }
      if (distance(committed, next) < changeThreshold) { candidate = null; return { palette: committed, pending: false }; }
      if (!candidate || distance(candidate, next) > changeThreshold * 3) { candidate = next; since = now; }
      if (now - since >= settleMs) { committed = next; candidate = null; }
      return { palette: committed, pending: !!candidate };
    },
  };
}
