# Cutframe

A page-aware, cut-corner skin for **Video.js v10**, with three genuinely different demo environments and one persistent video player.

## Run locally

Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Build and logic checks:

```sh
npm test
npm run build
npm run preview
```

## The demo

For use in another project, see [Integration](INTEGRATION.md): import the browser
source entry `src/cutframe.js`, call `createCutframe(mount, options)`, and optionally
attach `createPageAdapter(host, player.surface)`. CSS, icons and Video.js element
registrations are included by the entry. This is a reusable DOM component API;
there is no published npm package yet. The three demo pages are separate consumers.

- **Journal:** asymmetric editorial columns, serif typography, green reading links and field notes.
- **Studio:** dense navigation, oversized poster typography, badges and contrasting programme cards.
- **Cinema:** a sparse, centered screening environment with a warm accent.

These are different DOM layouts, not one template with substituted headings. A shared top-stage height and outer content width keep the player slot in the same x/y position at a given viewport size. The video is not remounted or restarted when changing environments.

## Automatic page adaptation

`src/page-adapter.js` reads the actual computed styles of page elements, excluding the player and the demo switcher. It samples the whole page rather than only its background.

1. Measure the page’s final styles in an invisible, transition-free copy so ongoing theme animations do not contaminate the result.
2. Collect text, link, button, badge, surface, border and CSS-gradient colors, plus body typography.
3. Group similar colors in Lab space. Keep a real sampled representative instead of averaging unrelated hues.
4. Weight colors by visual role and prominence.
5. Select surface, foreground, accent and accent-foreground roles with contrast checks. Body text and text on the accent target 4.5:1; the accent against the player surface targets at least 3:1. Use a readable black/white fallback if necessary.
6. Apply the inferred palette and font to the skin. The shape, control structure and motion language remain unchanged.

There is **no per-environment player palette** in the switcher. Editing page DOM classes, inline styles or content schedules another analysis; ancestor theme attributes and window resizing are also observed. The optional “How this player adapts” disclosure shows color provenance.

This is deterministic DOM/CSS analysis, not an AI model or semantic understanding of arbitrary websites. It does not sample image pixels, video colors or cross-origin iframe content. Pairings are heuristic and still need design review. Stylesheet-only changes may require a refresh or another environment switch to re-analyze.

`src/skin.css` uses the adapter’s `--cutframe-*` properties and contains no Journal/Studio/Cinema selectors. `--media-accent-color` and `--media-accent-text-color` can still explicitly override the inferred accent pair.

## Playback and controls

- `@videojs/html@10.3.0` with native MP4 playback and the official `@videojs/hlsjs-video@10.3.0` adapter.
- Play/pause with a continuous two-plane icon morph; video responds immediately.
- Seek, time display, continuous volume, mute, fullscreen and six-choice playback speed menu.
- A native Video.js quality menu: Auto plus the source's actual video renditions. The default **Tears of Steel** HLS source has 144p, 240p, 360p, 480p, 576p, 720p and 1080p renditions (highest: 2592×1080). Manual selection pins a rendition and replaces the current buffered video, including while paused; a brief rebuffer may occur. Auto restores adaptive bitrate selection. The menu reports “Switching to…” until the decoder produces the requested dimensions, then shows the actual decoded width × height. The Auto tile stays labeled Auto; current decoded dimensions appear in the header. All quality tiles have the same height, with single-line labels including 1440p, 2160p and 4320p when provided by the source. The menu hides for single-quality sources, including an ordinary MP4.
- An independent poster component shows a clear opening frame before playback. HLS preload and nonzero initial timestamps do not dismiss it; playing or actively seeking does. Pausing retains the actual video frame.

The skin has no 400p ceiling or fixed list of resolutions. A source providing 3840×2160 or 7680×4320 renditions adds 2160p or 4320p choices automatically. Labels use the actual declared pixel height; an ultrawide 3840×1600 rendition is labeled 1600p. The quality menu header shows the decoded frame's full width × height when available, falling back to active rendition metadata before decoding. Sources without resolution metadata use bitrate labels when available, rather than guessing pixel dimensions. Producing additional renditions is an encoding/delivery task; the player does not turn a single 4K MP4 into a lower-resolution ladder.

Additional playback behavior:

- The two film labels fade out during playback and return on pause; they stay hidden while scrubbing.
- In element fullscreen the video fills a stable canvas and the cut-corner control dock floats over it. The dock and cursor hide after about three seconds of inactivity, using Video.js activity detection plus a one-second grace period. Pointer/touch or keyboard activity reveals the dock; pause, open menus, dragging, hovering the dock and visible keyboard focus keep it available. Inline controls remain visible.
- Arrow keys seek by five source seconds with directional feedback; repeated steps accumulate. Space toggles playback. This single-player demo uses document-level arrows/space while menus and editable inputs retain their normal behavior.
- Click the picture to play/pause. Touch double-taps on the left/right seek by five seconds.
- A single Settings entry groups captions On/Off, caption-language selection, picture-in-picture, AirPlay and Chromecast. Quality, playback speed, chapters and fullscreen retain their own toolbar entries. Native platform availability is preserved for remote playback and picture-in-picture; menu actions use native Video.js controls.
- Visible keyboard focus, reduced-motion behavior, loading and error states.

## Time lens and chapters

Hold and drag the timeline to unfold a corresponding decoded video frame upward
from a narrow cut at the seek point. The chapter title, precise timestamp and
moving ruler share a fixed central axis. Near the ends, the panel stays inside the
player and a short diagonal tether connects that axis to the actual seek point.
On a short player the image height contracts to keep the readout inside the frame.
Releasing or canceling ends scrubbing and frame requests immediately, then folds
the frozen panel back into the timeline. A quick new drag interrupts that fold.
Leaving the window, hiding the page or pressing Escape closes it immediately;
reduced-motion users also get immediate closing. Hover alone does not reveal it.

The default demo decodes a local silent preview MP4 with dense keyframes, rather than starting a second HLS streaming session for every drag. A decoder can seek as soon as metadata is available; it does not wait for an initial decoded frame first. An offscreen layout box preserves frame production in browsers, and a watchdog prevents a stalled request from leaving “Finding frame…” indefinitely. A later drag can retry.

The fine ruler moves under a fixed center cursor. Playback speed changes its scale: one source second is 32 px at 1×, 16 px at 2×, and 64 px at 0.5×. Main duration, timestamps, chapter boundaries and decoded-frame times always remain **source video time**.

Chapter metadata is shown in three places:

- Segments in the main timeline.
- A topic label in the time lens at the previewed position.
- A current-chapter control opening a keyboard-operable jump menu.

The default film has `public/media/steel/chapters.vtt`, an authored editorial chapter track. With no chapter track, the player uses an uninterrupted timeline and hides chapter navigation. It does not analyze speech or invent topics.

## Subtitles

Settings contains a captions switch and a language page populated from actual `captions`/`subtitles` tracks, including in-band HLS tracks. Turning captions back on remembers the previously selected track. Chapter and thumbnail tracks do not appear in the language list. The Language page includes Off, which also synchronizes the Caption switch. With no captions, the switch is disabled with an “Unavailable” tooltip and the language entry is hidden; viewing modes remain available independently. Menu highlights share the skin’s cut-corner shape. Scrollbar colors are scoped to player descendants; page scrollbars are untouched.

The default film includes real **English** and **Français** dialogue subtitles, off by default. Dialogue begins at approximately 0:23; jump to the “On the bridge” chapter to compare languages. Set `VITE_CAPTIONS_SRC` to your own WebVTT URL, `VITE_CAPTIONS_LANG` to its language and `VITE_CAPTIONS_LABEL` to its visible name. Set `VITE_CAPTIONS_SRC=none` to disable the default tracks. A host can pass multiple `{ src, language, label, kind }` entries as `captionTracks` to `createCutframe`.

## Language

The entire demo page defaults to English (`<html lang="en">`). The player’s `<media-i18n>` provider follows the nearest ancestor `lang`; authored copy follows the same source. Core controls use Video.js language packs. Authored feedback supports English, Simplified/Traditional Chinese, French, Spanish and Japanese; other custom copy falls back to English.

- `VITE_SKIN_LANG=auto` follows the page.
- Set `VITE_SKIN_LANG=fr`, etc., to override the player language.
- An environment object in `src/environments.js` can set `skinLanguage: 'fr'` for an individual environment.

## Replace the footage

Copy `.env.example` to `.env.local` and configure:

```dotenv
VITE_VIDEO_SRC=/media/my-hls/master.m3u8
VITE_VIDEO_POSTER=/media/my-poster.jpg
VITE_PREVIEW_SRC=/media/my-original.mp4
VITE_CHAPTERS_SRC=/media/my-chapters.vtt
VITE_CAPTIONS_SRC=/media/my-subtitles.vtt
VITE_CAPTIONS_LANG=en
VITE_CAPTIONS_LABEL=English
VITE_SKIN_LANG=auto
```

Put local files in `public/media/`. Chapter configuration is optional; the demo chapter track is automatically used only for the bundled demo source.

An `.m3u8` URL uses Video.js's `<hlsjs-video>` component and exposes the stream's rendition list automatically. An MP4 URL uses a native `<video>` and hides the quality control. `VITE_PREVIEW_SRC` is optional: it can name a timeline-aligned MP4 to keep frame decoding lightweight; otherwise the preview decoder uses the playback source, including HLS. Remote manifests, segments and preview media must allow CORS for streaming and canvas previews. The official hls.js adapter prefers MSE where supported to expose real quality controls; browser-native playback remains its fallback. An unsupported preview source shows a message without disabling playback controls.

Default media: [Tears of Steel](https://mango.blender.org/about/), (CC) Blender Foundation, CC BY 3.0. The complete film and its credit scroll remain on the public Shaka demo host. The local manifest lists seven real source renditions; English/French subtitles, an extracted poster and a time-aligned preview MP4 are included. The opening has a black lead-in, so the cover uses the clear frame at 0:12. See [MEDIA.md](MEDIA.md) for source URLs, attribution and reproduction commands. The main stream requires an internet connection.

The original Oceans MP4 and its three-rendition local HLS ladder remain as a development fallback. Set `VITE_VIDEO_SRC=/media/oceans-hls/master.m3u8` to use it. No FFmpeg installation is needed to run or deploy the project; `scripts/prepare-demo-hls.mjs` only regenerates that legacy ladder.

## Remote playback and mobile

Google Cast uses the official `@videojs/google-cast` extension. Its SDK loads in supported Chromium browsers. No reachable receiver means a disabled Cast button; unsupported routes are hidden. AirPlay appears when Safari reports an available receiver.

A receiver must reach the video URL itself. It cannot fetch a development computer’s `127.0.0.1` URL. The bundled demo supplies its identical public original URL for Cast; set `VITE_CAST_SRC` to a matching public video for your own source.

Mobile inline playback retains the skin (`playsinline`). Element fullscreen keeps it too, while platforms such as iPhone Safari can use the native full-screen player. iOS may hide programmatic volume adjustment while retaining mute. Desktop is the primary visual focus; mobile keeps responsive controls, chapter navigation and touch seeking.

Receiver connections have not been validated on physical devices. Per the user’s request, visual inspection and screenshots are left to the user. The frame regression check uses a background browser test page and reads decoded times and canvas pixel statistics; it does not capture or inspect screenshots.

## GitHub and Vercel

This directory is already initialized as a local Git repository. Create an empty GitHub repository, then run:

```sh
git add .
git commit -m "Build Cutframe Video.js v10 skin"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

Import that repository into Vercel: **Vite**, build command `npm run build`, output directory `dist`. `vercel.json` is included. No backend, database or sign-in is required.

Shareable environments: `/?theme=paper`, `/?theme=punch`, `/?theme=night`.

No GitHub push, deployment or contest submission has been performed here. See [SUBMISSION.md](SUBMISSION.md) for a truthful description and recording outline.

## Source

```text
src/skin.js              Video.js composition and controls
src/cutframe.js          Browser source entry for host integrations
src/skin.css             Reusable skin geometry, states and motion
src/icons.js             Player-scoped icon rendering
src/preview.js           Exact-frame decoding and scrubbing lifecycle
src/lens-motion.js       Interruptible time-lens reveal and release lifecycle
src/poster.js            Cover lifecycle independent of HLS preload timestamps
src/demo-media.js        Default film, matching preview/cast routes and subtitle tracks
src/ruler.js             Moving, rate-aware fine time ruler
src/chapters.js          Chapter normalization, current topic and jump menu
src/settings.js          Grouped viewing modes, subtitle switch and language selection
src/palette.js           Color parsing, grouping, role selection and contrast
src/page-adapter.js      Computed-style sampling and automatic adaptation
src/environments.js      Three independent page layouts
src/page.css             Actual host-page styles; no player palette tokens
src/localization.js      Authored copy and page-language following
src/theme-transition.js  Interruptible layout transitions with live video
src/config.js            Media, chapters and language settings
tests/                   Decode, ruler, chapters, color, locale and race checks
public/media/            Demo MP4, HLS ladder, poster and chapter track
```

Code: Apache-2.0. Demo footage retains its original rights.
