/**
 * KLİNİK KARAR DESTEK ASİSTANI - TEMA YÖNETİCİSİ (LIGHT / DARK TOGGLE)
 * 
 * Gece nöbetlerinde karanlık mod, gündüz poliklinik ışığında parlak/temiz
 * aydınlık mod arasında kusursuz geçiş ve localStorage kalıcılığı sağlar.
 */

import { getSvgIcon } from './icons';

const THEME_STORAGE_KEY = 'klinik_theme_mode';

export function isLightTheme(): boolean {
  if (typeof document === 'undefined' || !document.documentElement || !document.documentElement.classList) {
    return false;
  }
  return document.documentElement.classList.contains('light-theme');
}

function syncThemeButtonUi(
  btnId: string,
  iconId: string,
  textId: string,
  isLight: boolean
): void {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  const toggleBtn = document.getElementById(btnId);
  const toggleIcon = document.getElementById(iconId);
  const toggleText = document.getElementById(textId);

  if (isLight) {
    if (toggleIcon) toggleIcon.innerHTML = getSvgIcon('sun', 'w-4 h-4');
    if (toggleText) toggleText.textContent = 'Aydınlık';
    if (toggleBtn) {
      toggleBtn.setAttribute('title', 'Karanlık moda geç (Nöbet / Gece)');
      toggleBtn.classList.remove('bg-slate-800', 'text-slate-300', 'border-slate-700');
      toggleBtn.classList.add('bg-amber-100', 'text-amber-900', 'border-amber-300');
    }
  } else {
    if (toggleIcon) toggleIcon.innerHTML = getSvgIcon('moon', 'w-4 h-4');
    if (toggleText) toggleText.textContent = 'Karanlık';
    if (toggleBtn) {
      toggleBtn.setAttribute('title', 'Aydınlık moda geç (Poliklinik / Gündüz)');
      toggleBtn.classList.remove('bg-amber-100', 'text-amber-900', 'border-amber-300');
      toggleBtn.classList.add('bg-slate-800', 'text-slate-300', 'border-slate-700');
    }
  }
}

export function applyTheme(isLight: boolean): void {
  if (typeof document === 'undefined' || !document.documentElement || !document.documentElement.classList) {
    return;
  }
  const root = document.documentElement;

  if (isLight) {
    root.classList.add('light-theme');
    root.classList.remove('dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    } catch {
      // ignore storage errors
    }
  } else {
    root.classList.remove('light-theme');
    root.classList.add('dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } catch {
      // ignore storage errors
    }
  }

  syncThemeButtonUi('btn-theme-toggle', 'theme-toggle-icon', 'theme-toggle-text', isLight);
  syncThemeButtonUi('btn-mobile-theme-toggle', 'mobile-theme-toggle-icon', 'mobile-theme-toggle-text', isLight);
}

export function toggleTheme(): boolean {
  const currentlyLight = isLightTheme();
  const nextLight = !currentlyLight;
  applyTheme(nextLight);
  return nextLight;
}

export function initTheme(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // ignore
  }

  if (saved === 'light') {
    applyTheme(true);
  } else if (saved === 'dark') {
    applyTheme(false);
  } else {
    // Varsayılan: Klinik PWA göz yormayan koyu arduvaz tabanlıdır
    applyTheme(false);
  }
}
