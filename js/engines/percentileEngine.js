/**
 * PERCENTILE ENGINE (WHO / CDC Yaklaşımlı İnterpolasyon)
 * Pediatrik hastalar için Boy, Kilo ve BKİ Persentil / Z-Skor Hesabı.
 */

function zToPercentile(z) {
    if (z === null || isNaN(z)) return null;
    const p = 1 / (1 + Math.exp(-1.702 * z));
    return Math.min(99, Math.max(1, Math.round(p * 100)));
}

// Biyolojik Büyüme Dönüm Noktaları (0, 3, 6, 12, 24, 36, 60, 120, 216. aylar)
const GROWTH_MILESTONES = {
    male: {
        months:   [0,    3,    6,    12,   24,   36,   60,   120,  216],
        height:   [49.9, 61.4, 67.6, 75.7, 87.1, 96.1, 110.0, 137.8, 176.0],
        weight:   [3.3,  6.4,  7.9,  9.6,  12.2, 14.3, 18.3,  32.0,  68.0],
        heightSD: [1.9,  2.3,  2.5,  2.8,  3.3,  3.9,  4.7,   6.0,   7.5],
        weightSD: [0.4,  0.7,  0.9,  1.1,  1.5,  1.8,  2.6,   6.5,   12.5]
    },
    female: {
        months:   [0,    3,    6,    12,   24,   36,   60,   120,  216],
        height:   [49.1, 59.8, 65.7, 74.0, 85.5, 95.1, 109.4, 138.6, 163.0],
        weight:   [3.2,  5.8,  7.3,  8.9,  11.5, 13.9, 18.2,  33.0,  58.0],
        heightSD: [1.8,  2.2,  2.5,  2.9,  3.4,  4.0,  4.8,   6.3,   6.5],
        weightSD: [0.4,  0.6,  0.8,  1.0,  1.4,  1.8,  2.7,   7.0,   10.5]
    }
};

// Matematiksel Esneme (Linear Interpolation) Fonksiyonu
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
    return 0;
}

function getGrowthNorms(totalMonths, gender = 'male') {
    const data = GROWTH_MILESTONES[gender === 'male' ? 'male' : 'female'];
    const m = totalMonths;

    const heightMedian = interpolate(m, data.months, data.height);
    const weightMedian = interpolate(m, data.months, data.weight);
    const heightSD = interpolate(m, data.months, data.heightSD);
    const weightSD = interpolate(m, data.months, data.weightSD);

    const heightMeters = heightMedian / 100;
    const bmiMedian = weightMedian / (heightMeters * heightMeters);
    const bmiSD = 1.8 + interpolate(m, [0, 216], [0, 1.2]); // Yaşla birlikte BMI varyansı artar

    return { heightMedian, heightSD, weightMedian, weightSD, bmiMedian, bmiSD };
}

export function calculatePercentiles(params) {
    const { totalMonths, gender, heightCm, weightKg, isPediatric } = params;

    if (!isPediatric || totalMonths === null || totalMonths === undefined || totalMonths < 0) return null;

    const norms = getGrowthNorms(totalMonths, gender);
    let heightP = null, weightP = null, bmiP = null, bmiValue = null;
    let category = 'Normal';

    if (heightCm && heightCm > 0) {
        heightP = zToPercentile((heightCm - norms.heightMedian) / norms.heightSD);
    }

    if (weightKg && weightKg > 0) {
        weightP = zToPercentile((weightKg - norms.weightMedian) / norms.weightSD);
    }

    if (heightCm && weightKg && heightCm > 0 && weightKg > 0) {
        const heightM = heightCm / 100;
        bmiValue = Number((weightKg / (heightM * heightM)).toFixed(1));
        bmiP = zToPercentile((bmiValue - norms.bmiMedian) / norms.bmiSD);

        if (bmiP < 5) category = 'Zayıf / Düşük Kilolu';
        else if (bmiP <= 85) category = 'Normal Gelişim';
        else if (bmiP <= 95) category = 'Fazla Kilolu (Risk)';
        else category = 'Obezite';
    }

    return { heightPercentile: heightP, weightPercentile: weightP, bmiValue, bmiPercentile: bmiP, category };
}