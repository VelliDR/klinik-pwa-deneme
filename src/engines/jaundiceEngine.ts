/**
 * klinik-pwa - AAP 2022 Neonatal Hyperbilirubinemia & Escalation Engine (TypeScript)
 * 
 * Clinical & Regulatory Foundations:
 * 1. AAP 2022 Clinical Practice Guideline (Kemper AR et al., Pediatrics 2022;150(3):e2022058859):
 *    - Applies strictly to infants >= 35 0/7 weeks of gestation.
 *    - Replaced the classic 1999 Bhutani risk zones with the "Distance-from-Threshold" (Delta) metric.
 *    - Individual gestational week curves (35, 36, 37, 38, 39, >=40 weeks) for phototherapy.
 *    - Truncation rule (tamamlanmış hafta kuralı): Gestational age is truncated, never rounded up (e.g. 36w5d -> 36w).
 *    - Preterm safety lock: Infants < 35 0/7 weeks are blocked from AAP 2022 and routed to Maisels 2012 / TND 2023 preterm protocols.
 *    - Direct bilirubin non-subtraction rule: Direct/conjugated bilirubin is NEVER subtracted from total serum bilirubin (TSB).
 *    - TcB validation trigger (KAS 6): TcB within 3.0 mg/dL of threshold or >= 15.0 mg/dL requires STAT TSB confirmation.
 *    - Escalation of Care (KAS 17): TSB >= (Exchange Transfusion Threshold - 2.0 mg/dL) is a medical emergency requiring NICU admission.
 *    - First 12 hours: Jaundice in the first 12 hours is pathological (hemolytic until proven otherwise).
 * 
 * 2. Türk Neonatoloji Derneği (TND) 2023 Yenidoğan Sarılıklarında Yaklaşım, İzlem ve Tedavi Rehberi:
 *    - Integrated AAP 2022 Escalation of Care and B/A ratio thresholds into national protocol.
 *    - Standardized NICE preterm formula: Threshold = (GA * 0.6) - 6 (>72 hours) for <35 weeks.
 * 
 * References:
 * - Kemper AR, et al. Clinical Practice Guideline Revision: Management of Hyperbilirubinemia in the Newborn Infant 35 or More Weeks of Gestation. Pediatrics 2022;150(3):e2022058859.
 * - TND Yenidoğan Sarılıklarında Yaklaşım, İzlem ve Tedavi Rehberi (2023 Güncellemesi).
 * - Maisels MJ, et al. An approach to the management of hyperbilirubinemia in the preterm infant less than 35 weeks of gestation. J Perinatol 2012;32:660–664.
 */

export interface Aap2022HourlyKnot {
  hour: number;
  thresholds: Record<string, number>;
}

export interface GestationalAgeInput {
  weeks: number;
  days?: number | null;
}

/**
 * Nörotoksisite Risk Faktörleri (AAP 2022 KAS 18, Tablo 1 & Tablo 2)
 */
export interface Aap2022NeurotoxicityRiskFactors {
  /** Hipoalbüminemi: Serum Albümin < 3.0 g/dL (< 30 g/L) */
  hypoalbuminemia?: boolean;
  /** İzoimmün Hemolitik Hastalık: DAT+ (Coombs), Rh / ABO uyuşmazlığı */
  isoimmuneHemolysis?: boolean;
  /** G6PD Eksikliği ve Diğer Eritrosit Membran/Enzim Bozuklukları */
  g6pdDeficiency?: boolean;
  /** Sepsis: Klinik sepsis bulguları veya kanıtlanmış sepsis */
  sepsis?: boolean;
  /** Son 24 saatte klinik instabilite (asidoz pH < 7.15, hipotansiyon, hipoksi, mekanik ventilasyon) */
  clinicalInstability?: boolean;
  /** Saatlik artış hızı bazlı hemoliz şüphesi (KAS 7: ilk 24h >=0.3 mg/dL/h, sonrası >=0.2 mg/dL/h) */
  rapidRiseHemolysis?: boolean;
}

/**
 * Akut Bilirubin Ensefalopatisi (ABE) / BIND Semptom Profili (AAP 2022 KAS 19 & 20)
 */
export interface Aap2022AbeSymptoms {
  /** Letarji, uyandırma güçlüğü veya belirgin stupor */
  lethargyOrStupor?: boolean;
  /** Zayıf emme veya beslenmeyi bütünüyle reddetme */
  poorFeedingOrRefusal?: boolean;
  /** Hipertoni veya dalgalı tonus bozukluğu */
  hypertonia?: boolean;
  /** Retrokollis (boynun geriye doğru hiperekstansiyonu) */
  retrocollis?: boolean;
  /** Opistotonus (gövdenin yay gibi geriye bükülmesi) */
  opisthotonos?: boolean;
  /** Tiz, durdurulamayan tiz ağlama (high-pitched cry) */
  highPitchedCry?: boolean;
  /** Konvülsiyon (nöbet) veya santral ateş */
  seizuresOrFever?: boolean;
}

/**
 * Bilirubin Artış Hızı Analizi (AAP 2022 KAS 7)
 */
export interface Aap2022RateOfRiseAnalysis {
  previousTsbMgDl: number;
  previousAgeHours: number;
  deltaTsbMgDl: number;
  deltaHours: number;
  rateMgDlPerHour: number;
  isRapidRise: boolean;
  thresholdMgDlPerHour: number;
  interpretation: string;
}

/**
 * Acil Bakım Eskalasyonu Protokolü (AAP 2022 KAS 17)
 */
export interface Aap2022EscalationProtocol {
  isEscalationActive: boolean;
  urgency: 'MEDICAL_EMERGENCY';
  targetNicuTransfer: string;
  phototherapyRegimen: string;
  hydrationProtocol: string;
  statOrderBundle: string[];
  reassessmentIntervalHours: number;
  ivigProtocol?: {
    recommended: boolean;
    dose: string;
    indication: string;
    repeatInterval: string;
  } | null;
}

/**
 * Maisels 2012 Preterm Postmenstrüel Yaş (PMA) Konsensus Bandı (Dosya 4 Tablo 5 & 6)
 */
export interface PretermMaiselsBand {
  bandId: '<28' | '28-29' | '30-31' | '32-33' | '34';
  pmaRangeLabel: string;
  pmaWeeksMin: number;
  pmaWeeksMax: number;
  phototherapyMinMgDl: number;
  phototherapyMaxMgDl: number;
  phototherapyMinUmolL: number;
  phototherapyMaxUmolL: number;
  exchangeMinMgDl: number;
  exchangeMaxMgDl: number;
  exchangeMinUmolL: number;
  exchangeMaxUmolL: number;
}

/**
 * TND 2023 / NICE CG98 Dinamik Preterm Formülü
 */
export interface PretermTndNiceFormula {
  plateauThresholdMgDl: number;
  dynamicThresholdMgDl: number;
  niceUmolLPlateau: number;
  niceUmolLDynamic: number;
  isRamping: boolean;
}

/**
 * Prematüre Sarılık Değerlendirme Parametreleri (<35 Hafta)
 */
export interface PretermJaundiceParams {
  gestationalWeeks: number;
  gestationalDays?: number | null;
  ageHours: number;
  totalBilirubin: number; // mg/dL
  measurementType?: 'TSB' | 'TcB';
  hasNeurotoxicityRisk?: boolean;
  birthWeightGrams?: number | null;
  birthWeightKg?: number | null;
  currentWeightKg?: number | null;
  isPriorPhototherapyWithin24h?: boolean;
}

/**
 * Prematüre Sarılık Karar Destek Çıktısı
 */
export interface PretermJaundiceResult {
  isValid: boolean;
  message?: string;
  gestationalAge: {
    weeks: number;
    days: number;
    totalWeeksFraction: number;
  };
  chronologicalAgeHours: number;
  chronologicalAgeDays: number;
  pmaWeeks: number;
  isPmaClamped: boolean;
  activeMaiselsBand: PretermMaiselsBand;
  maiselsThresholds: {
    phototherapyRangeMgDl: [number, number];
    phototherapyRangeUmolL: [number, number];
    exchangeRangeMgDl: [number, number];
    exchangeRangeUmolL: [number, number];
    effectivePhototherapyMgDl: number;
    effectiveExchangeMgDl: number;
  };
  tndNiceFormula: PretermTndNiceFormula;
  effectiveThresholds: {
    phototherapy: number;
    escalation: number;
    exchange: number;
  };
  deltaFromPhototherapy: number;
  status:
    | 'LOW_RISK'
    | 'CLOSE_MONITORING'
    | 'PHOTOTHERAPY_REQUIRED'
    | 'ESCALATION_OF_CARE'
    | 'EXCHANGE_TRANSFUSION_REQUIRED';
  alertClass: 'success' | 'info' | 'warning' | 'danger';
  requiresTsbConfirmation: boolean;
  tsbConfirmationReason?: string;
  hasElbwIrradianceShield: boolean;
  interpretation: string;
  recommendations: string[];
  clinicalAlerts: {
    type:
      | 'PRETERM_LOCK'
      | 'PRETERM_PMA_CLAMPED_WARNING'
      | 'PRETERM_IRRADIANCE_WARNING'
      | 'PRETERM_IUGR_DOWNGRADE_WARNING'
      | 'TCB_CONFIRMATION'
      | 'ESCALATION'
      | 'EXCHANGE';
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    message: string;
  }[];
}

/**
 * AAP 2022 Taburculuk İzlem Matrisi Çıktısı (KAS 22–25, Tablo 4 & Şekil 7)
 */
export interface Aap2022DischargeEvaluation {
  deltaMgDl: number; // Fototerapi Eşiği - Total Bilirubin
  matrixBand: string; // '< 12 saat' | '≤ 0.0 mg/dL' | '0.1 – 1.9 mg/dL' | '2.0 – 3.4 mg/dL' | '3.5 – 5.4 mg/dL' | '5.5 – 6.9 mg/dL' | '≥ 7.0 mg/dL'
  isDischargeEligible: boolean; // false if <12h, delta <= 0, or delayed
  actionCode:
    | 'FIRST_12H_CONTRAINDICATED'
    | 'CANNOT_DISCHARGE_PT_REQUIRED'
    | 'DELAY_DISCHARGE_OR_ADMIT'
    | 'CLOSE_MONITORING_OR_HOME_PT'
    | 'CLOSE_MONITORING'
    | 'INTERMEDIATE_MONITORING'
    | 'OUTPATIENT_48H'
    | 'CLINICAL_DISCRETION'
    | 'OUTPATIENT_72H'
    | 'ROUTINE_CARE';
  followUpTiming: string;
  followUpModality: 'STAT_TSB' | 'TSB_ONLY' | 'TSB_OR_TCB' | 'CLINICAL_OR_TEST' | 'CLINICAL_ROUTINE';
  dischargeRecommendation: string;
  clinicalNotes: string[];
}

/**
 * Fototerapi Sonlandırma & Rebound İzlem Değerlendirmesi (AAP 2022 KAS 14 & 15)
 */
export interface Aap2022ReboundEvaluation {
  currentTsb: number;
  currentAgeHours: number;
  phototherapyThreshold: number;
  discontinuationThreshold: number; // PhototherapyThreshold - 2.0 mg/dL
  isDiscontinuationPermitted: boolean; // TSB <= discontinuationThreshold
  marginBelowThreshold: number; // PhototherapyThreshold - currentTsb
  phototherapyStartAgeHours: number | null;
  riskFactors: {
    isEarlyInitiation: boolean; // Started < 48 hours
    isPositiveDatOrHemolysis: boolean; // DAT+ or known hemolytic disease
    isNearTermGestationalAge: boolean; // Gestational age < 38 weeks (35–37 6/7)
    isNarrowMargin: boolean; // Margin < 2.5 mg/dL below threshold
  };
  activeRiskCount: number;
  activeRiskLabels: string[];
  isHighReboundRisk: boolean; // >= 1 risk factor
  riskTier: 'HIGH_REBOUND_RISK' | 'LOW_REBOUND_RISK';
  reboundFollowUpHours: string; // '6–12 saat' vs '24–48 saat (1–2 gün)'
  protocol: string;
  recommendations: string[];
}

/**
 * TcB Doğrulama & Güvenlik Kalkanı (AAP 2022 KAS 6)
 */
export interface TcBValidityEvaluation {
  measurementType: 'TSB' | 'TcB';
  totalBilirubin: number;
  isValidForTreatmentDecision: boolean;
  isTsbMandatory: boolean;
  trigger?: 'NONE' | 'PRIOR_PHOTOTHERAPY' | 'FIRST_12H' | 'PRETERM' | 'TCB_HIGH_SATURATION' | 'THRESHOLD_PROXIMITY';
  warning?: string;
  guidelineRule: string;
}

export interface DischargeMatrixParams {
  deltaMgDl: number; // PhototherapyThreshold - TotalBilirubin
  ageHours: number;
  phototherapyThreshold?: number;
  totalBilirubin?: number;
}

export interface PhototherapyReboundParams {
  currentTsb: number;
  currentAgeHours: number;
  phototherapyThreshold: number;
  gestationalWeeks: number;
  gestationalDays?: number | null;
  phototherapyStartAgeHours?: number | null;
  hasIsoimmuneHemolysis?: boolean;
  hasHemolyticDisease?: boolean;
}

export interface TcBValidityParams {
  measurementType: 'TSB' | 'TcB';
  totalBilirubin: number;
  phototherapyThreshold: number;
  ageHours: number;
  gestationalWeeks: number;
  priorPhototherapyWithin24h?: boolean;
}

export interface Aap2022JaundiceParams {
  ageHours: number;
  totalBilirubin: number; // mg/dL (TSB or TcB)
  gestationalWeeks?: number | null; // e.g. 38 or 36.7
  gestationalDays?: number | null;  // e.g. 0 to 6
  measurementType?: 'TSB' | 'TcB';
  hasNeurotoxicityRisk?: boolean; // legacy / quick boolean flag
  riskFactors?: Aap2022NeurotoxicityRiskFactors; // Detailed risk breakdown
  abeSymptoms?: Aap2022AbeSymptoms; // Signs of Acute Bilirubin Encephalopathy (KAS 19/20)
  previousTsbMgDl?: number | null;  // Previous TSB for rate-of-rise calculation
  previousAgeHours?: number | null; // Previous age for rate-of-rise calculation
  albuminGPerDl?: number | null;  // g/dL (for B/A ratio and risk verification)
  directBilirubinMgDl?: number | null; // mg/dL (for cholestasis / bronze baby screening)
  isDischargePlanning?: boolean;  // If evaluating for hospital discharge
  priorPhototherapyWithin24h?: boolean; // TcB is strictly invalid if phototherapy received in prior 24h
  phototherapyStartAgeHours?: number | null; // Age in hours when phototherapy was initiated (for rebound risk)
  isPhototherapyDiscontinuationEvaluation?: boolean; // Evaluating whether phototherapy can be stopped
  birthWeightGrams?: number | null; // Grams (for preterm Maisels IUGR downgrade and ELBW shield)
  birthWeightKg?: number | null; // Kilograms (alternative input)
}

export interface Aap2022Thresholds {
  phototherapy: number; // mg/dL
  escalation: number;   // mg/dL (Exchange - 2.0)
  exchange: number;     // mg/dL
}

export interface Aap2022JaundiceResult {
  isValid: boolean;
  message?: string;
  ageHours: number;
  totalBilirubin: number;
  gestationalAge: {
    inputWeeks: number;
    inputDays: number;
    truncatedWeeks: number; // e.g. 36 for 36w5d
    isPreterm: boolean;     // true if < 35 weeks
    isAapBlocked: boolean;  // true if < 35 weeks
  };
  measurementType: 'TSB' | 'TcB';
  hasNeurotoxicityRisk: boolean;
  riskFactorDetails?: {
    hypoalbuminemia: boolean;
    isoimmuneHemolysis: boolean;
    g6pdDeficiency: boolean;
    sepsis: boolean;
    clinicalInstability: boolean;
    rapidRiseHemolysis: boolean;
    activeRisks: string[];
  };
  abeAssessment?: {
    isAbeSuspected: boolean;
    isImmediateExchangeTriggered: boolean;
    reportedSymptoms: string[];
    guidelineAction: string;
  };
  rateOfRiseAnalysis?: Aap2022RateOfRiseAnalysis | null;
  escalationProtocol?: Aap2022EscalationProtocol | null;
  thresholds: Aap2022Thresholds;
  deltaFromPhototherapy: number; // Phototherapy - TotalBilirubin (positive: below, negative: above)
  status:
    | 'LOW_RISK'
    | 'CLOSE_MONITORING'
    | 'PHOTOTHERAPY_REQUIRED'
    | 'ESCALATION_OF_CARE'
    | 'EXCHANGE_TRANSFUSION_REQUIRED'
    | 'FIRST_12_HOURS_CRITICAL'
    | 'PRETERM_ROUTED'
    | 'TCB_REQUIRES_STAT_TSB_CONFIRMATION';
  alertClass: 'success' | 'info' | 'warning' | 'danger';
  requiresTsbConfirmation: boolean;
  tsbConfirmationReason?: string;
  followUpRecommendation: string;
  interpretation: string;
  recommendations: string[];
  clinicalAlerts: {
    type:
      | 'FIRST_12H_PATHOLOGY'
      | 'PRETERM_LOCK'
      | 'PRETERM_PMA_CLAMPED_WARNING'
      | 'PRETERM_IRRADIANCE_WARNING'
      | 'TCB_CONFIRMATION'
      | 'CHOLESTASIS_BRONZE'
      | 'ESCALATION'
      | 'EXCHANGE'
      | 'BA_RATIO'
      | 'ABE_EMERGENCY'
      | 'HEMOLYSIS_RATE'
      | 'G6PD_RETEST_REMINDER'
      | 'REBOUND_HIGH_RISK'
      | 'ALBUMIN_MANDATORY_WARNING'
      | 'PHOTOTHERAPY_DISCONTINUATION_WARNING'
      | 'NON_SUBTRACTION_RULE'
      | 'PRETERM_IUGR_DOWNGRADE_WARNING'
      | 'DISCHARGE_DELAYED';
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    message: string;
  }[];
  bilirubinAlbuminRatio?: {
    ratio: number; // mg/dL / g/dL
    threshold: number;
    isThresholdExceeded: boolean;
    interpretation: string;
  } | null;
  directBilirubinAnalysis?: {
    directBilirubinMgDl: number;
    percentageOfTotal: number;
    isCholestasisSuspected: boolean;
    warning?: string;
  } | null;
  dischargeEvaluation?: Aap2022DischargeEvaluation | null;
  reboundEvaluation?: Aap2022ReboundEvaluation | null;
  tcBValidity?: TcBValidityEvaluation | null;
  pretermGuidance?: {
    pmaWeeks: number;
    maiselsPhototherapyRange: string;
    maiselsExchangeRange: string;
    tndNiceThreshold: number;
    rationale: string;
    pretermResult?: PretermJaundiceResult;
  } | null;
}

/**
 * 1. AAP 2022 Kemper et al. Verified Milestones (Table 0 / Clinical Decision Support)
 * Discrete hours: 0, 12, 24, 48, 72, 96, 120, 168, 336 (Plato at 14 days / 336h).
 * 
 * Biyolojik ve Matematiksel Doğrulama Notu:
 * - AAP 2022 resmi kılavuz tabloları saat 24'ten itibaren yayımlanmaktadır (ek tablolarda 1'er saatlik).
 * - Saat 0 (kord kanı / doğum biyolojik projeksiyonu) ve Saat 12 (0-24h arası doğrusal enterpolasyon ara noktası),
 *   algoritmik sürekliliği ve yaşamın ilk saatlerindeki risk denetimini sağlamak için tanımlanmıştır.
 * - KLİNİK PATOLOJİ KURALI: Yaşamın ilk 12-24 saatinde saptanan her sarılık fizyolojik DEĞİLDİR;
 *   patolojik hemoliz (Rh/ABO uyuşmazlığı, eritrosit membran/enzim defekti) kabul edilir
 *   ve 'FIRST_12H_CONTRAINDICATED' kuralı ile acil hemoliz paneli ve STAT TSB takibi tetiklenir.
 * - Monotonluk Güvencesi: Her zaman diliminde (özellikle 96-336 saat platosunda), daha küçük gestasyonel
 *   haftaya sahip yenidoğanın eşiği daha büyük yenidoğanın eşiğinden ASLA yüksek olamaz
 *   (Threshold_40w >= Threshold_39w >= ... >= Threshold_35w).
 */
export const AAP2022_HOURLY_MILESTONES = [0, 12, 24, 48, 72, 96, 120, 168, 336] as const;

// 1A. Fototerapi: Nörotoksisite Riski YOK (mg/dL)
export const AAP2022_PT_NO_RISK_EXACT: Record<35 | 36 | 37 | 38 | 39 | 40, readonly number[]> = {
  // [0h, 12h, 24h, 48h, 72h, 96h, 120h, 168h, 336h]
  40: [7.0, 9.5, 12.0, 16.0, 18.5, 20.5, 21.0, 21.5, 21.5],
  39: [6.8, 9.15, 11.5, 15.3, 17.9, 19.9, 20.5, 21.0, 21.0],
  38: [6.5, 8.75, 11.0, 14.7, 17.3, 19.3, 20.0, 20.5, 20.5],
  37: [6.2, 8.35, 10.5, 14.0, 16.6, 18.6, 19.4, 20.0, 20.0],
  36: [5.9, 7.95, 10.0, 13.3, 15.9, 17.9, 18.7, 19.5, 19.5],
  35: [5.5, 7.5, 9.5, 12.5, 15.5, 17.0, 17.8, 18.5, 18.5]
};

// 1B. Fototerapi: Nörotoksisite Riski VAR (mg/dL)
// AAP 2022: >=38 hafta tek risk eğrisini paylaşır.
export const AAP2022_PT_WITH_RISK_EXACT: Record<35 | 36 | 37 | 38, readonly number[]> = {
  // [0h, 12h, 24h, 48h, 72h, 96h, 120h, 168h, 336h]
  38: [6.2, 8.35, 10.5, 14.0, 16.5, 18.0, 18.8, 19.5, 19.5],
  37: [5.8, 7.8, 9.8, 13.2, 15.7, 17.2, 18.0, 18.7, 18.7],
  36: [5.3, 7.2, 9.1, 12.4, 14.9, 16.4, 17.2, 17.9, 17.9],
  35: [4.8, 6.65, 8.5, 11.5, 14.0, 15.5, 16.3, 17.0, 17.0]
};

// 1C. Kan Değişimi: Nörotoksisite Riski YOK (mg/dL)
export const AAP2022_EX_NO_RISK_EXACT: Record<35 | 36 | 37 | 38 | 39 | 40, readonly number[]> = {
  // [0h, 12h, 24h, 48h, 72h, 96h, 120h, 168h, 336h]
  40: [16.5, 19.0, 21.5, 24.0, 26.0, 27.0, 27.0, 27.0, 27.0],
  39: [16.0, 18.5, 21.0, 23.5, 25.5, 26.5, 26.5, 26.5, 26.5],
  38: [15.5, 18.0, 20.5, 23.0, 25.0, 26.0, 26.0, 26.0, 26.0],
  37: [14.8, 17.2, 19.6, 22.2, 24.3, 25.5, 25.5, 25.5, 25.5],
  36: [14.0, 16.4, 18.8, 21.3, 23.6, 25.0, 25.0, 25.0, 25.0],
  35: [13.2, 15.55, 17.9, 20.5, 22.9, 24.5, 24.5, 24.5, 24.5]
};

// 1D. Kan Değişimi: Nörotoksisite Riski VAR (mg/dL)
// AAP 2022: >=38 hafta tek risk eğrisini paylaşır.
export const AAP2022_EX_WITH_RISK_EXACT: Record<35 | 36 | 37 | 38, readonly number[]> = {
  // [0h, 12h, 24h, 48h, 72h, 96h, 120h, 168h, 336h]
  38: [14.0, 16.25, 18.5, 21.0, 23.0, 24.0, 24.0, 24.0, 24.0],
  37: [13.3, 15.5, 17.7, 20.2, 22.4, 23.4, 23.5, 23.7, 23.7],
  36: [12.5, 14.7, 16.9, 19.5, 21.8, 22.8, 23.1, 23.3, 23.3],
  35: [11.8, 13.95, 16.1, 18.7, 21.1, 22.2, 22.6, 23.0, 23.0]
};

/**
 * 2. Gestasyonel Yaş Kırpma (Tamamlanmış Hafta / Truncation Kuralı)
 * Dosya 4 Kuralı: 36 hafta 5 günlük bebek matematiksel olarak 36 hafta eğrisine eşlenir.
 * Yukarı yuvarlama fototerapi eşiğini yükselterek tedaviyi tehlikeli şekilde geciktirir!
 */
export function truncateGestationalWeeks(weeks: number, days: number = 0): {
  inputWeeks: number;
  inputDays: number;
  truncatedWeeks: number;
  isPreterm: boolean;
} {
  const rawWeeks = Math.floor(weeks);
  let effectiveDays = Math.max(0, Math.min(6, Math.floor(days || 0)));

  // Eğer ondalıklı girilmişse (örn. 36.7 hafta -> 36 hafta 5 gün)
  if (weeks % 1 !== 0 && (!days || days === 0)) {
    const fraction = weeks % 1;
    effectiveDays = Math.round(fraction * 7);
  }

  const truncated = rawWeeks;
  // Prematüre sınırı: <35 0/7 hafta
  const isPreterm = truncated < 35;

  return {
    inputWeeks: rawWeeks,
    inputDays: effectiveDays,
    truncatedWeeks: truncated,
    isPreterm
  };
}

/**
 * 3. Parçalı Doğrusal Enterpolasyon (Piecewise Linear Interpolation)
 * Saatlik knot noktaları arasında tam doğrusal enterpolasyon hesaplar.
 */
export function interpolateHourlyCurve(curve: readonly number[], ageHours: number): number {
  const knots = AAP2022_HOURLY_MILESTONES;
  const clampedAge = Math.max(0, Math.min(336, ageHours));

  // Tam knot eşleşmesi
  for (let i = 0; i < knots.length; i++) {
    if (clampedAge === knots[i]) {
      return curve[i];
    }
  }

  // Ara saatler için doğrusal enterpolasyon
  for (let i = 0; i < knots.length - 1; i++) {
    const hLow = knots[i];
    const hHigh = knots[i + 1];
    if (clampedAge > hLow && clampedAge < hHigh) {
      const factor = (clampedAge - hLow) / (hHigh - hLow);
      const val = curve[i] + factor * (curve[i + 1] - curve[i]);
      return Number(val.toFixed(2));
    }
  }

  return curve[curve.length - 1];
}

/**
 * 4. AAP 2022 Eşik Hesaplayıcı (Doğrusal Enterpolasyonlu)
 */
export function calculateAap2022Thresholds(
  gestationalWeeks: number,
  hasNeurotoxicityRisk: boolean,
  ageHours: number
): Aap2022Thresholds {
  const ga = Math.min(40, Math.max(35, Math.floor(gestationalWeeks)));

  // Fototerapi Eğrisi
  let ptCurve: readonly number[];
  if (hasNeurotoxicityRisk) {
    const key = Math.min(38, ga) as 35 | 36 | 37 | 38;
    ptCurve = AAP2022_PT_WITH_RISK_EXACT[key];
  } else {
    const key = ga as 35 | 36 | 37 | 38 | 39 | 40;
    ptCurve = AAP2022_PT_NO_RISK_EXACT[key];
  }

  // Kan Değişimi Eğrisi
  let exCurve: readonly number[];
  if (hasNeurotoxicityRisk) {
    const key = Math.min(38, ga) as 35 | 36 | 37 | 38;
    exCurve = AAP2022_EX_WITH_RISK_EXACT[key];
  } else {
    const key = ga as 35 | 36 | 37 | 38 | 39 | 40;
    exCurve = AAP2022_EX_NO_RISK_EXACT[key];
  }

  const phototherapy = interpolateHourlyCurve(ptCurve, ageHours);
  const exchange = interpolateHourlyCurve(exCurve, ageHours);
  const escalation = Number((exchange - 2.0).toFixed(2));

  return {
    phototherapy,
    escalation,
    exchange
  };
}

/**
 * 5. Taburculuk Sonrası Takip Şeması (AAP 2022 Tablo 4: Delta Modeli & KAS 22–25)
 */
export function evaluateAap2022DischargeMatrix(params: DischargeMatrixParams): Aap2022DischargeEvaluation {
  const { deltaMgDl, ageHours } = params;
  const delta = Number(deltaMgDl.toFixed(2));

  // Yaşamın ilk 12 saati: Taburculuk KESİNLİKLE YASAKTIR
  if (ageHours < 12) {
    return {
      deltaMgDl: delta,
      matrixBand: '< 12 saat',
      isDischargeEligible: false,
      actionCode: 'FIRST_12H_CONTRAINDICATED',
      followUpTiming: 'İlk 12 saat - Taburculuk KESİNLİKLE YASAKTIR',
      followUpModality: 'STAT_TSB',
      dischargeRecommendation: 'Yaşamın ilk 12 saatinde taburculuk planlanamaz; acil hemoliz takibi yapılmalıdır.',
      clinicalNotes: [
        'Yaşamın ilk 12 saatindeki sarılık patolojiktir (kan grubu uyuşmazlığı, eritrosit enzim/membran defekti). Taburculuk kesinlikle yasaktır.'
      ]
    };
  }

  // Delta <= 0 mg/dL: Fototerapi eşiği aşılmıştır
  if (delta <= 0) {
    return {
      deltaMgDl: delta,
      matrixBand: '≤ 0.0 mg/dL',
      isDischargeEligible: false,
      actionCode: 'CANNOT_DISCHARGE_PT_REQUIRED',
      followUpTiming: 'Taburcu Etmeyiniz - Fototerapi Endikasyonu',
      followUpModality: 'TSB_ONLY',
      dischargeRecommendation: 'Taburcu etmeyiniz; fototerapi başlatınız ve 4–12 saat içinde TSB kontrolü yapınız.',
      clinicalNotes: [
        'Total bilirubin fototerapi eşiğine ulaşmış veya eşiği aşmıştır.',
        'Taburculuk iptal edilmeli, fototerapi başlanmalıdır.'
      ]
    };
  }

  // 0.1 – 1.9 mg/dL
  if (delta < 2.0) {
    if (ageHours < 24) {
      return {
        deltaMgDl: delta,
        matrixBand: '0.1 – 1.9 mg/dL',
        isDischargeEligible: false,
        actionCode: 'DELAY_DISCHARGE_OR_ADMIT',
        followUpTiming: '4–8 saat içinde TSB kontrolü',
        followUpModality: 'TSB_ONLY',
        dischargeRecommendation: 'Taburculuğu erteleyiniz; 4–8 saat içinde TSB kontrolü yapınız.',
        clinicalNotes: [
          'Yaşamın ilk 24 saatinde ve fototerapi eşiğine 2.0 mg/dL\'den yakındır.',
          'Taburculuk ertelenmeli, 4–8 saat sonra TSB tekrarlanmalıdır (AAP 2022 Tablo 4).'
        ]
      };
    } else {
      return {
        deltaMgDl: delta,
        matrixBand: '0.1 – 1.9 mg/dL',
        isDischargeEligible: false,
        actionCode: 'CLOSE_MONITORING_OR_HOME_PT',
        followUpTiming: '4–24 saatte TSB kontrolü',
        followUpModality: 'TSB_ONLY',
        dischargeRecommendation: '4–24 saat içinde TSB kontrolü önerilir (taburculuğu ertelemeyi veya evde fototerapiyi değerlendiriniz).',
        clinicalNotes: [
          'Seçenekler: Taburculuğu erteleyip fototerapi vermek; kriterler uygunsa evde fototerapi (yerel imkanlara ve hekim takdirine bağlı); çok yakın poliklinik takibiyle taburculuk.',
          'AAP 2022 Tablo 4.'
        ]
      };
    }
  }

  // 2.0 – 3.4 mg/dL
  if (delta < 3.5) {
    return {
      deltaMgDl: delta,
      matrixBand: '2.0 – 3.4 mg/dL',
      isDischargeEligible: true,
      actionCode: 'CLOSE_MONITORING',
      followUpTiming: '4 ila 24 saat içinde TSB veya TcB kontrolü',
      followUpModality: 'TSB_OR_TCB',
      dischargeRecommendation: '4 ila 24 saat içinde TSB veya TcB kontrolü planlayınız.',
      clinicalNotes: [
        'Eşikten uzaklık 2.0–3.4 mg/dL aralığındadır.',
        'Herhangi bir yaşta 4–24 saat içinde TSB veya TcB kontrolü önerilir (AAP 2022 Tablo 4).'
      ]
    };
  }

  // 3.5 – 5.4 mg/dL
  if (delta < 5.5) {
    return {
      deltaMgDl: delta,
      matrixBand: '3.5 – 5.4 mg/dL',
      isDischargeEligible: true,
      actionCode: 'INTERMEDIATE_MONITORING',
      followUpTiming: '1 ila 2 gün (24–48 saat) içinde TSB veya TcB kontrolü',
      followUpModality: 'TSB_OR_TCB',
      dischargeRecommendation: '1 ila 2 gün (24–48 saat) içinde TSB veya TcB kontrolü planlayınız.',
      clinicalNotes: [
        'Taburculuk planlanabilir.',
        '1 ila 2 gün içinde TSB veya TcB kontrolü önerilir (AAP 2022 Tablo 4 / TC-08).'
      ]
    };
  }

  // 5.5 – 6.9 mg/dL
  if (delta < 7.0) {
    if (ageHours < 72) {
      return {
        deltaMgDl: delta,
        matrixBand: '5.5 – 6.9 mg/dL',
        isDischargeEligible: true,
        actionCode: 'OUTPATIENT_48H',
        followUpTiming: '2 gün içinde klinik izlem',
        followUpModality: 'CLINICAL_OR_TEST',
        dischargeRecommendation: '2 gün içinde klinik izlem (sarılık ve beslenme değerlendirmesi; klinik şüphede TSB/TcB).',
        clinicalNotes: [
          'Taburculuk < 72 saat: 2 gün içinde klinik izlem; TcB veya TSB hekim kararına göre (AAP 2022 Tablo 4).'
        ]
      };
    } else {
      return {
        deltaMgDl: delta,
        matrixBand: '5.5 – 6.9 mg/dL',
        isDischargeEligible: true,
        actionCode: 'CLINICAL_DISCRETION',
        followUpTiming: 'Klinik karara göre izlem zamanlaması',
        followUpModality: 'CLINICAL_ROUTINE',
        dischargeRecommendation: 'Klinik yargıya ve risk durumuna göre sarılık ve beslenme izlemi.',
        clinicalNotes: [
          'Taburculuk ≥ 72 saat: Klinik karara ve risk durumuna göre izlem zamanlaması (AAP 2022 Tablo 4).'
        ]
      };
    }
  }

  // >= 7.0 mg/dL
  if (ageHours < 72) {
    return {
      deltaMgDl: delta,
      matrixBand: '≥ 7.0 mg/dL',
      isDischargeEligible: true,
      actionCode: 'OUTPATIENT_72H',
      followUpTiming: '3 gün içinde klinik izlem',
      followUpModality: 'CLINICAL_OR_TEST',
      dischargeRecommendation: '3 gün içinde rutin yenidoğan poliklinik izlemi.',
      clinicalNotes: [
        'Taburculuk < 72 saat ve delta ≥ 7.0 mg/dL: 3 gün içinde klinik izlem (AAP 2022 Tablo 4).'
      ]
    };
  } else {
    return {
      deltaMgDl: delta,
      matrixBand: '≥ 7.0 mg/dL',
      isDischargeEligible: true,
      actionCode: 'ROUTINE_CARE',
      followUpTiming: 'Rutin yenidoğan poliklinik izlemi',
      followUpModality: 'CLINICAL_ROUTINE',
      dischargeRecommendation: 'Rutin yenidoğan poliklinik izlemi.',
      clinicalNotes: [
        'Taburculuk ≥ 72 saat ve delta ≥ 7.0 mg/dL: Rutin yenidoğan poliklinik izlemi (AAP 2022 Tablo 4).'
      ]
    };
  }
}

/**
 * Geriye dönük uyumluluk için AAP 2022 Tablo 4 Takip Metni Üreticisi
 */
export function getAap2022FollowUpRecommendation(deltaPtMinusTsb: number, ageHours: number): string {
  return evaluateAap2022DischargeMatrix({ deltaMgDl: deltaPtMinusTsb, ageHours }).dischargeRecommendation;
}

/**
 * 5B. Fototerapi Sonlandırma & Rebound İzlem Motoru (AAP 2022 KAS 14 & 15)
 */
export function evaluatePhototherapyReboundRisk(params: PhototherapyReboundParams): Aap2022ReboundEvaluation {
  const {
    currentTsb,
    currentAgeHours,
    phototherapyThreshold,
    gestationalWeeks,
    phototherapyStartAgeHours,
    hasIsoimmuneHemolysis,
    hasHemolyticDisease
  } = params;

  // KAS 14: Fototerapi sonlandırma eşiği = Fototerapi eşiği - 2.0 mg/dL
  const discontinuationThreshold = Number((phototherapyThreshold - 2.0).toFixed(2));
  const isDiscontinuationPermitted = currentTsb <= discontinuationThreshold;
  const marginBelowThreshold = Number((phototherapyThreshold - currentTsb).toFixed(2));

  // KAS 15: Rebound risk faktörleri
  // 1. Erken fototerapi başlama (<48 saat)
  const isEarlyInitiation = Boolean(
    phototherapyStartAgeHours !== null &&
    phototherapyStartAgeHours !== undefined &&
    phototherapyStartAgeHours < 48
  );

  // 2. Pozitif DAT veya bilinen hemolitik hastalık
  const isPositiveDatOrHemolysis = Boolean(hasIsoimmuneHemolysis || hasHemolyticDisease);

  // 3. Gestasyonel yaş < 38 hafta (35 0/7 – 37 6/7)
  const gaWeeks = Math.floor(gestationalWeeks);
  const isNearTermGestationalAge = gaWeeks < 38;

  // 4. Kesilme anındaki TSB eşiğin hemen altında (<2.5 mg/dL marj)
  const isNarrowMargin = marginBelowThreshold < 2.5;

  const activeRiskLabels: string[] = [];
  if (isEarlyInitiation) {
    activeRiskLabels.push(`Erken fototerapi başlangıcı (${phototherapyStartAgeHours}. saatte başlanmış, <48 saat)`);
  }
  if (isPositiveDatOrHemolysis) {
    activeRiskLabels.push('Pozitif DAT / İzoimmün Hemoliz veya Hemolitik Hastalık');
  }
  if (isNearTermGestationalAge) {
    activeRiskLabels.push(`Gestasyonel yaş <38 hafta (${gestationalWeeks} hafta)`);
  }
  if (isNarrowMargin) {
    activeRiskLabels.push(`Eşiğe dar güvenlik marjı (Eşiğin ${marginBelowThreshold} mg/dL altı, <2.5 mg/dL)`);
  }

  const isHighReboundRisk = isEarlyInitiation || isPositiveDatOrHemolysis || isNearTermGestationalAge;
  const activeRiskCount = [isEarlyInitiation, isPositiveDatOrHemolysis, isNearTermGestationalAge, isNarrowMargin].filter(Boolean).length;

  const recommendations: string[] = [];
  let protocol = '';
  let reboundFollowUpHours = '';

  if (!isDiscontinuationPermitted) {
    recommendations.push(
      `AAP 2022 KAS 14 Kuralı: Fototerapi sonlandırılamaz! TSB (${currentTsb} mg/dL), kesilme eşiğinin (${discontinuationThreshold} mg/dL = FT Eşiği [${phototherapyThreshold}] - 2.0 mg/dL) üzerindedir. Yoğun fototerapiye devam edilmelidir.`
    );
  } else {
    recommendations.push(
      `AAP 2022 KAS 14 Kuralı Sağlandı: TSB (${currentTsb} mg/dL) o anki fototerapi eşiğinin en az 2.0 mg/dL altındadır (Kesilme Eşiği: ${discontinuationThreshold} mg/dL; Fark: ${marginBelowThreshold} mg/dL). Fototerapi sonlandırılabilir.`
    );
  }

  if (isHighReboundRisk) {
    reboundFollowUpHours = '6–12 saat';
    protocol = `YÜKSEK REBOUND RİSKİ: Bebekte rebound risk faktörü/faktörleri saptanmıştır (${activeRiskLabels.join(', ')}). Taburculuk ertelenmeli veya fototerapi kesildikten sonraki 6–12 saat içinde TSB kontrolü yapılmalıdır (AAP 2022 KAS 15).`;
    recommendations.push(
      'Taburculuğu erteleyiniz veya fototerapi kesildikten 6–12 saat sonra venöz TSB kontrolü organize ediniz.',
      'Rebound hiperbilirubinemi riski nedeniyle TcB yerine mutlaka serum total bilirubin (TSB) ölçümü tercih edilmelidir.'
    );
  } else {
    reboundFollowUpHours = '24–48 saat (1–2 gün)';
    protocol = 'DÜŞÜK REBOUND RİSKİ: Belirgin rebound risk faktörü saptanmamıştır (≥38 hafta, DAT negatif, ≥48 saatte başlanmış, güvenli düşüş). Fototerapi kesildikten sonra 24–48 saat (1–2 gün) sonra poliklinik kontrolü organize edilir (AAP 2022 KAS 15).';
    recommendations.push(
      'Taburculuk planlanabilir; fototerapi kesildikten 24–48 saat (1–2 gün) sonra poliklinik izlemi planlayınız.'
    );
  }

  return {
    currentTsb,
    currentAgeHours,
    phototherapyThreshold,
    discontinuationThreshold,
    isDiscontinuationPermitted,
    marginBelowThreshold,
    phototherapyStartAgeHours: phototherapyStartAgeHours ?? null,
    riskFactors: {
      isEarlyInitiation,
      isPositiveDatOrHemolysis,
      isNearTermGestationalAge,
      isNarrowMargin
    },
    activeRiskCount,
    activeRiskLabels,
    isHighReboundRisk,
    riskTier: isHighReboundRisk ? 'HIGH_REBOUND_RISK' : 'LOW_REBOUND_RISK',
    reboundFollowUpHours,
    protocol,
    recommendations
  };
}

/**
 * 5C. Transkütan Bilirubin (TcB) Doğrulama & Güvenlik Kalkanı (AAP 2022 KAS 6)
 */
export function evaluateTcBValidity(params: TcBValidityParams): TcBValidityEvaluation {
  const {
    measurementType,
    totalBilirubin,
    phototherapyThreshold,
    ageHours,
    gestationalWeeks,
    priorPhototherapyWithin24h
  } = params;

  if (measurementType === 'TSB') {
    return {
      measurementType: 'TSB',
      totalBilirubin,
      isValidForTreatmentDecision: true,
      isTsbMandatory: false,
      trigger: 'NONE',
      guidelineRule: 'Venöz total serum bilirubin (TSB) altın standart klinik ölçümdür.'
    };
  }

  // 1. Son 24 saat içinde fototerapi almış (Deri beyazlaması / Skin bleaching)
  if (priorPhototherapyWithin24h) {
    return {
      measurementType: 'TcB',
      totalBilirubin,
      isValidForTreatmentDecision: false,
      isTsbMandatory: true,
      trigger: 'PRIOR_PHOTOTHERAPY',
      warning: 'Son 24 saat içinde fototerapi almış bebeklerde deri/cilt beyazlaması (skin bleaching) nedeniyle TcB sahte olarak düşük çıkar; TcB kullanımı KESİNLİKLE YASAKTIR ve STAT venöz TSB zorunludur (AAP 2022 KAS 6).',
      guidelineRule: 'AAP 2022 KAS 6: Fototerapi sonrası 24 saat TcB kontrendikedir.'
    };
  }

  // 2. Yaşamın ilk 12 saati
  if (ageHours < 12) {
    return {
      measurementType: 'TcB',
      totalBilirubin,
      isValidForTreatmentDecision: false,
      isTsbMandatory: true,
      trigger: 'FIRST_12H',
      warning: 'Yaşamın ilk 12 saatinde sarılık patolojiktir; transkütan ölçüm (TcB) güvenilmezdir ve acil STAT venöz TSB ölçümü zorunludur (AAP 2022).',
      guidelineRule: 'AAP 2022: Yaşamın ilk 12 saatinde sarılık patolojik kabul edilir, STAT TSB zorunludur.'
    };
  }

  // 3. Prematüre bebek (<35 hafta)
  if (gestationalWeeks < 35) {
    return {
      measurementType: 'TcB',
      totalBilirubin,
      isValidForTreatmentDecision: false,
      isTsbMandatory: true,
      trigger: 'PRETERM',
      warning: 'Prematüre bebeklerde (<35 hafta) transkütan bilirubinometre (TcB) tedavi kararları için yeterli değildir; STAT venöz TSB zorunludur.',
      guidelineRule: 'TND / Maisels 2012: <35 haftada TcB tedavi kararı için güvenilemez.'
    };
  }

  // 4. Fototerapi eşiğine <= 3.0 mg/dL yakınlık veya eşik üstü (TC-04)
  const delta = Number((phototherapyThreshold - totalBilirubin).toFixed(2));
  if (delta <= 3.0) {
    return {
      measurementType: 'TcB',
      totalBilirubin,
      isValidForTreatmentDecision: false,
      isTsbMandatory: true,
      trigger: 'THRESHOLD_PROXIMITY',
      warning: `TcB fototerapi eşiğine 3 mg/dL yakındır (Eşik: ${phototherapyThreshold} mg/dL, Fark: ${delta} mg/dL). Tedavi öncesi STAT kan TSB ölçümü zorunludur (AAP 2022 KAS 6).`,
      guidelineRule: 'AAP 2022 KAS 6: TcB fototerapi eşiğinin 3.0 mg/dL içindeyse veya eşiği aşmışsa STAT TSB zorunludur.'
    };
  }

  // 5. TcB >= 15.0 mg/dL (Cihaz doygunluğu)
  if (totalBilirubin >= 15.0) {
    return {
      measurementType: 'TcB',
      totalBilirubin,
      isValidForTreatmentDecision: false,
      isTsbMandatory: true,
      trigger: 'TCB_HIGH_SATURATION',
      warning: 'TcB değeri ≥15.0 mg/dL ölçülmüştür; transkütan cihazın yüksek değerlerdeki doygunluk (saturation) ve non-lineer sapma riski nedeniyle STAT kan TSB ile doğrulanması zorunludur (AAP 2022 KAS 6).',
      guidelineRule: 'AAP 2022 KAS 6: TcB ≥ 15.0 mg/dL ise STAT TSB zorunludur.'
    };
  }

  return {
    measurementType: 'TcB',
    totalBilirubin,
    isValidForTreatmentDecision: true,
    isTsbMandatory: false,
    trigger: 'NONE',
    guidelineRule: 'TcB güvenli aralıktadır (Eşiğin >3.0 mg/dL altında ve <15.0 mg/dL).'
  };
}

/**
 * 6. Bilirubin / Albümin (B/A) Oranı Hesaplayıcısı (KAS 18)
 */
export function evaluateBilirubinAlbuminRatio(params: {
  tsbMgDl: number;
  albuminGPerDl: number;
  gestationalWeeks: number;
  hasRiskFactors: boolean;
}): {
  ratio: number;
  threshold: number;
  isThresholdExceeded: boolean;
  interpretation: string;
} | null {
  const { tsbMgDl, albuminGPerDl, gestationalWeeks, hasRiskFactors } = params;
  if (!albuminGPerDl || albuminGPerDl <= 0 || !tsbMgDl || tsbMgDl <= 0) return null;

  const ratio = Number((tsbMgDl / albuminGPerDl).toFixed(2));
  const ga = Math.floor(gestationalWeeks);

  let threshold = 8.0;
  if (ga >= 38 && !hasRiskFactors) {
    threshold = 8.0;
  } else if ((ga >= 38 && hasRiskFactors) || (ga >= 35 && ga < 38 && !hasRiskFactors)) {
    threshold = 7.2;
  } else if (ga >= 35 && ga < 38 && hasRiskFactors) {
    threshold = 6.8;
  } else {
    threshold = 6.8;
  }

  const isExceeded = ratio >= threshold;
  const interpretation = isExceeded
    ? `B/A Oranı (${ratio} mg/g) kan değişimi sınırını (${threshold}) AŞMIŞTIR! TSB eşik altında olsa dahi bu oran kan değişimi kararını güçlendirir (AAP 2022 KAS 18).`
    : `B/A Oranı: ${ratio} mg/g (Eşik: ${threshold} mg/g — Güvenli aralıkta).`;

  return {
    ratio,
    threshold,
    isThresholdExceeded: isExceeded,
    interpretation
  };
}

/**
 * Maisels 2012 Preterm Postmenstrüel Yaş (PMA) Konsensus Eşikleri (Dosya 4 Tablo 5 & 6)
 * Sabit haftalık adımlar halinde tanımlanır, enterpolasyon yapılmaz.
 * Risk varsa alt sınır (koruyucu), stabil bebekte üst sınır referans alınır.
 */
export const MAISELS_2012_PRETERM_BANDS: readonly PretermMaiselsBand[] = [
  {
    bandId: '<28',
    pmaRangeLabel: '<28 0/7 hafta',
    pmaWeeksMin: 0,
    pmaWeeksMax: 27.999,
    phototherapyMinMgDl: 5.0,
    phototherapyMaxMgDl: 6.0,
    phototherapyMinUmolL: 85,
    phototherapyMaxUmolL: 103,
    exchangeMinMgDl: 11.0,
    exchangeMaxMgDl: 14.0,
    exchangeMinUmolL: 188,
    exchangeMaxUmolL: 239
  },
  {
    bandId: '28-29',
    pmaRangeLabel: '28 0/7 - 29 6/7 hafta',
    pmaWeeksMin: 28.0,
    pmaWeeksMax: 29.999,
    phototherapyMinMgDl: 6.0,
    phototherapyMaxMgDl: 8.0,
    phototherapyMinUmolL: 103,
    phototherapyMaxUmolL: 137,
    exchangeMinMgDl: 12.0,
    exchangeMaxMgDl: 14.0,
    exchangeMinUmolL: 205,
    exchangeMaxUmolL: 239
  },
  {
    bandId: '30-31',
    pmaRangeLabel: '30 0/7 - 31 6/7 hafta',
    pmaWeeksMin: 30.0,
    pmaWeeksMax: 31.999,
    phototherapyMinMgDl: 8.0,
    phototherapyMaxMgDl: 10.0,
    phototherapyMinUmolL: 137,
    phototherapyMaxUmolL: 171,
    exchangeMinMgDl: 13.0,
    exchangeMaxMgDl: 16.0,
    exchangeMinUmolL: 222,
    exchangeMaxUmolL: 274
  },
  {
    bandId: '32-33',
    pmaRangeLabel: '32 0/7 - 33 6/7 hafta',
    pmaWeeksMin: 32.0,
    pmaWeeksMax: 33.999,
    phototherapyMinMgDl: 10.0,
    phototherapyMaxMgDl: 12.0,
    phototherapyMinUmolL: 171,
    phototherapyMaxUmolL: 205,
    exchangeMinMgDl: 15.0,
    exchangeMaxMgDl: 18.0,
    exchangeMinUmolL: 257,
    exchangeMaxUmolL: 308
  },
  {
    bandId: '34',
    pmaRangeLabel: '34 0/7 - 34 6/7 hafta',
    pmaWeeksMin: 34.0,
    pmaWeeksMax: 34.999,
    phototherapyMinMgDl: 12.0,
    phototherapyMaxMgDl: 14.0,
    phototherapyMinUmolL: 205,
    phototherapyMaxUmolL: 239,
    exchangeMinMgDl: 17.0,
    exchangeMaxMgDl: 19.0,
    exchangeMinUmolL: 291,
    exchangeMaxUmolL: 325
  }
];

/**
 * TND 2023 / NICE CG98 Dinamik Preterm Formülü
 * Plato (>72 saat): Eşik (mg/dL) = (GH x 0.6) - 6
 * Dinamik Rampa (0-72 saat): Eşik(t) = (min(72, t) / 72) x Plato
 */
export function calculatePretermTndNiceThreshold(params: {
  gestationalWeeks: number;
  ageHours: number;
}): PretermTndNiceFormula {
  const { gestationalWeeks, ageHours } = params;
  const plateauMgDl = Number(Math.max(4.0, (gestationalWeeks * 0.6) - 6).toFixed(1));
  const nicePlateauUmolL = Math.max(50, Math.round((gestationalWeeks * 10) - 100));

  const baselineMgDl = 2.5;
  const baselineUmolL = 40;

  const isRamping = ageHours < 72;
  const rampFactor = isRamping ? Math.max(0, ageHours) / 72 : 1.0;

  // HATA-M7-009: İlk saatlerde eşiğin sıfıra düşmesini önleyen fizyolojik kordon bilirubini bazal tabanı
  const dynamicMgDl = Number(Math.max(baselineMgDl, plateauMgDl * rampFactor).toFixed(1));
  const dynamicUmolL = Math.max(baselineUmolL, Math.round(nicePlateauUmolL * rampFactor));

  return {
    plateauThresholdMgDl: plateauMgDl,
    dynamicThresholdMgDl: dynamicMgDl,
    niceUmolLPlateau: nicePlateauUmolL,
    niceUmolLDynamic: dynamicUmolL,
    isRamping
  };
}

/**
 * 7. Prematüre Protokolü Yönlendiricisi (<35 Hafta)
 * Maisels 2012 PMA bantları ve TND 2023 / NICE Preterm formülü
 */
export function getPretermGuidance(weeks: number, days: number = 0, ageHours: number = 72): {
  pmaWeeks: number;
  maiselsPhototherapyRange: string;
  maiselsExchangeRange: string;
  tndNiceThreshold: number;
  rationale: string;
} {
  const pma = Number((weeks + (days / 7) + (ageHours / 168)).toFixed(1));
  let ptRange = '5 - 6 mg/dL';
  let exRange = '11 - 14 mg/dL';

  if (pma < 28) {
    ptRange = '5 - 6 mg/dL [Riskli: 5 mg/dL]';
    exRange = '11 - 14 mg/dL [Riskli: 11 mg/dL]';
  } else if (pma < 30) {
    ptRange = '6 - 8 mg/dL [Riskli: 6 mg/dL]';
    exRange = '12 - 14 mg/dL [Riskli: 12 mg/dL]';
  } else if (pma < 32) {
    ptRange = '8 - 10 mg/dL [Riskli: 8 mg/dL]';
    exRange = '13 - 16 mg/dL [Riskli: 13 mg/dL]';
  } else if (pma < 34) {
    ptRange = '10 - 12 mg/dL [Riskli: 10 mg/dL]';
    exRange = '15 - 18 mg/dL [Riskli: 15 mg/dL]';
  } else {
    ptRange = '12 - 14 mg/dL [Riskli: 12 mg/dL]';
    exRange = '17 - 19 mg/dL [Riskli: 17 mg/dL]';
  }

  // TND 2023 / NICE Preterm formülü (>72 saat için plato): Eşik = (GH * 0.6) - 6 (mg/dL)
  const niceThreshold = Number(Math.max(4.0, (weeks * 0.6) - 6).toFixed(1));

  return {
    pmaWeeks: pma,
    maiselsPhototherapyRange: ptRange,
    maiselsExchangeRange: exRange,
    tndNiceThreshold: niceThreshold,
    rationale: 'AAP 2022 <35 hafta bebekleri kapsamaz. Maisels 2012 konsensus PMA bantları ve TND 2023 / NICE Preterm formülü uygulanmalıdır.'
  };
}

/**
 * 7b. Maisels 2012 & TND 2023 Preterm Sarılık Karar Destek Motoru (<35 Hafta)
 */
export function evaluatePretermJaundice(params: PretermJaundiceParams): PretermJaundiceResult {
  const ageHours = Math.max(0, Number(params.ageHours || 0));
  const chronologicalAgeDays = Number((ageHours / 24).toFixed(1));
  let rawWeeks = Math.floor(Number(params.gestationalWeeks || 30));
  let rawDays = Math.max(0, Math.min(6, Math.floor(Number(params.gestationalDays || 0))));
  if (params.gestationalWeeks % 1 !== 0 && (!params.gestationalDays || params.gestationalDays === 0)) {
    const fraction = params.gestationalWeeks % 1;
    rawDays = Math.round(fraction * 7);
  }
  const totalBilirubin = Number(params.totalBilirubin || 0);
  const measurementType = params.measurementType === 'TcB' ? 'TcB' : 'TSB';
  const hasNeurotoxicityRisk = Boolean(params.hasNeurotoxicityRisk);

  const totalWeeksFraction = rawWeeks + (rawDays / 7);
  const pmaWeeks = Number((totalWeeksFraction + (ageHours / 168)).toFixed(2));

  // 1. Maisels Band Eşlemesi (PMA & Doğum Ağırlığı / IUGR Kalkanı - HATA-M7-010)
  const bwGrams = params.birthWeightGrams || (params.birthWeightKg ? params.birthWeightKg * 1000 : null);
  const hasElbwIrradianceShield = Boolean(bwGrams !== null && bwGrams < 750);

  let isPmaClamped = false;
  let pmaBandIndex = 0;
  if (pmaWeeks < 28.0) {
    pmaBandIndex = 0;
  } else if (pmaWeeks < 30.0) {
    pmaBandIndex = 1;
  } else if (pmaWeeks < 32.0) {
    pmaBandIndex = 2;
  } else if (pmaWeeks < 34.0) {
    pmaBandIndex = 3;
  } else if (pmaWeeks < 35.0) {
    pmaBandIndex = 4;
  } else {
    // Stanford Premie BiliRecs Tavan Kuralı: PMA >= 35 hafta olan bebekler 34 hafta tavanına kilitlenir
    pmaBandIndex = 4;
    isPmaClamped = true;
  }

  let finalBandIndex = pmaBandIndex;
  let isIugrDowngraded = false;

  if (bwGrams !== null && bwGrams > 0) {
    let weightBandIndex = 0;
    if (bwGrams < 1000) {
      weightBandIndex = 0;
    } else if (bwGrams < 1250) {
      weightBandIndex = 1;
    } else if (bwGrams < 1500) {
      weightBandIndex = 2;
    } else if (bwGrams < 2000) {
      weightBandIndex = 3;
    } else {
      weightBandIndex = 4;
    }

    // Maisels 2012 Temel Güvenlik Kuralı: Gestasyonel yaş ile doğum ağırlığı uyuşmuyorsa,
    // her zaman daha koruyucu olan düşük kategori (daha düşük eşik) seçilir!
    if (weightBandIndex < pmaBandIndex) {
      finalBandIndex = weightBandIndex;
      isIugrDowngraded = true;
    }
  }

  const band = MAISELS_2012_PRETERM_BANDS[finalBandIndex];

  // 2. Eşik Değerler (Risk varsa alt sınır, yoksa üst sınır)
  const effectivePt = hasNeurotoxicityRisk ? band.phototherapyMinMgDl : band.phototherapyMaxMgDl;
  const effectiveEx = hasNeurotoxicityRisk ? band.exchangeMinMgDl : band.exchangeMaxMgDl;
  const effectiveEsc = Number((effectiveEx - 2.0).toFixed(1));

  // 3. TND 2023 / NICE Dinamik Eşik
  const tndNice = calculatePretermTndNiceThreshold({ gestationalWeeks: rawWeeks, ageHours });

  // 5. Klinik Uyarılar & Öneriler
  const clinicalAlerts: PretermJaundiceResult['clinicalAlerts'] = [];
  clinicalAlerts.push({
    type: 'PRETERM_LOCK',
    severity: 'CRITICAL',
    title: 'PREMATÜRE GÜVENLİK KİLİDİ: AAP 2022 UYGULANAMAZ',
    message: `Bebek ${rawWeeks} hafta ${rawDays} günlüktür (PMA: ${pmaWeeks} hafta, <35 hafta). AAP 2022 term kılavuzu kilitlenmiştir; Maisels 2012 Konsensus PMA bantları ve TND 2023 / NICE Preterm protokolü uygulanmalıdır.`
  });

  if (isPmaClamped) {
    clinicalAlerts.push({
      type: 'PRETERM_PMA_CLAMPED_WARNING',
      severity: 'WARNING',
      title: 'STANFORD PREMIE BILIRECS: PMA TAVAN EŞİĞİ KİLİTLEMESİ',
      message: `Bebek postmenstrüel yaşta (PMA) ≥35 haftaya (${pmaWeeks} hafta) ulaşmıştır. Stanford Premie BiliRecs kuralına göre doğrudan term AAP eğrilerine geçirilmez; 34 0/7 - 34 6/7 hafta tavan eşiklerine (FT max 14.0 mg/dL, Kan Değişimi max 19.0 mg/dL) kilitlenmiştir.`
    });
  }

  if (hasElbwIrradianceShield) {
    clinicalAlerts.push({
      type: 'PRETERM_IRRADIANCE_WARNING',
      severity: 'CRITICAL',
      title: 'ELBW (<750 g) FOTOTERAPİ İRRADİYANS GÜVENLİK KALKANI',
      message: `<750 g aşırı düşük doğum ağırlıklı prematürelerde agresif yüksek irradiyanslı (≥30 µW/cm²/nm) fototerapinin mortaliteyi artırdığı gösterilmiştir (NICHD/Morris et al.). İrradiyans 15–20 µW/cm²/nm düzeyine titre edilmeli veya döngüsel (cycling) fototerapi uygulanmalıdır.`
    });
  }

  if (isIugrDowngraded && bwGrams !== null) {
    clinicalAlerts.push({
      type: 'PRETERM_IUGR_DOWNGRADE_WARNING',
      severity: 'WARNING',
      title: 'MAISELS 2012 IUGR / DÜŞÜK DOĞUM AĞIRLIĞI KALKANI',
      message: `Doğum ağırlığı (${bwGrams} g), gestasyonel yaşa (${rawWeeks} hafta, PMA ${pmaWeeks} hafta) göre daha düşük risk bandına uymaktadır. Maisels 2012 kuralı uyarınca daha koruyucu olan düşük kilo bandı (${band.pmaRangeLabel}) esas alınmıştır.`
    });
  }

  let requiresTsbConfirmation = false;
  let tsbConfirmationReason: string | undefined;
  if (params.isPriorPhototherapyWithin24h) {
    requiresTsbConfirmation = true;
    tsbConfirmationReason = 'Son 24 saatte fototerapi uygulanmış prematüre bebekte cilt beyazlaması nedeniyle TcB sahte düşük çıkar; STAT venöz TSB bakılmalıdır.';
  } else if (measurementType === 'TcB') {
    requiresTsbConfirmation = true;
    tsbConfirmationReason = 'Prematüre bebeklerde cilt ödemi ve ince stratum corneum nedeniyle TcB güvenilirliği düşüktür; tedavi kararları venöz STAT TSB ile doğrulanmalıdır.';
  }

  if (requiresTsbConfirmation && tsbConfirmationReason) {
    clinicalAlerts.push({
      type: 'TCB_CONFIRMATION',
      severity: 'WARNING',
      title: 'STAT TSB DOĞRULAMA ZORUNLULUĞU',
      message: tsbConfirmationReason
    });
  }

  // 6. Durum Değerlendirmesi
  const delta = Number((effectivePt - totalBilirubin).toFixed(2));
  let status: PretermJaundiceResult['status'] = 'LOW_RISK';
  let alertClass: PretermJaundiceResult['alertClass'] = 'success';
  let interpretation = '';

  if (totalBilirubin >= effectiveEx) {
    status = 'EXCHANGE_TRANSFUSION_REQUIRED';
    alertClass = 'danger';
    interpretation = `ACİL KAN DEĞİŞİMİ EŞİĞİ AŞILDI (${totalBilirubin} mg/dL ≥ KD Eşiği: ${effectiveEx} mg/dL [${band.pmaRangeLabel}]). Acil kan değişimi hazırlığı ve yoğun LED fototerapi başlatınız.`;
    clinicalAlerts.push({
      type: 'EXCHANGE',
      severity: 'CRITICAL',
      title: 'ACİL KAN DEĞİŞİMİ ALARMI',
      message: interpretation
    });
  } else if (totalBilirubin >= effectiveEsc) {
    status = 'ESCALATION_OF_CARE';
    alertClass = 'danger';
    interpretation = `ACİL BAKIM ESKALASYONU: TSB düzeyi (${totalBilirubin} mg/dL), kan değişimi eşiğine (${effectiveEx} mg/dL) ≤2.0 mg/dL yaklaşmıştır. Kesintisiz çoklu fototerapi ve STAT tetkik istemi yapınız.`;
    clinicalAlerts.push({
      type: 'ESCALATION',
      severity: 'CRITICAL',
      title: 'ACİL BAKIM ESKALASYONU',
      message: interpretation
    });
  } else if (totalBilirubin >= effectivePt) {
    status = 'PHOTOTHERAPY_REQUIRED';
    alertClass = 'warning';
    interpretation = `FOTOTERAPİ ENDİKASYONU (${totalBilirubin} mg/dL ≥ FT Eşiği: ${effectivePt} mg/dL [${band.pmaRangeLabel}]). Yoğun LED fototerapi başlatılmalıdır.`;
  } else if (delta <= 2.0) {
    status = 'CLOSE_MONITORING';
    alertClass = 'info';
    interpretation = `Yakın izlem bölgesi: TSB (${totalBilirubin} mg/dL), fototerapi eşiğinin (${effectivePt} mg/dL) ${delta} mg/dL altındadır. 6-12 saatte bir TSB kontrolü yapınız.`;
  } else {
    status = 'LOW_RISK';
    alertClass = 'success';
    interpretation = `Bilirubin güvenli aralıkta (${totalBilirubin} mg/dL < FT Eşiği: ${effectivePt} mg/dL [${band.pmaRangeLabel}]).`;
  }

  const recommendations: string[] = [
    `Maisels 2012 Konsensus PMA Bandı (${band.pmaRangeLabel}): Fototerapi ${band.phototherapyMinMgDl}–${band.phototherapyMaxMgDl} mg/dL (${band.phototherapyMinUmolL}–${band.phototherapyMaxUmolL} µmol/L), Kan Değişimi ${band.exchangeMinMgDl}–${band.exchangeMaxMgDl} mg/dL (${band.exchangeMinUmolL}–${band.exchangeMaxUmolL} µmol/L).`,
    `TND 2023 / NICE Preterm Eşiği: ${tndNice.dynamicThresholdMgDl} mg/dL (${tndNice.niceUmolLDynamic} µmol/L)${tndNice.isRamping ? ` [0-72h dinamik rampa; 72h plato: ${tndNice.plateauThresholdMgDl} mg/dL]` : ''}.`,
    hasNeurotoxicityRisk
      ? 'Nörotoksisite riski mevcut: Maisels bandının en alt eşiği (en koruyucu sınır) referans alınmıştır.'
      : 'Nörotoksisite riski yok: Stabil bebek için Maisels üst eşik sınırı referans alınmıştır.',
    'Prematüre bebekte TcB yerine güvenilir venöz serum total bilirubin (TSB) takibi yapınız.'
  ];

  if (hasElbwIrradianceShield) {
    recommendations.push('Aşırı düşük doğum ağırlıklı (<750 g) bebek: Fototerapi irradiyansını 15–20 µW/cm²/nm düzeyinde tutunuz (yüksek güç mortaliteyi artırabilir).');
  }

  return {
    isValid: true,
    gestationalAge: {
      weeks: rawWeeks,
      days: rawDays,
      totalWeeksFraction
    },
    chronologicalAgeHours: ageHours,
    chronologicalAgeDays,
    pmaWeeks,
    isPmaClamped,
    activeMaiselsBand: band,
    maiselsThresholds: {
      phototherapyRangeMgDl: [band.phototherapyMinMgDl, band.phototherapyMaxMgDl],
      phototherapyRangeUmolL: [band.phototherapyMinUmolL, band.phototherapyMaxUmolL],
      exchangeRangeMgDl: [band.exchangeMinMgDl, band.exchangeMaxMgDl],
      exchangeRangeUmolL: [band.exchangeMinUmolL, band.exchangeMaxUmolL],
      effectivePhototherapyMgDl: effectivePt,
      effectiveExchangeMgDl: effectiveEx
    },
    tndNiceFormula: tndNice,
    effectiveThresholds: {
      phototherapy: effectivePt,
      escalation: effectiveEsc,
      exchange: effectiveEx
    },
    deltaFromPhototherapy: delta,
    status,
    alertClass,
    requiresTsbConfirmation,
    tsbConfirmationReason,
    hasElbwIrradianceShield,
    interpretation,
    recommendations,
    clinicalAlerts
  };
}

/**
 * 8. Bilirubin Saatlik Artış Hızı Hesaplayıcısı (AAP 2022 KAS 7)
 * Eşikler: İlk 24 saatte >= 0.3 mg/dL/saat, 24 saat sonrasında >= 0.2 mg/dL/saat patolojik hemoliz göstergesidir.
 */
export function calculateBilirubinRateOfRise(
  currentTsb: number,
  currentAgeHours: number,
  previousTsb: number,
  previousAgeHours: number
): Aap2022RateOfRiseAnalysis | null {
  const deltaTsb = currentTsb - previousTsb;
  const deltaHours = currentAgeHours - previousAgeHours;
  if (deltaHours <= 0) return null;

  const rate = Number((deltaTsb / deltaHours).toFixed(2));
  const threshold = currentAgeHours <= 24 ? 0.3 : 0.2;
  const isRapidRise = rate >= threshold;

  return {
    previousTsbMgDl: previousTsb,
    previousAgeHours,
    deltaTsbMgDl: Number(deltaTsb.toFixed(2)),
    deltaHours: Number(deltaHours.toFixed(2)),
    rateMgDlPerHour: rate,
    isRapidRise,
    thresholdMgDlPerHour: threshold,
    interpretation: isRapidRise
      ? `Bilirubin saatlik artış hızı (${rate} mg/dL/saat), patolojik hemoliz eşiğini (≥${threshold} mg/dL/saat) aşmıştır (AAP 2022 KAS 7). Acil DAT (Coombs), tam kan ve periferik yayma çalışınız.`
      : `Bilirubin saatlik artış hızı (${rate} mg/dL/saat) fizyolojik sınırlar içerisindedir (<${threshold} mg/dL/saat).`
  };
}

/**
 * 9. Akut Bilirubin Ensefalopatisi (ABE) Değerlendiricisi (AAP 2022 KAS 19 & 20)
 * İleri/orta evre ABE (hipertoni, retrokollis, opistotonus, tiz ağlama) saptandığında
 * TSB düzeyine bakılmaksızın derhal acil kan değişimi yapılmalıdır.
 */
export function evaluateAbeSymptoms(symptoms?: Aap2022AbeSymptoms | null): {
  isAbeSuspected: boolean;
  isImmediateExchangeTriggered: boolean;
  reportedSymptoms: string[];
  guidelineAction: string;
} {
  if (!symptoms) {
    return {
      isAbeSuspected: false,
      isImmediateExchangeTriggered: false,
      reportedSymptoms: [],
      guidelineAction: 'ABE semptomu bildirilmedi.'
    };
  }

  const reported: string[] = [];
  if (symptoms.lethargyOrStupor) reported.push('Letarji / Stupor / Uyandırma güçlüğü');
  if (symptoms.poorFeedingOrRefusal) reported.push('Zayıf emme / Beslenmeyi bütünüyle reddetme');
  if (symptoms.hypertonia) reported.push('Hipertoni / Rijidite');
  if (symptoms.retrocollis) reported.push('Retrokollis (boynun geriye kasılması)');
  if (symptoms.opisthotonos) reported.push('Opistotonus (gövdenin yay gibi bükülmesi)');
  if (symptoms.highPitchedCry) reported.push('Tiz, keskin ağlama (High-pitched cry)');
  if (symptoms.seizuresOrFever) reported.push('Konvülsiyon / Santral ateş');

  const advancedSigns = Boolean(
    symptoms.hypertonia ||
    symptoms.retrocollis ||
    symptoms.opisthotonos ||
    symptoms.highPitchedCry ||
    symptoms.seizuresOrFever
  );

  const isSuspected = reported.length > 0;
  const isImmediate = advancedSigns || (Boolean(symptoms.lethargyOrStupor) && Boolean(symptoms.poorFeedingOrRefusal));

  return {
    isAbeSuspected: isSuspected,
    isImmediateExchangeTriggered: isImmediate,
    reportedSymptoms: reported,
    guidelineAction: isImmediate
      ? 'AAP 2022 KAS 19 & 20: Akut Bilirubin Ensefalopatisi (ABE) bulguları mevcuttur. TSB DÜZEYİNE BAKILMAKSIZIN DERHAL ACİL KAN DEĞİŞİMİ YAPILMALIDIR!'
      : isSuspected
      ? 'Erken evre ABE şüphesi mevcuttur; yakın nörolojik izlem ve yoğun fototerapi sürdürülmelidir.'
      : 'ABE semptomu bildirilmedi.'
  };
}

/**
 * 10. Acil Bakım Eskalasyonu Protokolü & İstem Paketi Üreticisi (AAP 2022 KAS 17)
 */
export function generateAap2022EscalationProtocol(params: {
  tsb: number;
  exchangeThreshold: number;
  hasIsoimmuneHemolysis: boolean;
  albumin?: number | null;
}): Aap2022EscalationProtocol {
  const { tsb, exchangeThreshold, hasIsoimmuneHemolysis } = params;
  return {
    isEscalationActive: true,
    urgency: 'MEDICAL_EMERGENCY',
    targetNicuTransfer: 'Doğrudan Yenidoğan Yoğun Bakım Ünitesine (YYBÜ) acil yatış organize ediniz. Bebek acil serviste veya doğum servisinde bekletilmemelidir.',
    phototherapyRegimen: 'Kesintisiz Yoğun İkili/Çoklu LED Fototerapi (460–490 nm, irradiyans ≥ 30 µW/cm²/nm, maksimum vücut yüzeyi, alt bezi küçültülmüş, gözler korumalı).',
    hydrationProtocol: 'IV hidrasyon başlatınız (idame sıvısına ek olarak %10-20 insensibl/fototerapi kaybı hidrasyonu). DİKKAT: Rutin oral su veya dekstroz solüsyonu verilmesi kesinlikle yasaktır.',
    statOrderBundle: [
      'STAT Serum Total ve Direkt Bilirubin (her 2 saatte bir takip)',
      'STAT Serum Albümin (B/A oranı hesaplaması ve hipoalbüminemi tespiti için zorunlu)',
      'STAT Anne ve Bebek Kan Grubu + Rh Tayini',
      'STAT Direkt Antiglobulin Testi (DAT / Coombs)',
      'STAT Tam Kan Sayımı (CBC) + Periferik Yayma (sferositoz, şistozit, eliptositoz kontrolü)',
      'STAT Retikülosit Sayımı (eritropoez ve hemoliz aktivitesi)',
      'STAT Kan Bankası İstem: 2 Ünite Uygun Işınlanmış, Lökositi Azaltılmış Eritrosit Süspansiyonu + Taze Donmuş Plazma (Kan Değişimi Hazırlığı)',
      'STAT Serum Elektrolitleri (Na, K, Ca) ve Kan Gazı (asidoz ve iyonize hipokalsemi kontrolü)'
    ],
    reassessmentIntervalHours: 2,
    ivigProtocol: hasIsoimmuneHemolysis
      ? {
          recommended: true,
          dose: '0.5 – 1.0 g/kg IV infüzyon, 2 saatte verilir.',
          indication: 'İzoimmün hemolitik hastalıkta (DAT+ / Rh / ABO) TSB kan değişimi eşiğine ≤2.0–3.0 mg/dL yaklaştığında veya yoğun fototerapiye rağmen artıyorsa uygulanır (AAP 2022 KAS 16 & 17).',
          repeatInterval: 'Gereğinde 12 saat sonra bir doz daha tekrarlanabilir.'
        }
      : null
  };
}

/**
 * 11. AAP 2022 Kapsamlı Yenidoğan Hiperbilirubinemi & Eskalasyon Karar Destek Motoru
 */
export function evaluateAap2022Jaundice(params: Aap2022JaundiceParams): Aap2022JaundiceResult {
  const ageHours = Number(params.ageHours);
  const totalBilirubin = Number(params.totalBilirubin);
  const gaWeeks = Number(params.gestationalWeeks !== undefined && params.gestationalWeeks !== null ? params.gestationalWeeks : 39);
  const gaDays = Number(params.gestationalDays || 0);
  const measurementType = params.measurementType === 'TcB' ? 'TcB' : 'TSB';
  const hasNeurotoxicityRisk = Boolean(params.hasNeurotoxicityRisk);
  const albumin = params.albuminGPerDl !== undefined && params.albuminGPerDl !== null ? Number(params.albuminGPerDl) : null;
  const directBili = params.directBilirubinMgDl !== undefined && params.directBilirubinMgDl !== null ? Number(params.directBilirubinMgDl) : null;

  if (isNaN(ageHours) || isNaN(totalBilirubin) || ageHours < 0 || totalBilirubin <= 0) {
    return {
      isValid: false,
      message: 'Lütfen geçerli bir postnatal yaş (saat) ve bilirubin değeri (mg/dL) giriniz.',
      ageHours: ageHours || 0,
      totalBilirubin: totalBilirubin || 0,
      gestationalAge: {
        inputWeeks: gaWeeks,
        inputDays: gaDays,
        truncatedWeeks: Math.floor(gaWeeks),
        isPreterm: gaWeeks < 35,
        isAapBlocked: gaWeeks < 35
      },
      measurementType,
      hasNeurotoxicityRisk,
      thresholds: { phototherapy: 0, escalation: 0, exchange: 0 },
      deltaFromPhototherapy: 0,
      status: 'LOW_RISK',
      alertClass: 'info',
      requiresTsbConfirmation: false,
      followUpRecommendation: '',
      interpretation: 'Geçersiz parametreler.',
      recommendations: [],
      clinicalAlerts: []
    };
  }

  // 1. Gestasyonel Yaş Kırpma & Prematüre Güvenlik Kilidi (<35 Hafta)
  const gaInfo = truncateGestationalWeeks(gaWeeks, gaDays);
  const clinicalAlerts: Aap2022JaundiceResult['clinicalAlerts'] = [];
  const recommendations: string[] = [];

  // 2. Nörotoksisite Risk Faktörleri Tabakalandırması (AAP 2022 Tablo 1 & Tablo 2)
  const riskFactors = params.riskFactors || {};
  const hasNeuroRiskFlag = Boolean(params.hasNeurotoxicityRisk);
  const hypoalbuminemia = Boolean(riskFactors.hypoalbuminemia) || (albumin !== null && albumin < 3.0);
  const isoimmuneHemolysis = Boolean(riskFactors.isoimmuneHemolysis);
  const g6pdDeficiency = Boolean(riskFactors.g6pdDeficiency);
  const sepsis = Boolean(riskFactors.sepsis);
  const clinicalInstability = Boolean(riskFactors.clinicalInstability);
  let rapidRiseHemolysis = Boolean(riskFactors.rapidRiseHemolysis);

  // Bilirubin Saatlik Artış Hızı Analizi (KAS 7)
  let rateOfRiseAnalysis: Aap2022RateOfRiseAnalysis | null = null;
  if (
    params.previousTsbMgDl !== undefined &&
    params.previousTsbMgDl !== null &&
    params.previousAgeHours !== undefined &&
    params.previousAgeHours !== null
  ) {
    rateOfRiseAnalysis = calculateBilirubinRateOfRise(
      totalBilirubin,
      ageHours,
      Number(params.previousTsbMgDl),
      Number(params.previousAgeHours)
    );
    if (rateOfRiseAnalysis && rateOfRiseAnalysis.isRapidRise) {
      rapidRiseHemolysis = true;
      clinicalAlerts.push({
        type: 'HEMOLYSIS_RATE',
        severity: 'CRITICAL',
        title: 'KAS 7: PATOLOJİK BİLİRUBİN ARTIŞ HIZI (HEMOLİZ ŞÜPHESİ)',
        message: rateOfRiseAnalysis.interpretation
      });
    }
  }

  const effectiveNeuroRisk =
    hasNeuroRiskFlag ||
    hypoalbuminemia ||
    isoimmuneHemolysis ||
    g6pdDeficiency ||
    sepsis ||
    clinicalInstability ||
    rapidRiseHemolysis;

  const activeRisks: string[] = [];
  if (hypoalbuminemia) activeRisks.push(`Hipoalbüminemi (Albümin ${albumin !== null ? albumin : '<3.0'} g/dL)`);
  if (isoimmuneHemolysis) activeRisks.push('İzoimmün Hemoliz (DAT+ / Kan Grubu Uyuşmazlığı)');
  if (g6pdDeficiency) activeRisks.push('G6PD Eksikliği / Hemolitik Enzimopati');
  if (sepsis) activeRisks.push('Sepsis / Ağır Sistemik Enfeksiyon');
  if (clinicalInstability) activeRisks.push('Klinik İnstabilite (Asidoz / Hipotansiyon / Mekanik Ventilasyon)');
  if (rapidRiseHemolysis) activeRisks.push('Patolojik Bilirubin Artış Hızı (KAS 7)');

  const riskFactorDetails = {
    hypoalbuminemia,
    isoimmuneHemolysis,
    g6pdDeficiency,
    sepsis,
    clinicalInstability,
    rapidRiseHemolysis,
    activeRisks
  };

  // G6PD Yalancı Negatiflik Hatırlatması (Tablo 4)
  if (g6pdDeficiency) {
    clinicalAlerts.push({
      type: 'G6PD_RETEST_REMINDER',
      severity: 'WARNING',
      title: 'G6PD YALANCI NEGATİFLİK UYARISI & 3 AY SONRA TEST TEKRARI',
      message: 'Akut hemoliz sırasında genç retikülositlerdeki yüksek enzim aktivitesi nedeniyle G6PD düzeyi sahte normal (false negative) çıkabilir. Şüpheli vakalarda 3 ay sonra test tekrarı yapılmalıdır (AAP 2022).'
    });
  }

  // Akut Bilirubin Ensefalopatisi (ABE) Değerlendirmesi (KAS 19 & 20)
  const abeAssessment = evaluateAbeSymptoms(params.abeSymptoms);
  if (abeAssessment.isImmediateExchangeTriggered) {
    clinicalAlerts.push({
      type: 'ABE_EMERGENCY',
      severity: 'CRITICAL',
      title: 'AKUT BİLİRUBİN ENSEFALOPATİSİ (ABE) ACİL KAN DEĞİŞİMİ ALARMI (AAP 2022 KAS 19 & 20)',
      message: abeAssessment.guidelineAction
    });
  }

  // Prematüre Güvenlik Kilidi (<35 Hafta Kesme Kuralı)
  if (gaInfo.isPreterm) {
    const pretermResult = evaluatePretermJaundice({
      gestationalWeeks: gaInfo.inputWeeks,
      gestationalDays: gaInfo.inputDays,
      ageHours,
      totalBilirubin,
      measurementType,
      hasNeurotoxicityRisk: effectiveNeuroRisk,
      birthWeightGrams: params.birthWeightGrams,
      birthWeightKg: params.birthWeightKg,
      isPriorPhototherapyWithin24h: params.priorPhototherapyWithin24h
    });

    const pretermGuidance = getPretermGuidance(gaInfo.inputWeeks, gaInfo.inputDays, ageHours);

    for (const alert of pretermResult.clinicalAlerts) {
      if (!clinicalAlerts.some(a => a.type === alert.type)) {
        clinicalAlerts.push(alert);
      }
    }

    const isExNeeded = totalBilirubin >= pretermResult.effectiveThresholds.exchange;
    const isEscNeeded = totalBilirubin >= pretermResult.effectiveThresholds.escalation;
    const isPtNeeded = totalBilirubin >= pretermResult.effectiveThresholds.phototherapy;

    // HATA-M7-011: Preterm B/A Oranı Analizi & Hipoalbüminemi Kalkanı
    let pretermBaResult: Aap2022JaundiceResult['bilirubinAlbuminRatio'] = null;
    if (albumin !== null && albumin > 0) {
      pretermBaResult = evaluateBilirubinAlbuminRatio({
        tsbMgDl: totalBilirubin,
        albuminGPerDl: albumin,
        gestationalWeeks: gaInfo.truncatedWeeks,
        hasRiskFactors: effectiveNeuroRisk
      });

      if (pretermBaResult && pretermBaResult.isThresholdExceeded) {
        clinicalAlerts.push({
          type: 'BA_RATIO',
          severity: 'CRITICAL',
          title: 'PREMATÜRE B/A ORANI KAN DEĞİŞİMİ EŞİĞİ AŞILDI (AAP & TND)',
          message: pretermBaResult.interpretation
        });
      }
    } else if (isEscNeeded || isExNeeded) {
      clinicalAlerts.push({
        type: 'ALBUMIN_MANDATORY_WARNING',
        severity: 'WARNING',
        title: 'STAT SERUM ALBÜMİN ÇALIŞILMASI ZORUNLUDUR (AAP 2022 KAS 18)',
        message: '⚠️ DİKKAT: Serum albümini girilmedi. Prematürelerde kan değişimi / eskalasyon eşiğine yaklaşan bebeklerde hipoalbüminemi serbest bilirubini artırır; B/A oranını hesaplamak için STAT serum albümin bakınız.'
      });
    }

    // HATA-M7-008: Preterm Rebound ve Fototerapi Sonlandırma İzlemi
    let pretermReboundEvaluation: Aap2022ReboundEvaluation | null = null;
    const isReboundEval = Boolean(
      params.isPhototherapyDiscontinuationEvaluation ||
      params.priorPhototherapyWithin24h ||
      (params.phototherapyStartAgeHours !== undefined && params.phototherapyStartAgeHours !== null)
    );

    if (isReboundEval) {
      pretermReboundEvaluation = evaluatePhototherapyReboundRisk({
        currentTsb: totalBilirubin,
        currentAgeHours: ageHours,
        phototherapyThreshold: pretermResult.effectiveThresholds.phototherapy,
        gestationalWeeks: gaInfo.truncatedWeeks,
        gestationalDays: gaInfo.inputDays,
        phototherapyStartAgeHours: params.phototherapyStartAgeHours,
        hasIsoimmuneHemolysis: isoimmuneHemolysis,
        hasHemolyticDisease: g6pdDeficiency
      });

      pretermReboundEvaluation.isHighReboundRisk = true;
      pretermReboundEvaluation.riskTier = 'HIGH_REBOUND_RISK';
      pretermReboundEvaluation.reboundFollowUpHours = '6–12 saat içinde kontrol TSB';
      pretermReboundEvaluation.protocol = `Prematüre bebek (<35 hafta) karaciğer konjugasyon immatüritesi nedeniyle yüksek rebound riski taşır; fototerapi sonlandırıldıktan 6–12 saat sonra venöz TSB kontrolü zorunludur.`;

      clinicalAlerts.push({
        type: 'REBOUND_HIGH_RISK',
        severity: 'CRITICAL',
        title: 'PREMATÜRE YÜKSEK REBOUND RİSKİ ALARMI (AAP & TND)',
        message: pretermReboundEvaluation.protocol
      });
    }

    // Direkt Bilirubin Analizi
    let pretermDirectAnalysis: Aap2022JaundiceResult['directBilirubinAnalysis'] = null;
    if (directBili !== null && directBili > 0) {
      const pct = Number(((directBili / totalBilirubin) * 100).toFixed(1));
      const isCholestasis = pct > 50.0 || directBili > 1.0;
      let warning: string | undefined;

      clinicalAlerts.push({
        type: 'NON_SUBTRACTION_RULE',
        severity: 'INFO',
        title: 'NON-SUBTRACTION KURALI (AAP 2022)',
        message: 'Direkt bilirubin Total Serum Bilirubin (TSB) değerinden DÜŞÜLMEZ. Fototerapi ve kan değişimi kararları net TSB değerine göre verilir.'
      });

      if (isCholestasis) {
        warning = 'Direkt bilirubin >%50 TSB veya >1.0 mg/dL: Kolestaz ve Bronz Bebek Sendromu riski. Hepatobiliyer inceleme ve pediatrik gastroenteroloji konsültasyonu planlayınız.';
        clinicalAlerts.push({
          type: 'CHOLESTASIS_BRONZE',
          severity: 'WARNING',
          title: 'KOLESTAZ & BRONZ BEBEK SENDROMU UYARISI',
          message: warning
        });
      }

      pretermDirectAnalysis = {
        directBilirubinMgDl: directBili,
        percentageOfTotal: pct,
        isCholestasisSuspected: isCholestasis,
        warning
      };
    }

    let pretermStatus: Aap2022JaundiceResult['status'] = 'PRETERM_ROUTED';
    let alertClass: Aap2022JaundiceResult['alertClass'] = 'info';

    if (isExNeeded) {
      pretermStatus = 'EXCHANGE_TRANSFUSION_REQUIRED';
      alertClass = 'danger';
    } else if (isEscNeeded) {
      pretermStatus = 'ESCALATION_OF_CARE';
      alertClass = 'danger';
    } else if (isPtNeeded) {
      pretermStatus = 'PHOTOTHERAPY_REQUIRED';
      alertClass = 'warning';
    }

    return {
      isValid: true,
      ageHours,
      totalBilirubin,
      gestationalAge: {
        inputWeeks: gaInfo.inputWeeks,
        inputDays: gaInfo.inputDays,
        truncatedWeeks: gaInfo.truncatedWeeks,
        isPreterm: true,
        isAapBlocked: true
      },
      measurementType,
      hasNeurotoxicityRisk: effectiveNeuroRisk,
      riskFactorDetails,
      abeAssessment,
      rateOfRiseAnalysis,
      escalationProtocol: isEscNeeded
        ? generateAap2022EscalationProtocol({
            tsb: totalBilirubin,
            exchangeThreshold: pretermResult.effectiveThresholds.exchange,
            hasIsoimmuneHemolysis: isoimmuneHemolysis,
            albumin
          })
        : null,
      thresholds: {
        phototherapy: pretermResult.effectiveThresholds.phototherapy,
        escalation: pretermResult.effectiveThresholds.escalation,
        exchange: pretermResult.effectiveThresholds.exchange
      },
      deltaFromPhototherapy: pretermResult.deltaFromPhototherapy,
      status: pretermStatus,
      alertClass,
      requiresTsbConfirmation: measurementType === 'TcB',
      followUpRecommendation: 'Prematüre bebeklerde sarılık takibi YYBÜ protokollerine göre yürütülmelidir.',
      interpretation: `HATA: Bebek <35 hafta (prematüre: ${gaInfo.inputWeeks} hafta ${gaInfo.inputDays} gün, PMA: ${pretermResult.pmaWeeks}h). AAP 2022 uygulanamaz. Maisels 2012 PMA bandı: FT ${pretermGuidance.maiselsPhototherapyRange}; TND/NICE Preterm Eşiği: ${pretermResult.tndNiceFormula.dynamicThresholdMgDl} mg/dL.`,
      recommendations: [
        'AAP 2022 eğrileri kilitlenmiştir; bebeğin gebelik haftası <35 hafta olduğu için term eşikleri uygulanamaz.',
        `Maisels 2012 Konsensus Eşiği: Fototerapi ${pretermGuidance.maiselsPhototherapyRange}, Kan Değişimi ${pretermGuidance.maiselsExchangeRange}.`,
        `TND 2023 / NICE Preterm Plato Eşiği: ${pretermGuidance.tndNiceThreshold} mg/dL (Dinamik eşik: ${pretermResult.tndNiceFormula.dynamicThresholdMgDl} mg/dL).`,
        'Prematüre bebekte TcB yerine güvenilir serum total bilirubin (TSB) takibi yapınız.'
      ],
      clinicalAlerts,
      bilirubinAlbuminRatio: pretermBaResult,
      directBilirubinAnalysis: pretermDirectAnalysis,
      dischargeEvaluation: null,
      reboundEvaluation: pretermReboundEvaluation,
      tcBValidity: evaluateTcBValidity({
        measurementType,
        totalBilirubin,
        phototherapyThreshold: pretermResult.effectiveThresholds.phototherapy,
        ageHours,
        gestationalWeeks: gaInfo.truncatedWeeks,
        priorPhototherapyWithin24h: params.priorPhototherapyWithin24h
      }),
      pretermGuidance: {
        ...pretermGuidance,
        pretermResult
      }
    };
  }

  // 3. Eşiklerin Hesaplanması (AAP 2022 Doğrusal Enterpolasyon)
  const thresholds = calculateAap2022Thresholds(gaInfo.truncatedWeeks, effectiveNeuroRisk, ageHours);
  const delta = Number((thresholds.phototherapy - totalBilirubin).toFixed(2));

  // 4. Direkt Bilirubinin Düşülmemesi Kuralı & Kolestaz Analizi
  let directAnalysis: Aap2022JaundiceResult['directBilirubinAnalysis'] = null;
  if (directBili !== null && directBili > 0) {
    const pct = Number(((directBili / totalBilirubin) * 100).toFixed(1));
    const isCholestasis = pct > 50.0 || directBili > 1.0;
    let warning: string | undefined;

    clinicalAlerts.push({
      type: 'NON_SUBTRACTION_RULE',
      severity: 'INFO',
      title: 'NON-SUBTRACTION KURALI (AAP 2022)',
      message: 'Direkt bilirubin Total Serum Bilirubin (TSB) değerinden DÜŞÜLMEZ. Fototerapi ve kan değişimi kararları net TSB değerine göre verilir.'
    });

    if (isCholestasis) {
      warning = 'Direkt bilirubin >%50 TSB veya >1.0 mg/dL: Kolestaz ve Bronz Bebek Sendromu riski. Hepatobiliyer inceleme ve pediatrik gastroenteroloji konsültasyonu planlayınız.';
      clinicalAlerts.push({
        type: 'CHOLESTASIS_BRONZE',
        severity: 'WARNING',
        title: 'KOLESTAZ & BRONZ BEBEK SENDROMU UYARISI',
        message: warning
      });
    }

    directAnalysis = {
      directBilirubinMgDl: directBili,
      percentageOfTotal: pct,
      isCholestasisSuspected: isCholestasis,
      warning
    };
  }

  // 5. Bilirubin / Albümin (B/A) Oranı Analizi (AAP 2022 KAS 18)
  let baResult: Aap2022JaundiceResult['bilirubinAlbuminRatio'] = null;
  if (albumin !== null && albumin > 0) {
    baResult = evaluateBilirubinAlbuminRatio({
      tsbMgDl: totalBilirubin,
      albuminGPerDl: albumin,
      gestationalWeeks: gaInfo.truncatedWeeks,
      hasRiskFactors: effectiveNeuroRisk
    });

    if (baResult && baResult.isThresholdExceeded) {
      clinicalAlerts.push({
        type: 'BA_RATIO',
        severity: 'CRITICAL',
        title: 'B/A ORANI KAN DEĞİŞİMİ ALARMI (AAP 2022 KAS 18)',
        message: baResult.interpretation
      });
    }
  } else if (totalBilirubin >= thresholds.escalation || totalBilirubin >= thresholds.exchange - 3.0) {
    clinicalAlerts.push({
      type: 'ALBUMIN_MANDATORY_WARNING',
      severity: 'WARNING',
      title: 'STAT SERUM ALBÜMİN ÇALIŞILMASI ZORUNLUDUR (AAP 2022 KAS 18)',
      message: '⚠️ DİKKAT: Serum albümini girilmedi. AAP 2022 KAS 18 uyarınca kan değişimi veya eskalasyon eşiğine yaklaşan bebeklerde hipoalbüminemi serbest bilirubini artırır; B/A oranını hesaplamak için STAT serum albümin bakınız.'
    });
    recommendations.push('STAT serum albümin çalışınız: Kan değişimi / eskalasyon eşiğine yaklaşan bebeklerde hipoalbüminemi serbest bilirubini artırır ve B/A oranı aşılabilir (AAP 2022 KAS 18).');
  }

  // 6. TcB Doğrulama Kuralı (KAS 6)
  const tcBValidity = evaluateTcBValidity({
    measurementType,
    totalBilirubin,
    phototherapyThreshold: thresholds.phototherapy,
    ageHours,
    gestationalWeeks: gaInfo.truncatedWeeks,
    priorPhototherapyWithin24h: params.priorPhototherapyWithin24h
  });

  let requiresTsbConfirmation = tcBValidity.isTsbMandatory;
  let tsbConfirmationReason: string | undefined = tcBValidity.warning;

  if (requiresTsbConfirmation && tsbConfirmationReason) {
    clinicalAlerts.push({
      type: 'TCB_CONFIRMATION',
      severity: 'WARNING',
      title: 'STAT TSB DOĞRULAMA ZORUNLULUĞU (KAS 6)',
      message: tsbConfirmationReason
    });
  }

  // 6B. Taburculuk Sonrası Takip Şeması (AAP 2022 Tablo 4: Delta Modeli & KAS 22–25)
  const dischargeEvaluation = evaluateAap2022DischargeMatrix({
    deltaMgDl: delta,
    ageHours,
    phototherapyThreshold: thresholds.phototherapy,
    totalBilirubin
  });

  if (params.isDischargePlanning && !dischargeEvaluation.isDischargeEligible) {
    clinicalAlerts.push({
      type: 'DISCHARGE_DELAYED',
      severity: 'WARNING',
      title: 'TABURCULUK ERTELEME / RET ALARMI (AAP TABLO 4)',
      message: dischargeEvaluation.dischargeRecommendation
    });
  }

  // 6C. Fototerapi Sonlandırma & Rebound İzlem Motoru (AAP 2022 KAS 14 & 15)
  let reboundEvaluation: Aap2022ReboundEvaluation | null = null;
  const isReboundEval = Boolean(
    params.isPhototherapyDiscontinuationEvaluation ||
    params.priorPhototherapyWithin24h ||
    (params.phototherapyStartAgeHours !== undefined && params.phototherapyStartAgeHours !== null)
  );

  if (isReboundEval) {
    reboundEvaluation = evaluatePhototherapyReboundRisk({
      currentTsb: totalBilirubin,
      currentAgeHours: ageHours,
      phototherapyThreshold: thresholds.phototherapy,
      gestationalWeeks: gaInfo.truncatedWeeks,
      gestationalDays: gaInfo.inputDays,
      phototherapyStartAgeHours: params.phototherapyStartAgeHours,
      hasIsoimmuneHemolysis: isoimmuneHemolysis,
      hasHemolyticDisease: g6pdDeficiency
    });

    if (reboundEvaluation.isHighReboundRisk) {
      clinicalAlerts.push({
        type: 'REBOUND_HIGH_RISK',
        severity: 'CRITICAL',
        title: 'YÜKSEK REBOUND RİSKİ ALARMI (AAP 2022 KAS 15)',
        message: reboundEvaluation.protocol
      });
    }
  }

  // 7A. Kural 0: Akut Bilirubin Ensefalopatisi (ABE) Semptomları Varlığı (AAP 2022 KAS 19 & 20)
  // Bebeğin yaşı kaç saat olursa olsun (ilk 12 saat dahil) ABE bulgusu varlığında TSB düzeyine bakılmaksızın DERHAL ACİL KAN DEĞİŞİMİ!
  if (abeAssessment.isImmediateExchangeTriggered) {
    const escalationProto = generateAap2022EscalationProtocol({
      tsb: totalBilirubin,
      exchangeThreshold: thresholds.exchange,
      hasIsoimmuneHemolysis: isoimmuneHemolysis || true,
      albumin
    });
    clinicalAlerts.push({
      type: 'ABE_EMERGENCY',
      severity: 'CRITICAL',
      title: 'AKUT BİLİRUBİN ENSEFALOPATİSİ (ABE) ACİL ALARMI (AAP 2022 KAS 19/20)',
      message: 'Retrokollis, opistotonus veya tiz ağlama mevcuttur. TSB düzeyine bakılmaksızın derhal kan değişimi uygulanmalıdır.'
    });
    recommendations.push(
      'ACİL KAN DEĞİŞİMİ (Exchange Transfusion): İleri/orta evre ABE bulguları (retrokollis, opistotonus, hipertoni, tiz ağlama) mevcuttur. TSB düzeyine bakılmaksızın derhal kan değişimi hazırlığı yapınız (AAP 2022 KAS 19 & 20).',
      'Derhal doğrudan Yenidoğan Yoğun Bakım Ünitesine (YYBÜ) transfer/yatış organize ediniz.',
      'Kan değişimi hazırlanırken kesintisiz Çift Yönlü Yoğun LED Fototerapi (≥30 µW/cm²/nm) ve IV hidrasyon başlatınız.',
      'STAT kan bankası istemi: 2 ünite uygun ışınlanmış, lökositi azaltılmış eritrosit süspansiyonu + TDP.'
    );
    return {
      isValid: true,
      ageHours,
      totalBilirubin,
      gestationalAge: {
        inputWeeks: gaInfo.inputWeeks,
        inputDays: gaInfo.inputDays,
        truncatedWeeks: gaInfo.truncatedWeeks,
        isPreterm: false,
        isAapBlocked: false
      },
      measurementType,
      hasNeurotoxicityRisk: effectiveNeuroRisk,
      riskFactorDetails,
      abeAssessment,
      rateOfRiseAnalysis,
      escalationProtocol: escalationProto,
      thresholds,
      deltaFromPhototherapy: delta,
      status: 'EXCHANGE_TRANSFUSION_REQUIRED',
      alertClass: 'danger',
      requiresTsbConfirmation: measurementType === 'TcB',
      tsbConfirmationReason: measurementType === 'TcB' ? 'Kan değişimi öncesi STAT venöz TSB zorunludur.' : undefined,
      followUpRecommendation: 'Derhal YYBÜ yatışı; taburculuk planlanamaz.',
      interpretation: `AKUT BİLİRUBİN ENSEFALOPATİSİ (ABE) SAPTANDI: TSB DÜZEYİNE BAKILMAKSIZIN DERHAL ACİL KAN DEĞİŞİMİ YAPILMALIDIR (${measurementType}: ${totalBilirubin} mg/dL).`,
      recommendations,
      clinicalAlerts,
      bilirubinAlbuminRatio: baResult,
      directBilirubinAnalysis: directAnalysis,
      dischargeEvaluation,
      reboundEvaluation,
      tcBValidity
    };
  }

  // 7B. Yaşamın İlk 12 Saati Patoloji Alarmı (TC-07)
  if (ageHours < 12) {
    clinicalAlerts.push({
      type: 'FIRST_12H_PATHOLOGY',
      severity: 'CRITICAL',
      title: 'İLK 12 SAAT PATOLOJİK SARILIK ALARMI',
      message: `Yaşamın ilk ${ageHours} saatinde sarılık saptanması PATOLOJİKTİR. İzoimmün veya masif hemoliz düşünülmelidir. STAT TSB, DAT (Coombs), periferik yayma, kan grubu ve hemogram çalışınız.`
    });

    const first12Escalation = totalBilirubin >= thresholds.escalation
      ? generateAap2022EscalationProtocol({
          tsb: totalBilirubin,
          exchangeThreshold: thresholds.exchange,
          hasIsoimmuneHemolysis: isoimmuneHemolysis,
          albumin
        })
      : null;

    return {
      isValid: true,
      ageHours,
      totalBilirubin,
      gestationalAge: {
        inputWeeks: gaInfo.inputWeeks,
        inputDays: gaInfo.inputDays,
        truncatedWeeks: gaInfo.truncatedWeeks,
        isPreterm: false,
        isAapBlocked: false
      },
      measurementType,
      hasNeurotoxicityRisk: effectiveNeuroRisk,
      riskFactorDetails,
      abeAssessment,
      rateOfRiseAnalysis,
      escalationProtocol: first12Escalation,
      thresholds,
      deltaFromPhototherapy: delta,
      status: 'FIRST_12_HOURS_CRITICAL',
      alertClass: 'danger',
      requiresTsbConfirmation: true,
      tsbConfirmationReason: 'İlk 12 saatteki sarılıkta TcB kullanılamaz; derhal venöz TSB bakılmalıdır.',
      followUpRecommendation: 'Yaşamın ilk 12 saatinde taburculuk planlanamaz; acil hemoliz takibi yapılmalıdır.',
      interpretation: `Yaşamın ilk ${ageHours} saatinde sarılık saptandı: PATOLOJİK HEMOLİZ DÜŞÜNÜLMELİDİR (${measurementType}: ${totalBilirubin} mg/dL).`,
      recommendations: [
        'Yaşamın ilk 12 saatindeki sarılık asla fizyolojik değildir; acil izoimmün hemoliz (Rh, ABO, minör kan grubu uyuşmazlığı) araştırması yapınız.',
        'STAT tetkikler: Anne ve bebek kan grubu, Direkt Antiglobulin Testi (DAT/Coombs), Tam Kan Sayımı, Periferik Yayma, Retikülosit, TSB ve Direkt Bilirubin.',
        `Saat ${ageHours} referans fototerapi eşiği: ${thresholds.phototherapy} mg/dL.`,
        'Bilirubin artış hızını (saatte ≥0.3 mg/dL artış hemoliz kanıtıdır) izlemek için 4 saat sonra TSB tekrarı yapınız.'
      ],
      clinicalAlerts,
      bilirubinAlbuminRatio: baResult,
      directBilirubinAnalysis: directAnalysis,
      dischargeEvaluation,
      reboundEvaluation,
      tcBValidity
    };
  }

  // 8. Acil Bakım Eskalasyonu Protokolü Üretimi (KAS 17)
  let escalationProtocol: Aap2022EscalationProtocol | null = null;
  if (totalBilirubin >= thresholds.escalation) {
    escalationProtocol = generateAap2022EscalationProtocol({
      tsb: totalBilirubin,
      exchangeThreshold: thresholds.exchange,
      hasIsoimmuneHemolysis: isoimmuneHemolysis,
      albumin
    });
  }

  // 9. Durum Sınıflandırması & Karar Destek Çıktısı
  let status: Aap2022JaundiceResult['status'] = 'LOW_RISK';
  let alertClass: Aap2022JaundiceResult['alertClass'] = 'success';
  let interpretation = '';

  const followUp = getAap2022FollowUpRecommendation(delta, ageHours);

  // Kural A: Kan Değişimi veya B/A Oranı Aşımı
  if (totalBilirubin >= thresholds.exchange || (baResult && baResult.isThresholdExceeded)) {
    if (measurementType === 'TcB') {
      status = 'TCB_REQUIRES_STAT_TSB_CONFIRMATION';
      alertClass = 'danger';
      interpretation = `⚠️ TSB KAN ONAYI ZORUNLU: Transkütan ölçüm (TcB: ${totalBilirubin} mg/dL) kan değişimi sınırına (${thresholds.exchange} mg/dL) ulaşmıştır! AAP 2022 KAS 6 & 17 uyarınca, transkütan ölçümle kan değişimi kararı VERİLEMEZ; derhal acil STAT venöz TSB kanı alınız.`;
      clinicalAlerts.push({
        type: 'TCB_CONFIRMATION',
        severity: 'CRITICAL',
        title: 'TCB KAN DEĞİŞİMİ HARD-STOP KALKANI (AAP 2022 KAS 6 & 17)',
        message: 'Transkütan bilirubin (TcB) ile invaziv kan değişimi kararı verilemez. Derhal STAT venöz TSB kanı alınız!'
      });
      recommendations.push(
        'STAT venöz kan alarak acil laboratuvarda TSB çalışınız: TcB cihazlarının yüksek bilirubinlerdeki doygunluk sapması nedeniyle invaziv kan değişimi öncesi kan TSB şarttır (AAP 2022 KAS 6 & 17).',
        'STAT TSB sonucu beklenirken bebeği yoğun LED fototerapi altına alınız ve YYBÜ yatağını hazırlayınız.'
      );
    } else {
      status = 'EXCHANGE_TRANSFUSION_REQUIRED';
      alertClass = 'danger';
      interpretation = (baResult && baResult.isThresholdExceeded && totalBilirubin < thresholds.exchange)
        ? `TSB eşik altındadır (${totalBilirubin} mg/dL < ${thresholds.exchange} mg/dL), ancak B/A oranı (${baResult.ratio} mg/g ≥ ${baResult.threshold}) kan değişimi sınırını aşmıştır (AAP 2022 KAS 18).`
        : `ACİL KAN DEĞİŞİMİ EŞİĞİ AŞILDI (${measurementType}: ${totalBilirubin} mg/dL ≥ Kan Değişimi: ${thresholds.exchange} mg/dL).`;
      clinicalAlerts.push({
        type: 'EXCHANGE',
        severity: 'CRITICAL',
        title: 'ACİL KAN DEĞİŞİMİ (EXCHANGE TRANSFUSION) ENDİKASYONU',
        message: 'Bilirubin düzeyi veya B/A oranı kan değişimi eşiğini aşmıştır. Akut bilirubin ensefalopatisini önlemek için derhal YYBÜ yatışı ve kan değişimi hazırlığı yapınız.'
      });
      recommendations.push(
        'Derhal Yenidoğan Yoğun Bakım Ünitesine (YYBÜ) yatış ve acil Kan Değişimi (Exchange Transfusion) hazırlığı yapınız.',
        'Kan değişimi hazırlığı sürerken kesintisiz Çift Yönlü Yoğun LED Fototerapi ve IV hidrasyon başlatınız.',
        'STAT laboratuvar: TSB, Direkt Bilirubin, Albümin, DAT (Coombs), Tam Kan, Retikülosit, G6PD ve Cross-match.',
        'İzoimmün hemolitik hastalıkta (DAT+) kan değişimi hazırlanırken IVIG (0.5–1.0 g/kg, 2 saatte) verilebilir.'
      );
    }
  }
  // Kural B: Bakım Eskalasyonu (KAS 17)
  else if (totalBilirubin >= thresholds.escalation) {
    if (measurementType === 'TcB') {
      status = 'TCB_REQUIRES_STAT_TSB_CONFIRMATION';
      alertClass = 'danger';
      interpretation = `⚠️ TSB KAN ONAYI ZORUNLU: Transkütan ölçüm (TcB: ${totalBilirubin} mg/dL) bakım eskalasyonu sınırına (${thresholds.escalation} mg/dL) ulaşmıştır! AAP 2022 KAS 6 & 17 uyarınca, transkütan ölçümle eskalasyon kararı VERİLEMEZ; derhal acil STAT venöz TSB kanı alınız.`;
      clinicalAlerts.push({
        type: 'TCB_CONFIRMATION',
        severity: 'CRITICAL',
        title: 'TCB BAKIM ESKALASYONU HARD-STOP KALKANI (AAP 2022 KAS 6 & 17)',
        message: 'Transkütan bilirubin (TcB) ile bakım eskalasyonu kararı verilemez. Derhal STAT venöz TSB kanı alınız!'
      });
      recommendations.push(
        'STAT venöz kan alarak acil laboratuvarda TSB çalışınız: Bakım eskalasyonu için venöz TSB zorunludur.',
        'STAT TSB sonucu beklenirken bebeği yoğun LED fototerapi altına alınız ve yakın izleme geçiniz.'
      );
    } else {
      status = 'ESCALATION_OF_CARE';
      alertClass = 'danger';
      interpretation = `ACİL DURUM: Bakım Eskalasyonu! (${measurementType}: ${totalBilirubin} mg/dL ≥ Eskalasyon: ${thresholds.escalation} mg/dL | Kan Değişimi: ${thresholds.exchange} mg/dL).`;
      clinicalAlerts.push({
        type: 'ESCALATION',
        severity: 'CRITICAL',
        title: 'ACİL BAKIM ESKALASYONU ALARMI (AAP 2022 KAS 17)',
        message: `Kan değişimi eşiğine ≤2.0 mg/dL yaklaşıldı! Derhal doğrudan YYBÜ yatışı, acil yoğun LED fototerapi, STAT albümin ve 2 saatte bir TSB takibi gereklidir.`
      });
      recommendations.push(
        'ACİL DURUM: Bakım Eskalasyonu! Doğrudan YYBÜ yatışı veya acil transfer organize ediniz.',
        'Kesintisiz Yoğun LED Fototerapi (≥30 µW/cm²/nm, maksimum vücut yüzeyi) başlatınız.',
        'IV sıvı hidrasyonu başlayınız; rutin ağızdan su veya dekstroz verilmez.',
        'STAT kan paneli: TSB, Direkt Bilirubin, Albümin, Tam Kan, Retikülosit, DAT, Cross-match.',
        'TSB düzeyini her 2 saatte bir ölçünüz; Akut Bilirubin Ensefalopatisi bulgularını (letarji, tiz ağlama, retrokollis) yakından izleyiniz.'
      );
      if (isoimmuneHemolysis) {
        recommendations.push(
          'İzoimmün hemoliz (DAT+) varlığında: TSB eşiğe yaklaştığı için IVIG infüzyonu (0.5–1.0 g/kg, 2 saatte) hazırlayınız (AAP 2022 KAS 16/17).'
        );
      }
    }
  }
  // Kural C: Fototerapi Endikasyonu
  else if (totalBilirubin >= thresholds.phototherapy) {
    status = 'PHOTOTHERAPY_REQUIRED';
    alertClass = 'warning';
    interpretation = `FOTOTERAPİ EŞİĞİ AŞILDI (${measurementType}: ${totalBilirubin} mg/dL ≥ Fototerapi Eşiği: ${thresholds.phototherapy} mg/dL; Fark: +${Math.abs(delta)} mg/dL). Yoğun LED Fototerapi Başlatılmalıdır.`;
    recommendations.push(
      'Yoğun LED fototerapi (460–490 nm, ≥30 µW/cm²/nm) başlatılmalıdır.',
      'Gözleri koruyarak 2–3 saatte bir emzirmeye devam ediniz.',
      'Fototerapiden 4–12 saat sonra TSB kontrolü yapınız.',
      'Fototerapi kesme kuralı (AAP 2022 KAS 14): TSB o anki fototerapi eşiğinin en az 2.0 mg/dL altına indiğinde kesilebilir.'
    );
  }
  // Kural D: Yakın İzlem Bölgesi (Eşiğe <= 3.0 mg/dL)
  else if (delta <= 3.0) {
    status = 'CLOSE_MONITORING';
    alertClass = 'info';
    interpretation = `Fototerapi eşiğine yakın izlem bölgesi (Eşiğin ${delta} mg/dL altında; FT Eşiği: ${thresholds.phototherapy} mg/dL).`;
    recommendations.push(
      `Taburculuk / Takip Planı: ${followUp}`,
      'Yeterli anne sütü alımı (günde 8–12 emzirme) ve patolojik kilo kaybı kontrolü yapınız.'
    );
    if (delta <= 2.0) {
      clinicalAlerts.push({
        type: 'PHOTOTHERAPY_DISCONTINUATION_WARNING',
        severity: 'WARNING',
        title: 'FOTOTERAPİ KESME (DISCONTINUATION) KURALI (AAP 2022 KAS 14)',
        message: `Bilirubin düzeyi (${totalBilirubin} mg/dL), fototerapi eşiğinin (${thresholds.phototherapy} mg/dL) sadece ${delta.toFixed(1)} mg/dL altındadır. Bebek halihazırda fototerapi almaktaysa, AAP 2022 KAS 14 uyarınca eşiğin en az 2.0 mg/dL altına (≤ ${(thresholds.phototherapy - 2.0).toFixed(1)} mg/dL) inmeden fototerapi KESİLMEMELİDİR.`
      });
      recommendations.push(`Fototerapi Sonlandırma Kuralı: Bebek şu an fototerapi altındaysa, AAP 2022 KAS 14 gereğince TSB düzeyi fototerapi eşiğinin en az 2.0 mg/dL altına (≤ ${(thresholds.phototherapy - 2.0).toFixed(1)} mg/dL) düşmeden tedavi sonlandırılmamalıdır.`);
    }
  }
  // Kural E: Düşük Risk
  else {
    status = 'LOW_RISK';
    alertClass = 'success';
    interpretation = `Fototerapi eşiğinin güvenli altında (${measurementType}: ${totalBilirubin} mg/dL < FT Eşiği: ${thresholds.phototherapy} mg/dL; Fark: ${delta} mg/dL).`;
    recommendations.push(
      'Fototerapi endikasyonu bulunmamaktadır.',
      `Takip Önerisi: ${followUp}`
    );
  }

  return {
    isValid: true,
    ageHours,
    totalBilirubin,
    gestationalAge: {
      inputWeeks: gaInfo.inputWeeks,
      inputDays: gaInfo.inputDays,
      truncatedWeeks: gaInfo.truncatedWeeks,
      isPreterm: false,
      isAapBlocked: false
    },
    measurementType,
    hasNeurotoxicityRisk: effectiveNeuroRisk,
    riskFactorDetails,
    abeAssessment,
    rateOfRiseAnalysis,
    escalationProtocol,
    thresholds,
    deltaFromPhototherapy: delta,
    status,
    alertClass,
    requiresTsbConfirmation,
    tsbConfirmationReason,
    followUpRecommendation: followUp,
    interpretation,
    recommendations,
    clinicalAlerts,
    bilirubinAlbuminRatio: baResult,
    directBilirubinAnalysis: directAnalysis,
    dischargeEvaluation,
    reboundEvaluation,
    tcBValidity
  };
}
