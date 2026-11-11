export const steelDemo = {
  source: '/media/steel/master.m3u8',
  upstream: 'https://storage.googleapis.com/shaka-demo-assets/tos/hls.m3u8',
  poster: '/media/steel-poster.jpg',
  // Same presentation timeline; dense keyframes and local range requests keep scrubbing responsive.
  previewSource: '/media/steel/preview.mp4',
  chapters: '/media/steel/chapters.vtt',
  title: 'Tears of Steel',
  subtitle: 'BLENDER OPEN MOVIE',
  captions: [
    { src: '/media/steel/en.vtt', language: 'en', label: 'English' },
    { src: '/media/steel/fr.vtt', language: 'fr', label: 'Français' },
  ],
};
