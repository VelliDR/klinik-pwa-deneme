// Pediatric Engine: Şurup dozu, Aşı takvimi, AAP Tansiyon, Centor/McIsaac

export interface PediatricDoseResult {
    name: string;
    targetDoseMg: number;
    volumeMl: number;
    olcekText: string;
    freq: string;
}

export function calculatePediatricDose(
    weightKg: number | null | undefined, 
    drugKey: string
): PediatricDoseResult | null {
    if (!weightKg || weightKg <= 0) return null;

    // Doz profilleri (mg/kg/doz) ve konsantrasyonlar
    const drugs: Record<string, {
        name: string;
        doseMgPerKg: number;
        maxDose: number;
        concentration: number;
        freq: string;
    }> = {
        'paracetamol': {
            name: 'Parasetamol',
            doseMgPerKg: 15,
            maxDose: 1000,
            concentration: 120 / 5, // 120mg / 5ml (Calpol)
            freq: '4-6 saatte bir'
        },
        'ibuprofen': {
            name: 'İbuprofen',
            doseMgPerKg: 10,
            maxDose: 400,
            concentration: 100 / 5, // 100mg / 5ml (Dolven)
            freq: '6-8 saatte bir'
        },
        'amoklavin_400': {
            name: 'Amoksisilin-Klavulanat (400/57)',
            doseMgPerKg: 20, // 40mg/kg/gün (2'ye bölünmüş doz => 20 mg/kg/doz)
            maxDose: 1000,
            concentration: 400 / 5,
            freq: '12 saatte bir'
        },
        'cefuroxime_250': {
            name: 'Sefuroksim (250mg)',
            doseMgPerKg: 15, // 30mg/kg/gün => 15 mg/kg/doz
            maxDose: 500,
            concentration: 250 / 5,
            freq: '12 saatte bir'
        },
        'clarithromycin_125': {
            name: 'Klaritromisin (125mg)',
            doseMgPerKg: 7.5, // 15mg/kg/gün => 7.5 mg/kg/doz
            maxDose: 500,
            concentration: 125 / 5,
            freq: '12 saatte bir'
        },
        'laroxyl_25': {
            name: 'Laroxyl / Amitriptilin (25mg)',
            doseMgPerKg: 0.5,
            maxDose: 50,
            concentration: 25 / 1,
            freq: 'Gece yatarken'
        },
        'cetirizine_5': {
            name: 'Setirizin (5mg/5ml - Zyrtec/Allerset)',
            doseMgPerKg: 0.25,
            maxDose: 10,
            concentration: 5 / 5,
            freq: 'Günde 1 kez'
        }
    };

    const drug = drugs[drugKey];
    if (!drug) return null;

    const targetDoseMg = Math.min(weightKg * drug.doseMgPerKg, drug.maxDose || Infinity);
    const volumeMl = targetDoseMg / drug.concentration;
    
    // Ölçek hesabı (1 ölçek = 5 ml)
    const olcek = volumeMl / 5;
    let olcekText = '';
    
    if (volumeMl < 2.5) {
        olcekText = 'Doğru ölçüm için oral enjektör kullanınız.';
    } else if (olcek >= 1) {
        const tam = Math.floor(olcek);
        const kalan = olcek - tam;
        olcekText = `${tam} tam`;
        if (kalan > 0.1 && kalan <= 0.3) olcekText += ' + 1/4 ölçek';
        else if (kalan > 0.3 && kalan <= 0.6) olcekText += ' + 1/2 ölçek';
        else if (kalan > 0.6 && kalan <= 0.8) olcekText += ' + 3/4 ölçek';
        else if (kalan > 0.8) olcekText = `${tam + 1} tam ölçek`;
        else olcekText += ' ölçek';
    } else {
        if (olcek <= 0.3) olcekText = '1/4 ölçek';
        else if (olcek > 0.3 && olcek <= 0.6) olcekText = '1/2 ölçek';
        else if (olcek > 0.6 && olcek <= 0.8) olcekText = '3/4 ölçek';
        else olcekText = '1 tam ölçek';
    }

    return {
        name: drug.name,
        targetDoseMg: Math.round(targetDoseMg),
        volumeMl: parseFloat(volumeMl.toFixed(1)),
        olcekText,
        freq: drug.freq
    };
}

export function getVaccineSchedule(ageInMonths: number | null | undefined): string[] | null {
    if (ageInMonths === null || ageInMonths === undefined) return null;
    
    let vaccines: string[] = [];
    if (ageInMonths < 1 && ageInMonths >= 0) vaccines = ["Hepatit B (1. Doz) - Doğumda"];
    else if (ageInMonths >= 1 && ageInMonths < 2) vaccines = ["Hepatit B (2. Doz)"];
    else if (ageInMonths >= 2 && ageInMonths < 4) vaccines = ["BCG (Verem)", "KPA (1. Doz)", "DaBT-İPA-Hib-HepB (1. Doz)"];
    else if (ageInMonths >= 4 && ageInMonths < 6) vaccines = ["KPA (2. Doz)", "DaBT-İPA-Hib-HepB (2. Doz)"];
    else if (ageInMonths >= 6 && ageInMonths < 9) vaccines = ["DaBT-İPA-Hib-HepB (3. Doz)", "OPA (1. Doz)"];
    else if (ageInMonths >= 9 && ageInMonths < 12) vaccines = ["KKK (Ek Doz)"];
    else if (ageInMonths >= 12 && ageInMonths < 18) vaccines = ["KPA (Rapel)", "Suçiçeği", "KKK (1. Doz)"];
    else if (ageInMonths >= 18 && ageInMonths < 24) vaccines = ["DaBT-İPA-Hib-HepB (Rapel)", "OPA (2. Doz)", "Hepatit A (1. Doz)"];
    else if (ageInMonths >= 24 && ageInMonths < 48) vaccines = ["Hepatit A (2. Doz)"];
    else if (ageInMonths >= 48 && ageInMonths < 156) vaccines = ["KKK (2. Doz)", "DaBT-İPA (Rapel)"];
    else if (ageInMonths >= 156 && ageInMonths < 216) vaccines = ["Td (Rapel) - 13 Yaş"];
    else if (ageInMonths >= 216 && ageInMonths < 780) vaccines = ["Erişkin Dönemi: Td (Tetanos-Difteri) Rapeli (10 yılda bir)"];
    else if (ageInMonths >= 780) vaccines = ["65 Yaş ve Üzeri: Pnömokok", "65 Yaş ve Üzeri: Yıllık Grip (İnfluenza)", "Td (Tetanos-Difteri) Rapeli"];

    return vaccines;
}

const AAP_BP_THRESHOLDS: Record<'male' | 'female', Record<number, { s90: number; d90: number; s95: number; d95: number }>> = {
    male: {
        1: { s90: 98, d90: 52, s95: 102, d95: 56 },
        2: { s90: 100, d90: 55, s95: 104, d95: 58 },
        3: { s90: 101, d90: 58, s95: 105, d95: 61 },
        4: { s90: 102, d90: 60, s95: 106, d95: 64 },
        5: { s90: 103, d90: 63, s95: 107, d95: 66 },
        6: { s90: 105, d90: 66, s95: 109, d95: 69 },
        7: { s90: 106, d90: 68, s95: 110, d95: 71 },
        8: { s90: 107, d90: 69, s95: 111, d95: 72 },
        9: { s90: 108, d90: 71, s95: 112, d95: 74 },
        10: { s90: 110, d90: 72, s95: 114, d95: 75 },
        11: { s90: 111, d90: 74, s95: 115, d95: 77 },
        12: { s90: 113, d90: 75, s95: 117, d95: 78 }
    },
    female: {
        1: { s90: 98, d90: 54, s95: 101, d95: 58 },
        2: { s90: 101, d90: 58, s95: 104, d95: 61 },
        3: { s90: 102, d90: 60, s95: 105, d95: 63 },
        4: { s90: 104, d90: 62, s95: 107, d95: 65 },
        5: { s90: 105, d90: 64, s95: 108, d95: 67 },
        6: { s90: 106, d90: 66, s95: 109, d95: 69 },
        7: { s90: 107, d90: 67, s95: 111, d95: 70 },
        8: { s90: 109, d90: 69, s95: 112, d95: 71 },
        9: { s90: 110, d90: 70, s95: 114, d95: 72 },
        10: { s90: 112, d90: 72, s95: 115, d95: 74 },
        11: { s90: 113, d90: 73, s95: 117, d95: 75 },
        12: { s90: 115, d90: 74, s95: 119, d95: 76 }
    }
};

export interface PediatricBPResult {
    stage: string;
    alertClass: string;
    thresholds?: string;
}

export function classifyPediatricBP({ 
    ageYears, 
    gender, 
    sbp, 
    dbp 
}: { 
    ageYears: number | null | undefined; 
    gender?: 'male' | 'female' | string; 
    sbp: number | null | undefined; 
    dbp: number | null | undefined; 
}): PediatricBPResult | null {
    if (!sbp || !dbp || sbp <= 0 || dbp <= 0 || ageYears === null || ageYears === undefined || isNaN(sbp) || isNaN(dbp)) return null;
    const isFemale = gender === 'female' || gender === 'F';
    const sex: 'male' | 'female' = isFemale ? 'female' : 'male';

    // 13 yaş ve üzeri adolesanlarda yetişkin kılavuz eşikleri geçerlidir
    if (ageYears >= 13) {
        if (sbp >= 140 || dbp >= 90) {
            return { stage: 'Evre 2 Hipertansiyon (≥140/90)', alertClass: 'text-purple-400 bg-purple-950/40 border-purple-800' };
        }
        if (sbp >= 130 || dbp >= 80) {
            return { stage: 'Evre 1 Hipertansiyon (130-139 / 80-89)', alertClass: 'text-rose-400 bg-rose-950/40 border-rose-800' };
        }
        if (sbp >= 120 && dbp < 80) {
            return { stage: 'Yükselmiş Kan Basıncı / Pre-HT (120-129 / <80)', alertClass: 'text-amber-400 bg-amber-950/40 border-amber-800' };
        }
        return { stage: 'Normal Kan Basıncı (<120/80)', alertClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800' };
    }

    const t = AAP_BP_THRESHOLDS[sex][Math.max(1, Math.min(12, Math.floor(ageYears)))];
    if (!t) return null;

    const s95_plus12 = t.s95 + 12;
    const d95_plus12 = t.d95 + 12;

    if (sbp >= s95_plus12 || dbp >= d95_plus12 || sbp >= 140 || dbp >= 90) {
        return { 
            stage: 'Evre 2 Hipertansiyon (≥95.p + 12 mmHg)', 
            alertClass: 'text-purple-400 bg-purple-950/40 border-purple-800',
            thresholds: `90.p: ${t.s90}/${t.d90} | 95.p: ${t.s95}/${t.d95} | Evre 2: ${s95_plus12}/${d95_plus12}`
        };
    }
    if (sbp >= t.s95 || dbp >= t.d95 || (sbp >= 130 && sbp < 140) || (dbp >= 80 && dbp < 90)) {
        return { 
            stage: 'Evre 1 Hipertansiyon (≥95.p)', 
            alertClass: 'text-rose-400 bg-rose-950/40 border-rose-800',
            thresholds: `90.p: ${t.s90}/${t.d90} | 95.p: ${t.s95}/${t.d95}`
        };
    }
    if (sbp >= t.s90 || dbp >= t.d90 || (sbp >= 120 && sbp < 130)) {
        return { 
            stage: 'Yükselmiş Kan Basıncı / Pre-HT (≥90.p)', 
            alertClass: 'text-amber-400 bg-amber-950/40 border-amber-800',
            thresholds: `90.p: ${t.s90}/${t.d90} | 95.p: ${t.s95}/${t.d95}`
        };
    }
    return { 
        stage: 'Normal Kan Basıncı (<90.p)', 
        alertClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800',
        thresholds: `90.p: ${t.s90}/${t.d90} | 95.p: ${t.s95}/${t.d95}`
    };
}

export interface CentorInput {
    feverOver38?: boolean;
    noCough?: boolean;
    tenderCervicalNodes?: boolean;
    tonsillarExudate?: boolean;
    ageYears: number | null | undefined;
}

export interface CentorResult {
    score: number;
    riskPercent: string;
    recommendation: string;
    alertClass: string;
}

export function calculateCentorMcIsaac({ 
    feverOver38, 
    noCough, 
    tenderCervicalNodes, 
    tonsillarExudate, 
    ageYears 
}: CentorInput): CentorResult {
    let score = 0;
    if (feverOver38) score += 1;
    if (noCough) score += 1;
    if (tenderCervicalNodes) score += 1;
    if (tonsillarExudate) score += 1;

    let agePoints = 0;
    if (ageYears !== null && ageYears !== undefined && !isNaN(ageYears)) {
        if (ageYears >= 3 && ageYears <= 14) agePoints = 1;
        else if (ageYears >= 15 && ageYears <= 44) agePoints = 0;
        else if (ageYears >= 45) agePoints = -1;
    }
    score += agePoints;

    let riskPercent = '%1 - %10';
    let recommendation = '';
    let alertClass = 'text-emerald-400';

    if (score <= 1) {
        riskPercent = '%1 - %10 (Çok Düşük)';
        recommendation = 'Streptokok olasılığı çok düşüktür. Boğaz kültürü ve antibiyotik ÖNERİLMEZ. Semptomatik / analjezik takip yeterlidir.';
        alertClass = 'text-emerald-400';
    } else if (score <= 3) {
        riskPercent = '%15 - %32 (Orta)';
        recommendation = 'Hızlı Antijen Testi (Strep-A) veya Boğaz Kültürü önerilir. Yalnızca test pozitif çıkarsa antibiyotik başlanmalıdır.';
        alertClass = 'text-amber-400';
    } else {
        riskPercent = '%51 - %53 (Yüksek)';
        recommendation = 'Yüksek AGBHS olasılığı. Hızlı test/kültürle doğrulayınız veya klinik karara göre ampirik antibiyotik (Amoksisilin/Penisilin V) değerlendiriniz.';
        alertClass = 'text-rose-400';
    }

    return {
        score,
        riskPercent,
        recommendation,
        alertClass
    };
}
