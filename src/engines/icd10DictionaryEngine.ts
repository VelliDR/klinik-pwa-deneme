/**
 * TİTCK ATC <-> ICD-10 ENDİKASYON VE KONTRENDİKASYON SÖZLÜĞÜ MOTORU
 *
 * 1.794 tekil ATC kodu ve 1.798 ICD-10 tanısı arasında bellek içi O(1) arama sağlar.
 * KRİTİK KLİNİK GÜVENLİK KURALI:
 * Pozitif arama indeksine (byIcdExact, byIcdCategory, byIndicationPrefix) YALNIZCA
 * onaylı endikasyonlar (`i`) alınır; kontrendikasyonlar (`c`) yalnızca monograf/özet
 * uyarısı olarak tutulur ve endikasyon aramasında asla ilaç önerisi olarak döndürülmez.
 */

import { normalizeText } from '../utils/medicalText';
import type {
  AtcIcd10DictionaryData,
  AtcIcd10Profile,
  AtcIndicationMatch,
  Icd10DiagnosisEntry,
  Icd10DiagnosisTuple,
  IndicationMatchType
} from '../types/clinical';

const ICD10_TOKEN_RE = /^[A-Z][0-9][0-9A-Z](?:\.?[0-9A-Z]{1,2})?$/;
const PAREN_ICD10_RE = /\(([A-Z][0-9][0-9A-Z]\.[0-9A-Z]{1,2})\)/g;

let cachedDictionary: AtcIcd10DictionaryData | null = null;
let dictLoadingPromise: Promise<AtcIcd10DictionaryData | null> | null = null;

const icdCatalogMap = new Map<string, string>();
const profileMap = new Map<string, AtcIcd10Profile>();
const byIcdExact = new Map<string, Set<string>>();
const byIcdCategory = new Map<string, Set<string>>();
const byIndicationPrefix = new Map<string, Set<string>>();

function addToSetMap(map: Map<string, Set<string>>, key: string, value: string): void {
  if (!key) return;
  let set = map.get(key);
  if (!set) {
    set = new Set<string>();
    map.set(key, set);
  }
  set.add(value);
}

function buildDiagnosisEntry(tuple: Icd10DiagnosisTuple): Icd10DiagnosisEntry {
  const categoryCode = String(tuple[0] || '').trim().toUpperCase();
  const code = String(tuple[1] || '').trim().toUpperCase();
  const nameTr = String(tuple[2] || '').trim();
  const catalogNameTr = code ? icdCatalogMap.get(code) : undefined;
  const combinedSource =
    catalogNameTr && catalogNameTr.toLocaleLowerCase('tr-TR') !== nameTr.toLocaleLowerCase('tr-TR')
      ? `${nameTr} ${catalogNameTr}`
      : nameTr;
  const normText = normalizeText(combinedSource);
  const tokens = normText ? normText.split(' ').filter(Boolean) : [];

  return {
    categoryCode,
    code,
    nameTr,
    catalogNameTr,
    normText,
    tokens
  };
}

function stripTurkishInflectionSuffix(token: string): string {
  const suffixes = ['lari', 'leri', 'lar', 'ler', 'si', 'su', 'i', 'u'];
  for (const suffix of suffixes) {
    if (token.length - suffix.length >= 6 && token.endsWith(suffix)) {
      return token.slice(0, token.length - suffix.length);
    }
  }
  return token;
}

function matchesNormalizedToken(entry: Icd10DiagnosisEntry, token: string): boolean {
  if (!token) return true;
  if (entry.normText.includes(token)) return true;
  const stem = stripTurkishInflectionSuffix(token);
  return stem !== token && entry.normText.includes(stem);
}

export function isIcd10DictionaryReady(): boolean {
  return cachedDictionary !== null && profileMap.size > 0;
}

export function setIcd10DictionaryCache(data: AtcIcd10DictionaryData): void {
  cachedDictionary = data;
  icdCatalogMap.clear();
  profileMap.clear();
  byIcdExact.clear();
  byIcdCategory.clear();
  byIndicationPrefix.clear();

  if (data.icd) {
    for (const [code, desc] of Object.entries(data.icd)) {
      const cleanCode = String(code || '').trim().toUpperCase();
      if (cleanCode && desc) {
        icdCatalogMap.set(cleanCode, String(desc).trim());
      }
    }
  }

  if (!data.atc) return;

  for (const [rawAtc, rawEntry] of Object.entries(data.atc)) {
    const atcCode = String(rawAtc || '').trim().toUpperCase();
    if (!atcCode || !rawEntry) continue;

    const indications = Array.isArray(rawEntry.i)
      ? rawEntry.i.map(buildDiagnosisEntry).filter(e => Boolean(e.code || e.nameTr))
      : [];
    const contraindications = Array.isArray(rawEntry.c)
      ? rawEntry.c.map(buildDiagnosisEntry).filter(e => Boolean(e.code || e.nameTr))
      : [];

    profileMap.set(atcCode, {
      atcCode,
      activeIngredientTr: String(rawEntry.e || '').trim(),
      l1: rawEntry.l1 ? String(rawEntry.l1).trim() : undefined,
      l2: rawEntry.l2 ? String(rawEntry.l2).trim() : undefined,
      l3: rawEntry.l3 ? String(rawEntry.l3).trim() : undefined,
      l4: rawEntry.l4 ? String(rawEntry.l4).trim() : undefined,
      indications,
      contraindications,
      ddd: rawEntry.ddd ? String(rawEntry.ddd).trim() : undefined,
      t12: rawEntry.t12 ? String(rawEntry.t12).trim() : undefined,
      formula: rawEntry.frm ? String(rawEntry.frm).trim() : undefined,
      dili: rawEntry.dili ? String(rawEntry.dili).trim() : undefined,
      cyp: Array.isArray(rawEntry.cyp) ? rawEntry.cyp.filter(Boolean) : undefined,
      ddiMajorCount: typeof rawEntry.ddiM === 'number' ? rawEntry.ddiM : undefined,
      foodList: Array.isArray(rawEntry.food) ? rawEntry.food.filter(Boolean) : undefined
    });

    // Yalnızca onaylı endikasyonlar (`i`) arama indeksine eklenir; kontrendikasyonlar (`c`) ASLA eklenmez.
    for (const ind of indications) {
      if (ind.code) {
        addToSetMap(byIcdExact, ind.code, atcCode);
        const noDot = ind.code.replace(/\./g, '');
        if (noDot) addToSetMap(byIcdExact, noDot, atcCode);
      }
      if (ind.categoryCode) {
        addToSetMap(byIcdCategory, ind.categoryCode, atcCode);
      }

      PAREN_ICD10_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = PAREN_ICD10_RE.exec(ind.nameTr)) !== null) {
        const parenCode = match[1].toUpperCase();
        addToSetMap(byIcdExact, parenCode, atcCode);
        addToSetMap(byIcdExact, parenCode.replace(/\./g, ''), atcCode);
        if (parenCode.length >= 3) {
          addToSetMap(byIcdCategory, parenCode.slice(0, 3), atcCode);
        }
      }

      for (const token of ind.tokens) {
        if (token.length < 2) continue;
        const maxLen = Math.min(token.length, 6);
        for (let len = 2; len <= maxLen; len++) {
          addToSetMap(byIndicationPrefix, token.slice(0, len), atcCode);
        }
      }
    }
  }
}

export async function ensureIcd10DictionaryReady(): Promise<AtcIcd10DictionaryData | null> {
  if (isIcd10DictionaryReady() && cachedDictionary) {
    return cachedDictionary;
  }
  if (dictLoadingPromise) {
    return dictLoadingPromise;
  }

  dictLoadingPromise = (async () => {
    // 1. Tarayıcı / Web Worker (Fetch API)
    if (typeof fetch !== 'undefined') {
      const candidatePaths = [
        './data/atc_icd10_sozluk.json',
        '/data/atc_icd10_sozluk.json',
        '../data/atc_icd10_sozluk.json',
        'data/atc_icd10_sozluk.json'
      ];

      for (const candidatePath of candidatePaths) {
        try {
          const res = await fetch(candidatePath);
          if (res && res.ok) {
            const data: AtcIcd10DictionaryData = await res.json();
            setIcd10DictionaryCache(data);
            return data;
          }
        } catch {
          // Sonraki aday yolu dene
        }
      }
    }

    // 2. Node.js / Test Ortamı (fs) — dinamik modül adı Vite tarayıcı paketleyicisinin uyarısını önler
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fsMod = 'fs';
        const pathMod = 'path';
        const fs = await import(/* @vite-ignore */ fsMod);
        const path = await import(/* @vite-ignore */ pathMod);
        const candidateFsPaths = [
          path.join(process.cwd(), 'public', 'data', 'atc_icd10_sozluk.json'),
          path.join(process.cwd(), 'dist', 'data', 'atc_icd10_sozluk.json'),
          path.join(process.cwd(), 'data', 'atc_icd10_sozluk.json')
        ];

        for (const fp of candidateFsPaths) {
          if (fs.existsSync(fp)) {
            const raw = fs.readFileSync(fp, 'utf8');
            const data: AtcIcd10DictionaryData = JSON.parse(raw);
            setIcd10DictionaryCache(data);
            return data;
          }
        }
      } catch (err) {
        console.warn('[ICD-10 Sözlük] Node.js fs yükleme hatası:', err);
      }
    }

    return null;
  })();

  try {
    return await dictLoadingPromise;
  } finally {
    dictLoadingPromise = null;
  }
}

export function getAtcIcd10Profile(atcCode?: string): AtcIcd10Profile | null {
  if (!atcCode) return null;
  return profileMap.get(atcCode.trim().toUpperCase()) || null;
}

export function getIcd10Description(icdCode?: string): string | null {
  if (!icdCode) return null;
  return icdCatalogMap.get(icdCode.trim().toUpperCase()) || null;
}

function getCandidateAtcsForTokens(textTokens: string[]): Set<string> {
  const lists: Set<string>[] = [];

  for (const token of textTokens) {
    if (token.length < 2) continue;
    const prefix = token.slice(0, Math.min(token.length, 6));
    const bucket = byIndicationPrefix.get(prefix);
    if (!bucket || bucket.size === 0) {
      return new Set<string>();
    }
    lists.push(bucket);
  }

  if (lists.length === 0) {
    return new Set<string>(profileMap.keys());
  }

  lists.sort((a, b) => a.size - b.size);
  const intersected = new Set<string>();
  const smallest = lists[0];
  for (const atc of smallest) {
    if (lists.every(set => set.has(atc))) {
      intersected.add(atc);
    }
  }
  return intersected;
}

function matchesIcdToken(ind: Icd10DiagnosisEntry, icdUpper: string, icdNoDot: string): 'exact' | 'category' | null {
  const indNoDot = ind.code.replace(/\./g, '');
  if (ind.code === icdUpper || indNoDot === icdNoDot) {
    return 'exact';
  }
  if (icdUpper.length === 3 && (ind.categoryCode === icdUpper || ind.code.startsWith(`${icdUpper}.`))) {
    return 'category';
  }
  PAREN_ICD10_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PAREN_ICD10_RE.exec(ind.nameTr)) !== null) {
    const pCode = match[1].toUpperCase();
    const pNoDot = pCode.replace(/\./g, '');
    if (pCode === icdUpper || pNoDot === icdNoDot) {
      return 'exact';
    }
    if (icdUpper.length === 3 && pCode.startsWith(`${icdUpper}.`)) {
      return 'category';
    }
  }
  return null;
}

interface ParsedIndicationQuery {
  icdTokens: { upper: string; noDot: string }[];
  textTokens: string[];
  queryNormFull: string;
}

function parseIndicationQuery(rawQuery: string): ParsedIndicationQuery | null {
  const trimmed = String(rawQuery || '').trim();
  if (trimmed.length < 2) return null;

  const rawTokens = trimmed.split(/\s+/).filter(Boolean);
  const icdTokens: { upper: string; noDot: string }[] = [];
  const remainingWords: string[] = [];

  for (const rawTok of rawTokens) {
    const cleanUpper = rawTok.toUpperCase().replace(/,+$/, '');
    if (ICD10_TOKEN_RE.test(cleanUpper)) {
      icdTokens.push({ upper: cleanUpper, noDot: cleanUpper.replace(/\./g, '') });
    } else {
      remainingWords.push(rawTok);
    }
  }

  const textNorm = normalizeText(remainingWords.join(' '));
  const textTokens = textNorm ? textNorm.split(' ').filter(Boolean) : [];
  if (icdTokens.length === 0 && textTokens.length === 0) return null;

  return {
    icdTokens,
    textTokens,
    queryNormFull: normalizeText(trimmed)
  };
}

function scoreSingleIndicationMatch(
  ind: Icd10DiagnosisEntry,
  parsed: ParsedIndicationQuery
): { score: number; matchType: IndicationMatchType } | null {
  let icdHit: 'exact' | 'category' | null = null;
  if (parsed.icdTokens.length > 0) {
    const allIcdMatch = parsed.icdTokens.every(tok => {
      const hit = matchesIcdToken(ind, tok.upper, tok.noDot);
      if (hit === 'exact' && icdHit !== 'exact') icdHit = 'exact';
      else if (hit === 'category' && !icdHit) icdHit = 'category';
      return hit !== null;
    });
    if (!allIcdMatch) return null;
  }

  if (parsed.textTokens.length > 0) {
    const allTextMatch = parsed.textTokens.every(tok => matchesNormalizedToken(ind, tok));
    if (!allTextMatch) return null;
  }

  let indScore = 950;
  let indType: IndicationMatchType = 'indication_tokens';

  if (icdHit === 'exact') {
    indScore = 2200;
    indType = 'icd_exact';
  } else if (icdHit === 'category') {
    indScore = 1800;
    indType = 'icd_category';
  } else if (normalizeText(ind.nameTr) === parsed.queryNormFull || ind.normText === parsed.queryNormFull) {
    indScore = 1600;
    indType = 'indication_exact';
  } else if (ind.normText.startsWith(parsed.queryNormFull)) {
    indScore = 1450;
    indType = 'indication_phrase';
  } else if (ind.normText.includes(parsed.queryNormFull)) {
    indScore = 1200;
    indType = 'indication_phrase';
  }

  if (parsed.textTokens.length > 0 && ind.tokens[0] && ind.tokens[0].startsWith(parsed.textTokens[0])) {
    indScore += 80;
  }

  return { score: indScore, matchType: indType };
}

/**
 * Sorguyu yalnızca onaylı endikasyonlar (`i`) ve ICD-10 tanı kodları üzerinde arar.
 * Dönen harita: ATC Kodu -> En yüksek eşleşme puanı ve eşleşen endikasyon listesi.
 */
export function searchAtcByIndication(rawQuery: string): Map<string, AtcIndicationMatch> {
  const results = new Map<string, AtcIndicationMatch>();
  if (!isIcd10DictionaryReady()) return results;

  const parsed = parseIndicationQuery(rawQuery);
  if (!parsed) return results;

  const candidateAtcs = new Set<string>();
  if (parsed.icdTokens.length > 0 && parsed.textTokens.length === 0) {
    for (const icdTok of parsed.icdTokens) {
      const exactSet = byIcdExact.get(icdTok.upper) || byIcdExact.get(icdTok.noDot);
      if (exactSet) exactSet.forEach(a => candidateAtcs.add(a));
      if (icdTok.upper.length === 3) {
        const catSet = byIcdCategory.get(icdTok.upper);
        if (catSet) catSet.forEach(a => candidateAtcs.add(a));
      }
    }
  } else if (parsed.textTokens.length > 0) {
    const textCandidates = getCandidateAtcsForTokens(parsed.textTokens);
    textCandidates.forEach(a => candidateAtcs.add(a));
  }

  for (const atcCode of candidateAtcs) {
    const profile = profileMap.get(atcCode);
    if (!profile || profile.indications.length === 0) continue;

    let bestScore = -1;
    let bestType: IndicationMatchType = 'indication_tokens';
    const matchedIndications: Icd10DiagnosisEntry[] = [];

    for (const ind of profile.indications) {
      const scored = scoreSingleIndicationMatch(ind, parsed);
      if (!scored) continue;
      matchedIndications.push(ind);
      if (scored.score > bestScore) {
        bestScore = scored.score;
        bestType = scored.matchType;
      }
    }

    if (bestScore >= 0 && matchedIndications.length > 0) {
      results.set(atcCode, {
        atcCode,
        score: bestScore,
        matchType: bestType,
        matchedIndications
      });
    }
  }

  return results;
}

export interface IndicationBadgeItem {
  code: string;
  nameTr: string;
  matched: boolean;
}

/**
 * İlaç kartlarında kompakt rozet gösterimi için ATC kodunun onaylı endikasyonlarını döndürür.
 * Aktif sorgu ile eşleşen tanılar O(endikasyon sayısı) maliyetle önceliklendirilir.
 */
export function getAtcIndicationBadges(
  atcCode?: string,
  activeQuery?: string,
  limit: number = 3
): IndicationBadgeItem[] {
  const profile = getAtcIcd10Profile(atcCode);
  if (!profile || profile.indications.length === 0) return [];

  const parsed = activeQuery ? parseIndicationQuery(activeQuery) : null;
  const matchedScores = new Map<string, number>();

  if (parsed) {
    for (const ind of profile.indications) {
      const scored = scoreSingleIndicationMatch(ind, parsed);
      if (scored) {
        matchedScores.set(`${ind.code}:${ind.nameTr}`, scored.score);
      }
    }
  }

  const ordered = [...profile.indications].sort((a, b) => {
    const aScore = matchedScores.get(`${a.code}:${a.nameTr}`) ?? -1;
    const bScore = matchedScores.get(`${b.code}:${b.nameTr}`) ?? -1;
    return bScore - aScore;
  });

  const seen = new Set<string>();
  const badges: IndicationBadgeItem[] = [];
  for (const ind of ordered) {
    const dedupKey = `${ind.code}:${ind.nameTr}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    badges.push({
      code: ind.code,
      nameTr: ind.nameTr,
      matched: matchedScores.has(dedupKey)
    });
    if (badges.length >= limit) break;
  }
  return badges;
}
