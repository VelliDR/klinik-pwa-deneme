// Fluid Engine: Holliday-Segar, Ateş Düzeltmesi, Sodyum Düzeltme & Elektrolit Rehberi

export function calculateMaintenanceFluid(weightKg, tempCelsius = null) {
    if (!weightKg || weightKg <= 0) return null;

    let dailyVolume = 0;
    
    if (weightKg <= 10) {
        dailyVolume = weightKg * 100;
    } else if (weightKg <= 20) {
        dailyVolume = 1000 + (weightKg - 10) * 50;
    } else {
        dailyVolume = 1500 + (weightKg - 20) * 20;
    }

    // Adult maintenance cap (Baseline normal adult cap: ~2400 mL/gün / 100 mL/saat)
    if (weightKg > 70) {
        dailyVolume = Math.min(dailyVolume, 2500);
    }

    let originalVolume = dailyVolume;
    let feverExtraVolume = 0;

    // Ateş Düzeltmesi (Her 1°C > 37.5°C için %12 artış)
    if (tempCelsius && tempCelsius > 37.5) {
        const excessTemp = tempCelsius - 37.5;
        const increaseRatio = excessTemp * 0.12;
        feverExtraVolume = originalVolume * increaseRatio;
        dailyVolume = originalVolume + feverExtraVolume;
    }

    const hourlyRate = dailyVolume / 24;

    // Standard Fluid Type Recommendation
    let fluidTypeRecommendation = '%0.45 NaCl + %5 Dekstroz + 20 mEq/L KCl (Pediatrik Standart İdame Sıvısı)';
    if (weightKg >= 50) {
        fluidTypeRecommendation = '%0.9 NaCl veya İzoleks / Dengeli Kristaloid (Erişkin Standart İdame Sıvısı)';
    }

    return {
        originalVolume: Math.round(originalVolume),
        feverExtraVolume: Math.round(feverExtraVolume),
        dailyVolume: Math.round(dailyVolume),
        hourlyRate: Math.round(hourlyRate),
        fluidTypeRecommendation
    };
}

export function calculateSodiumCorrection(measuredNa, targetNa, weightKg, tbwFactor = 0.6) {
    if (!measuredNa || !weightKg) return null;
    
    if (!targetNa) {
        if (measuredNa < 135) targetNa = Math.min(135, measuredNa + 8);
        else if (measuredNa > 145) targetNa = Math.max(145, measuredNa - 8);
        else targetNa = 140;
    }
    
    // Total Body Water (TBW)
    const tbw = weightKg * (tbwFactor || 0.6);
    
    // Na Deficit = TBW * (Target Na - Measured Na)
    const deficit = tbw * (targetNa - measuredNa);
    
    let warning = '';
    // Modern guidelines recommend max 8 mEq/L in 24 hours to avoid ODS / Cerebral Edema
    if (Math.abs(targetNa - measuredNa) > 8) {
        warning = '⚠️ ODS / Serebral Ödem Riski! 24 saatte max 8 mEq/L düzeltme önerilir.';
    }

    // Adrogué-Madias Formula for 1L of solution
    // Change in serum Na = (Infusate Na - Serum Na) / (TBW + 1)
    
    // 3% NaCl = 513 mEq/L
    // 0.9% NaCl = 154 mEq/L
    
    const deltaNa3Percent = (513 - measuredNa) / (tbw + 1);
    const deltaNa09Percent = (154 - measuredNa) / (tbw + 1);

    // Required 3% NaCl volume in mL to achieve targetNa
    const required3PercentMl = deltaNa3Percent > 0 ? Math.round((deficit / 513) * 1000) : 0;
    
    return {
        deficit: Math.round(deficit),
        warning,
        deltaNa3Percent: Number(deltaNa3Percent.toFixed(2)),
        deltaNa09Percent: Number(deltaNa09Percent.toFixed(2)),
        required3PercentMl
    };
}

/**
 * TND (Türk Neonatoloji Derneği) 2022 Yenidoğan Sıvı Kademesi & GIR Hesaplayıcı
 * 
 * Yaşamın ilk haftasında Holliday-Segar (100 mL/kg) aşırı sıvı yüklenmesi, PDA ve BPD
 * riski nedeniyle KONTRENDİKEDİR! TND protokolü kademeli günlük artış gerektirir.
 * 
 * @param {Object} params
 * @param {number} params.ageDays - Bebeğin yaşam günü (0 - 28 gün)
 * @param {number} params.weightKg - Mevcut ağırlık (kg)
 * @param {boolean} [params.isPreterm=false] - Preterm bebek (gestasyon < 37 hf)
 * @param {boolean} [params.isPhototherapy=false] - Fototerapi alıyor mu? (Sıvı ihtiyacı +10-20 mL/kg artar)
 * @returns {Object|null}
 */
export function calculateNeonatalFluid({ ageDays, weightKg, isPreterm = false, isPhototherapy = false }) {
    if (weightKg === null || weightKg === undefined || weightKg <= 0 || ageDays === null || ageDays === undefined || ageDays < 0) {
        return null;
    }

    const day = Math.floor(ageDays);
    let dayTitle = '';
    let minRate = 60;
    let maxRate = 70;
    let soluteAdvice = '';

    if (day === 0) {
        dayTitle = '1. Yaşam Günü (0-24s)';
        minRate = isPreterm ? 70 : 60;
        maxRate = isPreterm ? 85 : 70;
        soluteAdvice = 'Yalnızca %10 Dekstroz. Diürez başlayana kadar Na ve K KONTRENDİKEDİR.';
    } else if (day === 1) {
        dayTitle = '2. Yaşam Günü (24-48s)';
        minRate = isPreterm ? 80 : 70;
        maxRate = isPreterm ? 95 : 80;
        soluteAdvice = 'Yalnızca %10 Dekstroz. İdrar çıkışı teyit edilmeden elektrolit eklenmez.';
    } else if (day === 2) {
        dayTitle = '3. Yaşam Günü (48-72s)';
        minRate = isPreterm ? 90 : 80;
        maxRate = isPreterm ? 105 : 90;
        soluteAdvice = '%10 Dekstroz + Elektrolit Başla: Na (2-3 mEq/kg/gün), K (1-2 mEq/kg/gün - idrar çıkışı normalse).';
    } else if (day === 3) {
        dayTitle = '4. Yaşam Günü';
        minRate = isPreterm ? 110 : 100;
        maxRate = isPreterm ? 125 : 120;
        soluteAdvice = 'Dengeli idame solüsyonu (%5-10 Dekstroz + Na 2-3 mEq/kg + K 1-2 mEq/kg).';
    } else if (day === 4) {
        dayTitle = '5. Yaşam Günü';
        minRate = isPreterm ? 130 : 120;
        maxRate = isPreterm ? 145 : 140;
        soluteAdvice = 'Dengeli idame solüsyonu. GIR ve kan şekeri izlenmelidir.';
    } else {
        dayTitle = `${day + 1}. Yaşam Günü (Kararlı İdame)`;
        minRate = isPreterm ? 150 : 140;
        maxRate = isPreterm ? 170 : 160;
        soluteAdvice = 'Tam idame sıvısı (140-160 mL/kg/gün) + Na/K elektrolit desteği.';
    }

    if (isPhototherapy) {
        minRate += 15;
        maxRate += 15;
        soluteAdvice += ' (Fototerapiye bağlı artmış trans-epidermal kayıp: +15 mL/kg/gün eklendi).';
    }

    const avgRate = Math.round((minRate + maxRate) / 2);
    const totalDailyMl = Math.round(weightKg * avgRate);
    const hourlyRateMl = +(totalDailyMl / 24).toFixed(1);

    // %10 Dekstroz ile GIR hesabı: GIR = (hourlyRate * conc% * 10) / (weightKg * 60)
    // conc = 10 -> (hourlyRate * 100) / (weightKg * 60)
    const girMgKgMin = +((hourlyRateMl * 100) / (weightKg * 60)).toFixed(1);

    return {
        isNeonate: true,
        dayNumber: day + 1,
        dayTitle,
        mlPerKgMin: minRate,
        mlPerKgMax: maxRate,
        mlPerKgAvg: avgRate,
        mlPerKgRange: `${minRate}-${maxRate}`,
        totalDailyMl,
        hourlyRateMl,
        girMgKgMin,
        targetGirRange: isPreterm ? '4 - 8 mg/kg/dk' : '4 - 6 mg/kg/dk',
        soluteAdvice,
        isPreterm,
        isPhototherapy,
        contraindicationNotice: '⚠️ Yenidoğan Dönemi: Klasik Holliday-Segar (100 mL/kg) KONTRENDİKEDİR! TND kademeli günlük sıvı protokolü uygulanmaktadır.'
    };
}

