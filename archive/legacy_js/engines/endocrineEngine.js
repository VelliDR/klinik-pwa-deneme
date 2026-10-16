/**
 * ENDOCRINE & METABOLISM ENGINE (ÇEDD Çözüm Standartları)
 * - Glukokortikoid (Steroid) Doz Eşdeğerlik Hesaplayıcı
 * - HOMA-IR İnsülin Direnci İndeksi & ÇEDD Pubertal Eşikleri
 */

const STEROID_EQUIVALENTS = {
    hydrocortisone: { name: 'Hidrokortizon', eqDose: 20.0, antiInflam: 1.0, mineralo: 1.0, halfLife: 'Kısa (8-12 sa)' },
    prednisolone: { name: 'Prednizolon', eqDose: 5.0, antiInflam: 4.0, mineralo: 0.8, halfLife: 'Orta (12-36 sa)' },
    prednisone: { name: 'Prednizon', eqDose: 5.0, antiInflam: 4.0, mineralo: 0.8, halfLife: 'Orta (12-36 sa)' },
    methylprednisolone: { name: 'Metilprednizolon', eqDose: 4.0, antiInflam: 5.0, mineralo: 0.5, halfLife: 'Orta (12-36 sa)' },
    triamcinolone: { name: 'Triamsinolon', eqDose: 4.0, antiInflam: 5.0, mineralo: 0.0, halfLife: 'Orta (12-36 sa)' },
    dexamethasone: { name: 'Deksametazon', eqDose: 0.75, antiInflam: 25.0, mineralo: 0.0, halfLife: 'Uzun (36-72 sa)' },
    betamethasone: { name: 'Betametazon', eqDose: 0.60, antiInflam: 25.0, mineralo: 0.0, halfLife: 'Uzun (36-72 sa)' },
    deflazacort: { name: 'Deflazakort', eqDose: 6.0, antiInflam: 3.5, mineralo: 0.2, halfLife: 'Orta (12-36 sa)' }
};

/**
 * 1. GLUKOKORTİKOİD (STEROİD) DOZ DÖNÜŞÜM MOTORU
 */
export function convertSteroids({ sourceDrug, doseMg }) {
    if (!sourceDrug || doseMg === undefined || doseMg === null || doseMg <= 0 || isNaN(doseMg)) {
        return null;
    }

    const key = String(sourceDrug).toLowerCase().trim();
    const sourceInfo = STEROID_EQUIVALENTS[key];
    if (!sourceInfo) return null;

    // Normalize to hydrocortisone equivalent (mg)
    const hydrocortisoneUnits = (doseMg / sourceInfo.eqDose) * 20.0;

    const conversions = [];
    for (const [k, item] of Object.entries(STEROID_EQUIVALENTS)) {
        const equivalentDose = (hydrocortisoneUnits / 20.0) * item.eqDose;
        conversions.push({
            id: k,
            name: item.name,
            equivalentDoseMg: Number(equivalentDose.toFixed(2)),
            antiInflammatoryPotency: item.antiInflam,
            mineralocorticoidPotency: item.mineralo,
            halfLife: item.halfLife,
            isSource: k === key
        });
    }

    return {
        sourceDrug: sourceInfo.name,
        inputDoseMg: doseMg,
        conversions
    };
}

/**
 * 2. HOMA-IR İNSÜLİN DİRENCİ VE ÇEDD PUBERTE SINIFLANDIRMASI
 * Formül: (Açlık Plazma Glukozu (mg/dL) * Açlık İnsülini (uU/mL)) / 405
 */
export function calculateHOMAIR({ fastingGlucoseMgDl, fastingInsulinUuMl, tannerStage = 'prepubertal' }) {
    if (!fastingGlucoseMgDl || !fastingInsulinUuMl || fastingGlucoseMgDl <= 0 || fastingInsulinUuMl <= 0) {
        return null;
    }

    const homa = (fastingGlucoseMgDl * fastingInsulinUuMl) / 405.0;
    const homaValue = Number(homa.toFixed(2));

    // ÇEDD Pediatrik Eşik Değerleri
    // Prepubertal (Tanner 1): > 2.50
    // Pubertal (Tanner 2-5): > 3.16
    // Yetişkin: > 2.50
    const isPubertal = tannerStage === 'pubertal' || tannerStage === 'tanner_2_5';
    const cutoff = isPubertal ? 3.16 : 2.50;
    const isResistant = homaValue >= cutoff;

    let interpretation = '';
    let alertClass = '';

    if (isResistant) {
        interpretation = `⚠️ İnsülin Direnci Pozitif (HOMA-IR ${homaValue} ≥ ${cutoff}): Yaşam tarzı değişikliği, beslenme konsültasyonu, lipid profili ve ALT takibi önerilir.`;
        alertClass = 'text-rose-400 border-rose-700 bg-rose-950/40';
    } else {
        interpretation = `🟢 İnsülin Duyarlılığı Normal (HOMA-IR ${homaValue} < ${cutoff}).`;
        alertClass = 'text-emerald-400 border-emerald-700 bg-emerald-950/40';
    }

    return {
        homaIR: homaValue,
        cutoff,
        isResistant,
        tannerStage: isPubertal ? 'Pubertal (Tanner 2-5)' : 'Prepubertal (Tanner 1)',
        interpretation,
        alertClass
    };
}
