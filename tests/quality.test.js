import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { QualityRadioGroupCore } from '@videojs/core';
import { parseMultivariantPlaylist } from '../node_modules/@videojs/spf/dist/dev/media/hls/parse-multivariant.js';
import { qualityLabel, frameSize, bindImmediateQuality } from '../src/quality.js';

const base = new URL('../public/media/oceans-hls/', import.meta.url);
const manifest = await readFile(new URL('master.m3u8', base), 'utf8');
const presentation = parseMultivariantPlaylist(manifest, { url: new URL('master.m3u8', base).href });
const tracks = presentation.selectionSets.filter(set => set.type === 'video').flatMap(set => set.switchingSets.flatMap(group => group.tracks));

test('the actual demo manifest exposes three real resolutions and shared audio to Video.js', () => {
  assert.deepEqual(tracks.map(track => [track.width, track.height]), [[960, 400], [864, 360], [576, 240]]);
  const audio = presentation.selectionSets.find(set => set.type === 'audio');
  assert.equal(audio.switchingSets[0].tracks.length, 1);
  assert.equal(audio.switchingSets[0].tracks[0].url, new URL('audio/index.m3u8', base).href);
  const core = new QualityRadioGroupCore({ formatRendition: qualityLabel });
  const calls = [];
  const renditions = tracks.map(track => ({ ...track, bitrate: track.bandwidth, selected: false }));
  const media = { videoRenditionList: renditions, activeVideoRendition: renditions[0], selectVideoRendition: id => calls.push(id) };
  core.setMedia(media);
  let state = core.getState();
  assert.equal(state.hidden, false);
  assert.equal(state.value, 'auto');
  assert.deepEqual(state.options.slice(1).map(option => option.label), ['400p', '360p', '240p']);
  core.select(media, renditions[1].id);
  core.select(media, 'auto');
  assert.deepEqual(calls, [renditions[1].id, 'auto']);
  renditions[1].selected = true;
  state = core.getState();
  assert.equal(state.value, renditions[1].id);
});

test('every referenced HLS playlist, initialization file and segment exists; video boundaries align', async () => {
  const playlists = [...tracks.map(track => track.url), new URL('audio/index.m3u8', base).href];
  const timings = [];
  for (const url of playlists) {
    const text = await readFile(new URL(url), 'utf8');
    assert.match(text, /#EXT-X-ENDLIST/);
    const init = text.match(/#EXT-X-MAP:URI="([^"]+)"/)[1];
    const files = [init, ...text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'))];
    for (const file of files) assert.ok((await stat(new URL(file, url))).size > 0, file);
    const durations = [...text.matchAll(/#EXTINF:([\d.]+)/g)].map(match => Number(match[1]));
    assert.ok(durations.length > 1);
    timings.push(durations);
  }
  assert.deepEqual(timings[0], timings[1]);
  assert.deepEqual(timings[0], timings[2]);
  const total = list => list.reduce((sum, duration) => sum + duration, 0);
  assert.ok(Math.abs(total(timings[0]) - total(timings[3])) < .1);
});

test('native quality UI hides for a fixed-quality MP4 or a single rendition', () => {
  const core = new QualityRadioGroupCore();
  for (const videoRenditionList of [[], [{ id: 'only', width: 960, height: 400, selected: false }]]) {
    core.setMedia({ videoRenditionList, activeVideoRendition: null });
    const state = core.getState();
    assert.equal(state.hidden, true);
    assert.equal(state.disabled, true);
  }
});

test('4K and 8K source metadata generates its own quality options without a demo ceiling', () => {
  const dimensions = [[7680, 4320], [3840, 2160], [2560, 1440], [1920, 1080], [1280, 720]];
  const text = ['#EXTM3U', ...dimensions.flatMap(([width, height], index) => [
    `#EXT-X-STREAM-INF:BANDWIDTH=${(dimensions.length - index) * 4000000},RESOLUTION=${width}x${height},CODECS="hvc1.1.6.L186.B0"`,
    `${height}p/index.m3u8`,
  ])].join('\n');
  const parsed = parseMultivariantPlaylist(text, { url: 'https://example.test/film/master.m3u8' });
  const videoRenditionList = parsed.selectionSets.filter(set => set.type === 'video')
    .flatMap(set => set.switchingSets.flatMap(group => group.tracks)).map(track => ({ ...track, selected: false }));
  const calls = [];
  const media = { videoRenditionList, activeVideoRendition: videoRenditionList[0], selectVideoRendition: id => calls.push(id) };
  const core = new QualityRadioGroupCore({ formatRendition: qualityLabel });
  core.setMedia(media);
  const state = core.getState();
  assert.equal(state.hidden, false);
  assert.equal(state.options.length, 6); // Auto plus precisely the five provided renditions.
  assert.deepEqual(state.options.slice(1).map(option => option.label), ['4320p', '2160p', '1440p', '1080p', '720p']);
  core.select(media, videoRenditionList[0].id);
  assert.deepEqual(calls, [videoRenditionList[0].id]);
  assert.equal(frameSize(media.activeVideoRendition), '7680 × 4320');
});

test('ultrawide labels retain real pixel dimensions and missing dimensions do not invent a resolution', () => {
  assert.equal(qualityLabel({ width: 3840, height: 1600 }), '1600p');
  assert.equal(frameSize({ width: 3840, height: 1600 }), '3840 × 1600');
  assert.equal(frameSize({ width: 3840, height: 2160 }), '3840 × 2160');
  assert.equal(qualityLabel({ bitrate: 2500000 }), '2.5 Mbps');
  assert.equal(qualityLabel({ width: 3840 }), null);
  assert.equal(frameSize({ height: NaN, width: 3840 }), '');
});

// Exercise the real binding with engine/decoder events independently of network timing.
test('manual quality replaces buffered video and reports success only after decoding the target size', async () => {
  const group = new EventTarget();
  const video = Object.assign(new EventTarget(), {
    videoWidth: 1728, videoHeight: 720,
    engine: { levels: [{ width: 1728, height: 720 }, { width: 2592, height: 1080 }], currentLevel: 0, loadLevel: 0 },
  });
  const binding = bindImmediateQuality(group, video, key => ({ switchingTo:'Switching to', switchFailed:'Failed' })[key], () => {});
  const choose = async value => { const event = new Event('value-change'); event.detail = { value }; group.dispatchEvent(event); await Promise.resolve(); };
  await choose('1');
  assert.equal(video.engine.currentLevel, 1);
  assert.equal(binding.description(), 'Switching to 1080p');
  video.videoWidth = 2592; video.videoHeight = 1080;
  video.dispatchEvent(new Event('resize'));
  assert.equal(binding.description(), '2592 × 1080');
  await choose('auto');
  assert.equal(video.engine.loadLevel, -1);
  assert.equal(binding.description(), '2592 × 1080');
  await choose('unknown');
  assert.equal(video.engine.currentLevel, 1);
});


test('paused manual switching requests a fresh decode at the same time only after the matching fragment arrives', async () => {
  const group = new EventTarget();
  const listeners = new Map();
  let refreshTime = 0;
  const video = Object.assign(new EventTarget(), {
    videoWidth: 1728, videoHeight: 720, paused: true,
    engine: {
      levels: [{ width: 1728, height: 720 }, { width: 2592, height: 1080 }],
      on: (name, callback) => listeners.set(name, callback),
      off: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); },
    },
  });
  Object.defineProperty(video, 'currentTime', { get: () => 105, set: value => { assert.equal(value, 105); refreshTime++; } });
  const binding = bindImmediateQuality(group, video, key => key, () => {});
  const event = new Event('value-change'); event.detail = { value:'1' }; group.dispatchEvent(event); await Promise.resolve();
  const buffered = listeners.get('hlsFragBuffered');
  buffered('', { frag:{type:'audio',level:1,start:100,duration:10} });
  buffered('', { frag:{type:'main',level:0,start:100,duration:10} });
  buffered('', { frag:{type:'main',level:1,start:110,duration:10} });
  assert.equal(refreshTime, 0);
  buffered('', { frag:{type:'main',level:1,start:100,duration:10} });
  assert.equal(refreshTime, 1);
  assert.equal(listeners.size, 0);
  assert.equal(video.paused, true);
  video.videoWidth=2592; video.videoHeight=1080; video.dispatchEvent(new Event('resize'));
  assert.equal(binding.description(), '2592 × 1080');
});
