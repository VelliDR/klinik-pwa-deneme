export type InfusionDoseUnit = 'mcg_kg_min' | 'mcg_min' | 'mg_kg_hr';

export interface InfusionRateInput {
    drugAmountMg: number | null | undefined;
    totalVolumeMl: number | null | undefined;
    weightKg?: number | null | undefined;
    targetDose: number | null | undefined;
    doseUnit: InfusionDoseUnit | string;
}

export interface InfusionRateResult {
    rateMlHr: number;
    concentrationMcgMl: number;
    concentrationMgMl: number;
}

export function calculateInfusionRate({
    drugAmountMg,
    totalVolumeMl,
    weightKg,
    targetDose,
    doseUnit
}: InfusionRateInput): InfusionRateResult | null {
    if (!drugAmountMg || !totalVolumeMl || drugAmountMg <= 0 || totalVolumeMl <= 0) return null;
    if (!targetDose || targetDose <= 0) return null;

    // 1. Çözelti Konsantrasyonu
    const mgPerMl = drugAmountMg / totalVolumeMl;
    const mcgPerMl = mgPerMl * 1000;

    let rateMlHr = 0;

    // 2. Birim Dönüşüm Mantığı
    if (doseUnit === 'mcg_kg_min') {
        if (!weightKg || weightKg <= 0) return null; // Kilo şart
        rateMlHr = (targetDose * weightKg * 60) / mcgPerMl;
    } else if (doseUnit === 'mcg_min') {
        rateMlHr = (targetDose * 60) / mcgPerMl;
    } else if (doseUnit === 'mg_kg_hr') {
        if (!weightKg || weightKg <= 0) return null;
        rateMlHr = (targetDose * weightKg) / mgPerMl;
    }

    return {
        rateMlHr: Number(rateMlHr.toFixed(1)),
        concentrationMcgMl: Number(mcgPerMl.toFixed(1)),
        concentrationMgMl: Number(mgPerMl.toFixed(2))
    };
}

export interface GIRInput {
    dextrosePercent: number | null | undefined;
    rateMlHr: number | null | undefined;
    weightKg: number | null | undefined;
}

export interface GIRResult {
    gir: number;
    status: 'LOW' | 'OPTIMAL' | 'HIGH' | 'CRITICAL_HIGH';
    interpretation: string;
    alertClass: string;
    hypoglycemiaBolus: {
        solution: string;
        doseMl: number;
        instructions: string;
    };
}

export function calculateGIR({ dextrosePercent, rateMlHr, weightKg }: GIRInput): GIRResult | null {
    if (!dextrosePercent || !rateMlHr || !weightKg || dextrosePercent <= 0 || rateMlHr <= 0 || weightKg <= 0) {
        return null;
    }

    const gir = (dextrosePercent * rateMlHr) / (6 * weightKg);
    const girValue = Number(gir.toFixed(1));

    let status: 'LOW' | 'OPTIMAL' | 'HIGH' | 'CRITICAL_HIGH' = 'OPTIMAL';
    let interpretation = '';
    let alertClass = 'text-emerald-400';

    if (girValue < 4.0) {
        status = 'LOW';
        interpretation = '🔴 Yetersiz Glukoz İdamesi (GIR < 4 mg/kg/dk): Hipoglisemi riski! İnfüzyon hızı veya dekstroz konsantrasyonu artırılmalıdır.';
        alertClass = 'text-rose-400';
    } else if (girValue <= 8.0) {
        status = 'OPTIMAL';
        interpretation = '🟢 Normal / Optimal Yenidoğan Glukoz Hızı (4 - 8 mg/kg/dk).';
        alertClass = 'text-emerald-400';
    } else if (girValue <= 12.0) {
        status = 'HIGH';
        interpretation = '🟡 Yüksek Glukoz Hızı (8 - 12 mg/kg/dk): Kan şekeri yakından izlenmeli, hiperglisemi kontrol edilmelidir.';
        alertClass = 'text-amber-400';
    } else {
        status = 'CRITICAL_HIGH';
        interpretation = '⚠️ Kritik Yüksek Glukoz Hızı (GIR > 12 mg/kg/dk): Glukozüri, dehidratasyon ve hiperinsülinizm riski! Santral venöz yol düşünülmeli.';
        alertClass = 'text-purple-400';
    }

    const hypoBolusMl = Number((2 * weightKg).toFixed(1));

    return {
        gir: girValue,
        status,
        interpretation,
        alertClass,
        hypoglycemiaBolus: {
            solution: '%10 Dekstroz',
            doseMl: hypoBolusMl,
            instructions: `%10 Dekstroz ${hypoBolusMl} mL IV yavaş puşe (2 mL/kg), ardından GIR 6-8 mg/kg/dk idame başlatın.`
        }
    };
}
