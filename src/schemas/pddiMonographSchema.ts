/**
 * W3C HCLS PDDI-MIM + HL7 FHIR R4 PDDI-CDS + DRIVE/LIVERPOOL GRADE KANONİK ŞEMA
 * VE GENİŞLETİLMİŞ REGENSTRIEF LOINC/UCUM DOĞRULAMA SÖZLÜĞÜ
 *
 * Tek Doğruluk Kaynağı:
 * - `src/engines/pddiMonographEngine.ts` (çalışma zamanı motoru)
 * - `tests/test_monograph_pddi_gate.ts` (anti-halüsinasyon & kalite kapısı)
 * - `busy-shannon` ETL boru hattı ile hizalı alan sözleşmesi
 */

export type ActionTier = 'X' | 'D' | 'C' | 'B' | 'A';

export type LiverpoolGradeLevel = 'HIGH_1' | 'MODERATE_2' | 'LOW_3' | 'VERY_LOW_4';

export type LegacyEvidenceLevel = 'kesin' | 'olasi' | 'teorik';

export type CanonicalSourceType =
  | 'TITCK_KUB'
  | 'EMA_EPAR'
  | 'FDA_SPL'
  | 'PEER_REVIEWED_GUIDELINE'
  | 'PEER_REVIEWED_STUDY'
  | 'ANSM_2023'
  | 'FDA_CYP_TABLE';

export type SupplementSourceType =
  | CanonicalSourceType
  | 'EMA_HMPC'
  | 'NIH_ODS'
  | 'NIH_NAPDI'
  | 'NIH_LIVERTOX'
  | 'FDA_SAFETY_COMM'
  | 'EFSA_OPINION';

export type CompatSourceType =
  | CanonicalSourceType
  | 'OPENFDA_SPL'
  | 'ONC_15'
  | 'CLINICAL_GUIDELINE';

export type ClassExtrapolationPolicy = 'MOLECULE_SPECIFIC_ONLY' | 'CLASS_WIDE';

export type InteractionDirectionality =
  | 'UNIDIRECTIONAL_PK'
  | 'BIDIRECTIONAL_PK'
  | 'SYMMETRIC_PD';

export type ReviewStatus = 'author_draft_unreviewed' | 'PEER_REVIEWED_APPROVED';

export const UNKNOWN_EPIDEMIOLOGY_SENTINEL = 'kanıt yok / literatürde tanımlanmamış';

export const ANSM_ARCHIVE_CUTOFF_ISO = '2023-09-15';

export interface VerifiedLoincEntry {
  code: string;
  longCommonName: string;
  ucumUnit: string | null;
  allowedUnits?: string[];
  allowedParamRegex: RegExp;
  isCore17: boolean;
}

/**
 * Genişletilmiş Regenstrief LOINC Doğrulama Sözlüğü:
 * - 17 çekirdek klinik izlem LOINC kodu (Rapor Bölüm 3.3)
 * - PDDI izlem şablonlarında kullanılan doğrulanmış Regenstrief lab/vital kodları
 * - Her kod yalnızca uyumlu klinik parametre ve UCUM birimiyle eşleştirilebilir.
 */
export const VERIFIED_LOINC_REGISTRY: Record<string, VerifiedLoincEntry> = {
  // --- 17 Çekirdek LOINC Kodu (Rapor Bölüm 3.3) ---
  '8636-3': {
    code: '8636-3',
    longCommonName: 'Q-T interval corrected',
    ucumUnit: 'ms',
    allowedUnits: ['ms', 's'],
    allowedParamRegex: /qtc|q-?t\s*aral|qt\s*interval|ekg/i,
    isCore17: true
  },
  '76635-2': {
    code: '76635-2',
    longCommonName: 'QTc by Bazett',
    ucumUnit: 'ms',
    allowedUnits: ['ms'],
    allowedParamRegex: /qtc|bazett|ekg/i,
    isCore17: true
  },
  '76634-5': {
    code: '76634-5',
    longCommonName: 'QTc by Fridericia',
    ucumUnit: 'ms',
    allowedUnits: ['ms'],
    allowedParamRegex: /qtc|fridericia|ekg/i,
    isCore17: true
  },
  '8634-8': {
    code: '8634-8',
    longCommonName: 'Q-T interval',
    ucumUnit: 'ms',
    allowedUnits: ['ms', 's'],
    allowedParamRegex: /\bqt\b|q-?t\s*aral/i,
    isCore17: true
  },
  '34534-8': {
    code: '34534-8',
    longCommonName: '12 lead EKG panel',
    ucumUnit: null,
    allowedParamRegex: /12[\s-]*derivasyon|12[\s-]*lead|ekg|ecg/i,
    isCore17: true
  },
  '2823-3': {
    code: '2823-3',
    longCommonName: 'Potassium [Moles/volume] in Serum or Plasma',
    ucumUnit: 'mmol/L',
    allowedUnits: ['mmol/L', 'mEq/L'],
    allowedParamRegex: /potasyum|potassium|\bk[⁺+]?\b/i,
    isCore17: true
  },
  '2160-0': {
    code: '2160-0',
    longCommonName: 'Creatinine [Mass/volume] in Serum or Plasma',
    ucumUnit: 'mg/dL',
    allowedUnits: ['mg/dL', 'umol/L'],
    allowedParamRegex: /kreatinin|creatinine|\bscr\b/i,
    isCore17: true
  },
  '98979-8': {
    code: '98979-8',
    longCommonName: 'Glomerular filtration rate/1.73 sq M (CKD-EPI 2021)',
    ucumUnit: 'mL/min/1.73m2',
    allowedUnits: ['mL/min/1.73m2', 'mL/min/1.73m^2', 'mL/dk/1.73m2'],
    allowedParamRegex: /egfr|gfr|glomerüler|böbrek\s*fonksiyon/i,
    isCore17: true
  },
  '6301-6': {
    code: '6301-6',
    longCommonName: 'INR in Platelet poor plasma by Coagulation assay',
    ucumUnit: '{INR}',
    allowedUnits: ['{INR}', 'INR'],
    allowedParamRegex: /\binr\b|protrombin/i,
    isCore17: true
  },
  '34714-6': {
    code: '34714-6',
    longCommonName: 'INR in Blood by Coagulation assay (Point-of-care)',
    ucumUnit: '{INR}',
    allowedUnits: ['{INR}', 'INR'],
    allowedParamRegex: /\binr\b|hasta\s*başı|poc/i,
    isCore17: true
  },
  '10535-3': {
    code: '10535-3',
    longCommonName: 'Digoxin [Mass/volume] in Serum or Plasma',
    ucumUnit: 'ng/mL',
    allowedUnits: ['ng/mL', 'ug/L'],
    allowedParamRegex: /digoksin|digoxin/i,
    isCore17: true
  },
  '11253-2': {
    code: '11253-2',
    longCommonName: 'Tacrolimus [Mass/volume] in Blood',
    ucumUnit: 'ng/mL',
    allowedUnits: ['ng/mL', 'ug/L'],
    allowedParamRegex: /takrolimus|tacrolimus/i,
    isCore17: true
  },
  '4092-3': {
    code: '4092-3',
    longCommonName: 'Vancomycin [Mass/volume] in Serum or Plasma --trough',
    ucumUnit: 'ug/mL',
    allowedUnits: ['ug/mL', 'mg/L'],
    allowedParamRegex: /vankomisin|vancomycin/i,
    isCore17: true
  },
  '14334-7': {
    code: '14334-7',
    longCommonName: 'Lithium [Moles/volume] in Serum or Plasma',
    ucumUnit: 'mmol/L',
    allowedUnits: ['mmol/L', 'mEq/L'],
    allowedParamRegex: /lityum|lithium/i,
    isCore17: true
  },
  '3968-5': {
    code: '3968-5',
    longCommonName: 'Phenytoin [Mass/volume] in Serum or Plasma',
    ucumUnit: 'ug/mL',
    allowedUnits: ['ug/mL', 'mg/L'],
    allowedParamRegex: /fenitoin|phenytoin/i,
    isCore17: true
  },
  '3432-2': {
    code: '3432-2',
    longCommonName: 'carBAMazepine [Mass/volume] in Serum or Plasma',
    ucumUnit: 'ug/mL',
    allowedUnits: ['ug/mL', 'mg/L'],
    allowedParamRegex: /karbamazepin|carbamazepine/i,
    isCore17: true
  },
  '74973-9': {
    code: '74973-9',
    longCommonName: 'carBAMazepine [Mass/volume] in Serum or Plasma --trough',
    ucumUnit: 'ug/mL',
    allowedUnits: ['ug/mL', 'mg/L'],
    allowedParamRegex: /karbamazepin|carbamazepine/i,
    isCore17: true
  },

  // --- Genişletilmiş Doğrulanmış Regenstrief Klinik İzlem LOINC Sözlüğü ---
  '19123-9': {
    code: '19123-9',
    longCommonName: 'Magnesium [Mass/volume] in Serum or Plasma',
    ucumUnit: 'mg/dL',
    allowedUnits: ['mg/dL'],
    allowedParamRegex: /magnezyum|magnesium|\bmg/i,
    isCore17: false
  },
  '2157-6': {
    code: '2157-6',
    longCommonName: 'Creatine kinase [Enzymatic activity/volume] in Serum or Plasma',
    ucumUnit: 'U/L',
    allowedUnits: ['U/L'],
    allowedParamRegex: /kreatin\s*kinaz|\bck\b|\bcpk\b/i,
    isCore17: false
  },
  '718-7': {
    code: '718-7',
    longCommonName: 'Hemoglobin [Mass/volume] in Blood',
    ucumUnit: 'g/dL',
    allowedUnits: ['g/dL'],
    allowedParamRegex: /hemoglobin|\bhb\b|\bhgb\b/i,
    isCore17: false
  },
  '6690-2': {
    code: '6690-2',
    longCommonName: 'Leukocytes [#/volume] in Blood by Automated count',
    ucumUnit: '10*3/uL',
    allowedUnits: ['10*3/uL', '/uL', 'K/uL'],
    allowedParamRegex: /tam\s*kan|hemogram|lökosit|\bwbc\b|\banc\b|nötrofil/i,
    isCore17: false
  },
  '777-3': {
    code: '777-3',
    longCommonName: 'Platelets [#/volume] in Blood by Automated count',
    ucumUnit: '10*3/uL',
    allowedUnits: ['10*3/uL', '/uL', 'K/uL'],
    allowedParamRegex: /trombosit|platelet|\bplt\b/i,
    isCore17: false
  },
  '1742-6': {
    code: '1742-6',
    longCommonName: 'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma',
    ucumUnit: 'U/L',
    allowedUnits: ['U/L'],
    allowedParamRegex: /\balt\b|sgpt|alanin|transaminaz|karaciğer\s*enzim/i,
    isCore17: false
  },
  '1920-8': {
    code: '1920-8',
    longCommonName: 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma',
    ucumUnit: 'U/L',
    allowedUnits: ['U/L'],
    allowedParamRegex: /\bast\b|sgot|aspartat/i,
    isCore17: false
  },
  '1975-2': {
    code: '1975-2',
    longCommonName: 'Bilirubin.total [Mass/volume] in Serum or Plasma',
    ucumUnit: 'mg/dL',
    allowedUnits: ['mg/dL'],
    allowedParamRegex: /bilirubin/i,
    isCore17: false
  },
  '2951-2': {
    code: '2951-2',
    longCommonName: 'Sodium [Moles/volume] in Serum or Plasma',
    ucumUnit: 'mmol/L',
    allowedUnits: ['mmol/L', 'mEq/L'],
    allowedParamRegex: /sodyum|sodium|\bna[⁺+]?\b/i,
    isCore17: false
  },
  '2345-7': {
    code: '2345-7',
    longCommonName: 'Glucose [Mass/volume] in Serum or Plasma',
    ucumUnit: 'mg/dL',
    allowedUnits: ['mg/dL'],
    allowedParamRegex: /glukoz|glikoz|kan\s*şekeri|glucose/i,
    isCore17: false
  },
  '2143-6': {
    code: '2143-6',
    longCommonName: 'Cortisol [Mass/volume] in Serum or Plasma',
    ucumUnit: 'ug/dL',
    allowedUnits: ['ug/dL', 'nmol/L'],
    allowedParamRegex: /kortizol|cortisol/i,
    isCore17: false
  },
  '3016-3': {
    code: '3016-3',
    longCommonName: 'Thyrotropin [Units/volume] in Serum or Plasma',
    ucumUnit: 'mIU/L',
    allowedUnits: ['mIU/L', 'uIU/mL'],
    allowedParamRegex: /\btsh\b|tirotropin|thyrotropin/i,
    isCore17: false
  },
  '4086-5': {
    code: '4086-5',
    longCommonName: 'Valproate [Mass/volume] in Serum or Plasma',
    ucumUnit: 'ug/mL',
    allowedUnits: ['ug/mL', 'mg/L'],
    allowedParamRegex: /valpro/i,
    isCore17: false
  },
  '8480-6': {
    code: '8480-6',
    longCommonName: 'Systolic blood pressure',
    ucumUnit: 'mm[Hg]',
    allowedUnits: ['mm[Hg]', 'mmHg'],
    allowedParamRegex: /sistolik|kan\s*basınc|\bskb\b|\bsbp\b/i,
    isCore17: false
  },
  '8867-4': {
    code: '8867-4',
    longCommonName: 'Heart rate',
    ucumUnit: '{beats}/min',
    allowedUnits: ['{beats}/min', '/min', 'bpm'],
    allowedParamRegex: /kalp\s*hızı|nabız|heart\s*rate/i,
    isCore17: false
  },
  '8625-6': {
    code: '8625-6',
    longCommonName: 'P-R interval',
    ucumUnit: 'ms',
    allowedUnits: ['ms'],
    allowedParamRegex: /\bpr\b|p-?r\s*aral/i,
    isCore17: false
  },
  '59408-5': {
    code: '59408-5',
    longCommonName: 'Oxygen saturation in Arterial blood by Pulse oximetry',
    ucumUnit: '%',
    allowedUnits: ['%'],
    allowedParamRegex: /spo2|spo₂|oksijen\s*sat/i,
    isCore17: false
  },
  '9279-1': {
    code: '9279-1',
    longCommonName: 'Respiratory rate',
    ucumUnit: '/min',
    allowedUnits: ['/min', '{breaths}/min'],
    allowedParamRegex: /solunum\s*hızı|respiratory/i,
    isCore17: false
  },
  '8310-5': {
    code: '8310-5',
    longCommonName: 'Body temperature',
    ucumUnit: 'Cel',
    allowedUnits: ['Cel', '°C'],
    allowedParamRegex: /vücut\s*sıcakl|ateş|temperature/i,
    isCore17: false
  },
  '17861-6': {
    code: '17861-6',
    longCommonName: 'Calcium [Mass/volume] in Serum or Plasma',
    ucumUnit: 'mg/dL',
    allowedUnits: ['mg/dL'],
    allowedParamRegex: /kalsiyum|calcium|\bca[²2+]?\b/i,
    isCore17: false
  },
  '3520-4': {
    code: '3520-4',
    longCommonName: 'Cyclosporine [Mass/volume] in Blood',
    ucumUnit: 'ng/mL',
    allowedUnits: ['ng/mL', 'ug/L'],
    allowedParamRegex: /siklosporin|cyclosporin/i,
    isCore17: false
  },
  '49563-0': {
    code: '49563-0',
    longCommonName: 'Troponin I.cardiac [Mass/volume] in Serum or Plasma by High sensitivity method',
    ucumUnit: 'ng/L',
    allowedUnits: ['ng/L', 'pg/mL'],
    allowedParamRegex: /troponin|hs-?ctn/i,
    isCore17: false
  }
};

/**
 * Resmi LOINC kayıtlarında aktif kodu BULUNMAYAN ve `loinc_code: null` olması zorunlu parametreler
 */
export const NULL_LOINC_REQUIRED_REGEX = /\btof\b|train[\s-]*of[\s-]*four/i;

/**
 * Kabul edilen resmi düzenleyici ve hakemli bilimsel kaynak alan adları
 */
export const ALLOWED_EVIDENCE_URL_HOSTS = [
  'titck.gov.tr',
  'ema.europa.eu',
  'fda.gov',
  'accessdata.fda.gov',
  'dailymed.nlm.nih.gov',
  'open.fda.gov',
  'pubmed.ncbi.nlm.nih.gov',
  'pmc.ncbi.nlm.nih.gov',
  'ncbi.nlm.nih.gov',
  'doi.org',
  'loinc.org',
  'w3.org',
  'hl7.org',
  'ich.org',
  'ansm.sante.fr',
  'medicines.org.uk',
  'cpicpgx.org',
  'crediblemeds.org',
  'who.int',
  'bmj.com',
  'nejm.org',
  'jamanetwork.com',
  'thelancet.com',
  'academic.oup.com',
  'ahajournals.org',
  'cmaj.ca',
  'frontiersin.org',
  'springer.com',
  'wiley.com',
  'sciencedirect.com',
  'nature.com',
  'biomedcentral.com',
  'ods.od.nih.gov',
  'nccih.nih.gov',
  'napdi.org',
  'repo.napdi.org',
  'livertox.nih.gov',
  'efsa.europa.eu',
  'offline-cds.local'
] as const;

/**
 * Kesin yasaklı sosyal medya, forum, blog ve kişisel web sitesi alan adları
 */
export const BANNED_EVIDENCE_URL_HOSTS = [
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'reddit.com',
  'eksisozluk.com',
  'kizlarsoruyor.com',
  'quora.com',
  'medium.com',
  'blogspot.com',
  'wordpress.com',
  'substack.com',
  'wikipedia.org',
  'doktortakvimi.com',
  'memorial.com.tr',
  'acibadem.com.tr',
  'medicalpark.com.tr',
  'medicana.com.tr',
  'florence.com.tr',
  'livhospital.com'
] as const;

/**
 * Çözülmemiş yer tutucu veya uydurma kod belirteçleri
 */
export const UNRESOLVED_PLACEHOLDER_REGEX =
  /<[A-Z0-9_]+(?:_LOOKUP|:[^>\s]+)?>|\b(?:TODO|FIXME|PLACEHOLDER|XXX|TBD)\b|\b000000\b/;

/**
 * Türkçe KÜB / EBYS e-imza, doğrulama kodu ve TÜFAM şablon artefaktı tespiti
 */
export const EBYS_ARTIFACT_REGEX =
  /(?:5070\s+sayılı\s+Elektronik\s+İmza|güvenli\s+elektronik\s+imza|elektronik\s+imza\s+ile\s+imzalanmıştır|elektronik\s+olarak\s+imzalanmıştır|ile\s+imzalanmıştır|doğrulama\s+kodu\s*:|belge\s+takip\s+adresi|ebs\.titck\.gov\.tr|turkiye\.gov\.tr\/saglik-titck-ebys|tufam@titck\.gov\.tr|Türkiye\s+Farmakovijilans\s+Merkezi\s*\(TÜFAM\)|çiftElektronik)/i;

/**
 * Türkçe büyük/küçük harf (`İ/I -> i/ı`) ve boşluk normalizasyonu (yerel KÜB çapraz doğrulaması için)
 */
export function normalizeTrForQuoteMatch(raw: unknown): string {
  return String(raw || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Yalnızca üretici KÜB/etiket kaynaklarına dayanan (klinik/PK çalışma veya hakemli kılavuz atfı içermeyen)
 * assertion kümesi mi? Liverpool GRADE / DRIVE İlke 4 gereği böyle kayıtlar VERY_LOW_4 olmalıdır.
 */
export function isRegulatoryLabelOnlyEvidence(
  assertions: Array<{ source_type?: string; identifier?: string; section?: string }>
): boolean {
  if (!Array.isArray(assertions) || assertions.length === 0) return true;
  const clinicalOrPkStudyTypes = new Set([
    'PEER_REVIEWED_STUDY',
    'PEER_REVIEWED_GUIDELINE',
    'FDA_CYP_TABLE',
    'ONC_15',
    'CLINICAL_GUIDELINE'
  ]);
  return !assertions.some(a => {
    const st = String(a.source_type || '').toUpperCase();
    if (clinicalOrPkStudyTypes.has(st)) return true;
    const id = String(a.identifier || '');
    if (/\b(?:PMID|PMCID|DOI):/i.test(id) || /10\.\d{4,9}\//i.test(id)) return true;
    return false;
  });
}

export function normalizeSourceType(raw: string): CanonicalSourceType {
  const up = String(raw || '').trim().toUpperCase();
  if (up === 'OPENFDA_SPL') return 'FDA_SPL';
  if (up === 'ONC_15' || up === 'CLINICAL_GUIDELINE') return 'PEER_REVIEWED_GUIDELINE';
  if (
    up === 'TITCK_KUB' ||
    up === 'EMA_EPAR' ||
    up === 'FDA_SPL' ||
    up === 'PEER_REVIEWED_GUIDELINE' ||
    up === 'PEER_REVIEWED_STUDY' ||
    up === 'ANSM_2023' ||
    up === 'FDA_CYP_TABLE'
  ) {
    return up;
  }
  return 'TITCK_KUB';
}

export function validateLoincMonitoringItem(item: {
  parameter_tr?: string;
  loinc_code?: string | null;
  ucum_unit?: string | null;
}): string | null {
  const param = String(item.parameter_tr || '').trim();
  const code = item.loinc_code === undefined ? null : item.loinc_code;

  // Özel tuzak kontrolü: Train-of-Four (TOF) için resmi aktif LOINC kodu yoktur -> null zorunlu!
  if (NULL_LOINC_REQUIRED_REGEX.test(param)) {
    if (code !== null && String(code).trim() !== '') {
      return `TOF / nöromüsküler blokaj izlemi ("${param}") için resmi LOINC kodu yoktur; loinc_code=null olmalıdır (bulunan: "${code}").`;
    }
    return null;
  }

  if (code === null || String(code).trim() === '') {
    return null;
  }

  const trimmedCode = String(code).trim();
  const reg = VERIFIED_LOINC_REGISTRY[trimmedCode];
  if (!reg) {
    return `Doğrulanmamış / beyaz liste dışı LOINC kodu: "${trimmedCode}" (parametre: "${param}").`;
  }

  if (param && !reg.allowedParamRegex.test(param)) {
    return `Anlamsal LOINC uyuşmazlığı: "${trimmedCode}" (${reg.longCommonName}) kodu "${param}" parametresine atanamaz.`;
  }

  if (item.ucum_unit && reg.ucumUnit) {
    const allowed = reg.allowedUnits || [reg.ucumUnit];
    if (!allowed.includes(item.ucum_unit)) {
      return `UCUM birim uyuşmazlığı: LOINC "${trimmedCode}" için beklenen [${allowed.join(', ')}], bulunan "${item.ucum_unit}".`;
    }
  }

  return null;
}

export function validateEvidenceUrl(urlStr: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return `Geçersiz URL biçimi: "${urlStr}"`;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:' && parsed.protocol !== 'offline-cds:') {
    return `Desteklenmeyen URL protokolü: "${urlStr}"`;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (BANNED_EVIDENCE_URL_HOSTS.some(b => host === b || host.endsWith('.' + b))) {
    return `Yasaklı kaynak alan adı (sosyal medya/forum/blog/kişisel site): "${host}" (${urlStr})`;
  }
  if (!ALLOWED_EVIDENCE_URL_HOSTS.some(a => host === a || host.endsWith('.' + a))) {
    return `Yetkisiz kaynak alan adı (yalnızca resmi düzenleyici kurumlar ve hakemli literatür kabul edilir): "${host}" (${urlStr})`;
  }
  return null;
}
