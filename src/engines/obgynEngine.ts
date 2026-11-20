// OB/GYN Engine: Naegele, Bishop, Preeklampsi

export interface ObstetricsResult {
    edd: string;
    gestationalAge: string;
    weeks?: number;
    days?: number;
    trimester: number;
    recommendations: string[];
    error?: string;
    isInvalid?: boolean;
}

export function calculateObstetrics(lmpDateStr: string | null | undefined): ObstetricsResult | null {
    if (!lmpDateStr) return null;
    const trimmed = lmpDateStr.trim();
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    const lmpDate = isoMatch
        ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
        : new Date(trimmed);
    if (isNaN(lmpDate.getTime())) return null;
    lmpDate.setHours(0, 0, 0, 0);
    
    // EDD (Naegele's rule): LMP + 280 days
    const edd = new Date(lmpDate.getTime());
    edd.setDate(edd.getDate() + 280);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = today.getTime() - lmpDate.getTime();
    if (diffTime < 0) {
        return {
            edd: '-',
            gestationalAge: 'Geçersiz (Gelecek Tarih)',
            weeks: 0,
            days: 0,
            trimester: 0,
            recommendations: [],
            error: '⚠️ Hatalı SAT: Son adet tarihi gelecekte olamaz (bugünden ileri bir tarih seçilemez).',
            isInvalid: true
        };
    }
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
    
    const weeks = Math.floor(diffDays / 7);
    if (weeks > 44) {
        return {
            edd: '-',
            gestationalAge: 'Geçersiz (>44 Hafta)',
            weeks,
            days: diffDays % 7,
            trimester: 0,
            recommendations: [],
            error: '⚠️ Hatalı SAT: Gebelik süresi 44 haftadan büyük olamaz (>44 hafta; lütfen tarihi kontrol ediniz).',
            isInvalid: true
        };
    }
    const days = diffDays % 7;
    
    let trimester = 0;
    if (weeks < 14) trimester = 1;
    else if (weeks < 28) trimester = 2;
    else trimester = 3;

    // Format dates to DD.MM.YYYY
    const eddStr = `${String(edd.getDate()).padStart(2, '0')}.${String(edd.getMonth()+1).padStart(2, '0')}.${edd.getFullYear()}`;

    const recommendations: string[] = [];
    if (weeks >= 11 && weeks <= 14) recommendations.push('İkili Tarama Testi ve Ense Kalınlığı (NT) ölçümü zamanı.');
    if (weeks >= 16 && weeks <= 20) recommendations.push('Üçlü/Dörtlü Tarama veya AFP testi.');
    if (weeks >= 18 && weeks <= 22) recommendations.push('Detaylı (Ayrıntılı) Fetal Ultrason zamanı.');
    if (weeks >= 24 && weeks <= 28) recommendations.push('Oral Glukoz Tolerans Testi (OGTT) zamanı.');

    return {
        edd: eddStr,
        gestationalAge: `${weeks} Hafta + ${days} Gün`,
        weeks,
        days,
        trimester,
        recommendations
    };
}

export interface BishopResult {
    score: number;
    interpretation: string;
}

export function calculateBishop(
    dilation: string | number | null | undefined, 
    effacement: string | number | null | undefined, 
    station: string | number | null | undefined, 
    consistency: string | number | null | undefined, 
    position: string | number | null | undefined
): BishopResult | null {
    if (dilation == null || effacement == null || station == null || consistency == null || position == null) return null;
    
    let d = typeof dilation === 'number' ? dilation : parseInt(dilation, 10);
    let e = typeof effacement === 'number' ? effacement : parseInt(effacement, 10);
    let s = typeof station === 'number' ? station : parseInt(station, 10);
    let c = typeof consistency === 'number' ? consistency : parseInt(consistency, 10);
    let p = typeof position === 'number' ? position : parseInt(position, 10);

    if (isNaN(d) || isNaN(e) || isNaN(s) || isNaN(c) || isNaN(p)) return null;
    
    // Clamp to physiological limits:
    // Dilation: 0-3
    // Effacement: 0-3
    // Station: 0-3
    // Consistency: 0-2
    // Position: 0-2
    d = Math.max(0, Math.min(3, d));
    e = Math.max(0, Math.min(3, e));
    s = Math.max(0, Math.min(3, s));
    c = Math.max(0, Math.min(2, c));
    p = Math.max(0, Math.min(2, p));

    const score = d + e + s + c + p;
    
    let interpretation = '';
    if (score >= 8) interpretation = 'Elverişli (Favorable). İndüksiyon başarılı olma ihtimali yüksek.';
    else if (score <= 5) interpretation = 'Elverişsiz (Unfavorable). Servikal olgunlaştırma (Prostaglandin/Foley) gerekebilir.';
    else interpretation = 'Sınırda (Borderline). Klinik karara göre indüksiyon değerlendirilmeli.';

    return { score, interpretation };
}

export interface PreeclampsiaResult {
    diagnosis: string;
    alert: string | null;
    isSevere?: boolean;
    isHypertensiveEmergency?: boolean;
    antiHypertensiveAdvice?: string | null;
    mgso4Protocol?: string | null;
    isChronicHypertension?: boolean;
    gestationalWeeks?: number | null;
}

export function calculatePreeclampsia(
    sbp: number | null | undefined, 
    dbp: number | null | undefined, 
    proteinuria: boolean | null | undefined, 
    symptoms: any[] | null | undefined,
    gestationalWeeks?: number | null
): PreeclampsiaResult | null {
    if (sbp == null || dbp == null || isNaN(sbp) || isNaN(dbp)) return null;
    let diagnosis = 'Normal';
    let alert: string | null = null;
    const isSevereBP = sbp >= 160 || dbp >= 110;
    const isMildBP = sbp >= 140 || dbp >= 90;
    const hasSevereSymptoms = symptoms && symptoms.length > 0;

    const isPre20Weeks = typeof gestationalWeeks === 'number' && gestationalWeeks < 20;

    if (isPre20Weeks) {
        if (isSevereBP) {
            diagnosis = 'Kronik Hipertansiyon (Ağır Hipertansiyon: ≥160/110 mmHg)';
            alert = '🚨 HİPERTANSİF ACİL (<20. Hafta): Acil IV Labetalol 20 mg veya Oral Nifedipin 10-20 mg kapsül ile KB\'yi 30-60 dk\'da düşürünüz. Süperempoze preeklampsi açısından yakın izlem önerilir.';
            return {
                diagnosis,
                alert,
                isSevere: true,
                isHypertensiveEmergency: true,
                isChronicHypertension: true,
                gestationalWeeks
            };
        } else if (isMildBP) {
            diagnosis = 'Kronik Hipertansiyon (<20. hafta gebelik; preeklampsi açısından yakın takip edilmelidir)';
            alert = 'Kan basıncı kontrolü ve süperempoze preeklampsi (proteinüri, trombositopeni, KCFT takibi) açısından yakın izlem önerilir.';
            return {
                diagnosis,
                alert,
                isSevere: false,
                isChronicHypertension: true,
                gestationalWeeks
            };
        }
        return { diagnosis: 'Normal', alert: null, gestationalWeeks };
    }

    if (isSevereBP || (isMildBP && hasSevereSymptoms)) {
        diagnosis = 'Preeklampsi (Ağır Özellikli)';
        alert = '🚨 HİPERTANSİF ACİL PROTOKOLÜ (Hedef KB 140-150/90-100): Acil IV Labetalol 20 mg (veya Oral Nifedipin 10-20 mg kapsül) ile KB\'yi 30-60 dk\'da düşürünüz. Eklampsi profilaksisi için 4-6 g MgSO4 IV yükleme (15-20 dk\'da) ve 1-2 g/saat idame başlatınız.';
        return {
            diagnosis,
            alert,
            isSevere: true,
            isHypertensiveEmergency: isSevereBP,
            antiHypertensiveAdvice: 'IV Labetalol 20 mg puşe veya Oral Nifedipin 10-20 mg kapsül (Hedef: 140-150/90-100 mmHg)',
            mgso4Protocol: '4-6 g MgSO4 IV yükleme (15-20 dk), ardından 1-2 g/saat IV idame',
            gestationalWeeks
        };
    } else if (isMildBP && proteinuria) {
        diagnosis = 'Preeklampsi (Ağır Özelliksiz)';
        alert = 'Sıkı takip, kan basıncı kontrolü.';
        return {
            diagnosis,
            alert,
            isSevere: false,
            gestationalWeeks
        };
    } else if (isMildBP) {
        diagnosis = 'Gestasyonel Hipertansiyon';
        alert = 'Proteinüri ve preeklampsi belirtileri açısından izleyin.';
        return {
            diagnosis,
            alert,
            isSevere: false,
            gestationalWeeks
        };
    }
    return { diagnosis, alert, gestationalWeeks };
}
