/**
 * klinik-pwa - 4-Tier Clinical Drug Interaction & ACORN Downgrade Engine (TypeScript)
 * 
 * Clinical & Regulatory Context:
 * 1. Alert Fatigue (Alarm Yorgunluğu) Önleme Mimarisi:
 *    Elektronik Karar Destek Sistemlerinde (KKDS) hekimlerin alarmları göz ardı etme oranı
 *    filtresiz ticari veri tabanlarında %80-95'e ulaşmaktadır. Bu motor; yalnızca kanıtlanmış,
 *    ölümcül veya geri dönüşümsüz organ hasarına yol açan durumları tam kesintiye uğratıcı (Hard Stop)
 *    olarak sınıflandırır; diğer etkileşimleri 4 kademeli rasyonel hiyerarşide sunar.
 * 
 * 2. Dört Kademeli Uyarı Hiyerarşisi (4-Tier Alert Hierarchy):
 *    - Tier 1: HARD_STOP_CONTRAINDICATION (Kesin Kontrendikasyon - Reçete Onayını Kilitler)
 *      Ölümcül ve geri dönüşümsüz riskler. Zorunlu konsültasyon / override kodu olmadan aşılamaz.
 *    - Tier 2: SOFT_STOP_WARNING (Ciddi Uyarı / Kaçın - Hekim Onay Modülü)
 *      Modal açarak hekimi durdurur, "Risk değerlendirildi / Laboratuvar izlemi yapılacak" onayıyla aşılabilir.
 *    - Tier 3: WARNING_MONITOR (Yakın İzlem / Doz Ayarı - Non-interruptive Rozet)
 *      Hekimin ekranını bölmez; reçete satırının yanında renkli uyarı rozeti olarak sunulur.
 *    - Tier 4: INFO_PASSIVE (Bilgilendirme / Pasif Rozet / Düşük Risk)
 *      Klinik akışı kesmeyen, monograf veya reçete dipnotunda yer alan bilgilendirme paneli.
 * 
 * 3. ACORN Çalışması Uyarınca Vankomisin + Piperasilin/Tazobaktam (VPT) Kuralı Downgrade:
 *    ACORN Çok Merkezli Randomize Klinik Çalışması (JAMA 2023;330(18):1747–1757, N=2511):
 *    Vankomisin + Piperasilin/Tazobaktam kombinasyonunda serum kreatinininde görülen yükselmenin
 *    tübüler anyon taşıyıcıları (OAT) düzeyinde sekresyon rekabeti (psödo-AKI) olduğu;
 *    Sefepim + Vankomisin ile karşılaştırıldığında diyaliz ihtiyacı ve 14 günlük mortalitede artış
 *    BULUNMADIĞI kanıtlanmıştır. Aksine sefepime gereksiz geçiş nörotoksisiteyi artırmaktadır.
 *    Bu nedenle VPT kuralı kesintiye uğratıcı blokajdan çıkarılıp TIER 4 (INFO_PASSIVE) seviyesine
 *    indirilmiştir.
 * 
 * Standards & Guidelines:
 * - ACORN Randomized Clinical Trial (JAMA 2023;330(18):1747-1757)
 * - KDIGO 2024 Clinical Practice Guideline for CKD
 * - EHRA 2021 Practical Guide on DOACs in Atrial Fibrillation
 * - FDA Drug Safety Communications (Ceftriaxone, Colchicine, Opioid-BZD, Clopidogrel)
 * - TİTCK Onaylı Kısa Ürün Bilgileri (KÜB Bölüm 4.3 ve Bölüm 4.5)
 */

import {
  resolveToRxNormConcept,
  resolveBatchRxNormConcepts,
  type ResolvedRxConcept
} from './rxNormMappingEngine';
import type { DrugInputItem } from '../types/engines';

export type AlertTierLevel =
  | 'TIER_1_HARD_STOP'
  | 'TIER_2_SOFT_STOP'
  | 'TIER_3_MONITORING'
  | 'TIER_4_INFORMATIONAL';

export type InteractionAlertCode =
  | 'HARD_STOP_CONTRAINDICATION'
  | 'SOFT_STOP_WARNING'
  | 'WARNING_MONITOR'
  | 'INFO_PASSIVE'
  | 'DOSING_ALERT';

export interface PatientSafetyContext {
  ageDays?: number | null;
  ageYears?: number | null;
  gestationalAgeWeeks?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  gender?: 'male' | 'female' | null;
  serumCreatinineMgDl?: number | null;
  egfr?: number | null;
  baselineK?: number | null;
  serumPotassiumMeqL?: number | null;
  isPregnant?: boolean;
  trimester?: number | null;
  pregnancyWeeks?: number | null;
  diagnosis?: string | null;
  indication?: string | null;
  admissionUnit?: string | null;
  history?: string[];
}

export interface DrugInvolvedRef {
  raw: string;
  canonicalKey: string;
  rxCui: string;
  displayNameTr: string;
  displayNameEn: string;
}

export interface InteractionAlert {
  ruleId: string;
  tier: 1 | 2 | 3 | 4;
  alertTier: AlertTierLevel;
  alertLevel: InteractionAlertCode;
  alertTitle: string;
  message: string;
  mechanism: string;
  clinicalSeverity: 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'INFO';
  interruptive: boolean;
  blocksConfirmation: boolean;
  evidenceLevel: string;
  guidelineSource: string;
  recommendations: string[];
  involvedDrugs: DrugInvolvedRef[];
  alertClass: 'danger' | 'warning' | 'yellow' | 'info';
  badgeLabel: string;
}

export interface InteractionEvaluationResult {
  totalDrugsEvaluated: number;
  totalAlertsCount: number;
  hasHardStop: boolean;
  hasSoftStop: boolean;
  canConfirmWithoutOverride: boolean;
  highestTier: AlertTierLevel | 'NONE';
  alerts: InteractionAlert[];
  countsByTier: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4: number;
  };
  resolvedConcepts: ResolvedRxConcept[];
  summaryMessage: string;
}

/**
 * 4 SEVİYELİ ETKİLEŞİM VE GÜVENLİK MOTORU
 */
export function evaluatePrescriptionInteractions(
  drugs: (DrugInputItem | string | null | undefined)[] = [],
  patientContext: PatientSafetyContext = {}
): InteractionEvaluationResult {
  const alerts: InteractionAlert[] = [];
  const validInputs = Array.isArray(drugs) ? drugs.filter(Boolean) : [];
  const resolvedList = resolveBatchRxNormConcepts(validInputs);

  // Concept lookup by canonical key
  const conceptMap = new Map<string, ResolvedRxConcept>();
  resolvedList.forEach(c => conceptMap.set(c.canonicalKey, c));

  const has = (key: string): boolean => conceptMap.has(key);
  const getDrugRef = (key: string): DrugInvolvedRef => {
    const c = conceptMap.get(key);
    if (!c) {
      return { raw: key, canonicalKey: key, rxCui: '', displayNameTr: key, displayNameEn: key };
    }
    return {
      raw: typeof c.rawInput === 'string' ? c.rawInput : String((c.rawInput as any)?.name || (c.rawInput as any)?.brand || key),
      canonicalKey: c.canonicalKey,
      rxCui: c.rxCui,
      displayNameTr: c.displayNameTr,
      displayNameEn: c.displayNameEn
    };
  };

  const hasClass = (className: string): boolean => {
    return resolvedList.some(c => c.drugClasses.includes(className));
  };

  const getDrugsWithClass = (className: string): DrugInvolvedRef[] => {
    return resolvedList
      .filter(c => c.drugClasses.includes(className))
      .map(c => getDrugRef(c.canonicalKey));
  };

  // Patient parameters
  const ageYears = patientContext.ageYears !== undefined && patientContext.ageYears !== null
    ? Number(patientContext.ageYears)
    : null;
  const ageDays = patientContext.ageDays !== undefined && patientContext.ageDays !== null
    ? Number(patientContext.ageDays)
    : (ageYears !== null ? ageYears * 365.25 : null);
  const isNeonate = (ageDays !== null && ageDays <= 28) || (ageYears !== null && ageYears < (28 / 365));
  const isYoungInfant = ageDays !== null && ageDays <= 60;
  const isPediatric = ageYears !== null && ageYears < 18;
  const isUnder12 = ageYears !== null && ageYears < 12;
  const isUnder8 = ageYears !== null && ageYears < 8;
  const diagnosis = (patientContext.diagnosis || '').toLowerCase();
  const indication = ((patientContext.indication || '') + ' ' + (patientContext.diagnosis || '')).toLowerCase();
  const isPostTonsillectomy = diagnosis.includes('tonsil') || diagnosis.includes('adeno') || diagnosis.includes('tonsillektomi') || indication.includes('tonsil') || indication.includes('adeno');

  // Preterm postmenstrual age check (≤ 41 weeks)
  const gestationalAgeWeeks = patientContext.gestationalAgeWeeks !== undefined && patientContext.gestationalAgeWeeks !== null
    ? Number(patientContext.gestationalAgeWeeks)
    : null;
  const postmenstrualAgeWeeks = gestationalAgeWeeks !== null && ageDays !== null
    ? (gestationalAgeWeeks + (ageDays / 7))
    : null;
  const isPretermUnder41Weeks = postmenstrualAgeWeeks !== null && postmenstrualAgeWeeks <= 41;
  const isCeftriaxoneNeonateOrPreterm = isNeonate || isPretermUnder41Weeks;

  // Laboratory and pregnancy parameters
  const baselineK = patientContext.serumPotassiumMeqL !== undefined && patientContext.serumPotassiumMeqL !== null
    ? Number(patientContext.serumPotassiumMeqL)
    : (patientContext.baselineK !== undefined && patientContext.baselineK !== null ? Number(patientContext.baselineK) : null);
  const egfr = patientContext.egfr !== undefined && patientContext.egfr !== null ? Number(patientContext.egfr) : null;
  const isPregnant = !!patientContext.isPregnant;
  const trimester = patientContext.trimester !== undefined && patientContext.trimester !== null
    ? Number(patientContext.trimester)
    : (patientContext.pregnancyWeeks !== undefined && patientContext.pregnancyWeeks !== null
        ? (patientContext.pregnancyWeeks <= 13 ? 1 : (patientContext.pregnancyWeeks <= 27 ? 2 : 3))
        : null);
  const pregnancyWeeks = patientContext.pregnancyWeeks !== undefined && patientContext.pregnancyWeeks !== null
    ? Number(patientContext.pregnancyWeeks)
    : (trimester === 1 ? 8 : (trimester === 2 ? 20 : (trimester === 3 ? 32 : null)));

  // =========================================================================
  // --- TIER 1: KESİN KONTRENDİKASYONLAR (HARD STOPS - REÇETEYİ KİLİTLER) ---
  // =========================================================================

  // 1.1 Seftriakson + Kalsiyum (≤28 Gün Yenidoğan veya ≤41 Hafta Prematüre - Fatal Presipitasyon)
  const hasCeftriaxone = has('ceftriaxone');
  const hasCalcium = has('calcium_gluconate') || has('calcium_chloride') || has('ringer_lactate');

  if (hasCeftriaxone && hasCalcium && isCeftriaxoneNeonateOrPreterm) {
    const caKey = has('calcium_gluconate') ? 'calcium_gluconate' : (has('calcium_chloride') ? 'calcium_chloride' : 'ringer_lactate');
    alerts.push({
      ruleId: 'NEO_CEFT_CA_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'KESİN KONTRENDİKASYON: Seftriakson + İntravenöz Kalsiyum (≤28 Gün / Prematüre)',
      message: `${ageDays !== null ? Math.round(ageDays) : '≤28'} günlük yenidoğanda veya düzeltilmiş yaşı ≤41 hafta prematürede seftriakson ile kalsiyum içeren solüsyonların birlikte veya farklı damar yollarından verilmesi fatal intravasküler/pulmoner çökelti riski nedeniyle KESİNLİKLE KONTRENDİKEDİR. Sefotaksim gibi kalsiyum presipitasyonu yapmayan alternatifleri tercih ediniz.`,
      mechanism: 'Seftriakson kalsiyum katyonları ile suda çözünmeyen seftriakson-kalsiyum mikrokristalleri oluşturur; yenidoğanlarda akciğer ve böbrek mikrovasküler yatağında fatal embolizasyona yol açar.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'Düzenleyici Güvenlik Uyarısı (FDA/EMA/TİTCK KÜB Bölüm 4.3)',
      guidelineSource: 'FDA Drug Safety Communication; TİTCK Rocephin/Desefin KÜB',
      recommendations: [
        'Seftriaksonu derhal kesiniz.',
        'Yenidoğanda güvenli 3. kuşak alternatif: Sefotaksim (Claforan).',
        'Alternatif ampirik rejim: Ampisilin + Gentamisin.'
      ],
      involvedDrugs: [getDrugRef('ceftriaxone'), getDrugRef(caKey)],
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.2 Karbapenemler + Valproik Asit / Sodyum Valproat (Dirençli Nöbet & Status Epileptikus)
  const hasCarbapenem = has('meropenem') || has('ertapenem') || has('imipenem_cilastatin');
  const hasValproate = has('valproic_acid');

  if (hasCarbapenem && hasValproate) {
    const carbKey = has('meropenem') ? 'meropenem' : (has('ertapenem') ? 'ertapenem' : 'imipenem_cilastatin');
    const carbRef = getDrugRef(carbKey);
    alerts.push({
      ruleId: 'DDI_VPA_CARB_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'HAYATİ ETKİLEŞİM: Karbapenem + Valproik Asit',
      message: `${carbRef.displayNameTr}, serum valproik asit düzeyini 24 saat içinde %80-90 oranında düşürerek dirençli epileptik nöbet ve status epileptikusa yol açar. Valproat dozu artırılarak bu etki aşılamaz. Karbapenem dışı bir antibiyotik (örn. piperasilin/tazobaktam) seçiniz veya nöbet profilaksisini değiştiriniz.`,
      mechanism: 'Karbapenemler valproik asit glukuronid hidrolizini sağlayan açilpeptit hidrolazı geri dönüşümsüz inaktive eder ve valproatın enterohepatik reabsorpsiyonunu bloke eder.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'Düzenleyici Kara Kutu Uyarısı / Farmakovijilans Konsensüsü',
      guidelineSource: 'FDA Merrem Label; TİTCK Depakin KÜB Bölüm 4.5',
      recommendations: [
        'Karbapenem grubu antibiyotiklerden kesinlikle kaçınınız.',
        'Antipsödomonal alternatif: Piperasilin-Tazobaktam veya Sefepim.',
        'Antibiyotik zorunluysa nöroloji konsültasyonu ile Levetirasetam (Keppra) gibi karbapenemden etkilenmeyen antiepileptiğe geçiniz.'
      ],
      involvedDrugs: [getDrugRef('valproic_acid'), carbRef],
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.3 Ksantin Oksidaz İnhibitörleri + Tiyopürinler (Fatal Kemik İliği Aplazisi)
  const hasXanthine = has('allopurinol') || has('febuxostat');
  const hasThiopurine = has('azathioprine') || has('mercaptopurine');

  if (hasXanthine && hasThiopurine) {
    const xKey = has('allopurinol') ? 'allopurinol' : 'febuxostat';
    const tKey = has('azathioprine') ? 'azathioprine' : 'mercaptopurine';
    alerts.push({
      ruleId: 'DDI_ALLO_THIO_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'ÖLÜMCÜL ETKİLEŞİM: Allopürinol / Febuksostat + Azatioprin / 6-MP',
      message: 'Ksantin oksidaz inhibisyonu azatioprin/6-MP inaktivasyonunu tamamen durdurarak toksik 6-tiyoguanin nükleotidlerinin fırlamasına ve ölümcül pansitopeni, nötropenik sepsise yol açar. Tiyopürin dozu %75 indirilip TDM yapılmadıkça bu kombinasyon KESİNLİKLE KONTRENDİKEDİR.',
      mechanism: '6-merkaptopürinin 6-tiyoürik aside dönüşümü ksantin oksidaz tarafından katalizlenir; enzimin blokajı sitotoksik metabolitlerin birikmesine yol açar.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'Kılavuz ve Ruhsat Konsensüsü (Kanıt Düzeyi A)',
      guidelineSource: 'TİTCK İmuran & Ürikoliz KÜB; Medsafe Alert',
      recommendations: [
        'Birlikte reçetelemeyiniz.',
        'Gut alevlenmesinde allopurinol yerine kolşisin (böbrek fonksiyonu normalse) veya kısa süreli steroid değerlendiriniz.',
        'Zorunlu onkolojik durumlarda azatioprin dozu %25-33 düzeyine düşürülmeli ve haftalık hemogram bakılmalıdır.'
      ],
      involvedDrugs: [getDrugRef(xKey), getDrugRef(tKey)],
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.4 PDE-5 İnhibitörleri + Nitratlar (Refrakter Ölümcül Hipotansiyon)
  const hasPde5 = has('sildenafil') || has('tadalafil');
  const hasNitrate = has('nitroglycerin') || has('isosorbide_dinitrate') || has('isosorbide_mononitrate');

  if (hasPde5 && hasNitrate) {
    const pdeKey = has('sildenafil') ? 'sildenafil' : 'tadalafil';
    const nitKey = has('nitroglycerin') ? 'nitroglycerin' : (has('isosorbide_mononitrate') ? 'isosorbide_mononitrate' : 'isosorbide_dinitrate');
    alerts.push({
      ruleId: 'DDI_PDE5_NITRATE_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'ÖLÜMCÜL HİPOTANSİYON RİSKİ: PDE-5 İnhibitörü + Nitrat',
      message: 'Sildenafil/Tadalafil ile nitrat türevlerinin (Nitrogliserin, İzosorbid dinitrat/mononitrat) eşzamanlı kullanımı sinerjistik cGMP birikimi ile vazomotor kollaps, derin refrakter hipotansiyon ve ölümcül miyokard infarktüsüne yol açar. KESİNLİKLE KONTRENDİKEDİR (Sildenafil sonrası en az 24 saat, Tadalafil sonrası en az 48 saat nitrat kullanımı mutlak yasaktır).',
      mechanism: 'Nitratlar guanilat siklazı uyararak cGMP üretimini artırırken, PDE-5 inhibitörleri cGMP yıkımını bloke eder; vasküler düz kasta kontrolsüz gevşeme meydana gelir.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'Düzenleyici Kara Kutu Uyarısı (AHA/ACC Sınıf III: Harm)',
      guidelineSource: 'AHA/ACC STEMI Guidelines; FDA Boxed Warning; TİTCK KÜB',
      recommendations: [
        'Kombinasyon kesinlikle yasaktır.',
        'Sildenafil sonrası en az 24 saat, Tadalafil sonrası en az 48 saat hiçbir nitrat türevi verilmemelidir.',
        'Akut koroner sendromda nitrat yerine opioid veya beta-blokör analjezi değerlendiriniz.'
      ],
      involvedDrugs: [getDrugRef(pdeKey), getDrugRef(nitKey)],
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.5 Kolşisin + Güçlü CYP3A4 / P-gp İnhibitörleri (Fatal Kolşisin Toksisitesi)
  const hasColchicine = has('colchicine');
  const hasStrongCypInhibitor = hasClass('cyp3a4_strong_inhibitor');

  if (hasColchicine && hasStrongCypInhibitor) {
    const strongInhibitors = getDrugsWithClass('cyp3a4_strong_inhibitor');
    alerts.push({
      ruleId: 'DDI_COLCH_CYP3A4_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'ÖLÜMCÜL TOKSİSİTE: Kolşisin + Güçlü CYP3A4 / P-gp İnhibitörü',
      message: 'Klaritromisin, eritromisin veya azol antifungaller kolşisinin hepatik CYP3A4 yıkımını ve renal P-gp atılımını tamamen durdurarak eğri altı alanını 3-4 kat artırır. Ağır miyopati, rabdomiyoliz ve ölümcül kemik iliği aplazisi riski nedeniyle KESİNLİKLE KONTRENDİKEDİR (Özellikle böbrek/karaciğer yetmezliğinde mutlak yasak).',
      mechanism: 'P-glikoprotein ve CYP3A4 izoenzimlerinin eşzamanlı tam blokajı kolşisin toksik birikimine yol açar.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'FDA Kara Kutu Uyarısı (Colcrys Label); EMA PRAC Raporu',
      guidelineSource: 'FDA Boxed Warning; EMA SmPC; TİTCK Kolsin KÜB Bölüm 4.3',
      recommendations: [
        'Kolşisin kullanan hastada antibiyotik gerekliyse CYP3A4 etkileşimsiz AZİTROMİSİN veya Beta-laktam tercih ediniz.',
        'Klaritromisin zorunluysa kolşisin tedavisini enfeksiyon süresince DERHAL DURDURUNUZ.'
      ],
      involvedDrugs: [getDrugRef('colchicine'), strongInhibitors[0]],
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.6 Pediatrik Tramadol / Kodein (<12 Yaş veya Post-tonsillektomi)
  const hasTramadol = has('tramadol');
  const hasCodeine = has('codeine');

  if ((hasTramadol || hasCodeine) && (isUnder12 || (isPediatric && isPostTonsillectomy))) {
    const opioidKey = hasTramadol ? 'tramadol' : 'codeine';
    const opioidName = hasTramadol ? 'Tramadol' : 'Kodein';
    const ruleCode = hasTramadol ? 'PUD_TRAMADOL_AGE_001' : 'PUD_CODEINE_AGE_001';
    alerts.push({
      ruleId: ruleCode,
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: `KESİN KONTRENDİKASYON: 12 Yaş Altında ${opioidName} Kullanımı`,
      message: `${opioidName}, solunum durması ve CYP2D6 metabolizmasına bağlı fatal opioid toksisitesi riski nedeniyle 12 yaş altındaki çocuklarda KESİNLİKLE KONTRENDİKEDİR. Ayrıca 18 yaş altındaki tonsilektomi/adenoidektomi postoperatif ağrısında kullanımı yasaklanmıştır. Yaşa uygun parasetamol veya ibuprofen tercih ediniz.`,
      mechanism: 'CYP2D6 ultra-hızlı metabolizör çocuklarda aktif opioid metabolitleri (O-desmetiltramadol veya morfin) kontrolsüz fırlayarak santral apne ve ölümcül solunum durmasına yol açar.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'FDA Drug Safety Communication / EMA PRAC / TİTCK Kara Kutu Uyarısı',
      guidelineSource: 'FDA Safety Alert 2017; TİTCK Contramal KÜB Bölüm 4.3',
      recommendations: [
        `${opioidName} reçetesini derhal siliniz.`,
        'Hafif-orta ağrıda: Parasetamol (10-15 mg/kg) veya İbuprofen (5-10 mg/kg).',
        'Şiddetli postoperatif ağrıda: Uzman hekim gözetiminde morfin titre edilerek monitörize ortamda uygulanabilir.'
      ],
      involvedDrugs: [getDrugRef(opioidKey)],
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.7 MAOI + Serotonerjik Ajanlar (Ölümcül Serotonin Sendromu)
  const hasMaoi = hasClass('maoi_activity') || has('moclobemide') || has('selegiline') || has('rasagiline');
  const hasSerotonergic = hasClass('ssri') || hasClass('snri') || hasClass('tca') || hasClass('serotonergic_opioid') || hasClass('triptan');

  if (hasMaoi && hasSerotonergic) {
    const maoiRef = getDrugsWithClass('maoi_activity')[0] || getDrugRef('moclobemide');
    const seroRef = resolvedList.find(c => c.drugClasses.includes('ssri') || c.drugClasses.includes('snri') || c.drugClasses.includes('serotonergic_opioid'))!;
    alerts.push({
      ruleId: 'DDI_SERO_MAOI_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'ÖLÜMCÜL SEROTONİN SENDROMU: MAOI / Linezolid + Serotonerjik Ajan',
      message: 'MAO enzim inhibisyonu serotonin yıkımını durdururken eşzamanlı serotonerjik ajan sinaptik aralıkta fatal serotonin birikimine yol açar (Hunter Kriterleri: Hipertermi, klonus, rabdomiyoliz, nöbet). KESİNLİKLE KONTRENDİKEDİR.',
      mechanism: 'Monoamin oksidaz blokajı + serotonin geri alım inhibisyonu = nöromüsküler ve otonomik fırtına.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'Hunter Toksisite Kriterleri Validasyon Kohortu (Kanıt A)',
      guidelineSource: 'Dunkley et al., QJM 2003; TİTCK Zyvoxid & Lustral KÜB',
      recommendations: [
        'Eşzamanlı reçetelemeyiniz.',
        'Linezolid tedavisi şartsa serotonerjik antidepresanı acilen kesiniz veya Vankomisin/Daptomisin tercih ediniz.',
        'Fluoksetin sonrası MAOI için en az 5 hafta, diğerlerinde en az 14 gün arınma (wash-out) periyodu gereklidir.'
      ],
      involvedDrugs: [maoiRef, getDrugRef(seroRef.canonicalKey)],
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.8 Simvastatin / Lovastatin + Güçlü CYP3A4 İnhibitörü (Rabdomiyoliz)
  const hasHighRiskStatin = hasClass('cyp3a4_dependent_rhabdo_high_risk');
  if (hasHighRiskStatin && hasStrongCypInhibitor) {
    const statinRef = getDrugsWithClass('cyp3a4_dependent_rhabdo_high_risk')[0];
    const inhibitorRef = getDrugsWithClass('cyp3a4_strong_inhibitor')[0];
    alerts.push({
      ruleId: 'DDI_STATIN_CYP3A4_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'KESİN KONTRENDİKE: Simvastatin + Güçlü CYP3A4 İnhibitörü (Rabdomiyoliz)',
      message: `${inhibitorRef.displayNameTr}, ${statinRef.displayNameTr} eğri altı alanını 10 ila 20 kat artırarak akut rabdomiyoliz, miyoglobinürik böbrek yetmezliği ve ölüme yol açar. Birlikte reçeteleme KESİNLİKLE YASAKTIR.`,
      mechanism: 'CYP3A4 hepatik ilk geçiş metabolizmasının tam blokajı statin sistemik toksisitesine yol açar.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'FDA Drug Safety Communication / TİTCK Kara Kutu Uyarısı',
      guidelineSource: 'FDA Drug Safety Bulletin 2011; TİTCK Zocor KÜB Bölüm 4.3',
      recommendations: [
        'Antibiyotik olarak CYP3A4 etkileşimsiz AZİTROMİSİN tercih ediniz.',
        'Statin gerekliyse hidrofilik ROSUVASTATİN veya PRAVASTATİN seçiniz.',
        'Tedavi süresince statine ara verilmesi (statin hold) zorunludur.'
      ],
      involvedDrugs: [statinRef, inhibitorRef],
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.9 Potasyum Tutucu Diüretik + Potasyum Takviyesi (Ölümcül Hiperkalemi / Kardiyak Arrest)
  const hasKSparingDiuretic = hasClass('potassium_sparing_diuretic') || has('spironolactone') || has('eplerenone');
  const hasPotassiumSupplement = hasClass('potassium_salt') || has('potassium_chloride');

  if (hasKSparingDiuretic && hasPotassiumSupplement) {
    const kDiurRef = getDrugRef(has('spironolactone') ? 'spironolactone' : 'eplerenone');
    const kSuppRef = getDrugRef('potassium_chloride');
    const isSevereHypokalemiaReplacement = baselineK !== null && baselineK < 3.0;

    if (isSevereHypokalemiaReplacement) {
      // Belgelenmiş şiddetli hipokalemide yakın izlem altında izin verilebilir (Tier 2 Soft Stop)
      alerts.push({
        ruleId: 'DDI_K_SPARING_K_SUPP_002',
        tier: 2,
        alertTier: 'TIER_2_SOFT_STOP',
        alertLevel: 'SOFT_STOP_WARNING',
        alertTitle: 'AĞIR HİPOKALEMİ REPLASMANI: Potasyum Tutucu Diüretik + Potasyum',
        message: `Hastada belgelenmiş derin hipokalemi (K+: ${baselineK} mEq/L) mevcuttur. Potasyum replasmanı uygulanırken potasyum tutucu diüretik (${kDiurRef.displayNameTr}) nedeniyle ani hiperkalemi fırlaması riski yüksektir. Günlük elektrolit takibi zorunludur.`,
        mechanism: 'Distal tübüler K+ atılımının baskılanması altında ekzojen K+ yüklemesi.',
        clinicalSeverity: 'MAJOR',
        interruptive: true,
        blocksConfirmation: false,
        evidenceLevel: 'ESC Kalp Yetersizliği Kılavuzu; KDIGO 2024',
        guidelineSource: 'ESC Guidelines for Heart Failure; KDIGO 2024 Guidelines',
        recommendations: [
          'Günlük serum potasyum takibi yapınız.',
          'Serum K+ ≥4.5 mEq/L olduğunda potasyum takviyesini derhal kesiniz.'
        ],
        involvedDrugs: [kDiurRef, kSuppRef],
        alertClass: 'warning',
        badgeLabel: '⚠️ CİDDİ UYARI (HİPOKALEMİ REPLASMANI)'
      });
    } else {
      // Standart veya bilinmeyen K düzeyinde KESİN KONTRENDİKASYON (Hard Stop)
      alerts.push({
        ruleId: 'DDI_K_SPARING_K_SUPP_001',
        tier: 1,
        alertTier: 'TIER_1_HARD_STOP',
        alertLevel: 'HARD_STOP_CONTRAINDICATION',
        alertTitle: 'ÖLÜMCÜL HİPERKALEMİ RİSKİ: Potasyum Tutucu Diüretik + Potasyum Takviyesi',
        message: `${kDiurRef.displayNameTr} kortikal toplayıcı kanallarda potasyum atılım mekanizmasını bloke ederken eşzamanlı ekzojen potasyum (${kSuppRef.displayNameTr}) verilmesi ani kardiyotoksik hiperkalemi, sinüs arresti, ventriküler fibrilasyon ve asistoliye yol açar. Belgelenmiş derin hipokalemi (<3.0 mEq/L) ve yakın monitorizasyon bulunmadıkça KESİNLİKLE KONTRENDİKEDİR.`,
        mechanism: 'Renal kortikal toplayıcı tübüllerde aldosteron reseptör blokajı sonucu K+ atılımının engellenmesi ve ekzojen K+ yüküyle eliminasyon kapasitesinin aşılması.',
        clinicalSeverity: 'CRITICAL',
        interruptive: true,
        blocksConfirmation: true,
        evidenceLevel: 'Kılavuz Konsensüsü (Sınıf III: Harm)',
        guidelineSource: 'ESC Kalp Yetersizliği Kılavuzu; KDIGO 2024; TİTCK Aldactone & K-Contin KÜB',
        recommendations: [
          'Potasyum takviyesini veya potasyum tutucu diüretikten birini reçeteden siliniz.',
          'Hastanın serum potasyum düzeyini derhal kontrol ediniz.',
          'Kalp yetersizliğinde hedef K+ düzeyi 4.0-5.0 mEq/L aralığında tutulmalıdır.'
        ],
        involvedDrugs: [kDiurRef, kSuppRef],
        alertClass: 'danger',
        badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
      });
    }
  }

  // 1.10 Metotreksat + TMP-SMX (Ölümcül Pansitopeni ve Nefrotoksisite)
  const hasMtx = has('methotrexate');
  const hasTmpSmx = has('trimethoprim_sulfamethoxazole');

  if (hasMtx && hasTmpSmx) {
    alerts.push({
      ruleId: 'DDI_MTX_TMPSMX_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'ÖLÜMCÜL PANSİTOPENİ VE NEFROTOKSİSİTE: Metotreksat + TMP-SMX',
      message: 'TMP-SMX (Baktrim), renal tübüllerde OAT1 ve OAT3 anyon taşıyıcılarını yarışmalı olarak inhibe ederek metotreksat atılımını durdurur ve aditif dihidrofolat redüktaz blokajı yapar. Şiddetli nötropeni, pansitopeni, ölümcül nötropenik sepsis ve akut böbrek hasarı riski nedeniyle birlikte kullanım KESİNLİKLE KONTRENDİKEDİR.',
      mechanism: 'Böbrek tübüler sekresyon rekabeti sonucu metotreksat klerensinin çökmesi + sinerjistik folat metabolizması blokajı.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'Kohort Çalışmaları ve Farmakovijilans Konsensüsü',
      guidelineSource: 'TİTCK Metotreksat & Baktrim KÜB Bölüm 4.5; BNF Drug Interactions',
      recommendations: [
        'TMP-SMX reçetesini derhal siliniz.',
        'Pneumocystis jirovecii (PJP) profilaksisinde veya enfeksiyonlarda atovakuon, pentamidin veya dapson gibi alternatifleri değerlendiriniz.',
        'Metotreksat toksisitesinde kurtarma amacıyla acilen Lökovorin (Folonik asit) kalsiyum protokolünü başlatınız.'
      ],
      involvedDrugs: [getDrugRef('methotrexate'), getDrugRef('trimethoprim_sulfamethoxazole')],
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.11 Çift "Bilinen Risk" QT Uzatıcı İlaç Kombinasyonu (Torsades de Pointes)
  const knownQtDrugs = getDrugsWithClass('qt_prolonging_known');

  if (knownQtDrugs.length >= 2) {
    alerts.push({
      ruleId: 'DDI_QT_DUAL_KNOWN_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'HAYATİ ARİTMİ (TdP) RİSKİ: Çift Bilinen Riskli QT Uzatıcı İlaç Kombinasyonu',
      message: `Reçetede kardiyak hERG (IKr) potasyum kanallarını güçlü şekilde bloke eden en az 2 adet 'Bilinen Risk' (Known Risk) grubu ilaç bulunmaktadır (${knownQtDrugs.map(d => d.displayNameTr).join(' + ')}). Sinerjistik QTc uzaması, Torsades de Pointes (TdP) ve fatal dejeneratif ventriküler taşikardi riski nedeniyle KESİNLİKLE KONTRENDİKEDİR.`,
      mechanism: 'Ventriküler kardiyomiyosit zarındaki human Ether-à-go-go-Related Gene (hERG) tarafından kodlanan IKr hızlı gecikmiş doğrultucu potasyum kanallarının aditif blokajı ve refrakter ventriküler repolarizasyon uzaması.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'Kılavuz Konsensüsü (Kanıt Düzeyi A)',
      guidelineSource: 'CredibleMeds QTdrugs Risk Sınıflandırması; AHA/ACC Prevention of TdP Guidelines',
      recommendations: [
        'Aritmojenik kombinasyondan kaçınınız; QT uzatmayan bir alternatif seçiniz.',
        'Başlangıç 12 derivasyonlu EKG çekerek bazal QTc aralığını değerlendiriniz.',
        'Serum potasyum (≥4.0 mEq/L) ve magnezyum (≥2.0 mg/dL) düzeylerini optimize ediniz.'
      ],
      involvedDrugs: knownQtDrugs,
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.12 DOAC + Güçlü CYP3A4 / P-gp Modülatörleri (Fatal Kanama veya Tromboemboli)
  const hasDoac = hasClass('doac') || has('apixaban') || has('rivaroxaban') || has('dabigatran');
  const hasStrongInducer = hasClass('cyp3a4_strong_inducer');

  if (hasDoac && (hasStrongCypInhibitor || hasStrongInducer)) {
    const doacRef = getDrugsWithClass('doac')[0] || getDrugRef('apixaban');
    const modulatorRef = (hasStrongCypInhibitor ? getDrugsWithClass('cyp3a4_strong_inhibitor')[0] : getDrugsWithClass('cyp3a4_strong_inducer')[0]);
    const isInducer = hasStrongInducer && !hasStrongCypInhibitor;

    alerts.push({
      ruleId: 'DDI_DOAC_CYP3A4_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: isInducer
        ? 'HAYATİ TROMBOEMBOLİ RİSKİ: DOAC + Güçlü CYP3A4 / P-gp İndükleyicisi'
        : 'ÖLÜMCÜL KANAMA RİSKİ: DOAC + Güçlü CYP3A4 / P-gp İnhibitörü',
      message: isInducer
        ? `${modulatorRef.displayNameTr}, hepatik CYP3A4 ve intestinal/renal P-gp pompalarını güçlü şekilde indükleyerek ${doacRef.displayNameTr} plazma seviyesini %50'den fazla düşürür. Akut iskemik inme ve fatal sistemik emboli riski nedeniyle KESİNLİKLE KONTRENDİKEDİR.`
        : `${modulatorRef.displayNameTr}, hepatik CYP3A4 ve renal P-gp klerensini bloke ederek ${doacRef.displayNameTr} sistemik maruziyetini 2 katına çıkarır. Ölümcül intrakraniyal ve majör gastrointestinal kanama riski nedeniyle KESİNLİKLE KONTRENDİKEDİR.`,
      mechanism: 'P-glikoprotein ve CYP3A4 eliminasyon yollarının güçlü modülasyonu ile DOAC biyoyararlanım ve klerensinde öngörülemez radikal sapmalar.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'Uzman Kılavuzu (Kanıt Düzeyi A)',
      guidelineSource: '2021 EHRA Practical Guide on DOACs in AF; FDA Boxed Warning; TİTCK Eliquis/Xarelto KÜB',
      recommendations: isInducer
        ? [
            'DOAC ile güçlü indükleyici (Rifampisin, Karbamazepin) kombinasyonundan kesinlikle kaçınınız.',
            'Antikoagülasyon zorunluysa INR takipli Varfarin veya LMWH (Enoksaparin) tercih ediniz.'
          ]
        : [
            'Güçlü inhibitör yerine CYP3A4 etkileşimsiz bir alternatif seçiniz.',
            'Antikoagülasyon zorunluysa LMWH (Enoksaparin) rejimine geçiniz.'
          ],
      involvedDrugs: [doacRef, modulatorRef],
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.13 Yenidoğan ve Genç İnfantta Sülfonamid (TMP-SMX) Kullanımı (<60 Gün - Kernikterus)
  if (hasTmpSmx && isYoungInfant) {
    alerts.push({
      ruleId: 'NEO_SULFONAMIDE_001',
      tier: 1,
      alertTier: 'TIER_1_HARD_STOP',
      alertLevel: 'HARD_STOP_CONTRAINDICATION',
      alertTitle: 'KESİN KONTRENDİKASYON: 60 Gün Altında Sülfonamid (TMP-SMX) Kullanımı',
      message: `${ageDays !== null ? Math.round(ageDays) : '<60'} günlük süt çocuğunda/yenidoğanda sülfametoksazol, bilirubini serum albüminine bağlanma bölgelerinden yarışmalı olarak ayırır (displacement). Serbest kalan lipofilik bilirubin gelişmemiş kan-beyin bariyerini aşarak kernikterus, kalıcı koreoatetoz ve bazal gangliyon nekrozuna yol açar. KESİNLİKLE KONTRENDİKEDİR.`,
      mechanism: 'Albümin-bilirubin bağlanma yarışması ve serbest non-konjüge bilirubinin santral sinir sistemi nükleuslarına çökmesi.',
      clinicalSeverity: 'CRITICAL',
      interruptive: true,
      blocksConfirmation: true,
      evidenceLevel: 'Düzenleyici Ruhsat Metni ve Kılavuz Konsensüsü',
      guidelineSource: 'TİTCK Baktrim KÜB Bölüm 4.3; AAP Red Book',
      recommendations: [
        'TMP-SMX reçetesini derhal siliniz.',
        'Yenidoğan ve <60 gün infantta güvenli antibakteriyel alternatifler: Amoksisilin-Klavulanat veya 3. Kuşak Sefalosporinler (Sefotaksim).',
        'Sarılık bulguları varsa serum total ve direkt bilirubin düzeyini kontrol ediniz.'
      ],
      involvedDrugs: [getDrugRef('trimethoprim_sulfamethoxazole')],
      alertClass: 'danger',
      badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
    });
  }

  // 1.14 Pediatride Tetrasiklin Kullanımı (<8 Yaş - Diş Renk Değişikliği ve Kemik Büyüme Geriliği)
  const hasTetracycline = has('doxycycline') || has('tetracycline') || hasClass('tetracycline_antibiotic');
  const isTickOrRickettsial = indication.includes('kene') || indication.includes('tick') || indication.includes('rikets') || indication.includes('ricketts') || indication.includes('lyme') || indication.includes('kkka') || indication.includes('cchf');

  if (hasTetracycline && isUnder8) {
    const tetKey = has('doxycycline') ? 'doxycycline' : 'tetracycline';
    const tetRef = getDrugRef(tetKey);

    if (isTickOrRickettsial) {
      // CDC / AAP Kılavuzu: Şüpheli Riketsiya, Lyme veya Kırım-Kongo Kanamalı Ateşinde Doksisiklin yaşa bakılmaksızın ilk tercihtir (≤21 gün)
      alerts.push({
        ruleId: 'PUD_TETRACYCLINE_TICK_002',
        tier: 2,
        alertTier: 'TIER_2_SOFT_STOP',
        alertLevel: 'SOFT_STOP_WARNING',
        alertTitle: 'DOKSİSİKLİN İZİN VERİLEN KULLANIM: Kene / Riketsiya Enfeksiyonu (<8 Yaş)',
        message: `Hasta 8 yaş altındadır ancak kene maruziyeti / riketsiya / Lyme / KKKA şüphesi mevcuttur. CDC ve AAP kılavuzlarına göre bu endikasyonlarda doksisiklin hayat kurtarıcıdır ve ≤21 günlük kısa süreli tedavilerde kalıcı diş lekelenmesi riski ihmal edilebilir düzeydedir.`,
        mechanism: 'Riketsiyal enfeksiyonlarda hayat kurtarıcı birinci basamak tedavi protokolü.',
        clinicalSeverity: 'MAJOR',
        interruptive: true,
        blocksConfirmation: false,
        evidenceLevel: 'CDC Rickettsial Diseases Guidance; AAP Red Book',
        guidelineSource: 'CDC MMWR Rickettsial Guidance; AAP Committee on Infectious Diseases',
        recommendations: [
          'Tedavi süresini 21 gün ile sınırlı tutunuz.',
          'Güneş ışığı maruziyetinden kaçınmasını (fotosensitivite) ve bol su ile verilmesini hatırlatınız.'
        ],
        involvedDrugs: [tetRef],
        alertClass: 'warning',
        badgeLabel: '⚠️ CİDDİ UYARI (KENE/RİKETSİYA İSTİSNASI)'
      });
    } else {
      // Rutin pediatrik enfeksiyonlarda KESİN KONTRENDİKASYON (Hard Stop)
      alerts.push({
        ruleId: 'PUD_TETRACYCLINE_AGE_001',
        tier: 1,
        alertTier: 'TIER_1_HARD_STOP',
        alertLevel: 'HARD_STOP_CONTRAINDICATION',
        alertTitle: 'KESİN KONTRENDİKASYON: 8 Yaş Altında Tetrasiklin Kullanımı',
        message: `Tetrasiklin grubu antibiyotikler (${tetRef.displayNameTr}) odontogenez (diş minesi gelişimi) ve erken kemik büyüme evresinde kalsiyum ortofosfat kompleksi oluşturarak hidroksiapatit kristallerine kalıcı olarak bağlanır. Geri dönüşümsüz sarı-gri-kahverengi diş renk değişikliği ve mine hipoplazisine yol açar. 8 yaş altında KESİNLİKLE KONTRENDİKEDİR (Acil Riketsiya/Kene tedavisi hariç).`,
        mechanism: 'Gelişmekte olan diş ve kemik dokusunda kalsiyum şelasyonu ve hidroksiapatit kafesine kalıcı inkorporasyon.',
        clinicalSeverity: 'CRITICAL',
        interruptive: true,
        blocksConfirmation: true,
        evidenceLevel: 'Kılavuz ve Ruhsat Konsensüsü (FDA/EMA/TİTCK KÜB Bölüm 4.3)',
        guidelineSource: 'AAP Red Book; TİTCK Monodoks KÜB Bölüm 4.3',
        recommendations: [
          'Tetrasiklin reçetesini siliniz.',
          'Pediatrik güvenli alternatifleri değerlendiriniz: Amoksisilin-Klavulanat, Sefalosporinler veya Azitromisin.',
          'Endikasyon Kene / Riketsiya ise tanı alanına "Riketsiya" veya "Kene" yazarak kılavuz onaylı kullanım sağlayınız.'
        ],
        involvedDrugs: [tetRef],
        alertClass: 'danger',
        badgeLabel: '🚨 KESİN KONTRENDİKASYON (HARD STOP)'
      });
    }
  }

  // 1.15 GEBELİK VE TERATOJENİTE HARD STOPLARI (isPregnant === true)
  if (isPregnant) {
    // A. Sistemik Retinoidler (İzotretinoin, Asitretin) -> Kesin Kontrendike (Retinoid Embriyopatisi)
    const hasRetinoid = has('isotretinoin') || has('acitretin') || hasClass('retinoid');
    if (hasRetinoid) {
      const retRef = getDrugRef(has('isotretinoin') ? 'isotretinoin' : 'acitretin');
      alerts.push({
        ruleId: 'PREG_RETINOID_001',
        tier: 1,
        alertTier: 'TIER_1_HARD_STOP',
        alertLevel: 'HARD_STOP_CONTRAINDICATION',
        alertTitle: 'MUTLAK KONTRENDİKASYON: Gebelikte Sistemik Retinoid (Embriyopati)',
        message: `${retRef.displayNameTr} gebelikte mutlak kontrendikedir (%20-30 majör konjenital malformasyon riski). Retinoid Embriyopatisi: Mikrotia, timik aplazi, konotrunkal kardiyak anomaliler, hidrosefali ve spontan abortus. Gebe kadınlarda veya onaylanmış gebelik önleme programı (PPP) bulunmayan doğurganlık çağındaki kadınlarda reçete KESİNLİKLE KİLİTLENMELİDİR.`,
        mechanism: 'Embriyonik morfogenezde nöral krest hücre göçünün ve gen ekspresyonunun retinoik asit reseptörleri üzerinden bozulması.',
        clinicalSeverity: 'CRITICAL',
        interruptive: true,
        blocksConfirmation: true,
        evidenceLevel: 'FDA Kategori X / PLLR Fetal Harm / TİTCK Mutlak Kontrendikasyon',
        guidelineSource: 'FDA iPLEDGE Program; TİTCK Roaccutane KÜB Bölüm 4.3 ve Bölüm 4.6',
        recommendations: [
          'Retinoid reçetesini derhal siliniz.',
          'Gebelik testi ve acil kadın doğum / teratoloji danışmanlığı sağlayınız.'
        ],
        involvedDrugs: [retRef],
        alertClass: 'danger',
        badgeLabel: '🚨 MUTLAK KONTRENDİKASYON (TERATOJEN)'
      });
    }

    // B. Valproik Asit -> Kesin Kontrendike (Nöral Tüp Defekti)
    if (hasValproate) {
      alerts.push({
        ruleId: 'PREG_VALPROATE_001',
        tier: 1,
        alertTier: 'TIER_1_HARD_STOP',
        alertLevel: 'HARD_STOP_CONTRAINDICATION',
        alertTitle: 'KESİN KONTRENDİKASYON: Gebelikte Valproik Asit (Nöral Tüp Defekti)',
        message: 'Valproik asit nöral tüp defektleri (spina bifida %1-2), kraniyofasiyal dizostoz, neonatal zeka geriliği (ortalama 9 IQ puanı kayıp) ve otizm spektrum bozukluğu riskini dramatik olarak artırır. Bipolar ve migren tedavisinde mutlak yasaktır; refrakter epilepside yalnızca başka alternatif bulunamayan durumlarda uzman hekim heyetiyle kullanılabilir.',
        mechanism: 'Folat metabolizmasının bozulması, histon deasetilaz (HDAC) inhibisyonu ve nöral krest apoptozu.',
        clinicalSeverity: 'CRITICAL',
        interruptive: true,
        blocksConfirmation: true,
        evidenceLevel: 'EMA PRAC & FDA Kara Kutu Uyarısı / TİTCK KÜB Bölüm 4.6',
        guidelineSource: 'EMA PRAC Valproate Restrictions; FDA Drug Safety Communication; TİTCK KÜB',
        recommendations: [
          'Valproat tedavisini acilen alternatif bir antiepileptiğe (Levetirasetam, Lamotrijin) geçiniz.',
          'Yüksek doz folik asit (4-5 mg/gün) desteği planlayınız.'
        ],
        involvedDrugs: [getDrugRef('valproic_acid')],
        alertClass: 'danger',
        badgeLabel: '🚨 KESİN KONTRENDİKASYON (TERATOJEN)'
      });
    }

    // C. RAAS Blokörleri (ACEi, ARB) -> 2. ve 3. Trimesterde Kesin Kontrendike
    const hasRaas = hasClass('triple_whammy_ras') || hasClass('ace_inhibitor') || hasClass('arb');
    const isSecondOrThirdTrimester = trimester === null || trimester >= 2 || (pregnancyWeeks !== null && pregnancyWeeks >= 13);

    if (hasRaas && isSecondOrThirdTrimester) {
      const raasRef = getDrugsWithClass('triple_whammy_ras')[0] || getDrugRef('enalapril');
      alerts.push({
        ruleId: 'PREG_RAAS_001',
        tier: 1,
        alertTier: 'TIER_1_HARD_STOP',
        alertLevel: 'HARD_STOP_CONTRAINDICATION',
        alertTitle: 'KESİN KONTRENDİKASYON: Gebelikte (2. ve 3. Trimester) RAAS Blokörü',
        message: `${raasRef.displayNameTr}, 2. ve 3. trimesterde fetal renal tübüler disgenezis, persistan anüri, oligohidramniyos sekansı, fetal kafatası kemikleşme defektleri, pulmoner hipoplazi ve Potter dizisine yol açar. Gebelikte kullanımı KESİNLİKLE KONTRENDİKEDİR.`,
        mechanism: 'Fetal böbrek anjiyotensin II sinyalinin blokajı sonucu intraglomerüler filtrasyon basıncının çökmesi ve renal iskemi/nekroz.',
        clinicalSeverity: 'CRITICAL',
        interruptive: true,
        blocksConfirmation: true,
        evidenceLevel: 'FDA Kara Kutu Uyarısı / TİTCK KÜB Bölüm 4.6',
        guidelineSource: 'ACOG Practice Bulletin on Gestational Hypertension; FDA Boxed Warning',
        recommendations: [
          'RAAS blokörünü derhal kesiniz.',
          'Gebelikte güvenli antihipertansiflere geçiniz: Labetalol, Metildopa veya Nifedipin.'
        ],
        involvedDrugs: [raasRef],
        alertClass: 'danger',
        badgeLabel: '🚨 KESİN KONTRENDİKASYON (FETOTOKSİK)'
      });
    }

    // D. Metotreksat -> Kesin Kontrendike (Fetal Aminopterin Sendromu)
    if (hasMtx) {
      alerts.push({
        ruleId: 'PREG_MTX_001',
        tier: 1,
        alertTier: 'TIER_1_HARD_STOP',
        alertLevel: 'HARD_STOP_CONTRAINDICATION',
        alertTitle: 'MUTLAK KONTRENDİKASYON: Gebelikte Metotreksat (Fetal Malformasyon)',
        message: 'Metotreksat güçlü bir teratojen ve abortifasandır (Fetal Aminopterin/Metotreksat Sendromu: Kraniyofasiyal anormallikler, büyüme geriliği, uzuv redüksiyon anomalileri, spontan abortus). Otoimmün veya romatolojik reçetelerde gebelikte KESİNLİKLE KONTRENDİKEDİR.',
        mechanism: 'Dihidrofolat redüktaz enziminin irreversibl blokajı sonucu DNA sentezi ve hücresel proliferasyonun durması.',
        clinicalSeverity: 'CRITICAL',
        interruptive: true,
        blocksConfirmation: true,
        evidenceLevel: 'FDA Kategori X / PLLR Fetal Harm / TİTCK KÜB Bölüm 4.6',
        guidelineSource: 'TİTCK Metotreksat KÜB Bölüm 4.3 ve Bölüm 4.6; UKTIS Monografları',
        recommendations: [
          'Metotreksatı derhal siliniz.',
          'Romatolojik gebelerde gebelikle uyumlu güvenli alternatifleri (örn. Hidroksiklorokin, Sulfasalazin) değerlendiriniz.'
        ],
        involvedDrugs: [getDrugRef('methotrexate')],
        alertClass: 'danger',
        badgeLabel: '🚨 MUTLAK KONTRENDİKASYON (TERATOJEN)'
      });
    }

    // E. Varfarin -> 6-12. Haftalarda Kesin Kontrendike (Fetal Varfarin Sendromu)
    const hasWarfarin = has('warfarin');
    if (hasWarfarin) {
      alerts.push({
        ruleId: 'PREG_WARFARIN_001',
        tier: 1,
        alertTier: 'TIER_1_HARD_STOP',
        alertLevel: 'HARD_STOP_CONTRAINDICATION',
        alertTitle: 'KESİN KONTRENDİKASYON: Gebelikte Varfarin (Fetal Varfarin Sendromu)',
        message: 'Varfarin plasentayı geçerek 6-12. gebelik haftalarında Fetal Varfarin Sendromuna (nazal hipoplazi, epifizyal beneklenme/kondrodizplazi punktata, optik atrofi ve mental retardasyon) ve intrauterin hemorajilere yol açar. Gebelikte kontrendikedir; acilen LMWH (Enoksaparin) rejimine geçilmelidir.',
        mechanism: 'Osteokalsin karboksilasyonunun ve K vitaminine bağımlı pıhtılaşma faktörlerinin fetal dolaşımda inhibisyonu.',
        clinicalSeverity: 'CRITICAL',
        interruptive: true,
        blocksConfirmation: true,
        evidenceLevel: 'ESC Kardiyoloji Gebelik Kılavuzu; TİTCK Coumadin KÜB Bölüm 4.6',
        guidelineSource: '2018 ESC Guidelines for Management of Cardiovascular Diseases during Pregnancy',
        recommendations: [
          'Varfarini derhal kesiniz.',
          'Plasentayı geçmeyen Düşük Molekül Ağırlıklı Heparine (LMWH - Enoksaparin) geçiniz.'
        ],
        involvedDrugs: [getDrugRef('warfarin')],
        alertClass: 'danger',
        badgeLabel: '🚨 KESİN KONTRENDİKASYON (TERATOJEN)'
      });
    }

    // F. Sistemik NSAİİ'lar -> ≥20. Hafta Fetal Renal Hasar & ≥28. Hafta Duktus Kapanması
    const hasSystemicNsaid = hasClass('triple_whammy_nsaid') || has('ibuprofen') || has('naproxen') || has('diclofenac');
    const isNsaidLatePregnancy = trimester === 3 || (pregnancyWeeks !== null && pregnancyWeeks >= 20) || (trimester === 2 && (pregnancyWeeks === null || pregnancyWeeks >= 20));

    if (hasSystemicNsaid && isNsaidLatePregnancy) {
      const nsaidRef = getDrugsWithClass('triple_whammy_nsaid')[0] || getDrugRef('ibuprofen');
      alerts.push({
        ruleId: 'PREG_NSAID_001',
        tier: 1,
        alertTier: 'TIER_1_HARD_STOP',
        alertLevel: 'HARD_STOP_CONTRAINDICATION',
        alertTitle: 'KESİN KONTRENDİKASYON: Gebelikte (≥20. Hafta) Sistemik NSAİİ Kullanımı',
        message: `Gebelikte 20. haftadan itibaren NSAİİ (${nsaidRef.displayNameTr}) kullanımı fetal renal iskemi ve oligohidramniyosa; 28. haftadan sonra ise fetal duktus arteriyozusun erken kapanması ve persistan pulmoner hipertansiyona (PPHN) yol açar. Analjezi ve ateş için parasetamol tercih edilmeli; NSAİİ kullanımı KESİNLİKLE KONTRENDİKEDİR.`,
        mechanism: 'Fetal prostaglandin sentezinin inhibisyonu sonucu renal kan akımının düşmesi ve duktus arteriyozus vazokonstriksiyonu.',
        clinicalSeverity: 'CRITICAL',
        interruptive: true,
        blocksConfirmation: true,
        evidenceLevel: 'FDA Drug Safety Communication (2020) / TİTCK KÜB Bölüm 4.6',
        guidelineSource: 'FDA Safety Alert October 2020; TİTCK Apranax & Dolven KÜB',
        recommendations: [
          'Sistemik NSAİİ reçetesini siliniz.',
          'Gebelikte güvenli analjezik ve antipiretik: Parasetamol.',
          'İleri gebelik haftasında kullanılmışsa fetal ekokardiyografi ve amniyotik sıvı indeksi (AFI) kontrol ediniz.'
        ],
        involvedDrugs: [nsaidRef],
        alertClass: 'danger',
        badgeLabel: '🚨 KESİN KONTRENDİKASYON (FETAL HASAR)'
      });
    }
  }

  // =========================================================================
  // --- TIER 2: CİDDİ UYARILAR (SOFT STOPS - HEKİM GEREKÇESİ/ONAYI GEREKTİRİR) ---
  // =========================================================================

  // 2.1 Seftriakson + Kalsiyum (>28 Gün Süt Çocuğu / Çocuk - Ardışık İnfüzyon Uyarısı)
  if (hasCeftriaxone && hasCalcium && !isCeftriaxoneNeonateOrPreterm) {
    const caKey = has('calcium_gluconate') ? 'calcium_gluconate' : (has('calcium_chloride') ? 'calcium_chloride' : 'ringer_lactate');
    alerts.push({
      ruleId: 'INF_CEFT_CA_002',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'WARNING_MONITOR',
      alertTitle: 'DİKKAT: Seftriakson ve Kalsiyum İçeren Sıvı Uygulaması',
      message: `Hasta 28 günden büyüktür (${ageDays !== null ? Math.round(ageDays) + ' günlük' : '>28 gün'}). Seftriakson ve kalsiyumlu sıvılar (${getDrugRef(caKey).displayNameTr}) ASLA aynı infüzyon hattından veya Y-setinden eşzamanlı verilmemelidir. Uygulamalar arasında damar yolu geçimli bir sıvı (%0,9 NaCl) ile tamamen yıkanarak ardışık (sequential) verilebilir.`,
      mechanism: 'Aynı lümende veya Y-setinde karşılaştıklarında seftriakson-kalsiyum partikülleri çöker; hat tıkanıklığı ve emboli riski oluşur. Damar yolu tamamen yıkandığında sistemik in vivo presipitasyon riski düşüktür.',
      clinicalSeverity: 'MAJOR',
      interruptive: false,
      blocksConfirmation: false,
      evidenceLevel: 'FDA Güncellenmiş Güvenlik Uyarısı (2009/2017 Revizyonu)',
      guidelineSource: 'FDA Safety Information 2009; TİTCK KÜB Bölüm 4.4',
      recommendations: [
        'Aynı infüzyon hattından veya Y-setinden eşzamanlı vermeyiniz.',
        'İki uygulama arasında infüzyon hattını en az 10-20 mL %0,9 SF ile tamamen yıkayınız (flush).',
        'Mümkünse farklı damar yolları kullanınız.'
      ],
      involvedDrugs: [getDrugRef('ceftriaxone'), getDrugRef(caKey)],
      alertClass: 'warning',
      badgeLabel: '⚠️ CİDDİ UYARI (ARDIŞIK İNFÜZYON)'
    });
  }

  // 2.2 Digoksin + Amiodaron / Verapamil (Zorunlu %50 Doz İndirimi Kuralı)
  const hasDigoxin = has('digoxin');
  const hasAmioOrVerapamil = has('amiodarone') || has('verapamil');

  if (hasDigoxin && hasAmioOrVerapamil) {
    const interKey = has('amiodarone') ? 'amiodarone' : 'verapamil';
    const interRef = getDrugRef(interKey);
    alerts.push({
      ruleId: 'DDI_DIGOXIN_AMIO_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: `DİGOKSİN DOZ İNDİRİMİ GEREKLİ (%50): Digoksin + ${interRef.displayNameTr}`,
      message: `${interRef.displayNameTr}, renal tübüllerde ve safra kanaliküllerinde P-glikoprotein (P-gp) taşıyıcılarını bloke ederek digoksin klerensini düşürür ve serum digoksin düzeyini %70-100 oranında fırlatır. Bidireksiyonel ventriküler taşikardi, tam kalp bloku ve fatal bradiaritmi riski nedeniyle DİGOKSİN DOZU OTOMATİK OLARAK %50 AZALTILMALIDIR.`,
      mechanism: 'P-glikoprotein aracılı renal tübüler sekresyonun ve biliyer atılımın yarışmalı inhibisyonu.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'Kılavuz Önerisi (Sınıf I, Kanıt B)',
      guidelineSource: 'ESC Heart Failure Guidelines; TİTCK Digoksin KÜB Bölüm 4.5',
      recommendations: [
        'Digoksin idame dozunu derhal %50 oranında azaltınız.',
        'Kombinasyon başlandıktan 1-2 hafta sonra serum digoksin vadi düzeyi (TDM) bakınız (Hedef: 0.5-0.9 ng/mL).',
        'Serum potasyum ve magnezyum düzeylerini takip ediniz.'
      ],
      involvedDrugs: [getDrugRef('digoxin'), interRef],
      alertClass: 'warning',
      badgeLabel: '⚠️ CİDDİ UYARI (DOZ İNDİRİMİ %50)'
    });
  }

  // 2.3 Varfarin + Güçlü CYP2C9 İnhibitörü (Ağır Kanama ve INR Fırlaması)
  const hasWarfarin = has('warfarin');
  const hasPotentCyp2c9 = hasClass('cyp2c9_strong_inhibitor') || has('fluconazole') || has('metronidazole') || has('amiodarone');

  if (hasWarfarin && hasPotentCyp2c9) {
    const cyp2c9Ref = getDrugsWithClass('cyp2c9_strong_inhibitor')[0] || getDrugRef(has('fluconazole') ? 'fluconazole' : (has('metronidazole') ? 'metronidazole' : 'amiodarone'));
    alerts.push({
      ruleId: 'DDI_WARFARIN_CYP2C9_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'CİDDİ KANAMA RİSKİ: Varfarin + Güçlü CYP2C9 İnhibitörü',
      message: `${cyp2c9Ref.displayNameTr}, daha güçlü antikoagülan olan (S)-varfarinin hepatik CYP2C9 klirensini bloke eder. INR kontrolsüz biçimde >8-10 seviyesine fırlayarak hayatı tehdit eden majör gastrointestinal veya intrakraniyal kanamalara yol açabilir.`,
      mechanism: 'CYP2C9 aracılı (S)-varfarin metabolizmasının yarışmalı inhibisyonu ve serbest antikoagülan yarı ömrünün uzaması.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'Randomize Çalışmalar ve Kılavuz Önerisi',
      guidelineSource: 'CHEST 2018 Antithrombotic Guidelines; BNF Drug Interactions',
      recommendations: [
        'Varfarin dozunu ampirik olarak %25-50 oranında azaltınız.',
        'Tedavinin 3. ila 5. gününde yakın INR kontrolü planlayınız.',
        'Mümkünse CYP2C9 etkileşimsiz alternatif bir antimikrobiyal tercih ediniz.'
      ],
      involvedDrugs: [getDrugRef('warfarin'), cyp2c9Ref],
      alertClass: 'warning',
      badgeLabel: '⚠️ CİDDİ UYARI (INR TAKİBİ)'
    });
  }

  // 2.4 Pediatride Florokinolon Kullanımı (<18 Yaş - Artropati ve Kondrotoksisite)
  const hasFqDrug = hasClass('fluoroquinolone') || has('ciprofloxacin') || has('levofloxacin') || has('moxifloxacin');
  const isCfOrAnthrax = indication.includes('kistik fibroz') || indication.includes('cystic fibrosis') || indication.includes('sarbon') || indication.includes('anthrax');

  if (hasFqDrug && isPediatric && !isCfOrAnthrax) {
    const fqRef = getDrugsWithClass('fluoroquinolone')[0] || getDrugRef('ciprofloxacin');
    alerts.push({
      ruleId: 'PUD_FQ_AGE_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'PEDİATRİK KULLANIM UYARISI: 18 Yaş Altında Florokinolon',
      message: `Florokinolonlar (${fqRef.displayNameTr}) immatür kondrositlerde magnezyum şelasyonu ve hücre içi proteoglikan sentezinin baskılanması sonucu ağırlık taşıyan eklemlerde kıkırdak nekrozu ve artropati riski taşır. Kistik fibrozis psödomonal alevlenmesi veya şarbon profilaksisi gibi birinci basamakta alternatifsiz durumlar dışında pediatrik yaş grubunda kaçınılmalıdır.`,
      mechanism: 'Büyüme kıkırdağında kondrosit apoptozu ve ekstraselüler matriks hasarı.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'EMA PRAC Florokinolon Kısıtlamaları; TİTCK KÜB Bölüm 4.3 ve Bölüm 4.4',
      guidelineSource: 'EMA PRAC Fluoroquinolone Assessment; TİTCK Cipro/Ciprasel KÜB',
      recommendations: [
        'Birinci basamak güvenli pediatrik antibakteriyel alternatifleri (Beta-laktamlar, Sefalosporinler, Makrolidler) değerlendiriniz.',
        'Antipsödomonal zorunluluk halinde çocuk enfeksiyon hastalıkları uzman konsültasyonu ile uygulayınız.'
      ],
      involvedDrugs: [fqRef],
      alertClass: 'warning',
      badgeLabel: '⚠️ CİDDİ UYARI (PEDİATRİK ARTROPATİ)'
    });
  }

  // 2.5 Metformin + İyotlu Kontrast Madde (Laktik Asidoz - MALA)
  const hasMetformin = has('metformin');
  const hasContrast = has('iodinated_contrast') || hasClass('contrast_media');

  if (hasMetformin && hasContrast) {
    alerts.push({
      ruleId: 'DDI_METFORMIN_CONTRAST_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'LAKTİK ASİDOZ (MALA) RİSKİ: Metformin + İyotlu Kontrast Madde',
      message: 'İyotlu kontrast maruziyeti sonrası kontrast ilişkili akut böbrek hasarı (CI-AKI) gelişirse, renal yolla atılan metforminin toksik birikimi ölümcül Metformin İlişkili Laktik Asidoza (MALA, %30-50 mortalite) yol açabilir. eGFR <30 mL/dak veya akut böbrek hasarı varlığında kontrast anında metformin kesilmeli; 48 saat sonra eGFR kontrolüyle yeniden başlanmalıdır.',
      mechanism: 'Kontrast nefropatisi sonucu azalan glomerüler filtrasyon nedeniyle metformin birikimi ve mitokondriyal laktat oksidasyonunun inhibisyonu.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'Kılavuz Konsensüsü (ACR v10.3)',
      guidelineSource: 'ACR Manual on Contrast Media (2024 v10.3); KDIGO 2024 Guidelines',
      recommendations: [
        'İşlem öncesi bazal eGFR değerini kontrol ediniz.',
        'eGFR <30 mL/dak veya akut nefropatide metformini işlem anında kesiniz.',
        'Kontrasttan 48 saat sonra böbrek fonksiyonları normalse metformini yeniden başlayınız.'
      ],
      involvedDrugs: [getDrugRef('metformin'), getDrugRef('iodinated_contrast')],
      alertClass: 'warning',
      badgeLabel: '⚠️ CİDDİ UYARI (MALA RİSKİ)'
    });
  }

  // 2.6 Triple Whammy (ACEi/ARB + Diüretik + NSAİİ)
  const hasRas = hasClass('triple_whammy_ras');
  const hasDiuretic = hasClass('triple_whammy_diuretic');
  const hasNsaid = hasClass('triple_whammy_nsaid');

  if (hasRas && hasDiuretic && hasNsaid) {
    alerts.push({
      ruleId: 'DDI_TRIPLE_WHAMMY_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'TRIPLE WHAMMY AKUT BÖBREK HASARI (ABH) RİSKİ',
      message: 'ACEi/ARB (Efferent arteriyol dilatasyonu) + Diüretik (Plazma volüm düşüşü) + NSAİİ (Afferent arteriyol konstriksiyonu) kombinasyonu intraglomerüler filtrasyon basıncını ani olarak çökertir. Böbrek yetmezliği riski 2-3 kat artar.',
      mechanism: 'Glomerüler hemodinaminin üç yönlü bozulması sonucu böbrek perfüzyonu durma noktasına gelir.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'Büyük Kohort Çalışmaları (BMJ 2013;346:e8525)',
      guidelineSource: 'KDIGO 2024 CKD Kılavuzu; Lapi et al., BMJ 2013',
      recommendations: [
        'Kombinasyondan kaçınınız; NSAİİ yerine Parasetamol tercih ediniz.',
        'NSAİİ zorunluysa hidrasyonu sağlayınız, serum kreatinin ve potasyumunu 48-72 saatte izleyiniz.',
        'Sistemik NSAİİ yerine topikal jelleri değerlendiriniz.'
      ],
      involvedDrugs: [
        getDrugsWithClass('triple_whammy_ras')[0],
        getDrugsWithClass('triple_whammy_diuretic')[0],
        getDrugsWithClass('triple_whammy_nsaid')[0]
      ],
      alertClass: 'warning',
      badgeLabel: '⚠️ CİDDİ UYARI (SOFT STOP)'
    });
  }

  // 2.7 Opioid + Benzodiyazepin / Gabapentinoid
  const hasOpioid = hasClass('opioid_analgesic') || has('fentanyl') || has('morphine') || has('tramadol') || has('codeine');
  const hasBzd = hasClass('benzodiazepine') || has('gabapentin') || has('pregabalin');

  if (hasOpioid && hasBzd) {
    const opRef = resolvedList.find(c => c.drugClasses.includes('opioid_analgesic') || c.canonicalKey === 'fentanyl' || c.canonicalKey === 'morphine' || c.canonicalKey === 'tramadol')!;
    const bzdRef = resolvedList.find(c => c.drugClasses.includes('benzodiazepine') || c.canonicalKey === 'gabapentin' || c.canonicalKey === 'pregabalin')!;
    alerts.push({
      ruleId: 'DDI_OPIOID_BZD_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'HAYATI TEHDİT EDEN SEDASYON & SOLUNUM DEPRESYONU: Opioid + Benzodiyazepin',
      message: 'Beyin sapı solunum merkezindeki opioiderjik (mu) ve GABAerjik nöronların sinerjistik depresyonu derin koma, solunum durması ve anoksik beyin ölümüne yol açabilir.',
      mechanism: 'Merkezi sinir sisteminde solunum dürtüsünün aditif ve sinerjistik baskılanması.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'FDA Kara Kutu Uyarısı / CDC Kılavuzu',
      guidelineSource: 'CDC Clinical Practice Guideline for Prescribing Opioids; FDA Boxed Warning',
      recommendations: [
        'Kombinasyondan kaçınınız veya her iki ilacın da dozunu en düşük etkin seviyeye çekiniz.',
        'Acil durumlarda kullanılmak üzere Nalokson reçetelemeyi değerlendiriniz.',
        'Hastanın solunum sayısı ve oksijen satürasyonu monitörize edilmelidir.'
      ],
      involvedDrugs: [getDrugRef(opRef.canonicalKey), getDrugRef(bzdRef.canonicalKey)],
      alertClass: 'warning',
      badgeLabel: '⚠️ CİDDİ UYARI (SOFT STOP)'
    });
  }

  // 2.8 Florokinolon + Sistemik Kortikosteroid (Aşil Tendon Rüptürü)
  const hasFq = hasClass('fluoroquinolone');
  const hasSteroid = hasClass('systemic_corticosteroid');

  if (hasFq && hasSteroid) {
    alerts.push({
      ruleId: 'DDI_FQ_STEROID_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'CİDDİ TENDON HASARI RİSKİ: Florokinolon + Sistemik Kortikosteroid',
      message: 'Florokinolonlar ve kortikosteroidler tenosit nekrozunu ve matriks metalloproteinaz salınımını aditif olarak artırır; akut aşil tendon rüptürü ve tendinit riski 40 katına çıkar.',
      mechanism: 'Kıkırdak ve tendon ekstraselüler matriks proteinlerinin aditif yıkımı.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'EMA PRAC & FDA Kara Kutu Uyarısı',
      guidelineSource: 'EMA PRAC Fluoroquinolone Assessment; TİTCK KÜB Bölüm 4.4',
      recommendations: [
        'Kombinasyondan kaçınınız; alternatif antibakteriyel sınıf öneriniz.',
        'Birlikte kullanım gerekiyorsa hasta ayak bileği ağrısı veya şişliğinde derhal ilacı kesip başvurmalıdır.'
      ],
      involvedDrugs: [getDrugsWithClass('fluoroquinolone')[0], getDrugsWithClass('systemic_corticosteroid')[0]],
      alertClass: 'warning',
      badgeLabel: '⚠️ CİDDİ UYARI (SOFT STOP)'
    });
  }

  // 2.9 Lityum + Tiyazid Diüretik / NSAİİ
  const hasLithium = has('lithium');
  if (hasLithium && (hasDiuretic || hasNsaid)) {
    alerts.push({
      ruleId: 'DDI_LITHIUM_THIAZIDE_001',
      tier: 2,
      alertTier: 'TIER_2_SOFT_STOP',
      alertLevel: 'SOFT_STOP_WARNING',
      alertTitle: 'CİDDİ LİTYUM TOKSİSİTESİ RİSKİ: Lityum + Tiyazid / NSAİİ',
      message: 'Tiyazid diüretikler ve NSAİİ\'ler lityumun renal tübüler reabsorpsiyonunu artırıp klerensini %25-40 oranında düşürür; nörotoksisite, ataksi, konfüzyon ve kalıcı SILENT sendromuna yol açar.',
      mechanism: 'Distal sodyum atılımı sonucu proksimal tübüllerde kompansatuvar lityum birikimi.',
      clinicalSeverity: 'MAJOR',
      interruptive: true,
      blocksConfirmation: false,
      evidenceLevel: 'APA Practice Guideline for Bipolar Disorder',
      guidelineSource: 'APA Bipolar Disorder Guideline; TİTCK Lituril KÜB',
      recommendations: [
        'Tiyazid ve NSAİİ birlikteliğinden kaçınınız.',
        'Tiyazid başlanması zorunluysa lityum dozu %50 azaltılmalı ve haftalık serum düzeyi bakılmalıdır.'
      ],
      involvedDrugs: [getDrugRef('lithium'), (hasDiuretic ? getDrugsWithClass('triple_whammy_diuretic')[0] : getDrugsWithClass('triple_whammy_nsaid')[0])],
      alertClass: 'warning',
      badgeLabel: '⚠️ CİDDİ UYARI (SOFT STOP)'
    });
  }

  // =========================================================================
  // --- TIER 3: YAKIN İZLEM / DOZ AYARI (MONITORING - NON-INTERRUPTIVE) ---
  // =========================================================================

  // 3.1 Klopidogrel + Omeprazol / Esomeprazol
  const hasClopidogrel = has('clopidogrel');
  const hasOmeprazole = has('omeprazole') || has('esomeprazole');

  if (hasClopidogrel && hasOmeprazole) {
    const ppiKey = has('omeprazole') ? 'omeprazole' : 'esomeprazole';
    alerts.push({
      ruleId: 'DDI_CLOPIDOGREL_PPI_001',
      tier: 3,
      alertTier: 'TIER_3_MONITORING',
      alertLevel: 'WARNING_MONITOR',
      alertTitle: 'YAKIN İZLEM: Klopidogrel + Omeprazol (CYP2C19 İnhibisyonu)',
      message: 'Omeprazol ve esomeprazol hepatik CYP2C19 izoenzimini yarışmalı olarak inhibe ederek klopidogrelin aktif metabolitine dönüşümünü ve antiplatelet etkinliğini azaltır. Pantoprazol veya H2 blokörlerine geçiş önerilir.',
      mechanism: 'CYP2C19 biyotransformasyon inhibisyonu.',
      clinicalSeverity: 'MODERATE',
      interruptive: false,
      blocksConfirmation: false,
      evidenceLevel: 'CPIC Farmakogenetik Kılavuzu / FDA Boxed Warning',
      guidelineSource: 'CPIC Guidelines for Clopidogrel/CYP2C19; FDA Safety Alert',
      recommendations: [
        'CYP2C19 üzerinde minimal inhibitör etkisi olan PANTOPRAZOL tercih ediniz.',
        'Alternatif olarak H2 reseptör blokörleri (Famotidin) değerlendirilebilir.'
      ],
      involvedDrugs: [getDrugRef('clopidogrel'), getDrugRef(ppiKey)],
      alertClass: 'yellow',
      badgeLabel: '⚡ YAKIN İZLEM / DOZ AYARI'
    });
  }

  // 3.2 İkili Nefrotoksik Kombinasyon (Double Whammy: RAS+Diüretik veya RAS+NSAİİ)
  const isDoubleWhammy = (!hasRas && hasDiuretic && hasNsaid) || (hasRas && hasNsaid && !hasDiuretic);
  if (isDoubleWhammy) {
    alerts.push({
      ruleId: 'DDI_DOUBLE_WHAMMY_001',
      tier: 3,
      alertTier: 'TIER_3_MONITORING',
      alertLevel: 'WARNING_MONITOR',
      alertTitle: 'YAKIN İZLEM: İkili Nefrotoksik İlaç Kombinasyonu',
      message: 'İkili nefrotoksik ajan birlikteliği renal perfüzyonu düşürebilir. Dehidrate veya yaşlı hastalarda renal fonksiyon takibi önerilir; üçüncü bir nefrotoksik ajanın eklenmemesi sağlanmalıdır.',
      mechanism: 'Renal otoregülasyonun parsiyel bozulması.',
      clinicalSeverity: 'MODERATE',
      interruptive: false,
      blocksConfirmation: false,
      evidenceLevel: 'KDIGO 2024 CKD Kılavuzu',
      guidelineSource: 'KDIGO 2024 Guidelines',
      recommendations: [
        'Hastanın hidrasyonunu sağlayınız.',
        'Ek reçetesiz NSAİİ kullanımından kaçınmasını hatırlatınız.'
      ],
      involvedDrugs: resolvedList.filter(c => c.drugClasses.includes('triple_whammy_ras') || c.drugClasses.includes('triple_whammy_diuretic') || c.drugClasses.includes('triple_whammy_nsaid')).map(c => getDrugRef(c.canonicalKey)),
      alertClass: 'yellow',
      badgeLabel: '⚡ YAKIN İZLEM'
    });
  }

  // 3.3 QT Uzatıcı Tek "Bilinen Risk" + "Koşullu/Olası Risk" Kombinasyonu (Non-interruptive Rozet)
  if (knownQtDrugs.length === 1) {
    const condQtDrugs = resolvedList.filter(c => c.drugClasses.includes('qt_prolonging_conditional') || c.drugClasses.includes('qt_prolonging_possible'));
    if (condQtDrugs.length > 0) {
      alerts.push({
        ruleId: 'DDI_QT_POSSIBLE_001',
        tier: 3,
        alertTier: 'TIER_3_MONITORING',
        alertLevel: 'WARNING_MONITOR',
        alertTitle: 'YAKIN İZLEM: QT Uzatıcı ve Koşullu Risk Kombinasyonu',
        message: `Reçetede bir adet 'Bilinen Risk' (${knownQtDrugs[0].displayNameTr}) ve koşullu risk taşıyan ajan (${condQtDrugs.map(d => d.displayNameTr).join(', ')}) bulunmaktadır. Elektrolit dengesizliği veya bradikardi varlığında EKG takibi önerilir.`,
        mechanism: 'Hafif-orta düzeyde aditif kardiyak repolarizasyon gecikmesi.',
        clinicalSeverity: 'MODERATE',
        interruptive: false,
        blocksConfirmation: false,
        evidenceLevel: 'CredibleMeds QTdrugs Risk Sınıflandırması',
        guidelineSource: 'CredibleMeds Risk Categories',
        recommendations: [
          'Serum potasyum ve magnezyum düzeylerini kontrol ediniz.',
          'Halsizlik, palpitasyon veya senkop durumunda EKG çekiniz.'
        ],
        involvedDrugs: [knownQtDrugs[0], getDrugRef(condQtDrugs[0].canonicalKey)],
        alertClass: 'yellow',
        badgeLabel: '⚡ YAKIN İZLEM (QT TAKİBİ)'
      });
    }
  }

  // =========================================================================
  // --- TIER 4: BİLGİLENDİRME & ACORN TRIAL VPT DOWNGRADE MOTORU ---
  // =========================================================================

  // 4.1 ACORN ÇALIŞMASI UYARINCA VANKOMİSİN + PİPERASİLİN/TAZOBAKTAM DOWNGRADE
  const hasVancomycin = has('vancomycin');
  const hasPipTazo = has('piperacillin_tazobactam');

  if (hasVancomycin && hasPipTazo) {
    alerts.push({
      ruleId: 'DDI_VAN_TZP_001',
      tier: 4,
      alertTier: 'TIER_4_INFORMATIONAL',
      alertLevel: 'INFO_PASSIVE',
      alertTitle: 'BİLGİ: Vankomisin + Piperasilin/Tazobaktam Rejimi',
      message: 'Bu kombinasyonda serum kreatinininde geçici yükselme (tübüler sekresyon rekabeti / psödo-AKI) görülebilir. Güncel randomize çalışmalar (ACORN, JAMA 2023) sefepime kıyasla diyaliz ihtiyacı veya 14 günlük mortalitede artış göstermemiştir. Rutin böbrek fonksiyon izlemi önerilir; ampirik olarak sefepime geçiş nörotoksisite riskini artırabilir.',
      mechanism: 'Proksimal tübül bazolateral organik anyon taşıyıcıları (OAT) düzeyinde tübüler kreatinin sekresyonunun yarışmalı inhibisyonu; gerçek hücre ölümü olmaksızın psödo-kreatinin yükselmesi.',
      clinicalSeverity: 'INFO',
      interruptive: false,
      blocksConfirmation: false,
      evidenceLevel: 'Çok Merkezli Randomize Klinik Çalışma (ACORN, JAMA 2023, N=2511)',
      guidelineSource: 'ACORN Trial, JAMA 2023;330(18):1747–1757',
      recommendations: [
        'Rutin böbrek fonksiyonu (kreatinin, eGFR) ve vankomisin vadi düzeyi (TDM) takibi önerilir.',
        'Sert blokaj yapılmamalıdır; ampirik olarak sefepime geçiş ensefalopati ve nörotoksisiteyi artırabilir.',
        'Hastanın yeterli hidrasyonunu sağlayınız.'
      ],
      involvedDrugs: [getDrugRef('vancomycin'), getDrugRef('piperacillin_tazobactam')],
      alertClass: 'info',
      badgeLabel: 'ℹ️ BİLGİ (ACORN / PASİF ROZET)'
    });
  }

  // Calculate statistics
  const countsByTier = {
    tier1: alerts.filter(a => a.tier === 1).length,
    tier2: alerts.filter(a => a.tier === 2).length,
    tier3: alerts.filter(a => a.tier === 3).length,
    tier4: alerts.filter(a => a.tier === 4).length
  };

  const hasHardStop = countsByTier.tier1 > 0;
  const hasSoftStop = countsByTier.tier2 > 0;
  const canConfirmWithoutOverride = !hasHardStop && !hasSoftStop;

  let highestTier: AlertTierLevel | 'NONE' = 'NONE';
  if (countsByTier.tier1 > 0) highestTier = 'TIER_1_HARD_STOP';
  else if (countsByTier.tier2 > 0) highestTier = 'TIER_2_SOFT_STOP';
  else if (countsByTier.tier3 > 0) highestTier = 'TIER_3_MONITORING';
  else if (countsByTier.tier4 > 0) highestTier = 'TIER_4_INFORMATIONAL';

  let summaryMessage = 'Reçetede klinik etkileşim tespit edilmedi.';
  if (hasHardStop) {
    summaryMessage = `🚨 REÇETEDE ${countsByTier.tier1} ADET KESİN KONTRENDİKASYON (HARD STOP) BULUNMAKTADIR! Reçete onayı kilitlendi.`;
  } else if (hasSoftStop) {
    summaryMessage = `⚠️ Reçetede ${countsByTier.tier2} adet ciddi uyarı (Soft Stop) bulunmaktadır. Onay için klinik doğrulama gereklidir.`;
  } else if (countsByTier.tier3 > 0 || countsByTier.tier4 > 0) {
    summaryMessage = `ℹ️ Reçetede ${countsByTier.tier3 + countsByTier.tier4} adet izlem veya bilgilendirme notu mevcuttur (Reçete onaylanabilir).`;
  }

  return {
    totalDrugsEvaluated: validInputs.length,
    totalAlertsCount: alerts.length,
    hasHardStop,
    hasSoftStop,
    canConfirmWithoutOverride,
    highestTier,
    alerts,
    countsByTier,
    resolvedConcepts: resolvedList,
    summaryMessage
  };
}

/**
 * Check if the current regimen is the ACORN Vancomycin + Pip/Tazo combination
 */
export function isAcornVptRegimen(drugs: (DrugInputItem | string | null | undefined)[]): boolean {
  const resolved = resolveBatchRxNormConcepts(drugs);
  const hasVan = resolved.some(c => c.canonicalKey === 'vancomycin');
  const hasTzp = resolved.some(c => c.canonicalKey === 'piperacillin_tazobactam');
  return hasVan && hasTzp;
}
