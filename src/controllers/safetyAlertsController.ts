// ============================================================================
// SAFETY ALERTS & DRUG SEARCH CONTROLLER
// Akılcı İlaç, Güvenlik Kalkanı, TİTCK Arama ve Tedavi Listesi Denetleyicisi
// ============================================================================
import { appState } from '../state';
import { escapeHtml, getEl, getNum, getVal } from '../utils/domUtils';
import type { PatientAgeResult } from './biometryController';
import {
    detectTripleWhammy,
    checkSerotoninSyndrome,
    checkHyperkalemiaRisk,
    checkCypStatinInteraction,
    checkRenalDoseAdjustments,
    checkPregnancySafety,
    checkNeonatalDrugSafety
} from '../engines/safetyPrescriptionEngine';
import { ensureDrugCatalogReady, isDrugCatalogReady, searchDrugsInDB, type DrugSearchMode } from '../db/titckIndexedDB';
import { ensureMonographsReady, findMonographSync } from '../monographEngine';
import { getDrugBadgesHTML } from '../drugEngine';
import { openDrugEquivalentsModal } from './equivalentsModalController';

export type { DrugSearchMode };

declare global {
    interface Window {
        removeDrug?: (index: number) => void;
    }
}

let onTabsUpdateCallback: () => void = () => {};

export function setDrugUpdateCallback(callback: () => void): void {
    onTabsUpdateCallback = callback;
}

// ----------------------------------------------------------------------------
// 1. GÜVENLİK VE AKILCI REÇETE KONTROLÜ
// ----------------------------------------------------------------------------
export function updateSafetyAlertsCard(ageData: PatientAgeResult): void {
    const isNeonate = (ageData.days !== null && ageData.days !== undefined && ageData.days <= 28);
    const selectedDrugs = (appState.treatment && appState.treatment.selectedDrugs) ? appState.treatment.selectedDrugs : [];
    appState.safetyPrescription.selectedSafetyDrugs = selectedDrugs;
    const safetyEgfr = getNum('input-safety-egfr') ?? appState.biometry.egfr;
    const safetyTrimEl = getEl<HTMLSelectElement>('select-safety-trimester');
    if (safetyTrimEl) {
        if (!safetyTrimEl.dataset.listenerBound) {
            safetyTrimEl.dataset.listenerBound = 'true';
            safetyTrimEl.addEventListener('change', () => {
                safetyTrimEl.dataset.userModified = 'true';
            });
        }
        if (!safetyTrimEl.dataset.userModified && appState.obgyn.eddData?.trimester &&
            (typeof document === 'undefined' || document.activeElement !== safetyTrimEl)) {
            safetyTrimEl.value = String(appState.obgyn.eddData.trimester);
        }
    }
    const safetyTrim = getNum('select-safety-trimester') || (appState.obgyn.eddData?.trimester || appState.medicine.pregnancyTrimester || 0);

    const outWhammy = getEl('output-safety-triple-whammy');
    const outSerotonin = getEl('output-safety-serotonin');
    const outHyperkalemia = getEl('output-safety-hyperkalemia');
    const outCypStatin = getEl('output-safety-cyp-statin');
    const outRenal = getEl('output-safety-renal');
    const outPreg = getEl('output-safety-pregnancy');
    const badgeSafety = getEl('badge-safety-status');

    if (selectedDrugs.length > 0) {
        // 1. Triple Whammy AKI
        const whammyRes = detectTripleWhammy(selectedDrugs);
        appState.safetyPrescription.tripleWhammy = whammyRes;
        if (whammyRes.isTripleWhammy || whammyRes.isDoubleRisk) {
            if (outWhammy) {
                outWhammy.classList.remove('hidden');
                outWhammy.className = `p-2.5 rounded-lg border tabular-nums space-y-1 text-xs ${whammyRes.alertClass === 'danger' ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                outWhammy.innerHTML = `
                    <div class="font-bold text-xs">${whammyRes.title}</div>
                    <div class="text-xs leading-relaxed">${whammyRes.mechanism || ''}</div>
                    <div class="text-xs">${(whammyRes.recommendations || []).join(' ')}</div>
                `;
            }
        } else if (outWhammy) {
            outWhammy.classList.add('hidden');
        }

        // 2. Serotonin Sendromu Kalkanı (Hunter Kriterleri Uyumlu)
        const seroRes = checkSerotoninSyndrome(selectedDrugs);
        appState.safetyPrescription.serotoninSyndrome = seroRes;
        if (seroRes.isHighRisk) {
            if (outSerotonin) {
                outSerotonin.classList.remove('hidden');
                outSerotonin.className = `p-2.5 rounded-lg border tabular-nums space-y-1 text-xs ${seroRes.alertClass === 'danger' ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                outSerotonin.innerHTML = `
                    <div class="font-bold text-xs">${seroRes.title}</div>
                    <div class="text-xs leading-relaxed">${seroRes.mechanism || ''}</div>
                    <div class="text-xs text-slate-300 italic">${seroRes.hunterCriteriaInfo || ''}</div>
                    <div class="text-xs">• <strong>Öneriler:</strong> ${(seroRes.recommendations || []).join(' ')}</div>
                `;
            }
        } else if (outSerotonin) {
            outSerotonin.classList.add('hidden');
        }

        // 3. Ölümcül Hiperkalemi Kalkanı (RAAS + K-Tutucu + Trimetoprim/Bactrim + NSAİİ)
        const patientAgeYears = ageData.y !== undefined && ageData.y !== null ? ageData.y : (appState.biometry.ageYears ?? null);
        const hyperKRes = checkHyperkalemiaRisk(selectedDrugs, {
            egfr: safetyEgfr,
            ageYears: patientAgeYears,
            baselineK: null
        });
        appState.safetyPrescription.hyperkalemiaRisk = hyperKRes;
        if (hyperKRes.isAtRisk) {
            if (outHyperkalemia) {
                outHyperkalemia.classList.remove('hidden');
                outHyperkalemia.className = `p-2.5 rounded-lg border tabular-nums space-y-1 text-xs ${hyperKRes.alertClass === 'danger' ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                outHyperkalemia.innerHTML = `
                    <div class="font-bold text-xs">${hyperKRes.title}</div>
                    <div class="text-xs leading-relaxed">${hyperKRes.mechanism || ''}</div>
                    ${hyperKRes.riskFactorsIdentified.length > 0 ? `<div class="text-xs text-amber-300 font-semibold">• Tespit Edilen Riskler: ${hyperKRes.riskFactorsIdentified.join(' | ')}</div>` : ''}
                    <div class="text-xs">• <strong>Klinik Eylem:</strong> ${(hyperKRes.recommendations || []).join(' ')}</div>
                `;
            }
        } else if (outHyperkalemia) {
            outHyperkalemia.classList.add('hidden');
        }

        // 4. CYP3A4 Güçlü İnhibisyonu & Statin Rabdomiyoliz Kalkanı
        const cypStatinRes = checkCypStatinInteraction(selectedDrugs);
        appState.safetyPrescription.cypStatinInteraction = cypStatinRes;
        if (cypStatinRes.hasInteraction) {
            if (outCypStatin) {
                outCypStatin.classList.remove('hidden');
                outCypStatin.className = `p-2.5 rounded-lg border tabular-nums space-y-1 text-xs ${cypStatinRes.alertClass === 'danger' ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                outCypStatin.innerHTML = `
                    <div class="font-bold text-xs">${cypStatinRes.title}</div>
                    <div class="text-xs leading-relaxed">${cypStatinRes.mechanism || ''}</div>
                    <div class="text-xs text-emerald-300">• <strong>Güvenli Alternatif:</strong> ${[...cypStatinRes.safeAlternatives.antibiotics, ...cypStatinRes.safeAlternatives.statins].join(' | ')}</div>
                    <div class="text-xs">• <strong>Öneriler:</strong> ${(cypStatinRes.recommendations || []).join(' ')}</div>
                `;
            }
        } else if (outCypStatin) {
            outCypStatin.classList.add('hidden');
        }

        // 5. Renal Doz Kesintileri (eGFR)
        if (safetyEgfr) {
            const scrVal = getNum('input-creatinine');
            const renalRes = checkRenalDoseAdjustments({
                egfr: safetyEgfr,
                ageYears: appState.biometry.ageYears,
                gender: appState.biometry.gender,
                heightCm: appState.biometry.heightCm,
                weightKg: appState.biometry.weightKg,
                serumCreatinineMgDl: scrVal,
                drugs: selectedDrugs
            });
            appState.safetyPrescription.renalAdjustments = renalRes;
            if (renalRes && (renalRes.alertsCount ?? 0) > 0) {
                if (outRenal) {
                    outRenal.classList.remove('hidden');
                    outRenal.className = `p-2.5 rounded-lg border tabular-nums space-y-1 text-xs ${renalRes.hasContraindication ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                    
                    let headerTitle = `Renal Dozaj Uyarısı (eGFR: ${escapeHtml(renalRes.egfr)} mL/dk)`;
                    if (renalRes.comprehensiveEvaluation?.isObesityDiscordant && typeof renalRes.cockcroftGaultCrCl === 'number') {
                        headerTitle = `[KRİTİK UYARI] Renal Dozaj & DOAC Obezite Uyuşmazlığı (eGFR: ${escapeHtml(renalRes.egfr)} vs CrCl: ${escapeHtml(renalRes.cockcroftGaultCrCl)} mL/dk)`;
                    } else if (typeof renalRes.deindexedAbsoluteGfr === 'number' && Math.abs(renalRes.deindexedAbsoluteGfr - (renalRes.egfr || 0)) >= 5) {
                        headerTitle = `Renal Dozaj (eGFR: ${escapeHtml(renalRes.egfr)} | Mutlak GFR: ${escapeHtml(renalRes.deindexedAbsoluteGfr)} mL/dk)`;
                    }

                    const alertsHtml = (renalRes.comprehensiveEvaluation?.clinicalAlerts || [])
                        .filter((a: any) => a.severity === 'CRITICAL')
                        .map((a: any) => `<div class="p-1.5 rounded bg-red-900/40 border border-red-700/60 text-red-200 font-sans font-bold text-xs">${escapeHtml(a.title)}: ${escapeHtml(a.message)}</div>`)
                        .join('');

                    outRenal.innerHTML = `
                        <div class="font-bold text-xs">${headerTitle}</div>
                        ${alertsHtml}
                        ${(renalRes.warnings || []).map((w: any) => `<div class="text-xs leading-relaxed">• <strong>${escapeHtml(w.drug)}</strong>: ${escapeHtml(w.message)}</div>`).join('')}
                    `;
                }
            } else if (outRenal) {
                outRenal.classList.add('hidden');
            }
        } else {
            appState.safetyPrescription.renalAdjustments = null;
            const scrVal = getNum('input-creatinine');
            const isPediatric = ((appState.biometry.ageYears !== null && appState.biometry.ageYears < 18) || 
                                 (appState.biometry.ageMonths !== null && appState.biometry.ageMonths < 216));
            if (outRenal) {
                if (isPediatric && scrVal !== null && scrVal > 1.2 && !appState.biometry.heightCm) {
                    outRenal.classList.remove('hidden');
                    outRenal.className = 'p-2.5 rounded-lg border tabular-nums space-y-1 text-xs bg-rose-950/50 border-rose-600/70 text-rose-200';
                    outRenal.innerHTML = `
                        <div class="font-bold text-xs uppercase tracking-wide text-rose-300">[DİKKAT] Pediatrik Renal Dozaj Güvenlik Kalkanı Riski</div>
                        <div class="text-xs leading-relaxed font-semibold text-rose-300">Serum Kreatinini (${escapeHtml(scrVal)} mg/dL) yüksek ancak Boy (cm) girilmediği için Schwartz renal klerensi hesaplanamadı! Böbrek yetmezliği riski ve nefrotoksisite nedeniyle lütfen boy giriniz.</div>
                    `;
                } else {
                    outRenal.classList.add('hidden');
                }
            }
        }

        // 6. Gebelik & Fetal Risk
        if (safetyTrim > 0) {
            const pregRes = checkPregnancySafety(selectedDrugs, { trimester: safetyTrim });
            appState.safetyPrescription.pregnancySafety = pregRes;
            if (pregRes.alertsCount > 0) {
                if (outPreg) {
                    outPreg.classList.remove('hidden');
                    outPreg.className = `p-2.5 rounded-lg border tabular-nums space-y-1 text-xs ${pregRes.hasSevereFetalRisk ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                    outPreg.innerHTML = `
                        <div class="font-bold text-xs">Gebelik ve Fetotoksisite Uyarısı (${escapeHtml(safetyTrim)}. Trimester)</div>
                        ${pregRes.alerts.map((a: any) => `<div class="text-xs leading-relaxed">• <strong>${escapeHtml(a.drugName)} (Kategori ${escapeHtml(a.category)})</strong>: ${escapeHtml(a.warning)}</div>`).join('')}
                    `;
                }
            } else if (outPreg) {
                outPreg.classList.add('hidden');
            }
        } else {
            appState.safetyPrescription.pregnancySafety = null;
            if (outPreg) outPreg.classList.add('hidden');
        }

        // 7. Yenidoğan İlaç Toksisite ve Kontrendikasyon Kalkanı
        const outNeoDrug = getEl('output-safety-neonatal');
        if (isNeonate && ageData.days !== null) {
            const neoDrugRes = checkNeonatalDrugSafety(selectedDrugs, { ageDays: ageData.days });
            appState.safetyPrescription.neonatalDrugSafety = neoDrugRes;
            if (neoDrugRes.alertsCount > 0) {
                if (outNeoDrug) {
                    outNeoDrug.classList.remove('hidden');
                    outNeoDrug.className = `p-2.5 rounded-lg border tabular-nums space-y-1 text-xs ${neoDrugRes.hasContraindication ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                    outNeoDrug.innerHTML = `
                        <div class="font-bold text-xs">Yenidoğan İlaç Güvenlik Kalkanı</div>
                        ${neoDrugRes.alerts.map((a: any) => `<div class="text-xs leading-relaxed">• <strong>${escapeHtml(a.drugName)}</strong>: ${escapeHtml(a.warning)}</div>`).join('')}
                    `;
                }
            } else if (outNeoDrug) {
                outNeoDrug.classList.add('hidden');
            }
        } else {
            appState.safetyPrescription.neonatalDrugSafety = null;
            if (outNeoDrug) outNeoDrug.classList.add('hidden');
        }

        // Status Badge Update
        if (badgeSafety) {
            const isPediatric = ((appState.biometry.ageYears !== null && appState.biometry.ageYears < 18) || 
                                 (appState.biometry.ageMonths !== null && appState.biometry.ageMonths < 216));
            const scrVal = getNum('input-creatinine');
            const hasPedRenalRisk = !safetyEgfr && isPediatric && scrVal !== null && scrVal > 1.2 && !appState.biometry.heightCm;

            const hasDanger = Boolean(
                hasPedRenalRisk ||
                (appState.safetyPrescription.tripleWhammy?.isTripleWhammy) ||
                (appState.safetyPrescription.serotoninSyndrome?.severity === 'CRITICAL') ||
                (appState.safetyPrescription.hyperkalemiaRisk?.severity === 'CRITICAL') ||
                (appState.safetyPrescription.cypStatinInteraction?.severity === 'CRITICAL') ||
                (appState.safetyPrescription.renalAdjustments?.hasContraindication) ||
                (appState.safetyPrescription.pregnancySafety?.hasSevereFetalRisk) ||
                (appState.safetyPrescription.neonatalDrugSafety?.hasContraindication)
            );
            const totalWarns = 
                (hasPedRenalRisk ? 1 : 0) +
                (appState.safetyPrescription.renalAdjustments?.alertsCount || 0) +
                (appState.safetyPrescription.pregnancySafety?.alertsCount || 0) +
                (appState.safetyPrescription.neonatalDrugSafety?.alertsCount || 0) +
                (appState.safetyPrescription.tripleWhammy?.isTripleWhammy ? 1 : (appState.safetyPrescription.tripleWhammy?.isDoubleRisk ? 1 : 0)) +
                (appState.safetyPrescription.serotoninSyndrome?.isHighRisk ? 1 : 0) +
                (appState.safetyPrescription.hyperkalemiaRisk?.isAtRisk ? 1 : 0) +
                (appState.safetyPrescription.cypStatinInteraction?.hasInteraction ? 1 : 0);
            if (hasDanger) {
                badgeSafety.textContent = 'Kritik Uyarı';
                badgeSafety.className = 'text-xs tabular-nums px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold';
            } else if (totalWarns > 0) {
                badgeSafety.textContent = `${totalWarns} Uyarı`;
                badgeSafety.className = 'text-xs tabular-nums px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-semibold';
            } else {
                badgeSafety.textContent = 'Güvenli';
                badgeSafety.className = 'text-xs tabular-nums px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-semibold';
            }
        }
    } else {
        const outNeoDrug = getEl('output-safety-neonatal');
        appState.safetyPrescription.tripleWhammy = null;
        appState.safetyPrescription.serotoninSyndrome = null;
        appState.safetyPrescription.hyperkalemiaRisk = null;
        appState.safetyPrescription.cypStatinInteraction = null;
        appState.safetyPrescription.renalAdjustments = null;
        appState.safetyPrescription.pregnancySafety = null;
        appState.safetyPrescription.neonatalDrugSafety = null;
        if (outWhammy) outWhammy.classList.add('hidden');
        if (outSerotonin) outSerotonin.classList.add('hidden');
        if (outHyperkalemia) outHyperkalemia.classList.add('hidden');
        if (outCypStatin) outCypStatin.classList.add('hidden');
        if (outRenal) outRenal.classList.add('hidden');
        if (outPreg) outPreg.classList.add('hidden');
        if (outNeoDrug) outNeoDrug.classList.add('hidden');
        if (badgeSafety) {
            badgeSafety.textContent = 'Aktif';
            badgeSafety.className = 'text-xs tabular-nums px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700';
        }
    }
}

// ----------------------------------------------------------------------------
// 2. SEÇİLEN İLAÇLARIN RENDER EDİLMESİ
// ----------------------------------------------------------------------------
export function renderSelectedDrugs(): void {
    const container = getEl('container-selected-drugs');
    if (!container) return;
    if (!appState.treatment || !appState.treatment.selectedDrugs || appState.treatment.selectedDrugs.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = appState.treatment.selectedDrugs.map((d: any, index: number) => {
        const validKt = d.kt && /^https?:\/\//i.test(d.kt) ? escapeHtml(d.kt) : '';
        const validKub = d.kub && /^https?:\/\//i.test(d.kub) ? escapeHtml(d.kub) : '';
        const safeBrand = escapeHtml(d.brand || '');
        const safeGeneric = escapeHtml(d.generic || '');
        const safeAtc = escapeHtml(d.atcCode || d.atc || '');
        const safeBarcode = escapeHtml(d.barcode || '');
        const safeRx = escapeHtml(d.rx || '');
        const dataAttrs = `data-brand="${safeBrand}" data-generic="${safeGeneric}" data-atc="${safeAtc}" data-barcode="${safeBarcode}" data-rx="${safeRx}" data-kt="${validKt}" data-kub="${validKub}"`;
        const hasMonograph = Boolean(findMonographSync(d));

        return `
        <div class="flex justify-between items-center bg-slate-900 p-2.5 rounded-lg border border-slate-700/80 mb-1.5">
            <div class="flex flex-col flex-1 pr-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs text-rose-300 font-bold">${safeBrand}</span>
                    ${d.rx && d.rx !== 'Normal' ? `<span class="text-[9px] px-1 py-0.5 rounded ${d.rx === 'Kırmızı' ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'} font-semibold">${safeRx}</span>` : ''}
                </div>
                <span class="text-[10px] text-slate-400 mt-0.5">${safeGeneric}${d.company ? ` • <span class="text-slate-500">${escapeHtml(d.company)}</span>` : ''}</span>
                <div class="flex flex-wrap items-center gap-2 mt-1">
                    <button type="button" class="btn-open-monograph inline-flex items-center gap-0.5 text-[9px] ${hasMonograph ? 'text-emerald-400 hover:text-emerald-300 font-semibold' : 'text-sky-400 hover:text-sky-300 font-semibold'} hover:underline" ${dataAttrs}>${hasMonograph ? 'Monograf' : 'Klinik Detay'}</button>
                    ${(validKt || validKub) ? `
                        ${validKt ? `<a href="${validKt}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-0.5 text-[9px] text-amber-400 hover:text-amber-300 hover:underline" ${dataAttrs}>Prospektüs</a>` : ''}
                        ${validKub ? `<a href="${validKub}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-0.5 text-[9px] text-sky-400 hover:text-sky-300 hover:underline" ${dataAttrs}>KÜB</a>` : ''}
                    ` : `
                        <a href="https://www.google.com/search?q=${encodeURIComponent((d.brand || '') + ' prospektüs kub titck pdf')}" target="_blank" rel="noopener noreferrer" class="btn-ext-drug-bridge inline-flex items-center gap-0.5 text-[9px] text-amber-400/80 hover:text-amber-300 hover:underline" ${dataAttrs} title="Google / Web üzerinde prospektüs ara">Web'de Ara</a>
                        <a href="https://titck.gov.tr/ilac/kub-kt" target="_blank" rel="noopener noreferrer" class="btn-ext-drug-bridge inline-flex items-center gap-0.5 text-[9px] text-sky-400/80 hover:text-sky-300 hover:underline" ${dataAttrs} title="TİTCK Resmi KÜB/KT Portalı">TİTCK Portalı</a>
                    `}
                </div>
            </div>
            <button class="text-slate-500 hover:text-rose-500 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors" onclick="window.removeDrug(${index})" title="İlacı Kaldır">✕</button>
        </div>
        `;
    }).join('');
}

// Global window function for inline onclick removal
if (typeof window !== 'undefined') {
    window.removeDrug = function(index: number): void {
        if (appState.treatment && appState.treatment.selectedDrugs) {
            appState.treatment.selectedDrugs.splice(index, 1);
            renderSelectedDrugs();
            onTabsUpdateCallback();
        }
    };
}

// ----------------------------------------------------------------------------
// 3. TİTCK İLAÇ ARAMA MOTORU & ETKİLEŞİM ARAYÜZÜ
// ----------------------------------------------------------------------------
let currentDrugSearchMode: DrugSearchMode = 'all';
let currentDrugSearchSeq = 0;
let drugSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function updateSearchModeUI(newMode: DrugSearchMode): void {
    currentDrugSearchMode = newMode;
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('.drug-search-mode-btn');
    modeButtons.forEach(btn => {
        const mode = btn.dataset.mode as DrugSearchMode;
        if (mode === currentDrugSearchMode) {
            btn.className = 'drug-search-mode-btn flex-1 py-1 px-1.5 rounded-md border text-center transition-all bg-rose-950/90 text-rose-200 border-rose-500 font-semibold shadow-sm text-[11px]';
        } else {
            btn.className = 'drug-search-mode-btn flex-1 py-1 px-1.5 rounded-md border text-center transition-all bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600 font-normal text-[11px]';
        }
    });

    const drugInput = getEl<HTMLInputElement>('input-drug-search');
    if (drugInput) {
        if (currentDrugSearchMode === 'brand') {
            drugInput.placeholder = 'İlaç / Müstahzar ticari adı ile ara (örn. Parol, Augmentin)...';
        } else if (currentDrugSearchMode === 'generic') {
            drugInput.placeholder = 'Etken madde / jenerik molekül adı ile ara (örn. Parasetamol, Amoksisilin)...';
        } else if (currentDrugSearchMode === 'barcode') {
            drugInput.placeholder = 'Barkod numarası veya ATC kodu ile ara (örn. 8699..., N02BE01)...';
        } else if ((currentDrugSearchMode as string) === 'esdeger') {
            drugInput.placeholder = 'SGK Eşdeğer Grubu Kodu ile ara (örn. E267A, E712B, E595A)...';
        } else {
            drugInput.placeholder = 'İlaç adı, etken madde, barkod, firma, eşdeğer kodu...';
        }

        const q = drugInput.value.trim();
        if (q.length >= 2) {
            if (drugSearchDebounceTimer) {
                clearTimeout(drugSearchDebounceTimer);
                drugSearchDebounceTimer = null;
            }
            void executeDrugSearch(q);
        }
    }
}

export async function executeDrugSearch(q: string): Promise<void> {
    const drugResult = getEl('container-search-results');
    if (!drugResult) return;
    if (q.length < 2) {
        drugResult.innerHTML = '';
        drugResult.classList.add('hidden');
        return;
    }

    const thisSeq = ++currentDrugSearchSeq;

    if (!isDrugCatalogReady()) {
        drugResult.classList.remove('hidden');
        drugResult.innerHTML = '<div class="p-3 text-xs text-sky-400 bg-slate-900 text-center rounded flex items-center justify-center gap-2"><span>TİTCK İlaç Kataloğu hazırlanıyor, aranıyor...</span></div>';
    }

    try {
        const res = await searchDrugsInDB(q, currentDrugSearchMode);
        if (thisSeq !== currentDrugSearchSeq) return;

        if (res && res.length > 0) {
            drugResult.classList.remove('hidden');
            drugResult.innerHTML = res.map((r: any) => {
                const rawKtUrl = r.kt_pdf_prospektus_url || r.kt || '';
                const rawKubUrl = r.kub_pdf_url || r.kub || '';
                const ktUrl = /^https?:\/\//i.test(rawKtUrl) ? rawKtUrl : '';
                const kubUrl = /^https?:\/\//i.test(rawKubUrl) ? rawKubUrl : '';
                const rxBorder = r.prescriptionType === 'Kırmızı' ? 'border-red-500' :
                                 r.prescriptionType === 'Yeşil' ? 'border-emerald-500' :
                                 (r.prescriptionType === 'Mor' || r.prescriptionType === 'Turuncu') ? 'border-purple-500' :
                                 'border-rose-500';

                const safeBrand = escapeHtml(r.brand);
                const safeGeneric = escapeHtml(r.generic);
                const safeAtc = escapeHtml(r.atcCode || '');
                const safeBarcode = escapeHtml(r.barcode || '');
                const safeRx = escapeHtml(r.prescriptionType || 'Normal');
                const safeCompany = escapeHtml(r.company || '');
                const safeEg = escapeHtml(r.esdegerGroup || '');
                const safeDiscount = escapeHtml(r.sgkDiscount || '');
                const safeKamuNo = escapeHtml(r.sgkKamuNo || '');
                const safePregnancy = escapeHtml(r.pregnancyCategory || '');
                const safeColdChain = r.isColdChain ? '1' : '0';
                const safeSgk = String(r.sgkReimbursed ?? 0);
                const safeKtUrl = escapeHtml(ktUrl);
                const safeKubUrl = escapeHtml(kubUrl);

                const genericHighlightClass = currentDrugSearchMode === 'generic' 
                    ? 'text-emerald-300 font-bold bg-emerald-950/70 px-1 py-0.5 rounded border border-emerald-700/60'
                    : 'text-emerald-400 font-semibold';

                const brandHighlightClass = currentDrugSearchMode === 'brand'
                    ? 'text-rose-200 underline decoration-rose-500 font-extrabold'
                    : 'text-rose-300 font-bold';

                const hasMonograph = Boolean(findMonographSync(r));
                const dataAttrs = `data-brand="${safeBrand}" data-generic="${safeGeneric}" data-atc="${safeAtc}" data-barcode="${safeBarcode}" data-rx="${safeRx}" data-esdeger="${safeEg}" data-sgk="${r.sgkReimbursed}" data-pregnancy="${safePregnancy}" data-kt="${safeKtUrl}" data-kub="${safeKubUrl}"`;

                return `
                <div class="mb-2 p-2.5 border-l-2 ${rxBorder} bg-slate-900 rounded-r-lg shadow-sm space-y-1.5 transition-all hover:bg-slate-850">
                    <div class="flex items-start justify-between gap-2">
                        <div class="cursor-pointer flex-1 drug-item-add" 
                             data-brand="${safeBrand}" 
                             data-generic="${safeGeneric}" 
                             data-atc="${safeAtc}" 
                             data-barcode="${safeBarcode}" 
                             data-rx="${safeRx}" 
                             data-esdeger="${safeEg}" 
                             data-company="${safeCompany}" 
                             data-kt="${safeKtUrl}" 
                             data-kub="${safeKubUrl}">
                            <div class="${brandHighlightClass} text-xs sm:text-sm flex flex-wrap items-center gap-1.5 leading-snug">
                                <span>${safeBrand}</span>
                                ${getDrugBadgesHTML(r)}
                            </div>
                            <div class="text-[11px] text-slate-300 font-medium mt-0.5">
                                <span class="${genericHighlightClass}">${safeGeneric}</span>
                                ${r.atcCode ? `<span class="text-slate-400 tabular-nums text-xs"> | ATC: ${safeAtc}</span>` : ''}
                                ${r.barcode ? `<span class="text-slate-400 tabular-nums text-xs"> | Barkod: ${safeBarcode}</span>` : ''}
                                ${r.esdegerGroup ? `<span class="text-cyan-400 tabular-nums text-xs"> | Eşdeğer: ${safeEg}</span>` : ''}
                                ${r.sgkDiscount ? `<span class="text-emerald-400 tabular-nums text-xs"> | Kamu İskonto: ${safeDiscount}</span>` : ''}
                                ${r.sgkKamuNo ? `<span class="text-slate-400 tabular-nums text-xs"> | Kamu No: ${safeKamuNo}</span>` : ''}
                            </div>
                            ${r.company ? `<div class="text-[9px] text-slate-400 truncate mt-0.5">${safeCompany}</div>` : ''}
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <button type="button" class="btn-open-monograph ${hasMonograph ? 'bg-emerald-950/80 border-emerald-700/70 text-emerald-300 hover:bg-emerald-900 hover:border-emerald-500' : 'bg-sky-950/80 border-sky-700/70 text-sky-300 hover:bg-sky-900 hover:border-sky-500'} border text-[10px] px-2 py-1 rounded font-semibold transition-all" ${dataAttrs} title="Çevrimdışı Klinik Monograf, Dozaj & Güvenlik">${hasMonograph ? 'Monograf' : 'Detay'}</button>
                            <button type="button" class="btn-muadil bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-500 text-[10px] px-2 py-1 rounded text-cyan-300 transition-all opacity-90 hover:opacity-100" data-id="${escapeHtml(r.id || '')}" data-brand="${safeBrand}" data-generic="${safeGeneric}" data-atc="${safeAtc}" data-barcode="${safeBarcode}" data-company="${safeCompany}" data-rx="${escapeHtml(r.prescriptionType || '')}" data-esdeger="${safeEg}" data-discount="${safeDiscount}" data-kamuno="${safeKamuNo}" data-pregnancy="${safePregnancy}" data-coldchain="${safeColdChain}" data-sgk="${safeSgk}" data-kt="${safeKtUrl}" data-kub="${safeKubUrl}" title="Eşdeğer / Muadil İlaçları ve Kamu İskontolarını Karşılaştır">Muadil</button>
                        </div>
                    </div>
                    <div class="flex items-center flex-wrap gap-2 pt-1 border-t border-slate-800">
                        ${ktUrl ? `
                            <a href="${safeKtUrl}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-1 bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-700/60 hover:border-amber-500 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors" ${dataAttrs} title="Resmi TİTCK Kullanma Talimatı (Prospektüs)">
                                <span>Prospektüs (KT)</span>
                            </a>
                        ` : ''}
                        ${kubUrl ? `
                            <a href="${safeKubUrl}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-1 bg-sky-950/70 hover:bg-sky-900 text-sky-300 border border-sky-700/60 hover:border-sky-500 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors" ${dataAttrs} title="Resmi TİTCK Kısa Ürün Bilgisi (KÜB)">
                                <span>KÜB</span>
                            </a>
                        ` : ''}
                        ${(!ktUrl && !kubUrl) ? `
                            <a href="https://www.google.com/search?q=${encodeURIComponent(r.brand + ' prospektüs kub titck pdf')}" target="_blank" rel="noopener noreferrer" class="btn-ext-drug-bridge inline-flex items-center gap-1 bg-slate-800/90 hover:bg-amber-950/60 text-amber-300 border border-slate-700 hover:border-amber-600/70 px-2 py-0.5 rounded text-[10px] font-medium transition-colors" ${dataAttrs} title="Google / Web üzerinde prospektüs & KÜB PDF ara (Çevrimdışında yerel özet açılır)">
                                <span>Web'de Ara</span>
                            </a>
                            <a href="https://titck.gov.tr/ilac/kub-kt" target="_blank" rel="noopener noreferrer" class="btn-ext-drug-bridge inline-flex items-center gap-1 bg-slate-800/90 hover:bg-sky-950/60 text-sky-300 border border-slate-700 hover:border-sky-600/70 px-2 py-0.5 rounded text-[10px] font-medium transition-colors" ${dataAttrs} title="TİTCK Resmi KÜB/KT Portalı (Çevrimdışında yerel özet açılır)">
                                <span>TİTCK Portalı</span>
                            </a>
                        ` : ''}
                    </div>
                </div>
                `;
            }).join('');
        } else {
            drugResult.classList.remove('hidden');
            let emptyMsg = 'Eşleşen ilaç bulunamadı';
            if (currentDrugSearchMode === 'generic') {
                emptyMsg = 'Etken madde modunda eşleşme bulunamadı.<br><span class="text-slate-400 text-[11px] block mt-1">Aradığınız bir ticari marka ise (örn. Parol, Augmentin), yukarıdan <strong class="text-rose-300">"İlaç Adı"</strong> veya <strong class="text-rose-300">"Tümü"</strong> sekmesine geçebilirsiniz.</span>';
            } else if (currentDrugSearchMode === 'brand') {
                emptyMsg = 'İlaç adı modunda eşleşme bulunamadı.<br><span class="text-slate-400 text-[11px] block mt-1">Aradığınız bir molekül/etken madde ise (örn. Parasetamol, Amoksisilin), yukarıdan <strong class="text-emerald-300">"Etken Madde"</strong> veya <strong class="text-rose-300">"Tümü"</strong> sekmesine geçebilirsiniz.</span>';
            } else if (currentDrugSearchMode === 'barcode') {
                emptyMsg = 'Barkod veya ATC modunda eşleşme bulunamadı.<br><span class="text-slate-400 text-[11px] block mt-1">Barkod numarasını (13 hane) veya ATC kodunu (örn. N02BE01) kontrol ediniz.</span>';
            }
            drugResult.innerHTML = `<div class="p-3 text-xs text-slate-300 bg-slate-900 text-center rounded leading-relaxed border border-slate-800">${emptyMsg}</div>`;
        }
    } catch (err) {
        console.error('Arama hatası:', err);
        drugResult.innerHTML = '<div class="p-3 text-xs text-rose-400 bg-slate-900 text-center rounded">Arama sırasında bir sorun oluştu</div>';
    }
}

export function initDrugSearch(onUpdateTabs: () => void): void {
    onTabsUpdateCallback = onUpdateTabs;

    const clearBtn = getEl('btn-clear-search');
    const drugInput = getEl<HTMLInputElement>('input-drug-search');
    const drugResult = getEl('container-search-results');
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('.drug-search-mode-btn');

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode as DrugSearchMode;
            if (mode) {
                updateSearchModeUI(mode);
            }
        });
    });

    if (drugInput) {
        drugInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const q = drugInput.value.trim();
                if (q.length >= 2) {
                    if (drugSearchDebounceTimer) {
                        clearTimeout(drugSearchDebounceTimer);
                        drugSearchDebounceTimer = null;
                    }
                    void executeDrugSearch(q);
                }
            }
        });

        drugInput.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            const q = target.value.trim();
            if (clearBtn) {
                if (q.length > 0) {
                    clearBtn.classList.remove('hidden');
                } else {
                    clearBtn.classList.add('hidden');
                }
            }

            if (drugSearchDebounceTimer) {
                clearTimeout(drugSearchDebounceTimer);
                drugSearchDebounceTimer = null;
            }

            if (q.length < 2) {
                if (drugResult) {
                    drugResult.innerHTML = '';
                    drugResult.classList.add('hidden');
                }
                return;
            }

            if (e.isTrusted === false) {
                void executeDrugSearch(q);
            } else {
                drugSearchDebounceTimer = setTimeout(() => {
                    void executeDrugSearch(q);
                }, 150);
            }
        });
    }

    if (clearBtn && drugInput && drugResult) {
        clearBtn.addEventListener('click', () => {
            drugInput.value = '';
            clearBtn.classList.add('hidden');
            drugResult.innerHTML = '';
            drugResult.classList.add('hidden');
        });
    }

    if (drugResult) {
        drugResult.addEventListener('click', async (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('.btn-pdf-link, .btn-ext-drug-bridge, .btn-open-monograph')) {
                return;
            }

            const badgeEsdeger = target.closest('.badge-esdeger-tag');
            if (badgeEsdeger && drugInput) {
                const esdeger = badgeEsdeger.getAttribute('data-esdeger') || '';
                if (esdeger) {
                    updateSearchModeUI('esdeger');
                    drugInput.value = esdeger;
                    drugInput.dispatchEvent(new Event('input'));
                    return;
                }
            }

            const btnMuadil = target.closest('.btn-muadil');
            if (btnMuadil) {
                const id = btnMuadil.getAttribute('data-id') || '';
                const brand = btnMuadil.getAttribute('data-brand') || '';
                const generic = btnMuadil.getAttribute('data-generic') || '';
                const atcCode = btnMuadil.getAttribute('data-atc') || '';
                const barcode = btnMuadil.getAttribute('data-barcode') || '';
                const company = btnMuadil.getAttribute('data-company') || '';
                const prescriptionType = btnMuadil.getAttribute('data-rx') || '';
                const esdegerGroup = btnMuadil.getAttribute('data-esdeger') || '';
                const sgkDiscount = btnMuadil.getAttribute('data-discount') || '';
                const sgkKamuNo = btnMuadil.getAttribute('data-kamuno') || '';
                const pregnancyCategory = btnMuadil.getAttribute('data-pregnancy') || '';
                const isColdChain = btnMuadil.getAttribute('data-coldchain') === '1';
                const sgkReimbursed = Number(btnMuadil.getAttribute('data-sgk') || 0);
                const kt_pdf_prospektus_url = btnMuadil.getAttribute('data-kt') || '';
                const kub_pdf_url = btnMuadil.getAttribute('data-kub') || '';

                await openDrugEquivalentsModal({
                    id,
                    brand,
                    generic,
                    atcCode,
                    barcode,
                    company,
                    prescriptionType,
                    esdegerGroup,
                    sgkDiscount,
                    sgkKamuNo,
                    pregnancyCategory,
                    isColdChain,
                    sgkReimbursed,
                    kt_pdf_prospektus_url,
                    kub_pdf_url
                });
                return;
            }

            const item = target.closest('.drug-item-add');
            if (item) {
                const brand = item.getAttribute('data-brand') || '';
                const generic = item.getAttribute('data-generic') || '';
                const atcCode = item.getAttribute('data-atc') || '';
                const barcode = item.getAttribute('data-barcode') || '';
                const rx = item.getAttribute('data-rx') || 'Normal';
                const company = item.getAttribute('data-company') || '';
                const kt = item.getAttribute('data-kt') || '';
                const kub = item.getAttribute('data-kub') || '';
                
                if (!appState.treatment) appState.treatment = { selectedDrugs: [] };
                if (!appState.treatment.selectedDrugs) appState.treatment.selectedDrugs = [];
                
                if (!appState.treatment.selectedDrugs.find((d: any) => d.brand === brand)) {
                    appState.treatment.selectedDrugs.push({ brand, generic, atcCode, barcode, rx, company, kt, kub });
                    renderSelectedDrugs();
                    onTabsUpdateCallback();
                }
            }
        });
    }
}
