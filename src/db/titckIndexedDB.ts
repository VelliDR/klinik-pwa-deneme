/**
 * INDEXEDDB & IN-MEMORY HYBRID STORAGE ENGINE (TypeScript)
 * Tam TİTCK Uyumlu, KÜB & Prospektüs (KT) Destekli, Yüksek Performanslı Klinik Arama Motoru
 */

import { normalizeText } from '../utils/medicalText';
import {
  ensureIcd10DictionaryReady,
  isIcd10DictionaryReady,
  searchAtcByIndication
} from '../engines/icd10DictionaryEngine';
import type { AtcIndicationMatch } from '../types/clinical';

export { normalizeText };

// 12 kanonik KÜB Alerjen / Eksipiyan bitmask sözlüğü (build-drug-catalog.js ile birebir senkron)
export const ALLERGEN_BIT_LABELS: readonly string[] = [
  'Sodyum',
  'Laktoz',
  'Sükroz / Fruktoz / Sorbitol',
  'Propilen Glikol',
  'Etanol / Alkol',
  'Tartrazin / Azo Boyar',
  'Soya / Yer Fıstığı',
  'Paraben',
  'Benzil Alkol',
  'Aspartam / Fenilalanin',
  'Sülfit / Metabisülfit',
  'Gluten / Buğday Nişastası'
];

export const MEAL_TIMING_LABELS: Record<number, string> = {
  1: 'Aç karnına',
  2: 'Tok karnına / Yemekle birlikte',
  3: 'Aç veya tok karnına'
};

export const DRIVING_RISK_LABELS: Record<number, string> = {
  1: 'Etkisi Yok / İhmal Edilebilir',
  2: 'Prospektüse Bakınız',
  3: 'Dikkat Gerektirir',
  4: 'Kullanılmamalı / Yüksek Risk'
};

const TITCK_DIRECT_PDF_BASE = 'https://titck.gov.tr/storage/kubKtAttachments/';
const TITCK_ENCODED_ARCHIVE_RE = /^(\d{2})\/(.+)$/;

/**
 * Kompakt PDF yolunu ("0/dosya.pdf", "24/dosya.pdf" veya tam URL) eksiksiz TİTCK HTTPS linkine çözer.
 */
export function decodeTitckPdfUrl(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('0/')) return `${TITCK_DIRECT_PDF_BASE}${s.slice(2)}`;
  const archiveMatch = s.match(TITCK_ENCODED_ARCHIVE_RE);
  if (archiveMatch) {
    return `https://titck.gov.tr/storage/Archive/20${archiveMatch[1]}/kubKtAttachments/${archiveMatch[2]}`;
  }
  return `${TITCK_DIRECT_PDF_BASE}${s}`;
}

export function decodeAllergenMask(raw?: number | string[] | null): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  const mask = Number(raw) || 0;
  if (mask <= 0) return [];
  const list: string[] = [];
  for (let bit = 0; bit < ALLERGEN_BIT_LABELS.length; bit++) {
    if ((mask & (1 << bit)) !== 0) {
      list.push(ALLERGEN_BIT_LABELS[bit]);
    }
  }
  return list;
}

export function decodeMealTiming(raw?: number | string | null): { code: number; label: string } {
  if (typeof raw === 'number' && MEAL_TIMING_LABELS[raw]) {
    return { code: raw, label: MEAL_TIMING_LABELS[raw] };
  }
  const s = String(raw || '').trim();
  if (!s) return { code: 0, label: '' };
  const lower = s.toLowerCase();
  if (lower.includes('aç veya tok') || lower.includes('ac veya tok')) return { code: 3, label: MEAL_TIMING_LABELS[3] };
  if (lower.includes('tok') || lower.includes('yemekle')) return { code: 2, label: MEAL_TIMING_LABELS[2] };
  if (lower.includes('aç') || lower.includes('ac')) return { code: 1, label: MEAL_TIMING_LABELS[1] };
  return { code: 0, label: s };
}

export function decodeDrivingRisk(raw?: number | string | null): { code: number; label: string } {
  if (typeof raw === 'number' && DRIVING_RISK_LABELS[raw]) {
    return { code: raw, label: DRIVING_RISK_LABELS[raw] };
  }
  const s = String(raw || '').trim();
  if (!s) return { code: 0, label: '' };
  const lower = s.toLowerCase();
  if (lower.includes('kullanılmamalı') || lower.includes('yüksek risk')) return { code: 4, label: DRIVING_RISK_LABELS[4] };
  if (lower.includes('dikkat')) return { code: 3, label: DRIVING_RISK_LABELS[3] };
  if (lower.includes('prospektüs')) return { code: 2, label: DRIVING_RISK_LABELS[2] };
  if (lower.includes('etkisi yok') || lower.includes('ihmal')) return { code: 1, label: DRIVING_RISK_LABELS[1] };
  return { code: 0, label: s };
}

export interface RawDrugRecord {
  // Compact Format Keys (Aşama 1 + v2 Hibrit ETL)
  i?: number | string;
  b?: string;
  g?: string;
  a?: string;
  c?: string | number;
  m?: string;
  r?: string;
  s?: number | string;
  sg?: number;
  eg?: string;
  em?: number;
  pr?: string;
  cz?: number | boolean;
  kn?: string;
  di?: string;
  ki?: string;
  fk?: number | boolean;
  psf?: number | null;
  pdt?: string;
  gkf?: number | null;
  ekz?: number | boolean;
  alg?: number | string[];
  act?: number | string;
  arc?: number | string;
  ask?: string;
  kb?: string;
  kt?: string;

  // Legacy Format Keys
  id?: string | number;
  brand?: string;
  generic?: string;
  atc?: string;
  atcCode?: string;
  barcode?: string;
  company?: string;
  rx?: string;
  prescriptionType?: string;
  status?: string;
  sheet?: string;
  _sheet?: string;
  essential?: number;
  isEssential?: number | boolean;
  child?: number;
  isChildEssential?: number | boolean;
  neonate?: number;
  isNeonateEssential?: number | boolean;
  kub?: string;
  kub_pdf_url?: string;
  kubUrl?: string;
  kt_pdf_prospektus_url?: string;
  prospektusUrl?: string;
  'İlaç Adı'?: string;
  'ilac adi'?: string;
  'Ürün Adı'?: string;
  'Ticari Ad'?: string;
  NAME?: string;
  'Etkin Madde'?: string;
  'Etken Madde'?: string;
  'ATC Adı'?: string;
  Generic?: string;
  'ATC Kodu'?: string;
  ATC?: string;
  'Barkod'?: string;
  Barcode?: string;
  'Firma Adı'?: string;
  'Firma'?: string;
  Company?: string;
  'Reçete Türü'?: string;
  PrescriptionType?: string;
  'Durumu'?: string;
  Status?: string;
  'Temel İlaç Listesi Durumu'?: number;
  'Çocuk Temel İlaç Listesi Durumu'?: number;
  'Yenidoğan Temel İlaç Listesi Durumu'?: number;
  'SGK Geri Ödeme'?: string;
  'Eşdeğer İlaç Grubu (SGK)'?: string;
  'Gebelik Kategorisi'?: string;
  'Soğuk Zincir Mi'?: boolean;
  'SGK Kamu No'?: string;
  'SGK Kamu İskonto Oranı'?: string;
  _searchable?: string;
  [key: string]: unknown;
}

export interface NormalizedDrugRecord {
  id: string;
  brand: string;
  generic: string;
  atcCode: string;
  barcode: string;
  company: string;
  prescriptionType: string;
  status: string;
  sheet: string;
  isEssential: number;
  isChildEssential: number;
  isNeonateEssential: number;
  kub_pdf_url: string;
  kt_pdf_prospektus_url: string;
  sgkReimbursed: number;
  esdegerGroup: string;
  pregnancyCategory: string;
  isColdChain: boolean;
  sgkKamuNo: string;
  sgkDiscount: string;
  sgkTieredDiscount?: string;
  sgkPriceProtected?: boolean;
  retailPriceTl?: number | null;
  priceDate?: string;
  referencePriceEur?: number | null;
  isExtraMonitoring: boolean;
  allergens: string[];
  mealTiming: string;
  mealTimingCode: number;
  drivingRisk: string;
  drivingRiskCode: number;
  licenseSuspension?: string;
  matchTier?: 1 | 2 | 3;
  matchReason?: string;
  _brandNorm: string;
  _genericNorm: string;
  _barcodeNorm: string;
  _atcNorm: string;
  _brandCompact: string;
  _genericCompact: string;
  _searchable: string;
}

export interface DrugCatalogIndex {
  byBarcode: Map<string, number[]>;
  byAtc: Map<string, number[]>;
  byGenericExact: Map<string, number[]>;
  byEsdeger: Map<string, number[]>;
  byWordPrefix: Map<string, number[]>;
  queryCache: Map<string, NormalizedDrugRecord[]>;
}

const DB_NAME = 'KlinikAsistanDB';
const DB_VERSION = 27; // v2.1 Hibrit ETL: Fiyat tarife tarihi (pdt), veri anlık görüntüsü manifesti (v27 Upgrade)
const STORE_NAME = 'drugs';

let cachedDb: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;
let memoryDrugsCache: NormalizedDrugRecord[] | null = null;
let memoryDrugIndex: DrugCatalogIndex | null = null;
let catalogLoadingPromise: Promise<NormalizedDrugRecord[]> | null = null;

/**
 * Hızlı ve Güvenilir İlaç Kaydı Normalizasyonu
 */
export function normalizeDrugRecord(item: RawDrugRecord, index: number): NormalizedDrugRecord | null {
  if (!item) return null;

  const rawId = item.id !== undefined ? item.id : item.i;
  const brand = item.brand || item.b || item['İlaç Adı'] || item['ilac adi'] || item['Ürün Adı'] || item['Ticari Ad'] || item.NAME || '';
  const generic = item.generic || item.g || item['Etkin Madde'] || item['Etken Madde'] || item['ATC Adı'] || item.Generic || 'Belirtilmedi';
  const atc = item.atc || item.a || item.atcCode || item['ATC Kodu'] || item.ATC || '';
  const barcode = item.barcode || item.c || item['Barkod'] || item.Barcode || '';
  const company = item.company || item.m || item['Firma Adı'] || item['Firma'] || item.Company || '';
  
  // Reçete türü çözme ('K' -> Kırmızı, 'Y' -> Yeşil, 'M' -> Mor, 'T' -> Turuncu, 'N' -> Normal)
  let rx = item.rx || item.prescriptionType || item['Reçete Türü'] || item.PrescriptionType || item.r || 'Normal';
  if (rx === 'K') rx = 'Kırmızı';
  else if (rx === 'Y') rx = 'Yeşil';
  else if (rx === 'M') rx = 'Mor';
  else if (rx === 'T') rx = 'Turuncu';
  else if (rx === 'N') rx = 'Normal';

  // Durum çözme (1 -> Aktif, 0 -> Pasif)
  let status = item.status || item['Durumu'] || item.Status || '';
  if (!status && item.s !== undefined) {
    status = item.s === 1 || item.s === '1' ? 'Aktif' : 'Pasif';
  }
  if (!status) status = 'Aktif';

  const sheet = item.sheet || item['_sheet'] || (status === 'Aktif' ? 'AKTİF ÜRÜNLER LİSTESİ' : 'PASİF ÜRÜNLER LİSTESİ');

  // Temel İlaç Kapsamı (Bitmask veya münferit alanlar)
  let isEssential = 0;
  let isChild = 0;
  let isNeonate = 0;
  if (item.em !== undefined) {
    const em = Number(item.em) || 0;
    isEssential = (em & 1) === 1 ? 1 : 0;
    isChild = (em & 2) === 2 ? 1 : 0;
    isNeonate = (em & 4) === 4 ? 1 : 0;
  } else {
    isEssential = (item.essential === 1 || item.isEssential === 1 || item['Temel İlaç Listesi Durumu'] === 1) ? 1 : 0;
    isChild = (item.child === 1 || item.isChildEssential === 1 || item['Çocuk Temel İlaç Listesi Durumu'] === 1) ? 1 : 0;
    isNeonate = (item.neonate === 1 || item.isNeonateEssential === 1 || item['Yenidoğan Temel İlaç Listesi Durumu'] === 1) ? 1 : 0;
  }

  const kubRaw = item.kub || item.kub_pdf_url || item.kubUrl || item.kb || item['KÜB PDF Linki'] || '';
  const ktRaw = item.kt || item.kt_pdf_prospektus_url || item.prospektusUrl || item['Prospektüs (KT) PDF Linki'] || '';
  const kub = decodeTitckPdfUrl(String(kubRaw));
  const kt = decodeTitckPdfUrl(String(ktRaw));

  // Yeni Klinik, SGK & v2 Hibrit Alanları
  const sgkReimbursed = item.sg !== undefined ? Number(item.sg) : (/ödeniyor|odeniyor|kapsamda/i.test(String(item['SGK Geri Ödeme'] || '')) ? 1 : 0);
  const esdegerGroup = String(item.eg || item['Eşdeğer İlaç Grubu (SGK)'] || '').trim();
  const pregnancyCategory = String(item.pr || item['Gebelik Kategorisi (FDA)'] || item['Gebelik Kategorisi'] || 'C').trim().charAt(0).toUpperCase() || 'C';
  const isColdChain = item.cz === 1 || item.cz === true || item['Soğuk Zincir Mi'] === true;
  const sgkKamuNo = String(item.kn || item['SGK Kamu No'] || '').trim();
  const sgkDiscount = String(item.di || item['SGK Kamu İskonto Oranı'] || '').trim();
  const sgkTieredDiscount = String(item.ki || item['SGK Kademeli İskontolar'] || '').trim();
  const sgkPriceProtected = item.fk === 1 || item.fk === true || String(item['SGK Fiyat Koruma Durumu'] || '').toUpperCase().includes('KORUMALI');
  const retailPriceTl = typeof item.psf === 'number' && !isNaN(item.psf)
    ? item.psf
    : (typeof item['Perakende Satış Fiyatı (TL)'] === 'number' ? (item['Perakende Satış Fiyatı (TL)'] as number) : null);
  const priceDateRaw = String(item.pdt || item.priceDate || item['Fiyat Güncelleme Tarihi'] || '').trim().slice(0, 10);
  const priceDate = /^\d{4}-\d{2}-\d{2}$/.test(priceDateRaw) ? priceDateRaw : undefined;
  const referencePriceEur = typeof item.gkf === 'number' && !isNaN(item.gkf)
    ? item.gkf
    : (typeof item['Referans Fiyat (GKF Euro)'] === 'number' ? (item['Referans Fiyat (GKF Euro)'] as number) : null);
  const isExtraMonitoring = item.ekz === 1 || item.ekz === true || item['Ek İzlemeye Tabi Mi (▼)'] === true;
  const allergens = decodeAllergenMask(item.alg ?? (item['KÜB Alerjen / Eksipiyan Uyarıları'] as string[] | undefined));
  const mealInfo = decodeMealTiming(item.act ?? (item['KÜB Aç/Tok Kullanım'] as string | undefined));
  const drivingInfo = decodeDrivingRisk(item.arc ?? (item['KÜB Araç Kullanım Riski'] as string | undefined));
  const licenseSuspension = String(item.ask || '').trim() || undefined;

  const brandNorm = normalizeText(brand);
  const genericNorm = normalizeText(generic);
  const barcodeNorm = String(barcode).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const atcNorm = String(atc).trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const brandCompact = brandNorm.replace(/\s+/g, '');
  const genericCompact = genericNorm.replace(/\s+/g, '');

  return {
    id: rawId ? String(rawId) : `drug_${(index || 0) + 1}`,
    brand: String(brand).trim(),
    generic: String(generic).trim(),
    atcCode: String(atc).trim(),
    barcode: String(barcode).trim(),
    company: String(company).trim(),
    prescriptionType: String(rx).trim(),
    status: String(status).trim(),
    sheet: String(sheet).trim(),
    isEssential,
    isChildEssential: isChild,
    isNeonateEssential: isNeonate,
    kub_pdf_url: kub,
    kt_pdf_prospektus_url: kt,
    sgkReimbursed,
    esdegerGroup,
    pregnancyCategory,
    isColdChain,
    sgkKamuNo,
    sgkDiscount,
    sgkTieredDiscount: sgkTieredDiscount || undefined,
    sgkPriceProtected,
    retailPriceTl,
    priceDate,
    referencePriceEur,
    isExtraMonitoring,
    allergens,
    mealTiming: mealInfo.label,
    mealTimingCode: mealInfo.code,
    drivingRisk: drivingInfo.label,
    drivingRiskCode: drivingInfo.code,
    licenseSuspension,
    _brandNorm: brandNorm,
    _genericNorm: genericNorm,
    _barcodeNorm: barcodeNorm,
    _atcNorm: atcNorm,
    _brandCompact: brandCompact,
    _genericCompact: genericCompact,
    _searchable: `${brandNorm} ${genericNorm} ${barcodeNorm} ${atcNorm} ${brandCompact} ${genericCompact}`
  };
}

/**
 * Singleton IndexedDB Bağlantı Yöneticisi
 */
export function initDB(): Promise<IDBDatabase> {
  if (cachedDb) return Promise.resolve(cachedDb);
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB ortamda desteklenmiyor'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      let store: IDBObjectStore;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        if (e.oldVersion < 26) {
          db.deleteObjectStore(STORE_NAME);
          store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        } else {
          store = (e.target as IDBOpenDBRequest).transaction!.objectStore(STORE_NAME);
        }
      } else {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!store.indexNames.contains('barcode')) {
        store.createIndex('barcode', 'barcode', { unique: false });
      }
      if (!store.indexNames.contains('atcCode')) {
        store.createIndex('atcCode', 'atcCode', { unique: false });
      }
      if (!store.indexNames.contains('esdegerGroup')) {
        store.createIndex('esdegerGroup', 'esdegerGroup', { unique: false });
      }
    };

    request.onsuccess = () => {
      cachedDb = request.result;
      cachedDb.onversionchange = () => {
        if (cachedDb) {
          cachedDb.close();
          cachedDb = null;
        }
        dbInitPromise = null;
      };
      resolve(cachedDb);
    };

    request.onerror = () => {
      dbInitPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn('[TİTCK DB] indexedDB.open engellendi, diğer sekmeler kontrol ediliyor...');
      setTimeout(() => {
        if (!cachedDb) {
          dbInitPromise = null;
          reject(new Error('IndexedDB bağlantısı zaman aşımına uğradı'));
        }
      }, 2500);
    };
  });

  return dbInitPromise;
}

/**
 * Bellek İçi Ters İndeks (Inverted Prefix + Hash Index) Oluşturucu
 * 18.212 ilaçlık katalogda O(1) barkod/ATC/etken madde/SGK eşdeğer grubu ve <1ms kelime önek araması sağlar
 */
function buildDrugSearchIndex(drugs: NormalizedDrugRecord[]): DrugCatalogIndex {
  const byBarcode = new Map<string, number[]>();
  const byAtc = new Map<string, number[]>();
  const byGenericExact = new Map<string, number[]>();
  const byEsdeger = new Map<string, number[]>();
  const byWordPrefix = new Map<string, number[]>();

  const pushMap = (map: Map<string, number[]>, key: string, idx: number) => {
    const arr = map.get(key);
    if (arr) {
      arr.push(idx);
    } else {
      map.set(key, [idx]);
    }
  };

  for (let i = 0; i < drugs.length; i++) {
    const d = drugs[i];

    if (d.barcode) {
      pushMap(byBarcode, d.barcode, i);
    }

    if (d.atcCode) {
      const atcUpper = d.atcCode.toUpperCase();
      pushMap(byAtc, atcUpper, i);
    }

    if (d._genericNorm && d._genericNorm !== 'belirtilmedi') {
      pushMap(byGenericExact, d._genericNorm, i);
    }

    if (d.esdegerGroup) {
      const egUpper = d.esdegerGroup.trim().toUpperCase();
      if (egUpper) {
        pushMap(byEsdeger, egUpper, i);
      }
    }

    const seenPrefixes = new Set<string>();
    const esdegerToken = d.esdegerGroup ? d.esdegerGroup.toLowerCase() : '';
    const rawTokens = `${d._brandNorm} ${d._genericNorm} ${d._atcNorm} ${d._brandCompact} ${d._genericCompact} ${esdegerToken}`.split(' ');

    for (let t = 0; t < rawTokens.length; t++) {
      const token = rawTokens[t];
      if (!token || token.length < 2) continue;
      const maxLen = Math.min(token.length, 6);
      for (let len = 2; len <= maxLen; len++) {
        const prefix = token.slice(0, len);
        if (!seenPrefixes.has(prefix)) {
          seenPrefixes.add(prefix);
          pushMap(byWordPrefix, prefix, i);
        }
      }
    }
  }

  return {
    byBarcode,
    byAtc,
    byGenericExact,
    byEsdeger,
    byWordPrefix,
    queryCache: new Map<string, NormalizedDrugRecord[]>()
  };
}

/**
 * İki Sıralı İndeks Dizisinin Kesişimi (Two-Pointer O(N+M) Intersection)
 */
function intersectSortedIndices(a: number[], b: number[]): number[] {
  const result: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const valA = a[i];
    const valB = b[j];
    if (valA === valB) {
      result.push(valA);
      i++;
      j++;
    } else if (valA < valB) {
      i++;
    } else {
      j++;
    }
  }
  return result;
}

/**
 * Bellek İçi İlaç Kataloğunun Hazır Olup Olmadığını Bildirir
 */
export function isDrugCatalogReady(): boolean {
  return memoryDrugsCache !== null && Array.isArray(memoryDrugsCache) && memoryDrugsCache.length > 0;
}

/**
 * Aktif İlaç İndeksini Döndürür (Muadil ve Hızlı Arama Motorları İçin)
 */
export function getDrugCatalogIndex(): DrugCatalogIndex | null {
  return memoryDrugIndex;
}

/**
 * SGK Eşdeğer Grubu Kodu ile O(1) Muadil İlaçları Getirir (Örn: "E712B")
 */
export function getDrugsByEsdegerGroup(esdegerGroup: string): NormalizedDrugRecord[] {
  if (!esdegerGroup || !memoryDrugsCache || !memoryDrugIndex) return [];
  const groupUpper = esdegerGroup.trim().toUpperCase();
  const indices = memoryDrugIndex.byEsdeger.get(groupUpper);
  if (!indices || indices.length === 0) return [];
  return indices.map(idx => memoryDrugsCache![idx]).filter(Boolean);
}

/**
 * Barkod veya Marka Adı ile O(1) Katalog Kaydı Getirir (Monograf / Fiyat / Alerjen Bağlamı İçin)
 */
export function findCatalogDrugSync(query?: { barcode?: string; brand?: string; atc?: string } | null): NormalizedDrugRecord | null {
  if (!query || !memoryDrugsCache || !memoryDrugIndex) return null;
  const cleanBarcode = String(query.barcode || '').trim();
  if (cleanBarcode) {
    const byBc = memoryDrugIndex.byBarcode.get(cleanBarcode);
    if (byBc && byBc.length > 0) return memoryDrugsCache[byBc[0]] || null;
  }
  const cleanBrand = String(query.brand || '').trim().toLocaleUpperCase('tr-TR');
  if (cleanBrand) {
    const cleanAtc = String(query.atc || '').trim().toUpperCase();
    if (cleanAtc) {
      const atcIdx = memoryDrugIndex.byAtc.get(cleanAtc);
      if (atcIdx) {
        for (const i of atcIdx) {
          if (memoryDrugsCache[i]?.brand.toLocaleUpperCase('tr-TR') === cleanBrand) {
            return memoryDrugsCache[i];
          }
        }
      }
    }
    const found = memoryDrugsCache.find(d => d.brand.toLocaleUpperCase('tr-TR') === cleanBrand);
    if (found) return found;
  }
  return null;
}

/**
 * Bellek İçi İlaç Kataloğunu Doldurur ve Ters İndeksi İnşa Eder
 */
export function setMemoryDrugsCache(list: unknown[]): void {
  if (!Array.isArray(list) || list.length === 0) return;
  memoryDrugsCache = list.map((item, idx) => {
    const raw = item as RawDrugRecord;
    if (
      raw &&
      raw._searchable &&
      raw._brandNorm &&
      raw._brandCompact &&
      raw._genericNorm &&
      !('_companyNorm' in raw) &&
      'isExtraMonitoring' in raw &&
      Array.isArray((raw as unknown as NormalizedDrugRecord).allergens)
    ) {
      return raw as unknown as NormalizedDrugRecord;
    }
    return normalizeDrugRecord(raw, idx);
  }).filter(Boolean) as NormalizedDrugRecord[];
  memoryDrugIndex = buildDrugSearchIndex(memoryDrugsCache);
}

/**
 * İlaç Kataloğunun Bellekte Hazır Olmasını Garanti Eder (Hibrit: Cache -> IDB -> JSON)
 */
export async function ensureDrugCatalogReady(): Promise<NormalizedDrugRecord[]> {
  if (!isIcd10DictionaryReady()) {
    void ensureIcd10DictionaryReady();
  }
  if (isDrugCatalogReady() && memoryDrugsCache) {
    return memoryDrugsCache;
  }
  if (catalogLoadingPromise) {
    return catalogLoadingPromise;
  }

  catalogLoadingPromise = (async () => {
    // 1. Önce IndexedDB'de mevcut kayıtları hızlıca kontrol et (Tam katalog >= 17000 kayıt olmalıdır)
    try {
      const db = await initDB();
      const list = await new Promise<NormalizedDrugRecord[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []) as NormalizedDrugRecord[]);
        req.onerror = () => resolve([]);
      });

      if (
        list &&
        list.length >= 17000 &&
        list[0] &&
        list[0].pregnancyCategory !== undefined &&
        list[0].isColdChain !== undefined &&
        list[0].isExtraMonitoring !== undefined &&
        Array.isArray(list[0].allergens) &&
        !('_companyNorm' in list[0])
      ) {
        setMemoryDrugsCache(list);
        console.log(`[TİTCK PWA] İlaç kataloğu IndexedDB üzerinden belleğe alındı ve indekslendi (${memoryDrugsCache?.length} kayıt).`);
        return memoryDrugsCache || [];
      } else if (list && list.length > 0) {
        console.warn(`[TİTCK PWA] IndexedDB'de eski şema veya eksik alanlar tespit edildi (${list.length} kayıt). Yeni JSON kaynağından yenileniyor...`);
      }
    } catch (e) {
      console.warn('[TİTCK PWA] IndexedDB okuma uyarısı, JSON indirmesi deneniyor:', e);
    }

    // 2. IndexedDB boşsa veya erişilemiyorsa medicines.json dosyasını yükle
    try {
      let res: Response | null = null;
      const candidatePaths = [
        './data/medicines.json',
        '/data/medicines.json',
        '../data/medicines.json',
        'data/medicines.json'
      ];

      for (const path of candidatePaths) {
        try {
          const attempt = await fetch(path);
          if (attempt && attempt.ok) {
            res = attempt;
            break;
          }
        } catch {
          // sonraki dosya yolunu dene
        }
      }

      if (res && res.ok) {
        const rawData = await res.json();
        const drugArray = Array.isArray(rawData) ? rawData : (Object.values(rawData).flat());
        setMemoryDrugsCache(drugArray);
        console.log(`[TİTCK PWA] İlaç kataloğu JSON dosyasından hazırlandı ve indekslendi (${memoryDrugsCache?.length} ilaç).`);

        // UI akışını dondurmadan arka planda IndexedDB'yi tohumla
        if (memoryDrugsCache) {
          const cacheToSeed = memoryDrugsCache;
          setTimeout(() => {
            seedDrugDatabase(cacheToSeed).catch(err => {
              console.warn('[TİTCK PWA] Arka plan IndexedDB tohumlama uyarısı:', err);
            });
          }, 100);
        }

        return memoryDrugsCache || [];
      }
    } catch (e) {
      console.error('[TİTCK PWA] İlaç kataloğu yüklenemedi:', e);
    } finally {
      catalogLoadingPromise = null;
    }

    return memoryDrugsCache || [];
  })();

  return catalogLoadingPromise;
}

/**
 * İlaç Veritabanını IndexedDB'ye Akıcı / Non-blocking Şekilde Tohumlar
 */
export async function seedDrugDatabase(
  rawDrugList: unknown[] | Record<string, unknown>,
  progressCallback?: (percent: number) => void
): Promise<void> {
  let drugArray: RawDrugRecord[] = [];
  if (Array.isArray(rawDrugList)) {
    drugArray = rawDrugList as RawDrugRecord[];
  } else if (typeof rawDrugList === 'object' && rawDrugList !== null) {
    drugArray = Object.values(rawDrugList).filter(Array.isArray).flat() as RawDrugRecord[];
  }

  if (drugArray.length === 0) return;

  // Bellek önbelleğini de hemen hazır tut
  if (!isDrugCatalogReady()) {
    setMemoryDrugsCache(drugArray);
  }

  try {
    const db = await initDB();
    const CHUNK_SIZE = 1500;
    let processed = 0;

    for (let i = 0; i < drugArray.length; i += CHUNK_SIZE) {
      const chunk = drugArray.slice(i, i + CHUNK_SIZE);

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        chunk.forEach((item, index) => {
          const normCandidate = item as unknown as NormalizedDrugRecord;
          const isFullyNormalized = Boolean(item._searchable && normCandidate._brandNorm && normCandidate._genericNorm);
          const normalized = isFullyNormalized ? normCandidate : normalizeDrugRecord(item, processed + index);
          if (normalized) {
            store.put(normalized);
          }
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      processed += chunk.length;
      if (progressCallback) {
        progressCallback(Math.round((processed / drugArray.length) * 100));
      }

      // Ana iş parçacığının (UI thread) nefes alması için kısa bekleme
      await new Promise(r => setTimeout(r, 10));
    }

    console.log(`[TİTCK PWA] ${processed} ilaç IndexedDB üzerine başarıyla indekslendi.`);
  } catch (err) {
    console.warn('[TİTCK PWA] IndexedDB tohumlama sırasında hata oluştu (bellek önbelleği aktif kalacak):', err);
  }
}

export type DrugSearchMode = 'all' | 'brand' | 'generic' | 'indication' | 'barcode' | 'esdeger';

export interface DrugFilterOptions {
  onlyActive?: boolean;
  onlySgk?: boolean;
  onlyColdChain?: boolean;
  pregnancySafeOnly?: boolean;
  onlyExtraMonitoring?: boolean;
}

function isDrugActive(drug: NormalizedDrugRecord): boolean {
  return drug.status === 'Aktif' || Boolean(drug.sheet && !drug.sheet.toUpperCase().includes('PASİF'));
}

export function matchesDrugFilters(drug: NormalizedDrugRecord, filters?: DrugFilterOptions): boolean {
  if (!filters) return true;
  if (filters.onlyActive && !isDrugActive(drug)) {
    return false;
  }
  if (filters.onlySgk && drug.sgkReimbursed !== 1) {
    return false;
  }
  if (filters.onlyColdChain && !drug.isColdChain) {
    return false;
  }
  if (filters.pregnancySafeOnly && drug.pregnancyCategory !== 'A' && drug.pregnancyCategory !== 'B') {
    return false;
  }
  if (filters.onlyExtraMonitoring && !drug.isExtraMonitoring) {
    return false;
  }
  return true;
}

function computeClinicalQualityBonus(drug: NormalizedDrugRecord): number {
  let bonus = 0;
  if (isDrugActive(drug)) bonus += 120;
  if (drug.sgkReimbursed === 1) bonus += 40;
  if (drug.kt_pdf_prospektus_url || drug.kub_pdf_url) bonus += 30;
  if (drug.isEssential === 1) bonus += 20;
  return bonus;
}

function computeAllModeIndicationScore(indicationMatch: AtcIndicationMatch): number {
  switch (indicationMatch.matchType) {
    case 'icd_exact':
      return 550;
    case 'icd_category':
      return 450;
    case 'indication_exact':
      return 125;
    case 'indication_phrase':
      return 110;
    default:
      return 85;
  }
}

/**
 * Tekil İlaç Puanlama Yardımcıları
 */
function scoreDrugCandidate(
  drug: NormalizedDrugRecord,
  trimmedQuery: string,
  queryNorm: string,
  queryCompact: string,
  queryTokens: string[],
  mode: DrugSearchMode = 'all',
  indicationMatch?: AtcIndicationMatch
): number {
  if (mode === 'indication') {
    if (!indicationMatch) return -1;
    return indicationMatch.score + computeClinicalQualityBonus(drug);
  }

  if (mode === 'esdeger') {
    const eg = drug.esdegerGroup ? drug.esdegerGroup.toUpperCase() : '';
    const target = trimmedQuery.toUpperCase();
    if (!eg || !eg.includes(target)) return -1;
    return eg === target ? 3000 : 1500;
  }

  if (mode === 'barcode') {
    const isExactBarcode = drug.barcode && drug.barcode === trimmedQuery;
    const isPartialBarcode = drug.barcode && drug.barcode.includes(trimmedQuery);
    const isAtcMatch = drug.atcCode && drug.atcCode.toLowerCase().includes(queryNorm);
    if (!isExactBarcode && !isPartialBarcode && !isAtcMatch) return -1;
    if (isExactBarcode) return 3000;
    if (isPartialBarcode) return 2000;
    return 1000;
  }

  if (mode === 'brand') {
    const isStandardMatch = queryTokens.every(token => drug._brandNorm.includes(token));
    const isCompactMatch = queryCompact.length >= 3 && Boolean(drug._brandCompact && drug._brandCompact.includes(queryCompact));
    if (!isStandardMatch && !isCompactMatch) return -1;

    let score = 0;
    if (drug._brandNorm === queryNorm || drug._brandCompact === queryCompact) {
      score += 2000;
    } else if (drug._brandNorm.startsWith(queryNorm) || (drug._brandCompact && drug._brandCompact.startsWith(queryCompact))) {
      score += 1200;
    } else if (drug._brandNorm.includes(queryNorm) || (drug._brandCompact && drug._brandCompact.includes(queryCompact))) {
      score += 800;
    } else {
      score += 400;
    }

    if (isDrugActive(drug)) {
      score += 50;
    }
    return score;
  }

  if (mode === 'generic') {
    const isStandardMatch = queryTokens.every(token => drug._genericNorm.includes(token));
    const isCompactMatch = queryCompact.length >= 3 && Boolean(drug._genericCompact && drug._genericCompact.includes(queryCompact));
    if (!isStandardMatch && !isCompactMatch) return -1;

    let score = 0;
    if (drug._genericNorm === queryNorm || drug._genericCompact === queryCompact) {
      score += 2000;
    } else if (drug._genericNorm.startsWith(queryNorm) || (drug._genericCompact && drug._genericCompact.startsWith(queryCompact))) {
      score += 1200;
    } else if (drug._genericNorm.includes(queryNorm) || (drug._genericCompact && drug._genericCompact.includes(queryCompact))) {
      score += 800;
    } else {
      score += 400;
    }

    if (isDrugActive(drug)) {
      score += 50;
    }
    return score;
  }

  // mode === 'all' (marka, etken madde, barkod, ATC, eşdeğer + onaylı endikasyon/ICD-10; firma adı hariç)
  if (drug.barcode && (drug.barcode === trimmedQuery || drug.barcode.includes(trimmedQuery))) {
    return 3000;
  }

  // Eşdeğer grubu birebir eşleşiyorsa (örn: E712B araması)
  if (drug.esdegerGroup && drug.esdegerGroup.toUpperCase() === trimmedQuery.toUpperCase()) {
    return 2500;
  }

  const isStandardMatch = queryTokens.every(token => drug._searchable.includes(token));
  const isCompactMatch = queryCompact.length >= 3 && (
    (drug._brandCompact && drug._brandCompact.includes(queryCompact)) ||
    (drug._genericCompact && drug._genericCompact.includes(queryCompact))
  );

  if (!isStandardMatch && !isCompactMatch) {
    if (!indicationMatch) {
      return -1;
    }
    let indScore = computeAllModeIndicationScore(indicationMatch);
    if (drug.kt_pdf_prospektus_url || drug.kub_pdf_url) indScore += 30;
    if (isDrugActive(drug)) indScore += 50;
    if (drug.sgkReimbursed === 1) indScore += 20;
    return indScore;
  }

  let score = 0;
  if (drug._brandNorm === queryNorm || drug._brandCompact === queryCompact) {
    score += 1500;
  } else if (drug._brandNorm.startsWith(queryNorm) || (drug._brandCompact && drug._brandCompact.startsWith(queryCompact))) {
    score += 900;
  } else if (drug._brandNorm.includes(queryNorm) || (drug._brandCompact && drug._brandCompact.includes(queryCompact))) {
    score += 600;
  } else {
    for (let t = 0; t < queryTokens.length; t++) {
      const token = queryTokens[t];
      if (drug._brandNorm && drug._brandNorm.includes(token)) score += 180;
      if (drug._genericNorm && drug._genericNorm.includes(token)) score += 140;
      if (drug._atcNorm && drug._atcNorm.includes(token)) score += 90;
      if (drug.esdegerGroup && drug.esdegerGroup.toLowerCase().includes(token)) score += 100;
    }
  }

  if (indicationMatch) {
    score += 25;
  }
  if (drug.kt_pdf_prospektus_url || drug.kub_pdf_url) {
    score += 30;
  }
  if (isDrugActive(drug)) {
    score += 50;
  }

  return score;
}

function collectIndicationDrugIndices(
  indicationMatchMap: Map<string, AtcIndicationMatch>,
  byAtcMap: Map<string, number[]>
): Set<number> {
  const indices = new Set<number>();
  for (const atcCode of indicationMatchMap.keys()) {
    const drugIndices = byAtcMap.get(atcCode);
    if (!drugIndices) continue;
    for (let i = 0; i < drugIndices.length; i++) {
      indices.add(drugIndices[i]);
    }
  }
  return indices;
}

function writeQueryCache(cache: Map<string, NormalizedDrugRecord[]>, key: string, results: NormalizedDrugRecord[]): void {
  if (results.length === 0) return;
  if (cache.size >= 150) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, results);
}

/**
 * Gelişmiş İndeksli Tıbbi İlaç Arama Motoru
 * Ters Önek İndeksi (Inverted Prefix Index) + O(1) Barkod/Eşdeğer + ATC/ICD-10 Endikasyon + LRU Sorgu Önbelleği
 * mode: 'all' | 'brand' | 'generic' | 'indication' | 'barcode' | 'esdeger'
 */
export async function searchDrugsInDB(
  query: string,
  mode: DrugSearchMode = 'all',
  filters?: DrugFilterOptions
): Promise<NormalizedDrugRecord[]> {
  if (!query || query.trim().length < 2) return [];

  if (!isDrugCatalogReady()) {
    await ensureDrugCatalogReady();
  }
  if ((mode === 'all' || mode === 'indication') && !isIcd10DictionaryReady()) {
    await ensureIcd10DictionaryReady();
  }

  if (!memoryDrugsCache || memoryDrugsCache.length === 0) return [];
  if (!memoryDrugIndex) {
    memoryDrugIndex = buildDrugSearchIndex(memoryDrugsCache);
  }

  const trimmedQuery = query.trim();
  const filterKey = filters ? JSON.stringify(filters) : '';
  const icdReadyTag = (mode === 'all' || mode === 'indication') && isIcd10DictionaryReady() ? '1' : '0';
  const cacheKey = `${mode}:${icdReadyTag}:${trimmedQuery}:${filterKey}`;

  // 0. LRU Sorgu Önbelleği Kontrolü
  const cachedResult = memoryDrugIndex.queryCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // 1a. O(1) SGK Eşdeğer Grubu Eşleşmesi (esdeger modunda)
  if (mode === 'esdeger') {
    const groupUpper = trimmedQuery.toUpperCase();
    const esdegerIndices = memoryDrugIndex.byEsdeger.get(groupUpper);
    if (esdegerIndices && esdegerIndices.length > 0) {
      const results = esdegerIndices
        .map(idx => memoryDrugsCache![idx])
        .filter(d => matchesDrugFilters(d, filters));
      writeQueryCache(memoryDrugIndex.queryCache, cacheKey, results);
      return results;
    }
  }

  // 1b. O(1) Tam Barkod Eşleşmesi (all veya barcode modunda)
  if (mode === 'all' || mode === 'barcode') {
    const exactBarcodeIndices = memoryDrugIndex.byBarcode.get(trimmedQuery);
    if (exactBarcodeIndices && exactBarcodeIndices.length > 0) {
      const exactDrugs = exactBarcodeIndices
        .map(idx => memoryDrugsCache![idx])
        .filter(d => matchesDrugFilters(d, filters));
      if (exactDrugs.length > 0) {
        writeQueryCache(memoryDrugIndex.queryCache, cacheKey, exactDrugs);
        return exactDrugs;
      }
    }
  }

  const queryNorm = normalizeText(trimmedQuery);
  const queryTokens = queryNorm.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return [];

  const queryCompact = queryNorm.replace(/\s+/g, '');
  const scoredResults: { drug: NormalizedDrugRecord; score: number }[] = [];

  // 1c. Endikasyon / ICD-10 modunda yalnızca onaylı endikasyonlar + ICD-10 sözlüğü üzerinden ara
  const shouldUseIndication = (mode === 'indication' || mode === 'all') && isIcd10DictionaryReady();
  const indicationMatchMap = shouldUseIndication ? searchAtcByIndication(trimmedQuery) : new Map<string, AtcIndicationMatch>();

  if (mode === 'indication') {
    if (indicationMatchMap.size === 0) return [];
    const indIndices = collectIndicationDrugIndices(indicationMatchMap, memoryDrugIndex.byAtc);
    for (const idx of indIndices) {
      const drug = memoryDrugsCache[idx];
      if (!matchesDrugFilters(drug, filters)) continue;
      const indMatch = indicationMatchMap.get(drug.atcCode.toUpperCase());
      const score = scoreDrugCandidate(drug, trimmedQuery, queryNorm, queryCompact, queryTokens, 'indication', indMatch);
      if (score >= 0) {
        scoredResults.push({ drug, score });
      }
    }

    scoredResults.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.drug.brand.localeCompare(b.drug.brand, 'tr');
    });

    const finalIndResults = scoredResults.slice(0, 40).map(item => item.drug);
    writeQueryCache(memoryDrugIndex.queryCache, cacheKey, finalIndResults);
    return finalIndResults;
  }

  // 2. Ters Önek İndeksi (Inverted Prefix Index) ile Aday Kümesi Daraltma
  let candidateIndices: number[] | null = null;
  const tokenPostingLists: number[][] = [];
  let indexLookupFailed = false;

  for (let i = 0; i < queryTokens.length; i++) {
    const token = queryTokens[i];
    if (token.length < 2) {
      continue;
    }
    const prefixKey = token.slice(0, Math.min(token.length, 6));
    const list = memoryDrugIndex.byWordPrefix.get(prefixKey);
    if (!list) {
      indexLookupFailed = true;
      tokenPostingLists.length = 0;
      break;
    }
    tokenPostingLists.push(list);
  }

  if (!indexLookupFailed && tokenPostingLists.length > 0) {
    tokenPostingLists.sort((a, b) => a.length - b.length);
    let intersected = tokenPostingLists[0];
    for (let i = 1; i < tokenPostingLists.length; i++) {
      intersected = intersectSortedIndices(intersected, tokenPostingLists[i]);
      if (intersected.length === 0) break;
    }
    candidateIndices = intersected;
  }

  // Kompakt sorgu (örn. "aferin" -> "A-FERIN", "amoklavinbid" -> "AMOKLAVIN-BID") adaylarını birleştir
  if (queryCompact.length >= 3) {
    const compactKey = queryCompact.slice(0, Math.min(queryCompact.length, 6));
    const compactList = memoryDrugIndex.byWordPrefix.get(compactKey);
    if (compactList && compactList.length > 0) {
      if (!candidateIndices || candidateIndices.length === 0) {
        candidateIndices = compactList;
      } else if (candidateIndices !== compactList) {
        const merged = new Set<number>(candidateIndices);
        for (let i = 0; i < compactList.length; i++) {
          merged.add(compactList[i]);
        }
        candidateIndices = Array.from(merged);
      }
    }
  }

  // `all` modunda endikasyon / ICD-10 eşleşen ATC'lerin ilaçlarını aday kümesine birleştir
  if (mode === 'all' && indicationMatchMap.size > 0) {
    const indIndices = collectIndicationDrugIndices(indicationMatchMap, memoryDrugIndex.byAtc);
    if (indIndices.size > 0) {
      const merged = new Set<number>(candidateIndices || []);
      indIndices.forEach(idx => merged.add(idx));
      candidateIndices = Array.from(merged);
    }
  }

  // 3. Daraltılmış Aday Kümesini Puanla ve Filtrele
  if (candidateIndices && candidateIndices.length > 0) {
    for (let i = 0; i < candidateIndices.length; i++) {
      const drug = memoryDrugsCache[candidateIndices[i]];
      if (!matchesDrugFilters(drug, filters)) continue;
      const indMatch = mode === 'all' ? indicationMatchMap.get(drug.atcCode.toUpperCase()) : undefined;
      const score = scoreDrugCandidate(drug, trimmedQuery, queryNorm, queryCompact, queryTokens, mode, indMatch);
      if (score >= 0) {
        scoredResults.push({ drug, score });
      }
    }
  }

  // 4. %100 Kapsama Güvencesi (Fallback): Kelime ortası alt-string aramalarında indeks boş dönerse tam tarama yap
  if (scoredResults.length === 0) {
    for (let i = 0; i < memoryDrugsCache.length; i++) {
      const drug = memoryDrugsCache[i];
      if (!matchesDrugFilters(drug, filters)) continue;
      const indMatch = mode === 'all' ? indicationMatchMap.get(drug.atcCode.toUpperCase()) : undefined;
      const score = scoreDrugCandidate(drug, trimmedQuery, queryNorm, queryCompact, queryTokens, mode, indMatch);
      if (score >= 0) {
        scoredResults.push({ drug, score });
      }
    }
  }

  // Sıralama: En yüksek puan başta, puan eşitse alfabetik
  scoredResults.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.drug.brand.localeCompare(b.drug.brand, 'tr');
  });

  const finalResults = scoredResults.slice(0, 40).map(item => item.drug);
  writeQueryCache(memoryDrugIndex.queryCache, cacheKey, finalResults);
  return finalResults;
}

/**
 * Kayıtlı İlaç Sayısını Döndürür
 */
export async function getDrugCount(): Promise<number> {
  if (isDrugCatalogReady() && memoryDrugsCache) {
    return memoryDrugsCache.length;
  }
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch (e) {
    return 0;
  }
}
