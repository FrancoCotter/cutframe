# Cutframe — submission copy

## Title and tagline

**Cutframe — A player that belongs to the page.**

Demo line: **One frame. Different worlds.**

## Short description

Cutframe is a Video.js v10 skin that takes its colors and typography from the
surrounding page. Its cut-corner frame and unfolding time lens give it a consistent
identity across different visual environments. Drag the timeline to explore real
video frames, chapter context and precise source time in one focused view.

## Design statement

### Why I made Cutframe

A website already has a visual language: its typography, surfaces, links and
accents establish how it feels. I wanted the video player to participate in that
language. Integrating a video should feel like adding another part of the page,
with less work spent designing and maintaining a separate player palette.

With page adaptation enabled, Cutframe reads the rendered styles of the surrounding
content and derives a palette and font for its controls. The page supplies the
starting point. Its cut corners, control structure and motion remain consistent,
giving the player a recognizable identity as its appearance changes with context.

### Why a time lens

I designed the time lens around the way someone might look for a remembered
moment: a picture, a topic, and a position in the film. Bringing those cues
together is intended to make seeking more informed and reduce guesswork.

Press and drag the timeline, and a lens unfolds upward from a narrow cut at the
seek point. A decoded video frame, chapter title when available, and precise time
readout sit on a shared central axis. The fine ruler moves beneath a fixed cursor,
giving the drag a continuous sense of position. At the timeline's edges, a short
diagonal connection keeps the panel linked to the seek point while the frame
stays inside the player.

The lens appears during deliberate interaction. On release, scrubbing ends
immediately and the frozen panel folds back into the timeline. A new drag can
interrupt that return. This gives seeking a clear beginning, an active state and
a conclusion, and carries the cut-corner geometry into the player's behavior.

### Built to travel between pages

Cutframe separates its reusable player from the demonstration pages. Developers
provide their media, mount the component, and optionally connect the page adapter
to the surrounding content. That adapter derives colors and typography from
existing page styles, with contrast checks and explicit overrides available.

The demo shows one player moving between Journal, Studio and Cinema: three
different layouts with different typography and visual density. The same video
element remains in place and playback continues. Each environment supplies its
own page design; the player palette is inferred from that design.

The component also responds to available media: real stream renditions populate
quality choices, supplied tracks provide captions and chapters, and the layout
adjusts to narrower screens. These are separate layers of adaptability: the page
shapes its appearance, the available width shapes its layout, and the media
determines which content controls are offered.

## Main points to emphasize

| Characteristic | Design intent | What the demo can show |
| --- | --- | --- |
| Page-derived appearance | Reduce the need to invent a separate player palette; carry the page's visual language into playback. | Switch between three distinct page designs and observe colors and typography changing. |
| Unfolding time lens | Bring image, topic and precise time together during seeking. | Hold and drag to reveal real frames, chapter context and the moving ruler. |
| Consistent identity | Give Cutframe recognizable geometry and behavior across contexts. | Cut corners, the shared central axis and the unfold/return motion persist across environments. |
| Continuous playback | Keep the viewing session intact while the surrounding design changes. | Switch environments during playback using the same player instance. |
| Reusable composition | Make the skin usable beyond the showcase. | A browser source entry accepts a mount element and media options; the page adapter is optional. |

## Adaptability, extensibility and scope

Use **“adapts to the page's visual language”** or **“derives its appearance from
the surrounding page.”** The intended benefit is that developers can start with
the design they already have, without hand-authoring a second palette for the
player.

Adaptability describes the automatic behavior already implemented. Extensibility
describes the integration points: media and track options, explicit language
selection, CSS tokens, accent overrides, and separate player and adapter APIs.
The source integration is documented in [INTEGRATION.md](INTEGRATION.md).

The appearance adapter is deterministic, client-side DOM/CSS analysis. It samples
text, links, controls, surfaces and borders, groups related colors, and selects
roles using visual weights and contrast checks. Font selection is inferred from
sampled text. The palette analysis runs locally in the browser and does not send
page content to a server.

Automatic adaptation is a starting point for integration, not a promise of a
perfect artistic match on every website. It does not analyze image pixels, video
colors or cross-origin iframe content. Broad host CSS and ancestor-dependent
selectors can affect results; stylesheet-only changes may need an explicit
refresh. Developers retain overrides for their own design requirements. This
scope supports a useful claim: **less manual theme configuration, with control
still available when needed.**

The time lens previews decoded video frames. Chapter names come from supplied
chapter metadata; no speech analysis or automatic topic generation is implied.
Playback speed changes the fine ruler's scale, while timestamps and chapter
boundaries remain in source video time. Narrow-screen layout and page-style
adaptation are separate features.

The repository provides a source-level component API and a working showcase. It
has not been published as an npm package.

## Suggested 75–90 second recording

| Approximate time | Action | Point to communicate |
| --- | --- | --- |
| 0–10 s | Show Journal and start playback. | The player belongs to the surrounding design. |
| 10–30 s | Switch to Studio, then Cinema while the video continues. Leave enough page content visible to show the different layouts. | One player derives different appearances from actual page styles. |
| 30–40 s | Optionally open “How this player adapts,” then close it. | The chosen colors have visible provenance. |
| 40–65 s | Press, drag slowly through several moments, then release. Repeat near an edge and briefly regrab during the return. | The lens connects real frames, chapter context, precise time and the unfolding interaction. |
| 65–75 s | Optionally select 2× and drag again, or jump to a chapter. | The fine ruler has a meaningful scale; chapter metadata supports navigation. |
| 75–90 s | Return to ordinary playback and finish on the complete player within its page. | “A player that belongs to the page.” |

Keep the recording focused on page adaptation and the lens. Quality, subtitles,
remote playback and other controls can be shown separately if the submission
format leaves room.

## Suggested voiceover

> I made Cutframe around a simple idea: a video player should feel like part of
> the page it lives on.
>
> With page adaptation enabled, it reads colors and typography already used by
> the surrounding content and carries them into its controls. Here, the same
> player moves through three different page designs while playback continues.
>
> Its identity comes through in the cut-corner frame and the way the time lens
> opens. Press and drag the timeline, and the lens unfolds from the seek point.
> A real video frame, chapter context and precise time share one central axis,
> while the fine ruler moves beneath the cursor.
>
> Release, and it folds back into the timeline. The interaction is there when
> you are exploring, then settles back into playback.
>
> Cutframe is built as a reusable component, with optional page adaptation and
> styling overrides. The page provides the visual language. Cutframe gives
> seeking its own character.

## Demo facts and credits

- The default film is **Tears of Steel**, (CC) Blender Foundation, CC BY 3.0.
  Source, attribution and local derivative details are in [MEDIA.md](MEDIA.md).
- The default HLS source exposes seven video renditions, from 144p to 1080p;
  the highest is 2592 × 1080. It does not contain 4K or 8K renditions.
- English/French dialogue subtitles and authored editorial chapters are included.
- The main stream is remote; the poster, subtitle resources and lightweight
  time-aligned preview video are local assets.
- This copy describes the implemented design. Check the actual submission form
  for required fields, recording length and any eligibility conditions.
- No GitHub push, deployment or contest submission has been performed by this work.
