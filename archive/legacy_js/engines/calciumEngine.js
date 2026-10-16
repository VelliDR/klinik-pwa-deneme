export function calculateCorrectedCalcium({ totalCalcium, albumin }) {
    if (totalCalcium === undefined || totalCalcium === null) return null;
    
    let correctedCa = totalCalcium;
    let hasAlbumin = false;
    
    if (albumin !== undefined && albumin !== null && albumin > 0) {
        correctedCa = totalCalcium + 0.8 * (4.0 - albumin);
        hasAlbumin = true;
    }
    
    let flags = [];
    let alertMsg = '';

    if (correctedCa < 8.5) {
        flags.push('ALERT_HYPOCALCEMIA');
        alertMsg = "Hipokalsiyemi riski: EKG'de QTc takibi, tetani bulguları ve Chvostek/Trousseau kontrollerini yapın.";
    } else if (correctedCa > 14.0) {
        flags.push('CRITICAL_HYPERCALCEMIC_CRISIS');
        alertMsg = "Acil Hiperkalsiyemik Kriz: Agresif IV hidrasyon ve loop diüretiği protokolünü başlatın.";
    } else if (correctedCa > 10.5) {
        flags.push('ALERT_HYPERCALCEMIA');
        alertMsg = "Hiperkalsiyemi: Hidrasyon durumunu değerlendirin, EKG'de kısa QT kontrolü.";
    }

    return {
        measuredCa: totalCalcium,
        correctedCa: parseFloat(correctedCa.toFixed(2)),
        hasAlbumin,
        flags,
        alertMsg
    };
}
