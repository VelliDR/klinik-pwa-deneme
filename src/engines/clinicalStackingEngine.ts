/**
 * SINIF BAZLI FARMAKODİNAMİK YIĞILMA (STACKING), TİSDALE QTc SKORU,
 * KÜMÜLATİF ÇOKLU-CYP / ÖN-İLAÇ VE BAĞLAM DUYARLI CDS KURAL MOTORU (FAZ 1 & FAZ 4)
 *
 * Bilimsel Dayanaklar:
 * - Tisdale JE et al., Circ Cardiovasc Qual Outcomes 2013;6(4):479-487 (C-stat: 0.832)
 * - Isoherranen N et al., Chem Res Toxicol 2012 & ICH M12 (Mayıs 2024) Çoklu-CYP Hiperbolik AUC Modeli
 * - FDA Clinical DDI Table of Substrates, Inhibitors and Inducers & IU Flockhart CYP Table
 * - Gasche Y et al., NEJM 2004;351:2827-2831 (Kodein + CYP3A4 inh. morfin şant toksisitesi)
 * - Propofol SmPC Bölüm 4.3 / 4.5 (≤16 yaş YBÜ PRIS kontrendikasyonu, BZD/opioid/bradikardi depresyonu)
 * - DailyMed Rocuronium Bromide SPL Sec. 7.1-7.11 (NMBA potansiyalizasyonu)
 * - ONC High-Priority DDI Consensus (Phansalkar et al., JAMIA 2012)
 * - Tilson H et al., AJHP 2016 (İnhale/intra-artiküler steroid + güçlü CYP3A4 inh. Cushing istisnası)
 * - Weersink RA et al., BMJ Open 2016 (Child-Pugh C siroz güvenliği)
 */

import type { ResolvedRxConcept } from './rxNormMappingEngine';
import type {
  InteractionAlert,
  DrugInvolvedRef,
  PatientSafetyContext
} from './interactionTierEngine';
import { isLocalNonSystemicRoute, isParenteralRoute } from './drugRouteEngine';

export interface TisdaleQtcBreakdownItem {
  criterion: string;
  points: number;
  active: boolean;
}

export interface TisdaleQtcScoreResult {
  score: number;
  maxScore: 21;
  riskTier: 'LOW' | 'MODERATE' | 'HIGH';
  riskLabelTr: string;
  knownQtDrugs: string[];
  possibleOrConditionalQtDrugs: string[];
  bradycardiaAgents: string[];
  breakdown: TisdaleQtcBreakdownItem[];
  monitoringNoteTr: string;
  loincCodes: {
    qtc: '8636-3';
    potassium: '2823-3';
    creatinine: '2160-0';
  };
}

export interface MultiCypSubstrateDef {
  canonicalKey: string;
  displayNameTr: string;
  pathways: Array<'CYP1A2' | 'CYP2C8' | 'CYP2C9' | 'CYP2C19' | 'CYP2D6' | 'CYP3A4'>;
  isNti?: boolean;
  exampleRef: string;
}

/**
 * Paralel CYP klirens yolakları bulunan kritik substratlar (Isoherranen 2012 / ICH M12 / FDA Clinical DDI Table)
 */
export const MULTI_CYP_SUBSTRATES: MultiCypSubstrateDef[] = [
  {
    canonicalKey: 'diazepam',
    displayNameTr: 'Diazepam',
    pathways: ['CYP2C19', 'CYP3A4'],
    exampleRef: 'Saari et al., Eur J Clin Pharmacol 2007; FDA Clinical DDI Table'
  },
  {
    canonicalKey: 'repaglinide',
    displayNameTr: 'Repaglinid',
    pathways: ['CYP2C8', 'CYP3A4'],
    exampleRef: 'Niemi et al., Diabetologia 2003; Isoherranen et al., 2012'
  },
  {
    canonicalKey: 'clozapine',
    displayNameTr: 'Klozapin',
    pathways: ['CYP1A2', 'CYP3A4'],
    isNti: true,
    exampleRef: 'FDA Clinical DDI Table; TİTCK Leponex KÜB Bölüm 4.5'
  },
  {
    canonicalKey: 'warfarin',
    displayNameTr: 'Varfarin',
    pathways: ['CYP2C9', 'CYP3A4'],
    isNti: true,
    exampleRef: 'FDA Clinical DDI Table; TİTCK Coumadin KÜB Bölüm 4.5'
  },
  {
    canonicalKey: 'phenytoin',
    displayNameTr: 'Fenitoin',
    pathways: ['CYP2C9', 'CYP2C19'],
    isNti: true,
    exampleRef: 'FDA Clinical DDI Table; Flockhart CYP Table'
  },
  {
    canonicalKey: 'voriconazole',
    displayNameTr: 'Vorikonazol',
    pathways: ['CYP2C19', 'CYP2C9', 'CYP3A4'],
    isNti: true,
    exampleRef: 'FDA Clinical DDI Table; TİTCK Vfend KÜB Bölüm 4.5'
  },
  {
    canonicalKey: 'citalopram',
    displayNameTr: 'Sitalopram',
    pathways: ['CYP2C19', 'CYP3A4'],
    exampleRef: 'FDA Clinical DDI Table; TİTCK Cipram KÜB Bölüm 4.5'
  },
  {
    canonicalKey: 'escitalopram',
    displayNameTr: 'Essitalopram',
    pathways: ['CYP2C19', 'CYP3A4'],
    exampleRef: 'FDA Clinical DDI Table; TİTCK Cipralex KÜB Bölüm 4.5'
  },
  {
    canonicalKey: 'propranolol',
    displayNameTr: 'Propranolol',
    pathways: ['CYP1A2', 'CYP2D6'],
    exampleRef: 'Flockhart CYP Table; TİTCK Dideral KÜB'
  },
  {
    canonicalKey: 'amitriptyline',
    displayNameTr: 'Amitriptilin',
    pathways: ['CYP2C19', 'CYP2D6'],
    exampleRef: 'Flockhart CYP Table; CPIC TCA Guidelines'
  },
  {
    canonicalKey: 'propafenone',
    displayNameTr: 'Propafenon',
    pathways: ['CYP2D6', 'CYP3A4'],
    isNti: true,
    exampleRef: 'FDA Clinical DDI Table; TİTCK Rytmonorm KÜB'
  },
  {
    canonicalKey: 'pimozide',
    displayNameTr: 'Pimozid',
    pathways: ['CYP3A4', 'CYP2D6'],
    isNti: true,
    exampleRef: 'ONC High-Priority 15; FDA Pimozide Label'
  },
  {
    canonicalKey: 'oxycodone',
    displayNameTr: 'Oksikodon',
    pathways: ['CYP3A4', 'CYP2D6'],
    exampleRef: 'FDA Oxycodone Label Section 7; ICH M12'
  },
  {
    canonicalKey: 'lidocaine',
    displayNameTr: 'Lidokain',
    pathways: ['CYP1A2', 'CYP3A4'],
    isNti: true,
    exampleRef: 'Flockhart CYP Table; OpenFDA Lidocaine SPL'
  }
];

function toRef(c: ResolvedRxConcept): DrugInvolvedRef {
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

function isSystemicConcept(c: ResolvedRxConcept): boolean {
  // İnhale kortikosteroidler ayrı istisna kuralında değerlendirilir; topikal/göz/kulak formları sistemik yığılma dışı tutulur
  return !isLocalNonSystemicRoute(c.route);
}

/**
 * Doğrulanmış Tisdale QTc Risk Skoru (Tisdale et al., Circ Cardiovasc Qual Outcomes 2013)
 */
export function calculateTisdaleQtcScore(
  resolvedConcepts: ResolvedRxConcept[],
  ctx: PatientSafetyContext = {}
): TisdaleQtcScoreResult {
  const systemic = resolvedConcepts.filter(isSystemicConcept);
  const knownQt = systemic.filter(c => c.drugClasses.includes('qt_prolonging_known'));
  const otherQt = systemic.filter(
    c =>
      !c.drugClasses.includes('qt_prolonging_known') &&
      (c.drugClasses.includes('qt_prolonging_possible') || c.drugClasses.includes('qt_prolonging_conditional'))
  );
  const bradyAgents = systemic.filter(c => c.drugClasses.includes('bradycardia_agent'));
  const hasLoopDiuretic = systemic.some(c => c.drugClasses.includes('loop_diuretic') || c.canonicalKey === 'furosemide');

  const ageGe68 = typeof ctx.ageYears === 'number' && ctx.ageYears >= 68;
  const isFemale = ctx.gender === 'female' || (ctx.gender as unknown as string) === 'F';
  const kVal = ctx.serumPotassiumMeqL ?? ctx.baselineK ?? null;
  const hypokalemia = typeof kVal === 'number' && !isNaN(kVal) && kVal <= 3.5;
  const qtcGe450 = typeof ctx.baselineQtcMs === 'number' && !isNaN(ctx.baselineQtcMs) && ctx.baselineQtcMs >= 450;

  const diagText = String(`${ctx.diagnosis || ''} ${ctx.indication || ''} ${(ctx.history || []).join(' ')}`).toLowerCase();
  const hasAcuteMi = Boolean(ctx.hasAcuteMi || /\b(ami|stemi|nstemi|miyokard\s+enfarkt|akut\s+mi|myocardial\s+infarct)\b/i.test(diagText));
  const hasSepsis = Boolean(ctx.hasSepsis || /\b(sepsis|septik|septic)\b/i.test(diagText));
  const hasHeartFailure = Boolean(ctx.hasHeartFailure || /\b(kalp\s+yetmez|kalp\s+yetersiz|ky\b|hfref|hfpef|heart\s+failure)\b/i.test(diagText));

  // QT uzatan ilaç puanı: 1 ajan (+3), >=2 ajan (+6 toplam)
  const qtCountForTisdale = knownQt.length + (knownQt.length >= 1 ? otherQt.length : (otherQt.length >= 2 ? otherQt.length : 0));
  const oneQtDrug = qtCountForTisdale >= 1;
  const twoOrMoreQtDrugs = qtCountForTisdale >= 2;

  const breakdown: TisdaleQtcBreakdownItem[] = [
    { criterion: 'Yaş ≥ 68 yıl', points: 1, active: ageGe68 },
    { criterion: 'Kadın cinsiyet', points: 1, active: isFemale },
    { criterion: 'Loop diüretik kullanımı', points: 1, active: hasLoopDiuretic },
    { criterion: 'Serum Potasyum (K⁺) ≤ 3,5 mEq/L', points: 2, active: hypokalemia },
    { criterion: 'Başvuru QTc ≥ 450 ms', points: 2, active: qtcGe450 },
    { criterion: 'Akut Miyokard Enfarktüsü (MI)', points: 2, active: hasAcuteMi },
    { criterion: '1 adet QTc uzatan ilaç', points: 3, active: oneQtDrug },
    { criterion: '≥ 2 adet QTc uzatan ilaç (ek puan)', points: 3, active: twoOrMoreQtDrugs },
    { criterion: 'Sepsis', points: 3, active: hasSepsis },
    { criterion: 'Kalp Yetmezliği', points: 3, active: hasHeartFailure }
  ];

  const score = breakdown.reduce((acc, item) => acc + (item.active ? item.points : 0), 0);
  const riskTier: 'LOW' | 'MODERATE' | 'HIGH' = score >= 11 ? 'HIGH' : (score >= 7 ? 'MODERATE' : 'LOW');
  const riskLabelTr =
    riskTier === 'HIGH'
      ? `Yüksek QT/TdP Riski (${score}/21 puan — Tisdale ≥11)`
      : riskTier === 'MODERATE'
        ? `Orta QT/TdP Riski (${score}/21 puan — Tisdale 7–10)`
        : `Düşük QT/TdP Riski (${score}/21 puan — Tisdale <7)`;

  const monitoringNoteTr =
    riskTier === 'HIGH'
      ? 'Bazal ve seri 12 derivasyonlu EKG (LOINC 8636-3; QTc ≥500 ms veya Δ≥60 ms ise derhal ilacı değiştir/kes) + Serum K⁺ >4,0 mEq/L (LOINC 2823-3) ve Mg²⁺ >2,0 mg/dL hedefle.'
      : riskTier === 'MODERATE'
        ? 'Bazal 12 derivasyonlu EKG (LOINC 8636-3) ve kararlı durumda kontrol EKG; serum K⁺ (LOINC 2823-3) ve Mg²⁺ düzeltilmesi önerilir.'
        : 'Standart klinik izlem; ek QT uzatan ajan veya bradikardi eklendiğinde yeniden değerlendiriniz.';

  return {
    score,
    maxScore: 21,
    riskTier,
    riskLabelTr,
    knownQtDrugs: knownQt.map(c => c.displayNameTr),
    possibleOrConditionalQtDrugs: otherQt.map(c => c.displayNameTr),
    bradycardiaAgents: bradyAgents.map(c => c.displayNameTr),
    breakdown,
    monitoringNoteTr,
    loincCodes: {
      qtc: '8636-3',
      potassium: '2823-3',
      creatinine: '2160-0'
    }
  };
}

/**
 * Tüm Faz 1 sınıf yığılma, çoklu-CYP, ön-ilaç, NMBA, anestezi/hemodinami,
 * pediatrik PRIS, ONC-15 ve organ-fonksiyon yükseltici kurallarını çalıştırır.
 */
export function evaluateClinicalStackingAndCypRules(
  resolvedConcepts: ResolvedRxConcept[],
  ctx: PatientSafetyContext = {}
): {
  alerts: InteractionAlert[];
  tisdaleScore: TisdaleQtcScoreResult;
} {
  const alerts: InteractionAlert[] = [];
  const systemic = resolvedConcepts.filter(isSystemicConcept);
  const byKey = new Map<string, ResolvedRxConcept>();
  for (const c of resolvedConcepts) byKey.set(c.canonicalKey, c);

  const hasSys = (key: string) => systemic.some(c => c.canonicalKey === key);
  const getSysClass = (cls: string) => systemic.filter(c => c.drugClasses.includes(cls));

  const ageYears = typeof ctx.ageYears === 'number' && !isNaN(ctx.ageYears) ? ctx.ageYears : null;
  const egfr = typeof ctx.egfr === 'number' && !isNaN(ctx.egfr) ? ctx.egfr : null;
  const baselineK = ctx.serumPotassiumMeqL ?? ctx.baselineK ?? null;
  const childPughClass = ctx.childPughClass ?? null;

  // =========================================================================
  // 1. TİSDALE QTc SKORU & QT + BRADİKARDİ / ELEKTROLİT DİNAMİK YÜKSELTİCİ
  // =========================================================================
  const tisdaleScore = calculateTisdaleQtcScore(resolvedConcepts, ctx);
  const knownQt = getSysClass('qt_prolonging_known');
  const bradyAgents = getSysClass('bradycardia_agent');
  const nonQtBrady = bradyAgents.filter(b => !b.drugClasses.includes('qt_prolonging_known'));
  const hasLowK = typeof baselineK === 'number' && !isNaN(baselineK) && baselineK <= 3.5;

  // 1a. QT Uzatan Ajan(lar) + Bradikardi Ajanı (Örn: Klaritromisin + Flukonazol + IV Metoprolol)
  if (knownQt.length >= 1 && nonQtBrady.length >= 1) {
    const isCriticalQtBrady = knownQt.length >= 2 || tisdaleScore.riskTier === 'HIGH' || hasLowK;
    const hasParenteralBrady = nonQtBrady.some(b => isParenteralRoute(b.route));
    alerts.push({
      ruleId: 'STACK_QT_BRADYCARDIA_001',
      tier: isCriticalQtBrady ? 1 : 2,
      alertTier: isCriticalQtBrady ? 'TIER_1_HARD_STOP' : 'TIER_2_SOFT_STOP',
      alertLevel: isCriticalQtBrady ? 'HARD_STOP_CONTRAINDICATION' : 'SOFT_STOP_WARNING',
      alertTitle: isCriticalQtBrady
        ? 'KRİTİK TdP RİSKİ: Çoklu QT Uzatıcı + Bradikardik Ajan (Pause-Dependent TdP)'
        : `YÜKSEK QT/BRADİKARDİ RİSKİ: QT Uzatıcı + ${hasParenteralBrady ? 'IV ' : ''}Bradikardik Ajan`,
      message: `${knownQt.map(d => d.displayNameTr).join(' + ')} ile bradikardi yapan ${nonQtBrady.map(d => d.displayNameTr).join(' + ')} birlikteliği kalp hızını düşürerek bradikardi-bağımlı erken ard-depolarizasyonları (EAD) ve Torsades de Pointes (TdP) riskini belirgin biçimde artırır. ${tisdaleScore.riskLabelTr}.${hasLowK ? ` Hipokalemi (K⁺: ${baselineK} mEq/L) riski kritik düzeye taşımaktadır.` : ''}`,
      mechanism: 'hERG (IKr) potasyum kanal blokajı + sinüs/AV düğüm baskılanmasına bağlı uzamış diyastolik aralık (pause-dependent TdP).',
      clinicalSeverity: isCriticalQtBrady ? 'CRITICAL' : 'MAJOR',
      interruptive: true,
      blocksConfirmation: isCriticalQtBrady,
      evidenceLevel: 'Klinik Farmakoloji ve Tisdale QTc Risk Modeli (Kanıt Düzeyi A/B)',
      guidelineSource: 'Tisdale et al., Circ Cardiovasc Qual Outcomes 2013; TİTCK KÜB Bölüm 4.4/4.5; OpenFDA SPL',
      recommendations: [
        'QT uzatmayan antibiyotik/antifungal alternatifi değerlendiriniz (örn. doksisiklin veya endikasyona uygun beta-laktam).',
        'Bazal ve kontrol 12 derivasyonlu EKG (LOINC 8636-3; QTc ≥500 ms veya Δ≥60 ms kritik eşik) ve sürekli telemetri/nabız izlemi yapınız.',
        'Serum Potasyum (LOINC 2823-3, hedef >4,0 mEq/L) ve Magnezyum (>2,0 mg/dL) düzeylerini optimize ediniz.'
      ],
      involvedDrugs: [...knownQt.map(toRef), ...nonQtBrady.map(toRef)],
      alertClass: isCriticalQtBrady ? 'danger' : 'warning',
      badgeLabel: isCriticalQtBrady ? '🚨 KRİTİK QT + BRADİKARDİ (X)' : '⚠️ YÜKSEK QT + BRADİKARDİ (D)'
    });
  } else if (tisdaleScore.riskTier === 'HIGH' && knownQt.length === 1) {
    // Tek QT ilacı olsa dahi yüksek Tisdale skoru (≥11) varlığında bağlamsal Tier 2 yükseltme
    alerts.push({
      ruleId: 'STACK_TISDALE_HIGH_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: `BAĞLAMSAL YÜKSEK QTc RİSKİ: ${tisdaleScore.riskLabelTr}`,
      message: `Tek bir QT uzatıcı ajan (${knownQt[0].displayNameTr}) bulunmasına karşın hasta risk faktörleri (Tisdale skoru ${tisdaleScore.score}/21 ≥ 11) nedeniyle hastanede QTc ≥500 ms / TdP gelişme olasılığı yüksektir.`,
      mechanism: 'Çoklu hasta risk faktörü (yaş, cinsiyet, K⁺, diüretik, kalp yetmezliği/sepsis/MI, bazal QTc) zemininde miyokardiyal repolarizasyon rezervinin azalması.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'Prospektif Validasyon Kohortu (Tisdale 2013; C-stat 0,832)',
      guidelineSource: 'Tisdale JE et al., Circ Cardiovasc Qual Outcomes 2013; AHA/ACC TdP Statement',
      recommendations: [
        tisdaleScore.monitoringNoteTr,
        'Mümkünse QTc uzatmayan alternatif ajan seçiniz.'
      ],
      involvedDrugs: knownQt.map(toRef),
      alertClass: 'warning',
      badgeLabel: `⚠️ TİSDALE ${tisdaleScore.score}/21 (D)`
    });
  }

  // =========================================================================
  // 2. SİNERJİSTİK MSS / SOLUNUM DEPRESYONU & HEMODİNAMİK KARDİYODEPRESYON
  // =========================================================================
  const ivAnesthetics = getSysClass('iv_anesthetic');
  const inhaledAnesthetics = getSysClass('inhaled_anesthetic');
  const allAnesthetics = [...ivAnesthetics, ...inhaledAnesthetics, ...getSysClass('alpha2_agonist_sedative')];
  const bzds = getSysClass('benzodiazepine');
  const opioids = systemic.filter(
    c =>
      c.drugClasses.includes('opioid_analgesic') ||
      c.drugClasses.includes('synthetic_opioid') ||
      ['morphine', 'fentanyl', 'tramadol', 'codeine', 'oxycodone', 'meperidine', 'methadone'].includes(c.canonicalKey)
  );
  const gabapentinoids = getSysClass('gabapentinoid');

  const activeCnsClasses =
    (allAnesthetics.length > 0 ? 1 : 0) +
    (bzds.length > 0 ? 1 : 0) +
    (opioids.length > 0 ? 1 : 0) +
    (gabapentinoids.length > 0 ? 1 : 0);

  if (allAnesthetics.length > 0 && activeCnsClasses >= 2) {
    const isTripleCns = activeCnsClasses >= 3;
    const involved = [...allAnesthetics, ...bzds, ...opioids, ...gabapentinoids].map(toRef);
    alerts.push({
      ruleId: 'STACK_ANESTH_CNS_001',
      tier: isTripleCns ? 1 : 2,
      alertTier: isTripleCns ? 'TIER_1_HARD_STOP' : 'TIER_2_SOFT_STOP',
      alertLevel: isTripleCns ? 'HARD_STOP_CONTRAINDICATION' : 'SOFT_STOP_WARNING',
      alertTitle: isTripleCns
        ? 'KRİTİK SOLUNUM ARRESTİ & KARDİYOVASKÜLER DEPRESYON: Çoklu Anestezik/Sedatif/Opioid Yığılması'
        : 'YÜKSEK RİSK: Genel Anestezik + Sedatif/Opioid Sinerjistik Kardiyorespiratuvar Depresyon',
      message: `${involved.map(d => d.displayNameTr).join(' + ')} kombinasyonu beyin sapı solunum merkezini ve miyokardiyal/vasküler tonusu sinerjistik olarak baskılar; derin apne, oksijen desatürasyonu, ağır hipotansiyon ve kardiyak arrest riski taşır.`,
      mechanism: 'GABA-A allosterik potansiyalizasyonu (propofol/benzodiyazepin) + mü-opioid solunum dürtüsü inhibisyonu ve sempatik tonus kaybı.',
      clinicalSeverity: isTripleCns ? 'CRITICAL' : 'MAJOR',
      interruptive: true,
      blocksConfirmation: isTripleCns,
      evidenceLevel: 'FDA Kara Kutu Uyarısı (2016) / EMA Propofol SmPC Bölüm 4.5',
      guidelineSource: 'Propofol %1 SmPC Bölüm 4.5; FDA Opioid-CNS Depressant Boxed Warning; TİTCK KÜB',
      recommendations: [
        'Propofol / genel anestezik indüksiyon ve idame dozunu belirgin biçimde azaltarak titre ediniz.',
        'Sürekli SpO₂, kapnografi (ETCO₂), EKG ve invaziv/non-invaziv kan basıncı monitörizasyonu altında uygulayınız.',
        'Hava yolu ekipmanı, nalokson ve flumazenil acil erişimde bulundurulmalıdır.'
      ],
      involvedDrugs: involved,
      alertClass: isTripleCns ? 'danger' : 'warning',
      badgeLabel: isTripleCns ? '🚨 ÇOKLU MSS/APNE YIĞILMASI (X)' : '⚠️ ANESTEZİK + SEDATİF/OPİOİD (D)'
    });
  }

  // 2b. Hemodinamik Kardiyodepresyon: Propofol / Kardiyodepresan Anestezik + Beta-Bloker / Bradikardik KKB
  const cardioAnesthetics = getSysClass('hemodynamic_cardiodepressant').filter(
    c => c.drugClasses.includes('iv_anesthetic') || c.drugClasses.includes('alpha2_agonist_sedative')
  );
  const hemoBrady = bradyAgents.filter(b => !cardioAnesthetics.some(a => a.canonicalKey === b.canonicalKey));

  if (cardioAnesthetics.length > 0 && hemoBrady.length > 0) {
    alerts.push({
      ruleId: 'STACK_HEMO_CARDIODEP_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'HEMODİNAMİK KARDİYODEPRESYON: IV Anestezik + Beta-Bloker / Bradikardik Ajan',
      message: `${cardioAnesthetics.map(d => d.displayNameTr).join(' + ')} ile ${hemoBrady.map(d => d.displayNameTr).join(' + ')} birlikteliği L-tipi Ca²⁺ kanal inhibisyonu, nitrik oksit kaynaklı vazodilatasyon ve barorefleks/sinüs düğümü blokajı nedeniyle ağır bradikardi, AV blok ve refrakter hipotansiyon riskini yükseltir.`,
      mechanism: 'Sistemik vasküler direnç düşüşü (propofol) + kompansatuvar sempatik taşikardi yanıtının beta-bloker/KKB ile engellenmesi.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'Düzenleyici SmPC / Klinik Anestezi Farmakolojisi (Kanıt Düzeyi B)',
      guidelineSource: 'Propofol %1 SmPC Bölüm 4.4 & 4.5; OpenFDA Metoprolol/Propofol Labels',
      recommendations: [
        'İndüksiyon dozunu yavaş ve kademeli titre ediniz; eşzamanlı IV bolus beta-bloker uygulamasından kaçınınız.',
        'Sürekli EKG ve kan basıncı monitörizasyonu altında sıvı desteği, atropin ve vazopresör (efedrin/noradrenalin) hazır bulundurunuz.'
      ],
      involvedDrugs: [...cardioAnesthetics.map(toRef), ...hemoBrady.map(toRef)],
      alertClass: 'warning',
      badgeLabel: '⚠️ HEMODİNAMİK KOLLAPS RİSKİ (D)'
    });
  }

  // =========================================================================
  // 3. NÖROMÜSKÜLER BLOKAJ (NMBA) POTANSİYALİZASYONU
  // =========================================================================
  const nmbas = getSysClass('nmba_nondepolarizing');
  const nmbaPotentiators = getSysClass('nmba_potentiator');

  if (nmbas.length > 0 && nmbaPotentiators.length > 0) {
    const hasInhaled = nmbaPotentiators.some(p => p.drugClasses.includes('nmba_potentiator_inhaled'));
    const hasMacrolide = nmbaPotentiators.some(p => p.drugClasses.includes('nmba_potentiator_macrolide'));
    const hasSugammadexRenalNote = egfr !== null && egfr < 30;
    alerts.push({
      ruleId: 'STACK_NMBA_POTENT_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'UZAMIŞ NÖROMÜSKÜLER BLOKAJ & POSTOPERATİF SOLUNUM YETMEZLİĞİ: NMBA Potansiyalizasyonu',
      message: `${nmbas.map(d => d.displayNameTr).join(' + ')} ile ${nmbaPotentiators.map(d => d.displayNameTr).join(' + ')} eşzamanlı kullanımı nöromüsküler blokaj süresini ve derinliğini belirgin biçimde uzatır.${hasInhaled ? ' İnhalasyon anestezikleri idame süresini %30–50 uzatır ve infüzyon gereksinimini %40 azaltır.' : ''}${hasMacrolide ? ' Makrolid antibiyotikler presinaptik asetilkolin salınımını baskılayarak paraliziyi derinleştirir.' : ''}${hasSugammadexRenalNote ? ` DİKKAT: eGFR ${egfr} mL/dk (<30) olduğundan Sugammadeks kullanımı kısıtlıdır/önerilmez!` : ''}`,
      mechanism: 'Presinaptik asetilkolin salınım inhibisyonu ve/veya postsinaptik nikotinik reseptör duyarlılığının azalması sonucu uzamış kas gevşemesi.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'FDA DailyMed SPL Sec. 7.1–7.11 / TİTCK Esmeron & Muscobloc KÜB',
      guidelineSource: 'DailyMed Rocuronium Bromide SPL Section 7; TİTCK KÜB Bölüm 4.5',
      recommendations: [
        'Kantitatif nöromüsküler monitörizasyon (Train-of-Four, ekstübasyon öncesi TOF oranı >0,9) zorunludur.',
        'NMBA idame dozlarını azaltınız ve ek dozları yalnızca TOF yanıtına göre uygulayınız.',
        hasSugammadexRenalNote
          ? 'eGFR <30 mL/dk nedeniyle Sugammadeks yerine uzamış mekanik ventilasyon/TOF takibi veya neostigmin + atropin protokolünü değerlendiriniz.'
          : 'Gerektiğinde tam antagonizma için Sugammadeks (roküronyum/veküronyum için) veya Neostigmin + Atropin hazır bulundurunuz.'
      ],
      involvedDrugs: [...nmbas.map(toRef), ...nmbaPotentiators.map(toRef)],
      alertClass: 'warning',
      badgeLabel: '⚠️ UZAMIŞ PARALİZİ / TOF >0.9 (D)'
    });
  }

  // Sugammadeks + eGFR < 30 bağımsız renal güvenlik uyarısı
  if (hasSys('sugammadex') && egfr !== null && egfr < 30) {
    alerts.push({
      ruleId: 'RENAL_SUGAMMADEX_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'RENAL KISITLAMA (eGFR <30 mL/dk): Sugammadeks Klirens Gecikmesi',
      message: `Hastanın eGFR değeri ${egfr} mL/dk (<30 mL/dk) olup Sugammadeks-roküronyum kompleksi neredeyse tamamen böbrekten atıldığından ağır böbrek yetmezliğinde kullanımı önerilmemektedir.`,
      mechanism: 'Renal glomerüler filtrasyonun çökmesi sonucu kompleksin plazmada günlerce kalması ve rekürizasyon riski.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'TİTCK Bridion KÜB Bölüm 4.2/4.4; OpenFDA Sugammadex Label',
      guidelineSource: 'TİTCK Bridion KÜB; FDA Sugammadex Label',
      recommendations: [
        'Mümkünse böbrekten bağımsız Hofmann eliminasyonlu Cisatraküryum/Atraküryum ve Neostigmin protokolünü tercih ediniz.',
        'Zorunlu uygulamada uzamış TOF monitörizasyonu sağlayınız.'
      ],
      involvedDrugs: [toRef(byKey.get('sugammadex')!)],
      alertClass: 'warning',
      badgeLabel: '⚠️ RENAL KISIT (eGFR <30)'
    });
  }

  // =========================================================================
  // 4. KÜMÜLATİF ÇOKLU-CYP İNHİBİSYONU (ISOHERRANEN / ICH M12 HİPERBOLİK AUC)
  // =========================================================================
  const inhibitorsByEnzyme: Record<string, Array<{ concept: ResolvedRxConcept; strength: 'STRONG' | 'MODERATE' }>> = {
    CYP1A2: [],
    CYP2C8: [],
    CYP2C9: [],
    CYP2C19: [],
    CYP2D6: [],
    CYP3A4: []
  };

  for (const c of systemic) {
    for (const enz of ['CYP1A2', 'CYP2C8', 'CYP2C9', 'CYP2C19', 'CYP2D6', 'CYP3A4'] as const) {
      const low = enz.toLowerCase();
      if (c.drugClasses.includes(`${low}_strong_inhibitor`)) {
        inhibitorsByEnzyme[enz].push({ concept: c, strength: 'STRONG' });
      } else if (c.drugClasses.includes(`${low}_moderate_inhibitor`)) {
        inhibitorsByEnzyme[enz].push({ concept: c, strength: 'MODERATE' });
      }
    }
  }

  for (const sub of MULTI_CYP_SUBSTRATES) {
    const subConcept = systemic.find(c => c.canonicalKey === sub.canonicalKey);
    if (!subConcept) continue;

    const blockedPathways: Array<{ enzyme: string; inhibitor: ResolvedRxConcept; strength: 'STRONG' | 'MODERATE' }> = [];
    for (const enz of sub.pathways) {
      const hits = inhibitorsByEnzyme[enz].filter(h => h.concept.canonicalKey !== sub.canonicalKey);
      if (hits.length > 0) {
        // En güçlü inhibitörü öne al
        hits.sort((a, b) => (a.strength === 'STRONG' ? -1 : 1) - (b.strength === 'STRONG' ? -1 : 1));
        blockedPathways.push({ enzyme: enz, inhibitor: hits[0].concept, strength: hits[0].strength });
      }
    }

    if (blockedPathways.length >= 2) {
      const isNtiEscalation = Boolean(sub.isNti) && blockedPathways.some(p => p.strength === 'STRONG');
      const uniqueInhibitors = Array.from(
        new Map(blockedPathways.map(p => [p.inhibitor.canonicalKey, p.inhibitor])).values()
      );
      const pathwaySummary = blockedPathways
        .map(p => `${p.enzyme} (${p.inhibitor.displayNameTr} — ${p.strength === 'STRONG' ? 'Güçlü' : 'Orta'})`)
        .join(' + ');

      alerts.push({
        ruleId: `CYP_DUAL_BLOCK_${sub.canonicalKey.toUpperCase()}`,
        tier: isNtiEscalation ? 1 : 2,
        alertTier: isNtiEscalation ? 'TIER_1_HARD_STOP' : 'TIER_2_SOFT_STOP',
        alertLevel: isNtiEscalation ? 'HARD_STOP_CONTRAINDICATION' : 'SOFT_STOP_WARNING',
        alertTitle: `KÜMÜLATİF ÇOKLU-CYP BLOKAJI${isNtiEscalation ? ' (NTI KRİTİK)' : ''}: ${sub.displayNameTr}`,
        message: `${sub.displayNameTr} molekülünün paralel metabolik kaçış yolakları eşzamanlı olarak baskılanmaktadır: ${pathwaySummary}. Tekil çiftlerde orta düzey görünen inhibisyon, her iki ana yolağın kapanmasıyla hiperbolik AUC sıçramasına (5–10+ kat maruziyet artışı) ve ağır toksisite/uzamış sedasyona yol açar.`,
        mechanism: 'ICH M12 / Isoherranen çoklu-P450 statik modeli: Paralel klirens fraksiyonlarının (fm,i) eşzamanlı blokajı kalan klirens paydasını çökerterek plazma birikimini üstel artırır.',
        clinicalSeverity: isNtiEscalation ? 'CRITICAL' : 'MAJOR',
        interruptive: true,
        blocksConfirmation: isNtiEscalation,
        evidenceLevel: 'ICH M12 (2024) / FDA Clinical DDI Table / Klinik PK Çalışmaları',
        guidelineSource: sub.exampleRef,
        recommendations: [
          `${sub.displayNameTr} dozunu en az %50 azaltınız veya bu CYP yolaklarına bağımlı olmayan güvenli bir alternatif seçiniz${sub.canonicalKey === 'diazepam' ? ' (örn. glukuronidasyonla atılan Lorazepam/Oksazepam)' : ''}.`,
          'Eşzamanlı inhibitörlerden en az birini CYP etkileşimsiz bir alternatifle değiştiriniz.',
          sub.isNti
            ? 'Dar terapötik indeksli (NTI) ajan olduğundan zorunlu kullanımda yakın serum düzey (TDM) ve toksisite izlemi şarttır.'
            : 'Uzamış sedasyon, solunum depresyonu veya hipoglisemi/toksisite bulgularını yakından izleyiniz.'
        ],
        involvedDrugs: [toRef(subConcept), ...uniqueInhibitors.map(toRef)],
        alertClass: isNtiEscalation ? 'danger' : 'warning',
        badgeLabel: isNtiEscalation ? '🚨 ÇİFT CYP + NTI (X)' : '⚠️ KÜMÜLATİF ÇİFT CYP (D)'
      });
    }
  }

  // =========================================================================
  // 5. ÖN-İLAÇ (PRODRUG) AKTİVASYON BLOKAJI & METABOLİK ŞANT TOKSİSİTESİ
  // =========================================================================
  const strongCyp2d6 = inhibitorsByEnzyme.CYP2D6.filter(x => x.strength === 'STRONG').map(x => x.concept);
  const strongCyp3a4 = inhibitorsByEnzyme.CYP3A4.filter(x => x.strength === 'STRONG').map(x => x.concept);
  const strongCyp2c19 = inhibitorsByEnzyme.CYP2C19.filter(x => x.strength === 'STRONG').map(x => x.concept);

  // 5a. Kodein + Güçlü CYP3A4 İnhibitörü -> Morfin Şant Toksisitesi (Gasche et al., NEJM 2004)
  if (hasSys('codeine') && strongCyp3a4.length > 0) {
    const codeineRef = byKey.get('codeine')!;
    const renalOrPedEscalation = (egfr !== null && egfr < 60) || (ageYears !== null && ageYears < 18);
    alerts.push({
      ruleId: 'PRODRUG_CODEINE_SHUNT_001',
      tier: renalOrPedEscalation ? 1 : 2,
      alertTier: renalOrPedEscalation ? 'TIER_1_HARD_STOP' : 'TIER_2_SOFT_STOP',
      alertLevel: renalOrPedEscalation ? 'HARD_STOP_CONTRAINDICATION' : 'SOFT_STOP_WARNING',
      alertTitle: 'OPİOİD ŞANT TOKSİSİTESİ: Kodein + Güçlü CYP3A4 İnhibitörü (Morfin Birikimi)',
      message: `${strongCyp3a4.map(d => d.displayNameTr).join(' + ')} kodeinin inaktif norkodeine (CYP3A4) dönüşüm yolunu kapatarak kodeini aktif morfin üreten CYP2D6 yolağına şantlar. Özellikle CYP2D6 ultrahızlı metabolizörlerde veya böbrek yetmezliğinde (M6G birikimi) yaşamı tehdit eden morfin intoksikasyonu ve solunum arresti gelişebilir.${egfr !== null && egfr < 60 ? ` (eGFR ${egfr} mL/dk nedeniyle kritik düzeye yükseltildi!)` : ''}`,
      mechanism: 'CYP3A4 N-demetilasyon blokajı -> CYP2D6 O-demetilasyon şantı -> aktif morfin ve morfin-6-glukuronid (M6G) toksik birikimi.',
      clinicalSeverity: renalOrPedEscalation ? 'CRITICAL' : 'MAJOR',
      interruptive: true,
      blocksConfirmation: renalOrPedEscalation,
      evidenceLevel: 'Klinik Olgu + Mekanistik PK / FDA & EMA Güvenlik Etiketi',
      guidelineSource: 'Gasche Y et al., NEJM 2004;351:2827-2831; FDA Codeine Label; TİTCK KÜB',
      recommendations: [
        'Kodein yerine CYP3A4 şantından etkilenmeyen non-opioid analjezik (Parasetamol) veya direkt etkili opioid değerlendiriniz.',
        'Güçlü CYP3A4 inhibitörü yerine alternatif antibiyotik/antifungal seçiniz (örn. Klaritromisin yerine Azitromisin veya Beta-laktam).',
        'Aşırı sedasyon, miyozis ve solunum depresyonu açısından yakın izlem ve nalokson erişimi sağlayınız.'
      ],
      involvedDrugs: [toRef(codeineRef), ...strongCyp3a4.map(toRef)],
      alertClass: renalOrPedEscalation ? 'danger' : 'warning',
      badgeLabel: renalOrPedEscalation ? '🚨 KODEİN MORFİN ŞANTI (X)' : '⚠️ KODEİN ŞANT TOKSİSİTESİ (D)'
    });
  }

  // 5b. Kodein / Tramadol + Güçlü CYP2D6 İnhibitörü -> Analjezik Aktivasyon Kaybı
  if ((hasSys('codeine') || hasSys('tramadol')) && strongCyp2d6.length > 0) {
    const opioidC = hasSys('codeine') ? byKey.get('codeine')! : byKey.get('tramadol')!;
    alerts.push({
      ruleId: 'PRODRUG_OPIOID_CYP2D6_BLOCK_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: `ÖN-İLAÇ AKTİVASYON BLOKAJI: ${opioidC.displayNameTr} + Güçlü CYP2D6 İnhibitörü`,
      message: `${strongCyp2d6.map(d => d.displayNameTr).join(' + ')}, ${opioidC.displayNameTr} ön-ilacının aktif analjezik metabolitine (morfin / O-desmetiltramadol) dönüşümünü sağlayan CYP2D6 enzimini bloke ederek analjezik etkinliği belirgin biçimde azaltır.`,
      mechanism: 'CYP2D6 aracılı O-demetilasyon (biyoaktivasyon) inhibisyonu.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'CPIC Opioid/CYP2D6 Kılavuzu; FDA Labeling',
      guidelineSource: 'CPIC CYP2D6/Opioid Guideline; FDA Clinical DDI Table',
      recommendations: [
        'CYP2D6 aktivasyonu gerektirmeyen analjezik seçiniz (Parasetamol, NSAİİ veya uzman takibinde direkt Morfin).',
        'Antidepresan değişimi mümkünse CYP2D6 inhibisyonu zayıf bir ajana (örn. Sertralin, Essitalopram) geçmeyi değerlendiriniz.'
      ],
      involvedDrugs: [toRef(opioidC), ...strongCyp2d6.map(toRef)],
      alertClass: 'warning',
      badgeLabel: '⚠️ ÖN-İLAÇ ETKİNLİK KAYBI (D)'
    });
  }

  // 5c. Tamoksifen + Güçlü CYP2D6 İnhibitörü -> Onkolojik Etkinlik Kaybı (Tier 1 Hard Stop)
  if (hasSys('tamoxifen') && strongCyp2d6.length > 0) {
    alerts.push({
      ruleId: 'PRODRUG_TAMOXIFEN_CYP2D6_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'KRİTİK ETKİNLİK KAYBI: Tamoksifen + Güçlü CYP2D6 İnhibitörü (Endoksifen Blokajı)',
      message: `${strongCyp2d6.map(d => d.displayNameTr).join(' + ')}, tamoksifenin aktif antiöstrojenik metaboliti endoksifene dönüşümünü bloke ederek meme kanseri nüks ve mortalite riskini anlamlı biçimde artırır.`,
      mechanism: 'CYP2D6 inhibisyonu -> plazma endoksifen konsantrasyonunda %65–75 düşüş.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'CPIC Tamoxifen/CYP2D6 Kılavuzu (Güçlü Öneri); Kohort Çalışmaları',
      guidelineSource: 'CPIC Tamoxifen Guideline; FDA Tamoxifen Label; Kelly et al., BMJ 2010',
      recommendations: [
        'Paroksetin, Fluoksetin, Bupropion ve Kinidinden kesinlikle kaçınınız.',
        'Antidepresan gerekiyorsa CYP2D6 inhibisyonu minimal olan Venlafaksin veya Essitalopram tercih ediniz.'
      ],
      involvedDrugs: [toRef(byKey.get('tamoxifen')!), ...strongCyp2d6.map(toRef)],
      alertClass: 'danger',
      badgeLabel: '🚨 TAMOKSİFEN BLOKAJI (X)'
    });
  }

  // 5d. Klopidogrel + Güçlü CYP2C19 İnhibitörü (Flukonazol / Fluvoksamin / Vorikonazol)
  if (hasSys('clopidogrel') && strongCyp2c19.length > 0) {
    alerts.push({
      ruleId: 'PRODRUG_CLOPIDOGREL_STRONG2C19_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'YÜKSEK TROMBOZ RİSKİ: Klopidogrel + Güçlü CYP2C19 İnhibitörü',
      message: `${strongCyp2c19.map(d => d.displayNameTr).join(' + ')} klopidogrelin aktif tiyol metabolitine dönüşümünü güçlü biçimde bloke ederek stent trombozu ve akut koroner olay riskini artırır.`,
      mechanism: 'Güçlü CYP2C19 inhibisyonu sonucu P2Y12 antiplatelet biyoaktivasyonunun bozulması.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'FDA Kara Kutu Uyarısı; CPIC Clopidogrel Kılavuzu',
      guidelineSource: 'FDA Clopidogrel Boxed Warning; CPIC CYP2C19 Guideline',
      recommendations: [
        'Mümkünse güçlü CYP2C19 inhibitörü olmayan bir alternatif ajan seçiniz.',
        'Kardiyoloji değerlendirmesiyle CYP2C19 bağımlılığı olmayan Prasugrel veya Tikagrelor alternatifi gözden geçirilebilir.'
      ],
      involvedDrugs: [toRef(byKey.get('clopidogrel')!), ...strongCyp2c19.map(toRef)],
      alertClass: 'warning',
      badgeLabel: '⚠️ ANTİAGREGAN ETKİNLİK KAYBI (D)'
    });
  }

  // =========================================================================
  // 6. PEDİATRİK HARD STOP: PROPOFOL PRIS (≤16 YAŞ) & GEMFİBROZİL PEDİATRİ
  // =========================================================================
  if (hasSys('propofol') && ageYears !== null && ageYears <= 16) {
    alerts.push({
      ruleId: 'PUD_PROPOFOL_PRIS_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'KESİN KONTRENDİKASYON (≤16 YAŞ YBÜ SEDASYONU): Propofol İnfüzyon Sendromu (PRIS)',
      message: `Hasta ${ageYears} yaşındadır (≤16 yaş). Propofol, 16 yaş ve altındaki çocuklarda yoğun bakım (YBÜ) sedasyonu için ölümcül Propofol İnfüzyon Sendromu (PRIS: ağır metabolik asidoz, rabdomiyoliz, hiperkalemi, lipemi, hepatomegali ve refrakter kardiyak yetmezlik — özellikle >4 mg/kg/saat ve >48 saat) nedeniyle KESİNLİKLE KONTRENDİKEDİR.`,
      mechanism: 'Mitokondriyal elektron transport zinciri (Koenzim Q / Kompleks II-IV) ve uzun zincirli yağ asidi beta-oksidasyonunun bozulması.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'EMA/MHRA & TİTCK Propofol KÜB Bölüm 4.3 Kesin Kontrendikasyon',
      guidelineSource: 'Propofol %1 SmPC Bölüm 4.3; TİTCK Propofol-PF KÜB Bölüm 4.3',
      recommendations: [
        '≤16 yaş pediatrik yoğun bakım sedasyonunda propofol infüzyonunu KESİNLİKLE kullanmayınız.',
        'Kısa süreli ameliyathane anestezi indüksiyonu/idamesi yalnızca pediatrik anestezi uzmanı kontrolünde ve yakın metabolik/hemodinamik takiple yapılabilir.',
        'Pediatrik YBÜ sedasyon alternatifleri: Midazolam, Fentanil veya Deksmedetomidin protokolleri.'
      ],
      involvedDrugs: [toRef(byKey.get('propofol')!)],
      alertClass: 'danger',
      badgeLabel: '🚨 PEDİATRİK PRIS (≤16 YAŞ - X)'
    });
  }

  if (hasSys('gemfibrozil') && ageYears !== null && ageYears < 18) {
    alerts.push({
      ruleId: 'PUD_GEMFIBROZIL_AGE_001',
      tier: 3,
      alertTier: 'TIER_3_MONITORING',
      alertLevel: 'WARNING_MONITOR',
      alertTitle: 'PEDİATRİK GÜVENLİLİK UYARISI: Çocuklarda Gemfibrozil Kullanımı',
      message: 'Gemfibrozilin 18 yaş altındaki çocuklarda güvenliliği ve etkililiği kanıtlanmamıştır; pediatrik endokrinoloji/metabolizma onayı olmadan rutin kullanılmamalıdır.',
      mechanism: 'Pediatrik popülasyonda kontrollü klinik güvenlilik verisinin bulunmaması.',
      clinicalSeverity: 'MODERATE',
      interruptive: false,
      blocksConfirmation: false,
      evidenceLevel: 'TİTCK KÜB Bölüm 4.2/4.4; OpenFDA Gemfibrozil Label',
      guidelineSource: 'TİTCK Lopid KÜB Bölüm 4.2; FDA Gemfibrozil SPL',
      recommendations: [
        'Çocuk/adölesan dislipidemisinde yaşam tarzı müdahalesi ve pediatrik onaylı protokolleri değerlendiriniz.'
      ],
      involvedDrugs: [toRef(byKey.get('gemfibrozil')!)],
      alertClass: 'yellow',
      badgeLabel: '⚡ PEDİATRİK UYARI (C)'
    });
  }

  // =========================================================================
  // 7. ONC HIGH-PRIORITY 15 TAMAMLAYICILAR, NON-ORAL STEROİD İSTİSNASI,
  //    KANAMA YIĞILMASI & SİROZ BAĞLAM YÜKSELTİCİSİ
  // =========================================================================
  const strongCyp1a2 = inhibitorsByEnzyme.CYP1A2.filter(x => x.strength === 'STRONG').map(x => x.concept);

  // 7a. ONC-15: İrinotekan + Güçlü CYP3A4 İnhibitörü
  if (hasSys('irinotecan') && strongCyp3a4.length > 0) {
    alerts.push({
      ruleId: 'ONC_IRINOTECAN_CYP3A4_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'ONC YÜKSEK ÖNCELİKLİ KONTRENDİKASYON: İrinotekan + Güçlü CYP3A4 İnhibitörü',
      message: `${strongCyp3a4.map(d => d.displayNameTr).join(' + ')}, irinotekanın inaktif metabolitlere yıkımını engelleyerek aktif sitotoksik SN-38 düzeyini artırır; ağır nötropeni ve ölümcül diyare riski nedeniyle kontrendikedir.`,
      mechanism: 'CYP3A4 blokajı -> aktif SN-38 sitotoksik maruziyet artışı.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'ONC High-Priority 15 (JAMIA 2012); FDA Camptosar Label',
      guidelineSource: 'Phansalkar et al., JAMIA 2012; TİTCK Campto KÜB Bölüm 4.5',
      recommendations: [
        'Güçlü CYP3A4 inhibitörünü irinotekandan en az 1 hafta önce kesiniz ve etkileşimsiz alternatif seçiniz.'
      ],
      involvedDrugs: [toRef(byKey.get('irinotecan')!), ...strongCyp3a4.map(toRef)],
      alertClass: 'danger',
      badgeLabel: '🚨 ONC-15 KONTRENDİKE (X)'
    });
  }

  // 7b. ONC-15: Ramelteon / Tizanidin + Güçlü CYP1A2 İnhibitörü (Fluvoksamin / Siprofloksasin)
  if ((hasSys('ramelteon') || hasSys('tizanidine')) && strongCyp1a2.length > 0) {
    const subC = hasSys('tizanidine') ? byKey.get('tizanidine')! : byKey.get('ramelteon')!;
    alerts.push({
      ruleId: `ONC_${subC.canonicalKey.toUpperCase()}_CYP1A2_001`,
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: `ONC YÜKSEK ÖNCELİKLİ KONTRENDİKASYON: ${subC.displayNameTr} + Güçlü CYP1A2 İnhibitörü`,
      message: `${strongCyp1a2.map(d => d.displayNameTr).join(' + ')}, ${subC.displayNameTr} plazma maruziyetini (AUC) 10–190 kat artırarak derin hipotansiyon, bradikardi ve ağır sedasyona yol açar. Eşzamanlı kullanım KESİNLİKLE KONTRENDİKEDİR.`,
      mechanism: 'Güçlü CYP1A2 inhibisyonu ile presistemik ilk-geçiş klirensinin tam çökmesi.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'ONC High-Priority 15 (JAMIA 2012); FDA Contraindication',
      guidelineSource: 'Phansalkar et al., JAMIA 2012; OpenFDA Tizanidine/Ramelteon Label',
      recommendations: [
        'Kombinasyondan kesinlikle kaçınınız; alternatif kas gevşetici/hipnotik veya CYP1A2 inhibitörü olmayan antibiyotik seçiniz.'
      ],
      involvedDrugs: [toRef(subC), ...strongCyp1a2.map(toRef)],
      alertClass: 'danger',
      badgeLabel: '🚨 ONC-15 CYP1A2 KONTRENDİKE (X)'
    });
  }

  // 7c. ONC-15: Ergotamin + Güçlü CYP3A4 İnhibitörü (Ergotizm / Vazospazm)
  if (hasSys('ergotamine') && strongCyp3a4.length > 0) {
    alerts.push({
      ruleId: 'ONC_ERGOT_CYP3A4_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'ONC YÜKSEK ÖNCELİKLİ KONTRENDİKASYON: Ergotamin + Güçlü CYP3A4 İnhibitörü (Akut Ergotizm)',
      message: `${strongCyp3a4.map(d => d.displayNameTr).join(' + ')} ile ergot alkaloidlerinin birlikte kullanımı serebral ve ekstremite iskemisine yol açan ölümcül vazospazm (ergotizm) nedeniyle MUTLAK KONTRENDİKEDİR.`,
      mechanism: 'CYP3A4 inhibisyonu sonucu toksik ergotamin birikimi ve kontrolsüz alfa-adrenerjik/serotonerjik vazokonstriksiyon.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'ONC High-Priority 15; FDA Kara Kutu Uyarısı',
      guidelineSource: 'Phansalkar et al., JAMIA 2012; FDA Ergotamine Boxed Warning',
      recommendations: [
        'Ergotamin içeren preparatları derhal kesiniz; migren atağında etkileşimsiz alternatifleri değerlendiriniz.'
      ],
      involvedDrugs: [toRef(byKey.get('ergotamine')!), ...strongCyp3a4.map(toRef)],
      alertClass: 'danger',
      badgeLabel: '🚨 ERGOTİZM KONTRENDİKE (X)'
    });
  }

  // 7d. ONC-15: Pimozid + Güçlü CYP3A4 İnhibitörü
  if (hasSys('pimozide') && strongCyp3a4.length > 0) {
    alerts.push({
      ruleId: 'ONC_PIMOZIDE_CYP3A4_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'ONC YÜKSEK ÖNCELİKLİ KONTRENDİKASYON: Pimozid + Güçlü CYP3A4 İnhibitörü',
      message: `${strongCyp3a4.map(d => d.displayNameTr).join(' + ')} pimozid klirensini bloke ederek ağır QT uzaması, Torsades de Pointes ve ani kardiyak ölüme yol açar.`,
      mechanism: 'CYP3A4 inhibisyonu + doğrudan hERG potasyum kanal blokajı.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'ONC High-Priority 15; FDA Pimozide Boxed Warning',
      guidelineSource: 'Phansalkar et al., JAMIA 2012; OpenFDA Pimozide Label',
      recommendations: [
        'Kombinasyonu kesinlikle uygulamayınız.'
      ],
      involvedDrugs: [toRef(byKey.get('pimozide')!), ...strongCyp3a4.map(toRef)],
      alertClass: 'danger',
      badgeLabel: '🚨 ONC-15 PİMOZİD (X)'
    });
  }

  // 7e. Non-Oral İstisna (Tilson 2016): İnhale Flutikazon / Budezonid / Triamsinolon + Ritonavir / Güçlü CYP3A4 İnhibitörü
  const cushingSteroids = resolvedConcepts.filter(c => c.drugClasses.includes('corticosteroid_cyp3a4_cushing_risk'));
  if (cushingSteroids.length > 0 && strongCyp3a4.length > 0) {
    alerts.push({
      ruleId: 'ROUTE_EXC_ICS_CYP3A4_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'SİSTEMİK CUSHİNG & HPA BASKILANMASI: İnhale/Enjektabl Kortikosteroid + Güçlü CYP3A4 İnhibitörü',
      message: `${cushingSteroids.map(d => d.displayNameTr).join(' + ')} non-oral (inhale/nazal/eklem içi) formda olsa dahi ${strongCyp3a4.map(d => d.displayNameTr).join(' + ')} tarafından sistemik CYP3A4 yıkımının bloke edilmesi iyatrojenik Cushing sendromu ve adrenal yetmezliğe yol açar.`,
      mechanism: 'Sistemik emilen flutikazon/budezonid/triamsinolonun hepatik CYP3A4 klirensinin tamamen engellenmesi (Tilson 2016 non-oral rota istisnası).',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'FDA / EMA Uyarıları ve Olgu Serileri (Tilson et al., AJHP 2016)',
      guidelineSource: 'Tilson et al., AJHP 2016; TİTCK Flixotide / Norvir KÜB Bölüm 4.5',
      recommendations: [
        'Flutikazon/budezonid yerine CYP3A4 bağımlılığı düşük Beklometazon tercih ediniz veya kortikosteroid/inhibitör seçimini değiştiriniz.',
        'Birlikte kullanım zorunluysa adrenal supresyon ve Cushingoid bulgular açısından yakın izlem yapınız.'
      ],
      involvedDrugs: [...cushingSteroids.map(toRef), ...strongCyp3a4.map(toRef)],
      alertClass: 'warning',
      badgeLabel: '⚠️ İNHALE STEROİD + CYP3A4 (D)'
    });
  }

  // 7f. Kanama Yükü Yığılması (Antikoagülan + Antiplatelet + Sistemik NSAİİ + SSRI/SNRI)
  const anticoagulants = getSysClass('bleeding_anticoagulant');
  const antiplatelets = getSysClass('bleeding_antiplatelet');
  const bleedingNsaids = getSysClass('bleeding_nsaid');
  const bleedingSsri = getSysClass('bleeding_ssri_snri');

  const bleedingClassesCount =
    (anticoagulants.length > 0 ? 1 : 0) +
    (antiplatelets.length > 0 ? 1 : 0) +
    (bleedingNsaids.length > 0 ? 1 : 0) +
    (bleedingSsri.length > 0 ? 1 : 0);

  if (bleedingClassesCount >= 2) {
    const isMajorBleed =
      (anticoagulants.length > 0 && (bleedingNsaids.length > 0 || antiplatelets.length > 0)) ||
      bleedingClassesCount >= 3;
    const isSsriNsaidOnly =
      !isMajorBleed && bleedingSsri.length > 0 && bleedingNsaids.length > 0;
    const involved = [...anticoagulants, ...antiplatelets, ...bleedingNsaids, ...bleedingSsri].map(toRef);

    alerts.push({
      ruleId: 'STACK_BLEEDING_BURDEN_001',
      tier: isMajorBleed ? 2 : 3,
      alertTier: isMajorBleed ? 'TIER_2_SOFT_STOP' : 'TIER_3_MONITORING',
      alertLevel: isMajorBleed ? 'SOFT_STOP_WARNING' : 'WARNING_MONITOR',
      alertTitle: isMajorBleed
        ? `YÜKSEK KANAMA YIĞILMASI (${bleedingClassesCount} Hemostatik/Mukozal Sınıf)`
        : 'ARTMIŞ ÜST GİS KANAMA RİSKİ: Çoklu Kanama Yükü Kombinasyonu',
      message: `${involved.map(d => d.displayNameTr).join(' + ')} eşzamanlı kullanımı trombosit fonksiyonu, pıhtılaşma kaskadı ve/veya gastrik mukozal bariyer üzerinden aditif majör GİS/intrakraniyal kanama riski doğurur.${isSsriNsaidOnly ? ' (SSRI + NSAİİ kombinasyonunda üst GİS kanama riski tekil etkilerin ötesinde %19 artar; yüksek riskli hastalarda NNH = 179, düşük risklide NNH = 645.)' : ''}`,
      mechanism: 'Antikoagülasyon + trombosit serotonin/COX-1 inhibisyonu + gastrik prostaglandin kaybı.',
      clinicalSeverity: isMajorBleed ? 'MAJOR' : 'MODERATE',
      interruptive: isMajorBleed,
      blocksConfirmation: false,
      evidenceLevel: 'Meta-Analizler & W3C PDDI-CDS Zarar Sıklığı Verisi (NNH)',
      guidelineSource: 'ESC/ACC Antithrombotic Guidelines; W3C PDDI-CDS Note; Janusmed Risk Profile',
      recommendations: [
        'Mümkünse sistemik NSAİİ yerine Parasetamol veya topikal analjezik tercih ediniz.',
        'Birlikte kullanım zorunluysa PPI ile gastroproteksiyon (klopidogrel varsa Pantoprazol) ekleyiniz.',
        'Melena, hematemez, açıklanamayan hemoglobin düşüşü ve INR (varfarin varsa) izlemi yapınız.'
      ],
      involvedDrugs: involved,
      alertClass: isMajorBleed ? 'warning' : 'yellow',
      badgeLabel: isMajorBleed ? '⚠️ MAJÖR KANAMA YÜKÜ (D)' : '⚡ GİS KANAMA İZLEMİ (C)'
    });
  }

  // 7g. Child-Pugh C Siroz Bağlam Yükselticisi: Rimegepant (2x maruziyet -> Kaçın)
  if (hasSys('rimegepant') && childPughClass === 'C') {
    alerts.push({
      ruleId: 'HEP_RIMEGEPANT_CPC_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'HEPATİK KONTRENDİKASYON / KAÇIN (Child-Pugh C): Rimegepant',
      message: 'Ağır karaciğer yetmezliğinde (Child-Pugh Sınıf C) rimegepant sistemik maruziyeti yaklaşık 2 katına çıktığından kullanımı önerilmemektedir (Child-Pugh A ve B\'de doz ayarı gerekmez).',
      mechanism: 'Ağır hepatik klirens kaybı sonucu artmış sistemik CGRP antagonisti maruziyeti.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'FDA Nurtec/Vydura Label & Weersink Child-Pugh CDS Çerçevesi',
      guidelineSource: 'OpenFDA Rimegepant Label; Weersink et al., BMJ Open 2016',
      recommendations: [
        'Child-Pugh Sınıf C sirozda rimegepanttan kaçınınız; hepatoloji uyumlu migren alternatifi değerlendiriniz.'
      ],
      involvedDrugs: [toRef(byKey.get('rimegepant')!)],
      alertClass: 'warning',
      badgeLabel: '⚠️ CHILD-PUGH C KAÇIN (D)'
    });
  }

  // 7h. Beta-Bloker + Non-Dihidropiridin KKB (Verapamil / Diltiazem) Şiddetli Bradikardi / AV Blok
  const betaBlockersAll = getSysClass('beta_blocker');
  const nonDhpCcbs = systemic.filter(d => d.canonicalKey === 'verapamil' || d.canonicalKey === 'diltiazem');
  if (betaBlockersAll.length > 0 && nonDhpCcbs.length > 0) {
    const anyIv = [...betaBlockersAll, ...nonDhpCcbs].some(d => isParenteralRoute(d.route));
    const involved = [...betaBlockersAll, ...nonDhpCcbs].map(toRef);
    alerts.push({
      ruleId: 'STACK_BB_NONDHP_AVBLOCK_001',
      tier: anyIv ? 1 : 2,
      alertTier: anyIv ? 'TIER_1_HARD_STOP' : 'TIER_2_SOFT_STOP',
      alertLevel: anyIv ? 'HARD_STOP_CONTRAINDICATION' : 'SOFT_STOP_WARNING',
      alertTitle: anyIv
        ? 'ÖLÜMCÜL AV BLOK / ASİSTOLİ RİSKİ: IV Beta-Bloker + Verapamil/Diltiazem'
        : 'YÜKSEK AV BLOK & BRADİKARDİ RİSKİ: Beta-Bloker + Verapamil/Diltiazem',
      message: `${involved.map(d => d.displayNameTr).join(' + ')} eşzamanlı kullanımı SA/AV düğüm iletimini ve miyokardiyal kontraktiliteyi sinerjistik olarak baskılayarak yüksek dereceli AV blok, şiddetli bradikardi ve kardiyojenik şoka yol açabilir.${anyIv ? ' İntravenöz eşzamanlı uygulama KESİNLİKLE KONTRENDİKEDİR!' : ''}`,
      mechanism: 'Sinerjistik negatif kronotropik, dromotropik ve inotropik etki (Verapamil ayrıca CYP3A4/P-gp ile beta-bloker maruziyetini artırabilir).',
      clinicalSeverity: anyIv ? 'CRITICAL' : 'MAJOR',
      interruptive: true,
      blocksConfirmation: anyIv,
      evidenceLevel: 'ESC Hipertansiyon & AF Kılavuzu; TİTCK Beloc / Isoptin KÜB Bölüm 4.3-4.5',
      guidelineSource: 'ESC/ACC Guidelines; TİTCK KÜB 4.3/4.5; OpenFDA Verapamil/Metoprolol SPL',
      recommendations: [
        'İntravenöz Verapamil/Diltiazem ile IV Beta-Bloker kesinlikle eşzamanlı uygulanmamalıdır.',
        'Oral tedavide KKB gerekiyorsa non-dihidropiridin yerine dihidropiridin (Amlodipin) tercih ediniz.',
        'Zorunlu hallerde kalp hızı (<50/dk), kan basıncı ve EKG PR aralığını (>220 ms) yakından izleyiniz.'
      ],
      involvedDrugs: involved,
      alertClass: anyIv ? 'danger' : 'warning',
      badgeLabel: anyIv ? '⛔ IV AV BLOK RİSKİ (X)' : '⚠️ AV BLOK / BRADİKARDİ (D)'
    });
  }

  // 7i. Sülfonilüre (Gliklazid / Glimepirid / Glibenklamid) + CYP2C9 İnhibitörü (Flukonazol / Vorikonazol / Metronidazol)
  const sulfonylureas = systemic.filter(d =>
    d.drugClasses.includes('sulfonylurea') ||
    ['gliclazide', 'glimepiride', 'glyburide', 'glibenclamide', 'glipizide'].includes(d.canonicalKey)
  );
  const cyp2c9Inh = [
    ...getSysClass('cyp2c9_strong_inhibitor'),
    ...getSysClass('cyp2c9_moderate_inhibitor')
  ];
  if (sulfonylureas.length > 0 && cyp2c9Inh.length > 0) {
    const involved = [...sulfonylureas, ...cyp2c9Inh].map(toRef);
    alerts.push({
      ruleId: 'CYP2C9_SU_HYPOGLYCEMIA_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'ŞİDDETLİ HİPOGLİSEMİ RİSKİ: Sülfonilüre + CYP2C9 İnhibitörü',
      message: `${cyp2c9Inh.map(d => d.displayNameTr).join(' / ')} güçlü/orta CYP2C9 inhibisyonu yaparak ${sulfonylureas.map(d => d.displayNameTr).join(' / ')} klirensini belirgin azaltır; uzamış ve hayatı tehdit eden hipoglisemi atakları gelişebilir.`,
      mechanism: 'CYP2C9 aracılı hepatik sülfonilüre eliminasyonunun inhibisyonu sonucu artmış insülin sekresyonu.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'FDA Clinical DDI Table & TİTCK Triflucan / Diamicron KÜB Bölüm 4.5',
      guidelineSource: 'FDA Clinical DDI Table; TİTCK KÜB 4.5; OpenFDA Fluconazole SPL',
      recommendations: [
        'Kapiller kan glukozunu sık (günde 2–4 kez) izleyiniz; hipoglisemi belirtileri konusunda hastayı uyarınız.',
        'Sülfonilüre dozunu geçici olarak azaltmayı veya etkileşimsiz antidiyabetik/antifungal alternatifi değerlendiriniz.'
      ],
      involvedDrugs: involved,
      alertClass: 'warning',
      badgeLabel: '⚠️ CYP2C9 HİPOGLİSEMİ (D)'
    });
  }

  return { alerts, tisdaleScore };
}
