const pixels = value => Number.isInteger(value) && value > 0;

/** Use the source's actual height, including ultrawide and nonstandard renditions. */
export function qualityLabel(rendition) {
  if (pixels(rendition?.height)) return `${rendition.height}p`;
  const bitrate = rendition?.bitrate;
  if (Number.isFinite(bitrate) && bitrate > 0) {
    return bitrate >= 1e6 ? `${Math.round(bitrate / 1e5) / 10} Mbps` : `${Math.round(bitrate / 1e3)} kbps`;
  }
  return null;
}

export function frameSize(rendition) {
  if (pixels(rendition?.width) && pixels(rendition?.height)) return `${rendition.width} × ${rendition.height}`;
  return qualityLabel(rendition) || '';
}

/** The Auto tile names the selection mode; actual dimensions live in the header.
 * Keep this authored label separate from Video.js's generated Auto (…p) label.
 */
export function bindQualityAutoLabel(group, text) {
  const sync = () => {
    const label = group.querySelector('[data-rendition="auto"] .cf-quality-auto-label');
    const value = text('auto');
    if (label && label.textContent !== value) label.textContent = value;
  };
  // Native options are regenerated on rendition/locale changes, after store sync.
  const observer = new MutationObserver(sync);
  observer.observe(group, { childList: true });
  sync();
  return { sync, destroy: () => observer.disconnect() };
}

/** Manual choices replace the current buffered picture, including when paused.
 * Video.js still owns selection; its hls.js adapter normally uses nextLevel,
 * which preserves the current fragment. Auto keeps that seamless ABR behavior.
 */
export function bindImmediateQuality(group, video, text, refresh) {
  const events = new AbortController();
  const options = { signal: events.signal };
  let destroyed = false;
  let pending = null;
  let failed = false;
  let timeout;
  let stopBufferWatch = () => {};
  const clear = () => { pending = null; clearTimeout(timeout); stopBufferWatch(); stopBufferWatch = () => {}; };
  const decodedMatches = () => pending && video.videoWidth === pending.width && video.videoHeight === pending.height;
  const onDecoded = () => {
    if (decodedMatches()) { clear(); failed = false; }
    refresh();
  };
  group.addEventListener('value-change', event => {
    // Let the native radio group commit its selected rendition first.
    const value = event.detail.value;
    queueMicrotask(() => {
      if (destroyed) return;
      clear(); failed = false;
      const engine = video.engine;
      if (!engine) { refresh(); return; }
      if (value === 'auto') { engine.loadLevel = -1; refresh(); return; }
      // Rendition IDs are the adapter's actual manifest level indexes.
      const level = engine.levels.findIndex((_, index) => String(index) === value);
      if (level < 0) return;
      const target = engine.levels[level];
      if (video.videoWidth !== target.width || video.videoHeight !== target.height) {
        pending = target;
        // Keep listening after a slow-network timeout: a late fragment can
        // still finish the switch and clear this message.
        timeout = setTimeout(() => { failed = true; refresh(); }, 20000);
        // A paused <video> can retain its old decoded picture after its buffer
        // was replaced. Seek to the same timestamp once that fragment arrives;
        // this decodes the new picture without starting playback or moving time.
        const buffered = (_event, data) => {
          const frag = data.frag;
          if (!video.paused || frag.type !== 'main' || frag.level !== level) return;
          const time = video.currentTime;
          if (time < frag.start || time >= frag.start + frag.duration) return;
          stopBufferWatch();
          video.currentTime = time;
        };
        engine.on?.('hlsFragBuffered', buffered);
        stopBufferWatch = () => engine.off?.('hlsFragBuffered', buffered);
      }
      engine.currentLevel = level;
      refresh();
    });
  }, options);
  video.addEventListener('resize', onDecoded, options);
  video.addEventListener('loadeddata', onDecoded, options);
  video.addEventListener('sourcechange', () => { clear(); failed = false; refresh(); }, options);
  video.addEventListener('error', () => { failed = Boolean(pending); clear(); refresh(); }, options);
  return {
    destroy() { destroyed = true; events.abort(); clear(); },
    description(active) {
      if (decodedMatches()) { clear(); failed = false; }
      const actual = frameSize({ width: video.videoWidth, height: video.videoHeight }) || frameSize(active);
      if (pending && !failed) return `${text('switchingTo')} ${qualityLabel(pending)}`;
      return failed ? `${text('switchFailed')} · ${actual}` : actual;
    },
  };
}
