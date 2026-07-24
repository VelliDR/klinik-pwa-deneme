import { appState, subscribeState, notifySubscribers } from './state.js';
import { calculateBSA, determineAgeGroup } from './engines/biometricsEngine.js';
import { calculatePercentiles } from './engines/percentileEngine.js';
import { seedDrugDatabase, searchDrugsInDB, getDrugCount } from './db.js';
import { parseDrugStrength, findEquivalents, getDrugBadgesHTML } from './drugEngine.js';
import { calculateInfusionRate } from './engines/infusionEngine.js';

function parseNum(id) {
    const el = document.getElementById(id);
    if (!el || el.value === '' || el.value === null) return null;
    const clean = String(el.value).replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
}

// eGFR HESAPLAMA MOTORU (Pediatrik Schwartz + Erişkin CKD-EPI 2021)
function calculateEGFR({ ageInYears, gender, heightCm, creatinine }) {
    if (!creatinine || creatinine <= 0) return null;

    // 1. Pediatrik (<18 Yaş): Bedside Schwartz Formülü
    if (ageInYears < 18) {
        if (!heightCm || heightCm <= 0) return null;
        const gfr = (0.413 * heightCm) / creatinine;
        return Number(gfr.toFixed(1));
    }

    // 2. Erişkin (>=18 Yaş): CKD-EPI 2021 Formülü
    if (!ageInYears || ageInYears <= 0) return null;
    const isFemale = gender === 'female';
    const kappa = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.241 : -0.302;
    const genderMultiplier = isFemale ? 1.012 : 1.0;

    const scrKappa = creatinine / kappa;
    const minVal = Math.min(scrKappa, 1);
    const maxVal = Math.max(scrKappa, 1);

    const gfr = 142 * Math.pow(minVal, alpha) * Math.pow(maxVal, -1.200) * Math.pow(0.9938, ageInYears) * genderMultiplier;
    return Number(gfr.toFixed(1));
}

function recalculateAll() {
    const p = appState.patient;
    const v = appState.vitals;
    const g = appState.glycemia;
    const d = appState.drugs;

    // Çoklu İlaç Dizi Kontrolü
    if (!Array.isArray(d.selectedDrugs)) {
        d.selectedDrugs = [];
    }

    p.ageUnit = document.getElementById('select-age-unit')?.value || 'years';
    p.ageValue = parseNum('input-age');
    p.gender = document.getElementById('select-gender')?.value || 'male';
    p.heightCm = parseNum('input-height');
    p.weightKg = parseNum('input-weight');
    p.creatinine = parseNum('input-creatinine');

    v.systolicBP = parseNum('input-sys-bp');
    v.diastolicBP = parseNum('input-dia-bp');
    v.heartRate = parseNum('input-hr');
    v.respRate = parseNum('input-rr');
    v.bodyTemp = parseNum('input-temp');
    v.spo2 = parseNum('input-spo2');

    g.currentGlucose = parseNum('input-glucose');
    g.carbsGrams = parseNum('input-carbs') || 0;
    g.isf = parseNum('input-isf');
    g.icRatio = parseNum('input-ic-ratio');

    const customNotes = document.getElementById('input-custom-notes')?.value;

    let totalMonths = 0;
    let ageInYears = 0;

    if (p.ageValue) {
        if (p.ageUnit === 'years') {
            totalMonths = p.ageValue * 12;
            ageInYears = p.ageValue;
        } else if (p.ageUnit === 'months') {
            totalMonths = p.ageValue;
            ageInYears = p.ageValue / 12;
        } else if (p.ageUnit === 'days') {
            totalMonths = Number((p.ageValue / 30).toFixed(2));
            ageInYears = p.ageValue / 365;
        }
    }
    
    p.derived.totalMonths = totalMonths;
    p.derived.ageGroup = p.ageValue > 0 ? determineAgeGroup(p.ageValue, p.ageUnit) : null;
    p.derived.bsa = calculateBSA(p.heightCm, p.weightKg);

    const egfrValue = calculateEGFR({
        ageInYears,
        gender: p.gender,
        heightCm: p.heightCm,
        creatinine: p.creatinine
    });
    p.derived.egfr = egfrValue;

    const ageText = p.ageUnit === 'days' ? `${p.ageValue} Gün` : 
                    p.ageUnit === 'months' ? `${p.ageValue} Ay` : 
                    `${p.ageValue} Yaş`;

    const bsaOut = document.getElementById('output-bsa');
    if (bsaOut) bsaOut.textContent = p.derived.bsa ? `${p.derived.bsa} m²` : '--';

    const egfrOut = document.getElementById('output-egfr');
    if (egfrOut) egfrOut.textContent = egfrValue ? `${egfrValue} ml/dk/1.73m²` : '--';
    
    const percentileResult = calculatePercentiles({
        totalMonths: totalMonths,
        gender: p.gender,
        heightCm: p.heightCm,
        weightKg: p.weightKg,
        isPediatric: p.derived.ageGroup ? p.derived.ageGroup.isPediatric : false
    });

    const badge = document.getElementById('badge-age-group');
    if (badge) {
        if (p.derived.ageGroup && p.ageValue > 0) {
            badge.textContent = `${p.derived.ageGroup.label} (${ageText})`;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    const pContainer = document.getElementById('container-percentiles');
    if (pContainer) {
        if (percentileResult && (percentileResult.heightPercentile || percentileResult.weightPercentile || percentileResult.bmiPercentile)) {
            pContainer.classList.remove('hidden');
            const hElem = document.getElementById('output-p-height');
            const wElem = document.getElementById('output-p-weight');
            const bmiElem = document.getElementById('output-p-bmi');

            if (hElem) hElem.textContent = percentileResult.heightPercentile ? `${percentileResult.heightPercentile}. Persentil` : '--';
            if (wElem) wElem.textContent = percentileResult.weightPercentile ? `${percentileResult.weightPercentile}. Persentil` : '--';
            if (bmiElem) bmiElem.textContent = percentileResult.bmiPercentile ? `${percentileResult.bmiPercentile}. P (${percentileResult.category})` : '--';
        } else {
            pContainer.classList.add('hidden');
        }
    }

    const vBox = document.getElementById('container-vitals-risk');
    if (vBox) {
        let score = 0;
        let flags = [];
        const isPed = p.derived.ageGroup ? p.derived.ageGroup.isPediatric : false;

        if (v.heartRate) {
            if (isPed && (v.heartRate > 160 || v.heartRate < 60)) { score += 3; flags.push('Anormal Nabız'); }
            else if (!isPed && (v.heartRate > 130 || v.heartRate < 50)) { score += 3; flags.push('Anormal Nabız'); }
        }
        
        if (v.spo2 && v.spo2 < 92) { score += 3; flags.push('Hipoksi'); }
        
        if (v.bodyTemp) {
            if (v.bodyTemp >= 38.5) { score += 1; flags.push('Yüksek Ateş'); }
            else if (v.bodyTemp <= 35.0) { score += 2; flags.push('Hipotermi'); }
        }

        if (v.respRate) {
            if (isPed && (v.respRate > 50 || v.respRate < 15)) { score += 3; flags.push('Anormal Solunum'); }
            else if (!isPed && (v.respRate > 25 || v.respRate < 9)) { score += 3; flags.push('Anormal Solunum'); }
        }

        if (v.systolicBP) {
            if (isPed) {
                if (v.systolicBP >= 130) { score += 3; flags.push('Hipertansiyon'); }
                else if (v.systolicBP <= 70) { score += 3; flags.push('Hipotansiyon'); }
            } else {
                if (v.systolicBP >= 180) { score += 3; flags.push('Hipertansif Kriz'); }
                else if (v.systolicBP <= 90) { score += 3; flags.push('Hipotansiyon'); }
            }
        }

        if (v.heartRate || v.spo2 || v.bodyTemp || v.respRate || v.systolicBP) {
            vBox.classList.remove('hidden');
            const bType = document.getElementById('badge-risk-type');
            const tScore = document.getElementById('text-risk-score');
            const flagsDiv = document.getElementById('container-flags');

            if (bType) bType.textContent = isPed ? 'PEWS' : 'NEWS2';
            if (tScore) tScore.textContent = `Skor: ${score}`;

            vBox.className = "p-3 rounded-xl border flex flex-col gap-1 transition-colors " + 
                (score >= 4 ? 'bg-rose-950/60 border-rose-600 text-rose-200' : 
                 score >= 2 ? 'bg-amber-950/60 border-amber-600 text-amber-200' : 
                 'bg-emerald-950/60 border-emerald-600 text-emerald-200');

            if (flagsDiv) {
                flagsDiv.innerHTML = '';
                flags.forEach(f => {
                    flagsDiv.innerHTML += `<span class="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded">⚠️ ${f}</span>`;
                });
            }
        } else {
            vBox.classList.add('hidden');
        }
    }

    const dFluid = document.getElementById('output-daily-fluid');
    const hFluid = document.getElementById('output-hourly-fluid');
    if (dFluid && hFluid) {
        if (p.weightKg && p.weightKg > 0) {
            let base = p.weightKg <= 10 ? p.weightKg * 100 : p.weightKg <= 20 ? 1000 + (p.weightKg - 10) * 50 : 1500 + (p.weightKg - 20) * 20;
            if (base > 2500) base = 2500;
            if (v.bodyTemp && v.bodyTemp > 37.5) base *= (1 + (v.bodyTemp - 37.5) * 0.12);
            const daily = Math.round(base);
            dFluid.textContent = `${daily} ml/gün`;
            hFluid.textContent = `${(daily / 24).toFixed(1)} ml/saat`;
        } else {
            dFluid.textContent = '--';
            hFluid.textContent = '--';
        }
    }

    const totInsulin = document.getElementById('output-total-insulin');
    if (totInsulin) {
        if (g.currentGlucose && g.currentGlucose > 0) {
            let corr = (g.isf > 0 && g.currentGlucose > 100) ? (g.currentGlucose - 100) / g.isf : 0;
            let carbDose = g.icRatio > 0 ? g.carbsGrams / g.icRatio : 0;
            totInsulin.textContent = `${(corr + carbDose).toFixed(1)} Ünite`;
        } else {
            totInsulin.textContent = '--';
        }
    }

    // 1. İNFÜZYON HESAPLAMA (SOAP Notundan Önce Hesaplayıp Hafızaya Alıyoruz)
    const infMg = parseNum('input-inf-mg');
    const infVol = parseNum('input-inf-vol');
    const infDose = parseNum('input-inf-dose');
    const infUnit = document.getElementById('select-inf-unit')?.value || 'mcg_kg_min';

    const infResult = calculateInfusionRate({
        drugAmountMg: infMg,
        totalVolumeMl: infVol,
        weightKg: p.weightKg,
        targetDose: infDose,
        doseUnit: infUnit
    });

    const infOut = document.getElementById('output-infusion-rate');
    if (infOut) {
        if (infResult) {
            infOut.textContent = `${infResult.rateMlHr} ml/saat (${infResult.concentrationMcgMl} mcg/ml)`;
        } else {
            infOut.textContent = '--';
        }
    }

    // 2. ÇOKLU İLAÇ LİSTESİNİ RENDER ETME (Güvenli Çözelti Gösterimi)
    const containerSelected = document.getElementById('container-selected-drugs');
    if (containerSelected) {
        containerSelected.innerHTML = '';

        d.selectedDrugs.forEach((drug, index) => {
            const strength = parseDrugStrength(drug.brand);
            let volHtml = '';

            // Tehlikeli doz sapmalarını önlemek için sadece net konsantrasyon gösterilir
            if (strength && strength.type === 'liquid') {
                volHtml = `
                    <div class="text-[11px] text-emerald-400 font-mono mt-1 border-t border-slate-700/60 pt-1">
                        🧪 <strong>Konsantrasyon:</strong> ${strength.label}
                    </div>
                `;
            } else if (strength) {
                volHtml = `<span class="text-[10px] text-slate-400 font-mono block mt-0.5">Form: ${strength.label}</span>`;
            }

            const item = document.createElement('div');
            item.className = "bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-1.5 relative";
            item.innerHTML = `
                <div class="flex justify-between items-start gap-2">
                    <div class="pr-6">
                        <strong class="text-xs font-bold text-rose-400 block">${drug.brand}</strong>
                        <span class="text-[10px] text-slate-400 block">${drug.generic || 'Etken madde belirtilmedi'}</span>
                    </div>
                    <button type="button" data-index="${index}" class="btn-remove-drug absolute top-2 right-2 text-slate-400 hover:text-rose-400 font-bold text-xs p-1 rounded-md hover:bg-slate-800 transition-colors" title="İlacı Kaldır">
                        ✕
                    </button>
                </div>
                <div class="flex flex-wrap gap-1">
                    ${getDrugBadgesHTML(drug)}
                </div>
                ${volHtml}
                <div id="container-eq-${index}" class="pt-1"></div>
            `;
            containerSelected.appendChild(item);

            findEquivalents(drug).then(equivalents => {
                const eqDiv = document.getElementById(`container-eq-${index}`);
                if (eqDiv) {
                    if (equivalents.length > 0) {
                        eqDiv.innerHTML = `
                            <details class="text-[10px] text-slate-400 mt-1">
                                <summary class="cursor-pointer text-slate-300 font-semibold hover:text-emerald-400 transition-colors flex items-center gap-1 select-none">
                                    <span>🔄</span> Aktif Muadiller (${equivalents.length})
                                </summary>
                                <div class="flex flex-col gap-1 mt-1.5 pl-2 border-l-2 border-slate-700 max-h-32 overflow-y-auto">
                                    ${equivalents.map(e => `
                                        <div class="text-slate-200 text-[10px] flex items-center gap-1.5 py-0.5">
                                            <span class="text-emerald-400">•</span>
                                            <span class="truncate font-medium">${e.brand}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        `;
                    } else {
                        eqDiv.innerHTML = `<span class="text-slate-500 text-[10px] italic block mt-1">Sistemde birebir aktif muadil kaydı bulunamadı.</span>`;
                    }
                }
            });
        });

        containerSelected.querySelectorAll('.btn-remove-drug').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                d.selectedDrugs.splice(idx, 1);
                recalculateAll();
            });
        });
    }

    // 3. SOAP NOTU BASMA (Tam Entegre Çıktı)
    const soapArea = document.getElementById('text-soap-output');
    if (soapArea) {
        let soapText = `=== KLİNİK HASTA NOTU ===\n`;
        soapText += `• Yaş/Cinsiyet: ${p.derived.ageGroup ? p.derived.ageGroup.label : 'Belirtilmedi'} (${ageText}, ${p.gender === 'male' ? 'Erkek' : 'Kız'})\n`;
        soapText += `• Ölçümler: Boy: ${p.heightCm || '--'} cm | Kilo: ${p.weightKg || '--'} kg | BSA: ${p.derived.bsa || '--'} m²`;
        
        if (p.creatinine) {
            soapText += ` | Kr: ${p.creatinine} mg/dL | eGFR: ${p.derived.egfr || '--'} ml/dk`;
        }
        soapText += `\n`;
        
        if (customNotes && customNotes.trim()) {
            soapText += `• Anamnez / FM: ${customNotes.trim()}\n`;
        }

        if (percentileResult && percentileResult.bmiPercentile) {
            soapText += `• Persentil: Boy P:${percentileResult.heightPercentile || '--'} | Kilo P:${percentileResult.weightPercentile || '--'} | BKİ P:${percentileResult.bmiPercentile} (${percentileResult.category})\n`;
        }
        soapText += `• Vitaller: TA: ${v.systolicBP || '--'}/${v.diastolicBP || '--'} mmHg | Nabız: ${v.heartRate || '--'}/dk | Ateş: ${v.bodyTemp || '--'}°C | SpO2: %${v.spo2 || '--'}\n`;
        soapText += `• Plan: İdame Sıvı: ${document.getElementById('output-daily-fluid')?.textContent || '--'}`;
        
        // İnfüzyon bilgisi varsa SOAP nota eklenir
        if (infResult && infMg && infDose) {
            const unitLabel = infUnit === 'mcg_kg_min' ? 'mcg/kg/dk' : infUnit === 'mcg_min' ? 'mcg/dk' : 'mg/kg/saat';
            soapText += `\n• Perfüzör / İnfüzyon: ${infMg} mg / ${infVol} ml SF (${infDose} ${unitLabel}) → ${infResult.rateMlHr} ml/saat (${infResult.concentrationMcgMl} mcg/ml)`;
        }

        if (d.selectedDrugs && d.selectedDrugs.length > 0) {
            soapText += `\n• Reçete / İlaçlar (${d.selectedDrugs.length}):\n`;
            d.selectedDrugs.forEach((drug, i) => {
                soapText += `  ${i + 1}. ${drug.brand} (${drug.generic || 'Etken madde yok'})\n`;
            });
        }
        
        soapArea.value = soapText;
    }

    notifySubscribers();
}

async function syncDatabaseOnInit() {
    const CURRENT_VERSION_TAG = 'KLINIK_DB_PHONETIC_V15';
    const installedTag = localStorage.getItem('KLINIK_DB_TAG');
    const searchInput = document.getElementById('input-drug-search');

    try {
        const count = await getDrugCount();
        console.log(`📊 Cihazda Bulunan İlaç Sayısı: ${count}`);

        if (installedTag !== CURRENT_VERSION_TAG || count === 0) {
            console.log('🔄 Güncel TİTCK veritabanı indiriliyor ve cihaz diski sıfırlanıyor...');
            
            if (searchInput) {
                searchInput.disabled = true;
                searchInput.placeholder = '⏳ İlaç veritabanı cihaza indiriliyor (%0)...';
            }

            indexedDB.deleteDatabase('KlinikAsistanDB');

            const response = await fetch('./data/medicines.json');
            const rawData = await response.json();

            await seedDrugDatabase(rawData, (percent) => {
                console.log(`📥 Veritabanı Yazılıyor: %${percent}`);
                if (searchInput) {
                    searchInput.placeholder = `⏳ İlaçlar hazırlanıyor (%${percent})...`;
                }
            });

            localStorage.setItem('KLINIK_DB_TAG', CURRENT_VERSION_TAG);
            console.log('✅ Bütün TİTCK ilaç listesi eksiksiz kuruldu!');
        }
    } catch (err) {
        console.error('❌ Veritabanı senkronizasyon hatası:', err);
    } finally {
        if (searchInput) {
            searchInput.disabled = false;
            searchInput.placeholder = 'İlaç adı, etken madde veya barkod yazın...';
        }
    }
}

function initEvents() {
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id !== 'input-drug-search' && el.id !== 'text-soap-output') {
            el.addEventListener('input', recalculateAll);
            el.addEventListener('change', recalculateAll);
        }
    });

    const searchInput = document.getElementById('input-drug-search');
    const clearBtn = document.getElementById('btn-clear-search');
    const resultsDiv = document.getElementById('container-search-results');

    // 1. Temizleme Butonuna Tıklama Olayı
    if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.classList.add('hidden');
            if (resultsDiv) resultsDiv.classList.add('hidden');
            searchInput.focus();
        });
    }

    // 2. Arama İnput Olayı
    if (searchInput && resultsDiv) {
        searchInput.addEventListener('input', async (e) => {
            const q = e.target.value;

            if (q.trim().length > 0) {
                clearBtn?.classList.remove('hidden');
            } else {
                clearBtn?.classList.add('hidden');
            }

            if (q.trim().length >= 2) {
                const matches = await searchDrugsInDB(q);
                resultsDiv.innerHTML = '';

                if (matches.length > 0) {
                    resultsDiv.classList.remove('hidden');
                    matches.forEach(drug => {
                        const item = document.createElement('div');
                        item.className = "p-2 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 flex flex-col gap-1";
                        item.innerHTML = `
                            <div class="flex justify-between items-start">
                                <div>
                                    <strong class="text-slate-100 text-xs block">${drug.brand}</strong>
                                    <span class="text-[10px] text-slate-400 block">${drug.generic}</span>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-1 mt-0.5">
                                ${getDrugBadgesHTML(drug)}
                            </div>
                        `;
                        item.addEventListener('click', () => {
                            if (!Array.isArray(appState.drugs.selectedDrugs)) {
                                appState.drugs.selectedDrugs = [];
                            }
                            appState.drugs.selectedDrugs.push(drug);
                            searchInput.value = '';
                            clearBtn?.classList.add('hidden');
                            resultsDiv.classList.add('hidden');
                            recalculateAll();
                        });
                        resultsDiv.appendChild(item);
                    });
                } else {
                    resultsDiv.classList.add('hidden');
                }
            } else {
                resultsDiv.classList.add('hidden');
            }
        });
    }

    const copyBtn = document.getElementById('btn-copy-soap');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const soapText = document.getElementById('text-soap-output')?.value;
            if (soapText) {
                navigator.clipboard.writeText(soapText);
                const fb = document.getElementById('copy-feedback');
                if (fb) {
                    fb.classList.remove('hidden');
                    setTimeout(() => fb.classList.add('hidden'), 2000);
                }
            }
        });
    }

    const resetBtn = document.getElementById('btn-reset-form');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.querySelectorAll('input, textarea').forEach(el => {
                if (el.id !== 'text-soap-output') el.value = '';
            });
            document.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
            appState.drugs.selectedDrugs = [];
            recalculateAll();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    recalculateAll();
    syncDatabaseOnInit();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Yeni versiyon indi, önbellek yenilendi!
                        window.location.reload();
                    }
                });
            });
        }).catch(err => console.error('Service Worker hatası:', err));
    });
}