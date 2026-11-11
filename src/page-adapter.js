import { choosePalette, parseColor } from './palette.js';
import { resolveHostTheme } from './theme-policy.js';
import { createBackdropSampler } from './backdrop-sampler.js';
import { createPaletteMotion, paletteKeys } from './palette-motion.js';

const excluded = '#player-mount, .cutframe-language, .cutframe-provider, .cutframe, .showcase-bar, [data-palette-ignore], script, style, template, video, canvas, iframe';
const observationExcluded = `${excluded}, [data-cutframe-probe]`;

/** Conservative hints only: no attempt to capture or interpret arbitrary rendered pixels. */
export function inspectBackdrop(page, surface) {
  const reasons = new Set();
  const visible = el => {
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) >= .1;
  };
  const inspect = el => {
    if (el.closest('.cutframe-language, .cutframe-provider, .cutframe') || surface.contains(el) || !visible(el)) return;
    if (el.getAttribute('data-cutframe-backdrop') === 'dynamic') reasons.add('Host-declared dynamic backdrop');
    if (el.matches('canvas, video, iframe')) reasons.add(`${el.tagName.toLowerCase()} backdrop requires pixel sampling`);
  };
  Array.from(page.querySelectorAll('canvas, video, iframe, [data-cutframe-backdrop]')).slice(0, 64).forEach(inspect);
  for (let el = page; el; el = el.parentElement) {
    inspect(el);
    // Background layers may be siblings of the content, rather than descendants.
    for (const sibling of el.parentElement?.children || []) if (sibling !== el && sibling.matches('canvas, video, iframe, [data-cutframe-backdrop]')) inspect(sibling);
    for (const pseudo of [null, '::before', '::after']) {
      const style = getComputedStyle(el, pseudo);
      if (pseudo && ['none', 'normal'].includes(style.content)) continue;
      if (style.backgroundImage !== 'none') reasons.add('Image or gradient backdrop is not a solid surface');
      if (style.mixBlendMode !== 'normal' || style.backdropFilter && style.backdropFilter !== 'none') reasons.add('Composited backdrop');
    }
  }
  return [...reasons];
}

/** Read final computed page styles in an invisible, transition-free measurement copy. */
export function samplePage(page) {
  const width = page.getBoundingClientRect().width;
  const probe = page.cloneNode(true);
  probe.classList.add('palette-probe');
  probe.setAttribute('data-cutframe-probe', '');
  probe.setAttribute('aria-hidden', 'true');
  probe.inert = true;
  Object.assign(probe.style, { position: 'fixed', left: '-100000px', top: '0', width: `${width}px`, opacity: '0', pointerEvents: 'none', zIndex: '-9999' });
  const players = page.querySelectorAll('.cutframe-language');
  probe.querySelectorAll('.cutframe-language').forEach((player, index) => {
    const placeholder = document.createElement('div');
    placeholder.style.height = `${players[index].getBoundingClientRect().height}px`;
    placeholder.setAttribute('data-palette-ignore', '');
    player.replaceWith(placeholder);
  });
  const slot = probe.querySelector('#player-mount');
  if (slot) {
    slot.style.height = `${page.querySelector('#player-mount').getBoundingClientRect().height}px`;
    slot.replaceChildren();
  }
  const motionReset = document.createElement('style');
  motionReset.textContent = '.palette-probe, .palette-probe *, .palette-probe::before, .palette-probe::after, .palette-probe *::before, .palette-probe *::after { transition: none !important; animation: none !important; }';
  probe.append(motionReset);
  probe.querySelectorAll('video, iframe, canvas').forEach(node => node.remove());
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const colorCache = new Map();
  function decode(value) {
    if (colorCache.has(value)) return colorCache.get(value);
    let color = parseColor(value);
    if (!color && context && value && value !== 'none') {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = 'transparent';
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      color = a ? { r, g, b, a: a / 255 } : null;
    }
    colorCache.set(value, color);
    return color;
  }
  document.body.append(probe);
  try {
    const rootStyle = getComputedStyle(probe);
    let background = decode(rootStyle.backgroundColor);
    if (!background || background.a < .85) {
      background = null;
      for (let ancestor = page.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const candidate = decode(getComputedStyle(ancestor).backgroundColor);
        if (candidate?.a >= .85) { background = candidate; break; }
      }
      background ||= parseColor('#ffffff');
    }
    const samples = [];
    const fonts = new Map([[rootStyle.fontFamily, 2]]);
    const typography = new Map();
    const addTypography = (style, weight) => {
      const values = { font: style.fontFamily, fontWeight: style.fontWeight, fontStyle: style.fontStyle, letterSpacing: style.letterSpacing };
      const key = JSON.stringify(values);
      const sample = typography.get(key) || { ...values, weight: 0 };
      sample.weight += weight;
      typography.set(key, sample);
    };
    addTypography(rootStyle, 2);
    const edgeWidths = [];
    const add = (value, role, weight, source) => {
      const color = decode(value);
      if (color?.a >= .85) samples.push({ color, role, weight, source });
    };
    add(rootStyle.backgroundColor, 'surface', 2.5, 'Page background');
    add(rootStyle.color, 'text', 2, 'Page body text');
    const elements = Array.from(probe.querySelectorAll('*')).filter(el => !el.closest(excluded));
    for (const el of elements) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < .1) continue;
      const label = `${el.tagName.toLowerCase()}${el.classList.length ? '.' + Array.from(el.classList).slice(0, 2).join('.') : ''}`;
      const weight = Math.min(2.2, Math.max(.12, Math.sqrt(box.width * box.height) / 130));
      const interactive = el.matches('a, button, select, input, [role="button"]');
      const heading = !!el.closest('h1, h2, h3, h4, h5, h6');
      const badge = /badge|tag|chip|pill/.test(el.className?.toString() || '');
      add(style.backgroundColor, 'surface', weight, `${label} surface`);
      if (interactive || badge) add(style.backgroundColor, 'accent', weight * (interactive ? 4 : 1.6), `${label} fill`);
      const directText = Array.from(el.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (directText) {
        add(style.color, 'text', weight * (heading ? .75 : 1), `${label} text`);
        if (interactive || heading || badge) add(style.color, 'accent', weight * (interactive ? 1.8 : .8), `${label} text`);
        if (!heading) {
          fonts.set(style.fontFamily, (fonts.get(style.fontFamily) || 0) + weight);
          addTypography(style, weight);
        }
      }
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
        const thickness = parseFloat(style[`border${side}Width`]);
        if (thickness > 0 && thickness < 5) {
          add(style[`border${side}Color`], 'border', weight / 5, `${label} border`);
          edgeWidths.push(thickness);
        }
      }
      const stops = style.backgroundImage.match(/rgba?\([^)]*\)/g) || [];
      stops.forEach(color => add(color, 'surface', weight / Math.max(1, stops.length), `${label} gradient`));
    }
    const palette = choosePalette(samples, background);
    const font = [...fonts].sort((a, b) => b[1] - a[1])[0]?.[0] || rootStyle.fontFamily;
    const type = [...typography.values()].filter(sample => sample.font === font).sort((a, b) => b.weight - a.weight)[0];
    return {
      ...palette,
      font, fontWeight: type.fontWeight, fontStyle: type.fontStyle, letterSpacing: type.letterSpacing,
      edgeWidth: edgeWidths.length ? Math.min(3, Math.max(1, edgeWidths.sort((a, b) => a - b)[Math.floor(edgeWidths.length / 2)])) : 1,
      sampleCount: samples.length,
    };
  } finally { probe.remove(); }
}

export function createPageAdapter(page, surface, onAdapt = () => {}, options = {}) {
  let pending = 0;
  let timer = 0;
  let destroyed = false;
  let lastProfile;
  let lastApplied = -Infinity;
  let cached;
  let reset = false;
  let mode = options.mode === 'stable' ? 'stable' : 'auto';
  let hostTheme = { ...options.theme };
  let scene;
  let sampler;
  let samplingSettings = options.sampling === false ? { enabled: false } : { ...options.sampling };
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let inView = true;
  const previousAnimation = surface.getAttribute('data-palette-animation');
  surface.dataset.paletteAnimation = 'raf';
  const colorToken = key => key === 'accentForeground' ? 'accent-foreground' : key;
  const paletteMotion = createPaletteMotion(colors => {
    for (const key of paletteKeys) {
      const token = `--cutframe-${colorToken(key)}`;
      if (surface.style.getPropertyValue(token) !== colors[key]) surface.style.setProperty(token, colors[key]);
    }
  }, options.transition, {
    canAnimate: () => !document.hidden && inView && surface.isConnected && !motionPreference.matches,
    onSettled: () => { if (!destroyed && lastProfile) onAdapt(lastProfile); },
  });
  const visibility = new IntersectionObserver(entries => {
    inView = entries[0]?.isIntersecting ?? true;
    if (!inView) paletteMotion.finish();
  });
  visibility.observe(surface);
  const stopMotion = () => { if (document.hidden || motionPreference.matches) paletteMotion.finish(); };
  document.addEventListener('visibilitychange', stopMotion);
  motionPreference.addEventListener('change', stopMotion);
  const interval = Math.max(100, Number(options.minInterval) || 250);
  const apply = () => {
    pending = 0;
    if (destroyed) return;
    if (reset) { cached = null; reset = false; }
    const rootStyle = getComputedStyle(page);
    const typeKey = [rootStyle.fontFamily, rootStyle.fontWeight, rootStyle.fontStyle, rootStyle.letterSpacing].join('|');
    if (!cached || !cached.stable && !scene?.palette || cached.typeKey !== typeKey) {
      const reasons = inspectBackdrop(page, surface);
      cached = { sampled: samplePage(page), reasons, typeKey, stable: mode === 'stable' || reasons.length > 0 };
    }
    if (scene?.sourceElement?.isConnected && ['transparent-frame', 'empty-frame', 'blocked-origin', 'readback-failed'].includes(scene.status)) cached.stable = true;
    const declared = {};
    for (const [key, token] of Object.entries({ surface: 'surface', foreground: 'foreground', accent: 'accent', accentForeground: 'accent-foreground', muted: 'muted' })) {
      declared[key] = rootStyle.getPropertyValue(`--cutframe-host-${token}`).trim();
    }
    const hasScene = mode === 'auto' && samplingSettings.enabled !== false && scene?.palette && (!scene.sourceElement || scene.sourceElement.isConnected);
    const base = hasScene ? { ...cached.sampled, ...scene.palette } : cached.sampled;
    const profile = resolveHostTheme(base, { ...declared, ...hostTheme }, cached.stable && !hasScene);
    if (hasScene && profile.strategy !== 'host-theme') profile.strategy = scene.status === 'sampled' ? 'scene-sampled' : 'scene-held';
    profile.backdropReasons = cached.reasons;
    profile.stable = cached.stable && !hasScene;
    const { sourceElement, palette, ...diagnostics } = scene || {};
    profile.scene = { status: 'initializing', ...diagnostics };
    if (palette) profile.scene.automaticPalette = Object.fromEntries(['surface', 'foreground', 'accent', 'accentForeground', 'muted'].map(key => [key, palette[key]]));
    const values = {
      font: profile.font, 'font-weight': profile.fontWeight, 'font-style': profile.fontStyle,
      'letter-spacing': profile.letterSpacing, 'edge-width': `${profile.edgeWidth}px`,
    };
    for (const [key, value] of Object.entries(values)) if (surface.style.getPropertyValue(`--cutframe-${key}`) !== value) surface.style.setProperty(`--cutframe-${key}`, value);
    paletteMotion.to(profile);
    surface.dataset.adaptation = profile.strategy;
    surface.dataset.backdropPolicy = hasScene ? 'sampled' : cached.stable ? 'stable' : 'inferred';
    lastApplied = performance.now();
    const changed = JSON.stringify(lastProfile) !== JSON.stringify(profile);
    lastProfile = profile;
    if (changed) onAdapt(profile);
  };
  const refresh = (request = {}) => {
    if (destroyed) return;
    reset ||= request.reset === true;
    if (pending || timer) return;
    const wait = Math.max(0, interval - (performance.now() - lastApplied));
    if (wait) timer = setTimeout(() => { timer = 0; pending = requestAnimationFrame(apply); }, wait);
    else pending = requestAnimationFrame(apply);
  };
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      if (record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(node => node instanceof Element && node.matches('[data-cutframe-probe]'))) return false;
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      return target && !target.closest(observationExcluded);
    })) refresh({ reset: records.some(record =>
      record.target === page && ['class', 'data-cutframe-backdrop'].includes(record.attributeName)
      || record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && (
        node.matches('canvas, video, iframe, [data-cutframe-backdrop]') || node.querySelector('canvas, video, iframe, [data-cutframe-backdrop]')
      ))
    ) });
  });
  observer.observe(page, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'lang', 'data-cutframe-backdrop'] });
  const ancestors = new MutationObserver(records => refresh({ reset: records.some(record => ['class', 'data-cutframe-backdrop'].includes(record.attributeName)) }));
  for (let parent = page.parentElement; parent; parent = parent.parentElement) ancestors.observe(parent, { attributes: true, attributeFilter: ['class', 'style', 'lang', 'data-cutframe-backdrop'] });
  window.addEventListener('resize', refresh);
  document.fonts?.ready.then(refresh);
  sampler = createBackdropSampler(page, surface, result => { scene = result; refresh(); }, { ...samplingSettings, enabled: mode !== 'stable' && samplingSettings.enabled !== false });
  if (options.backdrop) sampler.setSource(options.backdrop);
  return {
    refresh,
    setTheme(theme = {}) { hostTheme = { ...theme }; refresh(); },
    setMode(value) {
      if (!['auto', 'stable'].includes(value)) throw new TypeError('Adapter mode must be auto or stable.');
      mode = value;
      sampler.configure({ ...samplingSettings, enabled: mode !== 'stable' && samplingSettings.enabled !== false });
      refresh({ reset: true });
    },
    setSampling(next = {}) {
      samplingSettings = { ...samplingSettings, ...(typeof next === 'boolean' ? { enabled: next } : next) };
      sampler.configure({ ...samplingSettings, enabled: mode !== 'stable' && samplingSettings.enabled !== false });
      refresh();
    },
    setBackdrop(canvas = null) { scene = null; sampler.setSource(canvas); refresh(); },
    captureBackdrop: canvas => sampler.capture(canvas),
    get sampling() { return sampler.config; },
    get samplingStats() { return sampler.stats; },
    setTransition(next = {}) { paletteMotion.configure(typeof next === 'boolean' ? { duration: next ? 1000 : 0 } : next); },
    get transition() { return paletteMotion.settings; },
    get transitionStats() { return paletteMotion.stats; },
    get renderedPalette() { return paletteMotion.current; },
    get profile() { return lastProfile; },
    destroy() {
      destroyed = true;
      paletteMotion.destroy(); visibility.disconnect(); sampler.destroy(); observer.disconnect(); ancestors.disconnect();
      document.removeEventListener('visibilitychange', stopMotion); motionPreference.removeEventListener('change', stopMotion);
      window.removeEventListener('resize', refresh);
      if (previousAnimation === null) surface.removeAttribute('data-palette-animation');
      else surface.setAttribute('data-palette-animation', previousAnimation);
      if (pending) cancelAnimationFrame(pending); if (timer) clearTimeout(timer);
    },
  };
}
