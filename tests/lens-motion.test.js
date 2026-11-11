import test from 'node:test';
import assert from 'node:assert/strict';
import { createLensPresentation } from '../src/lens-motion.js';

function setup(reduced = false) {
  const lens = { hidden: true, dataset: {}, getBoundingClientRect() {} };
  const tasks = new Map();
  let id = 0;
  const motion = createLensPresentation(lens, {
    schedule(callback) { tasks.set(++id, callback); return id; },
    cancel(key) { tasks.delete(key); }, reducedMotion: () => reduced,
  });
  return { lens, motion, tasks };
}

test('release keeps the frozen lens available until the fold finishes', () => {
  const { lens, motion, tasks } = setup();
  motion.open();
  motion.close();
  assert.equal(lens.hidden, false);
  assert.equal(lens.dataset.state, 'closing');
  [...tasks.values()][0]();
  assert.equal(lens.hidden, true);
});

test('a quick second drag survives the previous close callback', () => {
  const { lens, motion, tasks } = setup();
  motion.open();
  motion.close();
  const stale = [...tasks.values()][0];
  motion.open();
  stale();
  assert.equal(lens.hidden, false);
  assert.equal(lens.dataset.state, 'open');
  assert.equal(tasks.size, 0);
});

test('reduced motion, explicit cancellation and disposal hide without waiting', () => {
  for (const mode of ['reduced', 'immediate', 'destroy']) {
    const { lens, motion, tasks } = setup(mode === 'reduced');
    motion.open();
    if (mode === 'destroy') { motion.close(); motion.destroy(); }
    else motion.close({ immediate: mode === 'immediate' });
    assert.equal(lens.hidden, true);
    assert.equal(tasks.size, 0);
  }
});
