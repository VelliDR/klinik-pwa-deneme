/**
 * TIKLANABİLİR FİYAT & VERİ TARİHİ BALONCUĞU DENETLEYİCİSİ
 *
 * Uygulamanın her yerindeki `.btn-price-date-bubble` tetikleyicilerini dinler
 * (ilaç arama fiyat rozetleri, ilaç arama başlığı, 5 sekmeli monograf SGK/Fiyat sekmesi,
 * muadil karşılaştırma modalı ve GBP aşı kartı), veri anlık görüntüsü tarihlerini,
 * eskime uyarılarını ve isteğe bağlı tam çevrimdışı KÜB paket indiricisini sade bir
 * açılır baloncuk (popover) içinde sunar.
 */

import {
  ensureDataManifestReady,
  evaluateSnapshotFreshness,
  getDataManifestSync,
  renderDataSnapshotPopoverHTML,
  renderPriceDateBubbleTriggerHTML,
  type DataSourceKey,
  type DrugPriceBubbleFocus,
  type OfflineDeepPackSummary
} from '../engines/dataManifestEngine';
import {
  downloadOfflineDeepPack,
  getOfflineDeepPackStatus,
  OFFLINE_DEEP_PACK_URLS
} from '../pwa';
import { escapeHtml } from '../utils/domUtils';

let activePopoverEl: HTMLElement | null = null;
let activeTriggerEl: HTMLElement | null = null;
let activeFocus: DrugPriceBubbleFocus = {};
let isDeepPackDownloading = false;
const boundDocuments = new WeakSet<Document>();

function getOrCreatePopoverElement(): HTMLElement | null {
  if (typeof document === 'undefined' || !document.body) return null;
  let el = document.getElementById('popover-price-date-bubble');
  if (!el) {
    el = document.createElement('div');
    el.id = 'popover-price-date-bubble';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Veri Anlık Görüntüsü ve Güncellik Bilgisi');
    el.className = 'hidden fixed z-[70] w-[min(92vw,25rem)] bg-[#111827] border border-slate-700/90 rounded-xl shadow-2xl p-3.5 text-slate-100';
    document.body.appendChild(el);
  }
  return el;
}

function positionPopoverNearTrigger(popover: HTMLElement, trigger: HTMLElement): void {
  if (typeof window === 'undefined' || typeof trigger.getBoundingClientRect !== 'function') return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = trigger.getBoundingClientRect();

  // Dar mobil ekranlarda ortalanmış yüzer kart olarak konumla
  if (vw < 640) {
    popover.style.left = '50%';
    popover.style.top = '50%';
    popover.style.transform = 'translate(-50%, -50%)';
    return;
  }

  popover.style.transform = '';
  const popWidth = Math.min(400, Math.round(vw * 0.92));
  const popHeight = popover.offsetHeight || 420;
  const margin = 12;

  let left = rect.left;
  if (left + popWidth > vw - margin) {
    left = Math.max(margin, rect.right - popWidth);
  }
  left = Math.max(margin, Math.min(left, vw - popWidth - margin));

  let top = rect.bottom + 8;
  if (top + popHeight > vh - margin) {
    const above = rect.top - popHeight - 8;
    top = above >= margin ? above : Math.max(margin, vh - popHeight - margin);
  }

  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

export function closePriceDateBubble(): void {
  if (activePopoverEl) {
    activePopoverEl.classList.add('hidden');
  }
  if (activeTriggerEl) {
    activeTriggerEl.setAttribute('aria-expanded', 'false');
    activeTriggerEl = null;
  }
}

async function renderActivePopoverContent(): Promise<void> {
  if (!activePopoverEl) return;
  try {
    const manifest = await ensureDataManifestReady();
    const packStatus = await getOfflineDeepPackStatus();
    if (!activePopoverEl || activePopoverEl.classList.contains('hidden')) return;
    const summary: OfflineDeepPackSummary = {
      cachedCount: packStatus.cachedCount,
      totalCount: packStatus.totalCount || OFFLINE_DEEP_PACK_URLS.length,
      isComplete: packStatus.isComplete,
      isDownloading: isDeepPackDownloading
    };
    activePopoverEl.innerHTML = renderDataSnapshotPopoverHTML(manifest, activeFocus, summary);

    if (activeTriggerEl) {
      positionPopoverNearTrigger(activePopoverEl, activeTriggerEl);
    }
  } catch {
    // Manifest veya CacheStorage erişimi başarısız olursa mevcut senkron içerik korunur
  }
}

export async function openPriceDateBubble(
  triggerEl: HTMLElement,
  focus: DrugPriceBubbleFocus = {}
): Promise<void> {
  const popover = getOrCreatePopoverElement();
  if (!popover) return;

  // Aynı tetikleyiciye ikinci tıklamada kapat (toggle)
  if (activeTriggerEl === triggerEl && !popover.classList.contains('hidden')) {
    closePriceDateBubble();
    return;
  }

  if (activeTriggerEl && activeTriggerEl !== triggerEl) {
    activeTriggerEl.setAttribute('aria-expanded', 'false');
  }

  activePopoverEl = popover;
  activeTriggerEl = triggerEl;
  activeFocus = focus;
  triggerEl.setAttribute('aria-expanded', 'true');

  // Anlık senkron render -> gecikmesiz açılış, ardından CacheStorage durumuyla tazele
  popover.innerHTML = renderDataSnapshotPopoverHTML(getDataManifestSync(), focus, {
    cachedCount: 0,
    totalCount: OFFLINE_DEEP_PACK_URLS.length,
    isComplete: false,
    isDownloading: isDeepPackDownloading
  });
  popover.classList.remove('hidden');
  positionPopoverNearTrigger(popover, triggerEl);

  await renderActivePopoverContent();
}

/**
 * İlaç kartı ve aşı kartındaki sabit tarih baloncuğu yuvalarını güncel manifestle doldurur.
 */
export function refreshStaticSnapshotBadges(): void {
  if (typeof document === 'undefined') return;

  const manifest = getDataManifestSync();

  const drugSlot = document.getElementById('container-drug-snapshot-pill');
  if (drugSlot) {
    const priceFresh = evaluateSnapshotFreshness(
      manifest.sources.prices.snapshotDate,
      manifest.sources.prices.staleAfterDays,
      manifest.sources.prices.criticalAfterDays
    );
    const sgkFresh = evaluateSnapshotFreshness(
      manifest.sources.sgk.snapshotDate,
      manifest.sources.sgk.staleAfterDays,
      manifest.sources.sgk.criticalAfterDays
    );
    const quietWarning = priceFresh.warningText || sgkFresh.warningText;

    drugSlot.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <span class="text-[0.6875rem] text-slate-400">
          TL Fiyat &amp; SGK anlık görüntü:
        </span>
        ${renderPriceDateBubbleTriggerHTML({
          context: 'prices',
          labelPrefix: 'Fiyat & SGK',
          compact: true
        })}
      </div>
      ${quietWarning ? `
        <div class="mt-1.5 px-2 py-1 rounded-md border text-[0.6875rem] leading-snug ${priceFresh.level === 'stale' || sgkFresh.level === 'stale' ? 'bg-rose-950/35 border-rose-700/60 text-rose-200' : 'bg-amber-950/35 border-amber-700/60 text-amber-200'}">
          ${escapeHtml(quietWarning)}
        </div>
      ` : ''}
    `;
  }

  const vaxSlot = document.getElementById('container-vaccine-snapshot-pill');
  if (vaxSlot) {
    vaxSlot.innerHTML = renderPriceDateBubbleTriggerHTML({
      context: 'vaccines',
      labelPrefix: '',
      compact: true
    });
  }
}

export function initDataSnapshotBubbleController(): void {
  if (typeof document === 'undefined' || boundDocuments.has(document)) return;
  boundDocuments.add(document);

  refreshStaticSnapshotBadges();
  void ensureDataManifestReady()
    .then(() => {
      refreshStaticSnapshotBadges();
    })
    .catch(() => {
      // Çevrimdışı veya manifest okuma hatasında varsayılan anlık görüntü kullanılır
    });

  document.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    // 1. Kapatma butonu
    if (target.closest('#btn-close-date-bubble')) {
      ev.preventDefault();
      ev.stopPropagation();
      closePriceDateBubble();
      return;
    }

    // 2. İsteğe bağlı Tam Çevrimdışı KÜB & Monograf Paketi indiricisi
    const downloadBtn = target.closest('#btn-download-offline-deep-pack') as HTMLButtonElement | null;
    if (downloadBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      if (isDeepPackDownloading) return;
      isDeepPackDownloading = true;
      downloadBtn.disabled = true;
      downloadBtn.textContent = 'İndiriliyor...';
      const statusEl = document.getElementById('text-offline-deep-pack-status');
      void downloadOfflineDeepPack((done, total) => {
        if (statusEl) {
          statusEl.textContent = `Çevrimdışı KÜB arşivi indiriliyor: ${done}/${total} dosya...`;
        }
      })
        .catch(() => {
          if (statusEl) {
            statusEl.textContent = 'Çevrimdışı KÜB arşivi indirilemedi; internet bağlantınızı kontrol ediniz.';
          }
        })
        .finally(() => {
          isDeepPackDownloading = false;
          void renderActivePopoverContent();
        });
      return;
    }

    // 3. Tıklanabilir tarih baloncuğu tetikleyicisi
    const triggerBtn = target.closest('.btn-price-date-bubble') as HTMLElement | null;
    if (triggerBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      const rawCtx = (triggerBtn.dataset.dateContext || 'prices') as DataSourceKey | 'drug';
      void openPriceDateBubble(triggerBtn, {
        context: rawCtx,
        brand: triggerBtn.dataset.drugBrand || undefined,
        priceLabel: triggerBtn.dataset.drugPrice || undefined,
        priceDate: triggerBtn.dataset.drugPriceDate || undefined
      });
      return;
    }

    // 4. Baloncuk dışına tıklandığında kapat
    if (activePopoverEl && !activePopoverEl.classList.contains('hidden')) {
      if (!activePopoverEl.contains(target)) {
        closePriceDateBubble();
      }
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && activePopoverEl && !activePopoverEl.classList.contains('hidden')) {
      closePriceDateBubble();
    }
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      if (activePopoverEl && activeTriggerEl && !activePopoverEl.classList.contains('hidden')) {
        positionPopoverNearTrigger(activePopoverEl, activeTriggerEl);
      }
    });
  }
}
