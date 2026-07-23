/**
 * INDEXEDDB STORAGE ENGINE (In-Memory Cache & TİTCK Uyumlu)
 */

const DB_NAME = 'KlinikAsistanDB';
const DB_VERSION = 10; // Versiyon artırıldı, eski bozuk veriler otomatik silinecek
const STORE_NAME = 'drugs';

let memoryDrugsCache = null; // Bellek içi hızlı arama önbelleği

export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            // Eski bozuk tablo kalıntılarını tamamen temizle
            if (db.objectStoreNames.contains(STORE_NAME)) {
                db.deleteObjectStore(STORE_NAME);
            }
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

            // Hızlı Arama İndeksleri
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
    let drugArray = rawDrugList;
    if (!Array.isArray(rawDrugList)) {
        drugArray = Object.values(rawDrugList).find(val => Array.isArray(val)) || [];
    }

    if (drugArray.length === 0) {
        console.error("❌ HATA: medicines.json içinde geçerli bir ilaç dizisi bulunamadı!");
        return;
    }

    const db = await initDB();
    memoryDrugsCache = null; // Yeni veri yüklenirken önbelleği sıfırla

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

    function findVal(obj, possibleKeys) {
        const keys = Object.keys(obj);
        for (const pk of possibleKeys) {
            const cleanPk = normalizeKey(pk);
            const foundKey = keys.find(k => normalizeKey(k) === cleanPk);
            if (foundKey !== undefined && obj[foundKey] !== null) {
                return obj[foundKey];
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
                const brandName = findVal(item, ["İlaç Adı", "ilac adi", "İLAÇ ADI", "Brand"]);
                const genericName = findVal(item, ["ATC Adı", "atc adi", "ATC ADI", "Generic"]) || "Belirtilmedi";
                const atcVal = findVal(item, ["ATC Kodu", "atc kodu", "AtcCode"]);
                const barcodeVal = findVal(item, ["Barkod", "barkod", "Barcode"]);
                const rxType = String(findVal(item, ["Reçete Türü", "recete turu", "PrescriptionType"]) || "Normal").trim();
                const statusVal = findVal(item, ["Durumu", "durumu", "Status"]) || "Aktif";
                const sheetVal = findVal(item, ["_sheet", "sheet"]) || "AKTİF ÜRÜNLER LİSTESİ";
                
                const childEssential = findVal(item, ["Çocuk Temel İlaç Listesi Durumu", "Çocuk Temel İlaç\r\nListesi Durumu", "isChildEssential"]) || 0;
                const neonateEssential = findVal(item, ["Yenidoğan Temel İlaç Listesi Durumu", "Yenidoğan\r\nTemel İlaç\r\nListesi Durumu", "isNeonateEssential"]) || 0;

                const normalizedDrug = {
                    id: item.id || barcodeVal || (processed + index + 1),
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

function normalizeText(text) {
    if (!text) return '';
    return String(text)
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function searchDrugsInDB(query) {
    if (!query || query.trim().length < 2) return [];

    const db = await initDB();

    // Bellek içi önbellek kontrolü
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
        const searchableText = `${brandNorm} ${genericNorm} ${drug.barcode || ''} ${drug.atcCode || ''} ${drug.prescriptionType}`;

        const isMatch = queryTokens.every(token => searchableText.includes(token));
        
        if (isMatch) {
            let score = 0;
            
            if (brandNorm === queryNorm) {
                score += 100;
            } else if (brandNorm.startsWith(queryNorm)) {
                score += 70;
            } else if (brandNorm.includes(queryNorm)) {
                score += 50;
            } else if (genericNorm.includes(queryNorm)) {
                score += 30;
            } else {
                score += 5;
            }

            scoredResults.push({ drug, score });
        }
    }

    // Önce puana göre, puanlar aynıysa marka adına göre alfabetik sırala (C > R)
    scoredResults.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.drug.brand.localeCompare(b.drug.brand, 'tr');
    });
    
    // Limiti 40 yaparak tüm muadillerin rahatça sığmasını sağlıyoruz
    return scoredResults.slice(0, 40).map(item => item.drug);
}