// Fluid Engine: Holliday-Segar, Ateş Düzeltmesi, Sodyum Düzeltme & Elektrolit Rehberi

export interface MaintenanceFluidOptions {
    ibwKg?: number | null;
    ageYears?: number | null;
    isObese?: boolean;
    useFourTwoOneHourly?: boolean;
}

export interface MaintenanceFluidResult {
    originalVolume?: number;
    feverExtraVolume?: number;
    dailyVolume: number;
    hourlyRate: number;
    fluidTypeRecommendation: string;
    isNeonate?: boolean;
    dayTitle?: string;
    contraindicationNotice?: string;
    isIbwUsed?: boolean;
    isAdultCapApplied?: boolean;
    effectiveWeightKg?: number;
    warnings?: string[];
}

export function calculateMaintenanceFluid(
    weightKg: number | null | undefined, 
    tempCelsius: number | null = null,
    options?: MaintenanceFluidOptions
): MaintenanceFluidResult | null {
    if (!weightKg || weightKg <= 0) return null;

    let effectiveWeightKg = weightKg;
    let isIbwUsed = false;
    const warnings: string[] = [];

    // HATA-M9-001: Pediatrik Obezitede İdeal Vücut Ağırlığı (IBW) Kalkanı
    if (options?.ibwKg && options.ibwKg > 0 && options.ibwKg < weightKg) {
        if (options.isObese || weightKg >= (options.ibwKg * 1.2)) {
            effectiveWeightKg = options.ibwKg;
            isIbwUsed = true;
            warnings.push(`⚠️ Obezite Kalkanı: Sıvı yüklenmesini önlemek için İdeal Vücut Ağırlığı (${options.ibwKg} kg) kullanıldı.`);
        }
    }

    let dailyVolume = 0;
    
    if (effectiveWeightKg <= 10) {
        dailyVolume = effectiveWeightKg * 100;
    } else if (effectiveWeightKg <= 20) {
        dailyVolume = 1000 + (effectiveWeightKg - 10) * 50;
    } else {
        dailyVolume = 1500 + (effectiveWeightKg - 20) * 20;
    }

    // Adult maintenance cap (Baseline normal adult cap: ~2500 mL/gün / ~100 mL/saat)
    let isAdultCapApplied = false;
    if (effectiveWeightKg > 70) {
        if (dailyVolume > 2500) {
            dailyVolume = 2500;
            isAdultCapApplied = true;
        }
    }

    const originalVolume = dailyVolume;
    let feverExtraVolume = 0;

    // Ateş Düzeltmesi (Her 1°C > 37.5°C için %12 artış)
    if (tempCelsius && tempCelsius > 37.5) {
        const excessTemp = tempCelsius - 37.5;
        const increaseRatio = excessTemp * 0.12;
        feverExtraVolume = originalVolume * increaseRatio;
        dailyVolume = originalVolume + feverExtraVolume;

        // HATA-M9-002: Ateş Düzeltmesinde Yetişkin Tavanı (Maksimum 2800 mL/gün)
        const isAdultOrHeavy = effectiveWeightKg >= 50 || (options?.ageYears !== undefined && options?.ageYears !== null && options.ageYears >= 18);
        const adultFeverCap = 2800;
        if (isAdultOrHeavy && dailyVolume > adultFeverCap) {
            dailyVolume = adultFeverCap;
            isAdultCapApplied = true;
            warnings.push(`⚠️ Yetişkin Sıvı Güvenlik Tavanı: Ateş artışına rağmen kardiyopulmoner aşırı yüklenme riskini önlemek için tavan ${adultFeverCap} mL/gün ile sınırlandırıldı.`);
        }
    }

    let hourlyRate = dailyVolume / 24;
    if (options?.useFourTwoOneHourly && !isAdultCapApplied) {
        if (effectiveWeightKg <= 10) hourlyRate = effectiveWeightKg * 4;
        else if (effectiveWeightKg <= 20) hourlyRate = 40 + (effectiveWeightKg - 10) * 2;
        else hourlyRate = 60 + (effectiveWeightKg - 20) * 1;
    }

    // HATA-M9-003: Yaş Kriteri (Düşük kilolu yetişkinlere AAP basılmamalıdır)
    const isAdult = (options?.ageYears !== undefined && options?.ageYears !== null && options.ageYears >= 18) || 
                    (options?.ageYears === undefined && effectiveWeightKg >= 50);

    let fluidTypeRecommendation = '';
    if (isAdult) {
        fluidTypeRecommendation = '%0.9 NaCl veya İzoleks / Dengeli Kristaloid (Erişkin Standart İdame Sıvısı)';
    } else {
        // HATA-M9-004: İdrar çıkışı teyit edilmeden KCl eklenmeme uyarısı
        fluidTypeRecommendation = '%0.9 NaCl + %5 Dekstroz (AAP Güncel Önerisi: İzotonik İdame). ⚠️ DİKKAT: İdrar çıkışı teyit edilmeden ve bazal serum K⁺ düzeyi görülmeden idame sıvısına KCl eklenmemelidir (Akut böbrek hasarı ve hiperkalemi riski).';
    }

    return {
        originalVolume: Math.round(originalVolume),
        feverExtraVolume: Math.round(feverExtraVolume),
        dailyVolume: Math.round(dailyVolume),
        hourlyRate: Math.round(hourlyRate),
        fluidTypeRecommendation,
        isIbwUsed,
        isAdultCapApplied,
        effectiveWeightKg,
        warnings
    };
}

export interface SodiumCorrectionOptions {
    glucoseMgDl?: number | null | undefined;
    isHighRiskODS?: boolean | null | undefined;
    ageYears?: number | null | undefined;
    totalMonths?: number | null | undefined;
    isPreterm?: boolean | null | undefined;
}

export interface SodiumCorrectionResult {
    deficit: number;
    warning: string;
    deltaNa3Percent: number;
    deltaNa09Percent: number;
    required3PercentMl: number;
    isPseudohyponatremia?: boolean;
    correctedNa?: number;
    isHypernatremia?: boolean;
    freeWaterDeficitLiters?: number;
    freeWaterHourlyD5WRateMl?: number;
    deltaD5W?: number;
    isHighRiskODS?: boolean;
    maxRecommendedDelta?: number;
    tbwLiters: number;
}

export function calculateSodiumCorrection(
    measuredNa: number | null | undefined, 
    targetNa: number | null | undefined, 
    weightKg: number | null | undefined, 
    tbwFactor: number = 0.6,
    options?: SodiumCorrectionOptions
): SodiumCorrectionResult | null {
    if (!measuredNa || !weightKg || measuredNa <= 0 || weightKg <= 0) return null;
    
    // Total Body Water (TBW)
    const tbw = weightKg * (tbwFactor || 0.6);
    
    // HATA-M10-001: Hiperglisemik Yalancı Hiponatremi (Pseudohyponatremia) Kalkanı
    let correctedNa = measuredNa;
    let isPseudohyponatremia = false;
    let glucoseWarning = '';

    if (options?.glucoseMgDl && options.glucoseMgDl > 150) {
        const glu = options.glucoseMgDl;
        // HATA-M10-003: Glukoz > 400 ise Hillier (0.024), aksi halde Katz (0.016)
        const factor = glu > 400 ? 0.024 : 0.016;
        correctedNa = Number((measuredNa + factor * (glu - 100)).toFixed(1));
        
        if (measuredNa < 135 && correctedNa >= 135) {
            isPseudohyponatremia = true;
            glucoseWarning = `🚨 Hiperglisemik Yalancı Hiponatremi (Pseudohyponatremia): Ölçülen Na (${measuredNa} mEq/L) hiperglisemiye (Glukoz: ${glu} mg/dL) bağlı dilüsyonel olarak düşüktür. Düzeltilmiş fizyolojik sodyum ${correctedNa} mEq/L'dir (Normal/Övolemik). İnsülin tedavisiyle glukoz geriledikçe sodyum kendiliğinden yükselecektir. Hipertonik (%3) NaCl infüzyonu KONTRENDİKEDİR (Ölümcül hipernatremi riski)!`;
        }
    }

    const effectiveNa = isPseudohyponatremia ? correctedNa : measuredNa;

    // HATA-M10-004: Yüksek Riskli ODS Kalkanı (Na < 115 mEq/L, Siroz, Malnütrisyon, Alkolizm)
    const isHighRiskODS = Boolean(options?.isHighRiskODS || measuredNa < 115);
    const maxRecommendedDelta = isHighRiskODS ? 6 : 8;

    let resolvedTargetNa = targetNa;
    if (!resolvedTargetNa) {
        if (effectiveNa < 135) resolvedTargetNa = Math.min(135, effectiveNa + maxRecommendedDelta);
        else if (effectiveNa > 145) resolvedTargetNa = Math.max(145, effectiveNa - maxRecommendedDelta);
        else resolvedTargetNa = 140;
    }
    
    let warning = '';
    if (glucoseWarning) {
        warning = glucoseWarning;
    } else if (isHighRiskODS && Math.abs(resolvedTargetNa - measuredNa) > 6) {
        warning = '🚨 Yüksek ODS Riski (Derin Hiponatremi <115 mEq/L / Karaciğer Yetmezliği / Malnütrisyon): 24 saatte maksimum 4-6 mEq/L düzeltme hedeflenmelidir! Hızlı yükseltme kalıcı beyin sapı demiyelinizasyonuna (Santral Pontin Miyelinoliz / ODS) yol açar.';
    } else if (Math.abs(resolvedTargetNa - measuredNa) > 8) {
        warning = '⚠️ ODS / Serebral Ödem Riski! 24 saatte max 8 mEq/L düzeltme önerilir.';
    }

    // HATA-M10-002: Hipernatremi Durumu ve Serbest Su Açığı (FWD)
    const isHypernatremia = effectiveNa > 145;
    let deficit = 0;
    let freeWaterDeficitLiters = 0;
    let freeWaterHourlyD5WRateMl = 0;
    const deltaD5W = Number(((0 - effectiveNa) / (tbw + 1)).toFixed(2)); // Adrogué-Madias 1L D5W

    if (isHypernatremia) {
        // FWD = TBW * ((Serum Na / 140) - 1)
        const fwdRaw = tbw * ((effectiveNa / 140) - 1);
        freeWaterDeficitLiters = Number(Math.max(0, fwdRaw).toFixed(2));
        freeWaterHourlyD5WRateMl = Math.round((freeWaterDeficitLiters * 1000) / 48);
        deficit = 0; // Negatif sodyum açığı basılmaz!

        const hyperWarning = `⚠️ Hipernatremi (Na: ${effectiveNa} mEq/L): Serbest Su Açığı (FWD) ${freeWaterDeficitLiters} Litre olarak hesaplandı. Serebral ödemi önlemek için serum sodyumu 24 saatte maksimum 10-12 mEq/L (saatte ~0.5 mEq/L) hızında düşürülmeli, açık 48 saate yayılarak %5 Dekstroz ile karşılanmalıdır (Önerilen: ~${freeWaterHourlyD5WRateMl} mL/saat).`;
        warning = warning ? `${warning} | ${hyperWarning}` : hyperWarning;
    } else if (isPseudohyponatremia) {
        deficit = 0;
    } else {
        // Standart Hiponatremi: Na Deficit = TBW * (Target Na - Measured Na)
        deficit = Math.max(0, tbw * (resolvedTargetNa - measuredNa));
    }

    // Adrogué-Madias Formula for 1L of solution
    // Change in serum Na = (Infusate Na - Serum Na) / (TBW + 1)
    const deltaNa3Percent = (513 - measuredNa) / (tbw + 1);
    const deltaNa09Percent = (154 - measuredNa) / (tbw + 1);

    // Required 3% NaCl volume in mL to achieve targetNa (only when raising Na in real hyponatremia)
    const desiredRise = resolvedTargetNa - measuredNa;
    const required3PercentMl = (!isPseudohyponatremia && !isHypernatremia && desiredRise > 0 && deltaNa3Percent > 0)
        ? Math.round((desiredRise / deltaNa3Percent) * 1000)
        : 0;
    
    return {
        deficit: Math.round(deficit),
        warning,
        deltaNa3Percent: Number(deltaNa3Percent.toFixed(2)),
        deltaNa09Percent: Number(deltaNa09Percent.toFixed(2)),
        required3PercentMl,
        isPseudohyponatremia,
        correctedNa,
        isHypernatremia,
        freeWaterDeficitLiters,
        freeWaterHourlyD5WRateMl,
        deltaD5W,
        isHighRiskODS,
        maxRecommendedDelta,
        tbwLiters: Number(tbw.toFixed(1))
    };
}

export type NeonatalWeightCategory = 'TERM' | 'PRETERM_VLBW' | 'PRETERM_ELBW';
export type PhototherapyDeviceType = 'LED' | 'HALOGEN' | 'NONE';

export interface NeonatalFluidInput {
    ageDays: number | null | undefined;
    weightKg: number | null | undefined;
    birthWeightKg?: number | null | undefined;
    gestationalWeeks?: number | null | undefined;
    isPreterm?: boolean;
    isPhototherapy?: boolean;
    phototherapyType?: PhototherapyDeviceType;
    incubatorHumidityPercent?: number | null | undefined;
}

export interface NeonatalWeightLossAnalysis {
    birthWeightKg: number;
    currentWeightKg: number;
    weightLossGrams: number;
    weightLossPercent: number;
    isPathological: boolean;
    warning?: string;
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
    weightCategory: NeonatalWeightCategory;
    pathologicalLossThresholdPercent: number;
    weightLossAnalysis?: NeonatalWeightLossAnalysis | null;
    phototherapyAdjustmentMl: number;
    incubatorHumidityRecommendation?: string;
}

export function calculateNeonatalFluid({ 
    ageDays, 
    weightKg, 
    birthWeightKg,
    gestationalWeeks,
    isPreterm = false, 
    isPhototherapy = false,
    phototherapyType,
    incubatorHumidityPercent
}: NeonatalFluidInput): NeonatalFluidResult | null {
    if (weightKg === null || weightKg === undefined || weightKg <= 0 || ageDays === null || ageDays === undefined || ageDays < 0) {
        return null;
    }

    const day = Math.floor(ageDays);
    let dayTitle = '';
    let minRate = 60;
    let maxRate = 70;
    let soluteAdvice = '';

    // 1. Ağırlık ve Matürite Tabakalandırması (Dosya 4 Tablo 7)
    // - PRETERM_ELBW: <1000 g (Aşırı Düşük Doğum Ağırlıklı, Küvöz nemi %80-90)
    // - PRETERM_VLBW: 1000 - 2499 g (veya <37 hafta / isPreterm)
    // - TERM: >=2500 g ve >=37 hafta
    let weightCategory: NeonatalWeightCategory = 'TERM';
    const effectiveBirthWeight = birthWeightKg || weightKg;
    if (effectiveBirthWeight < 1.0 || weightKg < 1.0) {
        weightCategory = 'PRETERM_ELBW';
    } else if (isPreterm || (gestationalWeeks !== undefined && gestationalWeeks !== null && gestationalWeeks < 37) || effectiveBirthWeight < 2.5) {
        weightCategory = 'PRETERM_VLBW';
    } else {
        weightCategory = 'TERM';
    }

    const effectivePreterm = weightCategory !== 'TERM';

    // 2. Kademeli Günlük Sıvı Miktarları (mL/kg/gün) - TND 2021 / Dosya 4 Tablo 7
    if (day === 0) {
        dayTitle = '1. Yaşam Günü (0-24s)';
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 80;
            maxRate = 90;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 70;
            maxRate = 80;
        } else {
            minRate = 60;
            maxRate = 70;
        }
        soluteAdvice = 'Yalnızca %10 Dekstroz. Diürez başlayana kadar Na ve K KONTRENDİKEDİR.';
    } else if (day === 1) {
        dayTitle = '2. Yaşam Günü (24-48s)';
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 90;
            maxRate = 100;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 80;
            maxRate = 90;
        } else {
            minRate = 70;
            maxRate = 80;
        }
        soluteAdvice = 'Yalnızca %10 Dekstroz. İdrar çıkışı teyit edilmeden elektrolit eklenmez.';
    } else if (day === 2) {
        dayTitle = '3. Yaşam Günü (48-72s)';
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 110;
            maxRate = 120;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 100;
            maxRate = 110;
        } else {
            minRate = 80;
            maxRate = 90;
        }
        soluteAdvice = '%10 Dekstroz + Elektrolit Başla: Na (2-3 mEq/kg/gün), K (1-2 mEq/kg/gün - idrar çıkışı normalse).';
    } else if (day === 3) {
        dayTitle = '4. Yaşam Günü';
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 120;
            maxRate = 140;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 110;
            maxRate = 125;
        } else {
            minRate = 100;
            maxRate = 120;
        }
        soluteAdvice = 'Dengeli idame solüsyonu (%5-7.5 Dekstroz + Na 2-3 mEq/kg + K 1-2 mEq/kg).';
    } else if (day === 4) {
        dayTitle = '5. Yaşam Günü';
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 140;
            maxRate = 160;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 130;
            maxRate = 145;
        } else {
            minRate = 120;
            maxRate = 140;
        }
        soluteAdvice = 'Dengeli idame solüsyonu (%5 Dekstroz bazlı). GIR ve kan şekeri izlenmelidir.';
    } else {
        dayTitle = `${day + 1}. Yaşam Günü (Kararlı İdame)`;
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 150;
            maxRate = 180;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 140;
            maxRate = 160;
        } else {
            minRate = 140;
            maxRate = 160;
        }
        soluteAdvice = 'Tam idame sıvısı (140-160 mL/kg/gün, %5 Dekstroz bazlı) + Na/K elektrolit desteği.';
    }

    // 3. Fototerapi Sıvı Düzeltmesi (LED vs Halojen vs Standart)
    let phototherapyAdjustmentMl = 0;
    if (isPhototherapy) {
        if (phototherapyType === 'HALOGEN') {
            phototherapyAdjustmentMl = 25;
            minRate += 20;
            maxRate += 30;
            soluteAdvice += ' (Klasik halojen/kuvars fototerapi: artmış trans-epidermal buharlaşma kaybı için +20-30 mL/kg/gün eklendi).';
        } else if (phototherapyType === 'LED') {
            phototherapyAdjustmentMl = 10;
            minRate += 10;
            maxRate += 10;
            soluteAdvice += ' (Modern LED fototerapi: hafif trans-epidermal kayıp için +10 mL/kg/gün eklendi).';
        } else {
            // Standart / Belirtilmemiş Fototerapi İdame Düzeltmesi (+15 mL/kg/gün)
            phototherapyAdjustmentMl = 15;
            minRate += 15;
            maxRate += 15;
            soluteAdvice += ' (Fototerapiye bağlı artmış trans-epidermal kayıp: +15 mL/kg/gün eklendi).';
        }
    }

    // 4. Patolojik Fizyolojik Tartı Kaybı Sınırları (Dosya 4 Tablo 7)
    // Term: >%10
    // Preterm >1000g: >%14 (%12-14)
    // Preterm <1000g (ELBW): >%15
    const pathologicalThreshold = weightCategory === 'PRETERM_ELBW' ? 15.0 : (weightCategory === 'PRETERM_VLBW' ? 14.0 : 10.0);
    
    let weightLossAnalysis: NeonatalWeightLossAnalysis | null = null;
    if (birthWeightKg && birthWeightKg > 0) {
        const lossGrams = Math.round((birthWeightKg - weightKg) * 1000);
        const lossPercent = Number((((birthWeightKg - weightKg) / birthWeightKg) * 100).toFixed(1));
        const isPathological = lossPercent > pathologicalThreshold;
        let warning: string | undefined;
        if (isPathological) {
            warning = `PATOLOJİK KİLO KAYBI ALARMI: Bebek doğum ağırlığına göre %${lossPercent} tartı kaybetmiştir (Patolojik Eşik: >%${pathologicalThreshold}). Dehidratasyon ve hipernatremi riski; hidrasyonu ve beslenmeyi acilen değerlendiriniz.`;
        }
        weightLossAnalysis = {
            birthWeightKg,
            currentWeightKg: weightKg,
            weightLossGrams: lossGrams,
            weightLossPercent: lossPercent,
            isPathological,
            warning
        };
    }

    // 5. Küvöz Nemi Önerisi (ELBW)
    let incubatorHumidityRecommendation: string | undefined;
    if (weightCategory === 'PRETERM_ELBW') {
        incubatorHumidityRecommendation = 'Aşırı düşük doğum ağırlıklı (ELBW <1000 g) prematürelerde transepidermal su kaybını (TEWL) önlemek için küvöz bağıl nemi ilk günlerde %80–90 olarak korunmalıdır.';
    }

    const avgRate = Math.round((minRate + maxRate) / 2);
    const totalDailyMl = Math.round(weightKg * avgRate);
    const hourlyRateMl = +(totalDailyMl / 24).toFixed(1);

    // Day 0-2 uses %10 Dextrose (100 mg/mL); Day 3 transitions to %7.5 (75 mg/mL); Day 4+ to %5 (50 mg/mL)
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
        targetGirRange: effectivePreterm ? '4 - 8 mg/kg/dk' : '4 - 6 mg/kg/dk',
        soluteAdvice,
        isPreterm: effectivePreterm,
        isPhototherapy,
        contraindicationNotice: '⚠️ Yenidoğan Dönemi: Klasik Holliday-Segar (100 mL/kg) KONTRENDİKEDİR! TND kademeli günlük sıvı protokolü uygulanmaktadır. Rutin oral su veya %5 Dekstroz verilmesi KESİNLİKLE YASAKTIR (hiponatremi riski).',
        weightCategory,
        pathologicalLossThresholdPercent: pathologicalThreshold,
        weightLossAnalysis,
        phototherapyAdjustmentMl,
        incubatorHumidityRecommendation
    };
}
