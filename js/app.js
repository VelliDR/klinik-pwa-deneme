import { appState } from './state.js';
import { calculateBSA, calculateEGFR } from './engines/biometricsEngine.js';
import { calculatePediatricDose, getVaccineSchedule, classifyPediatricBP, calculateCentorMcIsaac } from './engines/pediatricEngine.js';
import { calculatePercentiles, calculateTargetHeight, calculateCorrectedAge } from './engines/percentileEngine.js';
import { calculatePediatricIron } from './engines/ironEngine.js';
import { calculateAlvarado, calculateParkland, getSutureGuidance } from './engines/surgeryEngine.js';
import { calculateObstetrics, calculateBishop, calculatePreeclampsia } from './engines/obgynEngine.js';
import { analyzeBloodGas } from './engines/bloodGasEngine.js';
import { calculateMaintenanceFluid, calculateSodiumCorrection, calculateNeonatalFluid } from './engines/fluidEngine.js';
import { calculateNEWS2, calculatePEWS, calculateGCS } from './engines/triageEngine.js';
import { calculateQTc, calculateAxis } from './engines/cardiacEngine.js';
import { calculateCorrectedCalcium } from './engines/calciumEngine.js';
import { calculateInfusionRate, calculateGIR } from './engines/infusionEngine.js';
import { convertSteroids, calculateHOMAIR } from './engines/endocrineEngine.js';
import { generateSOAP } from './utils/soapGenerator.js';
import { seedDrugDatabase, searchDrugsInDB, getDrugCount, ensureDrugCatalogReady, isDrugCatalogReady } from './db/titckIndexedDB.js';
import { getDrugBadgesHTML } from './drugEngine.js';
import { calculateWellsDVT, calculateWellsPTE, evaluatePERC, calculateCHA2DS2VASc, calculateHASBLED, calculateHEART } from './engines/thrombosisEngine.js';
import { calculateFENa, calculateFEUrea, evaluateOliguriaDifferential, calculateCorrectedSodium, calculateOsmolalGap, evaluateRumackMatthew, calculateCURB65 } from './engines/nephroToxEngine.js';
import { calculateBhutaniJaundice, calculateAPGAR, calculateWestleyCroup, calculateCDSDehydration, calculateNeonatalWeightLoss } from './engines/neonatologyEngine.js';
import { checkRenalDoseAdjustments, detectTripleWhammy, checkPregnancySafety, checkNeonatalDrugSafety } from './engines/safetyPrescriptionEngine.js';

// Utils
const parseNum = (val) => val === '' || isNaN(val) ? null : Number(val);

// Initialize Drug Database (PWA Hibrit Hızlı Yükleyici: Bellek İçi + IndexedDB)
async function initDrugCatalog() {
    try {
        await ensureDrugCatalogReady();
    } catch (err) {
        console.warn('[TİTCK PWA] İlaç kataloğu başlatma uyarısı:', err);
    }
}
initDrugCatalog();

// Helper: Hasta Yaşını Yıl, Ay, Hafta, Gün veya Doğum Tarihinden (DOB) Hesapla
function calculatePatientAge() {
    const dobInput = document.getElementById('input-dob');
    const timeInput = document.getElementById('input-birth-time');
    const ageInput = document.getElementById('input-age');
    const ageUnitSelect = document.getElementById('select-age-unit');
    const containerNumeric = document.getElementById('container-age-numeric');
    const containerDob = document.getElementById('container-age-dob');
    const labelNumeric = document.getElementById('label-age-numeric');
    const breakdownEl = document.getElementById('output-dob-breakdown');
    const textBreakdown = document.getElementById('text-dob-breakdown');
    const badgeDobTag = document.getElementById('badge-dob-tag');

    const dobVal = dobInput?.value;
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
    // If user is actively typing numeric age, prioritize numeric input
    const isAgeInputActive = (document.activeElement === ageInput || document.activeElement === ageUnitSelect);
    const hasNumeric = (ageVal !== null && !isNaN(ageVal));
    const useNumeric = hasNumeric && (isAgeInputActive || !dobVal || unitVal !== 'dob');

    let y = null, m = null, days = null, weeks = null, hours = null;
    let formatted = '--';
    let ageGroupTag = '';

    if (useNumeric) {
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
        if (dobInput && document.activeElement !== dobInput) {
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
        const birthDate = new Date(dobVal);
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
            if (ageInput && ageUnitSelect && document.activeElement !== ageInput) {
                if (days <= 28) {
                    ageInput.value = days;
                    ageUnitSelect.value = 'days';
                } else if (days < 365) {
                    ageInput.value = Math.floor(m);
                    ageUnitSelect.value = 'months';
                } else {
                    ageInput.value = Math.floor(y);
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

    // Yenidoğanda (<= 14 gün) Bhutani Sarılık Postnatal Saati Otomatik Doldurma
    if (hours !== null && days !== null && days <= 14) {
        const bhutaniInput = document.getElementById('input-bhutani-age-hours');
        if (bhutaniInput && (!bhutaniInput.value || bhutaniInput.dataset.autofilled === 'true')) {
            bhutaniInput.value = Math.min(168, Math.max(1, hours));
            bhutaniInput.dataset.autofilled = 'true';
        }
    }

    return { y, m, days, weeks, hours, formatted, ageGroupTag };
}

/**
 * Standart Klinik Skor Kartı Render Yardımcısı
 * Tekrarlayan DOM sınıf atamaları ve HTML şablon kodunu tekilleştirir.
 */
function renderClinicalCardResult(el, { title, riskText = '', alertClass = 'slate', subtitle = '', recommendations = '', extraHtml = '' }) {
    if (!el) return;
    el.classList.remove('hidden');

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
            <span>${title || ''}</span>
            <span>${riskText || ''}</span>
        </div>
        ${subtitle ? `<div class="text-[10px] font-semibold">${subtitle}</div>` : ''}
        ${recs ? `<div class="text-[10px] text-slate-300 leading-relaxed">${recs}</div>` : ''}
        ${extraHtml || ''}
    `;
}

// Update Logic
function updateAllTabs() {
    // 1. BIOMETRY & DEMOGRAPHY
    const ageData = calculatePatientAge();
    const y = ageData.y;
    const m = ageData.m;
    const totalMonths = (y === null && m === null) ? null : (m !== null ? m : (y * 12));
    const isNeonate = (ageData.days !== null && ageData.days !== undefined && ageData.days <= 28);

    appState.biometry.ageYears = y;
    appState.biometry.ageMonths = m;
    appState.biometry.ageWeeks = ageData.weeks;
    appState.biometry.ageDays = ageData.days;
    appState.biometry.ageHours = ageData.hours;
    appState.biometry.ageFormatted = ageData.formatted;
    appState.biometry.ageGroupTag = ageData.ageGroupTag;
    appState.biometry.isNeonate = isNeonate;
    appState.biometry.dob = document.getElementById('input-dob')?.value || null;
    appState.biometry.birthTime = document.getElementById('input-birth-time')?.value || null;
    appState.biometry.birthWeightG = parseNum(document.getElementById('input-birth-weight')?.value);
    
    appState.biometry.gender = document.getElementById('select-gender').value || null;
    appState.biometry.weightKg = parseNum(document.getElementById('input-weight').value);
    appState.biometry.heightCm = parseNum(document.getElementById('input-height').value);
    const crea = parseNum(document.getElementById('input-creatinine').value);
    
    if (appState.biometry.weightKg && appState.biometry.heightCm) {
        appState.biometry.bsa = calculateBSA(appState.biometry.heightCm, appState.biometry.weightKg);
        document.getElementById('output-bsa').textContent = appState.biometry.bsa.toFixed(2);
    } else {
        appState.biometry.bsa = null;
        document.getElementById('output-bsa').textContent = '--';
    }

    if (crea !== null && y !== null) {
        appState.biometry.egfr = calculateEGFR(crea, y, appState.biometry.gender === 'female' ? 'F' : 'M', appState.biometry.heightCm);
        document.getElementById('output-egfr').textContent = appState.biometry.egfr || '--';
    } else {
        appState.biometry.egfr = null;
        document.getElementById('output-egfr').textContent = '--';
    }

    // Preterm & Düzeltilmiş Yaş
    const isPreterm = document.getElementById('chk-preterm')?.checked || false;
    const pretermGw = parseNum(document.getElementById('input-gestational-weeks')?.value);
    const pretermGwContainer = document.getElementById('container-preterm-gw');
    const correctedAgeEl = document.getElementById('output-corrected-age');
    const ironPretermBadge = document.getElementById('badge-iron-preterm');

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
        if (appState.pediatrics.correctedAge && appState.pediatrics.correctedAge.isPreterm) {
            correctedAgeEl.classList.remove('hidden');
            correctedAgeEl.innerHTML = `⚡ Düzeltilmiş Yaş: <strong>${appState.pediatrics.correctedAge.correctedMonths} ay</strong> (${appState.pediatrics.correctedAge.correctedMonthsFormatted}) | Takvim Yaşı: ${totalMonths} ay (${appState.pediatrics.correctedAge.weeksMissing} hf erken doğum)`;
        } else {
            correctedAgeEl.classList.add('hidden');
        }
    } else {
        appState.pediatrics.correctedAge = null;
        if (correctedAgeEl) correctedAgeEl.classList.add('hidden');
    }

    // Neonatal Tartı Kaybı & Dehidratasyon İzlemi (%7-%10 Kuralı)
    const weightLossEl = document.getElementById('output-neonatal-weight-loss');
    if (isNeonate && appState.biometry.birthWeightG && appState.biometry.weightKg) {
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
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-black/40 font-sans">${wl.percentLoss > 0 ? '%' + wl.percentLoss + ' Kayıp' : 'Kazanç'}</span>
                </div>
                <div class="text-[9px] text-slate-300 leading-tight pt-0.5">${wl.recommendations[0] || ''}</div>
            `;
        } else if (weightLossEl) {
            weightLossEl.classList.add('hidden');
        }
    } else {
        appState.neonatology.weightLoss = null;
        if (weightLossEl) weightLossEl.classList.add('hidden');
    }

    // Persentil & Baş Çevresi
    const headCirc = parseNum(document.getElementById('input-head-circ')?.value);
    const percContainer = document.getElementById('container-percentiles');
    const rowHeadCirc = document.getElementById('row-head-circ');
    const outputHeadCirc = document.getElementById('output-p-head');

    // Preterm bebeklerde ilk 36 ayda persentil hesabı düzeltilmiş yaşa göre yapılır
    const growthMonths = (appState.pediatrics.correctedAge && appState.pediatrics.correctedAge.isPreterm && totalMonths <= 36)
        ? appState.pediatrics.correctedAge.correctedMonths
        : totalMonths;

    if (appState.biometry.weightKg && appState.biometry.heightCm && appState.biometry.gender) {
        appState.pediatrics.percentiles = calculatePercentiles({
            totalMonths: growthMonths,
            gender: appState.biometry.gender,
            weightKg: appState.biometry.weightKg,
            heightCm: appState.biometry.heightCm,
            headCircumferenceCm: headCirc,
            isPediatric: totalMonths <= 216
        });
        if (appState.pediatrics.percentiles) {
            percContainer.classList.remove('hidden');
            document.getElementById('output-p-weight').innerHTML = appState.pediatrics.percentiles.weightPercentile ? `%${appState.pediatrics.percentiles.weightPercentile} <span class="text-[9px] text-slate-500">(Z: ${appState.pediatrics.percentiles.weightZ})</span>` : '--';
            document.getElementById('output-p-height').innerHTML = appState.pediatrics.percentiles.heightPercentile ? `%${appState.pediatrics.percentiles.heightPercentile} <span class="text-[9px] text-slate-500">(Z: ${appState.pediatrics.percentiles.heightZ})</span>` : '--';

            if (appState.pediatrics.percentiles.headCircumferencePercentile !== null && rowHeadCirc && outputHeadCirc) {
                rowHeadCirc.classList.remove('hidden');
                outputHeadCirc.innerHTML = `%${appState.pediatrics.percentiles.headCircumferencePercentile} <span class="text-[9px] text-slate-500">(Z: ${appState.pediatrics.percentiles.headCircZ})</span> <span class="text-[9px] ml-1">${appState.pediatrics.percentiles.headCircCategory || ''}</span>`;
            } else if (rowHeadCirc) {
                rowHeadCirc.classList.add('hidden');
            }
        } else {
            percContainer.classList.add('hidden');
            if (rowHeadCirc) rowHeadCirc.classList.add('hidden');
        }
    } else {
        appState.pediatrics.percentiles = null;
        percContainer.classList.add('hidden');
        if (rowHeadCirc) rowHeadCirc.classList.add('hidden');
    }

    // ÇEDD Hedef Boy & Genetik Potansiyel (Tanner Metodu)
    const motherH = parseNum(document.getElementById('input-mother-height')?.value);
    const fatherH = parseNum(document.getElementById('input-father-height')?.value);
    const targetHContainer = document.getElementById('output-target-height');
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
                thHtml += `<div class="${th.deviationValue < -1.5 ? 'text-rose-400 font-bold' : 'text-sky-400'} pt-1 border-t border-slate-800">${th.deviationAlert}</div>`;
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
        const vaxEl = document.getElementById('output-ped-vaccines');
        if (vaxEl) {
            vaxEl.innerHTML = vax && vax.length 
                ? `<ul class="list-disc pl-4 text-slate-300">${vax.map(v => `<li>${v}</li>`).join('')}</ul>`
                : 'Bu ay için planlı aşı bulunamadı.';
        }
    }

    // PEDIATRIC IRON ENGINE
    const hb = parseNum(document.getElementById('input-hb').value);
    const ironRes = document.getElementById('output-iron-engine');
    
    if (totalMonths !== null && appState.biometry.weightKg) {
        appState.pediatrics.iron = calculatePediatricIron({
            ageMonths: totalMonths,
            isPreterm: isPreterm,
            hb: hb,
            weightKg: appState.biometry.weightKg
        });
        const ir = appState.pediatrics.iron;
        if (ir && ir.status === 'SUCCESS') {
            ironRes.classList.remove('hidden');
            let ironHtml = '';

            if (isPreterm) {
                ironHtml += `<div class="mb-1.5 px-2 py-1 bg-amber-950/60 text-amber-300 border border-amber-700/60 rounded text-[10px] font-bold">⚡ PRETERM BEBEK PROTOKOLÜ (2. aydan itibaren 2-4 mg/kg/gün)</div>`;
            }

            // Hb Evaluation Badge
            const evalColor = ir.hbEvaluation.badgeColor === 'rose' ? 'text-rose-400' : ir.hbEvaluation.badgeColor === 'amber' ? 'text-amber-400' : 'text-emerald-400';
            ironHtml += `<div class="${evalColor} font-semibold border-b border-slate-700/50 pb-1 mb-1">Hb Durumu: ${ir.hbEvaluation.text}</div>`;

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
                ironHtml += `<div class="mt-1 text-[10px] text-slate-500">${ir.treatment.text}</div>`;
            }

            ironRes.innerHTML = ironHtml;
        } else if (ir && ir.status === 'INCOMPLETE') {
            ironRes.classList.remove('hidden');
            ironRes.innerHTML = `<div class="text-amber-400 text-xs">${ir.hbEvaluation.text}</div>`;
        } else {
            ironRes.classList.add('hidden');
        }
    } else {
        if (ironRes) ironRes.classList.add('hidden');
    }

    // PEDIATRIC SYRUP
    const syrupVal = document.getElementById('select-ped-syrup').value;
    const syrupRes = document.getElementById('output-ped-syrup');
    if (syrupVal) {
        if (appState.biometry.weightKg) {
            appState.pediatrics.syrupDose = calculatePediatricDose(appState.biometry.weightKg, syrupVal);
            syrupRes.classList.remove('hidden');
            syrupRes.innerHTML = `<strong>Doz:</strong> ${appState.pediatrics.syrupDose.targetDoseMg} mg<br>
                               <strong>Hacim:</strong> ${appState.pediatrics.syrupDose.volumeMl} ml<br>
                               <strong>Ölçek:</strong> ${appState.pediatrics.syrupDose.olcekText} (${appState.pediatrics.syrupDose.freq})`;
        } else {
            syrupRes.classList.remove('hidden');
            syrupRes.innerHTML = `⚠️ Lütfen hesaplama için Kilo giriniz.`;
        }
    } else {
        appState.pediatrics.syrupDose = null;
        syrupRes.classList.add('hidden');
    }

    // VITALS / TRIAGE
    const pewsB = parseNum(document.getElementById('input-pews-behavior').value);
    const pewsC = parseNum(document.getElementById('input-pews-cv').value);
    const pewsR = parseNum(document.getElementById('input-pews-resp').value);
    
    // Auto-show PEWS inputs if age < 16 years
    if (totalMonths !== null && totalMonths < 192) {
        document.getElementById('container-pews-inputs').classList.remove('hidden');
        document.getElementById('container-pews-inputs').classList.add('grid');
    } else {
        document.getElementById('container-pews-inputs').classList.add('hidden');
        document.getElementById('container-pews-inputs').classList.remove('grid');
    }

    const nRr = parseNum(document.getElementById('input-rr').value);
    const nSpo2 = parseNum(document.getElementById('input-spo2').value);
    const nSbp = parseNum(document.getElementById('input-sys-bp').value);
    const nDbp = parseNum(document.getElementById('input-dia-bp').value);
    const nHr = parseNum(document.getElementById('input-hr').value);
    const nTemp = parseNum(document.getElementById('input-temp').value);
    const nAvpu = document.getElementById('input-avpu').value;
    const nOx = document.getElementById('input-oxygen').checked;
    const riskContainer = document.getElementById('container-vitals-risk');
    const badgeRiskType = document.getElementById('badge-risk-type');
    const textRiskScore = document.getElementById('text-risk-score');
    const flagContainer = document.getElementById('container-flags');
    const pedBpContainer = document.getElementById('output-pediatric-bp');

    // AAP 2017 Pediatrik Tansiyon Sınıflandırması
    if (nSbp !== null && nDbp !== null && totalMonths !== null && totalMonths <= 216) {
        const pedAgeY = y !== null ? y : (m ? m / 12 : 5);
        appState.pediatrics.bp = classifyPediatricBP({
            ageYears: pedAgeY,
            gender: appState.biometry.gender,
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
        appState.pediatrics.pews = calculatePEWS(pewsB, pewsC, pewsR);
        riskContainer.classList.remove('hidden');
        riskContainer.className = `p-3 rounded-xl border flex flex-col gap-1 ${appState.pediatrics.pews.score >= 3 ? 'bg-rose-950/40 border-rose-600/50' : 'bg-emerald-950/40 border-emerald-600/50'}`;
        badgeRiskType.textContent = 'PEWS';
        badgeRiskType.className = `text-xs font-bold font-mono ${appState.pediatrics.pews.score >= 3 ? 'text-rose-400' : 'text-emerald-400'}`;
        textRiskScore.textContent = `Skor: ${appState.pediatrics.pews.score}`;
        flagContainer.innerHTML = appState.pediatrics.pews.recommendation;
        appState.medicine.news2 = null;
    } else if (nHr !== null && nSbp !== null && nRr !== null && nTemp !== null && nSpo2 !== null) {
        // PARAMETRE SIRASI: calculateNEWS2(hr, sbp, rr, temp, spo2, oxygen, avpu)
        appState.medicine.news2 = calculateNEWS2(nHr, nSbp, nRr, nTemp, nSpo2, nOx, nAvpu);
        riskContainer.classList.remove('hidden');
        riskContainer.className = `p-3 rounded-xl border flex flex-col gap-1 ${appState.medicine.news2.score >= 5 ? 'bg-rose-950/40 border-rose-600/50' : 'bg-slate-800 border-slate-700/50'}`;
        badgeRiskType.textContent = 'NEWS2';
        badgeRiskType.className = `text-xs font-bold font-mono ${appState.medicine.news2.score >= 5 ? 'text-rose-400' : 'text-slate-300'}`;
        textRiskScore.textContent = `Skor: ${appState.medicine.news2.score}`;
        flagContainer.innerHTML = `${appState.medicine.news2.risk} — ${appState.medicine.news2.recommendation}`;
        appState.pediatrics.pews = null;
    } else {
        riskContainer.classList.add('hidden');
        appState.medicine.news2 = null;
        appState.pediatrics.pews = null;
    }

    // GCS
    const gcsE = parseNum(document.getElementById('select-gcs-e').value);
    const gcsV = parseNum(document.getElementById('select-gcs-v').value);
    const gcsM = parseNum(document.getElementById('select-gcs-m').value);
    const gRes = document.getElementById('container-gcs-warnings');
    if (gcsE && gcsV && gcsM) {
        appState.medicine.gcs = calculateGCS(gcsE, gcsV, gcsM);
        gRes.classList.remove('hidden');
        gRes.innerHTML = `GCS: ${appState.medicine.gcs.total} (${appState.medicine.gcs.interpretation}) <br> <span class="text-rose-400">${appState.medicine.gcs.airwayRisk || ''}</span>`;
    } else {
        appState.medicine.gcs = null;
        if (gRes) gRes.classList.add('hidden');
    }

    // SURGERY
    const alvParams = {
        migration: document.getElementById('chk-alv-mig').checked,
        anorexia: document.getElementById('chk-alv-ano').checked,
        nausea: document.getElementById('chk-alv-nau').checked,
        rlqPain: document.getElementById('chk-alv-rlq').checked,
        rebound: document.getElementById('chk-alv-reb').checked,
        temp: document.getElementById('chk-alv-temp').checked,
        leukocytosis: document.getElementById('chk-alv-leu').checked,
        leftShift: document.getElementById('chk-alv-shi').checked
    };
    appState.surgery.alvarado = calculateAlvarado(alvParams);
    const alvRes = document.getElementById('output-alvarado');
    if (appState.surgery.alvarado.score > 0) {
        alvRes.classList.remove('hidden');
        alvRes.textContent = `Skor: ${appState.surgery.alvarado.score}/10 (${appState.surgery.alvarado.risk}). ${appState.surgery.alvarado.recommendation}`;
    } else {
        alvRes.classList.add('hidden');
    }

    const tbsa = parseNum(document.getElementById('input-parkland-tbsa').value);
    const pkRes = document.getElementById('output-parkland');
    if (tbsa && appState.biometry.weightKg) {
        appState.surgery.parkland = calculateParkland(appState.biometry.weightKg, tbsa, appState.biometry.ageYears);
        pkRes.classList.remove('hidden');
        pkRes.innerHTML = `<strong>Total (24s):</strong> ${appState.surgery.parkland.totalVolume} mL <span class="text-[9px] text-slate-400">(ATLS 10. Baskı: ${appState.surgery.parkland.multiplierUsed}mL/kg)</span><br>
                           <strong>İlk 8 Saat:</strong> ${appState.surgery.parkland.first8HrsVolume} mL (${appState.surgery.parkland.first8HrsRate} mL/s)<br>
                           <strong>Kalan 16 Saat:</strong> ${appState.surgery.parkland.next16HrsVolume} mL (${appState.surgery.parkland.next16HrsRate} mL/s)`;
    } else {
        appState.surgery.parkland = null;
        if (pkRes) pkRes.classList.add('hidden');
    }

    const sutureLoc = document.getElementById('select-suture-loc').value;
    const sutureRes = document.getElementById('output-suture');
    if (sutureLoc) {
        appState.surgery.suture = getSutureGuidance(sutureLoc);
        sutureRes.classList.remove('hidden');
        sutureRes.innerHTML = `<strong>Materyal:</strong> ${appState.surgery.suture.material}<br>
                               <strong>Boyut:</strong> ${appState.surgery.suture.size}<br>
                               <strong>Alınma:</strong> ${appState.surgery.suture.removalDays}`;
    } else {
        appState.surgery.suture = null;
        if (sutureRes) sutureRes.classList.add('hidden');
    }

    // OBGYN
    const lmp = document.getElementById('input-lmp').value;
    const eddRes = document.getElementById('output-edd');
    if (lmp) {
        appState.obgyn.eddData = calculateObstetrics(lmp);
        eddRes.classList.remove('hidden');
        eddRes.innerHTML = `GH: ${appState.obgyn.eddData.gestationalAge} | TDT: ${appState.obgyn.eddData.edd}`;
    } else {
        appState.obgyn.eddData = null;
        if (eddRes) eddRes.classList.add('hidden');
    }

    const bDil = parseNum(document.getElementById('input-bishop-dil').value);
    const bEff = parseNum(document.getElementById('input-bishop-eff').value);
    const bSta = parseNum(document.getElementById('input-bishop-sta').value);
    const bCon = parseNum(document.getElementById('input-bishop-con').value);
    const bPos = parseNum(document.getElementById('input-bishop-pos').value);
    const bRes = document.getElementById('output-bishop');
    if (bDil !== null && bEff !== null && bSta !== null && bCon !== null && bPos !== null) {
        appState.obgyn.bishop = calculateBishop(bDil, bEff, bSta, bCon, bPos);
        bRes.classList.remove('hidden');
        bRes.textContent = `Skor: ${appState.obgyn.bishop.score}. ${appState.obgyn.bishop.interpretation}`;
    } else {
        appState.obgyn.bishop = null;
        if (bRes) bRes.classList.add('hidden');
    }

    const preSbp = parseNum(document.getElementById('input-sys-bp').value); // reuse sys bp
    const preDbp = parseNum(document.getElementById('input-dia-bp').value); // reuse dia bp
    const prePro = document.getElementById('chk-pre-pro').checked;
    const preSym = document.getElementById('chk-pre-sym').checked;
    const preRes = document.getElementById('output-pre');
    if (preSbp !== null && preDbp !== null && appState.biometry.gender !== 'male') {
        const symptoms = preSym ? ['symptom'] : [];
        appState.obgyn.preeclampsia = calculatePreeclampsia(preSbp, preDbp, prePro, symptoms);
        if (appState.obgyn.preeclampsia.diagnosis !== 'Normal') {
            preRes.classList.remove('hidden');
            preRes.innerHTML = `${appState.obgyn.preeclampsia.diagnosis}<br><span class="text-xs text-rose-300 font-normal">${appState.obgyn.preeclampsia.alert || ''}</span>`;
        } else {
            preRes.classList.add('hidden');
        }
    } else {
        preRes.classList.add('hidden');
    }

    // IONS & FLUIDS
    const fTemp = parseNum(document.getElementById('input-temp').value); // reuse temp
    const neoFluidBanner = document.getElementById('container-neonatal-fluid-banner');
    const neoFluidDayText = document.getElementById('text-neonatal-fluid-day');
    const neoFluidTargetText = document.getElementById('text-neonatal-fluid-target');
    const neoFluidDescText = document.getElementById('text-neonatal-fluid-desc');

    if (isNeonate && appState.biometry.weightKg) {
        const isPhototherapy = Boolean(appState.neonatology?.bhutani && (appState.neonatology.bhutani.status === 'PHOTOTHERAPY_REQUIRED' || appState.neonatology.bhutani.status === 'EXCHANGE_TRANSFUSION_REQUIRED'));
        const neoFluid = calculateNeonatalFluid({
            ageDays: ageData.days,
            weightKg: appState.biometry.weightKg,
            isPreterm: isPreterm,
            isPhototherapy: isPhototherapy
        });
        appState.medicine.neonatalFluid = neoFluid;
        appState.medicine.fluid = {
            dailyVolume: neoFluid.totalDailyMl,
            hourlyRate: neoFluid.hourlyRateMl,
            fluidTypeRecommendation: neoFluid.soluteAdvice,
            isNeonate: true,
            dayTitle: neoFluid.dayTitle,
            contraindicationNotice: neoFluid.contraindicationNotice
        };

        document.getElementById('output-daily-fluid').textContent = `${neoFluid.totalDailyMl} mL (TND)`;
        document.getElementById('output-hourly-fluid').textContent = `${neoFluid.hourlyRateMl} mL/s`;

        if (neoFluidBanner) {
            neoFluidBanner.classList.remove('hidden');
            if (neoFluidDayText) neoFluidDayText.textContent = `🍼 ${neoFluid.dayTitle} (${neoFluid.mlPerKgRange} mL/kg)`;
            if (neoFluidTargetText) neoFluidTargetText.textContent = `GIR: ${neoFluid.girMgKgMin} mg/kg/dk (%10D)`;
            if (neoFluidDescText) neoFluidDescText.innerHTML = `${neoFluid.soluteAdvice} <span class="text-rose-400 font-semibold block mt-0.5">${neoFluid.contraindicationNotice}</span>`;
        }
    } else if (appState.biometry.weightKg) {
        if (neoFluidBanner) neoFluidBanner.classList.add('hidden');
        appState.medicine.neonatalFluid = null;
        appState.medicine.fluid = calculateMaintenanceFluid(appState.biometry.weightKg, fTemp);
        document.getElementById('output-daily-fluid').textContent = `${appState.medicine.fluid.dailyVolume} mL`;
        document.getElementById('output-hourly-fluid').textContent = `${appState.medicine.fluid.hourlyRate} mL/s`;
    } else {
        if (neoFluidBanner) neoFluidBanner.classList.add('hidden');
        appState.medicine.neonatalFluid = null;
        appState.medicine.fluid = null;
        document.getElementById('output-daily-fluid').textContent = '--';
        document.getElementById('output-hourly-fluid').textContent = '--';
    }

    // Calcium
    const ionCa = parseNum(document.getElementById('input-serum-ca').value);
    const ionAlb = parseNum(document.getElementById('input-albumin').value);
    const ionWarn = document.getElementById('container-ion-warnings');
    let warnings = [];
    if (ionCa !== null) {
        const caObj = calculateCorrectedCalcium({ totalCalcium: ionCa, albumin: ionAlb });
        if (caObj && caObj.correctedCa) {
            warnings.push(`Düzeltilmiş Ca: ${caObj.correctedCa} ${caObj.alertMsg ? '('+caObj.alertMsg+')' : ''}`);
        }
    }

    // Sodium
    const ionNa = parseNum(document.getElementById('input-serum-na').value);
    const parsedTargetDrop = parseNum(document.getElementById('input-target-na-change').value);
    const targetNaDrop = parsedTargetDrop !== null ? parsedTargetDrop : 8;
    if (ionNa !== null && appState.biometry.weightKg && appState.biometry.gender) {
        const isMale = appState.biometry.gender === 'male';
        const ageYears = appState.biometry.ageYears || 30; // fallback
        const tbwFraction = isMale ? (ageYears > 65 ? 0.5 : 0.6) : (ageYears > 65 ? 0.45 : 0.5);
        
        const targetNa = ionNa + targetNaDrop;
        
        const naObj = calculateSodiumCorrection(ionNa, targetNa, appState.biometry.weightKg, tbwFraction);
        if (naObj) {
            document.getElementById('output-na-deficit').textContent = `${naObj.deficit.toFixed(0)} mEq`;
            if (naObj.warning) warnings.push(naObj.warning);
            warnings.push(`1L %3 NaCl: +${naObj.deltaNa3Percent.toFixed(1)} mEq artırır`);
            warnings.push(`1L %0.9 NaCl: +${naObj.deltaNa09Percent.toFixed(1)} mEq artırır`);
        }
    } else {
        document.getElementById('output-na-deficit').textContent = '--';
    }

    if (warnings.length > 0) {
        ionWarn.classList.remove('hidden');
        ionWarn.innerHTML = warnings.join('<br>');
    } else {
        ionWarn.classList.add('hidden');
    }

    // BLOOD GAS
    const ph = parseNum(document.getElementById('input-bg-ph').value);
    const pco2 = parseNum(document.getElementById('input-bg-pco2').value);
    const hco3 = parseNum(document.getElementById('input-bg-hco3').value);
    const bgRes = document.getElementById('container-bg-warnings');
    if (ph && pco2 && hco3) {
        appState.medicine.bloodGas = analyzeBloodGas({
            pH: ph, pCO2: pco2, HCO3: hco3, 
            Na: parseNum(document.getElementById('input-bg-na').value), 
            Cl: parseNum(document.getElementById('input-bg-cl').value), 
            Albumin: parseNum(document.getElementById('input-albumin').value), 
            sampleType: document.getElementById('select-bg-type').value
        });
        bgRes.classList.remove('hidden');
        bgRes.innerHTML = `${appState.medicine.bloodGas.primaryDisorder}<br><span class="text-xs text-slate-400">${appState.medicine.bloodGas.compensationText || ''}</span>`;
    } else {
        appState.medicine.bloodGas = null;
        if (bgRes) bgRes.classList.add('hidden');
    }

    // INFUSION
    const infDose = parseNum(document.getElementById('input-inf-dose').value);
    const infMg = parseNum(document.getElementById('input-inf-mg').value);
    const infVol = parseNum(document.getElementById('input-inf-vol').value);
    if (infDose !== null && infMg !== null && infVol !== null && appState.biometry.weightKg) {
        const infObj = calculateInfusionRate({
            drugAmountMg: infMg,
            totalVolumeMl: infVol,
            weightKg: appState.biometry.weightKg,
            targetDose: infDose,
            doseUnit: 'mcg_kg_min'
        });
        if (infObj) {
            document.getElementById('output-infusion-rate').textContent = `${infObj.rateMlHr} mL/saat`;
        }
    } else {
        document.getElementById('output-infusion-rate').textContent = '--';
    }

    // GLUCOSE INFUSION RATE (GIR) & NEONATAL
    const dextrosePct = parseNum(document.getElementById('select-gir-dextrose')?.value);
    let girRate = parseNum(document.getElementById('input-gir-rate')?.value);
    if (girRate === null && appState.medicine.fluid && appState.medicine.fluid.hourlyRate) {
        girRate = appState.medicine.fluid.hourlyRate;
    }
    const girContainer = document.getElementById('output-gir-result');
    if (dextrosePct && girRate && appState.biometry.weightKg) {
        appState.medicine.gir = calculateGIR({
            dextrosePercent: dextrosePct,
            rateMlHr: girRate,
            weightKg: appState.biometry.weightKg
        });
        const g = appState.medicine.gir;
        if (g && girContainer) {
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
        } else if (girContainer) {
            girContainer.classList.add('hidden');
        }
    } else {
        appState.medicine.gir = null;
        if (girContainer) girContainer.classList.add('hidden');
    }

    // CARDIAC
    const qt = parseNum(document.getElementById('input-ecg-qt').value);
    const hrInput = document.getElementById('input-hr');
    const rrInput = document.getElementById('input-ecg-rr');
    let hrVal = parseNum(hrInput.value);
    let rrVal = parseNum(rrInput.value);

    // Sync HR (vital bulgular) and RR (ms) dynamically
    if (hrVal !== null && (rrVal === null || document.activeElement === hrInput)) {
        rrVal = Math.round(60000 / hrVal);
        rrInput.value = rrVal;
    } else if (rrVal !== null && (hrVal === null || document.activeElement === rrInput)) {
        hrVal = Math.round(60000 / rrVal);
        hrInput.value = hrVal;
    }

    const qrsPatternSelect = document.getElementById('select-ecg-qrs-pattern');
    const qrsPattern = qrsPatternSelect ? qrsPatternSelect.value : 'custom';
    const qrsInput = document.getElementById('input-ecg-qrs');
    let qrs = parseNum(qrsInput.value);

    // Handle QRS Pattern presets
    if (qrsPattern !== 'custom' && (qrs === null || document.activeElement === qrsPatternSelect)) {
        if (qrsPattern === 'normal') qrs = 90;
        else if (qrsPattern === 'lbbb') qrs = 140;
        else if (qrsPattern === 'rbbb') qrs = 130;
        else if (qrsPattern === 'paced') qrs = 160;
        qrsInput.value = qrs;
    }

    const qtRes = document.getElementById('output-ecg-qtc');
    
    if (qt !== null && (hrVal !== null || rrVal !== null)) {
        appState.other.cardiac = calculateQTc({
           hr: hrVal,
           rrMs: rrVal,
           qt: qt,
           qrs: qrs,
           qrsPattern: qrsPattern,
           age: appState.biometry.ageYears,
           gender: appState.biometry.gender,
           k_level: parseNum(document.getElementById('input-serum-k').value),
           is_ami: document.getElementById('chk-tisdale-ami').checked,
           is_sepsis: document.getElementById('chk-tisdale-sepsis').checked,
           is_hf: document.getElementById('chk-tisdale-hf').checked,
           drugs: appState.treatment && appState.treatment.selectedDrugs ? appState.treatment.selectedDrugs.map(d => d.atcCode || d.atc) : []
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
            if (c.qtcBogossian !== null) {
                qtcHtml += `<div class="text-rose-400 font-bold text-[10px] mt-0.5">⚡ QTcBog (Bogossian - Geniş QRS): ${c.qtcBogossian} ms</div>`;
            }
            
            const interpColor = c.colorCode === 'success' ? 'text-emerald-400' : c.colorCode === 'warning' ? 'text-amber-400' : 'text-rose-400';
            qtcHtml += `<div class="${interpColor} mt-1 font-semibold">${c.interpretation}</div>`;
            
            if (c.tisdaleScore > 0) {
                 qtcHtml += `<div class="text-amber-400 text-[10px] mt-1 pt-1 border-t border-slate-700/50">Tisdale Skoru: ${c.tisdaleScore} (${c.tisdaleRisk})</div>`;
            }
            if (c.warnings && c.warnings.length > 0) {
                qtcHtml += `<div class="text-rose-400 text-[9px] mt-1 space-y-0.5">${c.warnings.map(w => `<div>${w}</div>`).join('')}</div>`;
            }
            if (c.drugFlags && c.drugFlags.length > 0) {
                qtcHtml += `<div class="text-fuchsia-400 text-[9px] mt-1 space-y-0.5 font-bold">${c.drugFlags.map(f => `<div>${f}</div>`).join('')}</div>`;
            }

            qtRes.innerHTML = qtcHtml;
            const isDanger = c.colorCode === 'danger' || c.colorCode === 'orange';
            qtRes.className = `p-2 rounded-lg space-y-1 font-mono mt-2 border ${isDanger ? 'bg-rose-950/40 border-rose-600/50' : c.colorCode === 'warning' ? 'bg-amber-950/40 border-amber-600/50' : 'bg-slate-900/60 border-slate-700/50'}`;
        }
    } else {
        qtRes.classList.add('hidden');
        appState.other.cardiac = null;
    }

    // AXIS
    const ecgD1 = parseNum(document.getElementById('input-ecg-d1').value);
    const ecgAvf = parseNum(document.getElementById('input-ecg-avf').value);
    const axisRes = document.getElementById('output-ecg-axis');
    if (ecgD1 !== null && ecgAvf !== null) {
        const axisObj = calculateAxis(ecgD1, ecgAvf);
        if (axisObj) {
            appState.other.axis = axisObj;
            axisRes.classList.remove('hidden');
            axisRes.textContent = `Aks: ${axisObj.degrees}° — ${axisObj.axisCategory}`;
        } else {
            appState.other.axis = null;
            axisRes.classList.add('hidden');
        }
    } else {
        appState.other.axis = null;
        axisRes.classList.add('hidden');
    }

    // ENDOCRINE: STEROID & HOMA-IR
    const steroidSrc = document.getElementById('select-steroid-source')?.value;
    const steroidDose = parseNum(document.getElementById('input-steroid-dose')?.value);
    const steroidTable = document.getElementById('output-steroid-table');
    if (steroidSrc && steroidDose) {
        appState.medicine.steroid = convertSteroids({ sourceDrug: steroidSrc, doseMg: steroidDose });
        const st = appState.medicine.steroid;
        if (st && steroidTable) {
            steroidTable.classList.remove('hidden');
            steroidTable.innerHTML = `
                <div class="text-sky-300 font-bold mb-1 border-b border-slate-700/50 pb-1">
                    ${st.sourceDrug} ${st.inputDoseMg} mg Eşdeğerlikleri:
                </div>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                    ${st.conversions.map(c => `
                        <div class="flex justify-between items-center ${c.isSource ? 'text-amber-300 font-bold' : 'text-slate-300'}">
                            <span>${c.name}:</span>
                            <span>${c.equivalentDoseMg} mg</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (steroidTable) {
            steroidTable.classList.add('hidden');
        }
    } else {
        appState.medicine.steroid = null;
        if (steroidTable) steroidTable.classList.add('hidden');
    }

    const fastingGlu = parseNum(document.getElementById('input-homa-glucose')?.value);
    const fastingIns = parseNum(document.getElementById('input-homa-insulin')?.value);
    const pubertyStage = document.getElementById('select-homa-puberty')?.value;
    const homaRes = document.getElementById('output-homa-result');
    if (fastingGlu && fastingIns) {
        appState.medicine.homaIR = calculateHOMAIR({
            fastingGlucoseMgDl: fastingGlu,
            fastingInsulinUuMl: fastingIns,
            tannerStage: pubertyStage
        });
        const hm = appState.medicine.homaIR;
        if (hm && homaRes) {
            homaRes.classList.remove('hidden');
            homaRes.className = `p-2 rounded-lg border font-mono space-y-1 text-[10px] ${hm.alertClass}`;
            homaRes.innerHTML = `
                <div class="flex justify-between items-center font-bold">
                    <span>HOMA-IR: ${hm.homaIR}</span>
                    <span>Eşik: &gt; ${hm.cutoff} (${hm.tannerStage})</span>
                </div>
                <div class="text-[10px] leading-relaxed">${hm.interpretation}</div>
            `;
        } else if (homaRes) {
            homaRes.classList.add('hidden');
        }
    } else {
        appState.medicine.homaIR = null;
        if (homaRes) homaRes.classList.add('hidden');
    }

    // CENTOR / MCISAAC
    const cFever = document.getElementById('chk-centor-fever')?.checked || false;
    const cNoCough = document.getElementById('chk-centor-no-cough')?.checked || false;
    const cNodes = document.getElementById('chk-centor-nodes')?.checked || false;
    const cTonsils = document.getElementById('chk-centor-tonsils')?.checked || false;
    const centorRes = document.getElementById('output-centor-result');

    if (cFever || cNoCough || cNodes || cTonsils) {
        const centorAgeY = y !== null ? y : (m ? m / 12 : 20);
        appState.pediatrics.centor = calculateCentorMcIsaac({
            feverOver38: cFever,
            noCough: cNoCough,
            tenderCervicalNodes: cNodes,
            tonsillarExudate: cTonsils,
            ageYears: centorAgeY
        });
        const ct = appState.pediatrics.centor;
        if (ct && centorRes) {
            renderClinicalCardResult(centorRes, {
                title: `<strong class="${ct.alertClass}">Centor Skoru: ${ct.score}</strong>`,
                riskText: `GAS Riski: ${ct.riskPercent}`,
                recommendations: ct.recommendation,
                alertClass: ct.score >= 4 ? 'danger' : (ct.score >= 2 ? 'warning' : 'slate')
            });
        } else if (centorRes) {
            centorRes.classList.add('hidden');
        }
    } else {
        appState.pediatrics.centor = null;
        if (centorRes) centorRes.classList.add('hidden');
    }

    // ----------------------------------------------------
    // TROMBOEMBOLİ & KARDİYAK ACİL MOTORLARI
    // ----------------------------------------------------
    // A. Wells DVT
    const dvtCancer = document.getElementById('chk-dvt-cancer')?.checked || false;
    const dvtParalysis = document.getElementById('chk-dvt-paralysis')?.checked || false;
    const dvtBedridden = document.getElementById('chk-dvt-bedridden')?.checked || false;
    const dvtTenderness = document.getElementById('chk-dvt-tenderness')?.checked || false;
    const dvtSwelling = document.getElementById('chk-dvt-swelling-entire')?.checked || false;
    const dvtCalf = document.getElementById('chk-dvt-calf-diff')?.checked || false;
    const dvtPitting = document.getElementById('chk-dvt-pitting-edema')?.checked || false;
    const dvtCollateral = document.getElementById('chk-dvt-collateral')?.checked || false;
    const dvtPrev = document.getElementById('chk-dvt-previous-dvt')?.checked || false;
    const dvtAlt = document.getElementById('chk-dvt-alt-likely')?.checked || false;
    const dvtOut = document.getElementById('output-wells-dvt');

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
    const peDvt = document.getElementById('chk-pe-dvt-symptoms')?.checked || false;
    const peAlt = document.getElementById('chk-pe-alt-less-likely')?.checked || false;
    const peHr = document.getElementById('chk-pe-hr-100')?.checked || false;
    const peImm = document.getElementById('chk-pe-immobilization')?.checked || false;
    const pePrev = document.getElementById('chk-pe-previous-pe')?.checked || false;
    const peHemo = document.getElementById('chk-pe-hemoptysis')?.checked || false;
    const peMal = document.getElementById('chk-pe-malignancy')?.checked || false;
    const peOut = document.getElementById('output-wells-pe');

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
    const percAge = document.getElementById('chk-perc-age')?.checked || false;
    const percHr = document.getElementById('chk-perc-hr')?.checked || false;
    const percSpo2 = document.getElementById('chk-perc-spo2')?.checked || false;
    const percSwelling = document.getElementById('chk-perc-swelling')?.checked || false;
    const percHemo = document.getElementById('chk-perc-hemoptysis')?.checked || false;
    const percSurg = document.getElementById('chk-perc-surgery')?.checked || false;
    const percHist = document.getElementById('chk-perc-history')?.checked || false;
    const percEst = document.getElementById('chk-perc-estrogen')?.checked || false;
    const percOut = document.getElementById('output-perc');

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
    const hHist = parseNum(document.getElementById('select-heart-history')?.value) || 0;
    const hEcg = parseNum(document.getElementById('select-heart-ecg')?.value) || 0;
    const hAge = parseNum(document.getElementById('select-heart-age')?.value) || 0;
    const hRisk = parseNum(document.getElementById('select-heart-risk')?.value) || 0;
    const hTrop = parseNum(document.getElementById('select-heart-troponin')?.value) || 0;
    const heartOut = document.getElementById('output-heart-score');

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
    const afChf = document.getElementById('chk-af-chf')?.checked || false;
    const afHtn = document.getElementById('chk-af-htn')?.checked || false;
    const afAge75 = document.getElementById('chk-af-age75')?.checked || false;
    const afDm = document.getElementById('chk-af-dm')?.checked || false;
    const afStroke = document.getElementById('chk-af-stroke')?.checked || false;
    const afVasc = document.getElementById('chk-af-vasc')?.checked || false;
    const afAge65 = document.getElementById('chk-af-age65')?.checked || false;
    const afFemale = document.getElementById('chk-af-female')?.checked || false;
    const afOut = document.getElementById('output-cha2ds2vasc');

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
    const bHtn = document.getElementById('chk-bleeding-htn')?.checked || false;
    const bRenal = document.getElementById('chk-bleeding-renal')?.checked || false;
    const bLiver = document.getElementById('chk-bleeding-liver')?.checked || false;
    const bStroke = document.getElementById('chk-bleeding-stroke')?.checked || false;
    const bHist = document.getElementById('chk-bleeding-history')?.checked || false;
    const bInr = document.getElementById('chk-bleeding-inr')?.checked || false;
    const bElderly = document.getElementById('chk-bleeding-elderly')?.checked || false;
    const bDrugs = document.getElementById('chk-bleeding-drugs')?.checked || false;
    const bAlc = document.getElementById('chk-bleeding-alcohol')?.checked || false;
    const hasbledOut = document.getElementById('output-hasbled');

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

    // ----------------------------------------------------
    // NEFROLOJİ, TOKSİKOLOJİ & PNÖMONİ MOTORLARI
    // ----------------------------------------------------
    // NEFROLOJİ, TOKSİKOLOJİ & PNÖMONİ MOTORLARI (AŞAMA 2)
    // ----------------------------------------------------
    // A. FENa & FEUrea
    const fenaSNa = parseNum(document.getElementById('input-fena-s-na')?.value);
    const fenaUNa = parseNum(document.getElementById('input-fena-u-na')?.value);
    const fenaSCr = parseNum(document.getElementById('input-fena-s-cr')?.value);
    const fenaUCr = parseNum(document.getElementById('input-fena-u-cr')?.value);
    const fenaDiuretic = document.getElementById('chk-fena-diuretic')?.checked || false;
    const feureaUnit = document.getElementById('select-feurea-unit')?.value || 'bun';
    const feureaSBun = parseNum(document.getElementById('input-feurea-s-bun')?.value);
    const feureaUUrea = parseNum(document.getElementById('input-feurea-u-urea')?.value);
    const fenaOut = document.getElementById('output-fena-feurea');

    if ((fenaSNa && fenaUNa && fenaSCr && fenaUCr) || (feureaSBun && feureaUUrea && fenaSCr && fenaUCr)) {
        let resHtml = '';
        let fenaRes = null;
        let feureaRes = null;

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
    const corrNaMeas = parseNum(document.getElementById('input-corr-na-meas')?.value);
    const corrGlu = parseNum(document.getElementById('input-corr-glucose')?.value);
    const osmMeas = parseNum(document.getElementById('input-osm-measured')?.value);
    const corrNaOut = document.getElementById('output-corr-na-osm');

    if (corrNaMeas && corrGlu) {
        const corrRes = calculateCorrectedSodium({
            measuredSodium: corrNaMeas,
            glucoseMgDl: corrGlu
        });
        appState.nephroTox.correctedSodium = corrRes;
        let osmRes = null;
        if (osmMeas) {
            osmRes = calculateOsmolalGap({
                measuredOsmolality: osmMeas,
                sodium: corrNaMeas,
                glucoseMgDl: corrGlu,
                bunMgDl: feureaSBun || 15
            });
            appState.nephroTox.osmolalGap = osmRes;
        }
        if (corrNaOut) {
            corrNaOut.classList.remove('hidden');
            corrNaOut.innerHTML = `
                <div class="flex justify-between items-center font-bold">
                    <span>Katz Düzeltilmiş Na: ${corrRes.correctedSodiumKatz} mEq/L</span>
                    <span class="text-slate-400 text-[10px]">Ölçülen: ${corrRes.measuredSodium}</span>
                </div>
                <div class="text-[9px] text-cyan-300 font-mono">${corrRes.formulaNotes}</div>
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
    const apapHours = parseNum(document.getElementById('input-apap-hours')?.value);
    const apapLevel = parseNum(document.getElementById('input-apap-level')?.value);
    const apapHighRisk = document.getElementById('chk-apap-high-risk')?.checked || false;
    const apapOut = document.getElementById('output-apap-rumack');

    if (apapHours && apapLevel) {
        const apapRes = evaluateRumackMatthew({
            hoursPostIngestion: apapHours,
            paracetamolLevelMcgMl: apapLevel,
            weightKg: appState.biometry.weightKg || 70,
            isHighRisk: apapHighRisk
        });
        appState.nephroTox.paracetamol = apapRes;
        if (apapOut) {
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
                    <span>${apapRes.hoursPostIngestion}. Saat: ${apapRes.levelMcgMl} µg/mL (Eşik: ${apapRes.threshold} µg/mL)</span>
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

    // D. CURB-65 & CRB-65 (Yaş ve BUN otomatik eşitleme)
    const chkCurb65El = document.getElementById('chk-curb-65');
    if (chkCurb65El && appState.biometry.ageYears !== null && appState.biometry.ageYears !== undefined) {
        chkCurb65El.checked = appState.biometry.ageYears >= 65;
    }
    const chkCurbUEl = document.getElementById('chk-curb-u');
    if (chkCurbUEl && feureaSBun) {
        if (feureaUnit === 'bun' && feureaSBun > 19) chkCurbUEl.checked = true;
        if (feureaUnit === 'urea' && feureaSBun > 42) chkCurbUEl.checked = true;
    }

    const curbC = document.getElementById('chk-curb-c')?.checked || false;
    const curbU = document.getElementById('chk-curb-u')?.checked || false;
    const curbR = document.getElementById('chk-curb-r')?.checked || false;
    const curbB = document.getElementById('chk-curb-b')?.checked || false;
    const curb65 = document.getElementById('chk-curb-65')?.checked || false;
    const curbOut = document.getElementById('output-curb65');

    if (curbC || curbU || curbR || curbB || curb65) {
        const curbRes = calculateCURB65({
            confusion: curbC,
            bunOver19: curbU,
            respiratoryRateGte30: curbR,
            hypotension: curbB,
            ageGte65: curb65
        });
        appState.nephroTox.curb65 = curbRes;
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

    // ----------------------------------------------------
    // NEONATOLOJİ & PEDİATRİK ACİL MOTORLARI
    // ----------------------------------------------------
    // A. Bhutani Sarılık (TND / AAP)
    const bAgeH = parseNum(document.getElementById('input-bhutani-age-hours')?.value);
    const bTsb = parseNum(document.getElementById('input-bhutani-tsb')?.value);
    const bGw = parseNum(document.getElementById('input-bhutani-gw')?.value) || 38;
    const bRisk = document.getElementById('chk-bhutani-risk-factors')?.checked || false;
    const bhutaniOut = document.getElementById('output-bhutani-result');

    if (bAgeH && bTsb) {
        const bRes = calculateBhutaniJaundice({
            ageHours: bAgeH,
            totalBilirubin: bTsb,
            gestationalWeeks: bGw,
            hasRiskFactors: bRisk
        });
        appState.neonatology.bhutani = bRes;
        if (bhutaniOut) {
            const extra = `
                ${bRes.phototherapyThreshold ? `<div class="text-[10px]">Fototerapi Eşiği: ${bRes.phototherapyThreshold} mg/dL | Kan Değişimi: ${bRes.exchangeThreshold} mg/dL</div>` : ''}
                <div class="text-[10px] font-semibold">${bRes.interpretation}</div>
            `;
            renderClinicalCardResult(bhutaniOut, {
                title: `${bRes.ageHours}. Saat: TSB ${bRes.totalBilirubin} mg/dL`,
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

    // B. APGAR Skoru
    const aMin = parseNum(document.getElementById('select-apgar-minute')?.value) || 1;
    const aHr = parseNum(document.getElementById('select-apgar-hr')?.value) ?? 2;
    const aResp = parseNum(document.getElementById('select-apgar-resp')?.value) ?? 2;
    const aTone = parseNum(document.getElementById('select-apgar-tone')?.value) ?? 2;
    const aReflex = parseNum(document.getElementById('select-apgar-reflex')?.value) ?? 2;
    const aColor = parseNum(document.getElementById('select-apgar-color')?.value) ?? 2;
    const apgarOut = document.getElementById('output-apgar-result');

    const apgarRes = calculateAPGAR({
        minute: aMin,
        heartRate: aHr,
        respiratoryEffort: aResp,
        muscleTone: aTone,
        reflexIrritability: aReflex,
        color: aColor
    });
    appState.neonatology.apgar = apgarRes;
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
    const crStridor = parseNum(document.getElementById('select-croup-stridor')?.value) || 0;
    const crRetr = parseNum(document.getElementById('select-croup-retractions')?.value) || 0;
    const crAir = parseNum(document.getElementById('select-croup-air')?.value) || 0;
    const crCyan = parseNum(document.getElementById('select-croup-cyanosis')?.value) || 0;
    const crConsc = parseNum(document.getElementById('select-croup-consciousness')?.value) || 0;
    const croupOut = document.getElementById('output-croup-result');

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
    const cdsApp = parseNum(document.getElementById('select-cds-appearance')?.value) || 0;
    const cdsEyes = parseNum(document.getElementById('select-cds-eyes')?.value) || 0;
    const cdsMuc = parseNum(document.getElementById('select-cds-mucosa')?.value) || 0;
    const cdsTears = parseNum(document.getElementById('select-cds-tears')?.value) || 0;
    const cdsOut = document.getElementById('output-cds-result');

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

    // ----------------------------------------------------
    // AKILCI REÇETE & İLAÇ GÜVENLİĞİ MOTORU
    // ----------------------------------------------------
    const selectedDrugs = (appState.treatment && appState.treatment.selectedDrugs) ? appState.treatment.selectedDrugs : [];
    const safetyEgfr = parseNum(document.getElementById('input-safety-egfr')?.value) ?? appState.biometry.egfr;
    const safetyTrim = parseNum(document.getElementById('select-safety-trimester')?.value) || 0;

    const outWhammy = document.getElementById('output-safety-triple-whammy');
    const outRenal = document.getElementById('output-safety-renal');
    const outPreg = document.getElementById('output-safety-pregnancy');
    const badgeSafety = document.getElementById('badge-safety-status');

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
                    <div class="text-[10px]">${whammyRes.recommendations.join(' ')}</div>
                `;
            }
        } else if (outWhammy) {
            outWhammy.classList.add('hidden');
        }

        // 2. Renal Doz Kesintileri (eGFR)
        if (safetyEgfr) {
            const renalRes = checkRenalDoseAdjustments({ egfr: safetyEgfr, drugs: selectedDrugs });
            appState.safetyPrescription.renalAdjustments = renalRes;
            if (renalRes.alertsCount > 0) {
                if (outRenal) {
                    outRenal.classList.remove('hidden');
                    outRenal.className = `p-2.5 rounded-lg border font-mono space-y-1 text-[10px] ${renalRes.hasContraindication ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                    outRenal.innerHTML = `
                        <div class="font-bold text-xs">⚠️ Renal Dozaj Uyarısı (eGFR: ${renalRes.egfr} mL/dk)</div>
                        ${renalRes.warnings.map(w => `<div class="text-[10px] leading-relaxed">• <strong>${w.drug}</strong>: ${w.message}</div>`).join('')}
                    `;
                }
            } else if (outRenal) {
                outRenal.classList.add('hidden');
            }
        } else if (outRenal) {
            outRenal.classList.add('hidden');
        }

        // 3. Gebelik & Fetal Risk
        if (safetyTrim > 0) {
            const pregRes = checkPregnancySafety(selectedDrugs, { trimester: safetyTrim });
            appState.safetyPrescription.pregnancySafety = pregRes;
            if (pregRes.alertsCount > 0) {
                if (outPreg) {
                    outPreg.classList.remove('hidden');
                    outPreg.className = `p-2.5 rounded-lg border font-mono space-y-1 text-[10px] ${pregRes.hasSevereFetalRisk ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                    outPreg.innerHTML = `
                        <div class="font-bold text-xs">🤰 Gebelik ve Fetotoksisite Uyarısı (${safetyTrim}. Trimester)</div>
                        ${pregRes.alerts.map(a => `<div class="text-[10px] leading-relaxed">• <strong>${a.drugName} (Kategori ${a.category})</strong>: ${a.warning}</div>`).join('')}
                    `;
                }
            } else if (outPreg) {
                outPreg.classList.add('hidden');
            }
        } else if (outPreg) {
            outPreg.classList.add('hidden');
        }

        // 4. Yenidoğan İlaç Toksisite ve Kontrendikasyon Kalkanı
        const outNeoDrug = document.getElementById('output-safety-neonatal');
        if (isNeonate) {
            const neoDrugRes = checkNeonatalDrugSafety(selectedDrugs, { ageDays: ageData.days });
            appState.safetyPrescription.neonatalDrugSafety = neoDrugRes;
            if (neoDrugRes.alertsCount > 0) {
                if (outNeoDrug) {
                    outNeoDrug.classList.remove('hidden');
                    outNeoDrug.className = `p-2.5 rounded-lg border font-mono space-y-1 text-[10px] ${neoDrugRes.hasContraindication ? 'bg-rose-950/50 border-rose-600/70 text-rose-200' : 'bg-amber-950/50 border-amber-600/70 text-amber-200'}`;
                    outNeoDrug.innerHTML = `
                        <div class="font-bold text-xs">🍼 Yenidoğan İlaç Güvenlik Kalkanı</div>
                        ${neoDrugRes.alerts.map(a => `<div class="text-[10px] leading-relaxed">• <strong>${a.drugName}</strong>: ${a.warning}</div>`).join('')}
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
            const hasDanger = (appState.safetyPrescription.tripleWhammy?.isTripleWhammy) ||
                              (appState.safetyPrescription.renalAdjustments?.hasContraindication) ||
                              (appState.safetyPrescription.pregnancySafety?.hasSevereFetalRisk) ||
                              (appState.safetyPrescription.neonatalDrugSafety?.hasContraindication);
            const totalWarns = (appState.safetyPrescription.renalAdjustments?.alertsCount || 0) +
                               (appState.safetyPrescription.pregnancySafety?.alertsCount || 0) +
                               (appState.safetyPrescription.neonatalDrugSafety?.alertsCount || 0) +
                               (appState.safetyPrescription.tripleWhammy?.isTripleWhammy ? 1 : (appState.safetyPrescription.tripleWhammy?.isDoubleRisk ? 1 : 0));
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
        const outNeoDrug = document.getElementById('output-safety-neonatal');
        if (outWhammy) outWhammy.classList.add('hidden');
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

document.addEventListener('input', updateAllTabs);
document.addEventListener('change', updateAllTabs);

// Initial call
updateAllTabs();

// DRUG SEARCH
const clearBtn = document.getElementById('btn-clear-search');
const drugInput = document.getElementById('input-drug-search');
const drugResult = document.getElementById('container-search-results');

let currentDrugSearchSeq = 0;
drugInput.addEventListener('input', async (e) => {
    const q = e.target.value.trim();
    if (q.length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
        drugResult.innerHTML = '';
        drugResult.classList.add('hidden');
        return;
    }

    if (q.length >= 2) {
        const thisSeq = ++currentDrugSearchSeq;

        if (!isDrugCatalogReady()) {
            drugResult.classList.remove('hidden');
            drugResult.innerHTML = '<div class="p-3 text-xs text-sky-400 bg-slate-900 text-center rounded flex items-center justify-center gap-2"><span class="inline-block animate-pulse">⏳</span> <span>TİTCK İlaç Kataloğu hazırlanıyor, aranıyor...</span></div>';
        }

        try {
            const res = await searchDrugsInDB(q);
            if (thisSeq !== currentDrugSearchSeq) return;

            if (res && res.length > 0) {
                drugResult.classList.remove('hidden');
                drugResult.innerHTML = res.map(r => {
                    const ktUrl = r.kt_pdf_prospektus_url || r.kt || '';
                    const kubUrl = r.kub_pdf_url || r.kub || '';
                    const rxBorder = r.prescriptionType === 'Kırmızı' ? 'border-red-500' :
                                     r.prescriptionType === 'Yeşil' ? 'border-emerald-500' :
                                     (r.prescriptionType === 'Mor' || r.prescriptionType === 'Turuncu') ? 'border-purple-500' :
                                     'border-rose-500';

                    return `
                    <div class="mb-2 p-2.5 border-l-2 ${rxBorder} bg-slate-900 rounded-r-lg shadow-sm space-y-1.5 transition-all hover:bg-slate-850">
                        <div class="flex items-start justify-between gap-2">
                            <div class="cursor-pointer flex-1 drug-item-add" 
                                 data-brand="${r.brand}" 
                                 data-generic="${r.generic}" 
                                 data-atc="${r.atcCode}"
                                 data-barcode="${r.barcode || ''}"
                                 data-rx="${r.prescriptionType || 'Normal'}"
                                 data-company="${r.company || ''}"
                                 data-kt="${ktUrl}"
                                 data-kub="${kubUrl}">
                                <div class="text-rose-300 text-xs sm:text-sm font-bold flex flex-wrap items-center gap-1.5 leading-snug">
                                    <span>${r.brand}</span>
                                    ${getDrugBadgesHTML(r)}
                                </div>
                                <div class="text-[11px] text-slate-300 font-medium mt-0.5">
                                    <span class="text-emerald-400 font-semibold">${r.generic}</span>
                                    ${r.atcCode ? `<span class="text-slate-500 font-mono text-[10px]"> | ATC: ${r.atcCode}</span>` : ''}
                                    ${r.barcode ? `<span class="text-slate-500 font-mono text-[10px]"> | Barkod: ${r.barcode}</span>` : ''}
                                </div>
                                ${r.company ? `<div class="text-[9px] text-slate-400 truncate mt-0.5">🏢 ${r.company}</div>` : ''}
                            </div>
                            <div class="flex items-center gap-1 flex-shrink-0">
                                <button type="button" class="btn-muadil bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-500 text-[10px] px-2 py-1 rounded text-cyan-300 transition-all opacity-90 hover:opacity-100" data-atc="${r.atcCode}" data-generic="${r.generic}" title="Eşdeğer / Muadil İlaçları Bul">Muadil</button>
                            </div>
                        </div>
                        ${(ktUrl || kubUrl) ? `
                        <div class="flex items-center gap-2 pt-1 border-t border-slate-800">
                            ${ktUrl ? `
                                <a href="${ktUrl}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-1 bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-700/60 hover:border-amber-500 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors" title="Resmi TİTCK Kullanma Talimatı (Prospektüs)">
                                    <span>📄 Prospektüs (KT)</span>
                                </a>
                            ` : ''}
                            ${kubUrl ? `
                                <a href="${kubUrl}" target="_blank" rel="noopener noreferrer" class="btn-pdf-link inline-flex items-center gap-1 bg-sky-950/70 hover:bg-sky-900 text-sky-300 border border-sky-700/60 hover:border-sky-500 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors" title="Resmi TİTCK Kısa Ürün Bilgisi (KÜB)">
                                    <span>📋 KÜB</span>
                                </a>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                    `;
                }).join('');
            } else {
                drugResult.classList.remove('hidden');
                drugResult.innerHTML = '<div class="p-3 text-xs text-gray-500 bg-slate-900 text-center rounded">Eşleşen ilaç bulunamadı</div>';
            }
        } catch (err) {
            console.error('Arama hatası:', err);
            drugResult.innerHTML = '<div class="p-3 text-xs text-rose-400 bg-slate-900 text-center rounded">Arama sırasında bir sorun oluştu</div>';
        }
    } else {
        drugResult.innerHTML = '';
        drugResult.classList.add('hidden');
    }
});

clearBtn.addEventListener('click', () => {
    drugInput.value = '';
    clearBtn.classList.add('hidden');
    drugResult.innerHTML = '';
    drugResult.classList.add('hidden');
});

drugResult.addEventListener('click', (e) => {
    // PDF linklerine tıklanınca ilaç seçimini tetiklemesin
    if (e.target.closest('.btn-pdf-link')) {
        return;
    }

    const btnMuadil = e.target.closest('.btn-muadil');
    if (btnMuadil) {
        const atc = btnMuadil.getAttribute('data-atc');
        const generic = btnMuadil.getAttribute('data-generic');
        const query = (atc && atc !== 'Belirtilmedi') ? atc : generic;
        
        if (query) {
            drugInput.value = query;
            drugInput.dispatchEvent(new Event('input'));
        }
        return;
    }

    const item = e.target.closest('.drug-item-add');
    if (item) {
        const brand = item.getAttribute('data-brand');
        const generic = item.getAttribute('data-generic');
        const atcCode = item.getAttribute('data-atc');
        const barcode = item.getAttribute('data-barcode');
        const rx = item.getAttribute('data-rx');
        const company = item.getAttribute('data-company');
        const kt = item.getAttribute('data-kt');
        const kub = item.getAttribute('data-kub');
        
        if (!appState.treatment) appState.treatment = { selectedDrugs: [] };
        if (!appState.treatment.selectedDrugs.find(d => d.brand === brand)) {
            appState.treatment.selectedDrugs.push({ brand, generic, atcCode, barcode, rx, company, kt, kub });
            renderSelectedDrugs();
            updateAllTabs();
        }
    }
});

window.removeDrug = function(index) {
    if (appState.treatment && appState.treatment.selectedDrugs) {
        appState.treatment.selectedDrugs.splice(index, 1);
        renderSelectedDrugs();
        updateAllTabs();
    }
};

function renderSelectedDrugs() {
    const container = document.getElementById('container-selected-drugs');
    if (!container) return;
    if (!appState.treatment || !appState.treatment.selectedDrugs || appState.treatment.selectedDrugs.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = appState.treatment.selectedDrugs.map((d, index) => `
        <div class="flex justify-between items-center bg-slate-900 p-2.5 rounded-lg border border-slate-700/80 mb-1.5">
            <div class="flex flex-col flex-1 pr-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs text-rose-300 font-bold">${d.brand}</span>
                    ${d.rx && d.rx !== 'Normal' ? `<span class="text-[9px] px-1 py-0.5 rounded ${d.rx === 'Kırmızı' ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'} font-semibold">${d.rx}</span>` : ''}
                </div>
                <span class="text-[10px] text-slate-400 mt-0.5">${d.generic}${d.company ? ` • <span class="text-slate-500">${d.company}</span>` : ''}</span>
                ${(d.kt || d.kub) ? `
                    <div class="flex gap-2 mt-1">
                        ${d.kt ? `<a href="${d.kt}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 text-[9px] text-amber-400 hover:text-amber-300 hover:underline">📄 Prospektüs</a>` : ''}
                        ${d.kub ? `<a href="${d.kub}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 text-[9px] text-sky-400 hover:text-sky-300 hover:underline">📋 KÜB</a>` : ''}
                    </div>
                ` : ''}
            </div>
            <button class="text-slate-500 hover:text-rose-500 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors" onclick="window.removeDrug(${index})" title="İlacı Kaldır">✕</button>
        </div>
    `).join('');
}

// ==========================================
// RESPONSIVE WORKSTATION & PATIENT CONTEXT CONTROLLERS
// ==========================================

function updatePatientBanner() {
    const bannerAge = document.getElementById('banner-age');
    const bannerGender = document.getElementById('banner-gender');
    const bannerBiometry = document.getElementById('banner-biometry');
    const bannerBSA = document.getElementById('banner-bsa');
    const bannerEGFR = document.getElementById('banner-egfr');

    const headerPatientInfo = document.getElementById('header-patient-info');
    const headerPatientAge = document.getElementById('header-patient-age');
    const headerPatientGender = document.getElementById('header-patient-gender');
    const badgeAgeGroup = document.getElementById('badge-age-group');

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
    if (appState.biometry.gender === 'male') {
        genderDisplay = 'Erkek';
    } else if (appState.biometry.gender === 'female') {
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

function updateClinicalAlertsInspector() {
    let alertCount = 0;

    // 1. eGFR Renal Risk Alert
    const alertEgfr = document.getElementById('alert-item-egfr');
    const textEgfr = document.getElementById('alert-text-egfr');
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
    const alertTw = document.getElementById('alert-item-tw');
    const textTw = document.getElementById('alert-text-tw');
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

    // 3. QTc Prolongation Alert
    const alertQtc = document.getElementById('alert-item-qtc');
    const textQtc = document.getElementById('alert-text-qtc');
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
    const alertJaundice = document.getElementById('alert-item-jaundice');
    const textJaundice = document.getElementById('alert-text-jaundice');
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
    const alertThrombosis = document.getElementById('alert-item-thrombosis');
    const textThrombosis = document.getElementById('alert-text-thrombosis');
    const pte = appState.thrombosis?.wellsPTE;
    const dvt = appState.thrombosis?.wellsDVT;
    if (alertThrombosis && textThrombosis) {
        if ((pte && pte.alertClass === 'danger') || (dvt && dvt.alertClass === 'danger')) {
            alertThrombosis.classList.remove('hidden');
            textThrombosis.textContent = `${pte && pte.alertClass === 'danger' ? `PTE: ${pte.riskCategory} (${pte.score}p)` : ''} ${dvt && dvt.alertClass === 'danger' ? `DVT: ${dvt.riskCategory} (${dvt.score}p)` : ''}`.trim();
            alertCount++;
        } else {
            alertThrombosis.classList.add('hidden');
        }
    }

    // 6. Neonatal Toxic/Contraindicated Drug Alert
    const alertNeoDrug = document.getElementById('alert-item-neonatal-drug');
    const textNeoDrug = document.getElementById('alert-text-neonatal-drug');
    const neoDrug = appState.safetyPrescription?.neonatalDrugSafety;
    if (alertNeoDrug && textNeoDrug) {
        if (neoDrug && neoDrug.alertsCount > 0) {
            alertNeoDrug.classList.remove('hidden');
            textNeoDrug.textContent = neoDrug.alerts.map(a => `${a.drugName}: ${a.title}`).join(' | ');
            alertCount++;
        } else {
            alertNeoDrug.classList.add('hidden');
        }
    }

    // 7. Neonatal Excessive Weight Loss Alert
    const alertNeoWeight = document.getElementById('alert-item-neonatal-weight');
    const textNeoWeight = document.getElementById('alert-text-neonatal-weight');
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
    const alertNephrotox = document.getElementById('alert-item-nephrotox');
    const textNephrotox = document.getElementById('alert-text-nephrotox');
    const nt = appState.nephroTox;
    if (alertNephrotox && textNephrotox) {
        const alerts = [];
        if (nt?.paracetamol?.isToxic) alerts.push('Parasetamol Toksisitesi: Acil IV NAC Protokolü Başlatılmalı');
        if (nt?.osmolalGap?.isCriticalGap) alerts.push(`Kritik Osmolal Açık (${nt.osmolalGap.osmolalGap} mOsm/kg): Toksik Alkol Zehirlenmesi`);
        if (nt?.curb65?.score >= 3) alerts.push(`Ağır Pnömoni (CURB-65: ${nt.curb65.score}/5): YBÜ/Yatış gereklidir`);
        if (alerts.length > 0) {
            alertNephrotox.classList.remove('hidden');
            textNephrotox.textContent = alerts.join(' | ');
            alertCount++;
        } else {
            alertNephrotox.classList.add('hidden');
        }
    }

    // Counter & Empty state update
    const badgeTotal = document.getElementById('badge-total-alerts');
    const emptyState = document.getElementById('alert-item-empty');
    const bannerRisk = document.getElementById('banner-risk-badge');
    const bannerRiskText = document.getElementById('banner-risk-text');

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
function updateLiveSOAP() {
    const soapText = generateSOAP();
    const mainOutput = document.getElementById('text-soap-output');
    if (mainOutput) mainOutput.value = soapText;
    const modalOutput = document.getElementById('text-soap-modal');
    if (modalOutput) modalOutput.value = soapText;
}

const btnCopyDesktop = document.getElementById('btn-copy-soap');
if (btnCopyDesktop) {
    btnCopyDesktop.addEventListener('click', () => {
        const text = document.getElementById('text-soap-output').value;
        navigator.clipboard.writeText(text).then(() => {
            const fb = document.getElementById('copy-feedback');
            if (fb) {
                fb.classList.remove('hidden');
                setTimeout(() => fb.classList.add('hidden'), 2000);
            }
        });
    });
}

function initResponsiveWorkstation() {
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
            const cards = document.querySelectorAll('#clinical-workspace details');
            if (cat === 'all') {
                cards.forEach(c => c.classList.remove('hidden'));
                const ws = document.getElementById('clinical-workspace');
                if (ws) ws.scrollIntoView({ behavior: 'smooth' });
            } else {
                let firstMatch = null;
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
                    firstMatch.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    firstMatch.classList.add('card-highlight');
                    setTimeout(() => firstMatch.classList.remove('card-highlight'), 1800);
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
            const targetCard = document.getElementById(targetId);
            if (targetCard) {
                targetCard.classList.remove('hidden');
                targetCard.open = true;
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                targetCard.classList.add('card-highlight');
                setTimeout(() => targetCard.classList.remove('card-highlight'), 1800);
            }
        });
    });

    // 3. Reset Patient Data
    const btnReset = document.getElementById('btn-reset-patient');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (confirm('Tüm hasta verileri ve hesaplamalar sıfırlansın mı?')) {
                window.location.reload();
            }
        });
    }

    // 4. Online/Offline Network Status Indicator
    const badgeOffline = document.getElementById('badge-offline-status');
    function updateNetworkStatus() {
        if (!badgeOffline) return;
        if (navigator.onLine) {
            badgeOffline.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> <span class="hidden sm:inline">Çevrimdışı</span> PWA Aktif';
            badgeOffline.className = 'text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1.5';
        } else {
            badgeOffline.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Çevrimdışı Mod';
            badgeOffline.className = 'text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1.5';
        }
    }
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // 5. Mobile Bottom Sheet Drawer Interactions
    const btnOpenSheet = document.getElementById('btn-open-soap-sheet');
    const modalSheet = document.getElementById('modal-soap-sheet');
    const sheetContent = document.getElementById('soap-sheet-content');
    const btnCloseSheet = document.getElementById('btn-close-soap-sheet');
    const backdrop = document.getElementById('soap-sheet-backdrop');
    const handle = document.getElementById('soap-sheet-handle');
    const btnCopyModal = document.getElementById('btn-copy-soap-modal');
    const modalFeedback = document.getElementById('copy-feedback-modal');

    function openSoapSheet() {
        if (!modalSheet || !sheetContent) return;
        updateLiveSOAP();
        modalSheet.classList.remove('hidden');
        requestAnimationFrame(() => {
            sheetContent.classList.remove('translate-y-full');
        });
    }

    function closeSoapSheet() {
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

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalSheet && !modalSheet.classList.contains('hidden')) {
            closeSoapSheet();
        }
    });

    if (btnCopyModal) {
        btnCopyModal.addEventListener('click', () => {
            const modalText = document.getElementById('text-soap-modal');
            const textToCopy = modalText ? modalText.value : (document.getElementById('text-soap-output')?.value || '');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    if (modalFeedback) {
                        modalFeedback.classList.remove('hidden');
                        setTimeout(() => modalFeedback.classList.add('hidden'), 2000);
                    }
                    const desktopFb = document.getElementById('copy-feedback');
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
    const dobInput = document.getElementById('input-dob');
    const birthTimeInput = document.getElementById('input-birth-time');
    const ageInput = document.getElementById('input-age');
    const ageUnitSelect = document.getElementById('select-age-unit');
    
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
                        ageInput.value = 0;
                        ageUnitSelect.value = 'days';
                    } else if (preset === '1d') {
                        ageInput.value = 1;
                        ageUnitSelect.value = 'days';
                    } else if (preset === '3d') {
                        ageInput.value = 3;
                        ageUnitSelect.value = 'days';
                    } else if (preset === '7d') {
                        ageInput.value = 7;
                        ageUnitSelect.value = 'days';
                    } else if (preset === '14d') {
                        ageInput.value = 14;
                        ageUnitSelect.value = 'days';
                    } else if (preset === '1m') {
                        ageInput.value = 1;
                        ageUnitSelect.value = 'months';
                    } else if (preset === '1y') {
                        ageInput.value = 1;
                        ageUnitSelect.value = 'years';
                    } else if (preset === '5y') {
                        ageInput.value = 5;
                        ageUnitSelect.value = 'years';
                    } else if (preset === '25y') {
                        ageInput.value = 25;
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
}

// Responsive workstation başlatıcı
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initResponsiveWorkstation);
    } else {
        initResponsiveWorkstation();
    }
}

// PWA Service Worker Registration (Çevrimdışı Çalışma)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('[PWA] Service Worker aktif:', reg.scope))
            .catch(err => console.error('[PWA] Service Worker kayıt hatası:', err));
    });
}