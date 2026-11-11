import { choosePalette, parseColor } from './palette.js';

const excluded = '#player-mount, .cutframe-language, .cutframe-provider, .cutframe, .showcase-bar, [data-palette-ignore], script, style, template, video, canvas, iframe';
const observationExcluded = `${excluded}, [data-cutframe-probe]`;

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

export function createPageAdapter(page, surface, onAdapt = () => {}) {
  let pending = 0;
  let destroyed = false;
  let lastProfile;
  const apply = () => {
    pending = 0;
    const profile = samplePage(page);
    const values = {
      background: profile.background, surface: profile.surface, foreground: profile.foreground,
      muted: profile.muted, accent: profile.accent, 'accent-foreground': profile.accentForeground,
      font: profile.font, 'font-weight': profile.fontWeight, 'font-style': profile.fontStyle,
      'letter-spacing': profile.letterSpacing, 'edge-width': `${profile.edgeWidth}px`,
    };
    for (const [key, value] of Object.entries(values)) surface.style.setProperty(`--cutframe-${key}`, value);
    surface.dataset.adaptation = 'page-styles';
    lastProfile = profile;
    onAdapt(profile);
  };
  const refresh = () => { if (!destroyed && !pending) pending = requestAnimationFrame(apply); };
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      if (record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(node => node instanceof Element && node.matches('[data-cutframe-probe]'))) return false;
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      return target && !target.closest(observationExcluded);
    })) refresh();
  });
  observer.observe(page, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'lang'] });
  const ancestors = new MutationObserver(refresh);
  for (let parent = page.parentElement; parent; parent = parent.parentElement) ancestors.observe(parent, { attributes: true, attributeFilter: ['class', 'style', 'lang'] });
  window.addEventListener('resize', refresh);
  document.fonts?.ready.then(refresh);
  return { refresh, get profile() { return lastProfile; }, destroy() { destroyed = true; observer.disconnect(); ancestors.disconnect(); window.removeEventListener('resize', refresh); if (pending) cancelAnimationFrame(pending); } };
}
