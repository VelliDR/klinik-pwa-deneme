/**
 * PERCENTILE ENGINE (Neyzi 2015 LMS Standards)
 * Pediatrik hastalar (0-18 yaş / 0-216 ay) için Türk Çocuklarında Boy, Kilo ve BKİ Persentil / Z-Skor Hesabı.
 * Referans: Neyzi O, et al. Reference Values for Weight, Height, Head Circumference, and Body Mass Index in Turkish Children. J Clin Res Pediatr Endocrinol 2015.
 */

// Z < 0 durumunda simetri kuralı eklentili Abramowitz & Stegun
function standardNormalCDF(z) {
    if (z === null || isNaN(z)) return null;
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

function zToPercentile(z) {
    if (z === null || isNaN(z)) return null;
    const cdf = standardNormalCDF(z);
    if (cdf === null) return null;
    return Math.min(99, Math.max(1, Math.round(cdf * 100)));
}

// LMS Formülü: Z = ((X/M)^L - 1) / (L*S)
function calculateLMSZScore(x, l, m, s) {
    if (x <= 0 || m <= 0 || s <= 0) return null;
    if (Math.abs(l) < 0.0001) {
        return Math.log(x / m) / s;
    }
    return (Math.pow(x / m, l) - 1) / (l * s);
}

// Lineer İnterpolasyon (Komşu yaş aralığı LMS paremetreleri)
function interpolate(x, xArr, yArr) {
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
        }
    }
};

function getGrowthNorms(totalMonths, gender = 'male') {
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

    return { 
        height: { L: heightL, M: heightM, S: heightS },
        weight: { L: weightL, M: weightM, S: weightS },
        bmi: { L: bmiL, M: bmiM, S: bmiS }
    };
}

export function calculatePercentiles(params) {
    if (!params) return null;
    const { totalMonths, gender, heightCm, weightKg, isPediatric } = params;

    if (!isPediatric || totalMonths === null || totalMonths === undefined || totalMonths < 0 || totalMonths > 216) {
        return null;
    }

    const norms = getGrowthNorms(totalMonths, gender);
    let heightP = null, weightP = null, bmiP = null, bmiValue = null;
    let heightZ = null, weightZ = null, bmiZ = null;
    let category = 'Normal Gelişim';

    if (heightCm && heightCm > 0) {
        heightZ = calculateLMSZScore(heightCm, norms.height.L, norms.height.M, norms.height.S);
        heightP = zToPercentile(heightZ);
    }

    if (weightKg && weightKg > 0) {
        weightZ = calculateLMSZScore(weightKg, norms.weight.L, norms.weight.M, norms.weight.S);
        weightP = zToPercentile(weightZ);
    }

    if (heightCm && weightKg && heightCm > 0 && weightKg > 0) {
        const heightMeters = heightCm / 100;
        bmiValue = Number((weightKg / (heightMeters * heightMeters)).toFixed(1));
        
        bmiZ = calculateLMSZScore(bmiValue, norms.bmi.L, norms.bmi.M, norms.bmi.S);
        bmiP = zToPercentile(bmiZ);

        if (bmiP < 3) category = 'Ağır Malnütrisyon / Çok Düşük Kilolu (<3.p)';
        else if (bmiP < 10) category = 'Zayıf / Düşük Kilolu (3-10.p)';
        else if (bmiP <= 85) category = 'Normal Gelişim (10-85.p)';
        else if (bmiP <= 95) category = 'Fazla Kilolu / Obezite Riski (85-95.p)';
        else category = 'Obezite (>95.p)';
    }

    return { 
        heightZ: heightZ !== null ? Number(heightZ.toFixed(2)) : null,
        weightZ: weightZ !== null ? Number(weightZ.toFixed(2)) : null,
        bmiZ: bmiZ !== null ? Number(bmiZ.toFixed(2)) : null,
        heightPercentile: heightP, 
        weightPercentile: weightP, 
        bmiValue, 
        bmiPercentile: bmiP, 
        category,
        // Backward compatibility aliases for SOAP generator & old references
        weight: weightP,
        height: heightP,
        bmi: bmiP
    };
}