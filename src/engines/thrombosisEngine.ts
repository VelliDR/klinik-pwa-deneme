/**
 * klinik-pwa - Thrombosis & Cardiovascular Emergency Engine
 */

export interface WellsDVTParams {
    activeCancer?: boolean;
    paralysisOrParesis?: boolean;
    bedriddenOrSurgery?: boolean;
    bedriddenRecently?: boolean;
    localizedTenderness?: boolean;
    entireLegSwollen?: boolean;
    calfSwelling?: boolean;
    calfSwellingGreaterThan3cm?: boolean;
    pittingEdema?: boolean;
    collateralVeins?: boolean;
    collateralSuperficialVeins?: boolean;
    previousDVT?: boolean;
    previouslyDocumentedDVT?: boolean;
    alternativeDiagnosisLikely?: boolean;
}

export interface WellsDVTResult {
    isValid: boolean;
    score: number;
    risk: string;
    riskCategory: string;
    probability: string;
    recommendation: string;
    recommendations: string[];
    alertClass: string;
}

export function calculateWellsDVT(params: WellsDVTParams = {}): WellsDVTResult {
    const activeCancer = Boolean(params.activeCancer);
    const paralysisOrParesis = Boolean(params.paralysisOrParesis);
    const bedriddenOrSurgery = Boolean(params.bedriddenOrSurgery || params.bedriddenRecently);
    const localizedTenderness = Boolean(params.localizedTenderness);
    const entireLegSwollen = Boolean(params.entireLegSwollen);
    const calfSwelling = Boolean(params.calfSwelling || params.calfSwellingGreaterThan3cm);
    const pittingEdema = Boolean(params.pittingEdema);
    const collateralVeins = Boolean(params.collateralVeins || params.collateralSuperficialVeins);
    const previousDVT = Boolean(params.previousDVT || params.previouslyDocumentedDVT);
    const alternativeDiagnosisLikely = Boolean(params.alternativeDiagnosisLikely);

    let score = 0;
    if (activeCancer) score += 1;
    if (paralysisOrParesis) score += 1;
    if (bedriddenOrSurgery) score += 1;
    if (localizedTenderness) score += 1;
    if (entireLegSwollen) score += 1;
    if (calfSwelling) score += 1;
    if (pittingEdema) score += 1;
    if (collateralVeins) score += 1;
    if (previousDVT) score += 1;
    if (alternativeDiagnosisLikely) score -= 2;

    let risk = '';
    let probability = '';
    let recommendation = '';
    let alertClass = 'text-emerald-400';

    if (score <= 0) {
        risk = 'Düşük Risk';
        probability = '~%5';
        recommendation = 'Yüksek duyarlıklı D-Dimer testi önerilir. D-Dimer negatif ise DVT güvenle dışlanır.';
        alertClass = 'text-emerald-400';
    } else if (score <= 2) {
        risk = 'Orta Risk';
        probability = '~%17';
        recommendation = 'D-Dimer veya Kompresyon Venöz Doppler USG önerilir. Pozitiflik halinde tedavi başlanmalıdır.';
        alertClass = 'text-amber-400';
    } else {
        risk = 'Yüksek Risk';
        probability = '~%53 - %70';
        recommendation = 'Acil Kompresyon Venöz Doppler USG endikedir. Gecikme öngörülüyorsa ampirik antikoagülasyon değerlendiriniz.';
        alertClass = 'text-rose-400';
    }

    return {
        isValid: true,
        score,
        risk,
        riskCategory: risk,
        probability,
        recommendation,
        recommendations: [recommendation],
        alertClass
    };
}

export interface WellsPTEParams {
    clinicalSignsDVT?: boolean;
    clinicalSignsOfDVT?: boolean;
    alternativeDiagnosisLessLikely?: boolean;
    peLikelyOrMoreLikelyThanAlt?: boolean;
    heartRateOver100?: boolean;
    immobilizationOrSurgery?: boolean;
    previousPEorDVT?: boolean;
    previousDvtOrPe?: boolean;
    hemoptysis?: boolean;
    malignancy?: boolean;
}

export interface WellsPTEResult {
    isValid: boolean;
    score: number;
    isPELikely: boolean;
    riskCategory: string;
    twoTierRisk: {
        risk: string;
        tier: string;
    };
    threeTierRisk: {
        risk: string;
        tier: string;
    };
    recommendation: string;
    recommendations: string[];
    alertClass: string;
}

export function calculateWellsPTE(params: WellsPTEParams = {}): WellsPTEResult {
    const clinicalSignsDVT = Boolean(params.clinicalSignsDVT || params.clinicalSignsOfDVT);
    const alternativeDiagnosisLessLikely = Boolean(params.alternativeDiagnosisLessLikely || params.peLikelyOrMoreLikelyThanAlt);
    const heartRateOver100 = Boolean(params.heartRateOver100);
    const immobilizationOrSurgery = Boolean(params.immobilizationOrSurgery);
    const previousPEorDVT = Boolean(params.previousPEorDVT || params.previousDvtOrPe);
    const hemoptysis = Boolean(params.hemoptysis);
    const malignancy = Boolean(params.malignancy);

    let score = 0;
    if (clinicalSignsDVT) score += 3.0;
    if (alternativeDiagnosisLessLikely) score += 3.0;
    if (heartRateOver100) score += 1.5;
    if (immobilizationOrSurgery) score += 1.5;
    if (previousPEorDVT) score += 1.5;
    if (hemoptysis) score += 1.0;
    if (malignancy) score += 1.0;

    const isPELikely = score > 4.0;
    const twoTierRisk = {
        risk: isPELikely ? 'PE Olası / Yüksek Risk' : 'PE Düşük / Olası Değil',
        tier: isPELikely ? 'PE Olası (~%40)' : 'PE Olası Değil (~%12)'
    };

    let threeTierRisk = { risk: '', tier: '' };
    let recommendation = '';
    let alertClass = 'text-emerald-400';

    if (score < 2.0) {
        threeTierRisk = { risk: 'Düşük Risk', tier: 'Düşük Risk (~%1.3 - %3.6)' };
        alertClass = 'text-emerald-400';
        recommendation = 'Öncelikle PERC kuralı ile dışlama deneyiniz. PERC pozitif ise yüksek duyarlıklı D-Dimer önerilir.';
    } else if (score <= 6.0) {
        threeTierRisk = { risk: 'Orta Risk', tier: 'Orta Risk (~%16 - %20)' };
        alertClass = 'text-amber-400';
        recommendation = 'Yüksek duyarlıklı D-Dimer veya Toraks BT Anjiyografi (BTPA) önerilir.';
    } else {
        threeTierRisk = { risk: 'Yüksek Risk', tier: 'Yüksek Risk (~%65)' };
        alertClass = 'text-rose-400';
        recommendation = 'Acil Toraks BT Anjiyografi (BTPA) endikedir. Kontrendike ise V/Q sintigrafisi; ampirik LMWH/UFH düşünülmelidir.';
    }

    return {
        isValid: true,
        score,
        isPELikely,
        riskCategory: twoTierRisk.risk,
        twoTierRisk,
        threeTierRisk,
        recommendation,
        recommendations: [recommendation],
        alertClass
    };
}

export interface PERCParams {
    ageGte50?: boolean;
    hrGte100?: boolean;
    heartRateGte100?: boolean;
    spo2Lt95?: boolean;
    spo2Lt95OnRoomAir?: boolean;
    unilateralLegSwelling?: boolean;
    hemoptysis?: boolean;
    recentSurgeryOrTrauma?: boolean;
    previousDVTPE?: boolean;
    priorDvtOrPe?: boolean;
    estrogenUse?: boolean;
    hormoneOrEstrogenUse?: boolean;
}

export interface PERCResult {
    isValid: boolean;
    isRuleOut: boolean;
    isPERCNegative: boolean;
    positiveCount: number;
    positiveCriteriaCount: number;
    positiveCriteria: string[];
    status: string;
    recommendation: string;
    recommendations: string[];
    alertClass: 'success' | 'warning';
}

export function evaluatePERC(params: PERCParams = {}): PERCResult {
    const ageGte50 = Boolean(params.ageGte50);
    const hrGte100 = Boolean(params.hrGte100 || params.heartRateGte100);
    const spo2Lt95 = Boolean(params.spo2Lt95 || params.spo2Lt95OnRoomAir);
    const unilateralLegSwelling = Boolean(params.unilateralLegSwelling);
    const hemoptysis = Boolean(params.hemoptysis);
    const recentSurgeryOrTrauma = Boolean(params.recentSurgeryOrTrauma);
    const previousDVTPE = Boolean(params.previousDVTPE || params.priorDvtOrPe);
    const estrogenUse = Boolean(params.estrogenUse || params.hormoneOrEstrogenUse);

    let positiveCount = 0;
    const positiveCriteria: string[] = [];

    if (ageGte50) { positiveCount++; positiveCriteria.push('Yaş ≥ 50'); }
    if (hrGte100) { positiveCount++; positiveCriteria.push('Kalp hızı ≥ 100/dk'); }
    if (spo2Lt95) { positiveCount++; positiveCriteria.push('Oda havasında SpO2 < %95'); }
    if (unilateralLegSwelling) { positiveCount++; positiveCriteria.push('Tek taraflı bacak ödemi/şişliği'); }
    if (hemoptysis) { positiveCount++; positiveCriteria.push('Hemoptizi'); }
    if (recentSurgeryOrTrauma) { positiveCount++; positiveCriteria.push('Son 4 haftada cerrahi veya travma'); }
    if (previousDVTPE) { positiveCount++; positiveCriteria.push('Geçirilmiş DVT veya PE öyküsü'); }
    if (estrogenUse) { positiveCount++; positiveCriteria.push('Östrojen kullanımı (OKS / HRT)'); }

    const isRuleOut = positiveCount === 0;

    return {
        isValid: true,
        isRuleOut,
        isPERCNegative: isRuleOut,
        positiveCount,
        positiveCriteriaCount: positiveCount,
        positiveCriteria,
        status: isRuleOut ? 'PERC KURALI NEGATİF (PE DIŞLANDI)' : 'PERC KURALI POZİTİF (DIŞLANAMAZ)',
        recommendation: isRuleOut
            ? '🟢 8 kriterin tümü negatiftir. PE riski <%1.8 olup D-Dimer kan testi veya Toraks BT Anjiyo gerekmez; PE güvenle dışlanmıştır.'
            : `⚠️ ${positiveCount} adet kriter pozitiftir. PERC kuralı ile PE dışlanamaz; D-Dimer ile ileri inceleme önerilir.`,
        recommendations: [
            isRuleOut
                ? '8 kriterin tümü negatiftir. PE riski <%1.8 olup D-Dimer kan testi veya Toraks BT Anjiyo gerekmez; PE güvenle dışlanmıştır.'
                : `${positiveCount} adet kriter pozitiftir. PERC kuralı ile PE dışlanamaz; D-Dimer ile ileri inceleme önerilir.`
        ],
        alertClass: isRuleOut ? 'success' : 'warning'
    };
}

export interface CHA2DS2VAScParams {
    chf?: boolean;
    congestiveHeartFailure?: boolean;
    hypertension?: boolean;
    age?: number;
    age75?: boolean;
    age75OrOlder?: boolean;
    age65to74?: boolean;
    age65?: boolean;
    diabetes?: boolean;
    diabetesMellitus?: boolean;
    strokeOrTIA?: boolean;
    priorStrokeOrTIA?: boolean;
    stroke?: boolean;
    vascularDisease?: boolean;
    isFemale?: boolean;
    femaleGender?: boolean;
    female?: boolean;
}

export interface CHA2DS2VAScResult {
    isValid: boolean;
    score: number;
    category: string;
    annualStrokeRiskPercent: number;
    strokeRiskPercent: string;
    anticoagulationRecommendation: string;
    recommendation: string;
    recommendations: string[];
    alertClass: string;
}

export function calculateCHA2DS2VASc(params: CHA2DS2VAScParams = {}): CHA2DS2VAScResult {
    const chf = Boolean(params.chf || params.congestiveHeartFailure);
    const hypertension = Boolean(params.hypertension);
    const age = Number(params.age || 0);
    const age75 = Boolean(params.age75 || params.age75OrOlder || age >= 75);
    const age65to74 = Boolean(params.age65to74 || (!age75 && (params.age65 || age >= 65)));
    const diabetes = Boolean(params.diabetes || params.diabetesMellitus);
    const strokeOrTIA = Boolean(params.strokeOrTIA || params.priorStrokeOrTIA || params.stroke);
    const vascularDisease = Boolean(params.vascularDisease);
    const isFemale = Boolean(params.isFemale || params.femaleGender || params.female);

    let score = 0;
    if (chf) score += 1;
    if (hypertension) score += 1;
    if (diabetes) score += 1;
    if (strokeOrTIA) score += 2;
    if (vascularDisease) score += 1;

    if (age75) score += 2;
    else if (age65to74) score += 1;

    if (isFemale) score += 1;

    const annualRiskMap: Record<number, number> = {
        0: 0.2,
        1: 0.6,
        2: 2.2,
        3: 3.2,
        4: 4.8,
        5: 7.2,
        6: 9.7,
        7: 11.2,
        8: 10.8,
        9: 12.2
    };

    const strokeRisk = annualRiskMap[Math.min(9, score)] || 12.2;

    const thresholdHigh = isFemale ? 3 : 2;
    const thresholdMod = isFemale ? 2 : 1;

    let recommendation = '';
    let category = '';
    let alertClass = 'text-emerald-400';

    if (score >= thresholdHigh) {
        category = 'Yüksek Tromboemboli Riski';
        recommendation = 'Oral Antikoagülan (DOAC: Apiksaban, Rivaroksaban, Edoksaban, Dabigatran veya Warfarin) KESİNLİKLE ÖNERİLİR (Sınıf I).';
        alertClass = 'text-rose-400';
    } else if (score >= thresholdMod) {
        category = 'Orta Tromboemboli Riski';
        recommendation = 'Oral Antikoagülan (DOAC) tedavisi DÜŞÜNÜLMELİDİR (Sınıf IIa). Kanama riskiyle birlikte değerlendiriniz.';
        alertClass = 'text-amber-400';
    } else {
        category = 'Düşük Tromboemboli Riski';
        recommendation = 'Antikoagülan veya Antiplatelet (Aspirin) tedavisi ÖNERİLMEZ. Yıllık inme riski ihmal edilebilir düzeydedir.';
        alertClass = 'text-emerald-400';
    }

    return {
        isValid: true,
        score,
        category,
        annualStrokeRiskPercent: strokeRisk,
        strokeRiskPercent: `%${strokeRisk} / yıl`,
        anticoagulationRecommendation: recommendation,
        recommendation,
        recommendations: [recommendation],
        alertClass
    };
}

export interface HASBLEDParams {
    hypertension?: boolean;
    hypertensionUncontrolled?: boolean;
    abnormalRenal?: boolean;
    abnormalRenalFunction?: boolean;
    renalDisease?: boolean;
    abnormalLiver?: boolean;
    abnormalLiverFunction?: boolean;
    liverDisease?: boolean;
    stroke?: boolean;
    priorStroke?: boolean;
    strokeHistory?: boolean;
    bleedingHistory?: boolean;
    bleedingHistoryOrPredisposition?: boolean;
    priorBleeding?: boolean;
    labileINR?: boolean;
    elderly?: boolean;
    elderlyOver65?: boolean;
    elderly65?: boolean;
    drugs?: boolean;
    drugsConcomitant?: boolean;
    drugsAntiplateletNSAID?: boolean;
    alcohol?: boolean;
    alcoholExcess?: boolean;
}

export interface HASBLEDResult {
    isValid: boolean;
    score: number;
    isHighRisk: boolean;
    riskCategory: string;
    bleedingRiskCategory: string;
    annualBleedingRate: string;
    recommendation: string;
    recommendations: string[];
    alertClass: 'danger' | 'success';
}

export function calculateHASBLED(params: HASBLEDParams = {}): HASBLEDResult {
    const hypertension = Boolean(params.hypertension || params.hypertensionUncontrolled);
    const abnormalRenal = Boolean(params.abnormalRenal || params.abnormalRenalFunction || params.renalDisease);
    const abnormalLiver = Boolean(params.abnormalLiver || params.abnormalLiverFunction || params.liverDisease);
    const stroke = Boolean(params.stroke || params.priorStroke || params.strokeHistory);
    const bleedingHistory = Boolean(params.bleedingHistory || params.bleedingHistoryOrPredisposition || params.priorBleeding);
    const labileINR = Boolean(params.labileINR);
    const elderly = Boolean(params.elderly || params.elderlyOver65 || params.elderly65);
    const drugs = Boolean(params.drugs || params.drugsConcomitant || params.drugsAntiplateletNSAID);
    const alcohol = Boolean(params.alcohol || params.alcoholExcess);

    let score = 0;
    if (hypertension) score += 1;
    if (abnormalRenal) score += 1;
    if (abnormalLiver) score += 1;
    if (stroke) score += 1;
    if (bleedingHistory) score += 1;
    if (labileINR) score += 1;
    if (elderly) score += 1;
    if (drugs) score += 1;
    if (alcohol) score += 1;

    const isHighRisk = score >= 3;
    const riskCategory = isHighRisk ? 'Yüksek Kanama Riski (HAS-BLED ≥ 3)' : 'Düşük / Orta Kanama Riski (HAS-BLED < 3)';
    const recommendation = isHighRisk
        ? 'Antikoagülan kontrendike DEĞİLDİR ancak değiştirilebilir risk faktörleri (KB regülasyonu, NSAİİ/Aspirin kesilmesi, alkol kısıtlaması, sıkı INR/böbrek takibi) optimize edilmelidir.'
        : 'Kanama riski düşük/orta düzeydedir. Standart antikoagülan güvenle uygulanabilir.';

    return {
        isValid: true,
        score,
        isHighRisk,
        riskCategory,
        bleedingRiskCategory: riskCategory,
        annualBleedingRate: isHighRisk ? '> %3.7 / yıl (Majör Kanama)' : '< %2.0 / yıl',
        recommendation,
        recommendations: [recommendation],
        alertClass: isHighRisk ? 'danger' : 'success'
    };
}

export interface HEARTParams {
    history?: number;
    historyPoints?: number;
    ecg?: number;
    ecgPoints?: number;
    age?: number;
    agePoints?: number;
    riskFactors?: number;
    riskFactorsPoints?: number;
    troponin?: number;
    troponinPoints?: number;
}

export interface HEARTResult {
    isValid: boolean;
    score: number;
    riskLevel: string;
    riskCategory: string;
    maceRate: string;
    maceRatePercent: number;
    recommendation: string;
    recommendations: string[];
    alertClass: string;
}

export function calculateHEART(params: HEARTParams = {}): HEARTResult {
    const history = Number(params.history ?? params.historyPoints ?? 0);
    const ecg = Number(params.ecg ?? params.ecgPoints ?? 0);
    const age = Number(params.age ?? params.agePoints ?? 50);
    const riskFactors = Number(params.riskFactors ?? params.riskFactorsPoints ?? 0);
    const troponin = Number(params.troponin ?? params.troponinPoints ?? 0);

    let ageScore = 0;
    if (params.agePoints !== undefined) {
        ageScore = Math.max(0, Math.min(2, params.agePoints));
    } else if (params.age !== undefined && age >= 0 && age <= 2) {
        ageScore = Math.round(age);
    } else {
        if (age >= 65) ageScore = 2;
        else if (age >= 45) ageScore = 1;
    }

    const totalScore = Math.max(0, Math.min(2, history)) +
                       Math.max(0, Math.min(2, ecg)) +
                       ageScore +
                       Math.max(0, Math.min(2, riskFactors)) +
                       Math.max(0, Math.min(2, troponin));

    let riskLevel = '';
    let maceRate = '';
    let macePercent = 1.7;
    let recommendation = '';
    let alertClass = 'text-emerald-400';

    if (totalScore <= 3) {
        riskLevel = 'Düşük Risk';
        macePercent = 1.7;
        maceRate = '%0.9 - %1.7 (6 haftalık MACE riski)';
        recommendation = 'Erken taburculuk güvenlidir. Poliklinik takibi ve elektif kardiyoloji kontrolü önerilir.';
        alertClass = 'text-emerald-400';
    } else if (totalScore <= 6) {
        riskLevel = 'Orta Risk';
        macePercent = 16.6;
        maceRate = '%12 - %16.6 (6 haftalık MACE riski)';
        recommendation = 'Klinik gözlem ünitesine yatış, 3-6. saatlerde seri yüksek duyarlıklı troponin ve non-invaziv iskemi testi önerilir.';
        alertClass = 'text-amber-400';
    } else {
        riskLevel = 'Yüksek Risk';
        macePercent = 65.0;
        maceRate = '%50 - %65 (6 haftalık MACE riski)';
        recommendation = 'Yüksek AKS riski. Acil kardiyoloji konsültasyonu, yatış ve erken koroner anjiyografi (KAG) endikedir.';
        alertClass = 'text-rose-400';
    }

    return {
        isValid: true,
        score: totalScore,
        riskLevel,
        riskCategory: riskLevel,
        maceRate,
        maceRatePercent: macePercent,
        recommendation,
        recommendations: [recommendation],
        alertClass
    };
}
