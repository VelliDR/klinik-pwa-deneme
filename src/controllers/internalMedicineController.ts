/**
 * DAHİLİYE, KARDİYO-EKG VE NEFRO-TOKSİKOLOJİ KART DENETLEYİCİSİ (INTERNAL MEDICINE CONTROLLER)
 * 
 * Kan gazı (Henderson-Hasselbalch, Winter, AG, Delta-Delta), elektrolit dengesi (Adrogué-Madias, Ca),
 * Holliday-Segar idame sıvısı, GIR, steroid eşdeğerlikleri, HOMA-IR, Centor/McIsaac,
 * EKG QTc (Bazett, Fridericia, Bogossian) & aks, FENa, FEUrea, osmolal açık,
 * Rumack-Matthew parasetamol NAC ve CURB-65 pnömoni triyajı.
 */

import { appState } from '../state';
import type { PatientAgeResult } from './biometryController';
import { renderClinicalCardResult } from './biometryController';
import { analyzeBloodGas } from '../engines/bloodGasEngine';
import { calculateCorrectedCalcium } from '../engines/calciumEngine';
import { calculateMaintenanceFluid, calculateSodiumCorrection } from '../engines/fluidEngine';
import { calculateInfusionRate, calculateGIR } from '../engines/infusionEngine';
import { calculateQTc, calculateAxis } from '../engines/cardiacEngine';
import { convertSteroids, calculateHOMAIR } from '../engines/endocrineEngine';
import { calculateCentorMcIsaac } from '../engines/pediatricEngine';
import { 
    calculateFENa, 
    calculateFEUrea, 
    evaluateOliguriaDifferential, 
    calculateCorrectedSodium, 
    calculateOsmolalGap, 
    evaluateRumackMatthew, 
    calculateCURB65 
} from '../engines/nephroToxEngine';
import { getEl, getVal, getNum, getChk, parseNum } from '../utils/domUtils';

export function updateInternalMedicineCard(ageData: PatientAgeResult): void {
    const y = ageData.y;
    const m = ageData.m;
    const totalMonths = (y === null && m === null) ? null : (m !== null ? m : (y !== null ? y * 12 : null));
    const isNeonate = (ageData.days !== null && ageData.days !== undefined && ageData.days <= 28);

    // 1. İDAME SIVI (Yenidoğan Olmayan Hastalar İçin Holliday-Segar)
    const fTemp = getNum('input-temp');
    const neoFluidBanner = getEl('container-neonatal-fluid-banner');
    const outDailyFluid = getEl('output-daily-fluid');
    const outHourlyFluid = getEl('output-hourly-fluid');

    if (!appState.biometry.weightKg) {
        if (!isNeonate && neoFluidBanner) neoFluidBanner.classList.add('hidden');
        appState.medicine.fluid = null;
        if (outDailyFluid) outDailyFluid.textContent = '--';
        if (outHourlyFluid) outHourlyFluid.textContent = '--';
    } else if (!isNeonate) {
        if (neoFluidBanner) neoFluidBanner.classList.add('hidden');
        appState.medicine.neonatalFluid = null;
        const maintFluid = calculateMaintenanceFluid(appState.biometry.weightKg, fTemp || undefined, {
            ibwKg: appState.biometry.ibwKg,
            ageYears: appState.biometry.ageYears,
            isObese: appState.biometry.isObese
        });
        appState.medicine.fluid = maintFluid;
        if (maintFluid) {
            const ibwSuffix = maintFluid.isIbwUsed ? ' (İdeal Kilo)' : '';
            if (outDailyFluid) outDailyFluid.textContent = `${maintFluid.dailyVolume} mL${ibwSuffix}`;
            if (outHourlyFluid) outHourlyFluid.textContent = `${maintFluid.hourlyRate} mL/s`;
        }
    }

    // 2. ELEKTROLİTLER: KALSİYUM & SODYUM (ADROGUÉ-MADİAS)
    const ionCa = getNum('input-serum-ca');
    const ionAlb = getNum('input-albumin');
    const ionWarn = getEl('container-ion-warnings');
    const warnings: string[] = [];

    if (ionCa !== null) {
        const isPreterm = getChk('chk-preterm');
        const ageDays = ageData.days ?? undefined;
        const caObj = calculateCorrectedCalcium({
            totalCalcium: ionCa,
            albumin: ionAlb || undefined,
            ageDays,
            ageYears: appState.biometry.ageYears ?? y ?? undefined,
            isPreterm
        });
        appState.medicine.calcium = caObj;
        if (caObj && caObj.correctedCa) {
            warnings.push(`Düzeltilmiş Ca: ${caObj.correctedCa} mg/dL [Ref: ${caObj.referenceRange}] ${caObj.alertMsg ? '('+caObj.alertMsg+')' : ''}`);
        }
    } else {
        appState.medicine.calcium = null;
    }

    const ionNa = getNum('input-serum-na');
    const ionGlu = getNum('input-serum-glu') ?? getNum('input-nephro-glu') ?? getNum('input-bg-glu');
    const isHighRiskODS = getChk('chk-high-risk-ods');
    const parsedTargetDrop = getNum('input-target-na-change');
    const targetNaDelta = parsedTargetDrop !== null ? Math.abs(parsedTargetDrop) : (isHighRiskODS ? 6 : 8);
    const outNaDeficit = getEl('output-na-deficit');
    const labelNaOutput = getEl('label-na-output');
    const containerNaSubmeta = getEl('container-na-submeta');
    const labelNaSubmeta = getEl('label-na-submeta');
    const outputNaSubmeta = getEl('output-na-submeta');

    if (ionNa !== null && appState.biometry.weightKg && appState.biometry.gender) {
        const isMale = appState.biometry.gender === 'male' || appState.biometry.gender === 'M';
        const ageYears = appState.biometry.ageYears ?? y ?? 30;
        const isPed = (ageYears !== null && ageYears < 18) || (totalMonths !== null && totalMonths < 216);
        let tbwFraction = isMale ? (ageYears > 65 ? 0.5 : 0.6) : (ageYears > 65 ? 0.45 : 0.5);
        // HATA-M10-006: Preterm %80, Term yenidoğan %75, Süt çocuğu %65
        if (isNeonate) {
            tbwFraction = getChk('chk-preterm') ? 0.80 : 0.75;
        } else if (totalMonths !== null && totalMonths <= 12) {
            tbwFraction = 0.65;
        } else if (isPed) {
            tbwFraction = 0.60;
        }
        
        const targetNa = ionNa < 135
            ? ionNa + targetNaDelta
            : (ionNa > 145 ? ionNa - targetNaDelta : ionNa);
        
        const naObj = calculateSodiumCorrection(
            ionNa, 
            targetNa, 
            appState.biometry.weightKg, 
            tbwFraction,
            {
                glucoseMgDl: ionGlu,
                isHighRiskODS,
                ageYears,
                totalMonths,
                isPreterm: getChk('chk-preterm')
            }
        );
        appState.medicine.sodium = naObj;
        if (naObj) {
            if (naObj.isHypernatremia) {
                if (labelNaOutput) labelNaOutput.textContent = 'Serbest Su Açığı (FWD):';
                if (outNaDeficit) outNaDeficit.textContent = `${naObj.freeWaterDeficitLiters} Litre`;
                if (containerNaSubmeta && labelNaSubmeta && outputNaSubmeta) {
                    containerNaSubmeta.classList.remove('hidden');
                    labelNaSubmeta.textContent = '%5 Dekstroz Hızı (48h):';
                    outputNaSubmeta.textContent = `~${naObj.freeWaterHourlyD5WRateMl} mL/saat`;
                }
                warnings.push(`1L %5 Dekstroz (D5W): ${naObj.deltaD5W} mEq Na düşürür`);
            } else if (naObj.isPseudohyponatremia) {
                if (labelNaOutput) labelNaOutput.textContent = 'Düzeltilmiş Sodyum:';
                if (outNaDeficit) outNaDeficit.textContent = `${naObj.correctedNa} mEq/L (Normal)`;
                if (containerNaSubmeta) containerNaSubmeta.classList.add('hidden');
            } else {
                if (labelNaOutput) labelNaOutput.textContent = 'Na Açığı:';
                if (outNaDeficit) outNaDeficit.textContent = `${naObj.deficit.toFixed(0)} mEq`;
                if (containerNaSubmeta && labelNaSubmeta && outputNaSubmeta) {
                    if (naObj.required3PercentMl > 0) {
                        containerNaSubmeta.classList.remove('hidden');
                        labelNaSubmeta.textContent = 'Gereken %3 NaCl:';
                        outputNaSubmeta.textContent = `${naObj.required3PercentMl} mL`;
                    } else {
                        containerNaSubmeta.classList.add('hidden');
                    }
                }
                warnings.push(`1L %3 NaCl: ${naObj.deltaNa3Percent >= 0 ? '+' : ''}${naObj.deltaNa3Percent.toFixed(1)} mEq değiştirir`);
                warnings.push(`1L %0.9 NaCl: ${naObj.deltaNa09Percent >= 0 ? '+' : ''}${naObj.deltaNa09Percent.toFixed(1)} mEq değiştirir`);
            }
            if (naObj.warning) warnings.push(naObj.warning);
        }
    } else {
        appState.medicine.sodium = null;
        if (labelNaOutput) labelNaOutput.textContent = 'Na Açığı:';
        if (outNaDeficit) outNaDeficit.textContent = '--';
        if (containerNaSubmeta) containerNaSubmeta.classList.add('hidden');
    }

    if (ionWarn) {
        if (warnings.length > 0) {
            ionWarn.classList.remove('hidden');
            ionWarn.innerHTML = warnings.join('<br>');
        } else {
            ionWarn.classList.add('hidden');
        }
    }

    // 3. KAN GAZI ANALİZİ (ABG / VBG)
    const ph = getNum('input-bg-ph');
    const pco2 = getNum('input-bg-pco2');
    const hco3 = getNum('input-bg-hco3');
    const bgRes = getEl('container-bg-warnings');
    if (ph && pco2 && hco3 && bgRes) {
        const bgAnalysis = analyzeBloodGas({
            pH: ph, 
            pCO2: pco2, 
            HCO3: hco3, 
            Na: getNum('input-bg-na') ?? getNum('input-serum-na') ?? undefined, 
            Cl: getNum('input-bg-cl') ?? undefined, 
            Albumin: getNum('input-bg-alb') ?? getNum('input-albumin') ?? undefined, 
            sampleType: (getVal('select-bg-type') as 'ABG' | 'VBG') || 'ABG',
            ageInDays: appState.biometry.ageDays ?? undefined,
            ageInYears: appState.biometry.ageYears ?? undefined,
            isNeonate: Boolean(appState.biometry.isNeonate)
        });
        appState.medicine.bloodGas = bgAnalysis;
        if (bgAnalysis) {
            bgRes.classList.remove('hidden');
            let outputHtml = '';

            const isAbnormal = bgAnalysis.primaryDisorder !== 'Normal/Miks' && !bgAnalysis.primaryDisorder.includes('Normal');
            const headingColor = isAbnormal ? 'text-rose-400' : 'text-emerald-400';
            
            outputHtml += `<div class="${headingColor} font-bold text-xs">${bgAnalysis.primaryDisorder}</div>`;
            
            if (bgAnalysis.compensationText) {
                outputHtml += `<div class="text-[11px] text-slate-300 mt-0.5">${bgAnalysis.compensationText}</div>`;
            }

            if (bgAnalysis.corrected_AG !== null) {
                const agText = `Anyon Açığı (AG): ${bgAnalysis.AG?.toFixed(1)}${bgAnalysis.hasAlbumin ? ` (Düz. AG: ${bgAnalysis.corrected_AG.toFixed(1)})` : ''}${bgAnalysis.deltaRatio !== null ? ` | Δ/Δ: ${bgAnalysis.deltaRatio}` : ''} — ${bgAnalysis.hagmaStatus}`;
                outputHtml += `<div class="text-[10px] text-amber-300 mt-1 pt-1 border-t border-slate-700/50">${agText}</div>`;
            }

            if (bgAnalysis.isVBG) {
                outputHtml += `<div class="text-[9px] text-sky-300 mt-0.5">Dönüştürülmüş Arteriyel Eşdeğeri: pH ${bgAnalysis.pH.toFixed(3)}, pCO2 ${bgAnalysis.pCO2.toFixed(1)} mmHg, HCO3 ${bgAnalysis.HCO3.toFixed(1)} mEq/L</div>`;
            }

            if (bgAnalysis.isNeonatalNorms) {
                outputHtml += `<div class="text-[9px] text-cyan-300 font-medium mt-0.5">Yenidoğan Normları Uygulandı (Referans: pH 7.30–7.42, HCO3 19–24, pCO2 35–48)</div>`;
            }

            if (bgAnalysis.warnings && bgAnalysis.warnings.length > 0) {
                outputHtml += `<div class="text-[9px] text-amber-400 mt-1 space-y-0.5">${bgAnalysis.warnings.map((w: string) => `<div>${w}</div>`).join('')}</div>`;
            }

            bgRes.innerHTML = outputHtml;
            bgRes.className = `text-[10px] p-2.5 rounded-lg space-y-1 border ${isAbnormal ? 'bg-rose-950/40 border-rose-600/50 text-rose-200' : 'bg-slate-900/60 border-slate-700/50 text-slate-200'}`;
        }
    } else {
        appState.medicine.bloodGas = null;
        if (bgRes) bgRes.classList.add('hidden');
    }

    // 4. İNFÜZYON HIZI
    const infDose = getNum('input-inf-dose');
    const infMg = getNum('input-inf-mg');
    const infVol = getNum('input-inf-vol');
    const infUnit = (getVal('select-inf-unit') as 'mcg_kg_min' | 'mcg_min' | 'mg_kg_hr') || 'mcg_kg_min';
    const outInfRate = getEl('output-infusion-rate');
    const infNeedsWeight = infUnit !== 'mcg_min';
    if (infDose !== null && infMg !== null && infVol !== null && (!infNeedsWeight || appState.biometry.weightKg)) {
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
        if (outInfRate) {
            if (infDose !== null && infNeedsWeight && !appState.biometry.weightKg) {
                outInfRate.textContent = 'Kilo giriniz';
            } else {
                outInfRate.textContent = '--';
            }
        }
    }

    // 5. GLUKOZ İNFÜZYON HIZI (GIR)
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
            girContainer.className = `p-2 rounded-lg border text-xs tabular-nums space-y-1.5 bg-slate-900/60 border-slate-700/60`;
            let gHtml = `<div class="flex justify-between items-center">
                <span class="text-slate-400">GIR:</span>
                <span class="text-xs font-bold ${g.alertClass}">${g.gir} mg/kg/dk</span>
            </div>`;
            gHtml += `<div class="text-[10px] ${g.alertClass}">${g.interpretation}</div>`;
            if (g.status === 'LOW' || g.gir < 4) {
                gHtml += `<div class="p-1.5 bg-rose-950/60 border border-rose-700/60 rounded text-rose-300 font-bold text-[9px]">
                    [ACİL] Hipoglisemi Acil Bolus: ${g.hypoglycemiaBolus.instructions}
                </div>`;
            }
            girContainer.innerHTML = gHtml;
        }
    } else {
        appState.medicine.gir = null;
        if (girContainer) girContainer.classList.add('hidden');
    }

    // 6. KARDİYOLOJİ & EKG ANALİZİ (QTc, TİSDALE, AKS)
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

    if (qrsPattern !== 'custom' && (qrs === null || (typeof document !== 'undefined' && document.activeElement === qrsPatternSelect)) && qrsInput) {
        if (qrsPattern === 'normal') qrs = 90;
        else if (qrsPattern === 'lbbb') qrs = 140;
        else if (qrsPattern === 'rbbb') qrs = 130;
        else if (qrsPattern === 'paced') qrs = 160;
        qrsInput.value = String(qrs);
    }

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
           age: appState.biometry.ageYears ?? (appState.biometry.ageMonths ? appState.biometry.ageMonths / 12 : undefined),
           ageMonths: appState.biometry.ageMonths ?? undefined,
           ageDays: appState.biometry.ageDays ?? undefined,
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

        if (c.status === 'BLOCKED' || c.status === 'INVALID_INPUT' || c.status === 'OUT_OF_RANGE') {
            qtcHtml = `<div class="text-rose-400 font-semibold">${c.interpretation}</div>`;
            qtRes.className = 'p-2 rounded-lg space-y-1 tabular-nums mt-2 border bg-rose-950/40 border-rose-600/50';
            qtRes.innerHTML = qtcHtml;
        } else if (c.status === 'INCOMPLETE') {
            qtcHtml = `<div class="text-slate-400 text-xs">${c.interpretation}</div>`;
            qtRes.className = 'p-2 rounded-lg space-y-1 tabular-nums mt-2 border bg-slate-900/60 border-slate-700/50';
            qtRes.innerHTML = qtcHtml;
        } else {
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
                qtcHtml += `<div class="text-rose-400 font-bold text-[10px] mt-0.5">QTcBog (Bogossian - Geniş QRS): ${c.qtcBogossian} ms</div>`;
            }
            
            const interpColor = c.colorCode === 'success' ? 'text-emerald-400' : c.colorCode === 'warning' ? 'text-amber-400' : 'text-rose-400';
            qtcHtml += `<div class="${interpColor} mt-1 font-semibold">${c.interpretation}</div>`;
            
            if (c.tisdaleScore > 0 || c.isPediatricTisdaleWarning) {
                 const tisdaleClass = c.isPediatricTisdaleWarning ? 'text-amber-300 font-normal italic' : 'text-amber-400 font-semibold';
                 qtcHtml += `<div class="text-amber-400 text-[10px] mt-1 pt-1 border-t border-slate-700/50">Tisdale Skoru: ${c.tisdaleScore} <span class="${tisdaleClass}">(${c.tisdaleRisk})</span></div>`;
            }
            if (c.warnings && c.warnings.length > 0) {
                qtcHtml += `<div class="text-rose-400 text-[9px] mt-1 space-y-0.5">${c.warnings.map((w: string) => `<div>${w}</div>`).join('')}</div>`;
            }
            if (c.drugFlags && c.drugFlags.length > 0) {
                qtcHtml += `<div class="text-fuchsia-400 text-[9px] mt-1 space-y-0.5 font-bold">${c.drugFlags.map((f: string) => `<div>${f}</div>`).join('')}</div>`;
            }

            qtRes.innerHTML = qtcHtml;
            const isDanger = c.colorCode === 'danger' || c.colorCode === 'orange';
            qtRes.className = `p-2 rounded-lg space-y-1 tabular-nums mt-2 border ${isDanger ? 'bg-rose-950/40 border-rose-600/50' : c.colorCode === 'warning' ? 'bg-amber-950/40 border-amber-600/50' : 'bg-slate-900/60 border-slate-700/50'}`;
        }
    } else {
        if (qtRes) qtRes.classList.add('hidden');
        appState.other.cardiac = null;
    }

    const ecgD1 = getNum('input-ecg-d1');
    const ecgAvf = getNum('input-ecg-avf');
    const axisRes = getEl('output-ecg-axis');
    if (ecgD1 !== null && ecgAvf !== null && axisRes) {
        const axisObj = calculateAxis(ecgD1, ecgAvf, {
            ageYears: appState.biometry.ageYears,
            ageMonths: appState.biometry.ageMonths,
            ageDays: appState.biometry.ageDays
        });
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

    // 7. ENDOKRİN: STEROİD EŞDEĞERLİĞİ & HOMA-IR
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
            homaRes.className = `p-2 rounded-lg border tabular-nums space-y-1 text-xs ${hm.alertClass}`;
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

    // 8. CENTOR / MCISAAC
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

    // 9. NEFROLOJİ, TOKSİKOLOJİ & PNÖMONİ (FENa, FEUrea, Düzeltilmiş Na, APAP, CURB-65)
    const fenaSNa = getNum('input-fena-s-na') ?? getNum('input-serum-na');
    const fenaUNa = getNum('input-fena-u-na');
    const fenaSCr = getNum('input-fena-s-cr') ?? getNum('input-creatinine');
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
                isOnDiuretics: fenaDiuretic,
                ageDays: ageData.days ?? undefined,
                isNeonate,
                isPreterm: getChk('chk-preterm')
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

    const corrNaMeas = getNum('input-corr-na-meas') ?? getNum('input-serum-na');
    const corrGlu = getNum('input-corr-glucose');
    const osmMeas = getNum('input-osm-measured');
    const osmBun = getNum('input-osm-bun');
    const osmEthanol = getNum('input-osm-ethanol');
    const corrNaOut = getEl('output-corr-na-osm');

    if (corrNaMeas && corrGlu) {
        const corrRes = calculateCorrectedSodium({
            measuredSodium: corrNaMeas,
            glucoseMgDl: corrGlu
        });
        appState.nephroTox.correctedSodium = corrRes;
        let osmRes: any = null;
        if (osmMeas) {
            // HATA-M6-002: Osmolal Açıkta kullanıcı BUN girmişse onu esas al, yoksa feurea'dan al, hiç yoksa undefined
            const bunForOsm = osmBun !== null 
                ? osmBun 
                : (feureaSBun !== null ? (feureaUnit === 'urea' ? +(feureaSBun / 2.14).toFixed(1) : feureaSBun) : undefined);
            const ethanolForOsm = osmEthanol !== null ? osmEthanol : undefined;

            osmRes = calculateOsmolalGap({
                measuredOsmolality: osmMeas,
                sodium: corrNaMeas,
                glucoseMgDl: corrGlu,
                bunMgDl: bunForOsm,
                ethanolMgDl: ethanolForOsm
            });
            appState.nephroTox.osmolalGap = osmRes;
        }
        if (corrRes && corrNaOut) {
            corrNaOut.classList.remove('hidden');
            corrNaOut.innerHTML = `
                <div class="flex justify-between items-center font-bold">
                    <span>${corrRes.formulaNotes?.includes('Hillier 2.4 standardı') ? 'Hillier' : 'Katz'} Düzeltilmiş Na: ${corrRes.correctedSodium} mEq/L</span>
                    <span class="text-slate-400 text-[10px]">Ölçülen: ${corrRes.measuredSodium}</span>
                </div>
                <div class="text-xs text-cyan-300 tabular-nums">${corrRes.formulaNotes || ''}</div>
                <div class="text-[10px] text-slate-300 mt-1">${corrRes.interpretation}</div>
                ${osmRes ? `
                    <div class="pt-1.5 border-t border-slate-700/60 mt-1.5 space-y-1">
                        <div class="flex justify-between items-center font-bold">
                            <span>Osmolal Açık: ${osmRes.osmolalGap} mOsm/kg</span>
                            <span class="${osmRes.isCriticalGap ? 'text-rose-400 font-bold' : (osmRes.isHighGap ? 'text-amber-400 font-bold' : 'text-emerald-400')}">${osmRes.isCriticalGap ? '[KRİTİK YÜKSEK]' : (osmRes.isHighGap ? '[YÜKSEK]' : 'Normal')}</span>
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

    const apapHours = getNum('input-apap-hours');
    const apapLevel = getNum('input-apap-level');
    const apapHighRisk = getChk('chk-apap-high-risk');
    const apapOut = getEl('output-apap-rumack');

    if (apapHours && apapLevel) {
        // HATA-M6-005: Kilo yokken gizli 70 kg atama yapılmaz, hastanın gerçek kilosu verilir
        const apapRes = evaluateRumackMatthew({
            hoursPostIngestion: apapHours,
            paracetamolLevelMcgMl: apapLevel,
            weightKg: appState.biometry.weightKg || undefined,
            isHighRisk: apapHighRisk
        });
        appState.nephroTox.paracetamol = apapRes;
        if (apapRes && apapOut) {
            apapOut.classList.remove('hidden');
            const alertBg = apapRes.isToxic ? 'bg-rose-950/40 border-rose-600/50 text-rose-200' : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200';
            apapOut.className = `p-2.5 rounded-lg border tabular-nums space-y-1.5 text-xs ${alertBg}`;
            let nacHtml = '';
            if (apapRes.nacProtocol) {
                const nac = apapRes.nacProtocol;
                nacHtml = `
                    <div class="pt-1.5 border-t border-rose-700/60 font-semibold text-rose-300 space-y-1">
                        <div class="flex justify-between items-center">
                            <span>IV NAC 21 Saatlik Protokol:</span>
                            ${nac.isPediatricAdjusted ? '<span class="px-1.5 py-0.5 rounded bg-amber-900/60 border border-amber-600 text-amber-300 text-[8px]">Pediatrik Sıvı Korumalı</span>' : ''}
                        </div>
                        <div class="text-[9px] font-normal leading-relaxed">
                            <div>• ${nac.loadingDose}</div>
                            <div>• ${nac.secondDose}</div>
                            <div>• ${nac.thirdDose}</div>
                            <div class="text-amber-300 mt-1">• ${nac.oralAlternative}</div>
                        </div>
                    </div>
                `;
            } else if (apapRes.isToxic && !appState.biometry.weightKg) {
                nacHtml = `
                    <div class="p-2 rounded bg-amber-950/60 border border-amber-700 text-[9px] text-amber-200 mt-1 font-sans">
                        <strong>[Dozaj Güvenlik Kalkanı]:</strong> Hastanın tartı kilosu girilmediğinden miligram bazlı IV NAC ve infüzyon sıvı hacmi hesaplanamadı. Aşırı/eksik dozajı önlemek için lütfen Biyometri kartından hastanın kilosunu giriniz.
                    </div>
                `;
            }
            apapOut.innerHTML = `
                <div class="flex justify-between items-center font-bold">
                    <span>${apapRes.hoursPostIngestion}. Saat: ${apapRes.levelMcgMl} µg/mL (Eşik: ${apapRes.threshold ?? '--'} µg/mL)</span>
                    <span>${apapRes.status === 'LATE_PRESENTATION' ? '[GEÇ BAŞVURU - TOKSİK]' : (apapRes.isToxic ? '[TOKSİK SEVİYE]' : 'Tedavi Çizgisi Altında')}</span>
                </div>
                <div class="text-[10px] leading-relaxed">${apapRes.interpretation}</div>
                ${nacHtml}
            `;
        }
    } else {
        appState.nephroTox.paracetamol = null;
        if (apapOut) apapOut.classList.add('hidden');
    }

    const vitalsRr = getNum('input-rr') ?? getNum('input-resp-rate');
    const vitalsSbp = getNum('input-sys-bp') ?? getNum('input-bp-systolic');
    const vitalsDbp = getNum('input-dia-bp') ?? getNum('input-bp-diastolic');

    const chkCurbREl = getEl<HTMLInputElement>('chk-curb-r');
    if (chkCurbREl && vitalsRr !== null &&
        (typeof document === 'undefined' || document.activeElement !== chkCurbREl)) {
        chkCurbREl.checked = vitalsRr >= 30;
    }

    const chkCurbBEl = getEl<HTMLInputElement>('chk-curb-b');
    if (chkCurbBEl && (vitalsSbp !== null || vitalsDbp !== null) &&
        (typeof document === 'undefined' || document.activeElement !== chkCurbBEl)) {
        const isHypotensive = (vitalsSbp !== null && vitalsSbp < 90) || (vitalsDbp !== null && vitalsDbp <= 60);
        chkCurbBEl.checked = isHypotensive;
    }

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

    if (hasClinicalCurbFindings) {
        const hasBunLab = feureaSBun !== null || curbU;
        const curbRes = calculateCURB65({
            confusion: curbC,
            bunOver19: curbU,
            respiratoryRateGte30: curbR,
            hypotension: curbB,
            ageGte65: curb65,
            ageYears: appState.biometry.ageYears ?? undefined,
            hasBunLab,
            isCRBOnly: !hasBunLab
        });
        appState.nephroTox.curb65 = curbRes;
        if (curbOut) {
            if (curbRes.isPediatricLocked) {
                renderClinicalCardResult(curbOut, {
                    title: 'CURB-65 / CRB-65: Pediatrik Kilit (<18 Yaş)',
                    riskText: 'Pediatrik Kullanım Dışı',
                    subtitle: `<span class="text-amber-400">${curbRes.recommendation}</span>`,
                    extraHtml: `<div class="text-[9px] text-amber-200/80 font-sans leading-relaxed">${curbRes.empiricAntibiotic}</div>`,
                    alertClass: 'warning'
                });
            } else {
                renderClinicalCardResult(curbOut, {
                    title: curbRes.isCRB65Primary 
                        ? `CRB-65: ${curbRes.crbScore}/4 (Birinci Basamak Triyajı)` 
                        : `CURB-65: ${curbRes.score}/5 | CRB-65: ${curbRes.crbScore}/4`,
                    riskText: `${curbRes.mortalityGroup} (Mortalite: %${curbRes.mortalityPercent})`,
                    subtitle: `<span class="text-sky-300">${curbRes.treatmentSetting}</span>`,
                    extraHtml: `
                        <div class="text-[9px] text-amber-200 font-sans leading-relaxed mb-1">${curbRes.empiricAntibiotic}</div>
                        ${curbRes.icuWarning ? `<div class="text-[8.5px] text-rose-300 font-sans mt-0.5">${curbRes.icuWarning}</div>` : ''}
                        ${curbRes.allergyWarning ? `<div class="text-[8.5px] text-slate-400 font-sans mt-0.5">${curbRes.allergyWarning}</div>` : ''}
                    `,
                    alertClass: curbRes.alertClass === 'text-rose-400' ? 'danger' : (curbRes.alertClass === 'text-amber-400' ? 'warning' : 'success')
                });
            }
        }
    } else {
        appState.nephroTox.curb65 = null;
        if (curbOut) curbOut.classList.add('hidden');
    }
}
