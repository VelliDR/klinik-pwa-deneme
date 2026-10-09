import { appState } from './state.js';
import { calculateBSA, calculateEGFR } from './engines/biometricsEngine.js';
import { calculatePediatricDose, getVaccineSchedule, classifyPediatricBP, calculateCentorMcIsaac } from './engines/pediatricEngine.js';
import { calculatePercentiles, calculateTargetHeight, calculateCorrectedAge } from './engines/percentileEngine.js';
import { calculatePediatricIron } from './engines/ironEngine.js';
import { calculateAlvarado, calculateParkland, getSutureGuidance, calculateRanson } from './engines/surgeryEngine.js';
import { calculateObstetrics, calculateBishop, calculatePreeclampsia } from './engines/obgynEngine.js';
import { analyzeBloodGas } from './engines/bloodGasEngine.js';
import { calculateMaintenanceFluid, calculateSodiumCorrection } from './engines/fluidEngine.js';
import { calculateNEWS2, calculatePEWS, calculateGCS } from './engines/triageEngine.js';
import { calculateQTc, calculateAxis } from './engines/cardiacEngine.js';
import { getLabTubeGuide } from './engines/labGuideEngine.js';
import { calculateCorrectedCalcium } from './engines/calciumEngine.js';
import { calculateInfusionRate, calculateGIR } from './engines/infusionEngine.js';
import { convertSteroids, calculateHOMAIR } from './engines/endocrineEngine.js';
import { generateSOAP } from './utils/soapGenerator.js';
import { seedDrugDatabase, searchDrugsInDB, getDrugCount } from './db/titckIndexedDB.js';
import { getDrugBadgesHTML } from './drugEngine.js';

// Utils
const parseNum = (val) => val === '' || isNaN(val) ? null : Number(val);

// Initialize Drug Database (PWA Akıllı Yükleyici: IndexedDB hazırsa gereksiz ağ indirmesi yapmaz)
async function initDrugCatalog() {
    try {
        const count = await getDrugCount();
        const DB_BUILD_KEY = 'klinik_drug_db_build';
        const CURRENT_BUILD = 'titck_2026_v18';
        const savedBuild = localStorage.getItem(DB_BUILD_KEY);

        if (count > 1000 && savedBuild === CURRENT_BUILD) {
            console.log(`[TİTCK PWA] IndexedDB hazır (${count} ilaç kayıtlı).`);
            return;
        }

        console.log('[TİTCK PWA] İlaç kataloğu yükleniyor/güncelleniyor...');
        let res = null;
        try {
            res = await fetch('./data/medicines.json');
        } catch (e) {
            console.warn('[TİTCK PWA] medicines.json fetch uyarısı, alternatif dosya deneniyor...');
        }
        if (!res || !res.ok) {
            res = await fetch('./data/titck_skrs_prospektuslu.json');
        }
        if (res && res.ok) {
            const data = await res.json();
            await seedDrugDatabase(data);
            localStorage.setItem(DB_BUILD_KEY, CURRENT_BUILD);
            console.log('[TİTCK PWA] 18.212 TİTCK ilacı ve prospektüs linkleri IndexedDB üzerine indekslendi.');
        }
    } catch (err) {
        console.warn('[TİTCK PWA] Çevrimdışı modda yerel IndexedDB kataloğu kullanılıyor:', err);
    }
}
initDrugCatalog();

// Update Logic
function updateAllTabs() {
    // 1. BIOMETRY & DEMOGRAPHY
    const ageVal = parseNum(document.getElementById('input-age').value);
    const ageUnit = document.getElementById('select-age-unit').value;
    
    let y = 0, m = 0;
    if (ageVal !== null) {
        if (ageUnit === 'years') y = ageVal;
        if (ageUnit === 'months') m = ageVal;
    } else {
        y = null;
        m = null;
    }

    appState.biometry.ageYears = y;
    appState.biometry.ageMonths = m;
    const totalMonths = (y === null && m === null) ? null : (y || 0) * 12 + (m || 0);
    
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
    if (ageVal !== null) {
        const vax = getVaccineSchedule(totalMonths);
        document.getElementById('output-ped-vaccines').innerHTML = vax && vax.length 
            ? `<ul class="list-disc pl-4 text-slate-300">${vax.map(v => `<li>${v}</li>`).join('')}</ul>`
            : 'Bu ay için planlı aşı bulunamadı.';
    }

    // PEDIATRIC IRON ENGINE
    const hb = parseNum(document.getElementById('input-hb').value);
    const isPreterm = document.getElementById('chk-preterm').checked;
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
    if (appState.biometry.weightKg) {
        appState.medicine.fluid = calculateMaintenanceFluid(appState.biometry.weightKg, fTemp);
        document.getElementById('output-daily-fluid').textContent = `${appState.medicine.fluid.dailyVolume} mL`;
        document.getElementById('output-hourly-fluid').textContent = `${appState.medicine.fluid.hourlyRate} mL/s`;
    } else {
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
            centorRes.classList.remove('hidden');
            centorRes.className = `p-2 rounded-lg border font-mono space-y-1 text-[10px] ${ct.score >= 4 ? 'bg-rose-950/40 border-rose-600/50' : ct.score >= 2 ? 'bg-amber-950/40 border-amber-600/50' : 'bg-slate-900/60 border-slate-700/50'}`;
            centorRes.innerHTML = `
                <div class="flex justify-between items-center">
                    <strong class="${ct.alertClass}">Centor Skoru: ${ct.score}</strong>
                    <span class="text-slate-300">GAS Riski: ${ct.riskPercent}</span>
                </div>
                <div class="text-[10px] text-slate-300">${ct.recommendation}</div>
            `;
        } else if (centorRes) {
            centorRes.classList.add('hidden');
        }
    } else {
        appState.pediatrics.centor = null;
        if (centorRes) centorRes.classList.add('hidden');
    }

    // Live SOAP Update
    updateLiveSOAP();
}

document.addEventListener('input', updateAllTabs);
document.addEventListener('change', updateAllTabs);

// Initial call
updateAllTabs();

// LAB SEARCH
document.getElementById('input-lab-search').addEventListener('input', (e) => {
    const q = e.target.value;
    const res = getLabTubeGuide(q);
    const el = document.getElementById('container-lab-results');
    if (res && q.length > 2) {
        el.classList.remove('hidden');
        el.innerHTML = res.map(r => `
            <div class="mb-2 p-2 border-l-4 rounded-r-lg bg-slate-800" style="border-color: ${r.color.includes('Mor') ? 'purple' : r.color.includes('Mavi') ? '#38bdf8' : r.color.includes('Sarı') ? '#facc15' : '#10b981'};">
                <strong class="text-slate-100">${r.color}</strong> (Sıra: ${r.order})<br>
                <span class="text-xs text-slate-400">${r.notes}</span>
            </div>
        `).join('');
    } else {
        el.classList.add('hidden');
    }
});

// DRUG SEARCH
const clearBtn = document.getElementById('btn-clear-search');
const drugInput = document.getElementById('input-drug-search');
const drugResult = document.getElementById('container-search-results');

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
        try {
            const res = await searchDrugsInDB(q);
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
            drugResult.innerHTML = '';
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

// SOAP COPY INLINE
function updateLiveSOAP() {
    const soapText = generateSOAP();
    document.getElementById('text-soap-output').value = soapText;
}

document.getElementById('btn-copy-soap').addEventListener('click', () => {
    const text = document.getElementById('text-soap-output').value;
    navigator.clipboard.writeText(text).then(() => {
        const fb = document.getElementById('copy-feedback');
        fb.classList.remove('hidden');
        setTimeout(() => fb.classList.add('hidden'), 2000);
    });
});

// PWA Service Worker Registration (Çevrimdışı Çalışma)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('[PWA] Service Worker aktif:', reg.scope))
            .catch(err => console.error('[PWA] Service Worker kayıt hatası:', err));
    });
}