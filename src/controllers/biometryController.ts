/**
 * BİYOMETRİ, YAŞ VE BÜYÜME KART DENETLEYİCİSİ (BIOMETRY & GROWTH CONTROLLER)
 * 
 * Yaş hesabı (DOB/sayısal), Mosteller BSA, eGFR (Schwartz / CKD-EPI 2021),
 * Cole-Green restricted LMS persentilleri (Neyzi 2015 / WHO 2022),
 * ÇEDD hedef boy, erken süt çocuğu büyüme hızı ve kraniyal tarama.
 */

import { appState } from '../state';
import type { Gender } from '../types/clinical';
import { calculateBSA, calculateDetailedEGFR, type PediatricCreatinineAssay } from '../engines/biometricsEngine';
import { 
    calculatePercentiles, 
    calculateTargetHeight, 
    calculateCorrectedAge, 
    calculateGrowthVelocity,
    calculateCranialScreening,
    type GrowthStandard,
    type MeasurementPosition 
} from '../engines/percentileEngine';
import { calculateNeonatalWeightLoss } from '../engines/neonatologyEngine';
import { calculateDevineIBW, calculateAdjustedBodyWeight } from '../engines/renalDoseEngine';
import { calculateIdealBodyWeight } from '../engines/pediatricEngine';
import { getEl, getVal, getNum, getChk, escapeHtml, parseNum } from '../utils/domUtils';

export interface PatientAgeResult {
    y: number | null;
    m: number | null;
    days: number | null;
    weeks: number | null;
    hours: number | null;
    formatted: string;
    ageGroupTag: string;
}

export interface ClinicalCardResultOptions {
    title?: string;
    riskText?: string;
    alertClass?: string;
    subtitle?: string;
    recommendations?: string | string[];
    extraHtml?: string;
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

    const isAgeInputActive = typeof document !== 'undefined' && 
        (document.activeElement === ageInput || document.activeElement === ageUnitSelect);
    const isDobInputActive = typeof document !== 'undefined' && 
        (document.activeElement === dobInput || document.activeElement === timeInput);

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
        // HATA-M1-001: Negatif yaş kontrolü
        if (ageVal < 0) {
            if (breakdownEl && textBreakdown && badgeDobTag) {
                breakdownEl.classList.remove('hidden');
                textBreakdown.textContent = 'Yaş negatif olamaz!';
                badgeDobTag.textContent = 'Hatalı Giriş';
                badgeDobTag.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950/60 text-rose-300 border border-rose-700/60';
            }
            return { y: null, m: null, days: null, weeks: null, hours: null, formatted: 'Geçersiz Yaş', ageGroupTag: 'Hatalı Giriş' };
        }

        const unit = (unitVal === 'dob') ? 'years' : unitVal;
        if (unit === 'years') {
            y = ageVal;
            m = +(ageVal * 12).toFixed(1);
            days = Math.round(ageVal * 365.25);
            weeks = Math.round(ageVal * 52.14);
            hours = days * 24;
            formatted = `${y} Yaş`;
            ageGroupTag = y < 1 ? 'Süt Çocuğu' : (y < 6 ? 'Oyun Çocuğu' : (y < 12 ? 'Okul Çocuğu' : (y < 18 ? 'Ergen' : (y < 65 ? 'Erişkin' : 'Geriatrik (65Y+)'))));
        } else if (unit === 'months') {
            y = +(ageVal / 12).toFixed(2);
            m = ageVal;
            days = Math.round(ageVal * 30.4375);
            weeks = +(days / 7).toFixed(1);
            hours = days * 24;
            formatted = `${m} Aylık`;
            ageGroupTag = ageVal <= 1 ? 'Yenidoğan / Süt Çocuğu' : (ageVal <= 12 ? 'Süt Çocuğu (1-12A)' : 'Oyun Çocuğu');
        } else if (unit === 'weeks') {
            weeks = ageVal;
            days = Math.round(ageVal * 7);
            hours = days * 24;
            m = +(days / 30.4375).toFixed(2);
            y = +(days / 365.25).toFixed(2);
            formatted = `${weeks} Haftalık`;
            ageGroupTag = days <= 28 ? 'Yenidoğan (0-28G)' : 'Süt Çocuğu (1-12A)';
        } else if (unit === 'days') {
            days = ageVal;
            hours = ageVal * 24;
            weeks = +(ageVal / 7).toFixed(1);
            m = +(ageVal / 30.4375).toFixed(2);
            y = +(ageVal / 365.25).toFixed(2);
            formatted = days <= 28 ? `${days} Günlük Yenidoğan` : `${days} Günlük`;
            ageGroupTag = days <= 28 ? 'Yenidoğan (0-28G)' : 'Süt Çocuğu (1-12A)';
        }

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
            textBreakdown.textContent = formatted;
            badgeDobTag.textContent = ageGroupTag;
            badgeDobTag.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700';
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
                ageGroupTag = 'Yenidoğan (0-28G)';
                formatted = `${days} Günlük Yenidoğan (${hours} saat)`;
            } else if (days < 365) {
                ageGroupTag = 'Süt Çocuğu (1-12A)';
                formatted = `${Math.floor(m)} Aylık (${weeks} Hf / ${days}G)`;
            } else if (y < 6) {
                ageGroupTag = 'Oyun Çocuğu (1-5Y)';
                const remM = Math.floor((days % 365.25) / 30.4375);
                formatted = `${Math.floor(y)} Yaş ${remM ? remM + ' Ay' : ''}`;
            } else if (y < 12) {
                ageGroupTag = 'Okul Çocuğu (6-12Y)';
                formatted = `${Math.floor(y)} Yaş`;
            } else if (y < 18) {
                ageGroupTag = 'Ergen / Adölesan';
                formatted = `${Math.floor(y)} Yaş`;
            } else if (y < 65) {
                ageGroupTag = 'Erişkin';
                formatted = `${Math.floor(y)} Yaş`;
            } else {
                ageGroupTag = 'Geriatrik (65Y+)';
                formatted = `${Math.floor(y)} Yaş`;
            }

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
                textBreakdown.textContent = formatted;
                badgeDobTag.textContent = ageGroupTag;
                badgeDobTag.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700';
            }
        } else if (breakdownEl) {
            // HATA-M1-002: Gelecek tarih seçildiğinde kullanıcıya bildirim ver
            breakdownEl.classList.remove('hidden');
            if (textBreakdown) textBreakdown.textContent = 'Doğum tarihi gelecekte olamaz!';
            if (badgeDobTag) {
                badgeDobTag.textContent = 'Gelecek Tarih';
                badgeDobTag.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950/60 text-rose-300 border border-rose-700/60';
            }
        }
    } else {
        if (breakdownEl) breakdownEl.classList.add('hidden');
    }

    // HATA-M1-006: Bhutani saat otomatik doldurması ve kullanıcı girişi koruması
    if (hours !== null && days !== null && days <= 14) {
        const bhutaniInput = getEl<HTMLInputElement>('input-bhutani-age-hours');
        if (bhutaniInput) {
            if (typeof document !== 'undefined' && document.activeElement === bhutaniInput) {
                bhutaniInput.dataset.autofilled = 'false';
                bhutaniInput.dataset.userOverridden = 'true';
            } else if (bhutaniInput.dataset.userOverridden !== 'true' && (!bhutaniInput.value || bhutaniInput.dataset.autofilled === 'true')) {
                bhutaniInput.value = String(Math.min(336, Math.max(1, hours)));
                bhutaniInput.dataset.autofilled = 'true';
            }
        }
    }

    return { y, m, days, weeks, hours, formatted, ageGroupTag };
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

    el.className = `p-2 rounded-lg border tabular-nums space-y-1 text-xs ${bgStyle}`;
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

export function updateBiometryAndGrowth(ageData: PatientAgeResult): void {
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
    const outBmi = getEl('output-bmi');
    const outBmiBadge = getEl('output-bmi-badge');
    const outIbwMeta = getEl('output-ibw-meta');

    if (appState.biometry.weightKg && appState.biometry.heightCm) {
        appState.biometry.bsa = calculateBSA(appState.biometry.heightCm, appState.biometry.weightKg);
        if (outBsa) outBsa.textContent = appState.biometry.bsa !== null ? appState.biometry.bsa.toFixed(2) : '--';

        const hM = appState.biometry.heightCm / 100;
        const bmiVal = Number((appState.biometry.weightKg / (hM * hM)).toFixed(1));
        appState.biometry.bmi = bmiVal;
        if (outBmi) outBmi.textContent = `${bmiVal} kg/m²`;

        // BMI Rozeti
        let bmiCategory = '';
        let badgeClass = '';
        if (bmiVal < 18.5) {
            bmiCategory = 'Zayıf';
            badgeClass = 'bg-amber-950/60 border border-amber-600/60 text-amber-300';
        } else if (bmiVal < 25.0) {
            bmiCategory = 'Normal';
            badgeClass = 'bg-emerald-950/60 border border-emerald-600/60 text-emerald-300';
        } else if (bmiVal < 30.0) {
            bmiCategory = 'Fazla Kilolu';
            badgeClass = 'bg-yellow-950/60 border border-yellow-600/60 text-yellow-300';
        } else {
            bmiCategory = 'Obez';
            badgeClass = 'bg-rose-950/60 border border-rose-600/60 text-rose-300';
        }

        if (outBmiBadge) {
            outBmiBadge.textContent = bmiCategory;
            outBmiBadge.className = `text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeClass}`;
            outBmiBadge.classList.remove('hidden');
        }

        // İdeal ve Düzeltilmiş Ağırlık (IBW & AdjBW) Hesabı
        const isAdult = (y !== null && y >= 18) || (totalMonths !== null && totalMonths >= 216);
        if (isAdult) {
            const devineIbw = calculateDevineIBW(appState.biometry.heightCm, appState.biometry.gender || 'male');
            appState.biometry.ibwKg = devineIbw;
            appState.biometry.isObese = (bmiVal >= 30.0);
            if (bmiVal >= 30.0) {
                const adjBw = calculateAdjustedBodyWeight(appState.biometry.weightKg, devineIbw, 0.40);
                appState.biometry.adjBwKg = adjBw;
                if (outIbwMeta) {
                    outIbwMeta.textContent = `İdeal Kilo: ${devineIbw} kg • Düzeltilmiş (ABW40): ${adjBw} kg`;
                    outIbwMeta.classList.remove('hidden');
                }
            } else {
                appState.biometry.adjBwKg = null;
                if (outIbwMeta) {
                    outIbwMeta.textContent = `İdeal Kilo (IBW): ${devineIbw} kg`;
                    outIbwMeta.classList.remove('hidden');
                }
            }
        } else if (totalMonths !== null) {
            const pedIbw = calculateIdealBodyWeight({
                ageMonths: totalMonths,
                gender: appState.biometry.gender || 'male',
                heightCm: appState.biometry.heightCm,
                weightKg: appState.biometry.weightKg,
                isPreterm: getChk('chk-preterm'),
                gestationalWeeks: getNum('input-gestational-weeks')
            });
            if (pedIbw) {
                appState.biometry.ibwKg = pedIbw.ibwKg;
                appState.biometry.adjBwKg = pedIbw.isObese ? pedIbw.adjBwKg : null;
                appState.biometry.isObese = pedIbw.isObese;
                if (outIbwMeta) {
                    if (pedIbw.isPretermAdjusted) {
                        outIbwMeta.textContent = pedIbw.pretermNote || `Preterm İdeal Kilo: ${pedIbw.ibwKg} kg`;
                    } else if (pedIbw.isObese) {
                        outIbwMeta.textContent = `Pediatrik IBW: ${pedIbw.ibwKg} kg • AdjBW: ${pedIbw.adjBwKg} kg (Z: +${pedIbw.bmiZScore})`;
                    } else {
                        outIbwMeta.textContent = `Pediatrik IBW (50.p BMI): ${pedIbw.ibwKg} kg`;
                    }
                    outIbwMeta.classList.remove('hidden');
                }
            } else {
                appState.biometry.ibwKg = null;
                appState.biometry.adjBwKg = null;
                appState.biometry.isObese = false;
                if (outIbwMeta) outIbwMeta.classList.add('hidden');
            }
        } else {
            appState.biometry.ibwKg = null;
            appState.biometry.adjBwKg = null;
            appState.biometry.isObese = false;
            if (outIbwMeta) outIbwMeta.classList.add('hidden');
        }
    } else {
        appState.biometry.bsa = null;
        appState.biometry.bmi = null;
        appState.biometry.ibwKg = null;
        appState.biometry.adjBwKg = null;
        appState.biometry.isObese = false;
        if (outBsa) outBsa.textContent = '--';
        if (outBmi) outBmi.textContent = '--';
        if (outBmiBadge) outBmiBadge.classList.add('hidden');
        if (outIbwMeta) outIbwMeta.classList.add('hidden');
    }

    const isPreterm = getChk('chk-preterm');
    const pretermGw = getNum('input-gestational-weeks');
    const pretermGwContainer = getEl('container-preterm-gw');
    const correctedAgeEl = getEl('output-corrected-age');
    const ironPretermBadge = getEl('badge-iron-preterm');

    const outEgfr = getEl('output-egfr');
    const outEgfrMeta = getEl('output-egfr-meta');
    if ((crea !== null || cystatinC !== null) && (y !== null || totalMonths !== null)) {
        const genderParam = appState.biometry.gender ? (appState.biometry.gender === 'female' ? 'F' : 'M') : null;
        const detailedEgfr = calculateDetailedEGFR(
            crea,
            y,
            genderParam,
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
                const isAdultWithoutGender = ((y !== null && y >= 18) || (totalMonths !== null && totalMonths >= 216)) && !appState.biometry.gender;
                if (isPedWithoutHeight) {
                    outEgfrMeta.textContent = 'Schwartz için Boy (cm) girin';
                    outEgfrMeta.classList.remove('hidden');
                } else if (isAdultWithoutGender) {
                    outEgfrMeta.textContent = 'Cinsiyet Seçiniz';
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
        ironPretermBadge.textContent = isPreterm ? 'Preterm Aktif' : '';
    }

    if (isPreterm && pretermGw !== null && totalMonths !== null) {
        appState.pediatrics.correctedAge = calculateCorrectedAge({
            chronologicalMonths: totalMonths,
            gestationalWeeks: pretermGw
        });
        if (appState.pediatrics.correctedAge && correctedAgeEl) {
            if (appState.pediatrics.correctedAge.stopRuleApplied) {
                correctedAgeEl.classList.remove('hidden');
                correctedAgeEl.innerHTML = `<span class="text-amber-400 font-medium">2 yaşından (24 ay) büyük çocuklarda düzeltilmiş yaş uygulanmaz (AAP/CDC kılavuzu); takvim yaşı (${totalMonths} ay) esas alınmıştır.</span>`;
            } else if (appState.pediatrics.correctedAge.isPreterm) {
                correctedAgeEl.classList.remove('hidden');
                if (appState.pediatrics.correctedAge.isTermEquivalent === false) {
                    correctedAgeEl.innerHTML = `<strong>${appState.pediatrics.correctedAge.correctedMonthsFormatted}</strong> | Takvim Yaşı: ${totalMonths} ay (${appState.pediatrics.correctedAge.weeksMissing} hf erken doğum). <span class="text-indigo-300 text-[10px]">Henüz term eşdeğere (40. GH) ulaşmamıştır.</span>`;
                } else {
                    correctedAgeEl.innerHTML = `Düzeltilmiş Yaş: <strong>${appState.pediatrics.correctedAge.correctedMonths} ay</strong> (${appState.pediatrics.correctedAge.correctedMonthsFormatted}) | Takvim Yaşı: ${totalMonths} ay (${appState.pediatrics.correctedAge.weeksMissing} hf erken doğum)`;
                }
            } else {
                correctedAgeEl.classList.add('hidden');
            }
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
            weightLossEl.className = `text-xs tabular-nums p-2 rounded-lg border space-y-0.5 ${alertBg}`;
            weightLossEl.innerHTML = `
                <div class="flex items-center justify-between font-bold">
                    <span>${wl.interpretation}</span>
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
    const growthStandardEl = getEl<HTMLSelectElement>('select-growth-standard');
    const growthPositionEl = getEl<HTMLSelectElement>('select-growth-position');
    const rowPosAlert = getEl('row-position-alert');
    const outPosAlert = getEl('output-position-alert');
    const rowDiscAlert = getEl('row-discordance-alert');
    const outDiscAlert = getEl('output-discordance-alert');

    const selectedGrowthStandard = (growthStandardEl?.value as GrowthStandard) || 'neyzi_2015';
    const selectedGrowthPosition = (growthPositionEl?.value as MeasurementPosition) || 'auto';

    const growthMonths = (appState.pediatrics.correctedAge && appState.pediatrics.correctedAge.isPreterm && totalMonths !== null && totalMonths <= 36)
        ? appState.pediatrics.correctedAge.correctedMonths
        : totalMonths;

    const prevHc = getNum('input-cs-prev-hc');
    const csDays = getNum('input-cs-days');
    const csFontanelle = getChk('check-cs-fontanelle');
    const csSunset = getChk('check-cs-sunset');
    const csVomiting = getChk('check-cs-vomiting');
    const csSutures = getChk('check-cs-sutures');
    const csParental = getChk('check-cs-parental');

    const gvMuacVal = getNum('input-gv-muac');
    const gvEdemaVal = getChk('check-gv-edema');
    const gvCompVal = getChk('check-gv-complications');

    if ((appState.biometry.weightKg || appState.biometry.heightCm || headCirc) && appState.biometry.gender && growthMonths !== null) {
        appState.pediatrics.percentiles = calculatePercentiles({
            totalMonths: growthMonths,
            gender: appState.biometry.gender,
            weightKg: appState.biometry.weightKg,
            heightCm: appState.biometry.heightCm,
            headCircumferenceCm: headCirc || undefined,
            isPediatric: growthMonths <= 216,
            standard: selectedGrowthStandard,
            measurementPosition: selectedGrowthPosition,
            previousHeadCircCm: prevHc ?? undefined,
            headCircDaysBetween: csDays ?? undefined,
            hasBulgingFontanelle: csFontanelle,
            hasSunsetEyes: csSunset,
            hasVomitingLethargy: csVomiting,
            hasSeparatedSutures: csSutures,
            parentalMacrocephaly: csParental,
            muacMm: gvMuacVal ?? undefined,
            hasBilateralEdema: gvEdemaVal,
            hasMedicalComplications: gvCompVal
        });
        if (appState.pediatrics.percentiles && percContainer) {
            percContainer.classList.remove('hidden');
            const p = appState.pediatrics.percentiles;
            const stdBadge = p.standardUsed === 'who_2022' ? 'DSÖ' : 'Neyzi';
            if (outPWeight) {
                const wDisp = p.weightPercentileDisplay || (p.weightPercentile !== null ? `%${p.weightPercentile}` : '--');
                outPWeight.innerHTML = p.weightPercentile !== null ? `${wDisp} <span class="text-[9px] text-slate-500">(Z: ${p.weightZ}) [${stdBadge}]</span>` : '--';
            }
            if (outPHeight) {
                const hDisp = p.heightPercentileDisplay || (p.heightPercentile !== null ? `%${p.heightPercentile}` : '--');
                outPHeight.innerHTML = p.heightPercentile !== null ? `${hDisp} <span class="text-[9px] text-slate-500">(Z: ${p.heightZ}) [${stdBadge}]</span>` : '--';
            }

            const rowCranialAlert = getEl('row-cranial-alert');
            const outCranialAlertTitle = getEl('output-cranial-alert-title');
            const outCranialAlertBody = getEl('output-cranial-alert-body');

            if (p.headCircumferencePercentile !== null && rowHeadCirc && outputHeadCirc) {
                rowHeadCirc.classList.remove('hidden');
                const hcDisp = p.headCircumferencePercentileDisplay || `%${p.headCircumferencePercentile}`;
                outputHeadCirc.innerHTML = `${hcDisp} <span class="text-[9px] text-slate-500">(Z: ${p.headCircZ}) [${stdBadge}]</span>`;

                if (p.cranialScreening && p.cranialScreening.hydrocephalusRisk !== 'SAFE' && rowCranialAlert && outCranialAlertTitle && outCranialAlertBody) {
                    rowCranialAlert.classList.remove('hidden');
                    const isDanger = p.cranialScreening.alertClass === 'danger';
                    rowCranialAlert.className = `p-1.5 rounded text-[10px] leading-tight space-y-0.5 ${isDanger ? 'bg-rose-950/80 border border-rose-800 text-rose-300' : 'bg-amber-950/80 border border-amber-800 text-amber-300'}`;
                    outCranialAlertTitle.innerText = p.cranialScreening.riskTitle;
                    outCranialAlertBody.innerText = p.cranialScreening.clinicalRecommendations[0] || '';
                } else if (rowCranialAlert) {
                    rowCranialAlert.classList.add('hidden');
                }
            } else {
                if (rowHeadCirc) rowHeadCirc.classList.add('hidden');
                if (rowCranialAlert) rowCranialAlert.classList.add('hidden');
            }

            // HATA-M14-001: İlk vizitte kesitsel akut malnütrisyon (SAM/MAM) alarmı
            const rowMalAlert = getEl('row-malnutrition-alert');
            const outMalTitle = getEl('output-malnutrition-alert-title');
            const outMalBody = getEl('output-malnutrition-alert-body');

            if (p.malnutritionAssessment && p.malnutritionAssessment.category !== 'WELL_NOURISHED' && rowMalAlert && outMalTitle && outMalBody) {
                rowMalAlert.classList.remove('hidden');
                const isDanger = p.malnutritionAssessment.alertClass === 'danger';
                rowMalAlert.className = `p-1.5 rounded text-[10px] leading-tight space-y-0.5 ${isDanger ? 'bg-rose-950/80 border border-rose-800 text-rose-300' : 'bg-amber-950/80 border border-amber-800 text-amber-300'}`;
                outMalTitle.innerText = `🚨 ${p.malnutritionAssessment.categoryText} (${p.malnutritionAssessment.treatmentProtocol.setting === 'INPATIENT' ? 'YATARAK İZLEM' : 'Ayaktan'})`;
                outMalBody.innerText = `Kriter: ${p.malnutritionAssessment.criteriaMet.join(' • ')} | Hedef: ${p.malnutritionAssessment.treatmentProtocol.caloricTargetKcalKgDay}`;
            } else if (rowMalAlert) {
                rowMalAlert.classList.add('hidden');
            }

            if (p.positionCorrectionApplied && rowPosAlert && outPosAlert && p.positionCorrectionNote) {
                rowPosAlert.classList.remove('hidden');
                outPosAlert.innerText = p.positionCorrectionNote;
            } else if (rowPosAlert) {
                rowPosAlert.classList.add('hidden');
            }

            const discordance = p.comparisonWithAlternative?.heightDiscordanceAlert || p.comparisonWithAlternative?.weightDiscordanceAlert;
            if (discordance && rowDiscAlert && outDiscAlert) {
                rowDiscAlert.classList.remove('hidden');
                outDiscAlert.innerText = discordance;
            } else if (rowDiscAlert) {
                rowDiscAlert.classList.add('hidden');
            }
        } else if (percContainer) {
            percContainer.classList.add('hidden');
            if (rowHeadCirc) rowHeadCirc.classList.add('hidden');
            const rowCranialAlert = getEl('row-cranial-alert');
            if (rowCranialAlert) rowCranialAlert.classList.add('hidden');
            const rowMalAlert = getEl('row-malnutrition-alert');
            if (rowMalAlert) rowMalAlert.classList.add('hidden');
            if (rowPosAlert) rowPosAlert.classList.add('hidden');
            if (rowDiscAlert) rowDiscAlert.classList.add('hidden');
        }
    } else {
        appState.pediatrics.percentiles = null;
        if (percContainer) percContainer.classList.add('hidden');
        if (rowHeadCirc) rowHeadCirc.classList.add('hidden');
        const rowCranialAlert = getEl('row-cranial-alert');
        if (rowCranialAlert) rowCranialAlert.classList.add('hidden');
        const rowMalAlert = getEl('row-malnutrition-alert');
        if (rowMalAlert) rowMalAlert.classList.add('hidden');
        if (rowPosAlert) rowPosAlert.classList.add('hidden');
        if (rowDiscAlert) rowDiscAlert.classList.add('hidden');
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

    // Erken Süt Çocukluğu (<6 Ay) Büyüme Hızı & Akut Malnütrisyon Taraması (WHO 2022/2023)
    const prevWeightKg = getNum('input-gv-prev-weight');
    const gvDays = getNum('input-gv-days');
    const gvBirthPerc = getNum('input-gv-birth-percentile');
    const gvMuac = getNum('input-gv-muac');
    const gvEdema = getChk('check-gv-edema');
    const gvComplications = getChk('check-gv-complications');
    const gvContainer = getEl('output-growth-velocity');

    if (appState.biometry.weightKg && prevWeightKg && gvDays && gvDays > 0 && totalMonths !== null) {
        const curPerc = appState.pediatrics.percentiles ? appState.pediatrics.percentiles.weightPercentile : undefined;
        // HATA-M14-002 FIX: WAZ (weightZ) is NOT WHZ! Use bmiZ (or dedicated weightForLengthZ) for wasting assessment
        const curBmiZ = appState.pediatrics.percentiles ? appState.pediatrics.percentiles.bmiZ : undefined;

        appState.pediatrics.growthVelocity = calculateGrowthVelocity({
            currentWeightKg: appState.biometry.weightKg,
            previousWeightKg: prevWeightKg,
            daysBetween: gvDays,
            ageMonths: totalMonths,
            birthPercentile: gvBirthPerc ?? undefined,
            currentPercentile: curPerc ?? undefined,
            muacMm: gvMuac ?? undefined,
            weightForLengthZ: curBmiZ ?? undefined,
            hasBilateralEdema: gvEdema,
            hasMedicalComplications: gvComplications
        });

        const gv = appState.pediatrics.growthVelocity;
        if (gv && gv.isValid && gvContainer) {
            gvContainer.classList.remove('hidden');
            let gvHtml = `<div class="flex justify-between items-center border-b border-slate-800 pb-1">
                <span class="text-slate-400">Büyüme Hızı:</span>
                <span class="font-bold ${gv.velocityStatus === 'WEIGHT_LOSS' || gv.velocityStatus === 'INADEQUATE' ? 'text-rose-400' : 'text-emerald-400'}">
                    ${gv.gramsPerDay} g/gün <span class="text-[9px] text-slate-400">(${gv.gramsPerWeek} g/hf)</span>
                </span>
            </div>`;

            gvHtml += `<div class="text-[9px] text-slate-400">Beklenen Referans: ${escapeHtml(gv.expectedRange.referenceLabel)}</div>`;
            gvHtml += `<div class="text-[10px] font-semibold ${gv.velocityStatus === 'WEIGHT_LOSS' ? 'text-rose-400' : (gv.velocityStatus === 'INADEQUATE' ? 'text-amber-400' : 'text-emerald-400')}">
                Durum: ${escapeHtml(gv.velocityStatusText)}
            </div>`;

            if (gv.centileDropAnalysis) {
                const cda = gv.centileDropAnalysis;
                gvHtml += `<div class="pt-1 border-t border-slate-800 text-[9px] ${cda.isPathologicalFaltering ? 'text-rose-400' : 'text-slate-300'}">
                    <strong>Persentil Kanalı:</strong> ${escapeHtml(cda.initialChannel.label)} → ${escapeHtml(cda.currentChannel.label)} (${cda.channelsDropped > 0 ? `${cda.channelsDropped} kanal düşüş` : 'Stabil/Yükseliş'})
                    ${cda.falteringReason ? `<div class="text-rose-400 font-bold mt-0.5">[DİKKAT] ${escapeHtml(cda.falteringReason)}</div>` : ''}
                </div>`;
            }

            if (gv.malnutritionAssessment) {
                const ma = gv.malnutritionAssessment;
                const badgeColor = ma.alertClass === 'danger' ? 'bg-rose-950/80 text-rose-300 border-rose-800' : (ma.alertClass === 'warning' ? 'bg-amber-950/80 text-amber-300 border-amber-800' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800');

                gvHtml += `<div class="mt-1.5 p-1.5 rounded border ${badgeColor} space-y-1">
                    <div class="font-bold text-[10px] flex justify-between items-center">
                        <span>${escapeHtml(ma.categoryText)}</span>
                        <span class="text-[8px] uppercase px-1 py-0.5 rounded bg-slate-900 border border-slate-700">${ma.treatmentProtocol.setting === 'INPATIENT' ? 'Yatarak İzlem' : 'Ayaktan İzlem'}</span>
                    </div>
                    <div class="text-[9px] text-slate-300"><strong>Kalori Hedefi:</strong> ${escapeHtml(ma.treatmentProtocol.caloricTargetKcalKgDay)}</div>
                    <div class="text-[9px] text-slate-300"><strong>Beslenme Protokolü:</strong> ${escapeHtml(ma.treatmentProtocol.dietRecommendation)}</div>
                    ${ma.treatmentProtocol.contraindications.length ? `<div class="text-[9px] text-rose-300"><strong>[DİKKAT] Kontrendikasyon:</strong> ${escapeHtml(ma.treatmentProtocol.contraindications.join(' '))}</div>` : ''}
                    <div class="text-[8px] text-slate-400"><strong>İzlem:</strong> ${escapeHtml(ma.treatmentProtocol.monitoringAdvice)}</div>
                </div>`;
            }

            gvContainer.innerHTML = gvHtml;
        } else if (gvContainer) {
            gvContainer.classList.add('hidden');
        }
    } else {
        appState.pediatrics.growthVelocity = null;
        if (gvContainer) gvContainer.classList.add('hidden');
    }

    // Kraniyal İzlem & Hidrosefali / Mikrosefali Tarama Kalkanı (Kara 2016 / Neyzi 2015)
    const csContainer = getEl('output-cranial-screening');
    if (headCirc && appState.biometry.gender && growthMonths !== null) {
        appState.pediatrics.cranialScreening = calculateCranialScreening({
            currentHeadCircCm: headCirc,
            ageMonths: growthMonths,
            gender: appState.biometry.gender,
            previousHeadCircCm: prevHc ?? undefined,
            daysBetween: csDays ?? undefined,
            hasBulgingFontanelle: csFontanelle,
            hasSunsetEyes: csSunset,
            hasVomitingLethargy: csVomiting,
            hasSeparatedSutures: csSutures,
            parentalMacrocephaly: csParental,
            standard: selectedGrowthStandard
        });

        const cs = appState.pediatrics.cranialScreening;
        if (cs && cs.isValid && csContainer) {
            csContainer.classList.remove('hidden');
            let csHtml = `<div class="flex justify-between items-center border-b border-slate-800 pb-1">
                <span class="text-slate-400">Statik Baş Çevresi:</span>
                <span class="font-bold ${cs.alertClass === 'danger' ? 'text-rose-400' : (cs.alertClass === 'warning' ? 'text-amber-400' : 'text-emerald-400')}">
                    ${cs.headCircCm} cm (%${cs.percentile}, Z: ${cs.zScore})
                </span>
            </div>`;

            csHtml += `<div class="text-[9px] text-slate-300 font-medium">Sınıflama: ${escapeHtml(cs.staticClassificationText)}</div>`;

            if (cs.dynamicVelocity) {
                const dv = cs.dynamicVelocity;
                csHtml += `<div class="pt-1 border-t border-slate-800 text-[9px] ${dv.isVelocityElevated ? 'text-rose-400 font-bold' : (dv.isVelocityDepressed ? 'text-amber-400 font-bold' : 'text-slate-300')}">
                    <strong>Aylık Büyüme Hızı:</strong> ${dv.monthlyRateCm} cm/ay <span class="text-slate-400 font-normal">(Beklenen: ${dv.expectedMonthlyRange.label})</span>
                    <div class="mt-0.5">${escapeHtml(dv.velocityStatusText)}</div>
                </div>`;
            }

            if (cs.kibasSignsDetected.length > 0) {
                csHtml += `<div class="p-1 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 text-[9px]">
                    <strong>[DİKKAT] Tespit Edilen KİBAS Bulguları:</strong> ${escapeHtml(cs.kibasSignsDetected.join(', '))}
                </div>`;
            }

            const badgeColor = cs.alertClass === 'danger' ? 'bg-rose-950/80 text-rose-300 border-rose-800' : (cs.alertClass === 'warning' ? 'bg-amber-950/80 text-amber-300 border-amber-800' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800');
            csHtml += `<div class="mt-1.5 p-1.5 rounded border ${badgeColor} space-y-1">
                <div class="font-bold text-[10px] flex justify-between items-center">
                    <span>${escapeHtml(cs.riskTitle)}</span>
                    <span class="text-[9px] uppercase px-1 py-0.5 rounded bg-slate-900 border border-slate-700 tabular-nums">
                        ${cs.urgencyLevel === 'EMERGENCY_IMAGING' ? 'ACİL GÖRÜNTÜLEME' : (cs.urgencyLevel === 'PLANNED_USG' ? 'PLANLI USG' : 'RUTİN İZLEM')}
                    </span>
                </div>
                <div class="text-[9px] text-slate-300 space-y-0.5">
                    ${cs.clinicalRecommendations.map(r => `<div>• ${escapeHtml(r)}</div>`).join('')}
                </div>
            </div>`;

            csContainer.innerHTML = csHtml;
        } else if (csContainer) {
            csContainer.classList.add('hidden');
        }
    } else {
        appState.pediatrics.cranialScreening = null;
        if (csContainer) csContainer.classList.add('hidden');
    }
}
