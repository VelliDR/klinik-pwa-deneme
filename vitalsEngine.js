/**
 * VITALS ENGINE
 * Yaşa duyarlı fizyolojik sınır kontrolleri, PEWS ve NEWS2 skorlama motoru.
 */

// Yaşa Göre Normal Fizyolojik Sınırlar (Pediatri Referans Tablosu)
const PEDIATRIC_NORMS = {
    NEONATE:    { hr: [100, 180], rr: [30, 60], sys: [60, 90] },
    INFANT:     { hr: [100, 160], rr: [30, 50], sys: [70, 100] },
    TODDLER:    { hr: [90, 150],  rr: [24, 40], sys: [80, 105] },
    PRESCHOOL:  { hr: [80, 130],  rr: [20, 30], sys: [85, 110] },
    CHILD:      { hr: [70, 120],  rr: [18, 25], sys: [90, 115] },
    ADOLESCENT: { hr: [60, 100],  rr: [12, 20], sys: [100, 120] }
};

/**
 * NEWS2 Yetişkin Skorlama Algoritması
 */
function calculateNEWS2(vitals) {
    let score = 0;
    const flags = [];

    // 1. Solunum Sayısı
    if (vitals.respRate) {
        const rr = vitals.respRate;
        if (rr <= 8 || rr >= 25) { score += 3; flags.push('Solunum Kritik'); }
        else if (rr >= 21) score += 2;
        else if (rr >= 9 && rr <= 11) score += 1;
    }

    // 2. SpO2
    if (vitals.spo2) {
        if (vitals.spo2 <= 91) { score += 3; flags.push('SpO2 Kritik'); }
        else if (vitals.spo2 <= 93) score += 2;
        else if (vitals.spo2 <= 95) score += 1;
    }

    // 3. Sistolik Kan Basıncı
    if (vitals.systolicBP) {
        const sys = vitals.systolicBP;
        if (sys <= 90 || sys >= 220) { score += 3; flags.push('Tansiyon Kritik'); }
        else if (sys <= 100) score += 2;
        else if (sys <= 110) score += 1;
    }

    // 4. Nabız
    if (vitals.heartRate) {
        const hr = vitals.heartRate;
        if (hr <= 40 || hr >= 131) { score += 3; flags.push('Nabız Kritik'); }
        else if (hr >= 111) score += 2;
        else if ((hr >= 41 && hr <= 50) || (hr >= 91 && hr <= 110)) score += 1;
    }

    // 5. Ateş
    if (vitals.bodyTemp) {
        const t = vitals.bodyTemp;
        if (t <= 35.0) score += 3;
        else if (t >= 39.1) score += 2;
        else if ((t >= 35.1 && t <= 36.0) || (t >= 38.1 && t <= 39.0)) score += 1;
    }

    // Risk Seviyesi
    let risk = 'LOW'; // LOW (Yeşil), MEDIUM (Sarı), HIGH (Kırmızı)
    if (score >= 7 || flags.length > 0) risk = 'HIGH';
    else if (score >= 5) risk = 'MEDIUM';

    return { type: 'NEWS2', score, risk, flags };
}

/**
 * PEWS Pediatrik Skorlama Algoritması
 */
function calculatePEWS(vitals, ageGroupId) {
    let score = 0;
    const flags = [];
    const norm = PEDIATRIC_NORMS[ageGroupId] || PEDIATRIC_NORMS.CHILD;

    // Nabız Sapması
    if (vitals.heartRate) {
        const hr = vitals.heartRate;
        if (hr < norm.hr[0] - 20 || hr > norm.hr[1] + 30) { score += 3; flags.push('Kritik Taşikardi/Bradikardi'); }
        else if (hr < norm.hr[0] || hr > norm.hr[1] + 15) score += 2;
        else if (hr > norm.hr[1]) score += 1;
    }

    // Solunum Sayısı Sapması
    if (vitals.respRate) {
        const rr = vitals.respRate;
        if (rr < norm.rr[0] - 10 || rr > norm.rr[1] + 20) { score += 3; flags.push('Ciddi Takipne/Bradipne'); }
        else if (rr < norm.rr[0] || rr > norm.rr[1] + 10) score += 2;
        else if (rr > norm.rr[1]) score += 1;
    }

    // SpO2
    if (vitals.spo2) {
        if (vitals.spo2 < 92) { score += 3; flags.push('Hipoksi'); }
        else if (vitals.spo2 <= 94) score += 1;
    }

    // Risk Seviyesi
    let risk = 'LOW';
    if (score >= 5 || flags.length > 0) risk = 'HIGH';
    else if (score >= 3) risk = 'MEDIUM';

    return { type: 'PEWS', score, risk, flags, referenceNorms: norm };
}

/**
 * Ana Değerlendirme Fonksiyonu
 */
export function evaluateVitals(vitals, ageGroup) {
    if (!ageGroup) return null;

    if (ageGroup.isPediatric) {
        return calculatePEWS(vitals, ageGroup.id);
    } else {
        return calculateNEWS2(vitals);
    }
}