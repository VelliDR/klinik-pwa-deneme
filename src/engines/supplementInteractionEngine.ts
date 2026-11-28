/**
 * TAKVİYE, VİTAMİN & BİTKİ ÇAYI ETKİLEŞİM MOTORU (HDI / SDI — TEMİZ-ODA)
 *
 * Temel İlkeler:
 * 1. Ana TİTCK ilaç arama kataloğunu (medicines.json) kalabalıklaştırmaz; ayrı kategori ve
 *    izole arama üzerinden yalnızca kullanıcı açıkça seçtiğinde çalışır.
 * 2. Sıfır Gürültü Değişmezi (Zero-Noise Invariant): `selectedSupplements` boşsa O(1)
 *    short-circuit ile sıfır uyarı, sıfır maliyet ve sıfır sayaç etkisi üretir.
 * 3. Rota & Formülasyon Duyarlılığı:
 *    - `ORAL_ENTERAL_ONLY` şelasyon/adsorpsiyon kuralları parenteral/topikal ilaçlarda bastırılır.
 *    - Demleme çay vs. konsantre ekstrakt ve standart vs. yüksek doz ayrımı uygulanır.
 * 4. Anti-Halüsinasyon ve Clean-Room: Tüm kayıtlar yalnızca EMA HMPC, NIH ODS/NaPDI/LiverTox,
 *    FDA Safety Comm., EFSA, TİTCK KÜB, OpenFDA SPL ve ANSM 2023 kaynaklarından derlenir.
 */

import type { SelectedSupplementItem, SupplementCategory } from '../types/clinical';
import type {
  ActionTier,
  LiverpoolGradeLevel,
  ReviewStatus,
  SupplementSourceType
} from '../schemas/pddiMonographSchema';
import {
  isLocalNonSystemicRoute,
  isOralOrEnteralRoute,
  type DrugRouteCode
} from './drugRouteEngine';

export interface SupplementFormulationOption {
  code: string;
  label_tr: string;
  is_default?: boolean;
}

export interface SupplementCatalogItem {
  id: string;
  category: SupplementCategory;
  name_tr: string;
  latin_or_chem_name: string;
  short_tag_tr: string;
  synonyms_tr: string[];
  equivalent_atc_prefixes?: string[];
  formulations?: SupplementFormulationOption[];
  livertox_score?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  sedation_burden?: number;
}

export interface SupplementMonitoringItem {
  parameter_tr: string;
  loinc_code: string | null;
  ucum_unit: string | null;
  timing_tr: string;
  threshold_tr: string;
}

export interface SupplementSourceAssertion {
  source_type: SupplementSourceType;
  identifier: string;
  effective_date?: string;
  section: string;
  url: string;
  source_quote_verbatim?: string;
  note_tr: string;
}

export type SupplementRouteScope = 'ORAL_ENTERAL_ONLY' | 'SYSTEMIC_ALL' | 'ANY_INCLUDING_LAB';

export type SupplementSpecialContext =
  | 'STANDALONE_LAB'
  | 'PREGNANCY'
  | 'CHILD_UNDER_1'
  | 'CHILD_UNDER_2'
  | 'CHILD_UNDER_4'
  | 'CIRRHOSIS_CHILD_PUGH'
  | 'CKD_EGFR_LT30'
  | 'DEINDUCTION_14D';

export interface SupplementInteractionRule {
  rule_id: string;
  supplement_ids: string[];
  applies_to_formulations?: string[];
  target_atc_prefixes?: string[];
  exclude_atc_prefixes?: string[];
  target_group_label_tr: string;
  route_scope: SupplementRouteScope;
  special_context?: SupplementSpecialContext;
  action_tier: ActionTier;
  liverpool_grade: LiverpoolGradeLevel;
  dedupe_tier_rule_ids?: string[];
  summary_tr: string;
  mechanism_tr: string;
  primary_directive_tr: string;
  onset_washout_tr: string;
  monitoring: SupplementMonitoringItem[];
  source_assertions: SupplementSourceAssertion[];
}

export type SupplementStackingMatchMode =
  | 'PAIR_GROUPS'
  | 'THRESHOLD_POOL'
  | 'ANY_WITH_OTHERS'
  | 'TOTAL_SELECTED';

export interface SupplementStackingRule {
  rule_id: string;
  match_mode: SupplementStackingMatchMode;
  group_a_ids?: string[];
  group_b_ids?: string[];
  pool_ids?: string[];
  trigger_ids?: string[];
  required_formulations?: Record<string, string[]>;
  min_count?: number;
  min_other_count?: number;
  superseded_by_rule_id?: string;
  domain_label_tr: string;
  action_tier: ActionTier;
  liverpool_grade: LiverpoolGradeLevel;
  summary_tr: string;
  mechanism_tr: string;
  primary_directive_tr: string;
  onset_washout_tr: string;
  monitoring: SupplementMonitoringItem[];
  source_assertions: SupplementSourceAssertion[];
}

export interface SupplementCatalogPayload {
  schema_version: string;
  generated_at: string;
  license: string;
  review_status: ReviewStatus;
  supplements: SupplementCatalogItem[];
  rules: SupplementInteractionRule[];
  stacking_rules?: SupplementStackingRule[];
}

export interface SupplementAlertMatch {
  ruleId: string;
  supplementId: string;
  supplementNameTr: string;
  supplementCategory: SupplementCategory;
  formulationCode?: string;
  formulationLabelTr?: string;
  matchedDrugs: Array<{ brand: string; generic: string; atcCode: string }>;
  involvedSupplements?: Array<{ id: string; nameTr: string }>;
  targetLabelTr: string;
  actionTier: ActionTier;
  liverpoolGrade: LiverpoolGradeLevel;
  summaryTr: string;
  mechanismTr: string;
  primaryDirectiveTr: string;
  onsetWashoutTr: string;
  monitoring: SupplementMonitoringItem[];
  sourceAssertions: SupplementSourceAssertion[];
  isStandaloneContext: boolean;
  isStackingRule?: boolean;
  specialContext?: SupplementSpecialContext;
}

export interface SupplementDuplicationAlert {
  supplementId: string;
  supplementNameTr: string;
  matchedDrugBrand: string;
  matchedDrugAtc: string;
  noteTr: string;
}

export interface SupplementEvaluationContext {
  egfr?: number | null;
  ageYears?: number | null;
  ageMonths?: number | null;
  ageDays?: number | null;
  isPregnant?: boolean;
  trimester?: number | null;
  childPughClass?: 'A' | 'B' | 'C' | null;
  existingTierRuleIds?: Set<string>;
}

export interface SupplementDrugInput {
  brand: string;
  generic: string;
  atcCode: string;
  route: DrugRouteCode;
}

export interface SupplementEvaluationResult {
  selectedCount: number;
  alerts: SupplementAlertMatch[];
  duplications: SupplementDuplicationAlert[];
  actionableCount: number;
  monitoringCount: number;
  hasCritical: boolean;
  hasSedationContribution: boolean;
}

export const SUPPLEMENT_CATEGORY_LABELS_TR: Record<SupplementCategory, string> = {
  vitamin_mineral: 'Vitamin & Mineral',
  supplement_pill: 'Takviye Hapı',
  herbal_tea: 'Bitki Çayı & Bitkisel'
};

// ----------------------------------------------------------------------------
// BELLEK İÇİ KATALOG ÖNBELLEĞİ (TARAYICI + NODE TEST UYUMLU)
// ----------------------------------------------------------------------------
let cachedCatalog: SupplementCatalogPayload | null = null;
let catalogLoadingPromise: Promise<SupplementCatalogPayload | null> | null = null;
const supplementById = new Map<string, SupplementCatalogItem>();

export function isSupplementCatalogReady(): boolean {
  return cachedCatalog !== null;
}

export function getSupplementCatalogSync(): SupplementCatalogPayload | null {
  return cachedCatalog;
}

export function getSupplementByIdSync(id: string): SupplementCatalogItem | null {
  return supplementById.get(id) || null;
}

export function setSupplementCatalogCache(payload: SupplementCatalogPayload): void {
  cachedCatalog = payload;
  supplementById.clear();
  for (const item of payload.supplements || []) {
    supplementById.set(item.id, item);
  }
}

export async function ensureSupplementCatalogReady(): Promise<SupplementCatalogPayload | null> {
  if (cachedCatalog) return cachedCatalog;
  if (catalogLoadingPromise) return catalogLoadingPromise;

  catalogLoadingPromise = (async () => {
    if (typeof fetch !== 'undefined') {
      const candidatePaths = [
        './data/supplement_interactions_tr.json',
        '/data/supplement_interactions_tr.json',
        'data/supplement_interactions_tr.json'
      ];
      for (const p of candidatePaths) {
        try {
          const res = await fetch(p);
          if (res && res.ok) {
            const parsed = (await res.json()) as SupplementCatalogPayload;
            if (parsed && Array.isArray(parsed.supplements)) {
              setSupplementCatalogCache(parsed);
              return parsed;
            }
          }
        } catch {
          // sonraki yolu dene
        }
      }
    }

    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fsMod = 'fs';
        const pathMod = 'path';
        const fs = await import(/* @vite-ignore */ fsMod);
        const path = await import(/* @vite-ignore */ pathMod);
        const fsCandidates = [
          path.join(process.cwd(), 'public', 'data', 'supplement_interactions_tr.json'),
          path.join(process.cwd(), 'dist', 'data', 'supplement_interactions_tr.json')
        ];
        for (const fp of fsCandidates) {
          if (fs.existsSync(fp)) {
            const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as SupplementCatalogPayload;
            if (parsed && Array.isArray(parsed.supplements)) {
              setSupplementCatalogCache(parsed);
              return parsed;
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
    return await catalogLoadingPromise;
  } finally {
    catalogLoadingPromise = null;
  }
}

// ----------------------------------------------------------------------------
// İZOLE TAKVİYE ARAMASI (TÜRKÇE NORMALİZASYONLU, ANA İLAÇ ARAMASINDAN AYRI)
// ----------------------------------------------------------------------------
export function normalizeSupplementSearchText(raw: string): string {
  return String(raw || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9+/\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDefaultFormulation(item: SupplementCatalogItem): SupplementFormulationOption | null {
  if (!Array.isArray(item.formulations) || item.formulations.length === 0) return null;
  return item.formulations.find(f => f.is_default) || item.formulations[0];
}

export function searchSupplementCatalog(
  query: string = '',
  category: SupplementCategory | 'all' = 'all'
): SupplementCatalogItem[] {
  if (!cachedCatalog) return [];
  const normQ = normalizeSupplementSearchText(query);
  const tokens = normQ ? normQ.split(' ').filter(Boolean) : [];

  const pool = cachedCatalog.supplements.filter(item =>
    category === 'all' ? true : item.category === category
  );

  if (tokens.length === 0) return pool;

  const scored: Array<{ item: SupplementCatalogItem; score: number }> = [];
  for (const item of pool) {
    const nameNorm = normalizeSupplementSearchText(item.name_tr);
    const latinNorm = normalizeSupplementSearchText(item.latin_or_chem_name);
    const tagNorm = normalizeSupplementSearchText(item.short_tag_tr);
    const synNorms = (item.synonyms_tr || []).map(normalizeSupplementSearchText);
    const combined = `${nameNorm} ${latinNorm} ${tagNorm} ${synNorms.join(' ')}`;

    const allMatch = tokens.every(tok => combined.includes(tok));
    if (!allMatch) continue;

    let score = 10;
    if (nameNorm.startsWith(normQ)) score += 100;
    else if (nameNorm.includes(normQ)) score += 60;
    if (synNorms.some(s => s === normQ)) score += 90;
    else if (synNorms.some(s => s.startsWith(normQ))) score += 50;
    else if (synNorms.some(s => s.includes(normQ))) score += 30;
    if (latinNorm.includes(normQ)) score += 20;

    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.name_tr.localeCompare(b.item.name_tr, 'tr'));
  return scored.map(x => x.item);
}

// ----------------------------------------------------------------------------
// ETKİLEŞİM DEĞERLENDİRME MOTORU (ZERO-NOISE INVARIANT)
// ----------------------------------------------------------------------------
const TIER_RANK: Record<ActionTier, number> = { X: 4, D: 3, C: 2, B: 1, A: 0 };
const GRADE_RANK: Record<LiverpoolGradeLevel, number> = {
  HIGH_1: 4,
  MODERATE_2: 3,
  LOW_3: 2,
  VERY_LOW_4: 1
};

function matchesAgeUnderYears(
  ctx: SupplementEvaluationContext,
  limitYears: number
): boolean {
  const limitDays = Math.round(limitYears * 365.25);
  if (typeof ctx.ageDays === 'number' && !Number.isNaN(ctx.ageDays)) {
    return ctx.ageDays >= 0 && ctx.ageDays < limitDays;
  }
  if (typeof ctx.ageMonths === 'number' && !Number.isNaN(ctx.ageMonths)) {
    return ctx.ageMonths >= 0 && ctx.ageMonths < limitYears * 12;
  }
  if (typeof ctx.ageYears === 'number' && !Number.isNaN(ctx.ageYears)) {
    return ctx.ageYears >= 0 && ctx.ageYears < limitYears;
  }
  return false;
}

function evaluateSpecialContext(
  specialContext: SupplementSpecialContext,
  ctx: SupplementEvaluationContext
): boolean {
  switch (specialContext) {
    case 'STANDALONE_LAB':
      return true;
    case 'PREGNANCY':
      return Boolean(ctx.isPregnant || (typeof ctx.trimester === 'number' && ctx.trimester > 0));
    case 'CHILD_UNDER_1':
      return matchesAgeUnderYears(ctx, 1);
    case 'CHILD_UNDER_2':
      return matchesAgeUnderYears(ctx, 2);
    case 'CHILD_UNDER_4':
      return matchesAgeUnderYears(ctx, 4);
    case 'CIRRHOSIS_CHILD_PUGH':
      return Boolean(ctx.childPughClass);
    case 'CKD_EGFR_LT30':
      return typeof ctx.egfr === 'number' && !Number.isNaN(ctx.egfr) && ctx.egfr < 30;
    case 'DEINDUCTION_14D':
      return true;
    default:
      return false;
  }
}

export function evaluateSupplementInteractions(
  enrichedDrugs: SupplementDrugInput[],
  selectedSupplements: SelectedSupplementItem[] | undefined | null,
  ctx: SupplementEvaluationContext = {}
): SupplementEvaluationResult {
  // SIFIR GÜRÜLTÜ DEĞİŞMEZİ: Takviye seçilmemişse O(1) boş dönüş
  if (!Array.isArray(selectedSupplements) || selectedSupplements.length === 0) {
    return {
      selectedCount: 0,
      alerts: [],
      duplications: [],
      actionableCount: 0,
      monitoringCount: 0,
      hasCritical: false,
      hasSedationContribution: false
    };
  }

  if (!cachedCatalog) {
    return {
      selectedCount: selectedSupplements.length,
      alerts: [],
      duplications: [],
      actionableCount: 0,
      monitoringCount: 0,
      hasCritical: false,
      hasSedationContribution: false
    };
  }

  const drugs = Array.isArray(enrichedDrugs) ? enrichedDrugs : [];
  const alerts: SupplementAlertMatch[] = [];
  const duplications: SupplementDuplicationAlert[] = [];
  const seenRuleSuppKeys = new Set<string>();
  const explicitCoveredDupPairs = new Set<string>();
  let hasSedationContribution = false;

  for (const sel of selectedSupplements) {
    const item = supplementById.get(sel.id);
    if (!item) continue;

    if ((item.sedation_burden || 0) > 0) {
      hasSedationContribution = true;
    }

    const defForm = getDefaultFormulation(item);
    const activeFormCode = sel.formulation || defForm?.code;
    const activeFormLabel =
      sel.formulationLabelTr ||
      item.formulations?.find(f => f.code === activeFormCode)?.label_tr ||
      defForm?.label_tr;

    for (const rule of cachedCatalog.rules) {
      if (!rule.supplement_ids.includes(item.id)) continue;

      // Formülasyon / doz filtresi (örn. çay vs. konsantre ekstrakt, yüksek doz vs. standart)
      if (Array.isArray(rule.applies_to_formulations) && rule.applies_to_formulations.length > 0) {
        if (!activeFormCode || !rule.applies_to_formulations.includes(activeFormCode)) {
          continue;
        }
      }

      // Mevcut interactionTierEngine kuralıyla tekilleştirme
      if (
        ctx.existingTierRuleIds &&
        Array.isArray(rule.dedupe_tier_rule_ids) &&
        rule.dedupe_tier_rule_ids.some(id => ctx.existingTierRuleIds!.has(id))
      ) {
        continue;
      }

      const hasDrugTargets = Array.isArray(rule.target_atc_prefixes) && rule.target_atc_prefixes.length > 0;
      const hasSpecial = Boolean(rule.special_context);

      if (hasSpecial && !evaluateSpecialContext(rule.special_context!, ctx)) {
        continue;
      }

      let matchedDrugs: Array<{ brand: string; generic: string; atcCode: string }> = [];
      if (hasDrugTargets) {
        const prefixes = rule.target_atc_prefixes!.map(p => p.toUpperCase());
        const excludes = (rule.exclude_atc_prefixes || []).map(p => p.toUpperCase());

        matchedDrugs = drugs
          .filter(d => {
            const atc = String(d.atcCode || '').toUpperCase();
            if (!atc) return false;
            if (!prefixes.some(p => atc.startsWith(p))) return false;
            if (excludes.some(e => atc.startsWith(e))) return false;
            // Rota güvenliği: parenteral/topikal yanlış pozitif bastırması
            if (rule.route_scope === 'ORAL_ENTERAL_ONLY') {
              return isOralOrEnteralRoute(d.route);
            }
            if (rule.route_scope === 'SYSTEMIC_ALL') {
              return !isLocalNonSystemicRoute(d.route);
            }
            return true;
          })
          .map(d => ({
            brand: d.brand,
            generic: d.generic,
            atcCode: d.atcCode
          }));

        if (matchedDrugs.length === 0) continue;
      } else if (!hasSpecial) {
        continue;
      }

      const dedupeKey = `${rule.rule_id}::${item.id}`;
      if (seenRuleSuppKeys.has(dedupeKey)) continue;
      seenRuleSuppKeys.add(dedupeKey);

      // Kırmızı maya pirinci + statin gibi zaten X/D uyarısı veren duplikasyonları ikinci kez sayma
      if (item.id === 'red_yeast_rice' && rule.rule_id === 'SUP_HDI_022') {
        for (const md of matchedDrugs) {
          explicitCoveredDupPairs.add(`${item.id}::${md.atcCode.toUpperCase()}`);
        }
      }

      alerts.push({
        ruleId: rule.rule_id,
        supplementId: item.id,
        supplementNameTr: item.name_tr,
        supplementCategory: item.category,
        formulationCode: activeFormCode,
        formulationLabelTr: activeFormLabel,
        matchedDrugs,
        targetLabelTr: rule.target_group_label_tr,
        actionTier: rule.action_tier,
        liverpoolGrade: rule.liverpool_grade,
        summaryTr: rule.summary_tr,
        mechanismTr: rule.mechanism_tr,
        primaryDirectiveTr: rule.primary_directive_tr,
        onsetWashoutTr: rule.onset_washout_tr,
        monitoring: rule.monitoring || [],
        sourceAssertions: rule.source_assertions || [],
        isStandaloneContext: !hasDrugTargets && hasSpecial,
        specialContext: rule.special_context
      });
    }

    // TİTCK Reçete İlacı ile Takviye Duplikasyonu Tespiti (ör. Ferrosanol + Demir, Kalinor + Potasyum)
    if (Array.isArray(item.equivalent_atc_prefixes) && item.equivalent_atc_prefixes.length > 0 && drugs.length > 0) {
      const eqPrefixes = item.equivalent_atc_prefixes.map(p => p.toUpperCase());
      for (const d of drugs) {
        const atc = String(d.atcCode || '').toUpperCase();
        if (!atc || isLocalNonSystemicRoute(d.route)) continue;
        if (!eqPrefixes.some(p => atc.startsWith(p))) continue;
        const dupKey = `${item.id}::${atc}`;
        if (explicitCoveredDupPairs.has(dupKey)) continue;
        explicitCoveredDupPairs.add(dupKey);
        duplications.push({
          supplementId: item.id,
          supplementNameTr: item.name_tr,
          matchedDrugBrand: d.brand,
          matchedDrugAtc: atc,
          noteTr: `Reçetedeki ${d.brand} (${atc}) ile seçilen "${item.name_tr}" aynı etken/sınıf grubundadır; çift doz ve birikim toksisitesini önlemek için OTC takviyeye ara verilmelidir.`
        });
      }
    }
  }

  // 2. TAKVİYE ↔ TAKVİYE (SSI) VE KÜMÜLATİF YIĞILMA DEĞERLENDİRMESİ (İlaçsız dahi çalışır)
  const resolvedSelected = selectedSupplements
    .map(sel => {
      const item = supplementById.get(sel.id);
      if (!item) return null;
      const defForm = getDefaultFormulation(item);
      const activeFormCode = sel.formulation || defForm?.code;
      return { item, activeFormCode };
    })
    .filter((x): x is { item: SupplementCatalogItem; activeFormCode: string | undefined } => x !== null);

  if (resolvedSelected.length >= 2 && Array.isArray(cachedCatalog.stacking_rules) && cachedCatalog.stacking_rules.length > 0) {
    const matchesForm = (
      entry: { item: SupplementCatalogItem; activeFormCode: string | undefined },
      reqForms?: Record<string, string[]>
    ): boolean => {
      if (!reqForms) return true;
      const allowed = reqForms[entry.item.id];
      if (!Array.isArray(allowed) || allowed.length === 0) return true;
      return Boolean(entry.activeFormCode && allowed.includes(entry.activeFormCode));
    };

    const candidateStacking: Array<{
      rule: SupplementStackingRule;
      involved: Array<{ id: string; nameTr: string }>;
    }> = [];

    for (const srule of cachedCatalog.stacking_rules) {
      let involved: Array<{ id: string; nameTr: string }> = [];

      if (srule.match_mode === 'PAIR_GROUPS') {
        const setA = new Set(srule.group_a_ids || []);
        const setB = new Set(srule.group_b_ids || []);
        const hitsA = resolvedSelected.filter(e => setA.has(e.item.id) && matchesForm(e, srule.required_formulations));
        const hitsB = resolvedSelected.filter(e => setB.has(e.item.id) && matchesForm(e, srule.required_formulations));
        const hasDistinctPair = hitsA.some(a => hitsB.some(b => b.item.id !== a.item.id));
        if (hasDistinctPair) {
          const uniq = new Map<string, string>();
          for (const x of [...hitsA, ...hitsB]) uniq.set(x.item.id, x.item.name_tr);
          involved = Array.from(uniq.entries()).map(([id, nameTr]) => ({ id, nameTr }));
        }
      } else if (srule.match_mode === 'THRESHOLD_POOL') {
        const pool = new Set(srule.pool_ids || []);
        const hits = resolvedSelected.filter(e => pool.has(e.item.id) && matchesForm(e, srule.required_formulations));
        const uniq = new Map<string, string>();
        for (const x of hits) uniq.set(x.item.id, x.item.name_tr);
        if (uniq.size >= (srule.min_count || 2)) {
          involved = Array.from(uniq.entries()).map(([id, nameTr]) => ({ id, nameTr }));
        }
      } else if (srule.match_mode === 'ANY_WITH_OTHERS') {
        const trig = new Set(srule.trigger_ids || []);
        const trigHits = resolvedSelected.filter(e => trig.has(e.item.id) && matchesForm(e, srule.required_formulations));
        const otherHits = resolvedSelected.filter(e => !trig.has(e.item.id));
        if (trigHits.length > 0 && otherHits.length >= (srule.min_other_count || 1)) {
          const uniq = new Map<string, string>();
          for (const x of trigHits) uniq.set(x.item.id, x.item.name_tr);
          for (const x of otherHits.slice(0, 5)) uniq.set(x.item.id, x.item.name_tr);
          involved = Array.from(uniq.entries()).map(([id, nameTr]) => ({ id, nameTr }));
        }
      } else if (srule.match_mode === 'TOTAL_SELECTED') {
        if (resolvedSelected.length >= (srule.min_count || 5)) {
          involved = resolvedSelected.slice(0, 6).map(x => ({ id: x.item.id, nameTr: x.item.name_tr }));
        }
      }

      if (involved.length > 0) {
        candidateStacking.push({ rule: srule, involved });
      }
    }

    const activeStackIds = new Set(candidateStacking.map(c => c.rule.rule_id));
    for (const { rule: srule, involved } of candidateStacking) {
      if (srule.superseded_by_rule_id && activeStackIds.has(srule.superseded_by_rule_id)) {
        continue;
      }
      const primaryItem = supplementById.get(involved[0].id);
      const extraCount =
        srule.match_mode === 'TOTAL_SELECTED' && resolvedSelected.length > involved.length
          ? ` (+${resolvedSelected.length - involved.length} diğer)`
          : srule.match_mode === 'ANY_WITH_OTHERS' && resolvedSelected.length > involved.length
            ? ` (+${resolvedSelected.length - involved.length} diğer)`
            : '';
      const involvedLabel = involved.map(x => x.nameTr.split('(')[0].trim()).join(' + ') + extraCount;

      alerts.push({
        ruleId: srule.rule_id,
        supplementId: involved[0].id,
        supplementNameTr: srule.domain_label_tr,
        supplementCategory: primaryItem?.category || 'supplement_pill',
        matchedDrugs: [],
        involvedSupplements: involved,
        targetLabelTr: involvedLabel,
        actionTier: srule.action_tier,
        liverpoolGrade: srule.liverpool_grade,
        summaryTr: srule.summary_tr,
        mechanismTr: srule.mechanism_tr,
        primaryDirectiveTr: srule.primary_directive_tr,
        onsetWashoutTr: srule.onset_washout_tr,
        monitoring: srule.monitoring || [],
        sourceAssertions: srule.source_assertions || [],
        isStandaloneContext: true,
        isStackingRule: true
      });
    }
  }

  alerts.sort((a, b) => {
    const tDiff = (TIER_RANK[b.actionTier] || 0) - (TIER_RANK[a.actionTier] || 0);
    if (tDiff !== 0) return tDiff;
    return (GRADE_RANK[b.liverpoolGrade] || 0) - (GRADE_RANK[a.liverpoolGrade] || 0);
  });

  const actionableAlerts = alerts.filter(a => a.actionTier === 'X' || a.actionTier === 'D');
  const monitoringAlerts = alerts.filter(a => a.actionTier === 'C' || a.actionTier === 'B');

  return {
    selectedCount: selectedSupplements.length,
    alerts,
    duplications,
    actionableCount: actionableAlerts.length + duplications.length,
    monitoringCount: monitoringAlerts.length,
    hasCritical: alerts.some(a => a.actionTier === 'X'),
    hasSedationContribution
  };
}

// ----------------------------------------------------------------------------
// RUSS (2014) KAYDIRMASIZ KART + TİLSON (2016) PASİF AKORDEON RENDER
// ----------------------------------------------------------------------------
function escapeHtml(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const GRADE_LABEL_TR: Record<LiverpoolGradeLevel, string> = {
  HIGH_1: 'GRADE Yüksek (1)',
  MODERATE_2: 'GRADE Orta (2)',
  LOW_3: 'GRADE Düşük (3)',
  VERY_LOW_4: 'GRADE Çok Düşük (4)'
};

const TIER_LABEL_TR: Record<ActionTier, string> = {
  X: 'Kademe X · Hard Stop',
  D: 'Kademe D · Kaçın / Ayarla',
  C: 'Kademe C · İzlem / Ayrım',
  B: 'Kademe B · Pasif Bilgi',
  A: 'Kademe A'
};

export function renderSupplementAlertsHTML(res?: SupplementEvaluationResult | null): string {
  if (!res || (res.alerts.length === 0 && res.duplications.length === 0)) return '';

  const majorAlerts = res.alerts.filter(a => a.actionTier === 'X' || a.actionTier === 'D');
  const passiveAlerts = res.alerts.filter(a => a.actionTier === 'C' || a.actionTier === 'B');

  const renderCard = (a: SupplementAlertMatch): string => {
    const isX = a.actionTier === 'X';
    const isD = a.actionTier === 'D';
    const boxCls = isX
      ? 'bg-rose-950/65 border-rose-500/85 text-rose-100'
      : isD
      ? 'bg-amber-950/55 border-amber-500/80 text-amber-100'
      : 'bg-teal-950/35 border-teal-700/60 text-slate-100';
    const tierBadgeCls = isX
      ? 'bg-rose-900/90 text-rose-100 border-rose-400'
      : isD
      ? 'bg-amber-900/85 text-amber-100 border-amber-400/80'
      : 'bg-teal-900/70 text-teal-200 border-teal-500/70';

    const matchedText = a.matchedDrugs.length > 0
      ? a.matchedDrugs.map(d => d.brand).join(', ')
      : a.targetLabelTr;

    const monText = a.monitoring.length > 0
      ? a.monitoring.map(m => `${m.parameter_tr}${m.loinc_code ? ` [LOINC ${m.loinc_code}]` : ''} — ${m.timing_tr}`).join(' • ')
      : 'Rutin semptom ve zaman ayrımı uyumu kontrolü.';

    const labButtons = a.monitoring.slice(0, 2).map(m => {
      const orderText = `${m.parameter_tr}${m.loinc_code ? ` (LOINC ${m.loinc_code})` : ''}: ${m.timing_tr} — ${m.threshold_tr}`;
      return `<button type="button" class="btn-cds-action btn-compact px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border border-cyan-600/70 text-[0.6875rem] font-semibold transition-colors" data-cds-action="ADD_LAB_ORDER" data-lab-order="${escapeHtml(orderText)}">+ İzlem: ${escapeHtml(m.parameter_tr)}</button>`;
    }).join('');

    const removeSuppBtn = a.isStackingRule
      ? ''
      : `<button type="button" class="btn-cds-action btn-compact px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/70 text-[0.6875rem] font-semibold transition-colors" data-cds-action="REMOVE_SUPPLEMENT" data-supplement-id="${escapeHtml(a.supplementId)}">Takviyeyi Kaldır</button>`;

    const stackTagCls = a.isStackingRule
      ? 'bg-fuchsia-950/85 border-fuchsia-500/75 text-fuchsia-200'
      : 'bg-teal-950/85 border-teal-500/70 text-teal-200';
    const stackTagLabel = a.isStackingRule ? 'KÜMÜLATİF YIĞILMA' : 'TAKVİYE/BİTKİ';
    const headerTitle = a.isStackingRule
      ? `${escapeHtml(a.supplementNameTr)} — <span class="font-normal opacity-90">${escapeHtml(a.targetLabelTr)}</span>`
      : `${escapeHtml(a.supplementNameTr)} + ${escapeHtml(matchedText)}`;

    const sourcesHtml = a.sourceAssertions.length > 0
      ? `
        <details class="pt-1 border-t border-white/10">
          <summary class="text-[0.6875rem] text-sky-300 hover:underline cursor-pointer select-none">Mekanizma &amp; Resmi Kaynaklar (${a.sourceAssertions.length})</summary>
          <div class="mt-1 space-y-1 text-[0.75rem] text-slate-300 leading-relaxed">
            <div><strong class="text-slate-100">Mekanizma:</strong> ${escapeHtml(a.mechanismTr)}</div>
            ${a.sourceAssertions.map(s => `
              <div class="space-y-0.5">
                <div>• <span class="font-mono text-[0.6875rem] text-teal-300">[${escapeHtml(s.source_type)}]</span> <strong>${escapeHtml(s.identifier)}</strong>${s.effective_date ? ` <span class="text-slate-400 font-mono text-[0.625rem]">(${escapeHtml(s.effective_date)})</span>` : ''} (${escapeHtml(s.section)}): ${escapeHtml(s.note_tr)}</div>
                ${s.source_quote_verbatim ? `<div class="pl-3 text-[0.6875rem] italic text-slate-400 border-l border-teal-700/50">"${escapeHtml(s.source_quote_verbatim)}"</div>` : ''}
              </div>
            `).join('')}
          </div>
        </details>
      `
      : '';

    return `
      <div class="p-2.5 rounded-lg border ${boxCls} space-y-1.5 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-1.5">
          <div class="font-bold text-xs flex flex-wrap items-center gap-1.5">
            <span class="px-1.5 py-0.5 rounded border text-[0.625rem] uppercase tracking-wider font-mono ${stackTagCls}">${stackTagLabel}</span>
            <span>${headerTitle}</span>
          </div>
          <span class="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded border ${tierBadgeCls}">${escapeHtml(TIER_LABEL_TR[a.actionTier])}</span>
        </div>
        <div class="text-[0.75rem] font-semibold leading-snug">${escapeHtml(a.summaryTr)}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[0.75rem]">
          <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
            <div class="text-[0.625rem] uppercase tracking-wider font-bold text-emerald-300">Önerilen Eylem</div>
            <div class="text-white leading-snug">${escapeHtml(a.primaryDirectiveTr)}</div>
          </div>
          <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
            <div class="text-[0.625rem] uppercase tracking-wider font-bold text-sky-300">Kanıt / DRIVE-GRADE</div>
            <div class="text-slate-200 leading-snug font-mono">${escapeHtml(GRADE_LABEL_TR[a.liverpoolGrade])} · ${a.sourceAssertions.length} kaynak${a.formulationLabelTr ? ` · ${escapeHtml(a.formulationLabelTr)}` : ''}</div>
          </div>
          <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
            <div class="text-[0.625rem] uppercase tracking-wider font-bold text-amber-300">Başlangıç / Arınma</div>
            <div class="text-slate-200 leading-snug">${escapeHtml(a.onsetWashoutTr)}</div>
          </div>
          <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
            <div class="text-[0.625rem] uppercase tracking-wider font-bold text-cyan-300">Klinik / Lab İzlemi</div>
            <div class="text-slate-200 leading-snug">${escapeHtml(monText)}</div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
          ${removeSuppBtn}
          ${labButtons}
        </div>
        ${sourcesHtml}
      </div>
    `;
  };

  const dupHtml = res.duplications.length > 0
    ? `
      <div class="p-2.5 rounded-lg border bg-amber-950/45 border-amber-600/70 text-amber-100 text-xs space-y-1">
        <div class="font-bold text-amber-300">Reçete İlacı – Takviye Duplikasyonu (${res.duplications.length})</div>
        ${res.duplications.map(d => `<div class="text-[0.75rem] leading-relaxed">• ${escapeHtml(d.noteTr)}</div>`).join('')}
      </div>
    `
    : '';

  const majorHtml = majorAlerts.map(renderCard).join('');
  const passiveHtml = passiveAlerts.length > 0
    ? `
      <details class="rounded-lg border border-teal-700/50 bg-teal-950/20 overflow-hidden group">
        <summary class="px-2.5 py-2 cursor-pointer select-none flex items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden text-teal-200 font-semibold text-xs hover:bg-teal-950/35">
          <span>${passiveAlerts.length} Takviye / Bitki Çayı İzlem &amp; Zaman Ayrımı Uyarısı (Kademe C/B) — İncele</span>
          <span class="text-teal-300 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div class="px-2 pb-2 pt-1.5 border-t border-teal-800/40 space-y-1.5 max-h-60 overflow-y-auto">
          ${passiveAlerts.map(renderCard).join('')}
        </div>
      </details>
    `
    : '';

  return [majorHtml, dupHtml, passiveHtml].filter(Boolean).join('');
}
