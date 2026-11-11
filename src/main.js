import { createCutframe, createPageAdapter } from './cutframe.js';
import { videoSource, videoPoster, videoTitle, videoSubtitle, previewSource, castSource, skinLanguage, chaptersSource, captionTracks } from './config.js';
import { createThemeTransition } from './theme-transition.js';
import { environments } from './environments.js';
import { createStyleLab } from './style-lab.js';
import './page.css';

const page = document.getElementById('page');
const player = createCutframe(document.getElementById('player-mount'), {
  source: videoSource, poster: videoPoster, title: videoTitle, subtitle: videoSubtitle, previewSource, castSource, chaptersSource, captionTracks, language: skinLanguage, keyboardTarget: 'document',
});
const styleLab = createStyleLab(page, player.surface);
const adapter = createPageAdapter(page, player.surface, profile => {
  styleLab.report(profile);
  const rows = document.getElementById('palette-proof');
  rows.replaceChildren();
  for (const [role, value] of Object.entries({ surface: profile.surface, foreground: profile.foreground, accent: profile.accent })) {
    const item = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'palette-swatch';
    swatch.style.backgroundColor = value;
    const label = document.createElement('span');
    label.textContent = `${role}: ${value} — ${profile.sources[role]}`;
    item.append(swatch, label);
    rows.append(item);
  }
  document.getElementById('palette-count').textContent = `${profile.colorCount} page color groups · selected by role and contrast`;
});

function applyTheme(name) {
  name = Object.hasOwn(environments, name) ? name : 'paper';
  const environment = environments[name];
  player.lens.stop();
  player.closeMenus();
  player.setLanguage(environment.skinLanguage || skinLanguage);
  page.className = `page theme-${name}`;
  document.getElementById('environment-top').innerHTML = environment.top;
  document.getElementById('environment-bottom').innerHTML = environment.bottom;
  styleLab.setActive(name === 'lab');
  document.querySelector('meta[name="theme-color"]').content = environment.color;
  document.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === name)));
  adapter.refresh();
  const url = new URL(location.href);
  url.searchParams.set('theme', name);
  history.replaceState(null, '', url);
}

const setTheme = createThemeTransition(applyTheme, () => Array.from(document.querySelectorAll(
  '#environment-top > *, #environment-bottom > *, .cf-time, .cf-dock-title, .cf-current-chapter, .cf-volume-value, .cf-rate-value'
)));
document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => setTheme(button.dataset.theme)));
setTheme(new URL(location.href).searchParams.get('theme') || 'paper', false);
document.addEventListener('visibilitychange', () => { if (document.hidden) player.lens.stop(); });
