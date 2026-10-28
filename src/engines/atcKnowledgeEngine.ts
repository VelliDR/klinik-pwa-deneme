/**
 * TİTCK & DSÖ ATC DETAYLI FARMAKOLOJİK BİLGİ TABANI MOTORU (TypeScript)
 * 
 * 18.212 TİTCK ilacı için 14 Anatomik Sistem, 89 Terapötik Grup, Farmakolojik Sınıflar,
 * Hücresel Etki Mekanizmaları, Kara Kutu Uyarıları, Besin/Alkol Etkileşimleri,
 * Farmakokinetik (Yarı Ömür & Eliminasyon), WHO DDD ve ATC Çapraz Etkileşim Kurallarını
 * bellek içi O(1) hash haritalarıyla sağlar.
 */

import type {
  AtcSystemInfo,
  AtcGroupInfo,
  AtcPharmacologyProfile,
  AtcCompactEntry,
  AtcInteractionRule,
  AtcInteractionMatch,
  AtcKnowledgeBaseData
} from '../types/clinical';

let cachedKnowledgeBase: AtcKnowledgeBaseData | null = null;
let kbLoadingPromise: Promise<AtcKnowledgeBaseData | null> | null = null;

// Hızlı arama için önek haritası (3 haneli terapötik ve 4 haneli kimyasal gruplar)
const groupPrefixMap = new Map<string, AtcGroupInfo>();
const systemCodeMap = new Map<string, AtcSystemInfo>();

/**
 * ATC Bilgi Tabanının bellekte hazır olup olmadığını bildirir
 */
export function isAtcKnowledgeReady(): boolean {
  return cachedKnowledgeBase !== null;
}

/**
 * Doğrudan veri yükleme (Testler veya senkron başlatıcılar için)
 */
export function setAtcKnowledgeCache(data: AtcKnowledgeBaseData): void {
  cachedKnowledgeBase = data;
  systemCodeMap.clear();
  groupPrefixMap.clear();

  if (data.systems) {
    for (const [code, sys] of Object.entries(data.systems)) {
      systemCodeMap.set(code.toUpperCase(), sys);
    }
  }

  if (data.groups) {
    for (const [code, grp] of Object.entries(data.groups)) {
      groupPrefixMap.set(code.toUpperCase(), grp);
    }
  }
}

/**
 * ATC Bilgi Tabanını yükler (PWA önbelleği, yerel dosya veya Node.js fs)
 */
export async function ensureAtcKnowledgeBaseReady(): Promise<AtcKnowledgeBaseData | null> {
  if (cachedKnowledgeBase) {
    return cachedKnowledgeBase;
  }
  if (kbLoadingPromise) {
    return kbLoadingPromise;
  }

  kbLoadingPromise = (async () => {
    // 1. Tarayıcı Ortamı (Fetch API)
    if (typeof fetch !== 'undefined') {
      const candidatePaths = [
        './data/atc_knowledge_base.json',
        '/data/atc_knowledge_base.json',
        'data/atc_knowledge_base.json'
      ];

      for (const p of candidatePaths) {
        try {
          const res = await fetch(p);
          if (res && res.ok) {
            const data: AtcKnowledgeBaseData = await res.json();
            setAtcKnowledgeCache(data);
            return data;
          }
        } catch {
          // Sonraki dosya yolunu dene
        }
      }
    }

    // 2. Node.js / Test Ortamı (fs)
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const candidateFsPaths = [
          path.join(process.cwd(), 'public', 'data', 'atc_knowledge_base.json'),
          path.join(process.cwd(), 'dist', 'data', 'atc_knowledge_base.json')
        ];

        for (const fp of candidateFsPaths) {
          if (fs.existsSync(fp)) {
            const content = fs.readFileSync(fp, 'utf8');
            const data: AtcKnowledgeBaseData = JSON.parse(content);
            setAtcKnowledgeCache(data);
            return data;
          }
        }
      } catch (err) {
        console.warn('[ATC KB] Node.js fs yükleme hatası:', err);
      }
    }

    return null;
  })();

  try {
    return await kbLoadingPromise;
  } finally {
    kbLoadingPromise = null;
  }
}

/**
 * Sözlük indeksinden metni çözer
 */
function resolveString(idx: number | undefined, strings: string[]): string | undefined {
  if (idx === undefined || idx === null || idx < 0 || idx >= strings.length) {
    return undefined;
  }
  const val = strings[idx];
  return val && val.trim() ? val : undefined;
}

/**
 * Verilen ATC koduna göre anatomik sistem bilgisini döner
 */
export function getAtcSystem(codeOrAtc?: string): AtcSystemInfo | null {
  if (!codeOrAtc) return null;
  const sysCode = codeOrAtc.trim().charAt(0).toUpperCase();
  return systemCodeMap.get(sysCode) || null;
}

/**
 * Tüm 14 Anatomik Sistemi döner (Arama filtre çiplerinde kullanım için)
 */
export function getAllAtcSystems(): AtcSystemInfo[] {
  return Array.from(systemCodeMap.values()).sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Verilen ATC koduna göre terapötik grup bilgisini döner
 */
export function getAtcGroup(codeOrAtc?: string): AtcGroupInfo | null {
  if (!codeOrAtc) return null;
  const clean = codeOrAtc.trim().toUpperCase();
  const groupCode = clean.length >= 3 ? clean.slice(0, 3) : clean;
  return groupPrefixMap.get(groupCode) || null;
}

/**
 * Bir ATC kodu için kademeli (hierarchical) farmakolojik profil döner:
 * 1. Tam 7 haneli ATC kodu (Örn: C10AA07)
 * 2. 5 haneli kimyasal alt grup (Örn: C10AA)
 * 3. 4 haneli farmakolojik alt grup (Örn: C10A)
 * 4. 3 haneli terapötik grup (Örn: C10)
 * 5. 1 haneli anatomik sistem (Örn: C)
 */
export function getAtcProfile(atcCode?: string): AtcPharmacologyProfile | null {
  if (!atcCode || !cachedKnowledgeBase) return null;
  const clean = atcCode.trim().toUpperCase();
  if (!clean || clean === 'BELIRTILMEDI' || clean === 'BELİRTİLMEDİ') return null;

  const { systems, groups, strings, atcMap } = cachedKnowledgeBase;

  // Kademeli eşleşme adayları
  const lookupCandidates = [
    clean,
    clean.length >= 5 ? clean.slice(0, 5) : '',
    clean.length >= 4 ? clean.slice(0, 4) : '',
    clean.length >= 3 ? clean.slice(0, 3) : ''
  ].filter(Boolean);

  let matchEntry: AtcCompactEntry | null = null;
  for (const cand of lookupCandidates) {
    if (atcMap[cand]) {
      matchEntry = atcMap[cand];
      break;
    }
  }

  const sysCode = clean.charAt(0);
  const sysObj = systems[sysCode] || systemCodeMap.get(sysCode);
  const grpCode = clean.length >= 3 ? clean.slice(0, 3) : sysCode;
  const grpObj = groups[grpCode] || groupPrefixMap.get(grpCode);

  const sysName = sysObj ? sysObj.name : 'Bilinmeyen Anatomik Sistem';
  const sysShort = sysObj ? sysObj.shortName : sysName;
  const grpName = grpObj ? grpObj.name : 'Genel Terapötik Grup';

  if (!matchEntry) {
    // Sadece sistem ve grup düzeyinde genel profil
    return {
      atcCode: clean,
      systemCode: sysCode,
      systemName: sysName,
      systemShortName: sysShort,
      groupCode: grpCode,
      groupName: grpName
    };
  }

  return {
    atcCode: clean,
    systemCode: matchEntry.c1 || sysCode,
    systemName: sysName,
    systemShortName: sysShort,
    groupCode: matchEntry.c3 || grpCode,
    groupName: grpName,
    pharmClass: resolveString(matchEntry.cls, strings),
    mechanismOfAction: resolveString(matchEntry.moa, strings),
    blackBoxWarning: resolveString(matchEntry.bb, strings),
    foodAlcoholInteraction: resolveString(matchEntry.fa, strings),
    halfLife: resolveString(matchEntry.t12, strings),
    metabolismExcretion: resolveString(matchEntry.met, strings),
    whoDdd: resolveString(matchEntry.ddd, strings),
    interactionRiskLevel: resolveString(matchEntry.ir, strings),
    interactionText: resolveString(matchEntry.it, strings),
    interactingAtcCodes: matchEntry.itg || []
  };
}

/**
 * Reçetedeki ilaçlar arasında ATC tabanlı çapraz etkileşimleri tarar
 */
export function checkAtcInteractions(
  drugs: Array<{ brand?: string; atcCode?: string; atc?: string }>
): AtcInteractionMatch[] {
  if (!cachedKnowledgeBase || !Array.isArray(drugs) || drugs.length < 2) {
    return [];
  }

  const validDrugs = drugs.map(d => ({
    brand: d.brand || 'İlaç',
    atc: String(d.atcCode || d.atc || '').trim().toUpperCase()
  })).filter(d => d.atc.length >= 3 && d.atc !== 'BELIRTILMEDI');

  if (validDrugs.length < 2) return [];

  const matches: AtcInteractionMatch[] = [];
  const rules = cachedKnowledgeBase.interactions || [];

  for (let i = 0; i < validDrugs.length; i++) {
    for (let j = 0; j < validDrugs.length; j++) {
      if (i === j) continue;

      const drugA = validDrugs[i];
      const drugB = validDrugs[j];

      for (const rule of rules) {
        // Kaynak ATC önek kontrolü (örn: drugA ATC'si rule.src ile mi başlıyor?)
        const srcMatches = drugA.atc.startsWith(rule.src) || rule.src.startsWith(drugA.atc);
        if (!srcMatches) continue;

        // Hedef ATC önek kontrolü (örn: drugB ATC'si rule.tgt ile mi başlıyor?)
        const tgtMatches = drugB.atc.startsWith(rule.tgt) || rule.tgt.startsWith(drugB.atc);
        if (tgtMatches) {
          // Çift kayıtları engelle
          const alreadyMatched = matches.some(m => 
            (m.sourceAtc === drugA.atc && m.targetAtc === drugB.atc) ||
            (m.sourceAtc === drugB.atc && m.targetAtc === drugA.atc)
          );

          if (!alreadyMatched) {
            matches.push({
              sourceAtc: drugA.atc,
              targetAtc: drugB.atc,
              sourceDrugBrand: drugA.brand,
              targetDrugBrand: drugB.brand,
              risk: rule.risk,
              description: rule.desc
            });
          }
        }
      }
    }
  }

  return matches;
}
