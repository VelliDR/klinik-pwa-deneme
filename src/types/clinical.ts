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
}

export interface AppState {
  biometry: PatientBiometry;
  pediatrics: {
    active: boolean;
    percentiles: any;
    targetHeight: any;
    correctedAge: any;
    bp: any;
    centor: any;
    vaccines: any;
    syrupDose: any;
    pews: any;
    pgcs: any;
    iron?: any;
  };
  surgery: {
    active: boolean;
    alvarado: any;
    ranson: any;
    parkland: any;
    suture: any;
  };
  obgyn: {
    active: boolean;
    eddData: any;
    bishop: any;
    preeclampsia: any;
  };
  medicine: {
    active: boolean;
    bloodGas: any;
    fluid: any;
    neonatalFluid: any;
    sodium: any;
    calcium: any;
    infusion: any;
    gir: any;
    steroid: any;
    homaIR: any;
    news2: any;
    gcs: any;
  };
  other: {
    active: boolean;
    cardiac: any;
    axis?: any;
    drugPrescription: any;
  };
  thrombosis: {
    active: boolean;
    wellsDVT: any;
    wellsPTE: any;
    perc: any;
    cha2ds2vasc: any;
    hasbled: any;
    heart: any;
  };
  nephroTox: {
    active: boolean;
    fena: any;
    feurea: any;
    correctedSodium: any;
    osmolalGap: any;
    paracetamol: any;
    curb65: any;
  };
  neonatology: {
    active: boolean;
    bhutani: any;
    apgar: any;
    westleyCroup: any;
    cdsDehydration: any;
    weightLoss: any;
  };
  safetyPrescription: {
    active: boolean;
    renalAdjustments: any;
    tripleWhammy: any;
    pregnancySafety: any;
    neonatalDrugSafety: any;
    selectedSafetyDrugs: any[];
  };
  treatment?: {
    active?: boolean;
    selectedDrugs?: any[];
  };
}
