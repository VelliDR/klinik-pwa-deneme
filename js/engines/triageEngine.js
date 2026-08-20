// Triage Engine: NEWS2, PEWS, GCS/pGCS

export function calculateNEWS2(hr, sbp, rr, temp, spo2, oxygen, avpu) {
    // hr, sbp, rr, spo2: numbers
    // temp: number (celsius)
    // oxygen: bool
    // avpu: 'A' (Alert) or 'V', 'P', 'U'

    if (hr === null && sbp === null && rr === null && temp === null) return null;

    let score = 0;
    
    // RR
    if (rr !== null) {
        if (rr <= 8) score += 3;
        else if (rr >= 9 && rr <= 11) score += 1;
        else if (rr >= 21 && rr <= 24) score += 2;
        else if (rr >= 25) score += 3;
    }

    // SpO2 (Scale 1 for simplicity)
    if (spo2 !== null) {
        if (spo2 <= 91) score += 3;
        else if (spo2 >= 92 && spo2 <= 93) score += 2;
        else if (spo2 >= 94 && spo2 <= 95) score += 1;
    }

    // Oxygen supplemental
    if (oxygen) score += 2;

    // SBP
    if (sbp !== null) {
        if (sbp <= 90) score += 3;
        else if (sbp >= 91 && sbp <= 100) score += 2;
        else if (sbp >= 101 && sbp <= 110) score += 1;
        else if (sbp >= 220) score += 3;
    }

    // HR
    if (hr !== null) {
        if (hr <= 40) score += 3;
        else if (hr >= 41 && hr <= 50) score += 1;
        else if (hr >= 91 && hr <= 110) score += 1;
        else if (hr >= 111 && hr <= 130) score += 2;
        else if (hr >= 131) score += 3;
    }

    // Temp
    if (temp !== null) {
        if (temp <= 35.0) score += 3;
        else if (temp >= 35.1 && temp <= 36.0) score += 1;
        else if (temp >= 38.1 && temp <= 39.0) score += 1;
        else if (temp >= 39.1) score += 2;
    }

    // AVPU
    if (avpu !== null && avpu !== 'A') score += 3;

    let risk = '';
    let recommendation = '';
    if (score <= 4) {
        risk = 'Düşük';
        recommendation = '4-6 saatte bir vitallerin takibi.';
    } else if (score >= 5 && score <= 6) {
        risk = 'Orta';
        recommendation = 'Acil tıbbi değerlendirme. Saatte bir takip.';
    } else {
        risk = 'Yüksek';
        recommendation = 'Kırmızı alan / Acil Müdahale Odası veya YBÜ devri.';
    }

    return { score, risk, recommendation };
}

export function calculatePEWS(behavior, cv, resp) {
    // scores 0-3 for each
    if (behavior === null || cv === null || resp === null) return null;

    const score = parseInt(behavior) + parseInt(cv) + parseInt(resp);
    
    let risk = '';
    let recommendation = '';
    
    if (score <= 2) {
        risk = 'Düşük';
        recommendation = 'Rutin takip.';
    } else if (score >= 3 && score <= 4) {
        risk = 'Orta';
        recommendation = 'Kıdemli asistan / uzman hekime haber verin.';
    } else {
        risk = 'Yüksek';
        recommendation = 'Kırmızı kod çağrısı ve YBÜ hazırlığı yapın.';
    }

    return { score, risk, recommendation };
}

export function calculateGCS(eye, verbal, motor) {
    if (eye === null || verbal === null || motor === null) return null;
    
    const e = parseInt(eye);
    const v = parseInt(verbal);
    const m = parseInt(motor);
    const total = e + v + m;
    
    let interpretation = '';
    if (total === 15) interpretation = 'Bilinç açık (Normal).';
    else if (total >= 13) interpretation = 'Hafif kafa travması / bilinç bozukluğu.';
    else if (total >= 9) interpretation = 'Orta derece kafa travması / bilinç bozukluğu.';
    else interpretation = 'Ağır kafa travması / koma.';
    
    const airwayRisk = total <= 8 ? 'Entübasyon / Havayolu güvenliği sağlanmalı.' : null;
    
    return { e, v, m, total, interpretation, airwayRisk };
}
