// Cardiac Engine: QTc, Axis

export function calculateQTc(qtMs, rrMs) {
    if (!qtMs || !rrMs || rrMs <= 0) return null;
    
    // Bazett formula: QTc = QT / sqrt(RR in seconds)
    const rrSec = rrMs / 1000;
    const qtcBazett = qtMs / Math.sqrt(rrSec);
    
    // Fridericia formula: QTc = QT / cube_root(RR in seconds)
    const qtcFridericia = qtMs / Math.cbrt(rrSec);

    let interpretation = '';
    // Typically QTc > 450ms for men, > 470ms for women is prolonged. We'll use > 460 as a general warning flag
    if (qtcBazett > 500) interpretation = 'Ciddi uzamış QT. Torsades de Pointes riski yüksek.';
    else if (qtcBazett > 460) interpretation = 'Uzamış QT. İlaç etkileşimlerini veya elektrolit (K, Mg, Ca) bozukluklarını kontrol edin.';
    else interpretation = 'Normal QTc aralığı.';

    return {
        qtcBazett: Math.round(qtcBazett),
        qtcFridericia: Math.round(qtcFridericia),
        interpretation
    };
}

export function calculateAxis(d1, avf) {
    if (d1 === null || avf === null) return null;

    let axis = '';
    let explanation = '';
    // d1 positive, avf positive -> Normal
    // d1 positive, avf negative -> Left Axis Deviation (need D2 to confirm, but usually LAD)
    // d1 negative, avf positive -> Right Axis Deviation
    // d1 negative, avf negative -> Extreme Axis Deviation (Northwest)

    if (d1 >= 0 && avf >= 0) {
        axis = 'Normal Aks';
        explanation = '(0° ile +90° arası)';
    } else if (d1 >= 0 && avf < 0) {
        axis = 'Sol Aks Sapması (LAD)';
        explanation = '(0° ile -90° arası) - Sol anterior hemiblok, LVH, LBBB, inferior MI düşünülebilir.';
    } else if (d1 < 0 && avf >= 0) {
        axis = 'Sağ Aks Sapması (RAD)';
        explanation = '(+90° ile +180° arası) - Sol posterior hemiblok, RVH, RBBB, kor pulmonale, lateral MI düşünülebilir.';
    } else {
        axis = 'Aşırı Aks Sapması';
        explanation = '(Kuzeybatı Aksı / No Man\'s Land) - Ventriküler ritimler (VT) veya çoklu fasiküler blok.';
    }

    return { axis, explanation };
}
