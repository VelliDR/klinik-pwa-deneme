export interface SteroidDefinition {
    name: string;
    eqDose: number;
    antiInflam: number;
    mineralo: number;
    halfLife: string;
}

export const STEROID_EQUIVALENTS: Record<string, SteroidDefinition> = {
    hydrocortisone: { name: 'Hidrokortizon', eqDose: 20.0, antiInflam: 1.0, mineralo: 1.0, halfLife: 'Kısa (8-12 sa)' },
    prednisolone: { name: 'Prednizolon', eqDose: 5.0, antiInflam: 4.0, mineralo: 0.8, halfLife: 'Orta (12-36 sa)' },
    prednisone: { name: 'Prednizon', eqDose: 5.0, antiInflam: 4.0, mineralo: 0.8, halfLife: 'Orta (12-36 sa)' },
    methylprednisolone: { name: 'Metilprednizolon', eqDose: 4.0, antiInflam: 5.0, mineralo: 0.5, halfLife: 'Orta (12-36 sa)' },
    triamcinolone: { name: 'Triamsinolon', eqDose: 4.0, antiInflam: 5.0, mineralo: 0.0, halfLife: 'Orta (12-36 sa)' },
    dexamethasone: { name: 'Deksametazon', eqDose: 0.75, antiInflam: 25.0, mineralo: 0.0, halfLife: 'Uzun (36-72 sa)' },
    betamethasone: { name: 'Betametazon', eqDose: 0.60, antiInflam: 25.0, mineralo: 0.0, halfLife: 'Uzun (36-72 sa)' },
    deflazacort: { name: 'Deflazakort', eqDose: 6.0, antiInflam: 3.5, mineralo: 0.2, halfLife: 'Orta (12-36 sa)' }
};

export interface SteroidConversionItem {
    id: string;
    name: string;
    equivalentDoseMg: number;
    antiInflammatoryPotency: number;
    mineralocorticoidPotency: number;
    halfLife: string;
    isSource: boolean;
}

export interface SteroidConversionResult {
    sourceDrug: string;
    inputDoseMg: number;
    conversions: SteroidConversionItem[];
    hpaSuppressionAlert?: boolean;
    hpaSuppressionWarning?: string;
    mineralocorticoidWarning?: string;
}

export function convertSteroids({ sourceDrug, doseMg }: { sourceDrug: string; doseMg: number | null | undefined }): SteroidConversionResult | null {
    if (!sourceDrug || doseMg === undefined || doseMg === null || doseMg <= 0 || isNaN(doseMg)) {
        return null;
    }

    const key = String(sourceDrug).toLowerCase().trim();
    const sourceInfo = STEROID_EQUIVALENTS[key];
    if (!sourceInfo) return null;

    // Normalize to hydrocortisone equivalent (mg)
    const hydrocortisoneUnits = (doseMg / sourceInfo.eqDose) * 20.0;

    const conversions: SteroidConversionItem[] = [];
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

    // HATA-M12-001: Suprafizyolojik Steroid Dozlarında HPA Aksı Baskılanma Alarmı (Prednizolon eşdeğeri >= 20 mg)
    const predEquivMg = (hydrocortisoneUnits / 20.0) * 5.0;
    let hpaSuppressionAlert = false;
    let hpaSuppressionWarning: string | undefined;
    if (predEquivMg >= 20.0) {
        hpaSuppressionAlert = true;
        hpaSuppressionWarning = '⚠️ HPA Aksı Baskılanma Uyarısı (Eşdeğer Doz ≥20 mg Prednizon): >3 hafta süreli kullanımda HPA aksı belirgin baskılanır. İlaç aniden kesilemez; akut adrenal krizi önlemek için kademeli doz azaltımı (tapering) uygulanmalıdır.';
    }

    // HATA-M12-002: Mineralokortikoid Potansiyeli Uyarısı
    let mineralocorticoidWarning: string | undefined;
    if (sourceInfo.mineralo >= 0.8) {
        mineralocorticoidWarning = 'ℹ️ Mineralokortikoid Etki Uyarısı: Seçilen steroidin mineralokortikoid potansiyeli yüksektir. Sodyum/su tutulumu ve hipokalemi riski nedeniyle kalp yetmezliği, hipertansiyon ve siroz hastalarında dikkatli olunmalıdır.';
    }

    return {
        sourceDrug: sourceInfo.name,
        inputDoseMg: doseMg,
        conversions,
        hpaSuppressionAlert,
        hpaSuppressionWarning,
        mineralocorticoidWarning
    };
}

export interface HOMAIRInput {
    fastingGlucoseMgDl: number | null | undefined;
    fastingInsulinUuMl: number | null | undefined;
    tannerStage?: 'prepubertal' | 'pubertal' | 'tanner_2_5' | string;
}

export interface HOMAIRResult {
    homaIR: number;
    cutoff: number;
    isResistant: boolean;
    tannerStage: string;
    interpretation: string;
    alertClass: string;
    unitWarning?: string;
    validityWarning?: string;
}

export function calculateHOMAIR({ fastingGlucoseMgDl, fastingInsulinUuMl, tannerStage = 'prepubertal' }: HOMAIRInput): HOMAIRResult | null {
    if (!fastingGlucoseMgDl || !fastingInsulinUuMl || fastingGlucoseMgDl <= 0 || fastingInsulinUuMl <= 0) {
        return null;
    }

    const homa = (fastingGlucoseMgDl * fastingInsulinUuMl) / 405.0;
    const homaValue = Number(homa.toFixed(2));

    const isPubertal = tannerStage === 'pubertal' || tannerStage === 'tanner_2_5';
    const cutoff = isPubertal ? 3.16 : 2.50;
    const isResistant = homaValue >= cutoff;

    // HATA-M12-003: Birim doğrulaması ve aşırı uç değer kontrolü
    let unitWarning: string | undefined;
    if (fastingGlucoseMgDl < 30) {
        unitWarning = '⚠️ Glukoz değeri <30 mg/dL\'dir. Değer mmol/L cinsinden girilmiş olabilir (mmol/L -> mg/dL dönüşümü için 18 ile çarpınız).';
    }

    let validityWarning: string | undefined;
    if (fastingGlucoseMgDl > 250) {
        validityWarning = '⚠️ Açlık glukozu >250 mg/dL olan akut hiperglisemi/ketoasidoz tablolarında HOMA-IR formülü beta-hücre dekompansasyonu nedeniyle güvenilirliğini yitirir; bazal stabil açlık gereklidir.';
    }

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
        alertClass,
        unitWarning,
        validityWarning
    };
}
