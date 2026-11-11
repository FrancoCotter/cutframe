import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChapters, chapterAt } from '../src/chapters.js';

test('chapter boundaries, gaps and the final frame select the correct topic', () => {
  const chapters = normalizeChapters([{ startTime: 0, endTime: 12, text: 'Below the surface' }, { startTime: 20, endTime: 46.614, text: 'Open water' }], 46.613);
  assert.equal(chapterAt(chapters, 0), 0);
  assert.equal(chapterAt(chapters, 11.99), 0);
  assert.equal(chapterAt(chapters, 12), -1);
  assert.equal(chapterAt(chapters, 20), 1);
  assert.equal(chapterAt(chapters, 46.613), 1);
});

test('overlaps, duplicate starts and invalid cues do not create misleading sections', () => {
  const chapters = normalizeChapters([
    { startTime: 12, endTime: 40, text: '<b>Second</b>' },
    { startTime: 0, endTime: 20, text: 'First' },
    { startTime: 12, endTime: 46, text: 'Duplicate' },
    { startTime: NaN, endTime: 8, text: 'Bad cue' },
  ], 30);
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].end, 12);
  assert.equal(chapters[1].end, 30);
  assert.equal(chapters[1].title, 'Second');
});

test('videos without chapter metadata do not get invented chapter entries', () => {
  assert.deepEqual(normalizeChapters([], 46), []);
  assert.deepEqual(normalizeChapters(undefined, 46), []);
  assert.deepEqual(normalizeChapters([{ startTime: 0, endTime: 12, text: 'Intro' }], NaN), []);
});
