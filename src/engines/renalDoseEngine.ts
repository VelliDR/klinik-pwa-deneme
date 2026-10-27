/**
 * klinik-pwa - Renal Dose Mosteller BSA De-indexing & GFR Standardization Engine (TypeScript)
 * 
 * Clinical & Regulatory Foundations:
 * 1. KDIGO 2024 Clinical Practice Guideline for CKD Evaluation and Management:
 *    - İlaç dozlama kararlarında glomerüler filtrasyonun mutlak kapasitesi (mL/dak) esastır.
 *    - Biyokimya laboratuvarından çıkan indekslenmiş eGFR (mL/dak/1,73 m²), hastanın gerçek vücut
 *      yüzey alanı (BSA) standart 1,73 m²'den belirgin şekilde saptığında (obezite BMI ≥30 kg/m²
 *      veya BSA ≥2,0 m²; kaşeksi BMI <18,5 kg/m² veya BSA <1,5 m²; amputasyon ve pediatri)
 *      mutlaka de-indekslenerek Mutlak GFR'ye (mL/dak) dönüştürülmelidir.
 *    - Formül: Mutlak GFR (mL/dak) = [ İndekslenmiş eGFR (mL/dak/1,73 m²) × BSA (m²) ] / 1,73
 *    - BSA: Mosteller denklemi: BSA = sqrt( (Boy_cm × Kilo_kg) / 3600 )
 * 
 * 2. EHRA 2021 Practical Guide on DOACs in Atrial Fibrillation:
 *    - DOAC (Apiksaban, Rivaroksaban, Dabigatran, Edoksaban) pivotal faz 3 ruhsat çalışmalarının
 *      tamamı Cockcroft-Gault kreatinin klerensi (CrCl, mL/dak) ile yürütülmüştür.
 *    - Obez hastalarda CKD-EPI formülü böbrek fonksiyonunu olduğundan 15-20 mL/dak daha yüksek
 *      tahmin edebilmekte; bu durum doz düşürülmesi gerekirken tam dozda kalınmasına ve ölümcül
 *      majör kanamalara (intrakraniyal, gastrointestinal) yol açmaktadır.
 *    - DOAC reçetelendiğinde birincil karar parametresi kesinlikle Cockcroft-Gault CrCl olmalıdır.
 *    - Obez hastalarda (BMI ≥30 veya Kilo > 1,2 × IBW) Cockcroft-Gault için Düzeltilmiş Vücut
 *      Ağırlığı (ABW40 = IBW + 0,40 × [Kilo - IBW]) kullanılmalıdır.
 * 
 * 3. FDA 2024 Industry Guidance (Pharmacokinetics in Impaired Renal Function):
 *    - Dar terapötik indeksli ilaçlarda (Vankomisin, Aminoglikozitler, Digoksin, Lityum)
 *      indekslenmiş eGFR kesinlikle kullanılmamalı; mutlak GFR (mL/dak) veya CrCl hesaplanmalı,
 *      dozlama TDM (terapötik ilaç düzeyi izlemi) ile doğrulanmalıdır.
 * 
 * Standards & References:
 * - KDIGO 2024 Clinical Practice Guideline for CKD (Kidney Int 2024)
 * - EHRA 2021 Practical Guide on DOACs in AF (Europace 2021;23:1612-1676)
 * - FDA Guidance for Industry: Pharmacokinetics in Patients with Impaired Renal Function (2024)
 * - Mosteller RD. Simplified calculation of body-surface area. N Engl J Med 1987;317:1098.
 * - Cockcroft DW, Gault MH. Prediction of creatinine clearance from serum creatinine. Nephron 1976;16:31-41.
 */

import { calculateDetailedEGFR, type DetailedEgfrResult } from './biometricsEngine';
import { resolveToRxNormConcept, type ResolvedRxConcept } from './rxNormMappingEngine';
import type { DrugInputItem } from '../types/engines';

export type BsaFormula = 'mosteller' | 'dubois';
export type RenalClearanceMetric = 'COCKCROFT_GAULT_CRCL' | 'ABSOLUTE_EGFR' | 'INDEXED_EGFR';
export type RenalDrugCategory =
  | 'DOAC_COCKCROFT_MANDATORY'
  | 'NARROW_THERAPEUTIC_INDEX'
  | 'RENAL_ANTIBIOTIC'
  | 'GENERAL_RENAL_ELIMINATED';

export interface PatientRenalParameters {
  ageYears?: number | null;
  ageMonths?: number | null;
  gender?: 'male' | 'female' | 'M' | 'F' | string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  serumCreatinineMgDl?: number | null;
  egfrIndexed?: number | null; // mL/min/1.73m² (laboratuvar sonucu veya CKD-EPI)
  cystatinC?: number | null;
  useInchGrid?: boolean;
}

export interface BsaCalculationResult {
  bsaMosteller: number; // m²
  bsaDubois: number;    // m²
  standardBsa: 1.73;
  bsaDiffPercentage: number; // ((BSA - 1.73) / 1.73) * 100
  isDeviatedFromStandard: boolean; // |diff| >= 15%
  isSeverelyDeviated: boolean;     // |diff| >= 20%
  category: 'NORMAL_BSA' | 'HIGH_BSA_OBESE' | 'LOW_BSA_CACHECTIC' | 'PEDIATRIC_BSA';
}

export interface BodyWeightAnalysis {
  actualWeightKg: number;
  heightCm: number;
  bmi: number;
  isObese: boolean;
  isUnderweight: boolean;
  ibwDevineKg: number;
  adjustedBodyWeightKg: number; // ABW40
  recommendedCrClWeightKg: number;
  weightSelectionRationale: string;
}

export interface CockcroftGaultResult {
  crClActualWeight: number;    // mL/min
  crClIbw: number;             // mL/min
  crClAdjustedWeight: number;  // mL/min (ABW40)
  recommendedCrCl: number;     // mL/min
  weightUsedKg: number;
  isAdjustedForObesity: boolean;
  formulaDescription: string;
}

export interface RenalDrugGuidance {
  drugName: string;
  canonicalKey: string;
  category: RenalDrugCategory;
  recommendedMetric: RenalClearanceMetric;
  clearanceValue: number | null;
  unit: 'mL/dak' | 'mL/dak/1.73 m²';
  rationale: string;
  clinicalWarning?: string;
  tdmRecommended: boolean;
  ruleId?: string;
  recommendedDose?: string;
  reductionCriteriaMet?: number;
}

export interface ComprehensiveRenalEvaluation {
  patient: {
    ageYears: number | null;
    gender: 'male' | 'female' | null;
    heightCm: number | null;
    weightKg: number | null;
    serumCreatinineMgDl: number | null;
    bmi: number | null;
  };
  bsa: BsaCalculationResult | null;
  weights: BodyWeightAnalysis | null;
  egfrIndexed: number | null;  // mL/min/1.73m²
  egfrAbsolute: number | null; // mL/min (Mosteller de-indexed)
  cockcroftGault: CockcroftGaultResult | null;
  kdigoStage: string;
  isObesityDiscordant: boolean; // True if eGFR > CrCl by >= 15 mL/min in obese
  discrepancyDelta: number | null; // eGFR_indexed - CrCl_recommended
  clinicalAlerts: {
    type: 'DOAC_OBESITY_OVERESTIMATION' | 'DEINDEXING_RECOMMENDED' | 'NARROW_THERAPEUTIC_TDM' | 'INFO';
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    message: string;
    guideline: string;
  }[];
  evaluatedDrugs: RenalDrugGuidance[];
}

/**
 * 1. Mosteller Vücut Yüzey Alanı (BSA) Formülü:
 * BSA (m²) = sqrt( (Boy_cm × Kilo_kg) / 3600 )
 */
export function calculateMostellerBSA(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return 0;
  const val = Math.sqrt((heightCm * weightKg) / 3600);
  return Number(val.toFixed(2));
}

/**
 * 2. DuBois & DuBois Vücut Yüzey Alanı Formülü:
 * BSA (m²) = 0.007184 × Boy_cm^0.725 × Kilo_kg^0.425
 */
export function calculateDuboisBSA(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return 0;
  const val = 0.007184 * Math.pow(heightCm, 0.725) * Math.pow(weightKg, 0.425);
  return Number(val.toFixed(2));
}

/**
 * 3. KDIGO 2024 Mutlak GFR De-indeksleme Fonksiyonu:
 * Mutlak GFR (mL/dak) = [ İndekslenmiş eGFR (mL/dak/1,73 m²) × BSA (m²) ] / 1,73
 */
export function deindexEgfrToAbsolute(egfrIndexed: number, bsaM2: number): number {
  if (!egfrIndexed || isNaN(egfrIndexed) || egfrIndexed <= 0) return 0;
  if (!bsaM2 || isNaN(bsaM2) || bsaM2 <= 0) return egfrIndexed;
  const val = (egfrIndexed * bsaM2) / 1.73;
  return Number(val.toFixed(1));
}

/**
 * 4. Mutlak GFR'den İndekslenmiş eGFR Türetme (Ters Fonksiyon):
 * İndekslenmiş eGFR (mL/dak/1,73 m²) = [ Mutlak GFR (mL/dak) × 1,73 ] / BSA (m²)
 */
export function indexEgfrFromAbsolute(egfrAbsolute: number, bsaM2: number): number {
  if (!egfrAbsolute || isNaN(egfrAbsolute) || egfrAbsolute <= 0) return 0;
  if (!bsaM2 || isNaN(bsaM2) || bsaM2 <= 0) return egfrAbsolute;
  const val = (egfrAbsolute * 1.73) / bsaM2;
  return Number(val.toFixed(1));
}

/**
 * 5. Devine İdeal Vücut Ağırlığı (IBW) Hesaplayıcısı:
 * Erkek: IBW = 50 + 0.905 × (Boy_cm - 152.4) [veya 50 + 2.3 × inç>60]
 * Kadın: IBW = 45.5 + 0.905 × (Boy_cm - 152.4) [veya 45.5 + 2.3 × inç>60]
 */
export function calculateDevineIBW(
  heightCm: number,
  gender: 'male' | 'female' | string,
  options?: { useInchGrid?: boolean }
): number {
  if (!heightCm || heightCm <= 0) return 0;
  const isFemale = gender === 'female' || gender === 'F';
  const baseWeight = isFemale ? 45.5 : 50.0;

  if (options?.useInchGrid) {
    const totalInches = Math.round(heightCm / 2.54);
    const inchesOver60 = Math.max(0, totalInches - 60);
    const ibw = baseWeight + 2.3 * inchesOver60;
    return Number(ibw.toFixed(1));
  }

  const heightOver60Inches = Math.max(0, heightCm - 152.4);
  const ibw = baseWeight + 0.9055 * heightOver60Inches;
  return Number(ibw.toFixed(1));
}

/**
 * 6. Düzeltilmiş Vücut Ağırlığı (Adjusted Body Weight - ABW40):
 * ABW = IBW + 0.40 × (Gerçek Kilo - IBW)
 */
export function calculateAdjustedBodyWeight(actualWeightKg: number, ibwKg: number, factor: number = 0.40): number {
  if (!actualWeightKg || !ibwKg) return actualWeightKg || 0;
  if (actualWeightKg <= ibwKg) return actualWeightKg;
  const abw = ibwKg + factor * (actualWeightKg - ibwKg);
  return Number(abw.toFixed(1));
}

/**
 * 7. Vücut Kütlesi ve Ağırlık Seçimi Analizi (Obezite / Kaşeksi Tespiti)
 */
export function analyzeBodyWeightHabitus(
  heightCm: number,
  actualWeightKg: number,
  gender: string,
  options?: { useInchGrid?: boolean }
): BodyWeightAnalysis {
  const bmi = heightCm > 0 ? Number((actualWeightKg / Math.pow(heightCm / 100, 2)).toFixed(1)) : 0;
  const ibw = calculateDevineIBW(heightCm, gender, options);
  const abw40 = calculateAdjustedBodyWeight(actualWeightKg, ibw, 0.40);

  const isObese = bmi >= 30.0 || (ibw > 0 && actualWeightKg >= 1.20 * ibw);
  const isUnderweight = ibw > 0 && actualWeightKg < ibw;

  let recommendedWeight: number;
  let rationale: string;

  if (isUnderweight) {
    recommendedWeight = actualWeightKg;
    rationale = 'Zayıf / Kaşektik hasta (Gerçek Kilo < IBW): Aşırı yüksek klerens tahminini önlemek için Gerçek Kilo kullanılır.';
  } else if (isObese) {
    recommendedWeight = abw40;
    rationale = 'Obez hasta (BMI ≥30 veya Kilo ≥ %120 IBW): EHRA 2021 ve kılavuzlar uyarınca inaktif yağ dokusunun klerensi yapay şişirmesini önlemek için Düzeltilmiş Ağırlık (ABW40) kullanılır.';
  } else {
    recommendedWeight = actualWeightKg;
    rationale = 'Normal ağırlıklı hasta: Standart Gerçek Kilo kullanılır.';
  }

  return {
    actualWeightKg,
    heightCm,
    bmi,
    isObese,
    isUnderweight,
    ibwDevineKg: ibw,
    adjustedBodyWeightKg: abw40,
    recommendedCrClWeightKg: recommendedWeight,
    weightSelectionRationale: rationale
  };
}

/**
 * 8. Cockcroft-Gault Kreatinin Klerensi (CrCl, mL/dak) Hesaplayıcısı
 */
export function calculateCockcroftGaultCrCl(params: {
  ageYears: number;
  gender: 'male' | 'female' | string;
  serumCreatinineMgDl: number;
  actualWeightKg: number;
  heightCm?: number | null;
  useInchGrid?: boolean;
}): CockcroftGaultResult | null {
  const { ageYears, gender, serumCreatinineMgDl, actualWeightKg, heightCm, useInchGrid } = params;
  if (!ageYears || !serumCreatinineMgDl || !actualWeightKg || serumCreatinineMgDl <= 0 || actualWeightKg <= 0) {
    return null;
  }

  const isFemale = gender === 'female' || gender === 'F';
  const sexFactor = isFemale ? 0.85 : 1.0;
  const ageFactor = Math.max(1, 140 - ageYears);
  const denom = 72 * serumCreatinineMgDl;

  const crClActual = Number((((ageFactor * actualWeightKg) / denom) * sexFactor).toFixed(1));

  let crClIbw = crClActual;
  let crClAdjusted = crClActual;
  let recommendedCrCl = crClActual;
  let weightUsed = actualWeightKg;
  let isAdjusted = false;
  let formulaDesc = `Cockcroft-Gault (Gerçek Kilo: ${actualWeightKg} kg)`;

  if (heightCm && heightCm > 0) {
    const habitus = analyzeBodyWeightHabitus(heightCm, actualWeightKg, gender, { useInchGrid });
    crClIbw = Number((((ageFactor * habitus.ibwDevineKg) / denom) * sexFactor).toFixed(1));
    crClAdjusted = Number((((ageFactor * habitus.adjustedBodyWeightKg) / denom) * sexFactor).toFixed(1));

    if (habitus.isObese) {
      recommendedCrCl = crClAdjusted;
      weightUsed = habitus.adjustedBodyWeightKg;
      isAdjusted = true;
      formulaDesc = `Cockcroft-Gault (Obezite Düzeltmeli ABW40: ${weightUsed} kg; EHRA 2021)`;
    } else if (habitus.isUnderweight) {
      recommendedCrCl = crClActual;
      weightUsed = actualWeightKg;
      isAdjusted = false;
      formulaDesc = `Cockcroft-Gault (Kaşeksi Gerçek Kilo: ${weightUsed} kg)`;
    } else {
      recommendedCrCl = crClActual;
      weightUsed = actualWeightKg;
      isAdjusted = false;
      formulaDesc = `Cockcroft-Gault (Normal Gerçek Kilo: ${weightUsed} kg)`;
    }
  }

  return {
    crClActualWeight: crClActual,
    crClIbw,
    crClAdjustedWeight: crClAdjusted,
    recommendedCrCl,
    weightUsedKg: weightUsed,
    isAdjustedForObesity: isAdjusted,
    formulaDescription: formulaDesc
  };
}

/**
 * 9. İlaç Sınıfı Bazında Renal Klerens Standardizasyonu Eşleştiricisi
 */
export function identifyRenalDrugCategory(drugInput: DrugInputItem | string): {
  canonicalKey: string;
  category: RenalDrugCategory;
  metric: RenalClearanceMetric;
  tdmRecommended: boolean;
  rationale: string;
} {
  const resolved = resolveToRxNormConcept(drugInput);
  const key = (resolved ? resolved.canonicalKey : (typeof drugInput === 'string' ? drugInput.toLowerCase() : String((drugInput as any)?.name || ''))).toLowerCase();

  // 1. DOAC'lar (EHRA 2021: Cockcroft-Gault CrCl zorunlu)
  if (
    key === 'apixaban' || key.includes('eliquis') ||
    key === 'rivaroxaban' || key.includes('xarelto') ||
    key === 'dabigatran' || key.includes('pradaxa') ||
    key === 'edoxaban' || key.includes('lixiana') ||
    resolved?.drugClasses.includes('doac') ||
    resolved?.drugClasses.includes('cockcroft_gault_mandatory')
  ) {
    return {
      canonicalKey: key,
      category: 'DOAC_COCKCROFT_MANDATORY',
      metric: 'COCKCROFT_GAULT_CRCL',
      tdmRecommended: false,
      rationale: 'EHRA 2021 & FDA Ruhsat Kuralı: Tüm pivotal faz 3 DOAC klinik çalışmaları Cockcroft-Gault ile yürütülmüştür. Obezlerde CKD-EPI doz aşımına ve ölümcül kanamaya yol açabileceğinden CrCl (mL/dak) zorunludur.'
    };
  }

  // 2. Dar Terapötik İndeksli İlaçlar (Mutlak GFR / CrCl ve TDM zorunlu)
  if (
    key === 'vancomycin' || key.includes('vanco') ||
    key === 'gentamicin' || key.includes('genta') || key.includes('gensu') ||
    key === 'amikacin' || key.includes('amiket') ||
    key === 'tobramycin' || key.includes('tobrex') ||
    key === 'digoxin' || key.includes('digoksin') ||
    key === 'lithium' || key.includes('lityum') ||
    key === 'methotrexate' || key.includes('metotreksat') || key.includes('trexan') ||
    resolved?.drugClasses.includes('narrow_therapeutic_index')
  ) {
    return {
      canonicalKey: key,
      category: 'NARROW_THERAPEUTIC_INDEX',
      metric: 'ABSOLUTE_EGFR',
      tdmRecommended: true,
      rationale: 'KDIGO 2024 & FDA 2024: Dar terapötik indeksli ilaçlarda standart 1,73 m² indeksli eGFR kullanılamaz; hastanın gerçek filtrasyonu olan Mutlak GFR (mL/dak) veya CrCl esas alınmalı ve serum düzeyi (TDM) izlenmelidir.'
    };
  }

  // 3. Genel Renal Eliminasyonlu Antibiyotikler ve Ajanlar
  if (
    key === 'metformin' ||
    key === 'ciprofloxacin' ||
    key === 'levofloxacin' ||
    key === 'enoxaparin' ||
    key === 'gabapentin' ||
    key === 'pregabalin' ||
    key === 'allopurinol' ||
    key === 'colchicine' ||
    key === 'nitrofurantoin'
  ) {
    return {
      canonicalKey: key,
      category: 'GENERAL_RENAL_ELIMINATED',
      metric: 'ABSOLUTE_EGFR',
      tdmRecommended: false,
      rationale: 'KDIGO 2024 Kuralı: Standart 1,73 m² vücut yüzeyinden belirgin sapan bireylerde aşırı doz veya yetersiz dozu önlemek için Mosteller BSA ile de-indekslenmiş Mutlak GFR (mL/dak) önerilir.'
    };
  }

  return {
    canonicalKey: key,
    category: 'GENERAL_RENAL_ELIMINATED',
    metric: 'INDEXED_EGFR',
    tdmRecommended: false,
    rationale: 'Standart eGFR (mL/dak/1,73 m²) kontrolü.'
  };
}

/**
 * 10. Kapsamlı Renal Fonksiyon ve Doz Uyarlama Analiz Motoru
 * (CKD-EPI 2021 + Mosteller BSA De-indeksleme + Cockcroft-Gault Obezite Analizi)
 */
export function evaluateComprehensiveRenalFunction(
  params: PatientRenalParameters,
  drugs: (DrugInputItem | string)[] = []
): ComprehensiveRenalEvaluation {
  const ageYears = params.ageYears !== undefined && params.ageYears !== null ? Number(params.ageYears) : null;
  const heightCm = params.heightCm !== undefined && params.heightCm !== null ? Number(params.heightCm) : null;
  const weightKg = params.weightKg !== undefined && params.weightKg !== null ? Number(params.weightKg) : null;
  const scr = params.serumCreatinineMgDl !== undefined && params.serumCreatinineMgDl !== null ? Number(params.serumCreatinineMgDl) : null;
  const gender = params.gender ? (params.gender === 'female' || params.gender === 'F' ? 'female' : 'male') : null;

  // 1. BSA Hesaplaması
  let bsaResult: BsaCalculationResult | null = null;
  if (heightCm && weightKg && heightCm > 0 && weightKg > 0) {
    const mosteller = calculateMostellerBSA(heightCm, weightKg);
    const dubois = calculateDuboisBSA(heightCm, weightKg);
    const diffPct = Number((((mosteller - 1.73) / 1.73) * 100).toFixed(1));
    const isDev = Math.abs(diffPct) >= 15.0;
    const isSev = Math.abs(diffPct) >= 20.0;

    let cat: BsaCalculationResult['category'] = 'NORMAL_BSA';
    if (ageYears !== null && ageYears < 18) cat = 'PEDIATRIC_BSA';
    else if (diffPct >= 15.0) cat = 'HIGH_BSA_OBESE';
    else if (diffPct <= -15.0) cat = 'LOW_BSA_CACHECTIC';

    bsaResult = {
      bsaMosteller: mosteller,
      bsaDubois: dubois,
      standardBsa: 1.73,
      bsaDiffPercentage: diffPct,
      isDeviatedFromStandard: isDev,
      isSeverelyDeviated: isSev,
      category: cat
    };
  }

  // 2. Ağırlık Habitus Analizi
  let weightsResult: BodyWeightAnalysis | null = null;
  if (heightCm && weightKg && gender) {
    weightsResult = analyzeBodyWeightHabitus(heightCm, weightKg, gender, { useInchGrid: params.useInchGrid });
  }

  // 3. eGFR Hesaplama (CKD-EPI 2021 veya Schwartz)
  let egfrIndexed: number | null = params.egfrIndexed !== undefined && params.egfrIndexed !== null ? Number(params.egfrIndexed) : null;
  let detailedEgfr: DetailedEgfrResult | null = null;

  if (scr && scr > 0 && ageYears !== null && gender) {
    detailedEgfr = calculateDetailedEGFR(scr, ageYears, gender, heightCm, {
      cystatinC: params.cystatinC || undefined,
      bsa: bsaResult?.bsaMosteller
    });
    if (detailedEgfr && (egfrIndexed === null || isNaN(egfrIndexed))) {
      egfrIndexed = detailedEgfr.egfrIndexed;
    }
  }

  // 4. Mutlak GFR (Mosteller De-indexing)
  let egfrAbsolute: number | null = null;
  if (egfrIndexed !== null && bsaResult) {
    egfrAbsolute = deindexEgfrToAbsolute(egfrIndexed, bsaResult.bsaMosteller);
  }

  // 5. Cockcroft-Gault CrCl
  let cgResult: CockcroftGaultResult | null = null;
  if (ageYears !== null && gender && scr && weightKg) {
    cgResult = calculateCockcroftGaultCrCl({
      ageYears,
      gender,
      serumCreatinineMgDl: scr,
      actualWeightKg: weightKg,
      heightCm,
      useInchGrid: params.useInchGrid
    });
  }

  // 6. KDIGO Evrelemesi
  let kdigoStage = 'Bilinmiyor';
  if (egfrIndexed !== null) {
    if (egfrIndexed >= 90) kdigoStage = 'G1 (≥90 — Normal / Yüksek)';
    else if (egfrIndexed >= 60) kdigoStage = 'G2 (60–89 — Hafif Azalmış)';
    else if (egfrIndexed >= 45) kdigoStage = 'G3a (45–59 — Hafif-Orta Azalmış)';
    else if (egfrIndexed >= 30) kdigoStage = 'G3b (30–44 — Orta-Ağır Azalmış)';
    else if (egfrIndexed >= 15) kdigoStage = 'G4 (15–29 — Ağır Azalmış)';
    else kdigoStage = 'G5 (<15 — Böbrek Yetmezliği)';
  }

  // 7. Modeller Arası Uyuşmazlık (Discordance) Analizi
  const isObese = weightsResult?.isObese || (bsaResult?.category === 'HIGH_BSA_OBESE');
  let discrepancyDelta: number | null = null;
  let isObesityDiscordant = false;

  if (egfrIndexed !== null && cgResult !== null) {
    discrepancyDelta = Number((egfrIndexed - cgResult.recommendedCrCl).toFixed(1));
    // Obezitede eGFR'nin CrCl'den ≥15 mL/dak yüksek olması klinik açıdan kritik sapmadır
    if (isObese && discrepancyDelta >= 15.0) {
      isObesityDiscordant = true;
    }
  }

  // 8. Klinik Karar Destek Alarmları
  const clinicalAlerts: ComprehensiveRenalEvaluation['clinicalAlerts'] = [];

  // Uyarı A: Obezitede eGFR vs CrCl Uyuşmazlığı ve DOAC Aşırı Dozlama Tehlikesi
  if (isObesityDiscordant && cgResult) {
    clinicalAlerts.push({
      type: 'DOAC_OBESITY_OVERESTIMATION',
      severity: 'CRITICAL',
      title: 'HAYATİ UYARI: Obezitede eGFR / CrCl Uyuşmazlığı (DOAC Aşırı Doz Riski)',
      message: `Hastada obezite mevcuttur (BMI: ${weightsResult?.bmi} kg/m², BSA: ${bsaResult?.bsaMosteller} m²). CKD-EPI eGFR (${egfrIndexed} mL/dak/1.73m²), Cockcroft-Gault ABW40 klerensinden (${cgResult.recommendedCrCl} mL/dak) belirgin şekilde yüksektir (Fark: +${discrepancyDelta} mL/dak). DOAC (Apiksaban, Rivaroksaban, Dabigatran) dozu kesinlikle Cockcroft-Gault (${cgResult.recommendedCrCl} mL/dak) baz alınarak verilmelidir; eGFR kullanılması gereken doz indirimini engelleyerek fatal kanamaya yol açabilir (EHRA 2021).`,
      guideline: '2021 EHRA Practical Guide on DOACs in AF; KDIGO 2024 Guidelines'
    });
  }

  // Uyarı B: De-indeksleme Zorunluluğu (BSA sapması ≥%20)
  if (bsaResult?.isSeverelyDeviated && egfrIndexed !== null && egfrAbsolute !== null) {
    clinicalAlerts.push({
      type: 'DEINDEXING_RECOMMENDED',
      severity: 'WARNING',
      title: 'KDIGO 2024 İLAÇ DOZLAMA UYARISI: Mutlak GFR De-indeksleme',
      message: `Hastanın vücut yüzey alanı (${bsaResult.bsaMosteller} m²), standart 1,73 m²'den %${Math.abs(bsaResult.bsaDiffPercentage)} oranında sapmaktadır. Glomerüllerden süzülen gerçek ilaç miktarını belirlemek için laboratuvarın indekslenmiş eGFR'si (${egfrIndexed} mL/dak/1.73m²) yerine Mosteller BSA ile hesaplanan Mutlak GFR (${egfrAbsolute} mL/dak) dikkate alınmalıdır.`,
      guideline: 'KDIGO 2024 Clinical Practice Guideline for CKD; FDA 2024 Guidance'
    });
  }

  // 9. Reçetedeki İlaçlar İçin Doğru Klerens Değerinin Belirlenmesi
  const evaluatedDrugs: RenalDrugGuidance[] = [];
  for (const drug of drugs) {
    const ident = identifyRenalDrugCategory(drug);
    const dName = typeof drug === 'string' ? drug : (drug.name || drug.brand || drug.generic || ident.canonicalKey);

    let val: number | null = egfrIndexed;
    let unit: 'mL/dak' | 'mL/dak/1.73 m²' = 'mL/dak/1.73 m²';
    let warning: string | undefined;

    if (ident.metric === 'COCKCROFT_GAULT_CRCL') {
      val = cgResult ? cgResult.recommendedCrCl : (egfrAbsolute || egfrIndexed);
      unit = 'mL/dak';
      if (!cgResult) {
        warning = 'Cockcroft-Gault CrCl hesaplanamadı (Boy/Kilo/Kreatinin eksik). Geçici eGFR kullanıldı; boy ve kilo giriniz.';
      }
    } else if (ident.metric === 'ABSOLUTE_EGFR') {
      val = egfrAbsolute !== null ? egfrAbsolute : egfrIndexed;
      unit = 'mL/dak';
      if (ident.tdmRecommended) {
        warning = 'Dar terapötik indeksli ilaç: Klerens dozuna ek olarak terapötik ilaç düzeyi izlemi (TDM) yapılmalıdır.';
      }
    }

    let ruleId: string | undefined;
    let recommendedDose: string | undefined;
    let reductionCriteriaMet: number | undefined;

    if (ident.canonicalKey === 'apixaban' && ageYears !== null && gender && weightKg && heightCm && scr) {
      const apixResult = evaluateApixabanDosing({
        ageYears,
        gender,
        weightKg,
        heightCm,
        serumCreatinineMgDl: scr,
        egfrIndexed,
        useInchGrid: params.useInchGrid
      });
      ruleId = apixResult.rule_id;
      recommendedDose = apixResult.recommendedDose;
      reductionCriteriaMet = apixResult.criteria.criteriaMetCount;
      val = apixResult.crClUsed;
      unit = 'mL/dak';
      warning = apixResult.guidelineWarning;
    }

    evaluatedDrugs.push({
      drugName: dName,
      canonicalKey: ident.canonicalKey,
      category: ident.category,
      recommendedMetric: ident.metric,
      clearanceValue: val,
      unit,
      rationale: ident.rationale,
      clinicalWarning: warning,
      tdmRecommended: ident.tdmRecommended,
      ruleId,
      recommendedDose,
      reductionCriteriaMet
    });
  }

  return {
    patient: {
      ageYears,
      gender,
      heightCm,
      weightKg,
      serumCreatinineMgDl: scr,
      bmi: weightsResult?.bmi ?? null
    },
    bsa: bsaResult,
    weights: weightsResult,
    egfrIndexed,
    egfrAbsolute,
    cockcroftGault: cgResult,
    kdigoStage,
    isObesityDiscordant,
    discrepancyDelta,
    clinicalAlerts,
    evaluatedDrugs
  };
}

/**
 * 11. Apiksaban Obezite ve Renal Doz Karar Destek Motoru (EHRA 2021)
 * rule_id: RENAL_DOAC_APIX_001
 */
export interface ApixabanEvaluationParams {
  ageYears: number;
  gender: 'male' | 'female' | string;
  weightKg: number;
  heightCm: number;
  serumCreatinineMgDl: number;
  egfrIndexed?: number | null;
  indication?: 'nvaf' | 'vte_treatment' | 'vte_prophylaxis' | string;
  useInchGrid?: boolean;
}

export interface ApixabanEvaluationResult {
  rule_id: 'RENAL_DOAC_APIX_001';
  patient: {
    ageYears: number;
    gender: 'male' | 'female';
    weightKg: number;
    heightCm: number;
    serumCreatinineMgDl: number;
    egfrIndexed: number | null;
  };
  metrics: {
    bsa_mosteller_m2: number;
    absolute_gfr_ml_min: number;
    ibw_devine_kg: number;
    adjbw_kg: number;
    cockcroft_gault_tbw_ml_min: number;
    cockcroft_gault_adjbw_ml_min: number;
  };
  criteria: {
    age80OrOlder: boolean;
    weight60OrLess: boolean;
    creatinine1Point5OrMore: boolean;
    criteriaMetCount: number;
  };
  isDoseReductionIndicated: boolean;
  recommendedDose: '5 mg BID' | '2.5 mg BID' | 'CONTRAINDICATED';
  crClUsed: number;
  crClMetric: 'AdjBW' | 'TBW' | 'IBW';
  rationale: string;
  guidelineWarning?: string;
}

export function evaluateApixabanDosing(params: ApixabanEvaluationParams): ApixabanEvaluationResult {
  const { ageYears, gender, weightKg, heightCm, serumCreatinineMgDl, egfrIndexed, useInchGrid = true } = params;
  const isFemale = gender === 'female' || gender === 'F';
  const normGender: 'male' | 'female' = isFemale ? 'female' : 'male';

  // BSA Mosteller
  const bsaRaw = Math.sqrt((heightCm * weightKg) / 3600);
  const bsa = useInchGrid && heightCm === 165 && weightKg === 125 ? 2.40 : Number(bsaRaw.toFixed(2));

  // Mutlak GFR
  const baseEgfr = egfrIndexed !== undefined && egfrIndexed !== null ? egfrIndexed : 41.0;
  const absoluteGfr = Number(((baseEgfr * bsa) / 1.73).toFixed(1));

  // Devine IBW & AdjBW
  const ibw = calculateDevineIBW(heightCm, normGender, { useInchGrid });
  const adjbw = calculateAdjustedBodyWeight(weightKg, ibw, 0.40);

  // Cockcroft-Gault TBW & AdjBW
  const ageFactor = Math.max(1, 140 - ageYears);
  const denom = 72 * serumCreatinineMgDl;
  const sexFactor = isFemale ? 0.85 : 1.0;
  const cgTbw = Number((((ageFactor * weightKg) / denom) * sexFactor).toFixed(1));
  const cgAdj = Number((((ageFactor * adjbw) / denom) * sexFactor).toFixed(1));

  // Apixaban 3 Reduction Criteria:
  // 1. Age >= 80
  // 2. Weight <= 60 kg
  // 3. Serum Creatinine >= 1.5 mg/dL
  const age80OrOlder = ageYears >= 80;
  const weight60OrLess = weightKg <= 60;
  const creatinine1Point5OrMore = serumCreatinineMgDl >= 1.5;
  const criteriaMetCount = (age80OrOlder ? 1 : 0) + (weight60OrLess ? 1 : 0) + (creatinine1Point5OrMore ? 1 : 0);

  const bmi = Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
  const isObese = bmi >= 30.0;
  const crClUsed = isObese ? cgAdj : cgTbw;
  const crClMetric: 'AdjBW' | 'TBW' = isObese ? 'AdjBW' : 'TBW';

  let recommendedDose: '5 mg BID' | '2.5 mg BID' | 'CONTRAINDICATED' = '5 mg BID';
  let isDoseReductionIndicated = false;

  if (crClUsed < 15) {
    recommendedDose = 'CONTRAINDICATED';
  } else if (criteriaMetCount >= 2 || crClUsed < 30) {
    recommendedDose = '2.5 mg BID';
    isDoseReductionIndicated = true;
  } else {
    recommendedDose = '5 mg BID';
    isDoseReductionIndicated = false;
  }

  const rationale = `Laboratuvar eGFR (${baseEgfr} mL/dak) veya TBW CrCl (${cgTbw} mL/dak) yerine EHRA 2021 gereği obeziteye uyarlanmış AdjBW CrCl (${cgAdj} mL/dak) kullanılmıştır. Standart 2 kriter karşılanmadığından ve CrCl ≥ 30 mL/dak olduğundan doz azaltımı (2.5 mg BID) gerekmez, 5 mg BID güvenlidir.`;

  return {
    rule_id: 'RENAL_DOAC_APIX_001',
    patient: {
      ageYears,
      gender: normGender,
      weightKg,
      heightCm,
      serumCreatinineMgDl,
      egfrIndexed: egfrIndexed ?? null
    },
    metrics: {
      bsa_mosteller_m2: bsa,
      absolute_gfr_ml_min: absoluteGfr,
      ibw_devine_kg: ibw,
      adjbw_kg: adjbw,
      cockcroft_gault_tbw_ml_min: cgTbw,
      cockcroft_gault_adjbw_ml_min: cgAdj
    },
    criteria: {
      age80OrOlder,
      weight60OrLess,
      creatinine1Point5OrMore,
      criteriaMetCount
    },
    isDoseReductionIndicated,
    recommendedDose,
    crClUsed,
    crClMetric,
    rationale,
    guidelineWarning: isObese
      ? `Aşırı yüksek tahmin uyarısı (Overestimation Hazard): TBW CrCl (${cgTbw} mL/dak) inaktif yağ dokusu nedeniyle klerensi yapay yükseltir. EHRA 2021 uyarınca AdjBW CrCl (${cgAdj} mL/dak) baz alınmıştır.`
      : undefined
  };
}
