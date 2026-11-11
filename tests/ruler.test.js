import test from 'node:test';
import assert from 'node:assert/strict';
import { rulerMetrics, formatPreciseTime } from '../src/ruler.js';

test('playback rate zooms the fine ruler without changing source time', () => {
  const normal = rulerMetrics(12.5, 46, 1, 174);
  const fast = rulerMetrics(12.5, 46, 2, 174);
  const slow = rulerMetrics(12.5, 46, .5, 174);
  assert.equal(normal.pixelsPerSecond, 32);
  assert.equal(fast.pixelsPerSecond, 16);
  assert.equal(slow.pixelsPerSecond, 64);
  assert.equal(normal.centerTime, fast.centerTime);
  assert.equal(normal.centerTime, slow.centerTime);
  const at14 = metric => metric.ticks.find(tick => tick.time === 14).x - 87;
  assert.equal(at14(fast), at14(normal) / 2);
  assert.ok(fast.ticks.length > normal.ticks.length);
});

test('the same source tick slides left continuously as the pointer moves right', () => {
  const atA = rulerMetrics(10.1, 46, 1, 174).ticks.find(tick => tick.time === 10);
  const atB = rulerMetrics(10.2, 46, 1, 174).ticks.find(tick => tick.time === 10);
  assert.ok(Math.abs(atA.x - atB.x - 3.2) < 1e-8);
  assert.equal(atA.label, '0:10');
});

test('fine ticks never invent time outside the source boundaries', () => {
  for (const time of [-10, 0, 46, 100]) {
    const metrics = rulerMetrics(time, 46, 2, 146);
    assert.ok(metrics.centerTime >= 0 && metrics.centerTime <= 46);
    assert.ok(metrics.ticks.every(tick => tick.time >= 0 && tick.time <= 46));
  }
  assert.equal(rulerMetrics(5, NaN, 0, 146).centerTime, 0);
  assert.equal(rulerMetrics(5, NaN, 0, 146).playbackRate, 1);
});

test('scrubbing readouts retain a useful tenth of a SOURCE second', () => {
  assert.equal(formatPreciseTime(12.99), '0:12.9');
  assert.equal(formatPreciseTime(60.5), '1:00.5');
  assert.equal(formatPreciseTime(3600.25), '1:00:00.2');
  assert.equal(formatPreciseTime(NaN), '0:00.0');
});
