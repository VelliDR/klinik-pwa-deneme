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

export type UnifiedRiskTier = 'X' | 'D' | 'C' | 'B' | 'A';
export type UnifiedEvidenceLevel = 'kesin' | 'olasi' | 'teorik';

export interface PddiSourceAssertion {
  source_id: string;
  source_type: 'TITCK_KUB' | 'OPENFDA_SPL' | 'ANSM_2023' | 'FDA_CYP_TABLE' | 'ONC_15' | 'CLINICAL_GUIDELINE';
  section: string;
  original_rating: string;
  version_date: string;
  source_quote_verbatim: string;
}

export interface PddiMonitoringParameter {
  parameter_tr: string;
  loinc_code: string;
  critical_threshold: string;
  timing_tr: string;
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
  operational_statement_tr: string;
  seriousness: 'life_threatening' | 'hospitalization_or_major' | 'moderate_clinical' | 'minor';
  evidence_level: UnifiedEvidenceLevel;
  clinical_consequences_tr: string[];
  interaction_category: string[];
  mechanism_tr: string;
  recommended_action_tr: string;
  alternative_tr?: string;
  monitoring_parameters: PddiMonitoringParameter[];
  route_scope: 'SYSTEMIC' | 'ORAL_GI_ONLY' | 'NON_ORAL_EXCEPTION';
  patient_context_escalators?: string[];
  discordance_flag: boolean;
  reconciliation_tier: 1 | 2 | 3;
  source_assertions: PddiSourceAssertion[];
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
  dom: string;
  pb?: 1;
  dc?: 1;
  rt: 1 | 2 | 3;
  sa: Array<[string, PddiSourceAssertion['source_type'], string, string, string, string]>;
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

function hydrateCompactBundle(raw: PddiMonographBundle): PddiMonographBundle {
  if (Array.isArray(raw.monographs) && raw.monographs.length > 0) {
    return raw;
  }
  if (!Array.isArray(raw.compact_monographs) || !raw.templates) {
    return { ...raw, monographs: [] };
  }
  const templates = raw.templates;
  const fallbackTpl: PddiDomainTemplate = templates['GENERAL_PK_TOXICITY'] || Object.values(templates)[0];
  const reviewDate = raw.generated_at || '2026-11-25';

  const hydrated: PddiMonographRecord[] = raw.compact_monographs.map(c => {
    const tpl = templates[c.dom] || fallbackTpl;
    const perpTr = c.pb === 1 ? c.btr : c.atr;
    const vicTr = c.pb === 1 ? c.atr : c.btr;
    const opStatement =
      c.t === 'X'
        ? `${perpTr} ve ${vicTr} birlikte kullanımı KONTRENDİKEDİR; kesinlikle aynı reçetede uygulanmamalıdır.`
        : c.t === 'D'
          ? `${perpTr} ve ${vicTr} kombinasyonundan kaçının veya tedaviyi değiştirin; zorunlu hallerde doz ayarı ve sıkı klinik izlem gerekir.`
          : c.t === 'C'
            ? `${perpTr} ve ${vicTr} birlikte kullanıldığında klinik yanıt ve laboratuvar parametreleri yakından izlenmelidir.`
            : `${perpTr} ve ${vicTr} eşzamanlı kullanımında olası farmakokinetik/farmakodinamik etkileşimi göz önünde bulundurunuz.`;

    const seriousness: PddiMonographRecord['seriousness'] =
      c.t === 'X'
        ? 'life_threatening'
        : c.t === 'D'
          ? 'hospitalization_or_major'
          : c.t === 'C'
            ? 'moderate_clinical'
            : 'minor';

    return {
      schema_version: raw.schema_version || '3.0.0-pddi-cds',
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
      operational_statement_tr: opStatement,
      seriousness,
      evidence_level: c.ev,
      clinical_consequences_tr: tpl.consequences,
      interaction_category: tpl.categories,
      mechanism_tr: tpl.mechanism.replace(/\{A\}/g, perpTr).replace(/\{B\}/g, vicTr),
      recommended_action_tr: tpl.action,
      alternative_tr: tpl.alternative,
      monitoring_parameters: tpl.monitoring,
      route_scope: tpl.route_scope,
      patient_context_escalators: tpl.escalators,
      discordance_flag: c.dc === 1,
      reconciliation_tier: c.rt,
      source_assertions: (c.sa || []).map(row => ({
        source_id: row[0],
        source_type: row[1],
        section: row[2],
        original_rating: row[3],
        version_date: row[4],
        source_quote_verbatim: row[5]
      })),
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

      // Rota filtresi
      if (mono.route_scope === 'ORAL_GI_ONLY') {
        if (!isOralOrEnteralRoute(a.route) || !isOralOrEnteralRoute(b.route)) continue;
      } else if (mono.route_scope === 'SYSTEMIC') {
        if (isLocalNonSystemicRoute(a.route) || isLocalNonSystemicRoute(b.route)) continue;
      }

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
