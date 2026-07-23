import { appState, subscribeState, notifySubscribers } from './state.js';
import { calculateBSA, determineAgeGroup } from './engines/biometricsEngine.js';
import { calculatePercentiles } from './engines/percentileEngine.js';
import { seedDrugDatabase, searchDrugsInDB, getDrugCount } from './db.js';
import { parseDrugStrength, findEquivalents, getDrugBadgesHTML } from './drugEngine.js';

const DB_INIT_KEY = 'KLINIK_DB_INITIALIZED_V10'; // Tek merkezden sürüm yönetimi

function parseNum(id) {
    const el = document.getElementById(id);
    if (!el || el.value === '' || el.value === null) return null;
    const clean = String(el.value).replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
}

function recalculateAll() {
    const p = appState.patient;
    const v = appState.vitals;
    const g = appState.glycemia;
    const d = appState.drugs;

    p.ageUnit = document.getElementById('select-age-unit')?.value || 'years';
    p.ageValue = parseNum('input-age');
    p.gender = document.getElementById('select-gender')?.value || 'male';
    p.heightCm = parseNum('input-height');
    p.weightKg = parseNum('input-weight');

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
    if (p.ageValue) {
        if (p.ageUnit === 'years') totalMonths = p.ageValue * 12;
        else if (p.ageUnit === 'months') totalMonths = p.ageValue;
        else if (p.ageUnit === 'days') totalMonths = Number((p.ageValue / 30).toFixed(2));
    }
    
    p.derived.totalMonths = totalMonths;
    p.derived.ageGroup = p.ageValue > 0 ? determineAgeGroup(p.ageValue, p.ageUnit) : null;
    p.derived.bsa = calculateBSA(p.heightCm, p.weightKg);

    const ageText = p.ageUnit === 'days' ? `${p.ageValue} Gün` : 
                    p.ageUnit === 'months' ? `${p.ageValue} Ay` : 
                    `${p.ageValue} Yaş`;

    const bsaOut = document.getElementById('output-bsa');
    if (bsaOut) bsaOut.textContent = p.derived.bsa ? `${p.derived.bsa} m²` : '--';
    
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

    const cardDrug = document.getElementById('card-selected-drug');
    if (cardDrug) {
        if (d.selectedDrug) {
            cardDrug.classList.remove('hidden');
            const titleElem = document.getElementById('text-drug-title');
            const doseElem = document.getElementById('output-drug-dose-mg');
            const volElem = document.getElementById('output-drug-volume-ml');

            if (titleElem) titleElem.textContent = d.selectedDrug.brand;
            if (doseElem) doseElem.innerHTML = getDrugBadgesHTML(d.selectedDrug);

            const strength = parseDrugStrength(d.selectedDrug.brand);
            if (volElem) {
                if (strength && strength.type === 'liquid' && p.weightKg) {
                    const targetMg = p.weightKg * 10;
                    const requiredMl = (targetMg / strength.mgPerMl).toFixed(1);
                    volElem.innerHTML = `
                        <div class="text-xs text-emerald-400 font-mono mt-1 border-t border-slate-700/60 pt-1">
                            🧪 <strong>Konsantrasyon:</strong> ${strength.label}<br>
                            🎯 <strong>Örnek Doz (10mg/kg):</strong> ${targetMg} mg → <span class="text-amber-300 font-bold">${requiredMl} ml</span>
                        </div>
                    `;
                } else if (strength) {
                    volElem.innerHTML = `<span class="text-[10px] text-slate-400 font-mono block mt-1">Saptanan Form: ${strength.label}</span>`;
                } else {
                    volElem.innerHTML = `<span class="text-[10px] text-slate-500 font-mono block mt-1">Barkod: ${d.selectedDrug.barcode || '--'}</span>`;
                }
            }

            // Muadilleri Arka Planda Getir
            findEquivalents(d.selectedDrug).then(equivalents => {
                let eqContainer = document.getElementById('container-equivalents');
                if (!eqContainer) {
                    eqContainer = document.createElement('div');
                    eqContainer.id = 'container-equivalents';
                    eqContainer.className = "mt-3 pt-3 border-t border-slate-700/60 text-xs";
                    cardDrug.appendChild(eqContainer);
                }

                if (equivalents.length > 0) {
                    eqContainer.innerHTML = `
                        <div class="flex items-center justify-between mb-2">
                            <strong class="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                                <span>🔄</span> Aynı Etken Maddeli Aktif Muadiller (${equivalents.length})
                            </strong>
                        </div>
                        <div class="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                            ${equivalents.map(e => `
                                <div class="text-slate-200 bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs flex items-center gap-2 transition-colors">
                                    <span class="text-emerald-400 font-bold text-[10px]">•</span>
                                    <span class="truncate font-medium leading-normal">${e.brand}</span>
                                </div>
                            `).join('')}
                        </div>
                    `;
                } else {
                    eqContainer.innerHTML = `<span class="text-slate-500 text-xs italic block mt-1">Sistemde birebir aktif muadil kaydı bulunamadı.</span>`;
                }
            });

        } else {
            cardDrug.classList.add('hidden');
        }
    }

    const soapArea = document.getElementById('text-soap-output');
    if (soapArea) {
        let soapText = `=== KLİNİK HASTA NOTU ===\n`;
        soapText += `• Yaş/Cinsiyet: ${p.derived.ageGroup ? p.derived.ageGroup.label : 'Belirtilmedi'} (${ageText}, ${p.gender === 'male' ? 'Erkek' : 'Kız'})\n`;
        soapText += `• Ölçümler: Boy: ${p.heightCm || '--'} cm | Kilo: ${p.weightKg || '--'} kg | BSA: ${p.derived.bsa || '--'} m²\n`;
        
        if (customNotes && customNotes.trim()) {
            soapText += `• Anamnez / FM: ${customNotes.trim()}\n`;
        }

        if (percentileResult && percentileResult.bmiPercentile) {
            soapText += `• Persentil: Boy P:${percentileResult.heightPercentile || '--'} | Kilo P:${percentileResult.weightPercentile || '--'} | BKİ P:${percentileResult.bmiPercentile} (${percentileResult.category})\n`;
        }
        soapText += `• Vitaller: TA: ${v.systolicBP || '--'}/${v.diastolicBP || '--'} mmHg | Nabız: ${v.heartRate || '--'}/dk | Ateş: ${v.bodyTemp || '--'}°C | SpO2: %${v.spo2 || '--'}\n`;
        soapText += `• Plan: İdame Sıvı: ${document.getElementById('output-daily-fluid')?.textContent || '--'}`;
        if (d.selectedDrug) soapText += `\n• Seçili İlaç: ${d.selectedDrug.brand} (Etken Madde: ${d.selectedDrug.generic})`;
        
        soapArea.value = soapText;
    }

    notifySubscribers();
}

async function syncDatabaseOnInit() {
    const CURRENT_VERSION_TAG = 'KLINIK_DB_PHONETIC_V15'; // En güncel sürüm etiketimiz
    const installedTag = localStorage.getItem('KLINIK_DB_TAG');
    const searchInput = document.getElementById('input-drug-search');

    try {
        const count = await getDrugCount();
        console.log(`📊 Cihazda Bulunan İlaç Sayısı: ${count}`);

        // Veritabanı eski VEYA bomboşsa sıfırdan kur
        if (installedTag !== CURRENT_VERSION_TAG || count === 0) {
            console.log('🔄 Güncel TİTCK veritabanı indiriliyor ve cihaz diski sıfırlanıyor...');
            
            // 1. Arama input'unu geçici olarak kilitle ve durum yaz
            if (searchInput) {
                searchInput.disabled = true;
                searchInput.placeholder = '⏳ İlaç veritabanı cihaza indiriliyor (%0)...';
            }

            // Eski veritabanını sil
            indexedDB.deleteDatabase('KlinikAsistanDB');

            const response = await fetch('./data/medicines.json');
            const rawData = await response.json();

            // 2. Yükleme yüzdesini input placeholder'ına canlı yazdır
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
        // 3. İşlem bittiğinde (veya hata aldığında) input'u tekrar aç
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
            
            // Seçili ilacı ve hesaplamaları sıfırla
            appState.drugs.selectedDrug = null;
            recalculateAll();

            // Kullanıcı hemen yeni arama yapabilsin diye odağı input'ta tut
            searchInput.focus();
        });
    }

    // 2. Arama İnput Olayı
    if (searchInput && resultsDiv) {
        searchInput.addEventListener('input', async (e) => {
            const q = e.target.value;

            // Metin varsa 'X' butonunu göster, yoksa gizle
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
                            appState.drugs.selectedDrug = drug;
                            searchInput.value = drug.brand;
                            resultsDiv.classList.add('hidden');
                            recalculateAll();
                        });
                        resultsDiv.appendChild(item);
                    });
                } else {
                    resultsDiv.classList.add('hidden');
                }
            } else {
                appState.drugs.selectedDrug = null;
                resultsDiv.classList.add('hidden');
                recalculateAll();
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
            appState.drugs.selectedDrug = null;
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
        navigator.serviceWorker.register('./service-worker.js')
            .catch(err => console.error('Service Worker hatası:', err));
    });
}