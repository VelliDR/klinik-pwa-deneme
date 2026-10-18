// Pediatric Iron & Anemia Engine

export interface PediatricIronInput {
    ageMonths?: number | null;
    weightKg?: number | null;
    hb?: number | null;
    hbValue?: number | null;
    isPreterm?: boolean;
    gender?: 'male' | 'female' | string;
}

export interface IronDosagePlan {
    eligible: boolean;
    mgDay: number;
    ferrumDrops: number;
    ferroDrops: number;
    text: string;
    syrupMl?: number;
    syrupOlcek?: number;
}

export interface PediatricIronResult {
    status: 'SUCCESS' | 'INCOMPLETE' | string;
    hbEvaluation: {
        isAnemic: boolean;
        text: string;
        badgeColor: 'emerald' | 'amber' | 'rose' | 'slate' | string;
    };
    hbCategory: 'Normal' | 'Fizyolojik Anemi' | 'Patolojik Anemi' | 'Belirtilmedi' | string;
    prophylaxis: IronDosagePlan;
    treatment: IronDosagePlan;
}

export function calculatePediatricIron(params: PediatricIronInput = {}): PediatricIronResult {
    const { ageMonths = null, weightKg = null, hb = null, hbValue = null, isPreterm = false, gender = 'male' } = params;

    const hemoglobin = hb !== null && hb !== undefined ? hb : (hbValue !== null && hbValue !== undefined ? hbValue : null);

    const result: PediatricIronResult = {
        status: 'SUCCESS',
        hbEvaluation: {
            isAnemic: false,
            text: '',
            badgeColor: 'emerald'
        },
        hbCategory: 'Belirtilmedi',
        prophylaxis: {
            eligible: false,
            mgDay: 0,
            ferrumDrops: 0,
            ferroDrops: 0,
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

    // ── 1. HEMOGLOBİN VE FİZYOLOJİK ANEMİ NADİRİ ANALİZİ ──
    let physioMin = 9.0;
    let physioMax = 11.0;
    let physioNote = '';

    if (hemoglobin !== null && hemoglobin > 0) {
        if (ageMonths <= 0.5) {
            // Yenidoğan (0-15 Gün)
            if (hemoglobin < 13.5) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: `Yenidoğan anemisi (Hb ${hemoglobin} < 13.5 g/dL). Kordon klempleme, kanama veya hemoliz yönünden uzman değerlendirmesi gerekir.`, badgeColor: 'rose' };
            } else {
                result.hbEvaluation = { isAnemic: false, text: `Normal Yenidoğan Hb Düzeyi (${hemoglobin} g/dL, Referans: 13.5 - 20.0).`, badgeColor: 'emerald' };
            }
        } else if (ageMonths > 0.5 && ageMonths <= 3) {
            // 2-3. ay: Süt Çocuğu Fizyolojik Anemi Nadiri
            if (isPreterm) {
                physioMin = 7.0;
                physioMax = 9.0;
                physioNote = 'Preterm Bebek Fizyolojik Anemi Nadiri (4-8. haftalar, Beklenen Hb: 7.0 - 9.0 g/dL)';
            } else {
                physioMin = 9.0;
                physioMax = 11.0;
                physioNote = 'Term Bebek Fizyolojik Anemi Nadiri (6-12. haftalar, Beklenen Hb: 9.0 - 11.0 g/dL)';
            }

            if (hemoglobin < physioMin) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { 
                    isAnemic: true, 
                    text: `Patolojik Anemi (Hb ${hemoglobin} < ${physioMin} g/dL). ${physioNote}. İleri tetkik ve aktif tedavi gereklidir.`, 
                    badgeColor: 'rose' 
                };
            } else if (hemoglobin >= physioMin && hemoglobin <= physioMax) {
                result.hbCategory = 'Fizyolojik Anemi';
                result.hbEvaluation = { 
                    isAnemic: false, 
                    text: `Fizyolojik Anemi Dönemi (Hb ${hemoglobin} g/dL). ${physioNote}. Eritropoetin düşüşüne bağlı normal süreçtir; aktif demir tedavisi başlanmaz, takip önerilir.`, 
                    badgeColor: 'amber' 
                };
            } else {
                result.hbEvaluation = { isAnemic: false, text: `Normal Hb düzeyi (${hemoglobin} g/dL).`, badgeColor: 'emerald' };
            }
        } else if (ageMonths > 3 && ageMonths <= 60) {
            // 6 ay – 5 yaş (DSÖ Cutoff: 11.0 g/dL)
            if (hemoglobin < 11.0) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: `Anemi (Hb ${hemoglobin} < 11.0 g/dL). DSÖ / Sağlık Bakanlığı kriterlerine göre Demir Eksikliği Anemisi uyuşmaktadır.`, badgeColor: 'rose' };
            } else {
                result.hbEvaluation = { isAnemic: false, text: `Normal Hb düzeyi (${hemoglobin} g/dL, Cutoff: 11.0).`, badgeColor: 'emerald' };
            }
        } else if (ageMonths > 60 && ageMonths <= 144) {
            // 5 – 11 yaş (Cutoff: 11.5 g/dL)
            if (hemoglobin < 11.5) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: `Anemi (Hb ${hemoglobin} < 11.5 g/dL).`, badgeColor: 'rose' };
            } else {
                result.hbEvaluation = { isAnemic: false, text: `Normal Hb düzeyi (${hemoglobin} g/dL, Cutoff: 11.5).`, badgeColor: 'emerald' };
            }
        } else if (ageMonths > 144) {
            // > 12 yaş
            const isMale = gender === 'male' || gender === 'M';
            const cutoff = isMale && ageMonths >= 180 ? 13.0 : 12.0;
            if (hemoglobin < cutoff) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: `Anemi (Hb ${hemoglobin} < ${cutoff.toFixed(1)} g/dL).`, badgeColor: 'rose' };
            } else {
                result.hbCategory = 'Normal';
                result.hbEvaluation = { isAnemic: false, text: `Normal Hb düzeyi (${hemoglobin} g/dL, Cutoff: ${cutoff.toFixed(1)}).`, badgeColor: 'emerald' };
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

    // ── 2. PROFİLAKSİ HESABI ──
    if (ageMonths > 12) {
        result.prophylaxis.eligible = false;
        result.prophylaxis.text = 'Profilaksi dönemi tamamlanmıştır (1 yaş üstü). Ek profilaksi gerekmez.';
    } else if (!isPreterm) {
        if (ageMonths < 4) {
            result.prophylaxis.eligible = false;
            result.prophylaxis.text = 'Profilaksi için henüz erken (Term bebeklerde 4. ayda 1 mg/kg/gün başlanır).';
        } else {
            result.prophylaxis.eligible = true;
            result.prophylaxis.mgDay = Math.min(Math.round(weightKg * 1), 15);
            result.prophylaxis.text = 'T.C. Sağlık Bakanlığı "Demir Gibi Türkiye" Term Bebek Protokolü: 4. aydan itibaren 1 mg/kg/gün (Maks 15 mg/gün).';
        }
    } else {
        if (ageMonths < 2) {
            result.prophylaxis.eligible = false;
            result.prophylaxis.text = '⚡ Preterm Bebek Protokolü: Profilaksi 2. ay kontrolünde başlanmalıdır (2-4 mg/kg/gün).';
        } else {
            result.prophylaxis.eligible = true;
            const mgPerKg = weightKg < 1.5 ? 4 : 2;
            result.prophylaxis.mgDay = Math.min(Math.round(weightKg * mgPerKg), 15);
            result.prophylaxis.text = `⚡ PRETERM BEBEK PROFİLAKSİ PROTOKOLÜ: 2. aydan itibaren ${mgPerKg} mg/kg/gün demir takviyesi (Maks 15 mg/gün).`;
        }
    }

    // ── 3. TEDAVİ HESABI ──
    if (result.hbCategory === 'Patolojik Anemi') {
        result.treatment.eligible = true;
        const maxDose = ageMonths <= 72 ? 60 : 200;
        result.treatment.mgDay = Math.min(Math.round(weightKg * 4), maxDose);
        result.treatment.text = `Aktif Tedavi Dozu: 4 mg/kg/gün (Maksimum günlük doz sınırı ${maxDose} mg).`;
        
        if (result.prophylaxis.eligible) {
            result.prophylaxis.eligible = false;
            result.prophylaxis.mgDay = 0;
            result.prophylaxis.text = 'Aktif anemi tedavisi uygulandığından profilaktik doz iptal edilmiştir.';
        }
    } else if (result.hbCategory === 'Fizyolojik Anemi') {
        result.treatment.eligible = false;
        result.treatment.text = `Fizyolojik Anemi Dönemi (Hb ${hemoglobin} g/dL): Aktif demir tedavisi önerilmez.`;
    } else {
        result.treatment.eligible = false;
        result.treatment.text = 'Mevcut bulgularla aktif tedavi endikasyonu tespit edilmedi.';
    }

    // ── 4. PREPARAT & DAMLA / ŞURUP ÇEVRİMİ ──
    if (result.prophylaxis.mgDay > 0) {
        result.prophylaxis.ferrumDrops = Math.ceil(result.prophylaxis.mgDay / 2.5);
        result.prophylaxis.ferroDrops = Math.ceil(result.prophylaxis.mgDay / 1.5);
        result.prophylaxis.syrupMl = parseFloat((result.prophylaxis.mgDay / 10).toFixed(1));
        result.prophylaxis.syrupOlcek = parseFloat((result.prophylaxis.syrupMl / 5).toFixed(1));
    }

    if (result.treatment.mgDay > 0) {
        result.treatment.ferrumDrops = Math.ceil(result.treatment.mgDay / 2.5);
        result.treatment.ferroDrops = Math.ceil(result.treatment.mgDay / 1.5);
        result.treatment.syrupMl = parseFloat((result.treatment.mgDay / 10).toFixed(1));
        result.treatment.syrupOlcek = parseFloat((result.treatment.syrupMl / 5).toFixed(1));
    }

    return result;
}
