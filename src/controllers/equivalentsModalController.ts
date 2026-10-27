/**
 * GELİŞMİŞ EŞDEĞER / MUADİL İLAÇ KARŞILAŞTIRMA MODAL DENETLEYİCİSİ (AŞAMA 4)
 *
 * SUT Biyoeşdeğerlik, SGK Kamu İskontosu, Gebelik & Soğuk Zincir Karşılaştırması
 * 3 Kademeli Hiyerarşi (Tier-1: SGK Grubu, Tier-2: ATC-5/Etken Madde, Tier-3: Terapötik Alternatif)
 */

import { findEquivalents, getDrugBadgesHTML, type DrugInputForEquivalents } from '../drugEngine';
import type { NormalizedDrugRecord } from '../db/titckIndexedDB';

function escapeHtmlSafe(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type EquivalentsFilterMode = 'all' | 'official' | 'sgk';

export interface EquivalentsModalState {
  refDrug: (DrugInputForEquivalents & Partial<NormalizedDrugRecord>) | null;
  allEquivalents: NormalizedDrugRecord[];
  activeFilter: EquivalentsFilterMode;
}

const modalState: EquivalentsModalState = {
  refDrug: null,
  allEquivalents: [],
  activeFilter: 'all'
};

/**
 * Referans ilaç özet kartını oluşturur
 */
export function renderRefDrugCardHTML(drug: DrugInputForEquivalents & Partial<NormalizedDrugRecord>): string {
  const brand = drug.brand || 'Bilinmeyen İlaç';
  const generic = drug.generic || 'Belirtilmedi';
  const atc = drug.atcCode || drug.atc || '';
  const barcode = drug.barcode || '';
  const company = drug.company || '';
  const eg = String(drug.esdegerGroup || (drug as any).eg || '');
  const discount = String(drug.sgkDiscount || (drug as any).di || '');
  const kamuNo = String(drug.sgkKamuNo || (drug as any).kn || '');

  const badges = getDrugBadgesHTML(drug as any);

  return `
    <div class="bg-slate-950/80 border border-cyan-800/70 rounded-xl p-3 sm:p-3.5 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <span class="text-[10px] font-mono tracking-wider uppercase text-cyan-400 font-bold bg-cyan-950/70 border border-cyan-800/80 px-2 py-0.5 rounded-full">
          Karşılaştırılan Referans Müstahzar
        </span>
        ${eg ? `<span class="text-[10px] font-mono text-cyan-300 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">SGK Grubu: ${escapeHtmlSafe(eg)}</span>` : ''}
      </div>
      <div class="flex flex-wrap items-baseline gap-2">
        <h4 class="text-sm sm:text-base font-extrabold text-white">${escapeHtmlSafe(brand)}</h4>
        ${company ? `<span class="text-[11px] text-slate-400">• ${escapeHtmlSafe(company)}</span>` : ''}
      </div>
      <div class="text-xs text-emerald-300 font-medium">${escapeHtmlSafe(generic)}</div>
      <div class="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-mono">
        ${atc ? `<span>ATC: ${escapeHtmlSafe(atc)}</span>` : ''}
        ${barcode ? `<span>• Barkod: ${escapeHtmlSafe(barcode)}</span>` : ''}
        ${discount ? `<span class="text-emerald-400 font-bold">• Kamu İskontosu: ${escapeHtmlSafe(discount)}</span>` : ''}
        ${kamuNo ? `<span class="text-slate-500">• Kamu No: ${escapeHtmlSafe(kamuNo)}</span>` : ''}
      </div>
      ${badges ? `<div class="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800/80">${badges}</div>` : ''}
    </div>
  `;
}

/**
 * Muadil Karşılaştırma Filtre Çubuğu
 */
export function renderEquivalentsFilterBarHTML(
  allEquivalents: NormalizedDrugRecord[],
  activeFilter: EquivalentsFilterMode
): string {
  const total = allEquivalents.length;
  const officialCount = allEquivalents.filter(e => e.matchTier === 1).length;
  const sgkCount = allEquivalents.filter(e => e.sgkReimbursed === 1).length;

  return `
    <div class="flex items-center gap-1.5 flex-wrap">
      <button type="button" class="btn-eq-filter text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
        activeFilter === 'all'
          ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
      }" data-filter="all">
        Tümü (${total})
      </button>

      ${officialCount > 0 ? `
        <button type="button" class="btn-eq-filter text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
          activeFilter === 'official'
            ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
        }" data-filter="official">
          Resmi Biyoeşdeğerler (${officialCount})
        </button>
      ` : ''}

      <button type="button" class="btn-eq-filter text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
        activeFilter === 'sgk'
          ? 'bg-teal-950 text-teal-300 border-teal-600'
          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
      }" data-filter="sgk">
        SGK Ödeyenler (${sgkCount})
      </button>
    </div>

    <div class="text-[11px] text-slate-400">
      Toplam <span class="font-bold text-cyan-300">${total}</span> alternatif bulundu
    </div>
  `;
}

/**
 * Muadil Listesi Kartlarını Render Eder
 */
export function renderEquivalentsListHTML(
  equivalents: NormalizedDrugRecord[],
  activeFilter: EquivalentsFilterMode
): string {
  let filtered = equivalents;
  if (activeFilter === 'official') {
    filtered = equivalents.filter(e => e.matchTier === 1);
  } else if (activeFilter === 'sgk') {
    filtered = equivalents.filter(e => e.sgkReimbursed === 1);
  }

  if (filtered.length === 0) {
    return `
      <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400 space-y-1">
        <div class="text-xs font-semibold text-slate-300">Bu filtre kriterine uygun eşdeğer ilaç bulunamadı.</div>
        <div class="text-[11px]">Diğer sekmeleri veya arama motorunu kullanabilirsiniz.</div>
      </div>
    `;
  }

  return filtered.map((drug) => {
    const tier = drug.matchTier || 2;
    const tierBadge = tier === 1
      ? '<span class="bg-emerald-950 text-emerald-300 border border-emerald-600/80 px-1.5 py-0.5 rounded text-[10px] font-bold" title="Resmi SGK SUT Eşdeğer Grubu (Altın Standart İkame)">Resmi SGK Biyoeşdeğer</span>'
      : tier === 2
      ? '<span class="bg-amber-950 text-amber-300 border border-amber-700/80 px-1.5 py-0.5 rounded text-[10px] font-semibold" title="Aynı ATC 5. Seviye veya Birebir Etken Madde">Klinik Biyoeşdeğer</span>'
      : '<span class="bg-blue-950 text-blue-300 border border-blue-700/80 px-1.5 py-0.5 rounded text-[10px]" title="Aynı Farmakolojik Grup / Terapötik Alternatif">Terapötik Alternatif</span>';

    const badges = getDrugBadgesHTML(drug as any);
    const safeBrand = escapeHtmlSafe(drug.brand);
    const safeGeneric = escapeHtmlSafe(drug.generic);
    const safeCompany = escapeHtmlSafe(drug.company);
    const safeDiscount = escapeHtmlSafe(drug.sgkDiscount);
    const safeEg = escapeHtmlSafe(drug.esdegerGroup);
    const safeKamuNo = escapeHtmlSafe(drug.sgkKamuNo);
    const safeAtc = escapeHtmlSafe(drug.atcCode);
    const safeBarcode = escapeHtmlSafe(drug.barcode);
    const ktUrl = drug.kt_pdf_prospektus_url;
    const kubUrl = drug.kub_pdf_url;

    return `
      <div class="bg-slate-900 hover:bg-slate-850/80 border border-slate-700/80 hover:border-cyan-700/80 p-3 rounded-xl transition-all space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${tierBadge}
              <span class="text-xs font-bold text-white">${safeBrand}</span>
            </div>
            <div class="text-[11px] text-slate-300 mt-0.5">${safeGeneric}${safeCompany ? ` • <span class="text-slate-400 font-normal">${safeCompany}</span>` : ''}</div>
          </div>
          <button type="button" class="btn-eq-add-to-rx bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 hover:border-emerald-500 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 flex-shrink-0"
            data-brand="${safeBrand}"
            data-generic="${safeGeneric}"
            data-atc="${safeAtc}"
            data-barcode="${safeBarcode}"
            data-rx="${escapeHtmlSafe(drug.prescriptionType)}"
            data-company="${safeCompany}"
            data-kt="${escapeHtmlSafe(ktUrl || '')}"
            data-kub="${escapeHtmlSafe(kubUrl || '')}"
            title="Bu muadili reçete / tedavi listesine ekle">
            <span>Reçeteye Ekle</span>
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-1 text-[10px]">
          ${badges}
          ${safeDiscount ? `<span class="bg-slate-800 text-emerald-300 border border-slate-700 px-1.5 py-0.5 rounded tabular-nums">Kamu İskonto: ${safeDiscount}</span>` : ''}
          ${safeKamuNo ? `<span class="bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded tabular-nums">Kamu No: ${safeKamuNo}</span>` : ''}
          ${safeEg ? `<span class="bg-slate-800 text-cyan-300 border border-slate-700 px-1.5 py-0.5 rounded tabular-nums">Grup: ${safeEg}</span>` : ''}
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[10px]">
          <span class="text-slate-400 text-xs">${escapeHtmlSafe(drug.matchReason || '')}</span>
          <div class="flex items-center gap-2">
            ${ktUrl ? `<a href="${escapeHtmlSafe(ktUrl)}" target="_blank" rel="noopener noreferrer" class="text-amber-400 hover:underline">Prospektüs (KT)</a>` : ''}
            ${kubUrl ? `<a href="${escapeHtmlSafe(kubUrl)}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline">KÜB</a>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Modalı Verilen İlaç İçin Açar
 */
export async function openDrugEquivalentsModal(
  drug: DrugInputForEquivalents & Partial<NormalizedDrugRecord>
): Promise<void> {
  if (typeof document === 'undefined') return;

  const modal = document.getElementById('modal-drug-equivalents');
  const refContainer = document.getElementById('container-equivalents-ref-drug');
  const filtersContainer = document.getElementById('container-equivalents-filters');
  const listContainer = document.getElementById('container-equivalents-list');
  const btnBatchToSearch = document.getElementById('btn-equivalents-batch-to-search');

  if (!modal || !refContainer || !filtersContainer || !listContainer) return;

  modalState.refDrug = drug;
  modalState.activeFilter = 'all';

  // Referans kartını çiz
  refContainer.innerHTML = renderRefDrugCardHTML(drug);

  // Yükleniyor göstergesi
  listContainer.innerHTML = `
    <div class="py-8 text-center text-slate-400 space-y-2">
      <div class="inline-block animate-spin text-2xl">⏳</div>
      <div class="text-xs">SGK Eşdeğer Grubu & Biyoeşdeğer Veritabanı Taranıyor...</div>
    </div>
  `;
  filtersContainer.innerHTML = '';
  modal.classList.remove('hidden');

  // Muadilleri hesapla
  const eqList = await findEquivalents(drug);
  modalState.allEquivalents = eqList;

  // Filtre çubuğu ve liste çiz
  filtersContainer.innerHTML = renderEquivalentsFilterBarHTML(eqList, modalState.activeFilter);
  listContainer.innerHTML = renderEquivalentsListHTML(eqList, modalState.activeFilter);

  // Batch search butonu görünürlüğü
  if (btnBatchToSearch) {
    const egCode = drug.esdegerGroup || drug.eg || '';
    if (egCode && eqList.length > 0) {
      btnBatchToSearch.classList.remove('hidden');
      btnBatchToSearch.textContent = `"${egCode}" Grubunu Arama Kutusuna Aktar`;
      btnBatchToSearch.setAttribute('data-esdeger', egCode);
    } else {
      btnBatchToSearch.classList.add('hidden');
    }
  }
}

/**
 * Modal Denetleyicisi Başlatıcı (Event Listeners)
 */
export function initEquivalentsModalController(callbacks?: {
  onAddDrugToTreatment?: (drugData: any) => void;
  onSendToSearch?: (query: string, mode: 'esdeger' | 'all') => void;
}): void {
  if (typeof document === 'undefined') return;

  const modal = document.getElementById('modal-drug-equivalents');
  const closeBtn = document.getElementById('btn-close-equivalents-modal');
  const filtersContainer = document.getElementById('container-equivalents-filters');
  const listContainer = document.getElementById('container-equivalents-list');
  const btnBatchToSearch = document.getElementById('btn-equivalents-batch-to-search');

  const closeModal = () => {
    if (modal) modal.classList.add('hidden');
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // ESC tuşuyla kapatma
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Filtre butonları tıklaması
  if (filtersContainer) {
    filtersContainer.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.btn-eq-filter');
      if (btn) {
        const filter = btn.getAttribute('data-filter') as EquivalentsFilterMode;
        if (filter) {
          modalState.activeFilter = filter;
          filtersContainer.innerHTML = renderEquivalentsFilterBarHTML(modalState.allEquivalents, modalState.activeFilter);
          if (listContainer) {
            listContainer.innerHTML = renderEquivalentsListHTML(modalState.allEquivalents, modalState.activeFilter);
          }
        }
      }
    });
  }

  // Muadil kartından Reçeteye Ekle butonu
  if (listContainer) {
    listContainer.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.btn-eq-add-to-rx') as HTMLElement;
      if (btn) {
        const brand = btn.getAttribute('data-brand') || '';
        const generic = btn.getAttribute('data-generic') || '';
        const atcCode = btn.getAttribute('data-atc') || '';
        const barcode = btn.getAttribute('data-barcode') || '';
        const rx = btn.getAttribute('data-rx') || 'Normal';
        const company = btn.getAttribute('data-company') || '';
        const kt = btn.getAttribute('data-kt') || '';
        const kub = btn.getAttribute('data-kub') || '';

        if (callbacks?.onAddDrugToTreatment) {
          callbacks.onAddDrugToTreatment({ brand, generic, atcCode, barcode, rx, company, kt, kub });
        }

        // Görsel geri bildirim
        btn.innerHTML = '<span>✓ Eklendi!</span>';
        btn.classList.remove('bg-emerald-950', 'text-emerald-300', 'border-emerald-700');
        btn.classList.add('bg-cyan-950', 'text-cyan-300', 'border-cyan-600');
        setTimeout(() => {
          btn.innerHTML = '<span>Reçeteye Ekle</span>';
          btn.classList.remove('bg-cyan-950', 'text-cyan-300', 'border-cyan-600');
          btn.classList.add('bg-emerald-950', 'text-emerald-300', 'border-emerald-700');
        }, 1500);
      }
    });
  }

  // Grubu arama kutusuna aktar butonu
  if (btnBatchToSearch) {
    btnBatchToSearch.addEventListener('click', () => {
      const egCode = btnBatchToSearch.getAttribute('data-esdeger') || '';
      if (egCode && callbacks?.onSendToSearch) {
        callbacks.onSendToSearch(egCode, 'esdeger');
        closeModal();
      }
    });
  }
}
