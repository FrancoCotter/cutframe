import test from 'node:test';
import assert from 'node:assert/strict';
import { samplingRegions, patchColors, paletteFromPatches, createSceneStabilizer } from '../src/scene-palette.js';
import { parseColor, contrast } from '../src/palette.js';

const patch = (name, value, weight = 1) => ({ name, weight, colors: [{ color: parseColor(value), share: 1 }] });
const solid = value => paletteFromPatches([patch('top', value), patch('bottom', value, 2), patch('left', value), patch('right', value), patch('center', value, .5)]);
function check(palette) {
  assert.ok(contrast(parseColor(palette.foreground), parseColor(palette.surface)) >= 4.5);
  assert.ok(contrast(parseColor(palette.accent), parseColor(palette.surface)) >= 3);
  assert.ok(contrast(parseColor(palette.accentForeground), parseColor(palette.accent)) >= 4.5);
}

test('five CSS-sized regions clamp to the source bounds at corners and in tiny embeds', () => {
  const bounds = { x: 20, y: 30, width: 70, height: 40 };
  const regions = samplingRegions({ x: -30, y: -80, width: 200, height: 180 }, bounds);
  assert.deepEqual(regions.map(region => region.name), ['top', 'bottom', 'left', 'right', 'center']);
  for (const { rect } of regions) {
    assert.ok(rect.x >= bounds.x && rect.y >= bounds.y);
    assert.ok(rect.x + rect.width <= bounds.x + bounds.width);
    assert.ok(rect.y + rect.height <= bounds.y + bounds.height);
  }
  assert.equal(samplingRegions(bounds, { ...bounds, width: 0 }).length, 0);
});

test('histograms retain distinct red/blue colors and discard transparent pixels', () => {
  const result = patchColors(new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 0]));
  assert.equal(result.coverage, 2 / 3);
  assert.equal(result.colors.length, 2);
  assert.ok(result.colors.every(item => item.share === .5));
});

test('solid black, white, gray, saturated and pastel scenes stay single-color with readable tonal controls', () => {
  for (const value of ['#000000', '#ffffff', '#777777', '#835801', '#ff0000', '#00ff00', '#0000ff', '#e7c8df', '#556b80']) {
    const palette = solid(value);
    assert.equal(palette.sceneKind, 'uniform', value);
    assert.equal(palette.surface, value);
    check(palette);
  }
});

test('a secondary scene hue supplies the accent without averaging unrelated colors', () => {
  const palette = paletteFromPatches([patch('bottom', '#281e44', 2), patch('left', '#281e44'), patch('right', '#d9a6aa')]);
  assert.equal(palette.surface, '#281e44');
  assert.equal(palette.accent, '#d9a6aa');
  assert.equal(palette.sceneKind, 'multicolor');
  check(palette);
});

test('bottom surroundings outweigh center content and tiny highlight outliers', () => {
  const palette = paletteFromPatches([
    patch('top', '#aa6644'), patch('left', '#aa6644'), patch('center', '#aa6644', .5),
    patch('bottom', '#334455', 2), patch('right', '#334455'),
    { name: 'noise', weight: 1, colors: [{ color: parseColor('#ff00ff'), share: .001 }] },
  ]);
  assert.equal(palette.surface, '#334455');
  assert.notEqual(palette.accent, '#ff00ff');
  check(palette);
});

test('brief flashes and small noise are held; a persistent new scene is eventually committed', () => {
  const hold = createSceneStabilizer({ settleMs: 1000, changeThreshold: 8 });
  const a = solid('#334455'), b = solid('#e6d4bf');
  assert.equal(hold.push(a, 0).palette, a);
  assert.equal(hold.push(b, 500).palette, a);
  assert.equal(hold.push(a, 1000).pending, false);
  assert.equal(hold.push(solid('#354557'), 1500).palette, a);
  assert.equal(hold.push(b, 2000).pending, true);
  assert.equal(hold.push(b, 2500).palette, a);
  assert.equal(hold.push(b, 3000).palette, b);
});
