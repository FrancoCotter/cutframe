const clamp = (n, min = 0, max = 255) => Math.min(max, Math.max(min, n));

export function parseColor(value) {
  if (!value || value === 'transparent') return null;
  const text = value.trim();
  if (text.startsWith('#')) {
    let hex = text.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map(c => c + c).join('');
    if (!/^[\da-f]{6}([\da-f]{2})?$/i.test(hex)) return null;
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1 };
  }
  if (!/^rgba?\(/i.test(text)) return null;
  const parts = text.slice(text.indexOf('(') + 1, -1).split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const channel = part => clamp(parseFloat(part) * (part.endsWith('%') ? 2.55 : 1));
  const alpha = parts[3] ? clamp(parseFloat(parts[3]) / (parts[3].endsWith('%') ? 100 : 1), 0, 1) : 1;
  const color = { r: channel(parts[0]), g: channel(parts[1]), b: channel(parts[2]), a: alpha };
  return Object.values(color).every(Number.isFinite) ? color : null;
}

export function hex(color) {
  return '#' + [color.r, color.g, color.b].map(channel => Math.round(clamp(channel)).toString(16).padStart(2, '0')).join('');
}

const linear = n => n / 255 <= .04045 ? n / 255 / 12.92 : ((n / 255 + .055) / 1.055) ** 2.4;
export function luminance(c) { return .2126 * linear(c.r) + .7152 * linear(c.g) + .0722 * linear(c.b); }
export function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + .05) / (low + .05);
}

export function lab(c) {
  const r = linear(c.r), g = linear(c.g), b = linear(c.b);
  const f = n => n > .008856 ? Math.cbrt(n) : 7.787 * n + 16 / 116;
  const x = f((r * .4124564 + g * .3575761 + b * .1804375) / .95047);
  const y = f(r * .2126729 + g * .7151522 + b * .072175);
  const z = f((r * .0193339 + g * .119192 + b * .9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export function colorDistance(a, b) { return Math.hypot(...lab(a).map((value, i) => value - lab(b)[i])); }
const chroma = c => Math.hypot(lab(c)[1], lab(c)[2]);

/** Group nearby colors, but keep an actual sampled color rather than averaging hues. */
export function clusterColors(samples) {
  const clusters = [];
  for (const sample of [...samples].sort((a, b) => b.weight - a.weight)) {
    if (!sample.color || sample.color.a < .85 || sample.weight <= 0) continue;
    let cluster = clusters.find(group => colorDistance(group.color, sample.color) < 8);
    if (!cluster) {
      cluster = { color: sample.color, source: sample.source, weight: 0, roles: {} };
      clusters.push(cluster);
    }
    cluster.weight += sample.weight;
    cluster.roles[sample.role] = (cluster.roles[sample.role] || 0) + sample.weight;
  }
  return clusters;
}

const best = (items, score) => [...items].sort((a, b) => score(b) - score(a))[0];
const black = { r: 0, g: 0, b: 0, a: 1 };
const white = { r: 255, g: 255, b: 255, a: 1 };

/** Infer visual roles from page samples, semantic weights, Lab distance and contrast. */
export function choosePalette(samples, background) {
  const groups = clusterColors(samples);
  const base = background || white;
  const surfaces = groups.filter(g => g.roles.surface && colorDistance(g.color, base) < 26);
  const surface = best(surfaces, g => Math.log1p(g.roles.surface) - colorDistance(g.color, base) / 45) || { color: base, source: 'Page background' };
  const readable = groups.filter(g => contrast(g.color, surface.color) >= 4.5);
  const ink = best(readable, g => Math.log1p(g.roles.text || 0) * 2 + Math.min(contrast(g.color, surface.color), 12) / 10 - chroma(g.color) / 110)
    || { color: contrast(black, surface.color) >= contrast(white, surface.color) ? black : white, source: 'Contrast fallback' };
  const accents = groups.filter(g => g.roles.accent && chroma(g.color) > 12 && contrast(g.color, surface.color) >= 3);
  const accent = best(accents, g => Math.log1p(g.roles.accent) * 2 + Math.min(chroma(g.color), 90) / 70 + Math.log1p(g.weight) / 4)
    || ink;
  const accentText = best(groups.filter(g => contrast(g.color, accent.color) >= 4.5), g => Math.min(contrast(g.color, accent.color), 14) + Math.log1p(g.roles.text || 0) / 4)
    || { color: contrast(black, accent.color) >= contrast(white, accent.color) ? black : white, source: 'Contrast fallback' };
  const muted = best(readable.filter(g => g.roles.text && colorDistance(g.color, ink.color) > 6), g => Math.log1p(g.roles.text) - Math.abs(contrast(g.color, surface.color) - 5) / 5) || ink;
  return {
    background: hex(base), surface: hex(surface.color), foreground: hex(ink.color),
    muted: hex(muted.color), accent: hex(accent.color), accentForeground: hex(accentText.color),
    sources: { surface: surface.source, foreground: ink.source, accent: accent.source, accentForeground: accentText.source },
    colorCount: groups.length,
  };
}
