/**
 * klinik-pwa - Neonatology & Pediatric Emergency Engine (TypeScript)
 * 
 * Clinical algorithms:
 * 1. Bhutani Neonatal Hyperbilirubinemia & Phototherapy/Exchange Transfusion (TND/AAP)
 * 2. APGAR Score for Newborn Assessment
 * 3. Westley Croup Severity Score
 * 4. Clinical Dehydration Scale (CDS) & Oral Rehydration Solution (ORS) Volume
 * 5. Neonatal Weight Loss Monitoring (%7-%10 rule)
 * 
 * Standards & Guidelines:
 * - Türk Neonatoloji Derneği (TND) Yenidoğan Sarılıkları Rehberi
 * - AAP Clinical Practice Guideline Revision: Management of Hyperbilirubinemia in the Newborn Infant 35 or More Weeks of Gestation
 * - Westley CR et al. Randomized, double-blind evaluation of racemic epinephrine in croup. Am J Dis Child.
 * - Friedman JN et al. Development of a clinical dehydration scale for children with acute gastroenteritis. J Pediatr.
 * - TND Yenidoğan Beslenme & Sıvı Rehberi
 */

import type {
  BhutaniThresholdItem,
  BhutaniParams,
  BhutaniResult,
  APGARParams,
  APGARResult,
  WestleyCroupParams,
  WestleyCroupResult,
  CDSDehydrationParams,
  CDSDehydrationResult,
  NeonatalWeightLossParams,
  NeonatalWeightLossResult
} from '../types/engines';

/**
 * Türk Neonatoloji Derneği (TND) / AAP Yenidoğan Sarılığı Fototerapi ve Kan Değişimi Eşik Değerleri
 * Gestasyon haftası ve risk faktörlerine göre saat bazlı fototerapi/kan değişimi eşikleri (mg/dL)
 * 
 * Risk Grupları:
 * - low: >= 38 hafta ve sağlıklı
 * - medium: >= 38 hafta + risk faktörleri VEYA 35-37+6 hafta ve sağlıklı
 * - high: 35-37+6 hafta + risk faktörleri (İzoimmün hemolitik hastalık, G6PD eksikliği, asfiksi, letarji, vücut ısısı instabilitesi, sepsis, asidoz veya albümin < 3.0 g/dL)
 */
export const BHUTANI_THRESHOLDS: Record<string, Record<number, BhutaniThresholdItem>> = {
  // Yaş dilimleri (saat): [Fototerapi Eşiği, Kan Değişimi Eşiği]
  low: {
    24: { phototherapy: 12.0, exchange: 19.0 },
    36: { phototherapy: 13.5, exchange: 21.0 },
    48: { phototherapy: 15.0, exchange: 22.5 },
    60: { phototherapy: 16.5, exchange: 23.5 },
    72: { phototherapy: 18.0, exchange: 24.5 },
    84: { phototherapy: 19.0, exchange: 25.0 },
    96: { phototherapy: 20.0, exchange: 25.0 },
    120: { phototherapy: 21.0, exchange: 25.0 },
    144: { phototherapy: 21.0, exchange: 25.0 },
    168: { phototherapy: 21.0, exchange: 25.0 }
  },
  medium: {
    24: { phototherapy: 10.0, exchange: 16.5 },
    36: { phototherapy: 11.5, exchange: 18.0 },
    48: { phototherapy: 13.0, exchange: 20.0 },
    60: { phototherapy: 14.5, exchange: 21.5 },
    72: { phototherapy: 16.0, exchange: 22.5 },
    84: { phototherapy: 17.0, exchange: 23.5 },
    96: { phototherapy: 18.0, exchange: 24.0 },
    120: { phototherapy: 18.5, exchange: 24.0 },
    144: { phototherapy: 18.5, exchange: 24.0 },
    168: { phototherapy: 18.5, exchange: 24.0 }
  },
  high: {
    24: { phototherapy: 8.0, exchange: 15.0 },
    36: { phototherapy: 9.5, exchange: 16.0 },
    48: { phototherapy: 11.0, exchange: 17.5 },
    60: { phototherapy: 12.5, exchange: 18.5 },
    72: { phototherapy: 14.0, exchange: 19.0 },
    84: { phototherapy: 14.5, exchange: 19.5 },
    96: { phototherapy: 15.0, exchange: 20.0 },
    120: { phototherapy: 15.0, exchange: 20.0 },
    144: { phototherapy: 15.0, exchange: 20.0 },
    168: { phototherapy: 15.0, exchange: 20.0 }
  }
};

/**
 * Lineer enterpolasyon ile saatlik eşik değerini hesaplar
 */
function interpolateThresholds(riskCategory: string, ageHours: number): BhutaniThresholdItem {
  const table = BHUTANI_THRESHOLDS[riskCategory] || BHUTANI_THRESHOLDS.low;
  const hours = Object.keys(table).map(Number).sort((a, b) => a - b);
  
  const clampedAge = Math.max(hours[0], Math.min(hours[hours.length - 1], ageHours));
  
  // Tam eşleşme
  if (table[clampedAge]) {
    return table[clampedAge];
  }
  
  // Aralık bulma
  let lowerHour = hours[0];
  let upperHour = hours[hours.length - 1];
  for (let i = 0; i < hours.length - 1; i++) {
    if (clampedAge >= hours[i] && clampedAge <= hours[i + 1]) {
      lowerHour = hours[i];
      upperHour = hours[i + 1];
      break;
    }
  }
  
  const factor = (clampedAge - lowerHour) / (upperHour - lowerHour);
  const pThreshold = table[lowerHour].phototherapy + factor * (table[upperHour].phototherapy - table[lowerHour].phototherapy);
  const eThreshold = table[lowerHour].exchange + factor * (table[upperHour].exchange - table[lowerHour].exchange);
  
  return {
    phototherapy: Math.round(pThreshold * 10) / 10,
    exchange: Math.round(eThreshold * 10) / 10
  };
}

/**
 * 1. Bhutani Neonatal Hyperbilirubinemia Evaluation
 */
export function calculateBhutaniJaundice(params: BhutaniParams = {}): BhutaniResult {
  const ageHours = Number(params.ageHours);
  const totalBilirubin = Number(params.totalBilirubin);
  const gestationalWeeks = Number(params.gestationalWeeks || 39);
  const hasRiskFactors = Boolean(params.hasRiskFactors);

  if (isNaN(ageHours) || isNaN(totalBilirubin) || ageHours <= 0 || totalBilirubin <= 0) {
    return {
      isValid: false,
      message: 'Lütfen bebeğin saat cinsinden yaşını (≥24 saat) ve Total Bilirubin değerini giriniz.'
    };
  }

  if (ageHours < 24) {
    return {
      isValid: true,
      ageHours,
      totalBilirubin,
      status: 'FIRST_24_HOURS_CRITICAL',
      alertClass: 'danger',
      riskCategory: 'Yüksek Risk (İlk 24 Saat Sarılığı)',
      interpretation: 'İlk 24 saat içinde ortaya çıkan sarılık PATOLOJİKTİR.',
      recommendations: [
        'İlk 24 saatte gelişen sarılık acil ileri araştırma gerektirir (Kan uyuşmazlığı, Rh/ABO, Direkt Coombs, Tam Kan, Retikülosit).',
        'Fototerapiye derhal başlanmalı ve TSB artış hızı (>0.5 mg/dL/saat veya >5 mg/dL/gün) yakından izlenmelidir.',
        'Kan değişimi hazırlığı için kan bankası ile irtibata geçilmelidir.'
      ]
    };
  }

  // Risk grubunu belirleme
  let riskCategory = 'low';
  let riskGroupLabel = 'Düşük Risk (≥38 Hafta ve Sağlıklı)';
  const isEarlyPreterm = gestationalWeeks < 35;

  if (isEarlyPreterm) {
    riskCategory = 'high';
    riskGroupLabel = `Yüksek Risk (<35 Hafta Prematüre: ${gestationalWeeks} hf - TND/NICE Preterm Eğrisi Gerekir)`;
  } else if (gestationalWeeks < 38 && hasRiskFactors) {
    riskCategory = 'high';
    riskGroupLabel = 'Yüksek Risk (35-37+6 Hafta + Nörotoksisite Risk Faktörleri)';
  } else if (gestationalWeeks < 38 || hasRiskFactors) {
    riskCategory = 'medium';
    riskGroupLabel = 'Orta Risk (≥38 Hafta + Risk Faktörü VEYA 35-37+6 Hafta Sağlıklı)';
  }

  let { phototherapy: ptThreshold, exchange: exThreshold } = interpolateThresholds(riskCategory, ageHours);
  if (isEarlyPreterm) {
    // TND/NICE <35 hafta prematürelerde yaklaşık fototerapi eşiği (GW * 0.5 - 8 veya ~5-10 mg/dL bandı)
    const pretermFactor = Math.max(0.5, (gestationalWeeks - 25) / 10);
    ptThreshold = Number((ptThreshold * pretermFactor).toFixed(1));
    exThreshold = Number((exThreshold * pretermFactor).toFixed(1));
  }

  const diffPt = totalBilirubin - ptThreshold;

  let status = 'NORMAL';
  let alertClass = 'success';
  let interpretation = '';
  const recommendations: string[] = [];

  if (isEarlyPreterm) {
    recommendations.push('⚠️ DİKKAT: Standart Bhutani nomogramı ≥35 hafta bebekler içindir. <35 hafta prematürelerde TND/NICE gestasyon haftası ve doğum ağırlığına özgü preterm sarılık çizelgeleri esas alınmalıdır.');
  }

  if (totalBilirubin >= exThreshold) {
    status = 'EXCHANGE_TRANSFUSION_REQUIRED';
    alertClass = 'danger';
    interpretation = `ACİL KAN DEĞİŞİMİ EŞİĞİ AŞILDI (TSB: ${totalBilirubin.toFixed(1)} mg/dL ≥ Eşik: ${exThreshold.toFixed(1)} mg/dL).`;
    recommendations.push(
      'Derhal Yenidoğan Yoğun Bakım Ünitesine (YYBÜ) yatış ve acil Kan Değişimi (Exchange Transfusion) hazırlığı yapınız.',
      'Kan değişimi hazırlığı sürerken acilen en yüksek yoğunlukta Çift Yönlü Yoğun Fototerapi başlatınız.',
      'Sıvı desteği sağlayınız, kan grubu ve çapraz karşılaştırma (cross-match) için uygun tam kan temin ediniz.',
      'Kan değişimi sonrası 2-4 saatte bir TSB kontrolü yapınız.'
    );
  } else if (totalBilirubin >= ptThreshold) {
    status = 'PHOTOTHERAPY_REQUIRED';
    alertClass = 'warning';
    interpretation = `FOTOTERAPİ EŞİĞİ AŞILDI (TSB: ${totalBilirubin.toFixed(1)} mg/dL ≥ Eşik: ${ptThreshold.toFixed(1)} mg/dL).`;
    recommendations.push(
      'Hastaneye yatış ve konvansiyonel / yoğun fototerapi başlanması endikedir.',
      'Bebeğin gözlerini ve genital bölgesini koruyarak geniş vücut yüzeyine fototerapi uygulayınız.',
      'Oral beslenmeyi (tercihen anne sütü) 2-3 saatte bir sürdürünüz; dehidratasyon bulgularını takip ediniz.',
      '4-12 saat sonra TSB kontrolü planlayınız (Eşiğin >2 mg/dL üzerindeyse 4-6 saatte, yakınsa 8-12 saatte).'
    );
  } else if (diffPt >= -2.0) {
    status = 'CLOSE_MONITORING';
    alertClass = 'info';
    interpretation = `Fototerapi eşiğine yakın (Eşiğin ${Math.abs(diffPt).toFixed(1)} mg/dL altında). Eşik: ${ptThreshold.toFixed(1)} mg/dL.`;
    recommendations.push(
      'Şu an için fototerapi endikasyonu yoktur ancak 12-24 saat içinde TSB tekrar ölçülmelidir.',
      'Yeterli beslenme ve hidrasyon sağlandığından emin olunuz.',
      'Sarılığın yayılımı ve letarji, zayıf emme gibi tehlike işaretleri aileye anlatılmalıdır.'
    );
  } else {
    status = 'LOW_RISK';
    alertClass = 'success';
    interpretation = `Düşük risk sınırında (TSB: ${totalBilirubin.toFixed(1)} mg/dL < Fototerapi Eşiği: ${ptThreshold.toFixed(1)} mg/dL).`;
    recommendations.push(
      'Fototerapi endikasyonu bulunmamaktadır.',
      'Rutin yenidoğan izlemine devam ediniz. Emzirme desteği veriniz.',
      'Sarılıkta belirgin artış olursa yeniden poliklinik kontrolü önerilir.'
    );
  }

  return {
    isValid: true,
    ageHours,
    totalBilirubin,
    gestationalWeeks,
    hasRiskFactors,
    riskGroupLabel,
    phototherapyThreshold: ptThreshold,
    exchangeThreshold: exThreshold,
    status,
    alertClass,
    interpretation,
    recommendations
  };
}

/**
 * 2. APGAR Score for Newborn Evaluation
 */
export function calculateAPGAR(params: APGARParams = {}): APGARResult {
  const hr = Number(params.heartRate ?? 0);
  const resp = Number(params.respiratoryEffort ?? 0);
  const tone = Number(params.muscleTone ?? 0);
  const reflex = Number(params.reflexIrritability ?? 0);
  const color = Number(params.color ?? 0);
  const minute = Number(params.minute || 1);

  const score = hr + resp + tone + reflex + color;

  let status = '';
  let alertClass = 'success';
  let interpretation = '';
  const recommendations: string[] = [];

  if (score >= 7) {
    status = 'NORMAL';
    alertClass = 'success';
    interpretation = `Normal APGAR Skoru (${score}/10) - Yenidoğanın ekstrauterin yaşama uyumu iyi.`;
    recommendations.push(
      'Rutin yenidoğan bakımı (Kurulama, ten tene temas, ısı kontrolü, hava yolu temizliği gereğinde).',
      'İlk 1 saat içinde emzirmeye teşvik ediniz.',
      minute === 1 ? '5. dakikada APGAR skorunu tekrarlayınız.' : 'Rutin gözlem ve izleme devam ediniz.'
    );
  } else if (score >= 4) {
    status = 'MODERATELY_DEPRESSED';
    alertClass = 'warning';
    interpretation = `Orta Derecede Deprese Yenidoğan (${score}/10) - Destekleyici müdahale gerekir.`;
    recommendations.push(
      'Hava yolunu nazikçe aspire ediniz, başı koklama pozisyonuna getiriniz.',
      'Sıcak tutunuz, taktil stimülasyon (sırt sıvazlama, ayak tabanı uyarısı) uygulayınız.',
      'Gerekiyorsa serbest akış oksijen veya CPAP/Balon-maske desteği hazırlayınız.',
      '5. ve 10. dakikada APGAR skorlamasını mutlaka tekrarlayınız.'
    );
  } else {
    status = 'SEVERELY_DEPRESSED';
    alertClass = 'danger';
    interpretation = `CİDDİ DEPRESE / ASFiKTİK YENİDOĞAN (${score}/10) - ACİL YENİDOĞAN CANLANDIRMASI (NRP) GEREKİR.`;
    recommendations.push(
      'ACİL NRP (Neonatal Resuscitation Program) protokolünü derhal aktive ediniz.',
      'Balon-maske ile Pozitif Basınçlı Ventilasyon (PBV) başlatınız (%21 O2 miad, %30 O2 prematüre).',
      'Kalp hızı <60/dk ise derhal göğüs kompresyonuna (3:1 oranında) ve endotrakeal entübasyona geçiniz.',
      'Gereğinde Umbilikal venöz kateter ile Adrenalin (0.01-0.03 mg/kg) uygulayınız.',
      'YYBÜ transport ve terapötik hipotermi (asfiksi kriterleri karşılanıyorsa) hazırlığı yapınız.'
    );
  }

  return {
    score,
    minute,
    status,
    alertClass,
    interpretation,
    recommendations,
    breakdown: {
      heartRate: hr,
      respiratoryEffort: resp,
      muscleTone: tone,
      reflexIrritability: reflex,
      color: color
    }
  };
}

/**
 * 3. Westley Croup Severity Score (Krup Skoru)
 */
export function calculateWestleyCroup(params: WestleyCroupParams = {}): WestleyCroupResult {
  const stridor = Number(params.stridor ?? 0);
  const retractions = Number(params.retractions ?? 0);
  const airEntry = Number(params.airEntry ?? 0);
  const cyanosis = Number(params.cyanosis ?? 0);
  const consciousness = Number(params.consciousness ?? 0);

  const score = stridor + retractions + airEntry + cyanosis + consciousness;

  let severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'IMPENDING_RESPIRATORY_FAILURE' = 'MILD';
  let alertClass = 'success';
  let interpretation = '';
  const recommendations: string[] = [];

  if (score <= 2) {
    severity = 'MILD';
    alertClass = 'success';
    interpretation = `Hafif Krup (Skor: ${score}) - Havlar tarzda öksürük ve ses kısıklığı mevcut, istirahat stridoru yok.`;
    recommendations.push(
      'Tek doz oral Deksametazon 0.15 mg/kg (maksimum 10 mg) verilmesi önerilir.',
      'Sakinleştirici yaklaşım, nemli/serin hava solutma ve bol hidrasyon önerilir.',
      'Genellikle ayaktan izlenebilir; istirahatte stridor, çekilme veya beslenme güçlüğü gelişirse acil servise başvuru eğitimi veriniz.'
    );
  } else if (score <= 5) {
    severity = 'MODERATE';
    alertClass = 'warning';
    interpretation = `Orta Krup (Skor: ${score}) - İstirahatte stridor veya belirgin çekilmeler mevcut.`;
    recommendations.push(
      'Oral veya IM Deksametazon 0.60 mg/kg (maksimum 10-16 mg) tek doz uygulayınız.',
      'Nebülize soğuk buhar desteği ve gereğinde nebülize Budesonid (2 mg tek doz) eklenebilir.',
      'Çocuğu ajite etmekten kaçınınız (ebeveyn kucağında tutunuz).',
      'Acil serviste en az 2-4 saat gözlem altında tutunuz; kötüleşme durumunda nebülize epinefrin hazırlayınız.'
    );
  } else if (score <= 11) {
    severity = 'SEVERE';
    alertClass = 'danger';
    interpretation = `Ciddi Krup (Skor: ${score}) - İstirahatte belirgin stridor, derin çekilmeler ve azalmış hava girişi.`;
    recommendations.push(
      'Nebülize L-Epinefrin (Adrenalin 1:1000): 0.5 mL/kg (maksimum 5 mL) sulandırılmadan nebulizatör ile derhal veriniz.',
      'Eşzamanlı Deksametazon 0.60 mg/kg IV veya IM uygulayınız.',
      'Nemlendirilmiş yüksek akış oksijen desteği sağlayınız (SpO2 > %92 hedeflenmeli).',
      'Epinefrin sonrası "rebound" riski nedeniyle hasta en az 4 saat yakın monitörize edilmeli ve hastaneye yatırılmalıdır.'
    );
  } else {
    severity = 'IMPENDING_RESPIRATORY_FAILURE';
    alertClass = 'danger';
    interpretation = `YAKLAŞAN SOLUNUM YETMEZLİĞİ (Skor: ${score}) - Hayati tehlike! Letarji veya istirahat siyanozu.`;
    recommendations.push(
      'ACİL Pediatrik Yoğun Bakım Ünitesi / Anestezi konsültasyonu isteyiniz.',
      'Derhal nebülize Epinefrin (5 mL 1:1000) ve IV Deksametazon uygulayınız.',
      'Zor havayolu ve acil entübasyon hazırlığı yapınız (Uygun yaştan 0.5 - 1.0 numara daha küçük endotrakeal tüp hazır bulundurulmalıdır).',
      'Hastayı ajite edebilecek girişimleri (damar yolu zorlaması vb.) uzman eşliğinde kontrollü yapınız.'
    );
  }

  return {
    score,
    severity,
    alertClass,
    interpretation,
    recommendations,
    breakdown: {
      stridor,
      retractions,
      airEntry,
      cyanosis,
      consciousness
    }
  };
}

/**
 * 4. Clinical Dehydration Scale (CDS) & ORS Fluid Engine for Children
 */
export function calculateCDSDehydration(params: CDSDehydrationParams = {}): CDSDehydrationResult {
  const gen = Number(params.generalAppearance ?? 0);
  const eyes = Number(params.eyes ?? 0);
  const mm = Number(params.mucousMembranes ?? 0);
  const tears = Number(params.tears ?? 0);
  const weightKg = Number(params.weightKg || 0);

  const score = gen + eyes + mm + tears;

  let severity: 'NONE' | 'SOME_MILD_MODERATE' | 'MODERATE_SEVERE' = 'NONE';
  let alertClass = 'success';
  let interpretation = '';
  let orsRecommendedMl: string | null = null;
  const recommendations: string[] = [];

  if (score === 0) {
    severity = 'NONE';
    alertClass = 'success';
    interpretation = `Dehidratasyon Yok (Skor: 0, Dehidratasyon derecesi <%3).`;
    recommendations.push(
      'Ağızdan normal beslenme ve emzirmeye devam ediniz.',
      'Her ishal/kusma atağı sonrası 10 mL/kg (veya 1-2 çay bardağı) ilave sıvı/ORS veriniz.',
      'Sıvı kaybı artarsa veya oral alım bozulursa tekrar başvuru önerilir.'
    );
  } else if (score <= 4) {
    severity = 'SOME_MILD_MODERATE';
    alertClass = 'warning';
    interpretation = `Hafif - Orta Derecede Dehidratasyon (Skor: ${score}/8, Sıvı kaybı yaklaşık %3-6).`;
    
    if (weightKg > 0) {
      const orsLow = Math.round(weightKg * 50);
      const orsHigh = Math.round(weightKg * 75);
      orsRecommendedMl = `${orsLow} - ${orsHigh} mL (4 saatlik)`;
      recommendations.push(
        `Oral Rehidratasyon Sıvısı (ORS): İlk 4 saatte toplam ${orsRecommendedMl} sık aralıklarla (kaşıkla veya şırıngayla 5 dakikada 5-10 mL) verilmelidir.`
      );
    } else {
      recommendations.push('İlk 4 saatte 50-75 mL/kg ORS solüsyonu sık aralıklarla verilmesi önerilir (Kilo girilirse net hacim hesaplanır).');
    }

    recommendations.push(
      'Kusma varsa 10 dakika beklenip daha yavaş tempoyla ORS verilmeye devam edilmelidir.',
      '4 saat sonunda dehidratasyon bulgularını yeniden değerlendiriniz.'
    );
  } else {
    severity = 'MODERATE_SEVERE';
    alertClass = 'danger';
    interpretation = `Orta - Ciddi Derecede Dehidratasyon (Skor: ${score}/8, Sıvı kaybı >%6).`;

    if (weightKg > 0) {
      const orsTotal = Math.round(weightKg * 100);
      const ivBolus = Math.round(weightKg * 20);
      orsRecommendedMl = `${orsTotal} mL ORS veya ${ivBolus} mL IV SF bolus`;
      recommendations.push(
        `İlk 4 saatte ${orsTotal} mL ORS veya oral alım yetersiz/şok bulgusu varsa IV İzotonik %0.9 NaCl (${ivBolus} mL bolus) gereklidir.`
      );
    } else {
      recommendations.push(
        '4 saatte 100 mL/kg ORS veya oral tolere edemiyorsa/şok riskinde 20 mL/kg IV %0.9 NaCl bolus verilmelidir.'
      );
    }

    recommendations.push(
      'Bilinç bulanıklığı, zayıf nabız veya uzamış kapiller geri dolum varsa acil IV damar yolu açınız.',
      'Elektrolitler, BUN, Kreatinin ve kan gazı değerlendirmesi planlayınız.'
    );
  }

  return {
    score,
    weightKg: weightKg > 0 ? weightKg : undefined,
    orsRecommendedMl,
    severity,
    alertClass,
    interpretation,
    recommendations,
    breakdown: {
      generalAppearance: gen,
      eyes,
      mucousMembranes: mm,
      tears
    }
  };
}

/**
 * 5. Yenidoğan Fizyolojik Tartı Kaybı & Dehidratasyon İzlemi (%7 - %10 Kuralı)
 */
export function calculateNeonatalWeightLoss(params: NeonatalWeightLossParams): NeonatalWeightLossResult {
  let birthWeightG = Number(params?.birthWeightG);
  let currentWeightG = Number(params?.currentWeightKg);
  const ageDays = params?.ageDays !== null && params?.ageDays !== undefined ? Number(params.ageDays) : null;

  if (isNaN(birthWeightG) || birthWeightG <= 0 || isNaN(currentWeightG) || currentWeightG <= 0) {
    return {
      isValid: false,
      message: 'Geçerli bir doğum ağırlığı ve mevcut kilo giriniz.'
    };
  }

  // Eğer doğum veya mevcut ağırlık kg cinsinden girildiyse (örn: 3.1) grama çevir
  if (birthWeightG < 20) {
    birthWeightG = Math.round(birthWeightG * 1000);
  }
  if (currentWeightG < 20) {
    currentWeightG = Math.round(currentWeightG * 1000);
  }

  const lossG = birthWeightG - currentWeightG;
  const percentLoss = +((lossG / birthWeightG) * 100).toFixed(1);

  let status = 'NORMAL';
  let alertClass = 'success';
  let interpretation = '';
  const recommendations: string[] = [];

  if (percentLoss <= 0) {
    status = 'WEIGHT_GAIN';
    alertClass = 'success';
    const gainG = Math.abs(lossG);
    interpretation = `Tartı Kaybı Yok (+${gainG} g kilo alımı, %${Math.abs(percentLoss)} artış).`;
    recommendations.push('Bebek doğum tartısının üzerindedir. Rutin büyüme takibi ve emzirmeye devam ediniz.');
  } else if (percentLoss <= 7.0) {
    status = 'PHYSIOLOGICAL_NORMAL';
    alertClass = 'success';
    interpretation = `Fizyolojik Tartı Kaybı: -${lossG} g (%${percentLoss}). Normal sınırlardadır.`;
    recommendations.push(
      'Fizyolojik ekstrasellüler sıvı kontraksiyonu ile uyumludur.',
      'Etkin anne sütü alımı desteklenmeli, günde en az 8-12 kez emzirme sağlanmalıdır.',
      'Günde 4-6 ıslak bez ve sarılık gelişimi takip edilmelidir.'
    );
  } else if (percentLoss <= 10.0) {
    status = 'ELEVATED_LOSS_WARNING';
    alertClass = 'warning';
    interpretation = `Sınırda Tartı Kaybı: -${lossG} g (%${percentLoss}). Dikkatli izlem gerekir.`;
    recommendations.push(
      'Kilo kaybı %7-10 bandındadır. Emzirme tekniği, kavrama ve süt miktarı kontrol edilmelidir.',
      'İlk 48-72 saatte %7 üzeri kayıpta dehidratasyon riski artar. 12-24 saat arayla sık tartı takibi önerilir.',
      'Bebekte letarji, mukozalarda kuruluk ve sarılık bulguları taranmalıdır.'
    );
  } else {
    status = 'EXCESSIVE_LOSS_CRITICAL';
    alertClass = 'danger';
    interpretation = `🚨 AŞIRI TARTI KAYBI: -${lossG} g (%${percentLoss})! HİPERNATREMİK DEHİDRATASYON RİSKİ!`;
    recommendations.push(
      'Doğum tartısının >%10 kaybı patolojiktir. Acil serum elektrolitleri (Na, K), BUN, Kreatinin ve kan şekeri bakılmalıdır.',
      'Hipernatremi (>150 mEq/L) saptanırsa hızlı serbest su verilmesi SEREBRAL ÖDEME yol açabilir; düzeltme hızı <0.5 mEq/L/saat olmalıdır.',
      'Etkin beslenme yetersizliği; emzirme danışmanlığı, sağılmış anne sütü veya hekim kontrolünde takviye değerlendirilmelidir.'
    );
  }

  // 14. gün kuralı: Term bebeklerin 10-14. günde doğum tartısını yakalamış olması beklenir
  if (ageDays !== null && ageDays >= 14 && percentLoss > 0) {
    recommendations.push('⚠️ Dikkat: Bebek 14 günlük veya daha büyüktür. Bu dönemde doğum kilosuna dönmüş olması beklenir (Failure to thrive / yetersiz tartı alımı tetkik edilmelidir).');
    if (alertClass === 'success') {
      alertClass = 'warning';
    }
  }

  return {
    isValid: true,
    birthWeightG,
    currentWeightG,
    lossG,
    percentLoss,
    status,
    alertClass,
    interpretation,
    recommendations
  };
}
