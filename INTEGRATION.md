# Use Cutframe in another project

Cutframe is a reusable **Video.js v10 player composition and skin**. It combines
Video.js HTML custom elements, authored controls, CSS, a decoded-frame time lens,
and an optional host-page style adapter. `createCutframe()` mounts that composition
inside an empty DOM element.

The repository currently ships a demo and a source integration API. It has **not
been published to npm**, and `npm run build` builds the demo site, not a distributable
player library. Use the source entry below with a CSS-aware bundler such as Vite.
Adding a class to an existing `<video>` is insufficient: the timeline, menus and
lens require the component markup and bindings. This API also does not attach to
an existing Video.js v7/v8 player instance.

## Minimal source integration

1. Copy this repository's `src/` directory into `vendor/cutframe/` in your project.
   The `cutframe.js` entry imports only reusable player modules; it does not execute
   `main.js`, import `page.css`, or load the three demo environments or demo footage.
2. Install the dependencies used by this version:

   ```sh
   npm install @videojs/html@10.3.0 @videojs/hlsjs-video@10.3.0 @videojs/google-cast@10.3.0 lucide@0.468.0
   ```

3. Add an empty mount element within your page content:

   ```html
   <main id="article" lang="en">
     <h1>Your article</h1>
     <p>Your own page styles and content.</p>
     <div id="film-player"></div>
   </main>
   ```

4. Run this module after the mount exists:

   ```js
   import { createCutframe, createPageAdapter } from './vendor/cutframe/cutframe.js';

   const player = createCutframe(document.getElementById('film-player'), {
     source: '/videos/film.mp4',
     poster: '/videos/film-cover.jpg',
     title: 'Your film',
     subtitle: 'YOUR FILM DESCRIPTION',
   });

   // Optional: infer colors, font and edge width from actual host content.
   const adapter = createPageAdapter(document.getElementById('article'), player.surface);
   adapter.refresh();

   // When your route or component unmounts:
   function dispose() {
     adapter.destroy();
     player.destroy();
   }
   ```

The JS entry imports `skin.css` automatically. Icons and Video.js element
registrations are initialized by the skin. The mount does not need a particular
ID or a demo-page class. Give its parent the width you want the player to occupy.
Call the API in the browser after mounting, for example inside a framework's
mount/effect hook, and call `dispose()` from its cleanup hook. This is a DOM API;
there is no dedicated React wrapper or server-rendered component in this repository.

## Media and options

| Option | Behavior |
| --- | --- |
| `source` | Required video URL. An `.m3u8` URL uses the official hls.js adapter; other URLs use a native `<video>`. |
| `poster` | Optional opening cover image. |
| `previewSource` | Optional lightweight, time-aligned preview video. Defaults to `source`. The player decodes frames itself; no thumbnail sprite sheet is required. |
| `castSource` | Optional matching public video URL that a Cast receiver can reach. |
| `chaptersSource` | Optional WebVTT chapter URL. Without it, chapter navigation stays hidden unless the media provides chapters. |
| `captionTracks` | Optional array of `{ src, language, label, kind }`; `kind` can be `subtitles` or `captions`. Default: no authored caption tracks. |
| `title`, `subtitle` | Film labels. Defaults: `Featured film` and `AN OBSERVATION IN MOTION`. |
| `language` | Defaults to `auto`, following the nearest ancestor `lang`. Pass a language tag to override it. |
| `keyboardTarget` | Defaults to `player`. Pass `document` for a single-player page that deliberately uses global Space/Left/Right keys, as the demo does. |

Example with your own adaptive stream and text tracks:

```js
const player = createCutframe(mount, {
  source: '/videos/film/master.m3u8',
  previewSource: '/videos/film-preview.mp4',
  chaptersSource: '/videos/film-chapters.vtt',
  captionTracks: [
    { src: '/videos/film-en.vtt', language: 'en', label: 'English' },
    { src: '/videos/film-fr.vtt', language: 'fr', label: 'Français' },
  ],
});
```

Quality options come from the actual source renditions. A normal MP4 has no
quality menu. The component neither encodes new renditions nor creates chapters
or subtitles. External media must allow cross-origin playback and, for the lens,
canvas access. A preview video must use the same zero point and timing as the main
video. The demo's environment variables and bundled media defaults belong to its
`config.js`; consumers pass their own options directly.

## Appearance and adaptation

Without an adapter the player uses a neutral fallback palette. For automatic
adaptation, pass a page-content container that includes the visual elements to
sample. The adapter excludes Cutframe itself, so player changes do not feed back
into its palette. Add `data-palette-ignore` to unrelated host UI you want excluded.

The adapter reads computed DOM/CSS colors and fonts, not image pixels or video
frames. It is a design heuristic. Class, inline-style, content and ancestor-theme
changes schedule updates. Call `adapter.refresh()` after changes confined to
stylesheet rules. Host selectors that depend on a particular ancestor structure
may not reproduce exactly in the adapter's temporary measurement copy.

You can also supply explicit tokens on the mount instead of using the adapter:

```css
#film-player {
  --cutframe-background: #eeeade;
  --cutframe-surface: #eeeade;
  --cutframe-foreground: #252d29;
  --cutframe-muted: #52605a;
  --cutframe-accent: #256346;
  --cutframe-accent-foreground: #ffffff;
  --cutframe-font: Georgia, serif;
}
```

`--media-accent-color` and `--media-accent-text-color` override the inferred accent
pair even when the adapter is active. The skin uses light DOM and class-prefixed
styles; broad host CSS rules can still affect it, so validate the host integration.

## Returned instance and cleanup

- `surface`: the skin's root DOM element.
- `video`: the native video element or Video.js HLS element.
- `lens`: preview bindings, including `stop()`.
- `closeMenus()`: close the player's menus.
- `setLanguage(tag)`: change the language; `auto` resumes following the page.
- `destroy()`: release subscriptions, preview decoding, listeners and observers,
  then remove the player markup. Repeated calls are safe.

Destroy the separately created adapter before destroying the player. Call
`createCutframe()` once per empty mount; destroy the old instance before remounting.
The default player-scoped hotkeys avoid intentionally registering document-wide
shortcuts. Physical Cast/AirPlay devices and broad multi-player behavior have not
been validated in this project.

Code is Apache-2.0. Keep the license notices when redistributing it. Supply your own
media or preserve the demo footage's separate attribution and license if reusing it.
