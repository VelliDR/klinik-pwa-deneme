import { normalizeText, ensureDrugCatalogReady, getDrugCatalogIndex, type NormalizedDrugRecord } from './db/titckIndexedDB';

export interface DrugStrengthResult {
  type: 'liquid' | 'solid';
  mgPerMl?: number;
  totalMg?: number;
  label: string;
}

export interface DrugInputForEquivalents {
  id: string | number;
  atcCode?: string;
  atc?: string;
  generic?: string;
  [key: string]: unknown;
}

export interface DrugForBadges {
  prescriptionType?: string;
  rx?: string;
  status?: string;
  sheet?: string;
  isEssential?: number | boolean;
  essential?: number | boolean;
  isChildEssential?: number | boolean;
  child?: number | boolean;
  isNeonateEssential?: number | boolean;
  neonate?: number | boolean;
  brand?: string;
  generic?: string;
  form?: string;
  kt_pdf_prospektus_url?: string;
  kt?: string;
  kub_pdf_url?: string;
  kub?: string;
  [key: string]: unknown;
}

/**
 * 1. REGEX İLE DOZ VE KONSANTRASYON PARSER'I
 */
export function parseDrugStrength(brandName?: string): DrugStrengthResult | null {
  if (!brandName) return null;

  // 1. Kombinasyon Sıvı Formlar (Örn: "400/57 MG/5 ML" veya "200/28 MG/ML") - Birincil etken madde baz alınır
  const comboLiquidMatch = brandName.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*mg\s*\/\s*(\d+(?:[.,]\d+)?)?\s*ml/i);
  if (comboLiquidMatch) {
    const primaryMg = parseFloat(comboLiquidMatch[1].replace(',', '.'));
    const secondaryMg = parseFloat(comboLiquidMatch[2].replace(',', '.'));
    const ml = comboLiquidMatch[3] ? parseFloat(comboLiquidMatch[3].replace(',', '.')) : 1;
    if (ml > 0) {
      const concentration = primaryMg / ml;
      return {
        type: 'liquid',
        mgPerMl: concentration,
        label: `${primaryMg}/${secondaryMg} mg / ${ml} ml (${concentration.toFixed(1)} mg/ml)`
      };
    }
  }

  // 2. Standart Sıvı Formlar (Örn: "120 MG/5 ML" veya "10 MG/ML")
  const liquidMatch = brandName.match(/(\d+(?:[.,]\d+)?)\s*mg\s*\/\s*(\d+(?:[.,]\d+)?)?\s*ml/i);
  if (liquidMatch) {
    const mg = parseFloat(liquidMatch[1].replace(',', '.'));
    const ml = liquidMatch[2] ? parseFloat(liquidMatch[2].replace(',', '.')) : 1;
    if (ml > 0) {
      const concentration = mg / ml;
      return {
        type: 'liquid',
        mgPerMl: concentration,
        label: `${mg} mg / ${ml} ml (${concentration.toFixed(1)} mg/ml)`
      };
    }
  }

  // 3. Kombinasyon Katı Formlar (Örn: "400/57 MG", "160/12.5 MG")
  const comboSolidMatch = brandName.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*mg\b/i);
  if (comboSolidMatch) {
    const primaryMg = parseFloat(comboSolidMatch[1].replace(',', '.'));
    const secondaryMg = parseFloat(comboSolidMatch[2].replace(',', '.'));
    return {
      type: 'solid',
      totalMg: primaryMg,
      label: `${primaryMg}/${secondaryMg} mg / birim`
    };
  }

  // 4. Standart Katı Formlar (Örn: "500 MG")
  const solidMatch = brandName.match(/(\d+(?:[.,]\d+)?)\s*mg\b/i);
  if (solidMatch) {
    const mg = parseFloat(solidMatch[1].replace(',', '.'));
    return {
      type: 'solid',
      totalMg: mg,
      label: `${mg} mg / birim`
    };
  }

  return null;
}

/**
 * 2. EŞDEĞER / MUADİL İLAÇ BULUCU (ATC Kodu + Etken Madde Hibrit Taraması)
 */
export async function findEquivalents(selectedDrug?: DrugInputForEquivalents): Promise<NormalizedDrugRecord[]> {
  if (!selectedDrug) return [];

  const rawAtc = String(selectedDrug.atcCode || selectedDrug.atc || '').trim().toUpperCase();
  const targetAtc = (rawAtc && rawAtc !== 'BELİRTİLMEDİ' && rawAtc !== 'BELIRTILMEDI') ? rawAtc : '';
  const targetGeneric = selectedDrug.generic ? normalizeText(selectedDrug.generic) : '';
  const currentId = String(selectedDrug.id);

  // Hem ATC Kodu hem Etken Madde eksikse muadil aranamaz
  if (!targetAtc && (!targetGeneric || targetGeneric === 'belirtilmedi')) {
    return [];
  }

  try {
    const allDrugs = await ensureDrugCatalogReady();
    if (!allDrugs || allDrugs.length === 0) return [];

    const catalogIndex = getDrugCatalogIndex();
    if (catalogIndex) {
      const candidateSet = new Set<number>();
      if (targetAtc) {
        const atcMatches = catalogIndex.byAtc.get(targetAtc);
        if (atcMatches) {
          for (let i = 0; i < atcMatches.length; i++) candidateSet.add(atcMatches[i]);
        }
      }
      if (targetGeneric && targetGeneric !== 'belirtilmedi') {
        const genMatches = catalogIndex.byGenericExact.get(targetGeneric);
        if (genMatches) {
          for (let i = 0; i < genMatches.length; i++) candidateSet.add(genMatches[i]);
        }
      }

      const results: NormalizedDrugRecord[] = [];
      candidateSet.forEach(idx => {
        const d = allDrugs[idx];
        if (!d || String(d.id) === currentId) return;
        if ((d.status && d.status.toLowerCase().includes('pasif')) || (d.sheet && d.sheet.toUpperCase().includes('PASİF'))) return;
        results.push(d);
      });
      return results;
    }

    return allDrugs.filter(d => {
      // 1. Kendisini listeden çıkar
      if (String(d.id) === currentId) return false;

      // 2. Pasif/İptal ürünleri çıkar
      if ((d.status && d.status.toLowerCase().includes('pasif')) || (d.sheet && d.sheet.toUpperCase().includes('PASİF'))) return false;

      const dAtc = d.atcCode ? String(d.atcCode).trim().toUpperCase() : '';
      const dGeneric = d._genericNorm || (d.generic ? normalizeText(d.generic) : '');

      // Kriter A: 5. seviye (7 karakterli) tam ATC Kodu birebir eşleşiyorsa
      if (targetAtc && dAtc && targetAtc === dAtc) {
        return true;
      }

      // Kriter B: Etken Madde (Generic) adı birebir eşleşiyorsa (kombinasyon ilaçlarla tekli ilaçların karışmasını önler)
      if (targetGeneric && targetGeneric !== 'belirtilmedi' && dGeneric && dGeneric !== 'belirtilmedi') {
        if (dGeneric === targetGeneric) {
          return true;
        }
      }

      return false;
    });
  } catch (err) {
    console.error("Muadil arama hatası:", err);
    return [];
  }
}

/**
 * 3. TEMEL İLAÇ VE ROZET ÜRETİCİ
 */
export function getDrugBadgesHTML(drug: DrugForBadges): string {
  const badges: string[] = [];

  // Reçete Türü Rozeti
  const rx = (drug.prescriptionType || drug.rx || '').trim();
  if (rx === 'Kırmızı') {
    badges.push('<span class="bg-red-950 text-red-300 border border-red-700 px-1.5 py-0.5 rounded text-[10px]">🔴 Kırmızı Reçete</span>');
  } else if (rx === 'Yeşil') {
    badges.push('<span class="bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded text-[10px]">🟢 Yeşil Reçete</span>');
  } else if (rx === 'Mor' || rx === 'Turuncu') {
    badges.push('<span class="bg-purple-950 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded text-[10px]">🟣 Özellikli Reçete</span>');
  }

  // Pasif / İptal Kontrolü
  const isPassive = (drug.status && drug.status.toLowerCase().includes('pasif')) || (drug.sheet && drug.sheet.toUpperCase().includes('PASİF'));
  if (isPassive) {
    badges.push('<span class="bg-amber-950 text-amber-300 border border-amber-600 px-1.5 py-0.5 rounded text-[10px]">⚠️ Pasif / İptal</span>');
  }

  // Temel İlaç Rozeti
  const isEssential = Number(drug.isEssential) === 1 || Number(drug.essential) === 1;
  if (isEssential) {
    badges.push('<span class="bg-indigo-950 text-indigo-300 border border-indigo-700 px-1.5 py-0.5 rounded text-[10px]">⭐ Temel İlaç</span>');
  }

  // Çocuk / Yenidoğan Temel İlaç Rozetleri & Formülasyon Tespiti
  const isChildFlag = Number(drug.isChildEssential) === 1 || Number(drug.child) === 1 || drug.isChildEssential === true;
  const isNeonateFlag = Number(drug.isNeonateEssential) === 1 || Number(drug.neonate) === 1 || drug.isNeonateEssential === true;

  const textSearch = ((drug.brand || '') + ' ' + (drug.generic || '') + ' ' + (drug.form || '')).toLowerCase();
  const isPediatricForm = textSearch.includes('pediatrik') || textSearch.includes('çocuk') || textSearch.includes('şurup') || textSearch.includes('süspansiyon') || textSearch.includes('damla') || textSearch.includes('pediatric');

  if (isChildFlag || isPediatricForm) {
    badges.push('<span class="bg-blue-950 text-blue-300 border border-blue-700 px-1.5 py-0.5 rounded text-[10px]">👶 Pediatrik</span>');
  }
  if (isNeonateFlag) {
    badges.push('<span class="bg-teal-950 text-teal-300 border border-teal-700 px-1.5 py-0.5 rounded text-[10px]">🍼 Yenidoğan</span>');
  }

  // Prospektüs / KÜB Belge Rozeti (Doğrudan TİTCK PDF'i olanlar)
  const hasKt = Boolean(drug.kt_pdf_prospektus_url || drug.kt);
  const hasKub = Boolean(drug.kub_pdf_url || drug.kub);
  if (hasKt || hasKub) {
    badges.push('<span class="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-1.5 py-0.5 rounded text-[10px] font-medium" title="Resmi TİTCK PDF Belgesi Doğrudan Mevcut">📑 Resmi PDF (KÜB/KT)</span>');
  }

  return badges.join(' ');
}
