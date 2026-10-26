/**
 * ÇEVRİMDIŞI KLİNİK İLAÇ MONOGRAF MOTORU (OFFLINE CLINICAL MONOGRAPH ENGINE)
 *
 * Hastane bodrum katları, sarı/kırmızı alanlar ve internetin çekmediği nöbet
 * ortamlarında TİTCK harici PDF bağlantıları açılamadığında en sık kullanılan
 * 125 kritik etken madde için %100 çevrimdışı doz, renal/hepatik uyarlama,
 * gebelik/emzirme güvenliği ve kontrendikasyon özeti sunar.
 */

import { normalizeText } from './db/titckIndexedDB';

export type MeasuringDeviceType = 'oral_syringe' | 'calibrated_cup' | 'dropper' | 'none';
export type LactMedSafetyVerdict = 'COMPATIBLE' | 'USE_WITH_CAUTION' | 'CONTRAINDICATED';
export type WeightMetricInObesity = 'TBW' | 'IBW' | 'AdjBW';
export type TrimesterRiskLevel = 'SAFE' | 'CAUTION' | 'CONTRAINDICATED';

export interface FormulationsProfile {
  form_name: string;
  concentration_mg_per_ml: number;
  concentration_display?: string;
  measuring_device: MeasuringDeviceType;
  reconstitution_stability_days?: number;
  storage_condition?: string;
}

export interface PediatricDosingProfile {
  indication: string;
  min_age_months: number;
  min_weight_kg: number;
  dose_per_kg_single: number;
  interval_hours: number;
  max_daily_dose_mg_per_kg: number;
  absolute_max_single_dose_mg: number;
  absolute_max_daily_dose_mg: number;
  weight_metric_in_obesity?: WeightMetricInObesity;
}

export interface AdultDosingProfile {
  standard_single_dose_mg?: number;
  standard_interval_hours?: number[];
  max_daily_dose_mg?: number;
}

export interface DosingStructure {
  adult_dosing?: AdultDosingProfile;
  pediatric_dosing?: PediatricDosingProfile[];
}

export interface RenalAdjustmentItem {
  egfr_min: number;
  egfr_max: number;
  action_type: 'DOSE_REDUCTION' | 'INTERVAL_EXTENSION' | 'CONTRAINDICATED';
  adjustment_instruction: string;
}

export interface HepaticAdjustmentItem {
  child_pugh_class: 'Class_A' | 'Class_B' | 'Class_C';
  action_instruction: string;
}

export interface OrganImpairmentStructure {
  renal_adjustments?: RenalAdjustmentItem[];
  hepatic_adjustments?: HepaticAdjustmentItem[];
}

export interface PregnancyTrimesterRisk {
  first_trimester: string;
  second_trimester: string;
  third_trimester: string;
}

export interface LactationProfile {
  lactmed_record_summary: string;
  relative_infant_dose_percent: number;
  safety_verdict: LactMedSafetyVerdict;
  infant_monitoring?: string;
  infant_monitoring_notes?: string;
}

export interface ReproductiveSafetyStructure {
  titck_legacy_category?: string;
  pregnancy_trimester_risk?: PregnancyTrimesterRisk;
  lactation?: LactationProfile;
}

export interface CriticalDrugInteraction {
  interacting_drug: string;
  severity: 'MAJOR' | 'MODERATE';
  clinical_management: string;
}

export interface SafetyWarningsStructure {
  black_box_warnings?: string[];
  absolute_contraindications?: string[];
  neonatal_specific_notes?: string;
  critical_drug_interactions?: CriticalDrugInteraction[];
}

export interface MonographMetadata {
  source_documents: string[];
  version_date: string;
  last_reviewed_iso: string;
}

export interface ClinicalMonograph {
  id: string;
  genericTr: string;
  genericEn: string;
  atcCodes: string[];
  genericKeywords: string[];
  brandExamples: string[];
  drugClass: string;
  indications: string;
  adultDose: string;
  pediatricDose: string;
  maxDailyDose: string;
  renalAdjustment: string;
  hepaticAdjustment: string;
  pregnancyLactation: string;
  contraindications: string;
  clinicalPearls: string;
  // Structured Clinical Monograph Card fields
  drug_id?: string;
  generic_name?: string;
  atc_code?: string;
  formulations?: FormulationsProfile[];
  dosing?: DosingStructure;
  organ_impairment?: OrganImpairmentStructure;
  reproductive_safety?: ReproductiveSafetyStructure;
  safety_warnings?: SafetyWarningsStructure;
  metadata?: MonographMetadata;
}

export interface MonographLookupInput {
  atc?: string;
  atcCode?: string;
  generic?: string;
  brand?: string;
}

interface MonographIndex {
  byAtcExact: Map<string, ClinicalMonograph>;
  byAtcPrefix: Array<{ prefix: string; item: ClinicalMonograph }>;
  byKeywordNorm: Map<string, ClinicalMonograph>;
  byBrandNorm: Map<string, ClinicalMonograph>;
}

let monographsCache: ClinicalMonograph[] | null = null;
let monographIndex: MonographIndex | null = null;
let loadingPromise: Promise<ClinicalMonograph[]> | null = null;

function buildMonographIndex(list: ClinicalMonograph[]): MonographIndex {
  const byAtcExact = new Map<string, ClinicalMonograph>();
  const byAtcPrefix: Array<{ prefix: string; item: ClinicalMonograph }> = [];
  const byKeywordNorm = new Map<string, ClinicalMonograph>();
  const byBrandNorm = new Map<string, ClinicalMonograph>();

  for (const item of list) {
    if (Array.isArray(item.atcCodes)) {
      for (const rawCode of item.atcCodes) {
        const code = String(rawCode || '').trim().toUpperCase();
        if (!code) continue;
        if (code.length >= 7) {
          if (!byAtcExact.has(code)) byAtcExact.set(code, item);
        } else if (code.length >= 4) {
          byAtcPrefix.push({ prefix: code, item });
        }
      }
    }

    const keywords = [
      item.genericEn,
      item.genericTr.split('(')[0],
      ...(item.genericKeywords || [])
    ];
    for (const kw of keywords) {
      const norm = normalizeText(kw);
      if (norm && norm.length >= 3 && !byKeywordNorm.has(norm)) {
        byKeywordNorm.set(norm, item);
      }
    }

    if (Array.isArray(item.brandExamples)) {
      for (const br of item.brandExamples) {
        const norm = normalizeText(br);
        if (norm && norm.length >= 3 && !byBrandNorm.has(norm)) {
          byBrandNorm.set(norm, item);
        }
      }
    }
  }

  // Daha uzun (spesifik) ATC önekleri önce kontrol edilir
  byAtcPrefix.sort((a, b) => b.prefix.length - a.prefix.length);

  return { byAtcExact, byAtcPrefix, byKeywordNorm, byBrandNorm };
}

export function setMonographsCache(list: ClinicalMonograph[]): void {
  if (!Array.isArray(list)) return;
  monographsCache = list;
  monographIndex = buildMonographIndex(list);
}

export function getMonographsCache(): ClinicalMonograph[] | null {
  return monographsCache;
}

export function isMonographsReady(): boolean {
  return monographsCache !== null && monographsCache.length > 0;
}

export async function ensureMonographsReady(): Promise<ClinicalMonograph[]> {
  if (isMonographsReady() && monographsCache) {
    return monographsCache;
  }
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const candidatePaths = [
      './data/clinical_monographs.json',
      '/data/clinical_monographs.json',
      'data/clinical_monographs.json'
    ];

    for (const p of candidatePaths) {
      try {
        const res = await fetch(p);
        if (res && res.ok) {
          const data = (await res.json()) as ClinicalMonograph[];
          if (Array.isArray(data) && data.length > 0) {
            setMonographsCache(data);
            return data;
          }
        }
      } catch {
        // Sonraki aday yolu dene
      }
    }
    return [];
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export function findMonographSync(drug?: MonographLookupInput | null): ClinicalMonograph | null {
  if (!drug || !monographIndex) return null;

  const rawAtc = String(drug.atcCode || drug.atc || '').trim().toUpperCase();
  if (rawAtc) {
    const exact = monographIndex.byAtcExact.get(rawAtc);
    if (exact) return exact;

    for (const { prefix, item } of monographIndex.byAtcPrefix) {
      if (rawAtc.startsWith(prefix)) return item;
    }
  }

  const genNorm = normalizeText(drug.generic || '');
  if (genNorm && genNorm !== 'belirtilmedi') {
    const directGen = monographIndex.byKeywordNorm.get(genNorm);
    if (directGen) return directGen;

    // Kombinasyon veya tuz ekli jenerik isimler için kelime/ifade taraması (örn: "dexketoprofen trometamol", "valsartan and diuretics")
    for (const [kw, item] of monographIndex.byKeywordNorm.entries()) {
      if (kw.length >= 5 && (genNorm === kw || genNorm.startsWith(kw + ' ') || genNorm.includes(' ' + kw + ' ') || genNorm.endsWith(' ' + kw))) {
        return item;
      }
    }
  }

  const brandNorm = normalizeText(drug.brand || '');
  if (brandNorm) {
    const firstToken = brandNorm.split(' ')[0];
    if (firstToken && firstToken.length >= 3) {
      const byFirstBrand = monographIndex.byBrandNorm.get(firstToken);
      if (byFirstBrand) return byFirstBrand;
    }
    for (const [brNorm, item] of monographIndex.byBrandNorm.entries()) {
      if (brandNorm === brNorm || brandNorm.startsWith(brNorm + ' ')) {
        return item;
      }
    }
  }

  return null;
}

export async function findMonographForDrug(drug?: MonographLookupInput | null): Promise<ClinicalMonograph | null> {
  if (!isMonographsReady()) {
    await ensureMonographsReady();
  }
  return findMonographSync(drug);
}

function escapeSafeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toLowerTr(text: string): string {
  return String(text || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR');
}

export function evaluateTrimesterRiskLevel(text: string): {
  level: TrimesterRiskLevel;
  label: string;
  badgeClass: string;
  boxClass: string;
} {
  const norm = toLowerTr(text);
  if (norm.includes('kontrendike') || norm.includes('kesin kontrendike') || norm.includes('kullanılmamalı') || norm.includes('kaçınılmalıdır')) {
    return {
      level: 'CONTRAINDICATED',
      label: 'KONTRENDİKE',
      badgeClass: 'bg-rose-900/90 text-rose-200 border-rose-500',
      boxClass: 'bg-rose-950/40 border-rose-700/70 text-rose-100'
    };
  }
  if (norm.includes('dikkat') || norm.includes('izlem') || norm.includes('alternatif yoksa') || norm.includes('risk') || norm.includes('tartışmalı') || norm.includes('zorunlu')) {
    return {
      level: 'CAUTION',
      label: 'YAKIN İZLEM',
      badgeClass: 'bg-amber-900/90 text-amber-200 border-amber-500',
      boxClass: 'bg-amber-950/40 border-amber-700/70 text-amber-100'
    };
  }
  return {
    level: 'SAFE',
    label: 'GÜVENLİ',
    badgeClass: 'bg-emerald-900/90 text-emerald-200 border-emerald-500',
    boxClass: 'bg-emerald-950/40 border-emerald-700/70 text-emerald-100'
  };
}

export function getMeasuringDeviceBadge(device?: MeasuringDeviceType): { icon: string; label: string; badgeClass: string } {
  switch (device) {
    case 'oral_syringe':
      return { icon: '💉', label: 'Oral Enjektör Zorunlu (<10 mL)', badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-600/70' };
    case 'dropper':
      return { icon: '💧', label: 'Kalibre Damlalık', badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70' };
    case 'calibrated_cup':
      return { icon: '🥛', label: 'Kalibre Ölçü Kabı', badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-600/70' };
    case 'none':
    default:
      return { icon: '💉', label: 'Parenteral / İnfüzyon', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700' };
  }
}

export function renderMonographCardHTML(mono: ClinicalMonograph, selectedBrand?: string): string {
  const brandHeader = selectedBrand
    ? `<div class="text-[11px] text-emerald-300 font-semibold mb-0.5">💊 Seçili Müstahzar: ${escapeSafeHtml(selectedBrand)}</div>`
    : '';
  const brandsList = (mono.brandExamples || []).map(escapeSafeHtml).join(', ');
  const atcList = (mono.atcCodes || []).map(escapeSafeHtml).join(', ');

  // 1. Kara Kutu Uyarısı (Black Box Warning)
  const blackBoxes = mono.safety_warnings?.black_box_warnings || [];
  const blackBoxHTML = blackBoxes.length > 0
    ? `
      <div class="bg-rose-950/70 border-2 border-rose-600 rounded-xl p-3 space-y-1.5 shadow-lg shadow-rose-950/40">
        <div class="text-[11px] font-black tracking-wider text-rose-300 uppercase flex items-center gap-1.5">
          <span class="text-base">🛑</span> FDA / TİTCK KARA KUTU UYARISI (BLACK BOX WARNING)
        </div>
        <div class="space-y-1">
          ${blackBoxes.map(w => `<div class="text-rose-100 text-[11px] font-bold leading-relaxed">• ${escapeSafeHtml(w)}</div>`).join('')}
        </div>
      </div>
    `
    : '';

  // 2. Tescilli Formülasyonlar ve Dozlama Cihazı Standartları (ISMP)
  const forms = mono.formulations || [];
  const formulationsHTML = forms.length > 0
    ? `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
        <div class="text-[10px] uppercase tracking-wider font-bold text-sky-400 flex items-center justify-between">
          <span>📦 Tescilli Formülasyonlar & Ölçüm Standardı (ISMP)</span>
          <span class="text-[9px] font-mono text-slate-400">Kaşık/Ölçek Yasak 🚫</span>
        </div>
        <div class="grid grid-cols-1 gap-1.5">
          ${forms.map(f => {
            const dev = getMeasuringDeviceBadge(f.measuring_device);
            return `
              <div class="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/60">
                <div>
                  <div class="font-semibold text-white text-[11px]">${escapeSafeHtml(f.form_name)}</div>
                  ${f.concentration_display ? `<div class="text-[10px] text-cyan-300 font-mono">${escapeSafeHtml(f.concentration_display)}</div>` : ''}
                  ${f.storage_condition ? `<div class="text-[9px] text-slate-400 mt-0.5">🌡️ ${escapeSafeHtml(f.storage_condition)}</div>` : ''}
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-[9px] px-2 py-0.5 rounded border font-semibold ${dev.badgeClass}">${dev.icon} ${dev.label}</span>
                  ${f.reconstitution_stability_days ? `<span class="text-[9px] px-2 py-0.5 rounded border border-amber-600/70 bg-amber-950/80 text-amber-300 font-semibold">⏱️ Sulandırıldıktan sonra: ${f.reconstitution_stability_days} gün</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `
    : '';

  // 3. Yapılandırılmış Pediatrik Dozlama Kartları
  const pedDosing = mono.dosing?.pediatric_dosing || [];
  const adultDosingStruct = mono.dosing?.adult_dosing;
  const structuredDosingHTML = pedDosing.length > 0
    ? `
      <div class="space-y-2">
        <div class="text-[10px] uppercase tracking-wider font-bold text-blue-400">👶 Yapılandırılmış Pediatrik Dozlama Protokolü</div>
        <div class="grid grid-cols-1 ${pedDosing.length > 1 ? 'sm:grid-cols-2' : ''} gap-2">
          ${pedDosing.map(pd => {
            const isIBW = pd.weight_metric_in_obesity === 'IBW';
            const weightBadge = isIBW
              ? `<span class="bg-amber-950/90 text-amber-300 border border-amber-600 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">⚖️ Obezitede: IBW (İdeal Kilo)</span>`
              : `<span class="bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded text-[9px] font-mono">⚖️ Total Kilo</span>`;
            return `
              <div class="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                <div class="flex items-center justify-between gap-1">
                  <span class="font-bold text-white text-[11px]">${escapeSafeHtml(pd.indication)}</span>
                  ${weightBadge}
                </div>
                <div class="text-blue-300 font-mono text-[11px] font-semibold">
                  Tek Doz: ${pd.dose_per_kg_single} mg/kg <span class="text-slate-400 font-normal">(${pd.interval_hours ? `${pd.interval_hours} saatte bir` : 'tek doz'})</span>
                </div>
                <div class="text-[10px] text-slate-300 leading-relaxed font-mono">
                  Maks Günlük: ${pd.max_daily_dose_mg_per_kg} mg/kg | Tavan: ${pd.absolute_max_single_dose_mg} mg/doz (Günlük: ${pd.absolute_max_daily_dose_mg} mg)
                </div>
                <div class="text-[9px] text-slate-400">
                  Yaş/Kilo Sınırı: ≥${pd.min_age_months} ay, ≥${pd.min_weight_kg} kg
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `
    : `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
          <div class="text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-0.5">👤 Erişkin Dozu</div>
          <div class="text-slate-200 leading-relaxed font-mono text-[11px]">${escapeSafeHtml(mono.adultDose)}</div>
        </div>
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
          <div class="text-[10px] uppercase tracking-wider font-bold text-blue-400 mb-0.5">👶 Pediatrik Doz</div>
          <div class="text-slate-200 leading-relaxed font-mono text-[11px]">${escapeSafeHtml(mono.pediatricDose)}</div>
        </div>
      </div>
    `;

  // 4. FDA 2015 PLLR Trimester Durum Çubuğu & LactMed
  const trimesterRisk = mono.reproductive_safety?.pregnancy_trimester_risk;
  const lactation = mono.reproductive_safety?.lactation;
  const legacyCat = mono.reproductive_safety?.titck_legacy_category;

  let reproductiveHTML = '';
  if (trimesterRisk) {
    const t1 = evaluateTrimesterRiskLevel(trimesterRisk.first_trimester);
    const t2 = evaluateTrimesterRiskLevel(trimesterRisk.second_trimester);
    const t3 = evaluateTrimesterRiskLevel(trimesterRisk.third_trimester);

    let lactVerdictBadge = '';
    if (lactation) {
      if (lactation.safety_verdict === 'COMPATIBLE') {
        lactVerdictBadge = `<span class="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full font-bold">✅ LactMed: Uyumlu (Güvenli)</span>`;
      } else if (lactation.safety_verdict === 'USE_WITH_CAUTION') {
        lactVerdictBadge = `<span class="bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full font-bold">⚠️ LactMed: Dikkatli Kullanım</span>`;
      } else {
        lactVerdictBadge = `<span class="bg-rose-950/80 text-rose-300 border border-rose-700/60 px-2 py-0.5 rounded-full font-bold">🛑 LactMed: Kontrendike</span>`;
      }
    }

    const ridBadge = lactation && lactation.relative_infant_dose_percent !== undefined
      ? `<span class="bg-blue-950/80 text-blue-300 border border-blue-700/60 px-2 py-0.5 rounded-full font-mono font-semibold">🍼 RID: %${lactation.relative_infant_dose_percent} (${lactation.relative_infant_dose_percent < 10 ? '< %10 Güvenli' : 'Yakın İzlem'})</span>`
      : '';

    reproductiveHTML = `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-1.5">
          <div class="text-[10px] uppercase tracking-wider font-bold text-pink-400 flex items-center gap-1.5">
            <span>🤰 Gebelik Trimester Durum Çubuğu (FDA 2015 PLLR Modeli)</span>
          </div>
          ${legacyCat ? `<span class="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">Eski TİTCK Harf Kodu: ${escapeSafeHtml(legacyCat)}</span>` : ''}
        </div>

        <!-- Trimester Status Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div class="p-2 rounded-lg border ${t1.boxClass} space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-[10px]">1. Trimester (T1)</span>
              <span class="text-[8px] font-extrabold px-1.5 py-0.2 rounded border ${t1.badgeClass}">${t1.label}</span>
            </div>
            <div class="text-[10px] leading-relaxed opacity-95">${escapeSafeHtml(trimesterRisk.first_trimester)}</div>
          </div>

          <div class="p-2 rounded-lg border ${t2.boxClass} space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-[10px]">2. Trimester (T2)</span>
              <span class="text-[8px] font-extrabold px-1.5 py-0.2 rounded border ${t2.badgeClass}">${t2.label}</span>
            </div>
            <div class="text-[10px] leading-relaxed opacity-95">${escapeSafeHtml(trimesterRisk.second_trimester)}</div>
          </div>

          <div class="p-2 rounded-lg border ${t3.boxClass} space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-[10px]">3. Trimester (T3)</span>
              <span class="text-[8px] font-extrabold px-1.5 py-0.2 rounded border ${t3.badgeClass}">${t3.label}</span>
            </div>
            <div class="text-[10px] leading-relaxed opacity-95">${escapeSafeHtml(trimesterRisk.third_trimester)}</div>
          </div>
        </div>

        <!-- LactMed & Emzirme Güvenliği -->
        ${lactation ? `
          <div class="bg-slate-800/40 border border-slate-700/60 rounded-lg p-2 space-y-1.5">
            <div class="flex flex-wrap items-center justify-between gap-1.5">
              <div class="text-[10px] uppercase font-bold text-sky-300">🤱 Laktasyon ve LactMed Kanıt Özeti</div>
              <div class="flex flex-wrap items-center gap-1.5 text-[9px]">
                ${lactVerdictBadge}
                ${ridBadge}
              </div>
            </div>
            <div class="text-[11px] text-slate-200 leading-relaxed">${escapeSafeHtml(lactation.lactmed_record_summary)}</div>
            ${lactation.infant_monitoring ? `<div class="text-[10px] text-amber-200 leading-relaxed">⚠️ <strong>İnfant İzlem:</strong> ${escapeSafeHtml(lactation.infant_monitoring)}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  } else {
    reproductiveHTML = `
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
        <div class="text-[10px] uppercase tracking-wider font-bold text-pink-400 mb-0.5">🤰 Gebelik ve Emzirme Güvenliği</div>
        <div class="text-slate-200 leading-relaxed text-[11px]">${escapeSafeHtml(mono.pregnancyLactation)}</div>
      </div>
    `;
  }

  // 5. Yenidoğan ve Prematüre Güvenlik Notu
  const neonatalNote = mono.safety_warnings?.neonatal_specific_notes;
  const neonatalHTML = neonatalNote
    ? `
      <div class="bg-indigo-950/40 border border-indigo-700/60 rounded-lg p-2.5 space-y-1">
        <div class="text-[10px] uppercase tracking-wider font-bold text-indigo-300 flex items-center gap-1.5">
          <span>👶 Yenidoğan & Prematüre Güvenlik Kuralları</span>
        </div>
        <div class="text-indigo-100 text-[11px] leading-relaxed font-medium">${escapeSafeHtml(neonatalNote)}</div>
      </div>
    `
    : '';

  // 6. Kritik İlaç Etkileşimleri
  const interactions = mono.safety_warnings?.critical_drug_interactions || [];
  const interactionsHTML = interactions.length > 0
    ? `
      <div class="bg-amber-950/30 border border-amber-700/60 rounded-lg p-2.5 space-y-1.5">
        <div class="text-[10px] uppercase tracking-wider font-bold text-amber-300">⚡ Kritik İlaç Etkileşim Kalkanı</div>
        <div class="space-y-1">
          ${interactions.map(it => `
            <div class="text-[11px] text-amber-100 leading-relaxed">
              • <strong class="text-amber-200">${escapeSafeHtml(it.interacting_drug)}</strong> (${it.severity}): ${escapeSafeHtml(it.clinical_management)}
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // 7. Metadata Footer
  const meta = mono.metadata;
  const metaHTML = meta
    ? `
      <div class="flex flex-wrap items-center justify-between gap-1 text-[9px] text-slate-500 font-mono px-1">
        <div>Kaynaklar: ${(meta.source_documents || []).map(escapeSafeHtml).join(', ')}</div>
        <div>Rev: ${escapeSafeHtml(meta.version_date)} (${escapeSafeHtml(meta.last_reviewed_iso)})</div>
      </div>
    `
    : '';

  return `
    <div class="space-y-3 text-xs">
      <!-- Header -->
      <div class="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 space-y-1">
        ${brandHeader}
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="text-sm sm:text-base font-extrabold text-white">${escapeSafeHtml(mono.genericTr)}</h4>
          <span class="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full">⚡ %100 Çevrimdışı Klinik Monograf</span>
        </div>
        <div class="text-[11px] text-cyan-300 font-medium">${escapeSafeHtml(mono.drugClass)}</div>
        <div class="text-[10px] text-slate-400 font-mono">ATC: ${atcList || '-'} | Örnek Müstahzarlar: ${brandsList || '-'}</div>
      </div>

      ${blackBoxHTML}

      ${formulationsHTML}

      <!-- Indications -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
        <div class="text-[10px] uppercase tracking-wider font-bold text-sky-400 mb-0.5">🎯 Temel Endikasyonlar</div>
        <div class="text-slate-200 leading-relaxed">${escapeSafeHtml(mono.indications)}</div>
      </div>

      <!-- Adult & Pediatric Dosing -->
      ${adultDosingStruct && pedDosing.length > 0 ? `
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
          <div class="text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-0.5">👤 Erişkin Dozu</div>
          <div class="text-slate-200 leading-relaxed font-mono text-[11px]">${escapeSafeHtml(mono.adultDose)}</div>
        </div>
      ` : ''}

      ${structuredDosingHTML}

      <!-- Max Daily Dose -->
      <div class="bg-amber-950/30 border border-amber-700/50 rounded-lg p-2.5">
        <div class="text-[10px] uppercase tracking-wider font-bold text-amber-300 mb-0.5">🛑 Maksimum Günlük Doz Sınırı (Cap)</div>
        <div class="text-amber-100 font-mono text-[11px] leading-relaxed">${escapeSafeHtml(mono.maxDailyDose)}</div>
      </div>

      <!-- Organ Impairment (Renal / Hepatic) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
          <div class="text-[10px] uppercase tracking-wider font-bold text-cyan-400 mb-0.5">🫘 Renal Doz Uyarlaması (eGFR)</div>
          <div class="text-slate-200 leading-relaxed text-[11px]">${escapeSafeHtml(mono.renalAdjustment)}</div>
        </div>
        <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
          <div class="text-[10px] uppercase tracking-wider font-bold text-purple-400 mb-0.5">🧪 Karaciğer Yetmezliği</div>
          <div class="text-slate-200 leading-relaxed text-[11px]">${escapeSafeHtml(mono.hepaticAdjustment)}</div>
        </div>
      </div>

      ${reproductiveHTML}

      ${neonatalHTML}

      ${interactionsHTML}

      <!-- Contraindications -->
      <div class="bg-rose-950/35 border border-rose-700/60 rounded-lg p-2.5">
        <div class="text-[10px] uppercase tracking-wider font-bold text-rose-300 mb-0.5">⛔ Kontrendikasyonlar ve Kritik Uyarılar</div>
        <div class="text-rose-100 leading-relaxed text-[11px]">${escapeSafeHtml(mono.contraindications)}</div>
      </div>

      <!-- Clinical Pearls -->
      <div class="bg-sky-950/30 border border-sky-800/60 rounded-lg p-2.5">
        <div class="text-[10px] uppercase tracking-wider font-bold text-sky-300 mb-0.5">💡 Klinik Uygulama Notu (Acil / Poliklinik)</div>
        <div class="text-sky-100 leading-relaxed text-[11px]">${escapeSafeHtml(mono.clinicalPearls)}</div>
      </div>

      ${metaHTML}
    </div>
  `;
}
