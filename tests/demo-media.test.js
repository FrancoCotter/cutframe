import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { steelDemo } from '../src/demo-media.js';
import { qualityLabel } from '../src/quality.js';
import { QualityRadioGroupCore } from '@videojs/core';
import { parseMultivariantPlaylist } from '../node_modules/@videojs/spf/dist/dev/media/hls/parse-multivariant.js';

const file = url => new URL(`../public${url}`, import.meta.url);
const text = await readFile(file(steelDemo.source), 'utf8');
const presentation = parseMultivariantPlaylist(text, { url: 'https://example.test/media/steel/master.m3u8' });
const tracks = presentation.selectionSets.filter(set => set.type === 'video').flatMap(set => set.switchingSets.flatMap(group => group.tracks));

test('the active film exposes seven actual source resolutions, including 720p and 1080p', () => {
  assert.deepEqual(tracks.map(track => [track.width, track.height]), [[346, 144], [576, 240], [864, 360], [1152, 480], [1382, 576], [1728, 720], [2592, 1080]]);
  const core = new QualityRadioGroupCore({ formatRendition: qualityLabel });
  core.setMedia({ videoRenditionList: tracks.map(track => ({ ...track, selected: false })), activeVideoRendition: null });
  const state = core.getState();
  assert.equal(state.options.length, 8);
  assert.equal(state.hidden, false);
  assert.deepEqual(state.options.slice(1).map(option => option.label), ['144p', '240p', '360p', '480p', '576p', '720p', '1080p']);
});

test('the relay preserves remote full-film renditions, audio, and a matching preview/cast route', () => {
  for (const set of presentation.selectionSets) for (const group of set.switchingSets) for (const track of group.tracks) {
    assert.match(track.url, /^https:\/\/storage\.googleapis\.com\/shaka-demo-assets\/tos\/stream_\d\.m3u8$/);
  }
  assert.equal(steelDemo.previewSource, '/media/steel/preview.mp4');
  assert.match(steelDemo.upstream, /^https:\/\//);
  assert.doesNotMatch(text, /TYPE=SUBTITLES/); // Language names come from the two explicit VTT tracks.
});

test('poster, editorial chapters, and real English/French subtitle resources are present', async () => {
  const poster = await readFile(file(steelDemo.poster));
  assert.equal(poster.readUInt16BE(0), 0xffd8);
  assert.ok(poster.length > 10000);
  assert.ok((await stat(file(steelDemo.previewSource))).size > 100000);
  assert.ok((await stat(file(steelDemo.chapters))).size > 0);
  assert.deepEqual(steelDemo.captions.map(track => track.language), ['en', 'fr']);
  for (const caption of steelDemo.captions) {
    const vtt = await readFile(file(caption.src), 'utf8');
    assert.match(vtt, /^WEBVTT/);
    assert.match(vtt, /00:00:23\.000\s+-->/);
    assert.ok([...vtt.matchAll(/-->/g)].length > 30);
  }
});
