/** A stream's nonzero initial timestamp must not dismiss the cover during preload. */
export function bindPoster(surface, media, { hasPoster, documentTarget = document, keyboardTarget = 'document' }) {
  const events = new AbortController();
  const options = { signal: events.signal };
  const reset = () => { surface.dataset.poster = hasPoster ? 'pending' : 'empty'; };
  const dismiss = () => { surface.dataset.poster = 'dismissed'; };
  reset();
  media.addEventListener('play', dismiss, options);
  media.addEventListener(media.localName === 'video' ? 'loadstart' : 'sourcechange', reset, options);
  surface.querySelector('.cf-timeline').addEventListener('pointerdown', event => {
    if (event.button === 0) dismiss();
  }, options);
  surface.addEventListener('click', event => {
    if (event.target?.closest?.('.cf-chapter-option')) dismiss();
  }, options);
  documentTarget.addEventListener('keydown', event => {
    if (keyboardTarget !== 'document' && !surface.contains(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target?.closest?.('media-menu, input, textarea, select, [contenteditable], .cf-volume')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' ||
        (['Home', 'End'].includes(event.key) && target?.closest?.('.cf-timeline'))) dismiss();
  }, options);
  return { destroy: () => events.abort() };
}
