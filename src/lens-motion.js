/** Release ends scrubbing immediately; the frozen lens can then fold away.
 * Reopening cancels the old close so a quick second drag never disappears.
 */
export function createLensPresentation(lens, {
  schedule = setTimeout, cancel = clearTimeout,
  reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches,
} = {}) {
  let timer = null;
  let generation = 0;
  const clear = () => { generation++; if (timer !== null) cancel(timer); timer = null; };
  const hide = () => { lens.hidden = true; delete lens.dataset.state; };
  return {
    open(prepare = () => {}) {
      clear();
      const wasHidden = lens.hidden;
      lens.hidden = false;
      prepare();
      if (wasHidden) {
        // Establish the collapsed cut before transitioning to the open panel.
        lens.getBoundingClientRect();
      }
      lens.dataset.state = 'open';
    },
    close({ immediate = false } = {}) {
      if (immediate || reducedMotion()) { clear(); hide(); return; }
      if (lens.hidden || lens.dataset.state === 'closing') return;
      clear();
      lens.dataset.state = 'closing';
      const closing = generation;
      timer = schedule(() => {
        if (closing !== generation) return;
        timer = null;
        hide();
      }, 200);
    },
    destroy() { clear(); hide(); },
  };
}
