export interface BloodGasInput {
    pH: number | null | undefined;
    pCO2: number | null | undefined;
    HCO3: number | null | undefined;
    Na?: number | null | undefined;
    Cl?: number | null | undefined;
    Albumin?: number | null | undefined;
    sampleType?: 'ABG' | 'VBG' | 'venous' | 'arterial' | string;
    ageInDays?: number | null | undefined;
    ageInYears?: number | null | undefined;
    isNeonate?: boolean;
}

export interface BloodGasResult {
    pH: number;
    pCO2: number;
    HCO3: number;
    raw_pH?: number;
    raw_pCO2?: number;
    raw_HCO3?: number;
    isVBG: boolean;
    primaryDisorder: string;
    compensationText: string;
    AG: number | null;
    corrected_AG: number | null;
    deltaRatio: number | null;
    estimated_HCO3?: number | null;
    hagmaStatus: string;
    flags: string[];
    warnings: string[];
    hasAlbumin: boolean;
    isNeonatalNorms?: boolean;
    isInternallyConsistent?: boolean;
    consistencyDetails?: {
        hCalc: number;
        hMeas: number;
        diffPercent: number;
    };
}

export function analyzeBloodGas({ 
    pH, 
    pCO2, 
    HCO3, 
    Na, 
    Cl, 
    Albumin, 
    sampleType, 
    ageInDays, 
    ageInYears, 
    isNeonate 
}: BloodGasInput): BloodGasResult | null {
    if (!pH || !pCO2 || !HCO3 || pH <= 0 || pCO2 <= 0 || HCO3 <= 0) return null;

    const warnings: string[] = [];
    const flags: string[] = [];

    // HATA-M8-001: Venöz kan gazında (VBG) pH, pCO2 ve HCO3 düzeltmesi
    const isVBG = sampleType === 'VBG' || sampleType === 'venous';
    let calc_pH = pH;
    let calc_pCO2 = pCO2;
    let calc_HCO3 = HCO3;

    if (isVBG) {
        calc_pH = Number((pH + 0.035).toFixed(3));
        calc_pCO2 = Number((pCO2 - 5.0).toFixed(1));
        calc_HCO3 = Number((HCO3 - 1.5).toFixed(1));
        warnings.push('ℹ️ Venöz Kan Gazı (VBG) Dönüşümü: pH +0.035, pCO2 -5.0 mmHg, HCO3 -1.5 mEq/L düzeltilerek tahmini arteriyel değerler esas alınmıştır.');
    }

    // HATA-M8-003: Henderson Denklemine Göre İç Tutarlılık Kontrolü
    // [H+]calc = 24 * (pCO2 / HCO3) nmol/L
    // [H+]meas = 10^(9 - pH) nmol/L
    const hCalc = 24 * (calc_pCO2 / calc_HCO3);
    const hMeas = Math.pow(10, 9 - calc_pH);
    const diffPercent = Math.round((Math.abs(hCalc - hMeas) / hMeas) * 100);
    const isInternallyConsistent = diffPercent <= 20;

    if (!isInternallyConsistent) {
        flags.push('HENDERSON_INCONSISTENT');
        warnings.push('⚠️ Kan gazı değerleri iç tutarlılık testini geçemedi (Henderson eşitliği uyuşmuyor: laboratuvar aktarım hatası veya numune hava teması olabilir).');
    }

    // HATA-M8-002: Yenidoğan (<28 gün) Fizyolojik Referans Aralıkları
    const isNeonatePt = Boolean(
        isNeonate || 
        (ageInDays !== undefined && ageInDays !== null && ageInDays <= 28) || 
        (ageInYears !== undefined && ageInYears !== null && ageInYears < (28 / 365.25))
    );

    const normal_pH_min = isNeonatePt ? 7.30 : 7.35;
    const normal_pH_max = isNeonatePt ? 7.42 : 7.45;
    const normal_pCO2_min = isNeonatePt ? 35 : 35;
    const normal_pCO2_max = isNeonatePt ? 48 : 45;
    const normal_HCO3_min = isNeonatePt ? 19 : 22;
    const normal_HCO3_max = isNeonatePt ? 24 : 26;
    const baseline_HCO3 = isNeonatePt ? 21 : 24;
    const baseline_pCO2 = isNeonatePt ? 40 : 40;

    if (isNeonatePt) {
        flags.push('NEONATAL_NORMS');
    }

    let primaryDisorder = isNeonatePt ? 'Normal / Fizyolojik Yenidoğan Kan Gazı' : 'Normal/Miks';
    let isAcidemia = false;
    let isAlkalemia = false;

    if (calc_pH < normal_pH_min) {
        isAcidemia = true;
    } else if (calc_pH > normal_pH_max) {
        isAlkalemia = true;
    }

    if (isAcidemia) {
        if (calc_HCO3 < normal_HCO3_min && calc_pCO2 > normal_pCO2_max) primaryDisorder = 'Miks Asidoz (Metabolik + Respiratuar)';
        else if (calc_HCO3 < normal_HCO3_min) primaryDisorder = 'Metabolik Asidoz';
        else if (calc_pCO2 > normal_pCO2_max) primaryDisorder = 'Respiratuar Asidoz';
        else if (calc_HCO3 < baseline_HCO3 && calc_pCO2 <= baseline_pCO2) primaryDisorder = 'Metabolik Asidoz';
        else if (calc_pCO2 > baseline_pCO2 && calc_HCO3 >= baseline_HCO3) primaryDisorder = 'Respiratuar Asidoz';
        else primaryDisorder = 'Miks Asidoz (Metabolik + Respiratuar)';
    } else if (isAlkalemia) {
        if (calc_HCO3 > normal_HCO3_max && calc_pCO2 < normal_pCO2_min) primaryDisorder = 'Miks Alkaloz (Metabolik + Respiratuar)';
        else if (calc_HCO3 > normal_HCO3_max) primaryDisorder = 'Metabolik Alkaloz';
        else if (calc_pCO2 < normal_pCO2_min) primaryDisorder = 'Respiratuar Alkaloz';
        else if (calc_HCO3 > baseline_HCO3 && calc_pCO2 >= baseline_pCO2) primaryDisorder = 'Metabolik Alkaloz';
        else if (calc_pCO2 < baseline_pCO2 && calc_HCO3 <= baseline_HCO3) primaryDisorder = 'Respiratuar Alkaloz';
        else primaryDisorder = 'Miks Alkaloz (Metabolik + Respiratuar)';
    } else if (calc_pCO2 > normal_pCO2_max || calc_pCO2 < normal_pCO2_min || calc_HCO3 < normal_HCO3_min || calc_HCO3 > normal_HCO3_max) {
        primaryDisorder = 'Kompanze veya Miks Asit-Baz Bozukluğu';
    }

    let expected_pCO2_min: number | null = null;
    let expected_pCO2_max: number | null = null;
    let compensationText = '';

    // HATA-M8-005: Winter formülünde eşlik eden solunum bozukluklarının primer başlığa yansıtılması
    if (primaryDisorder === 'Metabolik Asidoz') {
        const expected = (1.5 * calc_HCO3) + 8;
        expected_pCO2_min = expected - 2;
        expected_pCO2_max = expected + 2;

        if (calc_pCO2 > expected_pCO2_max) {
            primaryDisorder = 'Miks Bozukluk: Metabolik Asidoz + Respiratuar Asidoz';
            compensationText = `Yetersiz Kompanzasyon / Solunum Yetmezliği (Winter beklenen pCO2: ${expected_pCO2_min.toFixed(1)}-${expected_pCO2_max.toFixed(1)} mmHg, Ölçülen: ${calc_pCO2.toFixed(1)} mmHg)`;
            flags.push('RESP_ACIDOSIS');
        } else if (calc_pCO2 < expected_pCO2_min) {
            primaryDisorder = 'Miks Bozukluk: Metabolik Asidoz + Respiratuar Alkaloz';
            compensationText = `Aşırı Solunumsal Yanıt (Winter beklenen pCO2: ${expected_pCO2_min.toFixed(1)}-${expected_pCO2_max.toFixed(1)} mmHg, Ölçülen: ${calc_pCO2.toFixed(1)} mmHg)`;
            flags.push('RESP_ALKALOSIS');
        } else {
            compensationText = `Uygun Kompanzasyon (Saf Metabolik Asidoz, Beklenen pCO2: ${expected_pCO2_min.toFixed(1)}-${expected_pCO2_max.toFixed(1)} mmHg)`;
        }
    } else if (primaryDisorder === 'Miks Asidoz (Metabolik + Respiratuar)') {
        compensationText = 'Kompanzasyon yetersiz: Metabolik ve Respiratuar Asidoz birlikteliği (Solunum yetmezliği şüphesi)';
        flags.push('RESP_ACIDOSIS');
    } else if (primaryDisorder === 'Metabolik Alkaloz') {
        const expected = (0.7 * calc_HCO3) + 20;
        expected_pCO2_min = expected - 5;
        expected_pCO2_max = expected + 5;

        if (calc_pCO2 > expected_pCO2_max) {
            primaryDisorder = 'Miks Bozukluk: Metabolik Alkaloz + Respiratuar Asidoz';
            compensationText = `Aşırı CO2 Retansiyonu (Beklenen pCO2: ${expected_pCO2_min.toFixed(1)}-${expected_pCO2_max.toFixed(1)} mmHg, Ölçülen: ${calc_pCO2.toFixed(1)} mmHg)`;
            flags.push('RESP_ACIDOSIS');
        } else if (calc_pCO2 < expected_pCO2_min) {
            primaryDisorder = 'Miks Bozukluk: Metabolik Alkaloz + Respiratuar Alkaloz';
            compensationText = `Yetersiz Hipoventilasyon / Eşlik eden Hiperventilasyon (Beklenen pCO2: ${expected_pCO2_min.toFixed(1)}-${expected_pCO2_max.toFixed(1)} mmHg, Ölçülen: ${calc_pCO2.toFixed(1)} mmHg)`;
            flags.push('RESP_ALKALOSIS');
        } else {
            compensationText = `Uygun Kompanzasyon (Saf Metabolik Alkaloz, Beklenen pCO2: ${expected_pCO2_min.toFixed(1)}-${expected_pCO2_max.toFixed(1)} mmHg)`;
        }
    } else if (primaryDisorder === 'Miks Alkaloz (Metabolik + Respiratuar)') {
        compensationText = 'Kompanzasyon yetersiz: Metabolik ve Respiratuar Alkaloz birlikteliği';
        flags.push('RESP_ALKALOSIS');
    } else if (primaryDisorder === 'Respiratuar Asidoz') {
        const delta_pCO2 = calc_pCO2 - 40;
        const exp_acute_HCO3 = 24 + (delta_pCO2 / 10) * 1;
        const exp_chronic_HCO3 = 24 + (delta_pCO2 / 10) * 3.5;
        
        compensationText = `Akut Hdf HCO3: ~${exp_acute_HCO3.toFixed(1)} | Kronik Hdf HCO3: ~${exp_chronic_HCO3.toFixed(1)} mEq/L`;
    } else if (primaryDisorder === 'Respiratuar Alkaloz') {
        const delta_pCO2 = 40 - calc_pCO2;
        const exp_acute_HCO3 = 24 - (delta_pCO2 / 10) * 2;
        const exp_chronic_HCO3 = 24 - (delta_pCO2 / 10) * 4.5;
        
        compensationText = `Akut Hdf HCO3: ~${exp_acute_HCO3.toFixed(1)} | Kronik Hdf HCO3: ~${exp_chronic_HCO3.toFixed(1)} mEq/L`;
    } else if (primaryDisorder === 'Kompanze veya Miks Asit-Baz Bozukluğu') {
        if (calc_pCO2 > normal_pCO2_max && calc_HCO3 > normal_HCO3_max) {
            compensationText = 'Kompanze Resp. Asidoz / Met. Alkaloz (Miks)';
        } else if (calc_pCO2 < normal_pCO2_min && calc_HCO3 < normal_HCO3_min) {
            compensationText = 'Kompanze Met. Asidoz / Resp. Alkaloz (Miks)';
        } else {
            compensationText = 'Normal pH altında gizli/miks asit-baz bozukluğu';
        }
    }

    // HATA-M8-004 & HATA-M8-006: Anyon Açığı, Albümin Düzeltmesi & Delta-Delta Analizi
    let AG: number | null = null;
    let corrected_AG: number | null = null;
    let deltaRatio: number | null = null;
    let estimated_HCO3: number | null = null;
    let hagmaStatus = '';

    const hasElectrolytes = Na !== undefined && Na !== null && !isNaN(Na) && Na > 0 && 
                            Cl !== undefined && Cl !== null && !isNaN(Cl) && Cl > 0;

    if (hasElectrolytes) {
        AG = Number((Na! - (Cl! + calc_HCO3)).toFixed(1));
        corrected_AG = AG;

        const hasAlb = Albumin !== undefined && Albumin !== null && !isNaN(Albumin) && Albumin > 0;
        if (hasAlb) {
            corrected_AG = Number((AG + 2.5 * (4.0 - Albumin!)).toFixed(1));
        } else {
            warnings.push('⚠️ Albümin girilmedi (Hipoalbüminemide anyon açığı yalancı düşük çıkabilir, HAGMA maskelenebilir).');
        }

        const isMetabolicAcidosisContext = isAcidemia || 
            primaryDisorder.includes('Metabolik Asidoz') || 
            calc_HCO3 < normal_HCO3_min;

        if (corrected_AG > 12) {
            hagmaStatus = 'HAGMA (Yüksek Anyon Açıklı Metabolik Asidoz)';
            flags.push('HAGMA');

            if (hasAlb && AG <= 12 && corrected_AG > 12) {
                hagmaStatus += ' [Hipoalbüminemi ile Maskelenmiş Gizli HAGMA]';
                flags.push('MASKED_HAGMA');
            }

            const deltaHCO3 = baseline_HCO3 - calc_HCO3;
            if (deltaHCO3 <= 0) {
                deltaRatio = null;
                estimated_HCO3 = Number((calc_HCO3 + (corrected_AG - 12)).toFixed(1));
                hagmaStatus += ` + Eşlik eden Met. Alkaloz (Tahmini Bikarbonat: ~${estimated_HCO3} mEq/L)`;
                flags.push('MET_ALKALOSIS');
            } else {
                deltaRatio = Number(((corrected_AG - 12) / deltaHCO3).toFixed(2));
                if (deltaRatio < 0.4) {
                    hagmaStatus += ' + NAGMA Birlikteliği (Örn: Diyare, RTA)';
                    flags.push('NAGMA');
                } else if (deltaRatio >= 0.4 && deltaRatio < 0.8) {
                    hagmaStatus += ' - Miks HAGMA + NAGMA';
                    flags.push('NAGMA');
                } else if (deltaRatio >= 0.8 && deltaRatio <= 2.0) {
                    hagmaStatus += ' - Saf HAGMA (DKA, Laktik, vb.)';
                } else if (deltaRatio > 2.0) {
                    estimated_HCO3 = Number((calc_HCO3 + (corrected_AG - 12)).toFixed(1));
                    hagmaStatus += ` + Eşlik eden Met. Alkaloz (Tahmini Bikarbonat: ~${estimated_HCO3} mEq/L)`;
                    flags.push('MET_ALKALOSIS');
                }
            }
        } else {
            // Sadece metabolik asidoz zemininde NAGMA teşhisi koy, aksi halde Normal Anyon Açığı
            if (isMetabolicAcidosisContext) {
                hagmaStatus = 'NAGMA (Normal Anyon Açıklı Metabolik Asidoz)';
                flags.push('NAGMA');
            } else {
                hagmaStatus = 'Normal Anyon Açığı (AG Normal)';
            }
        }
    }

    return {
        pH: calc_pH,
        pCO2: calc_pCO2,
        HCO3: calc_HCO3,
        raw_pH: pH,
        raw_pCO2: pCO2,
        raw_HCO3: HCO3,
        isVBG,
        primaryDisorder,
        compensationText,
        AG,
        corrected_AG,
        deltaRatio,
        estimated_HCO3,
        hagmaStatus,
        flags,
        warnings,
        hasAlbumin: (Albumin !== undefined && Albumin !== null && Albumin > 0),
        isNeonatalNorms: isNeonatePt,
        isInternallyConsistent,
        consistencyDetails: {
            hCalc: Math.round(hCalc * 10) / 10,
            hMeas: Math.round(hMeas * 10) / 10,
            diffPercent
        }
    };
}
