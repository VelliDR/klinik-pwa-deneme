// Surgery Engine: Alvarado, Ranson, Parkland, Sütür/Yara

export interface AlvaradoParams {
    migration?: boolean;
    anorexia?: boolean;
    nausea?: boolean;
    rlqPain?: boolean;
    rebound?: boolean;
    temp?: boolean;
    leukocytosis?: boolean;
    leftShift?: boolean;
}

export interface AlvaradoResult {
    score: number;
    risk: 'Düşük' | 'Orta' | 'Yüksek' | string;
    recommendation: string;
}

export function calculateAlvarado(params: AlvaradoParams | null | undefined): AlvaradoResult | null {
    if (!params) return null;
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

export type BurnProtocolType = 'atls10_thermal' | 'electrical' | 'classic_parkland';

export interface BurnResuscitationOptions {
    burnType?: BurnProtocolType;
    isPediatric?: boolean;
    ageMonths?: number | null;
}

export interface ParklandResult {
    multiplierUsed: number;
    burnType: BurnProtocolType;
    formulaLabel: string;
    isPediatric: boolean;
    totalVolume: number;
    first8HrsVolume: number;
    first8HrsRate: number;
    next16HrsVolume: number;
    next16HrsRate: number;
    requiresDextroseMaintenance: boolean;
    maintenanceDailyMl: number | null;
    maintenanceHourlyMl: number | null;
    urineOutputTarget: string;
    clinicalNote?: string;
}

function computeHollidaySegarMaintenance(weightKg: number): { dailyMl: number; hourlyMl: number } {
    let daily = 0;
    let hourly = 0;
    if (weightKg <= 10) {
        daily = weightKg * 100;
        hourly = weightKg * 4;
    } else if (weightKg <= 20) {
        daily = 1000 + (weightKg - 10) * 50;
        hourly = 40 + (weightKg - 10) * 2;
    } else {
        daily = 1500 + (weightKg - 20) * 20;
        hourly = 60 + (weightKg - 20) * 1;
    }
    return { dailyMl: Math.round(daily), hourlyMl: Math.round(hourly) };
}

export function calculateParkland(
    weightKg: number | null | undefined, 
    tbsaPercent: number | null | undefined, 
    ageYears: number | null = null,
    options: BurnResuscitationOptions = {}
): ParklandResult | null {
    if (!weightKg || weightKg <= 0 || !tbsaPercent || tbsaPercent <= 0) return null;

    const clampedTbsa = Math.min(100, tbsaPercent);
    const burnType: BurnProtocolType = options.burnType || 'atls10_thermal';

    // Pediatrik tespit (<14 yaş veya bebekte sadece ay/kilo girilmişse ageYears === null hatasını önle)
    const isPediatric = Boolean(options.isPediatric)
        || (ageYears !== null && ageYears !== undefined && ageYears < 14)
        || (options.ageMonths !== null && options.ageMonths !== undefined && options.ageMonths < 168)
        || (ageYears === null && (options.ageMonths === null || options.ageMonths === undefined) && weightKg < 35);

    // ATLS 10. Baskı (Modifiye Brooke / Konsensüs):
    // - Erişkin Termal Yanık: 2 mL x kg x %TBSA Ringer Laktat
    // - Pediatrik Termal Yanık (<14 yaş): 3 mL x kg x %TBSA Ringer Laktat (+ <30 kg dekstrozlu idame)
    // - Elektrik Yanığı (Tüm yaşlar): 4 mL x kg x %TBSA Ringer Laktat
    // - Klasik Parkland: 4 mL x kg x %TBSA Ringer Laktat
    let multiplier = 2;
    let formulaLabel = 'ATLS-10 Modifiye Brooke / Konsensüs (Erişkin Termal: 2 mL/kg/%)';

    if (burnType === 'electrical') {
        multiplier = 4;
        formulaLabel = 'ATLS-10 Yüksek Voltaj Elektrik Yanığı Protokolü (4 mL/kg/%)';
    } else if (burnType === 'classic_parkland') {
        multiplier = 4;
        formulaLabel = 'Klasik Parkland Formülü (4 mL/kg/%)';
    } else if (isPediatric) {
        multiplier = 3;
        formulaLabel = 'ATLS-10 Pediatrik Yanık Konsensüsü (3 mL/kg/%)';
    }

    const totalVolume = multiplier * weightKg * clampedTbsa;
    const first8HrsVolume = totalVolume / 2;
    const next16HrsVolume = totalVolume / 2;

    const first8HrsRate = first8HrsVolume / 8;
    const next16HrsRate = next16HrsVolume / 16;

    // ATLS-10 Kuralı: <30 kg çocuklarda hepatik glikojen deposu kısıtlı olduğundan dekstrozlu idame zorunludur
    const requiresDextroseMaintenance = isPediatric && weightKg < 30;
    let maintenanceDailyMl: number | null = null;
    let maintenanceHourlyMl: number | null = null;
    if (requiresDextroseMaintenance) {
        const maint = computeHollidaySegarMaintenance(weightKg);
        maintenanceDailyMl = maint.dailyMl;
        maintenanceHourlyMl = maint.hourlyMl;
    }

    let urineOutputTarget = '0.5 mL/kg/saat (Erişkinde ~30–50 mL/saat)';
    if (burnType === 'electrical') {
        urineOutputTarget = weightKg < 30
            ? '1.5–2.0 mL/kg/saat (Miyoglobinüri / pigment nefropatisi koruması)'
            : '100 mL/saat (veya 1–1.5 mL/kg/s; koyu idrar/rabdomiyolizde zorlu diürez)';
    } else if (isPediatric && weightKg < 30) {
        urineOutputTarget = '1.0 mL/kg/saat (<30 kg pediatrik hedef)';
    } else if (isPediatric) {
        urineOutputTarget = '0.5–1.0 mL/kg/saat';
    }

    const notes: string[] = [];
    if (burnType !== 'electrical' && clampedTbsa < (isPediatric ? 10 : 20)) {
        notes.push(`TBSA %${clampedTbsa}: Formal IV yanık resüsitasyonu genellikle erişkinde ≥%20, çocukta ≥%10–15 2./3. derece yanıklarda endikedir; küçük yanıklarda oral hidrasyon değerlendirilebilir.`);
    }
    if (burnType === 'electrical') {
        notes.push('Elektrik yanıklarında cilt yüzey alanı derin doku yıkımını yansıtmaz; EKG monitörizasyonu, CK/idrar miyoglobin takibi ve kompartman sendromu açısından yakın izlem şarttır.');
    }
    if (requiresDextroseMaintenance) {
        notes.push(`ATLS-10 Pediatrik Güvenlik: <30 kg çocuklarda hipoglisemiyi önlemek için Ringer Laktat resüsitasyon sıvısına EK OLARAK %5 Dekstroz içeren idame sıvısı (${maintenanceHourlyMl} mL/saat) verilmelidir.`);
    }

    return {
        multiplierUsed: multiplier,
        burnType,
        formulaLabel,
        isPediatric,
        totalVolume: Math.round(totalVolume),
        first8HrsVolume: Math.round(first8HrsVolume),
        first8HrsRate: Math.round(first8HrsRate),
        next16HrsVolume: Math.round(next16HrsVolume),
        next16HrsRate: Math.round(next16HrsRate),
        requiresDextroseMaintenance,
        maintenanceDailyMl,
        maintenanceHourlyMl,
        urineOutputTarget,
        clinicalNote: notes.length > 0 ? notes.join(' ') : undefined
    };
}

export const calculateBurnResuscitation = calculateParkland;

export interface RansonParams {
    ageO55?: boolean;
    wbcO16?: boolean;
    gluO200?: boolean;
    astO250?: boolean;
    ldhO350?: boolean;
    hctDrop10?: boolean;
    bunRise5?: boolean;
    caU8?: boolean;
    pO2U60?: boolean;
    baseDefO4?: boolean;
    fluidSecO6?: boolean;
}

export interface RansonResult {
    score: number;
    admissionScore: number;
    hour48Score: number;
    mortalityPercent: number;
    severity: 'Hafif' | 'Orta-Ağır' | 'Ağır' | 'Kritik';
    interpretation: string;
}

export function calculateRanson(params: RansonParams | null | undefined): RansonResult | null {
    if (!params) return null;
    let admissionScore = 0;
    let hour48Score = 0;
    
    // Admission (0. Saat)
    if (params.ageO55) admissionScore += 1;
    if (params.wbcO16) admissionScore += 1;
    if (params.gluO200) admissionScore += 1;
    if (params.astO250) admissionScore += 1;
    if (params.ldhO350) admissionScore += 1;
    
    // 48 Hours (48. Saat)
    if (params.hctDrop10) hour48Score += 1;
    if (params.bunRise5) hour48Score += 1;
    if (params.caU8) hour48Score += 1;
    if (params.pO2U60) hour48Score += 1;
    if (params.baseDefO4) hour48Score += 1;
    if (params.fluidSecO6) hour48Score += 1;

    const score = admissionScore + hour48Score;

    let interpretation = '';
    let mortalityPercent = 1;
    let severity: 'Hafif' | 'Orta-Ağır' | 'Ağır' | 'Kritik' = 'Hafif';
    if (score <= 2) {
        mortalityPercent = 1;
        severity = 'Hafif';
        interpretation = 'Hafif Akut Pankreatit — Mortalite riski ~%1';
    } else if (score <= 4) {
        mortalityPercent = 15;
        severity = 'Orta-Ağır';
        interpretation = 'Orta-Ağır Akut Pankreatit — Mortalite riski ~%15 (Yakın izlem)';
    } else if (score <= 6) {
        mortalityPercent = 40;
        severity = 'Ağır';
        interpretation = 'Ağır Akut Pankreatit — Mortalite riski ~%40 (YBÜ değerlendirmesi)';
    } else {
        mortalityPercent = 100;
        severity = 'Kritik';
        interpretation = 'Kritik Nekrotizan Pankreatit — Mortalite riski >%90–100 (Acil YBÜ)';
    }

    return { score, admissionScore, hour48Score, mortalityPercent, severity, interpretation };
}

export interface SutureGuidance {
    material: string;
    size: string;
    removalDays: string;
}

export function getSutureGuidance(location: string): SutureGuidance | null {
    const guides: Record<string, SutureGuidance> = {
        'yuz': { material: 'Prolene veya Nylon (Monofilaman)', size: '6-0 veya 5-0', removalDays: '3-5 gün' },
        'skalp': { material: 'Prolene veya Zımba (Stapler)', size: '4-0 veya 3-0', removalDays: '7-10 gün' },
        'govde': { material: 'Prolene veya Nylon', size: '4-0 veya 3-0', removalDays: '10-14 gün' },
        'ekstremite': { material: 'Prolene veya Nylon', size: '4-0 veya 3-0', removalDays: '10-14 gün' },
        'eklem': { material: 'Prolene veya Nylon', size: '3-0 veya 2-0', removalDays: '14 gün' },
        'oral': { material: 'Vicryl veya Rapide (Emilebilir)', size: '4-0 veya 5-0', removalDays: 'Alınmasına gerek yok' }
    };
    return guides[location] || null;
}
