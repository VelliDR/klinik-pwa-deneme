// Pediatric Engine: Şurup dozu, Aşı takvimi

export function calculatePediatricDose(weightKg, drugKey) {
    if (!weightKg || weightKg <= 0) return null;

    // Doz profilleri (mg/kg/doz) ve konsantrasyonlar
    const drugs = {
        'paracetamol': {
            name: 'Parasetamol',
            doseMgPerKg: 15,
            maxDose: 1000,
            concentration: 120 / 5, // 120mg / 5ml (Calpol)
            freq: '4-6 saatte bir'
        },
        'ibuprofen': {
            name: 'İbuprofen',
            doseMgPerKg: 10,
            maxDose: 400,
            concentration: 100 / 5, // 100mg / 5ml (Dolven)
            freq: '6-8 saatte bir'
        },
        'amoklavin_400': {
            name: 'Amoksisilin-Klavulanat (400/57)',
            doseMgPerKg: 20, // 40mg/kg/gün (2'ye bölünmüş doz => 20 mg/kg/doz)
            maxDose: 1000,
            concentration: 400 / 5,
            freq: '12 saatte bir'
        },
        'cefuroxime_250': {
            name: 'Sefuroksim (250mg)',
            doseMgPerKg: 15, // 30mg/kg/gün => 15 mg/kg/doz
            maxDose: 500,
            concentration: 250 / 5,
            freq: '12 saatte bir'
        },
        'clarithromycin_125': {
            name: 'Klaritromisin (125mg)',
            doseMgPerKg: 7.5, // 15mg/kg/gün => 7.5 mg/kg/doz
            maxDose: 500,
            concentration: 125 / 5,
            freq: '12 saatte bir'
        }
    };

    const drug = drugs[drugKey];
    if (!drug) return null;

    const targetDoseMg = Math.min(weightKg * drug.doseMgPerKg, drug.maxDose || Infinity);
    const volumeMl = targetDoseMg / drug.concentration;
    
    // Ölçek hesabı (1 ölçek = 5 ml)
    const olcek = volumeMl / 5;
    let olcekText = '';
    
    if (volumeMl < 2.5) {
        olcekText = 'Doğru ölçüm için oral enjektör kullanınız.';
    } else if (olcek >= 1) {
        const tam = Math.floor(olcek);
        const kalan = olcek - tam;
        olcekText = `${tam} tam`;
        if (kalan > 0.1 && kalan <= 0.3) olcekText += ' + 1/4 ölçek';
        else if (kalan > 0.3 && kalan <= 0.6) olcekText += ' + 1/2 ölçek';
        else if (kalan > 0.6 && kalan <= 0.8) olcekText += ' + 3/4 ölçek';
        else if (kalan > 0.8) olcekText = `${tam + 1} tam ölçek`;
        else olcekText += ' ölçek';
    } else {
        if (olcek <= 0.3) olcekText = '1/4 ölçek';
        else if (olcek > 0.3 && olcek <= 0.6) olcekText = '1/2 ölçek';
        else if (olcek > 0.6 && olcek <= 0.8) olcekText = '3/4 ölçek';
        else olcekText = '1 tam ölçek';
    }

    return {
        name: drug.name,
        targetDoseMg: Math.round(targetDoseMg),
        volumeMl: parseFloat(volumeMl.toFixed(1)),
        olcekText,
        freq: drug.freq
    };
}

export function getVaccineSchedule(ageInMonths) {
    if (ageInMonths === null || ageInMonths === undefined) return null;
    
    let vaccines = [];
    if (ageInMonths < 1 && ageInMonths >= 0) vaccines = ["Hepatit B (1. Doz) - Doğumda"];
    else if (ageInMonths >= 1 && ageInMonths < 2) vaccines = ["Hepatit B (2. Doz)"];
    else if (ageInMonths >= 2 && ageInMonths < 4) vaccines = ["BCG (Verem)", "KPA (1. Doz)", "DaBT-İPA-Hib-HepB (1. Doz)"];
    else if (ageInMonths >= 4 && ageInMonths < 6) vaccines = ["KPA (2. Doz)", "DaBT-İPA-Hib-HepB (2. Doz)"];
    else if (ageInMonths >= 6 && ageInMonths < 9) vaccines = ["DaBT-İPA-Hib-HepB (3. Doz)", "OPA (1. Doz)"];
    else if (ageInMonths >= 9 && ageInMonths < 12) vaccines = ["KKK (Ek Doz)"];
    else if (ageInMonths >= 12 && ageInMonths < 18) vaccines = ["KPA (Rapel)", "Suçiçeği", "KKK (1. Doz)"];
    else if (ageInMonths >= 18 && ageInMonths < 24) vaccines = ["DaBT-İPA-Hib-HepB (Rapel)", "OPA (2. Doz)", "Hepatit A (1. Doz)"];
    else if (ageInMonths >= 24 && ageInMonths < 48) vaccines = ["Hepatit A (2. Doz)"];
    else if (ageInMonths >= 48 && ageInMonths < 156) vaccines = ["KKK (2. Doz)", "DaBT-İPA (Rapel)"];
    else if (ageInMonths >= 156 && ageInMonths < 216) vaccines = ["Td (Rapel) - 13 Yaş"];
    else if (ageInMonths >= 216 && ageInMonths < 780) vaccines = ["Erişkin Dönemi: Td (Tetanos-Difteri) Rapeli (10 yılda bir)"];
    else if (ageInMonths >= 780) vaccines = ["65 Yaş ve Üzeri: Pnömokok", "65 Yaş ve Üzeri: Yıllık Grip (İnfluenza)", "Td (Tetanos-Difteri) Rapeli"];

    return vaccines;
}
