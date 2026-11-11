import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaletteMotion, interpolatePalette } from '../src/palette-motion.js';
import { resolveHostTheme } from '../src/theme-policy.js';
import { contrast, parseColor } from '../src/palette.js';

const base = { background: '#111111', surface: '#111111', foreground: '#ffffff', muted: '#ffffff', accent: '#ffffff', accentForeground: '#000000', sources: {} };
const palette = surface => resolveHostTheme(base, { surface });
const check = colors => {
  for (const [a, b, minimum] of [['foreground', 'surface', 4.5], ['muted', 'surface', 4.5], ['accent', 'surface', 3], ['accentForeground', 'accent', 4.5]]) {
    assert.ok(contrast(parseColor(colors[a]), parseColor(colors[b])) >= minimum, `${a}/${b}: ${colors[a]}/${colors[b]}`);
  }
};
function fixture(options = {}, extra = {}) {
  let time = 0, id = 0;
  const queued = new Map(), writes = [];
  const motion = createPaletteMotion(value => writes.push(value), options, {
    now: () => time, requestFrame: callback => { const next = id++; queued.set(next, callback); return next; },
    cancelFrame: key => queued.delete(key), ...extra,
  });
  return { motion, queued, writes, step(value) { time = value; const jobs = [...queued.values()]; queued.clear(); jobs.forEach(callback => callback(time)); } };
}

test('all rounded intermediate palettes stay readable, including black/white polarity changes', () => {
  for (const [a, b] of [['#000000', '#ffffff'], ['#ffffff', '#000000'], ['#281e44', '#e6b399'], ['#ff0000', '#0000ff'], ['#546d84', '#7f8695']]) {
    const from = palette(a), to = palette(b);
    let previous = from;
    for (let i = 0; i <= 200; i++) { previous = interpolatePalette(from, to, i / 200, previous); check(previous); }
    assert.equal(previous.surface, b);
  }
});
test('finite RAF transitions produce intermediate colors and leave no idle requests', () => {
  const { motion, queued, writes, step } = fixture();
  motion.to(palette('#111111'));
  assert.equal(queued.size, 0);
  motion.to(palette('#dddddd'));
  assert.equal(queued.size, 1);
  step(500);
  assert.notEqual(writes.at(-1).surface, '#111111');
  assert.notEqual(writes.at(-1).surface, '#dddddd');
  step(1000);
  assert.equal(writes.at(-1).surface, '#dddddd');
  assert.equal(queued.size, 0);
  assert.equal(motion.stats.running, false);
  const count = writes.length;
  step(5000);
  assert.equal(writes.length, count);
});
test('identical targets do not restart animation; retargeting starts at the rendered color', () => {
  const { motion, queued, step } = fixture();
  motion.to(palette('#111111')); motion.to(palette('#eeeeee')); step(400);
  const visible = motion.current;
  motion.to(palette('#eeeeee'));
  assert.equal(motion.stats.transitions, 1);
  motion.to(palette('#224466'));
  assert.deepEqual(motion.current, visible);
  assert.equal(queued.size, 1);
  step(400);
  assert.deepEqual(motion.current, visible);
  step(1400);
  assert.equal(motion.current.surface, '#224466');
});
test('reduced motion, hidden/offscreen state, explicit finish and destroy stop scheduling', () => {
  let visible = true;
  const { motion, queued, step } = fixture({}, { canAnimate: () => visible });
  motion.to(palette('#111111')); motion.to(palette('#eeeeee'));
  visible = false; step(100);
  assert.equal(motion.current.surface, '#eeeeee'); assert.equal(queued.size, 0);
  motion.to(palette('#224466')); assert.equal(queued.size, 0);
  visible = true; motion.to(palette('#dddddd')); motion.finish(); assert.equal(queued.size, 0);
  motion.to(palette('#111111')); motion.destroy(); assert.equal(queued.size, 0);
});
test('duration and FPS settings cap writes and can change without a visible jump', () => {
  const { motion, writes, step } = fixture({ duration: 1000, maxFps: 30 });
  motion.to(palette('#111111')); motion.to(palette('#eeeeee'));
  for (let i = 0; i <= 120; i++) step(i * 1000 / 120);
  assert.ok(writes.length <= 34, writes.length);
  motion.to(palette('#224466')); step(1250);
  const current = motion.current;
  motion.configure({ duration: 1600 });
  assert.deepEqual(motion.current, current);
  motion.configure({ duration: 0 });
  assert.equal(motion.current.surface, '#224466');
  assert.equal(motion.stats.running, false);
});
