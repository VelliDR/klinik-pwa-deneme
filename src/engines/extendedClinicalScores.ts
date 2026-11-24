/**
 * GENİŞLETİLMİŞ KLİNİK SKORLAMA MOTORU (BİLDİRİMSEL + MELD 3.0)
 *
 * 1. Hepatoloji: Child-Pugh (Turcotte-Pugh) + MELD 3.0 (Kim WR et al., Gastroenterology 2021)
 * 2. Nöroloji: NIHSS (0–42, 15 madde) + ABCD² (GİA inme riski, 0–7)
 * 3. Sepsis / YBÜ: SOFA (0–24, 6 sistem) + qSOFA (0–3, Sepsis-3)
 * 4. Üst GİS Kanama: Glasgow-Blatchford Skoru (GBS, 0–23, ESGE 2021)
 */

import {
  evaluateDeclarativeScore,
  type DeclarativeScoreEvaluation,
  type DeclarativeScoreInputs,
  type DeclarativeScoreSchema,
  type ScoreSeverityTone
} from './declarativeScoreEngine';

// ============================================================================
// 1. HEPATOLOJİ: CHILD-PUGH & MELD 3.0
// ============================================================================

export type ChildPughClass = 'A' | 'B' | 'C';

export interface ChildPughResult extends DeclarativeScoreEvaluation {
  childClass: ChildPughClass;
  oneYearSurvival: string;
  twoYearSurvival: string;
  surgicalMortalityNote: string;
  hepaticDoseImpact: boolean;
}

export const CHILD_PUGH_SCHEMA: DeclarativeScoreSchema = {
  id: 'child_pugh',
  title: 'Child-Pugh (Turcotte-Pugh) Siroz Skoru',
  shortTitle: 'Child-Pugh',
  guidelineName: 'Child-Turcotte-Pugh Classification',
  guidelineYear: '1973 / EASL 2018',
  primaryCitation: 'Pugh RN et al., Br J Surg 1973;60:646–649; EASL Decompensated Cirrhosis Guidelines',
  minPossibleScore: 5,
  maxPossibleScore: 15,
  criteria: [
    {
      id: 'bilirubin',
      label: 'Total Bilirubin (mg/dL)',
      type: 'select',
      options: [
        { value: 'lt2', label: '< 2.0 mg/dL', points: 1 },
        { value: '2_3', label: '2.0 – 3.0 mg/dL', points: 2 },
        { value: 'gt3', label: '> 3.0 mg/dL', points: 3 }
      ]
    },
    {
      id: 'albumin',
      label: 'Serum Albümin (g/dL)',
      type: 'select',
      options: [
        { value: 'gt3_5', label: '> 3.5 g/dL', points: 1 },
        { value: '2_8_3_5', label: '2.8 – 3.5 g/dL', points: 2 },
        { value: 'lt2_8', label: '< 2.8 g/dL', points: 3 }
      ]
    },
    {
      id: 'inr',
      label: 'PT-INR',
      type: 'select',
      options: [
        { value: 'lt1_7', label: '< 1.7', points: 1 },
        { value: '1_7_2_2', label: '1.7 – 2.2', points: 2 },
        { value: 'gt2_2', label: '> 2.2', points: 3 }
      ]
    },
    {
      id: 'ascites',
      label: 'Asit',
      type: 'select',
      options: [
        { value: 'none', label: 'Yok', points: 1 },
        { value: 'mild', label: 'Hafif / diüretiğe yanıtlı', points: 2 },
        { value: 'severe', label: 'Orta–şiddetli / dirençli', points: 3 }
      ]
    },
    {
      id: 'encephalopathy',
      label: 'Hepatik Ensefalopati (West Haven)',
      type: 'select',
      options: [
        { value: 'none', label: 'Yok (Evre 0)', points: 1 },
        { value: 'grade1_2', label: 'Evre 1–2 (Hafif–orta)', points: 2 },
        { value: 'grade3_4', label: 'Evre 3–4 (Ağır / koma)', points: 3 }
      ]
    }
  ],
  tiers: [
    {
      minScore: 5,
      maxScore: 6,
      label: 'Sınıf A (Kompanze)',
      severity: 'low',
      riskEstimate: '1Y ~%100 | 2Y ~%85',
      recommendation: 'Kompanze siroz. Standart hepatolojik izlem; potansiyel hepatotoksik ilaçlarda dikkatli olun.'
    },
    {
      minScore: 7,
      maxScore: 9,
      label: 'Sınıf B (Belirgin Fonksiyon Kaybı)',
      severity: 'high',
      riskEstimate: '1Y ~%80 | 2Y ~%60',
      recommendation: 'Hepatik klirens belirgin azalmıştır. İlaç Güvenlik Kalkanında hepatik doz kısıtlamaları etkinleştirildi; NSAİİ kaçınılmalı, parasetamol ≤2 g/gün ile sınırlandırılmalıdır.'
    },
    {
      minScore: 10,
      maxScore: 15,
      label: 'Sınıf C (Dekompanze Siroz)',
      severity: 'critical',
      riskEstimate: '1Y ~%45 | 2Y ~%35',
      recommendation: 'Ağır dekompanze karaciğer yetmezliği. Karaciğer nakli (MELD 3.0) değerlendirmesi; NSAİİ, yüksek doz parasetamol ve sedatif/benzodiazepinlerden kesinlikle kaçınınız.'
    }
  ]
};

export function evaluateChildPugh(inputs: DeclarativeScoreInputs = {}): ChildPughResult {
  const validPick = (fieldId: string, val: unknown, fallback: string): string => {
    const crit = CHILD_PUGH_SCHEMA.criteria.find(c => c.id === fieldId);
    const str = val !== undefined && val !== null ? String(val) : '';
    return crit?.options?.some(o => o.value === str) ? str : fallback;
  };
  const normalized: DeclarativeScoreInputs = {
    bilirubin: validPick('bilirubin', inputs.bilirubin, 'lt2'),
    albumin: validPick('albumin', inputs.albumin, 'gt3_5'),
    inr: validPick('inr', inputs.inr, 'lt1_7'),
    ascites: validPick('ascites', inputs.ascites, 'none'),
    encephalopathy: validPick('encephalopathy', inputs.encephalopathy, 'none')
  };
  const base = evaluateDeclarativeScore(CHILD_PUGH_SCHEMA, normalized);
  const childClass: ChildPughClass = base.score <= 6 ? 'A' : base.score <= 9 ? 'B' : 'C';
  const survivalMap: Record<ChildPughClass, { y1: string; y2: string; surg: string }> = {
    A: { y1: '~%100', y2: '~%85', surg: 'Abdominal cerrahi perioperatif mortalite ~%10' },
    B: { y1: '~%80', y2: '~%60', surg: 'Abdominal cerrahi perioperatif mortalite ~%30' },
    C: { y1: '~%45', y2: '~%35', surg: 'Abdominal cerrahi perioperatif mortalite ~%76–82 (elektif cerrahi kontrendike)' }
  };
  const surv = survivalMap[childClass];
  return {
    ...base,
    childClass,
    oneYearSurvival: surv.y1,
    twoYearSurvival: surv.y2,
    surgicalMortalityNote: surv.surg,
    hepaticDoseImpact: childClass === 'B' || childClass === 'C',
    soapLine: `Child-Pugh: Sınıf ${childClass} (${base.score}/15 puan; 1Y sağkalım ${surv.y1}). ${base.tier.recommendation}`
  };
}

export interface Meld3Input {
  isFemale: boolean;
  bilirubinMgDl: number;
  inr: number;
  creatinineMgDl: number;
  sodiumMeqL: number;
  albuminGDl: number;
  dialysisTwicePastWeek?: boolean;
}

export interface Meld3Result {
  score: number;
  rawScore: number;
  severity: ScoreSeverityTone;
  riskLabel: string;
  ninetyDayMortality: string;
  recommendation: string;
  clampingNotes: string[];
  guidelineRef: string;
  soapLine: string;
}

/**
 * MELD 3.0 (Kim WR et al., Gastroenterology 2021;161(6):1887-1895 — OPTN/UNOS 2023)
 */
export function calculateMeld3(input: Meld3Input): Meld3Result | null {
  const { bilirubinMgDl, inr, creatinineMgDl, sodiumMeqL, albuminGDl, isFemale, dialysisTwicePastWeek } = input;
  if (
    !Number.isFinite(bilirubinMgDl) || bilirubinMgDl <= 0 ||
    !Number.isFinite(inr) || inr <= 0 ||
    !Number.isFinite(creatinineMgDl) || creatinineMgDl <= 0 ||
    !Number.isFinite(sodiumMeqL) || sodiumMeqL <= 0 ||
    !Number.isFinite(albuminGDl) || albuminGDl <= 0
  ) {
    return null;
  }

  const clampingNotes: string[] = [];
  const bili = Math.max(1.0, bilirubinMgDl);
  const inrClamped = Math.max(1.0, inr);
  let cr = Math.max(1.0, creatinineMgDl);
  if (dialysisTwicePastWeek) {
    cr = 3.0;
    clampingNotes.push('Son 1 haftada ≥2 diyaliz / CVVHD nedeniyle Kreatinin 3.0 mg/dL sabitlendi.');
  } else if (cr > 3.0) {
    cr = 3.0;
    clampingNotes.push('MELD 3.0 üst sınırı gereği Kreatinin 3.0 mg/dL ile sınırlandırıldı.');
  }
  const na = Math.min(137, Math.max(125, sodiumMeqL));
  if (na !== sodiumMeqL) clampingNotes.push(`Sodyum [125–137] aralığına uyarlandı (${na} mEq/L).`);
  const alb = Math.min(3.5, Math.max(1.5, albuminGDl));
  if (alb !== albuminGDl) clampingNotes.push(`Albümin [1.5–3.5] aralığına uyarlandı (${alb} g/dL).`);

  const lnBili = Math.log(bili);
  const lnInr = Math.log(inrClamped);
  const lnCr = Math.log(cr);

  const raw =
    (isFemale ? 1.33 : 0) +
    4.56 * lnBili +
    0.82 * (137 - na) -
    0.24 * (137 - na) * lnBili +
    9.09 * lnInr +
    11.14 * lnCr +
    1.85 * (3.5 - alb) -
    1.83 * (3.5 - alb) * lnCr +
    6;

  const score = Math.min(40, Math.max(6, Math.round(raw)));
  let severity: ScoreSeverityTone = 'low';
  let riskLabel = 'Düşük Risk (<10)';
  let ninetyDayMortality = '~%1.9';
  let recommendation = 'Ayaktan hepatoloji takibi ve altta yatan etiyoloji tedavisi.';

  if (score >= 30) {
    severity = 'critical';
    riskLabel = score >= 40 ? 'Kritik (40 — Üst Sınır)' : 'Çok Yüksek Risk (30–39)';
    ninetyDayMortality = score >= 40 ? '~%71.3' : '~%52.6';
    recommendation = 'Çok yüksek 90 günlük mortalite; acil karaciğer nakli merkezi konsültasyonu ve YBÜ izlemi.';
  } else if (score >= 20) {
    severity = 'high';
    riskLabel = 'Yüksek Risk (20–29)';
    ninetyDayMortality = '~%19.6';
    recommendation = 'Belirgin dekompansasyon riski; karaciğer nakli değerlendirmesi (MELD ≥15) ve yakın hastane izlemi.';
  } else if (score >= 10) {
    severity = 'moderate';
    riskLabel = 'Orta Risk (10–19)';
    ninetyDayMortality = '~%6.0';
    recommendation = score >= 15
      ? 'MELD 3.0 ≥15: Karaciğer nakli değerlendirmesine yönlendirme ve komplikasyon profilaksisi.'
      : 'Düzenli hepatoloji izlemi; sodyum, böbrek fonksiyonu ve enfeksiyon takibi.';
  }

  const guidelineRef = 'MELD 3.0 (OPTN/UNOS 2023) — Kim WR et al., Gastroenterology 2021;161(6):1887–1895';
  return {
    score,
    rawScore: Number(raw.toFixed(2)),
    severity,
    riskLabel,
    ninetyDayMortality,
    recommendation,
    clampingNotes,
    guidelineRef,
    soapLine: `MELD 3.0: ${score}/40 puan (${riskLabel}, 90g mortalite ${ninetyDayMortality}). ${recommendation}`
  };
}

// ============================================================================
// 2. NÖROLOJİ: NIHSS (0–42) & ABCD² (0–7)
// ============================================================================

export const NIHSS_SCHEMA: DeclarativeScoreSchema = {
  id: 'nihss',
  title: 'NIHSS İnme Şiddet Ölçeği',
  shortTitle: 'NIHSS',
  guidelineName: 'AHA/ASA Acute Ischemic Stroke Guideline',
  guidelineYear: '1989 / 2019',
  primaryCitation: 'Brott T et al., Stroke 1989;20:864–870; Powers WJ et al., Stroke 2019',
  minPossibleScore: 0,
  maxPossibleScore: 42,
  criteria: [
    {
      id: 'loc',
      label: '1a. Bilinç Düzeyi',
      type: 'select',
      options: [
        { value: '0', label: '0 — Uyanık, tam yanıtlı', points: 0 },
        { value: '1', label: '1 — Uykulu, hafif uyaranla uyanır', points: 1 },
        { value: '2', label: '2 — Tekrarlı / ağrılı uyaran gerekir', points: 2 },
        { value: '3', label: '3 — Yanıtsız / yalnızca refleks yanıt', points: 3 }
      ]
    },
    {
      id: 'loc_questions',
      label: '1b. Bilinç Soruları (Ay & Yaş)',
      type: 'select',
      options: [
        { value: '0', label: '0 — İkisi de doğru', points: 0 },
        { value: '1', label: '1 — Biri doğru', points: 1 },
        { value: '2', label: '2 — İkisi de yanlış', points: 2 }
      ]
    },
    {
      id: 'loc_commands',
      label: '1c. Bilinç Emirleri (Göz aç/kapa, el sık/bırak)',
      type: 'select',
      options: [
        { value: '0', label: '0 — İkisi de doğru', points: 0 },
        { value: '1', label: '1 — Biri doğru', points: 1 },
        { value: '2', label: '2 — İkisi de yanlış', points: 2 }
      ]
    },
    {
      id: 'gaze',
      label: '2. En İyi Bakış (Horizontal)',
      type: 'select',
      options: [
        { value: '0', label: '0 — Normal', points: 0 },
        { value: '1', label: '1 — Parsiyel bakış paralizisi', points: 1 },
        { value: '2', label: '2 — Zorunlu deviasyon / tam paralizi', points: 2 }
      ]
    },
    {
      id: 'visual',
      label: '3. Görme Alanları',
      type: 'select',
      options: [
        { value: '0', label: '0 — Kayıp yok', points: 0 },
        { value: '1', label: '1 — Parsiyel hemianopsi', points: 1 },
        { value: '2', label: '2 — Tam hemianopsi', points: 2 },
        { value: '3', label: '3 — Bilateral hemianopsi / kortikal körlük', points: 3 }
      ]
    },
    {
      id: 'facial',
      label: '4. Fasiyal Paralizi',
      type: 'select',
      options: [
        { value: '0', label: '0 — Normal simetrik', points: 0 },
        { value: '1', label: '1 — Minör (nazolabial sulkus silinmesi)', points: 1 },
        { value: '2', label: '2 — Parsiyel (alt yüz belirgin paralizi)', points: 2 },
        { value: '3', label: '3 — Tam (alt ve üst yüz)', points: 3 }
      ]
    },
    {
      id: 'motor_arm_left',
      label: '5a. Motor — Sol Kol (10 sn tutma)',
      type: 'select',
      options: [
        { value: '0', label: '0 — Düşme yok (10 sn)', points: 0 },
        { value: '1', label: '1 — Sürüklenme var, yatağa değmiyor', points: 1 },
        { value: '2', label: '2 — Yerçekimine karşı bir miktar çaba', points: 2 },
        { value: '3', label: '3 — Yerçekimine karşı çaba yok', points: 3 },
        { value: '4', label: '4 — Hareket yok', points: 4 }
      ]
    },
    {
      id: 'motor_arm_right',
      label: '5b. Motor — Sağ Kol (10 sn tutma)',
      type: 'select',
      options: [
        { value: '0', label: '0 — Düşme yok (10 sn)', points: 0 },
        { value: '1', label: '1 — Sürüklenme var, yatağa değmiyor', points: 1 },
        { value: '2', label: '2 — Yerçekimine karşı bir miktar çaba', points: 2 },
        { value: '3', label: '3 — Yerçekimine karşı çaba yok', points: 3 },
        { value: '4', label: '4 — Hareket yok', points: 4 }
      ]
    },
    {
      id: 'motor_leg_left',
      label: '6a. Motor — Sol Bacak (5 sn tutma)',
      type: 'select',
      options: [
        { value: '0', label: '0 — Düşme yok (5 sn)', points: 0 },
        { value: '1', label: '1 — Sürüklenme var, yatağa değmiyor', points: 1 },
        { value: '2', label: '2 — Yerçekimine karşı bir miktar çaba', points: 2 },
        { value: '3', label: '3 — Yerçekimine karşı çaba yok', points: 3 },
        { value: '4', label: '4 — Hareket yok', points: 4 }
      ]
    },
    {
      id: 'motor_leg_right',
      label: '6b. Motor — Sağ Bacak (5 sn tutma)',
      type: 'select',
      options: [
        { value: '0', label: '0 — Düşme yok (5 sn)', points: 0 },
        { value: '1', label: '1 — Sürüklenme var, yatağa değmiyor', points: 1 },
        { value: '2', label: '2 — Yerçekimine karşı bir miktar çaba', points: 2 },
        { value: '3', label: '3 — Yerçekimine karşı çaba yok', points: 3 },
        { value: '4', label: '4 — Hareket yok', points: 4 }
      ]
    },
    {
      id: 'ataxia',
      label: '7. Ekstremite Ataksisi',
      type: 'select',
      options: [
        { value: '0', label: '0 — Yok', points: 0 },
        { value: '1', label: '1 — Tek ekstremitede var', points: 1 },
        { value: '2', label: '2 — İki ekstremitede var', points: 2 }
      ]
    },
    {
      id: 'sensory',
      label: '8. Duyu (İğne batırma)',
      type: 'select',
      options: [
        { value: '0', label: '0 — Normal', points: 0 },
        { value: '1', label: '1 — Hafif–orta duyu kaybı', points: 1 },
        { value: '2', label: '2 — Ağır / tam duyu kaybı', points: 2 }
      ]
    },
    {
      id: 'language',
      label: '9. En İyi Dil (Afazi)',
      type: 'select',
      options: [
        { value: '0', label: '0 — Afazi yok', points: 0 },
        { value: '1', label: '1 — Hafif–orta afazi', points: 1 },
        { value: '2', label: '2 — Ağır afazi', points: 2 },
        { value: '3', label: '3 — Mutizm / global afazi', points: 3 }
      ]
    },
    {
      id: 'dysarthria',
      label: '10. Dizartri',
      type: 'select',
      options: [
        { value: '0', label: '0 — Normal', points: 0 },
        { value: '1', label: '1 — Hafif–orta (anlaşılabilir pelteklik)', points: 1 },
        { value: '2', label: '2 — Ağır / anartri (anlaşılamaz)', points: 2 }
      ]
    },
    {
      id: 'neglect',
      label: '11. Sönme ve İhmal (Neglect)',
      type: 'select',
      options: [
        { value: '0', label: '0 — Anormallik yok', points: 0 },
        { value: '1', label: '1 — Tek modalitede ihmal', points: 1 },
        { value: '2', label: '2 — Belirgin hemi-ihmal (>1 modalite)', points: 2 }
      ]
    }
  ],
  tiers: [
    {
      minScore: 0,
      maxScore: 0,
      label: 'İnme Bulgusu Yok',
      severity: 'low',
      recommendation: 'NIHSS 0 puan. Posterior dolaşım (vertigo, ataksi, diplopi) bulguları NIHSS ile tam yakalanmayabileceğinden klinik değerlendirmeyi koruyunuz.'
    },
    {
      minScore: 1,
      maxScore: 4,
      label: 'Minör İnme',
      severity: 'moderate',
      recommendation: 'Acil kontrastsız beyin BT ile kanama dışlanmalıdır. Disabilite yaratan defisit varsa ≤4.5 saat içinde IV tromboliz değerlendiriniz.'
    },
    {
      minScore: 5,
      maxScore: 15,
      label: 'Orta Şiddette İnme',
      severity: 'high',
      recommendation: 'Acil BT + BT Anjiyografi (BTA). Kontrendikasyon yoksa ≤4.5s IV tromboliz; NIHSS ≥6 ve büyük damar oklüzyonunda (LVO) mekanik trombektomi (≤24s) açısından değerlendiriniz.'
    },
    {
      minScore: 16,
      maxScore: 20,
      label: 'Orta–Ağır İnme',
      severity: 'critical',
      recommendation: 'Acil inme kodu, BT + BTA, uygun pencerede IV tromboliz + mekanik trombektomi ve inme ünitesi / YBÜ monitörizasyonu.'
    },
    {
      minScore: 21,
      maxScore: 42,
      label: 'Ağır İnme',
      severity: 'critical',
      recommendation: 'Çok ağır nörolojik defisit; havayolu güvenliği, acil nörovasküler görüntüleme, reperfüzyon uygunluğu ve YBÜ takibi gerektirir.'
    }
  ]
};

export const ABCD2_SCHEMA: DeclarativeScoreSchema = {
  id: 'abcd2',
  title: 'ABCD² GİA İnme Risk Skoru',
  shortTitle: 'ABCD²',
  guidelineName: 'ABCD² Score for TIA Stroke Risk',
  guidelineYear: '2007',
  primaryCitation: 'Johnston SC et al., Lancet 2007;369:283–292',
  minPossibleScore: 0,
  maxPossibleScore: 7,
  criteria: [
    { id: 'age60', label: 'A — Yaş ≥ 60 yıl', type: 'boolean', points: 1 },
    { id: 'bp', label: 'B — İlk KB ≥ 140/90 mmHg', type: 'boolean', points: 1 },
    {
      id: 'clinical',
      label: 'C — Klinik Bulgular',
      type: 'select',
      options: [
        { value: 'other', label: 'Diğer semptomlar', points: 0 },
        { value: 'speech', label: 'Güçsüzlük olmaksızın konuşma bozukluğu', points: 1 },
        { value: 'weakness', label: 'Tek taraflı güçsüzlük', points: 2 }
      ]
    },
    {
      id: 'duration',
      label: 'D — Semptom Süresi',
      type: 'select',
      options: [
        { value: 'lt10', label: '< 10 dakika', points: 0 },
        { value: '10_59', label: '10 – 59 dakika', points: 1 },
        { value: 'ge60', label: '≥ 60 dakika', points: 2 }
      ]
    },
    { id: 'diabetes', label: 'D — Diyabet Öyküsü', type: 'boolean', points: 1 }
  ],
  tiers: [
    {
      minScore: 0,
      maxScore: 3,
      label: 'Düşük Risk',
      severity: 'low',
      riskEstimate: '2g %1.0 | 7g %1.2',
      recommendation: '24–48 saat içinde nöroloji değerlendirmesi, karotis/intrakraniyal görüntüleme ve antiagregan planı.'
    },
    {
      minScore: 4,
      maxScore: 5,
      label: 'Orta Risk',
      severity: 'moderate',
      riskEstimate: '2g %4.1 | 7g %5.9',
      recommendation: 'Hastane yatışı veya acil gözlem; beyin MRG/DWI, karotis görüntüleme, EKG/ritim takibi ve erken ikili antiagregan değerlendirmesi.'
    },
    {
      minScore: 6,
      maxScore: 7,
      label: 'Yüksek Risk',
      severity: 'critical',
      riskEstimate: '2g %8.1 | 7g %11.7',
      recommendation: 'Acil hastane yatışı, ivedilikle nörovasküler görüntüleme (karotis stenozu/AF dışlama) ve ikincil inme profilaksisi.'
    }
  ]
};

// ============================================================================
// 3. SEPSİS / YBÜ: SOFA (0–24) & qSOFA (0–3)
// ============================================================================

export const SOFA_SCHEMA: DeclarativeScoreSchema = {
  id: 'sofa',
  title: 'SOFA Organ Yetmezliği Skoru (Sepsis-3)',
  shortTitle: 'SOFA',
  guidelineName: 'Sepsis-3 Consensus Definitions',
  guidelineYear: '1996 / 2016',
  primaryCitation: 'Vincent JL et al., Intensive Care Med 1996; Singer M et al., JAMA 2016;315(8):801–810',
  minPossibleScore: 0,
  maxPossibleScore: 24,
  criteria: [
    {
      id: 'respiration',
      label: 'Solunum — PaO₂/FiO₂ (mmHg)',
      type: 'select',
      options: [
        { value: '0', label: '≥ 400', points: 0 },
        { value: '1', label: '< 400', points: 1 },
        { value: '2', label: '< 300', points: 2 },
        { value: '3', label: '< 200 (solunum desteği ile)', points: 3 },
        { value: '4', label: '< 100 (solunum desteği ile)', points: 4 }
      ]
    },
    {
      id: 'coagulation',
      label: 'Koagülasyon — Trombosit (×10³/µL)',
      type: 'select',
      options: [
        { value: '0', label: '≥ 150', points: 0 },
        { value: '1', label: '< 150', points: 1 },
        { value: '2', label: '< 100', points: 2 },
        { value: '3', label: '< 50', points: 3 },
        { value: '4', label: '< 20', points: 4 }
      ]
    },
    {
      id: 'liver',
      label: 'Karaciğer — Total Bilirubin (mg/dL)',
      type: 'select',
      options: [
        { value: '0', label: '< 1.2', points: 0 },
        { value: '1', label: '1.2 – 1.9', points: 1 },
        { value: '2', label: '2.0 – 5.9', points: 2 },
        { value: '3', label: '6.0 – 11.9', points: 3 },
        { value: '4', label: '≥ 12.0', points: 4 }
      ]
    },
    {
      id: 'cardiovascular',
      label: 'Kardiyovasküler — MAP / Vazopresör',
      type: 'select',
      options: [
        { value: '0', label: 'MAP ≥ 70 mmHg', points: 0 },
        { value: '1', label: 'MAP < 70 mmHg', points: 1 },
        { value: '2', label: 'Dopamin ≤5 veya Dobutamin (herhangi doz)', points: 2 },
        { value: '3', label: 'Dopamin >5 veya Epi/NE ≤0.1 µg/kg/dk', points: 3 },
        { value: '4', label: 'Dopamin >15 veya Epi/NE >0.1 µg/kg/dk', points: 4 }
      ]
    },
    {
      id: 'cns',
      label: 'Santral Sinir Sistemi — GCS',
      type: 'select',
      options: [
        { value: '0', label: 'GCS 15', points: 0 },
        { value: '1', label: 'GCS 13 – 14', points: 1 },
        { value: '2', label: 'GCS 10 – 12', points: 2 },
        { value: '3', label: 'GCS 6 – 9', points: 3 },
        { value: '4', label: 'GCS < 6', points: 4 }
      ]
    },
    {
      id: 'renal',
      label: 'Renal — Kreatinin (mg/dL) / İdrar Çıkışı',
      type: 'select',
      options: [
        { value: '0', label: '< 1.2 mg/dL', points: 0 },
        { value: '1', label: '1.2 – 1.9 mg/dL', points: 1 },
        { value: '2', label: '2.0 – 3.4 mg/dL', points: 2 },
        { value: '3', label: '3.5 – 4.9 mg/dL veya <500 mL/gün', points: 3 },
        { value: '4', label: '≥ 5.0 mg/dL veya <200 mL/gün', points: 4 }
      ]
    }
  ],
  tiers: [
    {
      minScore: 0,
      maxScore: 1,
      label: 'Düşük Organ Disfonksiyonu',
      severity: 'low',
      riskEstimate: 'YBÜ Mortalite <%10',
      recommendation: 'Bazal değere göre ΔSOFA <2. Enfeksiyon şüphesinde klinik ve laktat izlemini sürdürünüz.'
    },
    {
      minScore: 2,
      maxScore: 6,
      label: 'Sepsis-3 Organ Disfonksiyonu (SOFA ≥2)',
      severity: 'high',
      riskEstimate: 'Hastane Mortalite ~%10–22',
      recommendation: 'Enfeksiyon şüphesiyle birlikte bazale göre ΔSOFA ≥2 sepsis tanısını destekler. 1 saatlik sepsis paketi (kan kültürü, ampirik IV antibiyotik, laktat, kristalloid) başlatınız.'
    },
    {
      minScore: 7,
      maxScore: 11,
      label: 'İleri Çoklu Organ Yetmezliği',
      severity: 'critical',
      riskEstimate: 'YBÜ Mortalite ~%30–50',
      recommendation: 'Yoğun bakım yatışı, seri laktat/SOFA takibi, hedef MAP ≥65 mmHg ve kaynak kontrolü gerektirir.'
    },
    {
      minScore: 12,
      maxScore: 24,
      label: 'Ağır Çoklu Organ Yetmezliği',
      severity: 'critical',
      riskEstimate: 'YBÜ Mortalite >%80',
      recommendation: 'Kritik çoklu organ yetmezliği; tam yoğun bakım organ destek protokolü.'
    }
  ]
};

export const QSOFA_SCHEMA: DeclarativeScoreSchema = {
  id: 'qsofa',
  title: 'qSOFA Yatak Başı Tarama (Sepsis-3)',
  shortTitle: 'qSOFA',
  guidelineName: 'Sepsis-3 & SSC 2021',
  guidelineYear: '2016 / 2021',
  primaryCitation: 'Singer M et al., JAMA 2016; Evans L et al., Surviving Sepsis Campaign 2021',
  minPossibleScore: 0,
  maxPossibleScore: 3,
  criteria: [
    { id: 'rr22', label: 'Solunum Sayısı ≥ 22/dk', type: 'boolean', points: 1 },
    { id: 'mental', label: 'Bilinç Değişikliği (GCS < 15)', type: 'boolean', points: 1 },
    { id: 'sbp100', label: 'Sistolik Kan Basıncı ≤ 100 mmHg', type: 'boolean', points: 1 }
  ],
  tiers: [
    {
      minScore: 0,
      maxScore: 1,
      label: 'Düşük qSOFA (<2)',
      severity: 'low',
      recommendation: 'SSC 2021 uyarınca qSOFA tek başına sepsis dışlama aracı değildir; klinik şüphe varsa NEWS2 ve tam SOFA ile değerlendiriniz.'
    },
    {
      minScore: 2,
      maxScore: 3,
      label: 'Yüksek Riskli qSOFA (≥2)',
      severity: 'critical',
      riskEstimate: 'Kötü sonlanım riski 3–14 kat ↑',
      recommendation: 'Organ disfonksiyonu açısından hemen tam SOFA, laktat ve erken sepsis protokolü uygulayınız.'
    }
  ]
};

// ============================================================================
// 4. ÜST GİS KANAMA: GLASGOW-BLATCHFORD SKORU (GBS, 0–23)
// ============================================================================

export const GLASGOW_BLATCHFORD_SCHEMA: DeclarativeScoreSchema = {
  id: 'glasgow_blatchford',
  title: 'Glasgow-Blatchford Üst GİS Kanama Skoru (GBS)',
  shortTitle: 'GBS',
  guidelineName: 'ESGE Non-Variceal UGIB Guideline',
  guidelineYear: '2000 / 2021',
  primaryCitation: 'Blatchford O et al., Lancet 2000;356:1318–1321; Gralnek IM et al., ESGE Endoscopy 2021',
  minPossibleScore: 0,
  maxPossibleScore: 23,
  criteria: [
    {
      id: 'bun',
      label: 'BUN (mg/dL) [Üre / 2.14]',
      type: 'select',
      options: [
        { value: 'lt18_2', label: '< 18.2 mg/dL (<6.5 mmol/L)', points: 0 },
        { value: '18_2_22_3', label: '18.2 – 22.3 mg/dL', points: 2 },
        { value: '22_4_27_9', label: '22.4 – 27.9 mg/dL', points: 3 },
        { value: '28_69_9', label: '28.0 – 69.9 mg/dL', points: 4 },
        { value: 'ge70', label: '≥ 70.0 mg/dL (≥25 mmol/L)', points: 6 }
      ]
    },
    {
      id: 'hb',
      label: 'Hemoglobin (g/dL — Cinsiyete Özgü)',
      type: 'select',
      options: [
        { value: 'normal', label: 'Erkek ≥13.0 | Kadın ≥12.0', points: 0 },
        { value: 'mild', label: 'Erkek 12.0–12.9 | Kadın 10.0–11.9', points: 1 },
        { value: 'mod_male', label: 'Erkek 10.0–11.9', points: 3 },
        { value: 'lt10', label: 'Her iki cinsiyet < 10.0 g/dL', points: 6 }
      ]
    },
    {
      id: 'sbp',
      label: 'Sistolik Kan Basıncı (mmHg)',
      type: 'select',
      options: [
        { value: 'ge110', label: '≥ 110 mmHg', points: 0 },
        { value: '100_109', label: '100 – 109 mmHg', points: 1 },
        { value: '90_99', label: '90 – 99 mmHg', points: 2 },
        { value: 'lt90', label: '< 90 mmHg', points: 3 }
      ]
    },
    { id: 'hr100', label: 'Nabız ≥ 100/dk', type: 'boolean', points: 1 },
    { id: 'melena', label: 'Melena varlığı', type: 'boolean', points: 1 },
    { id: 'syncope', label: 'Senkop öyküsü', type: 'boolean', points: 2 },
    { id: 'liverDisease', label: 'Karaciğer hastalığı / Siroz', type: 'boolean', points: 2 },
    { id: 'cardiacFailure', label: 'Kalp yetmezliği', type: 'boolean', points: 2 }
  ],
  tiers: [
    {
      minScore: 0,
      maxScore: 1,
      label: 'Çok Düşük Risk (GBS 0–1)',
      severity: 'low',
      riskEstimate: 'Müdahale riski <%1–2',
      recommendation: 'ESGE 2021: GBS ≤1 hastalar ek risk yoksa ayaktan erken endoskopi planıyla taburcu edilebilir.'
    },
    {
      minScore: 2,
      maxScore: 5,
      label: 'Orta Risk (GBS 2–5)',
      severity: 'moderate',
      recommendation: 'Hastane yatışı, IV PPI / hemodinamik izlem ve ≤24 saat içinde üst GİS endoskopisi planlayınız.'
    },
    {
      minScore: 6,
      maxScore: 23,
      label: 'Yüksek Risk (GBS ≥6)',
      severity: 'critical',
      riskEstimate: 'Klinik müdahale gereksinimi >%50',
      recommendation: 'Acil hemodinamik resüsitasyon, çift geniş damar yolu, kan hazırlığı (kısıtlayıcı transfüzyon eşiği Hb <7 g/dL) ve erken endoskopi.'
    }
  ]
};

export function evaluateNIHSS(inputs: DeclarativeScoreInputs = {}): DeclarativeScoreEvaluation {
  return evaluateDeclarativeScore(NIHSS_SCHEMA, inputs);
}

export function evaluateABCD2(inputs: DeclarativeScoreInputs = {}): DeclarativeScoreEvaluation {
  return evaluateDeclarativeScore(ABCD2_SCHEMA, inputs);
}

export function evaluateSOFA(inputs: DeclarativeScoreInputs = {}): DeclarativeScoreEvaluation {
  return evaluateDeclarativeScore(SOFA_SCHEMA, inputs);
}

export function evaluateQSOFA(inputs: DeclarativeScoreInputs = {}): DeclarativeScoreEvaluation {
  return evaluateDeclarativeScore(QSOFA_SCHEMA, inputs);
}

export function evaluateGlasgowBlatchford(inputs: DeclarativeScoreInputs = {}): DeclarativeScoreEvaluation {
  return evaluateDeclarativeScore(GLASGOW_BLATCHFORD_SCHEMA, inputs);
}
