import test from 'node:test';
import assert from 'node:assert/strict';
import { createThemeTransition } from '../src/theme-transition.js';

test('a rapid theme switch cancels stale work and only applies the latest request', async () => {
  const applied = [];
  const animations = [];
  const node = {
    animate() {
      let resolve, reject;
      const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
      const animation = { finished, resolve, cancelled: false, cancel() { this.cancelled = true; reject(new Error('Cancelled')); } };
      animations.push(animation);
      return animation;
    },
  };
  const change = createThemeTransition(name => applied.push(name), () => [node], () => false);
  const first = change('paper');
  const second = change('night');
  assert.equal(animations[0].cancelled, true);
  animations[1].resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(applied, ['night']);
  animations[2].resolve();
  await Promise.all([first, second]);
  assert.deepEqual(applied, ['night']);
});

test('reduced-motion users get the theme immediately without any animation', async () => {
  const applied = [];
  const node = { animate() { throw new Error('Motion must be skipped'); } };
  const change = createThemeTransition(name => applied.push(name), () => [node], () => true);
  await change('punch');
  assert.deepEqual(applied, ['punch']);
});

test('a different page layout animates its new nodes rather than detached old nodes', async () => {
  const calls = [];
  const animation = name => {
    let resolve;
    const result = { finished: new Promise(yes => { resolve = yes; }), cancel() {}, resolve: () => resolve() };
    calls.push({ name, animation: result });
    return result;
  };
  const oldNode = { animate: () => animation('old') };
  const newNode = { animate: () => animation('new') };
  let current = oldNode;
  const change = createThemeTransition(() => { current = newNode; }, () => [current], () => false);
  const pending = change('new-layout');
  calls[0].animation.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls.map(call => call.name), ['old', 'new']);
  calls[1].animation.resolve();
  await pending;
});
