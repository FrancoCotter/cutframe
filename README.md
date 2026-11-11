# Cutframe

**A player that belongs to the page.**

A Video.js v10 skin with page-derived colors and typography, cut-corner geometry, and an interactive time lens.

## Why I made it

A website already has its own visual language. Cutframe brings that language into the player by reading the surrounding page's rendered styles and deriving colors and a font for its controls. Developers can start with their existing page design and override styling when needed.

The time lens brings a real video frame, chapter context when available, and precise time together during seeking. Press and drag to unfold it from the timeline; release to fold it back. Its fixed cursor and moving ruler give the interaction a recognizable character.

The demo shows the same player adapting to **Journal**, **Studio**, and **Cinema** while playback continues.

Open **Style Lab** (or `/?theme=lab`) to freely change the host page’s background, text, accent, font family, weight, italic style and letter spacing. Resize the player independently of the browser, try the low-contrast preset, and inspect the actual player palette, typography and contrast ratios below it. Lab settings are saved in this browser; Reset styles restores the starting point. Custom font stacks use locally installed fonts. Control sizes remain fixed for usability.

## How to use it

### Run the demo

Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Use `npm test` for logic checks and `npm run build` to build the demo into `dist/`.

### Add the skin to your project

Cutframe currently provides a browser source API. Copy `src/` into your project's `vendor/cutframe/` directory and use a CSS-aware bundler such as Vite. Install its dependencies:

```sh
npm install @videojs/html@10.3.0 @videojs/hlsjs-video@10.3.0 @videojs/google-cast@10.3.0 lucide@0.468.0
```

Add a mount inside your page content:

```html
<main id="article" lang="en">
  <h1>Your article</h1>
  <p>Your page content.</p>
  <div id="film-player"></div>
</main>
```

Run this module after the mount exists:

```js
import { createCutframe, createPageAdapter } from './vendor/cutframe/cutframe.js';

const player = createCutframe(document.getElementById('film-player'), {
  source: 'https://your-cdn.example/film/master.m3u8', // Your HLS or MP4 URL
  title: 'Your film',
});

const adapter = createPageAdapter(document.getElementById('article'), player.surface);
adapter.refresh();

// Call when your page or component unmounts.
function dispose() {
  adapter.destroy();
  player.destroy();
}
```

CSS, icons, and Video.js element registration are included. Page adaptation is optional; omit the adapter to use the fallback appearance. It reads DOM/CSS colors and fonts, so review the result within your own page.

**An additional preview MP4 is not required.** The time lens defaults to decoding the playback source, including HLS. You can optionally provide a time-aligned `previewSource` for faster, lighter previews. Remote sources must allow cross-origin playback and canvas access for previews.

See [integration options](INTEGRATION.md) for posters, subtitles, chapters, language, and styling overrides. Cutframe has not been published to npm.

## Dynamic backdrops

Style Lab includes Canvas liquid motion, WebGL flow, a lit 3D sphere, solid-color WebGL, near-white/black fields and a two-tone pattern. One automatic sampler discovers readable background canvases and reads five 100×100 CSS-pixel patches around/behind the player, analyzed at 20×20 pixels each. Single-color scenes stay tonal; multicolor scenes provide dominant and secondary colors. Changes must persist before they replace the theme. The lab exposes region colors, color distributions, sampling settings and optional region outlines.

The live report distinguishes `scene-sampled`, `scene-held`, `page-styles`, `stable-surface` and manual `host-theme`. New colors transition over one second, using a finite RAF animation that stops at rest and preserves contrast during intermediate frames. The lab exposes transition speed and idle state. Explicit overrides win; unreadable sources fall back safely. This does not measure a proven “90% coverage” rate or capture arbitrary browser-composited scenes. See [integration, motion controls and limitations](INTEGRATION.md).

## Sources and license

- Built with [Video.js v10](https://github.com/videojs/video.js) and [Lucide](https://lucide.dev/) icons.
- Cutframe code: [Apache License 2.0](LICENSE).
- Demo film: [Tears of Steel](https://mango.blender.org/about/), **(CC) Blender Foundation**, CC BY 3.0. The main video uses the public Google Shaka HLS demo source. The poster and lightweight preview are derived from the film.
- English/French subtitle sources and media details: [MEDIA.md](MEDIA.md).
