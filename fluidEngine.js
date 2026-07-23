/**
 * FLUID ENGINE
 * Holliday-Segar yöntemiyle pediatrik ve erişkin idame sıvı hesabı.
 */

export function calculateMaintenanceFluid(weightKg, bodyTemp = 36.6) {
    if (!weightKg || weightKg <= 0) return null;

    let baseDailyMl = 0;

    // Holliday-Segar Kuralı
    if (weightKg <= 10) {
        baseDailyMl = weightKg * 100;
    } else if (weightKg <= 20) {
        baseDailyMl = 1000 + (weightKg - 10) * 50;
    } else {
        baseDailyMl = 1500 + (weightKg - 20) * 20;
    }

    // Yetişkin Tavan Koruması (Standart idame max 2500 ml/gün)
    if (baseDailyMl > 2500) {
        baseDailyMl = 2500;
    }

    // Ateş Düzeltmesi (>37.5°C üzeri her 1°C için %12 perspirasyon artışı)
    let feverMultiplier = 1;
    if (bodyTemp && bodyTemp > 37.5) {
        const extraDegrees = bodyTemp - 37.5;
        feverMultiplier += (extraDegrees * 0.12);
    }

    const totalDailyMl = Math.round(baseDailyMl * feverMultiplier);
    const hourlyMl = Number((totalDailyMl / 24).toFixed(1));

    return {
        dailyMl: totalDailyMl,
        hourlyMl: hourlyMl,
        hasFeverAdjustment: feverMultiplier > 1
    };
}