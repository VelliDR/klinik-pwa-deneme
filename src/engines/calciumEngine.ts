export interface CalciumInput {
    totalCalcium: number | null | undefined;
    albumin?: number | null | undefined;
}

export interface CalciumResult {
    measuredCa: number;
    correctedCa: number;
    hasAlbumin: boolean;
    flags: string[];
    alertMsg: string;
}

export function calculateCorrectedCalcium({ totalCalcium, albumin }: CalciumInput): CalciumResult | null {
    if (totalCalcium === undefined || totalCalcium === null || isNaN(totalCalcium)) return null;
    
    let correctedCa = totalCalcium;
    let hasAlbumin = false;
    
    if (albumin !== undefined && albumin !== null && !isNaN(albumin) && albumin > 0) {
        correctedCa = totalCalcium + 0.8 * (4.0 - albumin);
        hasAlbumin = true;
    }
    
    const flags: string[] = [];
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
