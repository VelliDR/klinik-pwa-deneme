export function analyzeBloodGas({ pH, pCO2, HCO3, Na, Cl, Albumin, sampleType }) {
    if (!pH || !pCO2 || !HCO3) return null;

    let calc_pH = pH;
    let calc_pCO2 = pCO2;
    let calc_HCO3 = HCO3;

    if (sampleType === 'VBG') {
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
        if (calc_HCO3 < 22 && calc_pCO2 <= 45) primaryDisorder = 'Metabolik Asidoz';
        else if (calc_pCO2 > 45 && calc_HCO3 >= 22) primaryDisorder = 'Respiratuar Asidoz';
        else primaryDisorder = 'Miks Asidoz (Metabolik + Respiratuar)';
    } else if (isAlkalemia) {
        if (calc_HCO3 > 26 && calc_pCO2 >= 35) primaryDisorder = 'Metabolik Alkaloz';
        else if (calc_pCO2 < 35 && calc_HCO3 <= 26) primaryDisorder = 'Respiratuar Alkaloz';
        else primaryDisorder = 'Miks Alkaloz (Metabolik + Respiratuar)';
    }

    let expected_pCO2_min = null;
    let expected_pCO2_max = null;
    let expected_HCO3 = null; // for resp
    let expected_HCO3_min = null;
    let expected_HCO3_max = null;

    let compensationText = '';
    let flags = [];

    if (primaryDisorder.includes('Metabolik Asidoz')) {
        let expected = (1.5 * calc_HCO3) + 8;
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
    } else if (primaryDisorder.includes('Metabolik Alkaloz')) {
        let expected = (0.7 * calc_HCO3) + 20;
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
    } else if (primaryDisorder.includes('Respiratuar Asidoz')) {
        // Akut
        let delta_pCO2 = calc_pCO2 - 40;
        let exp_acute_HCO3 = 24 + (delta_pCO2 / 10) * 1;
        let exp_chronic_HCO3 = 24 + (delta_pCO2 / 10) * 3.5;
        
        compensationText = `Akut Hdf HCO3: ~${exp_acute_HCO3.toFixed(1)} | Kronik Hdf HCO3: ~${exp_chronic_HCO3.toFixed(1)}`;
    } else if (primaryDisorder.includes('Respiratuar Alkaloz')) {
        let delta_pCO2 = 40 - calc_pCO2;
        let exp_acute_HCO3 = 24 - (delta_pCO2 / 10) * 2;
        let exp_chronic_HCO3 = 24 - (delta_pCO2 / 10) * 4.5;
        
        compensationText = `Akut Hdf HCO3: ~${exp_acute_HCO3.toFixed(1)} | Kronik Hdf HCO3: ~${exp_chronic_HCO3.toFixed(1)}`;
    }

    let AG = null;
    let corrected_AG = null;
    let deltaRatio = null;
    let hagmaStatus = '';

    if (Na !== undefined && Na !== null && Cl !== undefined && Cl !== null && calc_HCO3 !== undefined && calc_HCO3 !== null) {
        AG = Na - (Cl + calc_HCO3);
        corrected_AG = AG;
        
        let hasAlbumin = false;
        if (Albumin !== undefined && Albumin !== null && Albumin > 0) {
            corrected_AG = AG + 2.5 * (4.0 - Albumin);
            hasAlbumin = true;
        }

        if (corrected_AG > 12) {
            hagmaStatus = 'HAGMA (Yüksek Anyon Açıklı Metabolik Asidoz)';
            flags.push('HAGMA');
            
            deltaRatio = (corrected_AG - 12) / (24 - calc_HCO3);
            
            if (deltaRatio < 0.4) hagmaStatus += ' + NAGMA Birlikteliği (Örn: Diyare, RTA)';
            else if (deltaRatio >= 0.4 && deltaRatio < 0.8) hagmaStatus += ' - Miks HAGMA + NAGMA';
            else if (deltaRatio >= 0.8 && deltaRatio <= 2.0) hagmaStatus += ' - Saf HAGMA (DKA, Laktik, vb.)';
            else if (deltaRatio > 2.0) hagmaStatus += ' + Eşlik eden Met. Alkaloz (veya Kronik Resp. Asidoz)';
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
