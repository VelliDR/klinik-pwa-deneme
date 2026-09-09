// Pediatric Iron & Anemia Engine

export function calculatePediatricIron(params) {
    if (!params) params = {};
    const { ageMonths = null, weightKg = null, hb = null, hbValue = null, isPreterm = false, gender = 'male' } = params;

    // Accept both 'hb' and 'hbValue' for backward compatibility
    const hemoglobin = hb !== null ? hb : hbValue;

    let result = {
        status: 'SUCCESS',
        hbEvaluation: {
            isAnemic: false,
            text: '',
            badgeColor: 'emerald' // emerald | amber | rose | slate
        },
        hbCategory: 'Belirtilmedi', // Normal, Fizyolojik Anemi, Patolojik Anemi, Belirtilmedi
        prophylaxis: {
            eligible: false,
            mgDay: 0,
            ferrumDrops: 0,   // 2.5 mg/damla
            ferroDrops: 0,    // 1.5 mg/damla (Ferro Sanol)
            text: ''
        },
        treatment: {
            eligible: false,
            mgDay: 0,
            ferrumDrops: 0,
            ferroDrops: 0,
            text: ''
        }
    };

    if (ageMonths === null || ageMonths < 0) {
        result.status = 'INCOMPLETE';
        result.hbEvaluation.text = 'Geçerli bir yaş (ay) girilmelidir.';
        return result;
    }

    if (weightKg === null || weightKg <= 0) {
        result.status = 'INCOMPLETE';
        result.hbEvaluation.text = 'Geçerli bir kilo (kg) girilmelidir.';
        return result;
    }

    // ── 1. HEMOGLOBİN ANALİZİ ──
    if (hemoglobin !== null && hemoglobin > 0) {
        if (ageMonths <= 0.5) {
            // Yenidoğan
            if (hemoglobin < 13.5) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: 'Yenidoğan anemisi (< 13.5 g/dL). Uzman değerlendirmesi gerekir.', badgeColor: 'rose' };
            } else {
                result.hbEvaluation = { isAnemic: false, text: 'Normal Hb düzeyi (Yenidoğan).', badgeColor: 'emerald' };
            }
        } else if (ageMonths > 0.5 && ageMonths <= 3) {
            // 2-3. ay fizyolojik nadir
            if (hemoglobin < 9.0) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: 'Patolojik anemi (< 9.0 g/dL). İleri tetkik ve tedavi gerekir.', badgeColor: 'rose' };
            } else if (hemoglobin >= 9.0 && hemoglobin <= 11.0) {
                result.hbCategory = 'Fizyolojik Anemi';
                result.hbEvaluation = { isAnemic: false, text: 'Fizyolojik anemi (9.0 – 11.0 g/dL). Demir tedavisi başlanmaz, takip önerilir.', badgeColor: 'amber' };
            } else {
                result.hbEvaluation = { isAnemic: false, text: 'Normal Hb düzeyi.', badgeColor: 'emerald' };
            }
        } else if (ageMonths > 3 && ageMonths <= 60) {
            // 6 ay – 5 yaş
            if (hemoglobin < 11.0) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: 'Anemi (< 11.0 g/dL). DSÖ / Sağlık Bakanlığı kriterlerine göre.', badgeColor: 'rose' };
            } else {
                result.hbEvaluation = { isAnemic: false, text: 'Normal Hb düzeyi.', badgeColor: 'emerald' };
            }
        } else if (ageMonths > 60 && ageMonths <= 144) {
            // 5 – 11 yaş
            if (hemoglobin < 11.5) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: 'Anemi (< 11.5 g/dL).', badgeColor: 'rose' };
            } else {
                result.hbEvaluation = { isAnemic: false, text: 'Normal Hb düzeyi.', badgeColor: 'emerald' };
            }
        } else if (ageMonths > 144) {
            // > 12 yaş
            const cutoff = gender === 'male' && ageMonths >= 180 ? 13.0 : 12.0;
            if (hemoglobin < cutoff) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: `Anemi (< ${cutoff.toFixed(1)} g/dL).`, badgeColor: 'rose' };
            } else {
                result.hbCategory = 'Normal';
                result.hbEvaluation = { isAnemic: false, text: 'Normal Hb düzeyi.', badgeColor: 'emerald' };
            }
        }

        if (result.hbCategory === 'Belirtilmedi' && !result.hbEvaluation.text) {
            result.hbCategory = 'Normal';
            result.hbEvaluation = { isAnemic: false, text: 'Normal Hb düzeyi.', badgeColor: 'emerald' };
        }
    } else {
        result.hbCategory = 'Belirtilmedi';
        result.hbEvaluation = { isAnemic: false, text: 'Hb değeri girilmedi.', badgeColor: 'slate' };
    }

    // ── 2. PROFİLAKSİ HESABI (Demir Gibi Türkiye) ──
    if (ageMonths > 12) {
        result.prophylaxis.eligible = false;
        result.prophylaxis.text = 'Profilaksi dönemi tamamlanmıştır (1 yaş üstü).';
    } else if (!isPreterm) {
        // Term bebek
        if (ageMonths < 4) {
            result.prophylaxis.eligible = false;
            result.prophylaxis.text = 'Profilaksi için henüz erken. T.C. Sağlık Bakanlığı protokolüne göre 4. ay kontrolünde başlanmalıdır.';
        } else {
            result.prophylaxis.eligible = true;
            result.prophylaxis.mgDay = Math.min(Math.round(weightKg * 1), 15); // 1 mg/kg, max 15mg
            result.prophylaxis.text = 'T.C. Sağlık Bakanlığı "Demir Gibi Türkiye" protokolü: Term bebekler için 4. aydan itibaren 1 mg/kg/gün (Maks 15 mg).';
        }
    } else {
        // Preterm bebek
        if (ageMonths < 2) {
            result.prophylaxis.eligible = false;
            result.prophylaxis.text = 'Profilaksi için henüz erken. Preterm bebeklerde 2. ay kontrolünde başlanmalıdır.';
        } else {
            result.prophylaxis.eligible = true;
            result.prophylaxis.mgDay = Math.round(weightKg * 2); // 2 mg/kg
            result.prophylaxis.text = 'Preterm bebek profilaksi protokolü: 2. aydan itibaren 2 mg/kg/gün.';
        }
    }

    // ── 3. TEDAVİ HESABI (Demir Eksikliği Anemisi) ──
    if (result.hbCategory === 'Patolojik Anemi') {
        result.treatment.eligible = true;
        const maxDose = ageMonths <= 72 ? 60 : 200;
        result.treatment.mgDay = Math.min(Math.round(weightKg * 4), maxDose); // 4 mg/kg/gün, capped
        result.treatment.text = `Tedavi Dozu: 4 mg/kg/gün (Maksimum günlük doz sınırı ${maxDose} mg).`;
        
        // Disable prophylaxis if active treatment
        if (result.prophylaxis.eligible) {
            result.prophylaxis.eligible = false;
            result.prophylaxis.mgDay = 0;
            result.prophylaxis.text = 'Aktif anemi tedavisi uygulandığından profilaktik doz iptal edilmiştir.';
        }
    } else if (result.hbCategory === 'Fizyolojik Anemi') {
        result.treatment.eligible = false;
        result.treatment.text = 'Fizyolojik anemi döneminde demir tedavisi önerilmez.';
    } else {
        result.treatment.eligible = false;
        result.treatment.text = 'Mevcut bulgularla aktif tedavi endikasyonu tespit edilmedi.';
    }

    // ── 4. PREPARAT & DAMLA ÇEVRİM MOTORU ──
    if (result.prophylaxis.mgDay > 0) {
        result.prophylaxis.ferrumDrops = Math.ceil(result.prophylaxis.mgDay / 2.5);
        result.prophylaxis.ferroDrops = Math.ceil(result.prophylaxis.mgDay / 1.5);
    }

    if (result.treatment.mgDay > 0) {
        result.treatment.ferrumDrops = Math.ceil(result.treatment.mgDay / 2.5);
        result.treatment.ferroDrops = Math.ceil(result.treatment.mgDay / 1.5);
    }

    return result;
}
