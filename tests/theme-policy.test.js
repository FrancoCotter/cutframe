import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHostTheme } from '../src/theme-policy.js';
import { contrast, parseColor } from '../src/palette.js';

const profile = {
  background: '#eeeeee', surface: '#eeeeee', foreground: '#222222', muted: '#333333',
  accent: '#315a43', accentForeground: '#ffffff', sources: {},
};
const check = value => {
  assert.ok(contrast(parseColor(value.foreground), parseColor(value.surface)) >= 4.5);
  assert.ok(contrast(parseColor(value.muted), parseColor(value.surface)) >= 4.5);
  assert.ok(contrast(parseColor(value.accent), parseColor(value.surface)) >= 3);
  assert.ok(contrast(parseColor(value.accentForeground), parseColor(value.accent)) >= 4.5);
  for (const key of ['surface', 'foreground', 'accent', 'accentForeground']) assert.equal(parseColor(value[key]).a, 1);
};
test('ordinary pages keep their inferred colors', () => {
  const value = resolveHostTheme(profile);
  for (const key of ['surface', 'foreground', 'accent']) assert.equal(value[key], profile[key]);
  assert.equal(value.strategy, 'page-styles');
  check(value);
});
test('unknown scene pixels use a deterministic opaque surface', () => {
  const a = resolveHostTheme(profile, {}, true);
  const b = resolveHostTheme({ ...profile, surface: '#ffffff', background: '#000000' }, {}, true);
  assert.equal(a.surface, '#161b22');
  assert.equal(a.surface, b.surface);
  assert.equal(a.foreground, b.foreground);
  assert.equal(a.strategy, 'stable-surface');
  check(a);
});
test('host intent wins for a WebGL scene while unsafe pairs are repaired', () => {
  const value = resolveHostTheme(profile, { surface: '#261f35', foreground: '#eee9fa', accent: '#b9a0e8' }, true);
  assert.equal(value.surface, '#261f35');
  assert.equal(value.foreground, '#eee9fa');
  assert.equal(value.accent, '#b9a0e8');
  assert.equal(value.strategy, 'host-theme');
  check(value);
  check(resolveHostTheme(profile, { surface: '#888888', foreground: '#999999', accent: '#777777', muted: '#777777', accentForeground: '#999999' }, true));
});
test('transparent, malformed and non-color signals cannot make controls transparent', () => {
  for (const value of ['transparent', '#ffffff80', 'rgba(255,255,255,0.9)', 'var(--unknown)', 'url(https://example.test)', 'nonsense']) {
    const resolved = resolveHostTheme(profile, { surface: value, foreground: value, accent: value }, true);
    assert.equal(resolved.surface, '#161b22');
    assert.equal(resolved.strategy, 'stable-surface');
    check(resolved);
  }
});
