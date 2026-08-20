import { appState } from './state.js';
import { calculateBSA, calculateEGFR } from './engines/biometricsEngine.js';
import { calculatePediatricDose, getVaccineSchedule } from './engines/pediatricEngine.js';
import { calculatePercentiles } from './engines/percentileEngine.js';
import { calculateAlvarado, calculateParkland, getSutureGuidance, calculateRanson } from './engines/surgeryEngine.js';
import { calculateObstetrics, calculateBishop, calculatePreeclampsia } from './engines/obgynEngine.js';
import { analyzeBloodGas } from './engines/bloodGasEngine.js';
import { calculateMaintenanceFluid, calculateSodiumCorrection } from './engines/fluidEngine.js';
import { calculateNEWS2, calculatePEWS, calculateGCS } from './engines/triageEngine.js';
import { calculateQTc, calculateAxis } from './engines/cardiacEngine.js';
import { getLabTubeGuide } from './engines/labGuideEngine.js';
import { calculateCorrectedCalcium } from './engines/calciumEngine.js';
import { calculateInfusionRate } from './engines/infusionEngine.js';
import { generateSOAP } from './utils/soapGenerator.js';
import { seedDrugDatabase, searchDrugsInDB } from './db/titckIndexedDB.js';

// Utils
const parseNum = (val) => val === '' || isNaN(val) ? null : Number(val);

// Initialize DB
fetch('./data/medicines.json')
    .then(r => r.json())
    .then(data => seedDrugDatabase(data))
    .catch(() => console.log('Mock/Offline DB Mode'));

// Update Logic
function updateAllTabs() {
    // 1. BIOMETRY
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
    const totalMonths = (y || 0) * 12 + (m || 0);
    
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

    const percContainer = document.getElementById('container-percentiles');
    if (appState.biometry.weightKg && appState.biometry.heightCm && appState.biometry.gender) {
        appState.pediatrics.percentiles = calculatePercentiles({
            totalMonths,
            gender: appState.biometry.gender,
            weightKg: appState.biometry.weightKg,
            heightCm: appState.biometry.heightCm,
            isPediatric: totalMonths <= 216
        });
        if (appState.pediatrics.percentiles) {
            percContainer.classList.remove('hidden');
            document.getElementById('output-p-weight').textContent = appState.pediatrics.percentiles.weightPercentile || '--';
            document.getElementById('output-p-height').textContent = appState.pediatrics.percentiles.heightPercentile || '--';
        } else {
            percContainer.classList.add('hidden');
        }
    } else {
        appState.pediatrics.percentiles = null;
        percContainer.classList.add('hidden');
    }

    // Vaccines
    if (ageVal !== null) {
        const vax = getVaccineSchedule(totalMonths);
        document.getElementById('output-ped-vaccines').innerHTML = vax && vax.length 
            ? `<ul class="list-disc pl-4 text-slate-300">${vax.map(v => `<li>${v}</li>`).join('')}</ul>`
            : 'Bu ay için planlı aşı bulunamadı.';
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
    const nHr = parseNum(document.getElementById('input-hr').value);
    const nTemp = parseNum(document.getElementById('input-temp').value);
    const nAvpu = document.getElementById('input-avpu').value;
    const nOx = document.getElementById('input-oxygen').checked;
    const riskContainer = document.getElementById('container-vitals-risk');
    const badgeRiskType = document.getElementById('badge-risk-type');
    const textRiskScore = document.getElementById('text-risk-score');
    const flagContainer = document.getElementById('container-flags');
    
    if (totalMonths !== null && totalMonths < 192 && pewsB !== null && pewsC !== null && pewsR !== null) {
        appState.pediatrics.pews = calculatePEWS(pewsB, pewsC, pewsR);
        riskContainer.classList.remove('hidden');
        riskContainer.className = `p-3 rounded-xl border flex flex-col gap-1 ${appState.pediatrics.pews.score >= 3 ? 'bg-rose-950/40 border-rose-600/50' : 'bg-emerald-950/40 border-emerald-600/50'}`;
        badgeRiskType.textContent = 'PEWS';
        badgeRiskType.className = `text-xs font-bold font-mono ${appState.pediatrics.pews.score >= 3 ? 'text-rose-400' : 'text-emerald-400'}`;
        textRiskScore.textContent = `Skor: ${appState.pediatrics.pews.score}`;
        flagContainer.innerHTML = appState.pediatrics.pews.recommendation;
        appState.medicine.news2 = null;
    } else if (nRr !== null && nSpo2 !== null && nSbp !== null && nHr !== null && nTemp !== null) {
        appState.medicine.news2 = calculateNEWS2(nRr, nSpo2, nSbp, nHr, nTemp, nOx, nAvpu);
        riskContainer.classList.remove('hidden');
        riskContainer.className = `p-3 rounded-xl border flex flex-col gap-1 ${appState.medicine.news2.score >= 5 ? 'bg-rose-950/40 border-rose-600/50' : 'bg-slate-800 border-slate-700/50'}`;
        badgeRiskType.textContent = 'NEWS2';
        badgeRiskType.className = `text-xs font-bold font-mono ${appState.medicine.news2.score >= 5 ? 'text-rose-400' : 'text-slate-300'}`;
        textRiskScore.textContent = `Skor: ${appState.medicine.news2.score}`;
        flagContainer.innerHTML = `${appState.medicine.news2.risk} - ${appState.medicine.news2.monitoring}`;
        appState.pediatrics.pews = null;
    } else {
        riskContainer.classList.add('hidden');
    }

    // GCS
    const gcsE = parseNum(document.getElementById('select-gcs-e').value);
    const gcsV = parseNum(document.getElementById('select-gcs-v').value);
    const gcsM = parseNum(document.getElementById('select-gcs-m').value);
    if (gcsE && gcsV && gcsM) {
        appState.medicine.gcs = calculateGCS(gcsE, gcsV, gcsM);
        const gRes = document.getElementById('container-gcs-warnings');
        gRes.classList.remove('hidden');
        gRes.innerHTML = `GCS: ${appState.medicine.gcs.total} (${appState.medicine.gcs.interpretation}) <br> <span class="text-rose-400">${appState.medicine.gcs.airwayRisk || ''}</span>`;
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
    if (tbsa && appState.biometry.weightKg) {
        appState.surgery.parkland = calculateParkland(appState.biometry.weightKg, tbsa, appState.biometry.ageYears);
        const pkRes = document.getElementById('output-parkland');
        pkRes.classList.remove('hidden');
        pkRes.innerHTML = `<strong>Total (24s):</strong> ${appState.surgery.parkland.totalVolume} mL <span class="text-[9px] text-slate-400">(ATLS 10. Baskı: ${appState.surgery.parkland.multiplierUsed}mL/kg)</span><br>
                           <strong>İlk 8 Saat:</strong> ${appState.surgery.parkland.first8HrsVolume} mL (${appState.surgery.parkland.first8HrsRate} mL/s)<br>
                           <strong>Kalan 16 Saat:</strong> ${appState.surgery.parkland.next16HrsVolume} mL (${appState.surgery.parkland.next16HrsRate} mL/s)`;
    }

    const sutureLoc = document.getElementById('select-suture-loc').value;
    const sutureRes = document.getElementById('output-suture');
    if (sutureLoc) {
        appState.surgery.suture = getSutureGuidance(sutureLoc);
        sutureRes.classList.remove('hidden');
        sutureRes.innerHTML = `<strong>Materyal:</strong> ${appState.surgery.suture.material}<br>
                               <strong>Boyut:</strong> ${appState.surgery.suture.size}<br>
                               <strong>Alınma:</strong> ${appState.surgery.suture.removalDays}`;
    }

    // OBGYN
    const lmp = document.getElementById('input-lmp').value;
    if (lmp) {
        appState.obgyn.eddData = calculateObstetrics(lmp);
        const eddRes = document.getElementById('output-edd');
        eddRes.classList.remove('hidden');
        eddRes.innerHTML = `GH: ${appState.obgyn.eddData.gestationalAge} | TDT: ${appState.obgyn.eddData.edd}`;
    }

    const bDil = parseNum(document.getElementById('input-bishop-dil').value);
    const bEff = parseNum(document.getElementById('input-bishop-eff').value);
    const bSta = parseNum(document.getElementById('input-bishop-sta').value);
    const bCon = parseNum(document.getElementById('input-bishop-con').value);
    const bPos = parseNum(document.getElementById('input-bishop-pos').value);
    if (bDil !== null && bEff !== null && bSta !== null && bCon !== null && bPos !== null) {
        appState.obgyn.bishop = calculateBishop(bDil, bEff, bSta, bCon, bPos);
        const bRes = document.getElementById('output-bishop');
        bRes.classList.remove('hidden');
        bRes.textContent = `Skor: ${appState.obgyn.bishop.score}. ${appState.obgyn.bishop.interpretation}`;
    }

    const preSbp = parseNum(document.getElementById('input-sys-bp').value); // reuse sys bp
    const preDbp = parseNum(document.getElementById('input-dia-bp').value); // reuse dia bp
    const prePro = document.getElementById('chk-pre-pro').checked;
    const preSym = document.getElementById('chk-pre-sym').checked;
    const preRes = document.getElementById('output-pre');
    if (preSbp !== null && preDbp !== null) {
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
    const targetNaDrop = parseNum(document.getElementById('input-target-na-change').value) || 8;
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
    if (ph && pco2 && hco3) {
        appState.medicine.bloodGas = analyzeBloodGas({
            pH: ph, pCO2: pco2, HCO3: hco3, 
            Na: parseNum(document.getElementById('input-bg-na').value), 
            Cl: parseNum(document.getElementById('input-bg-cl').value), 
            Albumin: parseNum(document.getElementById('input-albumin').value), 
            sampleType: document.getElementById('select-bg-type').value
        });
        const bgRes = document.getElementById('container-bg-warnings');
        bgRes.classList.remove('hidden');
        bgRes.innerHTML = `${appState.medicine.bloodGas.diagnosis}`;
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

    // CARDIAC
    const qt = parseNum(document.getElementById('input-ecg-qt').value);
    const rr = parseNum(document.getElementById('input-ecg-rr').value);
    if (qt && rr) {
        appState.other.cardiac = calculateQTc(qt, rr);
        const qtRes = document.getElementById('output-ecg-qtc');
        qtRes.classList.remove('hidden');
        qtRes.textContent = `QTc: ${appState.other.cardiac.qtcBazett} ms (Bazett). ${appState.other.cardiac.interpretation}`;
    }

    const ecgD1 = parseNum(document.getElementById('input-ecg-d1').value);
    const ecgAvf = parseNum(document.getElementById('input-ecg-avf').value);
    if (ecgD1 !== null && ecgAvf !== null) {
        const axisObj = calculateAxis(ecgD1, ecgAvf);
        const axisRes = document.getElementById('output-ecg-axis');
        if (axisObj) {
            axisRes.classList.remove('hidden');
            axisRes.textContent = `Aks: ${axisObj.axisAngle}° (${axisObj.axisInterpretation})`;
        }
    }

    // Live SOAP Update
    updateLiveSOAP();
}

document.addEventListener('input', updateAllTabs);
document.addEventListener('change', updateAllTabs);

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
    const q = e.target.value;
    if (q.length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
        drugResult.innerHTML = '';
        drugResult.classList.add('hidden');
        return;
    }

    if (q.length > 2) {
        try {
            const res = await searchDrugsInDB(q);
            if (res && res.length > 0) {
                drugResult.classList.remove('hidden');
                drugResult.innerHTML = res.map(r => `
                    <div class="mb-1 p-3 border-l-2 border-rose-500 bg-slate-900 shadow-sm relative group">
                        <div class="cursor-pointer hover:bg-slate-800 drug-item-add pr-16" data-brand="${r.brand}" data-generic="${r.generic}">
                            <strong class="text-rose-300 text-sm flex flex-wrap items-center gap-1">
                                <span>${r.brand}</span>
                                ${Number(r.isChildEssential) > 0 ? '<span class="px-1.5 bg-sky-900/40 text-sky-300 border border-sky-700/50 rounded-full text-[9px]">Pediatrik</span>' : ''}
                                ${Number(r.isNeonateEssential) > 0 ? '<span class="px-1.5 bg-fuchsia-900/40 text-fuchsia-300 border border-fuchsia-700/50 rounded-full text-[9px]">Neonatal</span>' : ''}
                            </strong>
                            <span class="text-[10px] text-slate-400 font-medium">${r.generic} | ${r.atcCode} | ${r.prescriptionType}</span>
                        </div>
                        <button type="button" class="btn-muadil absolute top-1/2 -translate-y-1/2 right-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-500 text-[10px] px-2 py-1 rounded text-cyan-300 transition-all opacity-80 hover:opacity-100" data-atc="${r.atcCode}" data-generic="${r.generic}">Muadil</button>
                    </div>
                `).join('');
            } else {
                drugResult.classList.remove('hidden');
                drugResult.innerHTML = '<div class="p-3 text-xs text-gray-500 bg-slate-900">Bulunamadı</div>';
            }
        } catch (err) {
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
        
        if (!appState.treatment) appState.treatment = { selectedDrugs: [] };
        if (!appState.treatment.selectedDrugs.find(d => d.brand === brand)) {
            appState.treatment.selectedDrugs.push({ brand, generic });
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
        <div class="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-700">
            <div class="flex flex-col">
                <span class="text-xs text-rose-300 font-bold">${d.brand}</span>
                <span class="text-[10px] text-slate-400">${d.generic}</span>
            </div>
            <button class="text-slate-500 hover:text-rose-500 text-xs px-2 py-1" onclick="window.removeDrug(${index})">✕</button>
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