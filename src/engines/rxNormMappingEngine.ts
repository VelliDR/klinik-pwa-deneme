/**
 * klinik-pwa - Offline RxNorm CUI & ATC Drug Concept Mapping Engine (TypeScript)
 * 
 * Clinical & Regulatory Context:
 * 1. NLM RxNav Drug Interaction API Deprecation:
 *    The upstream public US National Library of Medicine (NLM) RxNav Drug-Drug Interaction
 *    API (rxnav.nlm.nih.gov) was permanently discontinued/sunset in 2024. Web applications
 *    depending on remote RxNav API endpoints fail, hang, or introduce network vulnerabilities.
 * 2. 100% Offline-First Architectural Mandate:
 *    For critical pediatric and emergency CDSS (resuscitation, intensive care, radiology, rural,
 *    and offline progressive web app scenarios), all drug concept identification and interaction
 *    mechanisms MUST execute synchronously and deterministically in-memory without external HTTP calls.
 * 3. Licensing & Standardized Ontologies:
 *    Third-party academic interaction datasets (such as DDInter 2.0) carry restrictive Non-Commercial
 *    (CC BY-NC) licenses that prevent embedding in permissive open-source (MIT) systems. This engine
 *    utilizes public-domain standard RxNorm Concept Unique Identifiers (RxCUI) mapped to WHO ATC codes
 *    and Turkish Medicines and Medical Devices Agency (TİTCK) approved active substances and trade names.
 * 
 * Standards & References:
 * - US National Library of Medicine (NLM) RxNorm Concept Architecture (Standard CUIs)
 * - WHO Collaborating Centre for Drug Statistics Methodology (Anatomical Therapeutic Chemical - ATC)
 * - T.C. Sağlık Bakanlığı TİTCK Ruhsatlı İlaçlar Listesi ve Etkin Madde Standartları
 * - NLM Discontinuation of RxNav Interaction API Service Notice (2024)
 */

import type { DrugInputItem } from '../types/engines';

export interface RxNormConceptDefinition {
  canonicalKey: string;
  rxCui: string;
  displayNameTr: string;
  displayNameEn: string;
  atcCodes: string[];
  aliases: string[];
  drugClasses: string[];
  isControlledSubstance?: boolean;
  pediatricHighAlert?: boolean;
  boxedWarning?: boolean;
  halfLifeHours?: number;
  cypMetabolism?: {
    substrates?: string[];
    inhibitors?: string[];
    inducers?: string[];
  };
  renalEliminationPercent?: number;
}

export type ConceptMatchConfidence =
  | 'EXACT_CUI'
  | 'EXACT_ATC'
  | 'CANONICAL_KEY'
  | 'EXACT_GENERIC'
  | 'BRAND_ALIAS'
  | 'TOKEN_MATCH';

export interface ResolvedRxConcept {
  canonicalKey: string;
  displayNameTr: string;
  displayNameEn: string;
  rxCui: string;
  atcCodes: string[];
  drugClasses: string[];
  isControlledSubstance: boolean;
  pediatricHighAlert: boolean;
  boxedWarning: boolean;
  dataSource: 'OFFLINE_RXNORM_TITCK_ONTOLOGY';
  rawInput: string | Record<string, unknown>;
  confidence: ConceptMatchConfidence;
}

export interface OfflineOntologyStats {
  totalConcepts: number;
  totalAliases: number;
  totalAtcCodes: number;
  version: string;
  lastUpdated: string;
  license: string;
  offlineGuaranteed: boolean;
  rxNavApiStatus: 'PERMANENTLY_DEPRECATED_UPSTREAM';
}

/**
 * Turkish and international string normalization helper
 * Properly handles Turkish dotted/dotless I (İ/i, I/ı), diacritics, and punctuation.
 */
export function normalizeRxText(text: unknown): string {
  if (!text) return '';
  return String(text)
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFC')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s/+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safe word-boundary or token matching for short strings
 */
function containsKeywordSafe(normText: string, rawKeyword: string): boolean {
  const normK = normalizeRxText(rawKeyword);
  if (!normK || !normText) return false;
  if (normK.length <= 4) {
    const escaped = normK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
    return regex.test(normText);
  }
  return normText.includes(normK);
}

/**
 * Comprehensive Offline RxNorm & ATC Concept Mapping Database (136 curated concepts)
 */
export const OFFLINE_RXNORM_CONCEPTS: RxNormConceptDefinition[] = [
  // --- 1. ANTIMICROBIALS & ANTIBIOTICS ---
  {
    canonicalKey: 'ceftriaxone',
    rxCui: '2193',
    displayNameTr: 'Seftriakson',
    displayNameEn: 'Ceftriaxone',
    atcCodes: ['J01DD04'],
    aliases: ['rocephin', 'novosef', 'unacefin', 'iesef', 'desefin', 'ceftinex', 'forsef', 'ceforce', 'metcef', 'seftriakson', 'ceftriaxone sodium'],
    drugClasses: ['cephalosporin_3g', 'antibacterial', 'beta_lactam', 'calcium_incompatible_neonatal', 'qt_prolonging_conditional'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'cefotaxime',
    rxCui: '2194',
    displayNameTr: 'Sefotaksim',
    displayNameEn: 'Cefotaxime',
    atcCodes: ['J01DD01'],
    aliases: ['claforan', 'sefotaksim', 'taxim', 'cefotaxime sodium'],
    drugClasses: ['cephalosporin_3g', 'antibacterial', 'beta_lactam'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'ampicillin',
    rxCui: '7980',
    displayNameTr: 'Ampisilin',
    displayNameEn: 'Ampicillin',
    atcCodes: ['J01CA01'],
    aliases: ['ampisina', 'alfasilin', 'makrosilin', 'ampisilin', 'pentrexyl'],
    drugClasses: ['aminopenicillin', 'antibacterial', 'beta_lactam'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'gentamicin',
    rxCui: '24514',
    displayNameTr: 'Gentamisin',
    displayNameEn: 'Gentamicin',
    atcCodes: ['J01GB03', 'S01AA11'],
    aliases: ['gentagut', 'getamisin', 'gentamisin', 'gensina', 'garamycin', 'genthaver'],
    drugClasses: ['aminoglycoside', 'antibacterial', 'nephrotoxic', 'ototoxic', 'narrow_therapeutic_index'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'vancomycin',
    rxCui: '11124',
    displayNameTr: 'Vankomisin',
    displayNameEn: 'Vancomycin',
    atcCodes: ['J01XA01', 'A07AA09'],
    aliases: ['vancocin', 'vankomisin', 'vancotek', 'edicin', 'vancomax'],
    drugClasses: ['glycopeptide', 'antibacterial', 'nephrotoxic', 'narrow_therapeutic_index'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'piperacillin_tazobactam',
    rxCui: '54136',
    displayNameTr: 'Piperasilin / Tazobaktam',
    displayNameEn: 'Piperacillin / Tazobactam',
    atcCodes: ['J01CR05'],
    aliases: ['tazocin', 'pipraks', 'tazopril', 'piperasilin', 'tazobaktam', 'tazocin ef', 'pip-tazo'],
    drugClasses: ['antipseudomonal_penicillin', 'beta_lactamase_inhibitor', 'antibacterial', 'beta_lactam'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'cefepime',
    rxCui: '25037',
    displayNameTr: 'Sefepim',
    displayNameEn: 'Cefepime',
    atcCodes: ['J01DE01'],
    aliases: ['maxipime', 'sefepim', 'cefepim', 'unepim'],
    drugClasses: ['cephalosporin_4g', 'antibacterial', 'beta_lactam', 'neurotoxic_risk'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'meropenem',
    rxCui: '29560',
    displayNameTr: 'Meropenem',
    displayNameEn: 'Meropenem',
    atcCodes: ['J01DH02'],
    aliases: ['meronem', 'meropenem', 'meropen', 'meropenem trihidrat'],
    drugClasses: ['carbapenem', 'antibacterial', 'beta_lactam', 'valproate_incompatible'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'ertapenem',
    rxCui: '316049',
    displayNameTr: 'Ertapenem',
    displayNameEn: 'Ertapenem',
    atcCodes: ['J01DH03'],
    aliases: ['invanz', 'ertapenem'],
    drugClasses: ['carbapenem', 'antibacterial', 'beta_lactam', 'valproate_incompatible'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'imipenem_cilastatin',
    rxCui: '315995',
    displayNameTr: 'İmipenem / Silastatin',
    displayNameEn: 'Imipenem / Cilastatin',
    atcCodes: ['J01DH51'],
    aliases: ['tienam', 'imipenem', 'silastatin', 'cilastatin'],
    drugClasses: ['carbapenem', 'antibacterial', 'beta_lactam', 'valproate_incompatible'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'amoxicillin',
    rxCui: '723',
    displayNameTr: 'Amoksisilin',
    displayNameEn: 'Amoxicillin',
    atcCodes: ['J01CA04'],
    aliases: ['largopen', 'alfoxil', 'amoksisilin', 'amoxicillin trihydrate'],
    drugClasses: ['aminopenicillin', 'antibacterial', 'beta_lactam'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'amoxicillin_clavulanate',
    rxCui: '6185',
    displayNameTr: 'Amoksisilin / Klavulanat',
    displayNameEn: 'Amoxicillin / Clavulanate',
    atcCodes: ['J01CR02'],
    aliases: ['augmentin', 'amoklavin', 'klamoks', 'bioment', 'croxilex', 'amoksilav', 'klavunat', 'aktil', 'amoxiclav'],
    drugClasses: ['aminopenicillin', 'beta_lactamase_inhibitor', 'antibacterial'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'cefuroxime',
    rxCui: '2191',
    displayNameTr: 'Sefuroksim',
    displayNameEn: 'Cefuroxime',
    atcCodes: ['J01DC02', 'J01DC14'],
    aliases: ['zinnat', 'zmax', 'sefuroksim', 'cefuroxime axetil', 'aksef', 'enfluvir'],
    drugClasses: ['cephalosporin_2g', 'antibacterial', 'beta_lactam'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'ciprofloxacin',
    rxCui: '2551',
    displayNameTr: 'Siprofloksasin',
    displayNameEn: 'Ciprofloxacin',
    atcCodes: ['J01MA02', 'S01AE03', 'S02AA15'],
    aliases: ['cipro', 'ciflosin', 'roksin', 'siprofloksasin', 'ciprasel', 'siprosan'],
    drugClasses: ['fluoroquinolone', 'antibacterial', 'cartilage_toxicity_pediatric', 'qt_prolonging_conditional'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'levofloxacin',
    rxCui: '82122',
    displayNameTr: 'Levofloksasin',
    displayNameEn: 'Levofloxacin',
    atcCodes: ['J01MA12', 'S01AE05'],
    aliases: ['tavanic', 'levofloksasin', 'kravit', 'levonidin', 'levocur'],
    drugClasses: ['fluoroquinolone', 'antibacterial', 'cartilage_toxicity_pediatric', 'qt_prolonging_conditional'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'moxifloxacin',
    rxCui: '139462',
    displayNameTr: 'Moksifloksasin',
    displayNameEn: 'Moxifloxacin',
    atcCodes: ['J01MA14', 'S01AE07'],
    aliases: ['avelox', 'moksifloksasin', 'moxitec', 'ataflok', 'pitavel'],
    drugClasses: ['fluoroquinolone', 'antibacterial', 'qt_prolonging_known', 'cartilage_toxicity_pediatric'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'clarithromycin',
    rxCui: '21212',
    displayNameTr: 'Klaritromisin',
    displayNameEn: 'Clarithromycin',
    atcCodes: ['J01FA09'],
    aliases: ['klacid', 'klaritromisin', 'macrol', 'claricide', 'uniclar', 'laricid'],
    drugClasses: ['macrolide', 'antibacterial', 'cyp3a4_strong_inhibitor', 'pgp_inhibitor', 'qt_prolonging_conditional'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'erythromycin',
    rxCui: '4053',
    displayNameTr: 'Eritromisin',
    displayNameEn: 'Erythromycin',
    atcCodes: ['J01FA01', 'D10AF02'],
    aliases: ['erythrocin', 'eritromisin', 'erythro'],
    drugClasses: ['macrolide', 'antibacterial', 'cyp3a4_strong_inhibitor', 'qt_prolonging_known'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'azithromycin',
    rxCui: '18631',
    displayNameTr: 'Azitromisin',
    displayNameEn: 'Azithromycin',
    atcCodes: ['J01FA10', 'S01AA26'],
    aliases: ['azitro', 'zitromax', 'azitromisin', 'azeltin', 'tremac'],
    drugClasses: ['azalide', 'macrolide_derivative', 'antibacterial', 'cyp3a4_safe_alternative', 'qt_prolonging_conditional'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'trimethoprim_sulfamethoxazole',
    rxCui: '10834',
    displayNameTr: 'Trimetoprim / Sülfametoksazol',
    displayNameEn: 'Trimethoprim / Sulfamethoxazole',
    atcCodes: ['J01EE01'],
    aliases: ['bactrim', 'kemoprim', 'trifen', 'metoprim', 'kotrimoksazol', 'co-trimoxazole', 'tmp-smx', 'sulfametoksazol', 'trimetoprim'],
    drugClasses: ['sulfonamide', 'folate_antagonist', 'antibacterial', 'enac_blocker', 'hyperkalemic', 'neonatal_kernicterus_risk'],
    pediatricHighAlert: true,
    boxedWarning: false
  },
  {
    canonicalKey: 'metronidazole',
    rxCui: '6922',
    displayNameTr: 'Metronidazol',
    displayNameEn: 'Metronidazole',
    atcCodes: ['J01XD01', 'P01AB01'],
    aliases: ['flagyl', 'metronidazol', 'nidazol', 'metrajil', 'polgyl'],
    drugClasses: ['nitroimidazole', 'antibacterial', 'antiprotozoal', 'cyp2c9_inhibitor'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'linezolid',
    rxCui: '190521',
    displayNameTr: 'Linezolid',
    displayNameEn: 'Linezolid',
    atcCodes: ['J01XX08'],
    aliases: ['zyvoxid', 'linezolid', 'linerez', 'linezid', 'lizid'],
    drugClasses: ['oxazolidinone', 'antibacterial', 'maoi_activity', 'serotonin_syndrome_hard_stop', 'myelosuppressive'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'doxycycline',
    rxCui: '3640',
    displayNameTr: 'Doksisiklin',
    displayNameEn: 'Doxycycline',
    atcCodes: ['J01AA02'],
    aliases: ['monodox', 'monodoks', 'tetradox', 'doksisiklin', 'doxycycline hyclate'],
    drugClasses: ['tetracycline', 'tetracycline_antibiotic', 'antibacterial', 'dental_discoloration_pediatric'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'tetracycline',
    rxCui: '10395',
    displayNameTr: 'Tetrasiklin',
    displayNameEn: 'Tetracycline',
    atcCodes: ['J01AA07'],
    aliases: ['tetrasiklin', 'tetracycline'],
    drugClasses: ['tetracycline', 'antibacterial', 'dental_discoloration_pediatric'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'chloramphenicol',
    rxCui: '2338',
    displayNameTr: 'Kloramfenikol',
    displayNameEn: 'Chloramphenicol',
    atcCodes: ['J01BA01', 'S01AA01'],
    aliases: ['kemicetine', 'kloramfenikol', 'chloramphenicol'],
    drugClasses: ['amphenicol', 'antibacterial', 'neonatal_gray_baby_syndrome', 'bone_marrow_suppression'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'nitrofurantoin',
    rxCui: '7457',
    displayNameTr: 'Nitrofurantoin',
    displayNameEn: 'Nitrofurantoin',
    atcCodes: ['J01XE01'],
    aliases: ['piyeloseptil', 'pyeloseptyl', 'nitrofurantoin'],
    drugClasses: ['nitrofuran', 'antibacterial', 'renal_egfr_cutoff_30', 'pulmonary_toxicity'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'rifampin',
    rxCui: '9384',
    displayNameTr: 'Rifampisin',
    displayNameEn: 'Rifampin',
    atcCodes: ['J04AB02'],
    aliases: ['rifadin', 'rifampisin', 'rifampin'],
    drugClasses: ['rifamycin', 'antimycobacterial', 'cyp3a4_strong_inducer', 'pgp_inducer'],
    pediatricHighAlert: false
  },

  // --- 2. ANTIFUNGALS & ANTIVIRALS ---
  {
    canonicalKey: 'fluconazole',
    rxCui: '4450',
    displayNameTr: 'Flukonazol',
    displayNameEn: 'Fluconazole',
    atcCodes: ['J02AC01'],
    aliases: ['diflucan', 'flukonazol', 'flucan', 'triflucan', 'kandizol', 'fluzole'],
    drugClasses: ['triazole_antifungal', 'cyp2c9_strong_inhibitor', 'cyp3a4_moderate_inhibitor', 'qt_prolonging_conditional'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'itraconazole',
    rxCui: '28031',
    displayNameTr: 'İtrakonazol',
    displayNameEn: 'Itraconazole',
    atcCodes: ['J02AC02'],
    aliases: ['sporanox', 'itrakonazol', 'funxit', 'itraspor'],
    drugClasses: ['triazole_antifungal', 'cyp3a4_strong_inhibitor', 'pgp_inhibitor'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'ketoconazole',
    rxCui: '6135',
    displayNameTr: 'Ketokonazol',
    displayNameEn: 'Ketoconazole',
    atcCodes: ['J02AB02', 'D01AC08'],
    aliases: ['fungoral', 'ketokonazol', 'nizoral', 'ketoral'],
    drugClasses: ['imidazole_antifungal', 'cyp3a4_strong_inhibitor', 'pgp_inhibitor', 'hepatotoxic'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'voriconazole',
    rxCui: '121243',
    displayNameTr: 'Vorikonazol',
    displayNameEn: 'Voriconazole',
    atcCodes: ['J02AC03'],
    aliases: ['vfend', 'vorikonazol', 'v-fend'],
    drugClasses: ['triazole_antifungal', 'cyp2c19_inhibitor', 'cyp3a4_inhibitor', 'qt_prolonging_conditional'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'posaconazole',
    rxCui: '282446',
    displayNameTr: 'Posakonazol',
    displayNameEn: 'Posaconazole',
    atcCodes: ['J02AC04'],
    aliases: ['noxafil', 'posakonazol'],
    drugClasses: ['triazole_antifungal', 'cyp3a4_strong_inhibitor', 'qt_prolonging_conditional'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'acyclovir',
    rxCui: '281',
    displayNameTr: 'Asiklovir',
    displayNameEn: 'Acyclovir',
    atcCodes: ['J05AB01', 'D06BB03', 'S01AD03'],
    aliases: ['zovirax', 'asiklovir', 'aklovir', 'hernivex', 'virosil'],
    drugClasses: ['antiviral', 'guanosine_analogue', 'nephrotoxic_crystalluria'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'oseltamivir',
    rxCui: '214199',
    displayNameTr: 'Oseltamivir',
    displayNameEn: 'Oseltamivir',
    atcCodes: ['J05AH02'],
    aliases: ['tamiflu', 'oseltamivir', 'enfluvir', 'oseltavir'],
    drugClasses: ['neuraminidase_inhibitor', 'antiviral'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'ritonavir',
    rxCui: '85762',
    displayNameTr: 'Ritonavir',
    displayNameEn: 'Ritonavir',
    atcCodes: ['J05AE03'],
    aliases: ['norvir', 'ritonavir', 'kaletra', 'paxlovid'],
    drugClasses: ['protease_inhibitor', 'antiviral', 'cyp3a4_strong_inhibitor', 'pgp_inhibitor'],
    pediatricHighAlert: true
  },

  // --- 3. CARDIOVASCULAR, DIURETICS & ANTITHROMBOTICS ---
  {
    canonicalKey: 'spironolactone',
    rxCui: '9997',
    displayNameTr: 'Spironolakton',
    displayNameEn: 'Spironolactone',
    atcCodes: ['C03DA01'],
    aliases: ['aldactone', 'spironolakton'],
    drugClasses: ['aldosterone_antagonist', 'potassium_sparing_diuretic', 'hyperkalemic', 'triple_whammy_diuretic'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'eplerenone',
    rxCui: '259255',
    displayNameTr: 'Eplerenon',
    displayNameEn: 'Eplerenone',
    atcCodes: ['C03DA04'],
    aliases: ['inspra', 'eplerenon'],
    drugClasses: ['aldosterone_antagonist', 'potassium_sparing_diuretic', 'hyperkalemic'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'furosemide',
    rxCui: '4603',
    displayNameTr: 'Furosemid',
    displayNameEn: 'Furosemide',
    atcCodes: ['C03CA01'],
    aliases: ['lasix', 'desal', 'furosemid', 'furomid'],
    drugClasses: ['loop_diuretic', 'triple_whammy_diuretic', 'ototoxic_risk'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'hydrochlorothiazide',
    rxCui: '5487',
    displayNameTr: 'Hidroklorotiyazid',
    displayNameEn: 'Hydrochlorothiazide',
    atcCodes: ['C03AA03'],
    aliases: ['hidroklorotiyazid', 'hctz', 'co-diovan', 'hyzaar'],
    drugClasses: ['thiazide_diuretic', 'triple_whammy_diuretic', 'lithium_clearance_reducer'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'ramipril',
    rxCui: '35296',
    displayNameTr: 'Ramipril',
    displayNameEn: 'Ramipril',
    atcCodes: ['C09AA05'],
    aliases: ['delix', 'ramipril', 'ramicard'],
    drugClasses: ['ace_inhibitor', 'raas_blocker', 'triple_whammy_ras', 'hyperkalemic', 'fetotoxic_pregnancy'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'enalapril',
    rxCui: '3827',
    displayNameTr: 'Enalapril',
    displayNameEn: 'Enalapril',
    atcCodes: ['C09AA02'],
    aliases: ['enap', 'renitec', 'enalapril', 'konveril'],
    drugClasses: ['ace_inhibitor', 'raas_blocker', 'triple_whammy_ras', 'hyperkalemic', 'fetotoxic_pregnancy'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'lisinopril',
    rxCui: '29046',
    displayNameTr: 'Lisinopril',
    displayNameEn: 'Lisinopril',
    atcCodes: ['C09AA03'],
    aliases: ['sinopril', 'zestril', 'lisinopril', 'rilis'],
    drugClasses: ['ace_inhibitor', 'raas_blocker', 'triple_whammy_ras', 'hyperkalemic', 'fetotoxic_pregnancy'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'perindopril',
    rxCui: '54552',
    displayNameTr: 'Perindopril',
    displayNameEn: 'Perindopril',
    atcCodes: ['C09AA04'],
    aliases: ['coversyl', 'perindopril'],
    drugClasses: ['ace_inhibitor', 'raas_blocker', 'triple_whammy_ras', 'hyperkalemic', 'fetotoxic_pregnancy'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'captopril',
    rxCui: '1998',
    displayNameTr: 'Kaptopril',
    displayNameEn: 'Captopril',
    atcCodes: ['C09AA01'],
    aliases: ['kapril', 'kaptopril', 'captopril'],
    drugClasses: ['ace_inhibitor', 'raas_blocker', 'triple_whammy_ras', 'hyperkalemic', 'fetotoxic_pregnancy'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'losartan',
    rxCui: '52175',
    displayNameTr: 'Losartan',
    displayNameEn: 'Losartan',
    atcCodes: ['C09CA01'],
    aliases: ['cozaar', 'losartan', 'sarvas', 'hyzaar'],
    drugClasses: ['arb', 'raas_blocker', 'triple_whammy_ras', 'hyperkalemic', 'fetotoxic_pregnancy'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'valsartan',
    rxCui: '69749',
    displayNameTr: 'Valsartan',
    displayNameEn: 'Valsartan',
    atcCodes: ['C09CA03'],
    aliases: ['diovan', 'valsartan', 'co-diovan'],
    drugClasses: ['arb', 'raas_blocker', 'triple_whammy_ras', 'hyperkalemic', 'fetotoxic_pregnancy'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'candesartan',
    rxCui: '214354',
    displayNameTr: 'Kandesartan',
    displayNameEn: 'Candesartan',
    atcCodes: ['C09CA06'],
    aliases: ['atacand', 'kandesartan', 'candesartan', 'ayra'],
    drugClasses: ['arb', 'raas_blocker', 'triple_whammy_ras', 'hyperkalemic', 'fetotoxic_pregnancy'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'sacubitril_valsartan',
    rxCui: '1656338',
    displayNameTr: 'Sakubitril / Valsartan',
    displayNameEn: 'Sacubitril / Valsartan',
    atcCodes: ['C09DX04'],
    aliases: ['entresto', 'sakubitril valsartan'],
    drugClasses: ['arni', 'raas_blocker', 'triple_whammy_ras', 'hyperkalemic', 'fetotoxic_pregnancy'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'sildenafil',
    rxCui: '136411',
    displayNameTr: 'Sildenafil',
    displayNameEn: 'Sildenafil',
    atcCodes: ['G04BE03'],
    aliases: ['viagra', 'revatio', 'sildenafil', 'degra', 'sinegra', 'vigrande', 'sil坦fil'],
    drugClasses: ['pde5_inhibitor', 'nitrate_contraindicated_hard_stop', 'vasodilator'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'tadalafil',
    rxCui: '360416',
    displayNameTr: 'Tadalafil',
    displayNameEn: 'Tadalafil',
    atcCodes: ['G04BE08'],
    aliases: ['cialis', 'adcirca', 'tadalafil', 'lifta', 'lex'],
    drugClasses: ['pde5_inhibitor', 'nitrate_contraindicated_hard_stop', 'vasodilator'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'nitroglycerin',
    rxCui: '7454',
    displayNameTr: 'Nitrogliserin',
    displayNameEn: 'Nitroglycerin',
    atcCodes: ['C01DA02'],
    aliases: ['nitrogliserin', 'nitroglycerin', 'perlinganit', 'nitroderm', 'glyceryl trinitrate'],
    drugClasses: ['nitrate_vasodilator', 'pde5_contraindicated_hard_stop', 'antianginal'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'isosorbide_dinitrate',
    rxCui: '6054',
    displayNameTr: 'İzosorbid Dinitrat / Mononitrat',
    displayNameEn: 'Isosorbide Dinitrate / Mononitrate',
    atcCodes: ['C01DA08', 'C01DA14'],
    aliases: ['isordil', 'monoket', 'izosorbid', 'isosorbide dinitrate', 'isosorbide mononitrate', 'monodur'],
    drugClasses: ['nitrate_vasodilator', 'pde5_contraindicated_hard_stop', 'antianginal'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'digoxin',
    rxCui: '3407',
    displayNameTr: 'Digoksin',
    displayNameEn: 'Digoxin',
    atcCodes: ['C01AA05'],
    aliases: ['digoksin', 'digoxin', 'digoxine'],
    drugClasses: ['cardiac_glycoside', 'inotropic', 'pgp_substrate', 'narrow_therapeutic_index', 'amiodarone_interaction_50pct_reduction'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'amiodarone',
    rxCui: '703',
    displayNameTr: 'Amiodaron',
    displayNameEn: 'Amiodarone',
    atcCodes: ['C01BD01'],
    aliases: ['cordarone', 'amiodaron', 'amiodarone'],
    drugClasses: ['antiarrhythmic_class_3', 'qt_prolonging_known', 'cyp3a4_moderate_inhibitor', 'cyp2c9_inhibitor', 'pgp_inhibitor'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'verapamil',
    rxCui: '11170',
    displayNameTr: 'Verapamil',
    displayNameEn: 'Verapamil',
    atcCodes: ['C08DA01'],
    aliases: ['isoptin', 'verapamil'],
    drugClasses: ['calcium_channel_blocker_ndhp', 'antiarrhythmic_class_4', 'cyp3a4_moderate_inhibitor', 'pgp_inhibitor'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'diltiazem',
    rxCui: '3443',
    displayNameTr: 'Diltiazem',
    displayNameEn: 'Diltiazem',
    atcCodes: ['C08DB01'],
    aliases: ['diltizem', 'altizem', 'diltiazem'],
    drugClasses: ['calcium_channel_blocker_benzothiazepine', 'cyp3a4_moderate_inhibitor'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'sotalol',
    rxCui: '9954',
    displayNameTr: 'Sotalol',
    displayNameEn: 'Sotalol',
    atcCodes: ['C07AA07'],
    aliases: ['darob', 'talozin', 'sotalol'],
    drugClasses: ['beta_blocker_nonselective', 'antiarrhythmic_class_3', 'qt_prolonging_known'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'warfarin',
    rxCui: '11289',
    displayNameTr: 'Varfarin',
    displayNameEn: 'Warfarin',
    atcCodes: ['B01AA03'],
    aliases: ['coumadin', 'varfarin', 'warfarin'],
    drugClasses: ['vitamin_k_antagonist', 'anticoagulant', 'narrow_therapeutic_index', 'cyp2c9_substrate', 'teratogenic_pregnancy'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'apixaban',
    rxCui: '1364430',
    displayNameTr: 'Apiksaban',
    displayNameEn: 'Apixaban',
    atcCodes: ['B01AF02'],
    aliases: ['eliquis', 'apiksaban', 'apixaban'],
    drugClasses: ['doac', 'factor_xa_inhibitor', 'anticoagulant', 'cyp3a4_substrate', 'pgp_substrate', 'cockcroft_gault_mandatory'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'rivaroxaban',
    rxCui: '1114195',
    displayNameTr: 'Rivaroksaban',
    displayNameEn: 'Rivaroxaban',
    atcCodes: ['B01AF01'],
    aliases: ['xarelto', 'rivaroksaban', 'rivaroxaban'],
    drugClasses: ['doac', 'factor_xa_inhibitor', 'anticoagulant', 'cyp3a4_substrate', 'pgp_substrate', 'cockcroft_gault_mandatory'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'dabigatran',
    rxCui: '1037042',
    displayNameTr: 'Dabigatran',
    displayNameEn: 'Dabigatran',
    atcCodes: ['B01AE07'],
    aliases: ['pradaxa', 'dabigatran', 'dabigatran etexilate'],
    drugClasses: ['doac', 'direct_thrombin_inhibitor', 'anticoagulant', 'pgp_substrate', 'cockcroft_gault_mandatory', 'renal_egfr_cutoff_30'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'clopidogrel',
    rxCui: '32968',
    displayNameTr: 'Klopidogrel',
    displayNameEn: 'Clopidogrel',
    atcCodes: ['B01AC04'],
    aliases: ['plavix', 'klopidogrel', 'clopidogrel', 'karum', 'opirel', 'aterix'],
    drugClasses: ['p2y12_inhibitor', 'antiplatelet', 'cyp2c19_prodrug', 'omeprazole_inhibited'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'enoxaparin',
    rxCui: '67108',
    displayNameTr: 'Enoksaparin',
    displayNameEn: 'Enoxaparin',
    atcCodes: ['B01AB05'],
    aliases: ['clexane', 'innohep', 'oxapar', 'enoksaparin', 'enoxaparin'],
    drugClasses: ['lmwh', 'anticoagulant', 'renal_egfr_cutoff_30'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'heparin',
    rxCui: '5224',
    displayNameTr: 'Heparin',
    displayNameEn: 'Heparin',
    atcCodes: ['B01AB01'],
    aliases: ['heparin', 'nevparin'],
    drugClasses: ['unfractionated_heparin', 'anticoagulant', 'hyperkalemic'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'simvastatin',
    rxCui: '36567',
    displayNameTr: 'Simvastatin',
    displayNameEn: 'Simvastatin',
    atcCodes: ['C10AA01'],
    aliases: ['zocor', 'lipovas', 'simva', 'simvastatin'],
    drugClasses: ['hmg_coa_reductase_inhibitor', 'statin', 'cyp3a4_dependent_rhabdo_high_risk'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'atorvastatin',
    rxCui: '83367',
    displayNameTr: 'Atorvastatin',
    displayNameEn: 'Atorvastatin',
    atcCodes: ['C10AA05'],
    aliases: ['lipitor', 'tarden', 'kolestor', 'ator', 'atordep', 'ateroz', 'saphire', 'atorvastatin'],
    drugClasses: ['hmg_coa_reductase_inhibitor', 'statin', 'cyp3a4_dependent_rhabdo_risk'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'rosuvastatin',
    rxCui: '301542',
    displayNameTr: 'Rosuvastatin',
    displayNameEn: 'Rosuvastatin',
    atcCodes: ['C10AA07'],
    aliases: ['crestor', 'rosuvastatin', 'rosuvas', 'caduet'],
    drugClasses: ['hmg_coa_reductase_inhibitor', 'statin', 'cyp3a4_safe_alternative'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'lovastatin',
    rxCui: '6472',
    displayNameTr: 'Lovastatin',
    displayNameEn: 'Lovastatin',
    atcCodes: ['C10AA02'],
    aliases: ['lovastatin'],
    drugClasses: ['hmg_coa_reductase_inhibitor', 'statin', 'cyp3a4_dependent_rhabdo_high_risk'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'pravastatin',
    rxCui: '42463',
    displayNameTr: 'Pravastatin',
    displayNameEn: 'Pravastatin',
    atcCodes: ['C10AA03'],
    aliases: ['pravastatin', 'pravachol'],
    drugClasses: ['hmg_coa_reductase_inhibitor', 'statin', 'cyp3a4_safe_alternative'],
    pediatricHighAlert: false
  },

  // --- 4. NEUROLOGY, PSYCHIATRY & ANALGESIA ---
  {
    canonicalKey: 'valproic_acid',
    rxCui: '11170',
    displayNameTr: 'Valproik Asit / Sodyum Valproat',
    displayNameEn: 'Valproic Acid / Sodium Valproate',
    atcCodes: ['N03AG01'],
    aliases: ['depakin', 'convulex', 'valproik asit', 'valproate', 'sodyum valproat', 'sodium valproate'],
    drugClasses: ['anticonvulsant', 'mood_stabilizer', 'teratogenic_pregnancy', 'carbapenem_incompatible_hard_stop', 'hepatotoxic'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'carbamazepine',
    rxCui: '2002',
    displayNameTr: 'Karbamazepin',
    displayNameEn: 'Carbamazepine',
    atcCodes: ['N03AF01'],
    aliases: ['tegretol', 'karbamazepin', 'carbamazepine', 'finlepsin'],
    drugClasses: ['anticonvulsant', 'cyp3a4_strong_inducer', 'cyp_autoinducer', 'pgp_inducer', 'narrow_therapeutic_index'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'phenytoin',
    rxCui: '8183',
    displayNameTr: 'Fenitoin',
    displayNameEn: 'Phenytoin',
    atcCodes: ['N03AB02'],
    aliases: ['epdantoin', 'fenitoin', 'phenytoin', 'epitoin'],
    drugClasses: ['anticonvulsant', 'cyp_inducer', 'narrow_therapeutic_index', 'teratogenic_pregnancy'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'phenobarbital',
    rxCui: '8134',
    displayNameTr: 'Fenobarbital',
    displayNameEn: 'Phenobarbital',
    atcCodes: ['N03AA02'],
    aliases: ['luminal', 'luminaletten', 'fenobarbital', 'phenobarbital'],
    drugClasses: ['barbiturate', 'anticonvulsant', 'cyp_inducer', 'respiratory_depressant'],
    isControlledSubstance: true,
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'levetiracetam',
    rxCui: '39045',
    displayNameTr: 'Levetirasetam',
    displayNameEn: 'Levetiracetam',
    atcCodes: ['N03AX14'],
    aliases: ['keppra', 'levetirasetam', 'epixx', 'matever'],
    drugClasses: ['anticonvulsant', 'sv2a_ligand'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'diazepam',
    rxCui: '3322',
    displayNameTr: 'Diazepam',
    displayNameEn: 'Diazepam',
    atcCodes: ['N05BA01'],
    aliases: ['diazem', 'nervium', 'diazepam'],
    drugClasses: ['benzodiazepine', 'sedative', 'anticonvulsant', 'opioid_respiratory_synergy_hard_stop'],
    isControlledSubstance: true,
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'midazolam',
    rxCui: '6960',
    displayNameTr: 'Midazolam',
    displayNameEn: 'Midazolam',
    atcCodes: ['N05CD08'],
    aliases: ['dormicum', 'midazolam', 'sedozolam'],
    drugClasses: ['benzodiazepine', 'sedative', 'cyp3a4_substrate', 'opioid_respiratory_synergy_hard_stop'],
    isControlledSubstance: true,
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'lorazepam',
    rxCui: '6470',
    displayNameTr: 'Lorazepam',
    displayNameEn: 'Lorazepam',
    atcCodes: ['N05BA06'],
    aliases: ['ativan', 'lorazepam'],
    drugClasses: ['benzodiazepine', 'sedative', 'anticonvulsant', 'opioid_respiratory_synergy_hard_stop'],
    isControlledSubstance: true,
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'clonazepam',
    rxCui: '2598',
    displayNameTr: 'Klonazepam',
    displayNameEn: 'Clonazepam',
    atcCodes: ['N03AE01'],
    aliases: ['rivotril', 'klonazepam', 'clonazepam'],
    drugClasses: ['benzodiazepine', 'anticonvulsant', 'opioid_respiratory_synergy_hard_stop'],
    isControlledSubstance: true,
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'morphine',
    rxCui: '7052',
    displayNameTr: 'Morfin',
    displayNameEn: 'Morphine',
    atcCodes: ['N02AA01'],
    aliases: ['morfin', 'morphine', 'morfia', 'mst contin'],
    drugClasses: ['opioid_analgesic', 'mu_opioid_agonist', 'respiratory_depressant', 'benzodiazepine_synergy_hard_stop'],
    isControlledSubstance: true,
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'fentanyl',
    rxCui: '4337',
    displayNameTr: 'Fentanil',
    displayNameEn: 'Fentanyl',
    atcCodes: ['N02AB03'],
    aliases: ['durogesic', 'fentanil', 'fentanyl', 'fentanyl citrate'],
    drugClasses: ['synthetic_opioid', 'serotonergic_opioid', 'respiratory_depressant', 'cyp3a4_substrate'],
    isControlledSubstance: true,
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'tramadol',
    rxCui: '10689',
    displayNameTr: 'Tramadol',
    displayNameEn: 'Tramadol',
    atcCodes: ['N02AX02', 'N02AJ13'],
    aliases: ['contramal', 'tramosel', 'ramadex', 'tramadolor', 'ultracet', 'tramadol'],
    drugClasses: ['opioid_analgesic', 'serotonergic_opioid', 'pediatric_under_12_hard_stop', 'post_tonsillectomy_hard_stop', 'cyp2d6_prodrug'],
    isControlledSubstance: true,
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'codeine',
    rxCui: '2670',
    displayNameTr: 'Kodein',
    displayNameEn: 'Codeine',
    atcCodes: ['N02AA59', 'R05DA04'],
    aliases: ['kodein', 'codeine', 'geralgine k'],
    drugClasses: ['opioid_analgesic', 'cyp2d6_prodrug', 'pediatric_under_12_hard_stop', 'post_tonsillectomy_hard_stop'],
    isControlledSubstance: true,
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'ketamine',
    rxCui: '6130',
    displayNameTr: 'Ketamin',
    displayNameEn: 'Ketamine',
    atcCodes: ['N01AX03'],
    aliases: ['ketalar', 'ketamin', 'ketamine'],
    drugClasses: ['nmda_antagonist', 'general_anesthetic', 'dissociative'],
    isControlledSubstance: true,
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'paracetamol',
    rxCui: '161',
    displayNameTr: 'Parasetamol',
    displayNameEn: 'Paracetamol / Acetaminophen',
    atcCodes: ['N02BE01'],
    aliases: ['parol', 'calpol', 'minoset', 'tylol', 'parasetamol', 'acetaminophen', 'perfalgan', 'tamol'],
    drugClasses: ['analgesic', 'antipyretic', 'hepatotoxic_overdose', 'triple_whammy_safe_alternative'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'ibuprofen',
    rxCui: '5640',
    displayNameTr: 'İbuprofen',
    displayNameEn: 'Ibuprofen',
    atcCodes: ['M01AE01'],
    aliases: ['dolven', 'pedifen', 'ibufen', 'nurofen', 'arveles', 'advil', 'iprofen', 'ibuprofen'],
    drugClasses: ['nsaid', 'triple_whammy_nsaid', 'hyperkalemic', 'pregnancy_3rd_trimester_hard_stop', 'peptic_ulcer_risk'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'naproxen',
    rxCui: '7258',
    displayNameTr: 'Naproksen',
    displayNameEn: 'Naproxen',
    atcCodes: ['M01AE02'],
    aliases: ['apranax', 'naprosyn', 'naproksen', 'aleve', 'aprol'],
    drugClasses: ['nsaid', 'triple_whammy_nsaid', 'hyperkalemic', 'pregnancy_3rd_trimester_hard_stop'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'diclofenac',
    rxCui: '3355',
    displayNameTr: 'Diklofenak',
    displayNameEn: 'Diclofenac',
    atcCodes: ['M01AB05'],
    aliases: ['voltaren', 'dolorex', 'diklofenak', 'diclomec', 'dikloron'],
    drugClasses: ['nsaid', 'triple_whammy_nsaid', 'hyperkalemic', 'pregnancy_3rd_trimester_hard_stop'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'meloxicam',
    rxCui: '224913',
    displayNameTr: 'Meloksikam',
    displayNameEn: 'Meloxicam',
    atcCodes: ['M01AC06'],
    aliases: ['melox', 'meloksikam', 'zeloxim', 'exen'],
    drugClasses: ['nsaid', 'triple_whammy_nsaid', 'hyperkalemic', 'pregnancy_3rd_trimester_hard_stop'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'dexketoprofen',
    rxCui: '226871',
    displayNameTr: 'Deksketoprofen',
    displayNameEn: 'Dexketoprofen',
    atcCodes: ['M01AE17'],
    aliases: ['arveles', 'deksketoprofen', 'rastel', 'ketavel'],
    drugClasses: ['nsaid', 'triple_whammy_nsaid', 'hyperkalemic', 'pregnancy_3rd_trimester_hard_stop'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'fluoxetine',
    rxCui: '4492',
    displayNameTr: 'Fluoksetin',
    displayNameEn: 'Fluoxetine',
    atcCodes: ['N06AB03'],
    aliases: ['prozac', 'deprex', 'zedprex', 'fulsac', 'fluoksetin'],
    drugClasses: ['ssri', 'serotonergic', 'cyp2d6_inhibitor', 'long_half_life_washout_5wk'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'sertraline',
    rxCui: '36437',
    displayNameTr: 'Sertralin',
    displayNameEn: 'Sertraline',
    atcCodes: ['N06AB06'],
    aliases: ['lustral', 'selectra', 'serdep', 'misol', 'sertralin'],
    drugClasses: ['ssri', 'serotonergic'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'escitalopram',
    rxCui: '32937',
    displayNameTr: 'Essitalopram',
    displayNameEn: 'Escitalopram',
    atcCodes: ['N06AB10'],
    aliases: ['cipralex', 'citoles', 'eslorex', 'secita', 'esmax', 'essitalopram'],
    drugClasses: ['ssri', 'serotonergic', 'qt_prolonging_conditional'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'citalopram',
    rxCui: '2556',
    displayNameTr: 'Sitalopram',
    displayNameEn: 'Citalopram',
    atcCodes: ['N06AB04'],
    aliases: ['cipram', 'citol', 'vodalex', 'sitalopram'],
    drugClasses: ['ssri', 'serotonergic', 'qt_prolonging_known'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'paroxetine',
    rxCui: '32937',
    displayNameTr: 'Paroksetin',
    displayNameEn: 'Paroxetine',
    atcCodes: ['N06AB05'],
    aliases: ['paxil', 'seroxat', 'paxera', 'paroksetin'],
    drugClasses: ['ssri', 'serotonergic', 'cyp2d6_strong_inhibitor', 'teratogenic_pregnancy'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'venlafaxine',
    rxCui: '39786',
    displayNameTr: 'Venlafaksin',
    displayNameEn: 'Venlafaxine',
    atcCodes: ['N06AX16'],
    aliases: ['efexor', 'venegis', 'dorex', 'venlafaksin'],
    drugClasses: ['snri', 'serotonergic'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'duloxetine',
    rxCui: '72625',
    displayNameTr: 'Duloksetin',
    displayNameEn: 'Duloxetine',
    atcCodes: ['N06AX21'],
    aliases: ['cymbalta', 'duxet', 'dulsevia', 'nexetin', 'duloksetin'],
    drugClasses: ['snri', 'serotonergic', 'cyp2d6_moderate_inhibitor'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'amitriptyline',
    rxCui: '704',
    displayNameTr: 'Amitriptilin',
    displayNameEn: 'Amitriptyline',
    atcCodes: ['N06AA09'],
    aliases: ['laroxyl', 'amitriptilin', 'amitriptyline'],
    drugClasses: ['tca', 'serotonergic', 'anticholinergic', 'qt_prolonging_conditional'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'moclobemide',
    rxCui: '7004',
    displayNameTr: 'Moklobemid',
    displayNameEn: 'Moclobemide',
    atcCodes: ['N06AG02'],
    aliases: ['aurorix', 'moklobemid'],
    drugClasses: ['maoi_reversible', 'serotonin_syndrome_hard_stop'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'selegiline',
    rxCui: '9699',
    displayNameTr: 'Selegilin',
    displayNameEn: 'Selegiline',
    atcCodes: ['N04BD01'],
    aliases: ['movergan', 'selegilin'],
    drugClasses: ['maoi_b_inhibitor', 'serotonin_syndrome_hard_stop'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'rasagiline',
    rxCui: '333262',
    displayNameTr: 'Rasajilin',
    displayNameEn: 'Rasagiline',
    atcCodes: ['N04BD02'],
    aliases: ['azilect', 'rasajilin'],
    drugClasses: ['maoi_b_inhibitor', 'serotonin_syndrome_hard_stop'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'haloperidol',
    rxCui: '5093',
    displayNameTr: 'Haloperidol',
    displayNameEn: 'Haloperidol',
    atcCodes: ['N05AD01'],
    aliases: ['norodol', 'haloperidol'],
    drugClasses: ['typical_antipsychotic', 'd2_antagonist', 'qt_prolonging_known'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'lithium',
    rxCui: '6448',
    displayNameTr: 'Lityum',
    displayNameEn: 'Lithium',
    atcCodes: ['N05AN01'],
    aliases: ['lituril', 'lityum', 'lithium carbonate'],
    drugClasses: ['mood_stabilizer', 'narrow_therapeutic_index', 'thiazide_nsaid_acei_toxicity_hard_stop', 'teratogenic_ebstein'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'gabapentin',
    rxCui: '25480',
    displayNameTr: 'Gabapentin',
    displayNameEn: 'Gabapentin',
    atcCodes: ['N02BF01'],
    aliases: ['neurontin', 'gabateva', 'neruda', 'gabapentin'],
    drugClasses: ['gabapentinoid', 'neuropathic_pain', 'respiratory_depression_with_opioid', 'renal_egfr_cutoff_60'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'pregabalin',
    rxCui: '187832',
    displayNameTr: 'Pregabalin',
    displayNameEn: 'Pregabalin',
    atcCodes: ['N02BF02'],
    aliases: ['lyrica', 'gerica', 'neopres', 'pregabalin'],
    drugClasses: ['gabapentinoid', 'neuropathic_pain', 'respiratory_depression_with_opioid', 'renal_egfr_cutoff_60'],
    isControlledSubstance: true,
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'sumatriptan',
    rxCui: '10244',
    displayNameTr: 'Sumatriptan',
    displayNameEn: 'Sumatriptan',
    atcCodes: ['N02CC01'],
    aliases: ['imigran', 'sumatriptan'],
    drugClasses: ['triptan', 'serotonin_5ht1b_1d_agonist', 'coronary_vasoconstrictor'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'zolmitriptan',
    rxCui: '74885',
    displayNameTr: 'Zolmitriptan',
    displayNameEn: 'Zolmitriptan',
    atcCodes: ['N02CC03'],
    aliases: ['zomig', 'zolmitriptan'],
    drugClasses: ['triptan', 'serotonin_5ht1b_1d_agonist'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'dextromethorphan',
    rxCui: '3289',
    displayNameTr: 'Dekstrometorfan',
    displayNameEn: 'Dextromethorphan',
    atcCodes: ['R05DA09'],
    aliases: ['benical', 'tylol hot', 'vicks', 'dekstrometorfan'],
    drugClasses: ['antitussive', 'serotonergic', 'serotonin_syndrome_risk'],
    pediatricHighAlert: false
  },

  // --- 5. IMMUNOSUPPRESSIVE, ANTIGOUT & ONCOLOGY ---
  {
    canonicalKey: 'methotrexate',
    rxCui: '6851',
    displayNameTr: 'Metotreksat',
    displayNameEn: 'Methotrexate',
    atcCodes: ['L01BA01', 'L04AX03'],
    aliases: ['metotreksat', 'emthexate', 'trexan', 'methotrexate'],
    drugClasses: ['antimetabolite', 'folate_antagonist', 'tmp_smx_nsaid_toxic_synergy_hard_stop', 'teratogenic_pregnancy', 'narrow_therapeutic_index'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'azathioprine',
    rxCui: '1256',
    displayNameTr: 'Azatioprin',
    displayNameEn: 'Azathioprine',
    atcCodes: ['L04AX01'],
    aliases: ['imuran', 'azatioprin', 'azathioprine'],
    drugClasses: ['purine_antagonist', 'immunosuppressive', 'allopurinol_toxic_myelosuppression_hard_stop'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'mercaptopurine',
    rxCui: '6780',
    displayNameTr: 'Merkaptopürin (6-MP)',
    displayNameEn: 'Mercaptopurine (6-MP)',
    atcCodes: ['L01BB02'],
    aliases: ['puri-nethol', 'merkaptopurin', '6-mp'],
    drugClasses: ['purine_antagonist', 'antineoplastic', 'allopurinol_toxic_myelosuppression_hard_stop'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'allopurinol',
    rxCui: '519',
    displayNameTr: 'Allopürinol',
    displayNameEn: 'Allopurinol',
    atcCodes: ['M04AA01'],
    aliases: ['allopurinol', 'allopürinol', 'ürikoliz', 'uricid', 'zyloric'],
    drugClasses: ['xanthine_oxidase_inhibitor', 'antigout', 'thiopurine_interaction_hard_stop', 'renal_egfr_cutoff_50'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'febuxostat',
    rxCui: '413620',
    displayNameTr: 'Febuksostat',
    displayNameEn: 'Febuxostat',
    atcCodes: ['M04AA03'],
    aliases: ['adenuric', 'febuksostat', 'febuxostat'],
    drugClasses: ['xanthine_oxidase_inhibitor', 'antigout', 'thiopurine_interaction_hard_stop'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'colchicine',
    rxCui: '2683',
    displayNameTr: 'Kolşisin',
    displayNameEn: 'Colchicine',
    atcCodes: ['M04AC01'],
    aliases: ['kolşisin', 'colchicine', 'kolsin', 'kolposin', 'colchicum-dispert'],
    drugClasses: ['antigout', 'cyp3a4_pgp_inhibitor_fatal_toxicity_hard_stop', 'narrow_therapeutic_index', 'renal_egfr_cutoff_50'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'methylprednisolone',
    rxCui: '6902',
    displayNameTr: 'Metilprednizolon',
    displayNameEn: 'Methylprednisolone',
    atcCodes: ['H02AB04'],
    aliases: ['prednol', 'metilprednizolon', 'methylprednisolone'],
    drugClasses: ['systemic_corticosteroid', 'antiinflammatory', 'fluoroquinolone_tendon_rupture_risk'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'dexamethasone',
    rxCui: '3264',
    displayNameTr: 'Deksametazon',
    displayNameEn: 'Dexamethasone',
    atcCodes: ['H02AB02', 'S01BA01'],
    aliases: ['dekort', 'onadron', 'deksametazon', 'dexamethasone'],
    drugClasses: ['systemic_corticosteroid', 'antiinflammatory', 'fluoroquinolone_tendon_rupture_risk'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'prednisolone',
    rxCui: '8638',
    displayNameTr: 'Prednizolon',
    displayNameEn: 'Prednisolone',
    atcCodes: ['H02AB06'],
    aliases: ['deltacortril', 'prednizolon', 'prednisolone'],
    drugClasses: ['systemic_corticosteroid', 'antiinflammatory', 'fluoroquinolone_tendon_rupture_risk'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'budesonide',
    rxCui: '19839',
    displayNameTr: 'Budezonid',
    displayNameEn: 'Budesonide',
    atcCodes: ['R03BA02', 'A07EA06'],
    aliases: ['pulmicort', 'budesonid', 'budesonide'],
    drugClasses: ['inhaled_corticosteroid', 'antiinflammatory'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'cyclosporine',
    rxCui: '3008',
    displayNameTr: 'Siklosporin',
    displayNameEn: 'Cyclosporine',
    atcCodes: ['L04AD01', 'S01XA18'],
    aliases: ['sandimmun', 'siklosporin', 'cyclosporine'],
    drugClasses: ['calcineurin_inhibitor', 'immunosuppressive', 'hyperkalemic', 'nephrotoxic', 'narrow_therapeutic_index'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'tacrolimus',
    rxCui: '42316',
    displayNameTr: 'Takrolimus',
    displayNameEn: 'Tacrolimus',
    atcCodes: ['L04AD02', 'D11AH01'],
    aliases: ['prograf', 'advagraf', 'takrolimus', 'tacrolimus'],
    drugClasses: ['calcineurin_inhibitor', 'immunosuppressive', 'hyperkalemic', 'nephrotoxic', 'narrow_therapeutic_index'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'isotretinoin',
    rxCui: '6064',
    displayNameTr: 'İzotretinoin',
    displayNameEn: 'Isotretinoin',
    atcCodes: ['D10BA01'],
    aliases: ['roaccutane', 'zoretanin', 'aknetrent', 'izotretinoin', 'isotretinoin'],
    drugClasses: ['retinoid', 'acne_treatment', 'teratogenic_pregnancy_category_x_hard_stop'],
    pediatricHighAlert: true,
    boxedWarning: true
  },

  // --- 6. RESUSCITATION, GI, ELECTROLYTES & METABOLIC ---
  {
    canonicalKey: 'omeprazole',
    rxCui: '7646',
    displayNameTr: 'Omeprazol',
    displayNameEn: 'Omeprazole',
    atcCodes: ['A02BC01'],
    aliases: ['losec', 'omeprazid', 'omeprazol', 'demeprazol'],
    drugClasses: ['ppi', 'cyp2c19_inhibitor', 'clopidogrel_inhibitor'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'esomeprazole',
    rxCui: '283742',
    displayNameTr: 'Esomeprazol',
    displayNameEn: 'Esomeprazole',
    atcCodes: ['A02BC05'],
    aliases: ['nexium', 'esomeprazol', 'esom'],
    drugClasses: ['ppi', 'cyp2c19_inhibitor', 'clopidogrel_inhibitor'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'pantoprazole',
    rxCui: '40790',
    displayNameTr: 'Pantoprazol',
    displayNameEn: 'Pantoprazole',
    atcCodes: ['A02BC02'],
    aliases: ['pantpas', 'pantactive', 'pantoprazol', 'pulcet'],
    drugClasses: ['ppi', 'clopidogrel_safe_alternative'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'ondansetron',
    rxCui: '7617',
    displayNameTr: 'Ondansetron',
    displayNameEn: 'Ondansetron',
    atcCodes: ['A04AA01'],
    aliases: ['zofran', 'ondansetron', 'zofer', 'vocheron'],
    drugClasses: ['5ht3_antagonist', 'antiemetic', 'qt_prolonging_conditional'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'metoclopramide',
    rxCui: '6915',
    displayNameTr: 'Metoklopramid',
    displayNameEn: 'Metoclopramide',
    atcCodes: ['A03FA01'],
    aliases: ['metpamid', 'metoklopramid', 'primperan'],
    drugClasses: ['d2_antagonist', 'antiemetic', 'prokinetic', 'extrapyramidal_risk_pediatric'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'epinephrine',
    rxCui: '3992',
    displayNameTr: 'Epinefrin (Adrenalin)',
    displayNameEn: 'Epinephrine (Adrenaline)',
    atcCodes: ['C01CA24', 'R01AA14', 'R03AK01'],
    aliases: ['adrenalin', 'epinephrine', 'epinefrin'],
    drugClasses: ['vasopressor', 'inotropic', 'sympathomimetic', 'anaphylaxis_first_line'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'salbutamol',
    rxCui: '435',
    displayNameTr: 'Salbutamol',
    displayNameEn: 'Salbutamol (Albuterol)',
    atcCodes: ['R03AC02', 'R03CC02'],
    aliases: ['ventolin', 'salbutamol', 'albuterol'],
    drugClasses: ['beta2_agonist', 'bronchodilator', 'hypokalemic'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'ipratropium',
    rxCui: '5970',
    displayNameTr: 'İpratropium Bromür',
    displayNameEn: 'Ipratropium Bromide',
    atcCodes: ['R03BB01'],
    aliases: ['atrovent', 'ipratropium'],
    drugClasses: ['anticholinergic', 'bronchodilator'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'calcium_gluconate',
    rxCui: '1908',
    displayNameTr: 'Kalsiyum Glukonat',
    displayNameEn: 'Calcium Gluconate',
    atcCodes: ['A12AA03', 'D11AX18'],
    aliases: ['kalsiyum glukonat', 'calcium gluconate', 'kalsiyum', 'calcium'],
    drugClasses: ['calcium_salt', 'electrolyte', 'ceftriaxone_neonatal_incompatible_hard_stop'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'calcium_chloride',
    rxCui: '1903',
    displayNameTr: 'Kalsiyum Klorür',
    displayNameEn: 'Calcium Chloride',
    atcCodes: ['A12AA07', 'B05XA07'],
    aliases: ['kalsiyum klorur', 'calcium chloride'],
    drugClasses: ['calcium_salt', 'electrolyte', 'ceftriaxone_neonatal_incompatible_hard_stop'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'potassium_chloride',
    rxCui: '8591',
    displayNameTr: 'Potasyum Klorür',
    displayNameEn: 'Potassium Chloride',
    atcCodes: ['A12BA01', 'B05XA01'],
    aliases: ['potasyum klorur', 'potassium chloride', 'k-contin', 'kardiyolit', 'potasium'],
    drugClasses: ['potassium_salt', 'electrolyte', 'potassium_sparing_diuretic_synergy_hard_stop'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'ringer_lactate',
    rxCui: '9390',
    displayNameTr: 'Ringer Laktat',
    displayNameEn: 'Lactated Ringer Solution',
    atcCodes: ['B05BB01'],
    aliases: ['ringer laktat', 'lactated ringer', 'hartmann', 'ringer'],
    drugClasses: ['iv_fluid', 'calcium_containing_solution', 'ceftriaxone_neonatal_incompatible_hard_stop'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'metformin',
    rxCui: '6809',
    displayNameTr: 'Metformin',
    displayNameEn: 'Metformin',
    atcCodes: ['A10BA02'],
    aliases: ['glukofen', 'glucophage', 'diaformin', 'matofin', 'glifor', 'metformin'],
    drugClasses: ['biguanide', 'antidiabetic', 'lactic_acidosis_risk', 'renal_egfr_cutoff_30'],
    pediatricHighAlert: false,
    boxedWarning: true
  },
  {
    canonicalKey: 'oral_rehydration_salts',
    rxCui: '7695',
    displayNameTr: 'Oral Rehidrasyon Sıvısı (ORS)',
    displayNameEn: 'Oral Rehydration Salts',
    atcCodes: ['A07CA'],
    aliases: ['ors', 'ge-oral', 'oral rehidrasyon', 'rehidrasyon'],
    drugClasses: ['oral_electrolyte', 'rehydration'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'zinc_sulfate',
    rxCui: '11440',
    displayNameTr: 'Çinko Sülfat',
    displayNameEn: 'Zinc Sulfate',
    atcCodes: ['A12CB01'],
    aliases: ['zinco', 'cinko sulfit', 'zinc sulfate', 'cinko'],
    drugClasses: ['trace_element', 'mineral_supplement'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'methylene_blue',
    rxCui: '6886',
    displayNameTr: 'Metilen Mavisi (Methylthioninium)',
    displayNameEn: 'Methylene Blue',
    atcCodes: ['V03AB17'],
    aliases: ['metilen mavisi', 'methylene blue'],
    drugClasses: ['antidote', 'maoi_activity', 'serotonin_syndrome_hard_stop'],
    pediatricHighAlert: true
  },
  {
    canonicalKey: 'isosorbide_mononitrate',
    rxCui: '6054',
    displayNameTr: 'İzosorbid Mononitrat',
    displayNameEn: 'Isosorbide Mononitrate',
    atcCodes: ['C01DA14'],
    aliases: ['monodur', 'monoket', 'isomonit', 'izosorbid mononitrat', 'isosorbide mononitrate', 'monodur durules'],
    drugClasses: ['nitrate', 'vasodilator', 'antianginal', 'pde5_synergy_hypotension_hard_stop'],
    pediatricHighAlert: false
  },
  {
    canonicalKey: 'acitretin',
    rxCui: '194',
    displayNameTr: 'Asitretin',
    displayNameEn: 'Acitretin',
    atcCodes: ['D05BB02'],
    aliases: ['neotigason', 'asitretin', 'acitretin'],
    drugClasses: ['retinoid', 'teratogenic_pregnancy', 'teratogenic_pregnancy_category_x_hard_stop'],
    pediatricHighAlert: true,
    boxedWarning: true
  },
  {
    canonicalKey: 'iodinated_contrast',
    rxCui: '5784',
    displayNameTr: 'İyotlu Kontrast Madde (İKM)',
    displayNameEn: 'Iodinated Radiocontrast Agent',
    atcCodes: ['V08AB'],
    aliases: ['iyotlu kontrast', 'opak madde', 'kontrast madde', 'omnipaque', 'visipaque', 'ultravist', 'iopamidol', 'iohexol', 'iodixanol', 'ikm'],
    drugClasses: ['contrast_media', 'radiopaque', 'metformin_contrast_lactic_acidosis_risk'],
    pediatricHighAlert: false
  }
];

// Inverted index maps for O(1) resolution speed
const BY_CUI_MAP = new Map<string, RxNormConceptDefinition>();
const BY_CANONICAL_MAP = new Map<string, RxNormConceptDefinition>();
const BY_ATC_MAP = new Map<string, RxNormConceptDefinition>();

// Populate indexes once at module load
for (const concept of OFFLINE_RXNORM_CONCEPTS) {
  BY_CUI_MAP.set(concept.rxCui, concept);
  BY_CANONICAL_MAP.set(concept.canonicalKey.toLowerCase(), concept);
  for (const atc of concept.atcCodes) {
    BY_ATC_MAP.set(atc.toUpperCase(), concept);
  }
}

/**
 * Check if the upstream NLM RxNav Drug Interaction API is deprecated
 * Always returns true.
 */
export function isRxNavApiDeprecated(): boolean {
  return true;
}

/**
 * Returns offline metadata and health statistics
 */
export function getOfflineOntologyStats(): OfflineOntologyStats {
  const allAliases = new Set<string>();
  const allAtcs = new Set<string>();

  for (const c of OFFLINE_RXNORM_CONCEPTS) {
    c.aliases.forEach(a => allAliases.add(a.toLowerCase()));
    c.atcCodes.forEach(atc => allAtcs.add(atc.toUpperCase()));
  }

  return {
    totalConcepts: OFFLINE_RXNORM_CONCEPTS.length,
    totalAliases: allAliases.size,
    totalAtcCodes: allAtcs.size,
    version: '2026.10-PWA-OFFLINE-RXNORM-TITCK',
    lastUpdated: '2026-10-26T23:58:00Z',
    license: 'MIT (Cleanroom Standard Concepts; NLM RxNorm Public Domain)',
    offlineGuaranteed: true,
    rxNavApiStatus: 'PERMANENTLY_DEPRECATED_UPSTREAM'
  };
}

/**
 * Retrieve concept directly by standard RxNorm CUI
 */
export function getRxNormConceptByCui(cui: string | number): ResolvedRxConcept | null {
  if (!cui) return null;
  const def = BY_CUI_MAP.get(String(cui).trim());
  if (!def) return null;
  return buildResolvedConcept(def, String(cui), 'EXACT_CUI');
}

/**
 * Retrieve concept directly by ATC Code
 */
export function getRxNormConceptByAtc(atcCode: string): ResolvedRxConcept | null {
  if (!atcCode) return null;
  const cleanAtc = atcCode.trim().toUpperCase();
  const def = BY_ATC_MAP.get(cleanAtc);
  if (def) {
    return buildResolvedConcept(def, atcCode, 'EXACT_ATC');
  }

  // Prefix match (e.g. 'J01DD' -> matches Ceftriaxone or Cefotaxime if specific)
  for (const [key, concept] of BY_ATC_MAP.entries()) {
    if (cleanAtc.startsWith(key) || key.startsWith(cleanAtc)) {
      return buildResolvedConcept(concept, atcCode, 'EXACT_ATC');
    }
  }

  return null;
}

/**
 * Retrieve concept directly by canonical key
 */
export function getRxNormConceptByKey(canonicalKey: string): ResolvedRxConcept | null {
  if (!canonicalKey) return null;
  const def = BY_CANONICAL_MAP.get(canonicalKey.trim().toLowerCase());
  if (!def) return null;
  return buildResolvedConcept(def, canonicalKey, 'CANONICAL_KEY');
}

/**
 * Resolve any drug input (string, object with name, brand, generic, or atcCode)
 * to its standard RxNorm Concept Unique Identifier and Canonical Concept.
 * 
 * Works 100% OFFLINE without any external network latency or RxNav dependency.
 */
export function resolveToRxNormConcept(input: DrugInputItem | string | null | undefined): ResolvedRxConcept | null {
  if (!input) return null;

  let rawString = '';
  let atc = '';
  let cui = '';
  let originalInput: string | Record<string, unknown> = '';

  if (typeof input === 'string') {
    rawString = input;
    originalInput = input;
  } else if (typeof input === 'object') {
    originalInput = input as Record<string, unknown>;
    const brand = (input.brand || input.brandName || input.name || '') as string;
    const generic = (input.generic || '') as string;
    rawString = `${brand} ${generic}`.trim();
    atc = (input.atcCode || input.atc || '') as string;
    cui = ((input as any).rxCui || (input as any).rxcui || (input as any).cui || '') as string;
  }

  // 1. Direct RxCUI match if provided
  if (cui) {
    const byCui = getRxNormConceptByCui(cui);
    if (byCui) return { ...byCui, rawInput: originalInput };
  }

  // 2. Direct ATC match if provided
  if (atc) {
    const byAtc = getRxNormConceptByAtc(atc);
    if (byAtc) return { ...byAtc, rawInput: originalInput };
  }

  const norm = normalizeRxText(rawString);
  if (!norm) return null;

  // 3. Exact Canonical Key match
  if (BY_CANONICAL_MAP.has(norm)) {
    return buildResolvedConcept(BY_CANONICAL_MAP.get(norm)!, originalInput, 'CANONICAL_KEY');
  }

  // 4. Exact Generic Name match (English or Turkish)
  for (const concept of OFFLINE_RXNORM_CONCEPTS) {
    if (
      normalizeRxText(concept.displayNameEn) === norm ||
      normalizeRxText(concept.displayNameTr) === norm
    ) {
      return buildResolvedConcept(concept, originalInput, 'EXACT_GENERIC');
    }
  }

  // 5. Brand Alias exact or safe token match
  for (const concept of OFFLINE_RXNORM_CONCEPTS) {
    for (const alias of concept.aliases) {
      if (normalizeRxText(alias) === norm) {
        return buildResolvedConcept(concept, originalInput, 'BRAND_ALIAS');
      }
    }
  }

  // 6. Substring / Word token search across aliases and names
  // We prioritize high-confidence matches with word boundary check
  for (const concept of OFFLINE_RXNORM_CONCEPTS) {
    // Check canonical key
    if (containsKeywordSafe(norm, concept.canonicalKey)) {
      return buildResolvedConcept(concept, originalInput, 'TOKEN_MATCH');
    }
    // Check display names
    if (containsKeywordSafe(norm, concept.displayNameEn) || containsKeywordSafe(norm, concept.displayNameTr)) {
      return buildResolvedConcept(concept, originalInput, 'TOKEN_MATCH');
    }
    // Check aliases
    for (const alias of concept.aliases) {
      if (containsKeywordSafe(norm, alias)) {
        return buildResolvedConcept(concept, originalInput, 'TOKEN_MATCH');
      }
    }
  }

  return null;
}

/**
 * Batch resolve a list of drugs
 */
export function resolveBatchRxNormConcepts(
  inputs: (DrugInputItem | string | null | undefined)[]
): ResolvedRxConcept[] {
  if (!Array.isArray(inputs)) return [];
  const results: ResolvedRxConcept[] = [];
  for (const item of inputs) {
    const resolved = resolveToRxNormConcept(item);
    if (resolved) {
      results.push(resolved);
    }
  }
  return results;
}

/**
 * Helper to construct a standard ResolvedRxConcept object
 */
function buildResolvedConcept(
  def: RxNormConceptDefinition,
  rawInput: string | Record<string, unknown>,
  confidence: ConceptMatchConfidence
): ResolvedRxConcept {
  return {
    canonicalKey: def.canonicalKey,
    displayNameTr: def.displayNameTr,
    displayNameEn: def.displayNameEn,
    rxCui: def.rxCui,
    atcCodes: [...def.atcCodes],
    drugClasses: [...def.drugClasses],
    isControlledSubstance: !!def.isControlledSubstance,
    pediatricHighAlert: !!def.pediatricHighAlert,
    boxedWarning: !!def.boxedWarning,
    dataSource: 'OFFLINE_RXNORM_TITCK_ONTOLOGY',
    rawInput,
    confidence
  };
}
