/**
 * ACİL NÖROLOJİ VE TROMBOEMBOLİ KART DENETLEYİCİSİ (EMERGENCY NEURO & THROMBOSIS CONTROLLER)
 * 
 * Glasgow Koma Skalası (GCS / pGCS), Wells DVT, Wells PTE, PERC Kuralı,
 * HEART Göğüs Ağrısı Skoru, Atriyal Fibrilasyon CHA2DS2-VASc ve HAS-BLED Kanaması.
 */

import { appState } from '../state';
import type { PatientAgeResult } from './biometryController';
import { renderClinicalCardResult } from './biometryController';
import { calculateGCS } from '../engines/triageEngine';
import { 
    calculateWellsDVT, 
    calculateWellsPTE, 
    evaluatePERC, 
    calculateHEART, 
    calculateCHA2DS2VASc, 
    calculateHASBLED 
} from '../engines/thrombosisEngine';
import { getEl, getNum, getChk } from '../utils/domUtils';

export function updateEmergencyNeuroCard(ageData: PatientAgeResult): void {
    const y = ageData.y;

    // 1. GLASGOW KOMA SKALASI (GCS)
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

    // 2. TROMBOEMBOLİ & KARDİYAK ACİL SKORLARI
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
    const chkAfFemaleEl = getEl<HTMLInputElement>('chk-af-female');
    const chkAfAge75El = getEl<HTMLInputElement>('chk-af-age75');
    const chkAfAge65El = getEl<HTMLInputElement>('chk-af-age65');
    const afChfRaw = getChk('chk-af-chf');
    const afHtnRaw = getChk('chk-af-htn');
    const afDmRaw = getChk('chk-af-dm');
    const afStrokeRaw = getChk('chk-af-stroke');
    const afVascRaw = getChk('chk-af-vasc');
    const hasAfRisk = afChfRaw || afHtnRaw || afDmRaw || afStrokeRaw || afVascRaw;

    if (hasAfRisk && typeof document !== 'undefined') {
        if (chkAfFemaleEl && document.activeElement !== chkAfFemaleEl) {
            chkAfFemaleEl.checked = (appState.biometry.gender === 'female' || appState.biometry.gender === 'F');
        }
        if (y !== null) {
            if (y >= 75) {
                if (chkAfAge75El && document.activeElement !== chkAfAge75El) chkAfAge75El.checked = true;
                if (chkAfAge65El && document.activeElement !== chkAfAge65El) chkAfAge65El.checked = false;
            } else if (y >= 65) {
                if (chkAfAge65El && document.activeElement !== chkAfAge65El) chkAfAge65El.checked = true;
                if (chkAfAge75El && document.activeElement !== chkAfAge75El) chkAfAge75El.checked = false;
            }
        }
    }

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
    const chkBleedElderlyEl = getEl<HTMLInputElement>('chk-bleeding-elderly');
    const bHtnRaw = getChk('chk-bleeding-htn');
    const bRenalRaw = getChk('chk-bleeding-renal');
    const bLiverRaw = getChk('chk-bleeding-liver');
    const bStrokeRaw = getChk('chk-bleeding-stroke');
    const bHistRaw = getChk('chk-bleeding-history');
    const bInrRaw = getChk('chk-bleeding-inr');
    const bDrugsRaw = getChk('chk-bleeding-drugs');
    const bAlcRaw = getChk('chk-bleeding-alcohol');
    const hasBleedRisk = bHtnRaw || bRenalRaw || bLiverRaw || bStrokeRaw || bHistRaw || bInrRaw || bDrugsRaw || bAlcRaw;
    if (hasBleedRisk && typeof document !== 'undefined' && chkBleedElderlyEl && document.activeElement !== chkBleedElderlyEl) {
        if (y !== null && y >= 65) {
            chkBleedElderlyEl.checked = true;
        }
    }

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
}
