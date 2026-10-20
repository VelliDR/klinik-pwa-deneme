// Fluid Engine: Holliday-Segar, Ateş Düzeltmesi, Sodyum Düzeltme & Elektrolit Rehberi

export interface MaintenanceFluidResult {
    originalVolume?: number;
    feverExtraVolume?: number;
    dailyVolume: number;
    hourlyRate: number;
    fluidTypeRecommendation: string;
    isNeonate?: boolean;
    dayTitle?: string;
    contraindicationNotice?: string;
}

export function calculateMaintenanceFluid(
    weightKg: number | null | undefined, 
    tempCelsius: number | null = null
): MaintenanceFluidResult | null {
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

    const originalVolume = dailyVolume;
    let feverExtraVolume = 0;

    // Ateş Düzeltmesi (Her 1°C > 37.5°C için %12 artış)
    if (tempCelsius && tempCelsius > 37.5) {
        const excessTemp = tempCelsius - 37.5;
        const increaseRatio = excessTemp * 0.12;
        feverExtraVolume = originalVolume * increaseRatio;
        dailyVolume = originalVolume + feverExtraVolume;
    }

    const hourlyRate = dailyVolume / 24;

    // Standard Fluid Type Recommendation (AAP 2018 Clinical Practice Guideline: Isotonic fluids recommended to prevent hospital-acquired hyponatremia)
    let fluidTypeRecommendation = '%0.9 NaCl + %5 Dekstroz + 20 mEq/L KCl (AAP Güncel Önerisi: İzotonik İdame; Klasik: %0.45 NaCl + %5 Dekstroz)';
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

export interface SodiumCorrectionResult {
    deficit: number;
    warning: string;
    deltaNa3Percent: number;
    deltaNa09Percent: number;
    required3PercentMl: number;
}

export function calculateSodiumCorrection(
    measuredNa: number | null | undefined, 
    targetNa: number | null | undefined, 
    weightKg: number | null | undefined, 
    tbwFactor: number = 0.6
): SodiumCorrectionResult | null {
    if (!measuredNa || !weightKg || measuredNa <= 0 || weightKg <= 0) return null;
    
    let resolvedTargetNa = targetNa;
    if (!resolvedTargetNa) {
        if (measuredNa < 135) resolvedTargetNa = Math.min(135, measuredNa + 8);
        else if (measuredNa > 145) resolvedTargetNa = Math.max(145, measuredNa - 8);
        else resolvedTargetNa = 140;
    }
    
    // Total Body Water (TBW)
    const tbw = weightKg * (tbwFactor || 0.6);
    
    // Na Deficit = TBW * (Target Na - Measured Na)
    const deficit = tbw * (resolvedTargetNa - measuredNa);
    
    let warning = '';
    // Modern guidelines recommend max 8 mEq/L in 24 hours to avoid ODS / Cerebral Edema
    if (Math.abs(resolvedTargetNa - measuredNa) > 8) {
        warning = '⚠️ ODS / Serebral Ödem Riski! 24 saatte max 8 mEq/L düzeltme önerilir.';
    }

    // Adrogué-Madias Formula for 1L of solution
    // Change in serum Na = (Infusate Na - Serum Na) / (TBW + 1)
    const deltaNa3Percent = (513 - measuredNa) / (tbw + 1);
    const deltaNa09Percent = (154 - measuredNa) / (tbw + 1);

    // Required 3% NaCl volume in mL to achieve targetNa (only when raising Na in hyponatremia)
    const desiredRise = resolvedTargetNa - measuredNa;
    const required3PercentMl = (desiredRise > 0 && deltaNa3Percent > 0)
        ? Math.round((desiredRise / deltaNa3Percent) * 1000)
        : 0;
    
    return {
        deficit: Math.round(deficit),
        warning,
        deltaNa3Percent: Number(deltaNa3Percent.toFixed(2)),
        deltaNa09Percent: Number(deltaNa09Percent.toFixed(2)),
        required3PercentMl
    };
}

export interface NeonatalFluidInput {
    ageDays: number | null | undefined;
    weightKg: number | null | undefined;
    isPreterm?: boolean;
    isPhototherapy?: boolean;
}

export interface NeonatalFluidResult {
    isNeonate: boolean;
    dayNumber: number;
    dayTitle: string;
    mlPerKgMin: number;
    mlPerKgMax: number;
    mlPerKgAvg: number;
    mlPerKgRange: string;
    totalDailyMl: number;
    hourlyRateMl: number;
    girMgKgMin: number;
    targetGirRange: string;
    soluteAdvice: string;
    isPreterm: boolean;
    isPhototherapy: boolean;
    contraindicationNotice: string;
}

export function calculateNeonatalFluid({ 
    ageDays, 
    weightKg, 
    isPreterm = false, 
    isPhototherapy = false 
}: NeonatalFluidInput): NeonatalFluidResult | null {
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
        soluteAdvice = 'Dengeli idame solüsyonu (%5-7.5 Dekstroz + Na 2-3 mEq/kg + K 1-2 mEq/kg).';
    } else if (day === 4) {
        dayTitle = '5. Yaşam Günü';
        minRate = isPreterm ? 130 : 120;
        maxRate = isPreterm ? 145 : 140;
        soluteAdvice = 'Dengeli idame solüsyonu (%5 Dekstroz bazlı). GIR ve kan şekeri izlenmelidir.';
    } else {
        dayTitle = `${day + 1}. Yaşam Günü (Kararlı İdame)`;
        minRate = isPreterm ? 150 : 140;
        maxRate = isPreterm ? 170 : 160;
        soluteAdvice = 'Tam idame sıvısı (140-160 mL/kg/gün, %5 Dekstroz bazlı) + Na/K elektrolit desteği.';
    }

    if (isPhototherapy) {
        minRate += 15;
        maxRate += 15;
        soluteAdvice += ' (Fototerapiye bağlı artmış trans-epidermal kayıp: +15 mL/kg/gün eklendi).';
    }

    const avgRate = Math.round((minRate + maxRate) / 2);
    const totalDailyMl = Math.round(weightKg * avgRate);
    const hourlyRateMl = +(totalDailyMl / 24).toFixed(1);

    // Day 1-3 uses %10 Dextrose (100 mg/mL); Day 4+ transitions to %7.5 (Day 4) or %5 Dextrose (50 mg/mL) to avoid hyperglycemia at higher fluid rates
    const dextroseMgPerMl = day <= 2 ? 100 : (day === 3 ? 75 : 50);
    const girMgKgMin = +((hourlyRateMl * dextroseMgPerMl) / (weightKg * 60)).toFixed(1);

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
