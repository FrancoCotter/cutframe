const dictionaries = {
  en: {
    player: 'Cutframe video player', controls: 'Video controls', loading: 'Loading…',
    locating: 'Finding frame…', previewUnavailable: 'Frame preview unavailable',
    sourceFrame: 'Source frame', timePreview: 'Time preview', speed: 'Playback speed',
    captions: 'Captions', pip: 'Picture in picture', airplay: 'Play with AirPlay', close: 'Close',
    castUnavailable: 'No Chromecast devices found', castUnsupported: 'Chromecast is not supported by this browser',
    castConnected: 'Casting — click to disconnect', cast: 'Cast to Chromecast',
    forward: 'Forward', backward: 'Rewind', sourceTime: 'Source time',
  },
  zh: {
    player: 'Cutframe 视频播放器', controls: '视频控制', loading: '加载中…', locating: '正在定位画面…',
    previewUnavailable: '画面预览暂不可用', sourceFrame: '对应画面', timePreview: '时间预览', speed: '播放速度',
    captions: '字幕', pip: '画中画', airplay: '通过 AirPlay 播放', close: '关闭',
    castUnavailable: '未发现 Chromecast 设备', castUnsupported: '此浏览器不支持 Chromecast',
    castConnected: '正在投屏，点击断开', cast: '投屏到 Chromecast', forward: '快进', backward: '后退', sourceTime: '视频原始时间',
  },
  'zh-Hant': {
    player: 'Cutframe 影片播放器', controls: '影片控制', loading: '載入中…', locating: '正在定位畫面…',
    previewUnavailable: '暫時無法預覽畫面', sourceFrame: '對應畫面', timePreview: '時間預覽', speed: '播放速度',
    captions: '字幕', pip: '子母畫面', airplay: '透過 AirPlay 播放', close: '關閉',
    castUnavailable: '找不到 Chromecast 裝置', castUnsupported: '此瀏覽器不支援 Chromecast',
    castConnected: '正在投放，點擊中斷', cast: '投放至 Chromecast', forward: '快轉', backward: '倒轉', sourceTime: '影片原始時間',
  },
  fr: {
    player: 'Lecteur vidéo Cutframe', controls: 'Commandes vidéo', loading: 'Chargement…', locating: 'Recherche de l’image…',
    previewUnavailable: 'Aperçu indisponible', sourceFrame: 'Image source', timePreview: 'Aperçu temporel', speed: 'Vitesse de lecture',
    captions: 'Sous-titres', pip: 'Image dans l’image', airplay: 'Lire avec AirPlay', close: 'Fermer',
    castUnavailable: 'Aucun appareil Chromecast détecté', castUnsupported: 'Chromecast non pris en charge',
    castConnected: 'Diffusion en cours — cliquer pour arrêter', cast: 'Diffuser sur Chromecast', forward: 'Avancer', backward: 'Reculer', sourceTime: 'Temps source',
  },
  es: {
    player: 'Reproductor de vídeo Cutframe', controls: 'Controles de vídeo', loading: 'Cargando…', locating: 'Buscando fotograma…',
    previewUnavailable: 'Vista previa no disponible', sourceFrame: 'Fotograma', timePreview: 'Vista temporal', speed: 'Velocidad',
    captions: 'Subtítulos', pip: 'Imagen en imagen', airplay: 'Reproducir con AirPlay', close: 'Cerrar',
    castUnavailable: 'No se encontraron dispositivos Chromecast', castUnsupported: 'Chromecast no es compatible',
    castConnected: 'Transmitiendo — pulsa para desconectar', cast: 'Transmitir a Chromecast', forward: 'Avanzar', backward: 'Retroceder', sourceTime: 'Tiempo original',
  },
  ja: {
    player: 'Cutframe 動画プレーヤー', controls: '動画コントロール', loading: '読み込み中…', locating: 'フレームを検索中…',
    previewUnavailable: 'プレビューを表示できません', sourceFrame: '元のフレーム', timePreview: '時間プレビュー', speed: '再生速度',
    captions: '字幕', pip: 'ピクチャーインピクチャー', airplay: 'AirPlay で再生', close: '閉じる',
    castUnavailable: 'Chromecast が見つかりません', castUnsupported: 'Chromecast は利用できません',
    castConnected: 'キャスト中 — クリックして切断', cast: 'Chromecast にキャスト', forward: '早送り', backward: '巻き戻し', sourceTime: '元の時間',
  },
};

const chapterWords = {
  en: { chapters: 'Chapters', chapter: 'Chapter', quality: 'Quality', auto: 'Auto' },
  zh: { chapters: '章节', chapter: '章节', quality: '清晰度', auto: '自动' },
  'zh-Hant': { chapters: '章節', chapter: '章節', quality: '畫質', auto: '自動' },
  fr: { chapters: 'Chapitres', chapter: 'Chapitre', quality: 'Qualité', auto: 'Auto' },
  es: { chapters: 'Capítulos', chapter: 'Capítulo', quality: 'Calidad', auto: 'Auto' },
  ja: { chapters: 'チャプター', chapter: 'チャプター', quality: '画質', auto: '自動' },
};
for (const [locale, words] of Object.entries(chapterWords)) Object.assign(dictionaries[locale], words);
const settingsWords = {
  en: { settings: 'Settings', captionLanguage: 'Caption language', viewing: 'Viewing', on: 'On', off: 'Off', unavailable: 'Unavailable', backToSettings: 'Back to settings' },
  zh: { settings: '设置', captionLanguage: '字幕语言', viewing: '观看方式', on: '开', off: '关', unavailable: '不可用', backToSettings: '返回设置' },
  'zh-Hant': { settings: '設定', captionLanguage: '字幕語言', viewing: '觀看方式', on: '開', off: '關', unavailable: '無法使用', backToSettings: '返回設定' },
  fr: { settings: 'Réglages', captionLanguage: 'Langue des sous-titres', viewing: 'Affichage', on: 'Oui', off: 'Non', unavailable: 'Indisponible', backToSettings: 'Retour aux réglages' },
  es: { settings: 'Ajustes', captionLanguage: 'Idioma de subtítulos', viewing: 'Visualización', on: 'Sí', off: 'No', unavailable: 'No disponible', backToSettings: 'Volver a ajustes' },
  ja: { settings: '設定', captionLanguage: '字幕の言語', viewing: '視聴方法', on: 'オン', off: 'オフ', unavailable: '利用不可', backToSettings: '設定に戻る' },
};
for (const [locale, words] of Object.entries(settingsWords)) Object.assign(dictionaries[locale], words);
const menuWords = {
  en: { settingsCaption: 'Caption', settingsLanguage: 'Language', switchingTo: 'Switching to', switchFailed: 'Could not switch quality' },
  zh: { settingsCaption: '字幕', settingsLanguage: '语言', switchingTo: '正在切换至', switchFailed: '清晰度切换失败' },
  'zh-Hant': { settingsCaption: '字幕', settingsLanguage: '語言', switchingTo: '正在切換至', switchFailed: '畫質切換失敗' },
  fr: { settingsCaption: 'Sous-titres', settingsLanguage: 'Langue', switchingTo: 'Passage à', switchFailed: 'Changement de qualité impossible' },
  es: { settingsCaption: 'Subtítulos', settingsLanguage: 'Idioma', switchingTo: 'Cambiando a', switchFailed: 'No se pudo cambiar la calidad' },
  ja: { settingsCaption: '字幕', settingsLanguage: '言語', switchingTo: '切り替え中', switchFailed: '画質を切り替えられませんでした' },
};
for (const [locale, words] of Object.entries(menuWords)) Object.assign(dictionaries[locale], words);

export function resolveLanguage(tag = '') {
  const locale = tag.trim().replaceAll('_', '-').toLowerCase();
  if (/^zh-(hant|tw|hk|mo)(-|$)/.test(locale)) return 'zh-Hant';
  const base = locale.split('-')[0];
  return Object.hasOwn(dictionaries, base) ? base : 'en';
}

export function messagesFor(tag) { return dictionaries[resolveLanguage(tag)]; }

/** The native Video.js provider and authored copy follow the same nearest lang attribute. */
export function bindSkinLanguage(surface, onChange = () => {}) {
  let tag = '';
  let words = dictionaries.en;
  function refresh(force = false) {
    const next = surface.closest('[lang]')?.getAttribute('lang') || document.documentElement.lang || 'en';
    if (!force && next === tag) return;
    tag = next;
    words = messagesFor(tag);
    surface.querySelectorAll('[data-cf-text]').forEach(node => { node.textContent = words[node.dataset.cfText] || node.textContent; });
    surface.querySelectorAll('[data-cf-label]').forEach(node => { node.setAttribute('aria-label', words[node.dataset.cfLabel]); });
    surface.querySelectorAll('[data-cf-title]').forEach(node => { node.title = words[node.dataset.cfTitle]; });
    surface.setAttribute('aria-label', words.player);
    onChange();
  }
  refresh(true);
  const observer = new MutationObserver(() => refresh());
  observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['lang'] });
  return { text: key => words[key] || dictionaries.en[key] || key, refresh, destroy: () => observer.disconnect() };
}
