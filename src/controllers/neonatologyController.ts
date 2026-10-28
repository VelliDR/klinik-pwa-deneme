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

    // HATA-M7-007: Preterm Gestasyonel Hafta Senkronizasyon Kalkanı
    const gwInputEl = getEl<HTMLInputElement>('input-bhutani-gw');
    if (isPreterm && pretermGw) {
        if (!gwInputEl?.dataset.userModified || Number(gwInputEl.value) === 39) {
            if (gwInputEl) {
                gwInputEl.value = String(pretermGw);
            }
        }
    }

    // 1. HİPERBİLİRUBİNEMİ (AAP 2022 / TND 2014)
    const bAgeH = getNum('input-bhutani-age-hours');
    const bTsb = getNum('input-bhutani-tsb');
    const bGw = (isPreterm && pretermGw && (!gwInputEl?.dataset.userModified || Number(gwInputEl?.value) === 39))
        ? pretermGw
        : (getNum('input-bhutani-gw') || (isPreterm && pretermGw ? pretermGw : 39));
    const bRisk = getChk('chk-bhutani-risk-factors');
    const bGuideline: BhutaniGuideline = getVal('select-bhutani-guideline') === 'TND_2014' ? 'TND_2014' : 'AAP_2022';
    const bMethod: BilirubinMeasurementType = getVal('select-bhutani-method') === 'TcB' ? 'TcB' : 'TSB';
    const bhutaniOut = getEl('output-bhutani-result');

    const bBirthWeightG = getNum('input-birth-weight') || appState.biometry.birthWeightG || (appState.biometry.weightKg ? Math.round(appState.biometry.weightKg * 1000) : null);
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
                birthWeightGrams: bBirthWeightG,
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

                if (aapRes.status === 'TCB_REQUIRES_STAT_TSB_CONFIRMATION') {
                    extra += `
                        <div class="text-[9px] bg-rose-950/50 border border-rose-600 p-2 rounded mt-1 space-y-1 text-rose-200">
                            <div class="font-bold text-rose-300 text-[10px]">🛑 HARD-STOP: TcB İLE KAN DEĞİŞİMİ / ESKALASYON KARARI VERİLEMEZ (AAP 2022 KAS 6 & 17)</div>
                            <div>• Transkütan ölçüm (TcB) cihazlarının yüksek seviyelerde doygunluk ve sapma riski nedeniyle doğrudan invaziv kan değişimi tetiklenemez.</div>
                            <div class="font-semibold text-amber-300">• Derhal acil STAT venöz TSB kanı alınız ve sonuç çıkana dek bebeği yoğun LED fototerapiye alınız.</div>
                        </div>
                    `;
                } else if (aapRes.tcBValidity && (!aapRes.tcBValidity.isValidForTreatmentDecision || aapRes.requiresTsbConfirmation)) {
                    extra += `
                        <div class="text-[9px] bg-amber-950/40 border border-amber-700/60 p-1.5 rounded mt-1 space-y-0.5 text-amber-200">
                            <div class="font-bold text-amber-300">[DİKKAT] TcB DOĞRULAMA KALKANI (AAP 2022 KAS 6)</div>
                            <div>• ${escapeHtml(aapRes.tcBValidity.warning || aapRes.tsbConfirmationReason || 'Fototerapi eşiğine ≤3 mg/dL yakınlıkta veya ≥15 mg/dL ölçümlerde tedavi kararı TcB ile verilemez, derhal TSB ile doğrulanmalıdır.')}</div>
                        </div>
                    `;
                }

                if (aapRes.directBilirubinAnalysis) {
                    const db = aapRes.directBilirubinAnalysis;
                    extra += `
                        <div class="text-[9px] bg-slate-900 border border-slate-700 p-1.5 rounded mt-1 space-y-0.5 text-slate-200">
                            <div class="font-bold text-cyan-300">[NON-SUBTRACTION KURALI] Direkt Bilirubin: ${db.directBilirubinMgDl.toFixed(1)} mg/dL (%${db.percentageOfTotal} TSB)</div>
                            <div class="text-slate-300">• Direkt bilirubin TSB'den DÜŞÜLMEZ (AAP 2022). Fototerapi ve kan değişimi kararları toplam TSB üzerinden verilir.</div>
                            ${db.isCholestasisSuspected ? `<div class="text-amber-300 font-semibold">• Kolestaz şüphesi: ${escapeHtml(db.warning || 'Kolestaz ve Bronz Bebek Sendromu riski.')}</div>` : ''}
                        </div>
                    `;
                }

                if (aapRes.rateOfRiseAnalysis) {
                    const r = aapRes.rateOfRiseAnalysis;
                    extra += `
                        <div class="text-[9px] ${r.isRapidRise ? 'text-rose-400 font-bold' : 'text-slate-300'} pt-0.5">
                            Saatlik Artış: ${r.rateMgDlPerHour} mg/dL/saat (Eşik: ≥${r.thresholdMgDlPerHour}) ${r.isRapidRise ? '— [KRİTİK UYARI] PATOLOJİK HEMOLİZ ŞÜPHESİ!' : '— Normal Klirens'}
                        </div>
                    `;
                }

                if (aapRes.bilirubinAlbuminRatio) {
                    const ba = aapRes.bilirubinAlbuminRatio;
                    extra += `
                        <div class="text-[9px] ${ba.isThresholdExceeded ? 'text-rose-400 font-bold' : 'text-slate-300'} pt-0.5">
                            B/A Oranı: ${ba.ratio} mg/g (Eşik: ${ba.threshold} mg/g) ${ba.isThresholdExceeded ? '— [KRİTİK UYARI] KAN DEĞİŞİMİ SINIRI AŞILDI!' : '— Güvenli'}
                        </div>
                    `;
                }

                if (aapRes.escalationProtocol && aapRes.escalationProtocol.isEscalationActive) {
                    const esc = aapRes.escalationProtocol;
                    extra += `
                        <div class="text-[9px] bg-rose-950/40 border border-rose-700/60 p-1.5 rounded mt-1 space-y-0.5 text-rose-200">
                            <div class="font-bold text-rose-300">[ACİL] ACİL BAKIM ESKALASYONU PROTOKOLÜ (KAS 17)</div>
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
                            <div class="font-bold text-${rebColor}-300">[REBOUND İZLEM] FOTOTERAPİ SONLANDIRMA (KAS 14 & 15)</div>
                            <div>• FT Kesilme Durumu: <strong>${reb.isDiscontinuationPermitted ? '[UYGUN] FT Kesilebilir' : '[ENGEL] FT Kesilemez (TSB henüz eşiğin 2 mg/dL altına inmedi)'}</strong> (Kesilme Eşiği: ${reb.discontinuationThreshold} mg/dL)</div>
                            <div>• Rebound Risk Düzeyi: <strong>${reb.riskTier === 'HIGH_REBOUND_RISK' ? '[YÜKSEK RİSK]' : '[DÜŞÜK RİSK]'}</strong> (Kontrol: ${reb.reboundFollowUpHours})</div>
                            <div>• ${escapeHtml(reb.protocol)}</div>
                        </div>
                    `;
                }

                if (aapRes.dischargeEvaluation) {
                    const dc = aapRes.dischargeEvaluation;
                    const dcColor = dc.isDischargeEligible ? 'teal' : 'amber';
                    extra += `
                        <div class="text-[9px] bg-${dcColor}-950/40 border border-${dcColor}-700/60 p-1.5 rounded mt-1 space-y-0.5 text-${dcColor}-200">
                            <div class="font-bold text-${dcColor}-300">[TABURCULUK MATRİSİ] AAP 2022 TABLO 4 (Δ: ${dc.deltaMgDl} mg/dL [${dc.matrixBand}])</div>
                            <div>• Önerilen Zamanlama: <strong>${escapeHtml(dc.followUpTiming)}</strong> (${dc.followUpModality})</div>
                            <div>• ${escapeHtml(dc.dischargeRecommendation)}</div>
                        </div>
                    `;
                }

                if (aapRes.clinicalAlerts && aapRes.clinicalAlerts.length > 0) {
                    extra += '<div class="space-y-1 pt-1">';
                    for (const al of aapRes.clinicalAlerts) {
                        const bg = al.severity === 'CRITICAL' 
                            ? 'bg-rose-900/40 text-rose-200 border-rose-700/50' 
                            : al.severity === 'WARNING'
                                ? 'bg-amber-900/40 text-amber-200 border-amber-700/50'
                                : 'bg-cyan-950/40 text-cyan-200 border-cyan-700/50';
                        extra += `<div class="text-[9px] p-1 rounded border ${bg}"><strong>${escapeHtml(al.title)}:</strong> ${escapeHtml(al.message)}</div>`;
                    }
                    extra += '</div>';
                }

                if (aapRes.gestationalAge.isPreterm && aapRes.pretermGuidance) {
                    const pg = aapRes.pretermGuidance;
                    extra += `
                        <div class="text-[9px] bg-sky-950/40 border border-sky-700/60 p-1.5 rounded mt-1 space-y-0.5 text-sky-200">
                            <div class="font-bold text-sky-300">[PREMATÜRE] MAISELS 2012 PMA & TND PROTOKOLÜ (PMA: ${pg.pmaWeeks} Hafta)</div>
                            <div>• Maisels FT Bandı: ${escapeHtml(pg.maiselsPhototherapyRange)}</div>
                            <div>• Maisels Kan Değişimi: ${escapeHtml(pg.maiselsExchangeRange)}</div>
                            <div>• TND 2023 / NICE Preterm Eşiği: ${pg.tndNiceThreshold} mg/dL</div>
                        </div>
                    `;
                }

                // İkincil / Karşılaştırmalı Referans Katmanı (TND 2014 / Klasik Bhutani)
                const tndRes = calculateBhutaniJaundice({
                    ageHours: bAgeH,
                    totalBilirubin: bTsb,
                    gestationalWeeks: bGw,
                    hasRiskFactors: bRisk,
                    guideline: 'TND_2014',
                    measurementType: bMethod
                });

                if (tndRes && tndRes.isValid && tndRes.phototherapyThreshold !== undefined) {
                    const tndPt = tndRes.phototherapyThreshold;
                    const tndEx = tndRes.exchangeThreshold;
                    const tndDelta = tndRes.deltaFromPhototherapy ?? Number((tndPt - bTsb).toFixed(1));
                    const ptDiff = Number((aapRes.thresholds.phototherapy - tndPt).toFixed(1));
                    const diffText = ptDiff > 0 
                        ? `+${ptDiff} mg/dL (AAP eşiği daha yüksek)` 
                        : ptDiff < 0 
                            ? `${ptDiff} mg/dL (AAP eşiği daha düşük)` 
                            : 'Eşit (0.0 mg/dL)';
                    const diffColor = ptDiff > 0 ? 'text-emerald-400' : ptDiff < 0 ? 'text-amber-400' : 'text-slate-300';
                    const tndDeltaSign = tndDelta > 0 ? '-' : '+';

                    extra += `
                        <div class="mt-2.5 pt-2 border-t border-slate-700/60 space-y-1.5">
                            <div class="flex items-center justify-between text-[10px]">
                                <span class="font-bold text-slate-300 flex items-center gap-1">
                                    İkili Kılavuz Karşılaştırması: TND 2014 / AAP 2004 (İkincil Referans)
                                </span>
                                <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Karşılaştırmalı Katman</span>
                            </div>
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 rounded bg-slate-950/70 border border-slate-800 text-[10px]">
                                <div>
                                    <span class="text-[9px] text-slate-400 block">TND 2014 Fototerapi</span>
                                    <span class="font-bold text-amber-400">${tndPt.toFixed(1)} mg/dL</span>
                                    <span class="text-[8px] text-slate-400 block">(Fark Δ: ${tndDeltaSign}${Math.abs(tndDelta).toFixed(1)} mg/dL)</span>
                                </div>
                                <div>
                                    <span class="text-[9px] text-slate-400 block">TND 2014 Kan Değişimi</span>
                                    <span class="font-bold text-rose-400">${tndEx ? `${tndEx.toFixed(1)} mg/dL` : '--'}</span>
                                </div>
                                <div class="col-span-2 sm:col-span-1">
                                    <span class="text-[9px] text-slate-400 block">Eşik Farkı (AAP vs TND)</span>
                                    <span class="font-bold ${diffColor}">${diffText}</span>
                                </div>
                            </div>
                            <div class="text-[9px] text-slate-400 space-y-0.5">
                                <div>• <strong>Klinik Kılavuz Önceliği:</strong> AAP 2022 güncel kanıta dayalı birincil karar desteğidir. TND 2014 değerleri ulusal klasik nomogram referansı olarak sunulmaktadır.</div>
                                ${ptDiff > 0 ? `<div>• AAP 2022 fototerapi eşiğini ${ptDiff} mg/dL yükselterek hafif olgularda aşırı yatış ve fototerapiyi güvenle sınırlandırır.</div>` : ''}
                            </div>
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
                let extra = `
                    <div class="text-[9px] text-cyan-300 font-semibold">${escapeHtml(bRes.guidelineLabel || '')}</div>
                    ${bRes.phototherapyThreshold ? `<div class="text-[10px]">Fototerapi Eşiği: ${bRes.phototherapyThreshold} mg/dL${escStr} | Kan Değişimi: ${bRes.exchangeThreshold} mg/dL</div>` : ''}
                    <div class="text-[10px] font-semibold">${bRes.interpretation || ''}</div>
                    ${bRes.followUpRecommendation ? `<div class="text-[9px] text-amber-300 pt-0.5 border-t border-slate-700/50">İzlem: ${escapeHtml(bRes.followUpRecommendation)}</div>` : ''}
                `;

                if (bRes.requiresTsbConfirmation) {
                    extra += `
                        <div class="text-[9px] bg-amber-950/40 border border-amber-700/60 p-1.5 rounded mt-1 space-y-0.5 text-amber-200">
                            <div class="font-bold text-amber-300">[DİKKAT] TcB DOĞRULAMA KALKANI (KAS 6)</div>
                            <div>• Transkütan ölçüm fototerapi eşiğine ≤3 mg/dL yakınlıkta veya ≥15 mg/dL olduğunda derhal venöz/kapiller TSB ile doğrulanmalıdır.</div>
                        </div>
                    `;
                }

                // İkincil / Karşılaştırmalı Referans Katmanı (AAP 2022)
                const aapRes = evaluateAap2022Jaundice({
                    ageHours: bAgeH,
                    totalBilirubin: bTsb,
                    gestationalWeeks: bGw,
                    measurementType: bMethod,
                    hasNeurotoxicityRisk: bRisk,
                    albuminGPerDl: bAlbumin,
                    directBilirubinMgDl: bDirect,
                    birthWeightGrams: bBirthWeightG,
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
                    }
                });

                if (aapRes && aapRes.isValid) {
                    const ptDiff = Number(((bRes.phototherapyThreshold || 0) - aapRes.thresholds.phototherapy).toFixed(1));
                    const aapDeltaSign = aapRes.deltaFromPhototherapy > 0 ? '-' : '+';
                    extra += `
                        <div class="mt-2.5 pt-2 border-t border-slate-700/60 space-y-1.5">
                            <div class="flex items-center justify-between text-[10px]">
                                <span class="font-bold text-sky-300 flex items-center gap-1">
                                    Güncel Kılavuz Referansı (AAP 2022)
                                </span>
                                <span class="text-[9px] px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800/60">Birincil Önerilen Kılavuz</span>
                            </div>
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 rounded bg-slate-950/70 border border-slate-800 text-[10px]">
                                <div>
                                    <span class="text-[9px] text-slate-400 block">AAP 2022 Fototerapi</span>
                                    <span class="font-bold text-sky-400">${aapRes.thresholds.phototherapy.toFixed(1)} mg/dL</span>
                                    <span class="text-[8px] text-slate-400 block">(Fark Δ: ${aapDeltaSign}${Math.abs(aapRes.deltaFromPhototherapy).toFixed(1)} mg/dL)</span>
                                </div>
                                <div>
                                    <span class="text-[9px] text-slate-400 block">AAP 2022 Kan Değişimi</span>
                                    <span class="font-bold text-rose-400">${aapRes.thresholds.exchange.toFixed(1)} mg/dL</span>
                                </div>
                                <div class="col-span-2 sm:col-span-1">
                                    <span class="text-[9px] text-slate-400 block">Eşik Farkı (TND vs AAP)</span>
                                    <span class="font-bold text-slate-200">${ptDiff > 0 ? `+${ptDiff}` : ptDiff} mg/dL</span>
                                </div>
                            </div>
                            <div class="text-[9px] text-slate-400">
                                • AAP 2022 güncel klinik karar destek kılavuzu olarak önerilmektedir.
                            </div>
                        </div>
                    `;
                }

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
                if (neoFluidDayText) neoFluidDayText.textContent = `${neoFluid.dayTitle}${catLabel} (${neoFluid.mlPerKgRange} mL/kg)`;
                if (neoFluidTargetText) neoFluidTargetText.textContent = `GIR: ${neoFluid.girMgKgMin} mg/kg/dk`;
                let bannerHtml = `${neoFluid.soluteAdvice}`;
                if (neoFluid.incubatorHumidityRecommendation) {
                    bannerHtml += `<span class="text-cyan-300 font-semibold block mt-0.5">${escapeHtml(neoFluid.incubatorHumidityRecommendation)}</span>`;
                }
                if (neoFluid.weightLossAnalysis && neoFluid.weightLossAnalysis.warning) {
                    bannerHtml += `<span class="text-rose-400 font-bold block mt-0.5">${escapeHtml(neoFluid.weightLossAnalysis.warning)}</span>`;
                }
                bannerHtml += `<span class="text-rose-400 font-semibold block mt-0.5">${neoFluid.contraindicationNotice}</span>`;
                if (neoFluidDescText) neoFluidDescText.innerHTML = bannerHtml;
            }
        }
    } else if (isNeonate) {
        if (neoFluidBanner) neoFluidBanner.classList.add('hidden');
        appState.medicine.neonatalFluid = null;
        appState.medicine.fluid = null;
        if (outDailyFluid) outDailyFluid.textContent = '--';
        if (outHourlyFluid) outHourlyFluid.textContent = '--';
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
