import { contrast, hex, lab, parseColor } from './palette.js';

export const paletteKeys = ['background', 'surface', 'foreground', 'muted', 'accent', 'accentForeground'];
const black = parseColor('#000000'), white = parseColor('#ffffff');
const clamp = n => Math.max(0, Math.min(1, n));
const readable = (color, surface, minimum) => contrast(parseColor(color), parseColor(surface)) >= minimum;
const inkFor = surface => contrast(black, parseColor(surface)) >= contrast(white, parseColor(surface)) ? '#000000' : '#ffffff';

function fromLab([l, a, b]) {
  const y = (l + 16) / 116, x = y + a / 500, z = y - b / 200;
  const inverse = n => n > 6 / 29 ? n ** 3 : 3 * (6 / 29) ** 2 * (n - 4 / 29);
  const X = inverse(x) * .95047, Y = inverse(y), Z = inverse(z) * 1.08883;
  const encode = n => 255 * clamp(n <= .0031308 ? 12.92 * n : 1.055 * Math.max(0, n) ** (1 / 2.4) - .055);
  return hex({
    r: encode(3.2404542 * X - 1.5371385 * Y - .4985314 * Z),
    g: encode(-.969266 * X + 1.8760108 * Y + .041556 * Z),
    b: encode(.0556434 * X - .2040259 * Y + 1.0572252 * Z),
  });
}

function mix(a, b, t) {
  if (t <= 0 || a === b) return a;
  if (t >= 1) return b;
  const start = lab(parseColor(a)), end = lab(parseColor(b));
  return fromLab(start.map((value, index) => value + (end[index] - value) * t));
}

function safeInk(wanted, surface, previous) {
  if (readable(wanted, surface, 4.5)) return wanted;
  if (previous && readable(previous, surface, 4.5)) return previous;
  return inkFor(surface);
}

function safeAccent(wanted, surface, previous) {
  if (readable(wanted, surface, 3)) return wanted;
  // Project toward a readable tonal endpoint. Favor the previous polarity when possible.
  const endpoints = ['#000000', '#ffffff'].filter(color => readable(color, surface, 3));
  const candidates = endpoints.map(end => {
    let low = 0, high = 1;
    for (let i = 0; i < 9; i++) {
      const middle = (low + high) / 2;
      if (readable(mix(wanted, end, middle), surface, 3)) high = middle;
      else low = middle;
    }
    return mix(wanted, end, high);
  });
  const reference = lab(parseColor(previous || wanted));
  candidates.sort((a, b) => {
    const distance = value => Math.hypot(...lab(parseColor(value)).map((channel, i) => channel - reference[i]));
    return distance(a) - distance(b);
  });
  return candidates[0] || inkFor(surface);
}

/** A coherent color frame; rounded CSS colors are checked, not just float endpoints. */
export function interpolatePalette(from, to, progress, previous = from) {
  const t = clamp(progress);
  if (t === 1) return Object.fromEntries(paletteKeys.map(key => [key, to[key]]));
  const result = Object.fromEntries(paletteKeys.map(key => [key, mix(from[key], to[key], t)]));
  result.foreground = safeInk(result.foreground, result.surface, previous.foreground);
  result.muted = safeInk(result.muted, result.surface, previous.muted);
  result.accent = safeAccent(result.accent, result.surface, previous.accent);
  result.accentForeground = safeInk(result.accentForeground, result.accent, previous.accentForeground);
  return result;
}

/** Finite, interruptible RAF animation. No reads of layout, DOM samples or video pixels. */
export function createPaletteMotion(write, options = {}, dependencies = {}) {
  const request = dependencies.requestFrame || (callback => requestAnimationFrame(callback));
  const cancel = dependencies.cancelFrame || (id => cancelAnimationFrame(id));
  const now = dependencies.now || (() => performance.now());
  const canAnimate = dependencies.canAnimate || (() => true);
  const onSettled = dependencies.onSettled || (() => {});
  let settings;
  let current, target, from, started = 0, frame = null, lastWrite = -Infinity, destroyed = false;
  let frames = 0, transitions = 0, lastFrameMs = 0, maxFrameMs = 0;
  const same = (a, b) => a && b && paletteKeys.every(key => a[key] === b[key]);
  const snapshot = value => Object.fromEntries(paletteKeys.map(key => [key, value[key]]));
  const stop = () => { if (frame !== null) cancel(frame); frame = null; };
  const paint = value => {
    const began = now();
    current = value;
    write({ ...value });
    frames++;
    lastFrameMs = Math.round((now() - began) * 1000) / 1000;
  };
  const finish = () => {
    const wasRunning = frame !== null;
    stop();
    if (!destroyed && target && !same(current, target)) paint({ ...target });
    if (wasRunning && !destroyed) onSettled();
  };
  const tick = timestamp => {
    frame = null;
    if (destroyed) return;
    if (!canAnimate()) { if (!same(current, target)) paint({ ...target }); onSettled(); return; }
    const t = clamp((timestamp - started) / settings.duration);
    if (t === 1 || timestamp - lastWrite >= 1000 / settings.maxFps - .5) {
      const began = now();
      const eased = t * t * (3 - 2 * t);
      paint(interpolatePalette(from, target, eased, current));
      lastFrameMs = Math.round((now() - began) * 1000) / 1000;
      maxFrameMs = Math.max(maxFrameMs, lastFrameMs);
      lastWrite = timestamp;
    }
    if (t < 1) frame = request(tick);
    else onSettled();
  };
  const to = value => {
    if (destroyed) return;
    const next = snapshot(value);
    if (same(next, target)) return;
    stop();
    target = next;
    if (!current || same(current, target) || !settings.duration || !canAnimate()) {
      if (!same(current, target)) paint({ ...target });
      return;
    }
    from = { ...current };
    started = now();
    lastWrite = -Infinity;
    transitions++;
    frame = request(tick);
  };
  const configure = (next = {}) => {
    const running = frame !== null;
    const merged = { duration: 1000, maxFps: 60, ...settings, ...next };
    const number = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
    settings = { duration: number(merged.duration, 1000, 0, 3000), maxFps: number(merged.maxFps, 60, 15, 120) };
    if (!settings.duration) finish();
    else if (running) { const destination = target; target = null; to(destination); }
  };
  configure(options === false ? { duration: 0 } : options);
  return {
    to, finish, configure,
    get current() { return current && { ...current }; },
    get settings() { return { ...settings }; },
    get stats() { return { running: frame !== null, frames, transitions, lastFrameMs, maxFrameMs }; },
    destroy() { destroyed = true; stop(); },
  };
}
