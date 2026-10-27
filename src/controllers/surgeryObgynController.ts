/**
 * CERRAHİ VE KADIN DOĞUM KART DENETLEYİCİSİ (SURGERY & OBGYN CONTROLLER)
 * 
 * Alvarado apandisit skoru, ATLS-10 termal & elektriksel yanık sıvı resüsitasyonu,
 * Ranson akut pankreatit kriterleri, cerrahi sütür kılavuzu,
 * Naegele TDT/gestasyonel hafta, Bishop doğum indüksiyonu ve preeklampsi taraması.
 */

import { appState } from '../state';
import type { PatientAgeResult } from './biometryController';
import { renderClinicalCardResult } from './biometryController';
import { 
    calculateAlvarado, 
    calculateParkland, 
    calculateRanson, 
    getSutureGuidance,
    type BurnProtocolType 
} from '../engines/surgeryEngine';
import { 
    calculateObstetrics, 
    calculateBishop, 
    calculatePreeclampsia 
} from '../engines/obgynEngine';
import { getEl, getVal, getNum, getChk, escapeHtml } from '../utils/domUtils';

export function updateSurgeryObgynCard(ageData: PatientAgeResult): void {
    const y = ageData.y;
    const m = ageData.m;
    const totalMonths = (y === null && m === null) ? null : (m !== null ? m : (y !== null ? y * 12 : null));

    // 1. ALVARADO AKUT APANDİSİT SKORU
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

    // 2. YANIK SIVI RESÜSİTASYONU (ATLS-10 MODİFİYE BROOKE & PARKLAND)
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
    } else if (tbsa && !appState.biometry.weightKg && pkRes) {
        appState.surgery.parkland = null;
        pkRes.classList.remove('hidden');
        pkRes.innerHTML = `<span class="text-amber-400 text-xs">⚠️ Yanık sıvı hesabı için lütfen hasta kilosunu (kg) giriniz.</span>`;
    } else {
        appState.surgery.parkland = null;
        if (pkRes) pkRes.classList.add('hidden');
    }

    // 3. RANSON AKUT PANKREATİT KRİTERLERİ (0. ve 48. Saat)
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
    if (hasOtherRanson && y !== null && y > 55 && chkRansonAgeEl && typeof document !== 'undefined' && document.activeElement !== chkRansonAgeEl) {
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

    // 4. SÜTÜR REHBERİ
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

    // 5. OBSTETRİK & JİNEKOLOJİ (OB/GYN)
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
}
