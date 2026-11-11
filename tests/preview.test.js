import test from 'node:test';
import assert from 'node:assert/strict';
import { timeAtPosition, lensPosition, formatTime, createFrameQueue } from '../src/preview.js';

test('timeline coordinates clamp to the video, including outside the track', () => {
  assert.equal(timeAtPosition(150, 100, 200, 80), 20);
  assert.equal(timeAtPosition(0, 100, 200, 80), 0);
  assert.equal(timeAtPosition(500, 100, 200, 80), 80);
  assert.equal(timeAtPosition(150, 100, 0, 80), 0);
  assert.equal(timeAtPosition(150, 100, 200, Infinity), 0);
});

test('lens stays inside both ends of a small player', () => {
  assert.equal(lensPosition(0, 280, 146), 73);
  assert.equal(lensPosition(1, 280, 146), 207);
  assert.equal(lensPosition(.5, 280, 146), 140);
  assert.equal(lensPosition(.9, 100, 146), 50);
});

test('time labels support hours and metadata that is not ready', () => {
  assert.equal(formatTime(78.8), '1:18');
  assert.equal(formatTime(3671), '1:01:11');
  assert.equal(formatTime(NaN), '0:00');
});

class FakeDecoder extends EventTarget {
  readyState = 2;
  duration = 60;
  currentTime = 0;
}

test('rapid drags skip stale decoded frames and settle on the latest request', () => {
  const decoder = new FakeDecoder();
  const frames = [];
  const queue = createFrameQueue(decoder, (_, time) => frames.push(time));
  queue.request(10);
  queue.request(20);
  queue.request(40);
  assert.equal(decoder.currentTime, 10);
  decoder.dispatchEvent(new Event('seeked'));
  assert.deepEqual(frames, []);
  assert.equal(decoder.currentTime, 40);
  decoder.dispatchEvent(new Event('seeked'));
  assert.deepEqual(frames, [40]);
  queue.destroy();
});

test('releasing the pointer cancels frames still being decoded', () => {
  const decoder = new FakeDecoder();
  const frames = [];
  const queue = createFrameQueue(decoder, (_, time) => frames.push(time));
  queue.request(15);
  queue.cancel();
  decoder.dispatchEvent(new Event('seeked'));
  assert.deepEqual(frames, []);
  queue.request(25);
  decoder.dispatchEvent(new Event('seeked'));
  assert.deepEqual(frames, [25]);
  queue.destroy();
});

test('a drag before decoder metadata arrives retains its requested time', () => {
  const decoder = new FakeDecoder();
  decoder.readyState = 0;
  decoder.duration = NaN;
  const frames = [];
  const queue = createFrameQueue(decoder, (_, time) => frames.push(time));
  queue.request(23);
  decoder.readyState = 2;
  decoder.duration = 60;
  decoder.dispatchEvent(new Event('loadeddata'));
  assert.equal(decoder.currentTime, 23);
  decoder.dispatchEvent(new Event('seeked'));
  assert.deepEqual(frames, [23]);
  queue.destroy();
});

test('metadata alone allows seeking before an initial frame has been downloaded', () => {
  const decoder = new FakeDecoder();
  decoder.readyState = 1;
  const frames = [];
  const queue = createFrameQueue(decoder, (_, time) => frames.push(time));
  queue.request(30);
  assert.equal(decoder.currentTime, 30);
  assert.deepEqual(frames, []);
  decoder.readyState = 2;
  decoder.dispatchEvent(new Event('seeked'));
  assert.deepEqual(frames, [30]);
  queue.destroy();
});

test('a requested time is re-clamped when previously missing metadata arrives', () => {
  const decoder = new FakeDecoder();
  decoder.readyState = 0;
  decoder.duration = NaN;
  const frames = [];
  const queue = createFrameQueue(decoder, (_, time) => frames.push(time));
  queue.request(999);
  decoder.readyState = 1;
  decoder.duration = 60;
  decoder.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(decoder.currentTime, 59.96);
  decoder.readyState = 2;
  decoder.dispatchEvent(new Event('seeked'));
  assert.deepEqual(frames, [59.96]);
  queue.destroy();
});

test('a decoder that never produces a frame times out and can accept a later request', () => {
  const decoder = new FakeDecoder();
  decoder.readyState = 0;
  const errors = [], frames = [];
  let expire;
  const queue = createFrameQueue(decoder, (_, time) => frames.push(time), error => errors.push(error.message), {
    schedule(callback) { expire = callback; return 1; }, cancel() {},
  });
  queue.request(15);
  expire();
  assert.match(errors[0], /timed out/);
  decoder.readyState = 2;
  queue.request(25);
  decoder.dispatchEvent(new Event('seeked'));
  assert.deepEqual(frames, [25]);
  queue.destroy();
});

test('normal frame rounding does not cause an endless sequence of identical seeks', () => {
  const decoder = new FakeDecoder();
  const frames = [];
  const queue = createFrameQueue(decoder, (_, time) => frames.push(time));
  queue.request(10);
  decoder.currentTime = 10 - 1 / 24;
  decoder.dispatchEvent(new Event('seeked'));
  assert.deepEqual(frames, [10]);
  queue.destroy();
});
