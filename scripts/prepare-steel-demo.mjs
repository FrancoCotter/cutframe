import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Small manifests and real subtitles only; the complete film remains remotely hosted.
const base = 'https://storage.googleapis.com/shaka-demo-assets/tos/';
const directory = new URL('../public/media/steel/', import.meta.url);
await mkdir(directory, { recursive: true });
const response = await fetch(`${base}hls.m3u8`);
if (!response.ok) throw new Error(`Manifest: HTTP ${response.status}`);
const original = await response.text();
const manifest = original.split('\n').filter(line => !line.startsWith('#EXT-X-MEDIA:TYPE=SUBTITLES'))
  .map(line => {
    if (line && !line.startsWith('#')) return new URL(line, base).href;
    return line.replace(/,SUBTITLES="[^"]*"/g, '')
      .replace(/URI="([^"]+)"/g, (_, uri) => `URI="${new URL(uri, base).href}"`);
  }).join('\n');
await writeFile(new URL('master.m3u8', directory), manifest);
await Promise.all(['en', 'fr'].map(async language => {
  const source = `https://tears-of-steel-subtitles.s3.amazonaws.com/tears-${language}.vtt`;
  const captions = await fetch(source);
  if (!captions.ok) throw new Error(`Captions ${language}: HTTP ${captions.status}`);
  await writeFile(new URL(`${language}.vtt`, directory), (await captions.text()).replaceAll('\r\n', '\n'));
}));
console.log(`Prepared ${fileURLToPath(directory)} with seven source renditions and English/French subtitles.`);
