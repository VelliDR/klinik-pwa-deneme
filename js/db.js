/**
 * INDEXEDDB STORAGE ENGINE (Gelişmiş Tıbbi Arama ve Tam TİTCK Uyumlu)
 */

const DB_NAME = 'KlinikAsistanDB';
const DB_VERSION = 10;
const STORE_NAME = 'drugs';

let memoryDrugsCache = null; // Bellek içi arama önbelleği

/**
 * Tıbbi Fonetik Normalizasyon Fonksiyonu
 */
export function normalizeText(text) {
    if (!text) return '';
    return String(text)
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
        // Tıbbi Fonetik Dönüşüm (İngilizce Latince / Türkçe Çevrimi)
        .replace(/ph/g, 'f')
        .replace(/th/g, 't')
        .replace(/y/g, 'i')
        // Bitişik yazılan sayı ve birimleri ayırır (18mg -> 18 mg, 5ml -> 5 ml)
        .replace(/(\d+)(mg|ml|mcg|g|l|iu|ui|amp|tb|kapsul)/gi, '$1 $2')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (db.objectStoreNames.contains(STORE_NAME)) {
                db.deleteObjectStore(STORE_NAME);
            }
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

            store.createIndex('brand', 'brand', { unique: false });
            store.createIndex('generic', 'generic', { unique: false });
            store.createIndex('barcode', 'barcode', { unique: false });
            store.createIndex('atcCode', 'atcCode', { unique: false });
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function seedDrugDatabase(rawDrugList, progressCallback) {
    let drugArray = [];
    if (Array.isArray(rawDrugList)) {
        drugArray = rawDrugList;
    } else if (typeof rawDrugList === 'object' && rawDrugList !== null) {
        drugArray = Object.values(rawDrugList)
            .filter(val => Array.isArray(val))
            .flat();
    }

    if (drugArray.length === 0) {
        console.error("❌ HATA: medicines.json içinde geçerli bir ilaç dizisi bulunamadı!");
        return;
    }

    const db = await initDB();
    memoryDrugsCache = null;

    const CHUNK_SIZE = 1000;
    let processed = 0;

    function normalizeKey(str) {
        if (!str) return '';
        return String(str)
            .replace(/İ/g, 'i')
            .replace(/I/g, 'ı')
            .toLocaleLowerCase('tr-TR')
            .replace(/[^a-z0-9]/g, '');
    }

    // Geliştirilmiş Akıllı Sütun Bulucu (Önce Tam Eşleşme, Sonra İçerme)
    function findVal(obj, possibleKeys) {
        const keys = Object.keys(obj);
        
        // 1. Aşama: Tam Eşleşme Kontrolü (Hata riskini sıfırlar)
        for (const pk of possibleKeys) {
            const cleanPk = normalizeKey(pk);
            const exactKey = keys.find(k => normalizeKey(k) === cleanPk);
            if (exactKey !== undefined && obj[exactKey] !== null && obj[exactKey] !== "") {
                return obj[exactKey];
            }
        }

        // 2. Aşama: Esnek İçerme Kontrolü
        for (const pk of possibleKeys) {
            const cleanPk = normalizeKey(pk);
            const containsKey = keys.find(k => normalizeKey(k).includes(cleanPk));
            if (containsKey !== undefined && obj[containsKey] !== null && obj[containsKey] !== "") {
                return obj[containsKey];
            }
        }
        return "";
    }

    for (let i = 0; i < drugArray.length; i += CHUNK_SIZE) {
        const chunk = drugArray.slice(i, i + CHUNK_SIZE);

        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            chunk.forEach((item, index) => {
                const brandName = findVal(item, [
                    "İlaç Adı", "ilac adi", "İLAÇ ADI", "ILAC ADI", 
                    "Ürün Adı", "urun adi", "ÜRÜN ADI", 
                    "İlaç Ticari Adı", "Ticari Ad", "Brand", "ILAC", "NAME", "DRUG_NAME"
                ]);

                // Etken Madde Sütun Başlıkları Genişletildi
                const genericName = findVal(item, [
                    "Etkin Madde", "Etken Madde", "ETKİN MADDE", "ETKEN MADDE", 
                    "Etkin Madde Adı", "Etken Madde Adı", 
                    "ATC Adı", "atc adi", "ATC ADI", "Generic", "ATC_ADI", "ETKEN_MADDE", "ETKİN_MADDE"
                ]) || "Belirtilmedi";

                const atcVal = findVal(item, ["ATC Kodu", "atc kodu", "ATC KODU", "AtcCode", "ATC_KODU", "ATC"]);
                const barcodeVal = findVal(item, ["Barkod", "barkod", "BARKOD", "Barcode", "BARCODE"]);
                const rxType = String(findVal(item, ["Reçete Türü", "recete turu", "REÇETE TÜRÜ", "PrescriptionType"]) || "Normal").trim();
                const statusVal = findVal(item, ["Durumu", "durumu", "Status"]) || "Aktif";
                const sheetVal = findVal(item, ["_sheet", "sheet"]) || "AKTİF ÜRÜNLER LİSTESİ";
                
                const childEssential = findVal(item, ["Çocuk Temel İlaç Listesi Durumu", "isChildEssential"]) || 0;
                const neonateEssential = findVal(item, ["Yenidoğan Temel İlaç Listesi Durumu", "isNeonateEssential"]) || 0;

                const globalUniqueId = `drug_${processed + index + 1}`;

                const normalizedDrug = {
                    id: globalUniqueId, 
                    originalId: item.id || null,
                    brand: String(brandName).trim(),
                    generic: String(genericName).trim(),
                    atcCode: String(atcVal).trim(),
                    barcode: String(barcodeVal).trim(),
                    prescriptionType: rxType,
                    status: String(statusVal).trim(),
                    sheet: String(sheetVal).trim(),
                    isChildEssential: childEssential,
                    isNeonateEssential: neonateEssential
                };

                store.put(normalizedDrug);
            });

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });

        processed += chunk.length;
        if (progressCallback) {
            progressCallback(Math.round((processed / drugArray.length) * 100));
        }
    }
}

export async function searchDrugsInDB(query) {
    if (!query || query.trim().length < 2) return [];

    const db = await initDB();

    if (!memoryDrugsCache) {
        memoryDrugsCache = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    const queryNorm = normalizeText(query);
    const queryTokens = queryNorm.split(' ').filter(Boolean);
    if (queryTokens.length === 0) return [];

    const scoredResults = [];

    for (const drug of memoryDrugsCache) {
        const brandNorm = normalizeText(drug.brand);
        const genericNorm = normalizeText(drug.generic);
        const barcodeNorm = normalizeText(drug.barcode);
        const atcNorm = normalizeText(drug.atcCode);
        const rxNorm = normalizeText(drug.prescriptionType);

        const searchableText = `${brandNorm} ${genericNorm} ${barcodeNorm} ${atcNorm} ${rxNorm}`;

        // Sorgudaki TÜM kelimelerin varlığı kontrol ediliyor
        const isMatch = queryTokens.every(token => searchableText.includes(token));
        
        if (isMatch) {
            let score = 0;
            
            // 1. Tam veya Başlayan Marka Eşleşmesi
            if (brandNorm === queryNorm) {
                score += 1000;
            } else if (brandNorm.startsWith(queryNorm)) {
                score += 700;
            } else if (brandNorm.includes(queryNorm)) {
                score += 500;
            } else {
                // Kümülatif (Toplanabilir) Kelime Puanlaması
                queryTokens.forEach(token => {
                    if (brandNorm.includes(token)) score += 150;
                    if (genericNorm.includes(token)) score += 100;
                    if (atcNorm.includes(token)) score += 80;
                });
            }

            // Aktif ürünlere öncelik bonusu
            if (drug.sheet && !drug.sheet.toUpperCase().includes('PASİF')) {
                score += 50;
            }

            scoredResults.push({ drug, score });
        }
    }

    // Sıralama: Önce yüksek puan, eşitse alfabetik
    scoredResults.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.drug.brand.localeCompare(b.drug.brand, 'tr');
    });
    
    return scoredResults.slice(0, 40).map(item => item.drug);
}

export async function getDrugCount() {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
    });
}