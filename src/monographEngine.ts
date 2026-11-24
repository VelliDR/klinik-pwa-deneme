/**
 * ÇEVRİMDIŞI KLİNİK İLAÇ MONOGRAF MOTORU (OFFLINE CLINICAL MONOGRAPH ENGINE)
 *
 * Hastane bodrum katları, sarı/kırmızı alanlar ve internetin çekmediği nöbet
 * ortamlarında TİTCK harici PDF bağlantıları açılamadığında en sık kullanılan
 * 125 kritik etken madde için %100 çevrimdışı doz, renal/hepatik uyarlama,
 * gebelik/emzirme güvenliği ve kontrendikasyon özeti sunar.
 */

import { normalizeText, type NormalizedDrugRecord } from './db/titckIndexedDB';
import { formatTlPrice } from './drugEngine';
import type { KubShardRecord } from './engines/kubShardEngine';
import {
  translateFoodEntry,
  translateFoodMechanism,
  translateDiseaseName,
  translateDupGroup,
  type DdiMatrixAlert
} from './engines/ddiMatrixEngine';
import type { AtcIcd10Profile, AtcPharmacologyProfile } from './types/clinical';
import { formatTurkishDate, renderPriceDateBubbleTriggerHTML } from './engines/dataManifestEngine';
import {
  ensureAtcKnowledgeBaseReady,
  getAtcProfile,
  isAtcKnowledgeReady
} from './engines/atcKnowledgeEngine';

export type MeasuringDeviceType = 'oral_syringe' | 'calibrated_cup' | 'dropper' | 'none';
export type LactMedSafetyVerdict = 'COMPATIBLE' | 'USE_WITH_CAUTION' | 'CONTRAINDICATED';
export type WeightMetricInObesity = 'TBW' | 'IBW' | 'AdjBW';
export type TrimesterRiskLevel = 'SAFE' | 'CAUTION' | 'CONTRAINDICATED';

export interface FormulationsProfile {
  form_name: string;
  concentration_mg_per_ml: number;
  concentration_display?: string;
  measuring_device: MeasuringDeviceType;
  reconstitution_stability_days?: number;
  storage_condition?: string;
}

export interface PediatricDosingProfile {
  indication: string;
  min_age_months: number;
  min_weight_kg: number;
  dose_per_kg_single: number;
  interval_hours: number;
  max_daily_dose_mg_per_kg: number;
  absolute_max_single_dose_mg: number;
  absolute_max_daily_dose_mg: number;
  weight_metric_in_obesity?: WeightMetricInObesity;
}

export interface AdultDosingProfile {
  standard_single_dose_mg?: number;
  standard_interval_hours?: number[];
  max_single_dose_mg?: number;
  max_daily_dose_mg?: number;
}

export interface DosingStructure {
  adult_dosing?: AdultDosingProfile;
  pediatric_dosing?: PediatricDosingProfile[];
}

export interface RenalAdjustmentItem {
  egfr_min: number;
  egfr_max: number;
  action_type: 'NO_ADJUSTMENT' | 'DOSE_REDUCTION' | 'INTERVAL_EXTENSION' | 'CONTRAINDICATED';
  adjustment_instruction: string;
}

export interface HepaticAdjustmentItem {
  child_pugh_class: 'Class_A' | 'Class_B' | 'Class_C';
  action_instruction: string;
}

export interface OrganImpairmentStructure {
  renal_adjustments?: RenalAdjustmentItem[];
  hepatic_adjustments?: HepaticAdjustmentItem[];
}

export interface PregnancyTrimesterRisk {
  first_trimester: string;
  second_trimester: string;
  third_trimester: string;
}

export interface LactationProfile {
  lactmed_record_summary: string;
  relative_infant_dose_percent: number;
  safety_verdict: LactMedSafetyVerdict;
  infant_monitoring?: string;
  infant_monitoring_notes?: string;
}

export interface ReproductiveSafetyStructure {
  titck_legacy_category?: string;
  pregnancy_trimester_risk?: PregnancyTrimesterRisk;
  lactation?: LactationProfile;
}

export interface CriticalDrugInteraction {
  interacting_drug: string;
  severity: 'CONTRAINDICATED' | 'MAJOR' | 'MODERATE';
  clinical_management: string;
}

export interface SafetyWarningsStructure {
  black_box_warnings?: string[];
  absolute_contraindications?: string[];
  neonatal_specific_notes?: string;
  critical_drug_interactions?: CriticalDrugInteraction[];
}

export interface MonographMetadata {
  source_documents: string[];
  version_date: string;
  last_reviewed_iso: string;
}

export interface ClinicalMonograph {
  id: string;
  genericTr: string;
  genericEn: string;
  atcCodes: string[];
  genericKeywords: string[];
  brandExamples: string[];
  drugClass: string;
  indications: string;
  adultDose: string;
  pediatricDose: string;
  maxDailyDose: string;
  renalAdjustment: string;
  hepaticAdjustment: string;
  pregnancyLactation: string;
  contraindications: string;
  clinicalPearls: string;
  // Structured Clinical Monograph Card fields
  drug_id?: string;
  generic_name?: string;
  atc_code?: string;
  formulations?: FormulationsProfile[];
  dosing?: DosingStructure;
  organ_impairment?: OrganImpairmentStructure;
  reproductive_safety?: ReproductiveSafetyStructure;
  safety_warnings?: SafetyWarningsStructure;
  metadata?: MonographMetadata;
}

export interface MonographLookupInput {
  atc?: string;
  atcCode?: string;
  generic?: string;
  brand?: string;
}

interface MonographIndex {
  byAtcExact: Map<string, ClinicalMonograph>;
  byAtcPrefix: Array<{ prefix: string; item: ClinicalMonograph }>;
  byKeywordNorm: Map<string, ClinicalMonograph>;
  byBrandNorm: Map<string, ClinicalMonograph>;
}

let monographsCache: ClinicalMonograph[] | null = null;
let monographIndex: MonographIndex | null = null;
let loadingPromise: Promise<ClinicalMonograph[]> | null = null;

function buildMonographIndex(list: ClinicalMonograph[]): MonographIndex {
  const byAtcExact = new Map<string, ClinicalMonograph>();
  const byAtcPrefix: Array<{ prefix: string; item: ClinicalMonograph }> = [];
  const byKeywordNorm = new Map<string, ClinicalMonograph>();
  const byBrandNorm = new Map<string, ClinicalMonograph>();

  for (const item of list) {
    if (Array.isArray(item.atcCodes)) {
      for (const rawCode of item.atcCodes) {
        const code = String(rawCode || '').trim().toUpperCase();
        if (!code) continue;
        if (code.length >= 7) {
          if (!byAtcExact.has(code)) byAtcExact.set(code, item);
        } else if (code.length >= 4) {
          byAtcPrefix.push({ prefix: code, item });
        }
      }
    }

    const keywords = [
      item.genericEn,
      (item.genericTr || '').split('(')[0],
      ...(item.genericKeywords || [])
    ];
    for (const kw of keywords) {
      const norm = normalizeText(kw);
      if (norm && norm.length >= 3 && !byKeywordNorm.has(norm)) {
        byKeywordNorm.set(norm, item);
      }
    }

    if (Array.isArray(item.brandExamples)) {
      for (const br of item.brandExamples) {
        const norm = normalizeText(br);
        if (norm && norm.length >= 3 && !byBrandNorm.has(norm)) {
          byBrandNorm.set(norm, item);
        }
      }
    }
  }

  // Daha uzun (spesifik) ATC önekleri önce kontrol edilir
  byAtcPrefix.sort((a, b) => b.prefix.length - a.prefix.length);

  return { byAtcExact, byAtcPrefix, byKeywordNorm, byBrandNorm };
}

export function setMonographsCache(list: ClinicalMonograph[]): void {
  if (!Array.isArray(list)) return;
  monographsCache = list;
  monographIndex = buildMonographIndex(list);
}

export function getMonographsCache(): ClinicalMonograph[] | null {
  return monographsCache;
}

export function isMonographsReady(): boolean {
  return monographsCache !== null && monographsCache.length > 0;
}

export async function ensureMonographsReady(): Promise<ClinicalMonograph[]> {
  if (isMonographsReady() && monographsCache) {
    return monographsCache;
  }
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const candidatePaths = [
      './data/clinical_monographs.json',
      '/data/clinical_monographs.json',
      'data/clinical_monographs.json'
    ];

    for (const p of candidatePaths) {
      try {
        const res = await fetch(p);
        if (res && res.ok) {
          const data = (await res.json()) as ClinicalMonograph[];
          if (Array.isArray(data) && data.length > 0) {
            setMonographsCache(data);
            return data;
          }
        }
      } catch {
        // Sonraki aday yolu dene
      }
    }
    return [];
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export function findMonographSync(drug?: MonographLookupInput | null): ClinicalMonograph | null {
  if (!drug || !monographIndex) return null;

  const rawAtc = String(drug.atcCode || drug.atc || '').trim().toUpperCase();
  if (rawAtc) {
    const exact = monographIndex.byAtcExact.get(rawAtc);
    if (exact) return exact;

    for (const { prefix, item } of monographIndex.byAtcPrefix) {
      if (rawAtc.startsWith(prefix)) return item;
    }
  }

  const genNorm = normalizeText(drug.generic || '');
  if (genNorm && genNorm !== 'belirtilmedi') {
    const directGen = monographIndex.byKeywordNorm.get(genNorm);
    if (directGen) return directGen;

    // Kombinasyon veya tuz ekli jenerik isimler için kelime/ifade taraması (örn: "dexketoprofen trometamol", "valsartan and diuretics")
    for (const [kw, item] of monographIndex.byKeywordNorm.entries()) {
      if (kw.length >= 5 && (genNorm === kw || genNorm.startsWith(kw + ' ') || genNorm.includes(' ' + kw + ' ') || genNorm.endsWith(' ' + kw))) {
        return item;
      }
    }
  }

  const brandNorm = normalizeText(drug.brand || '');
  if (brandNorm) {
    const firstToken = brandNorm.split(' ')[0];
    if (firstToken && firstToken.length >= 3) {
      const byFirstBrand = monographIndex.byBrandNorm.get(firstToken);
      if (byFirstBrand) return byFirstBrand;
    }
    for (const [brNorm, item] of monographIndex.byBrandNorm.entries()) {
      if (brandNorm === brNorm || brandNorm.startsWith(brNorm + ' ')) {
        return item;
      }
    }
  }

  return null;
}

export interface MasterFoodInteraction {
  f: string; // food name (EN)
  l: string; // level (Major | Moderate | Minor)
  m?: string; // mechanism
  i?: string; // interaction text
  g?: string; // management text
}

export interface MasterDiseaseInteraction {
  d: string; // disease name (EN)
  l: string; // level (Major | Moderate | Minor)
}

export interface MasterMonographRecord {
  atc: string;
  genericTr: string;
  genericEn: string;
  drugClass: string;
  l1?: string;
  l3?: string;
  l4?: string;
  adultDose: string;
  pediatricDose: string;
  pregnancyFda: string;
  pregnancyPllr: string;
  lactation: string;
  lactmed: string;
  organImpairment: string;
  blackBox: string;
  contraindications: string;
  contraDiseases: string[];
  indications: string[];
  rxnorm: string;
  chembl: string;
  phase?: string;
  storage?: string;
  dailyMedSpl?: string;
  brands?: string[];
  hasKub?: boolean;
  // v2 Hibrit ETL Zenginleştirmeleri
  food?: MasterFoodInteraction[];
  disease?: MasterDiseaseInteraction[];
  ddiCnt?: [number, number, number]; // [Major, Moderate, Minor]
  ddiMajor?: string[];
  dupGroup?: string[];
  dili?: string;
  diliSum?: string;
  diliUrl?: string;
  cyp?: string[];
  moa?: string;
  halfLife?: string;
  metabolism?: string;
  proteinBinding?: string;
  ddd?: string;
  route?: string;
  formula?: string;
  mw?: string;
  pubchem?: string;
}

export interface MonographRenderContext {
  master?: MasterMonographRecord | null;
  kub?: KubShardRecord | null;
  catalogDrug?: NormalizedDrugRecord | null;
  icdProfile?: AtcIcd10Profile | null;
  atcProfile?: AtcPharmacologyProfile | null;
  activeRxAlerts?: DdiMatrixAlert[];
  isCoreMonograph?: boolean;
}

let masterCache: Record<string, MasterMonographRecord> | null = null;
let masterLoadingPromise: Promise<Record<string, MasterMonographRecord>> | null = null;

export function isMasterMonographsReady(): boolean {
  return masterCache !== null && Object.keys(masterCache).length > 0;
}

export function getMasterMonographsCache(): Record<string, MasterMonographRecord> | null {
  return masterCache;
}

export async function ensureMasterMonographsReady(): Promise<Record<string, MasterMonographRecord>> {
  if (!isAtcKnowledgeReady()) {
    void ensureAtcKnowledgeBaseReady();
  }
  if (isMasterMonographsReady() && masterCache) {
    return masterCache;
  }
  if (masterLoadingPromise) {
    return masterLoadingPromise;
  }

  masterLoadingPromise = (async () => {
    const candidatePaths = [
      './data/clinical_monographs_master.json',
      '/data/clinical_monographs_master.json',
      'data/clinical_monographs_master.json'
    ];

    for (const p of candidatePaths) {
      try {
        const res = await fetch(p);
        if (res && res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            masterCache = data as Record<string, MasterMonographRecord>;
            return masterCache;
          }
        }
      } catch {
        // Sonraki adayı dene
      }
    }
    return {};
  })();

  try {
    return await masterLoadingPromise;
  } finally {
    masterLoadingPromise = null;
  }
}

function resolveAtcFallbackBlackBox(atcCode: string, atcProfile: AtcPharmacologyProfile | null): string {
  const warning = atcProfile?.blackBoxWarning?.trim() || '';
  if (!warning) return '';
  const cleanAtc = String(atcCode || '').trim().toUpperCase();
  // Sınıf şablonundaki Florokinolon kara kutu uyarısı yalnızca gerçek J01MA florokinolonlara uygulanır
  if (warning.includes('FLOROKİNONOL') && !cleanAtc.startsWith('J01MA')) {
    return '';
  }
  return warning;
}

export function convertMasterToClinicalMonograph(m: MasterMonographRecord, selectedBrand?: string): ClinicalMonograph {
  const atcFallback = m.atc ? getAtcProfile(m.atc) : null;

  // Gebelik & Laktasyon & LactMed Metin İnşası
  const pregParts: string[] = [];
  if (m.pregnancyFda) pregParts.push(`FDA Gebelik Sınıfı: ${m.pregnancyFda}`);
  if (m.pregnancyPllr) pregParts.push(`Gebelik Risk Özeti (PLLR):\n${m.pregnancyPllr}`);
  if (m.lactation) pregParts.push(`Laktasyon & Anne Sütü:\n${m.lactation}`);
  if (m.lactmed) pregParts.push(`LactMed Kaydı: ${m.lactmed}`);
  const pregStr = pregParts.join('\n\n') || 'Klinik hekim değerlendirmesi önerilir.';

  // Endikasyonlar
  const indStr = Array.isArray(m.indications) && m.indications.length > 0
    ? m.indications.join(', ')
    : 'KÜB / prospektüs endikasyonlarına başvurunuz.';

  // Kontrendikasyonlar
  const contraParts: string[] = [];
  if (m.contraindications && !m.contraindications.includes('None. None.')) {
    contraParts.push(m.contraindications);
  }
  if (Array.isArray(m.contraDiseases) && m.contraDiseases.length > 0) {
    contraParts.push(`Kontrendike Hastalıklar (MED-RT): ${m.contraDiseases.join(', ')}`);
  }
  const contraStr = contraParts.join('\n\n') || 'Standart kontrendikasyon önlemleri (etken maddeye aşırı duyarlılık vb.) geçerlidir.';

  // Kara Kutu (Black Box) — Master boşsa ATC Bilgi Tabanı yedeğinden zenginleştir
  const bbWarnings = m.blackBox && !m.blackBox.includes('Standart kullanım önlemleri geçerlidir')
    ? [m.blackBox]
    : [];
  if (bbWarnings.length === 0) {
    const fallbackBb = resolveAtcFallbackBlackBox(m.atc, atcFallback);
    if (fallbackBb) bbWarnings.push(fallbackBb);
  }

  const pearlParts: string[] = [
    `ATC Kodu: ${m.atc} (${m.drugClass || 'Farmasötik Ajan'})`
  ];
  if (m.rxnorm) pearlParts.push(`RxNorm RxCUI: ${m.rxnorm}`);
  if (m.chembl) pearlParts.push(`ChEMBL: ${m.chembl}`);
  if (m.phase) pearlParts.push(`Geliştirme Fazı: ${m.phase}`);
  if (m.storage) pearlParts.push(`Saklama: ${m.storage}`);

  return {
    id: `master_${(m.atc || '').toLowerCase()}`,
    genericTr: m.genericTr || m.genericEn || '',
    genericEn: m.genericEn || m.genericTr || '',
    atcCodes: m.atc ? [m.atc] : [],
    genericKeywords: [toLowerTr(m.genericTr || ''), toLowerTr(m.genericEn || '')].filter(Boolean),
    brandExamples: m.brands && m.brands.length > 0 ? m.brands : (selectedBrand ? [selectedBrand] : []),
    drugClass: m.drugClass || 'Klinik Farmasötik Ajan',
    indications: indStr,
    adultDose: m.adultDose || 'KÜB / prospektüs pozolojisine başvurunuz.',
    pediatricDose: m.pediatricDose || 'Pediatrik kullanım ve yaş sınırları için resmi KÜB belgesine başvurunuz.',
    maxDailyDose: 'Resmi KÜB / prospektüs tavan dozuna bakınız.',
    renalAdjustment: m.organImpairment || 'Böbrek yetmezliğinde (eGFR) hekim değerlendirmesi ve doz uyarlaması önerilir.',
    hepaticAdjustment: m.organImpairment || 'Karaciğer yetmezliğinde dikkatli kullanım önerilir.',
    pregnancyLactation: pregStr,
    contraindications: contraStr,
    clinicalPearls: pearlParts.join(' • '),
    safety_warnings: {
      black_box_warnings: bbWarnings,
      absolute_contraindications: contraParts
    },
    metadata: {
      source_documents: ['TİTCK Türkiye İlaç Klinik Master', 'FDA DailyMed SPL', 'MED-RT', 'LactMed (NCBI)'],
      version_date: '2026-10',
      last_reviewed_iso: new Date().toISOString()
    }
  };
}

export function hasMasterMonographSync(atcCode?: string): boolean {
  if (!atcCode || !masterCache) return false;
  return Boolean(masterCache[atcCode.trim().toUpperCase()]);
}

export async function findMasterMonographForDrug(drug?: MonographLookupInput | null): Promise<MasterMonographRecord | null> {
  if (!drug) return null;
  const master = await ensureMasterMonographsReady();
  if (!master) return null;

  const rawAtc = String(drug.atcCode || drug.atc || '').trim().toUpperCase();
  if (rawAtc && master[rawAtc]) {
    return master[rawAtc];
  }

  const genNorm = normalizeText(drug.generic || '');
  if (genNorm && genNorm !== 'belirtilmedi') {
    for (const item of Object.values(master)) {
      if (normalizeText(item.genericTr) === genNorm || normalizeText(item.genericEn) === genNorm) {
        return item;
      }
    }
  }
  return null;
}

export async function findMonographForDrug(drug?: MonographLookupInput | null): Promise<ClinicalMonograph | null> {
  if (!isMonographsReady()) {
    await ensureMonographsReady();
  }
  const sync = findMonographSync(drug);
  if (sync) return sync;

  // 136 çekirdek monografta bulunamadıysa 1.794 ATC'lik Klinik Master kütüphanesini tara
  const masterRec = await findMasterMonographForDrug(drug);
  if (masterRec) {
    return convertMasterToClinicalMonograph(masterRec, drug?.brand);
  }

  return null;
}

function escapeSafeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toLowerTr(text: string): string {
  return String(text || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR');
}

export function evaluateTrimesterRiskLevel(text: string): {
  level: TrimesterRiskLevel;
  label: string;
  badgeClass: string;
  boxClass: string;
} {
  const norm = toLowerTr(text);
  const hasNegatedContra = norm.includes('kontrendike değil') || norm.includes('kontrendikasyonu yoktur');
  if (
    (!hasNegatedContra && (norm.includes('kontrendike') || norm.includes('kesin kontrendike'))) ||
    norm.includes('kullanılmamalı') ||
    norm.includes('kaçınılmalıdır')
  ) {
    return {
      level: 'CONTRAINDICATED',
      label: 'KONTRENDİKE',
      badgeClass: 'bg-rose-900/90 text-rose-200 border-rose-500',
      boxClass: 'bg-rose-950/40 border-rose-700/70 text-rose-100'
    };
  }
  const cleanedForRisk = norm
    .replace(/riski?\s+taşımaz/g, '')
    .replace(/riski?\s+yoktur/g, '')
    .replace(/risk\s+kanıtı\s+yok/g, '')
    .replace(/risk\s+artışı\s+(?:gösterilmemiş|yok)/g, '')
    .replace(/ilacın\s+riskinden\s+kat\s+be\s+kat/g, '');
  if (
    cleanedForRisk.includes('dikkat') ||
    cleanedForRisk.includes('izlem') ||
    cleanedForRisk.includes('alternatif yoksa') ||
    cleanedForRisk.includes('risk') ||
    cleanedForRisk.includes('tartışmalı') ||
    cleanedForRisk.includes('zorunlu')
  ) {
    return {
      level: 'CAUTION',
      label: 'YAKIN İZLEM',
      badgeClass: 'bg-amber-900/90 text-amber-200 border-amber-500',
      boxClass: 'bg-amber-950/40 border-amber-700/70 text-amber-100'
    };
  }
  return {
    level: 'SAFE',
    label: 'GÜVENLİ',
    badgeClass: 'bg-emerald-900/90 text-emerald-200 border-emerald-500',
    boxClass: 'bg-emerald-950/40 border-emerald-700/70 text-emerald-100'
  };
}

export function getMeasuringDeviceBadge(device?: MeasuringDeviceType): { icon: string; label: string; badgeClass: string } {
  switch (device) {
    case 'oral_syringe':
      return { icon: '💉', label: 'Oral Enjektör Zorunlu (<10 mL)', badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-600/70' };
    case 'dropper':
      return { icon: '💧', label: 'Kalibre Damlalık', badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70' };
    case 'calibrated_cup':
      return { icon: '🥛', label: 'Kalibre Ölçü Kabı', badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-600/70' };
    case 'none':
    default:
      return { icon: '💉', label: 'Parenteral / İnfüzyon', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700' };
  }
}

export interface DiliBadgeInfo {
  code: string;
  labelTr: string;
  descTr: string;
  badgeClass: string;
  boxClass: string;
}

export function getDiliBadgeInfo(rawScore?: string): DiliBadgeInfo | null {
  const score = String(rawScore || '').trim().toUpperCase();
  if (!score) return null;
  const letter = score.charAt(0);
  if (letter === 'A') {
    return {
      code: score,
      labelTr: `DILI ${score} — Yüksek Kanıtlı`,
      descTr: 'İyi bilinen hepatotoksisite nedeni (>50 yayımlanmış vaka). Karaciğer enzim (ALT/AST) izlemi önerilir.',
      badgeClass: 'bg-rose-950/80 text-rose-200 border-rose-600/80',
      boxClass: 'bg-rose-950/35 border-rose-700/60'
    };
  }
  if (letter === 'B') {
    return {
      code: score,
      labelTr: `DILI ${score} — Olası`,
      descTr: 'Bilinen veya yüksek olasılıklı hepatotoksisite nedeni (12-50 vaka). Riskli hastalarda izlem gerekir.',
      badgeClass: 'bg-amber-950/80 text-amber-200 border-amber-600/80',
      boxClass: 'bg-amber-950/35 border-amber-700/60'
    };
  }
  if (letter === 'C') {
    return {
      code: score,
      labelTr: `DILI ${score} — Muhtemel / Nadir`,
      descTr: 'Muhtemel ancak nadir hepatotoksisite bildirimleri (<12 vaka).',
      badgeClass: 'bg-yellow-950/70 text-yellow-200 border-yellow-700/70',
      boxClass: 'bg-amber-950/20 border-amber-800/50'
    };
  }
  if (letter === 'D') {
    return {
      code: score,
      labelTr: `DILI ${score} — Çok Nadir`,
      descTr: 'Yalnızca izole vaka bildirimleri mevcut (olası nadir neden).',
      badgeClass: 'bg-sky-950/70 text-sky-200 border-sky-700/70',
      boxClass: 'bg-sky-950/25 border-sky-800/50'
    };
  }
  return {
    code: score,
    labelTr: `DILI ${score} — Kanıt Yok`,
    descTr: 'Klinik olarak belirgin karaciğer hasarı oluşturması beklenmez.',
    badgeClass: 'bg-emerald-950/70 text-emerald-200 border-emerald-700/70',
    boxClass: 'bg-emerald-950/25 border-emerald-800/50'
  };
}

const CRITICAL_ALLERGEN_SET = new Set([
  'Benzil Alkol',
  'Propilen Glikol',
  'Etanol / Alkol',
  'Aspartam / Fenilalanin',
  'Gluten / Buğday Nişastası',
  'Soya / Yer Fıstığı',
  'Sülfit / Metabisülfit'
]);

function renderCollapsibleBlock(title: string, body: string, opts?: { badge?: string; open?: boolean; tone?: 'slate' | 'rose' | 'amber' | 'sky' }): string {
  if (!body || !body.trim()) return '';
  const tone = opts?.tone || 'slate';
  const toneBorder = tone === 'rose'
    ? 'border-rose-700/60 bg-rose-950/25'
    : tone === 'amber'
    ? 'border-amber-700/60 bg-amber-950/25'
    : tone === 'sky'
    ? 'border-sky-700/60 bg-sky-950/25'
    : 'border-slate-800 bg-slate-900/55';
  const toneTitle = tone === 'rose'
    ? 'text-rose-300'
    : tone === 'amber'
    ? 'text-amber-300'
    : tone === 'sky'
    ? 'text-sky-300'
    : 'text-slate-200';

  return `
    <details class="rounded-lg border ${toneBorder} overflow-hidden group" ${opts?.open ? 'open' : ''}>
      <summary class="px-3 py-2 flex items-center justify-between gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:bg-slate-800/40">
        <span class="flex items-center gap-2 text-[0.75rem] font-bold uppercase tracking-wide ${toneTitle}">
          <span>${escapeSafeHtml(title)}</span>
          ${opts?.badge ? `<span class="text-[0.6875rem] font-mono font-normal px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700 normal-case">${escapeSafeHtml(opts.badge)}</span>` : ''}
        </span>
        <span class="text-slate-400 text-[0.75rem] group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div class="px-3 pb-3 pt-1 border-t border-slate-800/70 text-[0.8125rem] text-slate-200 leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto">${escapeSafeHtml(body)}</div>
    </details>
  `;
}

function formatEgfrRangeLabel(egfrMin: number, egfrMax: number): string {
  const minVal = Number.isFinite(egfrMin) ? egfrMin : 0;
  const maxVal = Number.isFinite(egfrMax) ? egfrMax : 999;
  if (maxVal >= 500) {
    return `≥ ${minVal} mL/dk`;
  }
  if (minVal <= 0) {
    if (Math.abs((maxVal - Math.floor(maxVal)) - 0.9) < 0.05) {
      return `< ${Math.ceil(maxVal)} mL/dk`;
    }
    return `0–${maxVal} mL/dk`;
  }
  return `${minVal}–${maxVal} mL/dk`;
}

function getRenalActionBadge(actionType: RenalAdjustmentItem['action_type']): { label: string; cls: string } {
  switch (actionType) {
    case 'CONTRAINDICATED':
      return { label: 'Kontrendike', cls: 'bg-rose-950/80 text-rose-200 border-rose-600/80 font-bold' };
    case 'DOSE_REDUCTION':
      return { label: 'Doz Azaltımı', cls: 'bg-amber-950/75 text-amber-200 border-amber-600/70 font-semibold' };
    case 'INTERVAL_EXTENSION':
      return { label: 'Aralık Uzatımı', cls: 'bg-sky-950/75 text-sky-200 border-sky-600/70 font-semibold' };
    case 'NO_ADJUSTMENT':
    default:
      return { label: 'Standart Doz', cls: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60 font-medium' };
  }
}

function getChildPughBadge(childPughClass: HepaticAdjustmentItem['child_pugh_class']): { label: string; cls: string } {
  switch (childPughClass) {
    case 'Class_C':
      return { label: 'Child-Pugh C', cls: 'bg-rose-950/80 text-rose-200 border-rose-600/80 font-bold' };
    case 'Class_B':
      return { label: 'Child-Pugh B', cls: 'bg-amber-950/75 text-amber-200 border-amber-600/70 font-semibold' };
    case 'Class_A':
    default:
      return { label: 'Child-Pugh A', cls: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60 font-medium' };
  }
}

export function renderMonographCardHTML(
  mono: ClinicalMonograph,
  selectedBrand?: string,
  context?: MonographRenderContext
): string {
  const master = context?.master || null;
  const kub = context?.kub || null;
  const catalogDrug = context?.catalogDrug || null;
  const icdProfile = context?.icdProfile || null;
  const activeRxAlerts = context?.activeRxAlerts || [];
  const isCore = context?.isCoreMonograph ?? !mono.id.startsWith('master_');

  const displayBrand = selectedBrand || catalogDrug?.brand || '';
  const displayGenericTr = icdProfile?.activeIngredientTr || master?.genericTr || mono.genericTr;
  const displayGenericEn = master?.genericEn || mono.genericEn;
  const atcList = (mono.atcCodes || (master ? [master.atc] : [])).filter(Boolean);
  const primaryAtc = atcList[0] || catalogDrug?.atcCode || '';
  const atcProfile = context?.atcProfile ?? (primaryAtc ? getAtcProfile(primaryAtc) : null);
  const hierarchyParts = [
    icdProfile?.l1 || master?.l1 || atcProfile?.systemName,
    icdProfile?.l2 || master?.drugClass || mono.drugClass || atcProfile?.groupName,
    icdProfile?.l4 || master?.l4 || atcProfile?.pharmClass
  ].filter(Boolean);
  const hierarchyText = hierarchyParts.join(' › ');

  // Hızlı Özet Şeridi (At-a-Glance Signal Strip)
  const signalPills: string[] = [];
  if (catalogDrug) {
    const tl = formatTlPrice(catalogDrug.retailPriceTl);
    if (catalogDrug.sgkReimbursed === 1) {
      signalPills.push(`<span class="px-2 py-0.5 rounded-md bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 text-[0.75rem] font-semibold">SGK Ödüyor${tl ? ` • ${tl}` : ''}</span>`);
    } else {
      signalPills.push(`<span class="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-200 border border-amber-700/60 text-[0.75rem] font-semibold">SGK Kapsam Dışı${tl ? ` • ${tl}` : ''}</span>`);
    }
    if (catalogDrug.isExtraMonitoring) {
      signalPills.push('<span class="px-2 py-0.5 rounded-md bg-violet-950/70 text-violet-200 border border-violet-600/70 text-[0.75rem] font-semibold" title="TİTCK Ek İzlemeye Tabi (▼)">▼ Ek İzlem</span>');
    }
    if (catalogDrug.isColdChain) {
      signalPills.push('<span class="px-2 py-0.5 rounded-md bg-sky-950/70 text-sky-200 border border-sky-700/60 text-[0.75rem] font-semibold">2-8°C Soğuk Zincir</span>');
    }
    if (catalogDrug.mealTiming) {
      signalPills.push(`<span class="px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-200 border border-slate-700 text-[0.75rem]">${escapeSafeHtml(catalogDrug.mealTiming)}</span>`);
    }
    if (catalogDrug.drivingRiskCode && catalogDrug.drivingRiskCode >= 3) {
      const drvCls = catalogDrug.drivingRiskCode === 4
        ? 'bg-rose-950/70 text-rose-200 border-rose-600/70 font-semibold'
        : 'bg-amber-950/60 text-amber-200 border-amber-700/60';
      signalPills.push(`<span class="px-2 py-0.5 rounded-md border text-[0.75rem] ${drvCls}">Araç: ${escapeSafeHtml(catalogDrug.drivingRisk)}</span>`);
    }
  }

  const pregCode = (catalogDrug?.pregnancyCategory || master?.pregnancyFda?.charAt(0) || mono.reproductive_safety?.titck_legacy_category || '').toUpperCase();
  if (pregCode && 'ABCDX'.includes(pregCode)) {
    const pCls = pregCode === 'X'
      ? 'bg-rose-950/80 text-rose-200 border-rose-600 font-bold'
      : pregCode === 'D'
      ? 'bg-amber-950/75 text-amber-200 border-amber-600 font-semibold'
      : pregCode === 'C'
      ? 'bg-slate-800 text-amber-200 border-slate-700'
      : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60';
    signalPills.push(`<span class="px-2 py-0.5 rounded-md border text-[0.75rem] ${pCls}">Gebelik: ${pregCode}</span>`);
  }

  const diliInfo = getDiliBadgeInfo(master?.dili || icdProfile?.dili);
  if (diliInfo) {
    signalPills.push(`<span class="px-2 py-0.5 rounded-md border text-[0.75rem] font-medium ${diliInfo.badgeClass}" title="${escapeSafeHtml(diliInfo.descTr)}">${escapeSafeHtml(diliInfo.labelTr)}</span>`);
  }

  // Kara Kutu Uyarısı (Black Box Warning) — varsa üstte tek kompakt şerit (Master yoksa ATC Bilgi Tabanı yedeği)
  const fallbackAtcBlackBox = resolveAtcFallbackBlackBox(primaryAtc, atcProfile);
  const masterBlackBox = master?.blackBox && !master.blackBox.includes('Standart kullanım önlemleri geçerlidir')
    ? master.blackBox
    : '';
  const blackBoxes =
    (mono.safety_warnings?.black_box_warnings && mono.safety_warnings.black_box_warnings.length > 0)
      ? mono.safety_warnings.black_box_warnings
      : (masterBlackBox ? [masterBlackBox] : (fallbackAtcBlackBox ? [fallbackAtcBlackBox] : []));
  const blackBoxHTML = blackBoxes.length > 0
    ? `
      <details class="bg-rose-950/70 border border-rose-600 rounded-xl overflow-hidden group" ${blackBoxes.join('').length < 280 ? 'open' : ''}>
        <summary class="px-3 py-2 cursor-pointer select-none flex items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden">
          <span class="text-[0.75rem] font-extrabold tracking-wide text-rose-200 uppercase flex items-center gap-1.5">
            <span class="px-1.5 py-0.5 rounded bg-rose-900 border border-rose-500 text-rose-100">KARA KUTU UYARISI</span>
            <span>FDA / TİTCK Kritik Güvenlik</span>
          </span>
          <span class="text-rose-300 text-xs group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div class="px-3 pb-2.5 pt-1 border-t border-rose-800/60 space-y-1 max-h-48 overflow-y-auto">
          ${blackBoxes.map(w => `<div class="text-rose-100 text-[0.8125rem] font-medium leading-relaxed">• ${escapeSafeHtml(w)}</div>`).join('')}
        </div>
      </details>
    `
    : '';

  // ============================================================================
  // SEKME 1: ÖZET & DOZ
  // ============================================================================
  const forms = mono.formulations || [];
  const formulationsHTML = forms.length > 0
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-sky-400 flex items-center justify-between">
          <span>Formülasyonlar &amp; Ölçüm Standardı (ISMP)</span>
          <span class="text-[0.75rem] font-mono text-rose-300 font-semibold">Kaşık/Ölçek Yasak</span>
        </div>
        <div class="grid grid-cols-1 gap-1.5">
          ${forms.map(f => {
            const dev = getMeasuringDeviceBadge(f.measuring_device);
            return `
              <div class="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/60">
                <div>
                  <div class="font-semibold text-white text-[0.8125rem]">${escapeSafeHtml(f.form_name)}</div>
                  ${f.concentration_display ? `<div class="text-[0.75rem] text-cyan-300 font-mono">${escapeSafeHtml(f.concentration_display)}</div>` : ''}
                  ${f.storage_condition ? `<div class="text-[0.75rem] text-slate-400 mt-0.5">Saklama: ${escapeSafeHtml(f.storage_condition)}</div>` : ''}
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-[0.75rem] px-2 py-0.5 rounded border font-semibold ${dev.badgeClass}">${escapeSafeHtml(dev.label)}</span>
                  ${f.reconstitution_stability_days ? `<span class="text-[0.75rem] px-2 py-0.5 rounded border border-amber-600/70 bg-amber-950/80 text-amber-300 font-semibold">Sulandırma sonrası: ${f.reconstitution_stability_days} gün</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `
    : '';

  // Onaylı Endikasyonlar (Türkçe ICD-10 çipleri + KÜB Türkçe Endikasyon)
  const icdInds = icdProfile?.indications || [];
  const icdIndChipsHTML = icdInds.length > 0
    ? `
      <div class="flex flex-wrap gap-1.5">
        ${icdInds.slice(0, 8).map(ind => `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-[0.75rem] text-slate-200">
            ${ind.code ? `<span class="font-mono text-sky-300">[${escapeSafeHtml(ind.code)}]</span>` : ''}
            <span>${escapeSafeHtml(ind.nameTr)}</span>
          </span>
        `).join('')}
      </div>
      ${icdInds.length > 8 ? `
        <details class="mt-1.5">
          <summary class="text-[0.75rem] text-sky-400 hover:underline cursor-pointer select-none">+${icdInds.length - 8} diğer ICD-10 endikasyonunu göster</summary>
          <div class="flex flex-wrap gap-1 mt-1.5">
            ${icdInds.slice(8).map(ind => `
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700/70 text-[0.75rem] text-slate-300">
                ${ind.code ? `<span class="font-mono text-sky-400">[${escapeSafeHtml(ind.code)}]</span>` : ''}${escapeSafeHtml(ind.nameTr)}
              </span>
            `).join('')}
          </div>
        </details>
      ` : ''}
    `
    : '';

  const kubIndHTML = kub?.ind
    ? `<div class="text-slate-200 text-[0.8125rem] leading-relaxed whitespace-pre-line ${icdInds.length > 0 ? 'mt-2 pt-2 border-t border-slate-800/80' : ''}">${escapeSafeHtml(kub.ind)}</div>`
    : (icdInds.length === 0 ? `<div class="text-slate-200 text-[0.8125rem] leading-relaxed">${escapeSafeHtml(mono.indications)}</div>` : '');

  const indicationsBlockHTML = `
    <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
      <div class="flex items-center justify-between gap-2">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-sky-400">Onaylı Endikasyonlar</div>
        ${kub?.ind ? '<span class="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">TİTCK KÜB TR</span>' : ''}
      </div>
      ${icdIndChipsHTML}
      ${kubIndHTML}
    </div>
  `;

  // Dozaj & Pozoloji (Öncelik: 1. Çekirdek Yapılandırılmış -> 2. Türkçe KÜB -> 3. FDA EN Fallback)
  const pedDosing = mono.dosing?.pediatric_dosing || [];
  const adultDosingStruct = mono.dosing?.adult_dosing;
  let dosingHTML = '';

  if (pedDosing.length > 0) {
    dosingHTML = `
      ${adultDosingStruct ? `
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
          <div class="text-[0.75rem] uppercase tracking-wider font-bold text-emerald-400 mb-0.5">Erişkin Dozu</div>
          <div class="text-slate-200 leading-relaxed font-mono text-[0.8125rem]">${escapeSafeHtml(mono.adultDose)}</div>
        </div>
      ` : ''}
      <div class="space-y-2">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-blue-400">Yapılandırılmış Pediatrik Dozlama Protokolü</div>
        <div class="grid grid-cols-1 ${pedDosing.length > 1 ? 'sm:grid-cols-2' : ''} gap-2">
          ${pedDosing.map(pd => {
            const isIBW = pd.weight_metric_in_obesity === 'IBW';
            const isAdjBW = pd.weight_metric_in_obesity === 'AdjBW';
            const weightBadge = isIBW
              ? `<span class="bg-amber-950/90 text-amber-300 border border-amber-600 px-1.5 py-0.5 rounded text-[0.75rem] font-mono font-bold">Obezite: IBW</span>`
              : isAdjBW
              ? `<span class="bg-cyan-950/90 text-cyan-300 border border-cyan-600 px-1.5 py-0.5 rounded text-[0.75rem] font-mono font-bold">Obezite: AdjBW</span>`
              : `<span class="bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded text-[0.75rem] font-mono">Total Kilo</span>`;
            return `
              <div class="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                <div class="flex items-center justify-between gap-1">
                  <span class="font-bold text-white text-[0.8125rem]">${escapeSafeHtml(pd.indication)}</span>
                  ${weightBadge}
                </div>
                <div class="text-blue-300 font-mono text-[0.8125rem] font-semibold">
                  Tek Doz: ${pd.dose_per_kg_single} mg/kg <span class="text-slate-400 font-normal">(${pd.interval_hours ? `${pd.interval_hours} saatte bir` : 'tek doz'})</span>
                </div>
                <div class="text-[0.75rem] text-slate-300 leading-relaxed font-mono">
                  Maks Günlük: ${pd.max_daily_dose_mg_per_kg} mg/kg | Tavan: ${pd.absolute_max_single_dose_mg} mg/doz (Günlük: ${pd.absolute_max_daily_dose_mg} mg)
                </div>
                <div class="text-[0.75rem] text-slate-400">Yaş/Kilo Sınırı: ≥${pd.min_age_months} ay, ≥${pd.min_weight_kg} kg</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ${kub?.poz ? renderCollapsibleBlock('Resmi TİTCK KÜB Pozoloji Metni', kub.poz, { badge: 'Türkçe KÜB' }) : ''}
    `;
  } else if (isCore) {
    dosingHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
          <div class="text-[0.75rem] uppercase tracking-wider font-bold text-emerald-400 mb-0.5">Erişkin Dozu</div>
          <div class="text-slate-200 leading-relaxed font-mono text-[0.8125rem] whitespace-pre-line">${escapeSafeHtml(mono.adultDose)}</div>
        </div>
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
          <div class="text-[0.75rem] uppercase tracking-wider font-bold text-blue-400 mb-0.5">Pediatrik Doz</div>
          <div class="text-slate-200 leading-relaxed font-mono text-[0.8125rem] whitespace-pre-line">${escapeSafeHtml(mono.pediatricDose)}</div>
        </div>
      </div>
      ${kub?.poz ? renderCollapsibleBlock('Resmi TİTCK KÜB Pozoloji Metni', kub.poz, { badge: 'Türkçe KÜB' }) : ''}
    `;
  } else if (kub?.poz) {
    // Master ilaç ve resmi Türkçe KÜB Pozoloji mevcut! İngilizce FDA duvarı yerine tertemiz Türkçe KÜB göster!
    dosingHTML = `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[0.75rem] uppercase tracking-wider font-bold text-emerald-400">Pozoloji ve Uygulama Şekli</span>
          <span class="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">Resmi TİTCK KÜB</span>
        </div>
        <div class="text-slate-200 text-[0.8125rem] leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto">${escapeSafeHtml(kub.poz)}</div>
      </div>
      ${(master?.adultDose || master?.pediatricDose) ? renderCollapsibleBlock('FDA DailyMed Dozaj Referansı (EN)', [master?.adultDose, master?.pediatricDose].filter(Boolean).join('\n\n'), { badge: 'FDA EN' }) : ''}
    `;
  } else {
    dosingHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
          <div class="flex items-center justify-between mb-0.5">
            <span class="text-[0.75rem] uppercase tracking-wider font-bold text-emerald-400">Erişkin Dozu</span>
            <span class="text-[0.6875rem] font-mono text-slate-400">FDA EN</span>
          </div>
          <div class="text-slate-200 leading-relaxed text-[0.8125rem] whitespace-pre-line max-h-52 overflow-y-auto">${escapeSafeHtml(mono.adultDose)}</div>
        </div>
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
          <div class="flex items-center justify-between mb-0.5">
            <span class="text-[0.75rem] uppercase tracking-wider font-bold text-blue-400">Pediatrik Doz</span>
            <span class="text-[0.6875rem] font-mono text-slate-400">FDA EN</span>
          </div>
          <div class="text-slate-200 leading-relaxed text-[0.8125rem] whitespace-pre-line max-h-52 overflow-y-auto">${escapeSafeHtml(mono.pediatricDose)}</div>
        </div>
      </div>
    `;
  }

  const showMaxCap = isCore && mono.maxDailyDose && !mono.maxDailyDose.includes('Resmi KÜB / prospektüs tavan dozuna bakınız');
  const maxCapHTML = showMaxCap
    ? `
      <div class="bg-amber-950/30 border border-amber-700/50 rounded-lg p-2.5">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-amber-300 mb-0.5">Maksimum Günlük Doz Sınırı (Cap)</div>
        <div class="text-amber-100 font-mono text-[0.8125rem] leading-relaxed">${escapeSafeHtml(mono.maxDailyDose)}</div>
      </div>
    `
    : '';

  // Pratik Kullanım & Alerjen / Eksipiyan Uyarıları
  const allergens = catalogDrug?.allergens || [];
  const practicalRows: string[] = [];
  if (catalogDrug?.mealTiming) {
    practicalRows.push(`<div><span class="text-slate-400">Aç / Tok:</span> <strong class="text-slate-100">${escapeSafeHtml(catalogDrug.mealTiming)}</strong></div>`);
  }
  if (catalogDrug?.drivingRisk || kub?.arc) {
    practicalRows.push(`<div><span class="text-slate-400">Araç / Makine:</span> <strong class="text-slate-100">${escapeSafeHtml(catalogDrug?.drivingRisk || kub?.arc || '')}</strong></div>`);
  }
  const storageText = kub?.raf || master?.storage || '';
  if (storageText) {
    practicalRows.push(`<div><span class="text-slate-400">Saklama:</span> <span class="text-slate-200">${escapeSafeHtml(storageText)}</span></div>`);
  }

  const practicalCardHTML = (practicalRows.length > 0 || allergens.length > 0)
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-cyan-400">Pratik Kullanım &amp; Eksipiyan Uyarıları</div>
        ${practicalRows.length > 0 ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[0.8125rem]">${practicalRows.join('')}</div>` : ''}
        ${allergens.length > 0 ? `
          <div class="${practicalRows.length > 0 ? 'pt-1.5 border-t border-slate-800/80' : ''} space-y-1">
            <div class="text-[0.75rem] text-slate-400 font-medium">Bildirilen Alerjen / Yardımcı Maddeler:</div>
            <div class="flex flex-wrap gap-1.5">
              ${allergens.map(a => {
                const isCrit = CRITICAL_ALLERGEN_SET.has(a);
                const cls = isCrit
                  ? 'bg-amber-950/60 text-amber-200 border-amber-600/70 font-semibold'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700';
                return `<span class="px-2 py-0.5 rounded-md border text-[0.75rem] ${cls}">${escapeSafeHtml(a)}</span>`;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `
    : '';

  const pearlsHTML = isCore && mono.clinicalPearls
    ? `
      <div class="bg-sky-950/30 border border-sky-800/60 rounded-lg p-2.5">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-sky-300 mb-0.5">Klinik Uygulama Notu</div>
        <div class="text-sky-100 leading-relaxed text-[0.8125rem]">${escapeSafeHtml(mono.clinicalPearls)}</div>
      </div>
    `
    : '';

  // ============================================================================
  // SEKME 2: ETKİLEŞİMLER (İlaç-İlaç, Besin-İlaç, Hastalık, Duplikasyon)
  // ============================================================================
  const foodList = master?.food || [];
  const diseaseList = master?.disease || [];
  const ddiCnt = master?.ddiCnt || [0, 0, 0];
  const ddiMajor = master?.ddiMajor || [];
  const dupGroups = master?.dupGroup || [];
  const coreInteractions = mono.safety_warnings?.critical_drug_interactions || [];

  const activeRxBannerHTML = activeRxAlerts.length > 0
    ? `
      <div class="bg-rose-950/50 border border-rose-600/80 rounded-lg p-2.5 space-y-1.5">
        <div class="text-[0.75rem] uppercase tracking-wider font-extrabold text-rose-200">
          Aktif Reçetenizle Etkileşim Tespit Edildi (${activeRxAlerts.length})
        </div>
        <div class="space-y-1">
          ${activeRxAlerts.map(a => `
            <div class="text-[0.8125rem] text-rose-100 leading-relaxed">
              • <strong class="text-white">${escapeSafeHtml(a.title)}</strong>
              <span class="ml-1 text-[0.6875rem] font-mono px-1.5 py-0.5 rounded ${a.severity === 'K' ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'}">${escapeSafeHtml(a.severityLabel)}</span>
              <div class="text-[0.75rem] text-rose-200/90 pl-2.5">${escapeSafeHtml(a.message)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  const hasAnyKpi = ddiCnt[0] > 0 || ddiCnt[1] > 0 || foodList.length > 0 || diseaseList.length > 0;
  const interactionKpiHTML = hasAnyKpi
    ? `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div class="p-2 rounded-lg border ${ddiCnt[0] > 0 ? 'bg-rose-950/35 border-rose-700/60' : 'bg-slate-900/60 border-slate-800'} text-center">
          <div class="text-base font-extrabold tabular-nums ${ddiCnt[0] > 0 ? 'text-rose-300' : 'text-slate-400'}">${ddiCnt[0]}</div>
          <div class="text-[0.6875rem] text-slate-400 uppercase tracking-wide">Major İlaç</div>
        </div>
        <div class="p-2 rounded-lg border ${ddiCnt[1] > 0 ? 'bg-amber-950/30 border-amber-700/60' : 'bg-slate-900/60 border-slate-800'} text-center">
          <div class="text-base font-extrabold tabular-nums ${ddiCnt[1] > 0 ? 'text-amber-300' : 'text-slate-400'}">${ddiCnt[1]}</div>
          <div class="text-[0.6875rem] text-slate-400 uppercase tracking-wide">Orta İlaç</div>
        </div>
        <div class="p-2 rounded-lg border ${foodList.length > 0 ? 'bg-sky-950/35 border-sky-700/60' : 'bg-slate-900/60 border-slate-800'} text-center">
          <div class="text-base font-extrabold tabular-nums ${foodList.length > 0 ? 'text-sky-300' : 'text-slate-400'}">${foodList.length}</div>
          <div class="text-[0.6875rem] text-slate-400 uppercase tracking-wide">Besin / Alkol</div>
        </div>
        <div class="p-2 rounded-lg border ${diseaseList.length > 0 ? 'bg-violet-950/35 border-violet-700/60' : 'bg-slate-900/60 border-slate-800'} text-center">
          <div class="text-base font-extrabold tabular-nums ${diseaseList.length > 0 ? 'text-violet-300' : 'text-slate-400'}">${diseaseList.length}</div>
          <div class="text-[0.6875rem] text-slate-400 uppercase tracking-wide">Hastalık Riski</div>
        </div>
      </div>
    `
    : '';

  // Besin-İlaç Etkileşim Kartları (Türkçe başlık + kısa Türkçe klinik rehber + açılır DDInter kaynağı)
  const foodCardsHTML = foodList.length > 0
    ? `
      <div class="space-y-1.5">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-sky-400">Besin &amp; Alkol Etkileşimleri (DDInter 2.0)</div>
        <div class="space-y-1.5">
          ${foodList.map(item => {
            const tr = translateFoodEntry(item.f);
            const mechTr = translateFoodMechanism(item.m);
            const lvLower = String(item.l || '').toLowerCase();
            const isMajor = lvLower === 'major';
            const isMinor = lvLower === 'minor';
            const sevBadge = isMajor
              ? '<span class="px-1.5 py-0.5 rounded text-[0.6875rem] font-bold bg-rose-950 text-rose-200 border border-rose-600/80">Major</span>'
              : isMinor
              ? '<span class="px-1.5 py-0.5 rounded text-[0.6875rem] font-medium bg-sky-950 text-sky-200 border border-sky-700/70">Hafif</span>'
              : '<span class="px-1.5 py-0.5 rounded text-[0.6875rem] font-semibold bg-amber-950 text-amber-200 border border-amber-600/80">Orta</span>';
            const cardBorder = isMajor ? 'border-rose-700/60 bg-rose-950/20' : (isMinor ? 'border-slate-700 bg-slate-900/60' : 'border-amber-700/50 bg-amber-950/15');
            const hasDetail = Boolean(item.i || item.g);

            return `
              <details class="rounded-lg border ${cardBorder} overflow-hidden group">
                <summary class="p-2.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden space-y-1">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="font-bold text-slate-100 text-[0.8125rem]">${escapeSafeHtml(tr.labelTr)}</span>
                      ${sevBadge}
                      <span class="text-[0.6875rem] text-slate-400">${escapeSafeHtml(mechTr)}</span>
                    </div>
                    ${hasDetail ? '<span class="text-slate-400 text-[0.75rem] group-open:rotate-180 transition-transform shrink-0">▾</span>' : ''}
                  </div>
                  <div class="text-[0.75rem] text-slate-200 leading-relaxed">${escapeSafeHtml(tr.shortGuidanceTr)}</div>
                </summary>
                ${hasDetail ? `
                  <div class="px-2.5 pb-2.5 pt-1.5 border-t border-slate-800/70 space-y-1 text-[0.75rem] text-slate-300 leading-relaxed">
                    <div class="text-[0.6875rem] uppercase tracking-wide text-slate-400 font-semibold">Kaynak Detayı (DDInter 2.0)</div>
                    ${item.i ? `<div><strong class="text-slate-200">Mekanizma:</strong> ${escapeSafeHtml(item.i)}</div>` : ''}
                    ${item.g ? `<div><strong class="text-slate-200">Yönetim:</strong> ${escapeSafeHtml(item.g)}</div>` : ''}
                  </div>
                ` : ''}
              </details>
            `;
          }).join('')}
        </div>
      </div>
    `
    : '';

  // Major İlaç Etkileşimleri (ilk 12 çip + mini arama kutusu + tümünü göster)
  const majorDdiHTML = ddiMajor.length > 0
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-[0.75rem] uppercase tracking-wider font-bold text-rose-300">Major Etkileşen Etken Maddeler (${ddiCnt[0] || ddiMajor.length})</div>
          ${ddiMajor.length > 8 ? `
            <input type="text" id="input-mono-ddi-filter" placeholder="Etken madde süz..." class="h-7 px-2 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 w-40 focus:border-sky-400 focus:outline-none">
          ` : ''}
        </div>
        <div id="container-mono-ddi-chips" class="flex flex-wrap gap-1.5">
          ${ddiMajor.map((agent, idx) => `
            <span class="mono-ddi-chip ${idx >= 12 ? 'hidden mono-ddi-extra' : ''} px-2 py-0.5 rounded-md bg-rose-950/45 text-rose-200 border border-rose-800/60 text-[0.75rem] font-medium" data-agent="${escapeSafeHtml(toLowerTr(agent))}">${escapeSafeHtml(agent)}</span>
          `).join('')}
        </div>
        ${ddiMajor.length > 12 ? `
          <button type="button" id="btn-mono-ddi-expand" class="btn-compact text-[0.75rem] text-sky-400 hover:text-sky-300 font-medium">
            Tümünü Göster (${ddiMajor.length}${ddiCnt[0] > ddiMajor.length ? ` / ${ddiCnt[0]}` : ''}) ▾
          </button>
        ` : ''}
      </div>
    `
    : '';

  // Çekirdek Kritik İlaç Etkileşim Kalkanı (136 çekirdek monograftan)
  const coreInteractionsHTML = coreInteractions.length > 0
    ? `
      <div class="bg-amber-950/30 border border-amber-700/60 rounded-lg p-2.5 space-y-1.5">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-amber-300">Klinik Kritik Etkileşim Kalkanı</div>
        <div class="space-y-1">
          ${coreInteractions.map(it => `
            <div class="text-[0.8125rem] text-amber-100 leading-relaxed">
              • <strong class="text-amber-200">${escapeSafeHtml(it.interacting_drug)}</strong> (${escapeSafeHtml(it.severity)}): ${escapeSafeHtml(it.clinical_management)}
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // Hastalık Etkileşimleri (DDInter)
  const diseaseCardsHTML = diseaseList.length > 0
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-violet-300">Hastalık &amp; Komorbidite Etkileşimleri (${diseaseList.length})</div>
        <div class="flex flex-wrap gap-1.5">
          ${diseaseList.slice(0, 14).map(dis => {
            const isMaj = String(dis.l || '').toLowerCase() === 'major';
            const cls = isMaj
              ? 'bg-rose-950/45 text-rose-200 border-rose-700/60 font-medium'
              : 'bg-amber-950/35 text-amber-200 border-amber-700/50';
            return `<span class="px-2 py-0.5 rounded-md border text-[0.75rem] ${cls}" title="${escapeSafeHtml(dis.d)} (${escapeSafeHtml(dis.l)})">${escapeSafeHtml(translateDiseaseName(dis.d))}</span>`;
          }).join('')}
        </div>
        ${diseaseList.length > 14 ? `
          <details class="pt-1">
            <summary class="text-[0.75rem] text-violet-300 hover:underline cursor-pointer select-none">+${diseaseList.length - 14} diğer hastalık uyarısı</summary>
            <div class="flex flex-wrap gap-1 mt-1.5">
              ${diseaseList.slice(14).map(dis => `<span class="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-[0.75rem] text-slate-300">${escapeSafeHtml(translateDiseaseName(dis.d))}</span>`).join('')}
            </div>
          </details>
        ` : ''}
      </div>
    `
    : '';

  const dupGroupHTML = dupGroups.length > 0
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center gap-1.5">
        <span class="text-[0.75rem] text-slate-400 font-semibold uppercase tracking-wide">Terapötik Duplikasyon Sınıfı:</span>
        ${dupGroups.map(g => `<span class="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-200 border border-indigo-700/60 text-[0.75rem] font-medium">${escapeSafeHtml(translateDupGroup(g))}</span>`).join('')}
      </div>
    `
    : '';

  const kubEtkHTML = kub?.etk ? renderCollapsibleBlock('Resmi TİTCK KÜB Etkileşimler (Bölüm 4.5)', kub.etk, { badge: 'Türkçe KÜB' }) : '';

  const interactionEmptyHTML = (!activeRxBannerHTML && !hasAnyKpi && !coreInteractionsHTML && !kubEtkHTML && !dupGroupHTML)
    ? `<div class="bg-slate-900/60 border border-slate-800 rounded-lg p-4 text-center text-slate-400 text-[0.8125rem]">Bu etken madde için bildirilmiş major ilaç, besin veya hastalık etkileşimi kaydı bulunmamaktadır.</div>`
    : '';

  // ============================================================================
  // SEKME 3: GÜVENLİK & ÖZEL POPÜLASYON
  // ============================================================================
  const icdContras = icdProfile?.contraindications || [];
  const contraChipsHTML = icdContras.length > 0
    ? `
      <div class="flex flex-wrap gap-1.5">
        ${icdContras.slice(0, 8).map(c => `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/50 border border-rose-700/60 text-[0.75rem] text-rose-100">
            ${c.code ? `<span class="font-mono text-rose-300">[${escapeSafeHtml(c.code)}]</span>` : ''}${escapeSafeHtml(c.nameTr)}
          </span>
        `).join('')}
      </div>
    `
    : '';

  const contraText = kub?.kon || mono.contraindications;
  const contraBlockHTML = `
    <div class="bg-rose-950/30 border border-rose-700/60 rounded-lg p-2.5 space-y-2">
      <div class="flex items-center justify-between gap-2">
        <span class="text-[0.75rem] uppercase tracking-wider font-bold text-rose-300">Kontrendikasyonlar ve Kritik Uyarılar</span>
        ${kub?.kon ? '<span class="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-200 border border-rose-800">TİTCK KÜB TR</span>' : ''}
      </div>
      ${contraChipsHTML}
      ${contraText ? `<div class="text-rose-100 leading-relaxed text-[0.8125rem] whitespace-pre-line max-h-48 overflow-y-auto">${escapeSafeHtml(contraText)}</div>` : ''}
    </div>
  `;

  // Gebelik & Emzirme (Core Trimester Bar vs Master PLLR + LactMed)
  const trimesterRisk = mono.reproductive_safety?.pregnancy_trimester_risk;
  const lactation = mono.reproductive_safety?.lactation;
  const legacyCat = mono.reproductive_safety?.titck_legacy_category;

  let reproductiveHTML = '';
  if (trimesterRisk) {
    const t1 = evaluateTrimesterRiskLevel(trimesterRisk.first_trimester);
    const t2 = evaluateTrimesterRiskLevel(trimesterRisk.second_trimester);
    const t3 = evaluateTrimesterRiskLevel(trimesterRisk.third_trimester);

    let lactVerdictBadge = '';
    if (lactation) {
      if (lactation.safety_verdict === 'COMPATIBLE') {
        lactVerdictBadge = `<span class="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full font-bold">LactMed: Uyumlu</span>`;
      } else if (lactation.safety_verdict === 'USE_WITH_CAUTION') {
        lactVerdictBadge = `<span class="bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full font-bold">LactMed: Dikkat</span>`;
      } else if (lactation.safety_verdict === 'CONTRAINDICATED') {
        lactVerdictBadge = `<span class="bg-rose-950/80 text-rose-300 border border-rose-700/60 px-2 py-0.5 rounded-full font-bold">LactMed: Kontrendike</span>`;
      }
    }
    const ridBadge = lactation && lactation.relative_infant_dose_percent !== undefined
      ? `<span class="bg-blue-950/80 text-blue-300 border border-blue-700/60 px-2 py-0.5 rounded-full font-mono font-semibold">RID: %${lactation.relative_infant_dose_percent}</span>`
      : '';
    const infantMonitoringNote = lactation?.infant_monitoring || lactation?.infant_monitoring_notes;

    reproductiveHTML = `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-1.5">
          <div class="text-[0.75rem] uppercase tracking-wider font-bold text-pink-400">Gebelik Trimester Durum Çubuğu (FDA PLLR)</div>
          ${legacyCat ? `<span class="text-[0.75rem] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">TİTCK: ${escapeSafeHtml(legacyCat)}</span>` : ''}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div class="p-2 rounded-lg border ${t1.boxClass} space-y-1">
            <div class="flex items-center justify-between"><span class="font-bold text-[0.75rem]">1. Trimester (T1)</span><span class="text-[0.6875rem] font-extrabold px-1.5 py-0.5 rounded border ${t1.badgeClass}">${t1.label}</span></div>
            <div class="text-[0.75rem] leading-relaxed">${escapeSafeHtml(trimesterRisk.first_trimester)}</div>
          </div>
          <div class="p-2 rounded-lg border ${t2.boxClass} space-y-1">
            <div class="flex items-center justify-between"><span class="font-bold text-[0.75rem]">2. Trimester (T2)</span><span class="text-[0.6875rem] font-extrabold px-1.5 py-0.5 rounded border ${t2.badgeClass}">${t2.label}</span></div>
            <div class="text-[0.75rem] leading-relaxed">${escapeSafeHtml(trimesterRisk.second_trimester)}</div>
          </div>
          <div class="p-2 rounded-lg border ${t3.boxClass} space-y-1">
            <div class="flex items-center justify-between"><span class="font-bold text-[0.75rem]">3. Trimester (T3)</span><span class="text-[0.6875rem] font-extrabold px-1.5 py-0.5 rounded border ${t3.badgeClass}">${t3.label}</span></div>
            <div class="text-[0.75rem] leading-relaxed">${escapeSafeHtml(trimesterRisk.third_trimester)}</div>
          </div>
        </div>
        ${lactation ? `
          <div class="bg-slate-800/40 border border-slate-700/60 rounded-lg p-2 space-y-1">
            <div class="flex flex-wrap items-center justify-between gap-1.5">
              <span class="text-[0.75rem] uppercase font-bold text-sky-300">Laktasyon &amp; LactMed</span>
              <div class="flex flex-wrap items-center gap-1.5 text-[0.75rem]">${lactVerdictBadge} ${ridBadge}</div>
            </div>
            <div class="text-[0.8125rem] text-slate-200 leading-relaxed">${escapeSafeHtml(lactation.lactmed_record_summary)}</div>
            ${infantMonitoringNote ? `<div class="text-[0.75rem] text-amber-200"><strong>İnfant İzlem:</strong> ${escapeSafeHtml(infantMonitoringNote)}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  } else {
    const lactMedUrl = master?.lactmed && /^https?:\/\//i.test(master.lactmed) ? master.lactmed : '';
    reproductiveHTML = `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-[0.75rem] uppercase tracking-wider font-bold text-pink-400">Gebelik ve Emzirme Güvenliği</div>
          ${lactMedUrl ? `<a href="${escapeSafeHtml(lactMedUrl)}" target="_blank" rel="noopener noreferrer" class="text-[0.75rem] text-sky-400 hover:underline font-medium">NCBI LactMed Monografı ↗</a>` : ''}
        </div>
        ${master?.pregnancyFda ? `<div class="text-[0.8125rem] text-slate-100 font-semibold">${escapeSafeHtml(master.pregnancyFda)}</div>` : ''}
        ${master?.pregnancyPllr ? renderCollapsibleBlock('FDA Gebelik Risk Özeti (PLLR)', master.pregnancyPllr, { badge: 'FDA EN' }) : ''}
        ${master?.lactation ? renderCollapsibleBlock('Laktasyon & Anne Sütü Özeti', master.lactation, { badge: 'LactMed / FDA' }) : ''}
        ${(!master?.pregnancyPllr && !master?.lactation) ? `<div class="text-[0.8125rem] text-slate-200 leading-relaxed whitespace-pre-line">${escapeSafeHtml(mono.pregnancyLactation)}</div>` : ''}
      </div>
    `;
  }

  // Organ Yetmezliği (Renal / Hepatik Yapılandırılmış Tablo veya Özet Metin) + LiverTox DILI
  const renalAdjustments = mono.organ_impairment?.renal_adjustments || [];
  const hepaticAdjustments = mono.organ_impairment?.hepatic_adjustments || [];
  const hasStructuredOrganTables = renalAdjustments.length > 0 || hepaticAdjustments.length > 0;

  const renalCardHTML = renalAdjustments.length > 0
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[0.75rem] uppercase tracking-wider font-bold text-cyan-400">Renal Doz Uyarlaması (eGFR / CrCl)</span>
          <span class="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">Yapılandırılmış Tablo</span>
        </div>
        <div class="overflow-x-auto rounded-md border border-slate-800">
          <table class="w-full text-left border-collapse text-[0.75rem]" data-organ-table="renal">
            <thead>
              <tr class="bg-slate-950/70 text-slate-400 uppercase text-[0.6875rem] tracking-wide border-b border-slate-800">
                <th class="px-2.5 py-1.5 font-semibold whitespace-nowrap">eGFR / CrCl</th>
                <th class="px-2.5 py-1.5 font-semibold whitespace-nowrap">Eylem</th>
                <th class="px-2.5 py-1.5 font-semibold">Doz Uyarlama Önerisi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/70">
              ${renalAdjustments.map(item => {
                const badge = getRenalActionBadge(item.action_type);
                const rangeLabel = formatEgfrRangeLabel(item.egfr_min, item.egfr_max);
                return `
                  <tr class="hover:bg-slate-800/30">
                    <td class="px-2.5 py-1.5 font-mono text-cyan-200 whitespace-nowrap align-top">${escapeSafeHtml(rangeLabel)}</td>
                    <td class="px-2.5 py-1.5 whitespace-nowrap align-top">
                      <span class="inline-block px-1.5 py-0.5 rounded border text-[0.6875rem] ${badge.cls}">${escapeSafeHtml(badge.label)}</span>
                    </td>
                    <td class="px-2.5 py-1.5 text-slate-200 leading-relaxed align-top">${escapeSafeHtml(item.adjustment_instruction)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${mono.renalAdjustment ? `<div class="text-[0.75rem] text-slate-300 leading-relaxed whitespace-pre-line pt-1 border-t border-slate-800/70"><span class="text-slate-400 font-semibold">Klinik Özet:</span> ${escapeSafeHtml(mono.renalAdjustment)}</div>` : ''}
      </div>
    `
    : `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-cyan-400 mb-0.5">Renal Doz Uyarlaması (eGFR)</div>
        <div class="text-slate-200 leading-relaxed text-[0.8125rem] whitespace-pre-line max-h-44 overflow-y-auto">${escapeSafeHtml(mono.renalAdjustment)}</div>
      </div>
    `;

  const hepaticCardHTML = hepaticAdjustments.length > 0
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[0.75rem] uppercase tracking-wider font-bold text-purple-400">Karaciğer Yetmezliği (Child-Pugh)</span>
          <span class="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-800/60">Yapılandırılmış Tablo</span>
        </div>
        <div class="overflow-x-auto rounded-md border border-slate-800">
          <table class="w-full text-left border-collapse text-[0.75rem]" data-organ-table="hepatic">
            <thead>
              <tr class="bg-slate-950/70 text-slate-400 uppercase text-[0.6875rem] tracking-wide border-b border-slate-800">
                <th class="px-2.5 py-1.5 font-semibold whitespace-nowrap">Child-Pugh Sınıfı</th>
                <th class="px-2.5 py-1.5 font-semibold">Doz / Klinik Öneri</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/70">
              ${hepaticAdjustments.map(item => {
                const badge = getChildPughBadge(item.child_pugh_class);
                return `
                  <tr class="hover:bg-slate-800/30">
                    <td class="px-2.5 py-1.5 whitespace-nowrap align-top">
                      <span class="inline-block px-1.5 py-0.5 rounded border text-[0.6875rem] ${badge.cls}">${escapeSafeHtml(badge.label)}</span>
                    </td>
                    <td class="px-2.5 py-1.5 text-slate-200 leading-relaxed align-top">${escapeSafeHtml(item.action_instruction)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${mono.hepaticAdjustment ? `<div class="text-[0.75rem] text-slate-300 leading-relaxed whitespace-pre-line pt-1 border-t border-slate-800/70"><span class="text-slate-400 font-semibold">Klinik Özet:</span> ${escapeSafeHtml(mono.hepaticAdjustment)}</div>` : ''}
      </div>
    `
    : `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-purple-400 mb-0.5">Karaciğer Yetmezliği</div>
        <div class="text-slate-200 leading-relaxed text-[0.8125rem] whitespace-pre-line max-h-44 overflow-y-auto">${escapeSafeHtml(mono.hepaticAdjustment)}</div>
      </div>
    `;

  const organImpairmentHTML = `
    <div class="grid grid-cols-1 ${hasStructuredOrganTables ? '' : 'sm:grid-cols-2'} gap-2.5">
      ${renalCardHTML}
      ${hepaticCardHTML}
    </div>
  `;

  const diliCardHTML = diliInfo
    ? `
      <div class="rounded-lg border ${diliInfo.boxClass} p-2.5 space-y-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-[0.75rem] uppercase tracking-wider font-bold text-slate-200">Hepatotoksisite (LiverTox DILI)</span>
            <span class="px-2 py-0.5 rounded border text-[0.75rem] font-bold ${diliInfo.badgeClass}">${escapeSafeHtml(diliInfo.labelTr)}</span>
          </div>
          ${master?.diliUrl && /^https?:\/\//i.test(master.diliUrl) ? `<a href="${escapeSafeHtml(master.diliUrl)}" target="_blank" rel="noopener noreferrer" class="text-[0.75rem] text-sky-400 hover:underline">LiverTox ↗</a>` : ''}
        </div>
        <div class="text-[0.8125rem] text-slate-200 leading-relaxed">${escapeSafeHtml(diliInfo.descTr)}</div>
        ${master?.diliSum ? renderCollapsibleBlock('LiverTox Klinik Özeti (EN)', master.diliSum, { badge: 'NIH LiverTox' }) : ''}
      </div>
    `
    : '';

  const neonatalNote = mono.safety_warnings?.neonatal_specific_notes;
  const neonatalHTML = neonatalNote
    ? `
      <div class="bg-indigo-950/40 border border-indigo-700/60 rounded-lg p-2.5 space-y-1">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-indigo-300">Yenidoğan &amp; Prematüre Güvenlik Kuralları</div>
        <div class="text-indigo-100 text-[0.8125rem] leading-relaxed font-medium">${escapeSafeHtml(neonatalNote)}</div>
      </div>
    `
    : '';

  const kubSideEffectsHTML = kub?.yan ? renderCollapsibleBlock('Resmi TİTCK KÜB Yan Etkiler (Bölüm 4.8)', kub.yan, { badge: 'Türkçe KÜB' }) : '';
  const kubOverdoseHTML = kub?.ovr ? renderCollapsibleBlock('Doz Aşımı ve Antidot Yönetimi (Bölüm 4.9)', kub.ovr, { badge: 'Türkçe KÜB', tone: 'amber' }) : '';

  // ============================================================================
  // SEKME 4: FARMAKOLOJİ & KÜB
  // ============================================================================
  const cypList = master?.cyp || icdProfile?.cyp || [];
  const cypHTML = cypList.length > 0
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-amber-300">Metabolizma Enzimleri (CYP450)</div>
        <div class="flex flex-wrap gap-1.5">
          ${cypList.map(e => `<span class="px-2 py-0.5 rounded-md bg-amber-950/50 text-amber-200 border border-amber-700/60 text-[0.75rem] font-mono font-semibold">${escapeSafeHtml(e)}</span>`).join('')}
        </div>
      </div>
    `
    : '';

  const effectiveMoa = master?.moa || atcProfile?.mechanismOfAction || '';
  const moaSourceBadge = !master?.moa && atcProfile?.mechanismOfAction
    ? '<span class="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">ATC Bilgi Tabanı</span>'
    : '';
  const moaHTML = effectiveMoa
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-1">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[0.75rem] uppercase tracking-wider font-bold text-sky-400">Etki Mekanizması</span>
          ${moaSourceBadge}
        </div>
        <div class="text-slate-200 text-[0.8125rem] leading-relaxed">${escapeSafeHtml(effectiveMoa)}</div>
      </div>
    `
    : '';

  const effectiveHalfLife = master?.halfLife || icdProfile?.t12 || atcProfile?.halfLife || '';
  const effectiveDdd = master?.ddd || icdProfile?.ddd || atcProfile?.whoDdd || '';
  const effectiveMetabolism = master?.metabolism || atcProfile?.metabolismExcretion || '';

  const pkItems: Array<{ label: string; val: string }> = [];
  if (effectiveHalfLife) pkItems.push({ label: 'Yarı Ömür (t½)', val: effectiveHalfLife });
  if (effectiveDdd) pkItems.push({ label: 'WHO Tanımlı Günlük Doz (DDD)', val: `${effectiveDdd}${master?.route ? ` (${master.route})` : ''}` });
  if (master?.proteinBinding) pkItems.push({ label: 'Protein Bağlanma', val: master.proteinBinding });
  if (effectiveMetabolism) pkItems.push({ label: 'Metabolizma & Atılım', val: effectiveMetabolism });

  const pkGridHTML = pkItems.length > 0
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-cyan-400">Farmakokinetik Profil</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${pkItems.map(p => `
            <div class="p-2 rounded bg-slate-950/50 border border-slate-800/80">
              <div class="text-[0.6875rem] uppercase tracking-wide text-slate-400 font-semibold">${escapeSafeHtml(p.label)}</div>
              <div class="text-[0.8125rem] text-slate-200 leading-relaxed mt-0.5">${escapeSafeHtml(p.val)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  const ivHTML = kub?.iv && !/^bildirilmemiştir\.?$/i.test(kub.iv.trim())
    ? renderCollapsibleBlock('IV Geçimsizlikler & Uygulama Notları (KÜB 6.2)', kub.iv, { badge: 'Türkçe KÜB', tone: 'sky' })
    : '';

  const kubPkHTML = kub?.pk ? renderCollapsibleBlock('Detaylı Türkçe KÜB Farmakokinetik (Bölüm 5.2)', kub.pk, { badge: 'Türkçe KÜB' }) : '';
  const kubExcHTML = kub?.exc ? renderCollapsibleBlock('Yardımcı Maddeler Tam Listesi (KÜB 6.1)', kub.exc, { badge: 'Türkçe KÜB' }) : '';

  const molFields: Array<{ k: string; v: string }> = [];
  if (master?.formula || icdProfile?.formula) molFields.push({ k: 'Formül', v: master?.formula || icdProfile?.formula || '' });
  if (master?.mw) molFields.push({ k: 'Mol. Ağırlığı', v: `${master.mw} g/mol` });
  if (master?.pubchem) molFields.push({ k: 'PubChem CID', v: master.pubchem });
  if (master?.rxnorm) molFields.push({ k: 'RxCUI', v: master.rxnorm });
  if (master?.chembl) molFields.push({ k: 'ChEMBL', v: master.chembl });
  if (master?.phase) molFields.push({ k: 'Klinik Faz', v: master.phase });

  const molCardHTML = molFields.length > 0
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
        <div class="text-[0.75rem] uppercase tracking-wider font-bold text-slate-400">Moleküler &amp; Ontoloji Kimliği</div>
        <div class="flex flex-wrap gap-1.5 font-mono text-[0.75rem]">
          ${molFields.map(f => `<span class="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/80 text-slate-300"><span class="text-slate-400">${escapeSafeHtml(f.k)}:</span> ${escapeSafeHtml(f.v)}</span>`).join('')}
        </div>
      </div>
    `
    : '';

  const pharmaEmptyHTML = (!moaHTML && !cypHTML && !pkGridHTML && !ivHTML && !kubPkHTML && !molCardHTML && !kubExcHTML)
    ? `<div class="bg-slate-900/60 border border-slate-800 rounded-lg p-4 text-center text-slate-400 text-[0.8125rem]">Bu ATC kodu için ek farmakoloji / moleküler detay kaydı bulunmamaktadır.</div>`
    : '';

  // ============================================================================
  // SEKME 5: SGK, FİYAT & RUHSAT
  // ============================================================================
  const tlPriceStr = formatTlPrice(catalogDrug?.retailPriceTl);
  const eurPriceStr = typeof catalogDrug?.referencePriceEur === 'number' && catalogDrug.referencePriceEur > 0
    ? `${catalogDrug.referencePriceEur.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
    : '';
  const brandsList = (mono.brandExamples || master?.brands || []).slice(0, 8);

  const sgkDateBubbleHTML = renderPriceDateBubbleTriggerHTML({
    context: catalogDrug?.retailPriceTl ? 'drug' : 'sgk',
    labelPrefix: '',
    brand: displayBrand || catalogDrug?.brand,
    priceLabel: tlPriceStr,
    priceDate: catalogDrug?.priceDate,
    compact: true
  });

  const sgkTabHTML = `
    <div class="space-y-2.5">
      ${catalogDrug ? `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <div class="text-[0.75rem] uppercase tracking-wider font-bold text-emerald-400">Fiyat &amp; Geri Ödeme</div>
              ${sgkDateBubbleHTML}
            </div>
            <div class="space-y-1 text-[0.8125rem]">
              <div class="flex justify-between gap-2"><span class="text-slate-400">SGK Durumu:</span><strong class="${catalogDrug.sgkReimbursed === 1 ? 'text-emerald-300' : 'text-amber-300'}">${catalogDrug.sgkReimbursed === 1 ? 'Kapsamda (Ödeniyor)' : 'Kapsam Dışı'}</strong></div>
              <div class="flex justify-between gap-2"><span class="text-slate-400">Perakende Satış (TL):</span><strong class="text-white tabular-nums">${tlPriceStr || 'Belirtilmemiş'}</strong></div>
              ${catalogDrug.priceDate ? `<div class="flex justify-between gap-2"><span class="text-slate-400">Fiyat Tarife Tarihi:</span><span class="text-slate-300 tabular-nums">${escapeSafeHtml(formatTurkishDate(catalogDrug.priceDate))}</span></div>` : ''}
              ${eurPriceStr ? `<div class="flex justify-between gap-2"><span class="text-slate-400">Referans Fiyat (GKF):</span><span class="text-slate-200 tabular-nums">${eurPriceStr}</span></div>` : ''}
              ${catalogDrug.sgkDiscount ? `<div class="flex justify-between gap-2"><span class="text-slate-400">Kamu İskontosu:</span><span class="text-emerald-300 font-mono">${escapeSafeHtml(catalogDrug.sgkDiscount)}</span></div>` : ''}
              ${catalogDrug.sgkTieredDiscount ? `<div class="flex justify-between gap-2"><span class="text-slate-400">4 Kademeli KKİ:</span><span class="text-slate-200 font-mono">%${escapeSafeHtml(catalogDrug.sgkTieredDiscount.replace(/%/g, '').replace(/\s*\/\s*/g, ' / %'))}</span></div>` : ''}
              ${catalogDrug.sgkPriceProtected ? `<div class="flex justify-between gap-2"><span class="text-slate-400">Fiyat Koruma:</span><span class="text-sky-300">Fiyat Korumalı</span></div>` : ''}
            </div>
          </div>
          <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
            <div class="text-[0.75rem] uppercase tracking-wider font-bold text-sky-400">Müstahzar &amp; Sicil</div>
            <div class="space-y-1 text-[0.8125rem]">
              ${catalogDrug.barcode ? `<div class="flex justify-between gap-2"><span class="text-slate-400">Barkod (GTIN):</span><span class="text-slate-200 font-mono">${escapeSafeHtml(catalogDrug.barcode)}</span></div>` : ''}
              ${catalogDrug.sgkKamuNo ? `<div class="flex justify-between gap-2"><span class="text-slate-400">SGK Kamu No:</span><span class="text-slate-200 font-mono">${escapeSafeHtml(catalogDrug.sgkKamuNo)}</span></div>` : ''}
              ${catalogDrug.esdegerGroup ? `
                <div class="flex justify-between items-center gap-2">
                  <span class="text-slate-400">SGK Eşdeğer Grubu:</span>
                  <button type="button" class="btn-mono-open-equivalents btn-compact px-2 py-0.5 rounded bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/70 font-mono text-[0.75rem] font-semibold" data-esdeger="${escapeSafeHtml(catalogDrug.esdegerGroup)}">${escapeSafeHtml(catalogDrug.esdegerGroup)} — Muadilleri Gör</button>
                </div>
              ` : ''}
              <div class="flex justify-between gap-2"><span class="text-slate-400">Reçete Türü:</span><span class="text-slate-200">${escapeSafeHtml(catalogDrug.prescriptionType)}</span></div>
              <div class="flex justify-between gap-2"><span class="text-slate-400">Liste Durumu:</span><span class="${catalogDrug.status === 'Aktif' ? 'text-emerald-300' : 'text-amber-300'}">${escapeSafeHtml(catalogDrug.status)}</span></div>
              ${catalogDrug.licenseSuspension ? `<div class="flex justify-between gap-2"><span class="text-slate-400">Ruhsat Askı:</span><span class="text-rose-300 font-semibold">${escapeSafeHtml(catalogDrug.licenseSuspension)}</span></div>` : ''}
            </div>
          </div>
        </div>
        ${catalogDrug.company ? `<div class="text-[0.75rem] text-slate-400 px-1">Ruhsat Sahibi Firma: <span class="text-slate-200">${escapeSafeHtml(catalogDrug.company)}</span></div>` : ''}
      ` : ''}

      ${brandsList.length > 0 ? `
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
          <div class="text-[0.75rem] uppercase tracking-wider font-bold text-slate-400">Aynı ATC Grubundaki Örnek Müstahzarlar (${escapeSafeHtml(primaryAtc)})</div>
          <div class="flex flex-wrap gap-1.5">
            ${brandsList.map(b => `<span class="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/70 text-[0.75rem] text-slate-200">${escapeSafeHtml(b)}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${!catalogDrug && brandsList.length === 0 ? `
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-4 text-center text-slate-400 text-[0.8125rem]">Bu etken madde için eşleşen ticari müstahzar veya SGK fiyat kaydı bulunamadı.</div>
      ` : ''}
    </div>
  `;

  // Sekme rozet sayaçları
  const interCountBadge = activeRxAlerts.length > 0
    ? `<span class="ml-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[0.625rem] font-bold">${activeRxAlerts.length}!</span>`
    : (ddiCnt[0] > 0 || foodList.length > 0)
    ? `<span class="ml-1 px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200 text-[0.625rem] font-mono">${ddiCnt[0] + foodList.length}</span>`
    : '';

  const kubSourceNote = kub?.src
    ? ` • KÜB Referansı: ${escapeSafeHtml(kub.src)}`
    : '';

  return `
    <div class="space-y-3 text-xs" data-monograph-root="v2">
      <!-- Sabit Üst Özet Kartı -->
      <div class="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 space-y-1.5">
        ${displayBrand ? `<div class="text-[0.8125rem] text-emerald-300 font-semibold">${escapeSafeHtml(displayBrand)}</div>` : ''}
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="min-w-0">
            <h4 class="text-sm sm:text-base font-extrabold text-white leading-snug">${escapeSafeHtml(displayGenericTr)}</h4>
            ${displayGenericEn && toLowerTr(displayGenericEn) !== toLowerTr(displayGenericTr) ? `<div class="text-[0.75rem] text-slate-400 font-mono">${escapeSafeHtml(displayGenericEn)} • ATC: ${escapeSafeHtml(atcList.join(', ') || '-')}</div>` : `<div class="text-[0.75rem] text-slate-400 font-mono">ATC: ${escapeSafeHtml(atcList.join(', ') || '-')}</div>`}
          </div>
          <span class="text-[0.6875rem] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full shrink-0">${isCore ? 'Çekirdek Monograf' : (kub ? 'TİTCK KÜB + Master' : 'Klinik Master')}</span>
        </div>
        ${hierarchyText ? `<div class="text-[0.75rem] text-cyan-300/90 font-medium">${escapeSafeHtml(hierarchyText)}</div>` : ''}
        ${signalPills.length > 0 ? `<div class="flex flex-wrap items-center gap-1.5 pt-1">${signalPills.join('')}</div>` : ''}
      </div>

      ${blackBoxHTML}

      <!-- 5 Temiz Sekme Çubuğu -->
      <div class="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-800 pb-1.5" role="tablist" aria-label="İlaç Monograf Sekmeleri">
        <button type="button" role="tab" aria-selected="true" data-mono-tab="ozet" class="mono-tab-btn btn-compact shrink-0 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-semibold border transition-colors bg-sky-950/80 text-sky-200 border-sky-500/70">Özet &amp; Doz</button>
        <button type="button" role="tab" aria-selected="false" data-mono-tab="etkilesim" class="mono-tab-btn btn-compact shrink-0 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-medium border transition-colors bg-slate-800/70 text-slate-300 border-slate-700/80 hover:text-white">Etkileşimler${interCountBadge}</button>
        <button type="button" role="tab" aria-selected="false" data-mono-tab="guvenlik" class="mono-tab-btn btn-compact shrink-0 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-medium border transition-colors bg-slate-800/70 text-slate-300 border-slate-700/80 hover:text-white">Güvenlik</button>
        <button type="button" role="tab" aria-selected="false" data-mono-tab="farmakoloji" class="mono-tab-btn btn-compact shrink-0 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-medium border transition-colors bg-slate-800/70 text-slate-300 border-slate-700/80 hover:text-white">Farmakoloji</button>
        <button type="button" role="tab" aria-selected="false" data-mono-tab="sgk" class="mono-tab-btn btn-compact shrink-0 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-medium border transition-colors bg-slate-800/70 text-slate-300 border-slate-700/80 hover:text-white">SGK &amp; Fiyat</button>
      </div>

      <!-- Panel 1: Özet & Doz -->
      <div class="mono-tab-panel space-y-2.5" data-mono-panel="ozet">
        ${formulationsHTML}
        ${indicationsBlockHTML}
        ${dosingHTML}
        ${maxCapHTML}
        ${practicalCardHTML}
        ${pearlsHTML}
      </div>

      <!-- Panel 2: Etkileşimler -->
      <div class="mono-tab-panel hidden space-y-2.5" data-mono-panel="etkilesim">
        ${activeRxBannerHTML}
        ${interactionKpiHTML}
        ${foodCardsHTML}
        ${coreInteractionsHTML}
        ${majorDdiHTML}
        ${diseaseCardsHTML}
        ${dupGroupHTML}
        ${kubEtkHTML}
        ${interactionEmptyHTML}
      </div>

      <!-- Panel 3: Güvenlik & Özel Popülasyon -->
      <div class="mono-tab-panel hidden space-y-2.5" data-mono-panel="guvenlik">
        ${contraBlockHTML}
        ${reproductiveHTML}
        ${organImpairmentHTML}
        ${diliCardHTML}
        ${neonatalHTML}
        ${kubSideEffectsHTML}
        ${kubOverdoseHTML}
      </div>

      <!-- Panel 4: Farmakoloji & KÜB -->
      <div class="mono-tab-panel hidden space-y-2.5" data-mono-panel="farmakoloji">
        ${moaHTML}
        ${cypHTML}
        ${pkGridHTML}
        ${ivHTML}
        ${kubPkHTML}
        ${molCardHTML}
        ${kubExcHTML}
        ${pharmaEmptyHTML}
      </div>

      <!-- Panel 5: SGK, Fiyat & Ruhsat -->
      <div class="mono-tab-panel hidden space-y-2.5" data-mono-panel="sgk">
        ${sgkTabHTML}
      </div>

      <!-- Sade Kaynak Dipnotu -->
      <div class="flex flex-wrap items-center justify-between gap-1 text-[0.6875rem] text-slate-500 font-mono px-1 pt-1 border-t border-slate-800/60">
        <div>Kaynak: TİTCK KÜB/SKRS • SGK EK-4/A • DDInter 2.0 • LiverTox • LactMed${kubSourceNote}</div>
      </div>
    </div>
  `;
}
