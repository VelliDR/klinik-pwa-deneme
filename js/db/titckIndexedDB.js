/**
 * INDEXEDDB STORAGE ENGINE (Gelişmiş Tıbbi Arama ve Tam TİTCK Uyumlu)
 * KÜB, KT (Prospektüs) ve Firma Bilgileri Destekli
 */

const DB_NAME = 'KlinikAsistanDB';
const DB_VERSION = 18;
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
            store.createIndex('company', 'company', { unique: false });
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
        console.error("❌ HATA: İlaç listesi içinde geçerli bir veri dizisi bulunamadı!");
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

    // Geliştirilmiş Akıllı Sütun Bulucu (Önce Doğrudan Özellik, Sonra Tam Eşleşme, Sonra İçerme)
    function findVal(obj, possibleKeys) {
        // Hızlı doğrudan arama (O(1))
        for (const pk of possibleKeys) {
            if (obj[pk] !== undefined && obj[pk] !== null && obj[pk] !== "") {
                return obj[pk];
            }
        }

        const keys = Object.keys(obj);
        
        // 1. Aşama: Normalleştirilmiş Tam Eşleşme
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
                const brandName = item.brand || findVal(item, [
                    "İlaç Adı", "ilac adi", "İLAÇ ADI", "ILAC ADI", 
                    "Ürün Adı", "urun adi", "ÜRÜN ADI", 
                    "İlaç Ticari Adı", "Ticari Ad", "Brand", "ILAC", "NAME", "DRUG_NAME"
                ]);

                const genericName = item.generic || findVal(item, [
                    "Etkin Madde", "Etken Madde", "ETKİN MADDE", "ETKEN MADDE", 
                    "Etkin Madde Adı", "Etken Madde Adı", 
                    "ATC Adı", "atc adi", "ATC ADI", "Generic", "ATC_ADI", "ETKEN_MADDE", "ETKİN_MADDE"
                ]) || "Belirtilmedi";

                const atcVal = item.atc || item.atcCode || findVal(item, ["ATC Kodu", "atc kodu", "ATC KODU", "AtcCode", "ATC_KODU", "ATC"]);
                const barcodeVal = item.barcode || findVal(item, ["Barkod", "barkod", "BARKOD", "Barcode", "BARCODE"]);
                const companyVal = item.company || findVal(item, ["Firma Adı", "firma adi", "FİRMA ADI", "Firma", "Company", "FİRMA"]);
                const rxType = String(item.rx || item.prescriptionType || findVal(item, ["Reçete Türü", "Reçete \nTürü", "recete turu", "REÇETE TÜRÜ", "PrescriptionType"]) || "Normal").trim();
                const statusVal = item.status || findVal(item, ["Durumu", "durumu", "Status"]) || "Aktif";
                const sheetVal = item.sheet || findVal(item, ["_sheet", "sheet"]) || "AKTİF ÜRÜNLER LİSTESİ";
                
                const essentialVal = item.essential !== undefined ? item.essential : findVal(item, ["Temel İlaç Listesi Durumu", "isEssential"]);
                const childEssential = item.child !== undefined ? item.child : findVal(item, ["Çocuk Temel İlaç Listesi Durumu", "Çocuk Temel İlaç\nListesi Durumu", "Çocuk Temel İlaç\r\nListesi Durumu", "isChildEssential"]);
                const neonateEssential = item.neonate !== undefined ? item.neonate : findVal(item, ["Yenidoğan Temel İlaç Listesi Durumu", "Yenidoğan\nTemel İlaç\nListesi Durumu", "Yenidoğan\r\nTemel İlaç\r\nListesi Durumu", "isNeonateEssential"]);

                // KÜB ve Prospektüs (KT) linkleri
                const kubVal = item.kub || item.kub_pdf_url || item.kubUrl || "";
                const ktVal = item.kt || item.kt_pdf_prospektus_url || item.prospektusUrl || "";

                const globalUniqueId = `drug_${processed + index + 1}`;

                const normalizedDrug = {
                    id: globalUniqueId, 
                    originalId: item.id || null,
                    brand: String(brandName).trim(),
                    generic: String(genericName).trim(),
                    atcCode: String(atcVal).trim(),
                    barcode: String(barcodeVal).trim(),
                    company: String(companyVal).trim(),
                    prescriptionType: rxType,
                    status: String(statusVal).trim(),
                    sheet: String(sheetVal).trim(),
                    isEssential: Number(essentialVal) === 1 ? 1 : 0,
                    isChildEssential: Number(childEssential) === 1 ? 1 : 0,
                    isNeonateEssential: Number(neonateEssential) === 1 ? 1 : 0,
                    kub_pdf_url: String(kubVal).trim(),
                    kt_pdf_prospektus_url: String(ktVal).trim()
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
            request.onsuccess = () => {
                const list = request.result || [];
                // Ön-normalizasyon: Her arama tuşlamasında 18.000 defa regex çalıştırmayı önler
                list.forEach(drug => {
                    drug._brandNorm = normalizeText(drug.brand);
                    drug._genericNorm = normalizeText(drug.generic);
                    drug._barcodeNorm = normalizeText(drug.barcode);
                    drug._atcNorm = normalizeText(drug.atcCode);
                    drug._companyNorm = normalizeText(drug.company);
                    drug._searchable = `${drug._brandNorm} ${drug._genericNorm} ${drug._barcodeNorm} ${drug._atcNorm} ${drug._companyNorm}`;
                });
                resolve(list);
            };
            request.onerror = () => reject(request.error);
        });
    }

    const trimmedQuery = query.trim();
    const queryNorm = normalizeText(trimmedQuery);
    const queryTokens = queryNorm.split(' ').filter(Boolean);
    if (queryTokens.length === 0) return [];

    const scoredResults = [];

    for (const drug of memoryDrugsCache) {
        // Birebir Barkod Eşleşmesi (Barkod okuyucu veya tam kod)
        if (drug.barcode && drug.barcode === trimmedQuery) {
            scoredResults.push({ drug, score: 2000 });
            continue;
        }

        // Sorgudaki TÜM kelimelerin varlığı kontrol ediliyor
        const isMatch = queryTokens.every(token => drug._searchable.includes(token));
        
        if (isMatch) {
            let score = 0;
            
            // 1. Tam veya Başlayan Marka Eşleşmesi
            if (drug._brandNorm === queryNorm) {
                score += 1000;
            } else if (drug._brandNorm.startsWith(queryNorm)) {
                score += 700;
            } else if (drug._brandNorm.includes(queryNorm)) {
                score += 500;
            } else {
                // Kümülatif (Toplanabilir) Kelime Puanlaması
                queryTokens.forEach(token => {
                    if (drug._brandNorm.includes(token)) score += 150;
                    if (drug._genericNorm.includes(token)) score += 120;
                    if (drug._companyNorm.includes(token)) score += 90;
                    if (drug._atcNorm.includes(token)) score += 80;
                });
            }

            // Resmi Prospektüs / KÜB PDF dokümanı olan ürünlere hafif öncelik
            if (drug.kt_pdf_prospektus_url || drug.kub_pdf_url) {
                score += 30;
            }

            // Aktif ürünlere öncelik bonusu
            if (drug.status === 'Aktif' || (drug.sheet && !drug.sheet.toUpperCase().includes('PASİF'))) {
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