export interface BloodGasInput {
    pH: number | null | undefined;
    pCO2: number | null | undefined;
    HCO3: number | null | undefined;
    Na?: number | null | undefined;
    Cl?: number | null | undefined;
    Albumin?: number | null | undefined;
    sampleType?: 'ABG' | 'VBG' | string;
}

export interface BloodGasResult {
    pH: number;
    pCO2: number;
    HCO3: number;
    primaryDisorder: string;
    compensationText: string;
    AG: number | null;
    corrected_AG: number | null;
    deltaRatio: number | null;
    hagmaStatus: string;
    flags: string[];
    hasAlbumin: boolean;
}

export function analyzeBloodGas({ pH, pCO2, HCO3, Na, Cl, Albumin, sampleType }: BloodGasInput): BloodGasResult | null {
    if (!pH || !pCO2 || !HCO3 || pH <= 0 || pCO2 <= 0 || HCO3 <= 0) return null;

    let calc_pH = pH;
    let calc_pCO2 = pCO2;
    let calc_HCO3 = HCO3;

    if (sampleType === 'VBG' || sampleType === 'venous') {
        calc_pH = pH + 0.035;
        calc_pCO2 = pCO2 - 5.0;
        calc_HCO3 = HCO3; // VBG HCO3 ~ ABG HCO3
    }

    let primaryDisorder = 'Normal/Miks';
    let isAcidemia = false;
    let isAlkalemia = false;

    if (calc_pH < 7.35) {
        isAcidemia = true;
    } else if (calc_pH > 7.45) {
        isAlkalemia = true;
    }

    if (isAcidemia) {
        if (calc_HCO3 < 22 && calc_pCO2 > 45) primaryDisorder = 'Miks Asidoz (Metabolik + Respiratuar)';
        else if (calc_HCO3 < 22) primaryDisorder = 'Metabolik Asidoz';
        else if (calc_pCO2 > 45) primaryDisorder = 'Respiratuar Asidoz';
        else if (calc_HCO3 < 24 && calc_pCO2 <= 40) primaryDisorder = 'Metabolik Asidoz';
        else if (calc_pCO2 > 40 && calc_HCO3 >= 24) primaryDisorder = 'Respiratuar Asidoz';
        else primaryDisorder = 'Miks Asidoz (Metabolik + Respiratuar)';
    } else if (isAlkalemia) {
        if (calc_HCO3 > 26 && calc_pCO2 < 35) primaryDisorder = 'Miks Alkaloz (Metabolik + Respiratuar)';
        else if (calc_HCO3 > 26) primaryDisorder = 'Metabolik Alkaloz';
        else if (calc_pCO2 < 35) primaryDisorder = 'Respiratuar Alkaloz';
        else if (calc_HCO3 > 24 && calc_pCO2 >= 40) primaryDisorder = 'Metabolik Alkaloz';
        else if (calc_pCO2 < 40 && calc_HCO3 <= 24) primaryDisorder = 'Respiratuar Alkaloz';
        else primaryDisorder = 'Miks Alkaloz (Metabolik + Respiratuar)';
    } else if (calc_pCO2 > 45 || calc_pCO2 < 35 || calc_HCO3 < 22 || calc_HCO3 > 26) {
        primaryDisorder = 'Kompanze veya Miks Asit-Baz Bozukluğu';
    }

    let expected_pCO2_min: number | null = null;
    let expected_pCO2_max: number | null = null;

    let compensationText = '';
    const flags: string[] = [];

    if (primaryDisorder === 'Metabolik Asidoz') {
        const expected = (1.5 * calc_HCO3) + 8;
        expected_pCO2_min = expected - 2;
        expected_pCO2_max = expected + 2;

        if (calc_pCO2 > expected_pCO2_max) {
            compensationText = 'Eşlik eden Respiratuar Asidoz';
            flags.push('RESP_ACIDOSIS');
        } else if (calc_pCO2 < expected_pCO2_min) {
            compensationText = 'Eşlik eden Respiratuar Alkaloz';
            flags.push('RESP_ALKALOSIS');
        } else {
            compensationText = 'Uygun Kompanzasyon (Saf Metabolik Asidoz)';
        }
    } else if (primaryDisorder === 'Miks Asidoz (Metabolik + Respiratuar)') {
        compensationText = 'Kompanzasyon yetersiz: Metabolik ve Respiratuar Asidoz birlikteliği';
        flags.push('RESP_ACIDOSIS');
    } else if (primaryDisorder === 'Metabolik Alkaloz') {
        const expected = (0.7 * calc_HCO3) + 20;
        expected_pCO2_min = expected - 5;
        expected_pCO2_max = expected + 5;

        if (calc_pCO2 > expected_pCO2_max) {
            compensationText = 'Eşlik eden Respiratuar Asidoz';
            flags.push('RESP_ACIDOSIS');
        } else if (calc_pCO2 < expected_pCO2_min) {
            compensationText = 'Eşlik eden Respiratuar Alkaloz';
            flags.push('RESP_ALKALOSIS');
        } else {
            compensationText = 'Uygun Kompanzasyon (Saf Metabolik Alkaloz)';
        }
    } else if (primaryDisorder === 'Miks Alkaloz (Metabolik + Respiratuar)') {
        compensationText = 'Kompanzasyon yetersiz: Metabolik ve Respiratuar Alkaloz birlikteliği';
        flags.push('RESP_ALKALOSIS');
    } else if (primaryDisorder === 'Respiratuar Asidoz') {
        const delta_pCO2 = calc_pCO2 - 40;
        const exp_acute_HCO3 = 24 + (delta_pCO2 / 10) * 1;
        const exp_chronic_HCO3 = 24 + (delta_pCO2 / 10) * 3.5;
        
        compensationText = `Akut Hdf HCO3: ~${exp_acute_HCO3.toFixed(1)} | Kronik Hdf HCO3: ~${exp_chronic_HCO3.toFixed(1)}`;
    } else if (primaryDisorder === 'Respiratuar Alkaloz') {
        const delta_pCO2 = 40 - calc_pCO2;
        const exp_acute_HCO3 = 24 - (delta_pCO2 / 10) * 2;
        const exp_chronic_HCO3 = 24 - (delta_pCO2 / 10) * 4.5;
        
        compensationText = `Akut Hdf HCO3: ~${exp_acute_HCO3.toFixed(1)} | Kronik Hdf HCO3: ~${exp_chronic_HCO3.toFixed(1)}`;
    } else if (primaryDisorder === 'Kompanze veya Miks Asit-Baz Bozukluğu') {
        if (calc_pCO2 > 45 && calc_HCO3 > 26) {
            compensationText = 'Kompanze Resp. Asidoz / Met. Alkaloz (Miks)';
        } else if (calc_pCO2 < 35 && calc_HCO3 < 22) {
            compensationText = 'Kompanze Met. Asidoz / Resp. Alkaloz (Miks)';
        } else {
            compensationText = 'Normal pH altında gizli/miks asit-baz bozukluğu';
        }
    }

    let AG: number | null = null;
    let corrected_AG: number | null = null;
    let deltaRatio: number | null = null;
    let hagmaStatus = '';

    if (Na !== undefined && Na !== null && !isNaN(Na) && Na > 0 && Cl !== undefined && Cl !== null && !isNaN(Cl) && Cl > 0 && calc_HCO3 !== undefined && calc_HCO3 !== null) {
        AG = Na - (Cl + calc_HCO3);
        corrected_AG = AG;
        
        if (Albumin !== undefined && Albumin !== null && !isNaN(Albumin) && Albumin > 0) {
            corrected_AG = AG + 2.5 * (4.0 - Albumin);
        }

        if (corrected_AG > 12) {
            hagmaStatus = 'HAGMA (Yüksek Anyon Açıklı Metabolik Asidoz)';
            flags.push('HAGMA');
            
            const deltaHCO3 = 24 - calc_HCO3;
            if (deltaHCO3 <= 0) {
                deltaRatio = null;
                hagmaStatus += ' + Eşlik eden Met. Alkaloz (veya Kronik Resp. Asidoz)';
            } else {
                deltaRatio = Number(((corrected_AG - 12) / deltaHCO3).toFixed(2));
                if (deltaRatio < 0.4) hagmaStatus += ' + NAGMA Birlikteliği (Örn: Diyare, RTA)';
                else if (deltaRatio >= 0.4 && deltaRatio < 0.8) hagmaStatus += ' - Miks HAGMA + NAGMA';
                else if (deltaRatio >= 0.8 && deltaRatio <= 2.0) hagmaStatus += ' - Saf HAGMA (DKA, Laktik, vb.)';
                else if (deltaRatio > 2.0) hagmaStatus += ' + Eşlik eden Met. Alkaloz (veya Kronik Resp. Asidoz)';
            }
        } else {
            hagmaStatus = 'NAGMA (Normal Anyon Açıklı)';
        }
    }

    return {
        pH: calc_pH,
        pCO2: calc_pCO2,
        HCO3: calc_HCO3,
        primaryDisorder,
        compensationText,
        AG,
        corrected_AG,
        deltaRatio,
        hagmaStatus,
        flags,
        hasAlbumin: (Albumin !== undefined && Albumin !== null && Albumin > 0)
    };
}
