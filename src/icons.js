import { createElement, Volume2, VolumeX, Maximize, Minimize, ChevronUp, Airplay, Cast, PictureInPicture2, Captions, ListVideo, Settings, Languages, ChevronRight, ArrowLeft } from 'lucide';

const icons = {
  'volume-2': Volume2, 'volume-x': VolumeX, maximize: Maximize, minimize: Minimize,
  'chevron-up': ChevronUp, airplay: Airplay, cast: Cast, 'picture-in-picture-2': PictureInPicture2,
  captions: Captions, 'list-video': ListVideo, settings: Settings, languages: Languages,
  'chevron-right': ChevronRight, 'arrow-left': ArrowLeft,
};

/** Render only this player's icons; never rewrite a host page's icon nodes. */
export function renderSkinIcons(surface) {
  surface.querySelectorAll('[data-lucide]').forEach(placeholder => {
    const definition = icons[placeholder.dataset.lucide];
    if (!definition) return;
    const svg = createElement(definition);
    svg.setAttribute('class', placeholder.className);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    placeholder.replaceWith(svg);
  });
}
