import { clamp } from './time.js';
import { createTimeRuler, formatPreciseTime } from './ruler.js';
import { createLensPresentation } from './lens-motion.js';
export { clamp, formatTime } from './time.js';

export function timeAtPosition(clientX, left, width, duration) {
  if (!Number.isFinite(duration) || duration <= 0 || width <= 0) return 0;
  return clamp((clientX - left) / width, 0, 1) * duration;
}

export function lensPosition(ratio, width, lensWidth) {
  const half = Math.min(lensWidth, width) / 2;
  return clamp(ratio * width, half, Math.max(half, width - half));
}

/** Serialize decoder seeks. A newer request supersedes any older frame in flight. */
export function createFrameQueue(decoder, onFrame, onError = () => {}, {
  schedule = setTimeout, cancel = clearTimeout, timeout = 4000,
} = {}) {
  let desired = null;
  let busy = false;
  let destroyed = false;
  let timer = null;

  function clearTimer() { if (timer !== null) cancel(timer); timer = null; }
  function bound(time) {
    return Number.isFinite(decoder.duration) && decoder.duration > 0
      ? clamp(time, 0, Math.max(0, decoder.duration - 0.04)) : Math.max(0, time);
  }
  function deliver() {
    if (destroyed || desired === null || decoder.readyState < 2 || decoder.seeking) return false;
    // Allow a single source-frame rounding step; never paint an obsolete seek.
    if (Math.abs(decoder.currentTime - desired) > .075) return false;
    const time = desired;
    desired = null;
    busy = false;
    clearTimer();
    onFrame(decoder, time);
    return true;
  }
  function watch() {
    if (timer !== null) return;
    timer = schedule(() => {
      timer = null;
      busy = false;
      if (!destroyed && desired !== null && !deliver()) failed(new Error('Frame preview timed out'));
    }, timeout);
    timer?.unref?.();
  }

  function pump() {
    if (destroyed || desired === null) return;
    watch();
    desired = bound(desired);
    if (busy || decoder.readyState < 1) return;
    if (deliver()) return;
    // HAVE_METADATA is sufficient to seek. Waiting for HAVE_CURRENT_DATA first
    // deadlocks paused streaming decoders that only fetch the requested range.
    busy = true;
    try { decoder.currentTime = desired; }
    catch (error) { failed(error); }
  }

  function settled() {
    busy = false;
    clearTimer();
    if (destroyed || desired === null) return;
    if (!deliver()) pump();
  }

  function available() {
    if (busy && !decoder.seeking && decoder.readyState >= 2) settled();
    else pump();
  }
  function failed(reason) {
    if (destroyed) return;
    busy = false;
    desired = null;
    clearTimer();
    onError(decoder.error || (reason instanceof Error ? reason : new Error('Preview unavailable')));
  }
  decoder.addEventListener('seeked', settled);
  decoder.addEventListener('loadedmetadata', pump);
  decoder.addEventListener('loadeddata', available);
  decoder.addEventListener('canplay', available);
  decoder.addEventListener('error', failed);
  return {
    request(time) {
      if (destroyed || !Number.isFinite(time)) return;
      desired = bound(time);
      pump();
    },
    cancel() { desired = null; busy = false; clearTimer(); },
    destroy() {
      destroyed = true;
      desired = null;
      clearTimer();
      decoder.removeEventListener('seeked', settled);
      decoder.removeEventListener('loadedmetadata', pump);
      decoder.removeEventListener('loadeddata', available);
      decoder.removeEventListener('canplay', available);
      decoder.removeEventListener('error', failed);
    },
  };
}

export function bindTimeLens(surface, video, source, text = key => key) {
  const slider = surface.querySelector('.cf-timeline');
  const lens = surface.querySelector('.cf-lens');
  const canvas = lens.querySelector('canvas');
  const image = lens.querySelector('.cf-lens-image');
  const ctx = canvas.getContext('2d');
  const timeLabel = lens.querySelector('.cf-lens-time');
  const waiting = lens.querySelector('.cf-lens-wait');
  const ruler = createTimeRuler(lens.querySelector('.cf-lens-ruler'));
  const chapterLabel = lens.querySelector('.cf-lens-chapter');
  const tether = lens.querySelector('.cf-lens-tether path');
  const presentation = createLensPresentation(lens);
  let chapters = [];
  const showChapter = () => {
    const chapter = chapters.find((cue, i) => requestedTime >= cue.start && (requestedTime < cue.end || (i === chapters.length - 1 && requestedTime === cue.end)));
    chapterLabel.textContent = chapter?.title || '';
    chapterLabel.hidden = !chapter?.title;
  };

  // Keep the second decoder OUTSIDE video-player: it must not become its media source.
  const decoder = document.createElement(/\.m3u8(?:$|[?#])/i.test(source) ? 'hlsjs-video' : 'video');
  decoder.crossOrigin = 'anonymous';
  decoder.muted = true;
  decoder.playsInline = true;
  decoder.preload = 'auto';
  // Some browsers suppress frame production on display:none media. Keep a tiny
  // layout box outside the viewport, outside the player's media-discovery tree.
  Object.assign(decoder.style, { position: 'fixed', left: '-10000px', top: '0', width: '2px', height: '2px', opacity: '0', pointerEvents: 'none' });
  decoder.tabIndex = -1;
  decoder.setAttribute('aria-hidden', 'true');
  decoder.src = source;
  document.body.append(decoder);

  let active = false;
  let requestedTime = 0;
  let pointerId = null;
  let error = false;
  const queue = createFrameQueue(decoder, (frame, time) => {
    if (!active) return;
    try {
      const ratio = frame.videoWidth / frame.videoHeight;
      canvas.width = 320;
      canvas.height = Math.round(320 / ratio);
      ctx.drawImage(frame.target || frame, 0, 0, canvas.width, canvas.height);
      canvas.dataset.time = String(time);
      canvas.dataset.frameTime = String(frame.currentTime);
      timeLabel.textContent = formatPreciseTime(time);
      lens.dataset.loading = 'false';
    } catch { failed(); }
  }, failed);

  function failed() {
    error = true;
    waiting.dataset.cfText = 'previewUnavailable';
    waiting.textContent = text('previewUnavailable');
    lens.dataset.loading = 'true';
  }

  function locate(time) {
    requestedTime = clamp(time, 0, video.duration || 0);
    showChapter();
    const rect = slider.getBoundingClientRect();
    // Reserve room for the full readout on short, ultrawide mobile players.
    // Limit the image only; the time, chapter and ruler remain readable.
    if (image) {
      const available = rect.top + rect.height / 2 - surface.getBoundingClientRect().top - 8;
      const readoutHeight = lens.getBoundingClientRect().height - image.getBoundingClientRect().height;
      const limit = `${Math.max(0, available - readoutHeight)}px`;
      if (lens.style.getPropertyValue('--cf-lens-image-limit') !== limit) lens.style.setProperty('--cf-lens-image-limit', limit);
    }
    const ratio = video.duration ? requestedTime / video.duration : 0;
    const width = lens.offsetWidth;
    const center = lensPosition(ratio, rect.width, width);
    const anchor = clamp(ratio * rect.width - center + width / 2, 0, width);
    lens.style.left = `${center}px`;
    lens.style.setProperty('--cf-lens-anchor', `${anchor}px`);
    // Keep the ruler centered; at either end a short diagonal returns to the
    // actual seek point rather than letting the card escape the player.
    tether?.setAttribute('d', `M ${width / 2} 0 L ${width / 2} 5 L ${anchor} 18`);
    timeLabel.textContent = formatPreciseTime(requestedTime);
    lens.dataset.requestedTime = String(requestedTime);
    if (!error) queue.request(requestedTime);
    ruler.update(requestedTime, video.duration || 0);
  }

  function start(event) {
    if (active || event.button !== 0 || event.isPrimary === false || !Number.isFinite(video.duration) || video.duration <= 0) return;
    pointerId = event.pointerId;
    active = true;
    error = false;
    waiting.dataset.cfText = 'locating';
    waiting.textContent = text('locating');
    if (decoder.error) decoder.load?.();
    lens.dataset.loading = 'true';
    surface.dataset.scrubbing = 'true';
    presentation.open(() => move(event));
  }
  function move(event) {
    if (!active || event.pointerId !== pointerId) return;
    const rect = slider.getBoundingClientRect();
    locate(timeAtPosition(event.clientX, rect.left, rect.width, video.duration));
  }
  function stop({ immediate = true } = {}) {
    active = false;
    pointerId = null;
    presentation.close({ immediate });
    delete surface.dataset.scrubbing;
    queue.cancel();
  }
  function release(event) {
    if (!active || (event.pointerId !== undefined && event.pointerId !== pointerId)) return;
    stop({ immediate: false });
  }

  const events = new AbortController();
  const options = { signal: events.signal };
  slider.addEventListener('pointerdown', start, options);
  window.addEventListener('pointermove', move, options);
  window.addEventListener('pointerup', release, options);
  window.addEventListener('pointercancel', release, options);
  slider.addEventListener('lostpointercapture', release, options);
  slider.addEventListener('drag-end', release, options);
  window.addEventListener('blur', () => stop(), options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, options);
  surface.addEventListener('keydown', (event) => { if (event.key === 'Escape') stop(); }, options);
  const resize = new ResizeObserver(() => { if (active) locate(requestedTime); });
  resize.observe(slider);
  return {
    stop, decoder,
    destroy() {
      stop();
      events.abort();
      resize.disconnect();
      presentation.destroy();
      queue.destroy();
      decoder.pause();
      decoder.removeAttribute('src');
      decoder.load();
      decoder.remove();
    },
    setChapters(cues) { chapters = cues; if (active) showChapter(); },
    setPlaybackRate(rate) {
      ruler.setRate(rate);
      lens.dataset.playbackRate = String(rate);
    },
  };
}
