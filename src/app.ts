// ============================================================================
// KLİNİK KARAR DESTEK ASİSTANI - TYPESCRIPT ANA UYGULAMA VE UI DENETLEYİCİSİ
// ============================================================================

import { appState } from './state';
import { calculateBSA, calculateDetailedEGFR, type PediatricCreatinineAssay } from './engines/biometricsEngine';
import { calculatePediatricDose, getVaccineSchedule, classifyPediatricBP, calculateCentorMcIsaac } from './engines/pediatricEngine';
import { calculatePercentiles, calculateTargetHeight, calculateCorrectedAge } from './engines/percentileEngine';
import { calculatePediatricIron } from './engines/ironEngine';
import { calculateAlvarado, calculateParkland, calculateRanson, getSutureGuidance, type BurnProtocolType } from './engines/surgeryEngine';
import { calculateObstetrics, calculateBishop, calculatePreeclampsia } from './engines/obgynEngine';
import { analyzeBloodGas } from './engines/bloodGasEngine';
import { calculateMaintenanceFluid, calculateSodiumCorrection, calculateNeonatalFluid } from './engines/fluidEngine';
import { calculateNEWS2, calculatePEWS, calculateGCS } from './engines/triageEngine';
import {
    calculateQTc,
    calculateAxis,
    convertEcgBoxesToMs,
    convertMsToEcgBoxes,
    calculateHrFromBoxes
} from './engines/cardiacEngine';
import { calculateCorrectedCalcium } from './engines/calciumEngine';
import { calculateInfusionRate, calculateGIR } from './engines/infusionEngine';
import { convertSteroids, calculateHOMAIR } from './engines/endocrineEngine';
import { generateSOAP } from './utils/soapGenerator';
import { ensureDrugCatalogReady, isDrugCatalogReady, searchDrugsInDB, type DrugSearchMode } from './db/titckIndexedDB';
import { getDrugBadgesHTML, findEquivalents } from './drugEngine';
import { ensureMonographsReady, findMonographSync } from './monographEngine';
import { calculateWellsDVT, calculateWellsPTE, evaluatePERC, calculateCHA2DS2VASc, calculateHASBLED, calculateHEART } from './engines/thrombosisEngine';
import { calculateFENa, calculateFEUrea, evaluateOliguriaDifferential, calculateCorrectedSodium, calculateOsmolalGap, evaluateRumackMatthew, calculateCURB65 } from './engines/nephroToxEngine';
import { calculateBhutaniJaundice, calculateAPGAR, calculateWestleyCroup, calculateCDSDehydration, calculateNeonatalWeightLoss } from './engines/neonatologyEngine';
import type { BhutaniGuideline, BilirubinMeasurementType } from './types/engines';
import { 
    checkRenalDoseAdjustments, 
    detectTripleWhammy, 
    checkPregnancySafety, 
    checkNeonatalDrugSafety,
    checkSerotoninSyndrome,
    checkHyperkalemiaRisk,
    checkCypStatinInteraction
} from './engines/safetyPrescriptionEngine';
import { initTheme, toggleTheme } from './utils/themeManager';
import { searchQuickSwitcher, jumpToMotor, QUICK_SWITCHER_ITEMS, type QuickSwitcherItem } from './utils/quickSwitcher';
import { resetAnaphylaxisTimer, resetStatusStopwatch } from './utils/emergencyManager';
import { expandDotPhrases, appendTemplateToText } from './utils/soapTemplates';
import { initMonographModalController } from './controllers/monographModalController';
import { initEquivalentsModalController, openDrugEquivalentsModal } from './controllers/equivalentsModalController';
import { initPrescriptionModalController } from './controllers/prescriptionModalController';
import { initEmergencyUiController } from './controllers/emergencyUiController';
import { initEcgUiController } from './controllers/ecgUiController';
import { 
    CLINICAL_MOTORS, 
    PRESET_PACKAGES, 
    resolveMotorDependencies, 
    getCustomPackages, 
    saveCustomPackage, 
    deleteCustomPackage,
    WorkstationPackage
} from './workstationPackages';
import type { Gender } from './types/clinical';

// Window augmentation for inline HTML onclick handlers
declare global {
    interface Window {
        removeDrug?: (index: number) => void;
    }
}

// ----------------------------------------------------------------------------
// Type-Safe DOM, Escaping & Number Helpers
// ----------------------------------------------------------------------------
const escapeHtml = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const parseNum = (val: unknown): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
};

const getEl = <T extends HTMLElement = HTMLElement>(id: string): T | null => {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id) as T | null;
};

const getVal = (id: string): string => {
    const el = getEl<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id);
    return el ? el.value : '';
};

const getNum = (id: string): number | null => {
    const el = getEl<HTMLInputElement | HTMLSelectElement>(id);
    return el ? parseNum(el.value) : null;
};

const getChk = (id: string): boolean => {
    const el = getEl<HTMLInputElement>(id);
    return el ? el.checked : false;
};

// ----------------------------------------------------------------------------
// Initialize Drug Database & Offline Clinical Monographs (PWA Hibrit Yükleyici)
// ----------------------------------------------------------------------------
async function initDrugCatalog(): Promise<void> {
    try {
        await Promise.allSettled([ensureDrugCatalogReady(), ensureMonographsReady()]);
    } catch (err) {
        console.warn('[TİTCK PWA] İlaç kataloğu / monograf başlatma uyarısı:', err);
    }
}
initDrugCatalog();

// ----------------------------------------------------------------------------
// Hasta Yaşı Hesaplayıcı (Doğum Tarihi DOB veya Doğrudan Sayısal Giriş)
// ----------------------------------------------------------------------------
export interface PatientAgeResult {
    y: number | null;
    m: number | null;
    days: number | null;
    weeks: number | null;
    hours: number | null;
    formatted: string;
    ageGroupTag: string;
}

let lastAgeInputSource: 'dob' | 'numeric' = 'numeric';
if (typeof document !== 'undefined') {
    document.addEventListener('input', (e: Event) => {
        const id = (e.target as HTMLElement | null)?.id;
        if (id === 'input-dob' || id === 'input-birth-time') {
            lastAgeInputSource = 'dob';
        } else if (id === 'input-age' || id === 'select-age-unit') {
            lastAgeInputSource = 'numeric';
        }
    }, true);
    document.addEventListener('change', (e: Event) => {
        const id = (e.target as HTMLElement | null)?.id;
        if (id === 'input-dob' || id === 'input-birth-time') {
            lastAgeInputSource = 'dob';
        } else if (id === 'input-age' || id === 'select-age-unit') {
            lastAgeInputSource = 'numeric';
        }
    }, true);
}

export function calculatePatientAge(): PatientAgeResult {
    const dobInput = getEl<HTMLInputElement>('input-dob');
    const timeInput = getEl<HTMLInputElement>('input-birth-time');
    const ageInput = getEl<HTMLInputElement>('input-age');
    const ageUnitSelect = getEl<HTMLSelectElement>('select-age-unit');
    const labelNumeric = getEl('label-age-numeric');
    const breakdownEl = getEl('output-dob-breakdown');
    const textBreakdown = getEl('text-dob-breakdown');
    const badgeDobTag = getEl('badge-dob-tag');

    let dobVal = dobInput?.value;
    const ageVal = parseNum(ageInput?.value);
    const unitVal = ageUnitSelect?.value || 'years';

    // Label and placeholder sync for direct numeric input
    if (labelNumeric && ageInput) {
        if (unitVal === 'years') {
            labelNumeric.textContent = 'Yaş (Yıl)';
            ageInput.placeholder = 'Örn: 25';
        } else if (unitVal === 'months') {
            labelNumeric.textContent = 'Ay (Süt Çocuğu)';
            ageInput.placeholder = 'Örn: 6';
        } else if (unitVal === 'weeks') {
            labelNumeric.textContent = 'Hafta';
            ageInput.placeholder = 'Örn: 8';
        } else if (unitVal === 'days') {
            labelNumeric.textContent = 'Gün (Yenidoğan)';
            ageInput.placeholder = 'Örn: 14';
        }
    }

    // Determine data source priority:
    const isAgeInputActive = typeof document !== 'undefined' && 
        (document.activeElement === ageInput || document.activeElement === ageUnitSelect);
    const isDobInputActive = typeof document !== 'undefined' && 
        (document.activeElement === dobInput || document.activeElement === timeInput);

    // If user explicitly cleared the numeric age input while focused on it, clear synced DOB too
    if (isAgeInputActive && ageInput && ageInput.value.trim() === '' && dobInput) {
        dobInput.value = '';
        dobVal = '';
    }

    const hasNumeric = (ageVal !== null && !isNaN(ageVal));
    const useNumeric = hasNumeric && !isDobInputActive && (isAgeInputActive || !dobVal || lastAgeInputSource === 'numeric');

    let y: number | null = null;
    let m: number | null = null;
    let days: number | null = null;
    let weeks: number | null = null;
    let hours: number | null = null;
    let formatted = '--';
    let ageGroupTag = '';

    if (useNumeric && ageVal !== null) {
        const unit = (unitVal === 'dob') ? 'years' : unitVal;
        if (unit === 'years') {
            y = ageVal;
            m = +(ageVal * 12).toFixed(1);
            days = Math.round(ageVal * 365.25);
            weeks = Math.round(ageVal * 52.14);
            hours = days * 24;
            formatted = `${y} Yaş`;
            ageGroupTag = y < 1 ? '👶 Süt Çocuğu' : (y < 6 ? '🧒 Oyun Çocuğu' : (y < 12 ? '🎒 Okul Çocuğu' : (y < 18 ? '🧑 Ergen' : (y < 65 ? '👤 Erişkin' : '🧓 Geriatrik (65Y+)'))));
        } else if (unit === 'months') {
            y = +(ageVal / 12).toFixed(2);
            m = ageVal;
            days = Math.round(ageVal * 30.4375);
            weeks = +(days / 7).toFixed(1);
            hours = days * 24;
            formatted = `${m} Aylık`;
            ageGroupTag = ageVal <= 1 ? '🍼 Yenidoğan / Süt Çocuğu' : (ageVal <= 12 ? '👶 Süt Çocuğu (1-12A)' : '🧒 Oyun Çocuğu');
        } else if (unit === 'weeks') {
            weeks = ageVal;
            days = Math.round(ageVal * 7);
            hours = days * 24;
            m = +(days / 30.4375).toFixed(2);
            y = +(days / 365.25).toFixed(2);
            formatted = `${weeks} Haftalık`;
            ageGroupTag = days <= 28 ? '🍼 Yenidoğan (0-28G)' : '👶 Süt Çocuğu (1-12A)';
        } else if (unit === 'days') {
            days = ageVal;
            hours = ageVal * 24;
            weeks = +(ageVal / 7).toFixed(1);
            m = +(ageVal / 30.4375).toFixed(2);
            y = +(ageVal / 365.25).toFixed(2);
            formatted = days <= 28 ? `${days} Günlük Yenidoğan` : `${days} Günlük`;
            ageGroupTag = days <= 28 ? '🍼 Yenidoğan (0-28G)' : '👶 Süt Çocuğu (1-12A)';
        }

        // Approximate DOB sync when user types numeric age
        if (dobInput && typeof document !== 'undefined' && !isDobInputActive && days !== null) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - days);
            const yyyy = targetDate.getFullYear();
            const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
            const dd = String(targetDate.getDate()).padStart(2, '0');
            dobInput.value = `${yyyy}-${mm}-${dd}`;
        }

        if (breakdownEl && textBreakdown && badgeDobTag) {
            breakdownEl.classList.remove('hidden');
            textBreakdown.textContent = `📅 ${formatted}`;
            badgeDobTag.textContent = ageGroupTag;
        }
    } else if (dobVal) {
        const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobVal.trim());
        const birthDate = isoMatch
            ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
            : new Date(dobVal);
        const timeVal = timeInput?.value;
        if (timeVal) {
            const [hh, mm_val] = timeVal.split(':').map(Number);
            birthDate.setHours(hh || 0, mm_val || 0, 0, 0);
        } else {
            birthDate.setHours(0, 0, 0, 0);
        }

        const now = new Date();
        const diffMs = now.getTime() - birthDate.getTime();
        if (diffMs >= 0) {
            hours = Math.floor(diffMs / (1000 * 60 * 60));
            days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            weeks = +(days / 7).toFixed(1);
            m = +(days / 30.4375).toFixed(2);
            y = +(days / 365.25).toFixed(2);

            if (days <= 28) {
                ageGroupTag = '🍼 Yenidoğan (0-28G)';
                formatted = `${days} Günlük Yenidoğan (${hours} saat)`;
            } else if (days < 365) {
                ageGroupTag = '👶 Süt Çocuğu (1-12A)';
                formatted = `${Math.floor(m)} Aylık (${weeks} Hf / ${days}G)`;
            } else if (y < 6) {
                ageGroupTag = '🧒 Oyun Çocuğu (1-5Y)';
                const remM = Math.floor((days % 365.25) / 30.4375);
                formatted = `${Math.floor(y)} Yaş ${remM ? remM + ' Ay' : ''}`;
            } else if (y < 12) {
                ageGroupTag = '🎒 Okul Çocuğu (6-12Y)';
                formatted = `${Math.floor(y)} Yaş`;
            } else if (y < 18) {
                ageGroupTag = '🧑 Ergen / Adölesan';
                formatted = `${Math.floor(y)} Yaş`;
            } else if (y < 65) {
                ageGroupTag = '👤 Erişkin';
                formatted = `${Math.floor(y)} Yaş`;
            } else {
                ageGroupTag = '🧓 Geriatrik (65Y+)';
                formatted = `${Math.floor(y)} Yaş`;
            }

            // Sync to numeric inputs
            if (ageInput && ageUnitSelect && typeof document !== 'undefined' && document.activeElement !== ageInput) {
                if (days <= 28) {
                    ageInput.value = String(days);
                    ageUnitSelect.value = 'days';
                } else if (days < 365) {
                    ageInput.value = String(Math.floor(m));
                    ageUnitSelect.value = 'months';
                } else {
                    ageInput.value = String(Math.floor(y));
                    ageUnitSelect.value = 'years';
                }
            }

            if (breakdownEl && textBreakdown && badgeDobTag) {
                breakdownEl.classList.remove('hidden');
                textBreakdown.textContent = `📅 ${formatted}`;
                badgeDobTag.textContent = ageGroupTag;
            }
        } else if (breakdownEl) {
            breakdownEl.classList.add('hidden');
        }
    } else {
        if (breakdownEl) breakdownEl.classList.add('hidden');
    }

    // Yenidoğanda (<= 14 gün / 336 saat) Sarılık Postnatal Saati Otomatik Doldurma
    if (hours !== null && days !== null && days <= 14) {
        const bhutaniInput = getEl<HTMLInputElement>('input-bhutani-age-hours');
        if (bhutaniInput && (!bhutaniInput.value || bhutaniInput.dataset.autofilled === 'true')) {
            bhutaniInput.value = String(Math.min(336, Math.max(1, hours)));
            bhutaniInput.dataset.autofilled = 'true';
        }
    }

    return { y, m, days, weeks, hours, formatted, ageGroupTag };
}

// ----------------------------------------------------------------------------
// Standart Klinik Skor Kartı Render Yardımcısı
// ----------------------------------------------------------------------------
export interface ClinicalCardResultOptions {
    title?: string;
    riskText?: string;
    alertClass?: string;
    subtitle?: string;
    recommendations?: string | string[];
    extraHtml?: string;
}

export function renderClinicalCardResult(el: HTMLElement | null, options: ClinicalCardResultOptions): void {
    if (!el) return;
    el.classList.remove('hidden');

    const {
        title = '',
        riskText = '',
        alertClass = 'slate',
        subtitle = '',
        recommendations = '',
        extraHtml = ''
    } = options;

    let bgStyle = 'bg-slate-900/60 border-slate-700/50 text-slate-200';
    if (alertClass === 'danger' || alertClass === 'critical' || alertClass === 'text-rose-400') {
        bgStyle = 'bg-rose-950/40 border-rose-600/50 text-rose-200';
    } else if (alertClass === 'warning' || alertClass === 'text-amber-400') {
        bgStyle = 'bg-amber-950/40 border-amber-600/50 text-amber-200';
    } else if (alertClass === 'success' || alertClass === 'normal' || alertClass === 'text-emerald-400') {
        bgStyle = 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200';
    } else if (alertClass === 'info' || alertClass === 'text-sky-400') {
        bgStyle = 'bg-sky-950/40 border-sky-600/50 text-sky-200';
    }

    const recs = Array.isArray(recommendations) ? recommendations.join(' ') : (recommendations || '');

    el.className = `p-2 rounded-lg border font-mono space-y-1 text-[10px] ${bgStyle}`;
    el.innerHTML = `
        <div class="flex justify-between items-center font-bold">
            <span>${title}</span>
            <span>${riskText}</span>
        </div>
        ${subtitle ? `<div class="text-[10px] font-semibold">${subtitle}</div>` : ''}
        ${recs ? `<div class="text-[10px] text-slate-300 leading-relaxed">${recs}</div>` : ''}
        ${extraHtml || ''}
    `;
}

// ----------------------------------------------------------------------------
// TÜM SEKMELER VE MOTORLAR İÇİN REAKTİF GÜNCELLEME DÖNGÜSÜ
// ----------------------------------------------------------------------------
export function updateAllTabs(): void {
    if (typeof document === 'undefined') return;

    // 1. BIOMETRY & DEMOGRAPHY
    const ageData = calculatePatientAge();
    const y = ageData.y;
    const m = ageData.m;
    const totalMonths = (y === null && m === null) ? null : (m !== null ? m : (y !== null ? y * 12 : null));
    const isNeonate = (ageData.days !== null && ageData.days !== undefined && ageData.days <= 28);

    appState.biometry.ageYears = y;
    appState.biometry.ageMonths = m;
    appState.biometry.ageWeeks = ageData.weeks;
    appState.biometry.ageDays = ageData.days;
    appState.biometry.ageHours = ageData.hours;
    appState.biometry.ageFormatted = ageData.formatted;
    appState.biometry.ageGroupTag = ageData.ageGroupTag;
    appState.biometry.isNeonate = isNeonate;
    appState.biometry.dob = getVal('input-dob') || null;
    appState.biometry.birthTime = getVal('input-birth-time') || null;
    appState.biometry.birthWeightG = getNum('input-birth-weight');
    
    const genderRaw = getVal('select-gender');
    appState.biometry.gender = (genderRaw as Gender) || null;
    appState.biometry.weightKg = getNum('input-weight');
    appState.biometry.heightCm = getNum('input-height');
    const crea = getNum('input-creatinine');
    const cystatinC = getNum('input-cystatin-c');
    const assayVal = (getVal('select-creatinine-assay') === 'jaffe' ? 'jaffe' : 'idms') as PediatricCreatinineAssay;
    appState.biometry.cystatinC = cystatinC;
    
    const outBsa = getEl('output-bsa');
    if (appState.biometry.weightKg && appState.biometry.heightCm) {
        appState.biometry.bsa = calculateBSA(appState.biometry.heightCm, appState.biometry.weightKg);
        if (outBsa) outBsa.textContent = appState.biometry.bsa !== null ? appState.biometry.bsa.toFixed(2) : '--';
    } else {
        appState.biometry.bsa = null;
        if (outBsa) outBsa.textContent = '--';
    }

    // Preterm & Düzeltilmiş Yaş bayrağı (eGFR <1 yaş k sabiti için önce okunur)
    const isPreterm = getChk('chk-preterm');
    const pretermGw = getNum('input-gestational-weeks');
    const pretermGwContainer = getEl('container-preterm-gw');
    const correctedAgeEl = getEl('output-corrected-age');
    const ironPretermBadge = getEl('badge-iron-preterm');

    const outEgfr = getEl('output-egfr');
    const outEgfrMeta = getEl('output-egfr-meta');
    if ((crea !== null || cystatinC !== null) && (y !== null || totalMonths !== null)) {
        const detailedEgfr = calculateDetailedEGFR(
            crea,
            y,
            appState.biometry.gender === 'female' ? 'F' : 'M',
            appState.biometry.heightCm || undefined,
            {
                cystatinC,
                isPreterm,
                assay: assayVal,
                bsa: appState.biometry.bsa,
                ageMonths: totalMonths
            }
        );
        if (detailedEgfr) {
            appState.biometry.egfr = detailedEgfr.egfrIndexed;
            appState.biometry.egfrAbsolute = detailedEgfr.egfrAbsolute;
            appState.biometry.egfrFormula = detailedEgfr.formulaUsed;
            if (outEgfr) outEgfr.textContent = String(detailedEgfr.egfrIndexed);
            if (outEgfrMeta) {
                const absPart = detailedEgfr.egfrAbsolute !== null ? ` • Mutlak: ${detailedEgfr.egfrAbsolute} mL/dk` : '';
                outEgfrMeta.textContent = `${detailedEgfr.shortBadge}${absPart}`;
                outEgfrMeta.classList.remove('hidden');
            }
        } else {
            appState.biometry.egfr = null;
            appState.biometry.egfrAbsolute = null;
            appState.biometry.egfrFormula = null;
            if (outEgfr) outEgfr.textContent = '--';
            if (outEgfrMeta) {
                const isPedWithoutHeight = ((y !== null && y < 18) || (totalMonths !== null && totalMonths < 216)) && !appState.biometry.heightCm && crea !== null;
                if (isPedWithoutHeight) {
                    outEgfrMeta.textContent = '⚠️ Schwartz için Boy (cm) girin';
                    outEgfrMeta.classList.remove('hidden');
                } else {
                    outEgfrMeta.textContent = '';
                    outEgfrMeta.classList.add('hidden');
                }
            }
        }
    } else {
        appState.biometry.egfr = null;
        appState.biometry.egfrAbsolute = null;
        appState.biometry.egfrFormula = null;
        if (outEgfr) outEgfr.textContent = '--';
        if (outEgfrMeta) {
            outEgfrMeta.textContent = '';
            outEgfrMeta.classList.add('hidden');
        }
    }

    if (pretermGwContainer) {
        if (isPreterm) {
            pretermGwContainer.classList.remove('hidden');
            pretermGwContainer.classList.add('flex');
        } else {
            pretermGwContainer.classList.add('hidden');
            pretermGwContainer.classList.remove('flex');
        }
    }
    if (ironPretermBadge) {
        ironPretermBadge.textContent = isPreterm ? '⚡ Preterm Aktif' : '';
    }

    if (isPreterm && pretermGw !== null && totalMonths !== null) {
        appState.pediatrics.correctedAge = calculateCorrectedAge({
            chronologicalMonths: totalMonths,
            gestationalWeeks: pretermGw
        });
        if (appState.pediatrics.correctedAge && appState.pediatrics.correctedAge.isPreterm && correctedAgeEl) {
            correctedAgeEl.classList.remove('hidden');
            correctedAgeEl.innerHTML = `⚡ Düzeltilmiş Yaş: <strong>${appState.pediatrics.correctedAge.correctedMonths} ay</strong> (${appState.pediatrics.correctedAge.correctedMonthsFormatted}) | Takvim Yaşı: ${totalMonths} ay (${appState.pediatrics.correctedAge.weeksMissing} hf erken doğum)`;
        } else if (correctedAgeEl) {
            correctedAgeEl.classList.add('hidden');
        }
    } else {
        appState.pediatrics.correctedAge = null;
        if (correctedAgeEl) correctedAgeEl.classList.add('hidden');
    }

    // Neonatal Tartı Kaybı & Dehidratasyon İzlemi (%7-%10 Kuralı)
    const weightLossEl = getEl('output-neonatal-weight-loss');
    if (isNeonate && appState.biometry.birthWeightG && appState.biometry.weightKg && ageData.days !== null) {
        appState.neonatology.weightLoss = calculateNeonatalWeightLoss({
            birthWeightG: appState.biometry.birthWeightG,
            currentWeightKg: appState.biometry.weightKg,
            ageDays: ageData.days
        });
        const wl = appState.neonatology.weightLoss;
        if (wl && wl.isValid && weightLossEl) {
            weightLossEl.classList.remove('hidden');
            const alertBg = wl.alertClass === 'danger'
                ? 'bg-rose-950/50 border-rose-600/70 text-rose-200'
                : (wl.alertClass === 'warning'
                    ? 'bg-amber-950/50 border-amber-600/70 text-amber-200'
                    : 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300');
            weightLossEl.className = `text-[10px] font-mono p-2 rounded-lg border space-y-0.5 ${alertBg}`;
            weightLossEl.innerHTML = `
                <div class="flex items-center justify-between font-bold">
                    <span>⚖️ ${wl.interpretation}</span>
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-black/40 font-sans">${(wl.percentLoss ?? 0) > 0 ? '%' + wl.percentLoss + ' Kayıp' : 'Kazanç'}</span>
                </div>
                <div class="text-[9px] text-slate-300 leading-tight pt-0.5">${wl.recommendations?.[0] || ''}</div>
            `;
        } else if (weightLossEl) {
            weightLossEl.classList.add('hidden');
        }
    } else {
        appState.neonatology.weightLoss = null;
        if (weightLossEl) weightLossEl.classList.add('hidden');
    }

    // Persentil & Baş Çevresi
    const headCirc = getNum('input-head-circ');
    const percContainer = getEl('container-percentiles');
    const rowHeadCirc = getEl('row-head-circ');
    const outputHeadCirc = getEl('output-p-head');
    const outPWeight = getEl('output-p-weight');
    const outPHeight = getEl('output-p-height');

    // Preterm bebeklerde ilk 36 ayda persentil hesabı düzeltilmiş yaşa göre yapılır
    const growthMonths = (appState.pediatrics.correctedAge && appState.pediatrics.correctedAge.isPreterm && totalMonths !== null && totalMonths <= 36)
        ? appState.pediatrics.correctedAge.correctedMonths
        : totalMonths;

    if (appState.biometry.weightKg && appState.biometry.heightCm && appState.biometry.gender && growthMonths !== null) {
        appState.pediatrics.percentiles = calculatePercentiles({
            totalMonths: growthMonths,
            gender: appState.biometry.gender,
            weightKg: appState.biometry.weightKg,
            heightCm: appState.biometry.heightCm,
            headCircumferenceCm: headCirc || undefined,
            isPediatric: growthMonths <= 216
        });
        if (appState.pediatrics.percentiles && percContainer) {
            percContainer.classList.remove('hidden');
            if (outPWeight) {
                outPWeight.innerHTML = appState.pediatrics.percentiles.weightPercentile ? `%${appState.pediatrics.percentiles.weightPercentile} <span class="text-[9px] text-slate-500">(Z: ${appState.pediatrics.percentiles.weightZ})</span>` : '--';
            }
            if (outPHeight) {
                outPHeight.innerHTML = appState.pediatrics.percentiles.heightPercentile ? `%${appState.pediatrics.percentiles.heightPercentile} <span class="text-[9px] text-slate-500">(Z: ${appState.pediatrics.percentiles.heightZ})</span>` : '--';
            }

            if (appState.pediatrics.percentiles.headCircumferencePercentile !== null && rowHeadCirc && outputHeadCirc) {
                rowHeadCirc.classList.remove('hidden');
                outputHeadCirc.innerHTML = `%${appState.pediatrics.percentiles.headCircumferencePercentile} <span class="text-[9px] text-slate-500">(Z: ${appState.pediatrics.percentiles.headCircZ})</span> <span class="text-[9px] ml-1">${appState.pediatrics.percentiles.headCircCategory || ''}</span>`;
            } else if (rowHeadCirc) {
                rowHeadCirc.classList.add('hidden');
            }
        } else if (percContainer) {
            percContainer.classList.add('hidden');
            if (rowHeadCirc) rowHeadCirc.classList.add('hidden');
        }
    } else {
        appState.pediatrics.percentiles = null;
        if (percContainer) percContainer.classList.add('hidden');
        if (rowHeadCirc) rowHeadCirc.classList.add('hidden');
    }

    // ÇEDD Hedef Boy & Genetik Potansiyel (Tanner Metodu)
    const motherH = getNum('input-mother-height');
    const fatherH = getNum('input-father-height');
    const targetHContainer = getEl('output-target-height');
    if (motherH && fatherH && appState.biometry.gender) {
        const curHeightZ = appState.pediatrics.percentiles ? appState.pediatrics.percentiles.heightZ : null;
        appState.pediatrics.targetHeight = calculateTargetHeight({
            motherHeightCm: motherH,
            fatherHeightCm: fatherH,
            childGender: appState.biometry.gender,
            currentHeightZ: curHeightZ
        });
        const th = appState.pediatrics.targetHeight;
        if (th && targetHContainer) {
            targetHContainer.classList.remove('hidden');
            let thHtml = `<div><strong>Hedef Boy:</strong> ${th.targetHeightCm} cm <span class="text-slate-400">(${th.targetRangeCm})</span></div>`;
            thHtml += `<div><strong>Genetik Potansiyel Persentili:</strong> %${th.targetPercentile} (Z: ${th.targetZ})</div>`;
            if (th.deviationAlert) {
                thHtml += `<div class="${(th.deviationValue ?? 0) < -1.5 ? 'text-rose-400 font-bold' : 'text-sky-400'} pt-1 border-t border-slate-800">${th.deviationAlert}</div>`;
            }
            targetHContainer.innerHTML = thHtml;
        } else if (targetHContainer) {
            targetHContainer.classList.add('hidden');
        }
    } else {
        appState.pediatrics.targetHeight = null;
        if (targetHContainer) targetHContainer.classList.add('hidden');
    }

    // Vaccines
    if (totalMonths !== null) {
        const vax = getVaccineSchedule(totalMonths);
        const vaxEl = getEl('output-ped-vaccines');
        if (vaxEl) {
            vaxEl.innerHTML = vax && vax.length 
                ? `<ul class="list-disc pl-4 text-slate-300">${vax.map((v: string) => `<li>${v}</li>`).join('')}</ul>`
                : 'Bu ay için planlı aşı bulunamadı.';
        }
    }

    // PEDIATRIC IRON ENGINE (TPHD & T.C. Sağlık Bakanlığı + Mentzer Talasemi Kalkanı)
    const hb = getNum('input-hb');
    const ironMcv = getNum('input-iron-mcv');
    const ironRbc = getNum('input-iron-rbc');
    const ironRdw = getNum('input-iron-rdw');
    const ironFerritin = getNum('input-iron-ferritin');
    const ironRes = getEl('output-iron-engine');
    
    if (totalMonths !== null && appState.biometry.weightKg) {
        const ironGender = (appState.biometry.gender === 'female' || appState.biometry.gender === 'F') ? 'female' : 'male';
        appState.pediatrics.iron = calculatePediatricIron({
            ageMonths: totalMonths,
            isPreterm: isPreterm,
            hb: hb,
            mcv: ironMcv,
            rbc: ironRbc,
            rdw: ironRdw,
            ferritin: ironFerritin,
            weightKg: appState.biometry.weightKg,
            gender: ironGender
        });
        const ir = appState.pediatrics.iron;
        if (ir && ir.status === 'SUCCESS' && ironRes) {
            ironRes.classList.remove('hidden');
            let ironHtml = '';

            if (isPreterm) {
                ironHtml += `<div class="mb-1.5 px-2 py-1 bg-amber-950/60 text-amber-300 border border-amber-700/60 rounded text-[10px] font-bold">⚡ PRETERM BEBEK PROTOKOLÜ (2. aydan itibaren 2-4 mg/kg/gün)</div>`;
            }

            // Hb Evaluation Badge
            const evalColor = ir.hbEvaluation.badgeColor === 'rose' ? 'text-rose-400' : ir.hbEvaluation.badgeColor === 'amber' ? 'text-amber-400' : 'text-emerald-400';
            ironHtml += `<div class="${evalColor} font-semibold border-b border-slate-700/50 pb-1 mb-1">Hb Durumu: ${ir.hbEvaluation.text}</div>`;

            // Mentzer / MCV / Talasemi Ayırıcı Tanı Kalkanı
            if (ir.differential && ir.differential.hasCbcDetails) {
                const diff = ir.differential;
                const diffParts: string[] = [];
                if (diff.mcv !== null && diff.mcvLowerLimit !== null) {
                    diffParts.push(`MCV: ${diff.mcv} fL (Alt sınır: ${diff.mcvLowerLimit} fL${diff.isMicrocytic ? ' • Mikrositer' : ''})`);
                }
                if (diff.mentzerIndex !== null) {
                    diffParts.push(`Mentzer: ${diff.mentzerIndex}${diff.mentzerIndex < 13 ? ' (<13 Talasemi Lehine)' : ' (≥13 DEA Lehine)'}`);
                }
                if (diff.ferritin !== null) {
                    diffParts.push(`Ferritin: ${diff.ferritin} ng/mL`);
                }
                if (diffParts.length > 0) {
                    ironHtml += `<div class="text-[9px] text-slate-300 font-mono mb-1">${diffParts.join(' | ')}</div>`;
                }
                if (diff.warningTitle || diff.warningText) {
                    const diffBg = diff.badgeColor === 'rose'
                        ? 'bg-rose-950/50 border-rose-600/60 text-rose-200'
                        : diff.badgeColor === 'amber'
                            ? 'bg-amber-950/50 border-amber-600/60 text-amber-200'
                            : 'bg-sky-950/40 border-sky-700/50 text-sky-200';
                    ironHtml += `<div class="my-1.5 p-1.5 rounded border text-[9px] leading-snug ${diffBg}">
                        ${diff.warningTitle ? `<div class="font-bold">${diff.warningTitle}</div>` : ''}
                        ${diff.warningText ? `<div>${diff.warningText}</div>` : ''}
                    </div>`;
                }
            }

            // Prophylaxis
            if (ir.prophylaxis.eligible) {
                ironHtml += `<div class="mt-1"><strong>Profilaksi:</strong> ${ir.prophylaxis.mgDay} mg/gün<br><span class="text-[9px] text-slate-300">Damla: Ferrum ${ir.prophylaxis.ferrumDrops} damla | Ferro Sanol ${ir.prophylaxis.ferroDrops} damla</span>`;
                if (ir.prophylaxis.syrupMl) {
                    ironHtml += `<br><span class="text-[9px] text-slate-300">Şurup (50mg/5mL): ${ir.prophylaxis.syrupMl} mL (${ir.prophylaxis.syrupOlcek} ölçek)</span>`;
                }
                ironHtml += `<br><span class="text-[9px] text-amber-400">${ir.prophylaxis.text}</span></div>`;
            } else if (ir.prophylaxis.text) {
                ironHtml += `<div class="mt-1 text-[10px] text-sky-400">ℹ️ ${ir.prophylaxis.text}</div>`;
            }

            // Treatment
            if (ir.treatment.eligible) {
                ironHtml += `<div class="mt-1"><strong>Tedavi:</strong> ${ir.treatment.mgDay} mg/gün<br><span class="text-[9px] text-slate-300">Damla: Ferrum ${ir.treatment.ferrumDrops} damla | Ferro Sanol ${ir.treatment.ferroDrops} damla</span>`;
                if (ir.treatment.syrupMl) {
                    ironHtml += `<br><span class="text-[9px] text-slate-300">Şurup (50mg/5mL): ${ir.treatment.syrupMl} mL (${ir.treatment.syrupOlcek} ölçek)</span>`;
                }
                ironHtml += `<br><span class="text-[9px] text-rose-400">${ir.treatment.text}</span></div>`;
            } else if (ir.treatment.text) {
                ironHtml += `<div class="mt-1 text-[10px] text-slate-400">${ir.treatment.text}</div>`;
            }

            ironRes.innerHTML = ironHtml;
        } else if (ir && ir.status === 'INCOMPLETE' && ironRes) {
            ironRes.classList.remove('hidden');
            ironRes.innerHTML = `<div class="text-amber-400 text-xs">${ir.hbEvaluation.text}</div>`;
        } else if (ironRes) {
            ironRes.classList.add('hidden');
        }
    } else {
        if (ironRes) ironRes.classList.add('hidden');
    }

    // PEDIATRIC SYRUP
    const syrupVal = getVal('select-ped-syrup');
    const syrupRes = getEl('output-ped-syrup');
    if (syrupVal && syrupRes) {
        if (appState.biometry.weightKg) {
            const syrupDose = calculatePediatricDose(appState.biometry.weightKg, syrupVal);
            appState.pediatrics.syrupDose = syrupDose;
            if (syrupDose) {
                syrupRes.classList.remove('hidden');
                syrupRes.innerHTML = `<strong>Doz:</strong> ${syrupDose.targetDoseMg} mg<br>
                                   <strong>Hacim:</strong> ${syrupDose.volumeMl} ml<br>
                                   <strong>Ölçek:</strong> ${syrupDose.olcekText} (${syrupDose.freq})`;
            } else {
                syrupRes.classList.add('hidden');
            }
        } else {
            syrupRes.classList.remove('hidden');
            syrupRes.innerHTML = `⚠️ Lütfen hesaplama için Kilo giriniz.`;
        }
    } else if (syrupRes) {
        appState.pediatrics.syrupDose = null;
        syrupRes.classList.add('hidden');
    }

    // VITALS / TRIAGE
    const pewsB = getNum('input-pews-behavior');
    const pewsC = getNum('input-pews-cv');
    const pewsR = getNum('input-pews-resp');
    const pewsInputsContainer = getEl('container-pews-inputs');
    
    // Auto-show PEWS inputs if age < 16 years (192 months)
    if (pewsInputsContainer) {
        if (totalMonths !== null && totalMonths < 192) {
            pewsInputsContainer.classList.remove('hidden');
            pewsInputsContainer.classList.add('grid');
        } else {
            pewsInputsContainer.classList.add('hidden');
            pewsInputsContainer.classList.remove('grid');
        }
    }

    const nRr = getNum('input-rr');
    const nSpo2 = getNum('input-spo2');
    const nSbp = getNum('input-sys-bp');
    const nDbp = getNum('input-dia-bp');
    const nHr = getNum('input-hr');
    const nTemp = getNum('input-temp');
    const nAvpu = getVal('input-avpu');
    const nOx = getChk('input-oxygen');
    const riskContainer = getEl('container-vitals-risk');
    const badgeRiskType = getEl('badge-risk-type');
    const textRiskScore = getEl('text-risk-score');
    const flagContainer = getEl('container-flags');
    const pedBpContainer = getEl('output-pediatric-bp');

    // AAP 2017 Pediatrik Tansiyon Sınıflandırması
    if (nSbp !== null && nDbp !== null && totalMonths !== null && totalMonths <= 216) {
        const pedAgeY = y !== null ? y : (m ? m / 12 : 5);
        appState.pediatrics.bp = classifyPediatricBP({
            ageYears: pedAgeY,
            gender: (appState.biometry.gender === 'female' || appState.biometry.gender === 'F') ? 'female' : 'male',
            sbp: nSbp,
            dbp: nDbp
        });
        if (appState.pediatrics.bp && pedBpContainer) {
            pedBpContainer.classList.remove('hidden');
            pedBpContainer.className = `col-span-2 p-2 rounded-lg border text-[10px] font-mono space-y-0.5 ${appState.pediatrics.bp.alertClass}`;
            pedBpContainer.innerHTML = `<div class="font-bold">AAP 2017 Tansiyon: ${appState.pediatrics.bp.stage}</div>
                ${appState.pediatrics.bp.thresholds ? `<div class="text-[9px] text-slate-300 opacity-90">${appState.pediatrics.bp.thresholds}</div>` : ''}`;
        } else if (pedBpContainer) {
            pedBpContainer.classList.add('hidden');
        }
    } else {
        appState.pediatrics.bp = null;
        if (pedBpContainer) pedBpContainer.classList.add('hidden');
    }
    
    if (totalMonths !== null && totalMonths < 192 && pewsB !== null && pewsC !== null && pewsR !== null) {
        const pewsRes = calculatePEWS(pewsB, pewsC, pewsR);
        appState.pediatrics.pews = pewsRes;
        if (pewsRes && riskContainer && badgeRiskType && textRiskScore && flagContainer) {
            riskContainer.classList.remove('hidden');
            riskContainer.className = `p-3 rounded-xl border flex flex-col gap-1 ${pewsRes.score >= 3 ? 'bg-rose-950/40 border-rose-600/50' : 'bg-emerald-950/40 border-emerald-600/50'}`;
            badgeRiskType.textContent = 'PEWS';
            badgeRiskType.className = `text-xs font-bold font-mono ${pewsRes.score >= 3 ? 'text-rose-400' : 'text-emerald-400'}`;
            textRiskScore.textContent = `Skor: ${pewsRes.score}`;
            flagContainer.innerHTML = pewsRes.recommendation;
        }
        appState.medicine.news2 = null;
    } else if (nHr !== null && nSbp !== null && nRr !== null && nTemp !== null && nSpo2 !== null) {
        // PARAMETRE SIRASI: calculateNEWS2(hr, sbp, rr, temp, spo2, oxygen, avpu)
        const news2Res = calculateNEWS2(nHr, nSbp, nRr, nTemp, nSpo2, nOx, nAvpu);
        appState.medicine.news2 = news2Res;
        if (news2Res && riskContainer && badgeRiskType && textRiskScore && flagContainer) {
            riskContainer.classList.remove('hidden');
            riskContainer.className = `p-3 rounded-xl border flex flex-col gap-1 ${news2Res.score >= 5 ? 'bg-rose-950/40 border-rose-600/50' : 'bg-slate-800 border-slate-700/50'}`;
            badgeRiskType.textContent = 'NEWS2';
            badgeRiskType.className = `text-xs font-bold font-mono ${news2Res.score >= 5 ? 'text-rose-400' : 'text-slate-300'}`;
            textRiskScore.textContent = `Skor: ${news2Res.score}`;
            flagContainer.innerHTML = `${news2Res.risk} — ${news2Res.recommendation}`;
        }
        appState.pediatrics.pews = null;
    } else {
        if (riskContainer) riskContainer.classList.add('hidden');
        appState.medicine.news2 = null;
        appState.pediatrics.pews = null;
    }

    // GCS
    const gcsE = getNum('select-gcs-e');
    const gcsV = getNum('select-gcs-v');
    const gcsM = getNum('select-gcs-m');
    const gRes = getEl('container-gcs-warnings');
    if (gcsE && gcsV && gcsM && gRes) {
        const gcsVal = calculateGCS(gcsE, gcsV, gcsM);
        appState.medicine.gcs = gcsVal;
        if (gcsVal) {
            gRes.classList.remove('hidden');
            gRes.innerHTML = `GCS: ${gcsVal.total} (${gcsVal.interpretation}) <br> <span class="text-rose-400">${gcsVal.airwayRisk || ''}</span>`;
        } else {
            gRes.classList.add('hidden');
        }
    } else {
        appState.medicine.gcs = null;
        if (gRes) gRes.classList.add('hidden');
    }

    // SURGERY
    const alvParams = {
        migration: getChk('chk-alv-mig'),
        anorexia: getChk('chk-alv-ano'),
        nausea: getChk('chk-alv-nau'),
        rlqPain: getChk('chk-alv-rlq'),
        rebound: getChk('chk-alv-reb'),
        temp: getChk('chk-alv-temp'),
        leukocytosis: getChk('chk-alv-leu'),
        leftShift: getChk('chk-alv-shi')
    };
    const alvVal = calculateAlvarado(alvParams);
    appState.surgery.alvarado = alvVal;
    const alvRes = getEl('output-alvarado');
    if (alvRes) {
        if (alvVal && alvVal.score > 0) {
            alvRes.classList.remove('hidden');
            alvRes.textContent = `Skor: ${alvVal.score}/10 (${alvVal.risk}). ${alvVal.recommendation}`;
        } else {
            alvRes.classList.add('hidden');
        }
    }

    const tbsa = getNum('input-parkland-tbsa');
    const rawBurnType = getVal('select-burn-type');
    const burnType: BurnProtocolType = (rawBurnType === 'electrical' || rawBurnType === 'classic_parkland')
        ? rawBurnType
        : 'atls10_thermal';
    const pkRes = getEl('output-parkland');
    if (tbsa && appState.biometry.weightKg && pkRes) {
        const isPedBurn = (totalMonths !== null && totalMonths < 168) || (y !== null && y < 14);
        const pkVal = calculateParkland(appState.biometry.weightKg, tbsa, y, {
            burnType,
            ageMonths: totalMonths,
            isPediatric: isPedBurn
        });
        appState.surgery.parkland = pkVal;
        if (pkVal) {
            pkRes.classList.remove('hidden');
            let pkHtml = `<div class="text-[10px] font-bold text-amber-300 mb-0.5">${escapeHtml(pkVal.formulaLabel)} (${pkVal.multiplierUsed} mL/kg/%TBSA RL)</div>
                          <strong>Resüsitasyon (24s RL):</strong> ${pkVal.totalVolume} mL<br>
                          <strong>İlk 8 Saat:</strong> ${pkVal.first8HrsVolume} mL (${pkVal.first8HrsRate} mL/s)<br>
                          <strong>Kalan 16 Saat:</strong> ${pkVal.next16HrsVolume} mL (${pkVal.next16HrsRate} mL/s)<br>
                          <span class="text-[9px] text-cyan-300">🎯 Hedef İdrar Çıkışı: ${escapeHtml(pkVal.urineOutputTarget)}</span>`;
            if (pkVal.requiresDextroseMaintenance && pkVal.maintenanceHourlyMl !== null) {
                pkHtml += `<div class="mt-1 p-1.5 rounded bg-rose-950/60 border border-rose-700/60 text-[9px] text-rose-200 font-semibold">
                    🍼 &lt;30 kg Pediatrik Ek İdame (%5 Dekstrozlu): ${pkVal.maintenanceDailyMl} mL/gün (<strong>${pkVal.maintenanceHourlyMl} mL/saat</strong>) — hipoglisemi profilaksisi için RL resüsitasyonuna EK verilir.
                </div>`;
            }
            if (pkVal.clinicalNote) {
                pkHtml += `<div class="mt-1 text-[9px] text-slate-300 leading-snug">${escapeHtml(pkVal.clinicalNote)}</div>`;
            }
            pkRes.innerHTML = pkHtml;
        } else {
            pkRes.classList.add('hidden');
        }
    } else {
        appState.surgery.parkland = null;
        if (pkRes) pkRes.classList.add('hidden');
    }

    // Ranson Akut Pankreatit Kriterleri (0. ve 48. Saat)
    const rWbc = getChk('chk-ranson-wbc16');
    const rGlu = getChk('chk-ranson-glu200');
    const rLdh = getChk('chk-ranson-ldh350');
    const rAst = getChk('chk-ranson-ast250');
    const rHct = getChk('chk-ranson-hct10');
    const rBun = getChk('chk-ranson-bun5');
    const rCa = getChk('chk-ranson-ca8');
    const rPo2 = getChk('chk-ranson-po260');
    const rBd = getChk('chk-ranson-bd4');
    const rFluid = getChk('chk-ranson-fluid6');
    const hasOtherRanson = rWbc || rGlu || rLdh || rAst || rHct || rBun || rCa || rPo2 || rBd || rFluid;
    const chkRansonAgeEl = getEl<HTMLInputElement>('chk-ranson-age55');
    if (hasOtherRanson && y !== null && y > 55 && chkRansonAgeEl && document.activeElement !== chkRansonAgeEl) {
        chkRansonAgeEl.checked = true;
    }
    const rAge55 = getChk('chk-ranson-age55');
    const ransonOut = getEl('output-ranson');
    const ransonVal = calculateRanson({
        ageO55: rAge55,
        wbcO16: rWbc,
        gluO200: rGlu,
        ldhO350: rLdh,
        astO250: rAst,
        hctDrop10: rHct,
        bunRise5: rBun,
        caU8: rCa,
        pO2U60: rPo2,
        baseDefO4: rBd,
        fluidSecO6: rFluid
    });
    if (ransonVal && ransonVal.score > 0) {
        appState.surgery.ranson = ransonVal;
        if (ransonOut) {
            const ransonAlert = ransonVal.score >= 5 ? 'danger' : ransonVal.score >= 3 ? 'warning' : 'success';
            renderClinicalCardResult(ransonOut, {
                title: `Ranson Skoru: ${ransonVal.score}/11 (0.s: ${ransonVal.admissionScore} | 48.s: ${ransonVal.hour48Score})`,
                riskText: `${ransonVal.severity} (~%${ransonVal.mortalityPercent} Mortalite)`,
                alertClass: ransonAlert,
                recommendations: ransonVal.interpretation
            });
        }
    } else {
        appState.surgery.ranson = null;
        if (ransonOut) ransonOut.classList.add('hidden');
    }

    const sutureLoc = getVal('select-suture-loc');
    const sutureRes = getEl('output-suture');
    if (sutureLoc && sutureRes) {
        const sutureVal = getSutureGuidance(sutureLoc);
        appState.surgery.suture = sutureVal;
        if (sutureVal) {
            sutureRes.classList.remove('hidden');
            sutureRes.innerHTML = `<strong>Materyal:</strong> ${sutureVal.material}<br>
                                   <strong>Boyut:</strong> ${sutureVal.size}<br>
                                   <strong>Alınma:</strong> ${sutureVal.removalDays}`;
        } else {
            sutureRes.classList.add('hidden');
        }
    } else {
        appState.surgery.suture = null;
        if (sutureRes) sutureRes.classList.add('hidden');
    }

    // OBGYN
    const lmp = getVal('input-lmp');
    const eddRes = getEl('output-edd');
    if (lmp && eddRes) {
        const eddVal = calculateObstetrics(lmp);
        appState.obgyn.eddData = eddVal;
        if (eddVal) {
            eddRes.classList.remove('hidden');
            eddRes.innerHTML = `GH: ${eddVal.gestationalAge} | TDT: ${eddVal.edd}`;
        } else {
            eddRes.classList.add('hidden');
        }
    } else {
        appState.obgyn.eddData = null;
        if (eddRes) eddRes.classList.add('hidden');
    }

    const bDil = getNum('input-bishop-dil');
    const bEff = getNum('input-bishop-eff');
    const bSta = getNum('input-bishop-sta');
    const bCon = getNum('input-bishop-con');
    const bPos = getNum('input-bishop-pos');
    const bRes = getEl('output-bishop');
    if (bDil !== null && bEff !== null && bSta !== null && bCon !== null && bPos !== null && bRes) {
        const bishopVal = calculateBishop(bDil, bEff, bSta, bCon, bPos);
        appState.obgyn.bishop = bishopVal;
        if (bishopVal) {
            bRes.classList.remove('hidden');
            bRes.textContent = `Skor: ${bishopVal.score}. ${bishopVal.interpretation}`;
        } else {
            bRes.classList.add('hidden');
        }
    } else {
        appState.obgyn.bishop = null;
        if (bRes) bRes.classList.add('hidden');
    }

    const preSbp = getNum('input-sys-bp');
    const preDbp = getNum('input-dia-bp');
    const prePro = getChk('chk-pre-pro');
    const preSym = getChk('chk-pre-sym');
    const preRes = getEl('output-pre');
    const isFemalePatient = appState.biometry.gender === 'female' || appState.biometry.gender === 'F';
    const hasObgynContext = Boolean(appState.obgyn.eddData) || prePro || preSym;
    if (preSbp !== null && preDbp !== null && isFemalePatient && hasObgynContext && preRes) {
        const symptoms = preSym ? ['symptom'] : [];
        appState.obgyn.preeclampsia = calculatePreeclampsia(preSbp, preDbp, prePro, symptoms);
        if (appState.obgyn.preeclampsia && appState.obgyn.preeclampsia.diagnosis !== 'Normal') {
            preRes.classList.remove('hidden');
            preRes.innerHTML = `${appState.obgyn.preeclampsia.diagnosis}<br><span class="text-xs text-rose-300 font-normal">${appState.obgyn.preeclampsia.alert || ''}</span>`;
        } else {
            preRes.classList.add('hidden');
        }
    } else {
        appState.obgyn.preeclampsia = null;
        if (preRes) preRes.classList.add('hidden');
    }

    // NEONATOLOGY: Hiperbilirubinemi İkili Rehber (AAP 2022 Güncel / TND 2014 Klasik) - Sıvı Kademesi Öncesi Hesaplanır
    const bAgeH = getNum('input-bhutani-age-hours');
    const bTsb = getNum('input-bhutani-tsb');
    const bGw = getNum('input-bhutani-gw') || (isPreterm && pretermGw ? pretermGw : 39);
    const bRisk = getChk('chk-bhutani-risk-factors');
    const bGuideline: BhutaniGuideline = getVal('select-bhutani-guideline') === 'TND_2014' ? 'TND_2014' : 'AAP_2022';
    const bMethod: BilirubinMeasurementType = getVal('select-bhutani-method') === 'TcB' ? 'TcB' : 'TSB';
    const bhutaniOut = getEl('output-bhutani-result');

    if (bAgeH && bTsb) {
        const bRes = calculateBhutaniJaundice({
            ageHours: bAgeH,
            totalBilirubin: bTsb,
            gestationalWeeks: bGw,
            hasRiskFactors: bRisk,
            guideline: bGuideline,
            measurementType: bMethod
        });
        appState.neonatology.bhutani = bRes;
        if (bhutaniOut) {
            const escStr = bRes.escalationThreshold !== undefined ? ` | Bakım Eskalasyonu: ${bRes.escalationThreshold} mg/dL` : '';
            const extra = `
                <div class="text-[9px] text-cyan-300 font-semibold">${escapeHtml(bRes.guidelineLabel || '')}</div>
                ${bRes.phototherapyThreshold ? `<div class="text-[10px]">Fototerapi Eşiği: ${bRes.phototherapyThreshold} mg/dL${escStr} | Kan Değişimi: ${bRes.exchangeThreshold} mg/dL</div>` : ''}
                <div class="text-[10px] font-semibold">${bRes.interpretation || ''}</div>
                ${bRes.followUpRecommendation ? `<div class="text-[9px] text-amber-300 pt-0.5 border-t border-slate-700/50">📅 İzlem: ${escapeHtml(bRes.followUpRecommendation)}</div>` : ''}
            `;
            renderClinicalCardResult(bhutaniOut, {
                title: `${bRes.ageHours}. Saat: ${bMethod} ${bRes.totalBilirubin} mg/dL`,
                riskText: bRes.riskGroupLabel || '',
                recommendations: bRes.recommendations,
                alertClass: bRes.alertClass,
                extraHtml: extra
            });
        }
    } else {
        appState.neonatology.bhutani = null;
        if (bhutaniOut) bhutaniOut.classList.add('hidden');
    }

    // IONS & FLUIDS
    const fTemp = getNum('input-temp');
    const neoFluidBanner = getEl('container-neonatal-fluid-banner');
    const neoFluidDayText = getEl('text-neonatal-fluid-day');
    const neoFluidTargetText = getEl('text-neonatal-fluid-target');
    const neoFluidDescText = getEl('text-neonatal-fluid-desc');
    const outDailyFluid = getEl('output-daily-fluid');
    const outHourlyFluid = getEl('output-hourly-fluid');

    if (isNeonate && appState.biometry.weightKg && ageData.days !== null) {
        const isPhototherapy = Boolean(
            appState.neonatology?.bhutani &&
            (
                appState.neonatology.bhutani.status === 'PHOTOTHERAPY_REQUIRED' ||
                appState.neonatology.bhutani.status === 'ESCALATION_OF_CARE' ||
                appState.neonatology.bhutani.status === 'EXCHANGE_TRANSFUSION_REQUIRED'
            )
        );
        const neoFluid = calculateNeonatalFluid({
            ageDays: ageData.days,
            weightKg: appState.biometry.weightKg,
            isPreterm: isPreterm,
            isPhototherapy: isPhototherapy
        });
        if (neoFluid) {
            appState.medicine.neonatalFluid = neoFluid;
            appState.medicine.fluid = {
                dailyVolume: neoFluid.totalDailyMl,
                hourlyRate: neoFluid.hourlyRateMl,
                fluidTypeRecommendation: neoFluid.soluteAdvice,
                isNeonate: true,
                dayTitle: neoFluid.dayTitle,
                contraindicationNotice: neoFluid.contraindicationNotice
            };

            if (outDailyFluid) outDailyFluid.textContent = `${neoFluid.totalDailyMl} mL (TND)`;
            if (outHourlyFluid) outHourlyFluid.textContent = `${neoFluid.hourlyRateMl} mL/s`;

            if (neoFluidBanner) {
                neoFluidBanner.classList.remove('hidden');
                if (neoFluidDayText) neoFluidDayText.textContent = `🍼 ${neoFluid.dayTitle} (${neoFluid.mlPerKgRange} mL/kg)`;
                if (neoFluidTargetText) neoFluidTargetText.textContent = `GIR: ${neoFluid.girMgKgMin} mg/kg/dk (%10D)`;
                if (neoFluidDescText) neoFluidDescText.innerHTML = `${neoFluid.soluteAdvice} <span class="text-rose-400 font-semibold block mt-0.5">${neoFluid.contraindicationNotice}</span>`;
            }
        }
    } else if (appState.biometry.weightKg) {
        if (neoFluidBanner) neoFluidBanner.classList.add('hidden');
        appState.medicine.neonatalFluid = null;
        const maintFluid = calculateMaintenanceFluid(appState.biometry.weightKg, fTemp || undefined);
        appState.medicine.fluid = maintFluid;
        if (maintFluid) {
            if (outDailyFluid) outDailyFluid.textContent = `${maintFluid.dailyVolume} mL`;
            if (outHourlyFluid) outHourlyFluid.textContent = `${maintFluid.hourlyRate} mL/s`;
        }
    } else {
        if (neoFluidBanner) neoFluidBanner.classList.add('hidden');
        appState.medicine.neonatalFluid = null;
        appState.medicine.fluid = null;
        if (outDailyFluid) outDailyFluid.textContent = '--';
        if (outHourlyFluid) outHourlyFluid.textContent = '--';
    }

    // Calcium
    const ionCa = getNum('input-serum-ca');
    const ionAlb = getNum('input-albumin');
    const ionWarn = getEl('container-ion-warnings');
    const warnings: string[] = [];
    if (ionCa !== null) {
        const caObj = calculateCorrectedCalcium({ totalCalcium: ionCa, albumin: ionAlb || undefined });
        appState.medicine.calcium = caObj;
        if (caObj && caObj.correctedCa) {
            warnings.push(`Düzeltilmiş Ca: ${caObj.correctedCa} ${caObj.alertMsg ? '('+caObj.alertMsg+')' : ''}`);
        }
    } else {
        appState.medicine.calcium = null;
    }

    // Sodium
    const ionNa = getNum('input-serum-na');
    const parsedTargetDrop = getNum('input-target-na-change');
    const targetNaDelta = parsedTargetDrop !== null ? Math.abs(parsedTargetDrop) : 8;
    const outNaDeficit = getEl('output-na-deficit');

    if (ionNa !== null && appState.biometry.weightKg && appState.biometry.gender) {
        const isMale = appState.biometry.gender === 'male' || appState.biometry.gender === 'M';
        const ageYears = appState.biometry.ageYears ?? 30; // fallback only when null/undefined
        const tbwFraction = isMale ? (ageYears > 65 ? 0.5 : 0.6) : (ageYears > 65 ? 0.45 : 0.5);
        
        const targetNa = ionNa < 135
            ? ionNa + targetNaDelta
            : (ionNa > 145 ? ionNa - targetNaDelta : ionNa);
        
        const naObj = calculateSodiumCorrection(ionNa, targetNa, appState.biometry.weightKg, tbwFraction);
        appState.medicine.sodium = naObj;
        if (naObj) {
            if (outNaDeficit) outNaDeficit.textContent = `${naObj.deficit.toFixed(0)} mEq`;
            if (naObj.warning) warnings.push(naObj.warning);
            warnings.push(`1L %3 NaCl: ${naObj.deltaNa3Percent >= 0 ? '+' : ''}${naObj.deltaNa3Percent.toFixed(1)} mEq değiştirir`);
            warnings.push(`1L %0.9 NaCl: ${naObj.deltaNa09Percent >= 0 ? '+' : ''}${naObj.deltaNa09Percent.toFixed(1)} mEq değiştirir`);
        }
    } else {
        appState.medicine.sodium = null;
        if (outNaDeficit) outNaDeficit.textContent = '--';
    }

    if (ionWarn) {
        if (warnings.length > 0) {
            ionWarn.classList.remove('hidden');
            ionWarn.innerHTML = warnings.join('<br>');
        } else {
            ionWarn.classList.add('hidden');
        }
    }

    // BLOOD GAS
    const ph = getNum('input-bg-ph');
    const pco2 = getNum('input-bg-pco2');
    const hco3 = getNum('input-bg-hco3');
    const bgRes = getEl('container-bg-warnings');
    if (ph && pco2 && hco3 && bgRes) {
        const bgAnalysis = analyzeBloodGas({
            pH: ph, 
            pCO2: pco2, 
            HCO3: hco3, 
            Na: getNum('input-bg-na') ?? undefined, 
            Cl: getNum('input-bg-cl') ?? undefined, 
            Albumin: getNum('input-albumin') ?? undefined, 
            sampleType: (getVal('select-bg-type') as 'ABG' | 'VBG') || 'ABG'
        });
        appState.medicine.bloodGas = bgAnalysis;
        if (bgAnalysis) {
            bgRes.classList.remove('hidden');
            const agHtml = bgAnalysis.corrected_AG !== null
                ? `<br><span class="text-[10px] text-amber-300">Anyon Açığı (AG): ${bgAnalysis.AG?.toFixed(1)}${bgAnalysis.hasAlbumin ? ` (Düz. AG: ${bgAnalysis.corrected_AG.toFixed(1)})` : ''}${bgAnalysis.deltaRatio !== null ? ` | Δ/Δ: ${bgAnalysis.deltaRatio}` : ''} — ${bgAnalysis.hagmaStatus}</span>`
                : '';
            bgRes.innerHTML = `<strong>${bgAnalysis.primaryDisorder}</strong>${bgAnalysis.compensationText ? `<br><span class="text-xs text-slate-300">${bgAnalysis.compensationText}</span>` : ''}${agHtml}`;
        }
    } else {
        appState.medicine.bloodGas = null;
        if (bgRes) bgRes.classList.add('hidden');
    }

    // INFUSION
    const infDose = getNum('input-inf-dose');
    const infMg = getNum('input-inf-mg');
    const infVol = getNum('input-inf-vol');
    const infUnit = (getVal('select-inf-unit') as 'mcg_kg_min' | 'mcg_min' | 'mg_kg_hr') || 'mcg_kg_min';
    const outInfRate = getEl('output-infusion-rate');
    if (infDose !== null && infMg !== null && infVol !== null && appState.biometry.weightKg) {
        const infObj = calculateInfusionRate({
            drugAmountMg: infMg,
            totalVolumeMl: infVol,
            weightKg: appState.biometry.weightKg,
            targetDose: infDose,
            doseUnit: infUnit
        });
        appState.medicine.infusion = infObj;
        if (infObj && outInfRate) {
            outInfRate.textContent = `${infObj.rateMlHr} mL/saat`;
        }
    } else {
        appState.medicine.infusion = null;
        if (outInfRate) outInfRate.textContent = '--';
    }

    // GLUCOSE INFUSION RATE (GIR) & NEONATAL
    const dextrosePct = getNum('select-gir-dextrose');
    let girRate = getNum('input-gir-rate');
    if (girRate === null && appState.medicine.fluid && appState.medicine.fluid.hourlyRate) {
        girRate = appState.medicine.fluid.hourlyRate;
    }
    const girContainer = getEl('output-gir-result');
    if (dextrosePct && girRate && appState.biometry.weightKg && girContainer) {
        appState.medicine.gir = calculateGIR({
            dextrosePercent: dextrosePct,
            rateMlHr: girRate,
            weightKg: appState.biometry.weightKg
        });
        const g = appState.medicine.gir;
        if (g) {
            girContainer.classList.remove('hidden');
            girContainer.className = `p-2 rounded-lg border text-[10px] font-mono space-y-1.5 bg-slate-900/60 border-slate-700/60`;
            let gHtml = `<div class="flex justify-between items-center">
                <span class="text-slate-400">GIR:</span>
                <span class="text-xs font-bold ${g.alertClass}">${g.gir} mg/kg/dk</span>
            </div>`;
            gHtml += `<div class="text-[10px] ${g.alertClass}">${g.interpretation}</div>`;
            if (g.status === 'LOW' || g.gir < 4) {
                gHtml += `<div class="p-1.5 bg-rose-950/60 border border-rose-700/60 rounded text-rose-300 font-bold text-[9px]">
                    🚨 Hipoglisemi Acil Bolus: ${g.hypoglycemiaBolus.instructions}
                </div>`;
            }
            girContainer.innerHTML = gHtml;
        }
    } else {
        appState.medicine.gir = null;
        if (girContainer) girContainer.classList.add('hidden');
    }

    // CARDIAC (EKG QTc & KUTUCUK DÖNÜŞÜMÜ)
    const speedSelect = getEl<HTMLSelectElement>('select-ecg-paper-speed');
    const paperSpeed: 25 | 50 = speedSelect && speedSelect.value === '50' ? 50 : 25;
    const msPerBox = paperSpeed === 50 ? 20 : 40;

    const qtBoxesInput = getEl<HTMLInputElement>('input-ecg-qt-boxes');
    const rrBoxesInput = getEl<HTMLInputElement>('input-ecg-rr-boxes');
    const qrsBoxesInput = getEl<HTMLInputElement>('input-ecg-qrs-boxes');
    const qtInput = getEl<HTMLInputElement>('input-ecg-qt');
    const rrInput = getEl<HTMLInputElement>('input-ecg-rr');
    const qrsInput = getEl<HTMLInputElement>('input-ecg-qrs');
    const hrInput = getEl<HTMLInputElement>('input-hr');

    // 1. Kutucuk girişinden ms alanına senkronizasyon (Eğer kullanıcı kutucuk alanına yazıyorsa)
    if (typeof document !== 'undefined') {
        if (document.activeElement === qtBoxesInput && qtBoxesInput && qtInput) {
            const bVal = parseNum(qtBoxesInput.value);
            if (bVal !== null && bVal > 0) {
                qtInput.value = String(Math.round(bVal * msPerBox));
            } else if (qtBoxesInput.value === '') {
                qtInput.value = '';
            }
        }
        if (document.activeElement === rrBoxesInput && rrBoxesInput && rrInput) {
            const bVal = parseNum(rrBoxesInput.value);
            if (bVal !== null && bVal > 0) {
                const calculatedRr = Math.round(bVal * msPerBox);
                rrInput.value = String(calculatedRr);
                if (hrInput && document.activeElement !== hrInput) {
                    hrInput.value = String(Math.round(60000 / calculatedRr));
                }
            } else if (rrBoxesInput.value === '') {
                rrInput.value = '';
                if (hrInput && document.activeElement !== hrInput) {
                    hrInput.value = '';
                }
            }
        }
        if (document.activeElement === qrsBoxesInput && qrsBoxesInput && qrsInput) {
            const bVal = parseNum(qrsBoxesInput.value);
            if (bVal !== null && bVal > 0) {
                qrsInput.value = String(Math.round(bVal * msPerBox));
            } else if (qrsBoxesInput.value === '') {
                qrsInput.value = '';
            }
        }
    }

    // If user explicitly cleared HR or RR while focused on it, clear the paired field too
    if (typeof document !== 'undefined') {
        if (document.activeElement === hrInput && hrInput && hrInput.value.trim() === '') {
            if (rrInput) rrInput.value = '';
            if (rrBoxesInput) rrBoxesInput.value = '';
        } else if (document.activeElement === rrInput && rrInput && rrInput.value.trim() === '') {
            if (hrInput) hrInput.value = '';
            if (rrBoxesInput) rrBoxesInput.value = '';
        }
    }

    let qt = qtInput ? parseNum(qtInput.value) : null;
    let hrVal = hrInput ? parseNum(hrInput.value) : null;
    let rrVal = rrInput ? parseNum(rrInput.value) : null;

    // Sync HR (vital bulgular) and RR (ms) dynamically
    if (typeof document !== 'undefined') {
        if (hrVal !== null && hrVal > 0 && (rrVal === null || document.activeElement === hrInput) && rrInput) {
            rrVal = Math.round(60000 / hrVal);
            rrInput.value = String(rrVal);
        } else if (rrVal !== null && rrVal > 0 && (hrVal === null || document.activeElement === rrInput) && hrInput) {
            hrVal = Math.round(60000 / rrVal);
            hrInput.value = String(hrVal);
        }
    }

    const qrsPatternSelect = getEl<HTMLSelectElement>('select-ecg-qrs-pattern');
    const qrsPattern = (qrsPatternSelect ? qrsPatternSelect.value : 'custom') as 'custom' | 'normal' | 'lbbb' | 'rbbb' | 'paced';
    let qrs = qrsInput ? parseNum(qrsInput.value) : null;

    // Handle QRS Pattern presets
    if (qrsPattern !== 'custom' && (qrs === null || (typeof document !== 'undefined' && document.activeElement === qrsPatternSelect)) && qrsInput) {
        if (qrsPattern === 'normal') qrs = 90;
        else if (qrsPattern === 'lbbb') qrs = 140;
        else if (qrsPattern === 'rbbb') qrs = 130;
        else if (qrsPattern === 'paced') qrs = 160;
        qrsInput.value = String(qrs);
    }

    // 2. ms alanından kutucuk alanına ve ipuçlarına senkronizasyon (Eğer kullanıcı ms alanında yazıyorsa)
    if (typeof document !== 'undefined') {
        if (document.activeElement !== qtBoxesInput && qtBoxesInput) {
            qtBoxesInput.value = qt !== null && qt > 0 ? String(Number((qt / msPerBox).toFixed(1))) : '';
        }
        if (document.activeElement !== rrBoxesInput && rrBoxesInput) {
            rrBoxesInput.value = rrVal !== null && rrVal > 0 ? String(Number((rrVal / msPerBox).toFixed(1))) : '';
        }
        if (document.activeElement !== qrsBoxesInput && qrsBoxesInput) {
            qrsBoxesInput.value = qrs !== null && qrs > 0 ? String(Number((qrs / msPerBox).toFixed(1))) : '';
        }
    }

    // İpucu ve hesaplama etiketlerini güncelle
    const hintQtBoxes = getEl('hint-ecg-qt-boxes');
    const hintRrBoxes = getEl('hint-ecg-rr-boxes');
    const hintQrsBoxes = getEl('hint-ecg-qrs-boxes');
    const calcQtMs = getEl('calc-ecg-qt-ms');
    const calcRrMs = getEl('calc-ecg-rr-ms');
    const calcQrsMs = getEl('calc-ecg-qrs-ms');

    if (hintQtBoxes) hintQtBoxes.textContent = qt !== null ? `≈ ${(qt / msPerBox).toFixed(1)} kare` : '-- kare';
    if (hintRrBoxes) hintRrBoxes.textContent = rrVal !== null ? `≈ ${(rrVal / msPerBox).toFixed(1)} kare` : '-- kare';
    if (hintQrsBoxes) hintQrsBoxes.textContent = qrs !== null ? `≈ ${(qrs / msPerBox).toFixed(1)} kare` : '-- kare';

    if (calcQtMs) calcQtMs.textContent = qt !== null ? `= ${qt} ms` : '= -- ms';
    if (calcRrMs) {
        const derivedBpm = hrVal ?? (rrVal ? Math.round(60000 / rrVal) : '--');
        calcRrMs.textContent = rrVal !== null ? `= ${rrVal} ms (${derivedBpm} bpm)` : '= -- ms (-- bpm)';
    }
    if (calcQrsMs) calcQrsMs.textContent = qrs !== null ? `= ${qrs} ms` : '= -- ms';

    const qtRes = getEl('output-ecg-qtc');
    
    if (qt !== null && (hrVal !== null || rrVal !== null) && qtRes) {
        appState.other.cardiac = calculateQTc({
           hr: hrVal || undefined,
           rrMs: rrVal || undefined,
           qt: qt,
           qrs: qrs || undefined,
           qrsPattern: qrsPattern,
           age: appState.biometry.ageYears ?? undefined,
           gender: appState.biometry.gender || undefined,
           k_level: getNum('input-serum-k') || undefined,
           is_ami: getChk('chk-tisdale-ami'),
           is_sepsis: getChk('chk-tisdale-sepsis'),
           is_hf: getChk('chk-tisdale-hf'),
           drugs: appState.treatment && appState.treatment.selectedDrugs ? appState.treatment.selectedDrugs : []
        });
        
        const c = appState.other.cardiac;
        qtRes.classList.remove('hidden');
        let qtcHtml = '';

        // Error / blocked states
        if (c.status === 'BLOCKED' || c.status === 'INVALID_INPUT' || c.status === 'OUT_OF_RANGE') {
            qtcHtml = `<div class="text-rose-400 font-semibold">${c.interpretation}</div>`;
            qtRes.className = 'p-2 rounded-lg space-y-1 font-mono mt-2 border bg-rose-950/40 border-rose-600/50';
            qtRes.innerHTML = qtcHtml;
        } else if (c.status === 'INCOMPLETE') {
            qtcHtml = `<div class="text-slate-400 text-xs">${c.interpretation}</div>`;
            qtRes.className = 'p-2 rounded-lg space-y-1 font-mono mt-2 border bg-slate-900/60 border-slate-700/50';
            qtRes.innerHTML = qtcHtml;
        } else {
            // Normal calculation display
            qtcHtml += `<div class="text-slate-300"><strong>Nabız / RR:</strong> ${c.hr} bpm <span class="text-slate-400">(${c.rrMs} ms)</span></div>`;
            qtcHtml += `<div><strong>QT / QRS:</strong> ${c.qt} ms / ${c.qrs ? c.qrs + ' ms' : 'Normal'}`;
            if (qrsPattern && qrsPattern !== 'custom') {
                const badgeText = qrsPattern === 'lbbb' ? 'LBBB' : qrsPattern === 'rbbb' ? 'RBBB' : qrsPattern === 'paced' ? 'PACED' : 'NORMAL';
                qtcHtml += ` <span class="px-1 py-0.5 bg-amber-900/60 text-amber-300 border border-amber-700/50 rounded text-[9px] font-sans">${badgeText}</span>`;
            }
            qtcHtml += `</div>`;
            qtcHtml += `<div class="grid grid-cols-2 gap-1 my-1 pt-1 border-t border-slate-700/50 text-[10px]">`;
            qtcHtml += `<div><strong>QTcB (Bazett):</strong> <span class="text-sky-300 font-bold">${c.qtcBazett ?? '--'} ms</span></div>`;
            qtcHtml += `<div><strong>QTcF (Fridericia):</strong> <span class="text-emerald-300 font-bold">${c.qtcFridericia ?? '--'} ms</span></div>`;
            qtcHtml += `</div>`;
            if (c.formulaDiff !== undefined && c.formulaDiff !== 0) {
                const diffSign = c.formulaDiff > 0 ? '+' : '';
                qtcHtml += `<div class="text-[9px] text-slate-400">Formül Farkı (Bazett - Fridericia): <span class="${Math.abs(c.formulaDiff) > 15 ? 'text-amber-400 font-bold' : 'text-slate-300'}">${diffSign}${c.formulaDiff} ms</span></div>`;
            }
            if (c.qtcBogossian !== null && c.qtcBogossian !== undefined) {
                qtcHtml += `<div class="text-rose-400 font-bold text-[10px] mt-0.5">⚡ QTcBog (Bogossian - Geniş QRS): ${c.qtcBogossian} ms</div>`;
            }
            
            const interpColor = c.colorCode === 'success' ? 'text-emerald-400' : c.colorCode === 'warning' ? 'text-amber-400' : 'text-rose-400';
            qtcHtml += `<div class="${interpColor} mt-1 font-semibold">${c.interpretation}</div>`;
            
            if (c.tisdaleScore > 0) {
                 qtcHtml += `<div class="text-amber-400 text-[10px] mt-1 pt-1 border-t border-slate-700/50">Tisdale Skoru: ${c.tisdaleScore} (${c.tisdaleRisk})</div>`;
            }
            if (c.warnings && c.warnings.length > 0) {
                qtcHtml += `<div class="text-rose-400 text-[9px] mt-1 space-y-0.5">${c.warnings.map((w: string) => `<div>${w}</div>`).join('')}</div>`;
            }
            if (c.drugFlags && c.drugFlags.length > 0) {
                qtcHtml += `<div class="text-fuchsia-400 text-[9px] mt-1 space-y-0.5 font-bold">${c.drugFlags.map((f: string) => `<div>${f}</div>`).join('')}</div>`;
            }

            qtRes.innerHTML = qtcHtml;
            const isDanger = c.colorCode === 'danger' || c.colorCode === 'orange';
            qtRes.className = `p-2 rounded-lg space-y-1 font-mono mt-2 border ${isDanger ? 'bg-rose-950/40 border-rose-600/50' : c.colorCode === 'warning' ? 'bg-amber-950/40 border-amber-600/50' : 'bg-slate-900/60 border-slate-700/50'}`;
        }
    } else {
        if (qtRes) qtRes.classList.add('hidden');
        appState.other.cardiac = null;
    }

    // AXIS
    const ecgD1 = getNum('input-ecg-d1');
    const ecgAvf = getNum('input-ecg-avf');
    const axisRes = getEl('output-ecg-axis');
    if (ecgD1 !== null && ecgAvf !== null && axisRes) {
        const axisObj = calculateAxis(ecgD1, ecgAvf);
        if (axisObj) {
            appState.other.axis = axisObj;
            axisRes.classList.remove('hidden');
            axisRes.textContent = `Aks: ${axisObj.degrees}° — ${axisObj.axisCategory}`;
        } else {
            appState.other.axis = null;
            axisRes.classList.add('hidden');
        }
    } else if (axisRes) {
        appState.other.axis = null;
        axisRes.classList.add('hidden');
    }

    // ENDOCRINE: STEROID & HOMA-IR
    const steroidSrc = getVal('select-steroid-source');
    const steroidDose = getNum('input-steroid-dose');
    const steroidTable = getEl('output-steroid-table');
    if (steroidSrc && steroidDose && steroidTable) {
        appState.medicine.steroid = convertSteroids({ sourceDrug: steroidSrc, doseMg: steroidDose });
        const st = appState.medicine.steroid;
        if (st) {
            steroidTable.classList.remove('hidden');
            steroidTable.innerHTML = `
                <div class="text-sky-300 font-bold mb-1 border-b border-slate-700/50 pb-1">
                    ${st.sourceDrug} ${st.inputDoseMg} mg Eşdeğerlikleri:
                </div>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                    ${st.conversions.map((c: any) => `
                        <div class="flex justify-between items-center ${c.isSource ? 'text-amber-300 font-bold' : 'text-slate-300'}">
                            <span>${c.name}:</span>
                            <span>${c.equivalentDoseMg} mg</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } else {
        appState.medicine.steroid = null;
        if (steroidTable) steroidTable.classList.add('hidden');
    }

    const fastingGlu = getNum('input-homa-glucose');
    const fastingIns = getNum('input-homa-insulin');
    const pubertyStage = getVal('select-homa-puberty');
    const homaRes = getEl('output-homa-result');
    if (fastingGlu && fastingIns && homaRes) {
        appState.medicine.homaIR = calculateHOMAIR({
            fastingGlucoseMgDl: fastingGlu,
            fastingInsulinUuMl: fastingIns,
            tannerStage: pubertyStage || undefined
        });
        const hm = appState.medicine.homaIR;
        if (hm) {
            homaRes.classList.remove('hidden');
            homaRes.className = `p-2 rounded-lg border font-mono space-y-1 text-[10px] ${hm.alertClass}`;
            homaRes.innerHTML = `
                <div class="flex justify-between items-center font-bold">
                    <span>HOMA-IR: ${hm.homaIR}</span>
                    <span>Eşik: &gt; ${hm.cutoff} (${hm.tannerStage})</span>
                </div>
                <div class="text-[10px] leading-relaxed">${hm.interpretation}</div>
            `;
        }
    } else {
        appState.medicine.homaIR = null;
        if (homaRes) homaRes.classList.add('hidden');
    }

    // CENTOR / MCISAAC
    const cFever = getChk('chk-centor-fever');
    const cNoCough = getChk('chk-centor-no-cough');
    const cNodes = getChk('chk-centor-nodes');
    const cTonsils = getChk('chk-centor-tonsils');
    const centorRes = getEl('output-centor-result');

    if ((cFever || cNoCough || cNodes || cTonsils) && centorRes) {
        const centorAgeY = y !== null ? y : (m ? m / 12 : 20);
        appState.pediatrics.centor = calculateCentorMcIsaac({
            feverOver38: cFever,
            noCough: cNoCough,
            tenderCervicalNodes: cNodes,
            tonsillarExudate: cTonsils,
            ageYears: centorAgeY
        });
        const ct = appState.pediatrics.centor;
        if (ct) {
            renderClinicalCardResult(centorRes, {
                title: `<strong class="${ct.alertClass}">Centor Skoru: ${ct.score}</strong>`,
                riskText: `GAS Riski: ${ct.riskPercent}`,
                recommendations: ct.recommendation,
                alertClass: ct.score >= 4 ? 'danger' : (ct.score >= 2 ? 'warning' : 'slate')
            });
        }
    } else {
        appState.pediatrics.centor = null;
        if (centorRes) centorRes.classList.add('hidden');
    }

    // ------------------------------------------------------------------------
    // TROMBOEMBOLİ & KARDİYAK ACİL MOTORLARI
    // ------------------------------------------------------------------------
    // A. Wells DVT
    const dvtCancer = getChk('chk-dvt-cancer');
    const dvtParalysis = getChk('chk-dvt-paralysis');
    const dvtBedridden = getChk('chk-dvt-bedridden');
    const dvtTenderness = getChk('chk-dvt-tenderness');
    const dvtSwelling = getChk('chk-dvt-swelling-entire');
    const dvtCalf = getChk('chk-dvt-calf-diff');
    const dvtPitting = getChk('chk-dvt-pitting-edema');
    const dvtCollateral = getChk('chk-dvt-collateral');
    const dvtPrev = getChk('chk-dvt-previous-dvt');
    const dvtAlt = getChk('chk-dvt-alt-likely');
    const dvtOut = getEl('output-wells-dvt');

    if (dvtCancer || dvtParalysis || dvtBedridden || dvtTenderness || dvtSwelling || dvtCalf || dvtPitting || dvtCollateral || dvtPrev || dvtAlt) {
        const dvtRes = calculateWellsDVT({
            activeCancer: dvtCancer,
            paralysisOrParesis: dvtParalysis,
            bedriddenRecently: dvtBedridden,
            localizedTenderness: dvtTenderness,
            entireLegSwollen: dvtSwelling,
            calfSwellingGreaterThan3cm: dvtCalf,
            pittingEdema: dvtPitting,
            collateralSuperficialVeins: dvtCollateral,
            previouslyDocumentedDVT: dvtPrev,
            alternativeDiagnosisLikely: dvtAlt
        });
        appState.thrombosis.wellsDVT = dvtRes;
        if (dvtOut) {
            renderClinicalCardResult(dvtOut, {
                title: `Wells DVT: ${dvtRes.score} Puan`,
                riskText: `${dvtRes.riskCategory} (%${dvtRes.probability})`,
                recommendations: dvtRes.recommendations,
                alertClass: dvtRes.alertClass
            });
        }
    } else {
        appState.thrombosis.wellsDVT = null;
        if (dvtOut) dvtOut.classList.add('hidden');
    }

    // B. Wells PTE
    const peDvt = getChk('chk-pe-dvt-symptoms');
    const peAlt = getChk('chk-pe-alt-less-likely');
    const peHr = getChk('chk-pe-hr-100');
    const peImm = getChk('chk-pe-immobilization');
    const pePrev = getChk('chk-pe-previous-pe');
    const peHemo = getChk('chk-pe-hemoptysis');
    const peMal = getChk('chk-pe-malignancy');
    const peOut = getEl('output-wells-pe');

    if (peDvt || peAlt || peHr || peImm || pePrev || peHemo || peMal) {
        const peRes = calculateWellsPTE({
            clinicalSignsOfDVT: peDvt,
            peLikelyOrMoreLikelyThanAlt: peAlt,
            heartRateOver100: peHr,
            immobilizationOrSurgery: peImm,
            previousDvtOrPe: pePrev,
            hemoptysis: peHemo,
            malignancy: peMal
        });
        appState.thrombosis.wellsPTE = peRes;
        if (peOut) {
            renderClinicalCardResult(peOut, {
                title: `Wells PTE: ${peRes.score} Puan`,
                riskText: `${peRes.twoTierRisk.risk} (${peRes.twoTierRisk.tier})`,
                recommendations: peRes.recommendations,
                alertClass: peRes.alertClass
            });
        }
    } else {
        appState.thrombosis.wellsPTE = null;
        if (peOut) peOut.classList.add('hidden');
    }

    // C. PERC
    const percAge = getChk('chk-perc-age');
    const percHr = getChk('chk-perc-hr');
    const percSpo2 = getChk('chk-perc-spo2');
    const percSwelling = getChk('chk-perc-swelling');
    const percHemo = getChk('chk-perc-hemoptysis');
    const percSurg = getChk('chk-perc-surgery');
    const percHist = getChk('chk-perc-history');
    const percEst = getChk('chk-perc-estrogen');
    const percOut = getEl('output-perc');

    if (percAge || percHr || percSpo2 || percSwelling || percHemo || percSurg || percHist || percEst) {
        const percRes = evaluatePERC({
            ageGte50: percAge,
            heartRateGte100: percHr,
            spo2Lt95OnRoomAir: percSpo2,
            unilateralLegSwelling: percSwelling,
            hemoptysis: percHemo,
            recentSurgeryOrTrauma: percSurg,
            priorDvtOrPe: percHist,
            hormoneOrEstrogenUse: percEst
        });
        appState.thrombosis.perc = percRes;
        if (percOut) {
            renderClinicalCardResult(percOut, {
                title: percRes.isPERCNegative ? '✓ PERC NEGATİF (0 Kriter)' : `⚠️ PERC POZİTİF (${percRes.positiveCount} Kriter)`,
                recommendations: percRes.recommendations,
                alertClass: percRes.alertClass
            });
        }
    } else {
        appState.thrombosis.perc = null;
        if (percOut) percOut.classList.add('hidden');
    }

    // D. HEART Score
    const hHist = getNum('select-heart-history') || 0;
    const hEcg = getNum('select-heart-ecg') || 0;
    const hAge = getNum('select-heart-age') || 0;
    const hRisk = getNum('select-heart-risk') || 0;
    const hTrop = getNum('select-heart-troponin') || 0;
    const heartOut = getEl('output-heart-score');

    if (hHist > 0 || hEcg > 0 || hAge > 0 || hRisk > 0 || hTrop > 0) {
        const heartRes = calculateHEART({
            historyPoints: hHist,
            ecgPoints: hEcg,
            agePoints: hAge,
            riskFactorsPoints: hRisk,
            troponinPoints: hTrop
        });
        appState.thrombosis.heart = heartRes;
        if (heartOut) {
            renderClinicalCardResult(heartOut, {
                title: `HEART Skoru: ${heartRes.score}/10`,
                riskText: `${heartRes.riskCategory} (%${heartRes.maceRatePercent} MACE)`,
                recommendations: heartRes.recommendations,
                alertClass: heartRes.alertClass
            });
        }
    } else {
        appState.thrombosis.heart = null;
        if (heartOut) heartOut.classList.add('hidden');
    }

    // E. CHA2DS2-VASc & HAS-BLED
    const afChf = getChk('chk-af-chf');
    const afHtn = getChk('chk-af-htn');
    const afAge75 = getChk('chk-af-age75');
    const afDm = getChk('chk-af-dm');
    const afStroke = getChk('chk-af-stroke');
    const afVasc = getChk('chk-af-vasc');
    const afAge65 = getChk('chk-af-age65');
    const afFemale = getChk('chk-af-female');
    const afOut = getEl('output-cha2ds2vasc');

    if (afChf || afHtn || afAge75 || afDm || afStroke || afVasc || afAge65 || afFemale) {
        const afRes = calculateCHA2DS2VASc({
            congestiveHeartFailure: afChf,
            hypertension: afHtn,
            age75OrOlder: afAge75,
            diabetesMellitus: afDm,
            priorStrokeOrTIA: afStroke,
            vascularDisease: afVasc,
            age65to74: afAge65,
            femaleGender: afFemale
        });
        appState.thrombosis.cha2ds2vasc = afRes;
        if (afOut) {
            renderClinicalCardResult(afOut, {
                title: `CHA₂DS₂-VASc: ${afRes.score} Puan`,
                riskText: `Yıllık İnme: %${afRes.annualStrokeRiskPercent}`,
                recommendations: afRes.anticoagulationRecommendation,
                alertClass: afRes.alertClass
            });
        }
    } else {
        appState.thrombosis.cha2ds2vasc = null;
        if (afOut) afOut.classList.add('hidden');
    }

    // HAS-BLED
    const bHtn = getChk('chk-bleeding-htn');
    const bRenal = getChk('chk-bleeding-renal');
    const bLiver = getChk('chk-bleeding-liver');
    const bStroke = getChk('chk-bleeding-stroke');
    const bHist = getChk('chk-bleeding-history');
    const bInr = getChk('chk-bleeding-inr');
    const bElderly = getChk('chk-bleeding-elderly');
    const bDrugs = getChk('chk-bleeding-drugs');
    const bAlc = getChk('chk-bleeding-alcohol');
    const hasbledOut = getEl('output-hasbled');

    if (bHtn || bRenal || bLiver || bStroke || bHist || bInr || bElderly || bDrugs || bAlc) {
        const bRes = calculateHASBLED({
            hypertensionUncontrolled: bHtn,
            abnormalRenalFunction: bRenal,
            abnormalLiverFunction: bLiver,
            priorStroke: bStroke,
            bleedingHistoryOrPredisposition: bHist,
            labileINR: bInr,
            elderlyOver65: bElderly,
            drugsConcomitant: bDrugs,
            alcoholExcess: bAlc
        });
        appState.thrombosis.hasbled = bRes;
        if (hasbledOut) {
            renderClinicalCardResult(hasbledOut, {
                title: `HAS-BLED: ${bRes.score} Puan`,
                riskText: bRes.bleedingRiskCategory,
                recommendations: bRes.recommendations,
                alertClass: bRes.alertClass
            });
        }
    } else {
        appState.thrombosis.hasbled = null;
        if (hasbledOut) hasbledOut.classList.add('hidden');
    }

    // ------------------------------------------------------------------------
    // NEFROLOJİ, TOKSİKOLOJİ & PNÖMONİ MOTORLARI
    // ------------------------------------------------------------------------
    // A. FENa & FEUrea
    const fenaSNa = getNum('input-fena-s-na');
    const fenaUNa = getNum('input-fena-u-na');
    const fenaSCr = getNum('input-fena-s-cr');
    const fenaUCr = getNum('input-fena-u-cr');
    const fenaDiuretic = getChk('chk-fena-diuretic');
    const feureaUnit = getVal('select-feurea-unit') || 'bun';
    const feureaSBun = getNum('input-feurea-s-bun');
    const feureaUUrea = getNum('input-feurea-u-urea');
    const fenaOut = getEl('output-fena-feurea');

    if ((fenaSNa && fenaUNa && fenaSCr && fenaUCr) || (feureaSBun && feureaUUrea && fenaSCr && fenaUCr)) {
        let resHtml = '';
        let fenaRes: any = null;
        let feureaRes: any = null;

        if (fenaSNa && fenaUNa && fenaSCr && fenaUCr) {
            fenaRes = calculateFENa({
                serumSodium: fenaSNa,
                urineSodium: fenaUNa,
                serumCreatinine: fenaSCr,
                urineCreatinine: fenaUCr,
                isOnDiuretics: fenaDiuretic
            });
            appState.nephroTox.fena = fenaRes;
            resHtml += `
                <div class="flex justify-between items-center font-bold">
                    <span>FENa: %${fenaRes.fenaPercent}</span>
                    <span class="${fenaRes.alertClass === 'text-rose-400' ? 'text-rose-400' : 'text-sky-400'}">${fenaRes.etiology}</span>
                </div>
                <div class="text-[10px] text-slate-300">${fenaRes.interpretation}</div>
                ${fenaRes.diureticWarning ? `<div class="p-1.5 rounded bg-amber-950/50 border border-amber-800 text-amber-200 text-[9px] mt-1">${fenaRes.diureticWarning}</div>` : ''}
            `;
        } else {
            appState.nephroTox.fena = null;
        }

        if (feureaSBun && feureaUUrea && fenaSCr && fenaUCr) {
            feureaRes = calculateFEUrea({
                serumBUN: feureaSBun,
                isBun: feureaUnit === 'bun',
                urineUrea: feureaUUrea,
                serumCreatinine: fenaSCr,
                urineCreatinine: fenaUCr
            });
            appState.nephroTox.feurea = feureaRes;
            resHtml += `
                <div class="flex justify-between items-center font-bold pt-1.5 border-t border-slate-700/60 mt-1.5">
                    <span>FEUrea (Diüretik Güvenli): %${feureaRes.feUreaPercent}</span>
                    <span class="${feureaRes.alertClass === 'text-rose-400' ? 'text-rose-400' : 'text-sky-400'}">${feureaRes.etiology}</span>
                </div>
                <div class="text-[10px] text-slate-300">${feureaRes.interpretation}</div>
            `;
        } else {
            appState.nephroTox.feurea = null;
        }

        // Birlikte Değerlendirme (Concordance / Diuretic-masked Prerenal)
        if (fenaRes && feureaRes) {
            const concordance = evaluateOliguriaDifferential(fenaRes, feureaRes);
            if (concordance) {
                const badgeColor = concordance.concordance.includes('PRERENAL') ? 'bg-sky-950/40 border-sky-800 text-sky-200' : (concordance.concordance.includes('ATN') ? 'bg-rose-950/40 border-rose-800 text-rose-200' : 'bg-amber-950/40 border-amber-800 text-amber-200');
                resHtml += `
                    <div class="p-2 rounded-lg border mt-2 text-[10px] font-sans ${badgeColor}">
                        <div class="font-bold mb-0.5">${concordance.summary}</div>
                        <div class="text-[9px] opacity-90">${concordance.action}</div>
                    </div>
                `;
            }
        }

        if (fenaOut) {
            fenaOut.classList.remove('hidden');
            fenaOut.innerHTML = resHtml;
        }
    } else {
        appState.nephroTox.fena = null;
        appState.nephroTox.feurea = null;
        if (fenaOut) fenaOut.classList.add('hidden');
    }

    // B. Düzeltilmiş Sodyum & Osmolal Gap
    const corrNaMeas = getNum('input-corr-na-meas');
    const corrGlu = getNum('input-corr-glucose');
    const osmMeas = getNum('input-osm-measured');
    const corrNaOut = getEl('output-corr-na-osm');

    if (corrNaMeas && corrGlu) {
        const corrRes = calculateCorrectedSodium({
            measuredSodium: corrNaMeas,
            glucoseMgDl: corrGlu
        });
        appState.nephroTox.correctedSodium = corrRes;
        let osmRes: any = null;
        if (osmMeas) {
            const bunForOsm = feureaSBun !== null
                ? (feureaUnit === 'urea' ? +(feureaSBun / 2.14).toFixed(1) : feureaSBun)
                : 15;
            osmRes = calculateOsmolalGap({
                measuredOsmolality: osmMeas,
                sodium: corrNaMeas,
                glucoseMgDl: corrGlu,
                bunMgDl: bunForOsm
            });
            appState.nephroTox.osmolalGap = osmRes;
        }
        if (corrRes && corrNaOut) {
            corrNaOut.classList.remove('hidden');
            corrNaOut.innerHTML = `
                <div class="flex justify-between items-center font-bold">
                    <span>Katz Düzeltilmiş Na: ${corrRes.correctedSodiumKatz} mEq/L</span>
                    <span class="text-slate-400 text-[10px]">Ölçülen: ${corrRes.measuredSodium}</span>
                </div>
                <div class="text-[9px] text-cyan-300 font-mono">${corrRes.formulaNotes || ''}</div>
                <div class="text-[10px] text-slate-300 mt-1">${corrRes.interpretation}</div>
                ${osmRes ? `
                    <div class="pt-1.5 border-t border-slate-700/60 mt-1.5 space-y-1">
                        <div class="flex justify-between items-center font-bold">
                            <span>Osmolal Açık: ${osmRes.osmolalGap} mOsm/kg</span>
                            <span class="${osmRes.isCriticalGap ? 'text-rose-400 font-bold' : (osmRes.isHighGap ? 'text-amber-400 font-bold' : 'text-emerald-400')}">${osmRes.isCriticalGap ? '🚨 KRİTİK YÜKSEK' : (osmRes.isHighGap ? '⚠️ YÜKSEK' : '✓ Normal')}</span>
                        </div>
                        <div class="text-[10px] text-slate-300">${osmRes.interpretation}</div>
                        ${osmRes.antidoteAdvice ? `
                            <div class="p-2 rounded bg-rose-950/60 border border-rose-800 text-[9px] text-rose-200 space-y-1 mt-1 font-sans">
                                <div class="font-bold text-rose-300">Antidot Protokolü:</div>
                                <div>• ${osmRes.antidoteAdvice.fomepizol}</div>
                                <div>• ${osmRes.antidoteAdvice.etanolAlternative}</div>
                                <div class="text-amber-200">• ${osmRes.antidoteAdvice.dialysisCriteria}</div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            `;
        }
    } else {
        appState.nephroTox.correctedSodium = null;
        appState.nephroTox.osmolalGap = null;
        if (corrNaOut) corrNaOut.classList.add('hidden');
    }

    // C. Parasetamol (Rumack-Matthew) & NAC
    const apapHours = getNum('input-apap-hours');
    const apapLevel = getNum('input-apap-level');
    const apapHighRisk = getChk('chk-apap-high-risk');
    const apapOut = getEl('output-apap-rumack');

    if (apapHours && apapLevel) {
        const apapRes = evaluateRumackMatthew({
            hoursPostIngestion: apapHours,
            paracetamolLevelMcgMl: apapLevel,
            weightKg: appState.biometry.weightKg || 70,
            isHighRisk: apapHighRisk
        });
        appState.nephroTox.paracetamol = apapRes;
        if (apapRes && apapOut) {
            apapOut.classList.remove('hidden');
            const alertBg = apapRes.isToxic ? 'bg-rose-950/40 border-rose-600/50 text-rose-200' : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200';
            apapOut.className = `p-2.5 rounded-lg border font-mono space-y-1.5 text-[10px] ${alertBg}`;
            let nacHtml = '';
            if (apapRes.nacProtocol) {
                const nac = apapRes.nacProtocol;
                nacHtml = `
                    <div class="pt-1.5 border-t border-rose-700/60 font-semibold text-rose-300 space-y-1">
                        <div class="flex justify-between items-center">
                            <span>IV NAC 21 Saatlik Protokol:</span>
                            ${nac.isPediatricAdjusted ? '<span class="px-1.5 py-0.5 rounded bg-amber-900/60 border border-amber-600 text-amber-300 text-[8px]">👶 Pediatrik Sıvı Korumalı</span>' : ''}
                        </div>
                        <div class="text-[9px] font-normal leading-relaxed">
                            <div>• ${nac.loadingDose}</div>
                            <div>• ${nac.secondDose}</div>
                            <div>• ${nac.thirdDose}</div>
                            <div class="text-amber-300 mt-1">• ${nac.oralAlternative}</div>
                        </div>
                    </div>
                `;
            }
            apapOut.innerHTML = `
                <div class="flex justify-between items-center font-bold">
                    <span>${apapRes.hoursPostIngestion}. Saat: ${apapRes.levelMcgMl} µg/mL (Eşik: ${apapRes.threshold ?? '--'} µg/mL)</span>
                    <span>${apapRes.isToxic ? '🚨 TOKSİK SEVİYE' : '✓ Tedavi Çizgisi Altında'}</span>
                </div>
                <div class="text-[10px] leading-relaxed">${apapRes.interpretation}</div>
                ${nacHtml}
            `;
        }
    } else {
        appState.nephroTox.paracetamol = null;
        if (apapOut) apapOut.classList.add('hidden');
    }

    // D. CURB-65 & CRB-65 (Yaş ve BUN otomatik eşitleme - manuel tıklamayı ezmeden)
    const chkCurb65El = getEl<HTMLInputElement>('chk-curb-65');
    if (chkCurb65El && appState.biometry.ageYears !== null && appState.biometry.ageYears !== undefined &&
        (typeof document === 'undefined' || document.activeElement !== chkCurb65El)) {
        chkCurb65El.checked = appState.biometry.ageYears >= 65;
    }
    const chkCurbUEl = getEl<HTMLInputElement>('chk-curb-u');
    if (chkCurbUEl && feureaSBun !== null &&
        (typeof document === 'undefined' || document.activeElement !== chkCurbUEl)) {
        chkCurbUEl.checked = (feureaUnit === 'bun' && feureaSBun > 19) || (feureaUnit === 'urea' && feureaSBun > 42);
    }

    const curbC = getChk('chk-curb-c');
    const curbU = getChk('chk-curb-u');
    const curbR = getChk('chk-curb-r');
    const curbB = getChk('chk-curb-b');
    const curb65 = getChk('chk-curb-65');
    const curbOut = getEl('output-curb65');
    const hasClinicalCurbFindings = curbC || curbU || curbR || curbB;

    if (hasClinicalCurbFindings || curb65) {
        const curbRes = calculateCURB65({
            confusion: curbC,
            bunOver19: curbU,
            respiratoryRateGte30: curbR,
            hypotension: curbB,
            ageGte65: curb65
        });
        // Yalnızca yaş >= 65 olduğu için pnömoni bulgusu olmayan her hastanın SOAP epikrizine antibiyotik eklenmesini önle
        appState.nephroTox.curb65 = hasClinicalCurbFindings ? curbRes : null;
        if (curbOut) {
            renderClinicalCardResult(curbOut, {
                title: `CURB-65: ${curbRes.score}/5 | CRB-65: ${curbRes.crbScore}/4`,
                riskText: `${curbRes.mortalityGroup} (Mortalite: %${curbRes.mortalityPercent})`,
                subtitle: `<span class="text-sky-300">${curbRes.treatmentSetting}</span>`,
                extraHtml: `<div class="text-[9px] text-amber-200 font-sans leading-relaxed">💊 ${curbRes.empiricAntibiotic}</div>`,
                alertClass: curbRes.score >= 3 ? 'danger' : (curbRes.score === 2 ? 'warning' : 'success')
            });
        }
    } else {
        appState.nephroTox.curb65 = null;
        if (curbOut) curbOut.classList.add('hidden');
    }

    // ------------------------------------------------------------------------
    // NEONATOLOJİ & PEDİATRİK ACİL MOTORLARI
    // ------------------------------------------------------------------------
    // B. APGAR Skoru
    const aMin = getNum('select-apgar-minute') || 1;
    const aHr = getNum('select-apgar-hr') ?? 2;
    const aResp = getNum('select-apgar-resp') ?? 2;
    const aTone = getNum('select-apgar-tone') ?? 2;
    const aReflex = getNum('select-apgar-reflex') ?? 2;
    const aColor = getNum('select-apgar-color') ?? 2;
    const apgarOut = getEl('output-apgar-result');
    const isApgarModified = aMin !== 1 || aHr !== 2 || aResp !== 2 || aTone !== 2 || aReflex !== 2 || aColor !== 2;

    const apgarRes = calculateAPGAR({
        minute: aMin,
        heartRate: aHr,
        respiratoryEffort: aResp,
        muscleTone: aTone,
        reflexIrritability: aReflex,
        color: aColor
    });
    // Erişkin/çocuk hastalarda varsayılan APGAR 10/10 değerinin otomatik olarak SOAP epikrizine yazılmasını önle
    appState.neonatology.apgar = (isNeonate || isApgarModified) ? apgarRes : null;
    if (apgarOut) {
        renderClinicalCardResult(apgarOut, {
            title: `APGAR (${apgarRes.minute}. Dakika): ${apgarRes.score}/10`,
            riskText: apgarRes.status,
            subtitle: `<span class="font-normal text-slate-200">${apgarRes.interpretation}</span>`,
            recommendations: apgarRes.recommendations,
            alertClass: apgarRes.alertClass
        });
    }

    // C. Westley Krup
    const crStridor = getNum('select-croup-stridor') || 0;
    const crRetr = getNum('select-croup-retractions') || 0;
    const crAir = getNum('select-croup-air') || 0;
    const crCyan = getNum('select-croup-cyanosis') || 0;
    const crConsc = getNum('select-croup-consciousness') || 0;
    const croupOut = getEl('output-croup-result');

    if (crStridor > 0 || crRetr > 0 || crAir > 0 || crCyan > 0 || crConsc > 0) {
        const croupRes = calculateWestleyCroup({
            stridor: crStridor,
            retractions: crRetr,
            airEntry: crAir,
            cyanosis: crCyan,
            consciousness: crConsc
        });
        appState.neonatology.westleyCroup = croupRes;
        if (croupOut) {
            renderClinicalCardResult(croupOut, {
                title: `Westley Krup Skoru: ${croupRes.score}/17`,
                riskText: croupRes.severity,
                subtitle: `<span class="font-normal leading-relaxed text-slate-200">${croupRes.interpretation}</span>`,
                recommendations: croupRes.recommendations,
                alertClass: croupRes.alertClass
            });
        }
    } else {
        appState.neonatology.westleyCroup = null;
        if (croupOut) croupOut.classList.add('hidden');
    }

    // D. CDS Dehidratasyon & ORS
    const cdsApp = getNum('select-cds-appearance') || 0;
    const cdsEyes = getNum('select-cds-eyes') || 0;
    const cdsMuc = getNum('select-cds-mucosa') || 0;
    const cdsTears = getNum('select-cds-tears') || 0;
    const cdsOut = getEl('output-cds-result');

    if (cdsApp > 0 || cdsEyes > 0 || cdsMuc > 0 || cdsTears > 0) {
        const cdsRes = calculateCDSDehydration({
            generalAppearance: cdsApp,
            eyes: cdsEyes,
            mucousMembranes: cdsMuc,
            tears: cdsTears,
            weightKg: appState.biometry.weightKg || undefined
        });
        appState.neonatology.cdsDehydration = cdsRes;
        if (cdsOut) {
            renderClinicalCardResult(cdsOut, {
                title: `CDS Skoru: ${cdsRes.score}/8`,
                riskText: cdsRes.severity,
                subtitle: `<span class="font-normal text-slate-200">${cdsRes.interpretation}</span>`,
                recommendations: cdsRes.recommendations,
                alertClass: cdsRes.alertClass
            });
        }
    } else {
        appState.neonatology.cdsDehydration = null;
        if (cdsOut) cdsOut.classList.add('hidden');
    }

    // ------------------------------------------------------------------------
    // AKILCI REÇETE & İLAÇ GÜVENLİĞİ MOTORU
    // ------------------------------------------------------------------------
    const selectedDrugs = (appState.treatment && appState.treatment.selectedDrugs) ? appState.treatment.selectedDrugs : [];
    appState.safetyPrescription.selectedSafetyDrugs = selectedDrugs;
    const safetyEgfr = getNum('input-safety-egfr') ?? appState.biometry.egfr;
    const safetyTrim = getNum('select-safety-trimester') || (appState.obgyn.eddData?.trimester || 0);

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
                outWhammy.className = `p-2.5 rounded-lg border font-mono space-y-1 text-[10px] ${whammyRes.alertClass === 'danger' ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                outWhammy.innerHTML = `
                    <div class="font-bold text-xs">${whammyRes.title}</div>
                    <div class="text-[10px] leading-relaxed">${whammyRes.mechanism || ''}</div>
                    <div class="text-[10px]">${(whammyRes.recommendations || []).join(' ')}</div>
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
                outSerotonin.className = `p-2.5 rounded-lg border font-mono space-y-1 text-[10px] ${seroRes.alertClass === 'danger' ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                outSerotonin.innerHTML = `
                    <div class="font-bold text-xs">${seroRes.title}</div>
                    <div class="text-[10px] leading-relaxed">${seroRes.mechanism || ''}</div>
                    <div class="text-[9px] text-slate-300 italic">${seroRes.hunterCriteriaInfo || ''}</div>
                    <div class="text-[10px]">• <strong>Öneriler:</strong> ${(seroRes.recommendations || []).join(' ')}</div>
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
                outHyperkalemia.className = `p-2.5 rounded-lg border font-mono space-y-1 text-[10px] ${hyperKRes.alertClass === 'danger' ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                outHyperkalemia.innerHTML = `
                    <div class="font-bold text-xs">${hyperKRes.title}</div>
                    <div class="text-[10px] leading-relaxed">${hyperKRes.mechanism || ''}</div>
                    ${hyperKRes.riskFactorsIdentified.length > 0 ? `<div class="text-[9px] text-amber-300 font-semibold">• Tespit Edilen Riskler: ${hyperKRes.riskFactorsIdentified.join(' | ')}</div>` : ''}
                    <div class="text-[10px]">• <strong>Klinik Eylem:</strong> ${(hyperKRes.recommendations || []).join(' ')}</div>
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
                outCypStatin.className = `p-2.5 rounded-lg border font-mono space-y-1 text-[10px] ${cypStatinRes.alertClass === 'danger' ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                outCypStatin.innerHTML = `
                    <div class="font-bold text-xs">${cypStatinRes.title}</div>
                    <div class="text-[10px] leading-relaxed">${cypStatinRes.mechanism || ''}</div>
                    <div class="text-[10px] text-emerald-300">• <strong>Güvenli Alternatif:</strong> ${[...cypStatinRes.safeAlternatives.antibiotics, ...cypStatinRes.safeAlternatives.statins].join(' | ')}</div>
                    <div class="text-[10px]">• <strong>Öneriler:</strong> ${(cypStatinRes.recommendations || []).join(' ')}</div>
                `;
            }
        } else if (outCypStatin) {
            outCypStatin.classList.add('hidden');
        }

        // 5. Renal Doz Kesintileri (eGFR)
        if (safetyEgfr) {
            const renalRes = checkRenalDoseAdjustments({ egfr: safetyEgfr, drugs: selectedDrugs });
            appState.safetyPrescription.renalAdjustments = renalRes;
            if (renalRes && (renalRes.alertsCount ?? 0) > 0) {
                if (outRenal) {
                    outRenal.classList.remove('hidden');
                    outRenal.className = `p-2.5 rounded-lg border font-mono space-y-1 text-[10px] ${renalRes.hasContraindication ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                    outRenal.innerHTML = `
                        <div class="font-bold text-xs">⚠️ Renal Dozaj Uyarısı (eGFR: ${escapeHtml(renalRes.egfr)} mL/dk)</div>
                        ${(renalRes.warnings || []).map((w: any) => `<div class="text-[10px] leading-relaxed">• <strong>${escapeHtml(w.drug)}</strong>: ${escapeHtml(w.message)}</div>`).join('')}
                    `;
                }
            } else if (outRenal) {
                outRenal.classList.add('hidden');
            }
        } else {
            appState.safetyPrescription.renalAdjustments = null;
            if (outRenal) outRenal.classList.add('hidden');
        }

        // 6. Gebelik & Fetal Risk
        if (safetyTrim > 0) {
            const pregRes = checkPregnancySafety(selectedDrugs, { trimester: safetyTrim });
            appState.safetyPrescription.pregnancySafety = pregRes;
            if (pregRes.alertsCount > 0) {
                if (outPreg) {
                    outPreg.classList.remove('hidden');
                    outPreg.className = `p-2.5 rounded-lg border font-mono space-y-1 text-[10px] ${pregRes.hasSevereFetalRisk ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                    outPreg.innerHTML = `
                        <div class="font-bold text-xs">🤰 Gebelik ve Fetotoksisite Uyarısı (${escapeHtml(safetyTrim)}. Trimester)</div>
                        ${pregRes.alerts.map((a: any) => `<div class="text-[10px] leading-relaxed">• <strong>${escapeHtml(a.drugName)} (Kategori ${escapeHtml(a.category)})</strong>: ${escapeHtml(a.warning)}</div>`).join('')}
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
                    outNeoDrug.className = `p-2.5 rounded-lg border font-mono space-y-1 text-[10px] ${neoDrugRes.hasContraindication ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                    outNeoDrug.innerHTML = `
                        <div class="font-bold text-xs">🍼 Yenidoğan İlaç Güvenlik Kalkanı</div>
                        ${neoDrugRes.alerts.map((a: any) => `<div class="text-[10px] leading-relaxed">• <strong>${escapeHtml(a.drugName)}</strong>: ${escapeHtml(a.warning)}</div>`).join('')}
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
            const hasDanger = Boolean(
                (appState.safetyPrescription.tripleWhammy?.isTripleWhammy) ||
                (appState.safetyPrescription.serotoninSyndrome?.severity === 'CRITICAL') ||
                (appState.safetyPrescription.hyperkalemiaRisk?.severity === 'CRITICAL') ||
                (appState.safetyPrescription.cypStatinInteraction?.severity === 'CRITICAL') ||
                (appState.safetyPrescription.renalAdjustments?.hasContraindication) ||
                (appState.safetyPrescription.pregnancySafety?.hasSevereFetalRisk) ||
                (appState.safetyPrescription.neonatalDrugSafety?.hasContraindication)
            );
            const totalWarns = 
                (appState.safetyPrescription.renalAdjustments?.alertsCount || 0) +
                (appState.safetyPrescription.pregnancySafety?.alertsCount || 0) +
                (appState.safetyPrescription.neonatalDrugSafety?.alertsCount || 0) +
                (appState.safetyPrescription.tripleWhammy?.isTripleWhammy ? 1 : (appState.safetyPrescription.tripleWhammy?.isDoubleRisk ? 1 : 0)) +
                (appState.safetyPrescription.serotoninSyndrome?.isHighRisk ? 1 : 0) +
                (appState.safetyPrescription.hyperkalemiaRisk?.isAtRisk ? 1 : 0) +
                (appState.safetyPrescription.cypStatinInteraction?.hasInteraction ? 1 : 0);
            if (hasDanger) {
                badgeSafety.textContent = '🚨 Kritik Uyarı';
                badgeSafety.className = 'text-[9px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold';
            } else if (totalWarns > 0) {
                badgeSafety.textContent = `⚠️ ${totalWarns} Uyarı`;
                badgeSafety.className = 'text-[9px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-semibold';
            } else {
                badgeSafety.textContent = '✓ Güvenli';
                badgeSafety.className = 'text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-semibold';
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
            badgeSafety.className = 'text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700';
        }
    }

    // Sticky Patient Context Banner & Live Alerts Inspector Sync
    updatePatientBanner();
    updateClinicalAlertsInspector();

    // Live SOAP Update
    updateLiveSOAP();
}

// ----------------------------------------------------------------------------
// Event Listeners for Input & Change
// ----------------------------------------------------------------------------
const NON_CLINICAL_INPUT_IDS = new Set(['input-drug-search', 'input-custom-pack-name', 'input-custom-pack-icon']);

if (typeof document !== 'undefined') {
    document.addEventListener('input', (e: Event) => {
        const targetId = (e.target as HTMLElement | null)?.id;
        if (targetId && NON_CLINICAL_INPUT_IDS.has(targetId)) return;
        updateAllTabs();
    });
    document.addEventListener('change', (e: Event) => {
        const targetId = (e.target as HTMLElement | null)?.id;
        if (targetId && NON_CLINICAL_INPUT_IDS.has(targetId)) return;
        updateAllTabs();
    });
}

// Initial Call
updateAllTabs();

// ----------------------------------------------------------------------------
// TİTCK İLAÇ ARAMA VE REÇETE LİSTESİ DENETLEYİCİSİ
// ----------------------------------------------------------------------------
const clearBtn = getEl('btn-clear-search');
const drugInput = getEl<HTMLInputElement>('input-drug-search');
const drugResult = getEl('container-search-results');

let currentDrugSearchMode: DrugSearchMode = 'all';
let currentDrugSearchSeq = 0;
let drugSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const modeButtons = document.querySelectorAll<HTMLButtonElement>('.drug-search-mode-btn');

function updateSearchModeUI(newMode: DrugSearchMode): void {
    currentDrugSearchMode = newMode;
    modeButtons.forEach(btn => {
        const mode = btn.dataset.mode as DrugSearchMode;
        if (mode === currentDrugSearchMode) {
            btn.className = 'drug-search-mode-btn flex-1 py-1 px-1.5 rounded-md border text-center transition-all bg-rose-950/90 text-rose-200 border-rose-500 font-semibold shadow-sm text-[11px]';
        } else {
            btn.className = 'drug-search-mode-btn flex-1 py-1 px-1.5 rounded-md border text-center transition-all bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600 font-normal text-[11px]';
        }
    });

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

modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as DrugSearchMode;
        if (mode) {
            updateSearchModeUI(mode);
        }
    });
});

let executeDrugSearch: (q: string) => Promise<void> = async () => {};

if (drugInput) {
    executeDrugSearch = async (q: string) => {
        if (!drugResult) return;
        if (q.length < 2) {
            drugResult.innerHTML = '';
            drugResult.classList.add('hidden');
            return;
        }

        const thisSeq = ++currentDrugSearchSeq;

        if (!isDrugCatalogReady()) {
            drugResult.classList.remove('hidden');
            drugResult.innerHTML = '<div class="p-3 text-xs text-sky-400 bg-slate-900 text-center rounded flex items-center justify-center gap-2"><span class="inline-block animate-pulse">⏳</span> <span>TİTCK İlaç Kataloğu hazırlanıyor, aranıyor...</span></div>';
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
                                        ${r.atcCode ? `<span class="text-slate-500 font-mono text-[10px]"> | ATC: ${safeAtc}</span>` : ''}
                                        ${r.barcode ? `<span class="text-slate-500 font-mono text-[10px]"> | Barkod: ${safeBarcode}</span>` : ''}
                                        ${r.esdegerGroup ? `<span class="text-cyan-400 font-mono text-[10px]"> | Eşdeğer: ${safeEg}</span>` : ''}
                                        ${r.sgkDiscount ? `<span class="text-emerald-400 font-mono text-[10px]"> | Kamu İskonto: ${safeDiscount}</span>` : ''}
                                        ${r.sgkKamuNo ? `<span class="text-slate-400 font-mono text-[10px]"> | Kamu No: ${safeKamuNo}</span>` : ''}
                                    </div>
                                    ${r.company ? `<div class="text-[9px] text-slate-400 truncate mt-0.5">🏢 ${safeCompany}</div>` : ''}
                                </div>
                                <div class="flex items-center gap-1 flex-shrink-0">
                                    <button type="button" class="btn-open-monograph ${hasMonograph ? 'bg-emerald-950/80 border-emerald-700/70 text-emerald-300 hover:bg-emerald-900 hover:border-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500'} border text-[10px] px-2 py-1 rounded font-semibold transition-all" ${dataAttrs} title="Çevrimdışı Klinik Monograf / Doz & Güvenlik Özeti">${hasMonograph ? '📖 Monograf' : '📖 Özet'}</button>
                                    <button type="button" class="btn-muadil bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-500 text-[10px] px-2 py-1 rounded text-cyan-300 transition-all opacity-90 hover:opacity-100" data-id="${escapeHtml(r.id || '')}" data-brand="${safeBrand}" data-generic="${safeGeneric}" data-atc="${safeAtc}" data-barcode="${safeBarcode}" data-company="${safeCompany}" data-rx="${escapeHtml(r.prescriptionType || '')}" data-esdeger="${safeEg}" data-discount="${safeDiscount}" data-kamuno="${safeKamuNo}" data-pregnancy="${safePregnancy}" data-coldchain="${safeColdChain}" data-sgk="${safeSgk}" data-kt="${safeKtUrl}" data-kub="${safeKubUrl}" title="Eşdeğer / Muadil İlaçları ve Kamu İskontolarını Karşılaştır">🔄 Muadil</button>
                                </div>
                            </div>
                            <div class="flex items-center flex-wrap gap-2 pt-1 border-t border-slate-800">
                                ${ktUrl ? `
                                    <a href="${safeKtUrl}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-1 bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-700/60 hover:border-amber-500 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors" ${dataAttrs} title="Resmi TİTCK Kullanma Talimatı (Prospektüs)">
                                        <span>📄 Prospektüs (KT)</span>
                                    </a>
                                ` : ''}
                                ${kubUrl ? `
                                    <a href="${safeKubUrl}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-1 bg-sky-950/70 hover:bg-sky-900 text-sky-300 border border-sky-700/60 hover:border-sky-500 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors" ${dataAttrs} title="Resmi TİTCK Kısa Ürün Bilgisi (KÜB)">
                                        <span>📋 KÜB</span>
                                    </a>
                                ` : ''}
                                ${(!ktUrl && !kubUrl) ? `
                                    <a href="https://www.google.com/search?q=${encodeURIComponent(r.brand + ' prospektüs kub titck pdf')}" target="_blank" rel="noopener noreferrer" class="btn-ext-drug-bridge inline-flex items-center gap-1 bg-slate-800/90 hover:bg-amber-950/60 text-amber-300 border border-slate-700 hover:border-amber-600/70 px-2 py-0.5 rounded text-[10px] font-medium transition-colors" ${dataAttrs} title="Google / Web üzerinde prospektüs & KÜB PDF ara (Çevrimdışında yerel özet açılır)">
                                        <span>🔍 Prospektüs Ara</span>
                                    </a>
                                    <a href="https://titck.gov.tr/ilac/kub-kt" target="_blank" rel="noopener noreferrer" class="btn-ext-drug-bridge inline-flex items-center gap-1 bg-slate-800/90 hover:bg-sky-950/60 text-sky-300 border border-slate-700 hover:border-sky-600/70 px-2 py-0.5 rounded text-[10px] font-medium transition-colors" ${dataAttrs} title="TİTCK Resmi KÜB/KT Portalı (Çevrimdışında yerel özet açılır)">
                                        <span>🏛️ TİTCK Sorgula</span>
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
    };

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

        // Programatik (örn. Muadil butonu) tetiklemelerde anında, klavye yazımında 150ms debounce ile çalıştır
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
        // PDF / Harici Köprü / Monograf butonlarına tıklanınca ilaç seçimini tetiklemesin
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
                updateAllTabs();
            }
        }
    });
}

// Global window function for inline onclick removal
if (typeof window !== 'undefined') {
    window.removeDrug = function(index: number): void {
        if (appState.treatment && appState.treatment.selectedDrugs) {
            appState.treatment.selectedDrugs.splice(index, 1);
            renderSelectedDrugs();
            updateAllTabs();
        }
    };
}

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
                    <button type="button" class="btn-open-monograph inline-flex items-center gap-0.5 text-[9px] ${hasMonograph ? 'text-emerald-400 hover:text-emerald-300 font-semibold' : 'text-slate-300 hover:text-white'} hover:underline" ${dataAttrs}>📖 ${hasMonograph ? 'Monograf' : 'Klinik Özet'}</button>
                    ${(validKt || validKub) ? `
                        ${validKt ? `<a href="${validKt}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-0.5 text-[9px] text-amber-400 hover:text-amber-300 hover:underline" ${dataAttrs}>📄 Prospektüs</a>` : ''}
                        ${validKub ? `<a href="${validKub}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-0.5 text-[9px] text-sky-400 hover:text-sky-300 hover:underline" ${dataAttrs}>📋 KÜB</a>` : ''}
                    ` : `
                        <a href="https://www.google.com/search?q=${encodeURIComponent((d.brand || '') + ' prospektüs kub titck pdf')}" target="_blank" rel="noopener noreferrer" class="btn-ext-drug-bridge inline-flex items-center gap-0.5 text-[9px] text-amber-400/80 hover:text-amber-300 hover:underline" ${dataAttrs} title="Google / Web üzerinde prospektüs ara">🔍 Prospektüs Ara</a>
                        <a href="https://titck.gov.tr/ilac/kub-kt" target="_blank" rel="noopener noreferrer" class="btn-ext-drug-bridge inline-flex items-center gap-0.5 text-[9px] text-sky-400/80 hover:text-sky-300 hover:underline" ${dataAttrs} title="TİTCK Resmi KÜB/KT Portalı">🏛️ TİTCK</a>
                    `}
                </div>
            </div>
            <button class="text-slate-500 hover:text-rose-500 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors" onclick="window.removeDrug(${index})" title="İlacı Kaldır">✕</button>
        </div>
        `;
    }).join('');
}

// ----------------------------------------------------------------------------
// RESPONSIVE WORKSTATION & PATIENT CONTEXT CONTROLLERS
// ----------------------------------------------------------------------------

export function updatePatientBanner(): void {
    const bannerAge = getEl('banner-age');
    const bannerGender = getEl('banner-gender');
    const bannerBiometry = getEl('banner-biometry');
    const bannerBSA = getEl('banner-bsa');
    const bannerEGFR = getEl('banner-egfr');

    const headerPatientInfo = getEl('header-patient-info');
    const headerPatientAge = getEl('header-patient-age');
    const headerPatientGender = getEl('header-patient-gender');
    const badgeAgeGroup = getEl('badge-age-group');

    // 1. Yaş Metni
    let ageDisplay = '--';
    let shortAgeDisplay = '--';
    const y = appState.biometry.ageYears;
    const m = appState.biometry.ageMonths;
    const d = appState.biometry.ageDays;

    if (d !== null && d !== undefined && d <= 28) {
        shortAgeDisplay = `${d} Günlük`;
        ageDisplay = appState.biometry.ageFormatted && appState.biometry.ageFormatted !== '--' 
            ? appState.biometry.ageFormatted 
            : `${d} Günlük Yenidoğan`;
    } else if (m !== null && m !== undefined && (y === null || y < 1)) {
        shortAgeDisplay = `${Math.floor(m)} Aylık`;
        ageDisplay = `${Math.floor(m)} Aylık`;
    } else if (y !== null && y !== undefined) {
        shortAgeDisplay = `${Math.floor(y)} Yaş`;
        ageDisplay = `${Math.floor(y)} Yaş`;
    } else if (appState.biometry.ageFormatted && appState.biometry.ageFormatted !== '--') {
        ageDisplay = appState.biometry.ageFormatted;
        shortAgeDisplay = appState.biometry.ageFormatted;
    }

    if (bannerAge) {
        bannerAge.textContent = ageDisplay;
    }

    // 2. Cinsiyet Metni
    let genderDisplay = '--';
    if (appState.biometry.gender === 'male' || appState.biometry.gender === 'M') {
        genderDisplay = 'Erkek';
    } else if (appState.biometry.gender === 'female' || appState.biometry.gender === 'F') {
        genderDisplay = (y !== null && y !== undefined && y >= 18) ? 'Kadın' : 'Kız';
    }

    if (bannerGender) {
        bannerGender.textContent = genderDisplay;
    }

    // 3. Üst Bar (Header) Hasta Yaş & Cinsiyet Rozeti
    const hasAge = (shortAgeDisplay !== '--');
    const hasGender = (genderDisplay !== '--');

    if (headerPatientInfo) {
        if (hasAge || hasGender) {
            headerPatientInfo.classList.remove('hidden');
            headerPatientInfo.classList.add('flex');

            if (headerPatientAge) {
                headerPatientAge.textContent = hasAge ? shortAgeDisplay : 'Yaş: --';
            }
            if (headerPatientGender) {
                headerPatientGender.textContent = hasGender ? genderDisplay : 'Cins: Belirtilmedi';
            }
        } else {
            headerPatientInfo.classList.add('hidden');
            headerPatientInfo.classList.remove('flex');
        }
    }

    // 4. Kategori / Yaş Grubu Rozeti
    if (badgeAgeGroup) {
        if (appState.biometry.ageGroupTag) {
            badgeAgeGroup.textContent = appState.biometry.ageGroupTag;
            badgeAgeGroup.classList.remove('hidden');
        } else {
            badgeAgeGroup.classList.add('hidden');
        }
    }

    // 5. Biyometri, BSA, eGFR
    if (bannerBiometry) {
        const w = appState.biometry.weightKg;
        const h = appState.biometry.heightCm;
        if (w && h) {
            bannerBiometry.textContent = `${w}kg / ${h}cm`;
        } else if (w) {
            bannerBiometry.textContent = `${w} kg`;
        } else if (h) {
            bannerBiometry.textContent = `${h} cm`;
        } else {
            bannerBiometry.textContent = '--';
        }
    }

    if (bannerBSA) {
        bannerBSA.textContent = appState.biometry.bsa ? `${appState.biometry.bsa.toFixed(2)} m²` : '--';
    }

    if (bannerEGFR) {
        const egfr = appState.biometry.egfr;
        if (egfr !== null && egfr !== undefined) {
            bannerEGFR.textContent = `${egfr} mL/dk`;
            if (egfr >= 90) bannerEGFR.className = 'font-bold text-emerald-400';
            else if (egfr >= 60) bannerEGFR.className = 'font-bold text-cyan-400';
            else if (egfr >= 30) bannerEGFR.className = 'font-bold text-amber-400';
            else bannerEGFR.className = 'font-bold text-rose-400';
        } else {
            bannerEGFR.textContent = '--';
            bannerEGFR.className = 'font-bold text-slate-400';
        }
    }
}

export function updateClinicalAlertsInspector(): void {
    let alertCount = 0;

    // 1. eGFR Renal Risk Alert
    const alertEgfr = getEl('alert-item-egfr');
    const textEgfr = getEl('alert-text-egfr');
    const egfr = appState.biometry.egfr;
    if (alertEgfr && textEgfr) {
        if (egfr !== null && egfr !== undefined && egfr < 60) {
            alertEgfr.classList.remove('hidden');
            const stage = egfr < 15 ? '5 (Böbrek Yetmezliği / Diyaliz)' : (egfr < 30 ? '4 (Ciddi eGFR Kaybı)' : '3 (Orta Derece Azalma)');
            textEgfr.textContent = `eGFR: ${egfr} mL/dk - Evre ${stage}. Dozaj kısıtlamalarını kontrol edin.`;
            alertCount++;
        } else {
            alertEgfr.classList.add('hidden');
        }
    }

    // 2. Triple Whammy AKI Alert
    const alertTw = getEl('alert-item-tw');
    const textTw = getEl('alert-text-tw');
    const tw = appState.safetyPrescription?.tripleWhammy;
    if (alertTw && textTw) {
        if (tw?.isTripleWhammy) {
            alertTw.classList.remove('hidden');
            textTw.textContent = `ACEi/ARB + Diüretik + NSAİİ üçlüsü saptandı! Akut böbrek hasarı (AKI) riski çok yüksek.`;
            alertCount++;
        } else if (tw?.isDoubleRisk) {
            alertTw.classList.remove('hidden');
            textTw.textContent = `İkili riskli kombinasyon: ${tw.mechanism || 'Renal perfüzyon bozulabilir'}`;
            alertCount++;
        } else {
            alertTw.classList.add('hidden');
        }
    }

    // 2b. Serotonin Sendromu Alert
    const alertSero = getEl('alert-item-serotonin');
    const textSero = getEl('alert-text-serotonin');
    const sero = appState.safetyPrescription?.serotoninSyndrome;
    if (alertSero && textSero) {
        if (sero && sero.isHighRisk) {
            alertSero.classList.remove('hidden');
            textSero.textContent = `${sero.title} - ${sero.mechanism || 'Serotonin toksisitesi riski'}`;
            alertCount++;
        } else {
            alertSero.classList.add('hidden');
        }
    }

    // 2c. Ölümcül Hiperkalemi Alert
    const alertHyperK = getEl('alert-item-hyperkalemia');
    const textHyperK = getEl('alert-text-hyperkalemia');
    const hyperK = appState.safetyPrescription?.hyperkalemiaRisk;
    if (alertHyperK && textHyperK) {
        if (hyperK && hyperK.isAtRisk) {
            alertHyperK.classList.remove('hidden');
            textHyperK.textContent = `${hyperK.title} - ${hyperK.mechanism || 'Renal K+ atılımı bozulabilir'}`;
            alertCount++;
        } else {
            alertHyperK.classList.add('hidden');
        }
    }

    // 2d. CYP3A4 Güçlü İnhibisyonu & Statin Rabdomiyoliz Alert
    const alertCypStatin = getEl('alert-item-cyp-statin');
    const textCypStatin = getEl('alert-text-cyp-statin');
    const cypStatin = appState.safetyPrescription?.cypStatinInteraction;
    if (alertCypStatin && textCypStatin) {
        if (cypStatin && cypStatin.hasInteraction) {
            alertCypStatin.classList.remove('hidden');
            textCypStatin.textContent = `${cypStatin.title} - ${cypStatin.mechanism || 'Rabdomiyoliz riski'}`;
            alertCount++;
        } else {
            alertCypStatin.classList.add('hidden');
        }
    }

    // 3. QTc Prolongation Alert
    const alertQtc = getEl('alert-item-qtc');
    const textQtc = getEl('alert-text-qtc');
    const cardiac = appState.other?.cardiac;
    if (alertQtc && textQtc) {
        if (cardiac && (cardiac.colorCode === 'danger' || cardiac.interpretation?.toLowerCase().includes('uzamış') || cardiac.status === 'BLOCKED')) {
            alertQtc.classList.remove('hidden');
            textQtc.textContent = `${cardiac.interpretation || 'Uzamış QTc aralığı'} (QTcB: ${cardiac.qtcBazett || '--'} ms) - Torsades de Pointes riski!`;
            alertCount++;
        } else {
            alertQtc.classList.add('hidden');
        }
    }

    // 4. Neonatal Jaundice / Hyperbilirubinemia Alert
    const alertJaundice = getEl('alert-item-jaundice');
    const textJaundice = getEl('alert-text-jaundice');
    const bhutani = appState.neonatology?.bhutani;
    if (alertJaundice && textJaundice) {
        if (bhutani && (bhutani.alertClass === 'danger' || bhutani.alertClass === 'warning')) {
            alertJaundice.classList.remove('hidden');
            textJaundice.textContent = `TSB: ${bhutani.totalBilirubin} mg/dL (${bhutani.riskGroupLabel || ''}) - ${bhutani.interpretation}`;
            alertCount++;
        } else {
            alertJaundice.classList.add('hidden');
        }
    }

    // 5. Thrombosis / Embolism Alert
    const alertThrombosis = getEl('alert-item-thrombosis');
    const textThrombosis = getEl('alert-text-thrombosis');
    const pte = appState.thrombosis?.wellsPTE;
    const dvt = appState.thrombosis?.wellsDVT;
    if (alertThrombosis && textThrombosis) {
        const isPteHigh = Boolean(pte && (pte.alertClass === 'danger' || pte.alertClass.includes('rose') || pte.isPELikely));
        const isDvtHigh = Boolean(dvt && (dvt.alertClass === 'danger' || dvt.alertClass.includes('rose') || dvt.score >= 3));
        if (isPteHigh || isDvtHigh) {
            alertThrombosis.classList.remove('hidden');
            textThrombosis.textContent = `${isPteHigh && pte ? `PTE: ${pte.riskCategory} (${pte.score}p)` : ''} ${isDvtHigh && dvt ? `DVT: ${dvt.riskCategory} (${dvt.score}p)` : ''}`.trim();
            alertCount++;
        } else {
            alertThrombosis.classList.add('hidden');
        }
    }

    // 6. Neonatal Toxic/Contraindicated Drug Alert
    const alertNeoDrug = getEl('alert-item-neonatal-drug');
    const textNeoDrug = getEl('alert-text-neonatal-drug');
    const neoDrug = appState.safetyPrescription?.neonatalDrugSafety;
    if (alertNeoDrug && textNeoDrug) {
        if (neoDrug && neoDrug.alertsCount > 0) {
            alertNeoDrug.classList.remove('hidden');
            textNeoDrug.textContent = neoDrug.alerts.map((a) => `${a.drugName}: ${a.title}`).join(' | ');
            alertCount++;
        } else {
            alertNeoDrug.classList.add('hidden');
        }
    }

    // 7. Neonatal Excessive Weight Loss Alert
    const alertNeoWeight = getEl('alert-item-neonatal-weight');
    const textNeoWeight = getEl('alert-text-neonatal-weight');
    const neoWeight = appState.neonatology?.weightLoss;
    if (alertNeoWeight && textNeoWeight) {
        if (neoWeight && (neoWeight.alertClass === 'danger' || neoWeight.alertClass === 'warning')) {
            alertNeoWeight.classList.remove('hidden');
            textNeoWeight.textContent = `${neoWeight.interpretation} (Doğum: ${neoWeight.birthWeightG}g, Mevcut: ${neoWeight.currentWeightG}g)`;
            alertCount++;
        } else {
            alertNeoWeight.classList.add('hidden');
        }
    }

    // 8. Nephrology, Toxicology & Respiratory Alert
    const alertNephrotox = getEl('alert-item-nephrotox');
    const textNephrotox = getEl('alert-text-nephrotox');
    const nt = appState.nephroTox;
    if (alertNephrotox && textNephrotox) {
        const alerts: string[] = [];
        if (nt?.paracetamol?.isToxic) alerts.push('Parasetamol Toksisitesi: Acil IV NAC Protokolü Başlatılmalı');
        if (nt?.osmolalGap?.isCriticalGap) alerts.push(`Kritik Osmolal Açık (${nt.osmolalGap.osmolalGap} mOsm/kg): Toksik Alkol Zehirlenmesi`);
        if (nt?.curb65 && nt.curb65.score >= 3) alerts.push(`Ağır Pnömoni (CURB-65: ${nt.curb65.score}/5): YBÜ/Yatış gereklidir`);
        if (alerts.length > 0) {
            alertNephrotox.classList.remove('hidden');
            textNephrotox.textContent = alerts.join(' | ');
            alertCount++;
        } else {
            alertNephrotox.classList.add('hidden');
        }
    }

    // Counter & Empty state update
    const badgeTotal = getEl('badge-total-alerts');
    const emptyState = getEl('alert-item-empty');
    const bannerRisk = getEl('banner-risk-badge');
    const bannerRiskText = getEl('banner-risk-text');

    if (badgeTotal) badgeTotal.textContent = `${alertCount} Uyarı`;
    if (emptyState) {
        if (alertCount > 0) emptyState.classList.add('hidden');
        else emptyState.classList.remove('hidden');
    }

    if (bannerRisk && bannerRiskText) {
        if (alertCount > 0) {
            bannerRisk.classList.remove('hidden');
            bannerRisk.classList.add('flex');
            bannerRiskText.textContent = `${alertCount} Risk`;
        } else {
            bannerRisk.classList.add('hidden');
            bannerRisk.classList.remove('flex');
        }
    }
}

// SOAP COPY INLINE & MODAL DUAL SYNC
export function updateLiveSOAP(): void {
    const soapText = generateSOAP();
    const mainOutput = getEl<HTMLTextAreaElement>('text-soap-output');
    if (mainOutput) mainOutput.value = soapText;
    const modalOutput = getEl<HTMLTextAreaElement>('text-soap-modal');
    if (modalOutput) modalOutput.value = soapText;
}

const btnCopyDesktop = getEl('btn-copy-soap');
if (btnCopyDesktop) {
    btnCopyDesktop.addEventListener('click', () => {
        const text = getVal('text-soap-output');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                const fb = getEl('copy-feedback');
                if (fb) {
                    fb.classList.remove('hidden');
                    setTimeout(() => fb.classList.add('hidden'), 2000);
                }
            });
        }
    });
}

// ============================================================================
// 7. AKILLI MOTOR PAKETLERİ VE ÖZELLEŞTİRİLEBİLİR KISAYOLLAR
// ============================================================================
export function initWorkstationPackages(): void {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;

    const cardShortcuts = getEl('card-custom-shortcuts');
    if (!cardShortcuts) return;

    const btnShowAll = getEl('btn-show-all-motors');
    const btnToggleCustom = getEl('btn-toggle-custom-pack');
    const drawerCustom = getEl('drawer-custom-pack');
    const containerButtons = getEl('container-package-buttons');
    const containerInfo = getEl('container-package-info');
    const badgeActive = getEl('badge-active-pack');
    const packIcon = getEl('pack-info-icon');
    const packName = getEl('pack-info-name');
    const packBadge = getEl('pack-info-badge');
    const packDesc = getEl('pack-info-desc');
    const packPills = getEl('pack-info-pills');

    // Drawer inputs & controls
    const inputPackName = getEl<HTMLInputElement>('input-custom-pack-name');
    const btnSavePack = getEl('btn-save-custom-pack');
    const btnApplyNow = getEl('btn-apply-custom-pack-now');
    const btnClearSelection = getEl('btn-clear-selection');
    const containerChecklist = getEl('container-motor-checklist');
    const labelResolvedCount = getEl('label-resolved-count');
    const boxResolvedSummary = getEl('box-resolved-summary');
    const textResolvedList = getEl('text-resolved-list');
    const sectionSavedPacks = getEl('section-saved-packs');
    const containerSavedList = getEl('container-saved-packs-list');

    let currentActivePackId: string | null = null;

    // A. Kartları Paket Motorlarına Göre Aç / Kapat & Vurgula
    function activatePackage(packOrMotors: string[] | WorkstationPackage | any, optName?: string, optDesc?: string, optIcon?: string, packId?: string): void {
        let motors: string[] = [];
        let title = optName || '';
        let desc = optDesc || '';
        let icon = optIcon || '📦';
        let primaryId: string | null = null;

        if (Array.isArray(packOrMotors)) {
            motors = resolveMotorDependencies(packOrMotors);
            title = optName || `${motors.length} Motor Paketi`;
            desc = optDesc || `${motors.length} klinik motor hazır`;
            primaryId = packOrMotors[0];
            currentActivePackId = packId || null;
        } else if (packOrMotors && typeof packOrMotors === 'object') {
            motors = resolveMotorDependencies(packOrMotors.baseMotors || packOrMotors.fullMotors || []);
            title = packOrMotors.name || '';
            desc = packOrMotors.desc || '';
            icon = packOrMotors.icon || '📦';
            primaryId = (packOrMotors.baseMotors && packOrMotors.baseMotors[0]) || motors[0];
            currentActivePackId = packOrMotors.id || null;
        }

        if (!motors || motors.length === 0) return;

        // Workspace içindeki tüm doğrudan <details> kartlarını filtrele (iç içe alt details öğelerini gizleme)
        const allCards = document.querySelectorAll<HTMLDetailsElement>('#clinical-workspace > details');
        allCards.forEach(card => {
            if (motors.includes(card.id)) {
                card.classList.remove('hidden');
                card.open = true;
            } else {
                card.classList.add('hidden');
            }
        });

        // Birincil karta yumuşak geçiş ve nabız animasyonu
        const targetCard = (primaryId ? getEl<HTMLDetailsElement>(primaryId) : null) || getEl<HTMLDetailsElement>(motors[0]);
        if (targetCard) {
            if (typeof targetCard.scrollIntoView === 'function') {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            targetCard.classList.add('card-highlight');
            setTimeout(() => targetCard.classList.remove('card-highlight'), 1800);
        }

        // Paket Butonları Aktiflik Durumunu Güncelle
        if (containerButtons) {
            containerButtons.querySelectorAll('.btn-workstation-pack').forEach(btn => {
                const bId = btn.getAttribute('data-pack-id');
                if (bId && bId === currentActivePackId) {
                    btn.classList.add('bg-rose-600', 'text-white', 'border-rose-500', 'shadow-md', 'shadow-rose-950/50');
                    btn.classList.remove('bg-slate-800', 'text-slate-200');
                } else {
                    btn.classList.remove('bg-rose-600', 'text-white', 'border-rose-500', 'shadow-md', 'shadow-rose-950/50');
                    btn.classList.add('bg-slate-800', 'text-slate-200');
                }
            });
        }

        // Üst Bar Durum Rozetini Güncelle
        if (badgeActive) {
            const cleanTitle = title.replace(/^[^\w\sğüşöçıİĞÜŞÖÇ]+/, '').trim();
            badgeActive.textContent = `${cleanTitle} (${motors.length} Motor Aktif)`;
            badgeActive.className = 'text-[10px] px-2.5 py-0.5 rounded-full font-mono font-medium bg-rose-950/80 text-rose-300 border border-rose-800/60';
        }

        // Aktif Paket Bilgi Şeridini Doldur
        if (containerInfo) {
            containerInfo.classList.remove('hidden');
            if (packIcon) packIcon.textContent = icon;
            if (packName) packName.textContent = title;
            if (packBadge) packBadge.textContent = `${motors.length} Motor Bağlı`;
            if (packDesc) packDesc.textContent = desc;

            if (packPills) {
                packPills.innerHTML = '';
                motors.forEach(mId => {
                    const mDef = CLINICAL_MOTORS[mId];
                    if (!mDef) return;
                    const pill = document.createElement('button');
                    pill.type = 'button';
                    pill.className = 'btn-jump-motor px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 text-[10px] flex items-center gap-1 transition-colors';
                    pill.innerHTML = `<span>${mDef.icon}</span><span>${mDef.shortName}</span>`;
                    pill.title = `${mDef.name} motoruna git`;
                    pill.addEventListener('click', () => {
                        const targetEl = getEl<HTMLDetailsElement>(mId);
                        if (targetEl) {
                            targetEl.open = true;
                            if (typeof targetEl.scrollIntoView === 'function') {
                                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                            targetEl.classList.add('card-highlight');
                            setTimeout(() => targetEl.classList.remove('card-highlight'), 1800);
                        }
                    });
                    packPills.appendChild(pill);
                });
            }
        }
    }

    // B. Tüm Motorları Göster & Sıfırla
    function showAllMotors(): void {
        const allCards = document.querySelectorAll<HTMLDetailsElement>('#clinical-workspace > details');
        allCards.forEach(c => c.classList.remove('hidden'));

        currentActivePackId = null;

        if (containerButtons) {
            containerButtons.querySelectorAll('.btn-workstation-pack').forEach(btn => {
                btn.classList.remove('bg-rose-600', 'text-white', 'border-rose-500', 'shadow-md', 'shadow-rose-950/50');
                btn.classList.add('bg-slate-800', 'text-slate-200');
            });
        }

        if (badgeActive) {
            badgeActive.textContent = 'Tüm Motorlar Açık (21/21)';
            badgeActive.className = 'text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60';
        }

        if (containerInfo) {
            containerInfo.classList.add('hidden');
        }

        // Kategori haplarını da 'Tümü' aktif olacak şekilde senkronize et
        const pills = document.querySelectorAll('.cat-pill');
        pills.forEach(p => {
            if (p.getAttribute('data-cat') === 'all') {
                p.classList.add('active', 'bg-rose-600', 'text-white');
                p.classList.remove('bg-slate-800', 'text-slate-300');
            } else {
                p.classList.remove('active', 'bg-rose-600', 'text-white');
                p.classList.add('bg-slate-800', 'text-slate-300');
            }
        });
    }

    if (btnShowAll) {
        btnShowAll.addEventListener('click', showAllMotors);
    }

    // C. Paket Butonlarını Render Et
    function renderPackageButtons(): void {
        if (!containerButtons) return;
        containerButtons.innerHTML = '';

        const customPacks = getCustomPackages();
        const allPacks: WorkstationPackage[] = [...PRESET_PACKAGES, ...customPacks];

        allPacks.forEach(pack => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-workstation-pack px-2.5 sm:px-3 py-1.5 rounded-xl font-medium text-[11px] sm:text-xs flex items-center gap-1.5 transition-all bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 shadow-sm whitespace-nowrap';
            btn.setAttribute('data-pack-id', pack.id);
            btn.title = pack.desc || pack.badge || pack.name;

            btn.innerHTML = `
                <span>${escapeHtml(pack.icon || '📦')}</span>
                <span>${escapeHtml(pack.name)}</span>
                ${pack.isCustom ? '<span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-mono">Özel</span>' : ''}
            `;

            btn.addEventListener('click', () => {
                activatePackage(pack);
            });

            containerButtons.appendChild(btn);
        });
    }

    // D. Motor Seçim Listesini (Checklist) Doldur
    function renderMotorChecklist(): void {
        if (!containerChecklist) return;
        containerChecklist.innerHTML = '';

        Object.values(CLINICAL_MOTORS).forEach(m => {
            const label = document.createElement('label');
            label.className = 'flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 cursor-pointer text-xs select-none transition-colors';
            label.innerHTML = `
                <input type="checkbox" class="chk-custom-motor mt-0.5 rounded border-slate-700 text-rose-600 focus:ring-0 focus:ring-offset-0 bg-slate-800" value="${m.id}">
                <div class="min-w-0 flex-1">
                    <div class="font-medium text-slate-200 flex items-center gap-1.5">
                        <span>${m.icon}</span>
                        <span class="truncate">${m.shortName}</span>
                        <span id="dep-badge-${m.id}" class="hidden text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">🔗 Bağımlı</span>
                    </div>
                    <p class="text-[10px] text-slate-400 truncate">${m.name}</p>
                </div>
            `;
            containerChecklist.appendChild(label);
        });

        // Checkbox değişim dinleyicisi
        const checkBoxes = containerChecklist.querySelectorAll<HTMLInputElement>('.chk-custom-motor');
        checkBoxes.forEach(cb => {
            cb.addEventListener('change', updateChecklistDependencies);
        });
    }

    // E. Canlı Bağımlılık Hesaplayıcı & Checkbox Güncelleyici
    function updateChecklistDependencies(): void {
        if (!containerChecklist) return;
        const checkBoxes = containerChecklist.querySelectorAll<HTMLInputElement>('.chk-custom-motor');
        
        // Kullanıcının elle işaretlediği motorları topla (disabled olmayanlar)
        const explicitlyChecked: string[] = [];
        checkBoxes.forEach(cb => {
            if (cb.checked && !cb.disabled) {
                explicitlyChecked.push(cb.value);
            }
        });

        // Rekürsif bağımlılıkları çöz
        const fullResolved = resolveMotorDependencies(explicitlyChecked);

        // Her kutucuğu durumuna göre senkronize et
        checkBoxes.forEach(cb => {
            const depBadge = getEl(`dep-badge-${cb.value}`);
            const isExplicit = explicitlyChecked.includes(cb.value);
            const isResolved = fullResolved.includes(cb.value);

            if (isExplicit) {
                cb.checked = true;
                cb.disabled = false;
                if (depBadge) depBadge.classList.add('hidden');
            } else if (isResolved) {
                // Bu motor başka bir motorun bağımlılığı olduğu için otomatik işaretlendi
                cb.checked = true;
                cb.disabled = true;
                if (depBadge) depBadge.classList.remove('hidden');
            } else {
                cb.checked = false;
                cb.disabled = false;
                if (depBadge) depBadge.classList.add('hidden');
            }
        });

        // Sayı ve Açıklama Alanını Güncelle
        if (labelResolvedCount) {
            labelResolvedCount.textContent = `${fullResolved.length} motor pakete dahil`;
        }

        if (boxResolvedSummary && textResolvedList) {
            if (fullResolved.length > 0) {
                boxResolvedSummary.classList.remove('hidden');
                textResolvedList.textContent = fullResolved.map(m => CLINICAL_MOTORS[m]?.shortName || m).join(' + ');
            } else {
                boxResolvedSummary.classList.add('hidden');
                textResolvedList.textContent = '';
            }
        }
    }

    // F. Kaydedilmiş Özel Paketleri Listele
    function renderSavedCustomPacks(): void {
        if (!containerSavedList || !sectionSavedPacks) return;
        const customPacks = getCustomPackages();
        if (customPacks.length === 0) {
            sectionSavedPacks.classList.add('hidden');
            containerSavedList.innerHTML = '';
            return;
        }

        sectionSavedPacks.classList.remove('hidden');
        containerSavedList.innerHTML = '';

        customPacks.forEach(pack => {
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs';
            row.innerHTML = `
                <div class="flex items-center gap-2 min-w-0">
                    <span>${escapeHtml(pack.icon || '⭐')}</span>
                    <span class="font-medium text-slate-200 truncate">${escapeHtml(pack.name)}</span>
                    <span class="text-[10px] text-slate-400 font-mono">(${pack.fullMotors ? pack.fullMotors.length : pack.baseMotors.length} motor)</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button type="button" class="btn-run-saved-pack px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] transition-colors" data-pack-id="${escapeHtml(pack.id)}">
                        Çalıştır
                    </button>
                    <button type="button" class="btn-del-saved-pack px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[10px] transition-colors" data-pack-id="${escapeHtml(pack.id)}" title="Paketi Sil">
                        🗑️
                    </button>
                </div>
            `;

            row.querySelector('.btn-run-saved-pack')?.addEventListener('click', () => {
                activatePackage(pack);
                drawerCustom?.classList.add('hidden');
            });

            row.querySelector('.btn-del-saved-pack')?.addEventListener('click', () => {
                if (confirm(`"${pack.name}" paketi silinsin mi?`)) {
                    deleteCustomPackage(pack.id);
                    renderPackageButtons();
                    renderSavedCustomPacks();
                    showAllMotors();
                }
            });

            containerSavedList.appendChild(row);
        });
    }

    // G. Çekmece Aç/Kapa
    if (btnToggleCustom && drawerCustom) {
        btnToggleCustom.addEventListener('click', () => {
            const isHidden = drawerCustom.classList.contains('hidden');
            if (isHidden) {
                drawerCustom.classList.remove('hidden');
                renderMotorChecklist();
                renderSavedCustomPacks();
                if (typeof drawerCustom.scrollIntoView === 'function') {
                    drawerCustom.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                drawerCustom.classList.add('hidden');
            }
        });
    }

    // H. Seçimi Temizle
    if (btnClearSelection) {
        btnClearSelection.addEventListener('click', () => {
            if (containerChecklist) {
                containerChecklist.querySelectorAll<HTMLInputElement>('.chk-custom-motor').forEach(cb => {
                    cb.checked = false;
                    cb.disabled = false;
                });
            }
            if (inputPackName) inputPackName.value = '';
            updateChecklistDependencies();
        });
    }

    // I. Hemen Uygula (Kaydetmeden)
    if (btnApplyNow) {
        btnApplyNow.addEventListener('click', () => {
            if (!containerChecklist) return;
            const checked: string[] = [];
            containerChecklist.querySelectorAll<HTMLInputElement>('.chk-custom-motor:checked').forEach(cb => {
                checked.push(cb.value);
            });
            if (checked.length === 0) {
                alert('Lütfen en az bir klinik motor seçin.');
                return;
            }
            const resolved = resolveMotorDependencies(checked);
            activatePackage(resolved, 'Özel Seçim Paketi', `${resolved.length} motor ekranda aktif`, '⚡');
            if (drawerCustom) drawerCustom.classList.add('hidden');
        });
    }

    // J. Paketi Kaydet & Ekle
    if (btnSavePack) {
        btnSavePack.addEventListener('click', () => {
            const name = inputPackName ? inputPackName.value.trim() : '';
            if (!name) {
                alert('Lütfen özel paketiniz için bir isim yazın (Örn: Nöbetçi Pediatri / Acil Sıvı Paketi).');
                if (inputPackName && typeof inputPackName.focus === 'function') inputPackName.focus();
                return;
            }

            if (!containerChecklist) return;
            const checkedBase: string[] = [];
            containerChecklist.querySelectorAll<HTMLInputElement>('.chk-custom-motor').forEach(cb => {
                // Yalnızca kullanıcının doğrudan tıkladığı motorları temel al
                if (cb.checked && !cb.disabled) {
                    checkedBase.push(cb.value);
                }
            });

            if (checkedBase.length === 0) {
                alert('Lütfen pakete eklenecek en az bir klinik motor seçin.');
                return;
            }

            const newPack = saveCustomPackage(name, checkedBase);
            if (newPack) {
                renderPackageButtons();
                renderSavedCustomPacks();
                activatePackage(newPack);
                if (inputPackName) inputPackName.value = '';
                if (drawerCustom) drawerCustom.classList.add('hidden');
            }
        });
    }

    // Başlangıçta Butonları ve Özel Paketleri Çiz
    renderPackageButtons();
}

// ----------------------------------------------------------------------------
// RESPONSIVE WORKSTATION INIT (Drawer, Sheet, Presets, Network)
// ----------------------------------------------------------------------------
export function initResponsiveWorkstation(): void {
    // 0. Akıllı Motor Paketleri ve Kısayol Kartı Başlatıcı
    initWorkstationPackages();

    // 1. Mobile Category Pills Filtering & Smooth Jump
    const pills = document.querySelectorAll('.cat-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => {
                p.classList.remove('active', 'bg-rose-600', 'text-white');
                p.classList.add('bg-slate-800', 'text-slate-300');
            });
            pill.classList.remove('bg-slate-800', 'text-slate-300');
            pill.classList.add('active', 'bg-rose-600', 'text-white');

            const cat = pill.getAttribute('data-cat');
            const cards = document.querySelectorAll<HTMLDetailsElement>('#clinical-workspace > details');
            if (cat === 'all') {
                cards.forEach(c => c.classList.remove('hidden'));
                const ws = getEl('clinical-workspace');
                if (ws && typeof ws.scrollIntoView === 'function') ws.scrollIntoView({ behavior: 'smooth' });
            } else {
                let firstMatch: HTMLDetailsElement | null = null;
                cards.forEach(c => {
                    const cardCat = c.getAttribute('data-category');
                    if (cardCat === cat || cardCat === 'all') {
                        c.classList.remove('hidden');
                        c.open = true;
                        if (!firstMatch) firstMatch = c;
                    } else {
                        c.classList.add('hidden');
                    }
                });
                if (firstMatch) {
                    if (typeof (firstMatch as any).scrollIntoView === 'function') {
                        (firstMatch as any).scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    (firstMatch as HTMLElement).classList.add('card-highlight');
                    setTimeout(() => (firstMatch as HTMLElement).classList.remove('card-highlight'), 1800);
                }
            }
        });
    });

    // 2. Desktop Left Sidebar Navigation Links
    document.querySelectorAll('.nav-sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (!href || !href.startsWith('#')) return;
            const targetId = href.substring(1);
            const targetCard = getEl<HTMLDetailsElement>(targetId);
            if (targetCard) {
                targetCard.classList.remove('hidden');
                targetCard.open = true;
                if (typeof targetCard.scrollIntoView === 'function') {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                targetCard.classList.add('card-highlight');
                setTimeout(() => targetCard.classList.remove('card-highlight'), 1800);
            }
        });
    });

    // 3. Reset Patient Data (Acil protokol sessionStorage sayaçlarını da temizler)
    const btnReset = getEl('btn-reset-patient');
    if (btnReset && typeof window !== 'undefined') {
        btnReset.addEventListener('click', () => {
            if (confirm('Tüm hasta verileri ve hesaplamalar sıfırlansın mı?')) {
                resetAnaphylaxisTimer();
                resetStatusStopwatch();
                window.location.reload();
            }
        });
    }

    // 4. Mobile Bottom Sheet Drawer Interactions
    const btnOpenSheet = getEl('btn-open-soap-sheet');
    const modalSheet = getEl('modal-soap-sheet');
    const sheetContent = getEl('soap-sheet-content');
    const btnCloseSheet = getEl('btn-close-soap-sheet');
    const backdrop = getEl('soap-sheet-backdrop');
    const handle = getEl('soap-sheet-handle');
    const btnCopyModal = getEl('btn-copy-soap-modal');
    const modalFeedback = getEl('copy-feedback-modal');

    function openSoapSheet(): void {
        if (!modalSheet || !sheetContent) return;
        updateLiveSOAP();
        modalSheet.classList.remove('hidden');
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                sheetContent.classList.remove('translate-y-full');
            });
        } else {
            sheetContent.classList.remove('translate-y-full');
        }
    }

    function closeSoapSheet(): void {
        if (!modalSheet || !sheetContent) return;
        sheetContent.classList.add('translate-y-full');
        setTimeout(() => {
            modalSheet.classList.add('hidden');
        }, 300);
    }

    if (btnOpenSheet) btnOpenSheet.addEventListener('click', openSoapSheet);
    if (btnCloseSheet) btnCloseSheet.addEventListener('click', closeSoapSheet);
    if (backdrop) backdrop.addEventListener('click', closeSoapSheet);
    if (handle) handle.addEventListener('click', closeSoapSheet);

    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && modalSheet && !modalSheet.classList.contains('hidden')) {
                closeSoapSheet();
            }
        });
    }

    if (btnCopyModal) {
        btnCopyModal.addEventListener('click', () => {
            const modalText = getEl<HTMLTextAreaElement>('text-soap-modal');
            const textToCopy = modalText ? modalText.value : (getEl<HTMLTextAreaElement>('text-soap-output')?.value || '');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    if (modalFeedback) {
                        modalFeedback.classList.remove('hidden');
                        setTimeout(() => modalFeedback.classList.add('hidden'), 2000);
                    }
                    const desktopFb = getEl('copy-feedback');
                    if (desktopFb) {
                        desktopFb.classList.remove('hidden');
                        setTimeout(() => desktopFb.classList.add('hidden'), 2000);
                    }
                });
            }
        });
    }

    // 6. DOB Preset Buttons Handling
    const presetBtns = document.querySelectorAll('.btn-dob-preset');
    const dobInput = getEl<HTMLInputElement>('input-dob');
    const birthTimeInput = getEl<HTMLInputElement>('input-birth-time');
    const ageInput = getEl<HTMLInputElement>('input-age');
    const ageUnitSelect = getEl<HTMLSelectElement>('select-age-unit');
    
    presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const preset = btn.getAttribute('data-preset');
            const now = new Date();
            let targetDate = new Date();
            
            if (preset === '0d' || preset === 'today') {
                targetDate = new Date();
            } else if (preset === '1d') {
                targetDate.setDate(now.getDate() - 1);
            } else if (preset === '3d') {
                targetDate.setDate(now.getDate() - 3);
            } else if (preset === '7d') {
                targetDate.setDate(now.getDate() - 7);
            } else if (preset === '14d') {
                targetDate.setDate(now.getDate() - 14);
            } else if (preset === '1m') {
                targetDate.setMonth(now.getMonth() - 1);
            } else if (preset === '1y') {
                targetDate.setFullYear(now.getFullYear() - 1);
            } else if (preset === '5y') {
                targetDate.setFullYear(now.getFullYear() - 5);
            } else if (preset === '25y') {
                targetDate.setFullYear(now.getFullYear() - 25);
            }
            
            const yyyy = targetDate.getFullYear();
            const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
            const dd = String(targetDate.getDate()).padStart(2, '0');
            const formattedDate = `${yyyy}-${mm}-${dd}`;
            
            if (dobInput) {
                dobInput.value = formattedDate;
                
                if ((preset === '0d' || preset === 'today') && birthTimeInput && !birthTimeInput.value) {
                    const curHours = String(now.getHours()).padStart(2, '0');
                    const curMinutes = String(now.getMinutes()).padStart(2, '0');
                    birthTimeInput.value = `${curHours}:${curMinutes}`;
                } else if (preset !== '0d' && preset !== 'today' && birthTimeInput) {
                    birthTimeInput.value = '';
                }

                if (ageInput && ageUnitSelect) {
                    if (preset === '0d' || preset === 'today') {
                        ageInput.value = '0';
                        ageUnitSelect.value = 'days';
                    } else if (preset === '1d') {
                        ageInput.value = '1';
                        ageUnitSelect.value = 'days';
                    } else if (preset === '3d') {
                        ageInput.value = '3';
                        ageUnitSelect.value = 'days';
                    } else if (preset === '7d') {
                        ageInput.value = '7';
                        ageUnitSelect.value = 'days';
                    } else if (preset === '14d') {
                        ageInput.value = '14';
                        ageUnitSelect.value = 'days';
                    } else if (preset === '1m') {
                        ageInput.value = '1';
                        ageUnitSelect.value = 'months';
                    } else if (preset === '1y') {
                        ageInput.value = '1';
                        ageUnitSelect.value = 'years';
                    } else if (preset === '5y') {
                        ageInput.value = '5';
                        ageUnitSelect.value = 'years';
                    } else if (preset === '25y') {
                        ageInput.value = '25';
                        ageUnitSelect.value = 'years';
                    }
                }

                presetBtns.forEach(b => {
                    b.classList.remove('bg-rose-900/60', 'text-rose-200', 'border-rose-700', 'font-bold');
                    b.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-750');
                });
                btn.classList.remove('bg-slate-900', 'text-slate-300', 'border-slate-750');
                btn.classList.add('bg-rose-900/60', 'text-rose-200', 'border-rose-700', 'font-bold');

                updateAllTabs();
            }
        });
    });

    if (dobInput) {
        dobInput.addEventListener('input', () => {
            presetBtns.forEach(b => {
                b.classList.remove('bg-rose-900/60', 'text-rose-200', 'border-rose-700', 'font-bold');
                b.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-750');
            });
        });
    }

    if (ageInput) {
        ageInput.addEventListener('input', () => {
            presetBtns.forEach(b => {
                b.classList.remove('bg-rose-900/60', 'text-rose-200', 'border-rose-700', 'font-bold');
                b.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-750');
            });
        });
    }

    // 7. AYDINLIK / KARANLIK TEMA YÖNETİCİSİ (LIGHT / DARK TOGGLE)
    initTheme();
    const btnTheme = getEl('btn-theme-toggle');
    if (btnTheme) {
        btnTheme.addEventListener('click', () => {
            toggleTheme();
        });
    }

    // 8. QUICK SWITCHER (CTRL+K) HIZLI MOTOR ATLAMA KOMUT PALETİ
    const modalQuick = getEl('modal-quick-switcher');
    const inputQuick = getEl<HTMLInputElement>('input-quick-switcher');
    const listQuick = getEl('list-quick-switcher');
    const btnQuick = getEl('btn-quick-switch');
    let activeQuickIndex = 0;
    let currentQuickResults: QuickSwitcherItem[] = [];

    function renderQuickList(items: QuickSwitcherItem[]): void {
        if (!listQuick) return;
        currentQuickResults = items;
        activeQuickIndex = 0;
        if (items.length === 0) {
            listQuick.innerHTML = '<div class="p-4 text-center text-slate-500 italic">Eşleşen klinik motor bulunamadı.</div>';
            return;
        }
        listQuick.innerHTML = items.map((item, idx) => `
            <div class="quick-item flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${idx === 0 ? 'bg-rose-950/60 border border-rose-800 text-rose-200 font-semibold' : 'hover:bg-slate-800/80 text-slate-300'}" data-index="${idx}" data-motor-id="${item.id}">
                <div class="flex items-center gap-2.5">
                    <span class="text-base">${item.icon}</span>
                    <div>
                        <div class="font-bold text-xs ${idx === 0 ? 'text-rose-200' : 'text-slate-100'}">${item.name}</div>
                        <div class="text-[10px] text-slate-400 line-clamp-1">${item.desc}</div>
                    </div>
                </div>
                <span class="text-[9px] font-mono px-2 py-0.5 rounded uppercase bg-slate-950/50 text-slate-400 border border-slate-800">${item.category}</span>
            </div>
        `).join('');

        const handleSelectQuickMotor = (motorId: string) => {
            const query = inputQuick ? inputQuick.value.trim() : '';
            closeQuickModal();
            jumpToMotor(motorId);
            if (motorId === 'card-ilac' && query && drugInput) {
                drugInput.value = query;
                drugInput.dispatchEvent(new Event('input', { bubbles: true }));
                void executeDrugSearch(query);
            }
        };

        listQuick.querySelectorAll('.quick-item').forEach(el => {
            el.addEventListener('click', () => {
                const motorId = el.getAttribute('data-motor-id');
                if (motorId) {
                    handleSelectQuickMotor(motorId);
                }
            });
        });
    }

    function updateQuickActiveHighlight(): void {
        if (!listQuick) return;
        const items = listQuick.querySelectorAll('.quick-item');
        items.forEach((el, idx) => {
            if (idx === activeQuickIndex) {
                el.className = 'quick-item flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all bg-rose-950/60 border border-rose-800 text-rose-200 font-semibold';
                (el as HTMLElement).scrollIntoView({ block: 'nearest' });
            } else {
                el.className = 'quick-item flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all hover:bg-slate-800/80 text-slate-300';
            }
        });
    }

    function openQuickModal(): void {
        if (!modalQuick || !inputQuick) return;
        modalQuick.classList.remove('hidden');
        inputQuick.value = '';
        renderQuickList(QUICK_SWITCHER_ITEMS);
        setTimeout(() => inputQuick.focus(), 60);
    }

    function closeQuickModal(): void {
        if (!modalQuick) return;
        modalQuick.classList.add('hidden');
    }

    if (btnQuick) btnQuick.addEventListener('click', openQuickModal);
    if (inputQuick) {
        inputQuick.addEventListener('input', () => {
            const val = inputQuick.value;
            const res = searchQuickSwitcher(val);
            renderQuickList(res);
        });

        inputQuick.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentQuickResults.length > 0) {
                    activeQuickIndex = (activeQuickIndex + 1) % currentQuickResults.length;
                    updateQuickActiveHighlight();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentQuickResults.length > 0) {
                    activeQuickIndex = (activeQuickIndex - 1 + currentQuickResults.length) % currentQuickResults.length;
                    updateQuickActiveHighlight();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentQuickResults[activeQuickIndex]) {
                    const motorId = currentQuickResults[activeQuickIndex].id;
                    const query = inputQuick ? inputQuick.value.trim() : '';
                    closeQuickModal();
                    jumpToMotor(motorId);
                    if (motorId === 'card-ilac' && query && drugInput) {
                        drugInput.value = query;
                        drugInput.dispatchEvent(new Event('input', { bubbles: true }));
                        void executeDrugSearch(query);
                    }
                }
            } else if (e.key === 'Escape') {
                closeQuickModal();
            }
        });
    }

    if (modalQuick) {
        modalQuick.addEventListener('click', (e) => {
            if (e.target === modalQuick) closeQuickModal();
        });
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (modalQuick && !modalQuick.classList.contains('hidden')) {
                    closeQuickModal();
                } else {
                    openQuickModal();
                }
            }
        });
    }

    // ========================================================================
    // MODÜLER UI DENETLEYİCİLERİ (Monograf, Muadil Karşılaştırma, Reçete A4, Acil Protokoller, EKG)
    // ========================================================================
    initMonographModalController();
    initEquivalentsModalController({
        onAddDrugToTreatment: (drugData) => {
            if (!appState.treatment) appState.treatment = { selectedDrugs: [] };
            if (!appState.treatment.selectedDrugs) appState.treatment.selectedDrugs = [];
            if (!appState.treatment.selectedDrugs.find((d: any) => d.brand === drugData.brand)) {
                appState.treatment.selectedDrugs.push(drugData);
                renderSelectedDrugs();
                updateAllTabs();
            }
        },
        onSendToSearch: (query, mode) => {
            const dInput = getEl<HTMLInputElement>('input-drug-search');
            if (dInput) {
                updateSearchModeUI(mode);
                dInput.value = query;
                dInput.dispatchEvent(new Event('input'));
            }
        }
    });
    initPrescriptionModalController();
    initEmergencyUiController({
        onUpdateAllTabs: updateAllTabs,
        onUpdateLiveSOAP: updateLiveSOAP
    });
    initEcgUiController(updateAllTabs);

    // ========================================================================
    // SOAP AKILLI ŞABLONLARI & NOKTA KISAYOLLARI (DOT PHRASES)
    // ========================================================================
    const inputCustomNotes = getEl<HTMLTextAreaElement>('input-custom-notes');
    if (typeof document !== 'undefined') {
        // 1. Tıklanabilir Dot Phrase Hap Butonları
        const dotPhraseButtons = document.querySelectorAll<HTMLButtonElement>('.btn-dot-phrase');
        dotPhraseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-key');
                if (key && inputCustomNotes) {
                    inputCustomNotes.value = appendTemplateToText(inputCustomNotes.value, key);
                    updateAllTabs();
                }
            });
        });

        // 2. Anamnez Alanında Otomatik Genişletme (Text Expansion)
        if (inputCustomNotes) {
            inputCustomNotes.addEventListener('input', () => {
                const val = inputCustomNotes.value;
                const { expandedText, expandedKeys } = expandDotPhrases(val);
                if (expandedKeys.length > 0) {
                    inputCustomNotes.value = expandedText;
                    updateAllTabs();
                }
            });
        }

        // 3. SOAP Kartındaki Dropdown Şablon Ekleme
        const selectSoapTemplate = getEl<HTMLSelectElement>('select-soap-template');
        const btnInsertSoapTemplate = getEl('btn-insert-soap-template');
        if (btnInsertSoapTemplate && selectSoapTemplate && inputCustomNotes) {
            btnInsertSoapTemplate.addEventListener('click', () => {
                const key = selectSoapTemplate.value;
                if (key) {
                    inputCustomNotes.value = appendTemplateToText(inputCustomNotes.value, key);
                    selectSoapTemplate.value = '';
                    updateAllTabs();
                }
            });
        }
    }
}

// ----------------------------------------------------------------------------
// Responsive workstation başlatıcı
// ----------------------------------------------------------------------------
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initResponsiveWorkstation);
    } else {
        initResponsiveWorkstation();
    }
}


