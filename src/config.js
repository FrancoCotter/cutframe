import { steelDemo } from './demo-media.js';

export const videoSource = import.meta.env.VITE_VIDEO_SRC || steelDemo.source;
const isSteelDemo = videoSource === steelDemo.source;
const isOceansDemo = ['/media/oceans.mp4', '/media/oceans-hls/master.m3u8'].includes(videoSource);
export const videoPoster = import.meta.env.VITE_VIDEO_POSTER || (isSteelDemo ? steelDemo.poster : isOceansDemo ? '/media/oceans-poster.jpg' : '');
export const videoTitle = import.meta.env.VITE_VIDEO_TITLE || (isSteelDemo ? steelDemo.title : isOceansDemo ? 'Oceans' : 'Featured film');
export const videoSubtitle = isSteelDemo ? steelDemo.subtitle : 'AN OBSERVATION IN MOTION';
export const previewSource = import.meta.env.VITE_PREVIEW_SRC || (isSteelDemo ? steelDemo.previewSource : isOceansDemo ? '/media/oceans.mp4' : videoSource);
// A receiver cannot fetch 127.0.0.1. The bundled demo has an identical public source.
export const castSource = import.meta.env.VITE_CAST_SRC || (isSteelDemo ? steelDemo.upstream : isOceansDemo ? 'https://vjs.zencdn.net/v/oceans.mp4' : '');
export const skinLanguage = import.meta.env.VITE_SKIN_LANG || 'auto';
export const chaptersSource = import.meta.env.VITE_CHAPTERS_SRC || (isSteelDemo ? steelDemo.chapters : isOceansDemo ? '/media/oceans-chapters.vtt' : '');
const captionSource = import.meta.env.VITE_CAPTIONS_SRC || (isOceansDemo ? '/media/oceans-subtitles-en.vtt' : '');
const captionLanguage = import.meta.env.VITE_CAPTIONS_LANG || 'en';
export const captionTracks = isSteelDemo && !import.meta.env.VITE_CAPTIONS_SRC ? steelDemo.captions : captionSource && captionSource !== 'none' ? [{
  src: captionSource, language: captionLanguage,
  label: import.meta.env.VITE_CAPTIONS_LABEL || (isOceansDemo && !import.meta.env.VITE_CAPTIONS_SRC ? 'English (demo)' : captionLanguage === 'en' ? 'English' : captionLanguage),
}] : [];
