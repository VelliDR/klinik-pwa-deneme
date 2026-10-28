/**
 * PERCENTILE ENGINE (Neyzi 2015 LMS Standards & ÇEDD Çözüm Normatif Modelleri)
 * Pediatrik hastalar (0-18 yaş / 0-216 ay) için Türk Çocuklarında Boy, Kilo, Baş Çevresi ve BKİ Persentil / Z-Skor Hesabı.
 * Referans: Neyzi O, et al. Reference Values for Weight, Height, Head Circumference, and Body Mass Index in Turkish Children. J Clin Res Pediatr Endocrinol 2015.
 * ÇEDD (Çocuk Endokrinolojisi ve Diyabet Derneği) Hedef Boy (Mid-Parental Height) & Prematüre Düzeltilmiş Yaş Standartları.
 */

/// Z < 0 durumunda simetri kuralı eklentili Abramowitz & Stegun
export function standardNormalCDF(z: number | null | undefined): number | null {
    if (z === null || z === undefined || isNaN(z)) return null;
    const isNegative = z < 0;
    const absZ = Math.abs(z);
    
    // Abramowitz & Stegun Eq. 26.2.19 katsayıları (maksimum mutlak hata < 7.5e-8)
    const d1 = 0.0498673470;
    const d2 = 0.0211410061;
    const d3 = 0.0032776263;
    const d4 = 0.0000380036;
    const d5 = 0.0000488906;
    const d6 = 0.0000053830;

    const poly = 1 + d1*absZ + d2*(absZ**2) + d3*(absZ**3) + d4*(absZ**4) + d5*(absZ**5) + d6*(absZ**6);
    const p = 1 - 0.5 * (poly ** -16);

    return isNegative ? (1 - p) : p;
}

export function zToPercentile(z: number | null | undefined): number | null {
    if (z === null || z === undefined || isNaN(z)) return null;
    const cdf = standardNormalCDF(z);
    if (cdf === null) return null;
    return Math.min(99, Math.max(1, Math.round(cdf * 100)));
}

/**
 * Yüksek hassasiyetli Abramowitz-Stegun persentil dönüşümü (Örn. P0.13, P2.3, P50.0, P97.7, P99.87)
 */
export function zToExactPercentile(z: number | null | undefined, precision: number = 2): number | null {
    if (z === null || z === undefined || isNaN(z)) return null;
    const cdf = standardNormalCDF(z);
    if (cdf === null) return null;
    const factor = Math.pow(10, precision);
    return Math.round(cdf * 100 * factor) / factor;
}

/**
 * Standart Cole ve Green LMS Z-skor formülü:
 * Z = ((X / M)^L - 1) / (L * S) (L != 0)
 * Z = ln(X / M) / S (L == 0)
 */
export function calculateStandardLMSZScore(x: number, l: number, m: number, s: number): number | null {
    if (x <= 0 || m <= 0 || s <= 0) return null;
    if (Math.abs(l) < 0.0001) {
        return Math.log(x / m) / s;
    }
    return (Math.pow(x / m, l) - 1) / (l * s);
}

/**
 * Standart LMS ters dönüşüm (Belirli bir Z-skoruna karşılık gelen fiziksel ölçüm X_c değeri):
 * X_c = M * (1 + L * S * Z)^(1 / L) (L != 0)
 * X_c = M * exp(S * Z) (L == 0)
 */
export function calculateValueFromStandardLMS(z: number, l: number, m: number, s: number): number | null {
    if (m <= 0 || s <= 0) return null;
    if (Math.abs(l) < 0.0001) {
        return m * Math.exp(s * z);
    }
    const base = 1 + l * s * z;
    if (base <= 0) return null;
    return m * Math.pow(base, 1 / l);
}

/**
 * DSÖ Kısıtlamalı LMS (WHO Restricted LMS) Algoritması:
 * Sağa çarpık dağılımlarda (özellikle yaşa göre ağırlık ve VKİ), |Z| > 3 bölgesinde 
 * Box-Cox güç dönüşümünün yarattığı yapay sıkışma/patlamayı önlemek için ±3 SD ötesinde
 * standart sapma mesafesi ±2 SD ile ±3 SD arasındaki mutlak farka sabitlenerek doğrusal ekstrapolasyon uygulanır.
 * Referans: WHO Child Growth Standards (2006) & Cole-Green LMS Guidelines
 */
export function calculateRestrictedLMSZScore(x: number, l: number, m: number, s: number): number | null {
    if (x <= 0 || m <= 0 || s <= 0) return null;
    const rawZ = calculateStandardLMSZScore(x, l, m, s);
    if (rawZ === null) return null;

    // |Z| <= 3 aralığında standart LMS tam geçerlidir
    if (Math.abs(rawZ) <= 3) {
        return rawZ;
    }

    // Pozitif kuyruk (Z > +3 SD)
    if (rawZ > 3) {
        const sd2Pos = calculateValueFromStandardLMS(2, l, m, s);
        const sd3Pos = calculateValueFromStandardLMS(3, l, m, s);
        if (sd2Pos === null || sd3Pos === null) return rawZ;
        const sd23Pos = sd3Pos - sd2Pos;
        if (sd23Pos <= 0) return rawZ;
        return 3 + (x - sd3Pos) / sd23Pos;
    }

    // Negatif kuyruk (Z < -3 SD)
    const sd2Neg = calculateValueFromStandardLMS(-2, l, m, s);
    const sd3Neg = calculateValueFromStandardLMS(-3, l, m, s);
    if (sd2Neg === null || sd3Neg === null) return rawZ;
    const sd23Neg = sd2Neg - sd3Neg; // Pozitif delta
    if (sd23Neg <= 0) return rawZ;
    return -3 + (x - sd3Neg) / sd23Neg;
}

/**
 * LMS Z-Skoru Hesaplayıcı: Standart veya DSÖ Kısıtlamalı LMS desteği ile.
 */
export function calculateLMSZScore(
    x: number, 
    l: number, 
    m: number, 
    s: number, 
    options?: { restricted?: boolean } | boolean
): number | null {
    const isRestricted = options === true || (typeof options === 'object' && options?.restricted === true);
    if (isRestricted) {
        return calculateRestrictedLMSZScore(x, l, m, s);
    }
    return calculateStandardLMSZScore(x, l, m, s);
}

/**
 * Ters LMS Dönüşümü: Z-Skorundan Fiziksel Ölçüm X Değeri Üretici (Kısıtlamalı LMS destekli)
 */
export function calculateValueFromLMS(
    z: number, 
    l: number, 
    m: number, 
    s: number, 
    options?: { restricted?: boolean } | boolean
): number | null {
    const isRestricted = options === true || (typeof options === 'object' && options?.restricted === true);
    if (!isRestricted || Math.abs(z) <= 3) {
        return calculateValueFromStandardLMS(z, l, m, s);
    }

    if (z > 3) {
        const sd2Pos = calculateValueFromStandardLMS(2, l, m, s);
        const sd3Pos = calculateValueFromStandardLMS(3, l, m, s);
        if (sd2Pos === null || sd3Pos === null) return calculateValueFromStandardLMS(z, l, m, s);
        const sd23Pos = sd3Pos - sd2Pos;
        return sd3Pos + (z - 3) * sd23Pos;
    }

    // z < -3
    const sd2Neg = calculateValueFromStandardLMS(-2, l, m, s);
    const sd3Neg = calculateValueFromStandardLMS(-3, l, m, s);
    if (sd2Neg === null || sd3Neg === null) return calculateValueFromStandardLMS(z, l, m, s);
    const sd23Neg = sd2Neg - sd3Neg;
    return sd3Neg + (z - (-3)) * sd23Neg;
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

// Neyzi 2015 & Kara 2016 Baş Çevresi Yaş Izgarası (0 - 216 Ay / 0 - 18 Yaş)
const HC_AGE_MONTHS_GRID = AGE_MONTHS_GRID;

const NEYZI_2015_DATA = {
    male: {
        height: {
            L: AGE_MONTHS_GRID.map(() => 1.0),
            M: [49.9, 54.7, 58.4, 61.4, 63.9, 65.9, 67.6, 69.2, 70.6, 72.0, 73.3, 74.5, 75.7, 79.1, 82.3, 85.1, 87.1, 91.9, 96.1, 99.9, 103.3, 106.7, 110.0, 113.3, 116.5, 119.7, 122.8, 125.8, 128.8, 131.8, 134.8, 137.8, 140.8, 143.9, 147.2, 150.7, 154.4, 158.2, 161.8, 165.2, 168.1, 170.5, 172.4, 173.8, 174.8, 175.4, 175.8, 176.0, 176.2],
            S: [0.038, 0.038, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.038, 0.038, 0.038, 0.038, 0.039, 0.040, 0.041, 0.041, 0.042, 0.042, 0.042, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042]
        },
        weight: {
            L: [0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.02, 0.0, -0.01, -0.02, -0.025, -0.03, -0.05, -0.07, -0.09, -0.10, -0.12, -0.15, -0.18, -0.21, -0.24, -0.27, -0.30, -0.32, -0.35, -0.38, -0.40, -0.42, -0.44, -0.46, -0.48, -0.49, -0.50, -0.50, -0.50, -0.45, -0.40, -0.36, -0.34, -0.34, -0.38, -0.43],
            M: [3.3, 4.4, 5.5, 6.4, 7.0, 7.5, 7.9, 8.3, 8.7, 9.0, 9.3, 9.5, 9.6, 10.3, 10.9, 11.5, 12.2, 13.3, 14.3, 15.3, 16.3, 17.3, 18.3, 19.5, 20.7, 22.0, 23.5, 25.1, 26.8, 28.7, 30.7, 33.0, 35.5, 38.3, 41.3, 44.5, 47.9, 51.4, 54.9, 58.2, 61.2, 63.8, 65.8, 67.2, 68.0, 68.4, 69.2, 70.5, 71.8],
            S: [0.12, 0.12, 0.11, 0.11, 0.10, 0.10, 0.10, 0.10, 0.10, 0.11, 0.11, 0.11, 0.11, 0.11, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.14, 0.14, 0.15, 0.15, 0.16, 0.17, 0.17, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.17, 0.17, 0.17, 0.16, 0.16, 0.16, 0.155, 0.152, 0.150, 0.148, 0.146, 0.142, 0.139]
        },
        bmi: {
            L: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.4, 0.2, 0.0, -0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0],
            M: [13.4, 14.8, 16.1, 16.8, 17.1, 17.2, 17.2, 17.2, 17.2, 17.1, 17.0, 16.9, 16.8, 16.5, 16.2, 16.0, 15.8, 15.6, 15.4, 15.3, 15.2, 15.1, 15.1, 15.2, 15.3, 15.4, 15.5, 15.7, 16.0, 16.3, 16.6, 17.0, 17.5, 18.0, 18.5, 19.0, 19.5, 20.1, 20.6, 21.0, 21.4, 21.8, 22.1, 22.3, 22.4, 22.5, 22.7, 22.9, 23.1],
            S: [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.09, 0.09, 0.09, 0.09, 0.10, 0.10, 0.10, 0.11, 0.11, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]
        },
        headCirc: {
            L: AGE_MONTHS_GRID.map(() => 1.0),
            M: [35.0, 37.3, 39.0, 40.5, 41.7, 42.7, 43.6, 44.3, 44.9, 45.4, 45.9, 46.3, 46.6, 47.4, 48.0, 48.5, 49.0, 49.7, 50.2, 50.7, 51.0, 51.3, 51.6, 51.8, 52.1, 52.3, 52.5, 52.7, 53.0, 53.2, 53.4, 53.6, 53.8, 54.0, 54.3, 54.5, 54.8, 55.1, 55.4, 55.7, 56.1, 56.4, 56.8, 57.0, 57.2, 57.4, 57.5, 57.6, 57.7],
            S: [0.038, 0.036, 0.035, 0.034, 0.033, 0.033, 0.032, 0.032, 0.031, 0.031, 0.031, 0.030, 0.030, 0.030, 0.029, 0.029, 0.029, 0.028, 0.028, 0.028, 0.028, 0.027, 0.027, 0.027, 0.027, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026]
        }
    },
    female: {
        height: {
            L: AGE_MONTHS_GRID.map(() => 1.0),
            M: [49.1, 53.7, 57.1, 59.8, 62.1, 64.0, 65.7, 67.3, 68.7, 70.1, 71.4, 72.7, 74.0, 77.5, 80.9, 83.5, 85.5, 90.4, 95.1, 99.0, 102.7, 106.2, 109.4, 112.8, 116.0, 119.2, 122.3, 125.4, 128.6, 131.8, 135.1, 138.6, 142.3, 146.0, 149.6, 152.8, 155.5, 157.6, 159.2, 160.4, 161.3, 161.9, 162.3, 162.6, 162.8, 162.9, 163.0, 163.0, 163.1],
            S: [0.036, 0.036, 0.036, 0.036, 0.037, 0.037, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.039, 0.039, 0.039, 0.039, 0.039, 0.040, 0.042, 0.042, 0.043, 0.043, 0.043, 0.044, 0.044, 0.045, 0.045, 0.045, 0.045, 0.045, 0.045, 0.045, 0.044, 0.043, 0.042, 0.041, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040, 0.040]
        },
        weight: {
            L: [-0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.08, -0.06, -0.05, -0.05, -0.04, -0.03, -0.04, -0.05, -0.05, -0.05, -0.07, -0.09, -0.12, -0.15, -0.18, -0.20, -0.22, -0.24, -0.26, -0.28, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.30, -0.28, -0.25, -0.23, -0.21, -0.20, -0.20, -0.22, -0.24],
            M: [3.2, 4.1, 5.0, 5.8, 6.4, 6.9, 7.3, 7.7, 8.0, 8.3, 8.6, 8.8, 8.9, 9.6, 10.2, 10.9, 11.5, 12.6, 13.9, 14.9, 15.9, 17.0, 18.2, 19.4, 20.7, 22.1, 23.6, 25.3, 27.2, 29.3, 31.6, 34.1, 36.8, 39.7, 42.6, 45.4, 48.0, 50.4, 52.4, 54.0, 55.3, 56.3, 56.7, 57.0, 57.1, 57.2, 57.2, 57.6, 58.1],
            S: [0.12, 0.11, 0.11, 0.10, 0.10, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.14, 0.14, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.20, 0.21, 0.21, 0.21, 0.21, 0.20, 0.19, 0.19, 0.18, 0.18, 0.18, 0.17, 0.16, 0.15, 0.14, 0.13, 0.125, 0.120, 0.115, 0.110]
        },
        bmi: {
            L: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.4, 0.2, 0.0, -0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0],
            M: [13.3, 14.5, 15.6, 16.3, 16.7, 16.9, 16.9, 16.9, 16.8, 16.7, 16.6, 16.5, 16.4, 16.1, 15.8, 15.6, 15.4, 15.2, 15.0, 14.9, 14.8, 14.8, 14.9, 15.0, 15.1, 15.2, 15.4, 15.7, 16.0, 16.4, 16.8, 17.2, 17.7, 18.2, 18.7, 19.1, 19.5, 19.9, 20.2, 20.5, 20.7, 20.9, 21.1, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8],
            S: [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.09, 0.09, 0.09, 0.09, 0.10, 0.10, 0.10, 0.11, 0.11, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]
        },
        headCirc: {
            L: AGE_MONTHS_GRID.map(() => 1.0),
            M: [34.3, 36.5, 38.2, 39.5, 40.6, 41.6, 42.4, 43.1, 43.7, 44.2, 44.7, 45.1, 45.4, 46.2, 46.8, 47.4, 47.9, 48.6, 49.1, 49.6, 50.0, 50.3, 50.6, 50.9, 51.1, 51.4, 51.6, 51.8, 52.0, 52.3, 52.5, 52.7, 52.9, 53.1, 53.4, 53.7, 54.0, 54.3, 54.6, 54.9, 55.2, 55.4, 55.6, 55.7, 55.8, 55.9, 56.0, 56.0, 56.1],
            S: [0.038, 0.036, 0.035, 0.034, 0.033, 0.033, 0.032, 0.032, 0.031, 0.031, 0.031, 0.030, 0.030, 0.030, 0.029, 0.029, 0.029, 0.028, 0.028, 0.028, 0.027, 0.027, 0.027, 0.027, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025]
        }
    }
};

/**
 * DSÖ (WHO) Büyüme Standartları (0-5 Yaş MGRS ve 5-18 Yaş NCHS/DSÖ 2007)
 * Referans: WHO Child Growth Standards (2006) & WHO Reference 5-19 Years (2007)
 */
export const WHO_2022_DATA = {
    male: {
        height: {
            L: AGE_MONTHS_GRID.map(() => 1.0),
            M: [49.9, 54.7, 58.4, 61.4, 63.9, 65.9, 67.6, 69.2, 70.6, 72.0, 73.3, 74.5, 75.7, 79.1, 82.3, 85.1, 87.1, 91.9, 96.1, 99.9, 103.3, 106.7, 110.0, 113.1, 116.0, 118.9, 121.7, 124.5, 127.3, 130.1, 132.9, 135.6, 138.4, 141.0, 143.6, 146.3, 149.1, 152.4, 156.0, 160.0, 163.8, 167.3, 170.1, 172.2, 173.4, 174.4, 175.2, 175.9, 176.5],
            S: [0.038, 0.038, 0.037, 0.037, 0.037, 0.037, 0.036, 0.036, 0.036, 0.036, 0.036, 0.036, 0.036, 0.037, 0.037, 0.037, 0.037, 0.038, 0.039, 0.040, 0.040, 0.041, 0.041, 0.042, 0.042, 0.042, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042, 0.042]
        },
        weight: {
            L: [0.35, 0.23, 0.14, 0.08, 0.03, -0.01, -0.04, -0.07, -0.09, -0.11, -0.12, -0.13, -0.14, -0.15, -0.16, -0.17, -0.18, -0.19, -0.20, -0.22, -0.24, -0.26, -0.28, -0.30, -0.32, -0.34, -0.36, -0.38, -0.40, -0.42, -0.44, -0.46, -0.48, -0.50, -0.52, -0.54, -0.56, -0.58, -0.60, -0.62, -0.64, -0.66, -0.68, -0.70, -0.72, -0.74, -0.76, -0.78, -0.80],
            M: [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6, 10.3, 10.9, 11.5, 12.2, 13.3, 14.3, 15.3, 16.3, 17.3, 18.3, 19.4, 20.5, 21.7, 22.9, 24.1, 25.4, 26.8, 28.2, 29.7, 31.2, 33.0, 34.9, 36.8, 38.7, 41.2, 44.0, 47.0, 49.9, 53.0, 56.0, 59.0, 61.0, 63.5, 65.5, 67.0, 68.0],
            S: [0.14, 0.13, 0.12, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.12, 0.12, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.13, 0.14, 0.14, 0.14, 0.15, 0.15, 0.15, 0.16, 0.16, 0.16, 0.16, 0.17, 0.17, 0.17, 0.17, 0.17, 0.17, 0.17, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.15, 0.15, 0.15]
        },
        bmi: {
            L: [0.33, 0.15, 0.05, -0.01, -0.05, -0.07, -0.09, -0.11, -0.12, -0.13, -0.14, -0.15, -0.16, -0.18, -0.20, -0.22, -0.25, -0.30, -0.35, -0.40, -0.45, -0.50, -0.55, -0.60, -0.65, -0.70, -0.75, -0.80, -0.85, -0.90, -0.95, -1.00, -1.05, -1.10, -1.15, -1.20, -1.25, -1.30, -1.35, -1.40, -1.45, -1.45, -1.45, -1.45, -1.45, -1.45, -1.45, -1.45, -1.45],
            M: [13.4, 14.9, 16.3, 16.9, 17.2, 17.3, 17.3, 17.2, 17.1, 17.0, 16.9, 16.8, 16.8, 16.5, 16.2, 16.0, 16.0, 15.7, 15.5, 15.4, 15.3, 15.2, 15.2, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.9, 16.0, 16.2, 16.4, 16.7, 16.9, 17.2, 17.5, 17.8, 18.2, 18.6, 19.0, 19.5, 20.0, 20.3, 20.5, 20.9, 21.3, 21.8, 22.2],
            S: [0.10, 0.09, 0.09, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.09, 0.09, 0.09, 0.09, 0.10, 0.10, 0.10, 0.11, 0.11, 0.11, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]
        },
        headCirc: {
            L: AGE_MONTHS_GRID.map(() => 1.0),
            M: [34.5, 36.9, 38.3, 39.5, 40.6, 41.5, 42.4, 43.1, 43.8, 44.3, 44.8, 45.2, 45.6, 46.5, 47.1, 47.6, 48.3, 48.9, 49.5, 50.0, 50.5, 50.9, 51.2, 51.5, 51.8, 52.1, 52.3, 52.5, 52.8, 53.0, 53.2, 53.5, 53.7, 54.0, 54.3, 54.6, 54.9, 55.2, 55.5, 55.8, 56.1, 56.4, 56.8, 57.0, 57.2, 57.4, 57.5, 57.6, 57.7],
            S: [0.038, 0.035, 0.033, 0.032, 0.031, 0.031, 0.030, 0.030, 0.029, 0.029, 0.029, 0.028, 0.028, 0.028, 0.028, 0.028, 0.028, 0.028, 0.028, 0.028, 0.028, 0.027, 0.027, 0.027, 0.027, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026]
        }
    },
    female: {
        height: {
            L: AGE_MONTHS_GRID.map(() => 1.0),
            M: [49.1, 53.7, 57.1, 59.8, 62.1, 64.0, 65.7, 67.3, 68.7, 70.1, 71.4, 72.7, 74.0, 77.5, 80.9, 83.5, 85.7, 90.4, 95.1, 99.0, 102.7, 106.2, 109.4, 112.3, 115.1, 118.1, 121.1, 124.0, 127.0, 129.9, 132.8, 135.7, 138.6, 141.7, 144.9, 148.1, 151.2, 154.1, 156.7, 158.7, 160.4, 161.4, 162.1, 162.5, 162.8, 163.0, 163.1, 163.2, 163.2],
            S: [0.038, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.037, 0.038, 0.038, 0.038, 0.038, 0.039, 0.040, 0.041, 0.041, 0.042, 0.042, 0.042, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.043, 0.042, 0.042, 0.041, 0.041, 0.041, 0.041, 0.041, 0.041, 0.041, 0.041, 0.041, 0.041, 0.041]
        },
        weight: {
            L: [0.38, 0.26, 0.16, 0.09, 0.04, 0.00, -0.03, -0.06, -0.08, -0.10, -0.11, -0.12, -0.13, -0.15, -0.16, -0.17, -0.18, -0.20, -0.22, -0.24, -0.26, -0.28, -0.30, -0.32, -0.34, -0.36, -0.38, -0.40, -0.42, -0.44, -0.46, -0.48, -0.50, -0.52, -0.54, -0.56, -0.58, -0.60, -0.62, -0.64, -0.66, -0.68, -0.70, -0.72, -0.74, -0.76, -0.78, -0.80, -0.82],
            M: [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.7, 8.0, 8.2, 8.5, 8.7, 8.9, 9.6, 10.2, 10.9, 11.5, 12.6, 13.9, 14.9, 16.1, 17.2, 18.2, 19.1, 20.2, 21.3, 22.4, 23.6, 25.0, 26.5, 28.2, 30.0, 31.9, 34.0, 36.3, 38.8, 41.5, 44.0, 46.5, 49.0, 51.0, 52.5, 53.5, 54.5, 55.2, 55.8, 56.1, 56.3, 56.5],
            S: [0.14, 0.13, 0.12, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.12, 0.12, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.13, 0.14, 0.14, 0.14, 0.15, 0.15, 0.15, 0.16, 0.16, 0.16, 0.16, 0.17, 0.17, 0.17, 0.17, 0.17, 0.17, 0.17, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.15, 0.15, 0.15]
        },
        bmi: {
            L: [0.35, 0.18, 0.08, 0.01, -0.03, -0.06, -0.08, -0.10, -0.11, -0.12, -0.13, -0.14, -0.15, -0.17, -0.19, -0.22, -0.25, -0.30, -0.35, -0.40, -0.45, -0.50, -0.55, -0.60, -0.65, -0.70, -0.75, -0.80, -0.85, -0.90, -0.95, -1.00, -1.05, -1.10, -1.15, -1.20, -1.25, -1.30, -1.35, -1.40, -1.45, -1.45, -1.45, -1.45, -1.45, -1.45, -1.45, -1.45, -1.45],
            M: [13.3, 14.6, 15.7, 16.3, 16.6, 16.8, 16.9, 16.8, 16.7, 16.5, 16.4, 16.3, 16.3, 16.0, 15.8, 15.7, 15.7, 15.4, 15.3, 15.3, 15.3, 15.3, 15.3, 15.2, 15.3, 15.4, 15.4, 15.5, 15.7, 15.9, 16.2, 16.6, 16.9, 17.3, 17.7, 18.2, 18.7, 19.1, 19.5, 19.9, 20.2, 20.5, 20.7, 21.0, 21.2, 21.4, 21.5, 21.6, 21.7],
            S: [0.10, 0.09, 0.09, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.09, 0.09, 0.09, 0.09, 0.10, 0.10, 0.10, 0.11, 0.11, 0.11, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]
        },
        headCirc: {
            L: AGE_MONTHS_GRID.map(() => 1.0),
            M: [33.9, 36.2, 37.6, 38.8, 39.8, 40.7, 41.5, 42.2, 42.8, 43.3, 43.8, 44.2, 44.9, 45.6, 46.2, 46.7, 47.2, 47.9, 48.5, 49.0, 49.4, 49.8, 50.2, 50.5, 50.8, 51.1, 51.3, 51.5, 51.8, 52.0, 52.3, 52.5, 52.8, 53.1, 53.4, 53.7, 54.0, 54.3, 54.6, 54.9, 55.2, 55.4, 55.6, 55.7, 55.8, 55.9, 56.0, 56.0, 56.1],
            S: [0.038, 0.035, 0.033, 0.032, 0.031, 0.031, 0.030, 0.030, 0.029, 0.029, 0.029, 0.028, 0.028, 0.028, 0.028, 0.028, 0.028, 0.028, 0.028, 0.028, 0.027, 0.027, 0.027, 0.027, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.026, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025]
        }
    }
};

export type GrowthStandard = 'neyzi_2015' | 'who_2022';
export type MeasurementPosition = 'recumbent' | 'standing' | 'auto';

export interface PositionAdjustmentResult {
    originalHeightCm: number;
    adjustedHeightCm: number;
    wasAdjusted: boolean;
    adjustmentCm: number;
    positionUsed: 'recumbent' | 'standing';
    note: string | null;
}

/**
 * Pozisyonel Boy/Uzunluk Düzeltme Modülü:
 * DSÖ kuralı: <24 ay yatarak uzunluk (recumbent length), >=24 ay ayakta boy (standing height).
 * Neyzi 2015 kuralı: <=36 ay yatarak uzunluk (recumbent length), >36 ay ayakta boy (standing height).
 * Yerçekimi omurga kompresyonu farkı ±0.7 cm'dir.
 */
export function adjustHeightForPosition(
    heightCm: number,
    ageMonths: number,
    position: MeasurementPosition = 'auto',
    standard: GrowthStandard = 'neyzi_2015'
): PositionAdjustmentResult {
    const expectedPosition: 'recumbent' | 'standing' = standard === 'neyzi_2015'
        ? (ageMonths <= 36 ? 'recumbent' : 'standing')
        : (ageMonths < 24 ? 'recumbent' : 'standing');

    if (position === 'auto') {
        return {
            originalHeightCm: heightCm,
            adjustedHeightCm: heightCm,
            wasAdjusted: false,
            adjustmentCm: 0,
            positionUsed: expectedPosition,
            note: null
        };
    }

    if (position === 'standing' && expectedPosition === 'recumbent') {
        const adjusted = Number((heightCm + 0.7).toFixed(1));
        const note = standard === 'neyzi_2015'
            ? `Pozisyonel Düzeltme (+0.7 cm): Neyzi (2015) ulusal referansı 36 aya kadar yatarak uzunluk (infantometre) ölçümünü temel alır. Ayakta ölçülen boy (${heightCm} cm), omurga kompresyonu telafisi ile ${adjusted} cm olarak persentil eğrisine işlendi.`
            : `Pozisyonel Düzeltme (+0.7 cm): DSÖ standartları 24 aya kadar yatarak uzunluk ölçümünü temel alır. Ayakta ölçülen boy (${heightCm} cm), ${adjusted} cm olarak persentil eğrisine işlendi.`;
        return {
            originalHeightCm: heightCm,
            adjustedHeightCm: adjusted,
            wasAdjusted: true,
            adjustmentCm: 0.7,
            positionUsed: 'standing',
            note
        };
    }

    if (position === 'recumbent' && expectedPosition === 'standing') {
        const adjusted = Number((heightCm - 0.7).toFixed(1));
        const note = standard === 'neyzi_2015'
            ? `Pozisyonel Düzeltme (-0.7 cm): Neyzi (2015) ulusal referansı 36 aydan sonra ayakta boy ölçümünü temel alır. Yatarak ölçülen uzunluk (${heightCm} cm), stadiometre eşdeğeri ${adjusted} cm olarak persentil eğrisine işlendi.`
            : `Pozisyonel Düzeltme (-0.7 cm): DSÖ standartları 24 aydan sonra ayakta boy ölçümünü temel alır. Yatarak ölçülen uzunluk (${heightCm} cm), ${adjusted} cm olarak persentil eğrisine işlendi.`;
        return {
            originalHeightCm: heightCm,
            adjustedHeightCm: adjusted,
            wasAdjusted: true,
            adjustmentCm: -0.7,
            positionUsed: 'recumbent',
            note
        };
    }

    return {
        originalHeightCm: heightCm,
        adjustedHeightCm: heightCm,
        wasAdjusted: false,
        adjustmentCm: 0,
        positionUsed: position,
        note: null
    };
}

export function getGrowthNorms(
    totalMonths: number, 
    gender: 'male' | 'female' | string = 'male',
    standard: GrowthStandard = 'neyzi_2015'
) {
    const sex = (gender === 'female' || gender === 'F') ? 'female' : 'male';
    const data = standard === 'who_2022' ? WHO_2022_DATA[sex] : NEYZI_2015_DATA[sex];
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

    const headCircL = interpolate(m, HC_AGE_MONTHS_GRID, data.headCirc.L);
    const headCircM = interpolate(m, HC_AGE_MONTHS_GRID, data.headCirc.M);
    const headCircS = interpolate(m, HC_AGE_MONTHS_GRID, data.headCirc.S);

    return {
        height: { l: heightL, m: heightM, s: heightS },
        weight: { l: weightL, m: weightM, s: weightS },
        bmi: { l: bmiL, m: bmiM, s: bmiS },
        headCirc: { l: headCircL, m: headCircM, s: headCircS }
    };
}

export interface StandardComparisonResult {
    alternativeStandard: GrowthStandard;
    alternativeStandardLabel: string;
    alternativeHeightZ: number | null;
    alternativeHeightPercentile: number | null;
    alternativeWeightZ: number | null;
    alternativeWeightPercentile: number | null;
    alternativeBmiZ: number | null;
    alternativeBmiPercentile: number | null;
    heightDiscordanceAlert: string | null;
    weightDiscordanceAlert: string | null;
}

export interface PercentilesInput {
    ageMonths?: number | null | undefined;
    totalMonths?: number | null | undefined;
    gender: 'male' | 'female' | string;
    heightCm?: number | null;
    weightKg?: number | null;
    headCircumferenceCm?: number | null;
    headCircCm?: number | null;
    isPediatric?: boolean;
    useRestrictedLMS?: boolean;
    standard?: GrowthStandard;
    measurementPosition?: MeasurementPosition;
    previousHeadCircCm?: number | null;
    headCircDaysBetween?: number | null;
    hasBulgingFontanelle?: boolean;
    hasSunsetEyes?: boolean;
    hasVomitingLethargy?: boolean;
    hasSeparatedSutures?: boolean;
    parentalMacrocephaly?: boolean;
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
    heightExactPercentile: number | null;
    weightExactPercentile: number | null;
    bmiExactPercentile: number | null;
    headCircumferenceExactPercentile: number | null;
    isRestrictedLMSApplied: boolean;
    standardUsed: GrowthStandard;
    standardLabel: string;
    measurementPosition: 'recumbent' | 'standing';
    positionCorrectionApplied: boolean;
    positionCorrectionCm: number;
    positionCorrectionNote: string | null;
    comparisonWithAlternative?: StandardComparisonResult | null;
    lmsParameters?: {
        height?: { l: number; m: number; s: number };
        weight?: { l: number; m: number; s: number };
        bmi?: { l: number; m: number; s: number };
        headCirc?: { l: number; m: number; s: number };
    };
    category: string;
    headCircCategory: string | null;
    cranialScreening?: CranialScreeningResult | null;
    weight: number | null;
    height: number | null;
    bmi: number | null;
}

export function calculatePercentiles({
    ageMonths,
    totalMonths,
    gender,
    heightCm = null,
    weightKg = null,
    headCircumferenceCm = null,
    headCircCm = null,
    useRestrictedLMS,
    standard = 'neyzi_2015',
    measurementPosition = 'auto',
    previousHeadCircCm = null,
    headCircDaysBetween = null,
    hasBulgingFontanelle = false,
    hasSunsetEyes = false,
    hasVomitingLethargy = false,
    hasSeparatedSutures = false,
    parentalMacrocephaly = false
}: PercentilesInput): PercentilesResult | null {
    const effectiveMonths = (ageMonths !== undefined && ageMonths !== null) ? ageMonths : totalMonths;
    if (effectiveMonths === null || effectiveMonths === undefined || isNaN(effectiveMonths)) return null;
    const sex: 'male' | 'female' = (gender === 'female' || gender === 'F') ? 'female' : 'male';
    const effectiveHeadCircCm = (headCircumferenceCm !== null && headCircumferenceCm !== undefined) ? headCircumferenceCm : headCircCm;

    // DSÖ'de ağırlık ve VKİ için restricted LMS zorunludur; aksi belirtilmedikçe true çalışır
    const shouldRestrict = useRestrictedLMS !== undefined ? useRestrictedLMS : true;

    // 1. Pozisyonel Boy Düzeltmesi (24-36 ay kırılma kontrolü)
    let effectiveHeight = heightCm;
    let posResult: PositionAdjustmentResult | null = null;
    if (heightCm !== null && heightCm > 0) {
        posResult = adjustHeightForPosition(heightCm, effectiveMonths, measurementPosition, standard);
        effectiveHeight = posResult.adjustedHeightCm;
    }

    // 2. Birincil Referans Normları ve Z Skorları
    const norms = getGrowthNorms(effectiveMonths, sex, standard);

    let heightZ: number | null = null;
    let heightP: number | null = null;
    let heightExactP: number | null = null;
    if (effectiveHeight !== null && effectiveHeight > 0) {
        heightZ = calculateLMSZScore(effectiveHeight, norms.height.l, norms.height.m, norms.height.s, false);
        heightP = zToPercentile(heightZ);
        heightExactP = zToExactPercentile(heightZ, 2);
    }

    let weightZ: number | null = null;
    let weightP: number | null = null;
    let weightExactP: number | null = null;
    let weightRestrictedTriggered = false;
    if (weightKg !== null && weightKg > 0) {
        weightZ = calculateLMSZScore(weightKg, norms.weight.l, norms.weight.m, norms.weight.s, shouldRestrict);
        weightP = zToPercentile(weightZ);
        weightExactP = zToExactPercentile(weightZ, 2);
        if (shouldRestrict) {
            const rawZ = calculateStandardLMSZScore(weightKg, norms.weight.l, norms.weight.m, norms.weight.s);
            if (rawZ !== null && Math.abs(rawZ) > 3) {
                weightRestrictedTriggered = true;
            }
        }
    }

    let bmiValue: number | null = null;
    let bmiZ: number | null = null;
    let bmiP: number | null = null;
    let bmiExactP: number | null = null;
    let bmiRestrictedTriggered = false;
    if (effectiveHeight && weightKg && effectiveHeight > 0 && weightKg > 0) {
        const heightM = effectiveHeight / 100;
        bmiValue = Number((weightKg / (heightM * heightM)).toFixed(1));
        bmiZ = calculateLMSZScore(bmiValue, norms.bmi.l, norms.bmi.m, norms.bmi.s, shouldRestrict);
        bmiP = zToPercentile(bmiZ);
        bmiExactP = zToExactPercentile(bmiZ, 2);
        if (shouldRestrict) {
            const rawZ = calculateStandardLMSZScore(bmiValue, norms.bmi.l, norms.bmi.m, norms.bmi.s);
            if (rawZ !== null && Math.abs(rawZ) > 3) {
                bmiRestrictedTriggered = true;
            }
        }
    }

    let headCircZ: number | null = null;
    let headCircP: number | null = null;
    let headCircExactP: number | null = null;
    let cranialScreening: CranialScreeningResult | null = null;
    if (effectiveHeadCircCm !== null && effectiveHeadCircCm > 0 && effectiveMonths <= 216) {
        headCircZ = calculateLMSZScore(effectiveHeadCircCm, norms.headCirc.l, norms.headCirc.m, norms.headCirc.s, false);
        headCircP = zToPercentile(headCircZ);
        headCircExactP = zToExactPercentile(headCircZ, 2);

        cranialScreening = calculateCranialScreening({
            currentHeadCircCm: effectiveHeadCircCm,
            ageMonths: effectiveMonths,
            gender: sex,
            previousHeadCircCm: previousHeadCircCm || undefined,
            daysBetween: headCircDaysBetween || undefined,
            hasBulgingFontanelle,
            hasSunsetEyes,
            hasVomitingLethargy,
            hasSeparatedSutures,
            parentalMacrocephaly,
            standard
        });
    }

    let category = '';
    if (bmiP !== null) {
        if (bmiP < 5) category = 'Zayıf (< 5. persentil)';
        else if (bmiP < 85) category = 'Normal kilolu (5 - 85. persentil)';
        else if (bmiP < 95) category = 'Fazla kilolu (85 - 95. persentil)';
        else category = 'Obez (≥ 95. persentil)';
    }

    let headCircCategory: string | null = null;
    if (cranialScreening) {
        headCircCategory = cranialScreening.riskTitle;
    }

    // 3. Alternatif Referans ile Klinik Karşılaştırma (Neyzi vs DSÖ Ayrışma Denetimi)
    const altStandard: GrowthStandard = standard === 'neyzi_2015' ? 'who_2022' : 'neyzi_2015';
    const altNorms = getGrowthNorms(effectiveMonths, sex, altStandard);
    let altHeightZ: number | null = null;
    let altHeightP: number | null = null;
    let altWeightZ: number | null = null;
    let altWeightP: number | null = null;
    let altBmiZ: number | null = null;
    let altBmiP: number | null = null;
    let heightDiscordanceAlert: string | null = null;
    let weightDiscordanceAlert: string | null = null;

    if (effectiveHeight !== null && effectiveHeight > 0) {
        altHeightZ = calculateLMSZScore(effectiveHeight, altNorms.height.l, altNorms.height.m, altNorms.height.s, false);
        altHeightP = zToPercentile(altHeightZ);
        if (heightZ !== null && altHeightZ !== null) {
            if (standard === 'neyzi_2015' && altHeightZ < -2.0 && heightZ >= -1.88) {
                heightDiscordanceAlert = `⚠️ REFERANS UYUMSUZLUĞU: DSÖ 2022 eğrisine göre çocuk "Boy Kısalığı / Bodurluk" (Z: ${altHeightZ.toFixed(2)} < -2.0 SD) kategorisine düşerken, Neyzi 2015 ulusal referansına göre normal sınırdadır (%${heightP}). Türk çocuklarında genetik ve pubertal zamanlama farkı nedeniyle ulusal referans esas alınmalıdır (Bundak, Neyzi 2022).`;
            } else if (standard === 'neyzi_2015' && heightZ < -2.0 && altHeightZ >= -2.0) {
                heightDiscordanceAlert = `⚠️ KLİNİK DİKKAT: Neyzi ulusal referansına göre patolojik boy kısalığı (Z: ${heightZ.toFixed(2)} < -2.0 SD) saptanırken, DSÖ referansında normal aralıkta görünmektedir. Adölesan yaş grubunda erken puberte farkı nedeniyle Neyzi eğrisi tanısal duyarlılığı korur.`;
            } else if (standard === 'who_2022' && heightZ < -2.0 && altHeightZ >= -1.88) {
                heightDiscordanceAlert = `⚠️ BİLGİ: DSÖ standardı boy kısalığı (Z < -2.0 SD) bildirmektedir; ancak Türk Ulusal Referansı (Neyzi 2015) ile değerlendirildiğinde çocuk normal persentildedir (%${altHeightP}).`;
            }
        }
    }

    if (weightKg !== null && weightKg > 0) {
        altWeightZ = calculateLMSZScore(weightKg, altNorms.weight.l, altNorms.weight.m, altNorms.weight.s, shouldRestrict);
        altWeightP = zToPercentile(altWeightZ);
        if (weightZ !== null && altWeightZ !== null) {
            if (standard === 'neyzi_2015' && altWeightZ < -2.0 && weightZ >= -2.0) {
                weightDiscordanceAlert = `ℹ️ Düşük kilo taramasında DSÖ referansı Türk bebeklerinde yalancı pozitif boy kısalığı/düşük kilo uyarısı verebilir (DSÖ Z: ${altWeightZ.toFixed(2)} vs Neyzi Z: ${weightZ.toFixed(2)}).`;
            }
        }
    }

    if (effectiveHeight && weightKg && effectiveHeight > 0 && weightKg > 0) {
        const heightM = effectiveHeight / 100;
        const altBmiVal = Number((weightKg / (heightM * heightM)).toFixed(1));
        altBmiZ = calculateLMSZScore(altBmiVal, altNorms.bmi.l, altNorms.bmi.m, altNorms.bmi.s, shouldRestrict);
        altBmiP = zToPercentile(altBmiZ);
    }

    const comparisonWithAlternative: StandardComparisonResult = {
        alternativeStandard: altStandard,
        alternativeStandardLabel: altStandard === 'who_2022' ? 'DSÖ 2022 (WHO Child Growth Standards)' : 'Neyzi 2015 (Türk Çocukları Ulusal Referansı)',
        alternativeHeightZ: altHeightZ !== null ? Number(altHeightZ.toFixed(2)) : null,
        alternativeHeightPercentile: altHeightP,
        alternativeWeightZ: altWeightZ !== null ? Number(altWeightZ.toFixed(2)) : null,
        alternativeWeightPercentile: altWeightP,
        alternativeBmiZ: altBmiZ !== null ? Number(altBmiZ.toFixed(2)) : null,
        alternativeBmiPercentile: altBmiP,
        heightDiscordanceAlert,
        weightDiscordanceAlert
    };

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
        heightExactPercentile: heightExactP,
        weightExactPercentile: weightExactP,
        bmiExactPercentile: bmiExactP,
        headCircumferenceExactPercentile: headCircExactP,
        isRestrictedLMSApplied: weightRestrictedTriggered || bmiRestrictedTriggered,
        standardUsed: standard,
        standardLabel: standard === 'who_2022' ? 'DSÖ 2022 (WHO Child Growth Standards)' : 'Neyzi 2015 (Türk Çocukları Ulusal Referansı)',
        measurementPosition: posResult?.positionUsed || (effectiveMonths <= 36 ? 'recumbent' : 'standing'),
        positionCorrectionApplied: posResult?.wasAdjusted || false,
        positionCorrectionCm: posResult?.adjustmentCm || 0,
        positionCorrectionNote: posResult?.note || null,
        comparisonWithAlternative,
        lmsParameters: {
            height: { l: norms.height.l, m: norms.height.m, s: norms.height.s },
            weight: { l: norms.weight.l, m: norms.weight.m, s: norms.weight.s },
            bmi: { l: norms.bmi.l, m: norms.bmi.m, s: norms.bmi.s },
            headCirc: { l: norms.headCirc.l, m: norms.headCirc.m, s: norms.headCirc.s }
        },
        category,
        headCircCategory,
        cranialScreening,
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

    const adultM = isBoy ? 176.2 : 163.1;
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
    isTermEquivalent?: boolean;
    postmenstrualWeeks?: number;
    stopRuleApplied?: boolean;
    explanation?: string;
}

export function calculateCorrectedAge({ 
    chronologicalMonths, 
    gestationalWeeks 
}: CorrectedAgeInput): CorrectedAgeResult | null {
    if (chronologicalMonths === null || gestationalWeeks === null || chronologicalMonths === undefined || gestationalWeeks === undefined || isNaN(chronologicalMonths) || isNaN(gestationalWeeks)) {
        return null;
    }
    
    // Negatif ay kontrolü
    if (chronologicalMonths < 0) {
        return null;
    }

    // Gestasyonel hafta geçerlilik aralığı [22 - 42], viabilite altı ve postterm sınırlandırması (HATA-M1-005)
    const clampedGw = Math.max(22, Math.min(42, Math.round(gestationalWeeks)));

    // Term doğum (>= 37 GH) durumunda prematürite kalkanı tetiklenmez
    if (clampedGw >= 37) {
        return {
            isPreterm: false,
            gestationalWeeks: clampedGw,
            correctedMonths: chronologicalMonths,
            weeksMissing: 0,
            isTermEquivalent: true,
            postmenstrualWeeks: +(clampedGw + (chronologicalMonths * 4.348)).toFixed(1),
            explanation: 'Term doğum (>= 37 GH); düzeltilmiş yaş gerekmez.'
        };
    }

    // 2 Yaş (24 Ay / 104 Hafta) Kılavuz Stop Kuralı (AAP / CDC Catch-Up) (HATA-M1-004)
    if (chronologicalMonths >= 24) {
        return {
            isPreterm: false,
            gestationalWeeks: clampedGw,
            weeksMissing: 0,
            correctedMonths: chronologicalMonths,
            correctedMonthsFormatted: `${Math.floor(chronologicalMonths / 12)} Yaş ${Math.round(chronologicalMonths % 12)} Ay`,
            isTermEquivalent: true,
            stopRuleApplied: true,
            explanation: '2 yaşından (24 ay) büyük çocuklarda düzeltilmiş yaş uygulanmaz (AAP/CDC kılavuzu); takvim yaşı esas alınmıştır.'
        };
    }

    const weeksMissing = Math.max(0, 40 - clampedGw);
    const monthsMissing = weeksMissing / 4.348;
    const rawCorrectedMonths = chronologicalMonths - monthsMissing;
    const postmenstrualWeeks = +(clampedGw + (chronologicalMonths * 4.348)).toFixed(1);

    // Term Eşdeğer Yaş (40. GH) Öncesi Prematüre Bebek (HATA-M1-003)
    if (rawCorrectedMonths < 0) {
        return {
            isPreterm: true,
            gestationalWeeks: clampedGw,
            weeksMissing,
            correctedMonths: 0,
            correctedMonthsFormatted: `PMA: ${postmenstrualWeeks}. Hafta (Term Öncesi Prematüre)`,
            isTermEquivalent: false,
            postmenstrualWeeks,
            explanation: `Bebek henüz term eşdeğeri yaşa (40. GH) ulaşmamıştır. Postmenstrüel Yaş (PMA): ${postmenstrualWeeks} hafta.`
        };
    }

    const correctedMonths = Number(rawCorrectedMonths.toFixed(1));

    return {
        isPreterm: true,
        gestationalWeeks: clampedGw,
        weeksMissing,
        correctedMonths,
        correctedMonthsFormatted: `${Math.floor(correctedMonths)} ay ${Math.round((correctedMonths % 1) * 30)} gün`,
        isTermEquivalent: true,
        postmenstrualWeeks,
        explanation: `${weeksMissing} hafta erken doğum nedeniyle takvim yaşından ${monthsMissing.toFixed(1)} ay düşülmüştür.`
    };
}

// ---------------------------------------------------------------------------
// ERKEN SÜT ÇOCUKLUĞU (<6 AY) BÜYÜME HIZI, PERSENTİL KANALI & AKUT MALNÜTRİSYON
// ---------------------------------------------------------------------------

export interface CentileChannel {
    channelIndex: number; // 1 to 10
    label: string; // e.g. "<0.4p", "0.4-2p", "2-9p", "9-25p", "25-50p", "50-75p", "75-91p", "91-98p", "98-99.6p", ">99.6p"
    zMin: number;
    zMax: number;
    pMin: number;
    pMax: number;
}

export const CENTILE_CHANNELS: CentileChannel[] = [
    { channelIndex: 1, label: '<0.4p', zMin: -Infinity, zMax: -2.67, pMin: 0, pMax: 0.4 },
    { channelIndex: 2, label: '0.4-2p', zMin: -2.67, zMax: -2.05, pMin: 0.4, pMax: 2 },
    { channelIndex: 3, label: '2-9p', zMin: -2.05, zMax: -1.34, pMin: 2, pMax: 9 },
    { channelIndex: 4, label: '9-25p', zMin: -1.34, zMax: -0.67, pMin: 9, pMax: 25 },
    { channelIndex: 5, label: '25-50p', zMin: -0.67, zMax: 0, pMin: 25, pMax: 50 },
    { channelIndex: 6, label: '50-75p', zMin: 0, zMax: 0.67, pMin: 50, pMax: 75 },
    { channelIndex: 7, label: '75-91p', zMin: 0.67, zMax: 1.34, pMin: 75, pMax: 91 },
    { channelIndex: 8, label: '91-98p', zMin: 1.34, zMax: 2.05, pMin: 91, pMax: 98 },
    { channelIndex: 9, label: '98-99.6p', zMin: 2.05, zMax: 2.67, pMin: 98, pMax: 99.6 },
    { channelIndex: 10, label: '>99.6p', zMin: 2.67, zMax: Infinity, pMin: 99.6, pMax: 100 }
];

export function getCentileChannel(percentileOrZ: number, isZScore: boolean = false): CentileChannel {
    if (isZScore) {
        for (const ch of CENTILE_CHANNELS) {
            if (percentileOrZ < ch.zMax) return ch;
        }
        return CENTILE_CHANNELS[CENTILE_CHANNELS.length - 1];
    } else {
        for (const ch of CENTILE_CHANNELS) {
            if (percentileOrZ < ch.pMax) return ch;
        }
        return CENTILE_CHANNELS[CENTILE_CHANNELS.length - 1];
    }
}

export interface GrowthVelocityInput {
    currentWeightKg: number;
    previousWeightKg: number;
    daysBetween: number;
    ageMonths: number;
    birthWeightKg?: number;
    birthPercentile?: number;
    currentPercentile?: number;
    muacMm?: number;
    weightForLengthZ?: number;
    hasBilateralEdema?: boolean;
    hasMedicalComplications?: boolean;
}

export interface GrowthVelocityResult {
    isValid: boolean;
    message?: string;
    gramsPerDay: number;
    gramsPerWeek: number;
    expectedRange: {
        minGramsPerDay: number;
        maxGramsPerDay: number;
        minGramsPerWeek: number;
        maxGramsPerWeek: number;
        referenceLabel: string;
    };
    velocityStatus: 'WEIGHT_LOSS' | 'INADEQUATE' | 'ADEQUATE' | 'EXCESSIVE';
    velocityStatusText: string;
    centileDropAnalysis?: {
        initialChannel: CentileChannel;
        currentChannel: CentileChannel;
        channelsDropped: number;
        isPathologicalFaltering: boolean;
        falteringReason?: string;
    };
    malnutritionAssessment?: {
        category: 'SAM' | 'MAM' | 'WELL_NOURISHED' | 'AT_RISK_INFANT';
        categoryText: string;
        alertClass: 'danger' | 'warning' | 'success';
        criteriaMet: string[];
        treatmentProtocol: {
            setting: 'INPATIENT' | 'OUTPATIENT';
            caloricTargetKcalKgDay: string;
            dietRecommendation: string;
            contraindications: string[];
            monitoringAdvice: string;
        };
    };
}

export function calculateGrowthVelocity(input: GrowthVelocityInput): GrowthVelocityResult {
    const {
        currentWeightKg,
        previousWeightKg,
        daysBetween,
        ageMonths,
        birthPercentile,
        currentPercentile,
        muacMm,
        weightForLengthZ,
        hasBilateralEdema,
        hasMedicalComplications
    } = input;

    if (
        !currentWeightKg ||
        !previousWeightKg ||
        !daysBetween ||
        daysBetween <= 0 ||
        currentWeightKg <= 0 ||
        previousWeightKg <= 0 ||
        ageMonths === null ||
        ageMonths === undefined ||
        isNaN(ageMonths)
    ) {
        return {
            isValid: false,
            message: 'Geçerli bir güncel ağırlık, önceki ağırlık ve gün farkı girilmelidir.',
            gramsPerDay: 0,
            gramsPerWeek: 0,
            expectedRange: {
                minGramsPerDay: 0,
                maxGramsPerDay: 0,
                minGramsPerWeek: 0,
                maxGramsPerWeek: 0,
                referenceLabel: 'Veri yetersiz'
            },
            velocityStatus: 'INADEQUATE',
            velocityStatusText: 'Hesaplanamadı'
        };
    }

    const deltaGrams = (currentWeightKg - previousWeightKg) * 1000;
    const gramsPerDay = Number((deltaGrams / daysBetween).toFixed(1));
    const gramsPerWeek = Number((gramsPerDay * 7).toFixed(1));

    // Yaşa göre beklenen normal kilo alım hızı aralıkları (WHO / AAP normları)
    let minGramsPerDay = 15;
    let maxGramsPerDay = 25;
    let minGramsPerWeek = 100;
    let maxGramsPerWeek = 175;
    let referenceLabel = 'Süt çocuğu (100-175 g/hafta)';

    if (ageMonths < 3) {
        minGramsPerDay = 20;
        maxGramsPerDay = 30;
        minGramsPerWeek = 150;
        maxGramsPerWeek = 210;
        referenceLabel = '0-3 ay (150-200 g/hafta, 20-30 g/gün)';
    } else if (ageMonths < 6) {
        minGramsPerDay = 15;
        maxGramsPerDay = 20;
        minGramsPerWeek = 100;
        maxGramsPerWeek = 150;
        referenceLabel = '3-6 ay (100-150 g/hafta, 15-20 g/gün)';
    } else if (ageMonths < 12) {
        minGramsPerDay = 10;
        maxGramsPerDay = 15;
        minGramsPerWeek = 70;
        maxGramsPerWeek = 100;
        referenceLabel = '6-12 ay (70-100 g/hafta, 10-15 g/gün)';
    } else {
        minGramsPerDay = 7;
        maxGramsPerDay = 12;
        minGramsPerWeek = 50;
        maxGramsPerWeek = 85;
        referenceLabel = '12-24 ay (50-80 g/hafta, 7-12 g/gün)';
    }

    let velocityStatus: 'WEIGHT_LOSS' | 'INADEQUATE' | 'ADEQUATE' | 'EXCESSIVE' = 'ADEQUATE';
    let velocityStatusText = 'Normal / Yeterli Kilo Artışı';

    if (gramsPerDay < 0) {
        velocityStatus = 'WEIGHT_LOSS';
        velocityStatusText = 'Kilo Kaybı (Acil Klinik Değerlendirme Gerekir)';
    } else if (gramsPerDay < minGramsPerDay) {
        velocityStatus = 'INADEQUATE';
        velocityStatusText = 'Yetersiz Büyüme Hızı (Gelişme Geriliği / Faltering Riski)';
    } else if (gramsPerDay > maxGramsPerDay * 1.5) {
        velocityStatus = 'EXCESSIVE';
        velocityStatusText = 'Beklenenden Belirgin Hızlı Kilo Artışı';
    }

    // Persentil Kanal Düşüşü Analizi (WHO / NICE Growth Faltering Kriterleri)
    let centileDropAnalysis: GrowthVelocityResult['centileDropAnalysis'] | undefined = undefined;
    if (birthPercentile !== undefined && currentPercentile !== undefined) {
        const initialChannel = getCentileChannel(birthPercentile);
        const currentChannel = getCentileChannel(currentPercentile);
        const channelsDropped = initialChannel.channelIndex - currentChannel.channelIndex;

        let isPathologicalFaltering = false;
        let falteringReason: string | undefined = undefined;

        if (currentChannel.channelIndex === 1) {
            isPathologicalFaltering = true;
            falteringReason = 'Mevcut ağırlık <0.4 persentil (Z < -2.67) altında (Kritik Malnütrisyon Sınırı).';
        } else if (initialChannel.channelIndex <= 3 && channelsDropped >= 1) {
            isPathologicalFaltering = true;
            falteringReason = `Doğum persentili <9p (${initialChannel.label}) iken ≥1 persentil kanalı düşüş saptandı (Düşüş: ${channelsDropped} kanal).`;
        } else if (initialChannel.channelIndex >= 4 && initialChannel.channelIndex <= 7 && channelsDropped >= 2) {
            isPathologicalFaltering = true;
            falteringReason = `Doğum persentili 9-91p (${initialChannel.label}) iken ≥2 persentil kanalı düşüş saptandı (Düşüş: ${channelsDropped} kanal).`;
        } else if (initialChannel.channelIndex >= 8 && channelsDropped >= 3) {
            isPathologicalFaltering = true;
            falteringReason = `Doğum persentili >91p (${initialChannel.label}) iken ≥3 persentil kanalı düşüş saptandı (Düşüş: ${channelsDropped} kanal).`;
        }

        centileDropAnalysis = {
            initialChannel,
            currentChannel,
            channelsDropped,
            isPathologicalFaltering,
            falteringReason
        };
    }

    // Akut Malnütrisyon Taraması (WHO 2022/2023 Rehberleri)
    const criteriaMet: string[] = [];

    if (hasBilateralEdema) {
        criteriaMet.push('Besinsel bilateral gode bırakan ödem (Kwashiorkor)');
    }

    if (weightForLengthZ !== undefined) {
        if (weightForLengthZ < -3.0) {
            criteriaMet.push(`Boya göre ağırlık (W/L) Z-skoru < -3.0 SD (${weightForLengthZ.toFixed(2)})`);
        } else if (weightForLengthZ < -2.0) {
            criteriaMet.push(`Boya göre ağırlık (W/L) Z-skoru -3.0 ile -2.0 SD arasında (${weightForLengthZ.toFixed(2)})`);
        }
    }

    if (muacMm !== undefined && muacMm > 0) {
        if (ageMonths < 6) {
            if (muacMm < 110) {
                criteriaMet.push(`0-6 ay kol çevresi (MUAC) < 110 mm (${muacMm} mm - Yüksek mortalite riski)`);
            } else if (muacMm < 120) {
                criteriaMet.push(`0-6 ay kol çevresi (MUAC) 110-119 mm (${muacMm} mm - Orta düzey risk)`);
            }
        } else {
            if (muacMm < 115) {
                criteriaMet.push(`6-59 ay kol çevresi (MUAC) < 115 mm (${muacMm} mm - SAM kriteri)`);
            } else if (muacMm < 125) {
                criteriaMet.push(`6-59 ay kol çevresi (MUAC) 115-124 mm (${muacMm} mm - MAM kriteri)`);
            }
        }
    }

    const isSAM = Boolean(
        hasBilateralEdema ||
        (weightForLengthZ !== undefined && weightForLengthZ < -3.0) ||
        (muacMm !== undefined && ((ageMonths < 6 && muacMm < 110) || (ageMonths >= 6 && muacMm < 115)))
    );

    const isMAM = !isSAM && Boolean(
        (weightForLengthZ !== undefined && weightForLengthZ < -2.0) ||
        (muacMm !== undefined && ((ageMonths < 6 && muacMm < 120) || (ageMonths >= 6 && muacMm < 125)))
    );

    const isAtRiskInfant = !isSAM && !isMAM && ageMonths < 6 && Boolean(
        velocityStatus === 'WEIGHT_LOSS' ||
        velocityStatus === 'INADEQUATE' ||
        (centileDropAnalysis && centileDropAnalysis.isPathologicalFaltering)
    );

    let malnutritionAssessment: GrowthVelocityResult['malnutritionAssessment'] = undefined;

    if (isSAM) {
        const isUnder6M = ageMonths < 6;
        const needsInpatient = Boolean(isUnder6M || hasMedicalComplications || hasBilateralEdema);

        malnutritionAssessment = {
            category: 'SAM',
            categoryText: 'Şiddetli Akut Malnütrisyon (SAM)',
            alertClass: 'danger',
            criteriaMet,
            treatmentProtocol: {
                setting: needsInpatient ? 'INPATIENT' : 'OUTPATIENT',
                caloricTargetKcalKgDay: isUnder6M ? '100-130 kcal/kg/gün (Anne Sütü / F-75)' : '150-185 kcal/kg/gün RUTF',
                dietRecommendation: isUnder6M
                    ? 'Anne-bebek çifti değerlendirmesi, emzirme ve relaktasyon danışmanlığı, sağılmış anne sütü. Anne sütü yoksa seyreltik F-100 veya bebek formülü.'
                    : 'RUTF (Ready-to-Use Therapeutic Food) ile ayaktan beslenme tedavisi. Tıbbi komplikasyon veya iştah testi başarısız ise Faz 1 F-75 ile yatarak tedavi.',
                contraindications: isUnder6M
                    ? ['0-6 ay bebeklerde RUTF (fıstık ezmesi bazlı terapötik macun) KONTRENDİKEDİR (solüt yükü ve aspirasyon riski)!']
                    : ['Komplikasyonlu ve iştahsız çocuklara zorla RUTF verilmemelidir.', 'Standart İ.V. sıvı infüzyonlarında yüksek sodyum yükünden kaçınılmalıdır.'],
                monitoringAdvice: isUnder6M
                    ? 'Hastanede izlem: Hipoglisemi, hipotermi, etkin emme takibi, günlük tartı.'
                    : 'Haftalık poliklinik kontrolü (hedef kilo alımı: >5 g/kg/gün), rutin oral amoksisilin tedavisi, A vitamini takviyesi.'
            }
        };
    } else if (isMAM) {
        malnutritionAssessment = {
            category: 'MAM',
            categoryText: 'Orta Düzey Akut Malnütrisyon (MAM)',
            alertClass: 'warning',
            criteriaMet,
            treatmentProtocol: {
                setting: 'OUTPATIENT',
                caloricTargetKcalKgDay: '100-130 kcal/kg/gün',
                dietRecommendation: 'RUSF (Ready-to-Use Supplementary Food) veya yüksek enerjili ev yapımı ek gıdalarla zenginleştirilmiş diyet.',
                contraindications: ['Rutin antibiyotik önerilmez (yalnızca kanıtlanmış enfeksiyon durumunda).'],
                monitoringAdvice: '2 haftada bir büyüme hızı ve kol çevresi takibi. 4-6 haftada düzelme olmazsa ileri tetkik.'
            }
        };
    } else if (isAtRiskInfant) {
        malnutritionAssessment = {
            category: 'AT_RISK_INFANT',
            categoryText: 'Erken Süt Çocukluğu Büyüme Duraklaması / Gelişme Geriliği Riski',
            alertClass: 'warning',
            criteriaMet: [
                ...criteriaMet,
                velocityStatus === 'WEIGHT_LOSS' ? 'Kilo kaybı saptandı' : 'Yetersiz büyüme hızı saptandı',
                ...(centileDropAnalysis?.falteringReason ? [centileDropAnalysis.falteringReason] : [])
            ],
            treatmentProtocol: {
                setting: hasMedicalComplications ? 'INPATIENT' : 'OUTPATIENT',
                caloricTargetKcalKgDay: '110-120 kcal/kg/gün',
                dietRecommendation: 'Anne sütü alma sıklığının günde en az 8-12 sefere çıkarılması, anne göğsünün tam boşaltılması (son süt alımı), relaktasyon ve emzirme desteği.',
                contraindications: ['0-6 ay arasında katı gıda veya yetişkin/büyük çocuk takviyeleri verilmemelidir.'],
                monitoringAdvice: 'Haftalık tartı kontrolü; büyüme hızı 15-20 g/gün seviyesine ulaşana kadar yakın takip.'
            }
        };
    } else {
        malnutritionAssessment = {
            category: 'WELL_NOURISHED',
            categoryText: 'Normal Beslenme Durumu (Ötirofik)',
            alertClass: 'success',
            criteriaMet: ['Antropometrik ve klinik malnütrisyon kriteri saptanmadı.'],
            treatmentProtocol: {
                setting: 'OUTPATIENT',
                caloricTargetKcalKgDay: 'Yaşa uygun idame (90-110 kcal/kg/gün)',
                dietRecommendation: 'Dönemine uygun dengeli anne sütü ve tamamlayıcı beslenme programının sürdürülmesi.',
                contraindications: [],
                monitoringAdvice: 'Rutin sağlam çocuk izlem takvimi.'
            }
        };
    }

    return {
        isValid: true,
        gramsPerDay,
        gramsPerWeek,
        expectedRange: {
            minGramsPerDay,
            maxGramsPerDay,
            minGramsPerWeek,
            maxGramsPerWeek,
            referenceLabel
        },
        velocityStatus,
        velocityStatusText,
        centileDropAnalysis,
        malnutritionAssessment
    };
}

// ---------------------------------------------------------------------------
// KRANİYAL BAŞ ÇEVRESİ 0-18 YAŞ & KOMBİNE HİDROSEFALİ / MİKROSEFALİ TARAMA KALKANI
// ---------------------------------------------------------------------------

export interface CranialScreeningInput {
    currentHeadCircCm: number;
    ageMonths: number;
    gender: 'male' | 'female' | string;
    previousHeadCircCm?: number;
    daysBetween?: number;
    hasBulgingFontanelle?: boolean;
    hasSunsetEyes?: boolean;
    hasVomitingLethargy?: boolean;
    hasSeparatedSutures?: boolean;
    parentalMacrocephaly?: boolean;
    standard?: GrowthStandard;
}

export interface CranialScreeningResult {
    isValid: boolean;
    message?: string;
    headCircCm: number;
    ageMonths: number;
    zScore: number | null;
    percentile: number | null;
    exactPercentile: number | null;
    staticClassification: 'SEVERE_MICROCEPHALY' | 'MICROCEPHALY' | 'NORMAL' | 'MACROCEPHALY' | 'SEVERE_MACROCEPHALY';
    staticClassificationText: string;
    dynamicVelocity?: {
        monthlyRateCm: number;
        expectedMonthlyRange: { min: number; max: number; label: string };
        isVelocityElevated: boolean;
        isVelocityDepressed: boolean;
        velocityStatusText: string;
    };
    hydrocephalusRisk: 'CRITICAL' | 'WARNING' | 'BENIGN_FAMILIAL' | 'SAFE';
    riskTitle: string;
    alertClass: 'danger' | 'warning' | 'success';
    kibasSignsDetected: string[];
    clinicalRecommendations: string[];
    urgencyLevel: 'EMERGENCY_IMAGING' | 'ROUTINE_FOLLOWUP' | 'PLANNED_USG';
}

export function calculateCranialScreening(input: CranialScreeningInput): CranialScreeningResult {
    const {
        currentHeadCircCm,
        ageMonths,
        gender,
        previousHeadCircCm,
        daysBetween,
        hasBulgingFontanelle,
        hasSunsetEyes,
        hasVomitingLethargy,
        hasSeparatedSutures,
        parentalMacrocephaly,
        standard = 'neyzi_2015'
    } = input;

    if (!currentHeadCircCm || currentHeadCircCm <= 0 || ageMonths === null || ageMonths === undefined || isNaN(ageMonths)) {
        return {
            isValid: false,
            message: 'Geçerli bir baş çevresi ve yaş girilmelidir.',
            headCircCm: currentHeadCircCm || 0,
            ageMonths: ageMonths || 0,
            zScore: null,
            percentile: null,
            exactPercentile: null,
            staticClassification: 'NORMAL',
            staticClassificationText: 'Hesaplanamadı',
            hydrocephalusRisk: 'SAFE',
            riskTitle: 'Veri Yetersiz',
            alertClass: 'success',
            kibasSignsDetected: [],
            clinicalRecommendations: [],
            urgencyLevel: 'ROUTINE_FOLLOWUP'
        };
    }

    const sex: 'male' | 'female' = (gender === 'female' || gender === 'F') ? 'female' : 'male';
    const norms = getGrowthNorms(ageMonths, sex, standard);
    const zScore = calculateLMSZScore(currentHeadCircCm, norms.headCirc.l, norms.headCirc.m, norms.headCirc.s, false);
    const percentile = zToPercentile(zScore);
    const exactPercentile = zToExactPercentile(zScore, 2);

    let staticClassification: CranialScreeningResult['staticClassification'] = 'NORMAL';
    let staticClassificationText = 'Normal Kraniyal Baş Çevresi (3 - 97. persentil)';

    if (zScore !== null) {
        if (zScore < -3.0) {
            staticClassification = 'SEVERE_MICROCEPHALY';
            staticClassificationText = '🔴 Ağır Mikrosefali (Z < -3.0 SD, <0.13. persentil)';
        } else if (zScore < -2.0) {
            staticClassification = 'MICROCEPHALY';
            staticClassificationText = '🟡 Mikrosefali (Z < -2.0 SD, <3. persentil)';
        } else if (zScore > 3.0) {
            staticClassification = 'SEVERE_MACROCEPHALY';
            staticClassificationText = '🔴 İleri Makrosefali (Z > +3.0 SD, >99.87. persentil)';
        } else if (zScore > 2.0) {
            staticClassification = 'MACROCEPHALY';
            staticClassificationText = '🟡 Makrosefali (Z > +2.0 SD, >97. persentil)';
        }
    }

    // Dinamik Baş Çevresi Hızı (Velocity) Hesabı
    let dynamicVelocity: CranialScreeningResult['dynamicVelocity'] = undefined;
    let isVelocityElevated = false;
    let isVelocityDepressed = false;

    if (previousHeadCircCm && previousHeadCircCm > 0 && daysBetween && daysBetween > 0) {
        const deltaCm = currentHeadCircCm - previousHeadCircCm;
        const monthlyRateCm = Number(((deltaCm / daysBetween) * 30.4375).toFixed(2));

        let min = 0.05;
        let max = 0.25;
        let label = 'Süt çocuğu';

        if (ageMonths < 3) {
            min = 1.2;
            max = 2.2;
            label = '0-3 ay (1.5 - 2.0 cm/ay, azami 2.2 cm/ay)';
        } else if (ageMonths < 6) {
            min = 0.6;
            max = 1.5;
            label = '3-6 ay (0.8 - 1.2 cm/ay, azami 1.5 cm/ay)';
        } else if (ageMonths < 12) {
            min = 0.3;
            max = 0.8;
            label = '6-12 ay (0.4 - 0.6 cm/ay, azami 0.8 cm/ay)';
        } else if (ageMonths < 36) {
            min = 0.05;
            max = 0.25;
            label = '1-3 yaş (~0.1 - 0.15 cm/ay, azami 0.25 cm/ay)';
        } else {
            min = 0.0;
            max = 0.15;
            label = '>3 yaş (<0.1 cm/ay)';
        }

        isVelocityElevated = monthlyRateCm > max;
        isVelocityDepressed = monthlyRateCm < min && deltaCm < 0.2;

        let velocityStatusText = `Normal Baş Büyüme Hızı (${monthlyRateCm} cm/ay)`;
        if (isVelocityElevated) {
            velocityStatusText = `⚠️ Hızlı Baş Büyümesi (${monthlyRateCm} cm/ay > azami ${max} cm/ay) - Persentil Kanal Sıçraması Riski!`;
        } else if (isVelocityDepressed) {
            velocityStatusText = `⚠️ Yavaş Baş Büyümesi (${monthlyRateCm} cm/ay < asgari ${min} cm/ay) - Kraniyosinostoz / Büyüme Duraklaması`;
        }

        dynamicVelocity = {
            monthlyRateCm,
            expectedMonthlyRange: { min, max, label },
            isVelocityElevated,
            isVelocityDepressed,
            velocityStatusText
        };
    }

    // KİBAS (Artmış Kafa İçi Basınç) Bulgularının Taranması
    const kibasSignsDetected: string[] = [];
    if (hasBulgingFontanelle) kibasSignsDetected.push('Gergin / bombeli ön fontanel');
    if (hasSunsetEyes) kibasSignsDetected.push('Batan güneş gözü belirtisi (Sunset phenomenon)');
    if (hasVomitingLethargy) kibasSignsDetected.push('Fışkırır tarzda kusma / letarji / irritabilite');
    if (hasSeparatedSutures) kibasSignsDetected.push('Kranial sütürlerde patolojik ayrılma (diyastaz)');

    const hasKibasSigns = kibasSignsDetected.length > 0;
    const isStaticSevereMacro = zScore !== null && zScore > 3.0;
    const isStaticMacro = zScore !== null && zScore > 2.0;
    const isStaticSevereMicro = zScore !== null && zScore < -3.0;
    const isStaticMicro = zScore !== null && zScore < -2.0;

    let hydrocephalusRisk: CranialScreeningResult['hydrocephalusRisk'] = 'SAFE';
    let riskTitle = 'Normal Kraniyal Gelişim';
    let alertClass: CranialScreeningResult['alertClass'] = 'success';
    let urgencyLevel: CranialScreeningResult['urgencyLevel'] = 'ROUTINE_FOLLOWUP';
    const clinicalRecommendations: string[] = [];

    if (hasKibasSigns && (isStaticMacro || isVelocityElevated || isStaticSevereMacro)) {
        hydrocephalusRisk = 'CRITICAL';
        riskTitle = '🔴 ACİL HİDROSEFALİ ALARMI: KİBAS Bulguları & Hızlı/Geniş Baş Çevresi';
        alertClass = 'danger';
        urgencyLevel = 'EMERGENCY_IMAGING';
        clinicalRecommendations.push('Ön fontanel açıksa derhal yatak başı Transfontanel Ultrasonografi (TFUS) veya sedasyonsuz Hızlı Beyin MRG planlanmalıdır.');
        clinicalRecommendations.push('Acil Çocuk Beyin Cerrahisi (Nöroşirürji) konsültasyonu istenmelidir.');
        clinicalRecommendations.push('⚠️ KİBAS şüphesinde serebellar tonsiller herniasyon riski nedeniyle beyin görüntülemesi yapılmadan Lomber Ponksiyon (LP) KONTRENDİKEDİR.');
    } else if (isStaticSevereMacro) {
        hydrocephalusRisk = 'CRITICAL';
        riskTitle = '🔴 İLERİ MAKROSEFALİ (Z > +3.0 SD): Kritik Hidrosefali Taraması';
        alertClass = 'danger';
        urgencyLevel = 'EMERGENCY_IMAGING';
        clinicalRecommendations.push('Z-skoru +3.0 SD üzerindedir (>99.87. persentil). Klinik semptom olmasa bile acil nörogörüntüleme (TFUS / Kraniyal MRG) endikedir.');
        clinicalRecommendations.push('Konjenital hidrosefali, araknoid kist, subdural efüzyon ve metabolik/genetik megalensefali dışlanmalıdır.');
    } else if (hasKibasSigns) {
        hydrocephalusRisk = 'CRITICAL';
        riskTitle = '🔴 KİBAS BULGULARI MEVCUT (Nörolojik Acil İnceleme)';
        alertClass = 'danger';
        urgencyLevel = 'EMERGENCY_IMAGING';
        clinicalRecommendations.push('Kafa içi basınç artışı semptomları saptandı. Acil pediatrik nöroloji değerlendirmesi ve kraniyal görüntüleme gerekir.');
    } else if (isVelocityElevated) {
        hydrocephalusRisk = 'WARNING';
        riskTitle = '🟡 HIZLI KRANİYAL GENİŞLEME: Dinamik Persentil Kanal Sıçraması';
        alertClass = 'warning';
        urgencyLevel = 'PLANNED_USG';
        clinicalRecommendations.push('Baş çevresi artış hızı yaşa göre beklenen azami sınırı aşmaktadır. Persentil kanal sıçraması hidrosefalinin erken evresi olabilir.');
        clinicalRecommendations.push('Ön fontanel açıksa Transfontanel USG ile ventrikül boyutları (Evans indeksi) taranmalıdır.');
        clinicalRecommendations.push('2-4 hafta arayla yakın baş çevresi takibi yapılmalıdır.');
    } else if (isStaticMacro) {
        if (parentalMacrocephaly && !isVelocityElevated) {
            hydrocephalusRisk = 'BENIGN_FAMILIAL';
            riskTitle = '🟢 Ailesel (Benign) Makrosefali Düşünülüyor';
            alertClass = 'success';
            urgencyLevel = 'ROUTINE_FOLLOWUP';
            clinicalRecommendations.push('Ebeveynde makrosefali mevcuttur, büyüme hızı persentil çizgisine paraleldir ve nörolojik bulgu yoktur.');
            clinicalRecommendations.push('Rutin sağlam çocuk kontrollerinde baş çevresi artış eğrisinin izlenmesi yeterlidir.');
        } else {
            hydrocephalusRisk = 'WARNING';
            riskTitle = '🟡 MAKROSEFALİ (Z > +2.0 SD, >97. persentil)';
            alertClass = 'warning';
            urgencyLevel = 'PLANNED_USG';
            clinicalRecommendations.push('Anne ve baba baş çevreleri ölçülerek ailesel makrosefali kuralı (Weaver) değerlendirilmelidir.');
            clinicalRecommendations.push('Fontanel açıksa TFUS ile ekstraaksiyel sıvı ve ventrikül genişliği taranmalıdır.');
        }
    } else if (isStaticSevereMicro) {
        hydrocephalusRisk = 'CRITICAL';
        riskTitle = '🔴 AĞIR MİKROSEFALİ (Z < -3.0 SD, <0.13. persentil)';
        alertClass = 'danger';
        urgencyLevel = 'EMERGENCY_IMAGING';
        clinicalRecommendations.push('Kraniyosinostoz (sütürlerin erken kapanması), intrauterin TORCH enfeksiyonları, monogenik mikrosefali ve fetal hipoksik hasar açısından çocuk nörolojisi konsültasyonu.');
        clinicalRecommendations.push('3D Kraniyal BT (sütür sinostozu şüphesinde) veya Beyin MRG planlanmalıdır.');
    } else if (isStaticMicro) {
        hydrocephalusRisk = 'WARNING';
        riskTitle = '🟡 MİKROSEFALİ (Z < -2.0 SD, <3. persentil)';
        alertClass = 'warning';
        urgencyLevel = 'ROUTINE_FOLLOWUP';
        clinicalRecommendations.push('Baş büyüme hızı ve nöromotor gelişim basamakları (baş kontrolü, takip, kavrama) yakından izlenmelidir.');
        clinicalRecommendations.push('Sütür hatlarında kenar kabarıklığı/sırtlanma (palpable ridge) muayene edilmelidir.');
    } else {
        clinicalRecommendations.push('Baş çevresi yaş ve cinsiyete göre normal persentil aralığındadır (3 - 97. persentil).');
    }

    return {
        isValid: true,
        headCircCm: currentHeadCircCm,
        ageMonths,
        zScore: zScore !== null ? Number(zScore.toFixed(2)) : null,
        percentile,
        exactPercentile,
        staticClassification,
        staticClassificationText,
        dynamicVelocity,
        hydrocephalusRisk,
        riskTitle,
        alertClass,
        kibasSignsDetected,
        clinicalRecommendations,
        urgencyLevel
    };
}


