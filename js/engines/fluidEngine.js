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

