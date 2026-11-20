// ============================================================================
// AKUT APANDİSİT MOTORU (WSES 2020 Kudüs Kılavuzu)
// 1. Alvarado Skoru (MANTRELS, 1986 & McKay 2007 BT Karar Kuralı Karşılaştırmalı)
// 2. Appendicitis Inflammatory Response (AIR) Skoru (2008 / 2012 Erratum / 2021 STRAPPSCORE)
// 3. Adult Appendicitis Score (AAS, Sammalkorpi 2014)
// 4. Üçlü Sistem Karşılaştırma & Kılavuz Öneri Sentezleyici
// ============================================================================

export type AlvaradoCutoffMode = 'wses_original' | 'emergency_ct';

export interface AlvaradoParams {
    migration?: boolean;
    anorexia?: boolean;
    nausea?: boolean;
    rlqPain?: boolean;
    rebound?: boolean;
    temp?: boolean;
    leukocytosis?: boolean;
    leftShift?: boolean;
    gender?: 'male' | 'female' | string;
    ageYears?: number | null;
    // Opsiyonel sayısal girdiler (ortak lab paneli entegrasyonu)
    tempC?: number | null;
    wbcCount?: number | null; // /mm³ veya x10^9/L (<100 ise x10^9/L kabul edilir)
    neutrophilPercent?: number | null;
    cutoffMode?: AlvaradoCutoffMode;
}

export interface AlvaradoModeComparison {
    wsesOriginalRisk: 'Düşük' | 'Orta' | 'Yüksek' | 'Çok Yüksek';
    wsesOriginalAction: string;
    emergencyCtRisk: 'Düşük (≤3)' | 'Orta / BT Endike (4–6)' | 'Yüksek / Konsültasyon (≥7)';
    emergencyCtAction: string;
    isDiscordant: boolean;
}

export interface AlvaradoResult {
    score: number;
    risk: 'Düşük' | 'Orta' | 'Yüksek' | string;
    subRiskCategory: 'Düşük Olasılık (0–4)' | 'Orta / Şüpheli Olasılık (5–6)' | 'Yüksek Olasılık (7–8)' | 'Çok Yüksek Olasılık (9–10)' | string;
    cutoffMode: AlvaradoCutoffMode;
    recommendation: string;
    gynecologicWarning?: string;
    wsesSpecificityNote: string;
    modeComparison: AlvaradoModeComparison;
}

function normalizeWbcToX10E9(wbc: number | null | undefined): number | null {
    if (wbc === null || wbc === undefined || !Number.isFinite(wbc) || wbc <= 0) return null;
    // Hekim 12500 (/mm³) veya 12.5 (x10^9/L) girebilir
    return wbc > 200 ? wbc / 1000 : wbc;
}

export function calculateAlvarado(params: AlvaradoParams | null | undefined): AlvaradoResult | null {
    if (!params) return null;

    const wbcNorm = normalizeWbcToX10E9(params.wbcCount);
    const hasTemp = Boolean(params.temp) || (params.tempC !== null && params.tempC !== undefined && params.tempC >= 37.3);
    const hasLeuko = Boolean(params.leukocytosis) || (wbcNorm !== null && wbcNorm > 10.0);
    const hasShift = Boolean(params.leftShift) || (params.neutrophilPercent !== null && params.neutrophilPercent !== undefined && params.neutrophilPercent > 75);

    let score = 0;
    if (params.migration) score += 1;
    if (params.anorexia) score += 1;
    if (params.nausea) score += 1;
    if (params.rlqPain) score += 2;
    if (params.rebound) score += 1;
    if (hasTemp) score += 1;
    if (hasLeuko) score += 2;
    if (hasShift) score += 1;

    const cutoffMode: AlvaradoCutoffMode = params.cutoffMode || 'wses_original';

    // 1. Orijinal 1986 & WSES 2020 (Ohle 2011) değerlendirmesi
    const wsesOriginalRisk: AlvaradoModeComparison['wsesOriginalRisk'] =
        score <= 4 ? 'Düşük' : score <= 6 ? 'Orta' : score <= 8 ? 'Yüksek' : 'Çok Yüksek';
    const wsesOriginalAction =
        score <= 4
            ? 'WSES 2020: Akut apandisit güvenle dışlanabilir (Duyarlılık %99, NPV ~%95). Ek görüntüleme yapılmaksızın güvenlik ağı (safety-netting) uyarılarıyla taburculuk.'
            : score <= 6
                ? 'WSES 2020: Orta olasılık / gri alan. Aktif klinik gözlem, seri muayene ve ilk basamak dereceli kompresyon USG (sonuçsuzsa düşük doz BT).'
                : score <= 8
                    ? 'WSES 2020: Muhtemel apandisit. Cerrahi konsültasyon; erişkinlerde tek başına Alvarado özgüllüğü (%81) doğrudan cerrahi için yetersiz olduğundan preoperatif görüntüleme önerilir.'
                    : 'WSES 2020: Çok yüksek olasılık (9–10p). Cerrahi konsültasyon; genç (<40 yaş) hastalarda görüntülemesiz tanısal laparoskopi düşünülebilir.';

    // 2. Acil Tıp BT Karar Kuralı (McKay & Shepherd 2007: ≤3 Düşük, 4–6 BT, ≥7 Konsültasyon)
    const emergencyCtRisk: AlvaradoModeComparison['emergencyCtRisk'] =
        score <= 3 ? 'Düşük (≤3)' : score <= 6 ? 'Orta / BT Endike (4–6)' : 'Yüksek / Konsültasyon (≥7)';
    const emergencyCtAction =
        score <= 3
            ? 'McKay BT Protokolü (≤3p): Apandisit olasılığı çok düşük; BT çekilmeksizin izlem/taburculuk.'
            : score <= 6
                ? 'McKay BT Protokolü (4–6p): Şüpheli aralık (4 puan dahil); tanısal BT / USG endikedir.'
                : 'McKay BT Protokolü (≥7p): Doğrudan cerrahi konsültasyon.';

    const isDiscordant = score === 4; // 4 puan: WSES'de Düşük (<5), McKay BT kuralında Orta (4-6)

    let risk: 'Düşük' | 'Orta' | 'Yüksek' | string = '';
    let subRiskCategory = '';
    let recommendation = '';

    if (cutoffMode === 'emergency_ct') {
        if (score <= 3) {
            risk = 'Düşük';
            subRiskCategory = 'Düşük Olasılık (0–3 Puan — Acil BT Protokolü)';
            recommendation = emergencyCtAction;
        } else if (score <= 6) {
            risk = 'Orta';
            subRiskCategory = 'Orta / Şüpheli Olasılık (4–6 Puan — Acil BT Protokolü)';
            recommendation = emergencyCtAction;
        } else {
            risk = 'Yüksek';
            subRiskCategory = score >= 9 ? 'Çok Yüksek Olasılık (9–10 Puan)' : 'Yüksek Olasılık (7–8 Puan)';
            recommendation = emergencyCtAction;
        }
    } else {
        if (score <= 4) {
            risk = 'Düşük';
            subRiskCategory = 'Düşük Olasılık (0–4 Puan)';
            recommendation = 'Apendisit uzak ihtimal. Alternatif tanıları düşünün. (WSES 2020: <5 puanda NPV ~%95, görüntülemesiz taburculuk değerlendirilebilir).';
        } else if (score >= 5 && score <= 6) {
            risk = 'Orta';
            subRiskCategory = 'Orta / Şüpheli Olasılık (5–6 Puan)';
            recommendation = 'Olası apendisit. Gözlem ve USG/BT endikasyonu.';
        } else {
            risk = 'Yüksek';
            subRiskCategory = score >= 9 ? 'Çok Yüksek Olasılık (9–10 Puan)' : 'Yüksek Olasılık (7–8 Puan)';
            recommendation = 'Kuvvetle muhtemel apendisit. Cerrahi konsültasyon endike.';
        }
    }

    let gynecologicWarning: string | undefined = undefined;
    const isFemale = params.gender === 'female' || params.gender === 'F';
    const isFemaleReproductiveAge = isFemale
        && params.ageYears !== null
        && params.ageYears !== undefined
        && params.ageYears >= 15
        && params.ageYears <= 45;

    if (isFemaleReproductiveAge) {
        gynecologicWarning = "⚠️ Doğurganlık Çağında Kadın Hasta (15–45 Yaş): Sağ alt kadran ağrısında negatif apendektomiyi (%30'a varan) önlemek için pelvik USG ve gebelik testi (β-hCG) ile ektopik gebelik, over kist torsiyonu/rüptürü ve PID gibi jinekolojik patolojileri mutlaka ekarte ediniz.";
        if (score >= 5 || (cutoffMode === 'emergency_ct' && score >= 4)) {
            recommendation += ' ' + gynecologicWarning;
        }
    }

    const wsesSpecificityNote = 'Ohle 2011 Meta-Analizi & WSES 2020: Alvarado <5 kesim noktasında dışlama duyarlılığı %99 iken, ≥7 kesim noktasında özgüllük %81 (kadınlarda %73, çocuklarda %76) düzeyindedir; doğurganlık çağındaki kadınlarda olasılığı olduğundan yüksek tahmin eder (over-prediction).';

    return {
        score,
        risk,
        subRiskCategory,
        cutoffMode,
        recommendation,
        gynecologicWarning,
        wsesSpecificityNote,
        modeComparison: {
            wsesOriginalRisk,
            wsesOriginalAction,
            emergencyCtRisk,
            emergencyCtAction,
            isDiscordant
        }
    };
}

// ============================================================================
// 2. APPENDICITIS INFLAMMATORY RESPONSE (AIR) SKORU (2008 / 2012 Erratum / 2021 Rev.)
// ============================================================================

export type AIRReboundGrade = 0 | 1 | 2 | 3; // 0: Yok, 1: Hafif, 2: Orta, 3: Şiddetli
export type AIRCutoffMode = 'strappscore_2021' | 'original_2008';

export interface AIRScoreParams {
    vomiting?: boolean;
    rifPain?: boolean;
    reboundGrade?: AIRReboundGrade;
    fever385?: boolean;
    tempC?: number | null;
    // Doğrudan puan kademesi VEYA sayısal laboratuvar değeri
    pmnlPoints?: 0 | 1 | 2;
    neutrophilPercent?: number | null;
    wbcPoints?: 0 | 1 | 2;
    wbcCount?: number | null;
    crpPoints?: 0 | 1 | 2;
    crpMgL?: number | null; // 2012 Erratum: mg/L!
    ageYears?: number | null;
    cutoffMode?: AIRCutoffMode;
}

export interface AIRModeComparison {
    strappscore2021Risk: 'Düşük (0–3)' | 'Orta (4–8)' | 'Yüksek (9–12)';
    strappscore2021Action: string;
    original2008Risk: 'Düşük (0–4)' | 'Orta (5–8)' | 'Yüksek (9–12)';
    original2008Action: string;
    isScore4Discordant: boolean;
}

export interface AIRScoreResult {
    score: number;
    maxScore: 12;
    clinicalPoints: number;
    labPoints: number;
    risk: 'Düşük' | 'Orta' | 'Yüksek';
    riskLabel: string;
    cutoffMode: AIRCutoffMode;
    alertClass: 'success' | 'warning' | 'danger';
    recommendation: string;
    ageSpecificNote: string;
    erratumNote: string;
    modeComparison: AIRModeComparison;
}

export function calculateAIRScore(params: AIRScoreParams | null | undefined): AIRScoreResult | null {
    if (!params) return null;

    let clinicalPoints = 0;
    if (params.vomiting) clinicalPoints += 1;
    if (params.rifPain) clinicalPoints += 1;

    const reb = params.reboundGrade !== undefined ? Math.max(0, Math.min(3, Math.floor(params.reboundGrade))) : 0;
    clinicalPoints += reb;

    const hasFever385 = Boolean(params.fever385) || (params.tempC !== null && params.tempC !== undefined && params.tempC >= 38.5);
    if (hasFever385) clinicalPoints += 1;

    // Laboratuvar Puanları (PMNL %, WBC x10^9/L, CRP mg/L)
    let pmnlPts = 0;
    if (params.neutrophilPercent !== null && params.neutrophilPercent !== undefined && Number.isFinite(params.neutrophilPercent)) {
        if (params.neutrophilPercent >= 85) pmnlPts = 2;
        else if (params.neutrophilPercent >= 70) pmnlPts = 1;
        else pmnlPts = 0;
    } else if (params.pmnlPoints !== undefined) {
        pmnlPts = params.pmnlPoints;
    }

    let wbcPts = 0;
    const wbcNorm = normalizeWbcToX10E9(params.wbcCount);
    if (wbcNorm !== null) {
        if (wbcNorm >= 15.0) wbcPts = 2;
        else if (wbcNorm >= 10.0) wbcPts = 1;
        else wbcPts = 0;
    } else if (params.wbcPoints !== undefined) {
        wbcPts = params.wbcPoints;
    }

    let crpPts = 0;
    if (params.crpMgL !== null && params.crpMgL !== undefined && Number.isFinite(params.crpMgL) && params.crpMgL >= 0) {
        if (params.crpMgL >= 50) crpPts = 2;
        else if (params.crpMgL >= 10) crpPts = 1;
        else crpPts = 0;
    } else if (params.crpPoints !== undefined) {
        crpPts = params.crpPoints;
    }

    const labPoints = pmnlPts + wbcPts + crpPts;
    const score = clinicalPoints + labPoints;
    const cutoffMode: AIRCutoffMode = params.cutoffMode || 'strappscore_2021';

    const strappscore2021Risk: AIRModeComparison['strappscore2021Risk'] =
        score <= 3 ? 'Düşük (0–3)' : score <= 8 ? 'Orta (4–8)' : 'Yüksek (9–12)';
    const strappscore2021Action =
        score <= 3
            ? '2021 STRAPPSCORE Revizyonu (0–3p): Komplike apandisit olasılığı çok düşük (Duyarlılık %99.0, NPV %99). Görüntülemesiz poliklinik kontrolü / güvenlik ağı ile taburculuk.'
            : score <= 8
                ? '2021 STRAPPSCORE Revizyonu (4–8p): Orta olasılık. Aktif gözlem, skor tekrarı ve tanısal görüntüleme (öncelikle US, gerekirse düşük doz BT).'
                : '2021 STRAPPSCORE Revizyonu (9–12p): Yüksek olasılık (Özgüllük %98–99, gençlerde PPV %96). Cerrahi konsültasyon.';

    const original2008Risk: AIRModeComparison['original2008Risk'] =
        score <= 4 ? 'Düşük (0–4)' : score <= 8 ? 'Orta (5–8)' : 'Yüksek (9–12)';
    const original2008Action =
        score <= 4
            ? 'Orijinal 2008 / WSES 2020 (0–4p): Düşük olasılık; ayaktan takip (Ancak 2021 STRAPPSCORE çalışmasında 4 puanda komplike apandisit kaçabileceği için ≥4 eşiği önerilmiştir).'
            : score <= 8
                ? 'Orijinal 2008 / WSES 2020 (5–8p): Orta olasılık; gözlem ve tanısal görüntüleme.'
                : 'Orijinal 2008 / WSES 2020 (9–12p): Yüksek olasılık; cerrahi değerlendirme.';

    const isScore4Discordant = score === 4;

    const lowThreshold = cutoffMode === 'strappscore_2021' ? 3 : 4;
    let risk: 'Düşük' | 'Orta' | 'Yüksek' = 'Düşük';
    let riskLabel = '';
    let alertClass: 'success' | 'warning' | 'danger' = 'success';
    let recommendation = '';

    if (score <= lowThreshold) {
        risk = 'Düşük';
        riskLabel = cutoffMode === 'strappscore_2021' ? 'Düşük Olasılık (0–3 Puan)' : 'Düşük Olasılık (0–4 Puan)';
        alertClass = 'success';
        recommendation = cutoffMode === 'strappscore_2021' ? strappscore2021Action : original2008Action;
    } else if (score <= 8) {
        risk = 'Orta';
        riskLabel = cutoffMode === 'strappscore_2021' ? 'Orta / Belirsiz Olasılık (4–8 Puan)' : 'Orta / Belirsiz Olasılık (5–8 Puan)';
        alertClass = 'warning';
        recommendation = cutoffMode === 'strappscore_2021' ? strappscore2021Action : original2008Action;
        if (isScore4Discordant) {
            recommendation += ' ⚠️ [SKOR 4 KARŞILAŞTIRMASI]: 2008 orijinal yayında 4 puan düşük risk sayılırken, 2021 STRAPPSCORE (n=3.878) çalışmasında komplike apandisit duyarlılığını %99\'a çıkarmak için alt eşik ≥4 puana çekilmiştir.';
        }
    } else {
        risk = 'Yüksek';
        riskLabel = 'Yüksek Olasılık (9–12 Puan)';
        alertClass = 'danger';
        if (params.ageYears !== null && params.ageYears !== undefined && params.ageYears >= 40) {
            recommendation = 'WSES 2020 Yüksek Risk (9–12p) & Yaş ≥40 Uyarısı: Skor çok yüksek olmasına karşın ≥40 yaş hastalarda ~%3 kolorektal malignite ve akut divertikülit riskini dışlamak için ameliyat öncesi kesitsel görüntüleme (BT) önerilir!';
        } else {
            recommendation = 'WSES 2020 Yüksek Risk (9–12p): Özgüllük %98–99. <40 yaş hastalarda preoperatif BT çekilmeksizin doğrudan tanısal laparoskopi ve apendektomiye geçilebilir.';
        }
    }

    let ageSpecificNote = 'AIR skoru hem erişkinlerde hem pediatrik popülasyonda (ROC AUC: tümü 0.83, komplike 0.89, <15 yaş çocuklarda 0.92–0.93) doğrulanmıştır.';
    if (params.ageYears !== null && params.ageYears !== undefined && params.ageYears < 15) {
        ageSpecificNote = `Pediatrik Hasta (${params.ageYears} Yaş): AIR skoru <15 yaş çocuklarda komplike apandisit için 0.92–0.93 ROC AUC ile çok yüksek tanısal doğruluk sağlar.`;
    }

    const erratumNote = 'Birim Doğrulaması (Andersson 2012 Erratum): 2008 orijinal makalede CRP birimi baskı hatasıyla "g/L" yazılmıştır; doğru birim "mg/L" (10–49 mg/L: +1p, ≥50 mg/L: +2p) olarak uygulanmaktadır.';

    return {
        score,
        maxScore: 12,
        clinicalPoints,
        labPoints,
        risk,
        riskLabel,
        cutoffMode,
        alertClass,
        recommendation,
        ageSpecificNote,
        erratumNote,
        modeComparison: {
            strappscore2021Risk,
            strappscore2021Action,
            original2008Risk,
            original2008Action,
            isScore4Discordant
        }
    };
}

// ============================================================================
// 3. ADULT APPENDICITIS SCORE (AAS — Sammalkorpi et al., 2014)
// ============================================================================

export type AASGuardingGrade = 0 | 2 | 4; // 0: Yok, 2: Hafif, 4: Orta/Şiddetli
export type AASSymptomDuration = 'under_24h' | 'over_24h';

export interface AASParams {
    rlqPain?: boolean;              // +2
    painRelocation?: boolean;       // +2
    rlqTenderness?: boolean;        // Erkek ve >=50y kadın: +3 | 16-49y kadın: +1
    guardingPoints?: AASGuardingGrade; // Yok: 0, Hafif: 2, Orta/Şiddetli: 4
    gender?: 'male' | 'female' | string;
    ageYears?: number | null;
    symptomDuration?: AASSymptomDuration;
    // Laboratuvar (sayısal veya puan kademesi)
    wbcCount?: number | null;       // x10^9/L (<7.2: 0, 7.2-<10.9: 1, 10.9-<14.0: 2, >=14.0: 3)
    wbcPoints?: 0 | 1 | 2 | 3;
    neutrophilPercent?: number | null; // <62%: 0, 62-<75%: 2, 75-<83%: 3, >=83%: 4
    neutrophilPoints?: 0 | 2 | 3 | 4;
    crpMgL?: number | null;         // <24s ve >24s için ayrı puanlama!
    crpPoints?: 0 | 1 | 2 | 3 | 5;
}

export interface AASResult {
    score: number;
    maxScore: 23;
    clinicalPoints: number;
    labPoints: number;
    tendernessPointsAwarded: 0 | 1 | 3;
    crpPointsAwarded: number;
    symptomDuration: AASSymptomDuration;
    isReproductiveAgeFemale: boolean;
    isPediatricUnvalidated: boolean;
    risk: 'Düşük' | 'Orta' | 'Yüksek';
    riskLabel: string;
    isExtraHighSpecificity: boolean; // >=18 puan (%97.6 özgüllük, LR+ 11.5)
    alertClass: 'success' | 'warning' | 'danger';
    recommendation: string;
    crpDurationComparison: {
        under24hCrpPoints: number;
        over24hCrpPoints: number;
        explanation: string;
    };
    pediatricWarning?: string;
}

function computeAASCrpPoints(crpMgL: number | null | undefined, duration: AASSymptomDuration, fallbackPts?: number): number {
    if (crpMgL !== null && crpMgL !== undefined && Number.isFinite(crpMgL) && crpMgL >= 0) {
        if (duration === 'under_24h') {
            if (crpMgL < 4) return 0;
            if (crpMgL < 11) return 2;
            if (crpMgL < 25) return 3;
            if (crpMgL < 83) return 5;
            return 1; // >= 83 mg/L (<24s aşırı yüksek CRP'de alternatif tanı olasılığı nedeniyle 1 puan!)
        } else {
            if (crpMgL < 12) return 0;
            if (crpMgL < 53) return 2;
            if (crpMgL < 152) return 2;
            return 1; // >= 152 mg/L (>24s aşırı yüksek CRP'de 1 puan!)
        }
    }
    return fallbackPts !== undefined ? fallbackPts : 0;
}

export function calculateAAS(params: AASParams | null | undefined): AASResult | null {
    if (!params) return null;

    const isFemale = params.gender === 'female' || params.gender === 'F';
    const age = params.ageYears ?? null;
    const isPediatricUnvalidated = age !== null && age < 16;
    // 16-49 yaş kadın (yaş bilinmiyorsa ve kadın seçilmişse doğurganlık çağı varsayımı)
    const isReproductiveAgeFemale = isFemale && (age === null || (age >= 16 && age <= 49));

    let clinicalPoints = 0;
    if (params.rlqPain) clinicalPoints += 2;
    if (params.painRelocation) clinicalPoints += 2;

    let tendernessPointsAwarded: 0 | 1 | 3 = 0;
    if (params.rlqTenderness) {
        tendernessPointsAwarded = isReproductiveAgeFemale ? 1 : 3;
        clinicalPoints += tendernessPointsAwarded;
    }

    const guarding = params.guardingPoints !== undefined ? params.guardingPoints : 0;
    clinicalPoints += guarding;

    // WBC (x10^9/L)
    let wbcPts = 0;
    const wbcNorm = normalizeWbcToX10E9(params.wbcCount);
    if (wbcNorm !== null) {
        if (wbcNorm >= 14.0) wbcPts = 3;
        else if (wbcNorm >= 10.9) wbcPts = 2;
        else if (wbcNorm >= 7.2) wbcPts = 1;
        else wbcPts = 0;
    } else if (params.wbcPoints !== undefined) {
        wbcPts = params.wbcPoints;
    }

    // Neutrophil (%)
    let neutPts = 0;
    if (params.neutrophilPercent !== null && params.neutrophilPercent !== undefined && Number.isFinite(params.neutrophilPercent)) {
        if (params.neutrophilPercent >= 83) neutPts = 4;
        else if (params.neutrophilPercent >= 75) neutPts = 3;
        else if (params.neutrophilPercent >= 62) neutPts = 2;
        else neutPts = 0;
    } else if (params.neutrophilPoints !== undefined) {
        neutPts = params.neutrophilPoints;
    }

    const symptomDuration: AASSymptomDuration = params.symptomDuration || 'under_24h';
    const crpPointsAwarded = computeAASCrpPoints(params.crpMgL, symptomDuration, params.crpPoints);
    const under24hCrpPoints = computeAASCrpPoints(params.crpMgL, 'under_24h', params.crpPoints);
    const over24hCrpPoints = computeAASCrpPoints(params.crpMgL, 'over_24h', params.crpPoints);

    const labPoints = wbcPts + neutPts + crpPointsAwarded;
    const score = clinicalPoints + labPoints;

    let risk: 'Düşük' | 'Orta' | 'Yüksek' = 'Düşük';
    let riskLabel = '';
    let alertClass: 'success' | 'warning' | 'danger' = 'success';
    let recommendation = '';
    const isExtraHighSpecificity = score >= 18;

    if (score <= 10) {
        risk = 'Düşük';
        riskLabel = 'Düşük Olasılık (0–10 Puan)';
        alertClass = 'success';
        recommendation = 'WSES 2020 & Sammalkorpi 2014 (0–10p): Komplike apandisit riski yoktur; ek görüntüleme yapılmaksızın klinik izlem / güvenlik ağı ile taburculuk uygundur.';
    } else if (score <= 15) {
        risk = 'Orta';
        riskLabel = 'Orta Olasılık (11–15 Puan)';
        alertClass = 'warning';
        recommendation = 'WSES 2020 & Sammalkorpi 2014 (11–15p): Gri alan (bu grupta %46.9 apandisit saptanmıştır). Tanısal görüntüleme (USG / düşük doz BT / gebede MRG) endikedir.';
    } else {
        risk = 'Yüksek';
        riskLabel = isExtraHighSpecificity
            ? 'Ekstra Yüksek Olasılık (≥18 Puan — Özgüllük %97.6, LR+ 11.5)'
            : 'Yüksek Olasılık (≥16 Puan — Özgüllük %92.7)';
        alertClass = 'danger';
        if (age !== null && age >= 40) {
            recommendation = 'WSES 2020 Yüksek Risk (AAS ≥16) & Yaş ≥40: Apandisit olasılığı çok yüksek olmakla birlikte ≥40 yaş hastalarda malignite/divertikülit dışlaması için preoperatif BT önerilir.';
        } else {
            recommendation = 'WSES 2020 Yüksek Risk (AAS ≥16): Apandisitli hastaların %58\'i bu grupta doğrudan yakalanır (%92.7 özgüllük). <40 yaş erişkinlerde BT çekilmeksizin doğrudan laparoskopik apendektomiye gidilebilir.';
        }
    }

    const pediatricWarning = isPediatricUnvalidated
        ? `⚠️ Pediatrik Kısıtlılık (${age} Yaş < 16): Adult Appendicitis Score (AAS) yalnızca ≥16 yaş erişkinlerde türetilmiş ve valide edilmiştir. Çocuk hastalarda AIR Skoru veya Alvarado tercih edilmelidir.`
        : undefined;

    return {
        score,
        maxScore: 23,
        clinicalPoints,
        labPoints,
        tendernessPointsAwarded,
        crpPointsAwarded,
        symptomDuration,
        isReproductiveAgeFemale,
        isPediatricUnvalidated,
        risk,
        riskLabel,
        isExtraHighSpecificity,
        alertClass,
        recommendation,
        crpDurationComparison: {
            under24hCrpPoints,
            over24hCrpPoints,
            explanation: 'AAS sisteminde CRP <24s semptom süresinde 25–82.9 mg/L aralığında maksimum (+5p) ağırlık alırken, aşırı yüksek CRP değerlerinde (<24s ≥83 mg/L veya >24s ≥152 mg/L) alternatif inflamatuvar/jinekolojik patolojiler nedeniyle +1 puana düşer.'
        },
        pediatricWarning
    };
}

// ============================================================================
// 4. ÜÇLÜ APANDİSİT SİSTEM KARŞILAŞTIRMASI (ALVARADO vs AIR vs AAS)
// ============================================================================

export interface AppendicitisTriadComparisonParams {
    gender?: 'male' | 'female' | string;
    ageYears?: number | null;
    symptomDuration?: AASSymptomDuration;
    rlqPain?: boolean;
    painRelocationOrMigration?: boolean;
    anorexia?: boolean;
    nausea?: boolean;
    vomiting?: boolean;
    rlqTenderness?: boolean;
    reboundOrGuardingLevel?: 0 | 1 | 2 | 3; // 0: Yok, 1: Hafif, 2: Orta, 3: Şiddetli
    tempC?: number | null;
    wbcCount?: number | null;
    neutrophilPercent?: number | null;
    crpMgL?: number | null;
    alvaradoCutoffMode?: AlvaradoCutoffMode;
    airCutoffMode?: AIRCutoffMode;
}

export interface AppendicitisTriadComparisonResult {
    alvarado: AlvaradoResult;
    air: AIRScoreResult;
    aas: AASResult;
    preferredSystem: 'AAS' | 'AIR' | 'Alvarado';
    preferredReason: string;
    consensusSummary: string;
}

export function compareAppendicitisSystems(params: AppendicitisTriadComparisonParams): AppendicitisTriadComparisonResult {
    const guardLevel = params.reboundOrGuardingLevel ?? 0;
    const aasGuarding: AASGuardingGrade = guardLevel === 0 ? 0 : guardLevel === 1 ? 2 : 4;

    const alvarado = calculateAlvarado({
        migration: params.painRelocationOrMigration,
        anorexia: params.anorexia,
        nausea: Boolean(params.nausea || params.vomiting),
        rlqPain: Boolean(params.rlqTenderness ?? params.rlqPain),
        rebound: guardLevel >= 1,
        tempC: params.tempC,
        wbcCount: params.wbcCount,
        neutrophilPercent: params.neutrophilPercent,
        gender: params.gender,
        ageYears: params.ageYears,
        cutoffMode: params.alvaradoCutoffMode
    })!;

    const air = calculateAIRScore({
        vomiting: params.vomiting,
        rifPain: Boolean(params.rlqPain ?? params.rlqTenderness),
        reboundGrade: guardLevel as AIRReboundGrade,
        tempC: params.tempC,
        wbcCount: params.wbcCount,
        neutrophilPercent: params.neutrophilPercent,
        crpMgL: params.crpMgL,
        ageYears: params.ageYears,
        cutoffMode: params.airCutoffMode
    })!;

    const aas = calculateAAS({
        rlqPain: params.rlqPain,
        painRelocation: params.painRelocationOrMigration,
        rlqTenderness: Boolean(params.rlqTenderness ?? params.rlqPain),
        guardingPoints: aasGuarding,
        gender: params.gender,
        ageYears: params.ageYears,
        symptomDuration: params.symptomDuration,
        wbcCount: params.wbcCount,
        neutrophilPercent: params.neutrophilPercent,
        crpMgL: params.crpMgL
    })!;

    const isFemale = params.gender === 'female' || params.gender === 'F';
    const age = params.ageYears ?? null;

    let preferredSystem: 'AAS' | 'AIR' | 'Alvarado' = 'AIR';
    let preferredReason = '';

    if (age !== null && age < 16) {
        preferredSystem = 'AIR';
        preferredReason = 'Pediatrik hasta (<16 yaş): AAS çocuklarda valide edilmemiştir; AIR skoru çocuklarda komplike apandisiti öngörmede en yüksek doğruluğa (ROC AUC 0.92–0.93) sahiptir.';
    } else if (isFemale && (age === null || (age >= 16 && age <= 49))) {
        preferredSystem = 'AAS';
        preferredReason = 'Doğurganlık çağındaki kadın hasta (16–49 yaş): Alvarado yanlış pozitiflik üretir; AAS (ROC AUC 0.882) RLQ hassasiyet ağırlığını ayarlayarak negatif apendektomi oranını en aza indirir (WSES 2020 1. tercih).';
    } else if (params.crpMgL === null || params.crpMgL === undefined) {
        preferredSystem = 'Alvarado';
        preferredReason = 'Serum CRP düzeyi girilmediği için yalnız WBC ve klinik bulgularla çalışan Alvarado (dışlama duyarlılığı %99) referans alınmıştır; CRP eklendiğinde AIR ve AAS önerilir.';
    } else {
        preferredSystem = 'AAS';
        preferredReason = 'Erişkin hastada CRP, lökosit, nötrofil ve semptom süresi mevcut olduğunda AAS (AUC 0.882) ve AIR (AUC 0.83) Alvarado\'ya (AUC 0.790) üstündür.';
    }

    const consensusSummary = `Alvarado: ${alvarado.score}/10 (${alvarado.risk}) | AIR: ${air.score}/12 (${air.risk}) | AAS: ${aas.score}/23 (${aas.risk})`;

    return {
        alvarado,
        air,
        aas,
        preferredSystem,
        preferredReason,
        consensusSummary
    };
}
