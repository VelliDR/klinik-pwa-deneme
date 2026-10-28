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
    gender?: 'male' | 'female' | string;
    ageYears?: number | null;
}

export interface AlvaradoResult {
    score: number;
    risk: 'Düşük' | 'Orta' | 'Yüksek' | string;
    recommendation: string;
    gynecologicWarning?: string;
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

    let gynecologicWarning: string | undefined = undefined;
    const isFemaleReproductiveAge = params.gender === 'female' 
        && params.ageYears !== null 
        && params.ageYears !== undefined 
        && params.ageYears >= 15 
        && params.ageYears <= 45;

    if (isFemaleReproductiveAge) {
        gynecologicWarning = "⚠️ Doğurganlık Çağında Kadın Hasta (15–45 Yaş): Sağ alt kadran ağrısında negatif apendektomiyi (%30'a varan) önlemek için pelvik USG ve gebelik testi (β-hCG) ile ektopik gebelik, over kist torsiyonu/rüptürü ve PID gibi jinekolojik patolojileri mutlaka ekarte ediniz.";
        if (score >= 5) {
            recommendation += ' ' + gynecologicWarning;
        }
    }

    return { score, risk, recommendation, gynecologicWarning };
}

export type BurnProtocolType = 'atls10_thermal' | 'electrical' | 'classic_parkland';

export interface BurnResuscitationOptions {
    burnType?: BurnProtocolType;
    isPediatric?: boolean;
    ageMonths?: number | null;
    hoursSinceBurn?: number | null;
}

export interface ParklandResult {
    multiplierUsed: number;
    burnType: BurnProtocolType;
    formulaLabel: string;
    isPediatric: boolean;
    totalVolume: number;
    first8HrsVolume: number;
    first8HrsRate: number;
    hoursSinceBurn?: number;
    remainingFirst8Hours?: number;
    isDelayedPresentation?: boolean;
    combinedFirst8HoursRate?: number;
    next16HrsVolume: number;
    next16HrsRate: number;
    requiresDextroseMaintenance: boolean;
    maintenanceDailyMl: number | null;
    maintenanceHourlyMl: number | null;
    urineOutputTarget: string;
    clinicalNote?: string;
}

import { calculateMaintenanceFluid } from './fluidEngine';

function computeHollidaySegarMaintenance(weightKg: number): { dailyMl: number; hourlyMl: number } {
    const res = calculateMaintenanceFluid(weightKg, null, { useFourTwoOneHourly: true });
    if (!res) return { dailyMl: 0, hourlyMl: 0 };
    return { dailyMl: res.dailyVolume, hourlyMl: res.hourlyRate };
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

    const rawHoursSinceBurn = options.hoursSinceBurn !== null && options.hoursSinceBurn !== undefined ? Number(options.hoursSinceBurn) : 0;
    const hoursSinceBurn = Math.max(0, rawHoursSinceBurn);
    const isDelayedPresentation = hoursSinceBurn > 0;
    let remainingFirst8Hours = 8;
    let first8HrsRate = first8HrsVolume / 8;

    if (hoursSinceBurn >= 8) {
        remainingFirst8Hours = 0;
        first8HrsRate = first8HrsVolume; // İlk 8 saat aşıldı; acil debi
    } else if (hoursSinceBurn > 0) {
        remainingFirst8Hours = Math.max(0.5, 8 - hoursSinceBurn);
        first8HrsRate = first8HrsVolume / remainingFirst8Hours;
    }

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

    const combinedFirst8HoursRate = requiresDextroseMaintenance && maintenanceHourlyMl !== null
        ? Math.round(first8HrsRate + maintenanceHourlyMl)
        : Math.round(first8HrsRate);

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
    if (hoursSinceBurn >= 8) {
        notes.push(`⚠️ KRİTİK GECİKME: Yanık üzerinden ${hoursSinceBurn} saat geçmiştir! İlk 8 saatlik resüsitasyon periyodu aşılmıştır. Acil sıvı açığı ve organ perfüzyonu (idrar çıkışı, santral venöz dolum, laktat) hedeflenerek agresif resüsitasyon ve uzman yanık merkezi konsültasyonu gereklidir.`);
    } else if (hoursSinceBurn > 0) {
        notes.push(`Gecikmiş Başvuru: Yanıktan bu yana ${hoursSinceBurn} saat geçmiş olduğundan, ilk 8 saatlik hacim (${Math.round(first8HrsVolume)} mL) kalan ${remainingFirst8Hours} saat içinde ${Math.round(first8HrsRate)} mL/saat hızla infüze edilmelidir (ATLS-10 / ABA).`);
    }
    if (requiresDextroseMaintenance) {
        notes.push(`ATLS-10 Pediatrik Güvenlik: <30 kg çocuklarda hipoglisemiyi önlemek için Ringer Laktat resüsitasyon sıvısına EK OLARAK %5 Dekstroz içeren idame sıvısı (${maintenanceHourlyMl} mL/saat) verilmelidir (Bileşik ilk 8 saat hızı: ${combinedFirst8HoursRate} mL/saat).`);
    }

    return {
        multiplierUsed: multiplier,
        burnType,
        formulaLabel,
        isPediatric,
        totalVolume: Math.round(totalVolume),
        first8HrsVolume: Math.round(first8HrsVolume),
        first8HrsRate: Math.round(first8HrsRate),
        hoursSinceBurn,
        remainingFirst8Hours,
        isDelayedPresentation,
        combinedFirst8HoursRate,
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

export type RansonEtiology = 'biliary' | 'non_biliary';

export interface RansonParams {
    etiology?: RansonEtiology;
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

    // Numerical / specific inputs
    ageYears?: number | null;
    wbcCount?: number | null;
    glucoseMgDl?: number | null;
    ldhUPerL?: number | null;
    bunRiseMgDl?: number | null;
    baseDeficitMEqL?: number | null;
    fluidSequestrationLiters?: number | null;
}

export interface RansonResult {
    score: number;
    maxScore: number;
    admissionScore: number;
    hour48Score: number;
    etiology: RansonEtiology;
    mortalityPercent: number;
    severity: 'Hafif' | 'Orta-Ağır' | 'Ağır' | 'Kritik';
    interpretation: string;
    earlyWarning?: string;
}

export function calculateRanson(params: RansonParams | null | undefined): RansonResult | null {
    if (!params) return null;
    const etiology: RansonEtiology = params.etiology || 'non_biliary';
    const isBiliary = etiology === 'biliary';
    let admissionScore = 0;
    let hour48Score = 0;
    
    // 1. Admission (0. Saat)
    // Age: Non-biliary > 55, Biliary > 70
    if (params.ageYears !== undefined && params.ageYears !== null) {
        if (params.ageYears > (isBiliary ? 70 : 55)) admissionScore += 1;
    } else if (params.ageO55) {
        admissionScore += 1;
    }

    // WBC: Non-biliary > 16.000, Biliary > 18.000
    if (params.wbcCount !== undefined && params.wbcCount !== null) {
        if (params.wbcCount > (isBiliary ? 18000 : 16000)) admissionScore += 1;
    } else if (params.wbcO16) {
        admissionScore += 1;
    }

    // Glucose: Non-biliary > 200, Biliary > 220
    if (params.glucoseMgDl !== undefined && params.glucoseMgDl !== null) {
        if (params.glucoseMgDl > (isBiliary ? 220 : 200)) admissionScore += 1;
    } else if (params.gluO200) {
        admissionScore += 1;
    }

    // AST: > 250 U/L both
    if (params.astO250) admissionScore += 1;

    // LDH: Non-biliary > 350, Biliary > 400
    if (params.ldhUPerL !== undefined && params.ldhUPerL !== null) {
        if (params.ldhUPerL > (isBiliary ? 400 : 350)) admissionScore += 1;
    } else if (params.ldhO350) {
        admissionScore += 1;
    }
    
    // 2. 48 Hours (48. Saat)
    // Hct: Drop > 10% both
    if (params.hctDrop10) hour48Score += 1;

    // BUN rise: Non-biliary > 5 mg/dL, Biliary > 2 mg/dL
    if (params.bunRiseMgDl !== undefined && params.bunRiseMgDl !== null) {
        if (params.bunRiseMgDl > (isBiliary ? 2 : 5)) hour48Score += 1;
    } else if (params.bunRise5) {
        hour48Score += 1;
    }

    // Ca: < 8.0 mg/dL both
    if (params.caU8) hour48Score += 1;

    // PaO2: < 60 mmHg (Only in non-biliary Ranson; not scored in biliary)
    if (!isBiliary && params.pO2U60) hour48Score += 1;

    // Base deficit: Non-biliary > 4 mEq/L, Biliary > 5 mEq/L
    if (params.baseDeficitMEqL !== undefined && params.baseDeficitMEqL !== null) {
        if (params.baseDeficitMEqL > (isBiliary ? 5 : 4)) hour48Score += 1;
    } else if (params.baseDefO4) {
        hour48Score += 1;
    }

    // Fluid sequestration: Non-biliary > 6 L, Biliary > 4 L
    if (params.fluidSequestrationLiters !== undefined && params.fluidSequestrationLiters !== null) {
        if (params.fluidSequestrationLiters > (isBiliary ? 4 : 6)) hour48Score += 1;
    } else if (params.fluidSecO6) {
        hour48Score += 1;
    }

    const score = admissionScore + hour48Score;
    const maxScore = isBiliary ? 10 : 11;

    let interpretation = '';
    let mortalityPercent = 1;
    let severity: 'Hafif' | 'Orta-Ağır' | 'Ağır' | 'Kritik' = 'Hafif';
    if (score <= 2) {
        mortalityPercent = 1;
        severity = 'Hafif';
        interpretation = `Hafif Akut Pankreatit (${isBiliary ? 'Biliyer' : 'Non-Biliyer'}) — Mortalite riski ~%1`;
    } else if (score <= 4) {
        mortalityPercent = 15;
        severity = 'Orta-Ağır';
        interpretation = `Orta-Ağır Akut Pankreatit (${isBiliary ? 'Biliyer' : 'Non-Biliyer'}) — Mortalite riski ~%15 (Yakın izlem)`;
    } else if (score <= 6) {
        mortalityPercent = 40;
        severity = 'Ağır';
        interpretation = `Ağır Akut Pankreatit (${isBiliary ? 'Biliyer' : 'Non-Biliyer'}) — Mortalite riski ~%40 (YBÜ değerlendirmesi)`;
    } else {
        mortalityPercent = 100;
        severity = 'Kritik';
        interpretation = `Kritik Nekrotizan Pankreatit (${isBiliary ? 'Biliyer' : 'Non-Biliyer'}) — Mortalite riski >%90–100 (Acil YBÜ)`;
    }

    const earlyWarning = hour48Score === 0
        ? '⚠️ DİKKAT: Ranson skoru 48. saat tamamlanmadan kesinleştirilemez! Yalnızca başvuru (0. saat) bulgularına bakarak hafif pankreatit kararı vermek yanıltıcı olabilir. Nekroz ve sistemik komplikasyonlar ilk 48 saatte gelişebileceğinden hasta yakın takip edilmeli; erken evrede BISAP veya APACHE-II skoru ile monitörize edilmelidir.'
        : undefined;

    return { 
        score, 
        maxScore, 
        admissionScore, 
        hour48Score, 
        etiology, 
        mortalityPercent, 
        severity, 
        interpretation, 
        earlyWarning 
    };
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
