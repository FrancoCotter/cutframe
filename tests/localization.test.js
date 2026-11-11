import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLanguage, messagesFor } from '../src/localization.js';

test('language tags use regional and script-aware fallbacks', () => {
  assert.equal(resolveLanguage('en-GB'), 'en');
  assert.equal(resolveLanguage('fr-CA'), 'fr');
  assert.equal(resolveLanguage('zh-CN'), 'zh');
  assert.equal(resolveLanguage('zh_TW'), 'zh-Hant');
  assert.equal(resolveLanguage('zh-Hant-HK'), 'zh-Hant');
  assert.equal(resolveLanguage('unknown'), 'en');
  assert.equal(resolveLanguage(''), 'en');
});

test('all authored dictionaries cover the same controls, feedback, and error copy', () => {
  const english = messagesFor('en');
  for (const locale of ['zh-CN', 'zh-TW', 'fr', 'es', 'ja']) {
    assert.deepEqual(Object.keys(messagesFor(locale)).sort(), Object.keys(english).sort());
    assert.ok(Object.values(messagesFor(locale)).every(value => typeof value === 'string' && value.length));
  }
  assert.ok(Object.values(english).every(value => !/[\u3400-\u9fff]/.test(value)));
  assert.equal(messagesFor('en-US').speed, 'Playback speed');
});
