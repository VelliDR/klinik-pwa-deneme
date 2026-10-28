/**
 * klinik-pwa - Nephrology, Toxicology & Respiratory Engine (TypeScript)
 * 
 * Clinical algorithms:
 * 1. FENa (Fractional Excretion of Sodium) - Prerenal Azotemia vs Intrinsic ATN
 * 2. FEUrea (Fractional Excretion of Urea) - Reliable in patients on Loop Diuretics
 * 3. Katz Hyperglycemia Corrected Sodium (Pseudohyponatremia correction in DKA/HHS)
 * 4. Osmolal Gap - Toxic Alcohol Ingestion (Methanol, Ethylene Glycol)
 * 5. Rumack-Matthew Paracetamol Nomogram & 3-Phase 21-Hour IV NAC Protocol
 * 6. CURB-65 Community-Acquired Pneumonia Severity & Triage
 * 
 * Standards & Guidelines:
 * - KDIGO Clinical Practice Guideline for Acute Kidney Injury
 * - Carvounis CP et al. Significance of the fractional excretion of urea in the differential diagnosis of acute renal failure. Kidney Int.
 * - Katz MA. Hyperglycemia-induced hypo-osmolar state. N Engl J Med.
 * - Rumack BH, Matthew H. Acetaminophen poisoning and toxicity. Pediatrics.
 * - Lim WS et al. British Thoracic Society guidelines for the management of community acquired pneumonia in adults. Thorax.
 */

import type {
  FENaParams,
  FENaResult,
  FEUreaParams,
  FEUreaResult,
  OliguriaDifferentialResult,
  CorrectedSodiumParams,
  CorrectedSodiumResult,
  OsmolalGapParams,
  OsmolalGapResult,
  RumackMatthewParams,
  RumackMatthewResult,
  CURB65Params,
  CURB65Result
} from '../types/engines';

/**
 * 1. FENa (Fraksiyonel Sodyum Atılımı)
 */
export function calculateFENa(params: FENaParams = {}): FENaResult | null {
  const urineNa = Number(params.urineNa ?? params.urineSodium);
  const serumNa = Number(params.serumNa ?? params.serumSodium);
  const urineCr = Number(params.urineCr ?? params.urineCreatinine);
  const serumCr = Number(params.serumCr ?? params.serumCreatinine);
  const isOnDiuretics = Boolean(params.isOnDiuretics);

  // HATA-M6-004: Payda sıfır olamaz, ancak pay (urineNa) 0 olabilir (ağır prerenal sodyum tutulumu)
  if (isNaN(urineNa) || isNaN(serumNa) || isNaN(urineCr) || isNaN(serumCr) || urineNa < 0 || serumNa <= 0 || urineCr <= 0 || serumCr <= 0) {
    return null;
  }

  const fena = ((urineNa * serumCr) / (serumNa * urineCr)) * 100;
  const fenaVal = Number(fena.toFixed(2));

  // HATA-M6-003: Yenidoğan ve Preterm Bebeklerde Yaşa Özgü FENa Eşikleri
  const isNeonate = Boolean(params.isNeonate || (params.ageDays !== undefined && params.ageDays <= 28) || params.isPreterm);
  const isPreterm = Boolean(params.isPreterm);

  let prerenalCutoff = 1.0;
  let intrinsicCutoff = 2.0;

  if (isPreterm) {
    prerenalCutoff = 3.0;
    intrinsicCutoff = 3.5;
  } else if (isNeonate) {
    prerenalCutoff = 2.5;
    intrinsicCutoff = 2.5;
  }

  let category = '';
  let etiology = '';
  let recommendation = '';
  let alertClass = 'text-emerald-400';

  if (fenaVal < prerenalCutoff) {
    etiology = isNeonate ? 'Prerenal Azotemi / Fizyolojik Neonatal FENa' : 'Prerenal Azotemi';
    category = isNeonate ? `Yenidoğan Prerenal / Fizyolojik (FENa < %${prerenalCutoff})` : 'Prerenal Azotemi (FENa < %1)';
    recommendation = isNeonate 
      ? `Yenidoğanlarda tübüler immatürite ve glomerülotübüler dengesizlik nedeniyle FENa %${prerenalCutoff}'e kadar fizyolojiktir. Sıvı resüsitasyonu ve hidrasyon takibi önerilir.`
      : 'Böbrek tübülleri sağlam; sodyumu tutabiliyor. Hipo-perfüzyon / hipovolemi / dehidratasyon lehine. Sıvı resüsitasyonu ve hemodinamik optimizasyon önerilir.';
    alertClass = 'text-emerald-400';
  } else if (!isNeonate && fenaVal <= intrinsicCutoff) {
    etiology = 'Gri Bölge / Karışık';
    category = 'Gri Bölge / Karışık Tablo (FENa %1 - %2)';
    recommendation = 'Prerenal veya erken intrensek hasar olabilir. Klinik tablo, idrar sedimenti ve hidrasyon durumuyla birlikte değerlendiriniz.';
    alertClass = 'text-amber-400';
  } else {
    etiology = 'İntrensek Renal / ATN';
    category = `İntrensek Böbrek Hasarı / ATN (FENa > %${intrinsicCutoff})`;
    recommendation = 'Tübüler hasar nedeniyle sodyum geri emilemiyor. Akut Tübüler Nekroz (ATN), glomerülonefrit veya nefrotoksik hasar lehinedir. Nefrotoksik ajanları kesiniz; aşırı sıvı yüklemesinden kaçınınız.';
    alertClass = 'text-rose-400';
  }

  let diureticWarning: string | null = null;
  if (isOnDiuretics) {
    diureticWarning = '⚠️ DİKKAT: Hasta Loop Diüretiği (Furosemid) kullanmaktadır! Diüretikler idrar sodyumunu artırarak FENa\'yı yalancı yüksek çıkarır. Bu hastada FEUrea (Fraksiyonel Üre Atılımı) hesaplanmalıdır.';
  }

  return {
    isValid: true,
    fena: fenaVal,
    fenaPercent: fenaVal,
    category,
    etiology,
    interpretation: `${category}. ${recommendation}`,
    recommendation,
    recommendations: [recommendation],
    diureticWarning,
    isOnDiuretics,
    alertClass
  };
}

/**
 * 2. FEUrea (Fraksiyonel Üre Atılımı)
 */
export function calculateFEUrea(params: FEUreaParams = {}): FEUreaResult | null {
  const urineUrea = Number(params.urineUrea);
  const rawSerum = Number(params.serumUrea ?? params.serumBUN);
  const isBunHarmonized = Boolean(params.isBun);
  // If user explicitly flags input as BUN, convert BUN to Urea (mg/dL) = BUN * 2.14
  const serumUrea = isBunHarmonized ? rawSerum * 2.14 : rawSerum;

  const urineCr = Number(params.urineCr ?? params.urineCreatinine);
  const serumCr = Number(params.serumCr ?? params.serumCreatinine);

  // HATA-M6-004: urineUrea 0 olabilir (aşırı üre tutulumu)
  if (isNaN(urineUrea) || isNaN(serumUrea) || isNaN(urineCr) || isNaN(serumCr) || urineUrea < 0 || serumUrea <= 0 || urineCr <= 0 || serumCr <= 0) {
    return null;
  }

  const feUrea = ((urineUrea * serumCr) / (serumUrea * urineCr)) * 100;
  const feUreaVal = Number(feUrea.toFixed(1));

  let category = '';
  let etiology = '';
  let recommendation = '';
  let alertClass = 'text-emerald-400';

  if (feUreaVal < 35.0) {
    etiology = 'Prerenal Azotemi (Diüretik Kullanımında Güvenilir)';
    category = 'Prerenal Azotemi (FEUrea < %35)';
    recommendation = 'Diüretik kullanımından etkilenmeyen altın standart gösterge: Prerenal yetmezlik (sıvı açığı / hipoperfüzyon) lehine. Sıvı desteği planlayınız.';
    alertClass = 'text-emerald-400';
  } else {
    etiology = 'İntrensek Renal / ATN';
    category = 'İntrensek Böbrek Hasarı / ATN (FEUrea ≥ %35)';
    recommendation = 'Tübüler üre geri emilimi bozulmuştur. Akut Tübüler Nekroz (ATN) lehine. Nefroloji konsültasyonu ve sıvı dengesi takibi önerilir.';
    alertClass = 'text-rose-400';
  }

  return {
    isValid: true,
    feUrea: feUreaVal,
    feUreaPercent: feUreaVal,
    category,
    etiology,
    interpretation: `${category}. ${recommendation}`,
    recommendation,
    recommendations: [recommendation],
    alertClass
  };
}

/**
 * FENa & FEUrea Birlikte Değerlendirme (Çelişki ve Diüretik Çözümleyicisi)
 */
export function evaluateOliguriaDifferential(
  fenaRes: FENaResult | null,
  feureaRes: FEUreaResult | null
): OliguriaDifferentialResult | null {
  if (!fenaRes || !feureaRes) return null;

  const isPrerenalFENa = fenaRes.fenaPercent < 1.0;
  const isATNFENa = fenaRes.fenaPercent > 2.0;
  const isPrerenalFEUrea = feureaRes.feUreaPercent < 35.0;

  let concordance = 'UYUMLU';
  let summary = '';
  let action = '';

  if (fenaRes.isOnDiuretics && !isPrerenalFENa && isPrerenalFEUrea) {
    concordance = 'DİÜRETİK_MASKELİ_PRERENAL';
    summary = '💡 Diüretik Etkisinde Maskelenmiş Prerenal Azotemi: FENa loop diüretikleri nedeniyle yalancı yüksek çıkmıştır. Diüretikten etkilenmeyen FEUrea (<%35) hastanın aslında hipoperfüzyon/prerenal durumda olduğunu doğrulamaktadır!';
    action = 'Sıvı resüsitasyonu ve diüretik dozunun yeniden değerlendirilmesi önerilir.';
  } else if (isPrerenalFENa && isPrerenalFEUrea) {
    concordance = 'TAM_UYUMLU_PRERENAL';
    summary = '✓ Güçlü Prerenal Azotemi Kanıtı: Hem FENa (<%1) hem FEUrea (<%35) tübüler fonksiyonların korunduğunu gösteriyor.';
    action = 'Hidrasyon açığını kapatınız; kardiyak ve renal perfüzyonu optimize ediniz.';
  } else if (isATNFENa && !isPrerenalFEUrea) {
    concordance = 'TAM_UYUMLU_ATN';
    summary = '🚨 Güçlü Akut Tübüler Nekroz (ATN) Kanıtı: Hem FENa (>%2) hem FEUrea (≥%35) intrensek tübüler hasarı doğrulamaktadır.';
    action = 'Nefrotoksik ilaçları kesiniz; aşırı sıvı yüklenmesinden kaçınınız ve Nefroloji konsültasyonu isteyiniz.';
  } else {
    concordance = 'KARISIK_TABLO';
    summary = '⚠️ Karışık / Geçiş Tablosu: Prerenal azotemiden ATN\'ye geçiş veya eşlik eden tübülointerstisyel patoloji düşünülebilir.';
    action = 'İdrar sedimenti (granüler silendirler?) ve hidrasyon yanıtı ile takip ediniz.';
  }

  return {
    concordance,
    summary,
    action
  };
}

/**
 * 3. HİPERGLİSEMİ DÜZELTİLMİŞ SODYUM (Katz ve Hillier Formülleri)
 */
export function calculateCorrectedSodium(params: CorrectedSodiumParams = {}): CorrectedSodiumResult | null {
  const measuredNa = Number(params.measuredNa ?? params.measuredSodium);
  const glucoseMgDl = Number(params.glucoseMgDl ?? params.glucose);

  if (isNaN(measuredNa) || isNaN(glucoseMgDl) || measuredNa <= 0 || glucoseMgDl <= 0) return null;

  if (glucoseMgDl <= 100) {
    return {
      isValid: true,
      measuredNa,
      measuredSodium: measuredNa,
      correctedNa: measuredNa,
      correctedSodium: measuredNa,
      correctedSodiumKatz: measuredNa,
      correctedSodiumHillier: measuredNa,
      glucose: glucoseMgDl,
      glucoseMgDl,
      delta: 0,
      deltaKatz: 0,
      deltaHillier: 0,
      interpretation: 'Glukoz düzeyi normal aralıkta (düzeltme gerekmez).'
    };
  }

  const deltaKatz = 0.016 * (glucoseMgDl - 100);
  const deltaHillier = 0.024 * (glucoseMgDl - 100);
  const correctedNaKatz = Number((measuredNa + deltaKatz).toFixed(1));
  const correctedNaHillier = Number((measuredNa + deltaHillier).toFixed(1));

  // HATA-M10-003: Glukoz > 400 mg/dL olduğunda Hillier standardı (2.4) esas alınır
  const isSevereHyperglycemia = glucoseMgDl > 400;
  const primaryCorrectedNa = isSevereHyperglycemia ? correctedNaHillier : correctedNaKatz;
  const primaryDelta = isSevereHyperglycemia ? deltaHillier : deltaKatz;
  const formulaUsed = isSevereHyperglycemia ? 'Hillier (2.4 faktörü - Glukoz >400 mg/dL standardı)' : 'Katz (1.6 faktörü)';

  let interpretation = '';
  if (primaryCorrectedNa < 135) {
    interpretation = `Gerçek Hiponatremi (Hem ölçülen hem düzeltilmiş sodyum düşüktür). [${formulaUsed}]`;
  } else if (primaryCorrectedNa <= 145) {
    interpretation = `Yalancı Hiponatremi (Pseudohyponatremia): Ölçülen sodyum hiperglisemiye bağlı dilüsyonel olarak düşüktür, gerçekte intravasküler sodyum normaldir. [${formulaUsed}]`;
  } else {
    interpretation = `🚨 Gerçek Hipernatremi: Düzeltilmiş sodyum yüksektir (${primaryCorrectedNa} mEq/L)! Kritik serbest su açığı ve derin intraselüler dehidratasyon mevcuttur (HHS/Ağır DKA tablosu). [${formulaUsed}]`;
  }

  return {
    isValid: true,
    measuredNa,
    measuredSodium: measuredNa,
    glucoseMgDl,
    glucose: glucoseMgDl,
    correctedNa: primaryCorrectedNa,
    correctedSodium: primaryCorrectedNa,
    correctedSodiumKatz: correctedNaKatz,
    correctedSodiumHillier: correctedNaHillier,
    delta: Number(primaryDelta.toFixed(1)),
    deltaKatz: Number(deltaKatz.toFixed(1)),
    deltaHillier: Number(deltaHillier.toFixed(1)),
    formulaNotes: `Katz (1.6 faktörü): ${correctedNaKatz} mEq/L | Hillier (2.4 faktörü): ${correctedNaHillier} mEq/L${isSevereHyperglycemia ? ' • (Glukoz >400 mg/dL olduğundan Hillier 2.4 standardı esas alınmıştır)' : ''}`,
    interpretation
  };
}

/**
 * 4. OSMOLAR AÇIK (Osmolal Gap - Toksik Alkol Zehirlenmesi)
 */
export function calculateOsmolalGap(params: OsmolalGapParams = {}): OsmolalGapResult | null {
  const measuredOsm = Number(params.measuredOsm ?? params.measuredOsmolality);
  const serumNa = Number(params.serumNa ?? params.sodium);
  const glucoseMgDl = Number(params.glucoseMgDl ?? params.glucose);
  
  // HATA-M6-002: BUN girilmemişse kullanıcıyı uyar, sessizce sahte zehirlenme ve diyaliz alarmı üretme
  const isBunProvided = (params.bunMgDl !== undefined && params.bunMgDl !== null) || (params.bun !== undefined && params.bun !== null);
  const rawBun = Number(params.bunMgDl ?? params.bun ?? 15);
  const bunMgDl = isNaN(rawBun) || rawBun <= 0 ? 15 : rawBun;
  
  // HATA-M6-006: Eşlik eden etanol alımı (ethanolMgDl / 4.6)
  const rawEthanol = Number(params.ethanolMgDl ?? params.ethanol ?? 0);
  const ethanolMgDl = isNaN(rawEthanol) || rawEthanol < 0 ? 0 : rawEthanol;

  if (isNaN(measuredOsm) || isNaN(serumNa) || isNaN(glucoseMgDl) || measuredOsm <= 0 || serumNa <= 0 || glucoseMgDl <= 0) {
    return null;
  }

  const calcOsm = (2 * serumNa) + (glucoseMgDl / 18.0) + (bunMgDl / 2.8) + (ethanolMgDl ? (ethanolMgDl / 4.6) : 0);
  const calculatedOsmVal = Number(calcOsm.toFixed(1));
  const gap = Number((measuredOsm - calculatedOsmVal).toFixed(1));

  const isHighGap = gap > 10.0;
  const isCriticalGap = gap > 20.0;

  let interpretation = '';
  let alertClass = 'text-emerald-400';
  let antidoteAdvice = null;

  if (isCriticalGap) {
    interpretation = `🚨 KRİTİK OSMOLAL AÇIK (${gap} mOsm/kg > 20): Toksik Alkol Zehirlenmesi (Metanol - Sahte İçki, Etilen Glikol - Antifriz, Propilen Glikol) kuvvetle muhtemeldir! Acil Antidot ve Hemodiyaliz endikasyonu mevcuttur.${!isBunProvided ? ' (⚠️ DİKKAT: BUN girilmediği için 15 mg/dL varsayılmıştır; üremik sahte pozitiflik dışlanmalıdır).' : ''}`;
    alertClass = 'text-rose-400 bg-rose-950/40 border-rose-800';
    antidoteAdvice = {
      fomepizol: 'Fomepizol IV: 15 mg/kg yükleme dozu (100 mL SF içinde 30 dakikada IV), ardından her 12 saatte bir 10 mg/kg (4 doz).',
      etanolAlternative: 'Etanol (Fomepizol yoksa): %10 IV Etanol 8 mL/kg 60 dakikada yükleme, ardından 1-2 mL/kg/saat idame (Hedef kan etanol: 100-150 mg/dL).',
      dialysisCriteria: 'Acil Hemodiyaliz Kriterleri: Osmolal açık > 10 + Anyon açığı asidozu, pH < 7.25, görme bozukluğu (metanol), böbrek yetmezliği.'
    };
  } else if (isHighGap) {
    interpretation = `⚠️ YÜKSEK OSMOLAL AÇIK (${gap} mOsm/kg > 10): Toksik alkol alımı veya ağır laktik asidoz / ketoasidoz şüphesi. Kan gazı anyon açığı ve semptomlarla birlikte acil toksikoloji konsültasyonu yapınız.${!isBunProvided ? ' (BUN girilmediğinden 15 mg/dL varsayıldı).' : ''}`;
    alertClass = 'text-amber-400 bg-amber-950/40 border-amber-800';
  } else {
    interpretation = `🟢 Normal Osmolal Açık (${gap} mOsm/kg ≤ 10): Ölçülen ve hesaplanan osmolalite uyumludur.`;
    alertClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-800';
  }

  return {
    isValid: true,
    measuredOsm,
    measuredOsmolality: measuredOsm,
    calculatedOsm: calculatedOsmVal,
    gap,
    osmolalGap: gap,
    isHighGap,
    isCriticalGap,
    isElevated: isHighGap,
    antidoteAdvice,
    interpretation,
    alertClass
  };
}

/**
 * 5. RUMACK-MATTHEW NOMOGRAMI (Akut Parasetamol Toksisitesi & Pediatrik Güvenli NAC Protokolü)
 */
export function evaluateRumackMatthew(params: RumackMatthewParams = {}): RumackMatthewResult | null {
  const serumParacetamolMcgMl = Number(params.serumParacetamolMcgMl ?? params.paracetamolLevelMcgMl);
  const hoursPostIngestion = Number(params.hoursPostIngestion ?? params.hours);
  // HATA-M6-005: Kilo girilmediğinde gizli 70 kg yetişkin varsayımı yapılmamalıdır
  const rawWeightKg = params.weightKg !== undefined && params.weightKg !== null ? Number(params.weightKg) : null;
  const hasWeight = rawWeightKg !== null && !isNaN(rawWeightKg) && rawWeightKg > 0;
  const weightKg = hasWeight ? rawWeightKg : null;
  const isHighRisk = Boolean(params.isHighRisk); // Chronic alcoholism, malnutrition, CYP2E1 inducers

  if (isNaN(serumParacetamolMcgMl) || isNaN(hoursPostIngestion) || serumParacetamolMcgMl < 0 || hoursPostIngestion < 0) {
    return null;
  }

  if (hoursPostIngestion < 4) {
    return {
      isValid: true,
      status: 'TOO_EARLY',
      isToxic: false,
      hours: hoursPostIngestion,
      hoursPostIngestion,
      levelMcgMl: serumParacetamolMcgMl,
      interpretation: 'Alımdan sonraki ilk 4 saat içinde ölçülen parasetamol düzeyi emilim devam ettiği için nomogramda değerlendirilemez. 4. saatte kan düzeyini tekrarlayınız.',
      treatWithNAC: false,
      alertClass: 'text-amber-400'
    };
  }

  // HATA-M6-001: Geç başvuruda (>24 saat) 3 fazlı NAC protokolünün eksiksiz üretilmesi
  if (hoursPostIngestion > 24) {
    let lateProtocol = null;
    if (weightKg !== null) {
      const effectiveIvWeightKg = Math.min(weightKg, 100);
      const effectiveOralWeightKg = Math.min(weightKg, 110);
      const p1Mg = Math.round(effectiveIvWeightKg * 150);
      const p2Mg = Math.round(effectiveIvWeightKg * 50);
      const p3Mg = Math.round(effectiveIvWeightKg * 100);

      const isPediatricWeight = weightKg < 40;
      const p1Fluid = isPediatricWeight ? `${Math.round(weightKg * 3)} mL (3 mL/kg, maks 200 mL) %5 Dekstroz içinde 60 dakikada IV` : '200 mL %5 Dekstroz içinde 60 dakikada IV';
      const p2Fluid = isPediatricWeight ? `${Math.round(weightKg * 7)} mL (7 mL/kg, maks 500 mL) %5 Dekstroz içinde 4 saatte IV` : '500 mL %5 Dekstroz içinde 4 saatte IV';
      const p3Fluid = isPediatricWeight ? `${Math.round(weightKg * 14)} mL (14 mL/kg, maks 1000 mL) %5 Dekstroz içinde 16 saatte IV` : '1000 mL %5 Dekstroz içinde 16 saatte IV';

      lateProtocol = {
        isPediatricAdjusted: isPediatricWeight,
        phase1: { doseMgKg: 150, totalMg: p1Mg, fluidD5W: p1Fluid },
        phase2: { doseMgKg: 50, totalMg: p2Mg, fluidD5W: p2Fluid },
        phase3: { doseMgKg: 100, totalMg: p3Mg, fluidD5W: p3Fluid },
        loadingDose: `Yükleme (1. Faz): ${p1Mg} mg (150 mg/kg, maks 15g) ${p1Fluid}`,
        secondDose: `2. Faz: ${p2Mg} mg (50 mg/kg, maks 5g) ${p2Fluid}`,
        thirdDose: `3. Faz: ${p3Mg} mg (100 mg/kg, maks 10g) ${p3Fluid}`,
        totalDuration: 'Toplam 21 saatlik standart 3 fazlı IV infüzyon protokolü (Geç başvuru ampirik protokolü).',
        oralAlternative: `Oral NAC Alternatifi: 140 mg/kg (${Math.round(effectiveOralWeightKg * 140)} mg) oral yükleme, ardından 4 saatte bir 70 mg/kg (${Math.round(effectiveOralWeightKg * 70)} mg) x 17 doz (Toplam 72 saat).`
      };
    }
    return {
      isValid: true,
      status: 'LATE_PRESENTATION',
      isToxic: true,
      hours: hoursPostIngestion,
      hoursPostIngestion,
      levelMcgMl: serumParacetamolMcgMl,
      interpretation: 'Geç başvuru (>24 saat). Nomogram geçerli değildir. Toksik doz şüphesinde ve karaciğer yetmezliğini önlemek için ampirik IV NAC protokolü derhal başlatılmalıdır.' + (!hasWeight ? ' ⚠️ Kilo girilmediğinden miligram bazlı doz hesaplanamadı; lütfen hastanın kilosunu giriniz.' : ''),
      treatWithNAC: true,
      nacProtocol: lateProtocol,
      alertClass: 'text-rose-400 bg-rose-950/40 border-rose-800'
    };
  }

  // Standard 150-line (150 at 4h) vs High-Risk 100-line (100 at 4h)
  const baseCutoff = isHighRisk ? 100 : 150;
  const treatmentThreshold = baseCutoff * Math.pow(0.5, (hoursPostIngestion - 4) / 4);
  const thresholdVal = Number(treatmentThreshold.toFixed(1));

  const isToxic = serumParacetamolMcgMl >= thresholdVal;

  let interpretation = '';
  let nacProtocol = null;
  let alertClass = 'text-emerald-400';

  if (isToxic) {
    if (weightKg !== null) {
      // FDA Prescott IV NAC protokolünde doz hesabı maksimum 100 kg üzerinden yapılır (Maks: 15.000 mg / 5.000 mg / 10.000 mg)
      const effectiveIvWeightKg = Math.min(weightKg, 100);
      const effectiveOralWeightKg = Math.min(weightKg, 110);
      const p1Mg = Math.round(effectiveIvWeightKg * 150);
      const p2Mg = Math.round(effectiveIvWeightKg * 50);
      const p3Mg = Math.round(effectiveIvWeightKg * 100);

      // Pediatric fluid safety check (<40 kg requires weight-adjusted D5W to prevent hyponatremia/fluid overload)
      const isPediatricWeight = weightKg < 40;
      const p1Fluid = isPediatricWeight ? `${Math.round(weightKg * 3)} mL (3 mL/kg, maks 200 mL) %5 Dekstroz içinde 60 dakikada IV` : '200 mL %5 Dekstroz içinde 60 dakikada IV';
      const p2Fluid = isPediatricWeight ? `${Math.round(weightKg * 7)} mL (7 mL/kg, maks 500 mL) %5 Dekstroz içinde 4 saatte IV` : '500 mL %5 Dekstroz içinde 4 saatte IV';
      const p3Fluid = isPediatricWeight ? `${Math.round(weightKg * 14)} mL (14 mL/kg, maks 1000 mL) %5 Dekstroz içinde 16 saatte IV` : '1000 mL %5 Dekstroz içinde 16 saatte IV';

      nacProtocol = {
        isPediatricAdjusted: isPediatricWeight,
        phase1: { doseMgKg: 150, totalMg: p1Mg, fluidD5W: p1Fluid },
        phase2: { doseMgKg: 50, totalMg: p2Mg, fluidD5W: p2Fluid },
        phase3: { doseMgKg: 100, totalMg: p3Mg, fluidD5W: p3Fluid },
        loadingDose: `Yükleme (1. Faz): ${p1Mg} mg (150 mg/kg, maks 15g) ${p1Fluid}`,
        secondDose: `2. Faz: ${p2Mg} mg (50 mg/kg, maks 5g) ${p2Fluid}`,
        thirdDose: `3. Faz: ${p3Mg} mg (100 mg/kg, maks 10g) ${p3Fluid}`,
        totalDuration: 'Toplam 21 saatlik standart 3 fazlı IV infüzyon protokolü.',
        oralAlternative: `Oral NAC Alternatifi: 140 mg/kg (${Math.round(effectiveOralWeightKg * 140)} mg) oral yükleme, ardından 4 saatte bir 70 mg/kg (${Math.round(effectiveOralWeightKg * 70)} mg) x 17 doz (Toplam 72 saat).`
      };
    }
    interpretation = `⚠️ HEPATOTOKSİK DÜZEY (${serumParacetamolMcgMl} mcg/mL ≥ ${thresholdVal} mcg/mL eşiği): Karaciğer yetmezliği riski mevcuttur. Acil IV N-Asetilsistein (NAC) protokolü başlatılmalıdır!` + (!hasWeight ? ' (⚠️ Kilo girilmediğinden miligram bazlı doz hesaplanamadı; lütfen hastanın kilosunu giriniz).' : '');
    alertClass = 'text-rose-400 bg-rose-950/40 border-rose-800';
  } else {
    interpretation = `🟢 Toksisite Çizgisinin Altında (${serumParacetamolMcgMl} mcg/mL < ${thresholdVal} mcg/mL eşiği): Hepatotoksisite olasılığı düşüktür. Semptom ve karaciğer enzimleri takibi yeterlidir.`;
    alertClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-800';
  }

  return {
    isValid: true,
    status: isToxic ? 'TOXIC' : 'NON_TOXIC',
    isToxic,
    isHighRisk,
    hours: hoursPostIngestion,
    hoursPostIngestion,
    serumLevel: serumParacetamolMcgMl,
    levelMcgMl: serumParacetamolMcgMl,
    threshold: thresholdVal,
    treatWithNAC: isToxic,
    interpretation,
    nacProtocol,
    alertClass
  };
}

/**
 * 6. CURB-65 & CRB-65 TOPLUMDA GELİŞEN PNÖMONİ ŞİDDET SKORU
 */
export function calculateCURB65(params: CURB65Params = {}): CURB65Result {
  const ageYears = params.ageYears;
  if (ageYears !== undefined && ageYears !== null && ageYears < 18) {
    return {
      isValid: false,
      isPediatricLocked: true,
      isCRB65Primary: false,
      score: 0,
      crbScore: 0,
      riskGroup: 'Pediatrik Hasta (Kullanım Dışı)',
      mortalityGroup: 'Pediatrik Hasta (Kullanım Dışı)',
      mortalityRate: 'Uygulanamaz (<18 yaş)',
      mortalityPercent: 0,
      treatmentSetting: 'CURB-65 / CRB-65 yalnızca ≥18 yaş erişkin toplum kökenli pnömoni için valide edilmiştir.',
      recommendation: 'CURB-65 yalnızca ≥18 yaş erişkinler için valide edilmiştir; çocuklarda DSÖ / Türk Pediatri Pnömoni Kılavuzları kullanılmalıdır. Yetişkin ampirik antibiyotik dozu uygulanamaz.',
      recommendations: [
        'CURB-65 yalnızca ≥18 yaş erişkinler için valide edilmiştir.',
        'Çocuklarda DSÖ ve Türk Pediatri Pnömoni Kılavuzlarına göre yaşa ve kiloya uygun tedavi veriniz.'
      ],
      empiricAntibiotic: 'Yetişkin ampirik tedavi uygulanamaz. Pediatrik dozlama motorunu kullanınız.',
      alertClass: 'text-amber-400'
    };
  }

  const confusion = Boolean(params.confusion);
  const bunOver19 = Boolean(params.bunOver19);
  const rrGte30 = Boolean(params.rrGte30 || params.respiratoryRateGte30);
  const sbpLt90OrDbpLte60 = Boolean(params.sbpLt90OrDbpLte60 || params.hypotension);
  const ageGte65 = Boolean(params.ageGte65 || (ageYears !== undefined && ageYears !== null && ageYears >= 65));

  let score = 0;
  if (confusion) score += 1;
  if (bunOver19) score += 1;
  if (rrGte30) score += 1;
  if (sbpLt90OrDbpLte60) score += 1;
  if (ageGte65) score += 1;

  // CRB-65 (Primary Care / without laboratory BUN)
  let crbScore = 0;
  if (confusion) crbScore += 1;
  if (rrGte30) crbScore += 1;
  if (sbpLt90OrDbpLte60) crbScore += 1;
  if (ageGte65) crbScore += 1;

  // Is CRB-65 primary? (When BUN laboratory is absent, or isCRBOnly is requested, or bunOver19 is undefined and hasBunLab is false)
  const isCRB65Primary = Boolean(
    params.isCRBOnly || 
    params.hasBunLab === false || 
    (params.bunOver19 === undefined && params.hasBunLab !== true)
  );

  const icuWarning = '⚠️ YBÜ Uyarısı: CURB-65 / CRB-65 puanından bağımsız olarak, mekanik ventilasyon veya vazopressör gerektiren septik şok varlığında (ATS/IDSA majör kriterleri) ya da en az 3 minör kriterde hasta derhal Yoğun Bakım Ünitesine (YBÜ) kabul edilmelidir.';
  const allergyWarning = '⚠️ Alerji & Patojen Uyarısı: Şiddetli beta-laktam anafilaksisi öyküsünde beta-laktamlar kontrendikedir (Solunum florokinolonu tercih ediniz). Pseudomonas aeruginosa / MRSA risk faktörlerinde hedefe yönelik antipsödomonal ve/veya anti-MRSA rejimleri seçilmelidir.';

  let riskGroup = '';
  let mortalityRate = '';
  let mortalityPercent = 1.5;
  let recommendation = '';
  let empiricAntibiotic = '';
  let alertClass = 'text-emerald-400';

  if (isCRB65Primary) {
    if (crbScore === 0) {
      riskGroup = 'Düşük Risk (CRB-65 0)';
      mortalityPercent = 0.9;
      mortalityRate = '< %1 (%0.9) 30 günlük mortalite';
      recommendation = 'Evde ayaktan tedavi uygundur (Birinci Basamak CRB-65 Triyajı).';
      empiricAntibiotic = 'Amoksisilin 1g 3x1 oral VEYA (Atipik/Alerji durumunda) Klaritromisin 500mg 2x1 / Doksisiklin 100mg 2x1.';
      alertClass = 'text-emerald-400';
    } else if (crbScore === 1 || crbScore === 2) {
      riskGroup = 'Orta-Yüksek Risk (CRB-65 1-2)';
      mortalityPercent = 8.2;
      mortalityRate = '~%8.2 30 günlük mortalite (Artmış Risk)';
      recommendation = 'Hastaneye sevk ve yatış değerlendirilmelidir (CRB-65 1-2 puanında mortalite %8.2\'dir).';
      empiricAntibiotic = 'Amoksisilin-Klavulanat 1g 2x1 IV/oral + Klaritromisin 500mg 2x1 VEYA Solunum Florokinolonu (Moksifloksasin 400mg 1x1).';
      alertClass = 'text-amber-400';
    } else {
      riskGroup = 'Şiddetli Pnömoni / Yüksek Risk (CRB-65 3-4)';
      mortalityPercent = 31.3;
      mortalityRate = '~%31.3 30 günlük mortalite (Yüksek Risk)';
      recommendation = 'Acil hastaneye sevk, acil yatış ve Yoğun Bakım Ünitesi (YBÜ) değerlendirmesi endikedir.';
      empiricAntibiotic = 'Seftriakson 2g 1x1 IV (veya Sefotaksim) + Azitromisin 500mg 1x1 IV (veya Levofloksasin 750mg 1x1 IV).';
      alertClass = 'text-rose-400';
    }
  } else {
    if (score <= 1) {
      riskGroup = 'Düşük Risk (CURB-65 0-1)';
      mortalityPercent = 1.5;
      mortalityRate = '< %1.5 30 günlük mortalite';
      recommendation = 'Evde ayaktan tedavi uygundur.';
      empiricAntibiotic = 'Amoksisilin 1g 3x1 oral VEYA (Atipik/Alerji durumunda) Klaritromisin 500mg 2x1 / Doksisiklin 100mg 2x1.';
      alertClass = 'text-emerald-400';
    } else if (score === 2) {
      riskGroup = 'Orta Risk (CURB-65 2)';
      mortalityPercent = 9.2;
      mortalityRate = '~%9.2 30 günlük mortalite';
      recommendation = 'Kısa süreli hastaneye yatış veya yakın gözlem ünitesinde izlem önerilir.';
      empiricAntibiotic = 'Amoksisilin-Klavulanat 1g 2x1 IV/oral + Klaritromisin 500mg 2x1 VEYA Solunum Florokinolonu (Moksifloksasin 400mg 1x1).';
      alertClass = 'text-amber-400';
    } else {
      riskGroup = 'Şiddetli Pnömoni (Yüksek Risk)';
      mortalityPercent = score === 3 ? 14.5 : 22.0;
      mortalityRate = score === 3 ? '~%14.5' : '> %22 (Ağır Pnömoni)';
      recommendation = 'Acil hastane yatışı endikedir. CURB-65 4-5 puan ise derhal Yoğun Bakım Ünitesi (YBÜ) konsültasyonu düşünülmelidir.';
      empiricAntibiotic = 'Seftriakson 2g 1x1 IV (veya Sefotaksim) + Azitromisin 500mg 1x1 IV (veya Levofloksasin 750mg 1x1 IV).';
      alertClass = 'text-rose-400';
    }
  }

  return {
    isValid: true,
    isPediatricLocked: false,
    isCRB65Primary,
    score,
    crbScore,
    riskGroup,
    mortalityGroup: riskGroup,
    mortalityRate,
    mortalityPercent,
    treatmentSetting: recommendation,
    recommendation,
    recommendations: [recommendation, `Ampirik Tedavi: ${empiricAntibiotic}`, icuWarning, allergyWarning],
    empiricAntibiotic,
    icuWarning,
    allergyWarning,
    alertClass
  };
}
