/**
 * KLİNİK KARAR DESTEK ASİSTANI - YAZI BOYUTU ÖLÇEKLEYİCİ (FONT SCALE MANAGER)
 *
 * Kullanıcının ekranı yatay kaydırmaya zorlamadan tüm arayüz metinlerini
 * kendi okuma konforuna göre küçültüp büyütmesini ve tercihinin saklanmasını sağlar.
 */

const FONT_SCALE_STORAGE_KEY = 'klinik_font_scale';

export const FONT_SCALE_STEPS = [0.85, 0.92, 1.0, 1.08, 1.16, 1.25] as const;
export const DEFAULT_FONT_SCALE = 1.0;

let currentScale: number = DEFAULT_FONT_SCALE;

function clampAndSnapScale(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_FONT_SCALE;
  const clamped = Math.min(1.25, Math.max(0.85, raw));
  let closest: number = FONT_SCALE_STEPS[0];
  let bestDiff = Math.abs(clamped - closest);
  for (const step of FONT_SCALE_STEPS) {
    const diff = Math.abs(clamped - step);
    if (diff < bestDiff) {
      bestDiff = diff;
      closest = step;
    }
  }
  return closest;
}

export function getFontScale(): number {
  return currentScale;
}

export function applyFontScale(scale: number): number {
  const nextScale = clampAndSnapScale(scale);
  currentScale = nextScale;

  if (typeof document !== 'undefined' && document.documentElement) {
    const root = document.documentElement;
    if (root.style) {
      root.style.fontSize = `${(16 * nextScale).toFixed(2)}px`;
    }
    if (root.dataset) {
      root.dataset.fontScale = String(Math.round(nextScale * 100));
    }
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(nextScale));
    }
  } catch {
    // Depolama erişim hatalarını sessizce yoksay
  }

  syncFontScaleControls(nextScale);
  return nextScale;
}

export function stepFontScale(delta: -1 | 1): number {
  const currentIdx = FONT_SCALE_STEPS.indexOf(currentScale as (typeof FONT_SCALE_STEPS)[number]);
  const baseIdx = currentIdx === -1 ? FONT_SCALE_STEPS.indexOf(DEFAULT_FONT_SCALE) : currentIdx;
  const nextIdx = Math.min(FONT_SCALE_STEPS.length - 1, Math.max(0, baseIdx + delta));
  return applyFontScale(FONT_SCALE_STEPS[nextIdx]);
}

export function resetFontScale(): number {
  return applyFontScale(DEFAULT_FONT_SCALE);
}

function syncFontScaleControls(scale: number): void {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  const pctText = `${Math.round(scale * 100)}%`;
  const isAtMin = scale <= FONT_SCALE_STEPS[0];
  const isAtMax = scale >= FONT_SCALE_STEPS[FONT_SCALE_STEPS.length - 1];

  const labels = ['font-scale-label', 'mobile-font-scale-label'];
  for (const id of labels) {
    const el = document.getElementById(id);
    if (el) el.textContent = pctText;
  }

  const decButtons = ['btn-font-dec', 'btn-mobile-font-dec'];
  for (const id of decButtons) {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = isAtMin;
      btn.setAttribute('aria-disabled', String(isAtMin));
      btn.classList?.toggle('opacity-40', isAtMin);
      btn.classList?.toggle('cursor-not-allowed', isAtMin);
    }
  }

  const incButtons = ['btn-font-inc', 'btn-mobile-font-inc'];
  for (const id of incButtons) {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = isAtMax;
      btn.setAttribute('aria-disabled', String(isAtMax));
      btn.classList?.toggle('opacity-40', isAtMax);
      btn.classList?.toggle('cursor-not-allowed', isAtMax);
    }
  }
}

export function initFontScale(): void {
  let saved: string | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      saved = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    }
  } catch {
    // Depolama erişim hatalarını sessizce yoksay
  }

  const parsed = saved ? Number(saved) : DEFAULT_FONT_SCALE;
  applyFontScale(Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FONT_SCALE);
}
