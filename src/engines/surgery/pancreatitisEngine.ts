// ============================================================================
// AKUT PANKREATİT MOTORU (Revize Atlanta 2012, Mod. Marshall, BISAP, mCTSI, Ranson)
// 1. Ranson Kriterleri (0. ve 48. Saat — Biliyer vs Non-Biliyer)
// 2. Revize Atlanta Sınıflandırması (2012/2013) ve Modifiye Marshall Organ Yetmezliği
// 3. BISAP Skoru (Wu et al., 2008 — İlk 24 Saat Mortalite Prediktörü)
// 4. Modifiye BT Şiddet İndeksi (mCTSI, Mortele 2004) vs Balthazar CTSI (1990) Karşılaştırması
// ============================================================================

export type RansonEtiology = 'biliary' | 'non_biliary';

export interface RansonParams {
    etiology?: RansonEtiology;
    ageO55?: boolean;
    wbcO16?: boolean;
    gluO200?: boolean;
    astO250?: boolean;
    ldhO350?: boolean;
    hctDrop10?: boolean;
    bunRise5?: boolean;
    caU8?: boolean;
    pO2U60?: boolean;
    baseDefO4?: boolean;
    fluidSecO6?: boolean;

    // Numerical / specific inputs
    ageYears?: number | null;
    wbcCount?: number | null;
    glucoseMgDl?: number | null;
    ldhUPerL?: number | null;
    bunRiseMgDl?: number | null;
    baseDeficitMEqL?: number | null;
    fluidSequestrationLiters?: number | null;
}

export interface RansonResult {
    score: number;
    maxScore: number;
    admissionScore: number;
    hour48Score: number;
    etiology: RansonEtiology;
    mortalityPercent: number;
    severity: 'Hafif' | 'Orta-Ağır' | 'Ağır' | 'Kritik';
    interpretation: string;
    earlyWarning?: string;
}

export function calculateRanson(params: RansonParams | null | undefined): RansonResult | null {
    if (!params) return null;
    const etiology: RansonEtiology = params.etiology || 'non_biliary';
    const isBiliary = etiology === 'biliary';
    let admissionScore = 0;
    let hour48Score = 0;

    // 1. Admission (0. Saat)
    if (Boolean(params.ageO55) || (params.ageYears !== undefined && params.ageYears !== null && Number.isFinite(params.ageYears) && params.ageYears > (isBiliary ? 70 : 55))) {
        admissionScore += 1;
    }
    const rawWbc = (params.wbcCount !== undefined && params.wbcCount !== null && Number.isFinite(params.wbcCount) && params.wbcCount > 0)
        ? (params.wbcCount < 200 ? params.wbcCount * 1000 : params.wbcCount)
        : null;
    if (Boolean(params.wbcO16) || (rawWbc !== null && rawWbc > (isBiliary ? 18000 : 16000))) {
        admissionScore += 1;
    }
    if (Boolean(params.gluO200) || (params.glucoseMgDl !== undefined && params.glucoseMgDl !== null && params.glucoseMgDl > (isBiliary ? 220 : 200))) {
        admissionScore += 1;
    }
    if (params.astO250) admissionScore += 1;
    if (Boolean(params.ldhO350) || (params.ldhUPerL !== undefined && params.ldhUPerL !== null && params.ldhUPerL > (isBiliary ? 400 : 350))) {
        admissionScore += 1;
    }

    // 2. 48 Hours (48. Saat)
    if (params.hctDrop10) hour48Score += 1;
    if (Boolean(params.bunRise5) || (params.bunRiseMgDl !== undefined && params.bunRiseMgDl !== null && params.bunRiseMgDl > (isBiliary ? 2 : 5))) {
        hour48Score += 1;
    }
    if (params.caU8) hour48Score += 1;
    if (!isBiliary && params.pO2U60) hour48Score += 1;
    if (Boolean(params.baseDefO4) || (params.baseDeficitMEqL !== undefined && params.baseDeficitMEqL !== null && params.baseDeficitMEqL > (isBiliary ? 5 : 4))) {
        hour48Score += 1;
    }
    if (Boolean(params.fluidSecO6) || (params.fluidSequestrationLiters !== undefined && params.fluidSequestrationLiters !== null && params.fluidSequestrationLiters > (isBiliary ? 4 : 6))) {
        hour48Score += 1;
    }

    const score = admissionScore + hour48Score;
    const maxScore = isBiliary ? 10 : 11;

    let interpretation = '';
    let mortalityPercent = 1;
    let severity: 'Hafif' | 'Orta-Ağır' | 'Ağır' | 'Kritik' = 'Hafif';
    if (score <= 2) {
        mortalityPercent = 1;
        severity = 'Hafif';
        interpretation = `Hafif Akut Pankreatit (${isBiliary ? 'Biliyer' : 'Non-Biliyer'}) — Mortalite riski ~%1`;
    } else if (score <= 4) {
        mortalityPercent = 15;
        severity = 'Orta-Ağır';
        interpretation = `Orta-Ağır Akut Pankreatit (${isBiliary ? 'Biliyer' : 'Non-Biliyer'}) — Mortalite riski ~%15 (Yakın izlem)`;
    } else if (score <= 6) {
        mortalityPercent = 40;
        severity = 'Ağır';
        interpretation = `Ağır Akut Pankreatit (${isBiliary ? 'Biliyer' : 'Non-Biliyer'}) — Mortalite riski ~%40 (YBÜ değerlendirmesi)`;
    } else {
        mortalityPercent = 100;
        severity = 'Kritik';
        interpretation = `Kritik Nekrotizan Pankreatit (${isBiliary ? 'Biliyer' : 'Non-Biliyer'}) — Mortalite riski >%90–100 (Acil YBÜ)`;
    }

    const earlyWarning = hour48Score === 0
        ? '⚠️ DİKKAT: Ranson skoru 48. saat tamamlanmadan kesinleştirilemez! Yalnızca başvuru (0. saat) bulgularına bakarak hafif pankreatit kararı vermek yanıltıcı olabilir. Nekroz ve sistemik komplikasyonlar ilk 48 saatte gelişebileceğinden hasta yakın takip edilmeli; erken evrede BISAP veya APACHE-II skoru ile monitörize edilmelidir.'
        : undefined;

    return {
        score,
        maxScore,
        admissionScore,
        hour48Score,
        etiology,
        mortalityPercent,
        severity,
        interpretation,
        earlyWarning
    };
}

// ============================================================================
// 2. REVİZE ATLANTA SINIFLANDIRMASI (2012/2013) & MODİFİYE MARSHALL SKORLAMASI
// ============================================================================

export type MarshallScoreValue = 0 | 1 | 2 | 3 | 4;
export type MarshallCreatinineBoundaryMode = 'conservative_lower' | 'strict_higher';
export type OrganFailureDuration = 'none' | 'transient_le_48h' | 'persistent_gt_48h';
export type PancreatitisMorphology = 'interstitial_edematous' | 'necrotizing';
export type CollectionTimeframe = 'le_4_weeks' | 'gt_4_weeks';

export interface AtlantaMarshallParams {
    // 1. Tanı Kriterleri (En az 2/3)
    typicalAbdominalPain?: boolean;
    amylaseOrLipase3xUln?: boolean;
    characteristicImaging?: boolean;

    // 2. Modifiye Marshall — Solunum
    pao2MmHg?: number | null;
    fio2PercentOrFraction?: number | null; // 21 veya 0.21
    supplementalO2LitersPerMin?: number | null; // Oda=0, 2L=0.25, 4L=0.30, 6-8L=0.40, 9-10L=0.50
    pao2Fio2RatioDirect?: number | null;
    respScoreDirect?: MarshallScoreValue;

    // 3. Modifiye Marshall — Renal (mg/dL veya µmol/L)
    creatinineMgDl?: number | null;
    creatinineUmolL?: number | null;
    creatinineBoundaryMode?: MarshallCreatinineBoundaryMode; // 3.6 mg/dL ve 134 µmol/L sınır çakışması modu
    hasBaselineCkd?: boolean;
    renalScoreDirect?: MarshallScoreValue;

    // 4. Modifiye Marshall — Kardiyovasküler
    systolicBpMmHg?: number | null;
    fluidResponsiveHypotension?: boolean;
    arterialPh?: number | null;
    cvScoreDirect?: MarshallScoreValue;

    // 5. Şiddet ve Morfoloji / Lokal Koleksiyonlar
    organFailureDuration?: OrganFailureDuration;
    hasLocalComplications?: boolean;
    hasSystemicComorbidityExacerbation?: boolean;
    morphology?: PancreatitisMorphology;
    collectionTimeframe?: CollectionTimeframe;
    hasFluidOrNecroticCollection?: boolean;
    isInfectedNecrosis?: boolean;
}

export interface AtlantaMarshallResult {
    isDiagnosisConfirmed: boolean;
    diagnosticCriteriaCount: number;
    respScore: MarshallScoreValue;
    renalScore: MarshallScoreValue;
    cvScore: MarshallScoreValue;
    calculatedPao2Fio2: number | null;
    estimatedFio2Fraction: number;
    hasOrganFailure: boolean;
    failedOrgans: string[];
    atlantaSeverity: 'Hafif Akut Pankreatit (Mild AP)' | 'Orta Şiddetli Akut Pankreatit (Moderately Severe AP)' | 'Şiddetli Akut Pankreatit (Severe AP)';
    collectionType: 'Koleksiyon Yok' | 'APFC (Akut Peripankreatik Sıvı Koleksiyonu)' | 'Pankreatik Psödokist (Pancreatic Pseudocyst)' | 'ANC (Akut Nekrotik Koleksiyon)' | 'WON (Walled-Off Necrosis)';
    collectionDescription: string;
    alertClass: 'success' | 'warning' | 'danger';
    managementRecommendation: string;
    creatinineBoundaryComparison?: {
        hasBoundaryOverlap: boolean;
        lowerScore: MarshallScoreValue;
        higherScore: MarshallScoreValue;
        note: string;
    };
    ckdWarning?: string;
}

function estimateFio2FromO2Flow(o2Lpm: number | null | undefined, explicitFio2: number | null | undefined): number {
    if (explicitFio2 !== null && explicitFio2 !== undefined && Number.isFinite(explicitFio2) && explicitFio2 > 0) {
        return explicitFio2 > 1 ? explicitFio2 / 100 : explicitFio2;
    }
    if (o2Lpm !== null && o2Lpm !== undefined && Number.isFinite(o2Lpm) && o2Lpm > 0) {
        if (o2Lpm <= 2) return 0.25;
        if (o2Lpm <= 4) return 0.30;
        if (o2Lpm <= 8) return 0.40;
        return 0.50;
    }
    return 0.21;
}

export function calculateAtlantaMarshall(params: AtlantaMarshallParams | null | undefined): AtlantaMarshallResult | null {
    if (!params) return null;

    const diagCount = (params.typicalAbdominalPain ? 1 : 0)
        + (params.amylaseOrLipase3xUln ? 1 : 0)
        + (params.characteristicImaging ? 1 : 0);
    const isDiagnosisConfirmed = diagCount >= 2;

    // 1. Solunum Skoru (PaO2 / FiO2)
    const fio2Fraction = estimateFio2FromO2Flow(params.supplementalO2LitersPerMin, params.fio2PercentOrFraction);
    let pfRatio: number | null = params.pao2Fio2RatioDirect ?? null;
    if (pfRatio === null && params.pao2MmHg !== null && params.pao2MmHg !== undefined && params.pao2MmHg > 0 && fio2Fraction > 0) {
        pfRatio = Math.round(params.pao2MmHg / fio2Fraction);
    }

    let respScore: MarshallScoreValue = params.respScoreDirect ?? 0;
    if (pfRatio !== null && pfRatio > 0) {
        if (pfRatio > 400) respScore = 0;
        else if (pfRatio >= 301) respScore = 1;
        else if (pfRatio >= 201) respScore = 2;
        else if (pfRatio >= 102) respScore = 3;
        else respScore = 4; // <= 101
    }

    // 2. Renal Skoru (Serum Kreatinin mg/dL veya µmol/L)
    const boundaryMode: MarshallCreatinineBoundaryMode = params.creatinineBoundaryMode || 'strict_higher';
    let renalScore: MarshallScoreValue = params.renalScoreDirect ?? 0;
    let creatinineBoundaryComparison: AtlantaMarshallResult['creatinineBoundaryComparison'] = undefined;

    if (params.creatinineMgDl !== null && params.creatinineMgDl !== undefined && Number.isFinite(params.creatinineMgDl) && params.creatinineMgDl > 0) {
        const cr = params.creatinineMgDl;
        // Banks 2013 tablosunda 3.6 mg/dL hem Skor 2 (1.9-3.6) hem Skor 3 (3.6-4.9) sütununda yer alır!
        const isOverlap36 = Math.abs(cr - 3.6) < 0.001;
        let lowerScore: MarshallScoreValue = 0;
        let higherScore: MarshallScoreValue = 0;

        if (cr < 1.4) {
            lowerScore = 0; higherScore = 0;
        } else if (cr <= 1.8) {
            lowerScore = 1; higherScore = 1;
        } else if (isOverlap36) {
            lowerScore = 2; higherScore = 3;
        } else if (cr < 3.6) {
            lowerScore = 2; higherScore = 2;
        } else if (cr <= 4.9) {
            lowerScore = 3; higherScore = 3;
        } else {
            lowerScore = 4; higherScore = 4;
        }

        renalScore = boundaryMode === 'strict_higher' ? higherScore : lowerScore;
        if (isOverlap36) {
            creatinineBoundaryComparison = {
                hasBoundaryOverlap: true,
                lowerScore: 2,
                higherScore: 3,
                note: 'Banks ve ark. (2013) Modifiye Marshall tablosunda 3.6 mg/dL sınır değeri hem Skor 2 (1.9–3.6) hem Skor 3 (3.6–4.9) sütununda basılmıştır; her iki durumda da Skor ≥2 olduğundan Organ Yetmezliği (+) kriteri karşılanmaktadır.'
            };
        }
    } else if (params.creatinineUmolL !== null && params.creatinineUmolL !== undefined && Number.isFinite(params.creatinineUmolL) && params.creatinineUmolL > 0) {
        const umol = params.creatinineUmolL;
        // Banks 2013 tablosunda 134 µmol/L hem Skor 0 (<=134) hem Skor 1 (134-169) sütununda yer alır!
        const isOverlap134 = Math.abs(umol - 134) < 0.5;
        let lowerScore: MarshallScoreValue = 0;
        let higherScore: MarshallScoreValue = 0;

        if (isOverlap134) {
            lowerScore = 0; higherScore = 1;
        } else if (umol < 134) {
            lowerScore = 0; higherScore = 0;
        } else if (umol <= 169) {
            lowerScore = 1; higherScore = 1;
        } else if (umol <= 310) {
            lowerScore = 2; higherScore = 2;
        } else if (umol <= 439) {
            lowerScore = 3; higherScore = 3;
        } else {
            lowerScore = 4; higherScore = 4;
        }

        renalScore = boundaryMode === 'strict_higher' ? higherScore : lowerScore;
        if (isOverlap134) {
            creatinineBoundaryComparison = {
                hasBoundaryOverlap: true,
                lowerScore: 0,
                higherScore: 1,
                note: 'Banks ve ark. (2013) tablosunda 134 µmol/L SI değeri hem Skor 0 (≤134) hem Skor 1 (134–169) sütununda yer almaktadır (her iki durumda da organ yetmezliği eşiği olan ≥2\'nin altındadır).'
            };
        }
    }

    // 3. Kardiyovasküler Skoru (Sistolik KB & pH)
    let cvScore: MarshallScoreValue = params.cvScoreDirect ?? 0;
    if (params.systolicBpMmHg !== null && params.systolicBpMmHg !== undefined && Number.isFinite(params.systolicBpMmHg) && params.systolicBpMmHg > 0) {
        if (params.systolicBpMmHg >= 90) {
            cvScore = 0;
        } else if (params.fluidResponsiveHypotension) {
            cvScore = 1;
        } else if (params.arterialPh !== null && params.arterialPh !== undefined && Number.isFinite(params.arterialPh) && params.arterialPh > 0 && params.arterialPh < 7.2) {
            cvScore = 4;
        } else if (params.arterialPh !== null && params.arterialPh !== undefined && Number.isFinite(params.arterialPh) && params.arterialPh > 0 && params.arterialPh < 7.3) {
            cvScore = 3;
        } else {
            cvScore = 2;
        }
    }

    const failedOrgans: string[] = [];
    if (respScore >= 2) failedOrgans.push(`Solunum (Skor ${respScore}${pfRatio ? `, PaO2/FiO2: ${pfRatio}` : ''})`);
    if (renalScore >= 2) failedOrgans.push(`Renal (Skor ${renalScore})`);
    if (cvScore >= 2) failedOrgans.push(`Kardiyovasküler (Skor ${cvScore})`);

    const hasOrganFailure = failedOrgans.length > 0;
    const duration: OrganFailureDuration = hasOrganFailure
        ? (params.organFailureDuration === 'none' || !params.organFailureDuration ? 'transient_le_48h' : params.organFailureDuration)
        : 'none';

    const hasLocal = Boolean(params.hasLocalComplications || params.hasFluidOrNecroticCollection || params.morphology === 'necrotizing');
    const hasSystemic = Boolean(params.hasSystemicComorbidityExacerbation);

    let atlantaSeverity: AtlantaMarshallResult['atlantaSeverity'] = 'Hafif Akut Pankreatit (Mild AP)';
    let alertClass: 'success' | 'warning' | 'danger' = 'success';
    let managementRecommendation = '';

    if (hasOrganFailure && duration === 'persistent_gt_48h') {
        atlantaSeverity = 'Şiddetli Akut Pankreatit (Severe AP)';
        alertClass = 'danger';
        managementRecommendation = `🛑 Şiddetli Akut Pankreatit (>48 Saat Kalıcı Organ Yetmezliği: ${failedOrgans.join(', ')}; Mortalite ≥%30–35): Doğrudan Yoğun Bakım Ünitesi (YBÜ) yatışı, hedefe yönelik sıvı resüsitasyonu, erken enteral nütrisyon ve organ desteği zorunludur.`;
    } else if ((hasOrganFailure && duration === 'transient_le_48h') || hasLocal || hasSystemic) {
        atlantaSeverity = 'Orta Şiddetli Akut Pankreatit (Moderately Severe AP)';
        alertClass = 'warning';
        managementRecommendation = '⚠️ Orta Şiddetli Akut Pankreatit (≤48 Saat Geçici Organ Yetmezliği ve/veya Lokal/Sistemik Komplikasyon): Yakın hemodinamik/organ fonksiyon takibi (24.s, 48.s ve 7. günde yeniden evreleme) ve lokal koleksiyon izlemi gereklidir.';
    } else {
        atlantaSeverity = 'Hafif Akut Pankreatit (Mild AP)';
        alertClass = 'success';
        managementRecommendation = 'Hafif Akut Pankreatit (Organ yetmezliği ve lokal/sistemik komplikasyon yok; Mortalite ~%1.5): Konservatif sıvı tedavisi ve erken oral beslenme; tanısal şüphe yoksa rutin erken BT çekilmesi önerilmez.';
    }

    // Lokal Koleksiyon Sınıflandırıcısı (Revize Atlanta 2012)
    let collectionType: AtlantaMarshallResult['collectionType'] = 'Koleksiyon Yok';
    let collectionDescription = 'Pankreatik veya peripankreatik sıvı/nekroz koleksiyonu belirtilmedi.';

    if (params.hasFluidOrNecroticCollection || params.hasLocalComplications || params.morphology === 'necrotizing') {
        const morph: PancreatitisMorphology = params.morphology || 'interstitial_edematous';
        const tf: CollectionTimeframe = params.collectionTimeframe || 'le_4_weeks';

        if (morph === 'interstitial_edematous' && tf === 'le_4_weeks') {
            collectionType = 'APFC (Akut Peripankreatik Sıvı Koleksiyonu)';
            collectionDescription = 'İnterstisyel ödematöz pankreatitte ilk 4 hafta içinde gelişen, homojen sıvı dansitesinde, nekrotik bileşeni ve kapsül duvarı olmayan koleksiyon. Çoğu spontan rezorbe olur; enfekte olmadıkça drenaj yapılmaz.';
        } else if (morph === 'interstitial_edematous' && tf === 'gt_4_weeks') {
            collectionType = 'Pankreatik Psödokist (Pancreatic Pseudocyst)';
            collectionDescription = 'İnterstisyel ödematöz pankreatitten >4 hafta sonra gelişen, iyi tanımlanmış duvarla tamamen enkapsüle, solid/nekrotik materyal içermeyen homojen sıvı koleksiyonu (yalnız semptomatik veya enfekte ise endoskopik transmural drenaj).';
        } else if (morph === 'necrotizing' && tf === 'le_4_weeks') {
            collectionType = 'ANC (Akut Nekrotik Koleksiyon)';
            collectionDescription = 'Nekrotizan pankreatitte ilk 4 hafta içinde gelişen, hem sıvı hem nekrotik (non-likit) doku içeren, henüz belirgin kapsül duvarı bulunmayan koleksiyon.';
        } else {
            collectionType = 'WON (Walled-Off Necrosis)';
            collectionDescription = 'Nekrotizan pankreatitten >4 hafta sonra olgunlaşan, sıvı ve nekrotik katı bileşenleri reaktif bir kapsül duvarıyla tamamen enkapsüle olmuş heterojen koleksiyon.';
        }

        if (params.isInfectedNecrosis) {
            collectionDescription += ' 🚨 ENFEKTE NEKROZ ("Step-Up" Yaklaşımı): Açık nekrozektomi yerine girişim mümkünse nekrozun duvarlandığı (WON, >4 hafta) döneme ertelenmeli ve ilk basamakta Perkütan veya Endoskopik Kateter Drenajı uygulanmalıdır (Primer kateter drenajında komplikasyon %42 vs primer açık nekrozektomide %64, p=0.003).';
        }
    }

    const ckdWarning = params.hasBaselineCkd
        ? '⚠️ Kronik Böbrek Hastalığı (KBY) Kısıtlılığı: Önceden bazal kreatinin ≥1.4 mg/dL (>134 µmol/L) olan KBY hastalarında Modifiye Marshall renal skoru için doğrulanmış resmi bir düzeltme formülü yoktur; bazal böbrek fonksiyonunun ek bozulma derecesi (KDIGO AKI kriterleri) dikkate alınmalıdır.'
        : undefined;

    return {
        isDiagnosisConfirmed,
        diagnosticCriteriaCount: diagCount,
        respScore,
        renalScore,
        cvScore,
        calculatedPao2Fio2: pfRatio,
        estimatedFio2Fraction: fio2Fraction,
        hasOrganFailure,
        failedOrgans,
        atlantaSeverity,
        collectionType,
        collectionDescription,
        alertClass,
        managementRecommendation,
        creatinineBoundaryComparison,
        ckdWarning
    };
}

// ============================================================================
// 3. BISAP SKORU (Bedside Index for Severity in Acute Pancreatitis — Wu 2008)
// ============================================================================

export interface BISAPParams {
    bunOver25?: boolean;
    bunMgDl?: number | null;
    impairedMentalStatus?: boolean; // GCS < 15 veya AVPU != 'A'
    sirsPresent?: boolean;          // >=2/4 SIRS kriteri
    // Veya 4 SIRS alt kriteri ayrı ayrı
    sirsHrOver90?: boolean;
    sirsTempAbnormal?: boolean;     // <36.0°C veya >38.0°C
    sirsRrOver20OrPaco2Under32?: boolean;
    sirsWbcAbnormal?: boolean;      // <4000 veya >12000 veya >%10 bant
    ageOver60?: boolean;
    ageYears?: number | null;
    pleuralEffusion?: boolean;
}

export interface BISAPResult {
    score: number;
    maxScore: 5;
    sirsCount: number;
    isSirsPositive: boolean;
    activeComponents: string[];
    riskCategory: 'Çok Düşük Risk' | 'Düşük Risk' | 'Orta Risk' | 'Yüksek Risk (≥3 Eşiği)' | 'Çok Yüksek Risk' | 'En Yüksek Risk Grubu';
    observedMortalityRange: string;
    isHighRiskCutoff: boolean; // >=3
    alertClass: 'success' | 'warning' | 'danger';
    recommendation: string;
}

export function calculateBISAP(params: BISAPParams | null | undefined): BISAPResult | null {
    if (!params) return null;

    const hasBun = Boolean(params.bunOver25) || (params.bunMgDl !== null && params.bunMgDl !== undefined && params.bunMgDl > 25);
    const hasMental = Boolean(params.impairedMentalStatus);
    const sirsCount = (params.sirsHrOver90 ? 1 : 0)
        + (params.sirsTempAbnormal ? 1 : 0)
        + (params.sirsRrOver20OrPaco2Under32 ? 1 : 0)
        + (params.sirsWbcAbnormal ? 1 : 0);
    const isSirsPositive = Boolean(params.sirsPresent) || sirsCount >= 2;
    const hasAge = Boolean(params.ageOver60) || (params.ageYears !== null && params.ageYears !== undefined && params.ageYears > 60);
    const hasPleural = Boolean(params.pleuralEffusion);

    const activeComponents: string[] = [];
    if (hasBun) activeComponents.push('BUN > 25 mg/dL (+1)');
    if (hasMental) activeComponents.push('Mental Durum Bozukluğu (+1)');
    if (isSirsPositive) activeComponents.push(`SIRS ≥2/4 Kriter (+1)`);
    if (hasAge) activeComponents.push('Yaş > 60 Yıl (+1)');
    if (hasPleural) activeComponents.push('Plevral Efüzyon (+1)');

    const score = activeComponents.length;
    const isHighRiskCutoff = score >= 3;

    const mortalityMap: Record<number, {
        cat: BISAPResult['riskCategory'];
        mort: string;
        alert: BISAPResult['alertClass'];
        rec: string;
    }> = {
        0: {
            cat: 'Çok Düşük Risk',
            mort: '<%1.0 (Kohort özeti: %0.1 – %0.2)',
            alert: 'success',
            rec: 'İlk 24 saat değerlendirmesinde mortalite riski çok düşüktür (<%1). Standart servis izlemi, erken oral beslenme ve konservatif sıvı tedavisi.'
        },
        1: {
            cat: 'Düşük Risk',
            mort: '<%1.0 (Kohort özeti: %0.5 – %0.7)',
            alert: 'success',
            rec: 'Düşük mortalite riski (<%1; 0–1 puan hastaların >%60\'ını oluşturur). Standart servis izlemi ve yakın vital/idrar çıkışı takibi.'
        },
        2: {
            cat: 'Orta Risk',
            mort: '~%2.0 (%1.9 – %2.1)',
            alert: 'warning',
            rec: 'Orta risk (~%2 mortalite). Dikkatli sıvı resüsitasyonu, saatlik idrar çıkışı ve seri BUN/Hct takibi; klinik kötüleşme açısından yakın gözlem.'
        },
        3: {
            cat: 'Yüksek Risk (≥3 Eşiği)',
            mort: '%5.3 – %8.3 (BISAP ≥3 grubunda %5 – >%20)',
            alert: 'danger',
            rec: '⚠️ YÜKSEK RİSK EŞİĞİ (BISAP ≥3): Kalıcı organ yetmezliği, pankreatik nekroz ve ölüm riski belirgin artmıştır! Agresif hedefe yönelik sıvı resüsitasyonu, yakın hemodinamik monitörizasyon ve yoğun bakım konsültasyonu önerilir.'
        },
        4: {
            cat: 'Çok Yüksek Risk',
            mort: '%12.7 – %19.3',
            alert: 'danger',
            rec: '🚨 ÇOK YÜKSEK RİSK (BISAP 4): Yoğun bakım ünitesi (YBÜ) triyajı, invaziv/yakın hemodinamik monitörizasyon ve çoklu organ desteği hazırlığı.'
        },
        5: {
            cat: 'En Yüksek Risk Grubu',
            mort: '>%20 (%22.5 – %26.7)',
            alert: 'danger',
            rec: '🛑 KRİTİK MORTALİTE RİSKİ (BISAP 5 — >%20–27): Doğrudan Yoğun Bakım Ünitesi (YBÜ) yatışı ve agresif resüsitasyon / çoklu organ desteği.'
        }
    };

    const meta = mortalityMap[score] || mortalityMap[5];

    return {
        score,
        maxScore: 5,
        sirsCount,
        isSirsPositive,
        activeComponents,
        riskCategory: meta.cat,
        observedMortalityRange: meta.mort,
        isHighRiskCutoff,
        alertClass: meta.alert,
        recommendation: meta.rec
    };
}

// ============================================================================
// 4. MODİFİYE BT ŞİDDET İNDEKSİ (mCTSI — Mortele 2004) & BALTHAZAR CTSI (1990)
// ============================================================================

export type MctsiInflammationPoints = 0 | 2 | 4;
export type MctsiNecrosisPoints = 0 | 2 | 4;
export type MctsiExtrapancreaticPoints = 0 | 2;
export type MctsiNecrosisCutoffMode = 'lte_30' | 'lt_30';
export type BalthazarGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ModifiedCTSIParams {
    // 1. Pankreatik İnflamasyon (0: Normal, 2: İntrensek/peripankreatik yağ, 4: Sıvı koleksiyonu veya peripankreatik yağ nekrozu)
    inflammationPoints?: MctsiInflammationPoints;
    balthazarGrade?: BalthazarGrade; // Balthazar 1990 karşılaştırması için opsiyonel (A=0, B=1, C=2, D=3, E=4)

    // 2. Pankreatik Parankimal Nekroz (0: Yok, 2: <=%30, 4: >%30)
    necrosisPoints?: MctsiNecrosisPoints;
    necrosisPercentNumeric?: number | null; // Tam %30 sınır karşılaştırması için opsiyonel
    necrosisCutoffMode?: MctsiNecrosisCutoffMode; // 'lte_30' (Mortele 2004 Orijinal: <=%30=2p) vs 'lt_30' (<%30=2p, >=%30=4p)

    // 3. Ekstrapankreatik Komplikasyonlar (Plevral efüzyon, asit, vasküler, parankimal veya GİS tutulumu: 0 veya 2)
    extrapancreaticPoints?: MctsiExtrapancreaticPoints;
    hasExtrapancreaticComplications?: boolean;

    // BT çekim zamanı (semptom başlangıcından itibaren saat)
    hoursSinceSymptomOnset?: number | null;
}

export interface ModifiedCTSIResult {
    score: number; // Yalnızca çift sayılar: 0, 2, 4, 6, 8, 10
    maxScore: 10;
    inflammationPoints: MctsiInflammationPoints;
    necrosisPoints: MctsiNecrosisPoints;
    extrapancreaticPoints: MctsiExtrapancreaticPoints;
    severity: 'Hafif (Mild — 0–2 Puan)' | 'Orta (Moderate — 4–6 Puan)' | 'Şiddetli (Severe — 8–10 Puan)';
    expectedLengthOfStayNote: string;
    alertClass: 'success' | 'warning' | 'danger';
    recommendation: string;
    earlyCtTimingWarning?: string;
    balthazar1990Comparison: {
        originalCtsiScore: number;
        originalCtsiSeverity: 'Hafif (0–3)' | 'Orta (4–6)' | 'Şiddetli (7–10)';
        necrosisBoundary30Note?: string;
    };
}

export function calculateModifiedCTSI(params: ModifiedCTSIParams | null | undefined): ModifiedCTSIResult | null {
    if (!params) return null;

    const cutoffMode: MctsiNecrosisCutoffMode = params.necrosisCutoffMode || 'lte_30';

    // 1. İnflamasyon puanı (mCTSI: 0, 2, 4 | Balthazar 1990: A=0, B=1, C=2, D=3, E=4)
    let inflamPts: MctsiInflammationPoints = params.inflammationPoints ?? 0;
    let balthazarPts = 0;
    if (params.balthazarGrade) {
        const bMap: Record<BalthazarGrade, { orig: number; mctsi: MctsiInflammationPoints }> = {
            'A': { orig: 0, mctsi: 0 },
            'B': { orig: 1, mctsi: 2 },
            'C': { orig: 2, mctsi: 2 },
            'D': { orig: 3, mctsi: 4 },
            'E': { orig: 4, mctsi: 4 }
        };
        const bEntry = bMap[params.balthazarGrade];
        if (bEntry) {
            balthazarPts = bEntry.orig;
            if (params.inflammationPoints === undefined) {
                inflamPts = bEntry.mctsi;
            }
        }
    } else {
        balthazarPts = inflamPts === 0 ? 0 : inflamPts === 2 ? 2 : 4;
    }

    // 2. Nekroz puanı
    let necrosisPts: MctsiNecrosisPoints = params.necrosisPoints ?? 0;
    let origBalthazarNecrosisPts = 0;
    let necrosisBoundary30Note: string | undefined = undefined;

    if (params.necrosisPercentNumeric !== null && params.necrosisPercentNumeric !== undefined && Number.isFinite(params.necrosisPercentNumeric) && params.necrosisPercentNumeric >= 0) {
        const pct = params.necrosisPercentNumeric;
        if (pct === 0) {
            necrosisPts = 0;
            origBalthazarNecrosisPts = 0;
        } else if (pct === 30) {
            necrosisPts = cutoffMode === 'lte_30' ? 2 : 4;
            origBalthazarNecrosisPts = 4; // Orijinal Balthazar'da %30-50 = 4 puan
            necrosisBoundary30Note = 'Tam %30 Nekroz Sınır Karşılaştırması: Mortele 2004 orijinal mCTSI makalesinde ≤%30 nekroz 2 puan (>%30: 4p) iken, bazı ikincil kaynaklarda <%30 nekroz 2 puan (≥%30: 4p) olarak geçmektedir.';
        } else if (pct < 30) {
            necrosisPts = 2;
            origBalthazarNecrosisPts = 2;
        } else if (pct <= 50) {
            necrosisPts = 4;
            origBalthazarNecrosisPts = 4;
        } else {
            necrosisPts = 4;
            origBalthazarNecrosisPts = 6; // Orijinal Balthazar'da >%50 = 6 puan
        }
    } else {
        origBalthazarNecrosisPts = necrosisPts === 0 ? 0 : necrosisPts === 2 ? 2 : 4;
    }

    // 3. Ekstrapankreatik komplikasyon puanı (mCTSI'da +2, orijinal Balthazar'da 0)
    const extrapancreaticPts: MctsiExtrapancreaticPoints =
        params.extrapancreaticPoints !== undefined
            ? params.extrapancreaticPoints
            : (params.hasExtrapancreaticComplications ? 2 : 0);

    const score = inflamPts + necrosisPts + extrapancreaticPts;
    const originalCtsiScore = balthazarPts + origBalthazarNecrosisPts;
    const originalCtsiSeverity: 'Hafif (0–3)' | 'Orta (4–6)' | 'Şiddetli (7–10)' =
        originalCtsiScore <= 3 ? 'Hafif (0–3)' : originalCtsiScore <= 6 ? 'Orta (4–6)' : 'Şiddetli (7–10)';

    let severity: ModifiedCTSIResult['severity'] = 'Hafif (Mild — 0–2 Puan)';
    let expectedLengthOfStayNote = 'Ortalama yatış süresi ~1.5 gün; girişimsel müdahale veya organ yetmezliği beklenmez.';
    let alertClass: 'success' | 'warning' | 'danger' = 'success';
    let recommendation = 'mCTSI 0–2 (Hafif): Konservatif izlem ve erken enteral/oral beslenme; ek radyolojik/cerrahi girişim gerekmez.';

    if (score >= 8) {
        severity = 'Şiddetli (Severe — 8–10 Puan)';
        expectedLengthOfStayNote = 'Ortalama yatış süresi ~14.2 gün; organ yetmezliği, pankreatik enfeksiyon ve perkütan/endoskopik/cerrahi girişim gereksinimi anlamlı olarak yüksektir.';
        alertClass = 'danger';
        recommendation = `🚨 mCTSI ${score}/10 (Şiddetli — İnflamasyon: ${inflamPts}p, Nekroz: ${necrosisPts}p, Ekstrapankreatik: ${extrapancreaticPts}p): Enfekte nekroz, koleksiyon maturasyonu (WON) ve organ yetmezliği açısından yakın multidisipliner (YBÜ / Girişimsel Radyoloji / Gastroenteroloji / Cerrahi) takip gereklidir.`;
    } else if (score >= 4) {
        severity = 'Orta (Moderate — 4–6 Puan)';
        expectedLengthOfStayNote = 'Ortalama yatış süresi ~6.9 gün; lokal komplikasyon ve klinik seyir takibi gerektirir.';
        alertClass = 'warning';
        recommendation = `⚠️ mCTSI ${score}/10 (Orta — İnflamasyon: ${inflamPts}p, Nekroz: ${necrosisPts}p, Ekstrapankreatik: ${extrapancreaticPts}p): Yakın klinik, nütrisyonel ve lokal komplikasyon izlemi önerilir.`;
    }

    const earlyCtTimingWarning =
        params.hoursSinceSymptomOnset !== null && params.hoursSinceSymptomOnset !== undefined && params.hoursSinceSymptomOnset > 0 && params.hoursSinceSymptomOnset < 48
            ? `⚠️ ERKEN BT ÇEKİM UYARISI (${params.hoursSinceSymptomOnset}. Saat < 48–72 Saat): Akut pankreatitte parankimal nekroz ilk 24–48 saatte BT'de tam olarak demarke olmaz! Erken çekilen BT nekroz oranını olduğundan düşük gösterebilir; mCTSI evrelemesi için ideal BT zamanı semptom başlangıcından ≥48–72 saat sonrasıdır.`
            : undefined;

    return {
        score,
        maxScore: 10,
        inflammationPoints: inflamPts,
        necrosisPoints: necrosisPts,
        extrapancreaticPoints: extrapancreaticPts,
        severity,
        expectedLengthOfStayNote,
        alertClass,
        recommendation,
        earlyCtTimingWarning,
        balthazar1990Comparison: {
            originalCtsiScore,
            originalCtsiSeverity,
            necrosisBoundary30Note
        }
    };
}
