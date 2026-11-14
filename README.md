# Cutframe

**A player that belongs to the page.**

A Video.js v10 skin that adapts its controls to the surrounding page, with cut-corner geometry and an interactive time lens.

## Why I made it

A website already has its own visual language. Cutframe brings that language into the player without requiring a separate player theme for each page. Its page adapter derives control colors and typography from the surrounding content and can follow readable Canvas/WebGL backgrounds as they change. You keep your existing page styles; the player adapts its own controls.

The time lens brings a real video frame, chapter context when available, and precise time together during seeking. Press and drag to unfold it from the timeline; release to fold it back. Its fixed cursor and moving ruler give the interaction a recognizable character.

The demo shows the same player adapting to **Journal**, **Studio**, and **Cinema** while playback continues.

Open **Style Lab** (or `/?theme=lab`) to change the host page’s colors and typography, resize the player, and try Canvas/WebGL backgrounds. Inspect the resulting palette, contrast ratios and sampling diagnostics below the player. Lab settings are saved in this browser; Reset styles restores the starting point. Custom font stacks use locally installed fonts. Control sizes remain fixed for usability.

## What adapts automatically

Once the page adapter is connected, it selects colors and typography without per-page theme presets or required color tokens:

| Surroundings | Current behavior |
| --- | --- |
| Ordinary DOM/CSS content | Derives a control palette from page colors and follows the dominant body font, weight, italic style and letter spacing. |
| A readable, opaque Canvas/WebGL background behind the player | Automatically discovers a suitable canvas and samples five regions around/behind the player. Persistent color changes produce smooth palette transitions. Typography still comes from the page. |
| Unsupported or unreadable backgrounds | Holds the last sampled palette when available, otherwise uses DOM/CSS inference or a stable neutral surface. Visual matching is not guaranteed. |

Automatic adaptation currently requires connecting `createPageAdapter()` as shown below; `createCutframe()` alone uses the fallback appearance. The adapter does not reconstruct the browser's final composited image. Image/video backgrounds, layered effects and some WebGL render schedules need additional integration or explicit colors. See [support boundaries](INTEGRATION.md#limits-and-fallback).

## How to use it

### Run the demo

Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Use `npm test` for logic checks and `npm run build` to build the demo into `dist/`.

### Add the skin to your project

Cutframe is currently distributed as source and has not been published to npm. Copy `src/` into your project's `vendor/cutframe/` directory and use a CSS-aware bundler such as Vite. Install its dependencies:

```sh
npm install @videojs/html@10.3.0 @videojs/hlsjs-video@10.3.0 @videojs/google-cast@10.3.0 lucide@0.468.0
```

Add a mount inside your existing page content. No Cutframe-specific page theme or color variables are required:

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

// Use the surrounding content as the source for page colors and typography.
// Readable Canvas/WebGL backgrounds are discovered automatically.
const adapter = createPageAdapter(document.getElementById('article'), player.surface);
adapter.refresh();

// Call when your page or component unmounts.
function dispose() {
  adapter.destroy();
  player.destroy();
}
```

The entry includes the skin CSS, icons and Video.js element registration. This setup enables both DOM/CSS adaptation and automatic Canvas/WebGL sampling; a separate WebGL adapter is not needed. The content wrapper supplies the page's typography and color context, while canvas discovery searches the document. Choose content representative of the area containing the player.

The adapter observes content and ancestor class/style changes. Call `adapter.refresh()` after stylesheet-only changes, or `adapter.refresh({ reset: true })` after route or scene structure changes. For static/on-demand WebGL renderers, a capture call immediately after rendering may be necessary; see [canvas integration](INTEGRATION.md#automatic-canvas--webgl-adaptation).

**An additional preview MP4 is not required.** The time lens defaults to decoding the playback source, including HLS. You can optionally provide a time-aligned `previewSource` for faster, lighter previews. Remote sources must allow cross-origin playback and canvas access for previews.

See [integration options](INTEGRATION.md) for posters, subtitles, chapters, language, sampling controls and styling overrides.

## Dynamic backdrops

Style Lab includes Canvas liquid motion, WebGL flow, a lit 3D sphere, solid-color WebGL, near-white/black fields and a two-tone pattern. The same adapter handles all of them. By default it reads five 100×100 CSS-pixel patches, analyzed at 20×20 pixels each, approximately every 500ms. Single-color scenes stay tonal; multicolor scenes can supply a secondary accent. Changes must persist before they replace the theme.

The live report distinguishes `scene-sampled`, `scene-held`, `page-styles`, `stable-surface` and manual `host-theme`. New colors transition over one second, using an animation that stops at rest and checks control-color contrast during intermediate frames. Explicit overrides take priority. See [integration, motion controls and limitations](INTEGRATION.md).

## Sources and license

- Built with [Video.js v10](https://github.com/videojs/video.js) and [Lucide](https://lucide.dev/) icons.
- Cutframe code: [Apache License 2.0](LICENSE).
- Demo film: [Tears of Steel](https://mango.blender.org/about/), **(CC) Blender Foundation**, CC BY 3.0. The main video uses the public Google Shaka HLS demo source. The poster and lightweight preview are derived from the film.
- English/French subtitle sources and media details: [MEDIA.md](MEDIA.md).
