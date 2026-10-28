/**
 * PEDİATRİK KLİNİK KART DENETLEYİCİSİ (PEDIATRICS CONTROLLER)
 * 
 * Çocukluk çağı aşı takvimi, TPHD demir eksikliği & Mentzer talasemi kalkanı,
 * metrik oral şurup dozlama (PPAG IBW & Adult Cap), AAP 2017 pediatrik tansiyon,
 * PEWS ve NEWS2 triyaj puanlaması.
 */

import { appState } from '../state';
import type { PatientAgeResult } from './biometryController';
import { 
    getVaccineSchedule, 
    calculatePediatricDose, 
    classifyPediatricBP 
} from '../engines/pediatricEngine';
import { calculatePediatricIron } from '../engines/ironEngine';
import { calculatePEWS, calculateNEWS2 } from '../engines/triageEngine';
import { getEl, getVal, getNum, getChk } from '../utils/domUtils';

export function updatePediatricCard(ageData: PatientAgeResult): void {
    const y = ageData.y;
    const m = ageData.m;
    const totalMonths = (y === null && m === null) ? null : (m !== null ? m : (y !== null ? y * 12 : null));
    const isPreterm = getChk('chk-preterm');

    // 1. AŞI TAKVİMİ
    if (totalMonths !== null) {
        const vax = getVaccineSchedule(totalMonths);
        appState.pediatrics.vaccines = vax || null;
        const vaxEl = getEl('output-ped-vaccines');
        if (vaxEl) {
            vaxEl.innerHTML = vax && vax.length 
                ? `<ul class="list-disc pl-4 text-slate-300">${vax.map((v: string) => `<li>${v}</li>`).join('')}</ul>`
                : 'Bu ay için planlı aşı bulunamadı.';
        }
    } else {
        appState.pediatrics.vaccines = null;
        const vaxEl = getEl('output-ped-vaccines');
        if (vaxEl) {
            vaxEl.innerHTML = '<span class="text-slate-500 italic text-xs">Aşı takvimi için lütfen yaş giriniz.</span>';
        }
    }

    // 2. PEDİATRİK DEMİR & ANEMİ MOTORU (TPHD & Mentzer)
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
                ironHtml += `<div class="mb-1.5 px-2 py-1 bg-amber-950/60 text-amber-300 border border-amber-700/60 rounded text-[10px] font-bold">PRETERM BEBEK PROTOKOLÜ (2. aydan itibaren 2-4 mg/kg/gün)</div>`;
            }

            const evalColor = ir.hbEvaluation.badgeColor === 'rose' ? 'text-rose-400' : ir.hbEvaluation.badgeColor === 'amber' ? 'text-amber-400' : 'text-emerald-400';
            ironHtml += `<div class="${evalColor} font-semibold border-b border-slate-700/50 pb-1 mb-1">Hb Durumu: ${ir.hbEvaluation.text}</div>`;

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
                    ironHtml += `<div class="text-xs text-slate-300 tabular-nums mb-1">${diffParts.join(' | ')}</div>`;
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

            if (ir.prophylaxis.eligible) {
                ironHtml += `<div class="mt-1"><strong>Profilaksi:</strong> ${ir.prophylaxis.mgDay} mg/gün<br><span class="text-[9px] text-slate-300">Damla: Ferrum ${ir.prophylaxis.ferrumDrops} damla | Ferro Sanol ${ir.prophylaxis.ferroDrops} damla</span>`;
                if (ir.prophylaxis.syrupMl) {
                    ironHtml += `<br><span class="text-[9px] text-slate-300">Şurup (50mg/5mL): ${ir.prophylaxis.syrupMl} mL (Oral Enjektör ile)</span>`;
                }
                ironHtml += `<br><span class="text-[9px] text-amber-400">${ir.prophylaxis.text}</span></div>`;
            } else if (ir.prophylaxis.text) {
                ironHtml += `<div class="mt-1 text-[10px] text-sky-400">${ir.prophylaxis.text}</div>`;
            }

            if (ir.treatment.eligible) {
                ironHtml += `<div class="mt-1"><strong>Tedavi:</strong> ${ir.treatment.mgDay} mg/gün<br><span class="text-[9px] text-slate-300">Damla: Ferrum ${ir.treatment.ferrumDrops} damla | Ferro Sanol ${ir.treatment.ferroDrops} damla</span>`;
                if (ir.treatment.syrupMl) {
                    ironHtml += `<br><span class="text-[9px] text-slate-300">Şurup (50mg/5mL): ${ir.treatment.syrupMl} mL (Oral Enjektör ile)</span>`;
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

    // 3. PEDİATRİK ŞURUP VE SÜSPANSİYON DOZLAMA (Adult Cap & IBW)
    const syrupVal = getVal('select-ped-syrup');
    const syrupRes = getEl('output-ped-syrup');
    const useIbwChk = getEl('chk-ped-use-ibw') as HTMLInputElement | null;
    const allowTitckChk = getEl('chk-ped-allow-titck') as HTMLInputElement | null;
    const aomHighChk = getEl('chk-ped-aom-high') as HTMLInputElement | null;
    const obeseBadge = getEl('badge-ped-obese-status');
    const useIbw = useIbwChk ? useIbwChk.checked : false;
    const allowOffLabelTitck = allowTitckChk ? allowTitckChk.checked : false;
    const indication = aomHighChk && aomHighChk.checked ? 'aom_high_dose' : 'general';

    if (syrupVal && syrupRes) {
        if (appState.biometry.weightKg) {
            const syrupDose = calculatePediatricDose(appState.biometry.weightKg, syrupVal, {
                ageMonths: appState.biometry.ageMonths,
                ageDays: appState.biometry.ageDays,
                ageYears: appState.biometry.ageYears,
                heightCm: appState.biometry.heightCm,
                gender: appState.biometry.gender || 'male',
                useIbw,
                allowOffLabelTitck,
                indication
            });
            appState.pediatrics.syrupDose = syrupDose;

            if (obeseBadge) {
                if (syrupDose?.isObeseAlert) {
                    obeseBadge.classList.remove('hidden');
                } else {
                    obeseBadge.classList.add('hidden');
                }
            }

            if (syrupDose) {
                syrupRes.classList.remove('hidden');
                if (syrupDose.isBlocked) {
                    syrupRes.innerHTML = `
                        <div class="space-y-1.5 tabular-nums text-xs">
                            <div class="flex items-center justify-between pb-1 border-b border-rose-800">
                                <span class="font-bold text-rose-300">${syrupDose.name}</span>
                                <span class="text-xs font-bold text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800">[BLOKE EDİLDİ]</span>
                            </div>
                            <div class="p-2 rounded bg-rose-950/80 border border-rose-700 text-rose-200 text-xs font-bold space-y-1">
                                <div class="flex items-start gap-1.5">
                                    <span class="text-rose-400 font-bold">[!]</span>
                                    <div>${syrupDose.blockReason}</div>
                                </div>
                            </div>
                            ${syrupDose.dualStandardWarning ? `
                                <div class="p-1.5 rounded bg-amber-950/50 border border-amber-600/80 text-amber-200 text-xs">
                                    ${syrupDose.dualStandardWarning}
                                </div>
                            ` : ''}
                            ${syrupDose.ratioNotice ? `
                                <div class="p-1.5 rounded bg-amber-950/40 border border-amber-700 text-amber-300 text-xs">
                                    ${syrupDose.ratioNotice}
                                </div>
                            ` : ''}
                            <div class="p-1.5 rounded border border-rose-900 bg-rose-950/40 text-rose-300 text-xs">
                                ${syrupDose.syringeWarning}
                            </div>
                        </div>
                    `;
                } else {
                    syrupRes.innerHTML = `
                        <div class="space-y-1.5 tabular-nums text-xs">
                            <div class="flex items-center justify-between pb-1 border-b border-slate-700/50">
                                <span class="font-bold text-slate-200">${syrupDose.name}</span>
                                <span class="text-[9px] text-slate-400">${syrupDose.freq}</span>
                            </div>
                            <div class="grid grid-cols-2 gap-2 p-1.5 rounded bg-slate-950/70 border border-slate-800">
                                <div>
                                    <span class="text-[9px] text-slate-400 block">Hedef Aktif Madde</span>
                                    <span class="text-xs font-bold text-emerald-400">${syrupDose.targetDoseMg} mg</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[9px] text-slate-400 block">Uygulanacak Hacim</span>
                                    ${syrupDose.volumeMl !== null 
                                        ? `<span class="text-xs font-bold text-cyan-400">${syrupDose.volumeMl} mL</span>`
                                        : `<span class="text-xs font-bold text-amber-400">[Kilitli]</span>`}
                                </div>
                            </div>
                            <div class="text-[9px] text-slate-300">
                                <strong>Metrik Dozaj:</strong> ${syrupDose.metricDoseText}
                                ${syrupDose.concentrationText ? `<br><span class="text-slate-400">Konsantrasyon: ${syrupDose.concentrationText}</span>` : ''}
                            </div>
                            ${syrupDose.hasDualStandardAlert && syrupDose.dualStandardWarning ? `
                                <div class="p-1.5 rounded bg-amber-950/50 border border-amber-600/80 text-amber-200 text-[10px] space-y-0.5">
                                    <div>${syrupDose.dualStandardWarning}</div>
                                </div>
                            ` : ''}
                            ${syrupDose.ratioNotice ? `
                                <div class="p-1.5 rounded ${syrupDose.ratio === '14:1' ? 'bg-emerald-950/40 border border-emerald-700/70 text-emerald-300' : 'bg-amber-950/40 border border-amber-700/70 text-amber-300'} text-[10px]">
                                    ${syrupDose.ratioNotice}
                                </div>
                            ` : ''}
                            ${syrupDose.negativeGuidelineWarning ? `
                                <div class="p-1.5 rounded bg-rose-950/40 border border-rose-700/70 text-rose-300 text-[10px]">
                                    ${syrupDose.negativeGuidelineWarning}
                                </div>
                            ` : ''}
                            ${syrupDose.offLabelNotice ? `
                                <div class="p-1.5 rounded bg-sky-950/40 border border-sky-700/70 text-sky-300 text-[10px]">
                                    ${syrupDose.offLabelNotice}
                                </div>
                            ` : ''}
                            ${syrupDose.confusionWarning ? `
                                <div class="p-1.5 rounded bg-amber-950/40 border border-amber-700/70 text-amber-300 text-[10px]">
                                    ${syrupDose.confusionWarning}
                                </div>
                            ` : ''}
                            ${syrupDose.reconstitutionStability ? `
                                <div class="p-1.5 rounded bg-slate-950/50 border border-slate-700/70 text-slate-300 text-[10px]">
                                    ${syrupDose.reconstitutionStability}
                                </div>
                            ` : ''}
                            ${syrupDose.ageWarning ? `
                                <div class="p-1.5 rounded bg-amber-950/40 border border-amber-700/70 text-amber-300 text-[10px]">
                                    ${syrupDose.ageWarning}
                                </div>
                            ` : ''}
                            ${syrupDose.indicationBandNote ? `
                                <div class="p-1.5 rounded bg-indigo-950/40 border border-indigo-700/70 text-indigo-300 text-[10px]">
                                    ${syrupDose.indicationBandNote}
                                </div>
                            ` : ''}
                            ${syrupDose.isCapped && syrupDose.capNotice ? `
                                <div class="p-1.5 rounded bg-amber-950/40 border border-amber-700/70 text-amber-300 text-[10px] flex items-start gap-1.5">
                                    <span class="text-sky-400 font-bold">[KORUMA]</span>
                                    <div>${syrupDose.capNotice}</div>
                                </div>
                            ` : ''}
                            ${syrupDose.isObeseAlert && syrupDose.obesityWarning ? `
                                <div class="p-1.5 rounded bg-rose-950/40 border border-rose-700/70 text-rose-300 text-[10px] space-y-1">
                                    <div>${syrupDose.obesityWarning}</div>
                                    <div class="text-[9px] text-slate-300">
                                        TBW: <strong>${syrupDose.tbwKg} kg</strong> | IBW: <strong>${syrupDose.ibwKg} kg</strong> | AdjBW: <strong>${syrupDose.adjBwKg} kg</strong>
                                        ${syrupDose.ibwDoseMg ? ` | IBW Dozu: <strong>${syrupDose.ibwDoseMg} mg</strong> (${syrupDose.ibwVolumeMl ?? 'Kilitli'} mL)` : ''}
                                    </div>
                                </div>
                            ` : ''}
                            <div class="p-1.5 rounded border text-[9px] ${
                                syrupDose.isLocked
                                    ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                                    : syrupDose.volumeMl !== null && syrupDose.volumeMl < 10
                                        ? 'bg-rose-950/30 border-rose-800/80 text-rose-300'
                                        : 'bg-sky-950/30 border-sky-800/80 text-sky-300'
                            }">
                                ${syrupDose.syringeWarning}
                            </div>
                        </div>
                    `;
                }
            } else {
                syrupRes.classList.add('hidden');
            }
        } else {
            syrupRes.classList.remove('hidden');
            syrupRes.innerHTML = `<span class="text-amber-400">[DİKKAT] Dozaj hesabı için lütfen kilo (kg) giriniz.</span>`;
            if (obeseBadge) obeseBadge.classList.add('hidden');
        }
    } else if (syrupRes) {
        appState.pediatrics.syrupDose = null;
        syrupRes.classList.add('hidden');
        if (obeseBadge) obeseBadge.classList.add('hidden');
    }

    // 4. VİTALLER VE TRİYAJ (PEWS / NEWS2 / AAP 2017 Pediatrik Tansiyon)
    const pewsB = getNum('input-pews-behavior');
    const pewsC = getNum('input-pews-cv');
    const pewsR = getNum('input-pews-resp');
    const pewsInputsContainer = getEl('container-pews-inputs');
    
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

    if (nSbp !== null && nDbp !== null && totalMonths !== null && totalMonths <= 216) {
        const pedAgeY = y !== null ? y : (m ? m / 12 : (totalMonths / 12));
        const heightPct = appState.pediatrics.percentiles?.heightPercentile ?? null;
        appState.pediatrics.bp = classifyPediatricBP({
            ageYears: pedAgeY,
            gender: (appState.biometry.gender === 'female' || appState.biometry.gender === 'F') ? 'female' : 'male',
            sbp: nSbp,
            dbp: nDbp,
            heightPercentile: heightPct
        });
        if (appState.pediatrics.bp && pedBpContainer) {
            pedBpContainer.classList.remove('hidden');
            pedBpContainer.className = `col-span-2 p-2 rounded-lg border text-xs tabular-nums space-y-0.5 ${appState.pediatrics.bp.alertClass}`;
            pedBpContainer.innerHTML = `<div class="font-bold">AAP 2017 / PALS Tansiyon: ${appState.pediatrics.bp.stage}</div>
                ${appState.pediatrics.bp.thresholds ? `<div class="text-xs text-slate-300 opacity-90">${appState.pediatrics.bp.thresholds}</div>` : ''}`;
        } else if (pedBpContainer) {
            pedBpContainer.classList.add('hidden');
        }
    } else {
        appState.pediatrics.bp = null;
        if (pedBpContainer) pedBpContainer.classList.add('hidden');
    }
    
    if (totalMonths !== null && totalMonths < 192) {
        // Pediatrik hasta (<16 yaş)
        if (pewsB !== null && pewsC !== null && pewsR !== null) {
            const pewsRes = calculatePEWS(pewsB, pewsC, pewsR);
            appState.pediatrics.pews = pewsRes;
            if (pewsRes && riskContainer && badgeRiskType && textRiskScore && flagContainer) {
                riskContainer.classList.remove('hidden');
                riskContainer.className = `p-3 rounded-xl border flex flex-col gap-1 ${pewsRes.score >= 3 ? 'bg-rose-950/40 border-rose-600/50' : 'bg-emerald-950/40 border-emerald-600/50'}`;
                badgeRiskType.textContent = 'PEWS';
                badgeRiskType.className = `text-xs font-bold tabular-nums ${pewsRes.score >= 3 ? 'text-rose-400' : 'text-emerald-400'}`;
                textRiskScore.textContent = `Skor: ${pewsRes.score}`;
                flagContainer.innerHTML = pewsRes.recommendation;
            }
            appState.medicine.news2 = null;
        } else {
            // HATA-M3-002: Çocuklarda PEWS açılır menüleri seçilmediğinde yetişkin NEWS2'ye düşerek sahte YBÜ alarmı vermesini engelleyen yaş kalkanı
            appState.pediatrics.pews = null;
            appState.medicine.news2 = null;
            if (riskContainer && badgeRiskType && textRiskScore && flagContainer) {
                const hasAnyPedVital = (nHr !== null || nSbp !== null || nRr !== null || nTemp !== null || nSpo2 !== null);
                if (hasAnyPedVital) {
                    riskContainer.classList.remove('hidden');
                    riskContainer.className = 'p-3 rounded-xl border flex flex-col gap-1 bg-amber-950/30 border-amber-600/40';
                    badgeRiskType.textContent = 'PEWS (Pediatri)';
                    badgeRiskType.className = 'text-xs font-bold tabular-nums text-amber-400';
                    textRiskScore.textContent = 'Eksik Veri';
                    flagContainer.innerHTML = 'Pediatrik hasta (<16 yaş) için PEWS parametrelerini (Davranış, Kardiyovasküler, Solunum) doldurunuz; erişkin NEWS2 uygulanamaz.';
                } else {
                    riskContainer.classList.add('hidden');
                }
            }
        }
    } else {
        // Yetişkin hasta (totalMonths === null || totalMonths >= 192)
        // HATA-M3-001: 5 vitale de zorunlu kilit yerine kısmi hesaplama desteği
        const hasAnyAdultVital = (nHr !== null || nSbp !== null || nRr !== null || nTemp !== null || nSpo2 !== null);
        if (hasAnyAdultVital) {
            const news2Res = calculateNEWS2(nHr, nSbp, nRr, nTemp, nSpo2, nOx, nAvpu);
            appState.medicine.news2 = news2Res;
            if (news2Res && riskContainer && badgeRiskType && textRiskScore && flagContainer) {
                riskContainer.classList.remove('hidden');
                // HATA-M3-003: NEWS2 Kırmızı Skor (Red Score = 3) kuralının görselleştirilmesi
                const isUrgent = news2Res.score >= 5 || !!news2Res.hasRedScore;
                riskContainer.className = `p-3 rounded-xl border flex flex-col gap-1 ${isUrgent ? 'bg-rose-950/40 border-rose-600/50' : 'bg-slate-800 border-slate-700/50'}`;
                badgeRiskType.textContent = news2Res.isPartial ? 'NEWS2 (Kısmi)' : 'NEWS2';
                badgeRiskType.className = `text-xs font-bold tabular-nums ${isUrgent ? 'text-rose-400' : 'text-slate-300'}`;
                textRiskScore.textContent = `Skor: ${news2Res.score}${news2Res.hasRedScore ? ' (Kırmızı Skor: Tekil Parametre ≥3)' : ''}`;
                
                let recText = `${news2Res.risk} — ${news2Res.recommendation}`;
                if (news2Res.isPartial && news2Res.missingParams && news2Res.missingParams.length > 0) {
                    recText = `[Kısmi Triyaj Skoru] (Eksik: ${news2Res.missingParams.join(', ')}). ${recText}`;
                }
                flagContainer.innerHTML = recText;
            }
            appState.pediatrics.pews = null;
        } else {
            if (riskContainer) riskContainer.classList.add('hidden');
            appState.medicine.news2 = null;
            appState.pediatrics.pews = null;
        }
    }
}
