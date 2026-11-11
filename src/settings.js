const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;

export function settingsMarkup(instance) {
  const id = `cutframe-settings-${instance}`;
  const languages = `${id}-languages`;
  return {
    trigger: `<button type="button" class="cf-key cf-settings" commandfor="${id}" data-cf-label="settings" data-cf-title="settings" aria-label="Settings" title="Settings">${icon('settings')}</button>`,
    menu: `<media-menu id="${id}" class="cf-speed-menu cf-settings-menu" side="top" align="end" boundary="container">
      <media-menu-content class="cf-speed-content cf-settings-content cf-settings-root">
        <div class="cf-menu-label" data-cf-text="settings">Settings</div>
        <media-menu-checkbox-item class="cf-settings-row cf-caption-switch">
          ${icon('captions')}<span data-cf-text="settingsCaption">Caption</span>
          <span class="cf-switch" aria-hidden="true"><i></i></span>
        </media-menu-checkbox-item>
        <media-menu-item class="cf-settings-row cf-caption-language-trigger" commandfor="${languages}">
          ${icon('languages')}<span data-cf-text="settingsLanguage">Language</span>
          <span class="cf-setting-hint"><span class="cf-caption-language-value"></span>${icon('chevron-right')}</span>
        </media-menu-item>
        <div class="cf-settings-divider" role="separator"></div>
        <media-menu-item class="cf-settings-row" data-cf-action="pip">${icon('picture-in-picture-2')}<span data-cf-text="pip">Picture in picture</span></media-menu-item>
        <media-menu-item class="cf-settings-row" data-cf-action="airplay">${icon('airplay')}<span data-cf-text="airplay">Play with AirPlay</span></media-menu-item>
        <media-menu-item class="cf-settings-row" data-cf-action="cast">${icon('cast')}<span data-cf-text="cast">Cast to Chromecast</span></media-menu-item>
      </media-menu-content>
      <media-menu-content id="${languages}" class="cf-speed-content cf-settings-content">
        <media-menu-item class="cf-settings-row cf-settings-back" data-cf-label="backToSettings" aria-label="Back to settings">${icon('arrow-left')}<span data-cf-text="settingsLanguage">Language</span></media-menu-item>
        <media-menu-radio-group class="cf-speed-options cf-caption-options" data-cf-label="captionLanguage" aria-label="Caption language"></media-menu-radio-group>
      </media-menu-content>
    </media-menu>`,
    // Native buttons retain platform checks and actions; menu items delegate to them.
    delegates: `<div class="cf-action-delegates" hidden>
      <media-pip-button class="cf-pip" data-cf-title="pip"></media-pip-button>
      <media-airplay-button class="cf-airplay" data-cf-title="airplay"></media-airplay-button>
      <media-cast-button class="cf-cast"></media-cast-button>
    </div>`,
  };
}

export function captionChoices(tracks = []) {
  return tracks.filter(track => track.kind === 'captions' || track.kind === 'subtitles');
}

export function bindSettings(surface, provider, locale) {
  const toggle = surface.querySelector('.cf-caption-switch');
  const languageLabel = surface.querySelector('.cf-caption-language-value');
  const languageTrigger = surface.querySelector('.cf-caption-language-trigger');
  const group = surface.querySelector('.cf-caption-options');
  const delegates = surface.querySelector('.cf-action-delegates');
  const root = surface.querySelector('.cf-settings-root');
  const menu = surface.querySelector('.cf-settings-menu');
  let signature = '';
  let rememberedLanguage;
  let choices = [];

  toggle.addEventListener('checked-change', event => {
    toggle.checked = provider.store.toggleSubtitles(event.detail.checked);
  });
  group.addEventListener('value-change', event => {
    const id = event.detail.value;
    if (id === 'off') {
      provider.store.selectSubtitlesTrack(null);
      toggle.checked = false;
      return;
    }
    if (!choices.some(track => track.id === id)) return;
    rememberedLanguage = id;
    provider.store.selectSubtitlesTrack(id);
  });

  const actions = ['pip', 'airplay', 'cast'].map(name => {
    const button = delegates.querySelector(`.cf-${name}`);
    const item = root.querySelector(`[data-cf-action="${name}"]`);
    item.addEventListener('select', () => button.click());
    return { button, item };
  });
  const syncActions = () => {
    let count = 0;
    for (const { button, item } of actions) {
      item.hidden = button.hidden;
      const disabled = button.getAttribute('aria-disabled') === 'true';
      item.disabled = disabled;
      if (disabled) item.setAttribute('aria-disabled', 'true');
      else item.removeAttribute('aria-disabled');
      const label = button.getAttribute('aria-label');
      if (label) item.setAttribute('aria-label', label);
      item.title = button.title || label || '';
      item.toggleAttribute('data-active', button.hasAttribute('data-pip') || button.getAttribute('data-cast-state') === 'connected' || button.getAttribute('data-airplay-state') === 'connected');
      if (!button.hidden) count++;
    }
    root.querySelector('.cf-settings-divider').hidden = count === 0;
    menu.popup?.sync();
  };
  const observer = new MutationObserver(syncActions);
  observer.observe(delegates, { subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-disabled', 'aria-label', 'title', 'data-pip', 'data-cast-state', 'data-airplay-state'] });
  syncActions();

  return {
    sync(store) {
      choices = captionChoices(store.textTrackList);
      surface.toggleAttribute('data-has-captions', choices.length > 0);
      // Match the native menu's keyboard visibility checks without setting its
      // trigger's initial `hidden` state, which the menu caches on connection.
      languageTrigger.toggleAttribute('data-hidden', choices.length === 0);
      toggle.disabled = choices.length === 0;
      toggle.checked = Boolean(store.subtitlesShowing);
      const captionTitle = choices.length ? '' : locale.text('unavailable');
      if (toggle.title !== captionTitle) toggle.title = captionTitle;
      const nextSignature = JSON.stringify([locale.text('off'), ...choices.map(track => [track.id, track.label, track.language])]);
      if (nextSignature !== signature) {
        signature = nextSignature;
        group.replaceChildren(...[{ id: 'off', label: locale.text('off') }, ...choices].map(track => {
          const item = document.createElement('media-menu-radio-item');
          item.value = track.id;
          item.className = 'cf-speed-option cf-caption-option';
          const label = document.createElement('span');
          label.textContent = track.label || track.language || locale.text('captions');
          const check = document.createElement('media-menu-item-indicator');
          check.className = 'cf-option-check';
          check.setAttribute('force-mount', '');
          check.textContent = '✓';
          item.append(label, check);
          return item;
        }));
      }
      const browserLanguage = navigator.language.split('-')[0];
      const selected = choices.find(track => track.mode === 'showing') || choices.find(track => track.id === rememberedLanguage)
        || choices.find(track => track.language?.split('-')[0] === browserLanguage) || choices[0];
      if (selected) {
        rememberedLanguage = selected.id;
        const value = store.subtitlesShowing ? selected.id : 'off';
        if (group.value !== value) group.value = value;
        const name = store.subtitlesShowing ? selected.label || selected.language || locale.text('captions') : locale.text('off');
        if (languageLabel.textContent !== name) languageLabel.textContent = name;
      } else {
        if (group.value !== 'off') group.value = 'off';
        if (languageLabel.textContent) languageLabel.textContent = '';
      }
    },
    destroy() { observer.disconnect(); },
  };
}
