// OB/GYN Engine: Naegele, Bishop, Preeklampsi

export interface ObstetricsResult {
    edd: string;
    gestationalAge: string;
    trimester: number;
    recommendations: string[];
}

export function calculateObstetrics(lmpDateStr: string | null | undefined): ObstetricsResult | null {
    if (!lmpDateStr) return null;
    const lmpDate = new Date(lmpDateStr);
    if (isNaN(lmpDate.getTime())) return null;
    
    // EDD (Naegele's rule): LMP + 7 days - 3 months + 1 year => essentially LMP + 280 days
    const edd = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
    
    const today = new Date();
    const diffTime = today.getTime() - lmpDate.getTime();
    if (diffTime < 0) return null;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
    
    const weeks = Math.floor(diffDays / 7);
    if (weeks > 44) return null;
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
    
    const d = typeof dilation === 'number' ? dilation : parseInt(dilation, 10);
    const e = typeof effacement === 'number' ? effacement : parseInt(effacement, 10);
    const s = typeof station === 'number' ? station : parseInt(station, 10);
    const c = typeof consistency === 'number' ? consistency : parseInt(consistency, 10);
    const p = typeof position === 'number' ? position : parseInt(position, 10);

    if (isNaN(d) || isNaN(e) || isNaN(s) || isNaN(c) || isNaN(p)) return null;
    
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
}

export function calculatePreeclampsia(
    sbp: number | null | undefined, 
    dbp: number | null | undefined, 
    proteinuria: boolean | null | undefined, 
    symptoms: any[] | null | undefined
): PreeclampsiaResult | null {
    if (sbp == null || dbp == null || isNaN(sbp) || isNaN(dbp)) return null;
    let diagnosis = 'Normal';
    let alert: string | null = null;
    const isSevereBP = sbp >= 160 || dbp >= 110;
    const isMildBP = sbp >= 140 || dbp >= 90;
    const hasSevereSymptoms = symptoms && symptoms.length > 0;
    if (isSevereBP || (isMildBP && hasSevereSymptoms)) {
        diagnosis = 'Preeklampsi (Ağır Özellikli)';
        alert = 'MgSO4 protokolü başlatın ve acil doğum değerlendirmesi yapın!';
    } else if (isMildBP && proteinuria) {
        diagnosis = 'Preeklampsi (Ağır Özelliksiz)';
        alert = 'Sıkı takip, kan basıncı kontrolü.';
    } else if (isMildBP) {
        diagnosis = 'Gestasyonel Hipertansiyon';
        alert = 'Proteinüri ve preeklampsi belirtileri açısından izleyin.';
    }
    return { diagnosis, alert };
}
