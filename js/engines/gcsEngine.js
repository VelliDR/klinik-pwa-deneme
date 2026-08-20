export function calculateGCS({ isPediatricUnder2, eye, verbal, motor }) {
    if (!eye || !verbal || !motor) return null;

    const e = parseInt(eye, 10);
    const v = parseInt(verbal, 10);
    const m = parseInt(motor, 10);

    const total = e + v + m;

    let category = '';
    let flags = [];
    let alertMsg = '';

    if (total >= 13 && total <= 15) {
        category = 'Hafif Beyin Hasarı';
    } else if (total >= 9 && total <= 12) {
        category = 'Orta Derece Beyin Hasarı';
    } else if (total <= 8) {
        category = 'Ciddi Beyin Hasarı';
        flags.push('AIRWAY_COMPROMISE_RISK');
        alertMsg = "GCS ≤ 8: Ciddi beyin hasarı. Havayolu koruyucu refleksleri yetersiz olabilir; elektif/acil entübasyon endikasyonunu değerlendirin.";
    }

    return {
        total,
        eye: e,
        verbal: v,
        motor: m,
        category,
        flags,
        alertMsg,
        isPediatricUnder2
    };
}
