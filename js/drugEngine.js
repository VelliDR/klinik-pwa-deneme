import { initDB, normalizeText } from './db.js';

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
 * 2. EŞDEĞER / MUADİL İLAÇ BULUCU (ATC Kodu + Etken Madde Hibrit Taraması)
 */
export async function findEquivalents(selectedDrug) {
    if (!selectedDrug) return [];

    const targetAtc = selectedDrug.atcCode ? normalizeText(selectedDrug.atcCode) : '';
    const targetGeneric = selectedDrug.generic ? normalizeText(selectedDrug.generic) : '';
    const currentId = String(selectedDrug.id);

    // Hem ATC Kodu hem Etken Madde eksikse muadil aranamaz
    if (!targetAtc && (!targetGeneric || targetGeneric === 'belirtilmedi')) {
        return [];
    }

    try {
        const db = await initDB();
        
        // Bütün ilaçları çekip hafızada esnek filtreleme yapıyoruz
        const allDrugs = await new Promise((resolve) => {
            const tx = db.transaction('drugs', 'readonly');
            const store = tx.objectStore('drugs');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });

        return allDrugs.filter(d => {
            // 1. Kendisini listeden çıkar
            if (String(d.id) === currentId) return false;

            // 2. Pasif/İptal ürünleri çıkar
            if (d.sheet && d.sheet.toUpperCase().includes('PASİF')) return false;

            const dAtc = d.atcCode ? normalizeText(d.atcCode) : '';
            const dGeneric = d.generic ? normalizeText(d.generic) : '';

            // Kriter A: ATC Kodu birebir eşleşiyorsa
            if (targetAtc && dAtc && targetAtc === dAtc) {
                return true;
            }

            // Kriter B: Etken Madde (Generic) adı eşleşiyorsa
            if (targetGeneric && targetGeneric !== 'belirtilmedi' && dGeneric && dGeneric !== 'belirtilmedi') {
                if (dGeneric === targetGeneric || dGeneric.includes(targetGeneric) || targetGeneric.includes(dGeneric)) {
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