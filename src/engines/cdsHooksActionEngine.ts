/**
 * CDS HOOKS EYLEME DÖNÜK ÖNERİLER (SUGGESTIONS[]) & KODLU OVERRIDE DENETİM GÜNLÜĞÜ (FAZ 4)
 *
 * Bilimsel Dayanaklar:
 * - HL7 CDS Hooks 2.0 `suggestions[]` & `overrideReasons[]`
 * - Payne TH et al., JAMIA 2015; Russ AL et al., JAMIA 2014; Marcilly R et al., JBI 2018
 * - Tilson H et al., AJHP 2016 (3 görsel davranış + düşük bilişsel yük)
 */

export interface CdsSafeAlternativeSpec {
  targetKey: string;
  targetNameTr: string;
  alternativeBrand: string;
  alternativeGeneric: string;
  alternativeAtc: string;
  alternativeLabelTr: string;
  rationaleTr: string;
}

export interface CdsHookActionSuggestion {
  id: string;
  actionType: 'REMOVE_DRUG' | 'SWITCH_ALTERNATIVE' | 'ADD_LAB_ORDER';
  labelTr: string;
  targetDrugKey?: string;
  targetDrugBrand?: string;
  targetDrugAtc?: string;
  replacementBrand?: string;
  replacementGeneric?: string;
  replacementAtc?: string;
  labOrderText?: string;
  loincCode?: string | null;
}

export interface CodedOverrideReason {
  code: string;
  display: string;
}

export interface OverrideAuditLogEntry {
  cardUuid: string;
  ruleId: string;
  pairLabel: string;
  overrideCode: string;
  overrideDisplay: string;
  note?: string;
  timestampIso: string;
}

/**
 * CHK-16 uyumlu kodlu geçersiz kılma (override) gerekçeleri (<=4 buton, <=2 kelime)
 */
export const CODED_OVERRIDE_REASONS: CodedOverrideReason[] = [
  { code: 'specialist-approval', display: 'Uzman onayı' },
  { code: 'drug-discontinued', display: 'İlaç kesildi' },
  { code: 'no-alternative', display: 'Alternatif yok' },
  { code: 'monitored-use', display: 'Yakın izlem' }
];

const SAFE_ALTERNATIVES_MAP: Record<string, CdsSafeAlternativeSpec> = {
  clarithromycin: {
    targetKey: 'clarithromycin',
    targetNameTr: 'Klaritromisin',
    alternativeBrand: 'AZITRO 500 MG FILM TABLET',
    alternativeGeneric: 'Azitromisin',
    alternativeAtc: 'J01FA10',
    alternativeLabelTr: 'Azitromisin\'e Geç',
    rationaleTr: 'CYP3A4/P-gp inhibisyonu minimaldir'
  },
  omeprazole: {
    targetKey: 'omeprazole',
    targetNameTr: 'Omeprazol',
    alternativeBrand: 'PANTPAS 40 MG ENTERIK TABLET',
    alternativeGeneric: 'Pantoprazol',
    alternativeAtc: 'A02BC02',
    alternativeLabelTr: 'Pantoprazol\'e Geç',
    rationaleTr: 'CYP2C19 inhibisyonu düşüktür (klopidogrel uyumlu)'
  },
  esomeprazole: {
    targetKey: 'esomeprazole',
    targetNameTr: 'Esomeprazol',
    alternativeBrand: 'PANTPAS 40 MG ENTERIK TABLET',
    alternativeGeneric: 'Pantoprazol',
    alternativeAtc: 'A02BC02',
    alternativeLabelTr: 'Pantoprazol\'e Geç',
    rationaleTr: 'CYP2C19 inhibisyonu düşüktür'
  },
  fluticasone: {
    targetKey: 'fluticasone',
    targetNameTr: 'Flutikazon',
    alternativeBrand: 'BECLAZONE 250 MCG INHALER',
    alternativeGeneric: 'Beklometazon',
    alternativeAtc: 'R03BA01',
    alternativeLabelTr: 'Beklometazon\'a Geç',
    rationaleTr: 'CYP3A4 bağımsız esteraz metabolizması (Cushing riski düşük)'
  },
  budesonide: {
    targetKey: 'budesonide',
    targetNameTr: 'Budezonid',
    alternativeBrand: 'BECLAZONE 250 MCG INHALER',
    alternativeGeneric: 'Beklometazon',
    alternativeAtc: 'R03BA01',
    alternativeLabelTr: 'Beklometazon\'a Geç',
    rationaleTr: 'CYP3A4 bağımlılığı düşüktür'
  },
  paroxetine: {
    targetKey: 'paroxetine',
    targetNameTr: 'Paroksetin',
    alternativeBrand: 'EFEXOR XR 75 MG KAPSUL',
    alternativeGeneric: 'Venlafaksin',
    alternativeAtc: 'N06AX16',
    alternativeLabelTr: 'Venlafaksin\'e Geç',
    rationaleTr: 'CYP2D6 inhibisyonu minimaldir (tamoksifen/ön-ilaç uyumlu)'
  },
  fluoxetine: {
    targetKey: 'fluoxetine',
    targetNameTr: 'Fluoksetin',
    alternativeBrand: 'EFEXOR XR 75 MG KAPSUL',
    alternativeGeneric: 'Venlafaksin',
    alternativeAtc: 'N06AX16',
    alternativeLabelTr: 'Venlafaksin\'e Geç',
    rationaleTr: 'CYP2D6 inhibisyonu minimaldir'
  },
  simvastatin: {
    targetKey: 'simvastatin',
    targetNameTr: 'Simvastatin',
    alternativeBrand: 'PRAVACHOL 40 MG TABLET',
    alternativeGeneric: 'Pravastatin',
    alternativeAtc: 'C10AA03',
    alternativeLabelTr: 'Pravastatin\'e Geç',
    rationaleTr: 'CYP3A4 ile metabolize olmaz'
  },
  atorvastatin: {
    targetKey: 'atorvastatin',
    targetNameTr: 'Atorvastatin',
    alternativeBrand: 'PRAVACHOL 40 MG TABLET',
    alternativeGeneric: 'Pravastatin',
    alternativeAtc: 'C10AA03',
    alternativeLabelTr: 'Pravastatin\'e Geç',
    rationaleTr: 'CYP3A4 bağımsız statin alternatifi'
  },
  verapamil: {
    targetKey: 'verapamil',
    targetNameTr: 'Verapamil',
    alternativeBrand: 'NORVASC 5 MG TABLET',
    alternativeGeneric: 'Amlodipin',
    alternativeAtc: 'C08CA01',
    alternativeLabelTr: 'Amlodipin\'e Geç',
    rationaleTr: 'AV düğümü baskılamaz'
  },
  diltiazem: {
    targetKey: 'diltiazem',
    targetNameTr: 'Diltiazem',
    alternativeBrand: 'NORVASC 5 MG TABLET',
    alternativeGeneric: 'Amlodipin',
    alternativeAtc: 'C08CA01',
    alternativeLabelTr: 'Amlodipin\'e Geç',
    rationaleTr: 'AV düğümü baskılamaz'
  },
  diclofenac: {
    targetKey: 'diclofenac',
    targetNameTr: 'Diklofenak',
    alternativeBrand: 'PAROL 500 MG TABLET',
    alternativeGeneric: 'Parasetamol',
    alternativeAtc: 'N02BE01',
    alternativeLabelTr: 'Parasetamol\'e Geç',
    rationaleTr: 'Nefrotoksik/GİS kanama riski taşımaz'
  },
  ibuprofen: {
    targetKey: 'ibuprofen',
    targetNameTr: 'İbuprofen',
    alternativeBrand: 'PAROL 500 MG TABLET',
    alternativeGeneric: 'Parasetamol',
    alternativeAtc: 'N02BE01',
    alternativeLabelTr: 'Parasetamol\'e Geç',
    rationaleTr: 'Nefrotoksik/GİS kanama riski taşımaz'
  },
  naproxen: {
    targetKey: 'naproxen',
    targetNameTr: 'Naproksen',
    alternativeBrand: 'PAROL 500 MG TABLET',
    alternativeGeneric: 'Parasetamol',
    alternativeAtc: 'N02BE01',
    alternativeLabelTr: 'Parasetamol\'e Geç',
    rationaleTr: 'Nefrotoksik/GİS kanama riski taşımaz'
  },
  dexketoprofen: {
    targetKey: 'dexketoprofen',
    targetNameTr: 'Deksketoprofen',
    alternativeBrand: 'PAROL 500 MG TABLET',
    alternativeGeneric: 'Parasetamol',
    alternativeAtc: 'N02BE01',
    alternativeLabelTr: 'Parasetamol\'e Geç',
    rationaleTr: 'Nefrotoksik/GİS kanama riski taşımaz'
  },
  trimethoprim_sulfamethoxazole: {
    targetKey: 'trimethoprim_sulfamethoxazole',
    targetNameTr: 'TMP-SMX (Bactrim)',
    alternativeBrand: 'MONUROL 3 G SASE',
    alternativeGeneric: 'Fosfomisin',
    alternativeAtc: 'J01XX01',
    alternativeLabelTr: 'Fosfomisin\'e Geç',
    rationaleTr: 'ENaC blokajı / hiperkalemi riski yoktur'
  }
};

/**
 * Bir etkileşim çifti veya uyarısı için tek tıkla uygulanabilir CDS Hooks `suggestions[]` üretir.
 */
export function buildCdsHookSuggestions(params: {
  cardId: string;
  drugAKey?: string;
  drugABrand?: string;
  drugAAtc?: string;
  drugBKey?: string;
  drugBBrand?: string;
  drugBAtc?: string;
  missingLabs?: Array<{ labelTr: string; loincCode: string | null }>;
}): CdsHookActionSuggestion[] {
  const out: CdsHookActionSuggestion[] = [];
  const keyA = String(params.drugAKey || '').toLowerCase();
  const keyB = String(params.drugBKey || '').toLowerCase();

  // 1. Güvenli Alternatife Geç önerisi (öncelikli eylem!)
  const altA = SAFE_ALTERNATIVES_MAP[keyA];
  const altB = SAFE_ALTERNATIVES_MAP[keyB];
  if (altA) {
    out.push({
      id: `${params.cardId}-switch-a`,
      actionType: 'SWITCH_ALTERNATIVE',
      labelTr: altA.alternativeLabelTr,
      targetDrugKey: keyA,
      targetDrugBrand: params.drugABrand,
      targetDrugAtc: params.drugAAtc,
      replacementBrand: altA.alternativeBrand,
      replacementGeneric: altA.alternativeGeneric,
      replacementAtc: altA.alternativeAtc
    });
  } else if (altB) {
    out.push({
      id: `${params.cardId}-switch-b`,
      actionType: 'SWITCH_ALTERNATIVE',
      labelTr: altB.alternativeLabelTr,
      targetDrugKey: keyB,
      targetDrugBrand: params.drugBBrand,
      targetDrugAtc: params.drugBAtc,
      replacementBrand: altB.alternativeBrand,
      replacementGeneric: altB.alternativeGeneric,
      replacementAtc: altB.alternativeAtc
    });
  }

  // 2. İlacı Kaldır (tetikleyici / ikinci ilaç)
  const removableBrand = params.drugBBrand || params.drugABrand;
  const removableAtc = params.drugBBrand ? params.drugBAtc : params.drugAAtc;
  const removableKey = params.drugBBrand ? keyB : keyA;
  if (removableBrand) {
    out.push({
      id: `${params.cardId}-remove`,
      actionType: 'REMOVE_DRUG',
      labelTr: `${removableBrand.split(' ')[0]} Kaldır`,
      targetDrugKey: removableKey,
      targetDrugBrand: removableBrand,
      targetDrugAtc: removableAtc
    });
  }

  // 3. Eksik Lab / İzlem Notuna Ekle (çevrimdışı missing_context_fallback)
  if (Array.isArray(params.missingLabs) && params.missingLabs.length > 0) {
    const lab = params.missingLabs[0];
    const loincPart = lab.loincCode ? ` [LOINC ${lab.loincCode}]` : '';
    out.push({
      id: `${params.cardId}-lab`,
      actionType: 'ADD_LAB_ORDER',
      labelTr: `İzlem Ekle: ${lab.labelTr}`,
      labOrderText: `İzlem İstemi: ${lab.labelTr}${loincPart}`,
      loincCode: lab.loincCode
    });
  }

  return out;
}

const OVERRIDE_LOG_STORAGE_KEY = 'klinik_cds_override_audit_v1';

export function loadOverrideAuditLog(): OverrideAuditLogEntry[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(OVERRIDE_LOG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as OverrideAuditLogEntry[];
      }
    }
  } catch {
    // Çevrimdışı/Node ortamında sessiz geç
  }
  return [];
}

export function recordOverrideAuditEntry(entry: Omit<OverrideAuditLogEntry, 'timestampIso'>): OverrideAuditLogEntry {
  const full: OverrideAuditLogEntry = {
    ...entry,
    timestampIso: new Date().toISOString()
  };
  try {
    if (typeof localStorage !== 'undefined') {
      const existing = loadOverrideAuditLog();
      const updated = [full, ...existing].slice(0, 200);
      localStorage.setItem(OVERRIDE_LOG_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // Kota/Node ortamı yoksay
  }
  return full;
}
