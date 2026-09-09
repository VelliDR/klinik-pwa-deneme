// Triage Engine: NEWS2, PEWS, GCS/pGCS

export function calculateNEWS2(hr, sbp, rr, temp, spo2, oxygen, avpu) {
    if (hr == null && sbp == null && rr == null && temp == null) return null;

    let score = 0;
    let hasRedScore = false;

    const addScore = (pts) => {
        score += pts;
        if (pts === 3) hasRedScore = true;
    };
    
    // RR
    if (rr != null && !isNaN(rr)) {
        if (rr <= 8) addScore(3);
        else if (rr >= 9 && rr <= 11) addScore(1);
        else if (rr >= 21 && rr <= 24) addScore(2);
        else if (rr >= 25) addScore(3);
    }

    // SpO2 (Scale 1 for simplicity)
    if (spo2 != null && !isNaN(spo2)) {
        if (spo2 <= 91) addScore(3);
        else if (spo2 >= 92 && spo2 <= 93) addScore(2);
        else if (spo2 >= 94 && spo2 <= 95) addScore(1);
    }

    // Oxygen supplemental
    if (oxygen) addScore(2);

    // SBP
    if (sbp != null && !isNaN(sbp)) {
        if (sbp <= 90) addScore(3);
        else if (sbp >= 91 && sbp <= 100) addScore(2);
        else if (sbp >= 101 && sbp <= 110) addScore(1);
        else if (sbp >= 220) addScore(3);
    }

    // HR
    if (hr != null && !isNaN(hr)) {
        if (hr <= 40) addScore(3);
        else if (hr >= 41 && hr <= 50) addScore(1);
        else if (hr >= 91 && hr <= 110) addScore(1);
        else if (hr >= 111 && hr <= 130) addScore(2);
        else if (hr >= 131) addScore(3);
    }

    // Temp
    if (temp != null && !isNaN(temp)) {
        if (temp <= 35.0) addScore(3);
        else if (temp >= 35.1 && temp <= 36.0) addScore(1);
        else if (temp >= 38.1 && temp <= 39.0) addScore(1);
        else if (temp >= 39.1) addScore(2);
    }

    // AVPU
    if (avpu != null && avpu !== 'A') addScore(3);

    let risk = '';
    let recommendation = '';
    
    if (score >= 7) {
        risk = 'Yüksek Klinik Risk';
        recommendation = 'Acil Hekim Değerlendirmesi. Kritik bakım ekibi çağrılmalı, YBÜ / Kırmızı Alan devri düşünülmelidir.';
    } else if (score >= 5 || hasRedScore) {
        risk = 'Orta';
        recommendation = 'Acil tıbbi değerlendirme. Saatte bir takip. Kıdemli klinik personeli bilgilendirilmelidir.';
    } else if (score >= 1) {
        risk = 'Düşük';
        recommendation = '4–6 saatte bir vitallerin takibi.';
    } else {
        risk = 'Düşük';
        recommendation = 'Rutin takip. 12 saatte bir vital kontrol.';
    }

    return { score, risk, recommendation };
}

export function calculatePEWS(behavior, cv, resp) {
    if (behavior == null || cv == null || resp == null || behavior === '' || cv === '' || resp === '') return null;

    const b = parseInt(behavior);
    const c = parseInt(cv);
    const r = parseInt(resp);

    if (isNaN(b) || isNaN(c) || isNaN(r)) return null;

    const score = b + c + r;
    
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
    if (eye == null || verbal == null || motor == null || eye === '' || verbal === '' || motor === '') return null;
    
    const e = parseInt(eye);
    const v = parseInt(verbal);
    const m = parseInt(motor);

    if (isNaN(e) || isNaN(v) || isNaN(m)) return null;

    const total = e + v + m;
    
    let interpretation = '';
    if (total === 15) interpretation = 'Bilinç açık (Normal).';
    else if (total >= 13) interpretation = 'Hafif kafa travması / bilinç bozukluğu.';
    else if (total >= 9) interpretation = 'Orta derece kafa travması / bilinç bozukluğu.';
    else interpretation = 'Ağır kafa travması / koma.';
    
    const airwayRisk = total <= 8 ? 'Entübasyon / Havayolu güvenliği sağlanmalı.' : null;
    
    return { e, v, m, total, interpretation, airwayRisk };
}
