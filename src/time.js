export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function formatTime(time) {
  const seconds = Math.max(0, Math.floor(Number.isFinite(time) ? time : 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds / 60) % 60;
  const s = String(seconds % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
