# Demo media sources

The default film is **Tears of Steel**, **(CC) Blender Foundation | mango.blender.org**, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). See [the film's project page](https://mango.blender.org/about/).

- **Video:** [Google Shaka public HLS demo stream](https://storage.googleapis.com/shaka-demo-assets/tos/hls.m3u8). The local master playlist references its seven video renditions and audio stream. The main film and end credits remain hosted remotely; this demo is not hosted on Mux.
- **Subtitles:** [English](https://tears-of-steel-subtitles.s3.amazonaws.com/tears-en.vtt) and [French](https://tears-of-steel-subtitles.s3.amazonaws.com/tears-fr.vtt), provided as samples in [Mux's subtitles guide](https://www.mux.com/docs/guides/add-subtitles-to-your-videos).
- **Poster:** a frame extracted from the film at 0:12.
- **Time-lens preview:** a local silent derivative at 336 × 140, 24 fps, with a keyframe every half second. It follows the full film timeline without leading padding. This is an optional performance optimization for this demo; the skin can use the playback source directly.
- **Chapters:** editorial WebVTT markers authored for this demo.

Use `scripts/prepare-steel-demo.mjs` to refresh the manifest and subtitles, and `scripts/prepare-steel-preview.mjs` to regenerate the preview with FFmpeg.

Legacy Oceans assets are retained as development fixtures. Their public original is [Video.js's Oceans sample](https://vjs.zencdn.net/v/oceans.mp4).

Media retains its own rights and attribution. The code license is [Apache-2.0](LICENSE).
