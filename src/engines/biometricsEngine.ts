import type { AgeGroupDefinition, AgeGroupKey, AgeUnit, Gender } from '../types/clinical';

export const AGE_GROUPS: Record<AgeGroupKey, AgeGroupDefinition> = {
    NEONATE: { id: 'NEONATE', label: 'Yenidoğan (0-28 Gün)', isPediatric: true },
    INFANT: { id: 'INFANT', label: 'Süt Çocuğu (1-12 Ay)', isPediatric: true },
    TODDLER: { id: 'TODDLER', label: 'Oyun Çocuğu (1-3 Yaş)', isPediatric: true },
    PRESCHOOL: { id: 'PRESCHOOL', label: 'Okul Öncesi (3-4 Yaş)', isPediatric: true },
    CHILD: { id: 'CHILD', label: 'Okul Çağı (5-11 Yaş)', isPediatric: true },
    ADOLESCENT: { id: 'ADOLESCENT', label: 'Adolesan (12-17 Yaş)', isPediatric: true },
    ADULT: { id: 'ADULT', label: 'Erişkin (18-64 Yaş)', isPediatric: false },
    GERIATRIC: { id: 'GERIATRIC', label: 'Geriatrik (65+ Yaş)', isPediatric: false }
};

export function calculateBSA(heightCm: number | null | undefined, weightKg: number | null | undefined): number | null {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
    return Number(Math.sqrt((heightCm * weightKg) / 3600).toFixed(2));
}

export function determineAgeGroup(ageValue: number | null | undefined, ageUnit: string | null | undefined): AgeGroupDefinition | null {
    if (ageValue === null || ageValue === undefined || isNaN(ageValue) || ageValue < 0) return null;
    if (!ageUnit || !['years', 'months', 'weeks', 'days'].includes(ageUnit)) return null;
    if (ageValue === 0) return AGE_GROUPS.NEONATE;

    // 1. Gelen değeri matematiksel kıyaslama için aya çeviriyoruz
    let totalMonths = 0;
    if (ageUnit === 'years') totalMonths = ageValue * 12;
    else if (ageUnit === 'months') totalMonths = ageValue;
    else if (ageUnit === 'weeks') totalMonths = ageValue / 4.345;
    else if (ageUnit === 'days') totalMonths = ageValue / 30.4375;

    // 2. Yenidoğan Sınırı (0-28 gün / <= 4 hafta / < 1 ay)
    if (ageUnit === 'days') {
        if (ageValue <= 28) return AGE_GROUPS.NEONATE;
    } else if (ageUnit === 'weeks') {
        if (ageValue <= 4) return AGE_GROUPS.NEONATE;
    } else if (totalMonths < 1) {
        return AGE_GROUPS.NEONATE;
    }

    // 3. Diğer Yaş Grupları
    if (totalMonths <= 12) return AGE_GROUPS.INFANT;
    if (totalMonths < 36) return AGE_GROUPS.TODDLER;
    if (totalMonths < 60) return AGE_GROUPS.PRESCHOOL;
    
    const years = Math.floor(totalMonths / 12);
    if (years <= 11) return AGE_GROUPS.CHILD;
    if (years <= 17) return AGE_GROUPS.ADOLESCENT;
    if (years <= 64) return AGE_GROUPS.ADULT;
    return AGE_GROUPS.GERIATRIC;
}

export type CreatinineAssayType = 'idms' | 'jaffe';
export type PediatricCreatinineAssay = CreatinineAssayType;

export interface EgfrOptions {
    cystatinC?: number | null;
    isPreterm?: boolean;
    assay?: CreatinineAssayType;
    pediatricAssay?: CreatinineAssayType;
    bsa?: number | null;
    ageMonths?: number | null;
}

export interface DetailedEgfrResult {
    egfrIndexed: number;
    egfrAbsolute: number | null;
    formulaUsed: string;
    shortBadge: string;
    kConstantUsed: number | null;
    ckdStage: string;
    dosingNote?: string;
}

function resolveEffectiveAgeYears(ageYears: number | null | undefined, ageMonths?: number | null): number | null {
    if (ageMonths !== null && ageMonths !== undefined && !isNaN(ageMonths) && ageMonths >= 0) {
        return ageMonths / 12;
    }
    if (ageYears !== null && ageYears !== undefined && !isNaN(ageYears) && ageYears >= 0) {
        return ageYears;
    }
    return null;
}

function classifyKdigoStage(egfrIndexed: number, effectiveAgeYears: number): string {
    if (effectiveAgeYears < 2) {
        return 'Yenidoğan/Süt Çocuğu (<2 yaş fizyolojik olgunlaşma dönemi — erişkin G1-G5 evrelemesi uygulanmaz)';
    }
    if (egfrIndexed >= 90) return 'G1 (≥90 — Normal / Yüksek)';
    if (egfrIndexed >= 60) return 'G2 (60–89 — Hafif Azalmış)';
    if (egfrIndexed >= 45) return 'G3a (45–59 — Hafif-Orta Azalmış)';
    if (egfrIndexed >= 30) return 'G3b (30–44 — Orta-Ağır Azalmış)';
    if (egfrIndexed >= 15) return 'G4 (15–29 — Ağır Azalmış)';
    return 'G5 (<15 — Böbrek Yetmezliği)';
}

export function calculateDetailedEGFR(
    creatinine: number | null | undefined,
    ageYears: number | null | undefined,
    gender: Gender | string | null | undefined,
    heightCm: number | null | undefined,
    options: EgfrOptions = {}
): DetailedEgfrResult | null {
    const hasScr = Boolean(creatinine && !isNaN(creatinine) && creatinine > 0);
    const scys = options.cystatinC;
    const hasCys = Boolean(scys && !isNaN(scys) && scys > 0);

    if (!hasScr && !hasCys) return null;

    const effectiveAge = resolveEffectiveAgeYears(ageYears, options.ageMonths);
    if (effectiveAge === null) return null;

    const isFemale = gender === 'F' || gender === 'female';
    const rawAssay = options.assay ?? options.pediatricAssay;
    const assay: CreatinineAssayType = rawAssay === 'jaffe' ? 'jaffe' : 'idms';
    const isPreterm = Boolean(options.isPreterm);

    let rawIndexed: number | null = null;
    let formulaUsed = '';
    let shortBadge = '';
    let kConstantUsed: number | null = null;

    // 1. PEDIATRIC (< 18 Yaş): Schwartz Denklemleri
    if (effectiveAge < 18) {
        if (!hasScr || !heightCm || heightCm <= 0) return null;
        const scr = creatinine as number;

        if (effectiveAge < 1) {
            // Yenidoğan ve <1 yaş süt çocuğu (Brion 1986 / Schwartz 1987 / Harriet Lane)
            kConstantUsed = isPreterm ? 0.33 : 0.45;
            formulaUsed = isPreterm
                ? 'Schwartz Preterm Süt Çocuğu (<1 Yaş, k=0.33)'
                : 'Schwartz Term Süt Çocuğu (<1 Yaş, k=0.45)';
            shortBadge = `Schwartz k=${kConstantUsed}`;
        } else if (assay === 'jaffe') {
            // Klasik Kolorimetrik Jaffe Yöntemi (1-17 yaş)
            kConstantUsed = (!isFemale && effectiveAge >= 13) ? 0.70 : 0.55;
            formulaUsed = `Klasik Schwartz (Jaffe, k=${kConstantUsed.toFixed(2)})`;
            shortBadge = `Jaffe k=${kConstantUsed.toFixed(2)}`;
        } else {
            // Güncel IDMS-Kalibreli Enzimatik Bedside CKiD Schwartz (1-17 yaş, Schwartz 2009 / KDIGO)
            kConstantUsed = 0.413;
            formulaUsed = 'Bedside Schwartz (IDMS Enzimatik, k=0.413)';
            shortBadge = 'IDMS k=0.413';
        }

        rawIndexed = (kConstantUsed * heightCm) / scr;
    } else {
        // 2. ADULT (≥ 18 Yaş): KDIGO 2024 & CKD-EPI 2021 Denklemleri
        if (!gender) return null;

        if (hasScr && hasCys) {
            // KDIGO 2024 Önerisi: 2021 CKD-EPI Kreatinin + Sistatin C Kombine Denklemi (Inker et al., NEJM 2021)
            const scr = creatinine as number;
            const cys = scys as number;
            const kappa = isFemale ? 0.7 : 0.9;
            const alpha = isFemale ? -0.219 : -0.144;
            const sexFactor = isFemale ? 0.963 : 1.0;

            const scrRatio = scr / kappa;
            const cysRatio = cys / 0.8;

            rawIndexed =
                135 *
                Math.pow(Math.min(scrRatio, 1), alpha) *
                Math.pow(Math.max(scrRatio, 1), -0.544) *
                Math.pow(Math.min(cysRatio, 1), -0.323) *
                Math.pow(Math.max(cysRatio, 1), -0.778) *
                Math.pow(0.9961, effectiveAge) *
                sexFactor;
            formulaUsed = 'CKD-EPI 2021 Kombine (Kreatinin + Sistatin C, KDIGO 2024)';
            shortBadge = 'CKD-EPI Cr+Cys';
        } else if (hasScr) {
            // 2021 CKD-EPI Kreatinin Denklemi
            const scr = creatinine as number;
            const kappa = isFemale ? 0.7 : 0.9;
            const alpha = isFemale ? -0.241 : -0.302;
            const scrOverKappa = scr / kappa;

            rawIndexed =
                142 *
                Math.pow(Math.min(scrOverKappa, 1), alpha) *
                Math.pow(Math.max(scrOverKappa, 1), -1.2) *
                Math.pow(0.9938, effectiveAge) *
                (isFemale ? 1.012 : 1.0);
            formulaUsed = 'CKD-EPI 2021 (Kreatinin)';
            shortBadge = 'CKD-EPI 2021';
        } else if (hasCys) {
            // CKD-EPI Sistatin C Denklemi (Inker 2012 / KDIGO 2024)
            const cys = scys as number;
            const cysRatio = cys / 0.8;
            rawIndexed =
                133 *
                Math.pow(Math.min(cysRatio, 1), -0.499) *
                Math.pow(Math.max(cysRatio, 1), -1.328) *
                Math.pow(0.996, effectiveAge) *
                (isFemale ? 0.932 : 1.0);
            formulaUsed = 'CKD-EPI (Sistatin C, KDIGO 2024)';
            shortBadge = 'CKD-EPI CysC';
        }
    }

    if (rawIndexed === null || isNaN(rawIndexed)) return null;
    const egfrIndexed = Number(rawIndexed.toFixed(0));

    // KDIGO 2024 İlaç Dozlama Kuralı: BSA mevcutsa 1.73 m² indekslemesini kaldır (Mutlak GFR, mL/dk)
    let egfrAbsolute: number | null = null;
    let dosingNote: string | undefined;
    if (options.bsa && options.bsa > 0) {
        egfrAbsolute = Number(((rawIndexed * options.bsa) / 1.73).toFixed(0));
        const bsaDiffPct = Math.abs(options.bsa - 1.73) / 1.73;
        if (effectiveAge >= 18 && bsaDiffPct >= 0.20) {
            dosingNote = `KDIGO 2024 İlaç Dozlama Notu: BSA (${options.bsa} m²) standart 1.73 m²'den belirgin farklı olduğundan dar terapötik indeksli ilaçlarda mutlak GFR (${egfrAbsolute} mL/dk) dikkate alınmalıdır.`;
        }
    }

    return {
        egfrIndexed,
        egfrAbsolute,
        formulaUsed,
        shortBadge,
        kConstantUsed,
        ckdStage: classifyKdigoStage(egfrIndexed, effectiveAge),
        dosingNote
    };
}

export function calculateEGFR(
    creatinine: number | null | undefined, 
    ageYears: number | null | undefined, 
    gender: Gender | string | null | undefined, 
    heightCm: number | null | undefined,
    options: EgfrOptions = {}
): number | null {
    const detailed = calculateDetailedEGFR(creatinine, ageYears, gender, heightCm, options);
    return detailed ? detailed.egfrIndexed : null;
}
