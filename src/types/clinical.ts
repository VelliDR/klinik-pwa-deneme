/**
 * KLİNİK KARAR DESTEK ASİSTANI - TEMEL KLİNİK VERİ TİPLERİ
 */

export type Gender = 'M' | 'F' | 'male' | 'female';

export type AgeUnit = 'years' | 'months' | 'weeks' | 'days';

export type AgeGroupKey = 
  | 'NEONATE'
  | 'INFANT'
  | 'TODDLER'
  | 'PRESCHOOL'
  | 'CHILD'
  | 'ADOLESCENT'
  | 'ADULT'
  | 'GERIATRIC';

export interface AgeGroupDefinition {
  id: AgeGroupKey;
  label: string;
  isPediatric: boolean;
}

export interface PatientBiometry {
  ageYears: number | null;
  ageMonths: number | null;
  ageWeeks: number | null;
  ageDays: number | null;
  ageHours: number | null;
  dob: string | null;
  birthTime: string | null;
  ageFormatted: string | null;
  ageGroupTag: string | null;
  isNeonate: boolean;
  birthWeightG: number | null;
  gender: Gender | null;
  weightKg: number | null;
  heightCm: number | null;
  bsa: number | null;
  egfr: number | null;
  egfrAbsolute?: number | null;
  egfrFormula?: string | null;
  cystatinC?: number | null;
}

import type {
  PercentilesResult,
  TargetHeightResult,
  CorrectedAgeResult,
  PediatricBPResult,
  CentorResult,
  PediatricDoseResult,
  PEWSResult,
  GCSResult,
  PediatricIronResult,
  AlvaradoResult,
  RansonResult,
  ParklandResult,
  SutureGuidance,
  ObstetricsResult,
  BishopResult,
  PreeclampsiaResult,
  BloodGasResult,
  MaintenanceFluidResult,
  NeonatalFluidResult,
  SodiumCorrectionResult,
  CalciumResult,
  InfusionRateResult,
  GIRResult,
  SteroidConversionResult,
  HOMAIRResult,
  NEWS2Result,
  QTcResult,
  AxisResult,
  WellsDVTResult,
  WellsPTEResult,
  PERCResult,
  CHA2DS2VAScResult,
  HASBLEDResult,
  HEARTResult,
  FENaResult,
  FEUreaResult,
  CorrectedSodiumResult,
  OsmolalGapResult,
  RumackMatthewResult,
  CURB65Result,
  BhutaniResult,
  APGARResult,
  WestleyCroupResult,
  CDSDehydrationResult,
  NeonatalWeightLossResult,
  RenalDoseCheckResult,
  TripleWhammyResult,
  PregnancySafetyResult,
  NeonatalDrugSafetyResult,
  SerotoninSyndromeResult,
  HyperkalemiaRiskResult,
  CypStatinInteractionResult,
  AnaphylaxisDoses,
  StatusEpilepticusDoses
} from './engines';

export interface SelectedDrugItem {
  brand?: string;
  brandName?: string;
  name?: string;
  generic?: string;
  atc?: string;
  atcCode?: string;
  barcode?: string;
  rx?: string;
  company?: string;
  kt?: string | null;
  kub?: string | null;
  [key: string]: unknown;
}

export interface AppState {
  biometry: PatientBiometry;
  pediatrics: {
    active: boolean;
    percentiles: PercentilesResult | null;
    targetHeight: TargetHeightResult | null;
    correctedAge: CorrectedAgeResult | null;
    bp: PediatricBPResult | null;
    centor: CentorResult | null;
    vaccines: string[] | null;
    syrupDose: PediatricDoseResult | null;
    pews: PEWSResult | null;
    pgcs: GCSResult | null;
    iron?: PediatricIronResult | null;
  };
  surgery: {
    active: boolean;
    alvarado: AlvaradoResult | null;
    ranson: RansonResult | null;
    parkland: ParklandResult | null;
    suture: SutureGuidance | null;
  };
  obgyn: {
    active: boolean;
    eddData: ObstetricsResult | null;
    bishop: BishopResult | null;
    preeclampsia: PreeclampsiaResult | null;
  };
  medicine: {
    active: boolean;
    bloodGas: BloodGasResult | null;
    fluid: MaintenanceFluidResult | null;
    neonatalFluid: NeonatalFluidResult | null;
    sodium: SodiumCorrectionResult | null;
    calcium: CalciumResult | null;
    infusion: InfusionRateResult | null;
    gir: GIRResult | null;
    steroid: SteroidConversionResult | null;
    homaIR: HOMAIRResult | null;
    news2: NEWS2Result | null;
    gcs: GCSResult | null;
  };
  other: {
    active: boolean;
    cardiac: QTcResult | null;
    axis?: AxisResult | null;
    drugPrescription: SelectedDrugItem[] | null;
  };
  thrombosis: {
    active: boolean;
    wellsDVT: WellsDVTResult | null;
    wellsPTE: WellsPTEResult | null;
    perc: PERCResult | null;
    cha2ds2vasc: CHA2DS2VAScResult | null;
    hasbled: HASBLEDResult | null;
    heart: HEARTResult | null;
  };
  nephroTox: {
    active: boolean;
    fena: FENaResult | null;
    feurea: FEUreaResult | null;
    correctedSodium: CorrectedSodiumResult | null;
    osmolalGap: OsmolalGapResult | null;
    paracetamol: RumackMatthewResult | null;
    curb65: CURB65Result | null;
  };
  neonatology: {
    active: boolean;
    bhutani: BhutaniResult | null;
    apgar: APGARResult | null;
    westleyCroup: WestleyCroupResult | null;
    cdsDehydration: CDSDehydrationResult | null;
    weightLoss: NeonatalWeightLossResult | null;
  };
  safetyPrescription: {
    active: boolean;
    renalAdjustments: RenalDoseCheckResult | null;
    tripleWhammy: TripleWhammyResult | null;
    pregnancySafety: PregnancySafetyResult | null;
    neonatalDrugSafety: NeonatalDrugSafetyResult | null;
    serotoninSyndrome: SerotoninSyndromeResult | null;
    hyperkalemiaRisk: HyperkalemiaRiskResult | null;
    cypStatinInteraction: CypStatinInteractionResult | null;
    selectedSafetyDrugs: SelectedDrugItem[];
  };
  treatment?: {
    active?: boolean;
    selectedDrugs?: SelectedDrugItem[];
  };
  emergency?: {
    active: boolean;
    anaphylaxis: {
      administeredDoses: number;
      lastDoseTimestamp?: number;
      doses?: AnaphylaxisDoses;
      notes?: string;
    } | null;
    statusEpilepticus: {
      elapsedMinutes: number;
      isRunning: boolean;
      doses?: StatusEpilepticusDoses;
      notes?: string;
    } | null;
  };
}
