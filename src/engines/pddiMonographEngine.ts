/**
 * W3C PDDI-CDS UYUMLU KANITLI TÜRKÇE ETKİLEŞİM MONOGRAF MOTORU (FAZ 3)
 *
 * Temiz-oda (Clean-Room) resmi düzenleyici kaynaklardan (TİTCK KÜB 4.2-4.5/5.2,
 * OpenFDA/DailyMed SPL Sec. 4/5/7/12.3, ANSM Thésaurus 15.09.2023 arşivi,
 * FDA Clinical DDI CYP/Transporter Table, ONC High-Priority 15) üretilen
 * kanıtlı, birebir kaynak alıntılı (source_quote_verbatim) ve rota-duyarlı
 * Türkçe monografları O(1) hızda sorgular.
 *
 * Lisans: Özgün Türkçe klinik özet metinleri CC BY-NC-SA 4.0 altındadır.
 */

import {
  inferDrugRoute,
  isLocalNonSystemicRoute,
  isOralOrEnteralRoute,
  type DrugRouteCode
} from './drugRouteEngine';
import {
  normalizeSourceType,
  UNKNOWN_EPIDEMIOLOGY_SENTINEL,
  type ActionTier,
  type CanonicalSourceType,
  type ClassExtrapolationPolicy,
  type CompatSourceType,
  type InteractionDirectionality,
  type LegacyEvidenceLevel,
  type LiverpoolGradeLevel,
  type ReviewStatus
} from '../schemas/pddiMonographSchema';

export type UnifiedRiskTier = ActionTier;
export type UnifiedEvidenceLevel = LegacyEvidenceLevel;

export interface PddiSourceAssertion {
  source_id: string;
  source_type: CompatSourceType;
  section: string;
  original_rating: string;
  version_date: string;
  source_quote_verbatim: string;
  /** Kanonik W3C/DRIVE alan eşlemeleri */
  identifier?: string;
  effective_date?: string;
  source_url?: string;
}

export interface PddiEvidenceProvenanceItem {
  source_id: string;
  source_type: CanonicalSourceType;
  identifier: string;
  effective_date: string;
  section: string;
  original_rating: string;
  source_quote_verbatim: string;
  source_url?: string;
}

export interface PddiMonitoringParameter {
  parameter_tr: string;
  loinc_code: string | null;
  ucum_unit?: string | null;
  critical_threshold: string;
  timing_tr: string;
  device_mapping?: string;
}

export interface PddiOverrideReason {
  code: string;
  display: string;
}

export interface PddiReviewGovernance {
  review_status: ReviewStatus;
  independent_pharmacologist_signed: boolean;
  independent_pharmacist_signed: boolean;
}

export interface PddiMonographRecord {
  schema_version: string;
  monograph_id: string;
  canonical_pair_key: string;
  atc_a: string;
  atc_b: string;
  drug_a_tr: string;
  drug_b_tr: string;
  drug_a_en: string;
  drug_b_en: string;
  rxcui_a?: string;
  rxcui_b?: string;
  unified_risk_tier: UnifiedRiskTier;
  default_action_tier: UnifiedRiskTier;
  liverpool_grade_level: LiverpoolGradeLevel;
  dips_score?: number | null;
  directionality: InteractionDirectionality;
  mirror_indexed: boolean;
  class_extrapolation_policy: ClassExtrapolationPolicy;
  included_routes: string[];
  operational_statement_tr: string;
  primary_directive_tr: string;
  summary: string;
  override_reasons: PddiOverrideReason[];
  frequency_of_exposure: string;
  frequency_of_harm: string;
  seriousness: 'life_threatening' | 'hospitalization_or_major' | 'moderate_clinical' | 'minor';
  evidence_level: UnifiedEvidenceLevel;
  clinical_consequences_tr: string[];
  interaction_category: string[];
  mechanism_tr: string;
  clinician_narrative_tr: string;
  recommended_action_tr: string;
  alternative_tr?: string;
  monitoring_parameters: PddiMonitoringParameter[];
  route_scope: 'SYSTEMIC' | 'ORAL_GI_ONLY' | 'NON_ORAL_EXCEPTION';
  patient_context_escalators?: string[];
  discordance_flag: boolean;
  reconciliation_tier: 1 | 2 | 3;
  source_assertions: PddiSourceAssertion[];
  evidence_and_provenance: PddiEvidenceProvenanceItem[];
  review_governance: PddiReviewGovernance;
  authored_text_license: 'CC-BY-NC-SA-4.0';
  last_clinical_review_date: string;
}

export interface PddiDomainTemplate {
  categories: string[];
  consequences: string[];
  mechanism: string;
  action: string;
  alternative: string;
  monitoring: PddiMonitoringParameter[];
  escalators: string[];
  route_scope: 'SYSTEMIC' | 'ORAL_GI_ONLY' | 'NON_ORAL_EXCEPTION';
  class_extrapolation_policy?: ClassExtrapolationPolicy;
  directionality?: InteractionDirectionality;
  included_routes?: string[];
  override_reasons?: PddiOverrideReason[];
}

export interface CompactPddiMonographRecord {
  id: string;
  k: string;
  aa: string;
  ab: string;
  atr: string;
  btr: string;
  aen: string;
  ben: string;
  ra?: string;
  rb?: string;
  t: UnifiedRiskTier;
  ev: UnifiedEvidenceLevel;
  /** Ortogonal DRIVE / Liverpool GRADE kanıt düzeyi */
  lg?: LiverpoolGradeLevel;
  /** Olgu raporlarına dayanan kayıtlarda 10 maddelik DIPS skoru */
  dips?: number;
  /** Doğrulanmış epidemiyolojik zarar sıklığı / NNH (yoksa UNKNOWN_EPIDEMIOLOGY_SENTINEL) */
  harm?: string;
  dom: string;
  pb?: 1;
  dc?: 1;
  rt: 1 | 2 | 3;
  sa: Array<[string, CompatSourceType, string, string, string, string]>;
}

export interface PddiMonographBundle {
  schema_version: string;
  generated_at: string;
  license: string;
  total_monographs: number;
  sources_summary: Record<string, { count: number; snapshot_date: string; note?: string }>;
  templates?: Record<string, PddiDomainTemplate>;
  compact_monographs?: CompactPddiMonographRecord[];
  monographs: PddiMonographRecord[];
}

export interface PddiMonographMatch {
  monograph: PddiMonographRecord;
  drugABrand: string;
  drugBBrand: string;
  atcA: string;
  atcB: string;
  escalatedTier: UnifiedRiskTier;
  escalationNotes: string[];
}

let cachedBundle: PddiMonographBundle | null = null;
let loadPromise: Promise<PddiMonographBundle | null> | null = null;
const byAtcPair = new Map<string, PddiMonographRecord>();
const byInnPair = new Map<string, PddiMonographRecord>();

function canonicalPair(a: string, b: string): string {
  const x = String(a || '').trim().toUpperCase();
  const y = String(b || '').trim().toUpperCase();
  return x < y ? `${x}::${y}` : `${y}::${x}`;
}

function canonicalInnPair(a: string, b: string): string {
  const x = String(a || '').trim().toLowerCase();
  const y = String(b || '').trim().toLowerCase();
  return x < y ? `${x}::${y}` : `${y}::${x}`;
}

export function isPddiMonographsReady(): boolean {
  return cachedBundle !== null;
}

export function getPddiMonographStats(): {
  ready: boolean;
  totalMonographs: number;
  tierCounts: Record<UnifiedRiskTier, number>;
  generatedAt: string;
} {
  const tierCounts: Record<UnifiedRiskTier, number> = { X: 0, D: 0, C: 0, B: 0, A: 0 };
  if (!cachedBundle) {
    return { ready: false, totalMonographs: 0, tierCounts, generatedAt: '' };
  }
  for (const m of cachedBundle.monographs) {
    tierCounts[m.unified_risk_tier] = (tierCounts[m.unified_risk_tier] || 0) + 1;
  }
  return {
    ready: true,
    totalMonographs: cachedBundle.monographs.length,
    tierCounts,
    generatedAt: cachedBundle.generated_at
  };
}

const DEFAULT_OVERRIDE_REASONS: PddiOverrideReason[] = [
  { code: 'specialist-approval', display: 'Uzman onayı' },
  { code: 'no-alternative', display: 'Alternatif yok' },
  { code: 'monitored-use', display: 'İzlem planlandı' },
  { code: 'dose-adjusted', display: 'Doz ayarlandı' }
];

const PURE_PD_DOMAINS = new Set<string>([
  'NITRATE_PDE5',
  'CNS_RESPIRATORY',
  'HYPERKALEMIA',
  'NEPHROTOX_RAAS_NSAID',
  'BLEEDING_ANTICOAG',
  'SEROTONIN',
  'BRADYCARDIA_AV',
  'NMBA_POTENTIATION',
  'CARDIOVASCULAR_HEMODYNAMIC',
  'CNS_SEIZURE_OR_EPS',
  'HEPATOTOXICITY_SYNERGY',
  'ELECTROLYTE_METABOLIC'
]);

function buildConciseSummary(
  tier: UnifiedRiskTier,
  drugATr: string,
  drugBTr: string,
  firstConsequence: string
): string {
  const prefix =
    tier === 'X' ? 'KONTRENDİKE (X)' :
    tier === 'D' ? 'KAÇIN / DEĞİŞTİR (D)' :
    tier === 'C' ? 'İZLEM (C)' :
    tier === 'B' ? 'BİLGİ (B)' : 'GÜVENLİ (A)';
  const base = `${prefix}: ${drugATr} + ${drugBTr} — ${firstConsequence}`;
  if (base.length <= 140) return base;
  return base.slice(0, 137).trimEnd() + '...';
}

function defaultRoutesForScope(scope: PddiDomainTemplate['route_scope']): string[] {
  if (scope === 'ORAL_GI_ONLY') return ['ORAL', 'ENTERAL'];
  if (scope === 'NON_ORAL_EXCEPTION') {
    return ['ORAL', 'INTRAVENOUS', 'INHALED', 'INTRANASAL', 'INTRAARTICULAR', 'EPIDURAL'];
  }
  return ['ORAL', 'ENTERAL', 'INTRAVENOUS', 'INTRAMUSCULAR', 'SUBCUTANEOUS', 'SUBLINGUAL', 'TRANSDERMAL'];
}

function hydrateCompactBundle(raw: PddiMonographBundle): PddiMonographBundle {
  if (Array.isArray(raw.monographs) && raw.monographs.length > 0) {
    return raw;
  }
  if (!Array.isArray(raw.compact_monographs) || !raw.templates) {
    return { ...raw, monographs: [] };
  }
  const templates = raw.templates;
  const fallbackTpl: PddiDomainTemplate = templates['GENERAL_PK_TOXICITY'] || Object.values(templates)[0];
  const reviewDate = raw.generated_at || '2026-11-26';

  const hydrated: PddiMonographRecord[] = raw.compact_monographs.map(c => {
    const tpl = templates[c.dom] || fallbackTpl;
    const perpTr = c.pb === 1 ? c.btr : c.atr;
    const vicTr = c.pb === 1 ? c.atr : c.btr;
    const primaryMon = (tpl.monitoring && tpl.monitoring[0]) || null;
    const concreteMonClause = primaryMon
      ? `${primaryMon.parameter_tr} (${primaryMon.timing_tr}; kritik eşik: ${primaryMon.critical_threshold}) ile takip edilmelidir.`
      : `${tpl.action}`;

    const opStatement =
      c.t === 'X'
        ? `${perpTr} ve ${vicTr} birlikte kullanımı KONTRENDİKEDİR; aynı reçetede uygulanmamalıdır.`
        : c.t === 'D'
          ? `${perpTr} ve ${vicTr} kombinasyonundan kaçının veya tedaviyi değiştirin; zorunlu hallerde ${concreteMonClause}`
          : c.t === 'C'
            ? `${perpTr} ve ${vicTr} eşzamanlı kullanımında ${concreteMonClause}`
            : `${perpTr} ve ${vicTr} birlikte kullanımında özel önlem veya doz kısıtlaması gerekmez; klinik yanıt ${concreteMonClause}`;

    const seriousness: PddiMonographRecord['seriousness'] =
      c.t === 'X'
        ? 'life_threatening'
        : c.t === 'D'
          ? 'hospitalization_or_major'
          : c.t === 'C'
            ? 'moderate_clinical'
            : 'minor';

    const assertions: PddiSourceAssertion[] = (c.sa || []).map(row => ({
      source_id: row[0],
      source_type: row[1],
      section: row[2],
      original_rating: row[3],
      version_date: row[4],
      source_quote_verbatim: row[5],
      identifier: row[0],
      effective_date: row[4]
    }));

    const provenance: PddiEvidenceProvenanceItem[] = assertions.map(sa => ({
      source_id: sa.source_id,
      source_type: normalizeSourceType(sa.source_type),
      identifier: `${sa.source_id} (${sa.section})`,
      effective_date: sa.version_date,
      section: sa.section,
      original_rating: sa.original_rating,
      source_quote_verbatim: sa.source_quote_verbatim
    }));

    const liverpoolGrade: LiverpoolGradeLevel =
      c.lg ||
      (c.ev === 'teorik' ? 'VERY_LOW_4' : c.ev === 'olasi' ? 'LOW_3' : 'MODERATE_2');

    const classPolicy: ClassExtrapolationPolicy =
      tpl.class_extrapolation_policy ||
      (PURE_PD_DOMAINS.has(c.dom) ? 'CLASS_WIDE' : 'MOLECULE_SPECIFIC_ONLY');

    const directionality: InteractionDirectionality =
      tpl.directionality ||
      (PURE_PD_DOMAINS.has(c.dom) ? 'SYMMETRIC_PD' : 'UNIDIRECTIONAL_PK');

    const includedRoutes = tpl.included_routes || defaultRoutesForScope(tpl.route_scope);
    const mechanismTr = tpl.mechanism.replace(/\{A\}/g, perpTr).replace(/\{B\}/g, vicTr);
    const summary = buildConciseSummary(c.t, c.atr, c.btr, tpl.consequences[0] || 'Klinik etkileşim');

    return {
      schema_version: raw.schema_version || '3.1.0-pddi-cds',
      monograph_id: c.id,
      canonical_pair_key: c.k,
      atc_a: c.aa,
      atc_b: c.ab,
      drug_a_tr: c.atr,
      drug_b_tr: c.btr,
      drug_a_en: c.aen,
      drug_b_en: c.ben,
      rxcui_a: c.ra || '',
      rxcui_b: c.rb || '',
      unified_risk_tier: c.t,
      default_action_tier: c.t,
      liverpool_grade_level: liverpoolGrade,
      dips_score: typeof c.dips === 'number' ? c.dips : null,
      directionality,
      mirror_indexed: true,
      class_extrapolation_policy: classPolicy,
      included_routes: includedRoutes,
      operational_statement_tr: opStatement,
      primary_directive_tr: tpl.action,
      summary,
      override_reasons: tpl.override_reasons || DEFAULT_OVERRIDE_REASONS,
      frequency_of_exposure: UNKNOWN_EPIDEMIOLOGY_SENTINEL,
      frequency_of_harm: c.harm || UNKNOWN_EPIDEMIOLOGY_SENTINEL,
      seriousness,
      evidence_level: c.ev,
      clinical_consequences_tr: tpl.consequences,
      interaction_category: tpl.categories,
      mechanism_tr: mechanismTr,
      clinician_narrative_tr: mechanismTr,
      recommended_action_tr: tpl.action,
      alternative_tr: tpl.alternative,
      monitoring_parameters: tpl.monitoring,
      route_scope: tpl.route_scope,
      patient_context_escalators: tpl.escalators,
      discordance_flag: c.dc === 1,
      reconciliation_tier: c.rt,
      source_assertions: assertions,
      evidence_and_provenance: provenance,
      review_governance: {
        review_status: 'author_draft_unreviewed',
        independent_pharmacologist_signed: false,
        independent_pharmacist_signed: false
      },
      authored_text_license: 'CC-BY-NC-SA-4.0',
      last_clinical_review_date: reviewDate
    };
  });

  return {
    ...raw,
    total_monographs: hydrated.length,
    monographs: hydrated
  };
}

export function setPddiMonographsCache(rawBundle: PddiMonographBundle): void {
  const bundle = hydrateCompactBundle(rawBundle);
  cachedBundle = bundle;
  byAtcPair.clear();
  byInnPair.clear();
  if (!Array.isArray(bundle?.monographs)) return;
  for (const m of bundle.monographs) {
    if (m.atc_a && m.atc_b) {
      byAtcPair.set(canonicalPair(m.atc_a, m.atc_b), m);
    }
    if (m.drug_a_en && m.drug_b_en) {
      byInnPair.set(canonicalInnPair(m.drug_a_en, m.drug_b_en), m);
    }
    if (m.canonical_pair_key) {
      byInnPair.set(m.canonical_pair_key.toLowerCase(), m);
    }
  }
}

export async function ensurePddiMonographsReady(): Promise<PddiMonographBundle | null> {
  if (cachedBundle) return cachedBundle;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (typeof fetch !== 'undefined') {
      const paths = [
        './data/pddi_monographs_tr.json',
        '/data/pddi_monographs_tr.json',
        'data/pddi_monographs_tr.json'
      ];
      for (const p of paths) {
        try {
          const res = await fetch(p);
          if (res && res.ok) {
            const parsed = (await res.json()) as PddiMonographBundle;
            if (parsed && (Array.isArray(parsed.monographs) || Array.isArray(parsed.compact_monographs))) {
              setPddiMonographsCache(parsed);
              return cachedBundle;
            }
          }
        } catch {
          // sonraki yol
        }
      }
    }

    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fsMod = 'fs';
        const pathMod = 'path';
        const fs = await import(/* @vite-ignore */ fsMod);
        const path = await import(/* @vite-ignore */ pathMod);
        const candidates = [
          path.join(process.cwd(), 'public', 'data', 'pddi_monographs_tr.json'),
          path.join(process.cwd(), 'dist', 'data', 'pddi_monographs_tr.json')
        ];
        for (const fp of candidates) {
          if (fs.existsSync(fp)) {
            const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as PddiMonographBundle;
            if (parsed && (Array.isArray(parsed.monographs) || Array.isArray(parsed.compact_monographs))) {
              setPddiMonographsCache(parsed);
              return cachedBundle;
            }
          }
        }
      } catch {
        // yoksay
      }
    }

    return null;
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export function lookupPddiMonograph(
  drugA: { atc?: string; generic?: string },
  drugB: { atc?: string; generic?: string }
): PddiMonographRecord | null {
  if (!cachedBundle) return null;
  if (drugA.atc && drugB.atc) {
    const hit = byAtcPair.get(canonicalPair(drugA.atc, drugB.atc));
    if (hit) return hit;
  }
  if (drugA.generic && drugB.generic) {
    const hit = byInnPair.get(canonicalInnPair(drugA.generic, drugB.generic));
    if (hit) return hit;
  }
  return null;
}

function escalateTierByOne(tier: UnifiedRiskTier): UnifiedRiskTier {
  if (tier === 'B') return 'C';
  if (tier === 'C') return 'D';
  if (tier === 'D') return 'X';
  return tier;
}

/**
 * Reçetedeki ilaç çiftlerini W3C PDDI-CDS kanıtlı Türkçe monograflarla değerlendirir;
 * rota filtresi (ORAL_GI_ONLY, local non-systemic) ve bağlamsal organ fonksiyonu
 * yükselticilerini (eGFR <30, Child-Pugh B/C, K+ ≤3.5 veya ≥5.0) uygular.
 */
export function evaluatePddiMonographsForPrescription(
  drugs: Array<{ brand?: string; name?: string; generic?: string; atcCode?: string; atc?: string; route?: DrugRouteCode | string }>,
  patientContext?: {
    egfr?: number | null;
    childPughClass?: 'A' | 'B' | 'C' | null;
    baselineK?: number | null;
    ageYears?: number | null;
  }
): PddiMonographMatch[] {
  if (!cachedBundle || !Array.isArray(drugs) || drugs.length < 2) return [];

  const normalized = drugs.map(d => {
    const brand = String(d.brand || d.name || 'İlaç').trim();
    const atc = String(d.atcCode || d.atc || '').trim().toUpperCase();
    const generic = String(d.generic || '').trim().toLowerCase();
    const route = inferDrugRoute({ route: d.route as string | undefined, brand, atcCode: atc });
    return { brand, atc, generic, route };
  });

  const matches: PddiMonographMatch[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i];
      const b = normalized[j];
      if (a.atc && b.atc && a.atc === b.atc) continue;

      const mono = lookupPddiMonograph(a, b);
      if (!mono || seenIds.has(mono.monograph_id)) continue;

      // Rota filtresi (ORAL_GI_ONLY vs SYSTEMIC vs NON_ORAL_EXCEPTION)
      if (mono.route_scope === 'ORAL_GI_ONLY') {
        const isGastricPh = mono.interaction_category.includes('GASTRIC_PH');
        if (isGastricPh) {
          // Mide pH etkileşiminde IV PPI dahi oral substratı etkiler; yalnızca en az bir oral/enteral substrat aranır
          if (!isOralOrEnteralRoute(a.route) && !isOralOrEnteralRoute(b.route)) continue;
        } else if (!isOralOrEnteralRoute(a.route) || !isOralOrEnteralRoute(b.route)) {
          continue;
        }
      } else if (mono.route_scope === 'SYSTEMIC') {
        if (isLocalNonSystemicRoute(a.route) || isLocalNonSystemicRoute(b.route)) continue;
      }
      // NON_ORAL_EXCEPTION (flutikazon/budezonid inhale/nazal, triamsinolon eklem içi/epidural + güçlü CYP3A4 inh.) ASLA bastırılmaz!

      seenIds.add(mono.monograph_id);

      // Bağlamsal organ/elektrolit dinamik yükseltme (Faz 4)
      let escalatedTier: UnifiedRiskTier = mono.unified_risk_tier;
      const escalationNotes: string[] = [];
      const esc = mono.patient_context_escalators || [];

      if (typeof patientContext?.egfr === 'number' && patientContext.egfr < 30 && esc.includes('egfr_lt_30')) {
        escalatedTier = escalateTierByOne(escalatedTier);
        escalationNotes.push(`eGFR ${patientContext.egfr} mL/dk (<30) nedeniyle risk kademesi yükseltildi.`);
      }
      if (
        (patientContext?.childPughClass === 'B' || patientContext?.childPughClass === 'C') &&
        esc.includes('child_pugh_bc')
      ) {
        escalatedTier = escalateTierByOne(escalatedTier);
        escalationNotes.push(`Child-Pugh Sınıf ${patientContext.childPughClass} nedeniyle hepatik klirens uyarısı yükseltildi.`);
      }
      if (
        typeof patientContext?.baselineK === 'number' &&
        patientContext.baselineK <= 3.5 &&
        esc.includes('hypokalemia_qt')
      ) {
        escalatedTier = escalateTierByOne(escalatedTier);
        escalationNotes.push(`Hipokalemi (K⁺ ${patientContext.baselineK} mEq/L) nedeniyle QT/aritmi riski yükseltildi.`);
      }
      if (
        typeof patientContext?.baselineK === 'number' &&
        patientContext.baselineK >= 5.0 &&
        esc.includes('hyperkalemia_k_ge_5')
      ) {
        escalatedTier = escalateTierByOne(escalatedTier);
        escalationNotes.push(`Yüksek bazal potasyum (K⁺ ${patientContext.baselineK} mEq/L) nedeniyle hiperkalemi riski yükseltildi.`);
      }

      matches.push({
        monograph: mono,
        drugABrand: a.brand,
        drugBBrand: b.brand,
        atcA: a.atc || mono.atc_a,
        atcB: b.atc || mono.atc_b,
        escalatedTier,
        escalationNotes
      });
    }
  }

  const rank: Record<UnifiedRiskTier, number> = { X: 5, D: 4, C: 3, B: 2, A: 1 };
  return matches.sort((x, y) => rank[y.escalatedTier] - rank[x.escalatedTier]);
}
