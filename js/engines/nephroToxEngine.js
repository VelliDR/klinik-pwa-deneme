/**
 * klinik-pwa - Nephrology, Toxicology & Respiratory Engine
 * 
 * Clinical algorithms:
 * 1. FENa (Fractional Excretion of Sodium) - Prerenal Azotemia vs Intrinsic ATN
 * 2. FEUrea (Fractional Excretion of Urea) - Reliable in patients on Loop Diuretics
 * 3. Katz Hyperglycemia Corrected Sodium (Pseudohyponatremia correction in DKA/HHS)
 * 4. Osmolal Gap - Toxic Alcohol Ingestion (Methanol, Ethylene Glycol)
 * 5. Rumack-Matthew Paracetamol Nomogram & 3-Phase 21-Hour IV NAC Protocol
 * 6. CURB-65 Community-Acquired Pneumonia Severity & Triage
 * 
 * Standards & Guidelines:
 * - KDIGO Clinical Practice Guideline for Acute Kidney Injury
 * - Carvounis CP et al. Significance of the fractional excretion of urea in the differential diagnosis of acute renal failure. Kidney Int.
 * - Katz MA. Hyperglycemia-induced hypo-osmolar state. N Engl J Med.
 * - Rumack BH, Matthew H. Acetaminophen poisoning and toxicity. Pediatrics.
 * - Lim WS et al. British Thoracic Society guidelines for the management of community acquired pneumonia in adults. Thorax.
 */

/**
 * 1. FENa (Fraksiyonel Sodyum Atılımı)
 * @param {Object} params
 * @returns {Object|null}
 */
export function calculateFENa(params = {}) {
    const urineNa = Number(params.urineNa ?? params.urineSodium);
    const serumNa = Number(params.serumNa ?? params.serumSodium);
    const urineCr = Number(params.urineCr ?? params.urineCreatinine);
    const serumCr = Number(params.serumCr ?? params.serumCreatinine);
    const isOnDiuretics = Boolean(params.isOnDiuretics);

    if (isNaN(urineNa) || isNaN(serumNa) || isNaN(urineCr) || isNaN(serumCr) || urineNa <= 0 || serumNa <= 0 || urineCr <= 0 || serumCr <= 0) {
        return null;
    }

    const fena = ((urineNa * serumCr) / (serumNa * urineCr)) * 100;
    const fenaVal = Number(fena.toFixed(2));

    let category = '';
    let etiology = '';
    let recommendation = '';
    let alertClass = 'text-emerald-400';

    if (fenaVal < 1.0) {
        etiology = 'Prerenal Azotemi';
        category = 'Prerenal Azotemi (FENa < %1)';
        recommendation = 'Böbrek tübülleri sağlam; sodyumu tutabiliyor. Hipo-perfüzyon / hipovolemi / dehidratasyon lehine. Sıvı resüsitasyonu ve hemodinamik optimizasyon önerilir.';
        alertClass = 'text-emerald-400';
    } else if (fenaVal <= 2.0) {
        etiology = 'Gri Bölge / Karışık';
        category = 'Gri Bölge / Karışık Tablo (FENa %1 - %2)';
        recommendation = 'Prerenal veya erken intrensek hasar olabilir. Klinik tablo, idrar sedimenti ve hidrasyon durumuyla birlikte değerlendiriniz.';
        alertClass = 'text-amber-400';
    } else {
        etiology = 'İntrensek Renal / ATN';
        category = 'İntrensek Böbrek Hasarı / ATN (FENa > %2)';
        recommendation = 'Tübüler hasar nedeniyle sodyum geri emilemiyor. Akut Tübüler Nekroz (ATN), glomerülonefrit veya nefrotoksik hasar lehinedir. Nefrotoksik ajanları kesiniz; aşırı sıvı yüklemesinden kaçınınız.';
        alertClass = 'text-rose-400';
    }

    let diureticWarning = null;
    if (isOnDiuretics) {
        diureticWarning = '⚠️ DİKKAT: Hasta Loop Diüretiği (Furosemid) kullanmaktadır! Diüretikler idrar sodyumunu artırarak FENa\'yı yalancı yüksek çıkarır. Bu hastada FEUrea (Fraksiyonel Üre Atılımı) hesaplanmalıdır.';
    }

    return {
        isValid: true,
        fena: fenaVal,
        fenaPercent: fenaVal,
        category,
        etiology,
        interpretation: `${category}. ${recommendation}`,
        recommendation,
        recommendations: [recommendation],
        diureticWarning,
        alertClass
    };
}

/**
 * 2. FEUrea (Fraksiyonel Üre Atılımı)
 * @param {Object} params
 * @returns {Object|null}
 */
export function calculateFEUrea(params = {}) {
    const urineUrea = Number(params.urineUrea);
    const serumUrea = Number(params.serumUrea ?? params.serumBUN);
    const urineCr = Number(params.urineCr ?? params.urineCreatinine);
    const serumCr = Number(params.serumCr ?? params.serumCreatinine);

    if (isNaN(urineUrea) || isNaN(serumUrea) || isNaN(urineCr) || isNaN(serumCr) || urineUrea <= 0 || serumUrea <= 0 || urineCr <= 0 || serumCr <= 0) {
        return null;
    }

    const feUrea = ((urineUrea * serumCr) / (serumUrea * urineCr)) * 100;
    const feUreaVal = Number(feUrea.toFixed(1));

    let category = '';
    let etiology = '';
    let recommendation = '';
    let alertClass = 'text-emerald-400';

    if (feUreaVal < 35.0) {
        etiology = 'Prerenal Azotemi (Diüretik Kullanımında Güvenilir)';
        category = 'Prerenal Azotemi (FEUrea < %35)';
        recommendation = 'Diüretik kullanımından etkilenmeyen altın standart gösterge: Prerenal yetmezlik (sıvı açığı / hipoperfüzyon) lehine. Sıvı desteği planlayınız.';
        alertClass = 'text-emerald-400';
    } else {
        etiology = 'İntrensek Renal / ATN';
        category = 'İntrensek Böbrek Hasarı / ATN (FEUrea ≥ %35)';
        recommendation = 'Tübüler üre geri emilimi bozulmuştur. Akut Tübüler Nekroz (ATN) lehine. Nefroloji konsültasyonu ve sıvı dengesi takibi önerilir.';
        alertClass = 'text-rose-400';
    }

    return {
        isValid: true,
        feUrea: feUreaVal,
        feUreaPercent: feUreaVal,
        category,
        etiology,
        interpretation: `${category}. ${recommendation}`,
        recommendation,
        recommendations: [recommendation],
        alertClass
    };
}

/**
 * 3. HİPERGLİSEMİ DÜZELTİLMİŞ SODYUM (Katz Formülü)
 * @param {Object} params
 * @returns {Object|null}
 */
export function calculateCorrectedSodium(params = {}) {
    const measuredNa = Number(params.measuredNa ?? params.measuredSodium);
    const glucoseMgDl = Number(params.glucoseMgDl ?? params.glucose);

    if (isNaN(measuredNa) || isNaN(glucoseMgDl) || measuredNa <= 0 || glucoseMgDl <= 0) return null;

    if (glucoseMgDl <= 100) {
        return {
            isValid: true,
            measuredNa,
            measuredSodium: measuredNa,
            correctedNa: measuredNa,
            correctedSodium: measuredNa,
            glucose: glucoseMgDl,
            delta: 0,
            interpretation: 'Glukoz düzeyi normal aralıkta (düzeltme gerekmez).'
        };
    }

    const delta = 0.016 * (glucoseMgDl - 100);
    const correctedNa = Number((measuredNa + delta).toFixed(1));

    let interpretation = '';
    if (correctedNa < 135) interpretation = 'Gerçek Hiponatremi';
    else if (correctedNa <= 145) interpretation = 'Yalancı Hiponatremi (Düzeltilmiş Na Normaldir)';
    else interpretation = 'Gerçek Hipernatremi (Kritik Su Açığı ve Dehidratasyon!)';

    return {
        isValid: true,
        measuredNa,
        measuredSodium: measuredNa,
        glucoseMgDl,
        glucose: glucoseMgDl,
        correctedNa,
        correctedSodium: correctedNa,
        delta: Number(delta.toFixed(1)),
        interpretation
    };
}

/**
 * 4. OSMOLAR AÇIK (Osmolal Gap - Toksik Alkol Zehirlenmesi)
 * @param {Object} params
 * @returns {Object|null}
 */
export function calculateOsmolalGap(params = {}) {
    const measuredOsm = Number(params.measuredOsm ?? params.measuredOsmolality);
    const serumNa = Number(params.serumNa ?? params.sodium);
    const glucoseMgDl = Number(params.glucoseMgDl ?? params.glucose);
    const bunMgDl = Number(params.bunMgDl ?? params.bun ?? 15);
    const ethanolMgDl = Number(params.ethanolMgDl ?? params.ethanol ?? 0);

    if (isNaN(measuredOsm) || isNaN(serumNa) || isNaN(glucoseMgDl) || measuredOsm <= 0 || serumNa <= 0) {
        return null;
    }

    const calcOsm = (2 * serumNa) + (glucoseMgDl / 18.0) + (bunMgDl / 2.8) + (ethanolMgDl ? (ethanolMgDl / 4.6) : 0);
    const calculatedOsmVal = Number(calcOsm.toFixed(1));
    const gap = Number((measuredOsm - calculatedOsmVal).toFixed(1));

    const isHighGap = gap > 10.0;

    let interpretation = '';
    let alertClass = 'text-emerald-400';

    if (isHighGap) {
        interpretation = `🚨 YÜKSEK OSMOLAL AÇIK (${gap} mOsm/kg > 10): Toksik Alkol Zehirlenmesi (Metanol - Sahte İçki, Etilen Glikol - Antifriz, İzopropanol) kuvvetle muhtemel! Acil Antidot (Fomepizol / Etanol infüzyonu) ve Hemodiyaliz değerlendiriniz.`;
        alertClass = 'text-rose-400 bg-rose-950/40 border-rose-800';
    } else {
        interpretation = `🟢 Normal Osmolal Açık (${gap} mOsm/kg ≤ 10): Ölçülen ve hesaplanan osmolalite uyumludur.`;
        alertClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-800';
    }

    return {
        isValid: true,
        measuredOsm,
        measuredOsmolality: measuredOsm,
        calculatedOsm: calculatedOsmVal,
        gap,
        osmolalGap: gap,
        isHighGap,
        isElevated: isHighGap,
        interpretation,
        alertClass
    };
}

/**
 * 5. RUMACK-MATTHEW NOMOGRAMI (Akut Parasetamol Toksisitesi & NAC Rehberi)
 * @param {Object} params
 * @returns {Object|null}
 */
export function evaluateRumackMatthew(params = {}) {
    const serumParacetamolMcgMl = Number(params.serumParacetamolMcgMl ?? params.paracetamolLevelMcgMl);
    const hoursPostIngestion = Number(params.hoursPostIngestion ?? params.hours);
    const weightKg = Number(params.weightKg || 70);

    if (isNaN(serumParacetamolMcgMl) || isNaN(hoursPostIngestion)) {
        return null;
    }

    if (hoursPostIngestion < 4) {
        return {
            isValid: true,
            status: 'TOO_EARLY',
            isToxic: false,
            hours: hoursPostIngestion,
            hoursPostIngestion,
            levelMcgMl: serumParacetamolMcgMl,
            interpretation: 'Alımdan sonraki ilk 4 saat içinde ölçülen parasetamol düzeyi emilim devam ettiği için nomogramda değerlendirilemez. 4. saatte kan düzeyini tekrarlayınız.',
            treatWithNAC: false,
            alertClass: 'text-amber-400'
        };
    }

    if (hoursPostIngestion > 24) {
        return {
            isValid: true,
            status: 'LATE_PRESENTATION',
            isToxic: true,
            hours: hoursPostIngestion,
            hoursPostIngestion,
            levelMcgMl: serumParacetamolMcgMl,
            interpretation: 'Geç başvuru (>24 saat). Nomogram geçerli değildir. Toksik doz şüphesinde ampirik NAC derhal başlatılmalıdır.',
            treatWithNAC: true,
            alertClass: 'text-rose-400'
        };
    }

    const treatmentThreshold = 150 * Math.pow(0.5, (hoursPostIngestion - 4) / 4);
    const thresholdVal = Number(treatmentThreshold.toFixed(1));

    const isToxic = serumParacetamolMcgMl >= thresholdVal;

    let interpretation = '';
    let nacProtocol = null;
    let alertClass = 'text-emerald-400';

    const p1Mg = Math.round(weightKg * 150);
    const p2Mg = Math.round(weightKg * 50);
    const p3Mg = Math.round(weightKg * 100);

    if (isToxic) {
        interpretation = `⚠️ HEPATOTOKSİK DÜZEY (${serumParacetamolMcgMl} mcg/mL ≥ ${thresholdVal} mcg/mL eşiği): Karaciğer yetmezliği riski mevcuttur. Acil IV N-Asetilsistein (NAC) protokolü başlatılmalıdır!`;
        alertClass = 'text-rose-400 bg-rose-950/40 border-rose-800';
        nacProtocol = {
            phase1: { doseMgKg: 150, totalMg: p1Mg, fluidD5W: '200 mL %5 Dekstroz içinde 60 dakikada IV' },
            phase2: { doseMgKg: 50, totalMg: p2Mg, fluidD5W: '500 mL %5 Dekstroz içinde 4 saatte IV' },
            phase3: { doseMgKg: 100, totalMg: p3Mg, fluidD5W: '1000 mL %5 Dekstroz içinde 16 saatte IV' },
            loadingDose: `Yükleme: ${p1Mg} mg (150 mg/kg) 200 mL %5 Dekstroz ile 60 dk IV`,
            secondDose: `2. Doz: ${p2Mg} mg (50 mg/kg) 500 mL %5 Dekstroz ile 4 saat IV`,
            thirdDose: `3. Doz: ${p3Mg} mg (100 mg/kg) 1000 mL %5 Dekstroz ile 16 saat IV`,
            totalDuration: 'Toplam 21 saatlik standart 3 fazlı IV infüzyon protokolü.'
        };
    } else {
        interpretation = `🟢 Toksisite Çizgisinin Altında (${serumParacetamolMcgMl} mcg/mL < ${thresholdVal} mcg/mL eşiği): Hepatotoksisite olasılığı düşüktür. Semptom ve karaciğer enzimleri takibi yeterlidir.`;
        alertClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-800';
    }

    return {
        isValid: true,
        status: isToxic ? 'TOXIC' : 'NON_TOXIC',
        isToxic,
        hours: hoursPostIngestion,
        hoursPostIngestion,
        serumLevel: serumParacetamolMcgMl,
        levelMcgMl: serumParacetamolMcgMl,
        threshold: thresholdVal,
        treatWithNAC: isToxic,
        interpretation,
        nacProtocol,
        alertClass
    };
}

/**
 * 6. CURB-65 TOPLUMDA GELİŞEN PNÖMONİ ŞİDDET SKORU
 * @param {Object} params
 * @returns {Object}
 */
export function calculateCURB65(params = {}) {
    const confusion = Boolean(params.confusion);
    const bunOver19 = Boolean(params.bunOver19);
    const rrGte30 = Boolean(params.rrGte30 || params.respiratoryRateGte30);
    const sbpLt90OrDbpLte60 = Boolean(params.sbpLt90OrDbpLte60 || params.hypotension);
    const ageGte65 = Boolean(params.ageGte65);

    let score = 0;
    if (confusion) score += 1;
    if (bunOver19) score += 1;
    if (rrGte30) score += 1;
    if (sbpLt90OrDbpLte60) score += 1;
    if (ageGte65) score += 1;

    let riskGroup = '';
    let mortalityRate = '';
    let mortalityPercent = 1.5;
    let recommendation = '';
    let alertClass = 'text-emerald-400';

    if (score <= 1) {
        riskGroup = 'Düşük Risk (CURB-65 0-1)';
        mortalityPercent = 1.5;
        mortalityRate = '< %1.5 30 günlük mortalite';
        recommendation = 'Evde ayaktan tedavi uygundur (Oral Amoksisilin veya Makrolid/Doksisiklin).';
        alertClass = 'text-emerald-400';
    } else if (score === 2) {
        riskGroup = 'Orta Risk (CURB-65 2)';
        mortalityPercent = 9.2;
        mortalityRate = '~%9.2 30 günlük mortalite';
        recommendation = 'Kısa süreli hastaneye yatış veya yakın gözlem ünitesinde izlem önerilir.';
        alertClass = 'text-amber-400';
    } else {
        riskGroup = 'Şiddetli Pnömoni (Yüksek Risk)';
        mortalityPercent = score === 3 ? 14.5 : 22.0;
        mortalityRate = score === 3 ? '~%14.5' : '> %22 (Ağır Pnömoni)';
        recommendation = 'Acil hastane yatışı endikedir. CURB-65 4-5 puan ise derhal Yoğun Bakım Ünitesi (YBÜ) konsültasyonu düşünülmelidir.';
        alertClass = 'text-rose-400';
    }

    return {
        isValid: true,
        score,
        riskGroup,
        mortalityGroup: riskGroup,
        mortalityRate,
        mortalityPercent,
        treatmentSetting: recommendation,
        recommendation,
        recommendations: [recommendation],
        alertClass
    };
}
