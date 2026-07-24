/**
 * INFUSION ENGINE (Sürekli İlaç İnfüzyon Hızı Hesaplayıcı)
 */

export function calculateInfusionRate({
    drugAmountMg,   // Hazırlanan toplam ilaç miktarı (mg)
    totalVolumeMl,  // Sulandırılan toplam hacim (ml)
    weightKg,       // Hasta kilosu (kg)
    targetDose,     // İstenen hedef doz
    doseUnit        // Doz birimi: 'mcg_kg_min', 'mcg_min', 'mg_kg_hr'
}) {
    if (!drugAmountMg || !totalVolumeMl || drugAmountMg <= 0 || totalVolumeMl <= 0) return null;
    if (!targetDose || targetDose <= 0) return null;

    // 1. Çözelti Konsantrasyonu
    const mgPerMl = drugAmountMg / totalVolumeMl;
    const mcgPerMl = mgPerMl * 1000;

    let rateMlHr = 0;

    // 2. Birim Dönüşüm Mantığı
    if (doseUnit === 'mcg_kg_min') {
        if (!weightKg || weightKg <= 0) return null; // Kilo şart
        // Doz (mcg/kg/dk) * Kilo (kg) * 60 dk / Konsantrasyon (mcg/ml)
        rateMlHr = (targetDose * weightKg * 60) / mcgPerMl;
    } else if (doseUnit === 'mcg_min') {
        // Doz (mcg/dk) * 60 dk / Konsantrasyon (mcg/ml)
        rateMlHr = (targetDose * 60) / mcgPerMl;
    } else if (doseUnit === 'mg_kg_hr') {
        if (!weightKg || weightKg <= 0) return null;
        // Doz (mg/kg/saat) * Kilo (kg) / Konsantrasyon (mg/ml)
        rateMlHr = (targetDose * weightKg) / mgPerMl;
    }

    return {
        rateMlHr: Number(rateMlHr.toFixed(1)),
        concentrationMcgMl: Number(mcgPerMl.toFixed(1)),
        concentrationMgMl: Number(mgPerMl.toFixed(2))
    };
}