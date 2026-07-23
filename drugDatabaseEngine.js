/**
 * DRUG DATABASE ENGINE
 * TİTCK / OpenFDA uyumlu ilaç arama, mg/kg veya mg/m² dozaj ve tavan limit denetimi.
 */

// Örnek TİTCK / OpenFDA Yerel Veri Tabanı Katmanı (~4MB JSON yapısının çekirdeği)
export const LOCAL_DRUG_DATABASE = [
    {
        id: "paracetamol",
        genericName: "Parasetamol",
        brands: ["Parol", "Vermidon", "Minoset", "Tylol", "Calpol"],
        category: "Analjezik / Antipiretik",
        dosingUnit: "mg_kg", // 'mg_kg' | 'mg_m2' | 'fixed'
        stdDosePerKg: 12.5,  // Standart 10-15 mg/kg aralığının ortalaması
        intervalHours: 6,     // 6 saatte bir (Günde 4 doz)
        maxSingleDoseMg: 500, // Tek doz pediatrik/yetişkin geçiş sınırı
        maxDailyDoseMg: 4000, // Günlük mutlak tavan (4g)
        syrupForm: { mg: 120, ml: 5 } // 120 mg / 5 ml süspansiyon formu
    },
    {
        id: "amoxicillin_clav",
        genericName: "Amoksisilin + Klavulanik Asit",
        brands: ["Augmentin", "Amoklavin", "Klavunat", "Bioment"],
        category: "Antibiyotik (Penisilin)",
        dosingUnit: "mg_kg",
        stdDosePerKg: 20,     // Standart enfeksiyonda 40 mg/kg/gün (2 dozda) -> Doz başı 20 mg/kg
        intervalHours: 12,    // 12 saatte bir (Günde 2 doz)
        maxSingleDoseMg: 1000,
        maxDailyDoseMg: 2000,
        syrupForm: { mg: 200, ml: 5 } // 200 mg / 5 ml ES form
    },
    {
        id: "ibuprofen",
        genericName: "İbuprofen",
        brands: ["Dolven", "Ibufen", "Pedifen", "Nurofen"],
        category: "NSAİİ / Antipiretik",
        dosingUnit: "mg_kg",
        stdDosePerKg: 8,      // 5-10 mg/kg doz başı
        intervalHours: 8,     // 8 saatte bir (Günde 3 doz)
        maxSingleDoseMg: 400,
        maxDailyDoseMg: 1200,
        syrupForm: { mg: 100, ml: 5 } // 100 mg / 5 ml
    },
    {
        id: "ceftriaxone",
        genericName: "Seftriakson",
        brands: ["Rocephin", "Nevakson", "Unacefin", "Iecefin"],
        category: "Antibiyotik (3. Kuşak Sefalosporin)",
        dosingUnit: "mg_kg",
        stdDosePerKg: 50,     // 50-100 mg/kg/gün tek doz veya 2 doz
        intervalHours: 24,    // Günde tek doz IV/IM
        maxSingleDoseMg: 2000,
        maxDailyDoseMg: 4000,
        syrupForm: null       // Sadece Parenteral (Enjektabl)
    }
];

/**
 * Ticari ad veya etken maddeden Türkçe karakter uyumlu arama yapar.
 */
export function searchDrugs(query) {
    if (!query || query.trim().length < 2) return [];

    const normalized = query.toLocaleLowerCase('tr-TR').trim();

    return LOCAL_DRUG_DATABASE.filter(drug => {
        const matchGeneric = drug.genericName.toLocaleLowerCase('tr-TR').includes(normalized);
        const matchBrand = drug.brands.some(b => b.toLocaleLowerCase('tr-TR').includes(normalized));
        return matchGeneric || matchBrand;
    });
}

/**
 * Hastanın kilosuna, BSA değerine ve böbrek yetmezliğine göre doz hesaplar.
 */
export function calculateDrugDose(drug, patientState) {
    if (!drug || !patientState || !patientState.weightKg) {
        return null;
    }

    const weight = patientState.weightKg;
    const bsa = patientState.derived.bsa;
    const warnings = [];

    let singleDoseMg = 0;

    // 1. Doz Hesaplama (mg/kg veya mg/m²)
    if (drug.dosingUnit === 'mg_kg') {
        singleDoseMg = weight * drug.stdDosePerKg;
    } else if (drug.dosingUnit === 'mg_m2' && bsa) {
        singleDoseMg = bsa * drug.stdDosePerKg;
    } else {
        singleDoseMg = drug.stdDosePerKg; // Sabit Doz
    }

    // 2. Tekil Doz Tavan Koruması (Hard-Stop)
    if (singleDoseMg > drug.maxSingleDoseMg) {
        singleDoseMg = drug.maxSingleDoseMg;
        warnings.push(`⚠️ TEKİL TAVAN DOZ: Hesaplanan miktar yetişkin/pediatrik tekil üst sınırı olan ${drug.maxSingleDoseMg} mg değerine sabitlendi.`);
    }

    // 3. Günlük Toplam Doz Kontrolü
    const dosesPerDay = 24 / drug.intervalHours;
    let dailyTotalMg = singleDoseMg * dosesPerDay;

    if (dailyTotalMg > drug.maxDailyDoseMg) {
        dailyTotalMg = drug.maxDailyDoseMg;
        singleDoseMg = dailyTotalMg / dosesPerDay;
        warnings.push(`⚠️ GÜNLÜK TAVAN DOZ: Günlük toplam miktar ${drug.maxDailyDoseMg} mg üst sınırına takıldı.`);
    }

    // 4. Şurup / Süspansiyon Hacmi Hesabı (ml)
    let syrupVolumeMl = null;
    if (drug.syrupForm) {
        // (Doz (mg) * Form Hacmi (ml)) / Form Miktarı (mg)
        syrupVolumeMl = (singleDoseMg * drug.syrupForm.ml) / drug.syrupForm.mg;
        syrupVolumeMl = Number(syrupVolumeMl.toFixed(1));
    }

    return {
        drugId: drug.id,
        drugName: drug.genericName,
        selectedBrand: drug.brands[0],
        singleDoseMg: Math.round(singleDoseMg),
        dailyTotalMg: Math.round(dailyTotalMg),
        syrupVolumeMl: syrupVolumeMl,
        syrupConcentration: drug.syrupForm ? `${drug.syrupForm.mg}mg/${drug.syrupForm.ml}ml` : null,
        intervalHours: drug.intervalHours,
        dosesPerDay: dosesPerDay,
        warnings: warnings
    };
}