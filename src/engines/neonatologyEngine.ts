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
  BhutaniGuideline,
  BilirubinMeasurementType,
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
 * AAP 2022 Yenidoğan Hiperbilirubinemisi Klinik Uygulama Kılavuzu Eşik Tabloları (1 – 336 Saat / 14 Gün)
 * Referans: Kemper AR et al., Pediatrics 2022;150(3):e2022058859 (Suppl. Tables 1–4 & Figures 2–7).
 *
 * Önemli Kural (AAP 2022):
 * - Gestasyon haftası zaten ayrı eğriyle modellendiği için "<38 hafta" tek başına ek nörotoksisite risk faktörü sayılmaz!
 * - Nörotoksisite risk faktörleri: Albümin <3.0 g/dL, izoimmün hemolitik hastalık (DAT+), G6PD eksikliği veya diğer hemolitik durumlar,
 *   sepsis veya son 24 saatte belirgin klinik instabilite.
 * - Risk faktörü VAR fototerapi eğrilerinde ve TÜM kan değişimi eğrilerinde 38, 39 ve ≥40 hafta aynı (≥38 hf) eğriyi paylaşır.
 */
export const AAP2022_KNOT_HOURS = [
  1, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 120, 144, 168, 216, 264, 336
] as const;

export const AAP2022_PT_NO_RISK: Record<35 | 36 | 37 | 38 | 39 | 40, readonly number[]> = {
  35: [6.4, 7.4, 8.5, 9.6, 10.6, 11.6, 12.5, 13.4, 14.2, 14.9, 15.6, 16.2, 16.8, 17.4, 17.8, 18.3, 18.6, 18.7, 18.8, 18.9, 19.1, 19.3, 19.6],
  36: [6.9, 7.9, 9.0, 10.1, 11.2, 12.1, 13.1, 13.9, 14.8, 15.5, 16.2, 16.9, 17.5, 18.0, 18.5, 19.0, 19.3, 19.4, 19.5, 19.6, 19.8, 20.1, 20.4],
  37: [7.4, 8.4, 9.6, 10.7, 11.7, 12.7, 13.6, 14.5, 15.4, 16.1, 16.9, 17.5, 18.1, 18.7, 19.2, 19.7, 20.0, 20.2, 20.3, 20.4, 20.6, 20.8, 21.1],
  38: [7.9, 8.9, 10.1, 11.2, 12.3, 13.3, 14.2, 15.1, 16.0, 16.8, 17.5, 18.2, 18.8, 19.4, 19.9, 20.3, 20.7, 20.9, 21.0, 21.1, 21.3, 21.5, 21.8],
  39: [8.4, 9.5, 10.6, 11.8, 12.8, 13.8, 14.8, 15.7, 16.6, 17.4, 18.1, 18.8, 19.5, 20.0, 20.6, 21.0, 21.5, 21.6, 21.7, 21.8, 21.8, 21.8, 21.8],
  40: [8.9, 10.0, 11.1, 12.2, 13.3, 14.3, 15.3, 16.2, 17.0, 17.8, 18.5, 19.2, 19.8, 20.4, 20.9, 21.4, 21.8, 21.8, 21.8, 21.8, 21.8, 21.8, 21.8]
};

export const AAP2022_PT_WITH_RISK: Record<35 | 36 | 37 | 38, readonly number[]> = {
  35: [4.9, 5.8, 6.9, 7.9, 8.9, 9.8, 10.6, 11.4, 12.2, 12.8, 13.5, 14.1, 14.6, 15.1, 15.5, 15.8, 16.1, 16.3, 16.4, 16.5, 16.8, 17.0, 17.4],
  36: [5.4, 6.3, 7.4, 8.5, 9.4, 10.4, 11.2, 12.1, 12.8, 13.5, 14.2, 14.8, 15.4, 15.8, 16.3, 16.7, 17.0, 17.1, 17.3, 17.4, 17.6, 17.9, 18.2],
  37: [5.9, 6.9, 8.0, 9.0, 10.0, 11.0, 11.9, 12.7, 13.5, 14.2, 14.9, 15.5, 16.1, 16.6, 17.1, 17.5, 17.9, 18.0, 18.1, 18.2, 18.2, 18.2, 18.2],
  38: [6.4, 7.3, 8.5, 9.5, 10.5, 11.5, 12.4, 13.2, 14.0, 14.7, 15.4, 16.0, 16.6, 17.1, 17.5, 17.9, 18.2, 18.2, 18.2, 18.2, 18.2, 18.2, 18.2]
};

export const AAP2022_EX_NO_RISK: Record<35 | 36 | 37 | 38, readonly number[]> = {
  35: [14.9, 15.6, 16.4, 17.2, 17.9, 18.7, 19.4, 20.0, 20.7, 21.3, 21.8, 22.4, 22.9, 23.4, 23.8, 24.2, 24.5, 24.7, 24.9, 25.1, 25.5, 25.9, 26.3],
  36: [15.9, 16.7, 17.5, 18.3, 19.1, 19.9, 20.6, 21.3, 21.9, 22.5, 23.1, 23.6, 24.1, 24.5, 24.9, 25.3, 25.5, 25.7, 25.9, 26.1, 26.4, 26.7, 27.0],
  37: [17.0, 17.8, 18.7, 19.5, 20.3, 21.1, 21.8, 22.5, 23.1, 23.7, 24.3, 24.8, 25.2, 25.7, 26.0, 26.3, 26.6, 26.7, 26.9, 27.0, 27.0, 27.0, 27.0],
  38: [18.0, 18.8, 19.7, 20.6, 21.4, 22.1, 22.8, 23.4, 24.0, 24.6, 25.1, 25.5, 25.9, 26.3, 26.6, 26.8, 27.0, 27.0, 27.0, 27.0, 27.0, 27.0, 27.0]
};

export const AAP2022_EX_WITH_RISK: Record<35 | 36 | 37 | 38, readonly number[]> = {
  35: [13.1, 13.8, 14.6, 15.4, 16.1, 16.8, 17.4, 17.9, 18.5, 18.9, 19.4, 19.8, 20.1, 20.4, 20.7, 20.9, 21.1, 21.3, 21.5, 21.7, 22.1, 22.5, 22.9],
  36: [13.7, 14.4, 15.2, 15.9, 16.6, 17.3, 17.9, 18.5, 19.1, 19.6, 20.1, 20.5, 20.9, 21.2, 21.6, 21.9, 22.1, 22.3, 22.5, 22.6, 22.9, 23.2, 23.5],
  37: [14.3, 15.0, 15.7, 16.5, 17.2, 17.9, 18.5, 19.1, 19.7, 20.2, 20.7, 21.2, 21.7, 22.1, 22.5, 22.8, 23.1, 23.2, 23.4, 23.5, 23.5, 23.5, 23.5],
  38: [14.8, 15.5, 16.3, 17.0, 17.7, 18.3, 19.0, 19.6, 20.1, 20.7, 21.2, 21.7, 22.1, 22.5, 22.9, 23.3, 23.5, 23.5, 23.5, 23.5, 23.5, 23.5, 23.5]
};

/**
 * Türk Neonatoloji Derneği (TND 2014) / Klasik AAP 2004 Yenidoğan Sarılığı Eşik Değerleri
 * Gestasyon haftası ve risk faktörlerine göre saat bazlı fototerapi/kan değişimi eşikleri (mg/dL)
 */
export const BHUTANI_THRESHOLDS: Record<string, Record<number, BhutaniThresholdItem>> = {
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

function interpolateCurveArray(curve: readonly number[], ageHours: number): number {
  const hours = AAP2022_KNOT_HOURS;
  const clamped = Math.max(hours[0], Math.min(hours[hours.length - 1], ageHours));

  for (let i = 0; i < hours.length; i++) {
    if (clamped === hours[i]) {
      return curve[i];
    }
    if (i < hours.length - 1 && clamped > hours[i] && clamped < hours[i + 1]) {
      const factor = (clamped - hours[i]) / (hours[i + 1] - hours[i]);
      const val = curve[i] + factor * (curve[i + 1] - curve[i]);
      return Math.round(val * 10) / 10;
    }
  }
  return curve[curve.length - 1];
}

function interpolateAap2022Thresholds(
  gestationalWeeks: number,
  hasRiskFactors: boolean,
  ageHours: number
): BhutaniThresholdItem {
  const gaFloor = Math.floor(gestationalWeeks);
  const ptCurve = hasRiskFactors
    ? AAP2022_PT_WITH_RISK[(Math.min(38, Math.max(35, gaFloor)) as 35 | 36 | 37 | 38)]
    : AAP2022_PT_NO_RISK[(Math.min(40, Math.max(35, gaFloor)) as 35 | 36 | 37 | 38 | 39 | 40)];

  const exKey = Math.min(38, Math.max(35, gaFloor)) as 35 | 36 | 37 | 38;
  const exCurve = hasRiskFactors ? AAP2022_EX_WITH_RISK[exKey] : AAP2022_EX_NO_RISK[exKey];

  return {
    phototherapy: interpolateCurveArray(ptCurve, ageHours),
    exchange: interpolateCurveArray(exCurve, ageHours)
  };
}

/**
 * Klasik TND 2014 / AAP 2004 lineer enterpolasyonu
 */
function interpolateClassicThresholds(riskCategory: string, ageHours: number): BhutaniThresholdItem {
  const table = BHUTANI_THRESHOLDS[riskCategory] || BHUTANI_THRESHOLDS.low;
  const hours = Object.keys(table).map(Number).sort((a, b) => a - b);

  const clampedAge = Math.max(hours[0], Math.min(hours[hours.length - 1], ageHours));

  if (table[clampedAge]) {
    return table[clampedAge];
  }

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

function getAap2022PostDischargeFollowUp(deltaPtMinusTsb: number, ageHours: number): string {
  if (deltaPtMinusTsb <= 0) {
    return 'Taburcu etmeyiniz; fototerapi başlatınız ve 4–12 saat içinde TSB kontrolü yapınız.';
  }
  if (deltaPtMinusTsb < 2.0) {
    return ageHours < 24
      ? 'Taburculuğu erteleyiniz; 4–8 saat içinde TSB kontrolü yapınız.'
      : '4–24 saat içinde TSB kontrolü yapınız (taburculuğu ertelemeyi veya evde fototerapiyi değerlendiriniz).';
  }
  if (deltaPtMinusTsb < 3.5) {
    return '4–24 saat içinde TSB veya TcB kontrolü planlayınız.';
  }
  if (deltaPtMinusTsb < 5.5) {
    return '1–2 gün (24–48 saat) içinde TSB veya TcB kontrolü planlayınız.';
  }
  if (deltaPtMinusTsb < 7.0) {
    return ageHours < 72
      ? '2 gün içinde klinik sarılık ve beslenme izlemi (klinik şüphede TSB/TcB).'
      : 'Klinik yargıya göre sarılık ve emzirme izlemi.';
  }
  return ageHours < 72
    ? '3 gün içinde rutin yenidoğan poliklinik izlemi.'
    : 'Rutin yenidoğan izlemi.';
}

/**
 * 1. Neonatal Hyperbilirubinemia Evaluation (Dual Guideline: AAP 2022 Default + TND 2014 / AAP 2004 Classic)
 */
export function calculateBhutaniJaundice(params: BhutaniParams = {}): BhutaniResult {
  const ageHours = Number(params.ageHours);
  const totalBilirubin = Number(params.totalBilirubin);
  const gestationalWeeks = Number(params.gestationalWeeks || 39);
  const hasRiskFactors = Boolean(params.hasRiskFactors);
  const guidelineUsed: BhutaniGuideline = params.guideline === 'TND_2014' ? 'TND_2014' : 'AAP_2022';
  const measurementType: BilirubinMeasurementType = params.measurementType === 'TcB' ? 'TcB' : 'TSB';
  const guidelineLabel =
    guidelineUsed === 'AAP_2022'
      ? 'AAP 2022 (Güncel Hiperbilirubinemi Kılavuzu)'
      : 'TND 2014 / AAP 2004 (Klasik Bhutani Nomogramı)';

  if (isNaN(ageHours) || isNaN(totalBilirubin) || ageHours <= 0 || totalBilirubin <= 0) {
    return {
      isValid: false,
      message: 'Lütfen bebeğin saat cinsinden postnatal yaşını ve Bilirubin değerini giriniz.'
    };
  }

  const isEarlyPreterm = gestationalWeeks < 35;
  let riskCategory = 'low';
  let riskGroupLabel = '';
  let ptThreshold = 0;
  let exThreshold = 0;

  if (guidelineUsed === 'AAP_2022') {
    const gaDisplay = isEarlyPreterm
      ? `${gestationalWeeks} hf (<35 Hafta Prematüre)`
      : hasRiskFactors
        ? (gestationalWeeks >= 38 ? '≥38' : `${Math.floor(gestationalWeeks)}`) + ' Hafta'
        : (gestationalWeeks >= 40 ? '≥40' : `${Math.floor(gestationalWeeks)}`) + ' Hafta';

    riskCategory = hasRiskFactors || isEarlyPreterm ? 'with_neurotoxicity_risk' : 'no_neurotoxicity_risk';
    riskGroupLabel = isEarlyPreterm
      ? `AAP 2022 Uyarlaması — ${gaDisplay} (TND/NICE Preterm Çizelgesi Esas Alınmalıdır)`
      : `AAP 2022 — ${gaDisplay} (${hasRiskFactors ? 'Nörotoksisite Risk Faktörü VAR' : 'Nörotoksisite Risk Faktörü YOK'})`;

    const aap = interpolateAap2022Thresholds(gestationalWeeks, hasRiskFactors, ageHours);
    ptThreshold = aap.phototherapy;
    exThreshold = aap.exchange;
  } else {
    if (isEarlyPreterm) {
      riskCategory = 'high';
      riskGroupLabel = `TND 2014 — Yüksek Risk (<35 Hafta Prematüre: ${gestationalWeeks} hf)`;
    } else if (gestationalWeeks < 38 && hasRiskFactors) {
      riskCategory = 'high';
      riskGroupLabel = 'TND 2014 — Yüksek Risk (35–37+6 Hafta + Risk Faktörleri)';
    } else if (gestationalWeeks < 38 || hasRiskFactors) {
      riskCategory = 'medium';
      riskGroupLabel = 'TND 2014 — Orta Risk (≥38 Hafta + Risk VEYA 35–37+6 Hafta Sağlıklı)';
    } else {
      riskCategory = 'low';
      riskGroupLabel = 'TND 2014 — Düşük Risk (≥38 Hafta ve Sağlıklı)';
    }
    const classic = interpolateClassicThresholds(riskCategory, ageHours);
    ptThreshold = classic.phototherapy;
    exThreshold = classic.exchange;
  }

  if (isEarlyPreterm) {
    const pretermFactor = Math.max(0.5, (gestationalWeeks - 25) / 10);
    ptThreshold = Number((ptThreshold * pretermFactor).toFixed(1));
    exThreshold = Number((exThreshold * pretermFactor).toFixed(1));
  }

  const escalationThreshold = Number((exThreshold - 2.0).toFixed(1));
  const deltaFromPhototherapy = Number((ptThreshold - totalBilirubin).toFixed(1));
  const requiresTsbConfirmation =
    measurementType === 'TcB' && (totalBilirubin >= 15.0 || deltaFromPhototherapy <= 3.0);
  const followUpRecommendation =
    guidelineUsed === 'AAP_2022'
      ? getAap2022PostDischargeFollowUp(deltaFromPhototherapy, ageHours)
      : deltaFromPhototherapy <= 0
        ? 'Fototerapi endikasyonu mevcuttur; taburcu edilmemelidir.'
        : deltaFromPhototherapy <= 2.0
          ? '12–24 saat içinde kontrol TSB önerilir.'
          : 'Klinik risk durumuna göre 24–72 saat içinde poliklinik izlemi.';

  if (ageHours < 24) {
    const first24Recs = [
      'İlk 24 saatte fark edilen sarılık patolojiktir; acil hemoliz araştırması gerekir (Anne-bebek kan grubu, Direkt Coombs/DAT, Tam Kan, Periferik Yayma, Retikülosit, G6PD, TSB/Direkt Bilirubin).',
      `Saat ${ageHours} referans fototerapi eşiği: ${ptThreshold.toFixed(1)} mg/dL | Kan değişimi eşiği: ${exThreshold.toFixed(1)} mg/dL (${guidelineUsed === 'AAP_2022' ? 'AAP 2022' : 'TND 24. saat'}).`,
      'TSB artış hızı (>0.3 mg/dL/saat ilk 24 saatte veya >0.2 mg/dL/saat sonrasında) hemoliz lehinedir; 4–6 saat arayla TSB takip ediniz.'
    ];
    if (requiresTsbConfirmation) {
      first24Recs.unshift('⚠️ TcB DOĞRULAMA ZORUNLULUĞU: Transkütan ölçüm derhal venöz/kapiller Serum Total Bilirubin (TSB) ile doğrulanmalıdır.');
    }
    return {
      isValid: true,
      ageHours,
      totalBilirubin,
      gestationalWeeks,
      hasRiskFactors,
      guidelineUsed,
      guidelineLabel,
      measurementType,
      status: 'FIRST_24_HOURS_CRITICAL',
      alertClass: 'danger',
      riskCategory: 'Yüksek Risk (İlk 24 Saat Sarılığı)',
      riskGroupLabel,
      phototherapyThreshold: ptThreshold,
      escalationThreshold,
      exchangeThreshold: exThreshold,
      deltaFromPhototherapy,
      requiresTsbConfirmation,
      followUpRecommendation,
      interpretation: `İlk 24 saat içinde ortaya çıkan sarılık PATOLOJİKTİR (${measurementType}: ${totalBilirubin.toFixed(1)} mg/dL; Saatlik FT Eşiği: ${ptThreshold.toFixed(1)} mg/dL).`,
      recommendations: first24Recs
    };
  }

  const diffPt = totalBilirubin - ptThreshold;
  let status = 'NORMAL';
  let alertClass = 'success';
  let interpretation = '';
  const recommendations: string[] = [];

  if (requiresTsbConfirmation) {
    recommendations.push(
      '⚠️ TcB DOĞRULAMA ZORUNLULUĞU (AAP 2022): Transkütan bilirubin ≥15.0 mg/dL veya fototerapi eşiğinin ≤3.0 mg/dL yakınında/üzerinde olduğundan venöz/kapiller TSB ile doğrulayınız.'
    );
  }

  if (isEarlyPreterm) {
    recommendations.push(
      '⚠️ DİKKAT: Standart AAP 2022 / Bhutani eğrileri ≥35 hafta bebekler içindir. <35 hafta prematürelerde TND/NICE gestasyon haftası ve doğum ağırlığına özgü preterm sarılık çizelgeleri esas alınmalıdır.'
    );
  }

  if (totalBilirubin >= exThreshold) {
    status = 'EXCHANGE_TRANSFUSION_REQUIRED';
    alertClass = 'danger';
    interpretation = `ACİL KAN DEĞİŞİMİ EŞİĞİ AŞILDI (${measurementType}: ${totalBilirubin.toFixed(1)} mg/dL ≥ Kan Değişimi Eşiği: ${exThreshold.toFixed(1)} mg/dL).`;
    recommendations.push(
      'Derhal Yenidoğan Yoğun Bakım Ünitesine (YYBÜ) yatış ve acil Kan Değişimi (Exchange Transfusion) hazırlığı yapınız.',
      'Kan değişimi hazırlığı sürerken kesintisiz Çift Yönlü Yoğun Fototerapi ve IV hidrasyon başlatınız.',
      'Acil TSB, Direkt Bilirubin, Albümin, DAT (Coombs), G6PD, Tam Kan, Retikülosit ve Cross-match çalışınız.',
      'İzoimmün hemolitik hastalıkta (DAT+) kan değişimi hazırlanırken IVIG (0.5–1.0 g/kg, 2 saatte IV) değerlendirilebilir.'
    );
  } else if (guidelineUsed === 'AAP_2022' && totalBilirubin >= escalationThreshold) {
    status = 'ESCALATION_OF_CARE';
    alertClass = 'danger';
    interpretation = `BAKIM ESKALASYONU (ESCALATION OF CARE) EŞİĞİ AŞILDI! (${measurementType}: ${totalBilirubin.toFixed(1)} mg/dL ≥ Eskalasyon: ${escalationThreshold.toFixed(1)} mg/dL | Kan Değişimi: ${exThreshold.toFixed(1)} mg/dL).`;
    recommendations.push(
      'Kan değişimi eşiğine ≤2.0 mg/dL yaklaşıldı! Derhal YYBÜ yatışı/nakli ve kesintisiz YOĞUN FOTOTERAPİ başlatınız.',
      'IV sıvı desteği başlayınız; acil TSB, Direkt Bilirubin, Albümin, Tam Kan, Retikülosit, DAT, G6PD ve Cross-match gönderiniz.',
      'TSB düzeyini her 2 saatte bir ölçünüz; akut bilirubin ensefalopatisi (letarji, hipotoni/hipertoni, tiz ağlama, opistotonus) açısından yakın izlem yapınız.',
      'İzoimmün hemolitik hastalık (DAT+) varsa IVIG 0.5–1.0 g/kg (2 saatte IV infüzyon) verilebilir.'
    );
  } else if (totalBilirubin >= ptThreshold) {
    status = 'PHOTOTHERAPY_REQUIRED';
    alertClass = 'warning';
    interpretation = `FOTOTERAPİ EŞİĞİ AŞILDI (${measurementType}: ${totalBilirubin.toFixed(1)} mg/dL ≥ Fototerapi Eşiği: ${ptThreshold.toFixed(1)} mg/dL).`;
    recommendations.push(
      'Yoğun fototerapi (mavi-yeşil LED, ≥30 µW/cm²/nm, geniş vücut yüzeyi) başlatılması endikedir.',
      'Gözleri koruyarak emzirme/beslenmeyi kesmeden (2–3 saatte bir) sürdürünüz.',
      'Fototerapi başlangıcından 4–12 saat sonra TSB kontrolü ve altta yatan hemoliz açısından temel tetkikleri planlayınız.',
      guidelineUsed === 'AAP_2022'
        ? 'Fototerapi kesme kriteri (AAP 2022): Başlangıç fototerapi eşiğinin en az 2.0 mg/dL altına indiğinde kesilebilir; hemoliz/erken fototerapide 6–24 saat sonra rebound TSB bakınız.'
        : 'TSB güvenli sınıra gerilediğinde fototerapi sonlandırılıp 12–24 saat sonra rebound kontrolü değerlendirilir.'
    );
  } else if ((guidelineUsed === 'AAP_2022' && deltaFromPhototherapy <= 3.0) || diffPt >= -2.0) {
    status = 'CLOSE_MONITORING';
    alertClass = 'info';
    interpretation = `Fototerapi eşiğine yakın izlem bölgesi (Eşiğin ${deltaFromPhototherapy.toFixed(1)} mg/dL altında; FT Eşiği: ${ptThreshold.toFixed(1)} mg/dL).`;
    recommendations.push(
      `Taburculuk / Takip Planı: ${followUpRecommendation}`,
      'Yeterli anne sütü alımı (günde 8–12 emzirme), tartı kaybı yüzdesi ve idrar/gaita çıkışı değerlendirilmelidir.',
      'Letarji, emmeme veya sarılığın artması halinde acil başvuru eğitimi veriniz.'
    );
  } else {
    status = 'LOW_RISK';
    alertClass = 'success';
    interpretation = `Fototerapi eşiğinin güvenli altında (${measurementType}: ${totalBilirubin.toFixed(1)} mg/dL < FT Eşiği: ${ptThreshold.toFixed(1)} mg/dL; Fark: ${deltaFromPhototherapy.toFixed(1)} mg/dL).`;
    recommendations.push(
      'Fototerapi endikasyonu bulunmamaktadır.',
      `Takip Önerisi: ${followUpRecommendation}`,
      'Emzirme desteği veriniz ve tehlike işaretlerini aileye anlatınız.'
    );
  }

  return {
    isValid: true,
    ageHours,
    totalBilirubin,
    gestationalWeeks,
    hasRiskFactors,
    guidelineUsed,
    guidelineLabel,
    measurementType,
    riskCategory,
    riskGroupLabel,
    phototherapyThreshold: ptThreshold,
    escalationThreshold,
    exchangeThreshold: exThreshold,
    deltaFromPhototherapy,
    requiresTsbConfirmation,
    followUpRecommendation,
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
