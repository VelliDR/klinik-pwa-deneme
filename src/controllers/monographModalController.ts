/**
 * ÇEVRİMDIŞI İLAÇ MONOGRAF MODALI VE AĞ FARKINDALIKLI KÜB/KT DENETLEYİCİSİ
 *
 * 1. Arama sonuçlarındaki veya seçili reçetedeki "📋 Klinik Monograf" butonlarını yönetir.
 * 2. İnternet bağlantısı yokken (navigator.onLine === false) harici TİTCK PDF / Google / Portal
 *    linklerine tıklandığında tarayıcı ağ hatası ekranına düşmeyi engeller ve yerel
 *    çevrimdışı klinik özet modalını açar.
 */

import {
  findMonographForDrug,
  renderMonographCardHTML,
  type MonographLookupInput
} from '../monographEngine';
import { parseDrugStrength } from '../drugEngine';
import {
  checkRenalDoseAdjustments,
  checkPregnancySafety,
  checkNeonatalDrugSafety
} from '../engines/safetyPrescriptionEngine';

function escapeHtmlSafe(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderFallbackOfflineDrugSummaryHTML(drug: MonographLookupInput & { rx?: string; barcode?: string; company?: string }): string {
  const brand = drug.brand || 'Bilinmeyen Müstahzar';
  const generic = drug.generic || 'Belirtilmedi';
  const atc = drug.atcCode || drug.atc || 'Belirtilmedi';
  const strength = parseDrugStrength(brand);

  // Mevcut güvenlik veritabanlarından (Renal, Gebelik, Yenidoğan) yerel kuralları çek
  const renalProbe = checkRenalDoseAdjustments({
    egfr: 15, // Tüm renal kuralları taramak için düşük eGFR probu
    drugs: [{ brand, generic, atcCode: atc }]
  });
  const pregProbe = checkPregnancySafety([{ brand, generic, atcCode: atc }], { trimester: 1 });
  const neoProbe = checkNeonatalDrugSafety([{ brand, generic, atcCode: atc }], { isNeonate: true });

  const safetyNotes: string[] = [];
  if (renalProbe.warnings && renalProbe.warnings.length > 0) {
    renalProbe.warnings.forEach(w => safetyNotes.push(`🫘 Renal Uyarı: ${w.message}`));
  }
  if (pregProbe.alerts && pregProbe.alerts.length > 0) {
    pregProbe.alerts.forEach(a => safetyNotes.push(`🤰 Gebelik (${a.category}): ${a.warning}`));
  }
  if (neoProbe.alerts && neoProbe.alerts.length > 0) {
    neoProbe.alerts.forEach(n => safetyNotes.push(`🍼 Yenidoğan: ${n.warning}`));
  }

  return `
    <div class="space-y-3 text-xs">
      <div class="bg-slate-900/90 border border-slate-700 rounded-xl p-3 space-y-1">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="text-sm font-extrabold text-white">${escapeHtmlSafe(brand)}</h4>
          <span class="text-[10px] font-mono bg-slate-800 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full">📦 Yerel TİTCK Kayıt Özeti</span>
        </div>
        <div class="text-[11px] text-emerald-300 font-medium">Etken Madde: ${escapeHtmlSafe(generic)}</div>
        <div class="text-[10px] text-slate-400 font-mono">
          ATC: ${escapeHtmlSafe(atc)}
          ${drug.barcode ? ` | Barkod: ${escapeHtmlSafe(drug.barcode)}` : ''}
          ${drug.rx ? ` | Reçete: ${escapeHtmlSafe(drug.rx)}` : ''}
        </div>
        ${strength ? `<div class="text-[11px] text-cyan-300 font-mono pt-1">⚖️ Algılanan Farmasötik Güç: ${escapeHtmlSafe(strength.label)}</div>` : ''}
      </div>

      ${safetyNotes.length > 0 ? `
        <div class="bg-rose-950/35 border border-rose-700/60 rounded-lg p-2.5 space-y-1">
          <div class="text-[10px] uppercase tracking-wider font-bold text-rose-300">🛡️ Yerel Farmakovijilans Veritabanı Uyarıları</div>
          ${safetyNotes.map(n => `<div class="text-[11px] text-rose-100 leading-relaxed">• ${escapeHtmlSafe(n)}</div>`).join('')}
        </div>
      ` : `
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 text-slate-300 leading-relaxed">
          Bu müstahzar, çekirdek 125 çevrimdışı klinik monograf listesi dışındadır. Etkileşim kalkanı (Triple Whammy, Serotonin Sendromu, Hiperkalemi, CYP3A4, Renal & Gebelik kontrolleri) reçeteye eklendiğinde çevrimdışı olarak aktif çalışmaya devam eder.
        </div>
      `}
    </div>
  `;
}

export async function openDrugMonographModal(
  drug: MonographLookupInput & { rx?: string; barcode?: string; company?: string; kt?: string; kub?: string },
  triggeredByOfflineFallback: boolean = false
): Promise<void> {
  if (typeof document === 'undefined') return;

  const modal = document.getElementById('modal-drug-monograph');
  const titleEl = document.getElementById('title-monograph-modal');
  const offlineBanner = document.getElementById('banner-monograph-offline-notice');
  const bodyEl = document.getElementById('container-monograph-body');
  const footerLinksEl = document.getElementById('container-monograph-external-links');

  if (!modal || !bodyEl) return;

  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (titleEl) {
    titleEl.textContent = drug.brand ? `Klinik İlaç Özeti — ${drug.brand}` : 'Çevrimdışı Klinik İlaç Monografı';
  }

  if (offlineBanner) {
    if (isOffline || triggeredByOfflineFallback) {
      offlineBanner.classList.remove('hidden');
    } else {
      offlineBanner.classList.add('hidden');
    }
  }

  bodyEl.innerHTML = '<div class="p-4 text-center text-xs text-slate-400 font-mono">Yerel klinik monograf yükleniyor...</div>';

  const monograph = await findMonographForDrug(drug);
  if (monograph) {
    bodyEl.innerHTML = renderMonographCardHTML(monograph, drug.brand);
  } else {
    bodyEl.innerHTML = renderFallbackOfflineDrugSummaryHTML(drug);
  }

  if (footerLinksEl) {
    if (isOffline) {
      footerLinksEl.innerHTML = `<span class="text-[10px] text-amber-400 font-mono">📡 Çevrimdışı modda harici TİTCK PDF / Web bağlantıları devre dışıdır.</span>`;
    } else {
      const links: string[] = [];
      if (drug.kt) {
        links.push(`<a href="${escapeHtmlSafe(drug.kt)}" target="_blank" rel="noopener noreferrer" class="bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/70 px-2.5 py-1 rounded-lg text-[11px] font-semibold">📄 Resmi TİTCK KT (PDF)</a>`);
      }
      if (drug.kub) {
        links.push(`<a href="${escapeHtmlSafe(drug.kub)}" target="_blank" rel="noopener noreferrer" class="bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/70 px-2.5 py-1 rounded-lg text-[11px] font-semibold">📋 Resmi TİTCK KÜB (PDF)</a>`);
      }
      if (!drug.kt && !drug.kub && drug.brand) {
        links.push(`<a href="https://www.google.com/search?q=${encodeURIComponent(drug.brand + ' prospektüs kub titck pdf')}" target="_blank" rel="noopener noreferrer" class="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1 rounded-lg text-[11px]">🔍 Web'de KÜB/KT Ara</a>`);
        links.push(`<a href="https://titck.gov.tr/ilac/kub-kt" target="_blank" rel="noopener noreferrer" class="bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-2.5 py-1 rounded-lg text-[11px]">🏛️ TİTCK Portalı</a>`);
      }
      footerLinksEl.innerHTML = links.join(' ');
    }
  }
}

export function closeDrugMonographModal(): void {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('modal-drug-monograph');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function initMonographModalController(): void {
  if (typeof document === 'undefined') return;

  const modal = document.getElementById('modal-drug-monograph');
  const closeBtn = document.getElementById('btn-close-monograph-modal');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeDrugMonographModal);
  }
  if (modal) {
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) closeDrugMonographModal();
    });
  }
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeDrugMonographModal();
    }
  });

  // Delegated click handler:
  // 1) .btn-open-monograph -> doğrudan çevrimdışı monograf kartını açar
  // 2) Çevrimdışı moddayken (.btn-pdf-link veya .btn-ext-drug-bridge) tıklandığında kırık sayfa yerine yerel monografı açar
  document.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const monoBtn = target.closest('.btn-open-monograph') as HTMLElement | null;
    if (monoBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      void openDrugMonographModal({
        brand: monoBtn.dataset.brand || '',
        generic: monoBtn.dataset.generic || '',
        atc: monoBtn.dataset.atc || '',
        barcode: monoBtn.dataset.barcode || '',
        rx: monoBtn.dataset.rx || '',
        kt: monoBtn.dataset.kt || '',
        kub: monoBtn.dataset.kub || ''
      }, false);
      return;
    }

    const extLink = target.closest('.btn-pdf-link, .btn-ext-drug-bridge') as HTMLElement | null;
    if (extLink && typeof navigator !== 'undefined' && navigator.onLine === false) {
      ev.preventDefault();
      ev.stopPropagation();
      void openDrugMonographModal({
        brand: extLink.dataset.brand || '',
        generic: extLink.dataset.generic || '',
        atc: extLink.dataset.atc || '',
        barcode: extLink.dataset.barcode || '',
        rx: extLink.dataset.rx || '',
        kt: extLink.dataset.kt || '',
        kub: extLink.dataset.kub || ''
      }, true);
    }
  });
}
