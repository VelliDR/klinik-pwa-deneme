/**
 * BİRLEŞİK REÇETE GÜVENLİK ORKESTRATÖRÜ (UNIFIED SAFETY ORCHESTRATOR — FAZ 0/1/3/4)
 *
 * Tek Doğruluk Kaynağı (Single Source of Truth):
 * `safetyAlertsController` (ana güvenlik kalkanı kartı) ve `prescriptionModalController`
 * (reçete önizleme / yazdırma modalı) her ikisi de bu orkestratörü çağırır.
 *
 * Böylece:
 * 1. Uyarı sayacı (Kritik / Önemli / İzlem / Duplikasyon) ile ekranda gösterilen
 *    kartlar arasında %100 senkronizasyon garanti edilir.
 * 2. `interactionTierEngine`, `pddiMonographEngine`, `safetyPrescriptionEngine`
 *    ve `ddiMatrixEngine` arasındaki çift sayım (ör. Triple Whammy, Serotonin MAOI,
 *    CYP-Statin, Gebelik, Yenidoğan) otomatik tekilleştirilir.
 * 3. Kanıtlı W3C PDDI-CDS Türkçe monografı bulunan ilaç çiftleri için DDInter 2.0'ın
 *    jenerik şablon metni bastırılır (monograf önceliği).
 */

import type { SelectedDrugItem } from '../types/clinical';
import type {
  RenalDoseCheckResult,
  TripleWhammyResult,
  PregnancySafetyResult,
  NeonatalDrugSafetyResult,
  SerotoninSyndromeResult,
  HyperkalemiaRiskResult,
  CypStatinInteractionResult,
  HepaticDoseSafetyResult
} from '../types/engines';
import {
  detectTripleWhammy,
  checkSerotoninSyndrome,
  checkHyperkalemiaRisk,
  checkCypStatinInteraction,
  checkRenalDoseAdjustments,
  checkPregnancySafety,
  checkNeonatalDrugSafety,
  checkHepaticDoseSafety
} from './safetyPrescriptionEngine';
import {
  evaluatePrescriptionInteractions,
  type InteractionAlert,
  type InteractionEvaluationResult
} from './interactionTierEngine';
import {
  evaluatePddiMonographsForPrescription,
  type PddiMonographMatch
} from './pddiMonographEngine';
import {
  evaluateDdiMatrixForPrescription,
  type DdiMatrixEvaluationResult
} from './ddiMatrixEngine';
import { identifyRenalDrugCategory } from './renalDoseEngine';
import { inferDrugRoute, type DrugRouteCode } from './drugRouteEngine';
import { getRxNormConceptByKey, resolveToRxNormConcept } from './rxNormMappingEngine';
import { findCatalogDrugSync } from '../db/titckIndexedDB';
import type { TisdaleQtcScoreResult } from './clinicalStackingEngine';
import {
  classifyPharmacologicBadge,
  type DiscontinuedDrugEntry,
  type JanusmedRiskProfileResult
} from './advancedPharmacologyEngine';
import {
  buildCdsHookSuggestions,
  CODED_OVERRIDE_REASONS,
  type CdsHookActionSuggestion
} from './cdsHooksActionEngine';

export interface UnifiedSafetyContext {
  egfr?: number | null;
  serumCreatinineMgDl?: number | null;
  ageYears?: number | null;
  ageMonths?: number | null;
  ageDays?: number | null;
  isNeonate?: boolean;
  gestationalAgeWeeks?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  gender?: string | null;
  trimester?: number | null;
  isPregnant?: boolean;
  pregnancyWeeks?: number | null;
  baselineK?: number | null;
  baselineQtcMs?: number | null;
  hasAcuteMi?: boolean;
  hasSepsis?: boolean;
  hasHeartFailure?: boolean;
  childPughClass?: 'A' | 'B' | 'C' | null;
  childPughScore?: number | null;
  meldScore?: number | null;
  diagnosis?: string;
  recentDiscontinuedDrugs?: DiscontinuedDrugEntry[];
}

export interface EnrichedSafetyDrug {
  brand: string;
  name: string;
  generic: string;
  atcCode: string;
  route: DrugRouteCode;
  mealTiming: string;
  mealTimingCode: number;
  drivingRisk: string;
  drivingRiskCode: number;
  allergens: string[];
  [key: string]: unknown;
}

export interface UnifiedSafetyCounts {
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
  pddiMonographs: number;
  duplications: number;
  organShields: number;
  ddinterExtra: number;
  /** Ana rozette ve modalda gösterilen eyleme dönüştürülebilir tekil uyarı sayısı (Tier 1+2 + özgün PDDI X/D + tekilleştirilmiş organ kalkanları + duplikasyon + özgün DDInter Major) */
  totalActionable: number;
  /** Katlanabilir şeritte yer alan düşük öncelikli / izlem sayısı (Tier 3+4 + PDDI C/B + DDInter Moderate) */
  totalMonitoring: number;
  /** Hard Stop veya Kontrendikasyon bayrağı */
  hasCritical: boolean;
}

export interface UnifiedSafetyResult {
  enrichedDrugs: EnrichedSafetyDrug[];
  interactions: InteractionEvaluationResult;
  tisdaleQtcScore?: TisdaleQtcScoreResult;
  janusmedProfile?: JanusmedRiskProfileResult;
  missingLabs: Array<{ labelTr: string; loincCode: string | null }>;
  pddiMatches: PddiMonographMatch[];
  /** interactionTierEngine ile aynı ATC çiftini zaten yakalamayan özgün PDDI monografları */
  uniquePddiCount: number;
  ddiMatrix: DdiMatrixEvaluationResult;
  tripleWhammy: TripleWhammyResult;
  serotoninSyndrome: SerotoninSyndromeResult;
  hyperkalemiaRisk: HyperkalemiaRiskResult;
  cypStatinInteraction: CypStatinInteractionResult;
  renalAdjustments: RenalDoseCheckResult | null;
  pregnancySafety: PregnancySafetyResult | null;
  neonatalDrugSafety: NeonatalDrugSafetyResult | null;
  hepaticSafety: HepaticDoseSafetyResult | null;
  hasDoacLock: boolean;
  hasPedRenalRisk: boolean;
  /** Çift sayımı önlemek için hangi legacy kalkanların interactionTierEngine tarafından zaten kapsandığını işaretler */
  dedupedFlags: {
    tripleWhammyCovered: boolean;
    serotoninCovered: boolean;
    hyperkalemiaCovered: boolean;
    cypStatinCovered: boolean;
    pregnancyCovered: boolean;
    neonatalCovered: boolean;
  };
  counts: UnifiedSafetyCounts;
}

function escapeHtml(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function canonicalPairKey(a: string, b: string): string {
  const x = String(a || '').trim().toUpperCase();
  const y = String(b || '').trim().toUpperCase();
  if (!x || !y || x === y) return '';
  return x < y ? `${x}:${y}` : `${y}:${x}`;
}

/**
 * Reçetedeki ham ilaç kayıtlarını katalog + uygulama yolu (DrugRouteCode) ile zenginleştirir.
 */
export function enrichSelectedDrugsForSafety(drugs: SelectedDrugItem[]): EnrichedSafetyDrug[] {
  if (!Array.isArray(drugs)) return [];
  return drugs.map(d => {
    const rawBrand = String(d.brand || d.brandName || d.name || '').trim();
    const rawAtc = String(d.atcCode || d.atc || '').trim().toUpperCase();
    const cat = findCatalogDrugSync({
      barcode: typeof d.barcode === 'string' ? d.barcode : undefined,
      brand: rawBrand || undefined,
      atc: rawAtc || undefined
    });
    const brand = rawBrand || cat?.brand || String(d.generic || 'İlaç');
    const rxFallback = (!rawAtc && !cat?.atcCode)
      ? resolveToRxNormConcept({ brand, generic: typeof d.generic === 'string' ? d.generic : undefined })
      : null;
    const generic = String(d.generic || cat?.generic || rxFallback?.displayNameEn || '').trim();
    const atcCode = rawAtc || String(cat?.atcCode || rxFallback?.atcCodes?.[0] || '').trim().toUpperCase();
    const route = inferDrugRoute({
      route: (d.route as string | undefined) || cat?.route,
      brand,
      atcCode
    });

    return {
      brand,
      name: brand,
      generic,
      atcCode,
      route,
      mealTiming: String(d.mealTiming || cat?.mealTiming || ''),
      mealTimingCode: Number(d.mealTimingCode ?? cat?.mealTimingCode ?? 0),
      drivingRisk: String(d.drivingRisk || cat?.drivingRisk || ''),
      drivingRiskCode: Number(d.drivingRiskCode ?? cat?.drivingRiskCode ?? 0),
      allergens: Array.isArray(d.allergens) && d.allergens.length > 0 ? d.allergens : (cat?.allergens || [])
    };
  });
}

/**
 * Tüm etkileşim, PDDI monograf, yığılma, organ dozajı ve DDInter motorlarını
 * tek bir tekilleştirilmiş ve senkronize sonuçta birleştirir.
 */
export function evaluateUnifiedPrescriptionSafety(
  drugs: SelectedDrugItem[],
  ctx: UnifiedSafetyContext = {}
): UnifiedSafetyResult {
  const enrichedDrugs = enrichSelectedDrugsForSafety(drugs);

  const isNeonate = Boolean(ctx.isNeonate || (typeof ctx.ageDays === 'number' && ctx.ageDays <= 28));
  const isPediatric = Boolean(
    isNeonate ||
    (typeof ctx.ageYears === 'number' && ctx.ageYears < 18) ||
    (typeof ctx.ageMonths === 'number' && ctx.ageMonths < 216)
  );
  const trimester = Number(ctx.trimester || 0);
  const isPregnant = Boolean(ctx.isPregnant || trimester > 0 || (typeof ctx.pregnancyWeeks === 'number' && ctx.pregnancyWeeks > 0));

  // 1. 4-Kademeli Etkileşim + Faz 1 Yığılma / Tisdale / Multi-CYP / Prodrug / NMBA / ONC-15 Motoru
  const interactions = evaluatePrescriptionInteractions(enrichedDrugs, {
    egfr: ctx.egfr ?? null,
    ageYears: ctx.ageYears ?? null,
    ageDays: ctx.ageDays ?? null,
    gestationalAgeWeeks: ctx.gestationalAgeWeeks ?? null,
    weightKg: ctx.weightKg ?? null,
    trimester,
    isPregnant,
    pregnancyWeeks: ctx.pregnancyWeeks ?? null,
    baselineK: ctx.baselineK ?? null,
    serumPotassiumMeqL: ctx.baselineK ?? null,
    baselineQtcMs: ctx.baselineQtcMs ?? null,
    hasAcuteMi: ctx.hasAcuteMi,
    hasSepsis: ctx.hasSepsis,
    hasHeartFailure: ctx.hasHeartFailure,
    childPughClass: ctx.childPughClass ?? null,
    diagnosis: ctx.diagnosis,
    recentDiscontinuedDrugs: ctx.recentDiscontinuedDrugs
  });

  // 2. W3C PDDI-CDS Kanıtlı Türkçe Monograflar (Faz 3 + Faz 4 dinamik organ yükseltmesi)
  const pddiMatches = evaluatePddiMonographsForPrescription(enrichedDrugs, {
    egfr: ctx.egfr ?? null,
    childPughClass: ctx.childPughClass ?? null,
    baselineK: ctx.baselineK ?? null,
    ageYears: ctx.ageYears ?? null
  });

  // 3. Organ / Özel Popülasyon Kalkanları (safetyPrescriptionEngine)
  const tripleWhammy = detectTripleWhammy(enrichedDrugs);
  const serotoninSyndrome = checkSerotoninSyndrome(enrichedDrugs);
  const hyperkalemiaRisk = checkHyperkalemiaRisk(enrichedDrugs, {
    egfr: ctx.egfr ?? null,
    ageYears: ctx.ageYears ?? null,
    baselineK: ctx.baselineK ?? null
  });
  const cypStatinInteraction = checkCypStatinInteraction(enrichedDrugs);

  const hasDoacInSelected = enrichedDrugs.some(d => identifyRenalDrugCategory(d).category === 'DOAC_COCKCROFT_MANDATORY');
  const scrVal = typeof ctx.serumCreatinineMgDl === 'number' && !Number.isNaN(ctx.serumCreatinineMgDl) ? ctx.serumCreatinineMgDl : null;
  const hasDoacLock = hasDoacInSelected && (!ctx.egfr && scrVal === null);
  const hasPedRenalRisk = !ctx.egfr && isPediatric && scrVal !== null && scrVal > 1.2 && !ctx.heightCm;

  const renalAdjustments = ctx.egfr
    ? checkRenalDoseAdjustments({
        egfr: ctx.egfr,
        ageYears: ctx.ageYears ?? null,
        gender: ctx.gender ?? null,
        heightCm: ctx.heightCm ?? null,
        weightKg: ctx.weightKg ?? null,
        serumCreatinineMgDl: scrVal,
        drugs: enrichedDrugs
      })
    : null;

  const pregnancySafety = isPregnant
    ? checkPregnancySafety(enrichedDrugs, {
        trimester,
        gestationalWeeks: ctx.pregnancyWeeks ?? undefined
      })
    : null;

  const neonatalDrugSafety = isNeonate && typeof ctx.ageDays === 'number'
    ? checkNeonatalDrugSafety(enrichedDrugs, { ageDays: ctx.ageDays })
    : null;

  const hepaticSafety = ctx.childPughClass
    ? checkHepaticDoseSafety(enrichedDrugs, {
        childPughClass: ctx.childPughClass,
        childPughScore: ctx.childPughScore ?? undefined,
        meldScore: ctx.meldScore ?? null
      })
    : null;

  // 4. Tekilleştirme Haritası: interactionTierEngine + pddiMonographs tarafından kapsanan ATC çiftleri
  const tierCoveredPairs = new Set<string>();
  const ruleIds = new Set<string>();

  for (const alert of (interactions.alerts || [])) {
    ruleIds.add(alert.ruleId);
    // Tier 1-2 kuralları VE açık RKÇ downgrade kuralları (ACORN VPT: DDI_VAN_TZP_001) DDInter 2.0'ın eski/jenerik uyarısını bastırır
    const suppressesDdinter = alert.tier === 1 || alert.tier === 2 || alert.ruleId === 'DDI_VAN_TZP_001';
    if (!suppressesDdinter) continue;
    const involvedAtcs: string[] = [];
    for (const inv of (alert.involvedDrugs || [])) {
      const rawName = String(inv.raw || '').toLowerCase();
      const concept = inv.canonicalKey ? getRxNormConceptByKey(inv.canonicalKey) : null;
      const resolvedAtcs: string[] = concept?.atcCodes || [];
      const match = enrichedDrugs.find(s =>
        s.brand.toLowerCase() === rawName ||
        (s.generic && s.generic.toLowerCase() === rawName) ||
        (s.atcCode && resolvedAtcs.some(c => c.toUpperCase() === s.atcCode))
      );
      if (match?.atcCode) involvedAtcs.push(match.atcCode);
      else if (resolvedAtcs[0]) involvedAtcs.push(resolvedAtcs[0].toUpperCase());
    }
    for (let i = 0; i < involvedAtcs.length; i++) {
      for (let j = i + 1; j < involvedAtcs.length; j++) {
        const key = canonicalPairKey(involvedAtcs[i], involvedAtcs[j]);
        if (key) tierCoveredPairs.add(key);
      }
    }
  }

  const existingCoveredPairsForDdinter = new Set<string>(tierCoveredPairs);
  let uniqueActionablePddi = 0;
  let uniqueMonitoringPddi = 0;
  let hasPddiCritical = false;

  for (const pm of pddiMatches) {
    const key = canonicalPairKey(pm.atcA, pm.atcB);
    if (key) existingCoveredPairsForDdinter.add(key);
    if (pm.escalatedTier === 'X') hasPddiCritical = true;
    const alreadyInTier = key ? tierCoveredPairs.has(key) : false;
    if (!alreadyInTier) {
      if (pm.escalatedTier === 'X' || pm.escalatedTier === 'D') uniqueActionablePddi++;
      else uniqueMonitoringPddi++;
    }
  }

  // 5. DDInter 2.0 (Tier 1-2 kuralları ve W3C PDDI-CDS monograflarıyla tekilleştirilmiş!)
  const ddiMatrix = evaluateDdiMatrixForPrescription(enrichedDrugs, {
    existingCoveredPairs: existingCoveredPairsForDdinter,
    isPediatricOrNeonate: isPediatric
  });

  // Faz 3 Doz Kuralı: Transdermal selejilin <9 mg/24s ise tiramin gıda uyarısını bastır
  if (interactions.suppressTyramineFoodWarning && ddiMatrix.counseling?.foods) {
    const before = ddiMatrix.counseling.foods.length;
    ddiMatrix.counseling.foods = ddiMatrix.counseling.foods.filter(
      f => !/tyramin|tiramin/i.test(`${f.foodKey} ${f.foodLabelTr}`)
    );
    ddiMatrix.counseling.totalSignals = Math.max(
      0,
      ddiMatrix.counseling.totalSignals - (before - ddiMatrix.counseling.foods.length)
    );
  }

  // Eksik laboratuvar bağlam tespiti (çevrimdışı missing_context_fallback — Faz 4)
  const missingLabs: Array<{ labelTr: string; loincCode: string | null }> = [];
  if (ctx.egfr === null || ctx.egfr === undefined) {
    missingLabs.push({ labelTr: 'eGFR (CKD-EPI)', loincCode: '98979-8' });
  }
  if (ctx.baselineK === null || ctx.baselineK === undefined) {
    missingLabs.push({ labelTr: 'Serum Potasyum (K⁺)', loincCode: '2823-3' });
  }
  if (ctx.baselineQtcMs === null || ctx.baselineQtcMs === undefined) {
    missingLabs.push({ labelTr: '12-Lead EKG / QTc Fridericia', loincCode: '76634-5' });
  }

  // 6. Legacy kalkan çift-sayım bayrakları (gerçek interactionTierEngine ruleId'leriyle %100 hizalı)
  const hasTierPreg = Array.from(ruleIds).some(id => id.startsWith('PREG_') || id.startsWith('DDI_PREGNANCY_'));
  const hasTierNeo = Array.from(ruleIds).some(id => id.startsWith('NEO_') || id.startsWith('DDI_NEONATAL_'));
  // Gebelikte statin veya tetrasiklin gibi Tier 1'de ayrı kuralı olmayan ilaçlar varsa legacy pregnancySafety gizlenmez
  const pregAlertDrugsOutsideTier = (pregnancySafety?.alerts || []).some(a => {
    const n = String(a.drugName || '').toLowerCase();
    return n.includes('statin') || n.includes('tetrasiklin') || n.includes('doksisiklin');
  });
  // Hiperkalemi: TMP-SMX + RAAS/Spironolakton kuralı safetyPrescriptionEngine'dedir; K-tuzu+K-tutucu Tier 1'de yakalandığında TMP-SMX varsa gizleme
  const hasTmpSmxHyperK = Boolean(
    hyperkalemiaRisk.riskFactorsIdentified?.some(r => /trimetoprim|bactrim|tmp-?smx/i.test(r))
  );
  const dedupedFlags = {
    tripleWhammyCovered: ruleIds.has('DDI_TRIPLE_WHAMMY_001'),
    serotoninCovered: ruleIds.has('DDI_SERO_MAOI_001') || ruleIds.has('DDI_SEROTONIN_MAOI_001'),
    hyperkalemiaCovered: (ruleIds.has('DDI_K_SPARING_K_SUPP_001') || ruleIds.has('DDI_K_SPARING_K_SUPP_002') || ruleIds.has('DDI_HYPERKALEMIA_001')) && !hasTmpSmxHyperK,
    cypStatinCovered: ruleIds.has('DDI_STATIN_CYP3A4_001') || ruleIds.has('DDI_CYP3A4_STATIN_001'),
    pregnancyCovered: hasTierPreg && !pregAlertDrugsOutsideTier,
    neonatalCovered: hasTierNeo
  };

  // 7. Deterministik ve %100 Senkronize Sayım
  const tier1Alerts = interactions.alerts.filter(a => a.tier === 1);
  const tier2Alerts = interactions.alerts.filter(a => a.tier === 2);
  const tier3Alerts = interactions.alerts.filter(a => a.tier === 3);
  const tier4Alerts = interactions.alerts.filter(a => a.tier === 4);

  const organShieldCount =
    (hasDoacLock ? 1 : 0) +
    (hasPedRenalRisk ? 1 : 0) +
    (renalAdjustments?.alertsCount || 0) +
    (hepaticSafety?.alertsCount || 0) +
    (!dedupedFlags.pregnancyCovered ? (pregnancySafety?.alertsCount || 0) : 0) +
    (!dedupedFlags.neonatalCovered ? (neonatalDrugSafety?.alertsCount || 0) : 0) +
    (!dedupedFlags.tripleWhammyCovered && (tripleWhammy.isTripleWhammy || tripleWhammy.isDoubleRisk) ? 1 : 0) +
    (!dedupedFlags.serotoninCovered && serotoninSyndrome.isHighRisk ? 1 : 0) +
    (!dedupedFlags.hyperkalemiaCovered && hyperkalemiaRisk.isAtRisk ? 1 : 0) +
    (!dedupedFlags.cypStatinCovered && cypStatinInteraction.hasInteraction ? 1 : 0);

  const ddinterExtra = ddiMatrix.curatedAlerts.length + ddiMatrix.majorAlerts.length;
  const duplications = ddiMatrix.duplications.length;

  const pddiTierXCount = pddiMatches.filter(m => m.escalatedTier === 'X' && !tierCoveredPairs.has(canonicalPairKey(m.atcA, m.atcB))).length;
  const pddiTierDCount = pddiMatches.filter(m => m.escalatedTier === 'D' && !tierCoveredPairs.has(canonicalPairKey(m.atcA, m.atcB))).length;

  const hasCritical = Boolean(
    interactions.hasHardStop ||
    hasPddiCritical ||
    hasDoacLock ||
    hasPedRenalRisk ||
    ddiMatrix.curatedAlerts.some(a => a.severity === 'K') ||
    tripleWhammy.isTripleWhammy ||
    serotoninSyndrome.severity === 'CRITICAL' ||
    hyperkalemiaRisk.severity === 'CRITICAL' ||
    cypStatinInteraction.severity === 'CRITICAL' ||
    renalAdjustments?.hasContraindication ||
    pregnancySafety?.hasSevereFetalRisk ||
    neonatalDrugSafety?.hasContraindication ||
    hepaticSafety?.hasContraindication
  );

  const totalActionable =
    tier1Alerts.length +
    tier2Alerts.length +
    uniqueActionablePddi +
    organShieldCount +
    ddinterExtra +
    duplications;

  const totalMonitoring =
    tier3Alerts.length +
    tier4Alerts.length +
    uniqueMonitoringPddi +
    ddiMatrix.moderateAlerts.length;

  return {
    enrichedDrugs,
    interactions,
    tisdaleQtcScore: interactions.tisdaleQtcScore,
    janusmedProfile: interactions.janusmedProfile,
    missingLabs,
    pddiMatches,
    uniquePddiCount: uniqueActionablePddi + uniqueMonitoringPddi,
    ddiMatrix,
    tripleWhammy,
    serotoninSyndrome,
    hyperkalemiaRisk,
    cypStatinInteraction,
    renalAdjustments,
    pregnancySafety,
    neonatalDrugSafety,
    hepaticSafety,
    hasDoacLock,
    hasPedRenalRisk,
    dedupedFlags,
    counts: {
      tier1: tier1Alerts.length + pddiTierXCount,
      tier2: tier2Alerts.length + pddiTierDCount,
      tier3: tier3Alerts.length,
      tier4: tier4Alerts.length,
      pddiMonographs: pddiMatches.length,
      duplications,
      organShields: organShieldCount,
      ddinterExtra,
      totalActionable,
      totalMonitoring,
      hasCritical
    }
  };
}

// ============================================================================
// PAYLAŞIMLI HTML RENDER YARDIMCILARI (Ana Panel & Reçete Modalı %100 Senkron)
// ============================================================================

function renderCdsSuggestionsBarHTML(suggestions: CdsHookActionSuggestion[]): string {
  if (!suggestions || suggestions.length === 0) return '';
  return `
    <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10" data-cds-suggestions="true">
      ${suggestions.map(s => {
        const cls = s.actionType === 'SWITCH_ALTERNATIVE'
          ? 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border-emerald-500/70 font-semibold'
          : s.actionType === 'REMOVE_DRUG'
            ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-200 border-rose-500/70 font-semibold'
            : 'bg-sky-950/90 hover:bg-sky-900 text-sky-200 border-sky-500/70';
        return `<button type="button" class="btn-cds-action btn-compact px-2 py-0.5 rounded border text-[0.6875rem] transition-colors ${cls}" data-cds-action="${escapeHtml(s.actionType)}" data-target-key="${escapeHtml(s.targetDrugKey || '')}" data-target-brand="${escapeHtml(s.targetDrugBrand || '')}" data-target-atc="${escapeHtml(s.targetDrugAtc || '')}" data-rep-brand="${escapeHtml(s.replacementBrand || '')}" data-rep-generic="${escapeHtml(s.replacementGeneric || '')}" data-rep-atc="${escapeHtml(s.replacementAtc || '')}" data-lab-order="${escapeHtml(s.labOrderText || '')}">${escapeHtml(s.labelTr)}</button>`;
      }).join('')}
    </div>
  `;
}

/**
 * Tek bakışta etkileşim özeti + Tisdale QTc (RISQ-PATH/Fridericia kalibrasyonlu) + Janusmed 9-Alanlı Risk Profili Şeridi.
 */
export function renderQuickSafetySummaryHTML(res: UnifiedSafetyResult): string {
  const { counts, tisdaleQtcScore, janusmedProfile } = res;
  const hasElevatedJanusmed = Boolean(janusmedProfile && janusmedProfile.elevatedDomains.length > 0);
  if (counts.totalActionable === 0 && counts.totalMonitoring === 0 && (!tisdaleQtcScore || tisdaleQtcScore.score < 7) && !hasElevatedJanusmed) {
    return '';
  }

  const tisdalePill = tisdaleQtcScore && tisdaleQtcScore.score > 0
    ? (() => {
        const cls = tisdaleQtcScore.riskTier === 'HIGH'
          ? 'bg-rose-950/80 text-rose-200 border-rose-500/80 font-bold'
          : tisdaleQtcScore.riskTier === 'MODERATE'
            ? 'bg-amber-950/80 text-amber-200 border-amber-500/80 font-semibold'
            : 'bg-slate-800/80 text-slate-300 border-slate-700';
        const label = tisdaleQtcScore.riskTier === 'HIGH' ? 'Yüksek' : tisdaleQtcScore.riskTier === 'MODERATE' ? 'Orta' : 'Düşük';
        const breakdownStr = [
          ...tisdaleQtcScore.breakdown.filter(b => b.active).map(b => `${b.criterion} (+${b.points})`),
          tisdaleQtcScore.nonCardiologySpecificityNoteTr
        ].join(' | ');
        return `<span class="px-2 py-0.5 rounded border text-[0.6875rem] font-mono ${cls}" title="${escapeHtml(breakdownStr)}">Tisdale QTc: ${tisdaleQtcScore.score}/21 (${label}) · Fridericia 76634-5</span>`;
      })()
    : '';

  const janusmedStrip = hasElevatedJanusmed && janusmedProfile
    ? `
      <div class="w-full pt-1.5 mt-1 border-t border-slate-800/80 flex flex-wrap items-center gap-1" data-janusmed-strip="true">
        <span class="text-[0.6875rem] font-bold text-violet-300 uppercase tracking-wide mr-1">Janusmed 9-Alan PD Yükü:</span>
        ${janusmedProfile.elevatedDomains.map(d => {
          const pillCls = d.level === 'HIGH'
            ? 'bg-rose-950/80 text-rose-200 border-rose-500/75 font-bold'
            : 'bg-amber-950/70 text-amber-200 border-amber-500/70 font-semibold';
          return `<span class="px-1.5 py-0.5 rounded border text-[0.6875rem] font-mono ${pillCls}" title="${escapeHtml(d.drugs.join(' + '))} (Eşik: ≥${d.threshold}, ${d.aggregation === 'MAX' ? 'Maks tekil skor' : 'Kümülatif toplam'})">${escapeHtml(d.labelTr)}: ${d.score}p</span>`;
        }).join('')}
      </div>
    `
    : '';

  return `
    <div class="p-2 rounded-lg bg-slate-950/75 border border-slate-700/80 flex flex-wrap items-center justify-between gap-1.5 text-[0.75rem]">
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="font-bold text-sky-300 uppercase tracking-wide text-[0.6875rem]">Hızlı Etkileşim Özeti</span>
        ${counts.tier1 > 0 ? `<span class="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-200 border border-rose-600/80 font-bold text-[0.6875rem]">Kritik: ${counts.tier1}</span>` : ''}
        ${counts.tier2 > 0 ? `<span class="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-200 border border-amber-600/80 font-semibold text-[0.6875rem]">Önemli: ${counts.tier2}</span>` : ''}
        ${counts.organShields > 0 ? `<span class="px-1.5 py-0.5 rounded bg-fuchsia-950/70 text-fuchsia-200 border border-fuchsia-600/70 text-[0.6875rem]">Organ/Popülasyon: ${counts.organShields}</span>` : ''}
        ${counts.duplications > 0 ? `<span class="px-1.5 py-0.5 rounded bg-orange-950/70 text-orange-200 border border-orange-600/70 text-[0.6875rem]">Duplikasyon: ${counts.duplications}</span>` : ''}
        ${counts.pddiMonographs > 0 ? `<span class="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-200 border border-emerald-600/70 text-[0.6875rem]">Kanıtlı Monograf: ${counts.pddiMonographs}</span>` : ''}
        ${counts.totalMonitoring > 0 ? `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[0.6875rem]">İzlem: ${counts.totalMonitoring}</span>` : ''}
      </div>
      ${tisdalePill}
      ${janusmedStrip}
    </div>
  `;
}

/**
 * Russ (2014) Kaydırmasız (No-Scroll) 4-Hücreli Tablosal Tier 1/2 Uyarı Kartı + CDS Hooks Aksiyonları.
 */
export function renderTier12ActionCardHTML(
  a: InteractionAlert,
  missingLabs: Array<{ labelTr: string; loincCode: string | null }> = []
): string {
  const isTier1 = a.tier === 1;
  const boxCls = isTier1
    ? 'bg-rose-950/70 border-2 border-rose-500/90 text-rose-100'
    : 'bg-amber-950/60 border border-amber-500/85 text-amber-100';
  const tierChipCls = isTier1
    ? 'bg-rose-900/90 text-rose-100 border-rose-400'
    : 'bg-amber-900/90 text-amber-100 border-amber-400';
  const tilsonLabel = isTier1 ? 'HARD STOP (X)' : 'GEREKÇELİ KESİNTİLİ (D)';

  const mechBadge = classifyPharmacologicBadge({
    ruleId: a.ruleId,
    text: `${a.alertTitle} ${a.mechanism} ${a.involvedDrugs.map(d => d.canonicalKey).join(' ')}`
  });

  const primaryAction = (a.recommendations && a.recommendations[0]) || a.message;
  const onsetHint = /washout|arınma|14 gün|35 gün|5–7 gün/i.test(`${a.ruleId} ${a.message}`)
    ? 'Arınma / Geç Başlangıç Penceresi'
    : /indük|induction/i.test(a.mechanism)
      ? 'Başlangıç 7–14g · De-indüksiyon 14g'
      : 'Anlık – 72 saat (ilk dozdan itibaren)';
  const contextHint = missingLabs.length > 0
    ? `Eksik bağlam: ${missingLabs.slice(0, 2).map(l => l.labelTr).join(', ')}`
    : 'Temel organ/lab bağlamı mevcut';

  const inv0 = a.involvedDrugs?.[0];
  const inv1 = a.involvedDrugs?.[1];
  const suggestions = buildCdsHookSuggestions({
    cardId: a.ruleId,
    drugAKey: inv0?.canonicalKey,
    drugABrand: inv0?.raw,
    drugBKey: inv1?.canonicalKey,
    drugBBrand: inv1?.raw,
    missingLabs
  });

  return `
    <div class="p-2.5 rounded-lg ${boxCls} text-xs space-y-1.5" data-cds-card="no-scroll" data-rule-id="${escapeHtml(a.ruleId)}">
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <span class="font-bold text-white leading-snug">${escapeHtml(a.alertTitle)}</span>
        <div class="flex flex-wrap items-center gap-1">
          ${mechBadge ? `<span class="px-1.5 py-0.5 rounded border text-[0.625rem] font-bold ${mechBadge.cssClass}">${escapeHtml(mechBadge.labelTr)}</span>` : ''}
          <span class="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded border ${tierChipCls}">${tilsonLabel}</span>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[0.75rem]">
        <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
          <div class="text-[0.625rem] uppercase tracking-wider font-bold text-emerald-300">Önerilen Eylem</div>
          <div class="text-white leading-snug">${escapeHtml(primaryAction)}</div>
        </div>
        <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
          <div class="text-[0.625rem] uppercase tracking-wider font-bold text-sky-300">Kanıt / Kılavuz</div>
          <div class="text-slate-200 leading-snug">${escapeHtml(a.evidenceLevel)}</div>
        </div>
        <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
          <div class="text-[0.625rem] uppercase tracking-wider font-bold text-amber-300">Başlangıç / Arınma</div>
          <div class="text-slate-200 leading-snug">${escapeHtml(onsetHint)}</div>
        </div>
        <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
          <div class="text-[0.625rem] uppercase tracking-wider font-bold text-cyan-300">Hasta Bağlamı &amp; Eksik Lab</div>
          <div class="text-slate-200 leading-snug">${escapeHtml(contextHint)}</div>
        </div>
      </div>
      ${renderCdsSuggestionsBarHTML(suggestions)}
      <details class="pt-0.5">
        <summary class="text-[0.6875rem] text-sky-300 hover:underline cursor-pointer select-none font-mono">Klinik Mekanizma &amp; Kaynak Detayı (${escapeHtml(a.ruleId)})</summary>
        <div class="mt-1 p-2 rounded bg-slate-950/75 border border-slate-800 space-y-1 text-[0.75rem] text-slate-200 leading-relaxed">
          <div>${escapeHtml(a.message)}</div>
          <div class="text-slate-400"><strong>Mekanizma:</strong> ${escapeHtml(a.mechanism)}</div>
          <div class="text-[0.6875rem] font-mono text-slate-400">Kaynak: ${escapeHtml(a.guidelineSource)}</div>
        </div>
      </details>
    </div>
  `;
}

/**
 * W3C PDDI-CDS kanıtlı Türkçe monograf kartları (Russ 2014 no-scroll 4-hücreli tablo + Tilson 3 davranış + CDS Hooks butonları).
 */
export function renderPddiMonographsHTML(
  matches: PddiMonographMatch[],
  missingLabs: Array<{ labelTr: string; loincCode: string | null }> = []
): string {
  if (!matches || matches.length === 0) return '';

  // Tilson (2016) 3 görsel davranış: X = Hard Stop (critical), D = Gerekçeli Kesintili (warning), C/B = Pasif Akordeon (info), A = Tam bastırma
  const visibleMatches = matches.filter(m => m.escalatedTier !== 'A');
  const majorMatches = visibleMatches.filter(m => m.escalatedTier === 'X' || m.escalatedTier === 'D');
  const monitorMatches = visibleMatches.filter(m => m.escalatedTier === 'C' || m.escalatedTier === 'B');

  const renderCard = (m: PddiMonographMatch): string => {
    const mono = m.monograph;
    const isX = m.escalatedTier === 'X';
    const isD = m.escalatedTier === 'D';
    const boxCls = isX
      ? 'bg-rose-950/65 border-2 border-rose-500/85 text-rose-100'
      : isD
        ? 'bg-amber-950/55 border border-amber-500/80 text-amber-100'
        : 'bg-sky-950/35 border border-sky-700/60 text-sky-100';
    const badgeCls = isX
      ? 'bg-rose-900/90 text-rose-100 border-rose-400'
      : isD
        ? 'bg-amber-900/90 text-amber-100 border-amber-400'
        : 'bg-sky-900/80 text-sky-200 border-sky-500';
    const tierLabel = isX ? 'HARD STOP (X)' : isD ? 'KAÇIN / DEĞİŞTİR (D)' : `PASİF İZLEM (${m.escalatedTier})`;

    const mechBadge = classifyPharmacologicBadge({
      categories: mono.interaction_category,
      pairKey: mono.canonical_pair_key,
      text: `${mono.mechanism_tr} ${mono.recommended_action_tr}`
    });

    const escHtml = m.escalationNotes.length > 0
      ? `<div class="px-2 py-1 rounded bg-rose-900/50 border border-rose-500/60 text-[0.75rem] text-rose-100 font-semibold">Bağlamsal Yükseltme: ${escapeHtml(m.escalationNotes.join(' '))}</div>`
      : '';

    const gradeBadgeLabel = mono.liverpool_grade_level || mono.evidence_level.toUpperCase();
    const onsetText = mono.interaction_category.includes('CYP_INDUCTION')
      ? 'Başlangıç 7–14 gün · De-indüksiyon 14 gün'
      : mono.route_scope === 'ORAL_GI_ONLY'
        ? 'Oral emilim penceresi (anlık)'
        : 'Başlangıç 1–72 saat · Arınma yarı ömre bağlı';
    const firstMon = mono.monitoring_parameters?.[0];
    const contextCellText = m.escalationNotes.length > 0
      ? m.escalationNotes[0]
      : (firstMon
        ? `${firstMon.parameter_tr} (${firstMon.loinc_code ? `LOINC ${firstMon.loinc_code}` : 'Cihaz/Klinik'}: ${firstMon.critical_threshold})`
        : (missingLabs[0] ? `Eksik lab: ${missingLabs[0].labelTr}` : 'Standart izlem'));

    const cardMissingLabs = firstMon
      ? [{ labelTr: firstMon.parameter_tr, loincCode: firstMon.loinc_code }]
      : missingLabs;
    const suggestions = buildCdsHookSuggestions({
      cardId: mono.monograph_id,
      drugAKey: mono.drug_a_en,
      drugABrand: m.drugABrand,
      drugAAtc: m.atcA,
      drugBKey: mono.drug_b_en,
      drugBBrand: m.drugBBrand,
      drugBAtc: m.atcB,
      missingLabs: cardMissingLabs
    });

    const loincHtml = (mono.monitoring_parameters || []).length > 0
      ? `<div class="flex flex-wrap gap-1 pt-0.5">${mono.monitoring_parameters.slice(0, 4).map(p => {
          const codeLabel = p.loinc_code ? `LOINC ${p.loinc_code}` : 'Klinik/Cihaz İzlemi';
          const unitSuffix = p.ucum_unit ? ` (${p.ucum_unit})` : '';
          return `<span class="px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[0.6875rem] font-mono text-cyan-200" title="${escapeHtml(p.timing_tr)}">${escapeHtml(p.parameter_tr)} [${escapeHtml(codeLabel)}${escapeHtml(unitSuffix)}]: ${escapeHtml(p.critical_threshold)}</span>`;
        }).join('')}</div>`
      : '';

    const quotesHtml = (mono.source_assertions || []).length > 0
      ? `
        <details class="pt-1">
          <summary class="text-[0.6875rem] text-sky-300 hover:underline cursor-pointer select-none font-mono">
            Katman 2 Detay: Mekanizma, NNH &amp; Birebir Kaynak Alıntısı (${mono.source_assertions.length} kaynak • GRADE: ${escapeHtml(gradeBadgeLabel)})
          </summary>
          <div class="mt-1 space-y-1.5 text-[0.6875rem] text-slate-300 bg-slate-950/75 p-2 rounded border border-slate-800">
            <div><strong class="text-slate-100">Mekanizma:</strong> ${escapeHtml(mono.mechanism_tr)}</div>
            <div><strong class="text-slate-100">Epidemiyoloji / NNH:</strong> ${escapeHtml(mono.frequency_of_harm)}</div>
            ${mono.alternative_tr ? `<div class="text-emerald-200"><strong>Alternatif:</strong> ${escapeHtml(mono.alternative_tr)}</div>` : ''}
            ${loincHtml}
            ${mono.source_assertions.map(sa => `
              <div>
                <span class="font-mono text-emerald-300">[${escapeHtml(sa.source_type)} • ${escapeHtml(sa.section)} • ${escapeHtml(sa.version_date)}]</span>
                <span class="text-slate-400"> (${escapeHtml(sa.original_rating)}):</span>
                <span class="italic text-slate-200"> "${escapeHtml(sa.source_quote_verbatim)}"</span>
              </div>
            `).join('')}
          </div>
        </details>
      `
      : '';

    return `
      <div class="p-2.5 rounded-lg ${boxCls} text-xs space-y-1.5" data-cds-card="no-scroll" data-monograph-id="${escapeHtml(mono.monograph_id)}">
        <div class="flex flex-wrap items-center justify-between gap-1.5">
          <span class="font-bold text-white leading-snug">${escapeHtml(mono.summary)}</span>
          <div class="flex flex-wrap items-center gap-1">
            ${mechBadge ? `<span class="px-1.5 py-0.5 rounded border text-[0.625rem] font-bold ${mechBadge.cssClass}">${escapeHtml(mechBadge.labelTr)}</span>` : ''}
            <span class="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded border ${badgeCls}">${tierLabel}</span>
          </div>
        </div>
        ${escHtml}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[0.75rem]">
          <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
            <div class="text-[0.625rem] uppercase tracking-wider font-bold text-emerald-300">Önerilen Eylem</div>
            <div class="text-white leading-snug">${escapeHtml(mono.primary_directive_tr || mono.recommended_action_tr)}</div>
          </div>
          <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
            <div class="text-[0.625rem] uppercase tracking-wider font-bold text-sky-300">Kanıt / DRIVE-GRADE</div>
            <div class="text-slate-200 leading-snug font-mono">${escapeHtml(gradeBadgeLabel)} · ${mono.source_assertions.length} resmi kaynak</div>
          </div>
          <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
            <div class="text-[0.625rem] uppercase tracking-wider font-bold text-amber-300">Başlangıç / Arınma</div>
            <div class="text-slate-200 leading-snug">${escapeHtml(onsetText)}</div>
          </div>
          <div class="p-1.5 rounded bg-slate-950/60 border border-white/10">
            <div class="text-[0.625rem] uppercase tracking-wider font-bold text-cyan-300">Hasta Bağlamı &amp; Eksik Lab</div>
            <div class="text-slate-200 leading-snug">${escapeHtml(contextCellText)}</div>
          </div>
        </div>
        ${renderCdsSuggestionsBarHTML(suggestions)}
        ${quotesHtml}
      </div>
    `;
  };

  const majorHtml = majorMatches.map(renderCard).join('');
  const monitorHtml = monitorMatches.length > 0
    ? `
      <details class="rounded-lg border border-sky-700/50 bg-sky-950/20 overflow-hidden group">
        <summary class="px-2.5 py-2 cursor-pointer select-none flex items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden text-sky-200 font-semibold text-xs hover:bg-sky-950/35">
          <span>${monitorMatches.length} Kanıtlı PDDI Pasif İzlem Monografı (Kademe C/B) — İncele</span>
          <span class="text-sky-300 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div class="px-2 pb-2 pt-1.5 border-t border-sky-800/40 space-y-1.5 max-h-60 overflow-y-auto">
          ${monitorMatches.map(renderCard).join('')}
        </div>
      </details>
    `
    : '';

  return `${majorHtml}${monitorHtml}`;
}

/**
 * Marcilly (2018) & CHK-16 uyumlu Kodlu Geçersiz Kılma (Override) Çubuğu (Hard Stop X için).
 */
export function renderCodedOverrideBarHTML(
  res: UnifiedSafetyResult,
  activeOverride?: { code: string; display: string; note?: string } | null
): string {
  if (!res.counts.hasCritical) return '';
  const topRule = res.interactions.alerts.find(a => a.tier === 1)?.ruleId
    || res.pddiMatches.find(m => m.escalatedTier === 'X')?.monograph.monograph_id
    || 'CRITICAL_SAFETY_LOCK';
  const pairLabel = res.enrichedDrugs.map(d => d.brand.split(' ')[0]).slice(0, 3).join(' + ');

  if (activeOverride) {
    return `
      <div class="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/75 text-emerald-100 text-xs flex flex-wrap items-center justify-between gap-2" data-override-status="unlocked">
        <div>
          <strong class="text-emerald-300">Kodlu Geçersiz Kılma Kaydedildi:</strong>
          <span class="font-mono px-1.5 py-0.5 rounded bg-emerald-900/80 border border-emerald-500/60 ml-1">${escapeHtml(activeOverride.display)}</span>
          ${activeOverride.note ? `<span class="text-slate-300 ml-1.5">(${escapeHtml(activeOverride.note)})</span>` : ''}
        </div>
        <button type="button" class="btn-clear-cds-override btn-compact px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-[0.6875rem]">Kilidi Geri Al</button>
      </div>
    `;
  }

  return `
    <div class="p-2.5 rounded-xl bg-rose-950/75 border-2 border-rose-500 text-rose-100 text-xs space-y-2" data-override-status="locked" data-override-rule="${escapeHtml(topRule)}" data-override-pair="${escapeHtml(pairLabel)}">
      <div class="flex flex-wrap items-center justify-between gap-1">
        <span class="font-bold text-rose-200 uppercase tracking-wide text-[0.6875rem]">Hard Stop (X) — Yazdırma İçin Kodlu Gerekçe Seçiniz</span>
        <span class="text-[0.6875rem] font-mono text-rose-300">Marcilly 2018 · Yerel Denetim Günlüğü</span>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        ${CODED_OVERRIDE_REASONS.map(r => `
          <button type="button" class="btn-cds-override btn-compact px-2.5 py-1 rounded-md bg-rose-900/80 hover:bg-rose-800 text-white border border-rose-400/80 font-semibold text-[0.75rem] transition-colors" data-override-code="${escapeHtml(r.code)}" data-override-display="${escapeHtml(r.display)}">${escapeHtml(r.display)}</button>
        `).join('')}
        <input type="text" id="input-cds-override-note" placeholder="Kısa klinik not (isteğe bağlı)" class="flex-1 min-w-[160px] h-7 px-2 rounded bg-slate-950/90 border border-rose-700/70 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-400">
      </div>
    </div>
  `;
}

/**
 * Tier 3 & Tier 4 (ACORN VPT dahil) uyarılarını gürültü yaratmadan katlanabilir şeritte sunar.
 */
export function renderTier34CollapsibleHTML(alerts: InteractionAlert[]): string {
  const lowAlerts = (alerts || []).filter(a => a.tier === 3 || a.tier === 4);
  if (lowAlerts.length === 0) return '';

  return `
    <details class="rounded-lg border border-slate-700/70 bg-slate-900/45 overflow-hidden group">
      <summary class="px-2.5 py-2 cursor-pointer select-none flex items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden text-slate-200 font-semibold text-xs hover:bg-slate-800/50">
        <span>${lowAlerts.length} İzlem / Bilgilendirme Uyarısı (Tier 3–4) — İncele</span>
        <span class="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div class="px-2.5 pb-2.5 pt-1.5 border-t border-slate-800/70 space-y-1.5">
        ${lowAlerts.map(a => `
          <div class="p-2 rounded border ${a.tier === 3 ? 'bg-yellow-950/30 border-yellow-700/50 text-yellow-100' : 'bg-cyan-950/30 border-cyan-800/60 text-cyan-100'} text-xs space-y-0.5">
            <div class="flex items-center justify-between gap-1 font-semibold">
              <span>${escapeHtml(a.alertTitle)}</span>
              <span class="text-[0.6875rem] font-mono opacity-80">${escapeHtml(a.ruleId)}</span>
            </div>
            <div class="leading-relaxed opacity-90">${escapeHtml(a.message)}</div>
          </div>
        `).join('')}
      </div>
    </details>
  `;
}

/**
 * Reçete yazdırma modalı için ana güvenlik paneliyle %100 senkronize tek birleşik banner üretir.
 */
export function renderUnifiedModalSafetyBannerHTML(
  res: UnifiedSafetyResult,
  activeOverride?: { code: string; display: string; note?: string } | null
): string {
  const { counts, interactions, pddiMatches, ddiMatrix } = res;
  if (counts.totalActionable === 0 && counts.totalMonitoring === 0) return '';

  const blocks: string[] = [];
  const summaryStrip = renderQuickSafetySummaryHTML(res);
  if (summaryStrip) blocks.push(summaryStrip);

  const overrideBar = renderCodedOverrideBarHTML(res, activeOverride);
  if (overrideBar) blocks.push(overrideBar);

  const tier12 = interactions.alerts.filter(a => a.tier === 1 || a.tier === 2);
  for (const a of tier12) {
    blocks.push(renderTier12ActionCardHTML(a, res.missingLabs));
  }

  const pddiHtml = renderPddiMonographsHTML(pddiMatches, res.missingLabs);
  if (pddiHtml) blocks.push(pddiHtml);

  // Tekilleştirilmiş organ & özel popülasyon kalkanları
  if (res.hasDoacLock) {
    blocks.push(`
      <div class="p-2.5 rounded-xl bg-rose-950/70 border border-rose-600 text-rose-200 text-xs">
        <div class="font-bold text-rose-300">DOAC RENAL GÜVENLİK KİLİDİ</div>
        <div>DOAC reçetelerinde Cockcroft-Gault CrCl / eGFR kontrolü zorunludur. Lütfen serum kreatinin giriniz.</div>
      </div>
    `);
  }
  if (res.renalAdjustments && (res.renalAdjustments.alertsCount ?? 0) > 0) {
    blocks.push(`
      <div class="p-2.5 rounded-xl border text-xs space-y-1 ${res.renalAdjustments.hasContraindication ? 'bg-rose-950/60 border-rose-600 text-rose-200' : 'bg-amber-950/50 border-amber-600 text-amber-200'}">
        <div class="font-bold">Renal Dozaj Uyarısı (eGFR: ${escapeHtml(res.renalAdjustments.egfr)} mL/dk)</div>
        ${(res.renalAdjustments.warnings || []).map(w => `<div>• <strong>${escapeHtml(w.drug)}</strong>: ${escapeHtml(w.message)}</div>`).join('')}
      </div>
    `);
  }
  if (res.hepaticSafety && res.hepaticSafety.alertsCount > 0) {
    blocks.push(`
      <div class="p-2.5 rounded-xl border text-xs space-y-1 ${res.hepaticSafety.hasContraindication ? 'bg-rose-950/60 border-rose-600 text-rose-200' : 'bg-amber-950/50 border-amber-600 text-amber-200'}">
        <div class="font-bold">Hepatik Güvenlik Kalkanı</div>
        ${res.hepaticSafety.alerts.map(a => `<div>• <strong>${escapeHtml(a.drugName)}</strong>: ${escapeHtml(a.warning)}</div>`).join('')}
      </div>
    `);
  }
  if (!res.dedupedFlags.hyperkalemiaCovered && res.hyperkalemiaRisk.isAtRisk) {
    blocks.push(`
      <div class="p-2.5 rounded-xl border text-xs ${res.hyperkalemiaRisk.alertClass === 'danger' ? 'bg-rose-950/60 border-rose-600 text-rose-200' : 'bg-amber-950/50 border-amber-600 text-amber-200'}">
        <div class="font-bold">${escapeHtml(res.hyperkalemiaRisk.title)}</div>
        <div>${escapeHtml(res.hyperkalemiaRisk.mechanism || '')}</div>
      </div>
    `);
  }
  if (!res.dedupedFlags.pregnancyCovered && res.pregnancySafety && res.pregnancySafety.alertsCount > 0) {
    blocks.push(`
      <div class="p-2.5 rounded-xl border text-xs space-y-1 ${res.pregnancySafety.hasSevereFetalRisk ? 'bg-rose-950/60 border-rose-600 text-rose-200' : 'bg-amber-950/50 border-amber-600 text-amber-200'}">
        <div class="font-bold">Gebelik Güvenlik Uyarısı</div>
        ${res.pregnancySafety.alerts.map(a => `<div>• <strong>${escapeHtml(a.drugName)} (${escapeHtml(a.category)})</strong>: ${escapeHtml(a.warning)}</div>`).join('')}
      </div>
    `);
  }
  if (!res.dedupedFlags.neonatalCovered && res.neonatalDrugSafety && res.neonatalDrugSafety.alertsCount > 0) {
    blocks.push(`
      <div class="p-2.5 rounded-xl border text-xs space-y-1 bg-rose-950/60 border-rose-600 text-rose-200">
        <div class="font-bold">Yenidoğan İlaç Güvenlik Uyarısı</div>
        ${res.neonatalDrugSafety.alerts.map(a => `<div>• <strong>${escapeHtml(a.drugName)}</strong>: ${escapeHtml(a.warning)}</div>`).join('')}
      </div>
    `);
  }

  // DDInter 2.0 Major + Terapötik Duplikasyon
  for (const a of [...ddiMatrix.curatedAlerts, ...ddiMatrix.majorAlerts]) {
    blocks.push(`
      <div class="p-2.5 rounded-xl border text-xs ${a.severity === 'K' ? 'bg-rose-950/55 border-rose-600 text-rose-100' : 'bg-amber-950/50 border-amber-600 text-amber-100'}">
        <div class="font-bold">${escapeHtml(a.title)} <span class="font-mono text-[0.6875rem] opacity-80">(${escapeHtml(a.severityLabel)})</span></div>
        <div>${escapeHtml(a.message)}</div>
      </div>
    `);
  }
  if (ddiMatrix.duplications.length > 0) {
    blocks.push(`
      <div class="p-2.5 rounded-xl border bg-amber-950/45 border-amber-600/70 text-amber-100 text-xs space-y-0.5">
        <div class="font-bold text-amber-300">Terapötik Duplikasyon (${ddiMatrix.duplications.length})</div>
        ${ddiMatrix.duplications.map(d => `<div>• <strong>${escapeHtml(d.groupLabelTr)}:</strong> ${d.drugs.map(x => escapeHtml(x.brand)).join(' + ')}</div>`).join('')}
      </div>
    `);
  }

  const tier34Html = renderTier34CollapsibleHTML(interactions.alerts);
  if (tier34Html) blocks.push(tier34Html);

  return `<div class="space-y-2 mb-3">${blocks.join('')}</div>`;
}
