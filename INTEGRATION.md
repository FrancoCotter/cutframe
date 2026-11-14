# Integration options

Start with the working example in [README.md](README.md). Import `createCutframe` and `createPageAdapter` from the browser entry `src/cutframe.js`; the demo pages and their media defaults are separate.

Connect the page adapter once to enable automatic DOM/CSS and readable Canvas/WebGL adaptation. You do not need separate page-theme presets, required color tokens or a second WebGL adapter. `createCutframe()` does not create the adapter internally; without that connection the player uses its fallback appearance. Automatic adaptation covers the supported sources described below, rather than every possible browser-composited background.

## Player options

Pass these as the second argument to `createCutframe(mount, options)`:

| Option | Purpose |
| --- | --- |
| `source` | Required HLS (`.m3u8`) or MP4 URL. |
| `poster` | Optional opening cover image URL. |
| `previewSource` | Optional time-aligned preview video URL. Defaults to `source`; no extra MP4 is required. |
| `title`, `subtitle` | Film labels. |
| `chaptersSource` | Optional WebVTT chapter URL. |
| `captionTracks` | Array of `{ src, language, label, kind }`. Use `subtitles` or `captions` for `kind`. |
| `language` | `auto` follows the nearest ancestor `lang`; a language tag overrides it. |
| `castSource` | Optional matching public video URL reachable by a Cast receiver. |
| `keyboardTarget` | Defaults to `player`; use `document` for global Space/Left/Right shortcuts on a single-player page. |

Quality options follow the actual stream renditions. Chapters and subtitles use supplied or in-band metadata. Remote media must allow cross-origin playback and canvas access for frame previews.

## Appearance and cleanup

Connect `createPageAdapter(pageContent, player.surface)` to representative surrounding content and call `adapter.refresh()`. Existing page styles provide the inputs; no page restyling is required. Cutframe excludes itself from sampling. Add `data-palette-ignore` to unrelated host UI within that content. The adapter observes content and ancestor class/style changes; call `refresh()` after stylesheet-only changes and `refresh({ reset: true })` after route or scene structure changes.

Without the adapter, set `--cutframe-background`, `--cutframe-surface`, `--cutframe-foreground`, `--cutframe-muted`, `--cutframe-accent`, `--cutframe-accent-foreground`, and `--cutframe-font` on the mount for explicit styling. With the adapter active, it writes its derived palette and typography on `player.surface`, taking precedence over inherited mount tokens. Use the [host color overrides](#manual-color-overrides) to customize its palette. Legacy `--media-accent-color` and `--media-accent-text-color` override its accent pair directly.

The page adapter also follows the dominant body font’s weight, italic style and letter spacing through `--cutframe-font-weight`, `--cutframe-font-style` and `--cutframe-letter-spacing`. It preserves control font sizes for usability. Responsive controls follow the player’s container width, including narrow embeds on a wide page. Use the demo’s Style Lab to inspect the resulting palette and typography with custom host styles.

The returned player exposes `surface`, `video`, `lens`, `closeMenus()`, `setLanguage(tag)`, and `destroy()`. Create it after mounting in the browser. On unmount, destroy the adapter first, then the player. Destroy the old instance before mounting a replacement.

## Automatic canvas / WebGL adaptation

WebGL is a renderer, not a visual style: the same path handles flat colors, monochrome, multi-color art, a lit model or an animated flow. By default the adapter searches the document's first 64 canvases for a visible, opaque, unfiltered canvas overlapping at least 60% of the player's visible area. It excludes the player, preview decoders and measurement copies. The largest overlapping candidate wins. It never creates a rendering context on a host canvas or modifies renderer state. Use a local content wrapper for representative DOM typography and colors.

Five patches are placed relative to the player: top, bottom, left, right and center. Each covers 100×100 CSS pixels by default, clamped to the canvas bounds, then is analyzed at 20×20 pixels. Coordinates are mapped to the canvas backing resolution, independently of CSS size or device pixel ratio. Center reads the **background canvas**, never a screenshot containing the video. The adapter reads the canvas before CSS compositing; those pixels may differ from the final browser composition.

Color histograms retain separate hues, with nearby colors clustered in Lab space. Bottom carries weight 2; top/left/right weight 1; center weight 0.5. A dominant group with at least 92% of retained weight is classified as uniform. A single-color scene uses a tonal accent; a multicolor scene can use a sufficiently prominent secondary group. Text meets 4.5:1 and accents meet 3:1 against the resulting solid surface. Minor noise and brief flashes are held; a persistent change commits a new target palette, which is then animated independently of sampling.

### Smooth color transitions and cost

The default transition lasts 1000ms with a smooth easing curve and CIELab color interpolation. A finite RAF chain starts only when the target colors change, retargets from the currently displayed palette, and stops at the exact destination. Repeated samples with the same target do not restart it. The initial palette is applied immediately. Offscreen/hidden players finish at the target and cancel queued color frames; reduced-motion users receive immediate updates.

Each animation frame only calculates colors and writes changed CSS color tokens on the player. It does not sample canvas pixels, clone the page, read layout or rerender the video. Color changes still cause style recalculation/paint and are not guaranteed compositor-only or free. `maxFps` caps color writes (RAF callbacks can follow a faster display while the finite transition is active). Actual device/browser profiling is still needed. Background rendering and the low-frequency sampling timer are independent of this color animation chain.

Rounded intermediate colors are checked on every written frame: text/muted and play-button text meet 4.5:1, and accents meet 3:1 against the panel. Accent colors can be moved toward a readable tonal endpoint. A large light/dark transition may require a discrete text-polarity switch: fading white text through gray to black cannot preserve 4.5:1 throughout on a fixed midtone surface. CSS palette transitions are disabled while the RAF animator owns the colors, so the browser does not interpolate them a second time.

```js
const adapter = createPageAdapter(content, player.surface, onAdapt, {
  transition: { duration: 1000, maxFps: 60 }, // duration 0–3000ms; write cap 15–120fps
});
adapter.setTransition({ duration: 1600, maxFps: 30 });
adapter.setTransition(false); // immediate; finishes any active transition
adapter.setTransition(true);  // restore the default 1000ms duration
```

`adapter.profile` describes the latest target. `adapter.renderedPalette` describes the currently written colors. `adapter.transition` exposes normalized settings. `adapter.transitionStats` reports `running`, total written frames/transitions, latest and maximum frame JS time. This timing includes interpolation and token writes, **not** deferred style/paint/GPU work. `onAdapt` runs when the target profile changes and once when an animation settles; it is not called on every animation frame. Style Lab exposes Instant / 0.6s / 1s / 1.6s and shows whether the color animator is idle.

Sampling runs approximately every 500ms, with a default 1s persistence requirement and Lab change threshold 8. All five analysis patches use one `getImageData` call. The draw/copy/read operation can still synchronously stall on a GPU source: small CPU analysis size does not guarantee cheap GPU readback. Profile on your target devices with `adapter.samplingStats` (reads, successes and latest duration). Sampling pauses while the document is hidden or the player is outside the viewport. Timers, observers and overlays are removed on `destroy()`.

### Defaults and developer controls

```js
const adapter = createPageAdapter(content, player.surface, profile => {
  // Final colors, sources, scene status, regions, clusters and held automatic palette.
  console.log(profile.strategy, profile.scene);
}, {
  sampling: {
    enabled: true,
    patchSize: 100,       // CSS pixels; clamped to 24–300
    resolution: 20,       // analysis pixels per patch edge; 8–32
    interval: 500,        // milliseconds; 250–5000
    changeThreshold: 8,   // Lab distance; 2–30
    settleMs: 1000,       // milliseconds; 250–5000
    debug: false,        // visible five-region outlines
  },
});

adapter.setSampling({ interval: 1000, settleMs: 2000, debug: true });
adapter.setBackdrop(document.querySelector('#background-canvas')); // optional source override
adapter.setBackdrop(null); // return to automatic discovery
adapter.setSampling(false); // stop pixel reads; retain DOM / stable fallback
adapter.setSampling(true);
```

Normal RAF-driven Canvas/WebGL backgrounds need no renderer hook; browser checks cover both without one. A static/on-demand renderer or a different render scheduling arrangement may clear its WebGL buffer before the adapter can read it. For those cases, call `adapter.captureBackdrop(canvas)` immediately after rendering. This method honors the configured interval; it does not force reads on every frame. Supply `{ backdrop: canvas }` as an option to select the source at construction. An opaque cleared black framebuffer is indistinguishable from an intentionally black scene without renderer cooperation.

`profile.scene` reports `status`, the selected source label, `kind` (uniform/multicolor), region rectangles/dominants, current observed clusters, pending-change state and `automaticPalette`. That automatic palette remains inspectable while a manual override is active. Final effective colors remain on `profile.surface`, `foreground`, `accent`, `accentForeground` and `muted`. `adapter.sampling` exposes normalized settings; `adapter.samplingStats` exposes read counters and latest read duration.

### Manual color overrides

Priority is **valid explicit host colors → sampled scene → DOM/CSS inference or stable fallback**. Partial overrides are supported; the remaining colors continue adapting. Host input tokens are separate from adapter output tokens:

```css
.scene-content {
  --cutframe-host-surface: #261f35;
  --cutframe-host-foreground: #eee9fa;
  --cutframe-host-accent: #b9a0e8;
}
```

```js
adapter.setTheme({ surface: '#261f35', foreground: '#eee9fa', accent: '#b9a0e8' });
adapter.setTheme(); // remove JS overrides; return to CSS signals / automatic colors
```

Use opaque hex/RGB colors. `muted` and `accentForeground` are also accepted (`--cutframe-host-muted`, `--cutframe-host-accent-foreground` in CSS). Invalid/transparent signals are ignored; unsafe pairs are repaired. Direct legacy `--media-accent-*` overrides bypass these safety checks.

### Limits and fallback

Automatic adaptation does not guarantee a visual match on every website, and no coverage percentage has been measured. Automatic pixel reads currently support one readable, opaque, axis-aligned HTML canvas. They do not reconstruct multiple layered canvases, CSS gradients/filters/blending, image/video backgrounds, DOM overlay effects, rotated/perspective canvases or inaccessible iframe contents. A 3D model drawn *inside* an ordinary canvas is supported; a canvas transformed into 3D by CSS is not. Origin-tainted pixel reads are rejected with a retry backoff. Transparent frames are rejected instead of being mistaken for black. Sampling diagnostics describe source discovery and read failures; they cannot prove that the selected canvas matches the final visible composition. Use explicit colors or a suitable source if the fallback does not suit the page.

A last good palette can be held after a read failure (`scene-held`). If no valid scene is available, ordinary pages use DOM/CSS; uncertain backgrounds use an opaque neutral fallback (`stable-surface`). Use `data-cutframe-backdrop="dynamic"` on the content wrapper/ancestor for backgrounds automatic inspection cannot identify. `{ mode: 'stable' }` or `adapter.setMode('stable')` deliberately disables pixel adaptation; `setMode('auto')` restores it.

Mutation-based DOM re-measurement is limited to once per 250ms. A stable or sampled background avoids full page re-cloning during ordinary color/particle churn. Explicit reset, content-wrapper class changes and typography changes can trigger re-measurement. Call `adapter.refresh({ reset: true })` after route/scene structure changes. These contrast checks concern the solid control colors, not every accessibility requirement or ancestor CSS that changes final compositing.
