import test from 'node:test';
import assert from 'node:assert/strict';
import { bindPoster } from '../src/poster.js';

function setup(hasPoster = true) {
  const surface = new EventTarget();
  surface.dataset = {};
  const timeline = new EventTarget();
  surface.querySelector = () => timeline;
  const media = new EventTarget();
  media.localName = 'hls-video';
  const documentTarget = new EventTarget();
  const binding = bindPoster(surface, media, { hasPoster, documentTarget });
  return { surface, media, timeline, documentTarget, binding };
}

test('HLS preload at a nonzero initial timestamp leaves the poster visible', () => {
  const { media, surface } = setup();
  media.currentTime = 1.483333;
  for (const event of ['loadedmetadata', 'loadeddata', 'seeking', 'seeked']) media.dispatchEvent(new Event(event));
  assert.equal(surface.dataset.poster, 'pending');
});

test('playing dismisses the cover, pause keeps the actual frame, and a new source resets it', () => {
  const { media, surface } = setup();
  media.dispatchEvent(new Event('play'));
  media.dispatchEvent(new Event('pause'));
  assert.equal(surface.dataset.poster, 'dismissed');
  media.dispatchEvent(new Event('sourcechange'));
  assert.equal(surface.dataset.poster, 'pending');
});

test('an intentional timeline seek dismisses the cover before playback', () => {
  const { surface, timeline } = setup();
  const pointer = new Event('pointerdown');
  pointer.button = 0;
  timeline.dispatchEvent(pointer);
  assert.equal(surface.dataset.poster, 'dismissed');
});

test('seek keys dismiss the cover, and disposal removes their handler', () => {
  const { surface, documentTarget, media, binding } = setup();
  const right = () => Object.assign(new Event('keydown'), { key: 'ArrowRight' });
  documentTarget.dispatchEvent(right());
  assert.equal(surface.dataset.poster, 'dismissed');
  media.dispatchEvent(new Event('sourcechange'));
  binding.destroy();
  documentTarget.dispatchEvent(right());
  assert.equal(surface.dataset.poster, 'pending');
});

test('a source without a poster does not reserve an opaque cover', () => {
  const { surface } = setup(false);
  assert.equal(surface.dataset.poster, 'empty');
});
