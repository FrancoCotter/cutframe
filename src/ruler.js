import { clamp, formatTime } from './time.js';

/** Fixed viewing-time scale: faster playback shows more SOURCE seconds in the lens. */
export function rulerMetrics(time, duration, rate, width) {
  const playbackRate = Number.isFinite(rate) && rate > 0 ? clamp(rate, .25, 4) : 1;
  const pixelsPerSecond = 32 / playbackRate;
  const labelStep = [1, 2, 5, 10, 20].find(step => step * pixelsPerSecond >= 42) || 20;
  const validDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const centerTime = clamp(Number.isFinite(time) ? time : 0, 0, validDuration);
  const halfWindow = width / (2 * pixelsPerSecond);
  const firstQuarter = Math.max(0, Math.ceil((centerTime - halfWindow) * 4));
  const lastQuarter = Math.min(Math.floor(validDuration * 4), Math.floor((centerTime + halfWindow) * 4));
  const ticks = [];
  for (let quarter = firstQuarter; quarter <= lastQuarter; quarter++) {
    const tickTime = quarter / 4;
    const x = width / 2 + (tickTime - centerTime) * pixelsPerSecond;
    const major = quarter % 4 === 0;
    const label = major && tickTime % labelStep === 0
      ? formatTime(tickTime) : '';
    ticks.push({ time: tickTime, x, major, label });
  }
  return { pixelsPerSecond, playbackRate, centerTime, ticks };
}

export function formatPreciseTime(time) {
  const safe = Number.isFinite(time) ? Math.max(0, time) : 0;
  const tenths = Math.floor(safe * 10 + 1e-6);
  return `${formatTime(Math.floor(tenths / 10))}.${tenths % 10}`;
}

export function createTimeRuler(element) {
  const rail = document.createElement('div');
  rail.className = 'cf-ruler-rail';
  const cursor = document.createElement('span');
  cursor.className = 'cf-ruler-cursor';
  element.replaceChildren(rail, cursor);
  let rate = 1;
  let currentTime = 0;
  let duration = 0;
  let geometry = '';

  function render() {
    const width = element.clientWidth || 174;
    const metrics = rulerMetrics(currentTime, duration, rate, width);
    // Ticks retain their nodes while dragging within the same window. Only the rail moves.
    const key = `${metrics.ticks[0]?.time}:${metrics.ticks.at(-1)?.time}:${metrics.pixelsPerSecond}:${width}`;
    if (key !== geometry) {
      geometry = key;
      const nodes = metrics.ticks.map(tick => {
        const mark = document.createElement('span');
        mark.className = `cf-ruler-tick${tick.major ? ' is-major' : ''}`;
        mark.style.left = `${tick.time * metrics.pixelsPerSecond}px`;
        mark.dataset.time = String(tick.time);
        if (tick.label) {
          const label = document.createElement('span');
          label.className = 'cf-ruler-label';
          label.textContent = tick.label;
          mark.append(label);
        }
        return mark;
      });
      rail.replaceChildren(...nodes);
    }
    rail.style.transform = `translateX(${width / 2 - metrics.centerTime * metrics.pixelsPerSecond}px)`;
    element.dataset.pixelsPerSecond = String(metrics.pixelsPerSecond);
    element.dataset.playbackRate = String(metrics.playbackRate);
  }

  return {
    update(time, sourceDuration) { currentTime = time; duration = sourceDuration; render(); },
    setRate(value) {
      if (value === rate) return;
      rate = value;
      geometry = '';
      render();
    },
  };
}
