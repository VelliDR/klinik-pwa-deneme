import { initDB, normalizeText } from './db/titckIndexedDB.js';

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

    const targetAtc = (selectedDrug.atcCode || selectedDrug.atc) ? normalizeText(selectedDrug.atcCode || selectedDrug.atc) : '';
    const targetGeneric = (selectedDrug.generic) ? normalizeText(selectedDrug.generic) : '';
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
            if ((d.status && d.status.toLowerCase().includes('pasif')) || (d.sheet && d.sheet.toUpperCase().includes('PASİF'))) return false;

            const dAtc = (d.atcCode || d.atc) ? normalizeText(d.atcCode || d.atc) : '';
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
    const rx = (drug.prescriptionType || drug.rx || '').trim();
    if (rx === 'Kırmızı') {
        badges.push('<span class="bg-red-950 text-red-300 border border-red-700 px-1.5 py-0.5 rounded text-[10px]">🔴 Kırmızı Reçete</span>');
    } else if (rx === 'Yeşil') {
        badges.push('<span class="bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded text-[10px]">🟢 Yeşil Reçete</span>');
    } else if (rx === 'Mor' || rx === 'Turuncu') {
        badges.push('<span class="bg-purple-950 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded text-[10px]">🟣 Özellikli Reçete</span>');
    }

    // Pasif / İptal Kontrolü
    const isPassive = (drug.status && drug.status.toLowerCase().includes('pasif')) || (drug.sheet && drug.sheet.toUpperCase().includes('PASİF'));
    if (isPassive) {
        badges.push('<span class="bg-amber-950 text-amber-300 border border-amber-600 px-1.5 py-0.5 rounded text-[10px]">⚠️ Pasif / İptal</span>');
    }

    // Temel İlaç Rozeti
    const isEssential = Number(drug.isEssential) === 1 || Number(drug.essential) === 1;
    if (isEssential) {
        badges.push('<span class="bg-indigo-950 text-indigo-300 border border-indigo-700 px-1.5 py-0.5 rounded text-[10px]">⭐ Temel İlaç</span>');
    }

    // Çocuk / Yenidoğan Temel İlaç Rozetleri & Formülasyon Tespiti
    const isChildFlag = Number(drug.isChildEssential) === 1 || Number(drug.child) === 1 || drug.isChildEssential === true;
    const isNeonateFlag = Number(drug.isNeonateEssential) === 1 || Number(drug.neonate) === 1 || drug.isNeonateEssential === true;

    const textSearch = ((drug.brand || '') + ' ' + (drug.generic || '') + ' ' + (drug.form || '')).toLowerCase();
    const isPediatricForm = textSearch.includes('pediatrik') || textSearch.includes('çocuk') || textSearch.includes('şurup') || textSearch.includes('süspansiyon') || textSearch.includes('damla') || textSearch.includes('pediatric');

    if (isChildFlag || isPediatricForm) {
        badges.push('<span class="bg-blue-950 text-blue-300 border border-blue-700 px-1.5 py-0.5 rounded text-[10px]">👶 Pediatrik</span>');
    }
    if (isNeonateFlag) {
        badges.push('<span class="bg-teal-950 text-teal-300 border border-teal-700 px-1.5 py-0.5 rounded text-[10px]">🍼 Yenidoğan</span>');
    }

    // Prospektüs / KÜB Belge Rozeti
    const hasKt = Boolean(drug.kt_pdf_prospektus_url || drug.kt);
    const hasKub = Boolean(drug.kub_pdf_url || drug.kub);
    if (hasKt || hasKub) {
        badges.push('<span class="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-1.5 py-0.5 rounded text-[10px] font-medium">📑 Prospektüs/KÜB</span>');
    }

    return badges.join(' ');
}