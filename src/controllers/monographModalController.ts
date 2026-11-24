/**
 * ÇEVRİMDIŞI İLAÇ MONOGRAF MODALI VE AĞ FARKINDALIKLI KÜB/KT DENETLEYİCİSİ (v2)
 *
 * 1. 136 Çekirdek Monograf + 1.794 Klinik Master (DDInter 2.0, LiverTox, LactMed, CYP, PubChem)
 *    + 1.198 ATC Resmi Türkçe KÜB Shard'ı + Seçili Müstahzar Fiyat/SGK/Alerjen bilgisini
 *    tek 5 sekmeli, ansiklopedi karşıtı klinik kartta birleştirir.
 * 2. Aktif reçetedeki diğer ilaçlarla anlık çapraz etkileşim denetimi yapar.
 * 3. Çevrimdışı modda harici TİTCK PDF linklerine tıklandığında kırık sayfa yerine yerel özeti açar.
 */

import {
  findMonographForDrug,
  findMasterMonographForDrug,
  renderMonographCardHTML,
  type MonographLookupInput
} from '../monographEngine';
import { parseDrugStrength } from '../drugEngine';
import { findCatalogDrugSync, type NormalizedDrugRecord } from '../db/titckIndexedDB';
import {
  checkRenalDoseAdjustments,
  checkPregnancySafety,
  checkNeonatalDrugSafety
} from '../engines/safetyPrescriptionEngine';
import {
  ensureIcd10DictionaryReady,
  getAtcIcd10Profile
} from '../engines/icd10DictionaryEngine';
import {
  ensureDdiMatrixReady,
  checkSingleDrugAgainstPrescription,
  type DdiMatrixAlert
} from '../engines/ddiMatrixEngine';
import {
  ensurePddiMonographsReady,
  evaluatePddiMonographsForPrescription
} from '../engines/pddiMonographEngine';
import { loadKubForAtc } from '../engines/kubShardEngine';
import { openDrugEquivalentsModal } from './equivalentsModalController';
import { appState } from '../state';

function escapeHtmlSafe(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let currentModalCatalogDrug: NormalizedDrugRecord | null = null;
let currentModalFallbackDrug: (MonographLookupInput & { rx?: string; barcode?: string; company?: string; kt?: string; kub?: string }) | null = null;
let monographRequestSeq = 0;
const boundDocuments = new WeakSet<Document>();

export function renderFallbackOfflineDrugSummaryHTML(drug: MonographLookupInput & { rx?: string; barcode?: string; company?: string }): string {
  const brand = drug.brand || 'Bilinmeyen Müstahzar';
  const generic = drug.generic || 'Belirtilmedi';
  const atc = drug.atcCode || drug.atc || 'Belirtilmedi';
  const strength = parseDrugStrength(brand);

  const renalProbe = checkRenalDoseAdjustments({
    egfr: 15,
    drugs: [{ brand, generic, atcCode: atc }]
  });
  const pregProbe = checkPregnancySafety([{ brand, generic, atcCode: atc }], { trimester: 1 });
  const neoProbe = checkNeonatalDrugSafety([{ brand, generic, atcCode: atc }], { isNeonate: true });
  const icdProfile = getAtcIcd10Profile(atc);

  const safetyNotes: string[] = [];
  if (renalProbe.warnings && renalProbe.warnings.length > 0) {
    renalProbe.warnings.forEach(w => safetyNotes.push(`Renal Uyarı: ${w.message}`));
  }
  if (pregProbe.alerts && pregProbe.alerts.length > 0) {
    pregProbe.alerts.forEach(a => safetyNotes.push(`Gebelik (${a.category}): ${a.warning}`));
  }
  if (neoProbe.alerts && neoProbe.alerts.length > 0) {
    neoProbe.alerts.forEach(n => safetyNotes.push(`Yenidoğan: ${n.warning}`));
  }

  const hierarchyLabel = icdProfile
    ? [icdProfile.l1, icdProfile.l2, icdProfile.l3].filter(Boolean).join(' › ')
    : '';

  return `
    <div class="space-y-3 text-xs">
      <div class="bg-slate-900/90 border border-slate-700 rounded-xl p-3 space-y-1">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="text-sm font-extrabold text-white">${escapeHtmlSafe(brand)}</h4>
          <span class="text-[0.75rem] font-mono bg-slate-800 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full">Yerel TİTCK Kayıt Özeti</span>
        </div>
        <div class="text-[0.8125rem] text-emerald-300 font-medium">Etken Madde: ${escapeHtmlSafe(icdProfile?.activeIngredientTr || generic)}</div>
        ${hierarchyLabel ? `<div class="text-[0.75rem] text-slate-300">${escapeHtmlSafe(hierarchyLabel)}</div>` : ''}
        <div class="text-[0.75rem] text-slate-400 font-mono">
          ATC: ${escapeHtmlSafe(atc)}
          ${drug.barcode ? ` | Barkod: ${escapeHtmlSafe(drug.barcode)}` : ''}
          ${drug.rx ? ` | Reçete: ${escapeHtmlSafe(drug.rx)}` : ''}
        </div>
        ${strength ? `<div class="text-[0.8125rem] text-cyan-300 font-mono pt-1">Algılanan Farmasötik Güç: ${escapeHtmlSafe(strength.label)}</div>` : ''}
      </div>

      ${icdProfile && icdProfile.indications.length > 0 ? `
        <div class="bg-indigo-950/35 border border-indigo-700/60 rounded-lg p-2.5 space-y-1.5">
          <div class="text-[0.75rem] uppercase tracking-wider font-bold text-indigo-300">Onaylı Klinik Endikasyonlar &amp; ICD-10 Kodları</div>
          <div class="flex flex-wrap gap-1">
            ${icdProfile.indications.slice(0, 10).map(ind => `
              <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-900/80 border border-indigo-700/50 text-[0.75rem] text-indigo-100">
                ${ind.code ? `<span class="font-mono text-indigo-300 mr-1">[${escapeHtmlSafe(ind.code)}]</span>` : ''}${escapeHtmlSafe(ind.nameTr)}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${icdProfile && icdProfile.contraindications.length > 0 ? `
        <div class="bg-amber-950/30 border border-amber-700/60 rounded-lg p-2.5 space-y-1">
          <div class="text-[0.75rem] uppercase tracking-wider font-bold text-amber-300">Kontrendike Durumlar / ICD-10 Uyarıları</div>
          ${icdProfile.contraindications.slice(0, 6).map(c => `
            <div class="text-[0.8125rem] text-amber-100 leading-relaxed">• ${c.code ? `<span class="font-mono text-amber-300">[${escapeHtmlSafe(c.code)}]</span> ` : ''}${escapeHtmlSafe(c.nameTr)}</div>
          `).join('')}
        </div>
      ` : ''}

      ${safetyNotes.length > 0 ? `
        <div class="bg-rose-950/35 border border-rose-700/60 rounded-lg p-2.5 space-y-1">
          <div class="text-[0.75rem] uppercase tracking-wider font-bold text-rose-300">Yerel Farmakovijilans Veritabanı Uyarıları</div>
          ${safetyNotes.map(n => `<div class="text-[0.8125rem] text-rose-100 leading-relaxed">• ${escapeHtmlSafe(n)}</div>`).join('')}
        </div>
      ` : `
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 text-slate-300 leading-relaxed">
          Bu müstahzar için ek monograf bulunamadı. Reçeteye eklendiğinde DDInter 2.0, Triple Whammy, Serotonin, Hiperkalemi, Renal &amp; Gebelik kalkanları çevrimdışı çalışmaya devam eder.
        </div>
      `}
    </div>
  `;
}

function activateMonographTab(bodyEl: HTMLElement, tabKey: string): void {
  const buttons = bodyEl.querySelectorAll<HTMLButtonElement>('.mono-tab-btn');
  const panels = bodyEl.querySelectorAll<HTMLElement>('.mono-tab-panel');

  buttons.forEach(btn => {
    const isActive = btn.dataset.monoTab === tabKey;
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (isActive) {
      btn.className = 'mono-tab-btn btn-compact shrink-0 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-semibold border transition-colors bg-sky-950/80 text-sky-200 border-sky-500/70';
    } else {
      btn.className = 'mono-tab-btn btn-compact shrink-0 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-medium border transition-colors bg-slate-800/70 text-slate-300 border-slate-700/80 hover:text-white';
    }
  });

  panels.forEach(panel => {
    if (panel.dataset.monoPanel === tabKey) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });
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
      offlineBanner.textContent = 'Çevrimdışı modda çalışılıyor — yerel TİTCK KÜB, DDInter 2.0 ve klinik monograf önbelleğinden sunulmaktadır.';
      offlineBanner.classList.remove('hidden');
    } else {
      offlineBanner.classList.add('hidden');
    }
  }

  bodyEl.innerHTML = '<div class="p-6 text-center text-xs text-slate-400 font-mono">Klinik monograf, Türkçe KÜB ve etkileşim profili hazırlanıyor...</div>';

  const reqSeq = ++monographRequestSeq;
  currentModalFallbackDrug = drug;

  // O(1) katalog kaydını çöz (fiyat, SGK, alerjen, aç/tok, araç, tam PDF linkleri)
  const catalogDrug = findCatalogDrugSync({
    barcode: drug.barcode,
    brand: drug.brand,
    atc: drug.atcCode || drug.atc
  });
  currentModalCatalogDrug = catalogDrug;

  const resolvedAtc = String(drug.atcCode || drug.atc || catalogDrug?.atcCode || '').trim().toUpperCase();

  // Tüm katmanları paralel ve hata-dayanıklı yükle (Core + Master + KÜB Shard + ICD-10 + DDI Matrix + W3C PDDI-CDS)
  const [monograph, masterRec, kubRec] = await Promise.all([
    findMonographForDrug({ ...drug, atcCode: resolvedAtc }).catch(() => null),
    findMasterMonographForDrug({ ...drug, atcCode: resolvedAtc }).catch(() => null),
    resolvedAtc ? loadKubForAtc(resolvedAtc).catch(() => null) : Promise.resolve(null),
    ensureIcd10DictionaryReady().catch(() => false),
    ensureDdiMatrixReady().catch(() => false),
    ensurePddiMonographsReady().catch(() => null)
  ]);

  if (reqSeq !== monographRequestSeq || modal.classList.contains('hidden')) return;

  const icdProfile = resolvedAtc ? getAtcIcd10Profile(resolvedAtc) : null;
  const activeRxDrugs = appState.treatment?.selectedDrugs || [];
  const candidateDrug = {
    brand: drug.brand || catalogDrug?.brand || '',
    atcCode: resolvedAtc,
    generic: drug.generic || catalogDrug?.generic || '',
    route: catalogDrug?.route
  };
  const ddinterRxAlerts = resolvedAtc
    ? checkSingleDrugAgainstPrescription(candidateDrug, activeRxDrugs)
    : [];

  // Kanıtlı W3C PDDI-CDS monograflarını aktif reçete ile karşılaştır ve DDInter jenerik metninin önüne al
  const pddiPairAlerts: DdiMatrixAlert[] = [];
  const pddiCoveredAtcs = new Set<string>();
  if (resolvedAtc && activeRxDrugs.length > 0) {
    const pddiHits = evaluatePddiMonographsForPrescription(
      [candidateDrug, ...activeRxDrugs],
      {
        egfr: appState.biometry.egfr,
        childPughClass: appState.medicine.childPugh?.childClass ?? null,
        ageYears: appState.biometry.ageYears
      }
    ).filter(m => m.atcA === resolvedAtc || m.atcB === resolvedAtc);

    for (const hit of pddiHits) {
      const otherAtc = hit.atcA === resolvedAtc ? hit.atcB : hit.atcA;
      pddiCoveredAtcs.add(otherAtc);
      const sev: 'K' | 'O' | 'H' = hit.escalatedTier === 'X' ? 'K' : hit.escalatedTier === 'D' ? 'O' : 'H';
      pddiPairAlerts.push({
        id: hit.monograph.monograph_id,
        source: 'CURATED',
        severity: sev,
        severityLabel: `Kanıtlı PDDI Kademe ${hit.escalatedTier}`,
        atcA: hit.atcA,
        atcB: hit.atcB,
        drugA: hit.drugABrand,
        drugB: hit.drugBBrand,
        genericA: hit.monograph.drug_a_tr,
        genericB: hit.monograph.drug_b_tr,
        title: `${hit.monograph.drug_a_tr} + ${hit.monograph.drug_b_tr}`,
        message: `${hit.monograph.clinical_consequences_tr.join(', ')}. ${hit.monograph.recommended_action_tr}${hit.monograph.alternative_tr ? ` Alternatif: ${hit.monograph.alternative_tr}` : ''}`
      });
    }
  }

  const activeRxAlerts: DdiMatrixAlert[] = [
    ...pddiPairAlerts,
    ...ddinterRxAlerts.filter(a => {
      const other = a.atcA === resolvedAtc ? a.atcB : a.atcA;
      return !pddiCoveredAtcs.has(other);
    })
  ];

  if (monograph) {
    const isCore = !monograph.id.startsWith('master_');
    bodyEl.innerHTML = renderMonographCardHTML(monograph, drug.brand || catalogDrug?.brand, {
      master: masterRec,
      kub: kubRec,
      catalogDrug,
      icdProfile,
      activeRxAlerts,
      isCoreMonograph: isCore
    });
  } else {
    bodyEl.innerHTML = renderFallbackOfflineDrugSummaryHTML(drug);
  }

  // Footer resmi PDF bağlantıları
  const effectiveKt = drug.kt || catalogDrug?.kt_pdf_prospektus_url || '';
  const effectiveKub = drug.kub || catalogDrug?.kub_pdf_url || '';

  if (footerLinksEl) {
    footerLinksEl.classList.remove('hidden');
    if (isOffline) {
      footerLinksEl.innerHTML = `<span class="text-[0.75rem] text-amber-400 font-mono">Çevrimdışı modda harici TİTCK PDF / Web bağlantıları devre dışıdır; yerel KÜB sekmeleri aktiftir.</span>`;
    } else {
      const links: string[] = [];
      if (effectiveKt && /^https?:\/\//i.test(effectiveKt)) {
        links.push(`<a href="${escapeHtmlSafe(effectiveKt)}" target="_blank" rel="noopener noreferrer" class="bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/70 px-2.5 py-1 rounded-lg text-[0.75rem] font-semibold transition-colors">Resmi TİTCK KT (PDF)</a>`);
      }
      if (effectiveKub && /^https?:\/\//i.test(effectiveKub)) {
        links.push(`<a href="${escapeHtmlSafe(effectiveKub)}" target="_blank" rel="noopener noreferrer" class="bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/70 px-2.5 py-1 rounded-lg text-[0.75rem] font-semibold transition-colors">Resmi TİTCK KÜB (PDF)</a>`);
      }
      if (links.length === 0 && drug.brand) {
        links.push(`<a href="https://www.google.com/search?q=${encodeURIComponent(drug.brand + ' prospektüs kub titck pdf')}" target="_blank" rel="noopener noreferrer" class="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1 rounded-lg text-[0.75rem]">Web'de KÜB/KT Ara</a>`);
        links.push(`<a href="https://titck.gov.tr/ilac/kub-kt" target="_blank" rel="noopener noreferrer" class="bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-2.5 py-1 rounded-lg text-[0.75rem]">TİTCK Portalı</a>`);
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
  if (typeof document === 'undefined' || boundDocuments.has(document)) return;
  boundDocuments.add(document);

  const modal = document.getElementById('modal-drug-monograph');
  const closeBtn = document.getElementById('btn-close-monograph-modal');
  const bodyEl = document.getElementById('container-monograph-body');

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

  // Modal içi etkileşimler: 5 sekme geçişi, Major DDI mini filtre, Tümünü Göster, Muadil modalına geçiş
  if (bodyEl) {
    bodyEl.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;

      const tabBtn = target.closest('.mono-tab-btn') as HTMLButtonElement | null;
      if (tabBtn && tabBtn.dataset.monoTab) {
        activateMonographTab(bodyEl, tabBtn.dataset.monoTab);
        return;
      }

      const expandBtn = target.closest('#btn-mono-ddi-expand') as HTMLButtonElement | null;
      if (expandBtn) {
        const extras = bodyEl.querySelectorAll<HTMLElement>('.mono-ddi-extra');
        const isExpanded = expandBtn.dataset.expanded === 'true';
        extras.forEach(el => el.classList.toggle('hidden', isExpanded));
        expandBtn.dataset.expanded = isExpanded ? 'false' : 'true';
        expandBtn.textContent = isExpanded ? 'Tümünü Göster ▾' : 'Daha Az Göster ▴';
        return;
      }

      const eqBtn = target.closest('.btn-mono-open-equivalents') as HTMLButtonElement | null;
      if (eqBtn && (currentModalCatalogDrug || currentModalFallbackDrug)) {
        const drugToCompare = currentModalCatalogDrug || {
          id: currentModalFallbackDrug?.barcode || currentModalFallbackDrug?.brand || 'fallback',
          brand: currentModalFallbackDrug?.brand || '',
          generic: currentModalFallbackDrug?.generic || '',
          atcCode: currentModalFallbackDrug?.atcCode || currentModalFallbackDrug?.atc || '',
          barcode: currentModalFallbackDrug?.barcode || '',
          company: currentModalFallbackDrug?.company || '',
          prescriptionType: currentModalFallbackDrug?.rx || ''
        };
        closeDrugMonographModal();
        void openDrugEquivalentsModal({ ...drugToCompare });
      }
    });

    bodyEl.addEventListener('input', (ev) => {
      const target = ev.target as HTMLInputElement | null;
      if (!target || target.id !== 'input-mono-ddi-filter') return;
      const q = target.value.trim().toLocaleLowerCase('tr-TR');
      const chips = bodyEl.querySelectorAll<HTMLElement>('.mono-ddi-chip');
      const expandBtn = bodyEl.querySelector<HTMLElement>('#btn-mono-ddi-expand');

      chips.forEach((chip, idx) => {
        const agent = (chip.dataset.agent || '').toLocaleLowerCase('tr-TR');
        if (!q) {
          const isExtra = idx >= 12 && expandBtn?.dataset.expanded !== 'true';
          chip.classList.toggle('hidden', isExtra);
        } else {
          chip.classList.toggle('hidden', !agent.includes(q));
        }
      });
      if (expandBtn) {
        expandBtn.classList.toggle('hidden', q.length > 0);
      }
    });
  }

  // Delegated click handler: .btn-open-monograph & çevrimdışı PDF/Web koruma
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
