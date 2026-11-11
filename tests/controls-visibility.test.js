import test from 'node:test';
import assert from 'node:assert/strict';
import { createControlsPresentation } from '../src/controls-visibility.js';

function setup() {
  const tasks = new Map();
  const changes = [];
  let id = 0;
  const presentation = createControlsPresentation(visible => changes.push(visible), {
    schedule(fn, delay) { assert.equal(delay, 1000); tasks.set(++id, fn); return id; },
    cancel(key) { tasks.delete(key); },
  });
  return { presentation, changes, tasks, finish() { for (const [key, fn] of [...tasks]) { tasks.delete(key); fn(); } } };
}
const idle = { fullscreen: true, paused: false, controlsVisible: false };

test('inline controls remain visible even when native activity detection is idle', () => {
  const f = setup();
  f.presentation.sync({ ...idle, fullscreen: false });
  assert.equal(f.tasks.size, 0);
  assert.deepEqual(f.changes, []);
});

test('fullscreen idle hides after the grace period without playback updates postponing it', () => {
  const f = setup();
  f.presentation.sync(idle);
  const first = [...f.tasks.keys()];
  f.presentation.sync(idle);
  f.presentation.sync(idle);
  assert.deepEqual([...f.tasks.keys()], first);
  assert.deepEqual(f.changes, []);
  f.finish();
  assert.deepEqual(f.changes, [false]);
});

test('activity and native menu/drag locks cancel a pending hide and reveal immediately', () => {
  const f = setup();
  f.presentation.sync(idle);
  f.presentation.sync({ ...idle, controlsVisible: true });
  assert.equal(f.tasks.size, 0);
  f.presentation.sync(idle);
  f.finish();
  f.presentation.sync({ ...idle, controlsVisible: true });
  assert.deepEqual(f.changes, [false, true]);
});

test('pausing or leaving fullscreen reveals hidden controls and clears pending work', () => {
  for (const state of [{ ...idle, paused: true }, { ...idle, fullscreen: false }]) {
    const f = setup();
    f.presentation.sync(idle);
    f.finish();
    f.presentation.sync(state);
    assert.deepEqual(f.changes, [false, true]);
    assert.equal(f.tasks.size, 0);
  }
});

test('a stale idle callback cannot hide controls after renewed activity or disposal', () => {
  const f = setup();
  f.presentation.sync(idle);
  const stale = [...f.tasks.values()][0];
  f.presentation.sync({ ...idle, controlsVisible: true });
  stale();
  assert.deepEqual(f.changes, []);
  f.presentation.sync(idle);
  const afterDestroy = [...f.tasks.values()][0];
  f.presentation.destroy();
  afterDestroy();
  f.presentation.sync(idle);
  assert.equal(f.tasks.size, 0);
  assert.deepEqual(f.changes, []);
});
