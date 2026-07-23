import { initDB } from './db.js';

/**
 * 1. REGEX İLE DOZ VE KONSANTRASYON PARSER'I
 */
export function parseDrugStrength(brandName) {
    if (!brandName) return null;

    const liquidMatch = brandName.match(/(\d+(?:[.,]\d+)?)\s*mg\s*\/\s*(\d+(?:[.,]\d+)?)\s*ml/i);
    if (liquidMatch) {
        const mg = parseFloat(liquidMatch[1].replace(',', '.'));
        const ml = parseFloat(liquidMatch[2].replace(',', '.'));
        const concentration = mg / ml;
        return {
            type: 'liquid',
            mgPerMl: concentration,
            label: `${mg} mg / ${ml} ml (${concentration.toFixed(1)} mg/ml)`
        };
    }

    const solidMatch = brandName.match(/(\d+(?:[.,]\d+)?)\s*mg/i);
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
 * 2. EŞDEĞER / MUADİL İLAÇ BULUCU (ATC Kodu İle)
 */
export async function findEquivalents(atcCode, currentDrugId) {
    if (!atcCode || atcCode === 'Belirtilmedi') return [];

    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction('drugs', 'readonly');
        const store = tx.objectStore('drugs');
        const index = store.index('atcCode');
        const request = index.getAll(atcCode);

        request.onsuccess = () => {
            const matches = request.result || [];
            
            const equivalents = matches.filter(d => {
                const isSelf = String(d.id) === String(currentDrugId);
                const isPassiveSheet = d.sheet && d.sheet.toUpperCase().includes('PASİF');
                return !isSelf && !isPassiveSheet;
            });
            
            resolve(equivalents.slice(0, 8));
        };
        
        request.onerror = () => resolve([]);
    });
}

/**
 * 3. TEMEL İLAÇ VE ROZET ÜRETİCİ (Eksik Olan Fonksiyon Geri Eklendi)
 */
export function getDrugBadgesHTML(drug) {
    const badges = [];

    // Reçete Türü Rozeti
    if (drug.prescriptionType === 'Kırmızı') {
        badges.push('<span class="bg-red-950 text-red-300 border border-red-700 px-1.5 py-0.5 rounded text-[10px]">🔴 Kırmızı Reçete</span>');
    } else if (drug.prescriptionType === 'Yeşil') {
        badges.push('<span class="bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded text-[10px]">🟢 Yeşil Reçete</span>');
    } else if (drug.prescriptionType === 'Mor' || drug.prescriptionType === 'Turuncu') {
        badges.push('<span class="bg-purple-950 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded text-[10px]">🟣 Özellikli Reçete</span>');
    } else if (drug.prescriptionType === 'Normal') {
        badges.push('<span class="bg-slate-800 text-slate-300 border border-slate-600 px-1.5 py-0.5 rounded text-[10px]">Normal Reçete</span>');
    }

    // Pasif / İptal Kontrolü
    if (drug.sheet && drug.sheet.toUpperCase().includes('PASİF')) {
        badges.push('<span class="bg-amber-950 text-amber-300 border border-amber-600 px-1.5 py-0.5 rounded text-[10px]">⚠️ Pasif / İptal</span>');
    }

    // Çocuk / Yenidoğan Temel İlaç Rozetleri
    if (drug.isChildEssential == 1) {
        badges.push('<span class="bg-blue-950 text-blue-300 border border-blue-700 px-1.5 py-0.5 rounded text-[10px]">👶 Pediatrik Temel</span>');
    }
    if (drug.isNeonateEssential == 1) {
        badges.push('<span class="bg-teal-950 text-teal-300 border border-teal-700 px-1.5 py-0.5 rounded text-[10px]">🍼 Yenidoğan Temel</span>');
    }

    return badges.join(' ');
}