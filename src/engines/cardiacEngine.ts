// Cardiac Engine: QTc, Risk Scoring, ATC Rules

export interface QTcInput {
    hr?: number | null;
    rrMs?: number | null;
    qt?: number | null;
    qrs?: number | null;
    qrsPattern?: 'normal' | 'lbbb' | 'rbbb' | 'paced' | 'custom' | string;
    gender?: 'male' | 'female' | string;
    k_level?: number | null;
    drugs?: any[];
    is_ami?: boolean;
    is_sepsis?: boolean;
    is_hf?: boolean;
    age?: number | null;
}

export interface QTcResult {
    status: 'OK' | 'INCOMPLETE' | 'BLOCKED' | 'OUT_OF_RANGE' | 'INVALID_INPUT' | string;
    hr: number | null;
    rrMs: number | null;
    qt: number | null;
    qrs: number | null;
    qrsPattern: string;
    qtcFridericia: number | null;
    qtcBazett: number | null;
    qtcBogossian: number | null;
    activeFormula: string | null;
    interpretation: string;
    colorCode: 'success' | 'warning' | 'orange' | 'danger' | string;
    warnings: string[];
    tisdaleScore: number;
    tisdaleRisk: string;
    drugFlags: string[];
    formulaDiff?: number;
}

export function calculateQTc(params: QTcInput = {}): QTcResult {
    let { 
        hr = null, rrMs = null, qt = null, qrs = null, qrsPattern = 'custom', gender = 'male', 
        k_level = null, drugs = [], is_ami = false, 
        is_sepsis = false, is_hf = false, age = null 
    } = params;

    const result: QTcResult = {
        status: 'OK',
        hr: null,
        rrMs: null,
        qt: null,
        qrs: null,
        qrsPattern: qrsPattern || 'custom',
        qtcFridericia: null,
        qtcBazett: null,
        qtcBogossian: null,
        activeFormula: null,
        interpretation: '',
        colorCode: 'success',
        warnings: [],
        tisdaleScore: 0,
        tisdaleRisk: 'Düşük Risk',
        drugFlags: []
    };

    // Auto sync HR and RR (ms) if one is provided
    if ((hr === null || isNaN(hr)) && rrMs !== null && !isNaN(rrMs) && rrMs > 0) {
        hr = Math.round(60000 / rrMs);
    }
    if ((rrMs === null || isNaN(rrMs)) && hr !== null && !isNaN(hr) && hr > 0) {
        rrMs = Math.round(60000 / hr);
    }

    // Auto set QRS preset if qrs is null but qrsPattern is specified
    if ((qrs === null || isNaN(qrs)) && qrsPattern !== 'custom') {
        if (qrsPattern === 'normal') qrs = 90;
        else if (qrsPattern === 'lbbb') qrs = 140;
        else if (qrsPattern === 'rbbb') qrs = 130;
        else if (qrsPattern === 'paced') qrs = 160;
    }

    result.hr = hr;
    result.rrMs = rrMs;
    result.qt = qt;
    result.qrs = qrs;

    // ── 0. INCOMPLETE INPUT GUARD ──
    if (hr === null || qt === null || isNaN(hr) || isNaN(qt)) {
        result.status = 'INCOMPLETE';
        result.interpretation = 'EKG değerlendirmesi için Nabız (veya RR) ve QT süresi gereklidir.';
        return result;
    }

    // ── 1. HR OUT-OF-RANGE GUARDS ──
    if (hr > 150) {
        result.status = 'BLOCKED';
        result.interpretation = 'HESAPLAMA BLOKLANDI: T-P füzyonu ve histerezis nedeniyle hız kontrolü sonrası bazal EKG çekilmesi önerilir (HR > 150).';
        result.colorCode = 'danger';
        return result;
    }
    if (hr < 30) {
        result.status = 'BLOCKED';
        result.interpretation = 'HESAPLAMA BLOKLANDI: Aşırı bradikardi (HR < 30). QT aralığı güvenilir ölçülemez.';
        result.colorCode = 'danger';
        return result;
    }

    // ── 2. QT PHYSIOLOGICAL RANGE GUARD ──
    if (qt < 200 || qt > 800) {
        result.status = 'OUT_OF_RANGE';
        result.interpretation = `Fizyolojik aralık dışı QT değeri (${qt} ms). Ölçümü doğrulayınız.`;
        result.colorCode = 'danger';
        return result;
    }

    // ── 3. QRS >= QT ANATOMICAL BARRIER ──
    if (qrs !== null && !isNaN(qrs) && qrs >= qt) {
        result.status = 'INVALID_INPUT';
        result.interpretation = `Hatalı Ölçüm: QRS süresi (${qrs} ms) QT süresinden (${qt} ms) büyük veya eşit olamaz (QT = QRS + JT).`;
        result.colorCode = 'danger';
        return result;
    }

    // ── HR Tolerance Warnings ──
    if (hr > 120 && hr <= 150) {
        result.warnings.push('Yüksek Hız Toleransı: Fridericia hafif yetersiz düzeltme (undercorrection) yapabilir.');
    } else if (hr < 50 && hr >= 30) {
        result.warnings.push('Ciddi bradikardi: Yüksek repolarizasyon kırılganlığı.');
    }

    // ── 5. QTc CALCULATIONS ──
    const rrSec = rrMs ? (rrMs / 1000) : (60 / hr); // RR in seconds

    // Bazett & Fridericia
    result.qtcBazett = Math.round(qt / Math.sqrt(rrSec));
    result.qtcFridericia = Math.round(qt / Math.cbrt(rrSec));
    result.formulaDiff = result.qtcBazett - result.qtcFridericia;

    const isWideQRS = (qrs !== null && qrs >= 120) || qrsPattern === 'lbbb' || qrsPattern === 'rbbb' || qrsPattern === 'paced';

    if (isWideQRS) {
        // Bogossian modified Fridericia for wide QRS
        const effectiveQRS = qrs || (qrsPattern === 'lbbb' ? 140 : qrsPattern === 'rbbb' ? 130 : qrsPattern === 'paced' ? 160 : 120);
        result.activeFormula = 'Bogossian';
        result.qtcBogossian = Math.round((qt - (0.5 * effectiveQRS)) / Math.cbrt(rrSec));
        
        let wideType = 'Geniş QRS Kompleksi';
        if (qrsPattern === 'lbbb') wideType = 'Sol Dal Bloğu (LBBB)';
        else if (qrsPattern === 'rbbb') wideType = 'Sağ Dal Bloğu (RBBB)';
        else if (qrsPattern === 'paced') wideType = 'Ventriküler Uyarılı Ritim (Kalp Pili / Pacemaker)';
        
        result.warnings.push(`⚡ ${wideType} (${effectiveQRS} ms): Geniş QRS nedeniyle QTc değerlendirmesinde Bogossian formülü esas alınmıştır.`);
    } else {
        result.activeFormula = 'Fridericia';
    }

    // Formula comparison guidance for high/low heart rates
    if (hr > 90) {
        result.warnings.push(`💡 Yüksek Nabız (${hr} bpm): Bazett formülü QTc'yi yalancı yüksek (overcorrection) hesaplar (+${result.formulaDiff} ms fark). Fridericia esas alınmalıdır.`);
    } else if (hr < 60) {
        result.warnings.push(`💡 Düşük Nabız (${hr} bpm): Bazett formülü QTc'yi yalancı düşük (undercorrection) hesaplar (${result.formulaDiff} ms fark). Fridericia esas alınmalıdır.`);
    }

    // Use Bogossian QTc if wide QRS, otherwise Fridericia QTc
    const calculatedQTc = (result.qtcBogossian !== null) ? result.qtcBogossian : result.qtcFridericia;

    // ── 6. QTc INTERPRETATION ──
    const isFemale = gender === 'female' || gender === 'F';
    const isMale = !isFemale;
    const limitNormal = isMale ? 450 : 460;
    const limitBorderline = isMale ? 460 : 470;
    const shortQtLimit = 340;

    if (calculatedQTc < shortQtLimit && result.qtcFridericia < shortQtLimit) {
        result.colorCode = 'danger';
        result.interpretation = `Kritik / Anormal: Kısa QTc (${calculatedQTc} ms). Ventriküler fibrilasyon ve ani ölüm (SQTS) riski!`;
        result.warnings.push('⚡ QTc < 340 ms: Kısa QT Sendromu (SQTS) klinik şüphesi. Aile öyküsü ve genetik değerlendirme önerilir.');
    } else if (calculatedQTc > 500) {
        result.colorCode = 'danger';
        result.interpretation = `Kritik TdP Riski: Belirgin Uzamış QTc (${calculatedQTc} ms > 500 ms). Torsades de Pointes riski yüksek!`;
    } else if (calculatedQTc > limitBorderline) {
        result.colorCode = 'orange';
        result.interpretation = `Uzamış QTc (${calculatedQTc} ms). Klinik takip gereklidir.`;
    } else if (calculatedQTc > limitNormal) {
        result.colorCode = 'warning';
        result.interpretation = `Sınırda (Borderline) QTc (${calculatedQTc} ms).`;
    } else {
        result.colorCode = 'success';
        result.interpretation = `Normal QTc aralığı (${calculatedQTc} ms).`;
    }

    // ── 7. TISDALE RISK SCORE ──
    let tisdale = 0;
    if (age !== null && age >= 68) tisdale += 1;
    if (isFemale) tisdale += 1;
    if (k_level !== null && k_level <= 3.5) tisdale += 2;
    if (calculatedQTc >= 450) tisdale += 2;
    if (is_ami) tisdale += 2;
    if (is_sepsis) tisdale += 3;
    if (is_hf) tisdale += 3;

    // ── 8. DRUG PROCESSING (QT & QRS PROLONGATION) ──
    let qtProlongingCount = 0;
    const phase3ATCs = ['J01MA', 'J01FA', 'N05A', 'N06AB', 'C01B', 'A04AA', 'J02AC'];
    const phase0ATCs = ['C01BC', 'C01BA', 'N06AA', 'N03AF', 'N03AX09', 'C07AA05'];
    const phase3Keywords = ['siprofloksasin', 'ciprofloxacin', 'levofloksasin', 'levofloxacin', 'moksifloksasin', 'moxifloxacin', 'klaritromisin', 'clarithromycin', 'azitromisin', 'azithromycin', 'haloperidol', 'kvetiapin', 'quetiapine', 'olanzapin', 'risperidon', 'essitalopram', 'escitalopram', 'sitalopram', 'citalopram', 'amiodaron', 'sotalol', 'ondansetron', 'flukonazol', 'fluconazole'];
    const phase0Keywords = ['propafenon', 'propafenone', 'rytmonorm', 'flekainid', 'flecainide', 'amitriptilin', 'amitriptyline', 'laroxyl', 'klomipramin', 'imipramin', 'karbamazepin', 'carbamazepine', 'tegrerol', 'tegretol', 'lamotrijin', 'lamotrigine', 'lamictal'];
    const loopDiureticKeywords = ['furosemid', 'furosemide', 'lasix', 'desal', 'torasemid', 'torasemide', 'torem'];

    let hasPhase3 = false;
    let hasPhase0 = false;
    let hasLoopDiuretic = false;
    const qrsProlongingDrugs: string[] = [];
    
    drugs.forEach(d => {
        if (!d) return;
        const atc = (typeof d === 'string' ? d.toUpperCase() : (d.atc || d.atcCode || '').toUpperCase()).trim();
        const combinedText = (typeof d === 'string' ? d : `${d.brand || ''} ${d.name || ''} ${d.generic || ''}`).toLowerCase();
        
        if ((atc.startsWith('C03C') || loopDiureticKeywords.some(k => combinedText.includes(k))) && !hasLoopDiuretic) {
            tisdale += 1;
            hasLoopDiuretic = true;
        }

        if (phase3ATCs.some(root => atc && atc.startsWith(root)) || phase3Keywords.some(k => combinedText.includes(k))) {
            qtProlongingCount += 1;
            hasPhase3 = true;
        }

        if (phase0ATCs.some(root => atc && atc.startsWith(root)) || phase0Keywords.some(k => combinedText.includes(k))) {
            hasPhase0 = true;
            const label = typeof d === 'string' ? d : (d.brand || d.name || d.generic || atc);
            qrsProlongingDrugs.push(label);
        }
    });

    if (qtProlongingCount === 1) tisdale += 3;
    else if (qtProlongingCount >= 2) tisdale += 6;

    result.tisdaleScore = tisdale;
    if (tisdale <= 6) result.tisdaleRisk = 'Düşük Risk';
    else if (tisdale <= 10) result.tisdaleRisk = 'Orta Risk (Monitörizasyon ve elektrolit takibi önerilir)';
    else result.tisdaleRisk = 'Yüksek Risk (TdP gelişme olasılığı belirgin yüksek)';

    // ── 9. DRUG FLAGS ──
    if (hasPhase3 && calculatedQTc > 470) {
        result.drugFlags.push('🚨 İlaç İlişkili TdP Riski: Repolarizasyonu geciktiren (IKr bloker) ajan mevcuttur.');
    }

    if (hasPhase0) {
        const drugNames = qrsProlongingDrugs.length > 0 ? ` (${qrsProlongingDrugs.join(', ')})` : '';
        if (qrs !== null && qrs >= 160) {
            result.drugFlags.push(`🔴 KRİTİK İNTRAVENTRİKÜLER İLETİ BLOĞU${drugNames}: Ölümcül disritmi ve nöbet riski! NaHCO3 tedavisi değerlendirilmeli.`);
        } else if (qrs !== null && qrs >= 120) {
            result.drugFlags.push(`⚠️ SODYUM KANAL BLOKAJI ŞÜPHESİ${drugNames}: Toksik QRS iletim gecikmesi (${qrs} ms). EKG'de aVR derivasyonunu inceleyiniz; NaHCO3 ihtiyacını değerlendiriniz.`);
        } else {
            result.drugFlags.push(`⚠️ QRS Uzatan İlaç Uyarısı${drugNames}: Sodyum kanal blokör potansiyeli. QRS süresi ve EKG yakından izlenmelidir.`);
        }
    }

    return result;
}

export interface AxisResult {
    degrees: number;
    axisCategory: string;
}

// Cardiac Axis Calculator
export function calculateAxis(d1: number | null | undefined, avf: number | null | undefined): AxisResult | null {
    if (d1 === null || avf === null || d1 === undefined || avf === undefined || isNaN(d1) || isNaN(avf)) return null;

    const radians = Math.atan2(avf, d1);
    const degrees = Math.round(radians * (180 / Math.PI));

    let axisCategory = '';

    if (d1 >= 0 && avf >= 0) {
        axisCategory = 'Normal Aks (0° ile +90° arası)';
    } else if (d1 >= 0 && avf < 0) {
        if (degrees >= -30) {
            axisCategory = `Normal Aks (${degrees}°) — (0° ile -30° arası normal kabul edilir)`;
        } else {
            axisCategory = `Sol Aks Sapması (LAD) (${degrees}°) (-30° ile -90° arası) — Sol anterior hemiblok, LVH, LBBB, inferior MI düşünülebilir.`;
        }
    } else if (d1 < 0 && avf >= 0) {
        axisCategory = 'Sağ Aks Sapması (RAD) (+90° ile +180° arası) — Sol posterior hemiblok, RVH, RBBB, kor pulmonale, lateral MI düşünülebilir.';
    } else {
        axisCategory = 'Aşırı Aks Sapması (Kuzeybatı Aksı / No Man\'s Land) — Ventriküler ritimler (VT) veya çoklu fasiküler blok.';
    }

    return { degrees, axisCategory };
}

// ============================================================================
// EKG KAĞIDI KUTUCUK (KARE / MM) VE ÇOKLU VURU DÖNÜŞÜM MOTORU
// ============================================================================

/**
 * EKG kağıdındaki küçük kutucuk (kare / mm) sayısını milisaniyeye (ms) dönüştürür.
 * @param boxes Küçük kutucuk (kare) sayısı (örn. 10 kare)
 * @param paperSpeedMmSec Kağıt hızı (mm/sn) - Standart 25 mm/sn veya 50 mm/sn
 */
export function convertEcgBoxesToMs(boxes: number | null | undefined, paperSpeedMmSec: 25 | 50 = 25): number | null {
    if (boxes === null || boxes === undefined || isNaN(boxes) || boxes <= 0) return null;
    const msPerBox = paperSpeedMmSec === 50 ? 20 : 40;
    return Math.round(boxes * msPerBox);
}

/**
 * Milisaniyeyi (ms) EKG kağıdındaki küçük kutucuk (kare / mm) sayısına dönüştürür.
 * @param ms Milisaniye cinsinden süre
 * @param paperSpeedMmSec Kağıt hızı (mm/sn) - Standart 25 mm/sn veya 50 mm/sn
 */
export function convertMsToEcgBoxes(ms: number | null | undefined, paperSpeedMmSec: 25 | 50 = 25): number | null {
    if (ms === null || ms === undefined || isNaN(ms) || ms <= 0) return null;
    const msPerBox = paperSpeedMmSec === 50 ? 20 : 40;
    return Number((ms / msPerBox).toFixed(1));
}

/**
 * R-R aralığındaki kutucuk sayısından Kalp Atım Hızını (KAH - bpm) hesaplar.
 * @param boxes Kutucuk sayısı
 * @param isLargeBoxes Büyük kare mi (1 büyük kare = 5 küçük kare = 200 ms) yoksa küçük kare mi
 * @param paperSpeedMmSec Kağıt hızı (mm/sn)
 */
export function calculateHrFromBoxes(
    boxes: number | null | undefined,
    isLargeBoxes: boolean = false,
    paperSpeedMmSec: 25 | 50 = 25
): number | null {
    if (boxes === null || boxes === undefined || isNaN(boxes) || boxes <= 0) return null;
    const smallBoxes = isLargeBoxes ? boxes * 5 : boxes;
    const msPerBox = paperSpeedMmSec === 50 ? 20 : 40;
    const rrMs = smallBoxes * msPerBox;
    if (rrMs <= 0) return null;
    return Math.round(60000 / rrMs);
}

/**
 * Çoklu vuru ölçümlerinde (aritmi, AFib) ortalama süre veya kutucuk hesabı
 */
export function calculateAverageInterval(values: (number | null | undefined)[]): number | null {
    const valid = values.filter((v): v is number => v !== null && v !== undefined && !isNaN(v) && v > 0);
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / valid.length) * 10) / 10;
}
