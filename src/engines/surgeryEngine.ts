// ============================================================================
// GENEL CERRAHİ VE YANIK MOTORU (BARREL & CORE FACADE)
// 10 Klinik Başlık, 30 Sınıflandırma/Skorlama Sistemi + ATLS-10 Yanık + Ranson + Sütür
// ============================================================================

export * from './surgery/appendicitisEngine';
export * from './surgery/biliaryEngine';
export * from './surgery/pancreatitisEngine';
export * from './surgery/diverticulitisEngine';
export * from './surgery/herniaEngine';
export * from './surgery/proctologyEngine';
export * from './surgery/colorectalOncologyEngine';
export * from './surgery/traumaEngine';
export * from './surgery/perioperativeEngine';
export * from './surgery/surgeryReferenceData';

import { calculateMaintenanceFluid } from './fluidEngine';

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
