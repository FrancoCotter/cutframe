import { contrast, parseColor } from './palette.js';

const fonts = {
  sans: 'Arial, Helvetica, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", Courier, monospace',
  humanist: '"Trebuchet MS", sans-serif',
  system: 'system-ui, sans-serif',
};
const defaults = { background: '#eceee8', text: '#25382c', accent: '#516344', font: 'sans', customFont: '', weight: '400', style: 'normal', spacing: '0', width: '1120' };
const presets = {
  editorial: { ...defaults, background: '#f4eddf', text: '#382c46', accent: '#73418b', font: 'serif' },
  terminal: { ...defaults, background: '#111b19', text: '#d4e8dc', accent: '#7bc6a0', font: 'mono' },
  contrast: { ...defaults, background: '#eeeeee', text: '#cccccc', accent: '#dddddd' },
};
const storageKey = 'cutframe-style-lab-v1';

export function createStyleLab(page, surface) {
  const panel = document.getElementById('style-lab');
  const mount = document.getElementById('player-mount');
  let state = { ...defaults };
  let active = false;
  let profile;
  let reportFrame = 0;
  // Storage may be unavailable in private or embedded browser contexts.
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object') {
      for (const key of ['background', 'text', 'accent']) if (/^#[\da-f]{6}$/i.test(saved[key])) state[key] = saved[key];
      if (Object.hasOwn(fonts, saved.font) || saved.font === 'custom') state.font = saved.font;
      if (typeof saved.customFont === 'string' && CSS.supports('font-family', saved.customFont)) state.customFont = saved.customFont;
      if (['400', '500', '700', '900'].includes(saved.weight)) state.weight = saved.weight;
      if (['normal', 'italic'].includes(saved.style)) state.style = saved.style;
      if (Number.isFinite(Number(saved.spacing))) state.spacing = String(Math.max(-.02, Math.min(.12, Number(saved.spacing))));
      if (Number.isFinite(Number(saved.width))) state.width = String(Math.max(320, Math.min(1120, Number(saved.width))));
    }
  } catch { /* Use the initial style when no saved preferences are available. */ }

  panel.innerHTML = `
    <div class="lab-toolbar"><span>PAGE STYLE CONTROLS</span><span>Live · no reload</span></div>
    <div class="lab-fields">
      <label class="lab-field">Background<span class="lab-color"><input name="background" type="color" aria-label="Page background"><output data-value="background"></output></span></label>
      <label class="lab-field">Text color<span class="lab-color"><input name="text" type="color" aria-label="Page text color"><output data-value="text"></output></span></label>
      <label class="lab-field">Accent color<span class="lab-color"><input name="accent" type="color" aria-label="Page accent color"><output data-value="accent"></output></span></label>
      <label class="lab-field">Font family<select name="font"><option value="sans">Sans · Arial</option><option value="serif">Serif · Georgia</option><option value="mono">Mono · Courier</option><option value="humanist">Humanist · Trebuchet</option><option value="system">System font</option><option value="custom">Custom font…</option></select></label>
      <label class="lab-field" id="lab-custom-font" hidden>Installed font / CSS font stack<input name="customFont" type="text" placeholder='e.g. "PingFang SC", sans-serif' maxlength="200"><span>Uses fonts installed on your device.</span></label>
      <label class="lab-field">Font weight<select name="weight"><option value="400">Regular · 400</option><option value="500">Medium · 500</option><option value="700">Bold · 700</option><option value="900">Heavy · 900</option></select></label>
      <label class="lab-field">Font style<select name="style"><option value="normal">Normal</option><option value="italic">Italic</option></select></label>
      <label class="lab-field">Letter spacing <output data-value="spacing"></output><input name="spacing" type="range" min="-0.02" max="0.12" step="0.01"></label>
      <label class="lab-field">Player width <output data-value="width"></output><input name="width" type="range" min="320" max="1120" step="10"></label>
    </div>
    <div class="lab-actions"><div class="lab-presets"><span>TRY</span><button type="button" data-preset="editorial">Editorial ↗</button><button type="button" data-preset="terminal">Terminal ↗</button><button type="button" data-preset="contrast">Low contrast ↗</button></div><button type="button" data-reset>Reset styles ↺</button></div>
    <p class="lab-help">Edit the host page; the player adapts automatically. Unreadable colors may be replaced. Control sizes stay tuned for usability.</p>`;

  const controls = [...panel.querySelectorAll('[name]')];
  controls.forEach(control => {
    control.id = `lab-input-${control.name}`;
    control.closest('label').htmlFor = control.id;
  });
  function syncControls() {
    controls.forEach(control => { control.value = state[control.name]; });
    panel.querySelector('#lab-custom-font').hidden = state.font !== 'custom';
    for (const key of ['background', 'text', 'accent']) panel.querySelector(`[data-value="${key}"]`).textContent = state[key].toUpperCase();
    panel.querySelector('[data-value="spacing"]').textContent = `${Number(state.spacing).toFixed(2)} em`;
    panel.querySelector('[data-value="width"]').textContent = `${state.width} px max`;
  }
  function apply() {
    const family = state.font === 'custom' ? state.customFont.trim() || fonts.system : fonts[state.font];
    for (const [key, value] of Object.entries({ background: state.background, text: state.text, accent: state.accent, font: family, weight: state.weight, style: state.style, spacing: `${state.spacing}em` })) {
      page.style.setProperty(`--lab-${key}`, value);
    }
    mount.style.maxWidth = active ? `${state.width}px` : '';
    if (active) document.querySelector('meta[name="theme-color"]').content = state.background;
    syncControls();
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Keep the lab usable without persistence. */ }
  }
  panel.addEventListener('input', event => {
    const control = event.target;
    if (!controls.includes(control)) return;
    if (control.name === 'customFont' && control.value && !CSS.supports('font-family', control.value)) return;
    state[control.name] = control.value;
    apply();
  });
  panel.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.hasAttribute('data-reset')) state = { ...defaults };
    else if (button?.dataset.preset && Object.hasOwn(presets, button.dataset.preset)) state = { ...presets[button.dataset.preset] };
    else return;
    apply();
  });

  function renderReport() {
    reportFrame = 0;
    const results = page.querySelector('#lab-results');
    if (!active || !profile || !results) return;
    const type = getComputedStyle(surface.querySelector('.cf-time'));
    const ratio = (a, b) => contrast(parseColor(a), parseColor(b));
    const textRatio = ratio(profile.foreground, profile.surface);
    const accentRatio = ratio(profile.accent, profile.surface);
    const buttonRatio = ratio(profile.accentForeground, profile.accent);
    const pageRatio = ratio(state.text, state.background);
    const rows = [
      ['Player text / surface', `${textRatio.toFixed(2)}:1`, textRatio >= 4.5 ? 'Meets 4.5:1' : 'Below 4.5:1'],
      ['Accent / surface', `${accentRatio.toFixed(2)}:1`, accentRatio >= 3 ? 'Meets 3:1' : 'Below 3:1'],
      ['Play button text / fill', `${buttonRatio.toFixed(2)}:1`, buttonRatio >= 4.5 ? 'Meets 4.5:1' : 'Below 4.5:1'],
      ['Rendered player width', `${Math.round(surface.getBoundingClientRect().width)} px`, `${state.width} px requested maximum`],
      ['Control font family', type.fontFamily, 'Computed from the time display'],
      ['Control typography', `${type.fontWeight} · ${type.fontStyle} · ${type.letterSpacing}`, 'Weight · style · letter spacing'],
    ];
    results.replaceChildren();
    const heading = document.createElement('h2');
    heading.textContent = 'What the player actually uses';
    const note = document.createElement('p');
    note.className = 'lab-result-note';
    note.textContent = pageRatio < 4.5
      ? `Page text is only ${pageRatio.toFixed(2)}:1. The player selects a readable alternative; see its actual colors below.`
      : 'Live measurements of the adapted palette and rendered controls. These checks do not cover every accessibility requirement.';
    results.append(heading, note);
    const colors = document.createElement('div');
    colors.className = 'lab-result-colors';
    for (const [label, color] of [['Surface', profile.surface], ['Text', profile.foreground], ['Accent', profile.accent]]) {
      const item = document.createElement('span');
      const swatch = document.createElement('i');
      swatch.style.backgroundColor = color;
      item.append(swatch, `${label} ${color.toUpperCase()}`);
      colors.append(item);
    }
    results.append(colors);
    const list = document.createElement('dl');
    for (const [label, value, detail] of rows) {
      const item = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      const small = document.createElement('small');
      term.textContent = label;
      description.textContent = value;
      small.textContent = detail;
      description.append(small);
      item.append(term, description);
      list.append(item);
    }
    results.append(list);
  }
  const scheduleReport = () => { if (!reportFrame) reportFrame = requestAnimationFrame(renderReport); };
  new ResizeObserver(scheduleReport).observe(surface);
  apply();
  return {
    setActive(value) { active = value; panel.hidden = !active; apply(); },
    report(value) { profile = value; scheduleReport(); },
  };
}
