import { contrast, hex, parseColor } from './palette.js';

const opaque = value => {
  const color = typeof value === 'string' ? parseColor(value) : null;
  return color?.a === 1 ? color : null;
};
const readable = (color, surface, minimum) => color && contrast(color, surface) >= minimum;
const black = parseColor('#000000');
const white = parseColor('#ffffff');
const legible = surface => contrast(black, surface) >= contrast(white, surface) ? black : white;

/** Resolve explicit host intent against opaque surfaces, without reading scene pixels. */
export function resolveHostTheme(profile, theme = {}, stable = false) {
  const surface = opaque(theme.surface) || (stable ? parseColor('#161b22') : opaque(profile.surface));
  const wantedText = opaque(theme.foreground) || (stable ? parseColor('#f4f6f8') : opaque(profile.foreground));
  const foreground = readable(wantedText, surface, 4.5) ? wantedText : legible(surface);
  const wantedAccent = opaque(theme.accent) || opaque(profile.accent);
  const accent = readable(wantedAccent, surface, 3) ? wantedAccent : foreground;
  const wantedAccentText = opaque(theme.accentForeground) || opaque(profile.accentForeground);
  const accentForeground = readable(wantedAccentText, accent, 4.5) ? wantedAccentText : legible(accent);
  const wantedMuted = opaque(theme.muted) || opaque(profile.muted);
  const muted = readable(wantedMuted, surface, 4.5) ? wantedMuted : foreground;
  const declared = ['surface', 'foreground', 'accent', 'accentForeground', 'muted'].some(key => opaque(theme[key]));
  const origin = (key, color) => opaque(theme[key]) && hex(opaque(theme[key])) === hex(color) ? 'Host theme signal'
    : key === 'surface' && stable ? 'Stable opaque fallback' : 'Page palette / contrast safety';
  return {
    ...profile,
    background: stable || opaque(theme.surface) ? hex(surface) : profile.background,
    surface: hex(surface), foreground: hex(foreground), muted: hex(muted),
    accent: hex(accent), accentForeground: hex(accentForeground),
    strategy: declared ? 'host-theme' : stable ? 'stable-surface' : 'page-styles',
    sources: {
      ...profile.sources,
      ...(stable || declared ? {
        surface: origin('surface', surface), foreground: origin('foreground', foreground),
        accent: origin('accent', accent), accentForeground: origin('accentForeground', accentForeground),
      } : {}),
    },
  };
}
