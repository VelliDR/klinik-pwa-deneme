// ============================================================================
// SAFETY ALERTS & DRUG SEARCH CONTROLLER
// Akılcı İlaç, Güvenlik Kalkanı, TİTCK Arama ve Tedavi Listesi Denetleyicisi
// ============================================================================
import { appState } from '../state';
import { escapeHtml, getEl, getNum } from '../utils/domUtils';
import { getSvgIcon, replaceEmojisWithSvg } from '../utils/icons';
import type { PatientAgeResult } from './biometryController';
import {
    detectTripleWhammy,
    checkSerotoninSyndrome,
    checkHyperkalemiaRisk,
    checkCypStatinInteraction,
    checkRenalDoseAdjustments,
    checkPregnancySafety,
    checkNeonatalDrugSafety,
    evaluatePrescriptionInteractions,
    getTdmGuidance
} from '../engines/safetyPrescriptionEngine';
import { identifyRenalDrugCategory } from '../engines/renalDoseEngine';
import {
    isDrugCatalogReady,
    searchDrugsInDB,
    findCatalogDrugSync,
    type DrugSearchMode,
    type DrugFilterOptions
} from '../db/titckIndexedDB';
import {
    ensureIcd10DictionaryReady,
    getAtcIndicationBadges,
    getAtcIcd10Profile
} from '../engines/icd10DictionaryEngine';
import {
    ensureDdiMatrixReady,
    isDdiMatrixReady,
    evaluateDdiMatrixForPrescription
} from '../engines/ddiMatrixEngine';
import { findMonographSync } from '../monographEngine';
import { formatTlPrice, getDrugBadgesHTML } from '../drugEngine';
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
    const safetyEgfrEl = getEl<HTMLInputElement>('input-safety-egfr');
    if (safetyEgfrEl && (typeof document === 'undefined' || document.activeElement !== safetyEgfrEl)) {
        safetyEgfrEl.placeholder = appState.biometry.egfr !== null ? `Global: ${appState.biometry.egfr} mL/dk` : 'Biyometriden otomatik';
    }
    const safetyEgfr = getNum('input-safety-egfr') ?? appState.biometry.egfr;
    const safetyTrimEl = getEl<HTMLSelectElement>('select-safety-trimester');
    if (safetyTrimEl) {
        if (!safetyTrimEl.dataset.listenerBound) {
            safetyTrimEl.dataset.listenerBound = 'true';
            safetyTrimEl.addEventListener('change', () => {
                safetyTrimEl.dataset.userModified = 'true';
            });
        }
        if (!safetyTrimEl.dataset.userModified && (appState.obgyn.trimester || appState.obgyn.eddData?.trimester) &&
            (typeof document === 'undefined' || document.activeElement !== safetyTrimEl)) {
            safetyTrimEl.value = String(appState.obgyn.trimester || appState.obgyn.eddData?.trimester);
        }
    }
    const safetyTrim = getNum('select-safety-trimester') || (appState.obgyn.trimester || appState.obgyn.eddData?.trimester || appState.medicine.pregnancyTrimester || 0);

    const outInteractions = getEl('output-safety-interactions');
    const outDdinter = getEl('output-safety-ddinter');
    const outDuplication = getEl('output-safety-duplication');
    const outCounseling = getEl('output-safety-counseling');
    const outWhammy = getEl('output-safety-triple-whammy');
    const outSerotonin = getEl('output-safety-serotonin');
    const outHyperkalemia = getEl('output-safety-hyperkalemia');
    const outCypStatin = getEl('output-safety-cyp-statin');
    const outRenal = getEl('output-safety-renal');
    const outPreg = getEl('output-safety-pregnancy');
    const badgeSafety = getEl('badge-safety-status');

    if (selectedDrugs.length > 0) {
        const patientAgeYears = ageData.y !== undefined && ageData.y !== null ? ageData.y : (appState.biometry.ageYears ?? null);
        const scrVal = getNum('input-creatinine');
        const isPediatricOrNeonate = isNeonate || (patientAgeYears !== null && patientAgeYears < 18);

        if (!isDdiMatrixReady()) {
            void ensureDdiMatrixReady().then(loaded => {
                if (loaded && appState.treatment?.selectedDrugs?.length) {
                    updateSafetyAlertsCard(ageData);
                }
            });
        }

        // 0. 4-Kademeli Etkileşim Motoru (Interaction Tier Engine)
        const interactionsRes = evaluatePrescriptionInteractions(selectedDrugs, {
            egfr: safetyEgfr,
            ageYears: patientAgeYears,
            trimester: safetyTrim,
            ageDays: isNeonate ? (ageData.days ?? null) : null
        });
        appState.safetyPrescription.interactions = interactionsRes;
        if (outInteractions) {
            const importantAlerts = (interactionsRes?.alerts || []).filter((a: any) => a.tier === 1 || a.tier === 2);
            if (importantAlerts.length > 0) {
                outInteractions.classList.remove('hidden');
                outInteractions.innerHTML = replaceEmojisWithSvg(`
                    <div class="space-y-2">
                        ${importantAlerts.map((a: any) => {
                            if (a.tier === 1) {
                                return `
                                    <div class="p-2.5 rounded-lg bg-rose-950/70 border-2 border-rose-600 text-rose-200 text-xs space-y-1">
                                        <div class="flex items-center justify-between font-bold text-rose-300">
                                            <span class="flex items-center gap-1.5">${getSvgIcon('alertCircle', 'w-4 h-4 text-rose-400 shrink-0')}<span>TIER 1 - ÖLÜMCÜL KONTRENDİKASYON (HARD STOP)</span></span>
                                            <span class="text-[0.75rem] font-mono uppercase bg-rose-900/80 px-2 py-0.5 rounded border border-rose-500">${escapeHtml(a.ruleId)}</span>
                                        </div>
                                        <div class="font-semibold text-white">${escapeHtml(a.alertTitle)}</div>
                                        <div class="text-rose-100/90 leading-relaxed">${escapeHtml(a.message)}</div>
                                        <div class="text-[0.75rem] text-rose-300 font-mono pt-0.5">Kılavuz / Kaynak: ${escapeHtml(a.guidelineSource)}</div>
                                    </div>
                                `;
                            } else {
                                return `
                                    <div class="p-2.5 rounded-lg bg-amber-950/60 border border-amber-600 text-amber-200 text-xs space-y-1">
                                        <div class="flex items-center justify-between font-bold text-amber-300">
                                            <span class="flex items-center gap-1.5">${getSvgIcon('alertTriangle', 'w-4 h-4 text-amber-400 shrink-0')}<span>TIER 2 - YÜKSEK RİSK (SOFT STOP)</span></span>
                                            <span class="text-[0.75rem] font-mono uppercase bg-amber-900/80 px-2 py-0.5 rounded border border-amber-500">${escapeHtml(a.ruleId)}</span>
                                        </div>
                                        <div class="font-semibold text-white">${escapeHtml(a.alertTitle)}</div>
                                        <div class="text-amber-100/90 leading-relaxed">${escapeHtml(a.message)}</div>
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                `);
            } else {
                outInteractions.classList.add('hidden');
                outInteractions.innerHTML = '';
            }
        }

        // 1. Triple Whammy AKI
        const whammyRes = detectTripleWhammy(selectedDrugs);
        appState.safetyPrescription.tripleWhammy = whammyRes;
        if (whammyRes.isTripleWhammy || whammyRes.isDoubleRisk) {
            if (outWhammy) {
                outWhammy.classList.remove('hidden');
                outWhammy.className = `p-2.5 rounded-lg border tabular-nums space-y-1 text-xs ${whammyRes.alertClass === 'danger' ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                outWhammy.innerHTML = replaceEmojisWithSvg(`
                    <div class="font-bold text-xs">${whammyRes.title}</div>
                    <div class="text-xs leading-relaxed">${whammyRes.mechanism || ''}</div>
                    <div class="text-xs">${(whammyRes.recommendations || []).join(' ')}</div>
                `);
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
                outSerotonin.innerHTML = replaceEmojisWithSvg(`
                    <div class="font-bold text-xs">${seroRes.title}</div>
                    <div class="text-xs leading-relaxed">${seroRes.mechanism || ''}</div>
                    <div class="text-xs text-slate-300 italic">${seroRes.hunterCriteriaInfo || ''}</div>
                    <div class="text-xs">• <strong>Öneriler:</strong> ${(seroRes.recommendations || []).join(' ')}</div>
                `);
            }
        } else if (outSerotonin) {
            outSerotonin.classList.add('hidden');
        }

        // 3. Ölümcül Hiperkalemi Kalkanı (RAAS + K-Tutucu + Trimetoprim/Bactrim + NSAİİ)
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
                outHyperkalemia.innerHTML = replaceEmojisWithSvg(`
                    <div class="font-bold text-xs">${hyperKRes.title}</div>
                    <div class="text-xs leading-relaxed">${hyperKRes.mechanism || ''}</div>
                    ${hyperKRes.riskFactorsIdentified.length > 0 ? `<div class="text-xs text-amber-300 font-semibold">• Tespit Edilen Riskler: ${hyperKRes.riskFactorsIdentified.join(' | ')}</div>` : ''}
                    <div class="text-xs">• <strong>Klinik Eylem:</strong> ${(hyperKRes.recommendations || []).join(' ')}</div>
                `);
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
                outCypStatin.innerHTML = replaceEmojisWithSvg(`
                    <div class="font-bold text-xs">${cypStatinRes.title}</div>
                    <div class="text-xs leading-relaxed">${cypStatinRes.mechanism || ''}</div>
                    <div class="text-xs text-emerald-300">• <strong>Güvenli Alternatif:</strong> ${[...cypStatinRes.safeAlternatives.antibiotics, ...cypStatinRes.safeAlternatives.statins].join(' | ')}</div>
                    <div class="text-xs">• <strong>Öneriler:</strong> ${(cypStatinRes.recommendations || []).join(' ')}</div>
                `);
            }
        } else if (outCypStatin) {
            outCypStatin.classList.add('hidden');
        }

        // 5. DOAC ve Renal Doz Kesintileri (eGFR / CrCl)
        const hasDoacInSelected = selectedDrugs.some((d: any) => {
            const cat = identifyRenalDrugCategory(d);
            return cat.category === 'DOAC_COCKCROFT_MANDATORY';
        });
        const hasDoacLock = hasDoacInSelected && (!safetyEgfr && (scrVal === null || scrVal === undefined || isNaN(scrVal)));

        if (safetyEgfr) {
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

                    outRenal.innerHTML = replaceEmojisWithSvg(`
                        <div class="font-bold text-xs">${headerTitle}</div>
                        ${alertsHtml}
                        ${(renalRes.warnings || []).map((w: any) => {
                            const tdmGuide = w.tdmGuidance || getTdmGuidance(w.drug);
                            const tdmBadge = tdmGuide ? `<span class="inline-block px-1.5 py-0.5 rounded text-[0.75rem] bg-purple-900/60 border border-purple-500 text-purple-200 font-bold uppercase mr-1">TDM ŞART</span>` : '';
                            const tdmHtml = tdmGuide ? `<div class="mt-0.5 text-[0.8125rem] text-purple-300 font-semibold">• <strong>TDM Kılavuzu:</strong> ${escapeHtml(tdmGuide)}</div>` : '';
                            return `<div class="text-xs leading-relaxed">• ${tdmBadge}<strong>${escapeHtml(w.drug)}</strong>: ${escapeHtml(w.message)}${tdmHtml}</div>`;
                        }).join('')}
                    `);
                }
            } else if (outRenal) {
                outRenal.classList.add('hidden');
            }
        } else {
            appState.safetyPrescription.renalAdjustments = null;
            const isPediatric = ((appState.biometry.ageYears !== null && appState.biometry.ageYears < 18) || 
                                 (appState.biometry.ageMonths !== null && appState.biometry.ageMonths < 216));
            if (outRenal) {
                if (hasDoacLock) {
                    outRenal.classList.remove('hidden');
                    outRenal.className = 'p-2.5 rounded-lg border tabular-nums space-y-1 text-xs bg-rose-950/60 border-rose-600 text-rose-200';
                    outRenal.innerHTML = `
                        <div class="font-bold text-xs uppercase tracking-wide text-rose-300 flex items-center gap-1.5">${getSvgIcon('ban', 'w-4 h-4 text-rose-400 shrink-0')}<span>DOAC RENAL GÜVENLİK KİLİDİ</span></div>
                        <div class="text-xs leading-relaxed font-semibold text-rose-300">DOAC (Apiksaban/Rivaroksaban/Dabigatran/Edoksaban) reçetelerinde Cockcroft-Gault CrCl kontrolü zorunludur. Lütfen kreatinin giriniz! Obez veya renal riskli hastalarda eGFR ile doz tayini majör fatal kanama riski oluşturur.</div>
                    `;
                } else if (isPediatric && scrVal !== null && scrVal > 1.2 && !appState.biometry.heightCm) {
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
        const gestationalWeeks = appState.obgyn.eddData?.weeks;
        if (safetyTrim > 0 || (typeof gestationalWeeks === 'number' && gestationalWeeks > 0)) {
            const pregRes = checkPregnancySafety(selectedDrugs, {
                trimester: safetyTrim,
                gestationalWeeks: gestationalWeeks
            });
            appState.safetyPrescription.pregnancySafety = pregRes;
            if (pregRes.alertsCount > 0) {
                if (outPreg) {
                    outPreg.classList.remove('hidden');
                    outPreg.className = `p-2.5 rounded-lg border tabular-nums space-y-1 text-xs ${pregRes.hasSevereFetalRisk ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                    outPreg.innerHTML = replaceEmojisWithSvg(`
                        <div class="font-bold text-xs">Gebelik ve Fetotoksisite Uyarısı (${escapeHtml(safetyTrim || (gestationalWeeks ? Math.ceil(gestationalWeeks / 13) : ''))}. Trimester${gestationalWeeks ? ` - ${gestationalWeeks}. Hafta` : ''})</div>
                        ${pregRes.alerts.map((a: any) => `<div class="text-xs leading-relaxed">• <strong>${escapeHtml(a.drugName)} (Kategori ${escapeHtml(a.category)})</strong>: ${escapeHtml(a.warning)}</div>`).join('')}
                    `);
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
                    outNeoDrug.innerHTML = replaceEmojisWithSvg(`
                        <div class="font-bold text-xs">Yenidoğan İlaç Güvenlik Kalkanı</div>
                        ${neoDrugRes.alerts.map((a: any) => `<div class="text-xs leading-relaxed">• <strong>${escapeHtml(a.drugName)}</strong>: ${escapeHtml(a.warning)}</div>`).join('')}
                    `);
                }
            } else if (outNeoDrug) {
                outNeoDrug.classList.add('hidden');
            }
        } else {
            appState.safetyPrescription.neonatalDrugSafety = null;
            if (outNeoDrug) outNeoDrug.classList.add('hidden');
        }

        // 8. DDInter 2.0 (81.355 kural), Terapötik Duplikasyon ve Besin / Kullanım Danışmanlığı
        const enrichedSelected = selectedDrugs.map((d: any) => {
            const cat = findCatalogDrugSync({ barcode: d.barcode, brand: d.brand, atc: d.atcCode || d.atc });
            return {
                brand: d.brand || cat?.brand || 'İlaç',
                generic: d.generic || cat?.generic || '',
                atcCode: d.atcCode || d.atc || cat?.atcCode || '',
                mealTiming: d.mealTiming || cat?.mealTiming || '',
                mealTimingCode: d.mealTimingCode ?? cat?.mealTimingCode ?? 0,
                drivingRisk: d.drivingRisk || cat?.drivingRisk || '',
                drivingRiskCode: d.drivingRiskCode ?? cat?.drivingRiskCode ?? 0,
                allergens: Array.isArray(d.allergens) && d.allergens.length > 0 ? d.allergens : (cat?.allergens || [])
            };
        });

        // Mevcut Tier 1-2 motorunun yakaladığı ATC çiftlerini tekilleştir
        const existingCoveredPairs = new Set<string>();
        for (const alert of (interactionsRes?.alerts || [])) {
            if (alert.tier !== 1 && alert.tier !== 2) continue;
            const involvedAtcs: string[] = [];
            for (const inv of (alert.involvedDrugs || [])) {
                const rawName = String(inv.raw || '').toLowerCase();
                const match = enrichedSelected.find((s: any) => s.brand.toLowerCase() === rawName || s.generic.toLowerCase() === rawName);
                if (match?.atcCode) involvedAtcs.push(match.atcCode.toUpperCase());
            }
            for (let i = 0; i < involvedAtcs.length; i++) {
                for (let j = i + 1; j < involvedAtcs.length; j++) {
                    const a = involvedAtcs[i];
                    const b = involvedAtcs[j];
                    if (a !== b) existingCoveredPairs.add(a < b ? `${a}:${b}` : `${b}:${a}`);
                }
            }
        }

        const ddiEval = evaluateDdiMatrixForPrescription(enrichedSelected, {
            existingCoveredPairs,
            isPediatricOrNeonate
        });

        // 8a. DDInter 2.0 & 28 Küratörlü Türkçe Etkileşim Çıktısı (Major açık, Moderate kapalı akordeon!)
        if (outDdinter) {
            const topDdiAlerts = [...ddiEval.curatedAlerts, ...ddiEval.majorAlerts];
            const modAlerts = ddiEval.moderateAlerts;

            if (topDdiAlerts.length > 0 || modAlerts.length > 0) {
                outDdinter.classList.remove('hidden');
                const topHtml = topDdiAlerts.map(a => {
                    const isCrit = a.severity === 'K';
                    const cls = isCrit
                        ? 'bg-rose-950/50 border-rose-600/75 text-rose-100'
                        : 'bg-amber-950/50 border-amber-600/70 text-amber-100';
                    const badgeCls = isCrit
                        ? 'bg-rose-900/80 text-rose-200 border-rose-500/70'
                        : 'bg-amber-900/80 text-amber-200 border-amber-500/70';
                    return `
                        <div class="p-2.5 rounded-lg border ${cls} space-y-1">
                            <div class="flex flex-wrap items-center justify-between gap-1.5">
                                <span class="font-bold text-xs">${escapeHtml(a.title)}</span>
                                <span class="text-[0.6875rem] font-mono px-1.5 py-0.2 rounded border ${badgeCls}">${escapeHtml(a.severityLabel)}</span>
                            </div>
                            <div class="text-[0.75rem] leading-relaxed opacity-95">${escapeHtml(a.message)}</div>
                        </div>
                    `;
                }).join('');

                const modHtml = modAlerts.length > 0
                    ? `
                        <details class="rounded-lg border border-amber-700/50 bg-amber-950/20 overflow-hidden group">
                            <summary class="px-2.5 py-2 cursor-pointer select-none flex items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden text-amber-200 font-semibold text-xs hover:bg-amber-950/35">
                                <span>${modAlerts.length} Orta Düzey (DDInter 2.0) İlaç Etkileşimi — İncele</span>
                                <span class="text-amber-300 group-open:rotate-180 transition-transform">▾</span>
                            </summary>
                            <div class="px-2.5 pb-2.5 pt-1 border-t border-amber-800/40 space-y-1.5 max-h-48 overflow-y-auto">
                                ${modAlerts.map(a => `
                                    <div class="text-[0.75rem] text-amber-100 leading-relaxed">
                                        • <strong>${escapeHtml(a.genericA)} + ${escapeHtml(a.genericB)}</strong> <span class="text-slate-400">(${escapeHtml(a.drugA)} / ${escapeHtml(a.drugB)})</span>: ${escapeHtml(a.message)}
                                    </div>
                                `).join('')}
                            </div>
                        </details>
                    `
                    : '';

                outDdinter.innerHTML = `${topHtml}${modHtml}`;
            } else {
                outDdinter.classList.add('hidden');
                outDdinter.innerHTML = '';
            }
        }

        // 8b. Terapötik Duplikasyon Uyarısı
        if (outDuplication) {
            if (ddiEval.duplications.length > 0) {
                outDuplication.classList.remove('hidden');
                outDuplication.className = 'p-2.5 rounded-lg border bg-amber-950/45 border-amber-600/70 text-amber-100 text-xs space-y-1';
                outDuplication.innerHTML = `
                    <div class="font-bold text-amber-300">Terapötik Duplikasyon Uyarısı (${ddiEval.duplications.length})</div>
                    ${ddiEval.duplications.map(dup => `
                        <div class="text-[0.75rem] leading-relaxed">
                            • <strong>${escapeHtml(dup.groupLabelTr)}:</strong> ${dup.drugs.map(x => escapeHtml(x.brand)).join(' + ')}
                        </div>
                    `).join('')}
                `;
            } else {
                outDuplication.classList.add('hidden');
                outDuplication.innerHTML = '';
            }
        }

        // 8c. Besin, Alkol & Hasta Danışmanlığı Özet Şeridi (Ansiklopediye dönmeden tek kompakt kart!)
        if (outCounseling) {
            const c = ddiEval.counseling;
            if (c.totalSignals > 0) {
                outCounseling.classList.remove('hidden');
                outCounseling.className = 'p-2.5 rounded-lg border bg-sky-950/30 border-sky-800/60 text-slate-200 text-xs space-y-2';

                const foodPills = c.foods.length > 0
                    ? `
                        <div class="space-y-1">
                            <div class="text-[0.6875rem] uppercase tracking-wider font-bold text-sky-300">Besin &amp; Alkol Uyarıları</div>
                            <div class="flex flex-wrap gap-1.5">
                                ${c.foods.map(f => {
                                    const pillCls = f.severity === 'K'
                                        ? 'bg-rose-950/70 text-rose-200 border-rose-600/70 font-semibold'
                                        : f.severity === 'O'
                                        ? 'bg-amber-950/60 text-amber-200 border-amber-700/60'
                                        : 'bg-slate-800/80 text-slate-200 border-slate-700';
                                    return `<span class="px-2 py-0.5 rounded-md border text-[0.75rem] ${pillCls}" title="${escapeHtml(f.shortGuidanceTr)} (${escapeHtml(f.drugs.join(', '))})">${escapeHtml(f.foodLabelTr)}</span>`;
                                }).join('')}
                            </div>
                            <details class="pt-0.5">
                                <summary class="text-[0.75rem] text-sky-400 hover:underline cursor-pointer select-none">Besin etkileşim detaylarını göster (${c.foods.length})</summary>
                                <div class="mt-1 space-y-1 text-[0.75rem] text-slate-300 leading-relaxed">
                                    ${c.foods.map(f => `<div>• <strong class="text-slate-100">${escapeHtml(f.foodLabelTr)}</strong> <span class="text-slate-400">[${escapeHtml(f.drugs.join(', '))}]</span>: ${escapeHtml(f.shortGuidanceTr)}</div>`).join('')}
                                </div>
                            </details>
                        </div>
                    `
                    : '';

                const usageLines: string[] = [];
                if (c.mealTimings.length > 0) {
                    usageLines.push(`<div><strong class="text-emerald-300">Aç/Tok:</strong> ${c.mealTimings.map(m => `${escapeHtml(m.drug)} (${escapeHtml(m.timing)})`).join(' • ')}</div>`);
                }
                if (c.drivingWarnings.length > 0) {
                    usageLines.push(`<div><strong class="text-amber-300">Araç/Makine:</strong> ${c.drivingWarnings.map(w => `${escapeHtml(w.drug)} — ${escapeHtml(w.risk)}`).join(' • ')}</div>`);
                }
                if (c.criticalExcipients.length > 0) {
                    usageLines.push(`<div><strong class="text-violet-300">Kritik Eksipiyan:</strong> ${c.criticalExcipients.map(e => `${escapeHtml(e.excipient)} (${escapeHtml(e.drugs.join(', '))})`).join(' • ')}</div>`);
                }

                outCounseling.innerHTML = `
                    <div class="flex items-center justify-between gap-2">
                        <span class="font-bold text-sky-300 uppercase tracking-wide text-[0.75rem]">Reçete Besin &amp; Hasta Danışmanlığı</span>
                        <span class="text-[0.6875rem] font-mono text-slate-400">${c.totalSignals} ipucu</span>
                    </div>
                    ${foodPills}
                    ${usageLines.length > 0 ? `<div class="space-y-1 text-[0.75rem] text-slate-200 leading-relaxed ${foodPills ? 'pt-1.5 border-t border-slate-800/80' : ''}">${usageLines.join('')}</div>` : ''}
                `;
            } else {
                outCounseling.classList.add('hidden');
                outCounseling.innerHTML = '';
            }
        }

        // Status Badge Update
        if (badgeSafety) {
            const isPediatric = ((appState.biometry.ageYears !== null && appState.biometry.ageYears < 18) || 
                                 (appState.biometry.ageMonths !== null && appState.biometry.ageMonths < 216));
            const hasPedRenalRisk = !safetyEgfr && isPediatric && scrVal !== null && scrVal > 1.2 && !appState.biometry.heightCm;
            const hasCuratedCritical = ddiEval.curatedAlerts.some(a => a.severity === 'K');

            const hasDanger = Boolean(
                hasPedRenalRisk ||
                hasDoacLock ||
                hasCuratedCritical ||
                (interactionsRes?.hasHardStop) ||
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
                (hasDoacLock ? 1 : 0) +
                (interactionsRes?.alerts?.length || 0) +
                ddiEval.curatedAlerts.length +
                ddiEval.majorAlerts.length +
                ddiEval.duplications.length +
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
        const outInteractions = getEl('output-safety-interactions');
        const outNeoDrug = getEl('output-safety-neonatal');
        appState.safetyPrescription.interactions = null;
        appState.safetyPrescription.tripleWhammy = null;
        appState.safetyPrescription.serotoninSyndrome = null;
        appState.safetyPrescription.hyperkalemiaRisk = null;
        appState.safetyPrescription.cypStatinInteraction = null;
        appState.safetyPrescription.renalAdjustments = null;
        appState.safetyPrescription.pregnancySafety = null;
        appState.safetyPrescription.neonatalDrugSafety = null;
        if (outInteractions) {
            outInteractions.classList.add('hidden');
            outInteractions.innerHTML = '';
        }
        if (outDdinter) {
            outDdinter.classList.add('hidden');
            outDdinter.innerHTML = '';
        }
        if (outDuplication) {
            outDuplication.classList.add('hidden');
            outDuplication.innerHTML = '';
        }
        if (outCounseling) {
            outCounseling.classList.add('hidden');
            outCounseling.innerHTML = '';
        }
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
        const tlLabel = formatTlPrice(d.retailPriceTl);
        const icdProf = d.atcCode || d.atc ? getAtcIcd10Profile(d.atcCode || d.atc) : null;
        const displayGeneric = escapeHtml(icdProf?.activeIngredientTr || d.generic || '');

        return `
        <div class="flex justify-between items-center bg-slate-900/70 p-2.5 rounded-lg border border-slate-700/70 mb-1.5">
            <div class="flex flex-col flex-1 pr-2 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs text-slate-100 font-bold">${safeBrand}</span>
                    ${tlLabel ? `<span class="text-[0.6875rem] px-1.5 py-0.2 rounded bg-slate-800 text-slate-200 border border-slate-700 tabular-nums">${tlLabel}</span>` : ''}
                    ${d.isExtraMonitoring ? `<span class="text-[0.6875rem] px-1.5 py-0.2 rounded bg-violet-950/70 text-violet-200 border border-violet-600/70 font-semibold">▼ Ek İzlem</span>` : ''}
                    ${d.rx && d.rx !== 'Normal' ? `<span class="text-[0.6875rem] px-1.5 py-0.5 rounded ${d.rx === 'Kırmızı' ? 'bg-rose-950/70 text-rose-200 border border-rose-700/70' : 'bg-emerald-950/60 text-emerald-200 border border-emerald-700/60'} font-semibold">${safeRx}</span>` : ''}
                </div>
                <span class="text-[0.75rem] text-slate-400 mt-0.5">${displayGeneric}${d.mealTiming ? ` • <span class="text-cyan-300">${escapeHtml(d.mealTiming)}</span>` : ''}${d.company ? ` • <span class="text-slate-500">${escapeHtml(d.company)}</span>` : ''}</span>
                <div class="flex flex-wrap items-center gap-2 mt-1">
                    <button type="button" class="btn-open-monograph inline-flex items-center gap-0.5 text-[0.75rem] ${hasMonograph ? 'text-emerald-300 hover:text-emerald-200 font-semibold' : 'text-sky-300 hover:text-sky-200 font-semibold'} hover:underline" ${dataAttrs}>${hasMonograph ? 'Monograf' : 'Klinik Detay'}</button>
                    ${(validKt || validKub) ? `
                        ${validKt ? `<a href="${validKt}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-0.5 text-[0.75rem] text-amber-300 hover:text-amber-200 hover:underline" ${dataAttrs}>Prospektüs</a>` : ''}
                        ${validKub ? `<a href="${validKub}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-0.5 text-[0.75rem] text-sky-300 hover:text-sky-200 hover:underline" ${dataAttrs}>KÜB</a>` : ''}
                    ` : `
                        <a href="https://www.google.com/search?q=${encodeURIComponent((d.brand || '') + ' prospektüs kub titck pdf')}" target="_blank" rel="noopener noreferrer" class="btn-ext-drug-bridge inline-flex items-center gap-0.5 text-[0.75rem] text-slate-300 hover:text-sky-300 hover:underline" ${dataAttrs} title="Google / Web üzerinde prospektüs ara">Web'de Ara</a>
                        <a href="https://titck.gov.tr/ilac/kub-kt" target="_blank" rel="noopener noreferrer" class="btn-ext-drug-bridge inline-flex items-center gap-0.5 text-[0.75rem] text-slate-300 hover:text-sky-300 hover:underline" ${dataAttrs} title="TİTCK Resmi KÜB/KT Portalı">TİTCK Portalı</a>
                    `}
                </div>
            </div>
            <button class="text-slate-400 hover:text-rose-300 p-1.5 rounded hover:bg-slate-800 transition-colors flex items-center justify-center shrink-0" onclick="window.removeDrug(${index})" title="İlacı Kaldır">${getSvgIcon('close', 'w-3.5 h-3.5')}</button>
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
const activeDrugFilters: DrugFilterOptions = {
    onlyActive: false,
    onlySgk: false,
    pregnancySafeOnly: false,
    onlyColdChain: false,
    onlyExtraMonitoring: false
};

function getEffectiveFilters(): DrugFilterOptions | undefined {
    const hasAny = Boolean(
        activeDrugFilters.onlyActive ||
        activeDrugFilters.onlySgk ||
        activeDrugFilters.pregnancySafeOnly ||
        activeDrugFilters.onlyColdChain ||
        activeDrugFilters.onlyExtraMonitoring
    );
    return hasAny ? { ...activeDrugFilters } : undefined;
}

export function updateSearchModeUI(newMode: DrugSearchMode): void {
    currentDrugSearchMode = newMode;
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('.drug-search-mode-btn');
    modeButtons.forEach(btn => {
        const mode = btn.dataset.mode as DrugSearchMode;
        if (mode === currentDrugSearchMode) {
            btn.className = 'drug-search-mode-btn flex-1 min-w-fit whitespace-nowrap py-1.5 px-2.5 rounded-md border text-center transition-all bg-sky-950/70 text-sky-200 border-sky-500/70 font-semibold shadow-sm text-[0.75rem]';
        } else {
            btn.className = 'drug-search-mode-btn flex-1 min-w-fit whitespace-nowrap py-1.5 px-2.5 rounded-md border text-center transition-all bg-slate-800/60 text-slate-300 border-slate-700/80 hover:text-slate-100 hover:border-slate-600 font-normal text-[0.75rem]';
        }
    });

    const drugInput = getEl<HTMLInputElement>('input-drug-search');
    if (drugInput) {
        if (currentDrugSearchMode === 'brand') {
            drugInput.placeholder = 'İlaç / Müstahzar ticari adı ile ara (örn. Parol, Augmentin)...';
        } else if (currentDrugSearchMode === 'generic') {
            drugInput.placeholder = 'Etken madde / jenerik molekül adı ile ara (örn. Parasetamol, Amoksisilin)...';
        } else if (currentDrugSearchMode === 'indication') {
            drugInput.placeholder = 'Tanı adı veya ICD-10 kodu ile ara (örn. Hipertansiyon, Diyabet, I10, E11.9)...';
        } else if (currentDrugSearchMode === 'barcode') {
            drugInput.placeholder = 'Barkod numarası veya ATC kodu ile ara (örn. 8699..., N02BE01)...';
        } else if ((currentDrugSearchMode as string) === 'esdeger') {
            drugInput.placeholder = 'SGK Eşdeğer Grubu Kodu ile ara (örn. E267A, E712B, E595A)...';
        } else {
            drugInput.placeholder = 'İlaç adı, etken madde, endikasyon, ICD-10, barkod, eşdeğer kodu...';
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
        const res = await searchDrugsInDB(q, currentDrugSearchMode, getEffectiveFilters());
        if (thisSeq !== currentDrugSearchSeq) return;

        if (res && res.length > 0) {
            drugResult.classList.remove('hidden');
            drugResult.innerHTML = res.map((r: any) => {
                const rawKtUrl = r.kt_pdf_prospektus_url || r.kt || '';
                const rawKubUrl = r.kub_pdf_url || r.kub || '';
                const ktUrl = /^https?:\/\//i.test(rawKtUrl) ? rawKtUrl : '';
                const kubUrl = /^https?:\/\//i.test(rawKubUrl) ? rawKubUrl : '';
                const rxBorder = r.prescriptionType === 'Kırmızı' ? 'border-rose-500/80' :
                                 r.prescriptionType === 'Yeşil' ? 'border-emerald-500/80' :
                                 (r.prescriptionType === 'Mor' || r.prescriptionType === 'Turuncu') ? 'border-purple-500/80' :
                                 'border-sky-500/60';

                const icdProfile = r.atcCode ? getAtcIcd10Profile(r.atcCode) : null;
                const displayGeneric = icdProfile?.activeIngredientTr || r.generic;

                const safeBrand = escapeHtml(r.brand);
                const safeGeneric = escapeHtml(r.generic);
                const safeDisplayGeneric = escapeHtml(displayGeneric);
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
                    ? 'text-emerald-300 font-bold bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-700/60'
                    : 'text-emerald-300/90 font-semibold';

                const brandHighlightClass = currentDrugSearchMode === 'brand'
                    ? 'text-sky-200 underline decoration-sky-400/70 font-bold'
                    : 'text-slate-100 font-bold';

                const hasMonograph = Boolean(findMonographSync(r));
                // Ansiklopedi karşıtı disiplin: Kartta yalnızca eşleşen en fazla 2 endikasyon çipi
                const indBadges = getAtcIndicationBadges(
                    r.atcCode,
                    (currentDrugSearchMode === 'indication' || currentDrugSearchMode === 'all') ? q : undefined,
                    2
                );
                const showIndBadges = indBadges.length > 0 && (currentDrugSearchMode === 'indication' || indBadges.some(b => b.matched));
                const indBadgesHtml = showIndBadges
                    ? `<div class="flex flex-wrap items-center gap-1 mt-1">${indBadges.map(ind => {
                        const pillCls = ind.matched
                            ? 'bg-sky-950/75 text-sky-200 border-sky-600/70 font-semibold'
                            : 'bg-slate-800/70 text-slate-300 border-slate-700/70';
                        const codeTag = ind.code ? `<span class="font-mono text-[0.6875rem] opacity-85">[${escapeHtml(ind.code)}]</span>` : '';
                        return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[0.6875rem] leading-tight ${pillCls}">${codeTag}<span>${escapeHtml(ind.nameTr)}</span></span>`;
                    }).join('')}</div>`
                    : '';

                // Mikro klinik ipuçları (yalnızca pratik değer taşıyanlar, maks 2 ipucu)
                const microHints: string[] = [];
                if (r.mealTimingCode === 1) microHints.push('<span class="text-cyan-300">Aç karnına</span>');
                else if (r.mealTimingCode === 2) microHints.push('<span class="text-cyan-300">Tok karnına</span>');
                if (r.drivingRiskCode === 4) microHints.push('<span class="text-rose-300 font-medium">Araç: Yasak/Yüksek Risk</span>');
                if (icdProfile?.dili && (icdProfile.dili.startsWith('A') || icdProfile.dili.startsWith('B'))) {
                    microHints.push(`<span class="text-amber-300" title="LiverTox Hepatotoksisite Skoru">DILI:${escapeHtml(icdProfile.dili)}</span>`);
                }

                const dataAttrs = `data-brand="${safeBrand}" data-generic="${safeGeneric}" data-atc="${safeAtc}" data-barcode="${safeBarcode}" data-rx="${safeRx}" data-esdeger="${safeEg}" data-sgk="${r.sgkReimbursed}" data-pregnancy="${safePregnancy}" data-kt="${safeKtUrl}" data-kub="${safeKubUrl}"`;

                return `
                <div class="mb-1.5 p-2.5 border-l-2 ${rxBorder} bg-slate-900/65 border border-slate-700/60 rounded-r-lg shadow-sm space-y-1.5 transition-colors hover:bg-slate-800/60">
                    <div class="flex items-start justify-between gap-2">
                        <div class="cursor-pointer flex-1 min-w-0 drug-item-add" 
                             data-brand="${safeBrand}" 
                             data-generic="${safeGeneric}" 
                             data-atc="${safeAtc}" 
                             data-barcode="${safeBarcode}" 
                             data-rx="${safeRx}" 
                             data-esdeger="${safeEg}" 
                             data-company="${safeCompany}" 
                             data-kt="${safeKtUrl}" 
                             data-kub="${safeKubUrl}">
                            <!-- Satır 1: İlaç Adı + Yüksek Sinyalli Kompakt Rozetler -->
                            <div class="${brandHighlightClass} text-xs sm:text-sm flex flex-wrap items-center gap-1.5 leading-snug">
                                <span>${safeBrand}</span>
                                ${getDrugBadgesHTML(r, { compact: true })}
                            </div>
                            <!-- Satır 2: Etken Madde + ATC + Tıklanabilir E-Kodu + Pratik Mikro İpuçları -->
                            <div class="text-[0.75rem] text-slate-300 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                <span class="${genericHighlightClass}">${safeDisplayGeneric}</span>
                                ${r.atcCode ? `<span class="text-slate-400 font-mono text-[0.6875rem]">• ${safeAtc}</span>` : ''}
                                ${r.esdegerGroup ? `<span class="text-sky-300 font-mono text-[0.6875rem] cursor-pointer hover:underline badge-esdeger-tag" data-esdeger="${safeEg}" title="SGK Eşdeğer Grubunu Filtrele">• E:${safeEg}</span>` : ''}
                                ${microHints.length > 0 ? `<span class="text-slate-500">•</span> ${microHints.slice(0, 2).join(' <span class="text-slate-500">•</span> ')}` : ''}
                            </div>
                            ${indBadgesHtml}
                        </div>
                        <!-- Sağ Hızlı Aksiyonlar -->
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <button type="button" class="btn-quick-add-rx btn-compact bg-emerald-950/75 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/70 text-[0.75rem] px-2 py-1 rounded font-semibold transition-colors"
                                data-brand="${safeBrand}" data-generic="${safeGeneric}" data-atc="${safeAtc}" data-barcode="${safeBarcode}" data-rx="${safeRx}" data-esdeger="${safeEg}" data-company="${safeCompany}" data-kt="${safeKtUrl}" data-kub="${safeKubUrl}"
                                title="Reçete ve etkileşim listesine ekle">+ Ekle</button>
                            <button type="button" class="btn-open-monograph btn-compact ${hasMonograph ? 'bg-sky-950/75 border-sky-600/70 text-sky-200 hover:bg-sky-900/75' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'} border text-[0.75rem] px-2 py-1 rounded font-medium transition-colors" ${dataAttrs} title="5 Sekmeli Klinik Monograf, KÜB, Etkileşim & Fiyat">${hasMonograph ? 'Monograf' : 'Detay'}</button>
                            <button type="button" class="btn-muadil btn-compact bg-slate-800 border border-slate-700 hover:bg-slate-700 text-[0.75rem] px-2 py-1 rounded text-slate-200 transition-colors" data-id="${escapeHtml(r.id || '')}" data-brand="${safeBrand}" data-generic="${safeGeneric}" data-atc="${safeAtc}" data-barcode="${safeBarcode}" data-company="${safeCompany}" data-rx="${escapeHtml(r.prescriptionType || '')}" data-esdeger="${safeEg}" data-discount="${safeDiscount}" data-kamuno="${safeKamuNo}" data-pregnancy="${safePregnancy}" data-coldchain="${safeColdChain}" data-sgk="${safeSgk}" data-kt="${safeKtUrl}" data-kub="${safeKubUrl}" title="Eşdeğer / Muadil İlaçları ve Fiyatları Karşılaştır">Muadil</button>
                        </div>
                    </div>
                    ${(ktUrl || kubUrl) ? `
                    <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/70 text-[0.6875rem]">
                        <span class="text-slate-500 truncate">${safeCompany}</span>
                        <div class="flex items-center gap-2 shrink-0">
                            ${ktUrl ? `<a href="${safeKtUrl}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link text-amber-300/90 hover:text-amber-200 hover:underline font-medium" ${dataAttrs}>Prospektüs (KT)</a>` : ''}
                            ${kubUrl ? `<a href="${safeKubUrl}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link text-sky-300/90 hover:text-sky-200 hover:underline font-medium" ${dataAttrs}>KÜB PDF</a>` : ''}
                        </div>
                    </div>
                    ` : (safeCompany ? `<div class="text-[0.6875rem] text-slate-500 truncate">${safeCompany}</div>` : '')}
                </div>
                `;
            }).join('');
        } else {
            drugResult.classList.remove('hidden');
            let emptyMsg = 'Eşleşen ilaç bulunamadı';
            if (currentDrugSearchMode === 'generic') {
                emptyMsg = 'Etken madde modunda eşleşme bulunamadı.<br><span class="text-slate-400 text-[0.8125rem] block mt-1">Aradığınız bir ticari marka ise (örn. Parol, Augmentin), yukarıdan <strong class="text-sky-300">"İlaç Adı"</strong> veya <strong class="text-sky-300">"Tümü"</strong> sekmesine geçebilirsiniz.</span>';
            } else if (currentDrugSearchMode === 'brand') {
                emptyMsg = 'İlaç adı modunda eşleşme bulunamadı.<br><span class="text-slate-400 text-[0.8125rem] block mt-1">Aradığınız bir molekül veya tanı ise (örn. Parasetamol, Hipertansiyon), yukarıdan <strong class="text-emerald-300">"Etken Madde"</strong>, <strong class="text-indigo-300">"Endikasyon / ICD-10"</strong> veya <strong class="text-sky-300">"Tümü"</strong> sekmesine geçebilirsiniz.</span>';
            } else if (currentDrugSearchMode === 'indication') {
                emptyMsg = 'Endikasyon veya ICD-10 modunda eşleşme bulunamadı.<br><span class="text-slate-400 text-[0.8125rem] block mt-1">Türkçe tanı adı (örn. Hipertansiyon, Tip 2 Diyabet, Astım) veya ICD-10 kodu (örn. I10, E11.9) ile arayabilir ya da <strong class="text-sky-300">"Tümü"</strong> sekmesine geçebilirsiniz.</span>';
            } else if (currentDrugSearchMode === 'barcode') {
                emptyMsg = 'Barkod veya ATC modunda eşleşme bulunamadı.<br><span class="text-slate-400 text-[0.8125rem] block mt-1">Barkod numarasını (13 hane) veya ATC kodunu (örn. N02BE01) kontrol ediniz.</span>';
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
    void ensureIcd10DictionaryReady();
    void ensureDdiMatrixReady();

    const clearBtn = getEl('btn-clear-search');
    const drugInput = getEl<HTMLInputElement>('input-drug-search');
    const drugResult = getEl('container-search-results');
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('.drug-search-mode-btn');
    const filterChips = document.querySelectorAll<HTMLButtonElement>('.drug-filter-chip');

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode as DrugSearchMode;
            if (mode) {
                updateSearchModeUI(mode);
            }
        });
    });

    // İsteğe bağlı hızlı klinik filtre çipleri (tümü varsayılan kapalı)
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.dataset.filter as keyof DrugFilterOptions | undefined;
            if (!key) return;
            const nextVal = !activeDrugFilters[key];
            activeDrugFilters[key] = nextVal;
            chip.setAttribute('aria-pressed', nextVal ? 'true' : 'false');
            if (nextVal) {
                chip.className = 'drug-filter-chip btn-compact px-2 py-1 rounded-md border bg-sky-950/75 text-sky-200 border-sky-500/70 font-semibold transition-colors';
            } else {
                chip.className = 'drug-filter-chip btn-compact px-2 py-1 rounded-md border bg-slate-800/60 text-slate-300 border-slate-700/80 hover:border-slate-500 transition-colors';
            }
            const q = drugInput?.value.trim() || '';
            if (q.length >= 2) {
                void executeDrugSearch(q);
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
                const catalog = findCatalogDrugSync({ barcode, brand, atc: atcCode });

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
                    retailPriceTl: catalog?.retailPriceTl ?? null,
                    isExtraMonitoring: catalog?.isExtraMonitoring,
                    kt_pdf_prospektus_url,
                    kub_pdf_url
                });
                return;
            }

            if (target.closest('.btn-price-date-bubble')) {
                return;
            }

            const item = target.closest('.btn-quick-add-rx, .drug-item-add');
            if (item) {
                const brand = item.getAttribute('data-brand') || '';
                const generic = item.getAttribute('data-generic') || '';
                const atcCode = item.getAttribute('data-atc') || '';
                const barcode = item.getAttribute('data-barcode') || '';
                const rx = item.getAttribute('data-rx') || 'Normal';
                const company = item.getAttribute('data-company') || '';
                const kt = item.getAttribute('data-kt') || '';
                const kub = item.getAttribute('data-kub') || '';
                const catalog = findCatalogDrugSync({ barcode, brand, atc: atcCode });
                
                if (!appState.treatment) appState.treatment = { selectedDrugs: [] };
                if (!appState.treatment.selectedDrugs) appState.treatment.selectedDrugs = [];
                
                if (!appState.treatment.selectedDrugs.find((d: any) => d.brand === brand)) {
                    appState.treatment.selectedDrugs.push({
                        brand,
                        generic,
                        atcCode,
                        barcode,
                        rx,
                        company,
                        kt,
                        kub,
                        esdegerGroup: catalog?.esdegerGroup || item.getAttribute('data-esdeger') || '',
                        sgkReimbursed: catalog?.sgkReimbursed,
                        retailPriceTl: catalog?.retailPriceTl ?? null,
                        isExtraMonitoring: catalog?.isExtraMonitoring,
                        allergens: catalog?.allergens || [],
                        mealTiming: catalog?.mealTiming || '',
                        mealTimingCode: catalog?.mealTimingCode || 0,
                        drivingRisk: catalog?.drivingRisk || '',
                        drivingRiskCode: catalog?.drivingRiskCode || 0
                    });
                    renderSelectedDrugs();
                    onTabsUpdateCallback();
                }

                if (item.classList.contains('btn-quick-add-rx')) {
                    const prevText = item.textContent || '+ Ekle';
                    item.textContent = '✓ Eklendi';
                    setTimeout(() => {
                        item.textContent = prevText;
                    }, 900);
                }
            }
        });
    }
}
