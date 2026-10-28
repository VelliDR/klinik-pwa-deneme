// Pediatric Iron & Anemia Engine — TPHD (Türk Pediatrik Hematoloji Derneği) & T.C. Sağlık Bakanlığı Rehberi

export interface PediatricIronInput {
    ageMonths?: number | null;
    weightKg?: number | null;
    hb?: number | null;
    hbValue?: number | null;
    mcv?: number | null;
    rbc?: number | null;
    rdw?: number | null;
    ferritin?: number | null;
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

export interface IronDifferentialAnalysis {
    hasCbcDetails: boolean;
    mcv: number | null;
    mcvLowerLimit: number | null;
    mcvUpperLimit: number | null;
    isMicrocytic: boolean | null;
    rbc: number | null;
    rdw: number | null;
    ferritin: number | null;
    mentzerIndex: number | null;
    thalassemiaRisk: 'HIGH' | 'POSSIBLE' | 'LOW' | 'UNKNOWN';
    warningTitle?: string;
    warningText?: string;
    badgeColor?: 'rose' | 'amber' | 'emerald' | 'sky';
}

export interface PediatricIronResult {
    status: 'SUCCESS' | 'INCOMPLETE' | string;
    guidelineSource: string;
    hbEvaluation: {
        isAnemic: boolean;
        text: string;
        badgeColor: 'emerald' | 'amber' | 'rose' | 'slate' | string;
    };
    hbCategory: 'Normal' | 'Fizyolojik Anemi' | 'Patolojik Anemi' | 'Belirtilmedi' | string;
    prophylaxis: IronDosagePlan;
    treatment: IronDosagePlan;
    differential?: IronDifferentialAnalysis;
}

function getAgeSpecificMcvLimits(ageMonths: number): { lower: number; upper: number } {
    if (ageMonths <= 0.5) return { lower: 95, upper: 120 };
    if (ageMonths <= 3) return { lower: 80, upper: 105 };
    if (ageMonths < 6) return { lower: 74, upper: 95 };
    if (ageMonths < 24) return { lower: 70, upper: 86 };
    if (ageMonths <= 120) {
        // TPHD Kuralı (>1-2 yaş): MCV alt sınır = 70 + Yaş(yıl), üst sınır = 84 + (Yaş x 0.6)
        const ageYears = Math.floor(ageMonths / 12);
        return {
            lower: 70 + ageYears,
            upper: Math.round((84 + ageYears * 0.6) * 10) / 10
        };
    }
    return { lower: 80, upper: 96 };
}

export function calculatePediatricIron(params: PediatricIronInput = {}): PediatricIronResult {
    const {
        ageMonths = null,
        weightKg = null,
        hb = null,
        hbValue = null,
        mcv = null,
        rbc = null,
        rdw = null,
        ferritin = null,
        isPreterm = false,
        gender = 'male'
    } = params;

    const hemoglobin = hb !== null && hb !== undefined ? hb : (hbValue !== null && hbValue !== undefined ? hbValue : null);
    const cleanMcv = (mcv !== null && mcv !== undefined && !isNaN(mcv) && mcv > 0) ? mcv : null;
    const cleanRbc = (rbc !== null && rbc !== undefined && !isNaN(rbc) && rbc > 0) ? rbc : null;
    const cleanRdw = (rdw !== null && rdw !== undefined && !isNaN(rdw) && rdw > 0) ? rdw : null;
    const cleanFerritin = (ferritin !== null && ferritin !== undefined && !isNaN(ferritin) && ferritin >= 0) ? ferritin : null;

    const result: PediatricIronResult = {
        status: 'SUCCESS',
        guidelineSource: 'TPHD (Türk Pediatrik Hematoloji Derneği) & T.C. Sağlık Bakanlığı Rehberi',
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

    if (ageMonths === null || isNaN(ageMonths) || ageMonths < 0) {
        result.status = 'INCOMPLETE';
        result.hbEvaluation.text = 'Geçerli bir yaş (ay) girilmelidir.';
        return result;
    }

    if (weightKg === null || isNaN(weightKg) || weightKg <= 0) {
        result.status = 'INCOMPLETE';
        result.hbEvaluation.text = 'Geçerli bir kilo (kg) girilmelidir.';
        return result;
    }

    // ── 1. HEMOGLOBİN VE FİZYOLOJİK ANEMİ NADİRİ ANALİZİ (TPHD & DSÖ) ──
    let physioMin = 9.0;
    let physioMax = 11.0;
    let physioNote = '';

    if (hemoglobin !== null && !isNaN(hemoglobin) && hemoglobin > 0) {
        if (ageMonths <= 0.5) {
            // Yenidoğan (0-15 Gün)
            if (hemoglobin < 13.5) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: `Yenidoğan anemisi (Hb ${hemoglobin} < 13.5 g/dL). Kordon klempleme, kanama veya hemoliz yönünden uzman değerlendirmesi gerekir.`, badgeColor: 'rose' };
            } else {
                result.hbCategory = 'Normal';
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
                result.hbCategory = 'Normal';
                result.hbEvaluation = { isAnemic: false, text: `Normal Hb düzeyi (${hemoglobin} g/dL).`, badgeColor: 'emerald' };
            }
        } else if (ageMonths > 3 && ageMonths < 6) {
            // 3 – 6 ay Erken Süt Çocuğu (TPHD Kılavuz Eşiği: 9.5 g/dL)
            const earlyInfantCutoff = isPreterm ? 9.0 : 9.5;
            if (hemoglobin < earlyInfantCutoff) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: `Erken Süt Çocuğu Anemisi (Hb ${hemoglobin} < ${earlyInfantCutoff} g/dL, TPHD 3-6 Ay Eşiği). Ayırıcı tanı (DEA / hemoliz / hemoglobinopati) önerilir.`, badgeColor: 'rose' };
            } else {
                result.hbCategory = 'Normal';
                result.hbEvaluation = { isAnemic: false, text: `Yaşa uygun Hb düzeyi (${hemoglobin} g/dL, 3-6 Ay Alt Sınır: ${earlyInfantCutoff} g/dL).`, badgeColor: 'emerald' };
            }
        } else if (ageMonths >= 6 && ageMonths <= 60) {
            // 6 ay – 5 yaş (DSÖ & TPHD Cutoff: 11.0 g/dL)
            if (hemoglobin < 11.0) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: `Anemi (Hb ${hemoglobin} < 11.0 g/dL). TPHD / DSÖ kriterlerine göre mikrositoz, RDW, Ferritin ve β-talasemi taşıyıcılığı açısından değerlendirilmelidir.`, badgeColor: 'rose' };
            } else {
                result.hbCategory = 'Normal';
                result.hbEvaluation = { isAnemic: false, text: `Normal Hb düzeyi (${hemoglobin} g/dL, Cutoff: 11.0).`, badgeColor: 'emerald' };
            }
        } else if (ageMonths > 60 && ageMonths <= 144) {
            // 5 – 11 yaş (Cutoff: 11.5 g/dL)
            if (hemoglobin < 11.5) {
                result.hbCategory = 'Patolojik Anemi';
                result.hbEvaluation = { isAnemic: true, text: `Anemi (Hb ${hemoglobin} < 11.5 g/dL, TPHD / DSÖ 5-11 Yaş Eşiği).`, badgeColor: 'rose' };
            } else {
                result.hbCategory = 'Normal';
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

    // ── 1B. MCV, MENTZER İNDEKSİ VE TALASEMİ / FERRİTİN AYIRICI TANI KALKANI (TPHD) ──
    const mcvLimits = getAgeSpecificMcvLimits(ageMonths);
    const isMicrocytic = cleanMcv !== null ? cleanMcv < mcvLimits.lower : null;
    const mentzerIndex = (cleanMcv !== null && cleanRbc !== null && cleanRbc > 0)
        ? Number((cleanMcv / cleanRbc).toFixed(1))
        : null;
    const ferritinCutoff = ageMonths < 60 ? 12 : 15;
    const hasCbcDetails = cleanMcv !== null || cleanRbc !== null || cleanRdw !== null || cleanFerritin !== null;

    let thalassemiaRisk: 'HIGH' | 'POSSIBLE' | 'LOW' | 'UNKNOWN' = 'UNKNOWN';
    let diffTitle: string | undefined;
    let diffText: string | undefined;
    let diffBadge: 'rose' | 'amber' | 'emerald' | 'sky' = 'sky';
    let blockEmpiricalIronForThalassemia = false;

    if (mentzerIndex !== null) {
        if (mentzerIndex < 13 && (isMicrocytic !== false)) {
            if (cleanFerritin !== null && cleanFerritin >= ferritinCutoff) {
                thalassemiaRisk = 'HIGH';
                blockEmpiricalIronForThalassemia = true;
                diffBadge = 'rose';
                diffTitle = `🚨 β-TALASEMİ TAŞIYICILIĞI YÜKSEK RİSKİ (Mentzer: ${mentzerIndex} < 13, Ferritin: ${cleanFerritin} ng/mL)`;
                diffText = `Mikrositoz (MCV ${cleanMcv} fL < yaş alt sınırı ${mcvLimits.lower} fL) ve yüksek eritrosit sayısına (${cleanRbc} M/µL) karşın Ferritin normal/yüksek (≥${ferritinCutoff} ng/mL). Toksik demir yüklenmesini önlemek için ampirik demir tedavisi DURDURULDU. Hemoglobin elektroforezi (HPLC) ile β-talasemi taşıyıcılığı araştırılmalıdır.`;
            } else if (cleanFerritin !== null && cleanFerritin < ferritinCutoff) {
                thalassemiaRisk = 'POSSIBLE';
                diffBadge = 'amber';
                diffTitle = `⚠️ KOMBİNE DEA + TALASEMİ TAŞIYICILIĞI ŞÜPHESİ (Mentzer: ${mentzerIndex} < 13, Ferritin: ${cleanFerritin} ng/mL)`;
                diffText = `Ferritin düşüklüğü demir eksikliğini doğrulamaktadır; ancak Mentzer < 13 nedeniyle eşlik eden β-talasemi taşıyıcılığı olabilir. Demir eksikliği HbA₂ düzeyini yapay düşürerek talasemiyi maskelediğinden, önce demir replasmanı tamamlanmalı, ardından Hb elektroforezi istenmelidir.`;
            } else {
                thalassemiaRisk = 'HIGH';
                diffBadge = 'amber';
                diffTitle = `⚠️ β-TALASEMİ TAŞIYICILIĞI ŞÜPHESİ (Mentzer İndeksi: ${mentzerIndex} < 13)`;
                diffText = `Eritrosit sayısı yüksek mikrositoz saptandı (MCV: ${cleanMcv} fL, Yaş alt sınırı: ${mcvLimits.lower} fL). TPHD kılavuzuna göre Serum Ferritin, Demir/TDBK ve RDW görülmeden ampirik 3–6 mg/kg demir yüklemesi yapılmamalıdır (Eşlik eden DEA varsa HbA₂ yalancı düşük çıkabilir).`;
            }
        } else if (mentzerIndex >= 13 && isMicrocytic) {
            thalassemiaRisk = 'LOW';
            diffBadge = 'emerald';
            diffTitle = `✓ Mentzer İndeksi DEA Lehine (${mentzerIndex} ≥ 13)`;
            const rdwNote = cleanRdw !== null && cleanRdw >= 15 ? ` Artmış RDW (%${cleanRdw}) anizositozu ve DEA tanısını desteklemektedir.` : '';
            diffText = `Mikrositoz (MCV ${cleanMcv} fL < ${mcvLimits.lower} fL) ve Mentzer ≥ 13 bulgusu öncelikle Demir Eksikliği Anemisi ile uyumludur.${rdwNote}`;
        } else {
            thalassemiaRisk = 'LOW';
            diffBadge = 'sky';
            diffTitle = `Eritrosit İndeksleri (Mentzer: ${mentzerIndex})`;
            diffText = `MCV: ${cleanMcv} fL (Yaş referansı: ${mcvLimits.lower}–${mcvLimits.upper} fL). Belirgin mikrositer talasemi paterni saptanmadı.`;
        }
    } else if (isMicrocytic !== null) {
        if (isMicrocytic) {
            diffBadge = 'amber';
            diffTitle = `Mikrositoz Saptandı (MCV: ${cleanMcv} fL < ${mcvLimits.lower} fL)`;
            diffText = `TPHD yaş formülüne (70 + yaş) göre mikrositoz mevcut. Talasemi ayırıcı tanısı (Mentzer = MCV/RBC) için Eritrosit (RBC) ve Serum Ferritin değerlerini ekleyiniz.`;
        } else {
            diffBadge = 'emerald';
            diffTitle = `Normositer MCV (${cleanMcv} fL)`;
            diffText = `Yaşa göre beklenen MCV aralığında (${mcvLimits.lower}–${mcvLimits.upper} fL).`;
        }
    }

    if (!result.hbEvaluation.isAnemic && cleanFerritin !== null && cleanFerritin < ferritinCutoff) {
        diffBadge = 'amber';
        diffTitle = `⚡ Anemisiz (Latent) Demir Eksikliği (Ferritin: ${cleanFerritin} < ${ferritinCutoff} ng/mL)`;
        diffText = `Hemoglobin henüz anemi eşiğinin altına inmemiş olsa da depo demiri tükenmiştir. Beslenme düzenlemesi ve oral demir replasmanı değerlendirilmelidir.`;
    }

    result.differential = {
        hasCbcDetails,
        mcv: cleanMcv,
        mcvLowerLimit: mcvLimits.lower,
        mcvUpperLimit: mcvLimits.upper,
        isMicrocytic,
        rbc: cleanRbc,
        rdw: cleanRdw,
        ferritin: cleanFerritin,
        mentzerIndex,
        thalassemiaRisk,
        warningTitle: diffTitle,
        warningText: diffText,
        badgeColor: diffBadge
    };

    // ── 2. PROFİLAKSİ HESABI (T.C. Sağlık Bakanlığı & TPHD) ──
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
            result.prophylaxis.text = 'T.C. Sağlık Bakanlığı "Demir Gibi Türkiye" & TPHD Term Bebek Protokolü: 4–12. aylar arası 1 mg/kg/gün (Maks 15 mg/gün).';
        }
    } else {
        if (ageMonths < 2) {
            result.prophylaxis.eligible = false;
            result.prophylaxis.text = '⚡ Preterm Bebek Protokolü (TPHD): Profilaksi 2. ay kontrolünde başlanmalıdır (2-4 mg/kg/gün).';
        } else {
            result.prophylaxis.eligible = true;
            const mgPerKg = weightKg < 1.5 ? 4 : 2;
            result.prophylaxis.mgDay = Math.min(Math.round(weightKg * mgPerKg), 15);
            result.prophylaxis.text = `⚡ PRETERM BEBEK PROFİLAKSİ PROTOKOLÜ (TPHD): 2. aydan itibaren ${mgPerKg} mg/kg/gün demir takviyesi (Maks 15 mg/gün).`;
        }
    }

    // ── 3. TEDAVİ HESABI ──
    if (result.hbCategory === 'Patolojik Anemi') {
        if (blockEmpiricalIronForThalassemia) {
            result.treatment.eligible = false;
            result.treatment.mgDay = 0;
            result.treatment.text = `⛔ KONTRENDİKE / DURDURULDU: Mentzer < 13 ve Ferritin normal (${cleanFerritin} ng/mL) olduğundan β-Talasemi taşıyıcılığı şüphesiyle ampirik demir tedavisi önerilmez; Hb elektroforezi istenmelidir.`;
            result.prophylaxis.eligible = false;
            result.prophylaxis.mgDay = 0;
        } else {
            result.treatment.eligible = true;
            const maxDose = ageMonths <= 72 ? 60 : 200;
            result.treatment.mgDay = Math.min(Math.round(weightKg * 4), maxDose);
            const thalassemiaCaution = thalassemiaRisk === 'HIGH'
                ? ' ⚠️ DİKKAT: Mentzer < 13 saptandı; tedaviye başlamadan önce mutlaka Ferritin ile demir eksikliği doğrulanmalıdır!'
                : (!hasCbcDetails ? ' (Tedavi öncesi MCV, RBC/Mentzer ve Ferritin ile β-talasemi taşıyıcılığı dışlanmalıdır.)' : '');
            result.treatment.text = `TPHD Terapötik Doz: 4 mg/kg/gün elementer demir (3–6 mg/kg/gün aralığı, Maks ${maxDose} mg/gün; Hb normale döndükten sonra depolar için 2–3 ay devam).${thalassemiaCaution}`;
            
            if (result.prophylaxis.eligible) {
                result.prophylaxis.eligible = false;
                result.prophylaxis.mgDay = 0;
                result.prophylaxis.text = 'Aktif anemi tedavisi uygulandığından profilaktik doz iptal edilmiştir.';
            }
        }
    } else if (result.hbCategory === 'Fizyolojik Anemi') {
        result.treatment.eligible = false;
        result.treatment.text = `Fizyolojik Anemi Dönemi (Hb ${hemoglobin} g/dL): Aktif demir tedavisi önerilmez.`;
    } else {
        result.treatment.eligible = false;
        result.treatment.text = 'Mevcut bulgularla aktif anemi tedavisi endikasyonu tespit edilmedi.';
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
