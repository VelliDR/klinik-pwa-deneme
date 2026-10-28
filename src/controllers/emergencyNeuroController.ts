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

if (typeof document !== 'undefined') {
    document.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const id = target.id;
        if (id.startsWith('select-heart-')) {
            target.dataset.userModified = 'true';
        }
        if (id === 'chk-af-age75' && (target as HTMLInputElement).checked) {
            target.dataset.userModified = 'true';
            const el65 = document.getElementById('chk-af-age65') as HTMLInputElement | null;
            if (el65) el65.checked = false;
        } else if (id === 'chk-af-age65' && (target as HTMLInputElement).checked) {
            target.dataset.userModified = 'true';
            const el75 = document.getElementById('chk-af-age75') as HTMLInputElement | null;
            if (el75) el75.checked = false;
        }
        if (id === 'chk-af-female') {
            target.dataset.userModified = 'true';
        }
        if (id === 'chk-bleeding-elderly') {
            target.dataset.userModified = 'true';
        }
    }, true);
}

export function updateEmergencyNeuroCard(ageData: PatientAgeResult): void {
    const y = ageData.y;
    const m = ageData.m;
    const totalMonths = y !== null ? (y * 12 + (m || 0)) : m;
    const isPediatric = (y !== null && y < 2) || (totalMonths !== null && totalMonths < 24);
    const isUnder18 = (y !== null && y < 18);

    // 1. GLASGOW KOMA SKALASI (GCS / pGCS)
    const titleEl = getEl('title-gcs-card');
    const labelV = getEl('label-gcs-v');
    const labelM = getEl('label-gcs-m');
    const selectV = getEl('select-gcs-v') as HTMLSelectElement | null;
    const selectM = getEl('select-gcs-m') as HTMLSelectElement | null;

    if (titleEl) {
        titleEl.textContent = isPediatric ? 'Pediatrik Glasgow Koma Skalası (pGCS)' : 'Glasgow Koma Skalası (GCS)';
    }
    if (labelV) {
        labelV.textContent = isPediatric ? 'Sözel Yanıt (Preverbal pGCS)' : 'Sözel Yanıt (V)';
    }
    if (labelM) {
        labelM.textContent = isPediatric ? 'Motor Yanıt (Preverbal pGCS)' : 'Motor Yanıt (M)';
    }

    // Seçenekleri dinamik olarak yaşa göre adapte edelim (mevcut seçimi koruyarak)
    if (selectV && selectV.dataset.mode !== (isPediatric ? 'ped' : 'adult')) {
        const curV = selectV.value;
        selectV.dataset.mode = isPediatric ? 'ped' : 'adult';
        if (isPediatric) {
            selectV.innerHTML = `
                <option value="">-- Seçiniz --</option>
                <option value="5">5: Yaşına uygun agular, babıldar, gülümser</option>
                <option value="4">4: Ağlar fakat teselli edilebilir</option>
                <option value="3">3: Sürekli ağlar, sakinleştirilemez</option>
                <option value="2">2: Huzursuz inleme / anlamsız sesler</option>
                <option value="1">1: Yanıtsız</option>
                <option value="1T">1T: Entübe / Trakeostomi</option>
            `;
        } else {
            selectV.innerHTML = `
                <option value="">-- Seçiniz --</option>
                <option value="5">5: Oryante</option>
                <option value="4">4: Konfüze</option>
                <option value="3">3: Uygunsuz söz</option>
                <option value="2">2: Anlamsız sesler</option>
                <option value="1">1: Yanıtsız</option>
                <option value="1T">1T: Entübe / Trakeostomi</option>
            `;
        }
        if (curV) selectV.value = curV;
    }

    if (selectM && selectM.dataset.mode !== (isPediatric ? 'ped' : 'adult')) {
        const curM = selectM.value;
        selectM.dataset.mode = isPediatric ? 'ped' : 'adult';
        if (isPediatric) {
            selectM.innerHTML = `
                <option value="">-- Seçiniz --</option>
                <option value="6">6: Spontan / amaca yönelik hareket</option>
                <option value="5">5: Dokunulduğunda geri çeker</option>
                <option value="4">4: Ağrılı uyarandan kaçar (fleksiyon)</option>
                <option value="3">3: Anormal fleksiyon (dekortike)</option>
                <option value="2">2: Anormal ekstansiyon (deserebre)</option>
                <option value="1">1: Yanıtsız / flask</option>
            `;
        } else {
            selectM.innerHTML = `
                <option value="">-- Seçiniz --</option>
                <option value="6">6: Emirlere uyar</option>
                <option value="5">5: Ağrıyı lokalize eder</option>
                <option value="4">4: Ağrıdan kaçar (fleksiyon)</option>
                <option value="3">3: Dekortike postür</option>
                <option value="2">2: Deserebre postür</option>
                <option value="1">1: Yanıtsız</option>
            `;
        }
        if (curM) selectM.value = curM;
    }

    const gcsE = getNum('select-gcs-e');
    const gcsVRaw = selectV ? selectV.value : null;
    const gcsM = getNum('select-gcs-m');
    const gRes = getEl('container-gcs-warnings');

    if (gcsE && gcsVRaw && gcsM && gRes) {
        const gcsVal = calculateGCS(gcsE, gcsVRaw, gcsM, { isPediatric });
        if (isPediatric) {
            appState.pediatrics.pgcs = gcsVal;
            appState.medicine.gcs = gcsVal;
        } else {
            appState.medicine.gcs = gcsVal;
            appState.pediatrics.pgcs = null;
        }

        if (gcsVal) {
            gRes.classList.remove('hidden');
            const isSevere = gcsVal.total <= 8;
            const isModerate = gcsVal.total >= 9 && gcsVal.total <= 12;
            
            // Renk ve stil ataması (HATA-M4-004)
            if (isSevere && !gcsVal.isEntubated) {
                gRes.className = 'text-[10px] p-2.5 border rounded-lg space-y-1 bg-rose-950/40 border-rose-600/50 text-rose-200';
            } else if (isModerate || (isSevere && gcsVal.isEntubated)) {
                gRes.className = 'text-[10px] p-2.5 border rounded-lg space-y-1 bg-amber-950/40 border-amber-600/50 text-amber-200';
            } else {
                gRes.className = 'text-[10px] p-2.5 border rounded-lg space-y-1 bg-emerald-950/40 border-emerald-600/50 text-emerald-200';
            }

            const title = isPediatric ? 'pGCS' : 'GCS';
            const scoreStr = gcsVal.formattedScore || `${gcsVal.total}`;
            let html = `<div class="font-bold text-xs">${title}: ${scoreStr} (${gcsVal.interpretation})</div>`;
            if (gcsVal.airwayRisk) {
                const alertColor = gcsVal.isEntubated ? 'text-amber-400 font-semibold' : 'text-rose-400 font-bold';
                html += `<div class="${alertColor}">${gcsVal.airwayRisk}</div>`;
            }
            gRes.innerHTML = html;

            // HATA-M4-005: AVPU ile Çapraz Senkronizasyon ve Güvenlik Kalkanı
            const avpuSelect = getEl('input-avpu') as HTMLSelectElement | null;
            if (avpuSelect) {
                let mappedAvpu = 'A';
                if (gcsVal.total <= 7) mappedAvpu = 'U';
                else if (gcsVal.total <= 11) mappedAvpu = 'P';
                else if (gcsVal.total <= 14) mappedAvpu = 'V';
                else mappedAvpu = 'A';

                // Eğer derin komada (GCS <= 8) hasta AVPU'da hala 'A' (Alert) ise veya AVPU seçilmemişse
                if ((gcsVal.total <= 8 && avpuSelect.value === 'A') || avpuSelect.value === '') {
                    avpuSelect.value = mappedAvpu;
                    avpuSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        } else {
            gRes.classList.add('hidden');
        }
    } else {
        appState.medicine.gcs = null;
        appState.pediatrics.pgcs = null;
        if (gRes) gRes.classList.add('hidden');
    }

    // 2. TROMBOEMBOLİ & KARDİYAK ACİL SKORLARI
    // Vitaller ve Demografiden Wells PTE ve PERC otomatik senkronizasyon (HATA-M5-004)
    const nHr = getNum('input-hr');
    const nSpo2 = getNum('input-spo2');

    const chkPeHr = getEl('chk-pe-hr-100') as HTMLInputElement | null;
    const chkPercAge = getEl('chk-perc-age') as HTMLInputElement | null;
    const chkPercHr = getEl('chk-perc-hr') as HTMLInputElement | null;
    const chkPercSpo2 = getEl('chk-perc-spo2') as HTMLInputElement | null;

    if (ageData.y !== null && chkPercAge && !chkPercAge.dataset.userModified) {
        chkPercAge.checked = ageData.y >= 50;
    }
    if (nHr !== null) {
        if (chkPeHr && !chkPeHr.dataset.userModified) chkPeHr.checked = nHr > 100;
        if (chkPercHr && !chkPercHr.dataset.userModified) chkPercHr.checked = nHr >= 100;
    }
    if (nSpo2 !== null) {
        if (chkPercSpo2 && !chkPercSpo2.dataset.userModified) chkPercSpo2.checked = nSpo2 < 95;
    }

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
            alternativeDiagnosisLikely: dvtAlt,
            ageYears: ageData.y
        });
        appState.thrombosis.wellsDVT = dvtRes;
        if (dvtOut) {
            renderClinicalCardResult(dvtOut, {
                title: `Wells DVT: ${dvtRes.score} Puan`,
                riskText: `${dvtRes.riskCategory} (${dvtRes.probability})`,
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

    let peRes: ReturnType<typeof calculateWellsPTE> | null = null;
    if (peDvt || peAlt || peHr || peImm || pePrev || peHemo || peMal) {
        peRes = calculateWellsPTE({
            clinicalSignsOfDVT: peDvt,
            peLikelyOrMoreLikelyThanAlt: peAlt,
            heartRateOver100: peHr,
            immobilizationOrSurgery: peImm,
            previousDvtOrPe: pePrev,
            hemoptysis: peHemo,
            malignancy: peMal,
            ageYears: ageData.y
        });
        appState.thrombosis.wellsPTE = peRes;
        if (peOut) {
            renderClinicalCardResult(peOut, {
                title: `Wells PTE: ${peRes.score} Puan`,
                riskText: `İki Kademeli: ${peRes.twoTierRisk.risk} | Üç Kademeli: ${peRes.threeTierRisk.risk} (${peRes.threeTierRisk.tier})`,
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
    const detailsPerc = getEl('details-perc') as HTMLDetailsElement | null;

    const shouldEvalPerc = detailsPerc?.open || (peRes !== null && peRes.score < 2.0) || (percAge || percHr || percSpo2 || percSwelling || percHemo || percSurg || percHist || percEst);

    if (shouldEvalPerc) {
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
                title: percRes.isPERCNegative ? '✓ PERC NEGATİF (0 Kriter): D-Dimer veya BTPA Gerekmez' : `PERC POZİTİF (${percRes.positiveCount} Kriter)`,
                recommendations: percRes.recommendations,
                alertClass: percRes.alertClass === 'success' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800' : 'text-amber-400 bg-amber-950/40 border-amber-800'
            });
        }
    } else {
        appState.thrombosis.perc = null;
        if (percOut) percOut.classList.add('hidden');
    }

    // D. HEART Score
    const selectHeartHist = getEl('select-heart-history') as HTMLSelectElement | null;
    const selectHeartEcg = getEl('select-heart-ecg') as HTMLSelectElement | null;
    const selectHeartAge = getEl('select-heart-age') as HTMLSelectElement | null;
    const selectHeartRisk = getEl('select-heart-risk') as HTMLSelectElement | null;
    const selectHeartTrop = getEl('select-heart-troponin') as HTMLSelectElement | null;
    const heartOut = getEl('output-heart-score');
    const cardTromboz = getEl('card-tromboz') as HTMLDetailsElement | null;

    // HATA-M5-008: Demografik yaştan select-heart-age otomatik senkronizasyonu
    if (y !== null && selectHeartAge && !selectHeartAge.dataset.userModified) {
        if (y >= 65) {
            selectHeartAge.value = '2';
        } else if (y >= 45) {
            selectHeartAge.value = '1';
        } else {
            selectHeartAge.value = '0';
        }
    }

    const hHist = getNum('select-heart-history') || 0;
    const hEcg = getNum('select-heart-ecg') || 0;
    const hAge = getNum('select-heart-age') || 0;
    const hRisk = getNum('select-heart-risk') || 0;
    const hTrop = getNum('select-heart-troponin') || 0;

    const heartHasPoints = (hHist > 0 || hEcg > 0 || hAge > 0 || hRisk > 0 || hTrop > 0);
    const heartUserTouched = Boolean(
        selectHeartHist?.dataset.userModified ||
        selectHeartEcg?.dataset.userModified ||
        selectHeartAge?.dataset.userModified ||
        selectHeartRisk?.dataset.userModified ||
        selectHeartTrop?.dataset.userModified
    );

    // HATA-M5-006: card-tromboz açıkken veya kullanıcı kutulara dokunduğunda 0 puanda dahi yeşil dışlama kartı basılmalıdır.
    const shouldEvalHeart = Boolean(cardTromboz?.open || heartHasPoints || heartUserTouched || !cardTromboz);

    if (shouldEvalHeart && selectHeartHist) {
        const heartRes = calculateHEART({
            historyPoints: hHist,
            ecgPoints: hEcg,
            agePoints: hAge,
            riskFactorsPoints: hRisk,
            troponinPoints: hTrop,
            ageYears: y
        });
        appState.thrombosis.heart = heartRes;
        if (heartOut) {
            renderClinicalCardResult(heartOut, {
                title: `HEART Skoru: ${heartRes.score}/10`,
                riskText: `${heartRes.riskCategory} (%${heartRes.maceRatePercent} MACE)`,
                subtitle: isUnder18 ? 'HEART skoru erişkin AKS içindir; pediatrik yaşta (<18 yaş) valide edilmemiştir.' : undefined,
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

    // HATA-M5-007 & HATA-M5-009: hasAfRisk şartı kaldırıldı; hastanın yaşı ve cinsiyeti demografide mevcutsa
    // otomatik doldurulur (pediatrik hastalar hariç).
    if (typeof document !== 'undefined' && !isUnder18) {
        if (chkAfFemaleEl && !chkAfFemaleEl.dataset.userModified && document.activeElement !== chkAfFemaleEl) {
            chkAfFemaleEl.checked = (appState.biometry.gender === 'female' || appState.biometry.gender === 'F');
        }
        if (y !== null) {
            if (chkAfAge75El && !chkAfAge75El.dataset.userModified && document.activeElement !== chkAfAge75El) {
                chkAfAge75El.checked = y >= 75;
            }
            if (chkAfAge65El && !chkAfAge65El.dataset.userModified && document.activeElement !== chkAfAge65El) {
                chkAfAge65El.checked = (y >= 65 && y < 75);
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
            age: y,
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
                subtitle: isUnder18 ? 'CHA₂DS₂-VASc erişkin atriyal fibrilasyonu içindir; pediatrik yaşta (<18 yaş) geçerli değildir.' : undefined,
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
    const detailsHasbled = getEl('details-hasbled') as HTMLDetailsElement | null;

    // HATA-M5-007 & HATA-M5-009: hasBleedRisk şartı kaldırıldı; yaş >= 65 ise otomatik senkronize edilir (pediatride engellenir)
    if (typeof document !== 'undefined' && !isUnder18 && chkBleedElderlyEl && !chkBleedElderlyEl.dataset.userModified && document.activeElement !== chkBleedElderlyEl) {
        if (y !== null) {
            chkBleedElderlyEl.checked = y >= 65;
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

    const shouldEvalHasbled = Boolean(detailsHasbled?.open || bHtn || bRenal || bLiver || bStroke || bHist || bInr || bElderly || bDrugs || bAlc);

    if (shouldEvalHasbled && chkBleedElderlyEl) {
        const bRes = calculateHASBLED({
            hypertensionUncontrolled: bHtn,
            abnormalRenalFunction: bRenal,
            abnormalLiverFunction: bLiver,
            priorStroke: bStroke,
            bleedingHistoryOrPredisposition: bHist,
            labileINR: bInr,
            elderlyOver65: bElderly,
            drugsConcomitant: bDrugs,
            alcoholExcess: bAlc,
            age: y
        });
        appState.thrombosis.hasbled = bRes;
        if (hasbledOut) {
            renderClinicalCardResult(hasbledOut, {
                title: `HAS-BLED: ${bRes.score} Puan`,
                riskText: bRes.bleedingRiskCategory,
                subtitle: isUnder18 ? 'HAS-BLED erişkin antikoagülasyonu içindir; pediatrik yaşta (<18 yaş) geçerli değildir.' : undefined,
                recommendations: bRes.recommendations,
                alertClass: bRes.alertClass === 'danger' ? 'text-rose-400' : 'text-emerald-400'
            });
        }
    } else {
        appState.thrombosis.hasbled = null;
        if (hasbledOut) hasbledOut.classList.add('hidden');
    }
}
