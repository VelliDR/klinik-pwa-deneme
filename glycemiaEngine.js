/**
 * GLYCEMIA ENGINE
 * Dinamik İnsülin Düzeltme + Karbonhidrat Bolusu Hesaplama Motoru
 */

export function calculateInsulin(params) {
    const { currentGlucose, targetGlucose = 100, carbsGrams = 0, isf, icRatio, ageGroup } = params;

    if (!currentGlucose || currentGlucose <= 0) return null;

    let correctionDose = 0;
    let carbDose = 0;
    const warnings = [];

    // 1. Hipoglisemi Güvenlik Kilidi
    if (currentGlucose < 70) {
        return {
            correctionDose: 0,
            carbDose: 0,
            totalInsulin: 0,
            warnings: ['⚠️ HİPOGLİSEMİ RİSKİ: Kan Şekeri < 70 mg/dL! İnsülin yapmayın, hızlı etkili karbonhidrat verin.']
        };
    }

    // 2. Düzeltme Dozu Hesabı = (Mevcut KŞ - Hedef KŞ) / ISF
    if (isf && isf > 0 && currentGlucose > targetGlucose) {
        correctionDose = (currentGlucose - targetGlucose) / isf;
    }

    // 3. Karbonhidrat Dozu Hesabı = Karbonhidrat (g) / I:C Oranı
    if (icRatio && icRatio > 0 && carbsGrams > 0) {
        carbDose = carbsGrams / icRatio;
    }

    let totalInsulin = correctionDose + carbDose;

    // 4. Maksimum Bolus Tavan Koruması (Pediatri: 10 Ünite, Yetişkin: 20 Ünite)
    const maxBolusLimit = (ageGroup && ageGroup.isPediatric) ? 10 : 20;
    if (totalInsulin > maxBolusLimit) {
        totalInsulin = maxBolusLimit;
        warnings.push(`⚠️ TAVAN DOZ KORUMASI: Tekil bolus üst sınırı (${maxBolusLimit} Ünite) aşılamaz!`);
    }

    return {
        correctionDose: Number(correctionDose.toFixed(1)),
        carbDose: Number(carbDose.toFixed(1)),
        totalInsulin: Number(totalInsulin.toFixed(1)),
        warnings
    };
}