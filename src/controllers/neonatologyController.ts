/**
 * NEONATOLOJİ VE YENİDOĞAN KART DENETLEYİCİSİ (NEONATOLOGY CONTROLLER)
 * 
 * AAP 2022 / TND 2014 Hiperbilirubinemi (Delta modeli, TcB kalkanı, Escalation of Care),
 * Preterm Maisels 2012 konsensüsü, TND kademeli günlük yenidoğan sıvı titrasyonu,
 * APGAR skoru, Westley krup skoru ve CDS dehidratasyon & ORS hesaplayıcısı.
 */

import { appState } from '../state';
import type { PatientAgeResult } from './biometryController';
import { renderClinicalCardResult } from './biometryController';
import { 
    calculateBhutaniJaundice, 
    calculateAPGAR, 
    calculateWestleyCroup, 
    calculateCDSDehydration 
} from '../engines/neonatologyEngine';
import { evaluateAap2022Jaundice } from '../engines/jaundiceEngine';
import { calculateNeonatalFluid } from '../engines/fluidEngine';
import type { BhutaniGuideline, BilirubinMeasurementType } from '../types/engines';
import { getEl, getVal, getNum, getChk, escapeHtml } from '../utils/domUtils';

export function updateNeonatologyCard(ageData: PatientAgeResult): void {
    const isNeonate = (ageData.days !== null && ageData.days !== undefined && ageData.days <= 28);
    const isPreterm = getChk('chk-preterm');
    const pretermGw = getNum('input-gestational-weeks');

    // 1. HİPERBİLİRUBİNEMİ (AAP 2022 / TND 2014)
    const bAgeH = getNum('input-bhutani-age-hours');
    const bTsb = getNum('input-bhutani-tsb');
    const bGw = getNum('input-bhutani-gw') || (isPreterm && pretermGw ? pretermGw : 39);
    const bRisk = getChk('chk-bhutani-risk-factors');
    const bGuideline: BhutaniGuideline = getVal('select-bhutani-guideline') === 'TND_2014' ? 'TND_2014' : 'AAP_2022';
    const bMethod: BilirubinMeasurementType = getVal('select-bhutani-method') === 'TcB' ? 'TcB' : 'TSB';
    const bhutaniOut = getEl('output-bhutani-result');

    const bAlbumin = getNum('input-bhutani-albumin');
    const bDirect = getNum('input-bhutani-direct');
    const bPrevTsb = getNum('input-bhutani-prev-tsb');
    const bPrevHours = getNum('input-bhutani-prev-hours');
    const bDat = getChk('chk-bhutani-dat');
    const bG6pd = getChk('chk-bhutani-g6pd');
    const bSepsis = getChk('chk-bhutani-sepsis');
    const bAbe = getChk('chk-bhutani-abe');
    const bDischarge = getChk('chk-bhutani-discharge');
    const bPriorPt = getChk('chk-bhutani-prior-pt');
    const bRebound = getChk('chk-bhutani-rebound');
    const bPtStartAge = getNum('input-bhutani-pt-start');

    if (bAgeH && bTsb) {
        if (bGuideline === 'AAP_2022') {
            const aapRes = evaluateAap2022Jaundice({
                ageHours: bAgeH,
                totalBilirubin: bTsb,
                gestationalWeeks: bGw,
                measurementType: bMethod,
                hasNeurotoxicityRisk: bRisk,
                albuminGPerDl: bAlbumin,
                directBilirubinMgDl: bDirect,
                previousTsbMgDl: bPrevTsb,
                previousAgeHours: bPrevHours,
                isDischargePlanning: bDischarge,
                priorPhototherapyWithin24h: bPriorPt,
                isPhototherapyDiscontinuationEvaluation: bRebound,
                phototherapyStartAgeHours: bPtStartAge,
                riskFactors: {
                    hypoalbuminemia: bAlbumin !== null && bAlbumin < 3.0,
                    isoimmuneHemolysis: bDat,
                    g6pdDeficiency: bG6pd,
                    sepsis: bSepsis
                },
                abeSymptoms: bAbe ? {
                    retrocollis: true,
                    opisthotonos: true,
                    highPitchedCry: true,
                    hypertonia: true
                } : undefined
            });

            appState.neonatology.bhutani = {
                isValid: aapRes.isValid,
                ageHours: aapRes.ageHours,
                totalBilirubin: aapRes.totalBilirubin,
                gestationalWeeks: aapRes.gestationalAge.truncatedWeeks,
                phototherapyThreshold: aapRes.thresholds.phototherapy,
                escalationThreshold: aapRes.thresholds.escalation,
                exchangeThreshold: aapRes.thresholds.exchange,
                deltaFromPhototherapy: aapRes.deltaFromPhototherapy,
                status: aapRes.status,
                alertClass: aapRes.alertClass,
                requiresTsbConfirmation: aapRes.requiresTsbConfirmation,
                tsbConfirmationReason: aapRes.tsbConfirmationReason,
                guidelineLabel: 'AAP 2022 (Doğrusal Enterpolasyonlu Güncel Kılavuz)',
                riskGroupLabel: aapRes.hasNeurotoxicityRisk ? 'Nörotoksisite Riski VAR' : 'Nörotoksisite Riski YOK',
                interpretation: aapRes.interpretation,
                recommendations: aapRes.recommendations,
                followUpRecommendation: aapRes.followUpRecommendation
            };

            if (bhutaniOut) {
                const escStr = ` | Bakım Eskalasyonu: ${aapRes.thresholds.escalation} mg/dL`;
                let extra = `
                    <div class="text-[9px] text-cyan-300 font-semibold">AAP 2022 (Doğrusal Enterpolasyon & Tamamlanmış Hafta: ${aapRes.gestationalAge.truncatedWeeks}h)</div>
                    <div class="text-[10px]">Fototerapi: ${aapRes.thresholds.phototherapy} mg/dL${escStr} | Kan Değişimi: ${aapRes.thresholds.exchange} mg/dL (Fark Δ: ${aapRes.deltaFromPhototherapy > 0 ? '-' : '+'}${Math.abs(aapRes.deltaFromPhototherapy)} mg/dL)</div>
                    <div class="text-[10px] font-semibold">${escapeHtml(aapRes.interpretation)}</div>
                `;

                if (aapRes.tcBValidity && !aapRes.tcBValidity.isValidForTreatmentDecision) {
                    extra += `
                        <div class="text-[9px] bg-amber-950/40 border border-amber-700/60 p-1.5 rounded mt-1 space-y-0.5 text-amber-200">
                            <div class="font-bold text-amber-300">⚠️ TcB DOĞRULAMA KALKANI (AAP 2022 KAS 6)</div>
                            <div>• ${escapeHtml(aapRes.tcBValidity.warning || '')}</div>
                        </div>
                    `;
                }

                if (aapRes.rateOfRiseAnalysis) {
                    const r = aapRes.rateOfRiseAnalysis;
                    extra += `
                        <div class="text-[9px] ${r.isRapidRise ? 'text-rose-400 font-bold' : 'text-slate-300'} pt-0.5">
                            ⚡ Saatlik Artış: ${r.rateMgDlPerHour} mg/dL/saat (Eşik: ≥${r.thresholdMgDlPerHour}) ${r.isRapidRise ? '— 🚨 PATOLOJİK HEMOLİZ ŞÜPHESİ!' : '— Normal Klirens'}
                        </div>
                    `;
                }

                if (aapRes.bilirubinAlbuminRatio) {
                    const ba = aapRes.bilirubinAlbuminRatio;
                    extra += `
                        <div class="text-[9px] ${ba.isThresholdExceeded ? 'text-rose-400 font-bold' : 'text-slate-300'} pt-0.5">
                            🧪 B/A Oranı: ${ba.ratio} mg/g (Eşik: ${ba.threshold} mg/g) ${ba.isThresholdExceeded ? '— 🚨 KAN DEĞİŞİMİ SINIRI AŞILDI!' : '— Güvenli'}
                        </div>
                    `;
                }

                if (aapRes.escalationProtocol && aapRes.escalationProtocol.isEscalationActive) {
                    const esc = aapRes.escalationProtocol;
                    extra += `
                        <div class="text-[9px] bg-rose-950/40 border border-rose-700/60 p-1.5 rounded mt-1 space-y-0.5 text-rose-200">
                            <div class="font-bold text-rose-300">🚨 ACİL BAKIM ESKALASYONU PROTOKOLÜ (KAS 17)</div>
                            <div>• ${escapeHtml(esc.targetNicuTransfer)}</div>
                            <div>• ${escapeHtml(esc.phototherapyRegimen)}</div>
                            <div>• ${escapeHtml(esc.hydrationProtocol)}</div>
                            ${esc.ivigProtocol ? `<div class="text-amber-300 font-semibold">• IVIG Protokolü: ${escapeHtml(esc.ivigProtocol.dose)} (${escapeHtml(esc.ivigProtocol.indication)})</div>` : ''}
                        </div>
                    `;
                }

                if (aapRes.reboundEvaluation) {
                    const reb = aapRes.reboundEvaluation;
                    const rebColor = reb.isHighReboundRisk ? 'rose' : 'teal';
                    extra += `
                        <div class="text-[9px] bg-${rebColor}-950/40 border border-${rebColor}-700/60 p-1.5 rounded mt-1 space-y-0.5 text-${rebColor}-200">
                            <div class="font-bold text-${rebColor}-300">🔄 FOTOTERAPİ SONLANDIRMA & REBOUND İZLEM (KAS 14 & 15)</div>
                            <div>• FT Kesilme Durumu: <strong>${reb.isDiscontinuationPermitted ? '✅ FT Kesilebilir' : '⛔ FT Kesilemez (TSB henüz eşiğin 2 mg/dL altına inmedi)'}</strong> (Kesilme Eşiği: ${reb.discontinuationThreshold} mg/dL)</div>
                            <div>• Rebound Risk Düzeyi: <strong>${reb.riskTier === 'HIGH_REBOUND_RISK' ? '🚨 YÜKSEK RİSK' : '✅ DÜŞÜK RİSK'}</strong> (Kontrol: ${reb.reboundFollowUpHours})</div>
                            <div>• ${escapeHtml(reb.protocol)}</div>
                        </div>
                    `;
                }

                if (aapRes.dischargeEvaluation) {
                    const dc = aapRes.dischargeEvaluation;
                    const dcColor = dc.isDischargeEligible ? 'teal' : 'amber';
                    extra += `
                        <div class="text-[9px] bg-${dcColor}-950/40 border border-${dcColor}-700/60 p-1.5 rounded mt-1 space-y-0.5 text-${dcColor}-200">
                            <div class="font-bold text-${dcColor}-300">📋 TABURCULUK İZLEM MATRİSİ (AAP 2022 TABLO 4 | Δ: ${dc.deltaMgDl} mg/dL [${dc.matrixBand}])</div>
                            <div>• Önerilen Zamanlama: <strong>${escapeHtml(dc.followUpTiming)}</strong> (${dc.followUpModality})</div>
                            <div>• ${escapeHtml(dc.dischargeRecommendation)}</div>
                        </div>
                    `;
                }

                if (aapRes.clinicalAlerts && aapRes.clinicalAlerts.length > 0) {
                    extra += '<div class="space-y-1 pt-1">';
                    for (const al of aapRes.clinicalAlerts) {
                        const bg = al.severity === 'CRITICAL' ? 'bg-rose-900/40 text-rose-200 border-rose-700/50' : 'bg-amber-900/40 text-amber-200 border-amber-700/50';
                        extra += `<div class="text-[9px] p-1 rounded border ${bg}"><strong>${escapeHtml(al.title)}:</strong> ${escapeHtml(al.message)}</div>`;
                    }
                    extra += '</div>';
                }

                if (aapRes.gestationalAge.isPreterm && aapRes.pretermGuidance) {
                    const pg = aapRes.pretermGuidance;
                    extra += `
                        <div class="text-[9px] bg-sky-950/40 border border-sky-700/60 p-1.5 rounded mt-1 space-y-0.5 text-sky-200">
                            <div class="font-bold text-sky-300">👶 PREMATÜRE MAISELS 2012 PMA & TND PROTOKOLÜ (PMA: ${pg.pmaWeeks} Hafta)</div>
                            <div>• Maisels FT Bandı: ${escapeHtml(pg.maiselsPhototherapyRange)}</div>
                            <div>• Maisels Kan Değişimi: ${escapeHtml(pg.maiselsExchangeRange)}</div>
                            <div>• TND 2023 / NICE Preterm Eşiği: ${pg.tndNiceThreshold} mg/dL</div>
                        </div>
                    `;
                }

                renderClinicalCardResult(bhutaniOut, {
                    title: `${aapRes.ageHours}. Saat: ${bMethod} ${aapRes.totalBilirubin} mg/dL (${aapRes.hasNeurotoxicityRisk ? 'Riskli Eğri' : 'Risksiz Eğri'})`,
                    riskText: aapRes.status,
                    recommendations: aapRes.recommendations,
                    alertClass: aapRes.alertClass,
                    extraHtml: extra
                });
            }
        } else {
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
        }
    } else {
        appState.neonatology.bhutani = null;
        if (bhutaniOut) bhutaniOut.classList.add('hidden');
    }

    // 2. YENİDOĞAN KADEMELİ GÜNLÜK SIVI (TND 2023)
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
        const birthWeightKg = appState.biometry.birthWeightG ? appState.biometry.birthWeightG / 1000 : undefined;
        const neoFluid = calculateNeonatalFluid({
            ageDays: ageData.days,
            weightKg: appState.biometry.weightKg,
            birthWeightKg: birthWeightKg,
            gestationalWeeks: bGw || undefined,
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
                const catLabel = neoFluid.weightCategory === 'PRETERM_ELBW' ? ' [ELBW <1000g]' : (neoFluid.weightCategory === 'PRETERM_VLBW' ? ' [VLBW]' : '');
                if (neoFluidDayText) neoFluidDayText.textContent = `🍼 ${neoFluid.dayTitle}${catLabel} (${neoFluid.mlPerKgRange} mL/kg)`;
                if (neoFluidTargetText) neoFluidTargetText.textContent = `GIR: ${neoFluid.girMgKgMin} mg/kg/dk`;
                let bannerHtml = `${neoFluid.soluteAdvice}`;
                if (neoFluid.incubatorHumidityRecommendation) {
                    bannerHtml += `<span class="text-cyan-300 font-semibold block mt-0.5">💧 ${escapeHtml(neoFluid.incubatorHumidityRecommendation)}</span>`;
                }
                if (neoFluid.weightLossAnalysis && neoFluid.weightLossAnalysis.warning) {
                    bannerHtml += `<span class="text-rose-400 font-bold block mt-0.5">⚖️ ${escapeHtml(neoFluid.weightLossAnalysis.warning)}</span>`;
                }
                bannerHtml += `<span class="text-rose-400 font-semibold block mt-0.5">${neoFluid.contraindicationNotice}</span>`;
                if (neoFluidDescText) neoFluidDescText.innerHTML = bannerHtml;
            }
        }
    }

    // 3. APGAR SKORU
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

    // 4. WESTLEY KRUP SKORU
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

    // 5. CDS DEHİDRATASYON & ORS
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
}
