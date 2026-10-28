/**
 * KLİNİK KARAR DESTEK ASİSTANI - SAF SVG İKON BİLEŞENLERİ
 * 
 * 1.5px stroke kalınlığı, fill="none", stroke="currentColor"
 * Harici paket bağımlılığı içermez, sıfır bundle yükü.
 */

export interface IconProps {
  className?: string;
}

export type IconRenderer = (className?: string) => string;

export const Icons = {
  // --- SİSTEM İKONLARI ---
  Menu: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,

  Search: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,

  ChevronDown: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`,

  Check: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,

  AlertCircle: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,

  Close: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

  // --- KLİNİK / DALLAR ---
  Pulse: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,

  User: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,

  Scale: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18"/><path d="M6 7l6-4 6 4"/><path d="M6 7L3 13a3 3 0 006 0L6 7z"/><path d="M18 7l-3 6a3 3 0 006 0l-3-6z"/></svg>`,

  Droplet: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>`,

  Flask: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2v7.31a2 2 0 01-.5 1.34L3.2 18.9A2 2 0 004.7 22h14.6a2 2 0 001.5-3.1l-6.3-8.25a2 2 0 01-.5-1.34V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><path d="M7 16h10"/></svg>`,

  Pill: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 20.5l10-10a4.95 4.95 0 10-7-7l-10 10a4.95 4.95 0 107 7z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>`,

  ShieldAlert: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,

  Stethoscope: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 3v5a4.5 4.5 0 009 0V3"/><path d="M9 12.5v4.5a3 3 0 003 3h1a3 3 0 003-3V16"/><circle cx="17.5" cy="14.5" r="2.5"/><line x1="4.5" y1="3" x2="6" y2="3"/><line x1="12" y1="3" x2="13.5" y2="3"/></svg>`,

  Baby: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M9 12a3 3 0 006 0"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M12 2a4 4 0 014 4"/></svg>`,

  Activity: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,

  Heart: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,

  Lungs: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v8"/><path d="M7 6.5C4 8 3 11 3 14c0 3.5 2.5 6 6 6 1.5 0 2.5-.5 3-1.5"/><path d="M17 6.5C20 8 21 11 21 14c0 3.5-2.5 6-6 6-1.5 0-2.5-.5-3-1.5"/></svg>`,

  Package: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,

  Sparkles: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M7.757 16.243l-2.121 2.121m12.728 0l-2.121-2.121M7.757 7.757L5.636 5.636"/></svg>`,

  Copy: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,

  Print: (className: string = 'w-4 h-4'): string =>
    `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`
};

export default Icons;
