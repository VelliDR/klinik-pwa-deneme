// Surgery Engine: Alvarado, Ranson, Parkland, Sütür/Yara

export function calculateAlvarado(params) {
    // params = { migration: bool, anorexia: bool, nausea: bool, rlqPain: bool, rebound: bool, temp: bool, leukocytosis: bool, leftShift: bool }
    let score = 0;
    if (params.migration) score += 1;
    if (params.anorexia) score += 1;
    if (params.nausea) score += 1;
    if (params.rlqPain) score += 2;
    if (params.rebound) score += 1;
    if (params.temp) score += 1;
    if (params.leukocytosis) score += 2;
    if (params.leftShift) score += 1;

    let risk = '';
    let recommendation = '';
    if (score <= 4) {
        risk = 'Düşük';
        recommendation = 'Apendisit uzak ihtimal. Alternatif tanıları düşünün.';
    } else if (score >= 5 && score <= 6) {
        risk = 'Orta';
        recommendation = 'Olası apendisit. Gözlem ve USG/BT endikasyonu.';
    } else if (score >= 7) {
        risk = 'Yüksek';
        recommendation = 'Kuvvetle muhtemel apendisit. Cerrahi konsültasyon endike.';
    }

    return { score, risk, recommendation };
}

export function calculateParkland(weightKg, tbsaPercent, ageYears = null) {
    if (!weightKg || !tbsaPercent || tbsaPercent <= 0) return null;
    
    // ATLS 10th Edition Update (2018)
    // Yetişkinler (Alev/Haşlanma): 2 mL * kg * TBSA
    // Çocuklar <14 yaş: 3 mL * kg * TBSA
    let multiplier = 2; 
    if (ageYears !== null && ageYears < 14) multiplier = 3;
    
    const totalVolume = multiplier * weightKg * tbsaPercent;
    const first8HrsVolume = totalVolume / 2;
    const next16HrsVolume = totalVolume / 2;

    const first8HrsRate = first8HrsVolume / 8;
    const next16HrsRate = next16HrsVolume / 16;

    return {
        multiplierUsed: multiplier,
        totalVolume: Math.round(totalVolume),
        first8HrsVolume: Math.round(first8HrsVolume),
        first8HrsRate: Math.round(first8HrsRate),
        next16HrsVolume: Math.round(next16HrsVolume),
        next16HrsRate: Math.round(next16HrsRate)
    };
}

export function calculateRanson(params) {
    // params = { ageO55, wbcO16, gluO200, astO250, ldhO350, hctDrop10, bunRise5, caU8, pO2U60, baseDefO4, fluidSecO6 }
    let score = 0;
    
    // Admission
    if (params.ageO55) score += 1;
    if (params.wbcO16) score += 1;
    if (params.gluO200) score += 1;
    if (params.astO250) score += 1;
    if (params.ldhO350) score += 1;
    
    // 48 Hours
    if (params.hctDrop10) score += 1;
    if (params.bunRise5) score += 1;
    if (params.caU8) score += 1;
    if (params.pO2U60) score += 1;
    if (params.baseDefO4) score += 1;
    if (params.fluidSecO6) score += 1;

    let interpretation = '';
    if (score <= 2) interpretation = 'Mortalite riski %1';
    else if (score <= 4) interpretation = 'Mortalite riski %15';
    else if (score <= 6) interpretation = 'Mortalite riski %40';
    else interpretation = 'Mortalite riski %100';

    return { score, interpretation };
}



export function getSutureGuidance(location) {
    const guides = {
        'yuz': { material: 'Prolene veya Nylon (Monofilaman)', size: '6-0 veya 5-0', removalDays: '3-5 gün' },
        'skalp': { material: 'Prolene veya Zımba (Stapler)', size: '4-0 veya 3-0', removalDays: '7-10 gün' },
        'govde': { material: 'Prolene veya Nylon', size: '4-0 veya 3-0', removalDays: '10-14 gün' },
        'ekstremite': { material: 'Prolene veya Nylon', size: '4-0 veya 3-0', removalDays: '10-14 gün' },
        'eklem': { material: 'Prolene veya Nylon', size: '3-0 veya 2-0', removalDays: '14 gün' },
        'oral': { material: 'Vicryl veya Rapide (Emilebilir)', size: '4-0 veya 5-0', removalDays: 'Alınmasına gerek yok' }
    };
    return guides[location] || null;
}
