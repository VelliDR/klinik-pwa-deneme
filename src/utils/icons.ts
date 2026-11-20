/**
 * KLİNİK KARAR DESTEK ASİSTANI - YEREL SVG İKON MODÜLÜ
 * 
 * Saf TypeScript / Vanilla SVG ikon yardımcıları.
 * Dış bağımlılık (React, Lucide-React, harici CDN) içermez, %100 çevrimdışıdır.
 * 1.5px / 2px homojen çizgi kalınlığı, fill="none", stroke="currentColor".
 */

export type IconName =
  | 'zap'
  | 'emergency'
  | 'user'
  | 'stethoscope'
  | 'flask'
  | 'beaker'
  | 'lungs'
  | 'microscope'
  | 'scalpel'
  | 'baby'
  | 'pill'
  | 'droplet'
  | 'heart'
  | 'activity'
  | 'shield'
  | 'shieldAlert'
  | 'shieldCheck'
  | 'alertTriangle'
  | 'alertCircle'
  | 'lock'
  | 'check'
  | 'checkCircle'
  | 'search'
  | 'copy'
  | 'print'
  | 'eye'
  | 'settings'
  | 'refresh'
  | 'calendar'
  | 'bookOpen'
  | 'clock'
  | 'sparkles'
  | 'moon'
  | 'sun'
  | 'package'
  | 'star'
  | 'syringe'
  | 'thermometer'
  | 'snowflake'
  | 'ban'
  | 'info'
  | 'clipboard'
  | 'close'
  | 'x'
  | 'pregnant'
  | 'statusDot'
  | 'chevronDown'
  | 'chevronUp'
  | 'chevronRight'
  | 'externalLink';

const ICONS: Record<IconName, string> = {
  // Ay (Karanlık Mod)
  moon: `<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>`,

  // Güneş (Aydınlık Mod)
  sun: `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`,

  // Paket / Kutu
  package: `<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>`,

  // Yıldız
  star: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,

  // Acil / Şimşek
  zap: `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>`,
  
  // Acil / Siren
  emergency: `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,

  // Hasta / Demografi
  user: `<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>`,

  // Stetoskop / Dahiliye
  stethoscope: `<path d="M4.5 3v5a4.5 4.5 0 009 0V3"/><path d="M9 12.5v4.5a3 3 0 003 3h1a3 3 0 003-3V16"/><circle cx="17.5" cy="14.5" r="2.5"/><line x1="4.5" y1="3" x2="6" y2="3"/><line x1="12" y1="3" x2="13.5" y2="3"/>`,

  // Lab / Sıvı / Beaker
  flask: `<path d="M10 2v7.31a2 2 0 01-.5 1.34L3.2 18.9A2 2 0 004.7 22h14.6a2 2 0 001.5-3.1l-6.3-8.25a2 2 0 01-.5-1.34V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><path d="M7 16h10"/>`,
  beaker: `<path d="M10 2v7.31a2 2 0 01-.5 1.34L3.2 18.9A2 2 0 004.7 22h14.6a2 2 0 001.5-3.1l-6.3-8.25a2 2 0 01-.5-1.34V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><path d="M7 16h10"/>`,

  // Akciğer / Solunum / Kan Gazı
  lungs: `<path d="M12 4v8"/><path d="M7 6.5C4 8 3 11 3 14c0 3.5 2.5 6 6 6 1.5 0 2.5-.5 3-1.5"/><path d="M17 6.5C20 8 21 11 21 14c0 3.5-2.5 6-6 6-1.5 0-2.5-.5-3-1.5"/>`,

  // Mikroskop / Nefroloji / Toksik
  microscope: `<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 10-7-7h1"/><path d="M9 14l6-6"/><path d="M12 5l3-3 4 4-3 3"/>`,

  // Cerrahi / Neşter
  scalpel: `<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/><path d="M3 21l6-6"/>`,

  // Pediatri / Çocuk
  baby: `<circle cx="12" cy="12" r="8"/><path d="M9 12a3 3 0 006 0"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M12 2a4 4 0 014 4"/>`,

  // İlaç / Kapsül
  pill: `<path d="M10.5 20.5l10-10a4.95 4.95 0 10-7-7l-10 10a4.95 4.95 0 107 7z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>`,

  // Damla / İnfüzyon
  droplet: `<path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>`,

  // Kalp / Kardiyo
  heart: `<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>`,

  // Aktivite / EKG
  activity: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,

  // Kalkan / Güvenlik
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,

  // Kalkan Uyarı
  shieldAlert: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,

  // Kalkan Onay
  shieldCheck: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>`,

  // Uyarı Üçgeni (⚠️)
  alertTriangle: `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,

  // Uyarı Dairesi (🛑 / 🚨)
  alertCircle: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,

  // Kilit (🔒)
  lock: `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>`,

  // Onay (✓)
  check: `<polyline points="20 6 9 17 4 12"/>`,

  // Yuvarlak Onay (✅)
  checkCircle: `<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,

  // Arama
  search: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,

  // Kopyala
  copy: `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>`,

  // Yazdır
  print: `<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>`,

  // Göz
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,

  // Ayarlar
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>`,

  // Yenile / Sıfırla
  refresh: `<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>`,

  // Takvim
  calendar: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,

  // Kitap / Kılavuz
  bookOpen: `<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>`,

  // Saat / Kronometre
  clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,

  // Akıllı / Parlaklık / İnci
  sparkles: `<path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M7.757 16.243l-2.121 2.121m12.728 0l-2.121-2.121M7.757 7.757L5.636 5.636"/>`,

  // Şırınga / Aşı / Enjeksiyon (💉)
  syringe: `<path d="M18 2l4 4"/><path d="M17 7l3-3"/><path d="M19 9l-4.5 4.5"/><path d="M10 8L7 5l-1.5 1.5 3 3L3 15v3h3l5.5-5.5 3 3 1.5-1.5-3-3 4-4z"/><line x1="8" y1="16" x2="2" y2="22"/>`,

  // Termometre / Ateş (🌡️)
  thermometer: `<path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>`,

  // Kar Tanesi / Soğuk Zincir (🧊)
  snowflake: `<line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/>`,

  // Yasak / Kontrendike (🚫 / 🛑)
  ban: `<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>`,

  // Bilgi / İnci (💡 / ℹ️)
  info: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`,

  // Pano / Dosya / Monograf (📋)
  clipboard: `<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>`,

  // Kapat / Çarpı (✕)
  close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  x: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,

  // Gebelik / Maternal (🤰)
  pregnant: `<circle cx="12" cy="4" r="2"/><path d="M9 8h4a3 3 0 013 3v2a4 4 0 01-4 4h-1v5H9v-7a4 4 0 014-4H9V8z"/>`,

  // Durum Noktası (🟢 / 🔴 / 🟡)
  statusDot: `<circle cx="12" cy="12" r="4" fill="currentColor"/>`,

  // Chevron Yönleri
  chevronDown: `<polyline points="6 9 12 15 18 9"/>`,
  chevronUp: `<polyline points="18 15 12 9 6 15"/>`,
  chevronRight: `<polyline points="9 18 15 12 9 6"/>`,

  // Dış Bağlantı
  externalLink: `<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>`
};

/**
 * Belirtilen isimdeki SVG ikonunu HTML stringi olarak döndürür.
 */
export function getSvgIcon(name: IconName | string, className: string = 'w-4 h-4 shrink-0'): string {
  const inner = ICONS[name as IconName] || ICONS.sparkles;
  return `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/**
 * Klinik şiddet / uyarı düzeyine göre tek renkli, ince çizgili SVG uyarı ikonu üretir.
 */
export function getSeverityIcon(
  severity: 'critical' | 'warning' | 'info' | 'locked' | 'success',
  className?: string
): string {
  switch (severity) {
    case 'critical':
      return getSvgIcon('alertCircle', className || 'w-4 h-4 text-rose-400 shrink-0');
    case 'warning':
      return getSvgIcon('alertTriangle', className || 'w-4 h-4 text-amber-400 shrink-0');
    case 'locked':
      return getSvgIcon('lock', className || 'w-4 h-4 text-slate-400 shrink-0');
    case 'success':
      return getSvgIcon('check', className || 'w-4 h-4 text-emerald-400 shrink-0');
    case 'info':
    default:
      return getSvgIcon('shield', className || 'w-4 h-4 text-sky-400 shrink-0');
  }
}

/**
 * Metin içindeki emojileri (⚠️, 🚨, 🛑, ✅, 💡 vb.) tespit edip saf SVG ikonlu profesyonel
 * klinik rozet veya temizlenmiş HTML çıktısına dönüştürür.
 * Testler motor çıktısını string olarak kontrol ettiğinde etkilenmez, yalnızca ekrana basılırken çağrılır.
 */
export function formatClinicalAlertHTML(
  rawText: string,
  options: {
    badge?: boolean;
    customIcon?: IconName;
    className?: string;
  } = {}
): string {
  if (!rawText) return '';
  
  let cleaned = rawText;
  let detectedType: 'critical' | 'warning' | 'info' | 'success' | 'locked' = 'info';

  if (cleaned.includes('🚨') || cleaned.includes('🛑')) {
    detectedType = 'critical';
  } else if (cleaned.includes('⚠️') || cleaned.includes('⚠')) {
    detectedType = 'warning';
  } else if (cleaned.includes('✅') || cleaned.includes('✓')) {
    detectedType = 'success';
  } else if (cleaned.includes('🔒')) {
    detectedType = 'locked';
  }

  // Emojileri Unicode-güvenli (/gu) olarak temizle
  cleaned = cleaned
    .replace(/(?:⚠️|⚠|🚨|🛑|✅|✓|💡|💉|💧|🫀|🧪|🛡️|🛡|🧊|🌡️|🌡|🚫|⛔|🔬|📋|🔍|🤰|🟢|🔴|🟡|📌|🔒|❄️|❄|\p{Extended_Pictographic}|\uFE0F)/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const iconName: IconName = options.customIcon || (
    detectedType === 'critical' ? 'alertCircle' :
    detectedType === 'warning' ? 'alertTriangle' :
    detectedType === 'success' ? 'check' :
    detectedType === 'locked' ? 'lock' : 'info'
  );

  const iconColor =
    detectedType === 'critical' ? 'text-rose-400' :
    detectedType === 'warning' ? 'text-amber-400' :
    detectedType === 'success' ? 'text-emerald-400' :
    detectedType === 'locked' ? 'text-slate-400' : 'text-sky-400';

  const iconSvg = getSvgIcon(iconName, `w-3.5 h-3.5 ${iconColor} shrink-0`);

  if (options.badge) {
    const badgeBg =
      detectedType === 'critical' ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' :
      detectedType === 'warning' ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' :
      detectedType === 'success' ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' :
      detectedType === 'locked' ? 'bg-slate-900 border-slate-700 text-slate-300' :
      'bg-slate-900/80 border-slate-700/60 text-slate-200';

    return `<div class="p-2 rounded-lg border ${badgeBg} flex items-start gap-2 ${options.className || ''}">${iconSvg}<span class="leading-tight">${cleaned}</span></div>`;
  }

  return `<span class="inline-flex items-center gap-1.5 ${options.className || ''}">${iconSvg}<span>${cleaned}</span></span>`;
}

/**
 * Motor çıktılarındaki satır içi emojileri (⚠️, 🚨, 🟢, 💉, 💧 vb.) doğrudan
 * satır içi (inline) monokrom/klinik SVG ikonlara dönüştürür.
 * Ham motor verilerini bozmaz; yalnızca DOM render katmanında kullanılır.
 */
export function replaceEmojisWithSvg(htmlOrText: string): string {
  if (!htmlOrText) return '';
  return htmlOrText
    .replace(/🚨|🛑/gu, () => getSvgIcon('alertCircle', 'inline-block w-3.5 h-3.5 text-rose-400 align-[-2px] mr-1 shrink-0'))
    .replace(/⚠️|⚠\uFE0F?/gu, () => getSvgIcon('alertTriangle', 'inline-block w-3.5 h-3.5 text-amber-400 align-[-2px] mr-1 shrink-0'))
    .replace(/✅|✓/gu, () => getSvgIcon('check', 'inline-block w-3.5 h-3.5 text-emerald-400 align-[-2px] mr-1 shrink-0'))
    .replace(/🟢/gu, () => getSvgIcon('statusDot', 'inline-block w-3 h-3 text-emerald-400 align-[-1px] mr-1 shrink-0'))
    .replace(/🟡/gu, () => getSvgIcon('statusDot', 'inline-block w-3 h-3 text-amber-400 align-[-1px] mr-1 shrink-0'))
    .replace(/🔴/gu, () => getSvgIcon('statusDot', 'inline-block w-3 h-3 text-rose-400 align-[-1px] mr-1 shrink-0'))
    .replace(/🔒/gu, () => getSvgIcon('lock', 'inline-block w-3.5 h-3.5 text-slate-400 align-[-2px] mr-1 shrink-0'))
    .replace(/💉/gu, () => getSvgIcon('syringe', 'inline-block w-3.5 h-3.5 text-sky-400 align-[-2px] mr-1 shrink-0'))
    .replace(/💧/gu, () => getSvgIcon('droplet', 'inline-block w-3.5 h-3.5 text-cyan-400 align-[-2px] mr-1 shrink-0'))
    .replace(/🥛|🧪/gu, () => getSvgIcon('beaker', 'inline-block w-3.5 h-3.5 text-indigo-400 align-[-2px] mr-1 shrink-0'))
    .replace(/❄️|❄\uFE0F?|🧊/gu, () => getSvgIcon('snowflake', 'inline-block w-3.5 h-3.5 text-sky-400 align-[-2px] mr-1 shrink-0'))
    .replace(/🌡️|🌡\uFE0F?/gu, () => getSvgIcon('thermometer', 'inline-block w-3.5 h-3.5 text-amber-400 align-[-2px] mr-1 shrink-0'))
    .replace(/🛡️|🛡\uFE0F?/gu, () => getSvgIcon('shield', 'inline-block w-3.5 h-3.5 text-cyan-400 align-[-2px] mr-1 shrink-0'))
    .replace(/🚫|⛔|❌/gu, () => getSvgIcon('ban', 'inline-block w-3.5 h-3.5 text-rose-400 align-[-2px] mr-1 shrink-0'))
    .replace(/💡|ℹ️|ℹ\uFE0F?|📌/gu, () => getSvgIcon('info', 'inline-block w-3.5 h-3.5 text-sky-400 align-[-2px] mr-1 shrink-0'))
    .replace(/📋/gu, () => getSvgIcon('clipboard', 'inline-block w-3.5 h-3.5 text-cyan-400 align-[-2px] mr-1 shrink-0'))
    .replace(/🔬/gu, () => getSvgIcon('microscope', 'inline-block w-3.5 h-3.5 text-cyan-400 align-[-2px] mr-1 shrink-0'))
    .replace(/🫀/gu, () => getSvgIcon('heart', 'inline-block w-3.5 h-3.5 text-rose-400 align-[-2px] mr-1 shrink-0'))
    .replace(/🤰/gu, () => getSvgIcon('pregnant', 'inline-block w-3.5 h-3.5 text-pink-400 align-[-2px] mr-1 shrink-0'))
    .replace(/\p{Extended_Pictographic}|\uFE0F/gu, '');
}

