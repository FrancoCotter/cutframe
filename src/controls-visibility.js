/** Add a short presentation grace period to Video.js's native 2-second idle delay. */
export function createControlsPresentation(onVisible, {
  delay = 1000, schedule = setTimeout, cancel = clearTimeout,
} = {}) {
  let timer = null;
  let visible = true;
  let shouldShow = true;
  let destroyed = false;
  const clear = () => { if (timer !== null) cancel(timer); timer = null; };
  const show = next => {
    if (visible === next) return;
    visible = next;
    onVisible(next);
  };
  return {
    sync({ fullscreen, paused, controlsVisible }) {
      if (destroyed) return;
      shouldShow = !fullscreen || paused || controlsVisible;
      if (shouldShow) { clear(); show(true); }
      else if (visible && timer === null) {
        timer = schedule(() => {
          timer = null;
          if (!destroyed && !shouldShow) show(false);
        }, delay);
      }
    },
    destroy() { destroyed = true; clear(); },
  };
}

export function bindFullscreenControls(surface, provider) {
  const dock = surface.querySelector('.cf-dock');
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const dockSize = new ResizeObserver(() => {
    surface.style.setProperty('--cf-dock-height', `${dock.offsetHeight + 32}px`);
  });
  dockSize.observe(dock);
  const locks = new Map();
  let fullscreen = false;
  const presentation = createControlsPresentation(visible => {
    surface.toggleAttribute('data-controls-hidden', !visible);
    // Keyboard activity reveals the dock before the browser processes Tab.
    dock.inert = !visible;
  });

  function lock(reason, held) {
    if (held && !locks.has(reason)) {
      locks.set(reason, provider.store.requestControlsLock());
    } else if (!held && locks.has(reason)) {
      const release = locks.get(reason);
      locks.delete(reason);
      release();
    }
  }
  function syncFocus() {
    const active = document.activeElement;
    lock('keyboard', fullscreen && active !== surface && surface.contains(active) && active.matches(':focus-visible'));
  }
  dock.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') lock('hover', fullscreen);
  }, options);
  dock.addEventListener('pointerleave', () => lock('hover', false), options);
  surface.addEventListener('focusin', () => queueMicrotask(syncFocus), options);
  surface.addEventListener('focusout', () => queueMicrotask(syncFocus), options);
  document.addEventListener('keydown', () => {
    if (!fullscreen) return;
    provider.store.toggleControls(true);
    queueMicrotask(syncFocus);
  }, { ...options, capture: true });
  window.addEventListener('blur', () => {
    for (const reason of [...locks.keys()]) lock(reason, false);
  }, options);

  return {
    sync(store) {
      const nextFullscreen = Boolean(store.isFullscreen);
      const entered = nextFullscreen && !fullscreen;
      fullscreen = nextFullscreen;
      surface.toggleAttribute('data-fullscreen', fullscreen);
      surface.toggleAttribute('data-paused', store.paused !== false);
      if (entered) {
        // Start a fresh activity interval even if the inline player was idle.
        store.toggleControls(true);
        queueMicrotask(syncFocus);
      }
      if (!fullscreen) for (const reason of [...locks.keys()]) lock(reason, false);
      presentation.sync({ fullscreen, paused: store.paused !== false, controlsVisible: store.controlsVisible !== false });
    },
    destroy() {
      fullscreen = false;
      abort.abort();
      dockSize.disconnect();
      presentation.destroy();
      for (const reason of [...locks.keys()]) lock(reason, false);
      dock.inert = false;
      surface.removeAttribute('data-controls-hidden');
    },
  };
}
