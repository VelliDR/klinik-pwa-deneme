/**
 * KLİNİK KARAR DESTEK ASİSTANI - YEREL SVG İKON MODÜLÜ
 * 
 * Saf TypeScript / Vanilla SVG ikon yardımcıları.
 * Dış bağımlılık (React, Lucide-React, harici CDN) içermez, %100 çevrimdışıdır.
 */

export type IconName =
  | 'zap'
  | 'emergency'
  | 'user'
  | 'stethoscope'
  | 'flask'
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
  | 'search'
  | 'copy'
  | 'print'
  | 'eye'
  | 'settings'
  | 'refresh'
  | 'calendar'
  | 'bookOpen'
  | 'clock'
  | 'sparkles';

const ICONS: Record<IconName, string> = {
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

  // Uyarı Dairesi (🛑)
  alertCircle: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,

  // Kilit (🔒)
  lock: `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>`,

  // Onay (✓)
  check: `<polyline points="20 6 9 17 4 12"/>`,

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

  // Akıllı / Parlaklık
  sparkles: `<path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M7.757 16.243l-2.121 2.121m12.728 0l-2.121-2.121M7.757 7.757L5.636 5.636"/>`
};

/**
 * Belirtilen isimdeki SVG ikonunu HTML stringi olarak döndürür.
 */
export function getSvgIcon(name: IconName, className: string = 'w-4 h-4 shrink-0'): string {
  const inner = ICONS[name] || ICONS.zap;
  return `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
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
      return getSvgIcon('alertCircle', className || 'w-4 h-4 text-rose-500 shrink-0');
    case 'warning':
      return getSvgIcon('alertTriangle', className || 'w-4 h-4 text-amber-500 shrink-0');
    case 'locked':
      return getSvgIcon('lock', className || 'w-4 h-4 text-slate-400 shrink-0');
    case 'success':
      return getSvgIcon('check', className || 'w-4 h-4 text-emerald-500 shrink-0');
    case 'info':
    default:
      return getSvgIcon('shield', className || 'w-4 h-4 text-sky-400 shrink-0');
  }
}
