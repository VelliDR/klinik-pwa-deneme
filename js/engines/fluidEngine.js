// Fluid Engine: Holliday-Segar, Sodium Correction, Priority Matrix

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

    let originalVolume = dailyVolume;

    // Ateş Düzeltmesi (Her 1°C > 37.5 için %12.5 artış)
    if (tempCelsius && tempCelsius > 37.5) {
        const excessTemp = tempCelsius - 37.5;
        const increaseRatio = excessTemp * 0.125;
        dailyVolume = dailyVolume + (dailyVolume * increaseRatio);
    }

    const hourlyRate = dailyVolume / 24;

    return {
        originalVolume: Math.round(originalVolume),
        dailyVolume: Math.round(dailyVolume),
        hourlyRate: Math.round(hourlyRate)
    };
}

export function calculateSodiumCorrection(measuredNa, targetNa, weightKg, tbwFactor) {
    if (!measuredNa || !weightKg || !tbwFactor) return null;
    
    if (!targetNa) {
        if (measuredNa < 135) targetNa = Math.min(135, measuredNa + 8);
        else if (measuredNa > 145) targetNa = Math.max(145, measuredNa - 8);
        else targetNa = 140;
    }
    
    // Total Body Water
    const tbw = weightKg * tbwFactor;
    
    // Na Deficit = TBW * (Target Na - Measured Na)
    const deficit = tbw * (targetNa - measuredNa);
    
    let warning = '';
    // Modern guidelines recommend max 8 mEq/L in 24 hours to avoid ODS
    if (Math.abs(targetNa - measuredNa) > 8) {
        warning = '⚠️ ODS / Serebral Ödem Riski! 24 saatte max 8 mEq/L düzeltme önerilir.';
    }

    // Adrogué-Madias Formula for 1L of solution
    // Change in serum Na = (Infusate Na - Serum Na) / (TBW + 1)
    
    // 3% NaCl = 513 mEq/L
    // 0.9% NaCl = 154 mEq/L
    
    const deltaNa3Percent = (513 - measuredNa) / (tbw + 1);
    const deltaNa09Percent = (154 - measuredNa) / (tbw + 1);
    
    return {
        deficit,
        warning,
        deltaNa3Percent,
        deltaNa09Percent
    };
}
