import test from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, hex, contrast, clusterColors, choosePalette } from '../src/palette.js';

const sample = (value, role, weight, source = role) => ({ color: parseColor(value), role, weight, source });
test('computed RGB, percentage colors and alpha are parsed without inventing colors', () => {
  assert.equal(hex(parseColor('rgb(49, 90, 67)')), '#315a43');
  assert.equal(hex(parseColor('rgb(100% 0% 0% / 50%)')), '#ff0000');
  assert.equal(parseColor('#fff8').a, 136 / 255);
  assert.equal(parseColor('transparent'), null);
  assert.equal(parseColor('not a color'), null);
});

test('nearby groups retain a real sampled color rather than their average', () => {
  const result = clusterColors([sample('#f2eee4', 'surface', 3), sample('#f4f0e7', 'surface', 1)]);
  assert.equal(result.length, 1);
  assert.equal(hex(result[0].color), '#f2eee4');
});

test('semantic page accents win over a large unreadable saturated color', () => {
  const samples = [sample('#f2eee4', 'surface', 8), sample('#242d27', 'text', 10), sample('#56604e', 'text', 2),
    sample('#315a43', 'accent', 4, 'Journal link'), sample('#7cfff0', 'accent', 30, 'Low-contrast decoration')];
  const result = choosePalette(samples, parseColor('#f2eee4'));
  assert.equal(result.accent, '#315a43');
  assert.equal(result.sources.accent, 'Journal link');
  assert.ok(contrast(parseColor(result.foreground), parseColor(result.surface)) >= 4.5);
  assert.ok(contrast(parseColor(result.accentForeground), parseColor(result.accent)) >= 4.5);
});

test('independent page palettes produce independent player palettes, without a theme name', () => {
  const studio = choosePalette([sample('#ee563d', 'surface', 10), sample('#211a19', 'text', 12), sample('#29228a', 'accent', 14), sample('#fff4d8', 'text', 4)], parseColor('#ee563d'));
  const cinema = choosePalette([sample('#10151f', 'surface', 10), sample('#e8e9e5', 'text', 12), sample('#a1a8b4', 'text', 3), sample('#d4b27c', 'accent', 4)], parseColor('#10151f'));
  assert.equal(studio.accent, '#29228a');
  assert.equal(cinema.accent, '#d4b27c');
  assert.notEqual(studio.surface, cinema.surface);
  for (const result of [studio, cinema]) {
    assert.ok(contrast(parseColor(result.foreground), parseColor(result.surface)) >= 4.5);
    assert.ok(contrast(parseColor(result.accent), parseColor(result.surface)) >= 3);
    assert.ok(contrast(parseColor(result.accentForeground), parseColor(result.accent)) >= 4.5);
  }
});

test('monochrome pages stay monochrome and hostile pages get readable fallbacks', () => {
  const mono = choosePalette([sample('#fafafa', 'surface', 9), sample('#222222', 'text', 7)], parseColor('#fafafa'));
  assert.equal(mono.accent, '#222222');
  const hostile = choosePalette([sample('#777777', 'surface', 9), sample('#888888', 'text', 7)], parseColor('#777777'));
  assert.ok(contrast(parseColor(hostile.foreground), parseColor(hostile.surface)) >= 4.5);
});
