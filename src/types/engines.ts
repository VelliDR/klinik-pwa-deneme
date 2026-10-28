/**
 * KLİNİK MOTORLARIN HESAPLAMA ÇIKTI TİPLERİ (ENGINE INTERFACES)
 * Tek doğruluk kaynağı (Single Source of Truth) olarak tüm motor tiplerini birleştirir.
 */

// 1. Kalsiyum
export type {
  CalciumInput,
  CalciumResult,
  CalciumResult as CorrectedCalciumResult
} from '../engines/calciumEngine';

// 2. Endokrin & HOMA-IR
export type {
  SteroidDefinition,
  SteroidConversionItem,
  SteroidConversionItem as SteroidEquivalenceItem,
  SteroidConversionResult,
  HOMAIRInput,
  HOMAIRResult
} from '../engines/endocrineEngine';

// 3. İnfüzyon & GIR
export type {
  InfusionDoseUnit,
  InfusionRateInput,
  InfusionRateResult,
  GIRInput,
  GIRResult
} from '../engines/infusionEngine';

// 4. Sıvı & Elektrolit
export type {
  MaintenanceFluidResult,
  SodiumCorrectionResult,
  NeonatalWeightCategory,
  PhototherapyDeviceType,
  NeonatalWeightLossAnalysis,
  NeonatalFluidInput,
  NeonatalFluidResult
} from '../engines/fluidEngine';

// 4b. Biyometri & Böbrek Fonksiyonu (KDIGO 2024 / Schwartz)
export type {
  PediatricCreatinineAssay,
  EgfrOptions,
  DetailedEgfrResult
} from '../engines/biometricsEngine';

// 4c. Renal Doz De-indeksleme & Klerens Standardizasyonu (KDIGO 2024 / Mosteller / EHRA 2021)
export type {
  BsaFormula,
  RenalClearanceMetric,
  RenalDrugCategory,
  PatientRenalParameters,
  BsaCalculationResult,
  BodyWeightAnalysis,
  CockcroftGaultResult,
  RenalDrugGuidance,
  ComprehensiveRenalEvaluation
} from '../engines/renalDoseEngine';

// 4d. Yenidoğan Hiperbilirubinemisi & Eskalasyon (AAP 2022 / Kemper et al. / TND 2023 / Maisels 2012)
export type {
  Aap2022HourlyKnot,
  GestationalAgeInput,
  Aap2022NeurotoxicityRiskFactors,
  Aap2022AbeSymptoms,
  Aap2022RateOfRiseAnalysis,
  Aap2022EscalationProtocol,
  Aap2022JaundiceParams,
  Aap2022Thresholds,
  Aap2022JaundiceResult,
  PretermMaiselsBand,
  PretermTndNiceFormula,
  PretermJaundiceParams,
  PretermJaundiceResult,
  Aap2022DischargeEvaluation,
  Aap2022ReboundEvaluation,
  TcBValidityEvaluation,
  DischargeMatrixParams,
  PhototherapyReboundParams,
  TcBValidityParams
} from '../engines/jaundiceEngine';

// 5. Cerrahi
export type {
  AlvaradoParams,
  AlvaradoResult,
  BurnProtocolType,
  BurnResuscitationOptions,
  ParklandResult,
  RansonEtiology,
  RansonParams,
  RansonResult,
  SutureGuidance
} from '../engines/surgeryEngine';

// 6. Triyaj & GCS
export type {
  NEWS2Result,
  PEWSResult,
  GCSResult
} from '../engines/triageEngine';

// 7. Kadın Doğum (OB/GYN)
export type {
  ObstetricsResult,
  BishopResult,
  PreeclampsiaResult
} from '../engines/obgynEngine';

// 8. Kan Gazı
export type {
  BloodGasInput,
  BloodGasResult,
  BloodGasResult as BloodGasAnalysisResult
} from '../engines/bloodGasEngine';

// 9. Kardiyak & EKG
export type {
  QTcInput,
  QTcResult,
  QTcResult as CardiacQTcResult,
  AxisResult
} from '../engines/cardiacEngine';

// 9b. Pediatri, Persentil, Demir & Tromboemboli
export type {
  PediatricDoseResult,
  CommercialSyrupProfile,
  PediatricDoseOptions,
  IdealBodyWeightInput,
  IdealBodyWeightResult,
  PediatricBPResult,
  CentorInput,
  CentorResult
} from '../engines/pediatricEngine';
export { PEDIATRIC_SYRUPS, calculateIdealBodyWeight } from '../engines/pediatricEngine';

export type {
  PercentilesInput,
  PercentilesResult,
  TargetHeightInput,
  TargetHeightResult,
  CorrectedAgeInput,
  CorrectedAgeResult,
  GrowthVelocityInput,
  GrowthVelocityResult,
  CentileChannel,
  CranialScreeningInput,
  CranialScreeningResult
} from '../engines/percentileEngine';

export type {
  PediatricIronInput,
  IronDosagePlan,
  PediatricIronResult
} from '../engines/ironEngine';

export type {
  WellsDVTParams,
  WellsDVTResult,
  WellsPTEParams,
  WellsPTEResult,
  PERCParams,
  PERCResult,
  CHA2DS2VAScParams,
  CHA2DS2VAScResult,
  HASBLEDParams,
  HASBLEDResult,
  HEARTParams,
  HEARTResult
} from '../engines/thrombosisEngine';

// 10. Nefroloji, Toksikoloji & Solunum
export interface FENaParams {
  urineNa?: number;
  urineSodium?: number;
  serumNa?: number;
  serumSodium?: number;
  urineCr?: number;
  urineCreatinine?: number;
  serumCr?: number;
  serumCreatinine?: number;
  isOnDiuretics?: boolean;
  ageDays?: number;
  isNeonate?: boolean;
  isPreterm?: boolean;
}

export interface FENaResult {
  isValid: boolean;
  fena: number;
  fenaPercent: number;
  category: string;
  etiology: string;
  interpretation: string;
  recommendation: string;
  recommendations: string[];
  diureticWarning: string | null;
  isOnDiuretics: boolean;
  alertClass: string;
}

export interface FEUreaParams {
  urineUrea?: number;
  serumUrea?: number;
  serumBUN?: number;
  isBun?: boolean;
  urineCr?: number;
  urineCreatinine?: number;
  serumCr?: number;
  serumCreatinine?: number;
}

export interface FEUreaResult {
  isValid: boolean;
  feUrea: number;
  feUreaPercent: number;
  category: string;
  etiology: string;
  interpretation: string;
  recommendation: string;
  recommendations: string[];
  alertClass: string;
}

export interface OliguriaDifferentialResult {
  concordance: string;
  summary: string;
  action: string;
}

export interface CorrectedSodiumParams {
  measuredNa?: number;
  measuredSodium?: number;
  glucoseMgDl?: number;
  glucose?: number;
}

export interface CorrectedSodiumResult {
  isValid: boolean;
  measuredNa: number;
  measuredSodium: number;
  glucoseMgDl: number;
  glucose: number;
  correctedNa: number;
  correctedSodium: number;
  correctedSodiumKatz: number;
  correctedSodiumHillier: number;
  delta: number;
  deltaKatz: number;
  deltaHillier: number;
  formulaNotes?: string;
  interpretation: string;
}

export interface OsmolalGapParams {
  measuredOsm?: number;
  measuredOsmolality?: number;
  serumNa?: number;
  sodium?: number;
  glucoseMgDl?: number;
  glucose?: number;
  bunMgDl?: number;
  bun?: number;
  ethanolMgDl?: number;
  ethanol?: number;
}

export interface AntidoteAdvice {
  fomepizol: string;
  etanolAlternative: string;
  dialysisCriteria: string;
}

export interface OsmolalGapResult {
  isValid: boolean;
  measuredOsm: number;
  measuredOsmolality: number;
  calculatedOsm: number;
  gap: number;
  osmolalGap: number;
  isHighGap: boolean;
  isCriticalGap: boolean;
  isElevated: boolean;
  antidoteAdvice: AntidoteAdvice | null;
  interpretation: string;
  alertClass: string;
}

export interface NACPhase {
  doseMgKg: number;
  totalMg: number;
  fluidD5W: string;
}

export interface NACProtocol {
  isPediatricAdjusted: boolean;
  phase1: NACPhase;
  phase2: NACPhase;
  phase3: NACPhase;
  loadingDose: string;
  secondDose: string;
  thirdDose: string;
  totalDuration: string;
  oralAlternative: string;
}

export interface RumackMatthewParams {
  serumParacetamolMcgMl?: number;
  paracetamolLevelMcgMl?: number;
  hoursPostIngestion?: number;
  hours?: number;
  weightKg?: number;
  isHighRisk?: boolean;
}

export interface RumackMatthewResult {
  isValid: boolean;
  status: 'TOO_EARLY' | 'LATE_PRESENTATION' | 'TOXIC' | 'NON_TOXIC';
  isToxic: boolean;
  isHighRisk?: boolean;
  hours: number;
  hoursPostIngestion: number;
  serumLevel?: number;
  levelMcgMl: number;
  threshold?: number;
  treatWithNAC: boolean;
  interpretation: string;
  nacProtocol?: NACProtocol | null;
  alertClass: string;
}

export interface CURB65Params {
  confusion?: boolean;
  bunOver19?: boolean;
  rrGte30?: boolean;
  respiratoryRateGte30?: boolean;
  sbpLt90OrDbpLte60?: boolean;
  hypotension?: boolean;
  ageGte65?: boolean;
  ageYears?: number;
  isCRBOnly?: boolean;
  hasBunLab?: boolean;
}

export interface CURB65Result {
  isValid: boolean;
  isPediatricLocked?: boolean;
  isCRB65Primary?: boolean;
  score: number;
  crbScore: number;
  riskGroup: string;
  mortalityGroup: string;
  mortalityRate: string;
  mortalityPercent: number;
  treatmentSetting: string;
  recommendation: string;
  recommendations: string[];
  empiricAntibiotic: string;
  icuWarning?: string;
  allergyWarning?: string;
  alertClass: string;
}

// 11. Neonatoloji & Pediatrik Acil
export type BhutaniGuideline = 'AAP_2022' | 'TND_2014';
export type BilirubinMeasurementType = 'TSB' | 'TcB';

export interface BhutaniThresholdItem {
  phototherapy: number;
  exchange: number;
}

export interface BhutaniParams {
  ageHours?: number;
  totalBilirubin?: number;
  gestationalWeeks?: number;
  hasRiskFactors?: boolean;
  guideline?: BhutaniGuideline;
  measurementType?: BilirubinMeasurementType;
}

export interface BhutaniResult {
  isValid: boolean;
  message?: string;
  ageHours?: number;
  totalBilirubin?: number;
  gestationalWeeks?: number;
  hasRiskFactors?: boolean;
  guidelineUsed?: BhutaniGuideline;
  guidelineLabel?: string;
  measurementType?: BilirubinMeasurementType;
  riskCategory?: string;
  riskGroupLabel?: string;
  phototherapyThreshold?: number;
  escalationThreshold?: number;
  exchangeThreshold?: number;
  deltaFromPhototherapy?: number;
  requiresTsbConfirmation?: boolean;
  tsbConfirmationReason?: string;
  followUpRecommendation?: string;
  status?: string;
  alertClass?: string;
  interpretation?: string;
  recommendations?: string[];
}

export interface APGARParams {
  heartRate?: number;
  respiratoryEffort?: number;
  muscleTone?: number;
  reflexIrritability?: number;
  color?: number;
  minute?: number;
}

export interface APGARResult {
  score: number;
  minute: number;
  status: string;
  alertClass: string;
  interpretation: string;
  recommendations: string[];
  breakdown: {
    heartRate: number;
    respiratoryEffort: number;
    muscleTone: number;
    reflexIrritability: number;
    color: number;
  };
}

export interface WestleyCroupParams {
  stridor?: number;
  retractions?: number;
  airEntry?: number;
  cyanosis?: number;
  consciousness?: number;
}

export interface WestleyCroupResult {
  score: number;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'IMPENDING_RESPIRATORY_FAILURE';
  alertClass: string;
  interpretation: string;
  recommendations: string[];
  breakdown: {
    stridor: number;
    retractions: number;
    airEntry: number;
    cyanosis: number;
    consciousness: number;
  };
}

export interface CDSDehydrationParams {
  generalAppearance?: number;
  eyes?: number;
  mucousMembranes?: number;
  tears?: number;
  weightKg?: number;
}

export interface CDSDehydrationResult {
  score: number;
  weightKg?: number;
  orsRecommendedMl: string | null;
  severity: 'NONE' | 'SOME_MILD_MODERATE' | 'MODERATE_SEVERE';
  alertClass: string;
  interpretation: string;
  recommendations: string[];
  breakdown: {
    generalAppearance: number;
    eyes: number;
    mucousMembranes: number;
    tears: number;
  };
}

export interface NeonatalWeightLossParams {
  birthWeightG: number;
  currentWeightKg: number;
  ageDays?: number | null;
}

export interface NeonatalWeightLossResult {
  isValid: boolean;
  message?: string;
  birthWeightG?: number;
  currentWeightG?: number;
  lossG?: number;
  percentLoss?: number;
  status?: string;
  alertClass?: string;
  interpretation?: string;
  recommendations?: string[];
}

// 12. Akıllı Reçete Güvenliği
export type DrugInputItem = string | {
  brand?: string;
  brandName?: string;
  name?: string;
  generic?: string;
  atc?: string;
  atcCode?: string;
  [key: string]: unknown;
};

export interface RenalDrugRule {
  maxEgfr: number;
  status: 'CONTRAINDICATED' | 'DOSE_REDUCTION' | 'MONITORING' | 'WARNING';
  message: string;
}

export interface RenalDrugEntry {
  generic: string;
  aliases: string[];
  atcPrefix?: string;
  name: string;
  tdmRecommended?: boolean;
  rules: RenalDrugRule[];
}

export interface RenalDoseWarning {
  drug: string;
  userDrugQuery: string;
  status: string;
  alertClass: string;
  message: string;
  thresholdEgfr: number;
  currentEgfr: number;
  metricUsed?: 'INDEXED_EGFR' | 'ABSOLUTE_EGFR' | 'COCKCROFT_GAULT_CRCL' | string;
  effectiveClearanceValue?: number;
  clearanceUnit?: string;
  tdmRecommended?: boolean;
  tdmGuidance?: string | null;
}

export interface RenalDoseCheckParams {
  egfr?: number;
  drugs?: DrugInputItem[];
  heightCm?: number | null;
  weightKg?: number | null;
  ageYears?: number | null;
  gender?: 'male' | 'female' | string | null;
  serumCreatinineMgDl?: number | null;
  bsa?: number | null;
}

export interface RenalDoseCheckResult {
  isValid: boolean;
  message?: string;
  egfr?: number;
  deindexedAbsoluteGfr?: number | null;
  cockcroftGaultCrCl?: number | null;
  totalChecked?: number;
  alertsCount?: number;
  hasContraindication?: boolean;
  alertClass?: string;
  warnings?: RenalDoseWarning[];
  comprehensiveEvaluation?: import('../engines/renalDoseEngine').ComprehensiveRenalEvaluation | null;
}

export interface TripleWhammyResult {
  isTripleWhammy: boolean;
  isDoubleRisk: boolean;
  severity?: string;
  alertClass: string;
  title: string;
  mechanism?: string;
  detectedDrugs: {
    rasBlockers?: string[];
    diuretics?: string[];
    nsaids?: string[];
    [key: string]: unknown;
  };
  recommendations?: string[];
  presentClasses?: string[];
}

export interface PregnancySafetyAlert {
  drugName: string;
  userDrug: string;
  category: string;
  warning: string;
  isHighRisk: boolean;
}

export interface PregnancySafetyResult {
  totalChecked: number;
  alertsCount: number;
  hasSevereFetalRisk: boolean;
  alerts: PregnancySafetyAlert[];
}

export interface NeonatalContraindicatedDrug {
  name: string;
  keywords: string[];
  status: string;
  severity: string;
  title: string;
  warning: string;
}

export interface NeonatalDrugAlert {
  drugName: string;
  userDrug: string;
  status: string;
  severity: string;
  title: string;
  warning: string;
}

export interface NeonatalDrugSafetyResult {
  totalChecked: number;
  alertsCount: number;
  hasContraindication: boolean;
  alertClass: string;
  alerts: NeonatalDrugAlert[];
}

export interface SerotoninSyndromeResult {
  isHighRisk: boolean;
  severity: 'CRITICAL' | 'WARNING' | 'SAFE';
  title: string;
  mechanism?: string;
  hunterCriteriaInfo?: string;
  detectedDrugs: {
    maoi: string[];
    ssriSnriTca: string[];
    opioids: string[];
    triptans: string[];
    others: string[];
  };
  totalSerotonergicCount: number;
  hasMaoiCombination: boolean;
  recommendations: string[];
  alertClass: 'danger' | 'warning' | 'success';
}

export interface HyperkalemiaRiskResult {
  isAtRisk: boolean;
  severity: 'CRITICAL' | 'WARNING' | 'SAFE';
  title: string;
  mechanism?: string;
  riskFactorsIdentified: string[];
  detectedDrugs: {
    raasBlockers: string[];
    kSparingDiuretics: string[];
    trimethoprim: string[];
    nsaids: string[];
    kSupplements: string[];
    other: string[];
  };
  totalHyperkalemicCount: number;
  hasRenalOrAgeCompounding: boolean;
  recommendations: string[];
  alertClass: 'danger' | 'warning' | 'success';
}

export interface CypStatinInteractionResult {
  hasInteraction: boolean;
  severity: 'CRITICAL' | 'WARNING' | 'SAFE';
  title: string;
  mechanism?: string;
  detectedDrugs: {
    statins: string[];
    inhibitors: string[];
  };
  safeAlternatives: {
    antibiotics: string[];
    statins: string[];
  };
  recommendations: string[];
  alertClass: 'danger' | 'warning' | 'success';
}

// 18. Acil Durum Protokolleri
export type {
  AnaphylaxisDoses,
  StatusEpilepticusDoses
} from '../engines/emergencyProtocols';

// 19. Çevrimdışı RxNorm CUI & ATC İlaç Eşleştirme Motoru (NLM RxNav Deprecation Replacement)
export type {
  RxNormConceptDefinition,
  ConceptMatchConfidence,
  ResolvedRxConcept,
  OfflineOntologyStats
} from '../engines/rxNormMappingEngine';
export {
  OFFLINE_RXNORM_CONCEPTS,
  normalizeRxText,
  isRxNavApiDeprecated,
  getOfflineOntologyStats,
  getRxNormConceptByCui,
  getRxNormConceptByAtc,
  getRxNormConceptByKey,
  resolveToRxNormConcept,
  resolveBatchRxNormConcepts
} from '../engines/rxNormMappingEngine';

// 20. 4 Kademeli Etkileşim Hiyerarşisi (Tier 1-4) & ACORN VPT Downgrade Motoru
export type {
  AlertTierLevel,
  InteractionAlertCode,
  PatientSafetyContext,
  DrugInvolvedRef,
  InteractionAlert,
  InteractionEvaluationResult
} from '../engines/interactionTierEngine';
export {
  evaluatePrescriptionInteractions,
  isAcornVptRegimen
} from '../engines/interactionTierEngine';

// 21. AAP 2022 Yenidoğan Hiperbilirubinemi & Eskalasyon Karar Destek Motoru (Adım 13-15)
export {
  AAP2022_HOURLY_MILESTONES,
  AAP2022_PT_NO_RISK_EXACT,
  AAP2022_PT_WITH_RISK_EXACT,
  AAP2022_EX_NO_RISK_EXACT,
  AAP2022_EX_WITH_RISK_EXACT,
  truncateGestationalWeeks,
  interpolateHourlyCurve,
  calculateAap2022Thresholds,
  getAap2022FollowUpRecommendation,
  evaluateBilirubinAlbuminRatio,
  getPretermGuidance,
  calculateBilirubinRateOfRise,
  evaluateAbeSymptoms,
  generateAap2022EscalationProtocol,
  evaluateAap2022Jaundice,
  MAISELS_2012_PRETERM_BANDS,
  calculatePretermTndNiceThreshold,
  evaluatePretermJaundice,
  evaluateAap2022DischargeMatrix,
  evaluatePhototherapyReboundRisk,
  evaluateTcBValidity
} from '../engines/jaundiceEngine';



