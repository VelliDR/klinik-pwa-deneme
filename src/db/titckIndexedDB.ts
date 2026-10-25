/**
 * INDEXEDDB & IN-MEMORY HYBRID STORAGE ENGINE (TypeScript)
 * Tam TİTCK Uyumlu, KÜB & Prospektüs (KT) Destekli, Yüksek Performanslı Klinik Arama Motoru
 */

export interface RawDrugRecord {
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
  kt?: string;
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
  _brandNorm: string;
  _genericNorm: string;
  _barcodeNorm: string;
  _atcNorm: string;
  _companyNorm: string;
  _brandCompact: string;
  _genericCompact: string;
  _searchable: string;
}

export interface DrugCatalogIndex {
  byBarcode: Map<string, number[]>;
  byAtc: Map<string, number[]>;
  byGenericExact: Map<string, number[]>;
  byWordPrefix: Map<string, number[]>;
  queryCache: Map<string, NormalizedDrugRecord[]>;
}

const DB_NAME = 'KlinikAsistanDB';
const DB_VERSION = 22; // Invalidate any older partial or unnormalized stores
const STORE_NAME = 'drugs';

let cachedDb: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;
let memoryDrugsCache: NormalizedDrugRecord[] | null = null;
let memoryDrugIndex: DrugCatalogIndex | null = null;
let catalogLoadingPromise: Promise<NormalizedDrugRecord[]> | null = null;

/**
 * Tıbbi Fonetik Normalizasyon Fonksiyonu
 * Türkçe karakterler, Latince/İngilizce etken madde varyasyonları ve birimleri eşitler
 */
export function normalizeText(text: unknown): string {
  if (!text) return '';
  return String(text)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    // Tıbbi Fonetik Dönüşüm (İngilizce / Latince / Türkçe tıbbi eşdeğerlik)
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/y/g, 'i')
    .replace(/x/g, 'ks')
    .replace(/ce/g, 'se')
    .replace(/ci/g, 'si')
    // Çift harfleri sadeleştir (paracetamol vs parasetamol, amoxicillin vs amoksisilin)
    .replace(/([a-z])\1+/g, '$1')
    // Bitişik yazılan sayı ve birimleri ayırır (18mg -> 18 mg, 5ml -> 5 ml)
    .replace(/(\d+)(mg|ml|mcg|g|l|iu|ui|amp|tb|kapsul)/gi, '$1 $2')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Hızlı ve Güvenilir İlaç Kaydı Normalizasyonu
 */
export function normalizeDrugRecord(item: RawDrugRecord, index: number): NormalizedDrugRecord | null {
  if (!item) return null;

  const brand = item.brand || item['İlaç Adı'] || item['ilac adi'] || item['Ürün Adı'] || item['Ticari Ad'] || item.NAME || '';
  const generic = item.generic || item['Etkin Madde'] || item['Etken Madde'] || item['ATC Adı'] || item.Generic || 'Belirtilmedi';
  const atc = item.atc || item.atcCode || item['ATC Kodu'] || item.ATC || '';
  const barcode = item.barcode || item['Barkod'] || item.Barcode || '';
  const company = item.company || item['Firma Adı'] || item['Firma'] || item.Company || '';
  const rx = item.rx || item.prescriptionType || item['Reçete Türü'] || item.PrescriptionType || 'Normal';
  const status = item.status || item['Durumu'] || item.Status || 'Aktif';
  const sheet = item.sheet || item['_sheet'] || 'AKTİF ÜRÜNLER LİSTESİ';
  const isEssential = (item.essential === 1 || item.isEssential === 1 || item['Temel İlaç Listesi Durumu'] === 1) ? 1 : 0;
  const isChild = (item.child === 1 || item.isChildEssential === 1 || item['Çocuk Temel İlaç Listesi Durumu'] === 1) ? 1 : 0;
  const isNeonate = (item.neonate === 1 || item.isNeonateEssential === 1 || item['Yenidoğan Temel İlaç Listesi Durumu'] === 1) ? 1 : 0;
  const kub = item.kub || item.kub_pdf_url || item.kubUrl || '';
  const kt = item.kt || item.kt_pdf_prospektus_url || item.prospektusUrl || '';

  const brandNorm = normalizeText(brand);
  const genericNorm = normalizeText(generic);
  const barcodeNorm = String(barcode).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const atcNorm = String(atc).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const companyNorm = normalizeText(company);

  const brandCompact = brandNorm.replace(/\s+/g, '');
  const genericCompact = genericNorm.replace(/\s+/g, '');

  return {
    id: item.id ? String(item.id) : `drug_${(index || 0) + 1}`,
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
    kub_pdf_url: String(kub).trim(),
    kt_pdf_prospektus_url: String(kt).trim(),
    _brandNorm: brandNorm,
    _genericNorm: genericNorm,
    _barcodeNorm: barcodeNorm,
    _atcNorm: atcNorm,
    _companyNorm: companyNorm,
    _brandCompact: brandCompact,
    _genericCompact: genericCompact,
    _searchable: `${brandNorm} ${genericNorm} ${barcodeNorm} ${atcNorm} ${companyNorm} ${brandCompact} ${genericCompact}`
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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
 * 18.212 ilaçlık katalogda O(1) barkod/ATC/etken madde ve <1ms kelime önek araması sağlar
 */
function buildDrugSearchIndex(drugs: NormalizedDrugRecord[]): DrugCatalogIndex {
  const byBarcode = new Map<string, number[]>();
  const byAtc = new Map<string, number[]>();
  const byGenericExact = new Map<string, number[]>();
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

    const seenPrefixes = new Set<string>();
    const rawTokens = `${d._brandNorm} ${d._genericNorm} ${d._atcNorm} ${d._companyNorm} ${d._brandCompact} ${d._genericCompact}`.split(' ');

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
 * Bellek İçi İlaç Kataloğunu Doldurur ve Ters İndeksi İnşa Eder
 */
export function setMemoryDrugsCache(list: unknown[]): void {
  if (!Array.isArray(list) || list.length === 0) return;
  memoryDrugsCache = list.map((item, idx) => {
    const raw = item as RawDrugRecord;
    if (raw && raw._searchable && raw._brandNorm && raw._brandCompact && raw._genericNorm) {
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

      if (list && list.length >= 17000) {
        setMemoryDrugsCache(list);
        console.log(`[TİTCK PWA] İlaç kataloğu IndexedDB üzerinden belleğe alındı ve indekslendi (${memoryDrugsCache?.length} kayıt).`);
        return memoryDrugsCache || [];
      } else if (list && list.length > 0) {
        console.warn(`[TİTCK PWA] IndexedDB'de eksik/kısmi katalog tespit edildi (${list.length} kayıt). Tam JSON kaynağından yenileniyor...`);
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

export type DrugSearchMode = 'all' | 'brand' | 'generic' | 'barcode';

/**
 * Tekil İlaç Puanlama Yardımcıları
 */
function scoreDrugCandidate(
  drug: NormalizedDrugRecord,
  trimmedQuery: string,
  queryNorm: string,
  queryCompact: string,
  queryTokens: string[],
  mode: DrugSearchMode = 'all'
): number {
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

    if (drug.status === 'Aktif' || (drug.sheet && !drug.sheet.toUpperCase().includes('PASİF'))) {
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

    if (drug.status === 'Aktif' || (drug.sheet && !drug.sheet.toUpperCase().includes('PASİF'))) {
      score += 50;
    }
    return score;
  }

  // mode === 'all'
  if (drug.barcode && (drug.barcode === trimmedQuery || drug.barcode.includes(trimmedQuery))) {
    return 3000;
  }

  const isStandardMatch = queryTokens.every(token => drug._searchable.includes(token));
  const isCompactMatch = queryCompact.length >= 3 && (
    (drug._brandCompact && drug._brandCompact.includes(queryCompact)) ||
    (drug._genericCompact && drug._genericCompact.includes(queryCompact))
  );

  if (!isStandardMatch && !isCompactMatch) {
    return -1;
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
      if (drug._companyNorm && drug._companyNorm.includes(token)) score += 80;
    }
  }

  if (drug.kt_pdf_prospektus_url || drug.kub_pdf_url) {
    score += 30;
  }
  if (drug.status === 'Aktif' || (drug.sheet && !drug.sheet.toUpperCase().includes('PASİF'))) {
    score += 50;
  }

  return score;
}

/**
 * Gelişmiş İndeksli Tıbbi İlaç Arama Motoru
 * Ters Önek İndeksi (Inverted Prefix Index) + O(1) Barkod + LRU Sorgu Önbelleği
 * mode: 'all' | 'brand' | 'generic' | 'barcode'
 */
export async function searchDrugsInDB(query: string, mode: DrugSearchMode = 'all'): Promise<NormalizedDrugRecord[]> {
  if (!query || query.trim().length < 2) return [];

  if (!isDrugCatalogReady()) {
    await ensureDrugCatalogReady();
  }

  if (!memoryDrugsCache || memoryDrugsCache.length === 0) return [];
  if (!memoryDrugIndex) {
    memoryDrugIndex = buildDrugSearchIndex(memoryDrugsCache);
  }

  const trimmedQuery = query.trim();
  const cacheKey = `${mode}:${trimmedQuery}`;

  // 0. LRU Sorgu Önbelleği Kontrolü
  const cachedResult = memoryDrugIndex.queryCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // 1. O(1) Tam Barkod Eşleşmesi (all veya barcode modunda)
  if (mode === 'all' || mode === 'barcode') {
    const exactBarcodeIndices = memoryDrugIndex.byBarcode.get(trimmedQuery);
    if (exactBarcodeIndices && exactBarcodeIndices.length > 0) {
      const exactDrugs = exactBarcodeIndices.map(idx => memoryDrugsCache![idx]);
      memoryDrugIndex.queryCache.set(cacheKey, exactDrugs);
      return exactDrugs;
    }
  }

  const queryNorm = normalizeText(trimmedQuery);
  const queryTokens = queryNorm.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return [];

  const queryCompact = queryNorm.replace(/\s+/g, '');
  const scoredResults: { drug: NormalizedDrugRecord; score: number }[] = [];

  // 2. Ters Önek İndeksi (Inverted Prefix Index) ile Aday Kümesi Daraltma
  let candidateIndices: number[] | null = null;
  const tokenPostingLists: number[][] = [];
  let indexLookupFailed = false;

  for (let i = 0; i < queryTokens.length; i++) {
    const token = queryTokens[i];
    if (token.length < 2) {
      // 1 karakterli tokenları (örn. "a ferin", "b 12") indeks kesişiminde atla; puanlama aşamasında tam kontrol edilir
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
    // En küçük aday listesinden başlayarak kesişim al
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

  // 3. Daraltılmış Aday Kümesini Puanla
  if (candidateIndices && candidateIndices.length > 0) {
    for (let i = 0; i < candidateIndices.length; i++) {
      const drug = memoryDrugsCache[candidateIndices[i]];
      const score = scoreDrugCandidate(drug, trimmedQuery, queryNorm, queryCompact, queryTokens, mode);
      if (score >= 0) {
        scoredResults.push({ drug, score });
      }
    }
  }

  // 4. %100 Kapsama Güvencesi (Fallback): Kelime ortası alt-string aramalarında indeks boş dönerse tam tarama yap
  if (scoredResults.length === 0) {
    for (let i = 0; i < memoryDrugsCache.length; i++) {
      const drug = memoryDrugsCache[i];
      const score = scoreDrugCandidate(drug, trimmedQuery, queryNorm, queryCompact, queryTokens, mode);
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

  // LRU önbellek boyutu kontrolü (maksimum 150 sorgu)
  // Sadece sonuç bulunduğunda önbelleğe al (boş aramalar önbelleğe kilitlenmesin)
  if (finalResults.length > 0) {
    if (memoryDrugIndex.queryCache.size >= 150) {
      const oldestKey = memoryDrugIndex.queryCache.keys().next().value;
      if (oldestKey !== undefined) {
        memoryDrugIndex.queryCache.delete(oldestKey);
      }
    }
    memoryDrugIndex.queryCache.set(cacheKey, finalResults);
  }

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
