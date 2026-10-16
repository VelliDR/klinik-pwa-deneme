/**
 * KLİNİK MOTORLARIN HESAPLAMA ÇIKTI TİPLERİ (ENGINE INTERFACES)
 */

// 1. Kalsiyum
export interface CorrectedCalciumResult {
  correctedCalcium: number;
  rawCalcium: number;
  albumin: number;
  interpretation: string;
}

// 2. Endokrin & HOMA-IR
export interface SteroidEquivalenceItem {
  name: string;
  equivalentDoseMg: number;
  antiInflammatoryPotency: number;
  mineralocorticoidPotency: number;
  durationOfAction: string;
}

export interface HOMAIRResult {
  homaIR: number;
  interpretation: string;
  isInsulinResistant: boolean;
}

// 3. İnfüzyon & GIR
export interface InfusionRateResult {
  rateMlPerHour: number;
  mcgPerKgPerMin?: number;
  mgPerHour?: number;
  concentrationMgPerMl: number;
}

export interface GIRResult {
  gir: number; // mg/kg/dk
  infusionRateMlPerHour: number;
  dextrosePercentage: number;
  weightKg: number;
  isNormal: boolean;
  recommendation: string;
}

// 4. Sıvı & Elektrolit
export interface MaintenanceFluidResult {
  dailyTotalMl: number;
  hourlyRateMl: number;
  method: 'holliday-segar' | 'neonatal-tnd';
  feverIncreaseMl?: number;
  breakdown?: {
    first10kg: number;
    second10kg: number;
    remainingKg: number;
  };
}

export interface SodiumCorrectionResult {
  infusionType: string;
  sodiumDeficitMeq: number;
  totalBodyWaterL: number;
  rateMlPerHour: number;
  correctionTimeHours: number;
  infusateNaMeqPerL: number;
  deltaNaPerLiter: number;
  maxDailyRiseMeq: number;
  warning?: string;
}

// 5. Cerrahi
export interface ParklandResult {
  totalFluid24h: number;
  first8h: number;
  next16h: number;
  rateFirst8h: number;
  rateNext16h: number;
  formulaMultiplier: number;
  status?: string;
}

export interface AlvaradoResult {
  score: number;
  riskGroup: 'Düşük' | 'Orta (Şüpheli)' | 'Yüksek';
  recommendation: string;
}

// 6. Triyaj & GCS
export interface GCSResult {
  totalScore: number;
  eyeScore: number;
  verbalScore: number;
  motorScore: number;
  severity: 'Ağır Kafa Travması / Koma' | 'Orta Derece Kafa Travması' | 'Hafif Kafa Travması';
}

export interface NEWS2Result {
  score: number;
  riskGroup: 'Düşük' | 'Orta' | 'Yüksek' | 'Kritik';
  responseRecommendation: string;
}

export interface PEWSResult {
  score: number;
  riskGroup: 'Normal' | 'Düşük' | 'Orta' | 'Yüksek';
  recommendation: string;
}

// 7. Kadın Doğum (OB/GYN)
export interface ObstetricsResult {
  eddDateFormatted: string;
  gestationalWeeks: number;
  gestationalDays: number;
  totalDays: number;
  trimester: 1 | 2 | 3;
}

export interface BishopResult {
  score: number;
  isFavorable: boolean;
  interpretation: string;
}

export interface PreeclampsiaResult {
  hasPreeclampsia: boolean;
  isSevere: boolean;
  criteriaMet: string[];
  recommendation: string;
}

// 8. Kan Gazı
export interface BloodGasAnalysisResult {
  primaryDisorder: string;
  compensationStatus: string;
  anionGap: number;
  isHighAnionGap: boolean;
  deltaRatio?: number;
  deltaDeltaCategory?: string;
  winterExpectedPCO2?: { min: number; max: number };
  clinicalSummary: string;
}

// 9. Kardiyak & EKG
export interface CardiacQTcResult {
  qtcBazett: number;
  qtcFridericia: number;
  qtcBogossian?: number;
  isProlonged: boolean;
  genderSpecificThreshold: number;
  tisdaleScore?: number;
  tisdaleRisk?: 'Düşük' | 'Orta' | 'Yüksek';
  drugWarnings: string[];
}

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
}

export interface CURB65Result {
  isValid: boolean;
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
  alertClass: string;
}

// 11. Neonatoloji & Pediatrik Acil
export interface BhutaniThresholdItem {
  phototherapy: number;
  exchange: number;
}

export interface BhutaniParams {
  ageHours?: number;
  totalBilirubin?: number;
  gestationalWeeks?: number;
  hasRiskFactors?: boolean;
}

export interface BhutaniResult {
  isValid: boolean;
  message?: string;
  ageHours?: number;
  totalBilirubin?: number;
  gestationalWeeks?: number;
  hasRiskFactors?: boolean;
  riskCategory?: string;
  riskGroupLabel?: string;
  phototherapyThreshold?: number;
  exchangeThreshold?: number;
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
}

export interface RenalDoseCheckParams {
  egfr?: number;
  drugs?: DrugInputItem[];
}

export interface RenalDoseCheckResult {
  isValid: boolean;
  message?: string;
  egfr?: number;
  totalChecked?: number;
  alertsCount?: number;
  hasContraindication?: boolean;
  alertClass?: string;
  warnings?: RenalDoseWarning[];
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
