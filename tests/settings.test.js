import test from 'node:test';
import assert from 'node:assert/strict';
import { captionChoices, settingsMarkup } from '../src/settings.js';
import { textTrackFeature } from '../node_modules/@videojs/core/dist/dev/dom/store/features/text-track.js';

function setup() {
  const tracks = [
    { id: 'chapters', kind: 'chapters', language: 'en', label: 'Chapters', mode: 'hidden' },
    { id: 'en', kind: 'subtitles', language: 'en', label: 'English', mode: 'disabled' },
    { id: 'fr', kind: 'captions', language: 'fr', label: 'Français', mode: 'disabled' },
  ];
  const media = { textTracks: tracks, addTextTrack() {} };
  const actions = textTrackFeature.state({ target: () => ({ media }) });
  return { tracks, actions };
}

test('subtitle settings use real caption/subtitle tracks and exclude chapters', () => {
  const { tracks } = setup();
  assert.deepEqual(captionChoices(tracks).map(track => track.id), ['en', 'fr']);
  assert.deepEqual(captionChoices(), []);
});

test('the native subtitle switch turns text on/off without changing chapter tracking', () => {
  const { tracks, actions } = setup();
  assert.equal(actions.toggleSubtitles(true), true);
  assert.equal(tracks.filter(track => track.mode === 'showing').length, 1);
  assert.equal(actions.toggleSubtitles(false), false);
  assert.ok(tracks.slice(1).every(track => track.mode === 'disabled'));
  assert.equal(tracks[0].mode, 'hidden');
});

test('language selection shows only that track and is remembered across Off/On', () => {
  const { tracks, actions } = setup();
  actions.selectSubtitlesTrack('fr');
  assert.equal(tracks[2].mode, 'showing');
  assert.equal(tracks[1].mode, 'disabled');
  actions.toggleSubtitles(false);
  actions.toggleSubtitles(true);
  assert.equal(tracks[2].mode, 'showing');
  actions.selectSubtitlesTrack('en');
  assert.equal(tracks[1].mode, 'showing');
  assert.equal(tracks[2].mode, 'disabled');
});

test('settings instances use separate popup IDs and leave quality/speed in their existing menus', () => {
  const first = settingsMarkup(1);
  const second = settingsMarkup(2);
  const ids = markup => [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.ok(ids(first.menu).every(id => !ids(second.menu).includes(id)));
  assert.match(first.menu, /media-menu-checkbox-item/);
  assert.match(first.menu, /media-menu-radio-group/);
  assert.doesNotMatch(first.menu, /media-quality-radio-group|media-playback-rate-radio-group/);
});
