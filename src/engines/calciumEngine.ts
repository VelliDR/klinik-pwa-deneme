export interface CalciumInput {
    totalCalcium: number | null | undefined;
    albumin?: number | null | undefined;
    ageDays?: number | null | undefined;
    ageYears?: number | null | undefined;
    isPreterm?: boolean;
    isCriticallyIll?: boolean;
}

export interface CalciumResult {
    measuredCa: number;
    correctedCa: number;
    hasAlbumin: boolean;
    flags: string[];
    alertMsg: string;
    referenceRange: string;
    isNeonatal?: boolean;
}

export function calculateCorrectedCalcium({
    totalCalcium,
    albumin,
    ageDays,
    ageYears,
    isPreterm,
    isCriticallyIll
}: CalciumInput): CalciumResult | null {
    if (totalCalcium === undefined || totalCalcium === null || isNaN(totalCalcium)) return null;
    
    let correctedCa = totalCalcium;
    let hasAlbumin = false;
    let alb = albumin;
    
    // HATA-M10-005: Albümin g/L girilmişse (örn: 40 g/L) g/dL'ye (4.0 g/dL) otomatik normalize edilir
    if (alb !== undefined && alb !== null && !isNaN(alb) && alb > 0) {
        if (alb > 10) {
            alb = alb / 10;
        }
        correctedCa = totalCalcium + 0.8 * (4.0 - alb);
        hasAlbumin = true;
    }
    
    const flags: string[] = [];
    let alertMsg = '';

    // HATA-M10-005: Yaşa ve Preterm Durumuna Göre Referans Aralıkları
    const isNeonate = (ageDays !== undefined && ageDays !== null && ageDays <= 28) || isPreterm;
    const isChild = !isNeonate && ((ageDays !== undefined && ageDays !== null && ageDays > 28) || (ageYears !== undefined && ageYears !== null && ageYears < 12));

    let lowerLimit = 8.5;
    let upperLimit = 10.5;
    let referenceRange = '8.5 - 10.5 mg/dL (Erişkin)';

    if (isPreterm) {
        lowerLimit = 7.0;
        upperLimit = 10.0;
        referenceRange = '7.0 - 10.0 mg/dL (Preterm Yenidoğan)';
    } else if (isNeonate) {
        lowerLimit = 7.5;
        upperLimit = 10.5;
        referenceRange = '7.5 - 10.5 mg/dL (Term Yenidoğan)';
    } else if (isChild) {
        lowerLimit = 8.8;
        upperLimit = 10.8;
        referenceRange = '8.8 - 10.8 mg/dL (Pediatrik)';
    }

    if (correctedCa > 14.0) {
        flags.push('CRITICAL_HYPERCALCEMIC_CRISIS');
        alertMsg = "Acil Hiperkalsiyemik Kriz: Agresif IV hidrasyon ve loop diüretiği protokolünü başlatın.";
    } else if (correctedCa > upperLimit) {
        flags.push('ALERT_HYPERCALCEMIA');
        if (isNeonate) {
            alertMsg = `Neonatal Hiperkalsiyemi (>${upperLimit} mg/dL): Hidrasyon ve maternal kalsiyum öyküsünü değerlendirin.`;
        } else {
            alertMsg = "Hiperkalsiyemi: Hidrasyon durumunu değerlendirin, EKG'de kısa QT kontrolü.";
        }
    } else if (correctedCa < lowerLimit) {
        flags.push('ALERT_HYPOCALCEMIA');
        if (isPreterm) {
            alertMsg = "Preterm Hipokalsiyemi (<7.0 mg/dL): IV kalsiyum glukonat, EKG QTc ve apne/tetani takibi.";
        } else if (isNeonate) {
            alertMsg = "Neonatal Hipokalsiyemi (<7.5 mg/dL): Semptomatikse (apne, konvülsiyon, jitteriness) IV kalsiyum replasmanı ve EKG takibi.";
        } else {
            alertMsg = "Hipokalsiyemi riski: EKG'de QTc takibi, tetani bulguları ve Chvostek/Trousseau kontrollerini yapın.";
        }
    }

    // Kritik hasta veya derin hipoalbüminemide iyonize kalsiyum kılavuz uyarısı
    if (isCriticallyIll || (alb !== undefined && alb !== null && alb < 2.0)) {
        flags.push('WARN_IONIZED_CALCIUM_GOLD_STANDARD');
        const critNote = "⚠️ Ağır hipoalbüminemi veya kritik tabloda Payne formülü yanıltıcı olabilir; İyonize Kalsiyum (iCa) altın standarttır.";
        alertMsg = alertMsg ? `${alertMsg} | ${critNote}` : critNote;
    }

    return {
        measuredCa: totalCalcium,
        correctedCa: parseFloat(correctedCa.toFixed(2)),
        hasAlbumin,
        flags,
        alertMsg,
        referenceRange,
        isNeonatal: isNeonate
    };
}
