# Demo media

The default video is the complete **Tears of Steel** open movie, including its end credits.

- Attribution: **(CC) Blender Foundation | mango.blender.org**.
- Film and license: [Blender's project page](https://mango.blender.org/about/), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Streaming media: [Google Shaka demo HLS source](https://storage.googleapis.com/shaka-demo-assets/tos/hls.m3u8), also referenced in the [Shaka demo asset catalogue](https://github.com/shaka-project/shaka-player/blob/main/demo/common/assets.js).
- Real dialogue subtitles: [English](https://tears-of-steel-subtitles.s3.amazonaws.com/tears-en.vtt), [French](https://tears-of-steel-subtitles.s3.amazonaws.com/tears-fr.vtt), published as samples in [Mux's subtitles guide](https://www.mux.com/docs/guides/add-subtitles-to-your-videos).

The local `public/media/steel/master.m3u8` preserves all seven video renditions and the audio route, expanding references to absolute HTTPS URLs. It omits the source's unnamed embedded text track in favor of the two named WebVTT tracks above. It does not crop or shorten the film. Actual source dimensions range from 346×144 to 2592×1080; the skin uses their actual pixel heights for labels.

`public/media/steel-poster.jpg` is a frame extracted at 12 seconds. The opening contains a black lead-in, so the first frame would not make a useful cover. The poster is presentation artwork and does not replace or edit any part of the movie.

`public/media/steel/chapters.vtt` contains editorial navigation markers authored for this demo, not chapters inferred by AI. The English/French captions are dialogue tracks rather than the earlier placeholder chapter-label subtitles.

The main film stays hosted by the public demo provider. Internet access is required during playback; its full-length HD files are not copied into this repository. The poster, captions, chapter markers and a small silent preview MP4 are local. The preview retains the full film timeline at 336×140 and 24 fps, with a keyframe every half second for fast range seeks. The preview and hls.js playback both start at the first video frame, with no leading padding. Cast uses the public full-film manifest rather than a localhost URL.

To refresh the small manifest/subtitle files, run `node scripts/prepare-steel-demo.mjs`. Regenerate the poster with FFmpeg:

```sh
ffmpeg -ss 12 -i https://storage.googleapis.com/shaka-demo-assets/tos/stream_6.m3u8 -frames:v 1 -q:v 2 public/media/steel-poster.jpg
```

Regenerate the fast-seeking preview with `node scripts/prepare-steel-preview.mjs`. With the development server running, `http://127.0.0.1:5173/tests/browser-frame-check.html` exercises the actual lens at four timestamps and checks decoded times, nonblank canvas pixels and different frame hashes without screenshots.

Code is Apache-2.0; that does not replace the media's own license. The older Oceans media remains available as a local development fallback and has its original third-party rights. This demo is not a video uploaded to the participant's Mux account and does not establish the Mux hosting bonus.
