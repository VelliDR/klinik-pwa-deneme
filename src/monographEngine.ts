/**
 * ÇEVRİMDIŞI KLİNİK İLAÇ MONOGRAF MOTORU (OFFLINE CLINICAL MONOGRAPH ENGINE)
 *
 * Hastane bodrum katları, sarı/kırmızı alanlar ve internetin çekmediği nöbet
 * ortamlarında TİTCK harici PDF bağlantıları açılamadığında en sık kullanılan
 * 125 kritik etken madde için %100 çevrimdışı doz, renal/hepatik uyarlama,
 * gebelik/emzirme güvenliği ve kontrendikasyon özeti sunar.
 */

import { normalizeText } from './db/titckIndexedDB';

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

export function renderMonographCardHTML(mono: ClinicalMonograph, selectedBrand?: string): string {
  const brandHeader = selectedBrand
    ? `<div class="text-[11px] text-emerald-300 font-semibold mb-0.5">💊 Seçili Müstahzar: ${escapeSafeHtml(selectedBrand)}</div>`
    : '';
  const brandsList = (mono.brandExamples || []).map(escapeSafeHtml).join(', ');
  const atcList = (mono.atcCodes || []).map(escapeSafeHtml).join(', ');

  return `
    <div class="space-y-3 text-xs">
      <div class="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 space-y-1">
        ${brandHeader}
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="text-sm sm:text-base font-extrabold text-white">${escapeSafeHtml(mono.genericTr)}</h4>
          <span class="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full">⚡ %100 Çevrimdışı Klinik Monograf</span>
        </div>
        <div class="text-[11px] text-cyan-300 font-medium">${escapeSafeHtml(mono.drugClass)}</div>
        <div class="text-[10px] text-slate-400 font-mono">ATC: ${atcList || '-'} | Örnek Müstahzarlar: ${brandsList || '-'}</div>
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
        <div class="text-[10px] uppercase tracking-wider font-bold text-sky-400 mb-0.5">🎯 Temel Endikasyonlar</div>
        <div class="text-slate-200 leading-relaxed">${escapeSafeHtml(mono.indications)}</div>
      </div>

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

      <div class="bg-amber-950/30 border border-amber-700/50 rounded-lg p-2.5">
        <div class="text-[10px] uppercase tracking-wider font-bold text-amber-300 mb-0.5">🛑 Maksimum Günlük Doz Sınırı</div>
        <div class="text-amber-100 font-mono text-[11px] leading-relaxed">${escapeSafeHtml(mono.maxDailyDose)}</div>
      </div>

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

      <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
        <div class="text-[10px] uppercase tracking-wider font-bold text-pink-400 mb-0.5">🤰 Gebelik ve Emzirme Güvenliği</div>
        <div class="text-slate-200 leading-relaxed text-[11px]">${escapeSafeHtml(mono.pregnancyLactation)}</div>
      </div>

      <div class="bg-rose-950/35 border border-rose-700/60 rounded-lg p-2.5">
        <div class="text-[10px] uppercase tracking-wider font-bold text-rose-300 mb-0.5">⛔ Kontrendikasyonlar ve Kritik Uyarılar</div>
        <div class="text-rose-100 leading-relaxed text-[11px]">${escapeSafeHtml(mono.contraindications)}</div>
      </div>

      <div class="bg-sky-950/30 border border-sky-800/60 rounded-lg p-2.5">
        <div class="text-[10px] uppercase tracking-wider font-bold text-sky-300 mb-0.5">💡 Klinik Uygulama Notu (Acil / Poliklinik)</div>
        <div class="text-sky-100 leading-relaxed text-[11px]">${escapeSafeHtml(mono.clinicalPearls)}</div>
      </div>
    </div>
  `;
}
