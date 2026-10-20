// Triage Engine: NEWS2, PEWS, GCS/pGCS

export interface NEWS2Result {
    score: number;
    risk: string;
    recommendation: string;
}

export function calculateNEWS2(
    hr: number | null | undefined, 
    sbp: number | null | undefined, 
    rr: number | null | undefined, 
    temp: number | null | undefined, 
    spo2: number | null | undefined, 
    oxygen: boolean | null | undefined, 
    avpu: string | null | undefined
): NEWS2Result | null {
    const hasValidNumeric = [hr, sbp, rr, temp, spo2].some(v => v != null && !isNaN(v));
    if (!hasValidNumeric) return null;

    let score = 0;
    let hasRedScore = false;

    const addScore = (pts: number) => {
        score += pts;
        if (pts === 3) hasRedScore = true;
    };
    
    // RR
    if (rr != null && !isNaN(rr)) {
        if (rr < 9) addScore(3);
        else if (rr < 12) addScore(1);
        else if (rr <= 20) { /* Normal: 12-20 -> 0 puan */ }
        else if (rr < 25) addScore(2);
        else addScore(3);
    }

    // SpO2 (Scale 1 for simplicity)
    if (spo2 != null && !isNaN(spo2)) {
        if (spo2 < 92) addScore(3);
        else if (spo2 < 94) addScore(2);
        else if (spo2 < 96) addScore(1);
    }

    // Oxygen supplemental
    if (oxygen) addScore(2);

    // SBP
    if (sbp != null && !isNaN(sbp)) {
        if (sbp <= 90) addScore(3);
        else if (sbp <= 100) addScore(2);
        else if (sbp <= 110) addScore(1);
        else if (sbp < 220) { /* Normal: 111-219 -> 0 puan */ }
        else addScore(3);
    }

    // HR
    if (hr != null && !isNaN(hr)) {
        if (hr <= 40) addScore(3);
        else if (hr <= 50) addScore(1);
        else if (hr <= 90) { /* Normal: 51-90 -> 0 puan */ }
        else if (hr <= 110) addScore(1);
        else if (hr <= 130) addScore(2);
        else addScore(3);
    }

    // Temp
    if (temp != null && !isNaN(temp)) {
        if (temp <= 35.0) addScore(3);
        else if (temp <= 36.0) addScore(1);
        else if (temp <= 38.0) { /* Normal: 36.1 - 38.0 -> 0 puan */ }
        else if (temp <= 39.0) addScore(1);
        else addScore(2);
    }

    // AVPU
    const normAvpu = typeof avpu === 'string' ? avpu.trim().toUpperCase() : '';
    if (normAvpu !== '' && normAvpu !== 'A') addScore(3);

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

export interface PEWSResult {
    score: number;
    risk: string;
    recommendation: string;
}

export function calculatePEWS(
    behavior: string | number | null | undefined, 
    cv: string | number | null | undefined, 
    resp: string | number | null | undefined
): PEWSResult | null {
    if (behavior == null || cv == null || resp == null || behavior === '' || cv === '' || resp === '') return null;

    const b = typeof behavior === 'number' ? behavior : parseInt(behavior, 10);
    const c = typeof cv === 'number' ? cv : parseInt(cv, 10);
    const r = typeof resp === 'number' ? resp : parseInt(resp, 10);

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

export interface GCSResult {
    e: number;
    v: number;
    m: number;
    total: number;
    interpretation: string;
    airwayRisk: string | null;
}

export function calculateGCS(
    eye: string | number | null | undefined, 
    verbal: string | number | null | undefined, 
    motor: string | number | null | undefined
): GCSResult | null {
    if (eye == null || verbal == null || motor == null || eye === '' || verbal === '' || motor === '') return null;
    
    const rawE = typeof eye === 'number' ? eye : parseInt(eye, 10);
    const rawV = typeof verbal === 'number' ? verbal : parseInt(verbal, 10);
    const rawM = typeof motor === 'number' ? motor : parseInt(motor, 10);

    if (isNaN(rawE) || isNaN(rawV) || isNaN(rawM)) return null;

    const e = Math.min(4, Math.max(1, rawE));
    const v = Math.min(5, Math.max(1, rawV));
    const m = Math.min(6, Math.max(1, rawM));

    const total = e + v + m;
    
    let interpretation = '';
    if (total === 15) interpretation = 'Bilinç açık (Normal).';
    else if (total >= 13) interpretation = 'Hafif kafa travması / bilinç bozukluğu.';
    else if (total >= 9) interpretation = 'Orta derece kafa travması / bilinç bozukluğu.';
    else interpretation = 'Ağır kafa travması / koma.';
    
    const airwayRisk = total <= 8 ? 'Entübasyon / Havayolu güvenliği sağlanmalı.' : null;
    
    return { e, v, m, total, interpretation, airwayRisk };
}
