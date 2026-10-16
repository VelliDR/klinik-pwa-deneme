/**
 * PERCENTILE ENGINE (Neyzi 2015 LMS Standards & ÇEDD Çözüm Normatif Modelleri)
 * Pediatrik hastalar (0-18 yaş / 0-216 ay) için Türk Çocuklarında Boy, Kilo, Baş Çevresi ve BKİ Persentil / Z-Skor Hesabı.
 * Referans: Neyzi O, et al. Reference Values for Weight, Height, Head Circumference, and Body Mass Index in Turkish Children. J Clin Res Pediatr Endocrinol 2015.
 * ÇEDD (Çocuk Endokrinolojisi ve Diyabet Derneği) Hedef Boy (Mid-Parental Height) & Prematüre Düzeltilmiş Yaş Standartları.
 */

// Z < 0 durumunda simetri kuralı eklentili Abramowitz & Stegun
export function standardNormalCDF(z: number | null | undefined): number | null {
    if (z === null || z === undefined || isNaN(z)) return null;
    const isNegative = z < 0;
    const absZ = Math.abs(z);
    
    // Abramowitz & Stegun katsayıları
    const d1 = 0.0498673470;
    const d2 = 0.0211410061;
    const d3 = 0.0032776263;
    const d4 = 0.0000380036;

    const poly = 1 + d1*absZ + d2*(absZ**2) + d3*(absZ**3) + d4*(absZ**4);
    const p = 1 - 0.5 * (poly ** -4);

    return isNegative ? (1 - p) : p;
}

export function zToPercentile(z: number | null | undefined): number | null {
    if (z === null || z === undefined || isNaN(z)) return null;
    const cdf = standardNormalCDF(z);
    if (cdf === null) return null;
    return Math.min(99, Math.max(1, Math.round(cdf * 100)));
}

// LMS Formülü: Z = ((X/M)^L - 1) / (L*S)
export function calculateLMSZScore(x: number, l: number, m: number, s: number): number | null {
    if (x <= 0 || m <= 0 || s <= 0) return null;
    if (Math.abs(l) < 0.0001) {
        return Math.log(x / m) / s;
    }
    return (Math.pow(x / m, l) - 1) / (l * s);
}

// Lineer İnterpolasyon (Komşu yaş aralığı LMS parametreleri)
function interpolate(x: number, xArr: number[], yArr: number[]): number {
    if (x <= xArr[0]) return yArr[0];
    if (x >= xArr[xArr.length - 1]) return yArr[yArr.length - 1];

    for (let i = 0; i < xArr.length - 1; i++) {
        if (x >= xArr[i] && x <= xArr[i + 1]) {
            const x0 = xArr[i], x1 = xArr[i + 1];
            const y0 = yArr[i], y1 = yArr[i + 1];
            return y0 + ((y1 - y0) / (x1 - x0)) * (x - x0);
        }
    }
    return yArr[0];
}

// Neyzi 2015 Detaylı Yaş Dönüm Noktaları (0 - 216 Ay)
const AGE_MONTHS_GRID = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24,
    30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108,
    114, 120, 126, 132, 138, 144, 150, 156, 162, 168, 174, 180, 186, 192, 198, 204, 210, 216
];

// Neyzi 2015 Baş Çevresi Yaş Izgarası (0 - 36 Ay)
const HC_AGE_MONTHS_GRID = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24, 30, 36];

const NEYZI_2015_DATA = {
    male: {
        height: {
            L: AGE_MONTHS_GRID.map(() => 1.0),
            M: [49.9, 54.7, 58.4, 61.4, 63.9, 65.9, 67.6, 69.2, 70.6, 72.0, 73.3, 74.5, 75.7, 79.1, 82.3, 85.1, 87.1, 91.9, 96.1, 99.9, 103.3, 106.7, 110.0, 113.3, 116.5, 119.7, 122.8, 125.8, 128.8, 131.8, 134.8, 137.8, 140.8, 143.9, 147.2, 150.7, 154.4, 158.2, 161.8, 165.2, 168.1, 170.5, 172.4, 173.8, 174.8, 175.4, 175.8, 176.0, 176.0],
            S: [0.038, 0.038, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.038, 0.038, 0.038, 0.038, 0.039, 0.040, 0.041, 0.041, 0.042, 0.042, 0.042, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042]
        },
        weight: {
            L: [0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.02, 0.0, -0.01, -0.02, -0.025, -0.03, -0.05, -0.07, -0.09, -0.10, -0.12, -0.15, -0.18, -0.21, -0.24, -0.27, -0.30, -0.32, -0.35, -0.38, -0.40, -0.42, -0.44, -0.46, -0.48, -0.49, -0.50, -0.50, -0.50, -0.50, -0.50, -0.50, -0.50, -0.50, -0.50, -0.50],
            M: [3.3, 4.4, 5.5, 6.4, 7.0, 7.5, 7.9, 8.3, 8.7, 9.0, 9.3, 9.5, 9.6, 10.3, 10.9, 11.5, 12.2, 13.3, 14.3, 15.3, 16.3, 17.3, 18.3, 19.5, 20.7, 22.0, 23.5, 25.1, 26.8, 28.7, 30.7, 33.0, 35.5, 38.3, 41.3, 44.5, 47.9, 51.4, 54.9, 58.2, 61.2, 63.8, 65.8, 67.2, 68.0, 68.4, 68.5, 68.5, 68.5],
            S: [0.12, 0.12, 0.11, 0.11, 0.10, 0.10, 0.10, 0.10, 0.10, 0.11, 0.11, 0.11, 0.11, 0.11, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.14, 0.14, 0.15, 0.15, 0.16, 0.17, 0.17, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.17, 0.17, 0.17, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16]
        },
        bmi: {
            L: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.4, 0.2, 0.0, -0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0],
            M: [13.4, 14.8, 16.1, 16.8, 17.1, 17.2, 17.2, 17.2, 17.2, 17.1, 17.0, 16.9, 16.8, 16.5, 16.2, 16.0, 15.8, 15.6, 15.4, 15.3, 15.2, 15.1, 15.1, 15.2, 15.3, 15.4, 15.5, 15.7, 16.0, 16.3, 16.6, 17.0, 17.5, 18.0, 18.5, 19.0, 19.5, 20.1, 20.6, 21.0, 21.4, 21.8, 22.1, 22.3, 22.4, 22.5, 22.5, 22.5, 22.5],
            S: [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.09, 0.09, 0.09, 0.09, 0.10, 0.10, 0.10, 0.11, 0.11, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]
        },
        headCirc: {
            L: HC_AGE_MONTHS_GRID.map(() => 1.0),
            M: [35.0, 37.3, 39.0, 40.5, 41.7, 42.7, 43.6, 44.3, 44.9, 45.4, 45.9, 46.3, 46.6, 47.4, 48.0, 48.5, 49.0, 49.7, 50.2],
            S: [0.038, 0.036, 0.035, 0.034, 0.033, 0.033, 0.032, 0.032, 0.031, 0.031, 0.031, 0.030, 0.030, 0.030, 0.029, 0.029, 0.029, 0.028, 0.028]
        }
    },
    female: {
        height: {
            L: AGE_MONTHS_GRID.map(() => 1.0),
            M: [49.1, 53.7, 57.1, 59.8, 62.1, 64.0, 65.7, 67.3, 68.7, 70.1, 71.4, 72.7, 74.0, 77.5, 80.9, 83.5, 85.5, 90.4, 95.1, 99.0, 102.7, 106.2, 109.4, 112.8, 116.0, 119.2, 122.3, 125.4, 128.6, 131.8, 135.1, 138.6, 142.3, 146.0, 149.6, 152.8, 155.5, 157.6, 159.2, 160.4, 161.3, 161.9, 162.3, 162.6, 162.8, 162.9, 163.0, 163.0, 163.0],
            S: [0.036, 0.036, 0.036, 0.036, 0.037, 0.037, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.039, 0.039, 0.039, 0.039, 0.039, 0.040, 0.042, 0.042, 0.043, 0.043, 0.043, 0.044, 0.044, 0.045, 0.045, 0.045, 0.045, 0.045, 0.045, 0.045, 0.044, 0.043, 0.042, 0.041, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040]
        },
        weight: {
            L: [-0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.08, -0.06, -0.05, -0.05, -0.04, -0.03, -0.04, -0.05, -0.05, -0.05, -0.07, -0.09, -0.12, -0.15, -0.18, -0.20, -0.22, -0.24, -0.26, -0.28, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30],
            M: [3.2, 4.1, 5.0, 5.8, 6.4, 6.9, 7.3, 7.7, 8.0, 8.3, 8.6, 8.8, 8.9, 9.6, 10.2, 10.9, 11.5, 12.6, 13.9, 14.9, 15.9, 17.0, 18.2, 19.4, 20.7, 22.1, 23.6, 25.3, 27.2, 29.3, 31.6, 34.1, 36.8, 39.7, 42.6, 45.4, 48.0, 50.4, 52.4, 54.0, 55.3, 56.3, 57.0, 57.5, 57.8, 58.0, 58.0, 58.0, 58.0],
            S: [0.12, 0.11, 0.11, 0.10, 0.10, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.14, 0.14, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.20, 0.21, 0.21, 0.21, 0.21, 0.20, 0.19, 0.19, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18]
        },
        bmi: {
            L: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.4, 0.2, 0.0, -0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0],
            M: [13.3, 14.5, 15.6, 16.3, 16.7, 16.9, 16.9, 16.9, 16.8, 16.7, 16.6, 16.5, 16.4, 16.1, 15.8, 15.6, 15.4, 15.2, 15.0, 14.9, 14.8, 14.8, 14.9, 15.0, 15.1, 15.2, 15.4, 15.7, 16.0, 16.4, 16.8, 17.2, 17.7, 18.2, 18.7, 19.1, 19.5, 19.9, 20.2, 20.5, 20.7, 20.9, 21.0, 21.1, 21.2, 21.2, 21.2, 21.2, 21.2],
            S: [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.09, 0.09, 0.09, 0.09, 0.10, 0.10, 0.10, 0.11, 0.11, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]
        },
        headCirc: {
            L: HC_AGE_MONTHS_GRID.map(() => 1.0),
            M: [34.3, 36.5, 38.2, 39.5, 40.6, 41.6, 42.4, 43.1, 43.7, 44.2, 44.7, 45.1, 45.4, 46.2, 46.8, 47.4, 47.9, 48.6, 49.1],
            S: [0.038, 0.036, 0.035, 0.034, 0.033, 0.033, 0.032, 0.032, 0.031, 0.031, 0.031, 0.030, 0.030, 0.030, 0.029, 0.029, 0.029, 0.028, 0.028]
        }
    }
};

function getGrowthNorms(totalMonths: number, gender: 'male' | 'female' = 'male') {
    const sex = gender === 'female' ? 'female' : 'male';
    const data = NEYZI_2015_DATA[sex];
    const m = Math.min(216, Math.max(0, totalMonths));

    const heightL = interpolate(m, AGE_MONTHS_GRID, data.height.L);
    const heightM = interpolate(m, AGE_MONTHS_GRID, data.height.M);
    const heightS = interpolate(m, AGE_MONTHS_GRID, data.height.S);

    const weightL = interpolate(m, AGE_MONTHS_GRID, data.weight.L);
    const weightM = interpolate(m, AGE_MONTHS_GRID, data.weight.M);
    const weightS = interpolate(m, AGE_MONTHS_GRID, data.weight.S);

    const bmiL = interpolate(m, AGE_MONTHS_GRID, data.bmi.L);
    const bmiM = interpolate(m, AGE_MONTHS_GRID, data.bmi.M);
    const bmiS = interpolate(m, AGE_MONTHS_GRID, data.bmi.S);

    let headCircL = 1.0;
    let headCircM = 35.0;
    let headCircS = 0.035;

    if (m <= 36) {
        headCircL = interpolate(m, HC_AGE_MONTHS_GRID, data.headCirc.L);
        headCircM = interpolate(m, HC_AGE_MONTHS_GRID, data.headCirc.M);
        headCircS = interpolate(m, HC_AGE_MONTHS_GRID, data.headCirc.S);
    }

    return {
        height: { l: heightL, m: heightM, s: heightS },
        weight: { l: weightL, m: weightM, s: weightS },
        bmi: { l: bmiL, m: bmiM, s: bmiS },
        headCirc: { l: headCircL, m: headCircM, s: headCircS }
    };
}

export interface PercentilesInput {
    ageMonths: number | null | undefined;
    gender: 'male' | 'female' | string;
    heightCm?: number | null;
    weightKg?: number | null;
    headCircumferenceCm?: number | null;
}

export interface PercentilesResult {
    heightZ: number | null;
    weightZ: number | null;
    bmiZ: number | null;
    headCircZ: number | null;
    heightPercentile: number | null;
    weightPercentile: number | null;
    bmiValue: number | null;
    bmiPercentile: number | null;
    headCircumferencePercentile: number | null;
    category: string;
    headCircCategory: string | null;
    weight: number | null;
    height: number | null;
    bmi: number | null;
}

export function calculatePercentiles({
    ageMonths,
    gender,
    heightCm = null,
    weightKg = null,
    headCircumferenceCm = null
}: PercentilesInput): PercentilesResult | null {
    if (ageMonths === null || ageMonths === undefined || isNaN(ageMonths)) return null;
    const sex: 'male' | 'female' = gender === 'female' ? 'female' : 'male';
    const norms = getGrowthNorms(ageMonths, sex);

    let heightZ: number | null = null;
    let heightP: number | null = null;
    if (heightCm !== null && heightCm > 0) {
        heightZ = calculateLMSZScore(heightCm, norms.height.l, norms.height.m, norms.height.s);
        heightP = zToPercentile(heightZ);
    }

    let weightZ: number | null = null;
    let weightP: number | null = null;
    if (weightKg !== null && weightKg > 0) {
        weightZ = calculateLMSZScore(weightKg, norms.weight.l, norms.weight.m, norms.weight.s);
        weightP = zToPercentile(weightZ);
    }

    let bmiValue: number | null = null;
    let bmiZ: number | null = null;
    let bmiP: number | null = null;
    if (heightCm && weightKg && heightCm > 0 && weightKg > 0) {
        const heightM = heightCm / 100;
        bmiValue = Number((weightKg / (heightM * heightM)).toFixed(1));
        bmiZ = calculateLMSZScore(bmiValue, norms.bmi.l, norms.bmi.m, norms.bmi.s);
        bmiP = zToPercentile(bmiZ);
    }

    let headCircZ: number | null = null;
    let headCircP: number | null = null;
    if (headCircumferenceCm !== null && headCircumferenceCm > 0 && ageMonths <= 36) {
        headCircZ = calculateLMSZScore(headCircumferenceCm, norms.headCirc.l, norms.headCirc.m, norms.headCirc.s);
        headCircP = zToPercentile(headCircZ);
    }

    let category = '';
    if (bmiP !== null) {
        if (bmiP < 5) category = 'Zayıf (< 5. persentil)';
        else if (bmiP < 85) category = 'Normal kilolu (5 - 85. persentil)';
        else if (bmiP < 95) category = 'Fazla kilolu (85 - 95. persentil)';
        else category = 'Obez (≥ 95. persentil)';
    }

    let headCircCategory: string | null = null;
    if (headCircP !== null) {
        if (headCircP < 3) {
            headCircCategory = '🔴 Mikrosefali (<3.p, Z < -2 SD): Kraniyosinostoz veya nörogelişimsel gerilik açısından pediatrik nöroloji değerlendirmesi önerilir.';
        } else if (headCircP > 97) {
            headCircCategory = '🟡 Makrosefali (>97.p, Z > +2 SD): Hidrosefali / Ailesel makrosefali ayrımı için baş çevresi hızı izlenmelidir.';
        } else {
            headCircCategory = '🟢 Normal Baş Çevresi (3-97.p)';
        }
    }

    return { 
        heightZ: heightZ !== null ? Number(heightZ.toFixed(2)) : null,
        weightZ: weightZ !== null ? Number(weightZ.toFixed(2)) : null,
        bmiZ: bmiZ !== null ? Number(bmiZ.toFixed(2)) : null,
        headCircZ: headCircZ !== null ? Number(headCircZ.toFixed(2)) : null,
        heightPercentile: heightP, 
        weightPercentile: weightP, 
        bmiValue, 
        bmiPercentile: bmiP, 
        headCircumferencePercentile: headCircP,
        category,
        headCircCategory,
        weight: weightP,
        height: heightP,
        bmi: bmiP
    };
}

export interface TargetHeightInput {
    motherHeightCm: number | null | undefined;
    fatherHeightCm: number | null | undefined;
    childGender: 'male' | 'female' | 'M' | 'F' | string;
    currentHeightZ?: number | null;
}

export interface TargetHeightResult {
    targetHeightCm: number;
    targetRangeCm: string;
    targetMin: number;
    targetMax: number;
    targetZ: number | null;
    targetPercentile: number | null;
    deviationValue: number | null;
    deviationAlert: string | null;
}

export function calculateTargetHeight({ 
    motherHeightCm, 
    fatherHeightCm, 
    childGender, 
    currentHeightZ = null 
}: TargetHeightInput): TargetHeightResult | null {
    if (!motherHeightCm || !fatherHeightCm || motherHeightCm <= 0 || fatherHeightCm <= 0) return null;
    const isBoy = childGender === 'male' || childGender === 'M';
    
    const midParental = isBoy 
        ? (motherHeightCm + fatherHeightCm + 13) / 2
        : (motherHeightCm + fatherHeightCm - 13) / 2;

    const targetMin = Number((midParental - 8.5).toFixed(1));
    const targetMax = Number((midParental + 8.5).toFixed(1));

    const adultM = isBoy ? 176.0 : 163.0;
    const adultS = isBoy ? 0.042 : 0.040;
    const targetZ = calculateLMSZScore(midParental, 1.0, adultM, adultS);
    const targetPercentile = zToPercentile(targetZ);

    let deviationAlert: string | null = null;
    let deviationValue: number | null = null;

    if (currentHeightZ !== null && !isNaN(currentHeightZ) && targetZ !== null) {
        deviationValue = Number((currentHeightZ - targetZ).toFixed(2));
        if (deviationValue < -1.5) {
            deviationAlert = '⚠️ Genetik Hedef Boy Potansiyelinden Belirgin Sapma (Boy SDS hedef boy SDS\'sinin >1.5 SD altında). Patolojik boy kısalığı açısından Çocuk Endokrinolojisi değerlendirmesi önerilir.';
        } else if (deviationValue > 1.5) {
            deviationAlert = 'ℹ️ Çocuk mevcut persentili genetik hedef boy potansiyelinin belirgin üzerinde seyrediyor.';
        }
    }

    return {
        targetHeightCm: Number(midParental.toFixed(1)),
        targetRangeCm: `${targetMin} - ${targetMax} cm (±8.5 cm)`,
        targetMin,
        targetMax,
        targetZ: targetZ !== null ? Number(targetZ.toFixed(2)) : null,
        targetPercentile,
        deviationValue,
        deviationAlert
    };
}

export interface CorrectedAgeInput {
    chronologicalMonths: number | null | undefined;
    gestationalWeeks: number | null | undefined;
}

export interface CorrectedAgeResult {
    isPreterm: boolean;
    gestationalWeeks: number;
    weeksMissing: number;
    correctedMonths: number;
    correctedMonthsFormatted?: string;
}

export function calculateCorrectedAge({ 
    chronologicalMonths, 
    gestationalWeeks 
}: CorrectedAgeInput): CorrectedAgeResult | null {
    if (chronologicalMonths === null || gestationalWeeks === null || chronologicalMonths === undefined || gestationalWeeks === undefined || isNaN(chronologicalMonths) || isNaN(gestationalWeeks)) {
        return null;
    }
    
    if (gestationalWeeks >= 37) {
        return {
            isPreterm: false,
            gestationalWeeks,
            correctedMonths: chronologicalMonths,
            weeksMissing: 0
        };
    }

    const weeksMissing = Math.max(0, 40 - gestationalWeeks);
    const monthsMissing = weeksMissing / 4.348;
    const correctedMonths = Math.max(0, Number((chronologicalMonths - monthsMissing).toFixed(1)));

    return {
        isPreterm: true,
        gestationalWeeks,
        weeksMissing,
        correctedMonths,
        correctedMonthsFormatted: `${Math.floor(correctedMonths)} ay ${Math.round((correctedMonths % 1) * 30)} gün`
    };
}
