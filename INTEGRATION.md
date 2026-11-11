# Integration options

Start with the working example in [README.md](README.md). Import `createCutframe` and `createPageAdapter` from the browser entry `src/cutframe.js`; the demo pages and their media defaults are separate.

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

Connect `createPageAdapter(pageContent, player.surface)` to the host content and call `adapter.refresh()`. Cutframe excludes itself from sampling. Add `data-palette-ignore` to unrelated host UI. Call `refresh()` after stylesheet-only changes.

For explicit styling, set `--cutframe-background`, `--cutframe-surface`, `--cutframe-foreground`, `--cutframe-muted`, `--cutframe-accent`, `--cutframe-accent-foreground`, and `--cutframe-font` on the mount. When the adapter is active, `--media-accent-color` and `--media-accent-text-color` override its accent pair.

The returned player exposes `surface`, `video`, `lens`, `closeMenus()`, `setLanguage(tag)`, and `destroy()`. Create it after mounting in the browser. On unmount, destroy the adapter first, then the player. Destroy the old instance before mounting a replacement.
