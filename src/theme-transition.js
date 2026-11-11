/** Fade authored page copy through a theme change while keeping the actual video live. */
export function createThemeTransition(apply, getNodes, shouldReduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let revision = 0;
  let running = [];
  const cancel = () => { running.forEach(animation => animation.cancel()); running = []; };
  return async function transition(name, animated = true) {
    const current = ++revision;
    const nodes = getNodes();
    const previous = nodes.map(node => {
      if (typeof getComputedStyle !== 'function') return { opacity: 1, transform: 'translateY(0)' };
      const style = getComputedStyle(node);
      return { opacity: style.opacity, transform: style.transform };
    });
    cancel();
    if (!animated || shouldReduceMotion() || nodes.some(node => typeof node.animate !== 'function')) {
      apply(name);
      return;
    }
    running = nodes.map((node, index) => node.animate([
      previous[index],
      { opacity: 0, transform: 'translateY(-5px)' },
    ], { duration: 120, easing: 'ease-out', fill: 'forwards' }));
    try { await Promise.all(running.map(animation => animation.finished)); }
    catch { return; }
    if (current !== revision) return;
    cancel();
    apply(name);
    running = getNodes().map(node => node.animate([
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }));
    try { await Promise.all(running.map(animation => animation.finished)); }
    catch { return; }
    if (current === revision) cancel();
  };
}
