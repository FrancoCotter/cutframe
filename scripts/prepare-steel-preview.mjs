import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The hls.js video presentation and this progressive preview both start at
// the first video frame. Keep the preview zero-based without leading padding.
execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-i', 'https://storage.googleapis.com/shaka-demo-assets/tos/video_360p_400k.mp4',
  '-an', '-vf', 'scale=336:140,setpts=PTS-STARTPTS',
  '-c:v', 'libx264', '-preset', 'veryfast', '-threads', '3',
  '-b:v', '100k', '-maxrate', '160k', '-bufsize', '320k',
  '-bf', '0', '-g', '12', '-keyint_min', '12', '-sc_threshold', '0',
  '-movflags', '+faststart', fileURLToPath(new URL('../public/media/steel/preview.mp4', import.meta.url)),
], { stdio: 'inherit' });
console.log('Prepared time-aligned local preview: 336×140, 24fps, keyframes every 0.5 seconds.');
