import '@videojs/html/i18n';
import '@videojs/html/video/player';
import '@videojs/html/media/hlsjs-video';
import '@videojs/html/ui/container';
import '@videojs/html/ui/play-button';
import '@videojs/html/ui/poster';
import '@videojs/html/ui/mute-button';
import '@videojs/html/ui/fullscreen-button';
import '@videojs/html/ui/playback-rate-button';
import '@videojs/html/ui/menu';
import '@videojs/html/ui/menu-content';
import '@videojs/html/ui/menu-item';
import '@videojs/html/ui/menu-checkbox-item';
import '@videojs/html/ui/menu-radio-group';
import '@videojs/html/ui/menu-radio-item';
import '@videojs/html/ui/menu-item-indicator';
import '@videojs/html/ui/playback-rate-radio-group';
import '@videojs/html/ui/quality-radio-group';
import '@videojs/html/ui/airplay-button';
import '@videojs/html/ui/cast-button';
import '@videojs/html/ui/pip-button';
import '@videojs/html/extensions/google-cast';
import '@videojs/html/ui/time-slider';
import '@videojs/html/ui/time-slider-chapters';
import '@videojs/html/ui/time-slider-chapter-title';
import '@videojs/html/ui/volume-slider';
import '@videojs/html/ui/slider-track';
import '@videojs/html/ui/slider-buffer';
import '@videojs/html/ui/slider-fill';
import '@videojs/html/ui/slider-thumb';
import '@videojs/html/ui/time';
import '@videojs/html/ui/hotkey';
import '@videojs/html/ui/gesture';
import '@videojs/html/ui/seek-indicator';
import '@videojs/html/ui/seek-indicator-value';
import '@videojs/html/ui/status-announcer';
import '@videojs/html/ui/buffering-indicator';
import '@videojs/html/ui/error-dialog';
import '@videojs/html/ui/dialog-popup';
import '@videojs/html/ui/dialog-title';
import '@videojs/html/ui/dialog-description';
import '@videojs/html/ui/dialog-close';
import { bindTimeLens } from './preview.js';
import { bindSkinLanguage } from './localization.js';
import { bindChapters } from './chapters.js';
import { bindFullscreenControls } from './controls-visibility.js';
import { qualityLabel, bindImmediateQuality, bindQualityAutoLabel } from './quality.js';
import { settingsMarkup, bindSettings } from './settings.js';
import { bindPoster } from './poster.js';
import { renderSkinIcons } from './icons.js';
import './skin.css';

const icon = (name, cls = '') => `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
const playGlyph = '<span class="cf-play-glyph" aria-hidden="true"></span>';
let instanceCount = 0;

export function createCutframe(mount, { source, poster, previewSource = source, castSource, chaptersSource, captionTracks = [], title = 'Featured film', subtitle = 'AN OBSERVATION IN MOTION', language = 'auto', keyboardTarget = 'player' }) {
  if (!(mount instanceof HTMLElement)) throw new TypeError('Cutframe needs a mount element.');
  if (typeof source !== 'string' || !source.trim()) throw new TypeError('Cutframe needs a video source URL.');
  const speedMenuId = `cutframe-speed-${++instanceCount}`;
  const chapterMenuId = `cutframe-chapters-${instanceCount}`;
  const qualityMenuId = `cutframe-quality-${instanceCount}`;
  const settings = settingsMarkup(instanceCount);
  const mediaTag = /\.m3u8(?:$|[?#])/i.test(source) ? 'hlsjs-video' : 'video';
  // The same markup and styles are used for every host page theme.
  mount.innerHTML = `
    <media-i18n class="cutframe-language">
    <video-player class="cutframe-provider">
      <media-container class="cutframe" aria-label="Cutframe video player" tabindex="0">
        <div class="cf-media">
          <${mediaTag} class="cf-video" playsinline preload="metadata" crossorigin="anonymous"></${mediaTag}>
          <media-poster class="cf-poster"><img alt="" decoding="async" fetchpriority="high" /></media-poster>
          <div class="cf-film-meta" aria-hidden="true"><span data-film-title></span><span data-film-subtitle></span></div>
          <media-play-button class="cf-central">${playGlyph}</media-play-button>
          <media-buffering-indicator class="cf-buffering"><span data-cf-text="loading">Loading…</span></media-buffering-indicator>
          <media-seek-indicator class="cf-seek-feedback" close-delay="850" aria-hidden="true">
            <span class="cf-seek-arrows"><i></i><i></i><i></i></span>
            <span class="cf-seek-label"><span class="cf-seek-backward" data-cf-text="backward">Rewind</span><span class="cf-seek-forward" data-cf-text="forward">Forward</span></span>
            <media-seek-indicator-value class="cf-seek-value"></media-seek-indicator-value>
          </media-seek-indicator>
        </div>
        <div class="cf-dock" data-interactive>
          <media-time-slider class="cf-timeline" pause-on-drag change-throttle="50">
            <media-time-slider-chapters class="cf-chapter-tracks"><template><div class="cf-chapter-segment"><media-slider-track class="cf-track"><media-slider-buffer class="cf-buffer"></media-slider-buffer><media-slider-fill class="cf-fill"></media-slider-fill></media-slider-track></div></template></media-time-slider-chapters>
            <media-slider-thumb class="cf-thumb"></media-slider-thumb>
            <media-time-slider-chapter-title class="cf-visually-hidden"></media-time-slider-chapter-title>
            <div class="cf-lens" hidden aria-hidden="true" data-loading="true">
              <div class="cf-lens-panel">
                <div class="cf-lens-image"><canvas width="320" height="134"></canvas><span class="cf-lens-wait" data-cf-text="locating">Finding frame…</span></div>
                <div class="cf-lens-chapter" hidden></div>
                <div class="cf-lens-footer"><span class="cf-lens-time">0:00.0</span></div>
                <div class="cf-lens-ruler"></div>
              </div>
              <svg class="cf-lens-tether" height="18" aria-hidden="true"><path /></svg>
              <span class="cf-lens-notch"></span>
            </div>
          </media-time-slider>
          <div class="cf-controls" role="group" data-cf-label="controls" aria-label="Video controls">
            <media-play-button class="cf-key cf-play">${playGlyph}</media-play-button>
            <div class="cf-audio">
              <media-mute-button class="cf-key cf-sound">${icon('volume-2', 'when-unmuted')}${icon('volume-x', 'when-muted')}</media-mute-button>
              <media-volume-slider class="cf-volume" step="5">
                <media-slider-track class="cf-track"><media-slider-fill class="cf-fill"></media-slider-fill></media-slider-track>
                <media-slider-thumb class="cf-volume-thumb"></media-slider-thumb>
              </media-volume-slider>
              <span class="cf-volume-value" aria-hidden="true">70%</span>
            </div>
            <span class="cf-time"><media-time type="current"></media-time><span class="cf-time-separator"> / </span><media-time type="duration" class="cf-duration"></media-time></span>
            <span class="cf-dock-title" aria-hidden="true"></span>
            <div class="cf-end-controls">
              <button type="button" class="cf-key cf-chapter-trigger" commandfor="${chapterMenuId}"><span class="cf-current-chapter">Chapters</span>${icon('list-video')}</button>
              <button type="button" class="cf-key cf-quality" commandfor="${qualityMenuId}" data-cf-title="quality" title="Quality"><span class="cf-quality-value">Auto</span>${icon('chevron-up', 'cf-rate-chevron')}</button>
              <media-playback-rate-button class="cf-key cf-rate" commandfor="${speedMenuId}"><span class="cf-rate-value" data-part="value">1×</span>${icon('chevron-up', 'cf-rate-chevron')}</media-playback-rate-button>
              ${settings.trigger}
              <media-fullscreen-button class="cf-key cf-fullscreen">${icon('maximize', 'when-windowed')}${icon('minimize', 'when-fullscreen')}</media-fullscreen-button>
            </div>
          </div>
        </div>
        <media-menu id="${speedMenuId}" class="cf-speed-menu" side="top" align="end" boundary="container">
          <media-menu-content class="cf-speed-content">
            <div class="cf-menu-label" aria-hidden="true"><span class="cf-menu-heading" data-cf-text="speed">Playback speed</span><span class="cf-menu-rate">1×</span></div>
            <media-playback-rate-radio-group class="cf-speed-options" rates="0.5 0.75 1 1.25 1.5 2">
              <template>
                <media-menu-radio-item class="cf-speed-option"><span data-part="label"></span><media-menu-item-indicator class="cf-option-check" force-mount aria-hidden="true">✓</media-menu-item-indicator></media-menu-radio-item>
              </template>
            </media-playback-rate-radio-group>
          </media-menu-content>
        </media-menu>
        <media-menu id="${qualityMenuId}" class="cf-speed-menu cf-quality-menu" side="top" align="end" boundary="container">
          <media-menu-content class="cf-speed-content">
            <div class="cf-menu-label"><span data-cf-text="quality">Quality</span><span class="cf-quality-active" aria-hidden="true"></span></div>
            <media-quality-radio-group class="cf-speed-options cf-quality-options">
              <template><media-menu-radio-item class="cf-speed-option cf-quality-option"><span data-part="label"></span><span class="cf-quality-auto-label">Auto</span><media-menu-item-indicator class="cf-option-check" force-mount aria-hidden="true">✓</media-menu-item-indicator></media-menu-radio-item></template>
            </media-quality-radio-group>
          </media-menu-content>
        </media-menu>
        <media-menu id="${chapterMenuId}" class="cf-speed-menu cf-chapter-menu" side="top" align="end" boundary="container"><media-menu-content class="cf-speed-content"><div class="cf-menu-label" data-cf-text="chapters">Chapters</div><div class="cf-chapter-list"></div></media-menu-content></media-menu>
        ${settings.menu}
        ${settings.delegates}
        <google-cast></google-cast>
        <media-hotkey keys="Space" action="togglePaused"></media-hotkey>
        <media-hotkey keys="m" action="toggleMuted"></media-hotkey>
        <media-hotkey keys="f" action="toggleFullscreen"></media-hotkey>
        <media-hotkey keys="p" action="togglePictureInPicture"></media-hotkey>
        <media-hotkey keys="ArrowLeft" action="seekStep" value="-5"></media-hotkey>
        <media-hotkey keys="ArrowRight" action="seekStep" value="5"></media-hotkey>
        <media-hotkey keys="ArrowUp" action="volumeStep" value="0.05"></media-hotkey>
        <media-hotkey keys="ArrowDown" action="volumeStep" value="-0.05"></media-hotkey>
        <media-gesture type="tap" action="togglePaused"></media-gesture>
        <media-gesture type="doubletap" action="seekStep" value="-5" region="left" pointer="touch"></media-gesture>
        <media-gesture type="doubletap" action="seekStep" value="5" region="right" pointer="touch"></media-gesture>
        <media-status-announcer class="cf-visually-hidden"></media-status-announcer>
        <media-error-dialog><media-dialog-popup class="cf-error"><media-dialog-title></media-dialog-title><media-dialog-description></media-dialog-description><media-dialog-close class="cf-error-close"><span data-cf-text="close">Close</span></media-dialog-close></media-dialog-popup></media-error-dialog>
      </media-container>
    </video-player>
    </media-i18n>`;

  const surface = mount.querySelector('.cutframe');
  renderSkinIcons(surface);
  if (keyboardTarget === 'document') {
    surface.querySelectorAll('media-hotkey:is([keys="Space"], [keys="ArrowLeft"], [keys="ArrowRight"])').forEach(hotkey => hotkey.setAttribute('target', 'document'));
  }
  const provider = mount.querySelector('video-player');
  const video = mount.querySelector('.cf-video');
  provider.setAttribute('content-title', title);
  surface.querySelector('[data-film-title]').textContent = title.toUpperCase();
  surface.querySelector('[data-film-subtitle]').textContent = subtitle;
  surface.querySelector('.cf-dock-title').textContent = title.toUpperCase();
  const languageProvider = mount.querySelector('media-i18n');
  if (language && language !== 'auto') languageProvider.setAttribute('lang', language);
  let syncState = () => {};
  const locale = bindSkinLanguage(surface, () => syncState());
  const autoLabel = bindQualityAutoLabel(surface.querySelector('media-quality-radio-group'), locale.text);
  const posterState = bindPoster(surface, video, { hasPoster: Boolean(poster), keyboardTarget });
  // No fixed resolution list or ceiling; the native group reads source renditions.
  // Override nominal widescreen labels so ultrawide sources retain their real height.
  surface.querySelector('media-quality-radio-group').formatRendition = rendition => qualityLabel(rendition) || locale.text('quality');
  if (castSource) mount.querySelector('google-cast').src = castSource;
  if (poster) {
    // The poster component stays visible through HLS preload until play or seek.
    provider.setAttribute('poster', poster);
    video.poster = poster;
  }
  if (mediaTag === 'hlsjs-video') {
    video.source = { src: source, type: 'application/vnd.apple.mpegurl', preferPlayback: 'mse' };
  } else video.src = source;
  if (chaptersSource) {
    const track = document.createElement('track');
    track.kind = 'chapters';
    track.label = 'Chapters';
    track.src = chaptersSource;
    track.default = true;
    (video.target || video).append(track);
    track.track.mode = 'hidden';
  }
  captionTracks.forEach((caption, index) => {
    const track = document.createElement('track');
    track.id = `cutframe-caption-${instanceCount}-${index}`;
    track.kind = caption.kind === 'captions' ? 'captions' : 'subtitles';
    track.label = caption.label || caption.language || 'Captions';
    track.srclang = caption.language || 'en';
    track.src = caption.src;
    (video.target || video).append(track);
    track.track.mode = 'disabled';
  });
  video.volume = 0.7;
  const lens = bindTimeLens(surface, video, previewSource, locale.text);
  const chapters = bindChapters(surface, provider, lens, locale);
  const controls = bindFullscreenControls(surface, provider);
  const settingsState = bindSettings(surface, provider, locale);
  const volumeLabel = surface.querySelector('.cf-volume-value');
  const castButton = surface.querySelector('.cf-cast');
  const menuRate = surface.querySelector('.cf-menu-rate');
  const qualityState = bindImmediateQuality(surface.querySelector('media-quality-radio-group'), video, locale.text, () => syncState());
  const qualityButton = surface.querySelector('.cf-quality');
  const qualityValue = surface.querySelector('.cf-quality-value');
  syncState = () => {
    const store = provider.store;
    autoLabel.sync();
    controls.sync(store);
    settingsState.sync(store);
    const text = `${Math.round((store.muted ? 0 : store.volume) * 100)}%`;
    if (volumeLabel.textContent !== text) volumeLabel.textContent = text;
    const hint = locale.text(store.remotePlaybackAvailability === 'unavailable' ? 'castUnavailable'
      : store.remotePlaybackAvailability === 'unsupported' ? 'castUnsupported'
      : store.remotePlaybackState === 'connected' ? 'castConnected' : 'cast');
    if (castButton.title !== hint) castButton.title = hint;
    const rate = store.playbackRate || 1;
    lens.setPlaybackRate(rate);
    if (menuRate.textContent !== `${rate}×`) menuRate.textContent = `${rate}×`;
    const activeQuality = surface.querySelector('.cf-quality-active');
    const resolution = qualityState.description(store.activeVideoRendition);
    if (activeQuality.textContent !== resolution) activeQuality.textContent = resolution;
    // Keep Auto compact; full current dimensions remain available inside the menu.
    const selectedQuality = store.videoRenditionList?.find(rendition => rendition.selected);
    const qualityText = selectedQuality ? qualityLabel(selectedQuality) || locale.text('quality') : locale.text('auto');
    if (qualityValue.textContent !== qualityText) qualityValue.textContent = qualityText;
    const qualityDescription = `${locale.text('quality')}: ${qualityText}`;
    if (qualityButton.getAttribute('aria-label') !== qualityDescription) qualityButton.setAttribute('aria-label', qualityDescription);
    chapters.sync(store.chaptersCues, store.currentTime, store.duration);
  };
  const unsubscribe = provider.store.subscribe(syncState);
  syncState();

  const syncAspect = () => {
    if (video.videoWidth && video.videoHeight) surface.style.setProperty('--cf-video-ratio', `${video.videoWidth} / ${video.videoHeight}`);
    syncState();
  };
  video.addEventListener('loadedmetadata', syncAspect);
  video.addEventListener('resize', syncAspect);
  let destroyed = false;

  // The source remains the same element across theme changes, preserving playback and volume.
  return {
    surface, video, lens,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      syncState = () => {};
      video.removeEventListener('loadedmetadata', syncAspect);
      video.removeEventListener('resize', syncAspect);
      lens.destroy();
      controls.destroy();
      settingsState.destroy();
      qualityState.destroy();
      autoLabel.destroy();
      posterState.destroy();
      locale.destroy();
      video.pause();
      languageProvider.remove();
    },
    closeMenus: () => surface.querySelectorAll('media-menu').forEach(menu => menu.close()),
    setLanguage(tag = 'auto') {
      if (tag === 'auto') languageProvider.removeAttribute('lang');
      else languageProvider.setAttribute('lang', tag);
      locale.refresh();
    },
  };
}
