/**
 * İLERİ KLİNİK FARMAKOLOJİ MOTORU (FAZ 3)
 *
 * 1. Kesilen İlaç Arınma / Lookback Motoru (14–35 Gün — ICH M12 Offset & Washout)
 * 2. Janusmed Risk Profile (PHARAO) 9-Alanlı Çoklu PD Yığılma Profili
 * 3. Doz-Eşiği Kuralları (Transdermal Selejilin 6 vs ≥9 mg/24s; Flukonazol 150 mg Tek Doz)
 * 4. ICH M12 / Isoherranen (2012) Kantitatif Statik AUCR Hesaplayıcısı & Scotcher (2026) Zayıf-CYP Koruma Modeli
 * 5. Ön-İlaç Aktivasyon Blokajı & Metabolik Şant Toksisitesi Rozet Sınıflandırıcısı
 */

import type { ResolvedRxConcept } from './rxNormMappingEngine';
import type { DrugInvolvedRef, InteractionAlert } from './interactionTierEngine';
import { isLocalNonSystemicRoute } from './drugRouteEngine';

// ============================================================================
// 1. KESİLEN İLAÇ TARİHÇESİ (DISCONTINUED MEDICATION LOOKBACK — 14–35 GÜN)
// ============================================================================

export interface DiscontinuedDrugEntry {
  canonicalKey: string;
  displayNameTr?: string;
  stoppedDaysAgo: number;
}

export interface DiscontinuedWashoutPreset {
  canonicalKey: string;
  displayNameTr: string;
  washoutDays: number;
  mechanismClass: 'MAOI_IRREVERSIBLE' | 'FLUOXETINE_NORFLUOXETINE' | 'ENZYME_INDUCER' | 'MBI_CYP3A4' | 'AMIODARONE_LONG_T12';
  shortNoteTr: string;
}

export const DISCONTINUED_LOOKBACK_PRESETS: DiscontinuedWashoutPreset[] = [
  {
    canonicalKey: 'phenelzine',
    displayNameTr: 'Fenelzin / Tranilsipromin (İrreversibl MAOI)',
    washoutDays: 14,
    mechanismClass: 'MAOI_IRREVERSIBLE',
    shortNoteTr: '14 gün arınma (MAO yenilenmesi)'
  },
  {
    canonicalKey: 'selegiline',
    displayNameTr: 'Selejilin / Rasajilin (MAO-B İnhibitörü)',
    washoutDays: 14,
    mechanismClass: 'MAOI_IRREVERSIBLE',
    shortNoteTr: '14 gün arınma (serotonin/hipertansif kriz)'
  },
  {
    canonicalKey: 'fluoxetine',
    displayNameTr: 'Fluoksetin (Norfluoksetin t½ 7–15 gün)',
    washoutDays: 35,
    mechanismClass: 'FLUOXETINE_NORFLUOXETINE',
    shortNoteTr: 'MAOI öncesi 35 gün; CYP2D6 14 gün'
  },
  {
    canonicalKey: 'rifampicin',
    displayNameTr: 'Rifampisin (Güçlü PXR/CAR İndükleyici)',
    washoutDays: 14,
    mechanismClass: 'ENZYME_INDUCER',
    shortNoteTr: '14 gün de-indüksiyon & rebound toksisite'
  },
  {
    canonicalKey: 'carbamazepine',
    displayNameTr: 'Karbamazepin (Güçlü CYP3A4/2C9 İndükleyici)',
    washoutDays: 14,
    mechanismClass: 'ENZYME_INDUCER',
    shortNoteTr: '14 gün de-indüksiyon & rebound toksisite'
  },
  {
    canonicalKey: 'clarithromycin',
    displayNameTr: 'Klaritromisin (MBI CYP3A4 İnhibitörü)',
    washoutDays: 7,
    mechanismClass: 'MBI_CYP3A4',
    shortNoteTr: '5–7 gün CYP3A4 kdeg (~79s) toparlanma'
  },
  {
    canonicalKey: 'amiodarone',
    displayNameTr: 'Amiodaron (t½ 40–55 gün)',
    washoutDays: 35,
    mechanismClass: 'AMIODARONE_LONG_T12',
    shortNoteTr: '≥35 gün kalıcı CYP2C9/P-gp/QTc etkisi'
  }
];

const SEROTONERGIC_KEYS = new Set([
  'fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram', 'fluvoxamine',
  'venlafaxine', 'duloxetine', 'amitriptyline', 'clomipramine', 'trazodone', 'mirtazapine',
  'tramadol', 'meperidine', 'fentanyl', 'methadone', 'linezolid', 'methylene_blue', 'sumatriptan', 'zolmitriptan'
]);

const REBOUND_NTI_INDUCER_SUBSTRATES = new Set([
  'warfarin', 'apixaban', 'rivaroxaban', 'dabigatran', 'tacrolimus', 'cyclosporine',
  'methadone', 'oxycodone', 'fentanyl', 'clozapine', 'digoxin', 'phenytoin', 'carbamazepine', 'theophylline'
]);

const MBI_3A4_CRITICAL_SUBSTRATES = new Set([
  'simvastatin', 'atorvastatin', 'colchicine', 'midazolam', 'alprazolam', 'tacrolimus',
  'cyclosporine', 'domperidone', 'pimozide', 'ergotamine', 'fentanyl', 'oxycodone', 'ticagrelor', 'ivabradine'
]);

function makeRef(c: ResolvedRxConcept): DrugInvolvedRef {
  return {
    raw: typeof c.rawInput === 'string'
      ? c.rawInput
      : String((c.rawInput as Record<string, unknown>)?.brand || (c.rawInput as Record<string, unknown>)?.name || c.displayNameTr),
    canonicalKey: c.canonicalKey,
    rxCui: c.rxCui,
    displayNameTr: c.displayNameTr,
    displayNameEn: c.displayNameEn
  };
}

function makeDiscontinuedRef(d: DiscontinuedDrugEntry): DrugInvolvedRef {
  return {
    raw: `${d.displayNameTr || d.canonicalKey} (${d.stoppedDaysAgo} gün önce kesildi)`,
    canonicalKey: d.canonicalKey,
    rxCui: '',
    displayNameTr: d.displayNameTr || d.canonicalKey,
    displayNameEn: d.canonicalKey
  };
}

/**
 * Kesilen kritik ilaçların arınma (washout) penceresinde aktif reçeteyle etkileşimini değerlendirir (ICH M12).
 */
export function evaluateDiscontinuedWashoutAlerts(
  activeConcepts: ResolvedRxConcept[],
  discontinuedDrugs: DiscontinuedDrugEntry[] = []
): InteractionAlert[] {
  if (!Array.isArray(discontinuedDrugs) || discontinuedDrugs.length === 0 || activeConcepts.length === 0) {
    return [];
  }
  const alerts: InteractionAlert[] = [];
  const systemic = activeConcepts.filter(c => !isLocalNonSystemicRoute(c.route));

  for (const disc of discontinuedDrugs) {
    const key = String(disc.canonicalKey || '').trim().toLowerCase();
    const days = Number(disc.stoppedDaysAgo);
    if (!key || !Number.isFinite(days) || days < 0) continue;
    const discLabel = disc.displayNameTr || DISCONTINUED_LOOKBACK_PRESETS.find(p => p.canonicalKey === key)?.displayNameTr || key;

    // 1. İrreversibl MAOI kesildikten sonraki 14 gün içinde serotonerjik / sempatomimetik başlama
    if (['phenelzine', 'tranylcypromine', 'selegiline', 'rasagiline', 'linezolid', 'moclobemide'].includes(key)) {
      const windowDays = key === 'moclobemide' ? 2 : 14;
      if (days < windowDays) {
        const seroHits = systemic.filter(c => SEROTONERGIC_KEYS.has(c.canonicalKey) || c.drugClasses.includes('serotonergic'));
        if (seroHits.length > 0) {
          const remaining = windowDays - days;
          alerts.push({
            ruleId: 'WASHOUT_MAOI_SERO_001',
            tier: 1,
            alertTier: 'TIER_1_HARD_STOP',
            alertLevel: 'HARD_STOP_CONTRAINDICATION',
            alertTitle: `ARINMA PENCERESİ İHLALİ (MAOI → Serotonerjik): ${discLabel}`,
            message: `${discLabel} yalnızca ${days} gün önce kesilmiştir (zorunlu arınma: ${windowDays} gün; kalan: ${remaining} gün). Aktif reçetedeki ${seroHits.map(s => s.displayNameTr).join(' + ')} ile ölümcül Serotonin Sendromu (hipertermi, klonus, kardiyovasküler kolaps) riski sürer.`,
            mechanism: 'İrreversibl MAO-A/B enzim inhibisyonunun yeni enzim senteziyle düzelmesi 14 gün sürer (ICH M12 offset_and_washout).',
            clinicalSeverity: 'CRITICAL',
            interruptive: true,
            blocksConfirmation: true,
            evidenceLevel: 'FDA Boxed Warning / ICH M12 (2024) / Hunter Serotonin Kriterleri',
            guidelineSource: 'ICH M12 May 2024; FDA MAOI Washout Labeling',
            recommendations: [
              `Serotonerjik ajanı (${seroHits.map(s => s.displayNameTr).join(', ')}) en az ${remaining} gün daha başlatmayınız (toplam ${windowDays} gün arınma tamamlanmalı).`,
              'Acil analjezi gerekiyorsa serotonerjik olmayan morfin/parasetamol tercih ediniz.'
            ],
            involvedDrugs: [makeDiscontinuedRef(disc), ...seroHits.map(makeRef)],
            alertClass: 'danger',
            badgeLabel: '⛔ MAOI ARINMA KİLİDİ (14 GÜN)'
          });
        }
      }
    }

    // 2. Fluoksetin kesildikten sonra 35 gün (5 hafta) MAOI yasağı & 14 gün CYP2D6 kalıcı inhibisyon
    if (key === 'fluoxetine') {
      if (days < 35) {
        const maoiHits = systemic.filter(c =>
          ['phenelzine', 'tranylcypromine', 'selegiline', 'rasagiline', 'moclobemide', 'linezolid', 'methylene_blue'].includes(c.canonicalKey) ||
          c.drugClasses.includes('maoi_activity')
        );
        if (maoiHits.length > 0) {
          const remaining = 35 - days;
          alerts.push({
            ruleId: 'WASHOUT_FLUOXETINE_MAOI_001',
            tier: 1,
            alertTier: 'TIER_1_HARD_STOP',
            alertLevel: 'HARD_STOP_CONTRAINDICATION',
            alertTitle: '5 HAFTALIK ARINMA İHLALİ: Kesilen Fluoksetin → MAOI / Linezolid',
            message: `Fluoksetin ${days} gün önce kesilmiştir; aktif metaboliti norfluoksetinin yarı ömrü 7–15 gün olduğundan MAOI (${maoiHits.map(m => m.displayNameTr).join(' + ')}) öncesi en az 35 gün (5 hafta) arınma zorunludur (kalan: ${remaining} gün).`,
            mechanism: 'Norfluoksetin uzun eliminasyon yarı ömrü nedeniyle 5 haftaya kadar SERT blokajını sürdürür.',
            clinicalSeverity: 'CRITICAL',
            interruptive: true,
            blocksConfirmation: true,
            evidenceLevel: 'FDA Prozac Boxed Warning / TİTCK KÜB 4.3 / ICH M12',
            guidelineSource: 'FDA Fluoxetine Label; ICH M12 (2024)',
            recommendations: [
              `MAOI/Linezolid başlatmak için en az ${remaining} gün daha bekleyiniz (toplam 35 gün arınma).`,
              'Enfeksiyonda Linezolid yerine Vankomisin/Daptomisin tercih ediniz.'
            ],
            involvedDrugs: [makeDiscontinuedRef(disc), ...maoiHits.map(makeRef)],
            alertClass: 'danger',
            badgeLabel: '⛔ FLUOKSETİN 35G ARINMA (X)'
          });
        }
      }
      if (days < 14) {
        const cyp2d6Prodrugs = systemic.filter(c => ['tamoxifen', 'codeine', 'tramadol'].includes(c.canonicalKey));
        if (cyp2d6Prodrugs.length > 0) {
          alerts.push({
            ruleId: 'WASHOUT_FLUOXETINE_2D6_001',
            tier: 2,
            alertTier: 'TIER_2_SOFT_STOP',
            alertLevel: 'SOFT_STOP_WARNING',
            alertTitle: 'KALICI CYP2D6 BLOKAJI: Kesilen Fluoksetin (<14 gün) + Ön-İlaç',
            message: `Fluoksetin ${days} gün önce kesilse de norfluoksetin 2 hafta boyunca güçlü CYP2D6 inhibisyonunu sürdürür; ${cyp2d6Prodrugs.map(p => p.displayNameTr).join(' + ')} aktivasyonu azalır.`,
            mechanism: 'Uzun yarı ömürlü norfluoksetin aracılı kalıcı CYP2D6 inhibisyonu (ön-ilaç etkinlik kaybı).',
            clinicalSeverity: 'MAJOR',
            interruptive: true,
            blocksConfirmation: false,
            evidenceLevel: 'CPIC 2022 / FDA Clinical DDI Table',
            guidelineSource: 'CPIC CYP2D6 Guidelines; ICH M12',
            recommendations: [
              'Kodein/tramadol yerine CYP2D6 bağımsız analjezik (morfin/parasetamol) seçiniz; tamoksifen yanıtını izleyiniz.'
            ],
            involvedDrugs: [makeDiscontinuedRef(disc), ...cyp2d6Prodrugs.map(makeRef)],
            alertClass: 'warning',
            badgeLabel: '⚠️ KALICI CYP2D6 BLOKAJI (D)'
          });
        }
      }
    }

    // 3. Güçlü Enzim İndükleyici Kesimi (Rifampisin, Karbamazepin, Fenitoin) -> 14 Gün Rebound Toksisite!
    if (['rifampicin', 'carbamazepine', 'phenytoin', 'phenobarbital', 'st_johns_wort'].includes(key) && days <= 14) {
      const subHits = systemic.filter(c => REBOUND_NTI_INDUCER_SUBSTRATES.has(c.canonicalKey));
      if (subHits.length > 0) {
        alerts.push({
          ruleId: 'WASHOUT_DEINDUCTION_REBOUND_001',
          tier: 2,
          alertTier: 'TIER_2_SOFT_STOP',
          alertLevel: 'SOFT_STOP_WARNING',
          alertTitle: `DE-İNDÜKSİYON REBOUND TOKSİSİTE RİSKİ (14 Gün): Kesilen ${discLabel}`,
          message: `${discLabel} ${days} gün önce kesilmiştir. Hepatik CYP3A4/2C9/P-gp enzim aktivitesi 7–14 gün içinde bazale dönerken ${subHits.map(s => s.displayNameTr).join(' + ')} düzeyleri hızla yükselerek supraterapötik toksisiteye (kanama/overdoz/nefrotoksisite) yol açabilir!`,
          mechanism: 'PXR/CAR aracılı enzim indüksiyonunun 14 günde gerilemesi (ICH M12 de-induction rebound toxicity).',
          clinicalSeverity: 'MAJOR',
          interruptive: true,
          blocksConfirmation: false,
          evidenceLevel: 'ICH M12 (Mayıs 2024) & Klinik PK Çalışmaları',
          guidelineSource: 'ICH M12 Section 4 (De-induction Kinetics); TİTCK Rifadin/Tegretol KÜB',
          recommendations: [
            `Kesimden sonraki 14 gün boyunca 3–5 günde bir hedef parametreleri (Varfarin: INR [LOINC 6301-6], Takrolimus: vadi [LOINC 11253-2], Digoksin [LOINC 10535-3]) ölçerek dozu kademeli %25–50 azaltınız.`,
            'İndüksiyon döneminde yükseltilmiş substrat dozunu sabit bırakmayınız.'
          ],
          involvedDrugs: [makeDiscontinuedRef(disc), ...subHits.map(makeRef)],
          alertClass: 'warning',
          badgeLabel: '⚠️ DE-İNDÜKSİYON REBOUND (14G)'
        });
      }
    }

    // 4. MBI CYP3A4 İnhibitörü Kesimi (Klaritromisin, Eritromisin, Ritonavir, Verapamil, Diltiazem) -> 5–7 Gün Kalıcı Blokaj!
    if (['clarithromycin', 'erythromycin', 'ritonavir', 'verapamil', 'diltiazem'].includes(key) && days <= 7) {
      const mbiHits = systemic.filter(c => MBI_3A4_CRITICAL_SUBSTRATES.has(c.canonicalKey));
      if (mbiHits.length > 0) {
        alerts.push({
          ruleId: 'WASHOUT_MBI_CYP3A4_001',
          tier: 2,
          alertTier: 'TIER_2_SOFT_STOP',
          alertLevel: 'SOFT_STOP_WARNING',
          alertTitle: `KALICI MBI CYP3A4 BLOKAJI (5–7 Gün): Kesilen ${discLabel}`,
          message: `${discLabel} ${days} gün önce kesilse de mekanizma-temelli (irreversibl) CYP3A4 inaktivasyonu yeni enzim senteziyle (kdeg ~79 saat) 5–7 günde düzelir; ${mbiHits.map(s => s.displayNameTr).join(' + ')} toksisite riski devam eder.`,
          mechanism: 'Mekanizma-temelli CYP3A4 inaktivasyonu (MBI; hepatik kdeg ~0,0088/saat, yarı toparlanma ~79 saat).',
          clinicalSeverity: 'MAJOR',
          interruptive: true,
          blocksConfirmation: false,
          evidenceLevel: 'ICH M12 (Mayıs 2024) MBI Recovery Kinetics',
          guidelineSource: 'ICH M12 (2024); FDA Clinical DDI Guidance',
          recommendations: [
            `Yüksek riskli CYP3A4 substratını (${mbiHits.map(s => s.displayNameTr).join(', ')}) başlatmadan önce kesimden itibaren en az 5–7 gün (kalan: ${Math.max(1, 7 - days)} gün) bekleyiniz veya CYP3A4 dışı alternatif seçiniz.`
          ],
          involvedDrugs: [makeDiscontinuedRef(disc), ...mbiHits.map(makeRef)],
          alertClass: 'warning',
          badgeLabel: '⚠️ MBI CYP3A4 ARINMA (7G)'
        });
      }
    }

    // 5. Amiodaron Kesimi -> ≥35 Gün Kalıcı CYP2C9 / P-gp / QTc Etkisi
    if (key === 'amiodarone' && days <= 35) {
      const amioTargets = systemic.filter(c =>
        ['warfarin', 'digoxin', 'simvastatin', 'atorvastatin', 'dabigatran'].includes(c.canonicalKey) ||
        c.drugClasses.includes('qt_prolonging_known')
      );
      if (amioTargets.length > 0) {
        alerts.push({
          ruleId: 'WASHOUT_AMIODARONE_001',
          tier: 2,
          alertTier: 'TIER_2_SOFT_STOP',
          alertLevel: 'SOFT_STOP_WARNING',
          alertTitle: 'UZUN YARI ÖMÜR KALICI ETKİ (≥35 Gün): Kesilen Amiodaron',
          message: `Amiodaron ${days} gün önce kesilmiştir (t½ 40–55 gün); kalıcı CYP2C9/P-gp inhibisyonu ve QTc uzaması ${amioTargets.map(s => s.displayNameTr).join(' + ')} ile 1–3 ay boyunca etkileşmeyi sürdürür.`,
          mechanism: 'Amiodaron ve desetilamiodaronun yağ dokusundan yavaş salınımı (eliminasyon yarı ömrü 40–55 gün).',
          clinicalSeverity: 'MAJOR',
          interruptive: true,
          blocksConfirmation: false,
          evidenceLevel: 'FDA Cordarone Label / TİTCK KÜB 4.5 & 5.2',
          guidelineSource: 'OpenFDA Amiodarone SPL; TİTCK Amiodaron KÜB',
          recommendations: [
            'Varfarin için haftalık INR (LOINC 6301-6), Digoksin için serum düzeyi (LOINC 10535-3) ve QT ilaçları için QTc Fridericia (LOINC 76634-5) izlemini kesim sonrası en az 4–8 hafta sürdürünüz.'
          ],
          involvedDrugs: [makeDiscontinuedRef(disc), ...amioTargets.map(makeRef)],
          alertClass: 'warning',
          badgeLabel: '⚠️ AMİODARON KALICI ETKİ (≥35G)'
        });
      }
    }
  }

  return alerts;
}

// ============================================================================
// 2. JANUSMED RISK PROFILE (PHARAO) — 9-ALANLI ÇOKLU PD YIĞILMA ŞERİDİ
// ============================================================================

export type JanusmedDomainKey =
  | 'anticholinergic'
  | 'bleeding'
  | 'constipation'
  | 'orthostatism'
  | 'qt_prolongation'
  | 'renal_toxicity'
  | 'sedation'
  | 'serotonergic'
  | 'seizure_threshold';

export interface JanusmedDomainEvaluation {
  domain: JanusmedDomainKey;
  labelTr: string;
  score: number;
  threshold: number;
  aggregation: 'SUM' | 'MAX';
  level: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
  drugs: string[];
}

export interface JanusmedRiskProfileResult {
  domains: JanusmedDomainEvaluation[];
  elevatedDomains: JanusmedDomainEvaluation[];
  highestLevel: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
  summaryTr: string;
}

const JANUSMED_DOMAIN_CONFIG: Array<{
  domain: JanusmedDomainKey;
  labelTr: string;
  threshold: number;
  highThreshold: number;
  aggregation: 'SUM' | 'MAX';
}> = [
  { domain: 'anticholinergic', labelTr: 'Antikolinerjik', threshold: 3, highThreshold: 5, aggregation: 'SUM' },
  { domain: 'bleeding', labelTr: 'Kanama', threshold: 4, highThreshold: 6, aggregation: 'SUM' },
  { domain: 'constipation', labelTr: 'Konstipasyon', threshold: 4, highThreshold: 6, aggregation: 'SUM' },
  { domain: 'orthostatism', labelTr: 'Ortostatizm', threshold: 5, highThreshold: 7, aggregation: 'SUM' },
  { domain: 'qt_prolongation', labelTr: 'QT Uzaması', threshold: 4, highThreshold: 6, aggregation: 'SUM' },
  { domain: 'renal_toxicity', labelTr: 'Nefrotoksisite', threshold: 4, highThreshold: 6, aggregation: 'SUM' },
  { domain: 'sedation', labelTr: 'Sedasyon', threshold: 6, highThreshold: 8, aggregation: 'SUM' },
  { domain: 'serotonergic', labelTr: 'Serotonerjik', threshold: 6, highThreshold: 8, aggregation: 'SUM' },
  { domain: 'seizure_threshold', labelTr: 'Nöbet Eşiği', threshold: 2, highThreshold: 3, aggregation: 'MAX' }
];

type DomainScoreVector = Partial<Record<JanusmedDomainKey, number>>;

// Doğrulanmış Janusmed Risk Profile / PHARAO (Böttiger et al., Eur J Clin Pharmacol 2018) skor tablosu (0–3/alan)
const JANUSMED_DRUG_SCORES: Record<string, DomainScoreVector> = {
  amitriptyline: { anticholinergic: 3, constipation: 3, orthostatism: 3, qt_prolongation: 2, sedation: 3, serotonergic: 2, seizure_threshold: 2 },
  clozapine: { anticholinergic: 3, constipation: 3, orthostatism: 3, qt_prolongation: 2, sedation: 3, seizure_threshold: 3 },
  olanzapine: { anticholinergic: 2, constipation: 2, orthostatism: 2, qt_prolongation: 1, sedation: 2, seizure_threshold: 2 },
  quetiapine: { anticholinergic: 2, constipation: 1, orthostatism: 2, qt_prolongation: 2, sedation: 3, seizure_threshold: 1 },
  haloperidol: { anticholinergic: 1, orthostatism: 2, qt_prolongation: 3, sedation: 2, seizure_threshold: 2 },
  chlorpromazine: { anticholinergic: 3, constipation: 2, orthostatism: 3, qt_prolongation: 3, sedation: 3, seizure_threshold: 3 },
  risperidone: { orthostatism: 2, qt_prolongation: 2, sedation: 2 },
  pimozide: { anticholinergic: 1, qt_prolongation: 3, sedation: 2 },
  hydroxyzine: { anticholinergic: 3, qt_prolongation: 3, sedation: 3 },
  diphenhydramine: { anticholinergic: 3, constipation: 2, sedation: 3 },
  pheniramine: { anticholinergic: 3, sedation: 3 },
  dimenhydrinate: { anticholinergic: 3, sedation: 3 },
  hyoscine: { anticholinergic: 3, constipation: 2 },
  ipratropium: { anticholinergic: 1 },
  diazepam: { orthostatism: 2, sedation: 3 },
  alprazolam: { orthostatism: 2, sedation: 3 },
  midazolam: { orthostatism: 2, sedation: 3 },
  lorazepam: { orthostatism: 2, sedation: 3 },
  zolpidem: { orthostatism: 2, sedation: 3 },
  propofol: { orthostatism: 3, sedation: 3 },
  morphine: { constipation: 3, orthostatism: 2, sedation: 3 },
  fentanyl: { constipation: 3, orthostatism: 2, sedation: 3, serotonergic: 2 },
  oxycodone: { constipation: 3, orthostatism: 2, sedation: 3, serotonergic: 1 },
  codeine: { constipation: 3, sedation: 2 },
  tramadol: { constipation: 2, orthostatism: 1, sedation: 2, serotonergic: 3, seizure_threshold: 3 },
  meperidine: { anticholinergic: 2, constipation: 2, orthostatism: 2, sedation: 3, serotonergic: 3, seizure_threshold: 3 },
  methadone: { constipation: 3, orthostatism: 2, qt_prolongation: 3, sedation: 3, serotonergic: 2 },
  pregabalin: { orthostatism: 1, sedation: 3 },
  gabapentin: { orthostatism: 1, sedation: 2 },
  fluoxetine: { bleeding: 2, serotonergic: 3 },
  sertraline: { bleeding: 2, serotonergic: 3 },
  paroxetine: { anticholinergic: 2, bleeding: 2, constipation: 1, serotonergic: 3 },
  citalopram: { bleeding: 2, qt_prolongation: 3, serotonergic: 3 },
  escitalopram: { bleeding: 2, qt_prolongation: 3, serotonergic: 3 },
  fluvoxamine: { bleeding: 2, serotonergic: 3 },
  venlafaxine: { bleeding: 2, orthostatism: 1, serotonergic: 3 },
  duloxetine: { bleeding: 2, constipation: 1, orthostatism: 1, serotonergic: 3 },
  trazodone: { orthostatism: 3, qt_prolongation: 1, sedation: 3, serotonergic: 2 },
  bupropion: { seizure_threshold: 3 },
  moclobemide: { orthostatism: 1, serotonergic: 3 },
  phenelzine: { orthostatism: 3, serotonergic: 3 },
  tranylcypromine: { orthostatism: 3, serotonergic: 3 },
  selegiline: { orthostatism: 2, serotonergic: 3 },
  rasagiline: { orthostatism: 2, serotonergic: 3 },
  linezolid: { serotonergic: 3 },
  methylene_blue: { serotonergic: 3 },
  lithium: { qt_prolongation: 1, renal_toxicity: 2, serotonergic: 2, seizure_threshold: 1 },
  warfarin: { bleeding: 3 },
  apixaban: { bleeding: 3 },
  rivaroxaban: { bleeding: 3 },
  dabigatran: { bleeding: 3 },
  enoxaparin: { bleeding: 3 },
  aspirin: { bleeding: 2, renal_toxicity: 1 },
  clopidogrel: { bleeding: 2 },
  ticagrelor: { bleeding: 3 },
  prasugrel: { bleeding: 3 },
  ibuprofen: { bleeding: 2, renal_toxicity: 2 },
  diclofenac: { bleeding: 2, renal_toxicity: 2 },
  naproxen: { bleeding: 2, renal_toxicity: 2 },
  dexketoprofen: { bleeding: 2, renal_toxicity: 2 },
  flurbiprofen: { bleeding: 2, renal_toxicity: 2 },
  meloxicam: { bleeding: 2, renal_toxicity: 2 },
  celecoxib: { bleeding: 1, renal_toxicity: 2 },
  amiodarone: { qt_prolongation: 3 },
  sotalol: { qt_prolongation: 3, orthostatism: 1 },
  clarithromycin: { qt_prolongation: 3 },
  azithromycin: { qt_prolongation: 2 },
  moxifloxacin: { qt_prolongation: 3, seizure_threshold: 1 },
  ciprofloxacin: { qt_prolongation: 2, seizure_threshold: 2 },
  levofloxacin: { qt_prolongation: 2, seizure_threshold: 1 },
  fluconazole: { qt_prolongation: 2 },
  voriconazole: { qt_prolongation: 2 },
  ondansetron: { constipation: 2, qt_prolongation: 3, serotonergic: 1 },
  domperidone: { qt_prolongation: 3 },
  verapamil: { constipation: 3, orthostatism: 2 },
  diltiazem: { constipation: 1, orthostatism: 2 },
  amlodipine: { orthostatism: 2 },
  ramipril: { orthostatism: 2, renal_toxicity: 2 },
  enalapril: { orthostatism: 2, renal_toxicity: 2 },
  perindopril: { orthostatism: 2, renal_toxicity: 2 },
  lisinopril: { orthostatism: 2, renal_toxicity: 2 },
  losartan: { orthostatism: 2, renal_toxicity: 2 },
  valsartan: { orthostatism: 2, renal_toxicity: 2 },
  candesartan: { orthostatism: 2, renal_toxicity: 2 },
  furosemide: { orthostatism: 2, renal_toxicity: 2 },
  hydrochlorothiazide: { orthostatism: 2, renal_toxicity: 1 },
  spironolactone: { orthostatism: 2, renal_toxicity: 1 },
  tamsulosin: { orthostatism: 3 },
  nitroglycerin: { orthostatism: 3 },
  sildenafil: { orthostatism: 2 },
  gentamicin: { renal_toxicity: 3 },
  amikacin: { renal_toxicity: 3 },
  vancomycin: { renal_toxicity: 2 },
  colistin: { renal_toxicity: 3 },
  amphotericin_b: { renal_toxicity: 3 },
  tacrolimus: { renal_toxicity: 3, qt_prolongation: 1, seizure_threshold: 1 },
  cyclosporine: { renal_toxicity: 3, seizure_threshold: 1 },
  methotrexate: { renal_toxicity: 2 },
  imipenem_cilastatin: { seizure_threshold: 3 },
  cefepime: { seizure_threshold: 2 },
  theophylline: { seizure_threshold: 2 }
};

/**
 * 9-alanlı Janusmed Risk Profile (PHARAO) hasta düzeyinde çoklu PD yükünü hesaplar.
 */
export function evaluateJanusmedRiskProfile(resolvedConcepts: ResolvedRxConcept[]): JanusmedRiskProfileResult {
  const systemic = resolvedConcepts.filter(c => !isLocalNonSystemicRoute(c.route));
  const domains: JanusmedDomainEvaluation[] = JANUSMED_DOMAIN_CONFIG.map(cfg => {
    let score = 0;
    const drugs: string[] = [];
    for (const c of systemic) {
      let val = JANUSMED_DRUG_SCORES[c.canonicalKey]?.[cfg.domain] || 0;
      // Sınıf tabanlı yedek çıkarım (sözlükte olmayan sistemik ilaçlar için)
      if (val === 0) {
        if (cfg.domain === 'qt_prolongation' && c.drugClasses.includes('qt_prolonging_known')) val = 3;
        else if (cfg.domain === 'bleeding' && c.drugClasses.includes('bleeding_anticoagulant')) val = 3;
        else if (cfg.domain === 'bleeding' && (c.drugClasses.includes('bleeding_nsaid') || c.drugClasses.includes('bleeding_antiplatelet'))) val = 2;
        else if (cfg.domain === 'serotonergic' && c.drugClasses.includes('serotonergic')) val = 2;
        else if (cfg.domain === 'sedation' && c.drugClasses.includes('cns_depressant')) val = 2;
        else if (cfg.domain === 'renal_toxicity' && c.drugClasses.includes('nephrotoxic')) val = 2;
      }
      if (val > 0) {
        drugs.push(c.displayNameTr);
        score = cfg.aggregation === 'MAX' ? Math.max(score, val) : score + val;
      }
    }

    let level: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' = 'NONE';
    if (score >= cfg.highThreshold) level = 'HIGH';
    else if (score >= cfg.threshold) level = 'MODERATE';
    else if (score > 0) level = 'LOW';

    return {
      domain: cfg.domain,
      labelTr: cfg.labelTr,
      score,
      threshold: cfg.threshold,
      aggregation: cfg.aggregation,
      level,
      drugs
    };
  });

  const elevatedDomains = domains.filter(d => d.level === 'MODERATE' || d.level === 'HIGH');
  const highestLevel: JanusmedRiskProfileResult['highestLevel'] =
    elevatedDomains.some(d => d.level === 'HIGH')
      ? 'HIGH'
      : elevatedDomains.length > 0
        ? 'MODERATE'
        : domains.some(d => d.score > 0)
          ? 'LOW'
          : 'NONE';

  const summaryTr = elevatedDomains.length > 0
    ? `Janusmed 9-Alan Risk Profili: ${elevatedDomains.map(d => `${d.labelTr} (${d.score}p)`).join(' · ')}`
    : 'Janusmed 9-Alan Risk Profili: Eşik üstü çoklu PD yükü saptanmadı.';

  return { domains, elevatedDomains, highestLevel, summaryTr };
}

// ============================================================================
// 3. DOZ-EŞİĞİ KURALLARI (TRANSDERMAL SELEJİLİN 6 vs ≥9 mg; FLUKONAZOL 150 mg TEK DOZ)
// ============================================================================

export interface DoseSpecificRuleResult {
  alerts: InteractionAlert[];
  suppressTyramineFoodWarning: boolean;
  downgradeFluconazole150ModerateCyp3a4: boolean;
}

function parseNumericMg(raw: unknown): number | null {
  const s = String(raw || '').replace(',', '.');
  const m = s.match(/(\d+(?:\.\d+)?)\s*(?:mg|miligram)/i);
  return m ? parseFloat(m[1]) : null;
}

export function evaluateDoseThresholdRules(
  rawDrugs: Array<{ brand?: string; name?: string; dosage?: string; route?: string; instructions?: string }>,
  resolvedConcepts: ResolvedRxConcept[]
): DoseSpecificRuleResult {
  const alerts: InteractionAlert[] = [];
  let suppressTyramineFoodWarning = false;
  let downgradeFluconazole150ModerateCyp3a4 = false;

  const selegiline = resolvedConcepts.find(c => c.canonicalKey === 'selegiline');
  if (selegiline) {
    const rawMatch = rawDrugs.find(d => /selejilin|selegilin|emsam/i.test(`${d.brand || ''} ${d.name || ''}`));
    const rawText = `${rawMatch?.brand || ''} ${rawMatch?.name || ''} ${rawMatch?.dosage || ''} ${rawMatch?.instructions || ''}`;
    const isTd = selegiline.route === 'TD' || /flaster|patch|transdermal|emsam|\/24\s*[sh]/i.test(rawText);
    if (isTd) {
      const mg = parseNumericMg(rawText);
      if (mg !== null && mg < 9) {
        // 6 mg/24h transdermal selejilin: tiramin gıda uyarısını bastır, serotonerjik DDI'ları Tier 1 koru!
        suppressTyramineFoodWarning = true;
      } else if (mg !== null && mg >= 9) {
        alerts.push({
          ruleId: 'DOSE_SELEGILINE_TD_TYRAMINE_001',
          tier: 2,
          alertTier: 'TIER_2_SOFT_STOP',
          alertLevel: 'SOFT_STOP_WARNING',
          alertTitle: `TİRAMİN HİPERTANSİF KRİZ UYARISI: Transdermal Selejilin ${mg} mg/24s (≥9 mg)`,
          message: `Transdermal selejilin ≥9 mg/24 saat dozlarında bağırsak MAO-A seçiciliği kaybolur; eskitilmiş peynir, fermente et, fıçı bira ve soya sosu gibi tiramin yüklü gıdalar hipertansif krizi tetikler (6 mg/24s dozunda tiramin kısıtlaması gerekmez; ancak tüm dozlarda serotonerjik ilaçlar KONTRENDİKEDİR).`,
          mechanism: '≥9 mg/24s dozunda sistemik ve enterik MAO-A inhibisyonu ile tiramin presör yanıt artışı.',
          clinicalSeverity: 'MAJOR',
          interruptive: true,
          blocksConfirmation: false,
          evidenceLevel: 'FDA Emsam (Transdermal Selegiline) Labeling',
          guidelineSource: 'OpenFDA Emsam SPL Sec. 4 & 5.4',
          recommendations: [
            'Hastaya ≥9 mg/24s tedavisi boyunca ve kesildikten 14 gün sonrasına dek tiraminden fakir diyet uygulamasını bildiriniz.',
            'Tüm transdermal dozlarda (6/9/12 mg) SSRI, SNRI, tramadol ve sempatomimetiklerden KESİNLİKLE kaçınınız.'
          ],
          involvedDrugs: [makeRef(selegiline)],
          alertClass: 'warning',
          badgeLabel: '⚠️ SELEJİLİN TD ≥9mg TİRAMİN (D)'
        });
      }
    }
  }

  // Flukonazol 150 mg tek doz kuralı: Orta CYP3A4 substratında bağlamsal düşürme, ancak WARFARİN asla bastırılmaz!
  const fluconazole = resolvedConcepts.find(c => c.canonicalKey === 'fluconazole');
  if (fluconazole) {
    const rawFluc = rawDrugs.find(d => /flukonazol|fluconazol|triflucan|fluzole|zolax|flucan/i.test(`${d.brand || ''} ${d.name || ''}`));
    const rawText = `${rawFluc?.brand || ''} ${rawFluc?.name || ''} ${rawFluc?.dosage || ''} ${rawFluc?.instructions || ''}`;
    const mg = parseNumericMg(rawText);
    const isSingle150 = mg === 150 && (/tek\s*doz|single\s*dose|1\s*kaps[üu]l|vajinal|kandid/i.test(rawText) || /\b150\s*mg\b/i.test(rawText));
    const warfarin = resolvedConcepts.find(c => c.canonicalKey === 'warfarin');

    if (isSingle150 && warfarin) {
      alerts.push({
        ruleId: 'DOSE_FLUCONAZOLE_150_WARFARIN_001',
        tier: 2,
        alertTier: 'TIER_2_SOFT_STOP',
        alertLevel: 'SOFT_STOP_WARNING',
        alertTitle: 'TEK DOZ 150 mg FLUKONAZOL + VARFARİN: BASTIRILAMAZ INR YÜKSELMESİ',
        message: 'Flukonazol 150 mg tek doz olsa dahi (~30 saat yarı ömür + güçlü CYP2C9 inhibisyonu) S-varfarin klirensini belirgin düşürerek 3–7 gün içinde ciddi INR yükselmesi ve majör kanamaya neden olabilir; asla göz ardı edilmez.',
        mechanism: 'Tek doz 150 mg flukonazolün 5–7 gün süren rezidüel CYP2C9 inhibisyonu.',
        clinicalSeverity: 'MAJOR',
        interruptive: true,
        blocksConfirmation: false,
        evidenceLevel: 'Klinik Olgu Serileri & FDA Fluconazole Label',
        guidelineSource: 'OpenFDA Fluconazole SPL Sec. 7; TİTCK Triflucan 150 mg KÜB',
        recommendations: [
          'Vajinal kandidiyaziste topikal klotrimazol/mikonazol tercih ediniz.',
          'Tek doz 150 mg oral flukonazol verildiyse 3–5. günde plazma INR (LOINC 6301-6; kritik eşik >4,0) kontrolü yapınız.'
        ],
        involvedDrugs: [makeRef(fluconazole), makeRef(warfarin)],
        alertClass: 'warning',
        badgeLabel: '⚠️ FLUKONAZOL 150mg + VARFARİN (D)'
      });
    } else if (isSingle150) {
      downgradeFluconazole150ModerateCyp3a4 = true;
    }
  }

  return { alerts, suppressTyramineFoodWarning, downgradeFluconazole150ModerateCyp3a4 };
}

// ============================================================================
// 4. KANTİTATİF STATİK AUCR HESAPLAYICISI (ICH M12 / ISOHERRANEN 2012 / SCOTCHER 2026)
// ============================================================================

export interface StaticAucrInhibitorInput {
  enzyme: 'CYP1A2' | 'CYP2C8' | 'CYP2C9' | 'CYP2C19' | 'CYP2D6' | 'CYP3A4';
  /** [I]u / Ki oranı (zayıf ≤0,25; orta 1–4; güçlü ≥10) */
  iOverKi: number;
  label?: string;
}

export interface StaticAucrResult {
  aucr: number;
  classification: 'NO_EFFECT' | 'WEAK' | 'MODERATE' | 'STRONG';
  isSamePathwayWeakGuardTriggered: boolean;
  recommendedTier: 'A' | 'B' | 'C' | 'D' | 'X';
  rationaleTr: string;
}

/**
 * ICH M12 & Isoherranen (2012) paralel yolak hiperbolik statik AUCR modeli:
 * AUCR = 1 / [ sum_k( fm_k / (1 + sum_j([I]_j / Ki_{k,j})) ) + (1 - sum_k(fm_k)) ]
 *
 * Scotcher (2026) aynı yolak zayıf inhibitör koruma kuralı: aynı tek enzime etkiyen
 * 3–4 zayıf inhibitörün (her biri [I]/Ki ≤ 0,25) birleşimi hiperbolik sıçrama yaratmaz (AUCR < 2,0)
 * ve asla X/D kesintili uyarıya yükseltilmez.
 */
export function calculateStaticAucr(
  fmByEnzyme: Partial<Record<StaticAucrInhibitorInput['enzyme'], number>>,
  inhibitors: StaticAucrInhibitorInput[]
): StaticAucrResult {
  const totalFm = Object.values(fmByEnzyme).reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
  const clampedNonCyp = Math.max(0, 1 - totalFm);

  const sumRatioByEnzyme: Record<string, number> = {};
  const affectedEnzymes = new Set<string>();
  for (const inh of inhibitors) {
    const ratio = Math.max(0, Number(inh.iOverKi) || 0);
    if (ratio > 0) {
      sumRatioByEnzyme[inh.enzyme] = (sumRatioByEnzyme[inh.enzyme] || 0) + ratio;
      affectedEnzymes.add(inh.enzyme);
    }
  }

  let effectiveClearanceFraction = clampedNonCyp;
  for (const [enz, fm] of Object.entries(fmByEnzyme)) {
    const f = typeof fm === 'number' ? fm : 0;
    const sumR = sumRatioByEnzyme[enz] || 0;
    effectiveClearanceFraction += f / (1 + sumR);
  }

  const aucr = effectiveClearanceFraction > 0 ? Number((1 / effectiveClearanceFraction).toFixed(2)) : 99;

  // Scotcher (2026) Koruması: Tüm inhibitörler tek aynı enzime etkiyen zayıf inhibitörlerse (<=0.25)
  const allWeak = inhibitors.length > 0 && inhibitors.every(i => i.iOverKi <= 0.25);
  const isSamePathwayWeakGuardTriggered = allWeak && affectedEnzymes.size === 1 && aucr < 2.0;

  let classification: StaticAucrResult['classification'] = 'NO_EFFECT';
  let recommendedTier: StaticAucrResult['recommendedTier'] = 'A';
  if (aucr >= 5.0) {
    classification = 'STRONG';
    recommendedTier = 'X';
  } else if (aucr >= 2.0) {
    classification = 'MODERATE';
    recommendedTier = 'D';
  } else if (aucr >= 1.25) {
    classification = 'WEAK';
    recommendedTier = isSamePathwayWeakGuardTriggered ? 'B' : 'C';
  }

  const rationaleTr = isSamePathwayWeakGuardTriggered
    ? `Scotcher (2026) Aynı Yolak Koruması: ${inhibitors.length} zayıf inhibitör aynı tek CYP yolağında birikse de öngörülen AUCR=${aucr}× (<2,0×); kesintili X/D uyarısı üretilmez.`
    : `ICH M12 / Isoherranen statik modeli: Öngörülen AUCR=${aucr}× (${classification}; etkilenen yolak sayısı=${affectedEnzymes.size}).`;

  return {
    aucr,
    classification,
    isSamePathwayWeakGuardTriggered,
    recommendedTier,
    rationaleTr
  };
}

// ============================================================================
// 5. ÖN-İLAÇ AKTİVASYON BLOKAJI & METABOLİK ŞANT ROZET SINIFLANDIRICISI
// ============================================================================

export interface PharmacologicMechanismBadge {
  type: 'PRODRUG_BLOCKADE' | 'METABOLIC_SHUNT';
  labelTr: string;
  cssClass: string;
}

export function classifyPharmacologicBadge(input: {
  ruleId?: string;
  categories?: string[];
  pairKey?: string;
  text?: string;
}): PharmacologicMechanismBadge | null {
  const hay = `${input.ruleId || ''} ${(input.categories || []).join(' ')} ${input.pairKey || ''} ${input.text || ''}`.toLowerCase();

  // Metabolik Şant Toksisitesi (önce kontrol edilir çünkü kodein+CYP3A4 özel bir şanttır)
  if (
    /shunt|şant|gasche|4-ene|xanthine|ksantin/.test(hay) ||
    (/codeine|kodein/.test(hay) && /clarithromycin|klaritromisin|ritonavir|ketoconazole|voriconazole|cyp3a4/.test(hay)) ||
    (/(azathioprine|azatiyoprin|mercaptopurine|merkaptopurin)/.test(hay) && /(allopurinol|febuxostat|febukostat)/.test(hay)) ||
    (/(valproat|valproic)/.test(hay) && /(carbamazepine|karbamazepin|phenytoin|fenitoin)/.test(hay))
  ) {
    return {
      type: 'METABOLIC_SHUNT',
      labelTr: '[METABOLİK ŞANT TOKSİSİTESİ]',
      cssClass: 'bg-fuchsia-950/85 text-fuchsia-200 border-fuchsia-500/80'
    };
  }

  // Ön-İlaç Aktivasyon Blokajı (Etkinlik Kaybı)
  if (
    /prodrug|ön-?ilaç|on-?ilac|activation_loss|bioactivation/.test(hay) ||
    (/(clopidogrel|klopidogrel)/.test(hay) && /(omeprazol|esomeprazol|cyp2c19)/.test(hay)) ||
    (/(tamoxifen|tamoksifen)/.test(hay) && /(paroxetin|paroksetin|fluoxetin|fluoksetin|bupropion|cyp2d6)/.test(hay)) ||
    (/(codeine|kodein|tramadol)/.test(hay) && /(paroxetin|paroksetin|fluoxetin|fluoksetin|bupropion|cyp2d6)/.test(hay))
  ) {
    return {
      type: 'PRODRUG_BLOCKADE',
      labelTr: '[ÖN-İLAÇ AKTİVASYON BLOKAJI — ETKİNLİK KAYBI]',
      cssClass: 'bg-indigo-950/85 text-indigo-200 border-indigo-400/80'
    };
  }

  return null;
}
