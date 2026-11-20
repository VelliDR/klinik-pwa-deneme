/**
 * BİLDİRİMSEL (DECLARATIVE) PUANLAMA MOTORU
 *
 * Yeni staj modülleri (Dahiliye alt branşları, Kadın Doğum, 5. sınıf stajları) eklendikçe
 * klasik puan toplamalı klinik skorları (checkbox / seçim bazlı) tekrarlı DOM/kontrol kodu
 * yazmadan şema olarak tanımlamak, hesaplamak ve standart kılavuz/SOAP çıktısı üretmek için
 * tasarlanmıştır.
 *
 * Not: Non-monotonik, fizyopatolojik veya çok aşamalı algoritmik motorlar (kan gazı 3 ekol,
 * WHO LMS persentil, AAP 2022 sarılık, AJCC TNM vb.) saf TypeScript fonksiyonları olarak
 * kalmalıdır; bu yardımcı yalnızca puan toplamalı (additive) skorlar içindir.
 */

export type ScoreSeverityTone = 'low' | 'moderate' | 'high' | 'critical';

export interface DeclarativeCriterionOption {
  value: string;
  label: string;
  points: number;
}

export interface DeclarativeScoreCriterion {
  id: string;
  label: string;
  type: 'boolean' | 'select';
  /** `type === 'boolean'` için işaretlendiğinde eklenecek puan (negatif de olabilir, örn. Wells -2) */
  points?: number;
  /** `type === 'select'` için seçenek puanları */
  options?: DeclarativeCriterionOption[];
  /** Opsiyonel kısa klinik açıklama */
  hint?: string;
}

export interface DeclarativeScoreTier {
  minScore: number;
  maxScore: number;
  label: string;
  severity: ScoreSeverityTone;
  riskEstimate?: string;
  recommendation: string;
}

export interface DeclarativeScoreSchema {
  id: string;
  title: string;
  shortTitle: string;
  guidelineName: string;
  guidelineYear: string;
  primaryCitation: string;
  minPossibleScore: number;
  maxPossibleScore: number;
  criteria: DeclarativeScoreCriterion[];
  tiers: DeclarativeScoreTier[];
  /** İsteğe bağlı özel popülasyon / yaş güvenlik notu üretici */
  contextualWarnings?: (context: { ageYears?: number | null; isPregnant?: boolean }, score: number) => string[];
}

export interface DeclarativeScoreEvaluation {
  schemaId: string;
  title: string;
  score: number;
  minPossibleScore: number;
  maxPossibleScore: number;
  matchedCriteria: Array<{ id: string; label: string; points: number }>;
  tier: DeclarativeScoreTier;
  warnings: string[];
  guidelineRef: string;
  soapLine: string;
}

export type DeclarativeScoreInputs = Record<string, boolean | string | number | null | undefined>;

/**
 * Verilen bildirimsel skor şemasını kullanıcı girdileriyle deterministik olarak değerlendirir.
 */
export function evaluateDeclarativeScore(
  schema: DeclarativeScoreSchema,
  inputs: DeclarativeScoreInputs = {},
  context: { ageYears?: number | null; isPregnant?: boolean } = {}
): DeclarativeScoreEvaluation {
  let score = 0;
  const matchedCriteria: Array<{ id: string; label: string; points: number }> = [];

  for (const criterion of schema.criteria) {
    const rawVal = inputs[criterion.id];
    if (criterion.type === 'boolean') {
      if (Boolean(rawVal)) {
        const pts = criterion.points ?? 1;
        score += pts;
        matchedCriteria.push({ id: criterion.id, label: criterion.label, points: pts });
      }
    } else if (criterion.type === 'select' && Array.isArray(criterion.options)) {
      const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
      const opt = criterion.options.find(o => o.value === strVal);
      if (opt) {
        score += opt.points;
        if (opt.points !== 0) {
          matchedCriteria.push({ id: criterion.id, label: `${criterion.label}: ${opt.label}`, points: opt.points });
        }
      }
    }
  }

  const tier =
    schema.tiers.find(t => score >= t.minScore && score <= t.maxScore) ||
    schema.tiers[schema.tiers.length - 1];

  const warnings = schema.contextualWarnings ? schema.contextualWarnings(context, score) : [];
  const guidelineRef = `${schema.guidelineName} (${schema.guidelineYear}) — ${schema.primaryCitation}`;
  const riskPart = tier.riskEstimate ? ` (${tier.riskEstimate})` : '';
  const soapLine = `${schema.shortTitle}: ${score}/${schema.maxPossibleScore} puan — ${tier.label}${riskPart}. ${tier.recommendation}`;

  return {
    schemaId: schema.id,
    title: schema.title,
    score,
    minPossibleScore: schema.minPossibleScore,
    maxPossibleScore: schema.maxPossibleScore,
    matchedCriteria,
    tier,
    warnings,
    guidelineRef,
    soapLine
  };
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Standart yatak başı 15-saniye özet kart HTML çıktısı üretir.
 */
export function renderDeclarativeScoreSummaryHTML(result: DeclarativeScoreEvaluation): string {
  const toneClasses: Record<ScoreSeverityTone, string> = {
    low: 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200',
    moderate: 'bg-amber-950/40 border-amber-700/60 text-amber-200',
    high: 'bg-rose-950/45 border-rose-700/70 text-rose-200',
    critical: 'bg-rose-950/70 border-rose-500 text-rose-100'
  };

  const warningsHtml = result.warnings.length > 0
    ? `<div class="pt-1 border-t border-slate-700/40 space-y-0.5 text-[0.75rem] text-amber-300">${result.warnings.map(w => `<div>• ${escapeHtml(w)}</div>`).join('')}</div>`
    : '';

  return `
    <div class="p-2.5 rounded-lg border space-y-1.5 tabular-nums ${toneClasses[result.tier.severity]}">
      <div class="flex items-center justify-between gap-2">
        <strong class="text-xs sm:text-sm">${escapeHtml(result.title)}: ${result.score}/${result.maxPossibleScore}</strong>
        <span class="text-[0.75rem] font-semibold px-1.5 py-0.5 rounded bg-slate-900/60 border border-current/25">${escapeHtml(result.tier.label)}${result.tier.riskEstimate ? ` • ${escapeHtml(result.tier.riskEstimate)}` : ''}</span>
      </div>
      <div class="text-[0.8125rem] leading-relaxed">${escapeHtml(result.tier.recommendation)}</div>
      ${warningsHtml}
      <div class="text-[0.6875rem] opacity-75 font-mono pt-0.5">Kaynak: ${escapeHtml(result.guidelineRef)}</div>
    </div>
  `;
}

// ============================================================================
// ÖRNEK REFERANS ŞEMALARI (YENİ STAJ MODÜLLERİ İÇİN ŞABLON)
// ============================================================================

export const CURB65_DECLARATIVE_SCHEMA: DeclarativeScoreSchema = {
  id: 'curb65',
  title: 'CURB-65 Pnömoni Şiddet Skoru',
  shortTitle: 'CURB-65',
  guidelineName: 'BTS Community-Acquired Pneumonia Guideline',
  guidelineYear: '2003 / 2009',
  primaryCitation: 'Lim WS et al., Thorax 2003;58:377–382',
  minPossibleScore: 0,
  maxPossibleScore: 5,
  criteria: [
    { id: 'confusion', label: 'Konfüzyon (AMT ≤8 veya yeni yönelim bozukluğu)', type: 'boolean', points: 1 },
    { id: 'urea', label: 'BUN >19 mg/dL (Üre >42 mg/dL / >7 mmol/L)', type: 'boolean', points: 1 },
    { id: 'respiratoryRate', label: 'Solunum Sayısı ≥30/dk', type: 'boolean', points: 1 },
    { id: 'bloodPressure', label: 'SKB <90 mmHg veya DKB ≤60 mmHg', type: 'boolean', points: 1 },
    { id: 'age65', label: 'Yaş ≥65 yıl', type: 'boolean', points: 1 }
  ],
  tiers: [
    {
      minScore: 0,
      maxScore: 1,
      label: 'Düşük Risk',
      severity: 'low',
      riskEstimate: '30g Mortalite ~%1.5',
      recommendation: 'Ayaktan oral antibiyoterapi ve klinik izlem uygundur.'
    },
    {
      minScore: 2,
      maxScore: 2,
      label: 'Orta Risk',
      severity: 'moderate',
      riskEstimate: '30g Mortalite ~%9.2',
      recommendation: 'Kısa süreli servis yatışı veya çok yakın ayaktan takip değerlendiriniz.'
    },
    {
      minScore: 3,
      maxScore: 5,
      label: 'Yüksek Risk / Ağır Pnömoni',
      severity: 'critical',
      riskEstimate: '30g Mortalite ≥%22',
      recommendation: 'Hastaneye acil yatış; skor 4–5 ise yoğun bakım (YBÜ) değerlendirmesi yapınız.'
    }
  ],
  contextualWarnings: (ctx) => {
    if (ctx.ageYears !== null && ctx.ageYears !== undefined && ctx.ageYears < 18) {
      return ['CURB-65 erişkin toplum kökenli pnömoni için valide edilmiştir (<18 yaşta kullanılmaz).'];
    }
    return [];
  }
};

export const CENTOR_MCISAAC_DECLARATIVE_SCHEMA: DeclarativeScoreSchema = {
  id: 'centor_mcisaac',
  title: 'Centor / McIsaac Farenjit Skoru',
  shortTitle: 'McIsaac',
  guidelineName: 'IDSA GAS Pharyngitis / McIsaac Revision',
  guidelineYear: '1998 / 2012',
  primaryCitation: 'McIsaac WJ et al., CMAJ 1998; Shulman ST et al., Clin Infect Dis 2012',
  minPossibleScore: -1,
  maxPossibleScore: 5,
  criteria: [
    { id: 'fever', label: 'Ateş >38.0°C', type: 'boolean', points: 1 },
    { id: 'noCough', label: 'Öksürük yokluğu', type: 'boolean', points: 1 },
    { id: 'adenopathy', label: 'Ağrılı ön servikal lenfadenopati', type: 'boolean', points: 1 },
    { id: 'exudate', label: 'Tonsiller eksüda veya şişlik', type: 'boolean', points: 1 },
    {
      id: 'ageBand',
      label: 'Yaş grubu düzeltmesi',
      type: 'select',
      options: [
        { value: '3_14', label: '3–14 yaş', points: 1 },
        { value: '15_44', label: '15–44 yaş', points: 0 },
        { value: '45_plus', label: '≥45 yaş', points: -1 }
      ]
    }
  ],
  tiers: [
    {
      minScore: -1,
      maxScore: 1,
      label: 'Düşük Olasılık',
      severity: 'low',
      riskEstimate: 'GAS ~%1–10',
      recommendation: 'Hızlı antijen testi veya antibiyotik gerekmez; semptomatik destek.'
    },
    {
      minScore: 2,
      maxScore: 3,
      label: 'Orta Olasılık',
      severity: 'moderate',
      riskEstimate: 'GAS ~%15–35',
      recommendation: 'Hızlı Strep antijen testi (RADT) veya boğaz kültürü; pozitifse antibiyotik.'
    },
    {
      minScore: 4,
      maxScore: 5,
      label: 'Yüksek Olasılık',
      severity: 'high',
      riskEstimate: 'GAS ~%51–53',
      recommendation: 'RADT / kültür doğrulaması veya klinik duruma göre ampirik penisilin/amoksisilin.'
    }
  ]
};
