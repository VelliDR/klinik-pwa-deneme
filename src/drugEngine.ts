import { normalizeText, ensureDrugCatalogReady, getDrugCatalogIndex, type NormalizedDrugRecord } from './db/titckIndexedDB';
import { resolveToRxNormConcept } from './engines/rxNormMappingEngine';

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
  esdegerGroup?: string;
  eg?: string;
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
  sgkReimbursed?: number | boolean;
  sg?: number | boolean;
  pregnancyCategory?: string;
  pr?: string;
  isColdChain?: boolean | number;
  cz?: boolean | number;
  esdegerGroup?: string;
  eg?: string;
  sgkDiscount?: string;
  di?: string;
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
 * 2. EŞDEĞER / MUADİL İLAÇ BULUCU (SGK Eşdeğer Grubu + ATC Kodu + Etken Madde Kademeli Taraması)
 */
export async function findEquivalents(selectedDrug?: DrugInputForEquivalents): Promise<NormalizedDrugRecord[]> {
  if (!selectedDrug) return [];

  const rawAtc = String(selectedDrug.atcCode || selectedDrug.atc || '').trim().toUpperCase();
  const targetAtc = (rawAtc && rawAtc !== 'BELİRTİLMEDİ' && rawAtc !== 'BELIRTILMEDI') ? rawAtc : '';
  const targetGeneric = selectedDrug.generic ? normalizeText(selectedDrug.generic) : '';
  const rawEg = String(selectedDrug.esdegerGroup || selectedDrug.eg || '').trim().toUpperCase();
  const currentId = String(selectedDrug.id);

  // SGK Eşdeğer Grubu, ATC Kodu veya Etken Madde mevcut olmalıdır
  if (!rawEg && !targetAtc && (!targetGeneric || targetGeneric === 'belirtilmedi')) {
    return [];
  }

  try {
    const allDrugs = await ensureDrugCatalogReady();
    if (!allDrugs || allDrugs.length === 0) return [];

    const catalogIndex = getDrugCatalogIndex();
    if (catalogIndex) {
      const tier1Indices = new Set<number>();
      const tier2Indices = new Set<number>();
      const tier3Indices = new Set<number>();

      // Kademe 1: Resmi SGK Eşdeğer Grubu (Altın Standart SUT İkamesi)
      if (rawEg) {
        const esdegerMatches = catalogIndex.byEsdeger.get(rawEg);
        if (esdegerMatches) {
          for (let i = 0; i < esdegerMatches.length; i++) {
            tier1Indices.add(esdegerMatches[i]);
          }
        }
      }

      // Kademe 2: ATC 5. Seviye (7 karakter) veya Tam Etken Madde Eşleşmesi
      if (targetAtc) {
        const atcMatches = catalogIndex.byAtc.get(targetAtc);
        if (atcMatches) {
          for (let i = 0; i < atcMatches.length; i++) {
            const idx = atcMatches[i];
            if (!tier1Indices.has(idx)) tier2Indices.add(idx);
          }
        }
      }
      if (targetGeneric && targetGeneric !== 'belirtilmedi') {
        const genMatches = catalogIndex.byGenericExact.get(targetGeneric);
        if (genMatches) {
          for (let i = 0; i < genMatches.length; i++) {
            const idx = genMatches[i];
            if (!tier1Indices.has(idx)) tier2Indices.add(idx);
          }
        }
      }

      // Kademe 3: Terapötik Alternatifler (ATC Seviye 4 - İlk 5 karakter, örn: A02BC, C09AA, N02BE)
      const atcPrefix5 = targetAtc && targetAtc.length >= 5 ? targetAtc.substring(0, 5) : '';
      if (atcPrefix5) {
        for (const [atcCode, indices] of catalogIndex.byAtc.entries()) {
          if (atcCode.startsWith(atcPrefix5) && atcCode !== targetAtc) {
            for (let i = 0; i < indices.length; i++) {
              const idx = indices[i];
              if (!tier1Indices.has(idx) && !tier2Indices.has(idx)) {
                tier3Indices.add(idx);
              }
            }
          }
        }
      }

      const results: NormalizedDrugRecord[] = [];

      const processCandidate = (idx: number, tier: 1 | 2 | 3, reason: string) => {
        const d = allDrugs[idx];
        if (!d || String(d.id) === currentId) return;
        if ((d.status && d.status.toLowerCase().includes('pasif')) || (d.sheet && d.sheet.toUpperCase().includes('PASİF'))) return;
        
        results.push({
          ...d,
          matchTier: tier,
          matchReason: reason
        });
      };

      tier1Indices.forEach(idx => processCandidate(idx, 1, `SGK Eşdeğer Grubu: ${rawEg} (Resmi SUT İkamesi)`));
      tier2Indices.forEach(idx => processCandidate(idx, 2, `Klinik Biyoeşdeğer (ATC: ${targetAtc || 'Aynı Etken Madde'})`));
      tier3Indices.forEach(idx => processCandidate(idx, 3, `Terapötik Alternatif (${atcPrefix5} Sınıfı)`));

      // Sıralama Algoritması:
      // 1. matchTier (Tier 1 < Tier 2 < Tier 3)
      // 2. SGK Ödeme Durumu (Ödenenler önce)
      // 3. Alfabetik Marka Adı
      results.sort((a, b) => {
        const tierA = a.matchTier || 2;
        const tierB = b.matchTier || 2;
        if (tierA !== tierB) return tierA - tierB;

        const sgkA = a.sgkReimbursed === 1 ? 1 : 0;
        const sgkB = b.sgkReimbursed === 1 ? 1 : 0;
        if (sgkA !== sgkB) return sgkB - sgkA;

        return a.brand.localeCompare(b.brand, 'tr');
      });

      return results;
    }

    // Fallback: Index hazır değilse doğrusal tarama
    return allDrugs
      .filter(d => {
        if (String(d.id) === currentId) return false;
        if ((d.status && d.status.toLowerCase().includes('pasif')) || (d.sheet && d.sheet.toUpperCase().includes('PASİF'))) return false;

        const dEg = d.esdegerGroup ? String(d.esdegerGroup).trim().toUpperCase() : '';
        const dAtc = d.atcCode ? String(d.atcCode).trim().toUpperCase() : '';
        const dGeneric = d._genericNorm || (d.generic ? normalizeText(d.generic) : '');

        if (rawEg && dEg && rawEg === dEg) return true;
        if (targetAtc && dAtc && targetAtc === dAtc) return true;
        if (targetGeneric && targetGeneric !== 'belirtilmedi' && dGeneric && dGeneric === targetGeneric) return true;
        return false;
      })
      .map(d => {
        const dEg = d.esdegerGroup ? String(d.esdegerGroup).trim().toUpperCase() : '';
        const isTier1 = Boolean(rawEg && dEg && rawEg === dEg);
        return {
          ...d,
          matchTier: isTier1 ? (1 as const) : (2 as const),
          matchReason: isTier1 ? `SGK Eşdeğer Grubu: ${rawEg} (Resmi SUT İkamesi)` : `Klinik Eşdeğer`
        };
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

  // 1. Reçete Türü Rozeti
  const rx = (drug.prescriptionType || drug.rx || '').trim();
  if (rx === 'Kırmızı') {
    badges.push('<span class="bg-red-950 text-red-300 border border-red-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Kırmızı Reçete</span>');
  } else if (rx === 'Yeşil') {
    badges.push('<span class="bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Yeşil Reçete</span>');
  } else if (rx === 'Mor') {
    badges.push('<span class="bg-purple-950 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Mor Reçete</span>');
  } else if (rx === 'Turuncu') {
    badges.push('<span class="bg-orange-950 text-orange-300 border border-orange-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Turuncu Reçete</span>');
  }

  // 2. SGK Geri Ödeme Rozeti
  const isSgk = drug.sgkReimbursed === 1 || drug.sg === 1 || drug.sgkReimbursed === true;
  const isNotSgk = drug.sgkReimbursed === 0 || drug.sg === 0;
  if (isSgk) {
    badges.push('<span class="bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 px-1.5 py-0.5 rounded text-[10px] font-medium" title="SGK Sağlık Uygulama Tebliği (SUT) Kapsamında Karşılanıyor">SGK Ödüyor</span>');
  } else if (isNotSgk) {
    badges.push('<span class="bg-amber-950/80 text-amber-300 border border-amber-700/70 px-1.5 py-0.5 rounded text-[10px]" title="SGK Kapsam Dışı (Hastaya Cepten Maliyet Uyarısı)">SGK Kapsam Dışı</span>');
  }

  // 3. Gebelik Güvenlik Kategorisi Rozeti (FDA PLLR & TİTCK KÜB)
  const preg = String(drug.pregnancyCategory || drug.pr || '').trim().toUpperCase();
  if (preg === 'A') {
    badges.push('<span class="bg-teal-950 text-teal-300 border border-teal-700 px-1.5 py-0.5 rounded text-[10px]" title="FDA PLLR: Düşük Fetal Risk / Kontrollü klinik verilerde risk kanıtı yok (TİTCK KÜB: A)">Gebelik: A (PLLR: Uyumlu)</span>');
  } else if (preg === 'B') {
    badges.push('<span class="bg-blue-950 text-blue-300 border border-blue-700 px-1.5 py-0.5 rounded text-[10px]" title="FDA PLLR: Fetal Risk Düşük / Hayvan çalışmalarında risk yok (TİTCK KÜB: B)">Gebelik: B (PLLR: Düşük Risk)</span>');
  } else if (preg === 'C') {
    badges.push('<span class="bg-yellow-950 text-yellow-300 border border-yellow-700 px-1.5 py-0.5 rounded text-[10px]" title="FDA PLLR: Risk Dışlanamaz / Yalnızca potansiyel yarar riskten fazlaysa kullanılmalıdır (TİTCK KÜB: C)">Gebelik: C (PLLR: Dikkat)</span>');
  } else if (preg === 'D') {
    badges.push('<span class="bg-orange-950 text-orange-300 border border-orange-700 px-1.5 py-0.5 rounded text-[10px] font-medium" title="FDA PLLR: Kanıtlanmış Fetal Risk (TİTCK KÜB: D)">Gebelik: D (PLLR: Yüksek Risk)</span>');
  } else if (preg === 'X') {
    badges.push('<span class="bg-rose-950 text-rose-200 border border-rose-600 px-1.5 py-0.5 rounded text-[10px] font-bold" title="FDA PLLR: Kesin Fetal Zarar / Majör Teratojen / KESİNLİKLE KONTRENDİKE (TİTCK KÜB: X)">Gebelik: X (Kontrendike) [PLLR]</span>');
  }

  // 4. Soğuk Zincir Rozeti (2-8°C)
  const isCold = drug.isColdChain === true || drug.isColdChain === 1 || drug.cz === 1 || drug.cz === true;
  if (isCold) {
    badges.push('<span class="bg-sky-950 text-sky-300 border border-sky-600 px-1.5 py-0.5 rounded text-[10px] font-medium" title="2-8°C Soğuk Zincir Dolabında Saklayınız">2-8°C Soğuk Zincir</span>');
  }

  // 5. SGK Eşdeğer Grubu Rozeti
  const eg = String(drug.esdegerGroup || drug.eg || '').trim().toUpperCase();
  if (eg) {
    badges.push(`<span class="bg-slate-800 text-cyan-300 border border-slate-600 hover:border-cyan-500 px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors badge-esdeger-tag" data-esdeger="${eg}" title="SGK Eşdeğer Grubu: ${eg} (Gruptaki tüm resmi muadilleri listelemek için tıklayın)">E-Kodu: ${eg}</span>`);
  }

  // 6. Pasif / İptal Kontrolü
  const isPassive = (drug.status && drug.status.toLowerCase().includes('pasif')) || (drug.sheet && drug.sheet.toUpperCase().includes('PASİF'));
  if (isPassive) {
    badges.push('<span class="bg-amber-950 text-amber-300 border border-amber-600 px-1.5 py-0.5 rounded text-[10px]">Pasif / İptal</span>');
  }

  // 7. Temel İlaç Rozeti
  const isEssential = Number(drug.isEssential) === 1 || Number(drug.essential) === 1;
  if (isEssential) {
    badges.push('<span class="bg-indigo-950 text-indigo-300 border border-indigo-700 px-1.5 py-0.5 rounded text-[10px]">Temel İlaç</span>');
  }

  // 8. Çocuk / Yenidoğan Temel İlaç Rozetleri & Formülasyon Tespiti
  const isChildFlag = Number(drug.isChildEssential) === 1 || Number(drug.child) === 1 || drug.isChildEssential === true;
  const isNeonateFlag = Number(drug.isNeonateEssential) === 1 || Number(drug.neonate) === 1 || drug.isNeonateEssential === true;

  const textSearch = ((drug.brand || '') + ' ' + (drug.generic || '') + ' ' + (drug.form || '')).toLowerCase();
  const isPediatricForm = textSearch.includes('pediatrik') || textSearch.includes('çocuk') || textSearch.includes('şurup') || textSearch.includes('süspansiyon') || textSearch.includes('damla') || textSearch.includes('pediatric');

  if (isChildFlag || isPediatricForm) {
    badges.push('<span class="bg-blue-950 text-blue-300 border border-blue-700 px-1.5 py-0.5 rounded text-[10px]">Pediatrik</span>');
  }
  if (isNeonateFlag) {
    badges.push('<span class="bg-teal-950 text-teal-300 border border-teal-700 px-1.5 py-0.5 rounded text-[10px]">Yenidoğan</span>');
  }

  // 9. Prospektüs / KÜB Belge Rozeti (Doğrudan TİTCK PDF'i olanlar)
  const hasKt = Boolean(drug.kt_pdf_prospektus_url || drug.kt);
  const hasKub = Boolean(drug.kub_pdf_url || drug.kub);
  if (hasKt || hasKub) {
    badges.push('<span class="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-1.5 py-0.5 rounded text-[10px] font-medium" title="Resmi TİTCK PDF Belgesi Doğrudan Mevcut">Resmi PDF (KÜB/KT)</span>');
  }

  // 10. Çevrimdışı RxNorm CUI Rozeti
  const rxNormBadge = getDrugRxNormBadge(drug);
  if (rxNormBadge) {
    badges.push(rxNormBadge);
  }

  return badges.join(' ');
}

/**
 * 4. ÇEVRİMDİŞI RXNORM CUI ROZET OLUŞTURUCU
 * TİTCK ilacını standart RxNorm CUI ontolojisi ile eşleştirip rozet üretir.
 */
export function getDrugRxNormBadge(drug: DrugForBadges): string {
  if (!drug) return '';
  const brand = drug.brand || '';
  const generic = drug.generic || '';
  const atc = String((drug as any).atcCode || (drug as any).atc || (drug as any).a || '');
  const resolved = resolveToRxNormConcept({ brand, generic, atcCode: atc });
  if (resolved) {
    return `<span class="bg-violet-950 text-violet-300 border border-violet-700 px-1.5 py-0.5 rounded text-[10px] font-mono" title="RxNorm CUI: ${resolved.rxCui} (${resolved.displayNameEn})">RxCUI: ${resolved.rxCui}</span>`;
  }
  return '';
}

