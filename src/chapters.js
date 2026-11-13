import { formatTime, clamp } from './time.js';

export function normalizeChapters(cues, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const ordered = Array.from(cues || []).map(cue => ({
    start: clamp(Number(cue.startTime), 0, duration),
    end: clamp(Number(cue.endTime), 0, duration),
    title: String(cue.text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
  })).filter(cue => Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.start < cue.end)
    .sort((a, b) => a.start - b.start);
  const unique = ordered.filter((cue, index) => index === 0 || cue.start !== ordered[index - 1].start);
  return unique.map((cue, index) => ({ ...cue, end: Math.min(cue.end, unique[index + 1]?.start ?? duration) }))
    .filter(cue => cue.end > cue.start);
}

export function chapterAt(chapters, time) {
  return chapters.findIndex((chapter, index) => time >= chapter.start &&
    (time < chapter.end || (index === chapters.length - 1 && time === chapter.end)));
}

export function bindChapters(surface, provider, lens, locale) {
  const trigger = surface.querySelector('.cf-chapter-trigger');
  const label = surface.querySelector('.cf-current-chapter');
  const list = surface.querySelector('.cf-chapter-list');
  const menu = surface.querySelector('.cf-chapter-menu');
  const fallbackTitle = surface.querySelector('.cf-dock-title');
  let sourceCues;
  let sourceDuration;
  let chapters = [];
  let active = -2;
  let language = '';
  let openFrame = 0;

  function focusCurrentChapter(event) {
    cancelAnimationFrame(openFrame);
    if (!event.detail.open) return;
    // Wait for the popup to become visible, before Video.js's first-item fallback.
    openFrame = requestAnimationFrame(() => {
      openFrame = 0;
      if (event.defaultPrevented || !menu.open) return;
      const current = list.querySelector('[data-current]');
      if (!current) return;
      menu.menu?.highlight(current, { preventScroll: true });
      // Reveal the chapter inside the list without scrolling the host page.
      const row = current.getBoundingClientRect();
      const viewport = list.getBoundingClientRect();
      if (row.top < viewport.top) list.scrollTop += row.top - viewport.top;
      else if (row.bottom > viewport.bottom) list.scrollTop += row.bottom - viewport.bottom;
    });
  }
  menu.addEventListener('open-change', focusCurrentChapter);

  function build() {
    list.replaceChildren();
    chapters.forEach((chapter, index) => {
      const item = document.createElement('media-menu-item');
      item.className = 'cf-chapter-option';
      const time = document.createElement('span');
      time.className = 'cf-chapter-time';
      time.textContent = formatTime(chapter.start);
      const title = document.createElement('span');
      title.className = 'cf-chapter-name';
      title.textContent = chapter.title || `${locale.text('chapter')} ${index + 1}`;
      item.append(time, title);
      item.addEventListener('click', () => {
        provider.store.seek(chapter.start).catch(() => {});
        menu.close();
      });
      list.append(item);
    });
    surface.toggleAttribute('data-has-chapters', chapters.length > 0);
    fallbackTitle.hidden = chapters.length > 0;
    active = -2;
    lens.setChapters(chapters);
  }

  return {
    destroy() {
      cancelAnimationFrame(openFrame);
      menu.removeEventListener('open-change', focusCurrentChapter);
    },
    sync(cues, time, duration) {
      const nextLanguage = locale.text('chapters');
      if (cues !== sourceCues || duration !== sourceDuration || language !== nextLanguage) {
        sourceCues = cues;
        sourceDuration = duration;
        language = nextLanguage;
        chapters = normalizeChapters(cues, duration);
        build();
      }
      const index = chapterAt(chapters, time);
      if (index === active) return;
      active = index;
      const title = index < 0 ? locale.text('chapters') : chapters[index].title || `${locale.text('chapter')} ${index + 1}`;
      label.textContent = title;
      trigger.setAttribute('aria-label', `${locale.text('chapters')}: ${title}`);
      trigger.title = `${locale.text('chapters')}: ${title}`;
      Array.from(list.children).forEach((item, i) => {
        item.toggleAttribute('data-current', i === index);
        if (i === index) item.setAttribute('aria-current', 'true');
        else item.removeAttribute('aria-current');
      });
    },
  };
}
