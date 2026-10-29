/**
 * KAN GAZI VE ASİT-BAZ FİZYOPATOLOJİK ANALİZ MOTORU (BLOOD GAS ENGINE)
 * 
 * Kaynak: Kan Gazı Analizlerinin Fizyopatolojik Temelleri, Sistematik Yorumlama Modelleri ve Klinik Karar Standartları
 * Metodolojik Ekoller:
 *  1. Boston Ekolü (Henderson-Hasselbalch, Winter Formülü, 1-4-2-5 Solunumsal Kompansasyon)
 *  2. Kopenhag Ekolü (Astrup & Siggaard-Andersen, Standart Baz Fazlalığı - SBE Van Slyke)
 *  3. Stewart Fizikokimyasal Modeli / Fencl-Story (Güçlü İyon Farkı - SIDa, SIDe, Güçlü İyon Açığı - SIG, SBE alt bileşenleri)
 * 
 * 8 Aşamalı Sistematik Klinik Karar Algoritması:
 *  - Aşama 1: Analitik Kalite ve İçsel Tutarlılık (Kassirer-Bleich Denklemi: [H+] = 24*(pCO2/HCO3))
 *  - Aşama 2: Oksijenasyon, Alveolar Gaz Geçişi (A-a Gradyenti) ve Şant/ARDS (Horovitz P/F)
 *  - Aşama 3: Primer Asit-Baz Durumunun Tayini (Asidemi, Alkalemi, Normal)
 *  - Aşama 4: Primer Patofizyolojik Süreç (Metabolik vs Respiratuar)
 *  - Aşama 5: Fizyolojik Kompansasyon Yanıtı ve Sınırları (Winter, Met. Alk, 1-4-2-5 Kuralı)
 *  - Aşama 6: Anyon Açığı (AG) ve Albümin Düzeltmesi (Maskeli HAGMA tespiti)
 *  - Aşama 7: Delta Oranı (ΔAG / ΔHCO3) ve Delta Gap (Üçlü ve mikst bozukluk taraması)
 *  - Aşama 8: Kopenhag & Stewart-Fencl Fizikokimyasal Doğrulama (SBE, SIDa, SIG)
 */

export interface BloodGasInput {
    pH: number | null | undefined;
    pCO2: number | null | undefined;
    HCO3: number | null | undefined;
    pO2?: number | null | undefined; // PaO2 veya PvO2 (mmHg)
    FiO2?: number | null | undefined; // Fraksiyon (0.21 - 1.0) veya Yüzde (21 - 100), varsayılan: %21
    Na?: number | null | undefined; // mEq/L
    Cl?: number | null | undefined; // mEq/L
    Albumin?: number | null | undefined; // g/dL
    lactate?: number | null | undefined; // mmol/L
    potassium?: number | null | undefined; // mEq/L
    temperature?: number | null | undefined; // °C (varsayılan: 37°C)
    sampleType?: 'ABG' | 'VBG' | 'venous' | 'arterial' | string;
    ageInDays?: number | null | undefined;
    ageInYears?: number | null | undefined;
    isNeonate?: boolean;
}

export interface BloodGasOxygenation {
    pO2: number;
    fiO2Percent: number;
    pao2Alveolar: number; // PAO2
    aaGradient: number; // P(A-a)O2
    expectedAaGradient: number; // Yaşa göre beklenen A-a
    expectedPaO2: number; // Yaşa göre beklenen PaO2
    horovitzIndex: number; // PaO2 / FiO2
    hypoxemiaSeverity: string;
    mechanism: string;
    ardsSeverity: string;
}

export interface BloodGasStewart {
    sida: number | null; // [Na+] - [Cl-]
    sidaInterpretation: string;
    sbeNaCl: number | null; // ([Na+] - [Cl-]) - 38
    sbeAlb: number | null; // 0.25 * (42 - Albumin_g/L)
    sbeUnmeasured: number | null; // SBE - (SBE_NaCl + SBE_Alb)
    sig: number | null; // Strong Ion Gap
    sigInterpretation: string;
}

export interface BloodGasTemperatureCorrection {
    patientTemp: number;
    isHypothermic: boolean;
    isHyperthermic: boolean;
    corrected_pH: number;
    corrected_pCO2: number;
    corrected_pO2: number | null;
    alphaStatNote: string;
    phStatNote: string;
}

export interface EightStepBreakdown {
    step1_quality: string;
    step2_oxygenation: string;
    step3_acidBaseState: string;
    step4_primaryDisorder: string;
    step5_compensation: string;
    step6_anionGap: string;
    step7_deltaRatio: string;
    step8_stewartCopenhagen: string;
}

export interface BloodGasResult {
    // 1. Temel ve Düzeltilmiş Değerler
    pH: number;
    pCO2: number;
    HCO3: number;
    pO2?: number | null;
    raw_pH?: number;
    raw_pCO2?: number;
    raw_HCO3?: number;
    raw_pO2?: number | null;
    isVBG: boolean;
    primaryDisorder: string;
    compensationText: string;

    // 2. Anyon Açığı & Delta-Delta Analizi
    AG: number | null;
    corrected_AG: number | null;
    deltaRatio: number | null;
    deltaGap?: number | null;
    estimated_HCO3?: number | null;
    hagmaStatus: string;

    // 3. Kopenhag Ekolü (Standart Baz Fazlalığı - SBE)
    sbe: number;
    sbeInterpretation: string;

    // 4. Stewart Fizikokimyasal / Fencl-Story Yaklaşımı
    stewart?: BloodGasStewart;

    // 5. Oksijenasyon, Gaz Değişimi & Şant Dinamikleri
    oxygenation?: BloodGasOxygenation;

    // 6. Sıcaklık Düzeltmesi (Alpha-stat vs pH-stat)
    temperatureCorrection?: BloodGasTemperatureCorrection;

    // 7. İç Tutarlılık (Kassirer-Bleich Denklemi)
    isInternallyConsistent?: boolean;
    consistencyDetails?: {
        hCalc: number; // 24 * (pCO2 / HCO3) nmol/L
        hMeas: number; // 10^(9 - pH) nmol/L
        hEst?: number; // 80 - (pH ondalık) nmol/L
        diffPercent: number;
        diffNmol?: number;
        interpretation?: string;
    };

    // 8. Sekiz Aşamalı Sistematik Karar Özeti
    eightStepAnalysis?: EightStepBreakdown;

    // 9. Uyarılar ve Bayraklar
    flags: string[];
    warnings: string[];
    hasAlbumin: boolean;
    isNeonatalNorms?: boolean;
}

export function analyzeBloodGas({ 
    pH, 
    pCO2, 
    HCO3, 
    pO2,
    FiO2,
    Na, 
    Cl, 
    Albumin, 
    lactate,
    potassium,
    temperature,
    sampleType, 
    ageInDays, 
    ageInYears, 
    isNeonate 
}: BloodGasInput): BloodGasResult | null {
    if (!pH || !pCO2 || !HCO3 || pH <= 0 || pCO2 <= 0 || HCO3 <= 0) return null;

    const warnings: string[] = [];
    const flags: string[] = [];

    // =========================================================================
    // PREANALİTİK & AŞAMA 1: NUMUNE TİPİ VE VBG DÖNÜŞÜMÜ
    // =========================================================================
    const isVBG = sampleType === 'VBG' || sampleType === 'venous';
    let calc_pH = pH;
    let calc_pCO2 = pCO2;
    let calc_HCO3 = HCO3;
    let calc_pO2 = (pO2 !== undefined && pO2 !== null && pO2 > 0) ? pO2 : null;

    if (isVBG) {
        calc_pH = Number((pH + 0.035).toFixed(3));
        calc_pCO2 = Number((pCO2 - 5.0).toFixed(1));
        calc_HCO3 = Number((HCO3 - 1.5).toFixed(1));
        warnings.push('ℹ️ Venöz Kan Gazı (VBG) Dönüşümü: pH +0.035, pCO2 -5.0 mmHg, HCO3 -1.5 mEq/L düzeltilerek tahmini arteriyel değerler esas alınmıştır.');
        if (calc_pO2 !== null) {
            warnings.push('ℹ️ Venöz pO2 (PvO2) doku oksijen ekstraksiyonunu gösterir; doğrudan arteriyel oksijenasyonu (PaO2) yansıtmaz.');
        }
    }

    // =========================================================================
    // AŞAMA 1: İÇSEL TUTARLILIK (KASSIRER-BLEICH DENKLEMİ)
    // [H+]calc = 24 * (pCO2 / HCO3) nmol/L
    // [H+]meas = 10^(9 - pH) nmol/L
    // Fizyolojik pratik kural: [H+]est ≈ 80 - (pH'nın virgülden sonraki 2 basamağı)
    // =========================================================================
    const hCalc = 24 * (calc_pCO2 / calc_HCO3);
    const hMeas = Math.pow(10, 9 - calc_pH);
    const phTwoDigits = Math.round((calc_pH % 1) * 100);
    const hEst = 80 - phTwoDigits;
    const diffPercent = Math.round((Math.abs(hCalc - hMeas) / hMeas) * 100);
    const diffNmol = Math.round(Math.abs(hCalc - hEst) * 10) / 10;
    const isInternallyConsistent = diffPercent <= 20;

    let consistencyInterpretation = 'Veriler matematiksel olarak iç tutarlıdır (Kassirer-Bleich denklemi ile uyumlu).';
    if (!isInternallyConsistent) {
        flags.push('HENDERSON_INCONSISTENT');
        consistencyInterpretation = 'Kan gazı değerleri iç tutarlılık testini geçemedi ([H+] sapması > %20). Preanalitik numune hava teması, aşırı heparin dilüsyonu veya elektrot kalibrasyon hatası şüphesi.';
        warnings.push('⚠️ Kan gazı değerleri iç tutarlılık testini geçemedi (Henderson eşitliği uyuşmuyor: laboratuvar aktarım hatası veya numune hava teması olabilir).');
    }

    // =========================================================================
    // YAŞ VE YENİDOĞAN FİZYOLOJİK NORMLARI (<28 GÜN)
    // =========================================================================
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

    // =========================================================================
    // AŞAMA 3 & 4: PRİMER ASİT-BAZ DURUMU VE PRİMER BOZUKLUĞUN TESPİTİ
    // =========================================================================
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

    // =========================================================================
    // AŞAMA 5: FİZYOLOJİK KOMPANSASYON YANITININ DENETLENMESİ
    // =========================================================================
    let expected_pCO2_min: number | null = null;
    let expected_pCO2_max: number | null = null;
    let compensationText = '';

    if (primaryDisorder === 'Metabolik Asidoz') {
        // Winter Formülü: Beklenen pCO2 = (1.5 * HCO3) + 8 ± 2 mmHg
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

        // Fizyolojik alt kompanzasyon sınırı uyarısı (8-12 mmHg)
        if (calc_pCO2 < 12) {
            warnings.push('⚠️ pCO2 < 12 mmHg: Solunumsal kompanzasyonun fizyolojik tavanına (alt eşik) ulaşılmıştır; kas yorgunluğu ve ani solunum arresti riski mevcuttur.');
        }
    } else if (primaryDisorder === 'Miks Asidoz (Metabolik + Respiratuar)') {
        compensationText = 'Kompanzasyon yetersiz: Metabolik ve Respiratuar Asidoz birlikteliği (Solunum yetmezliği şüphesi)';
        flags.push('RESP_ACIDOSIS');
    } else if (primaryDisorder === 'Metabolik Alkaloz') {
        // Beklenen pCO2 = (0.7 * HCO3) + 20 ± 5 mmHg
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

        // Hipoksik dürtü tavanı uyarısı (55-60 mmHg)
        if (calc_pCO2 > 55) {
            warnings.push('⚠️ pCO2 > 55 mmHg: Metabolik alkalozda solunumsal kompanzasyon nadiren 55 mmHg üzerine çıkar (hipoksik solunum dürtüsü nedeniyle). Bu seviye eşlik eden primer solunum yetmezliğini işaret eder.');
        }
    } else if (primaryDisorder === 'Miks Alkaloz (Metabolik + Respiratuar)') {
        compensationText = 'Kompanzasyon yetersiz: Metabolik ve Respiratuar Alkaloz birlikteliği';
        flags.push('RESP_ALKALOSIS');
    } else if (primaryDisorder === 'Respiratuar Asidoz') {
        // 1-4 Kuralı: her 10 pCO2 artışı için akut +1, kronik +3.5 mEq/L HCO3
        const delta_pCO2 = calc_pCO2 - 40;
        const exp_acute_HCO3 = 24 + (delta_pCO2 / 10) * 1;
        const exp_chronic_HCO3 = 24 + (delta_pCO2 / 10) * 3.5;
        
        compensationText = `Akut Hdf HCO3: ~${exp_acute_HCO3.toFixed(1)} | Kronik Hdf HCO3: ~${exp_chronic_HCO3.toFixed(1)} mEq/L`;
    } else if (primaryDisorder === 'Respiratuar Alkaloz') {
        // 2-5 Kuralı: her 10 pCO2 düşüşü için akut -2, kronik -4.5 mEq/L HCO3
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

    // =========================================================================
    // KOPENHAG EKOLÜ: STANDART BAZ FAZLALIĞI (SBE / VAN SLYKE)
    // SBE = [HCO3-] - 24.8 + [16.2 * (pH - 7.40)]
    // =========================================================================
    const rawSbe = calc_HCO3 - 24.8 + (16.2 * (calc_pH - 7.40));
    const sbe = Number(rawSbe.toFixed(1));
    let sbeInterpretation = '';
    if (sbe < -2.0) {
        sbeInterpretation = `Baz Defisiti (${sbe} mEq/L < -2.0): Bağımsız metabolik asidoz varlığını doğrular.`;
    } else if (sbe > 2.0) {
        sbeInterpretation = `Baz Fazlalığı (+${sbe} mEq/L > +2.0): Bağımsız metabolik alkaloz varlığını doğrular.`;
    } else {
        sbeInterpretation = `Normal Tampon Baz Rezervi (${sbe} mEq/L, ref: -2.0 ila +2.0 mEq/L).`;
    }

    // =========================================================================
    // AŞAMA 6 & 7: ANYON AÇIĞI, ALBÜMİN DÜZELTMESİ VE DELTA ORANI / DELTA GAP
    // =========================================================================
    let AG: number | null = null;
    let corrected_AG: number | null = null;
    let deltaRatio: number | null = null;
    let deltaGap: number | null = null;
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

            const deltaAG = corrected_AG - 12;
            const deltaHCO3 = baseline_HCO3 - calc_HCO3;
            deltaGap = Number((deltaAG - deltaHCO3).toFixed(1));

            if (deltaHCO3 <= 0) {
                deltaRatio = null;
                estimated_HCO3 = Number((calc_HCO3 + deltaAG).toFixed(1));
                hagmaStatus += ` + Eşlik eden Met. Alkaloz (Tahmini Bikarbonat: ~${estimated_HCO3} mEq/L)`;
                flags.push('MET_ALKALOSIS');
            } else {
                deltaRatio = Number((deltaAG / deltaHCO3).toFixed(2));
                if (deltaRatio < 0.4) {
                    hagmaStatus += ' + NAGMA Birlikteliği (Örn: Diyare, RTA)';
                    flags.push('NAGMA');
                } else if (deltaRatio >= 0.4 && deltaRatio < 0.8) {
                    hagmaStatus += ' - Miks HAGMA + NAGMA';
                    flags.push('NAGMA');
                } else if (deltaRatio >= 0.8 && deltaRatio <= 2.0) {
                    hagmaStatus += ' - Saf HAGMA (DKA, Laktik, vb.)';
                } else if (deltaRatio > 2.0) {
                    estimated_HCO3 = Number((calc_HCO3 + deltaAG).toFixed(1));
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

    // =========================================================================
    // AŞAMA 8: STEWART FİZİKOKİMYASAL MODELİ / FENCL-STORY AYRIŞTIRMASI
    // SIDa = [Na+] - [Cl-] (Ref: 38 - 42 mEq/L)
    // SBE_Na-Cl = ([Na+] - [Cl-]) - 38
    // SBE_Alb = 0.25 * (42 - Albumin_g/L)
    // SBE_unmeasured = SBE - (SBE_Na-Cl + SBE_Alb)
    // =========================================================================
    let stewartObj: BloodGasStewart | undefined = undefined;
    if (hasElectrolytes) {
        const sida = Number((Na! - Cl!).toFixed(1));
        let sidaInterpretation = '';
        if (sida < 38) {
            sidaInterpretation = `Düşük SIDa (${sida} mEq/L < 38): Güçlü iyon asidozu (hiperkloremik dilüsyonel asidoz / aşırı SF yüklemesi).`;
        } else if (sida > 42) {
            sidaInterpretation = `Yüksek SIDa (${sida} mEq/L > 42): Güçlü iyon alkalozu (hipokloremi / diüretik / nazogastrik kayıp).`;
        } else {
            sidaInterpretation = `Normal Güçlü İyon Farkı (SIDa: ${sida} mEq/L, ref: 38–42 mEq/L).`;
        }

        const sbeNaCl = Number(((Na! - Cl!) - 38).toFixed(1));
        let sbeAlb: number | null = null;
        let sbeUnmeasured: number | null = null;

        if (Albumin !== undefined && Albumin !== null && Albumin > 0) {
            const albGperL = Albumin * 10;
            sbeAlb = Number((0.25 * (42 - albGperL)).toFixed(1));
            sbeUnmeasured = Number((sbe - (sbeNaCl + sbeAlb)).toFixed(1));
        }

        // Gelişmiş SIG (Güçlü İyon Açığı): Eğer Laktat ve Albümin varsa
        let sig: number | null = null;
        let sigInterpretation = 'SIG hesaplaması için ilave laktat ve albümin verisi bekleniyor.';
        if (Albumin !== undefined && Albumin !== null && Albumin > 0 && lactate !== undefined && lactate !== null) {
            const kVal = potassium || 4.0;
            const sidaAdv = (Na! + kVal) - (Cl! + lactate);
            const albCharge = (Albumin * 10) * (0.123 * calc_pH - 0.631);
            const piCharge = 1.16 * (0.309 * calc_pH - 0.469); // Standart fizyolojik Pi: 1.16 mmol/L
            const sideAdv = calc_HCO3 + albCharge + piCharge;
            sig = Number((sidaAdv - sideAdv).toFixed(1));

            if (sig > 2.0) {
                sigInterpretation = `Yüksek SIG (+${sig} mEq/L > +2.0): Dolaşımda rutin biyokimyada ölçülemeyen güçlü toksik anyonlar birikmiştir (sülfat, ketoasitler, ekzojen toksinler).`;
                flags.push('HIGH_SIG');
            } else {
                sigInterpretation = `Normal SIG (${sig} mEq/L, ref: 0 ± 2 mEq/L): Anlamlı unmeasured güçlü anyon yükü saptanmadı.`;
            }
        }

        stewartObj = {
            sida,
            sidaInterpretation,
            sbeNaCl,
            sbeAlb,
            sbeUnmeasured,
            sig,
            sigInterpretation
        };
    }

    // =========================================================================
    // AŞAMA 2: OKSİJENASYON, ALVEOLAR GAZ DENKLEMİ VE ŞANT/ARDS (HOROVITZ)
    // PAO2 = FiO2 * (PB - 47) - (pCO2 / R)
    // A-a Gradyenti = PAO2 - PaO2
    // =========================================================================
    let oxygenationObj: BloodGasOxygenation | undefined = undefined;
    if (calc_pO2 !== null) {
        // FiO2 parsing (21 veya 0.21)
        let fiO2Percent = 21;
        if (FiO2 !== undefined && FiO2 !== null && FiO2 > 0) {
            fiO2Percent = FiO2 <= 1.0 ? Number((FiO2 * 100).toFixed(0)) : Number(FiO2.toFixed(0));
        }
        const fiO2Fraction = fiO2Percent / 100;
        const ptAge = ageInYears ?? (ageInDays ? ageInDays / 365.25 : 40);

        // Alveolar Gaz Denklemi (Deniz seviyesi PB = 760 mmHg, PH2O = 47 mmHg, R = 0.8)
        const pao2Alveolar = Number((fiO2Fraction * (760 - 47) - (calc_pCO2 / 0.8)).toFixed(1));
        const aaGradient = Number((pao2Alveolar - calc_pO2).toFixed(1));
        const expectedAaGradient = Number(((ptAge / 4) + 4).toFixed(1));
        const expectedPaO2 = Number((100 - (0.3 * ptAge)).toFixed(1));
        const horovitzIndex = Number((calc_pO2 / fiO2Fraction).toFixed(0));

        let hypoxemiaSeverity = 'Normal Oksijenasyon';
        if (calc_pO2 < 40) hypoxemiaSeverity = 'Ağır Hipoksemi (pO2 < 40 mmHg)';
        else if (calc_pO2 < 60) hypoxemiaSeverity = 'Orta Hipoksemi (40–59 mmHg)';
        else if (calc_pO2 < 80) hypoxemiaSeverity = 'Hafif Hipoksemi (60–79 mmHg)';

        let ardsSeverity = 'Normal Akciğer Fonksiyonu (P/F > 300)';
        if (horovitzIndex <= 100) ardsSeverity = 'Ağır ARDS (P/F ≤ 100 mmHg)';
        else if (horovitzIndex <= 200) ardsSeverity = 'Orta ARDS (100 < P/F ≤ 200 mmHg)';
        else if (horovitzIndex <= 300) ardsSeverity = 'Hafif ARDS (200 < P/F ≤ 300 mmHg)';

        let mechanism = '';
        const isAaNormal = aaGradient <= Math.max(expectedAaGradient + 5, 15);
        if (isAaNormal) {
            if (calc_pCO2 > normal_pCO2_max) {
                mechanism = 'Alveolar Hipoventilasyon (Normal A-a gradyenti + Hiperkapni: solunum merkezi depresyonu, nöromusküler felç, göğüs duvarı patolojisi).';
            } else {
                mechanism = 'Düşük FiO2 veya Yüksek İrtifa (Normal A-a gradyenti).';
            }
        } else {
            if (horovitzIndex <= 200) {
                mechanism = 'Sağdan Sola Şant / Parankimal Konsolidasyon (Genişlemiş A-a gradyenti, O2 tedavisine yanıtsız veya dirençli: ARDS, lober pnömoni, atelektazi).';
            } else {
                mechanism = 'Ventilasyon / Perfüzyon (V/Q) Uyumsuzluğu veya Diffüzyon Kısıtlılığı (Genişlemiş A-a gradyenti, O2 tedavisine iyi yanıt verir: KOAH, astım atağı, pulmoner emboli).';
            }
        }

        oxygenationObj = {
            pO2: calc_pO2,
            fiO2Percent,
            pao2Alveolar,
            aaGradient,
            expectedAaGradient,
            expectedPaO2,
            horovitzIndex,
            hypoxemiaSeverity,
            mechanism,
            ardsSeverity
        };
    }

    // =========================================================================
    // SICAKLIK DÜZELTMESİ (ALPHA-STAT VS PH-STAT)
    // Standart analizör elektrot sıcaklığı: 37°C
    // ΔpH/°C ≈ -0.015, ΔPaCO2/°C ≈ -%4.4, ΔPaO2/°C ≈ -%7.2
    // =========================================================================
    let tempCorrectionObj: BloodGasTemperatureCorrection | undefined = undefined;
    if (temperature !== undefined && temperature !== null && temperature > 0 && Math.abs(temperature - 37) >= 0.5) {
        const tempDiff = 37 - temperature;
        const isHypothermic = temperature < 36.5;
        const isHyperthermic = temperature > 37.5;

        const corrected_pH = Number((calc_pH + (tempDiff * 0.015)).toFixed(3));
        const corrected_pCO2 = Number((calc_pCO2 * (1 - (0.044 * tempDiff))).toFixed(1));
        const corrected_pO2 = calc_pO2 !== null ? Number((calc_pO2 * (1 - (0.072 * tempDiff))).toFixed(1)) : null;

        const alphaStatNote = 'Alpha-stat Stratejisi (Standart Klinik Kılavuz): 37°C ham değerleri doğrudan baz alınır. Hücresel enzim imidazol halkalarının elektriksel nötralitesini korur. Yetişkin YB ve standart ameliyathanede temel yaklaşımdır.';
        const phStatNote = `pH-stat Stratejisi: Aktüel sıcaklık (${temperature}°C) in vivo değerleri (pH: ${corrected_pH}, pCO2: ${corrected_pCO2} mmHg). Serebral vazodilatasyon ve homojen beyin soğuması sağlar; derin hipotermik arrestli pediatrik kalp cerrahilerinde tercih edilir.`;

        tempCorrectionObj = {
            patientTemp: temperature,
            isHypothermic,
            isHyperthermic,
            corrected_pH,
            corrected_pCO2,
            corrected_pO2,
            alphaStatNote,
            phStatNote
        };
    }

    // =========================================================================
    // SEKİZ AŞAMALI SİSTEMATİK KLİNİK KARAR DERLEMESİ (DETAY KUTUSU İÇİN)
    // =========================================================================
    const eightStepAnalysis: EightStepBreakdown = {
        step1_quality: `İç Tutarlılık: [H+]calc = 24*(pCO2/HCO3) = ${Math.round(hCalc * 10) / 10} nmol/L. [H+]est = 80 - ${phTwoDigits} = ${hEst} nmol/L. Sapma: ${diffNmol} nmol/L (%${diffPercent}). ${isInternallyConsistent ? '✅ Matematiksel olarak tutarlı.' : '⚠️ Şüpheli / Kalibrasyon kontrolü önerilir.'}`,
        step2_oxygenation: oxygenationObj 
            ? `pO2: ${oxygenationObj.pO2} mmHg (FiO2: %${oxygenationObj.fiO2Percent}). Alveolar PAO2: ${oxygenationObj.pao2Alveolar} mmHg. P(A-a)O2 Gradyenti: ${oxygenationObj.aaGradient} mmHg (Yaşa göre beklenen: ~${oxygenationObj.expectedAaGradient} mmHg). Horovitz P/F: ${oxygenationObj.horovitzIndex} mmHg (${oxygenationObj.ardsSeverity}). Mekanizma: ${oxygenationObj.mechanism}`
            : 'Oksijenasyon analizi için PaO2 ve FiO2 girişi bekleniyor.',
        step3_acidBaseState: `pH = ${calc_pH.toFixed(2)} -> ${isAcidemia ? 'Sistemik Asidemi (pH < ' + normal_pH_min + ')' : isAlkalemia ? 'Sistemik Alkalemi (pH > ' + normal_pH_max + ')' : 'Normal / Kompanse Asit-Baz Dengesi (pH ' + normal_pH_min + '–' + normal_pH_max + ')'}`,
        step4_primaryDisorder: `Primer Patoloji: ${primaryDisorder} (pCO2: ${calc_pCO2} mmHg, HCO3: ${calc_HCO3} mEq/L)`,
        step5_compensation: compensationText || 'Fizyolojik kompanzasyon dengeli.',
        step6_anionGap: hasElectrolytes 
            ? `Serum Anyon Açığı (AG): ${AG?.toFixed(1)} mEq/L. Düzeltilmiş AG: ${corrected_AG?.toFixed(1)} mEq/L. Durum: ${hagmaStatus}`
            : 'Anyon açığı için Na ve Cl elektrolitleri girilmelidir.',
        step7_deltaRatio: deltaRatio !== null 
            ? `Delta Oranı (ΔAG / ΔHCO3) = ${deltaRatio} (Delta Gap = ${deltaGap} mEq/L). Tanısal Karar: ${deltaRatio < 0.4 ? 'Saf NAGMA (bikarbonat kaybı)' : deltaRatio < 0.8 ? 'Mikst HAGMA + NAGMA' : deltaRatio <= 2.0 ? 'Saf HAGMA (1:1 stoikiyometrik tamponlama)' : 'Mikst HAGMA + Metabolik Alkaloz'}`
            : (estimated_HCO3 ? `ΔAG artışına göre tahmini başlangıç HCO3: ~${estimated_HCO3} mEq/L (Gizli Metabolik Alkaloz)` : 'Delta analizi HAGMA varlığında uygulanır.'),
        step8_stewartCopenhagen: `Kopenhag Ekolü SBE: ${sbe > 0 ? '+' : ''}${sbe} mEq/L (${sbeInterpretation}). ${stewartObj ? `Stewart Modeli: SIDa (Na-Cl) = ${stewartObj.sida} mEq/L. SBE(Na-Cl): ${stewartObj.sbeNaCl} mEq/L, SBE(Alb): ${stewartObj.sbeAlb ?? '--'} mEq/L, SBE(Ölçülemeyen): ${stewartObj.sbeUnmeasured ?? '--'} mEq/L. ${stewartObj.sig !== null ? `SIG: ${stewartObj.sig} mEq/L (${stewartObj.sigInterpretation})` : ''}` : ''}`
    };

    return {
        pH: calc_pH,
        pCO2: calc_pCO2,
        HCO3: calc_HCO3,
        pO2: calc_pO2,
        raw_pH: pH,
        raw_pCO2: pCO2,
        raw_HCO3: HCO3,
        raw_pO2: pO2 ?? null,
        isVBG,
        primaryDisorder,
        compensationText,
        AG,
        corrected_AG,
        deltaRatio,
        deltaGap,
        estimated_HCO3,
        hagmaStatus,
        sbe,
        sbeInterpretation,
        stewart: stewartObj,
        oxygenation: oxygenationObj,
        temperatureCorrection: tempCorrectionObj,
        eightStepAnalysis,
        flags,
        warnings,
        hasAlbumin: (Albumin !== undefined && Albumin !== null && Albumin > 0),
        isNeonatalNorms: isNeonatePt,
        isInternallyConsistent,
        consistencyDetails: {
            hCalc: Math.round(hCalc * 10) / 10,
            hMeas: Math.round(hMeas * 10) / 10,
            hEst,
            diffPercent,
            diffNmol,
            interpretation: consistencyInterpretation
        }
    };
}
