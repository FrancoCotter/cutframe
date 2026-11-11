import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Rebuild the committed demo ladder with FFmpeg; not required for npm run build.
const exec = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'public/media/oceans.mp4');
const output = path.join(root, 'public/media/oceans-hls');
const variants = [
  { height: 400, width: 960, bitrate: 1600000, peak: 2000000 },
  { height: 360, width: 864, bitrate: 900000, peak: 1200000 },
  { height: 240, width: 576, bitrate: 450000, peak: 650000 },
];
const hls = directory => [
  '-hls_time', '4.004', '-hls_playlist_type', 'vod', '-hls_segment_type', 'fmp4',
  '-hls_flags', 'independent_segments', '-hls_fmp4_init_filename', 'init.mp4',
  '-hls_segment_filename', path.join(directory, 'segment-%03d.m4s'),
  path.join(directory, 'index.m3u8'),
];
await mkdir(output, { recursive: true });
await Promise.all([
  ...variants.map(async variant => {
    const directory = path.join(output, `${variant.height}p`);
    await mkdir(directory, { recursive: true });
    await exec('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-map', '0:v:0', '-an',
      '-vf', `scale=${variant.width}:${variant.height}`, '-c:v', 'libx264', '-preset', 'veryfast',
      '-profile:v', 'main', '-level:v', '3.1', '-pix_fmt', 'yuv420p', '-threads', '2',
      '-b:v', String(variant.bitrate), '-maxrate', String(variant.peak), '-bufsize', String(variant.peak * 2),
      // No B-frame timestamp shift: every rendition and the original preview start at t=0.
      '-bf', '0', '-g', '96', '-keyint_min', '96', '-sc_threshold', '0', ...hls(directory),
    ]);
  }),
  (async () => {
    const directory = path.join(output, 'audio');
    await mkdir(directory, { recursive: true });
    await exec('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-map', '0:a:0', '-vn',
      '-c:a', 'aac', '-b:a', '96000', '-ar', '48000', '-ac', '2', ...hls(directory),
    ]);
  })(),
]);
const master = [
  '#EXTM3U', '#EXT-X-VERSION:7', '#EXT-X-INDEPENDENT-SEGMENTS',
  '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Original",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="audio/index.m3u8"',
  ...variants.flatMap(variant => [
    `#EXT-X-STREAM-INF:BANDWIDTH=${variant.peak + 128000},AVERAGE-BANDWIDTH=${variant.bitrate + 96000},RESOLUTION=${variant.width}x${variant.height},FRAME-RATE=23.976,CODECS="avc1.4d401f,mp4a.40.2",AUDIO="audio"`,
    `${variant.height}p/index.m3u8`,
  ]), '',
].join('\n');
await writeFile(path.join(output, 'master.m3u8'), master);
console.log('Prepared Oceans HLS: Auto, 400p, 360p, 240p with shared AAC audio.');
