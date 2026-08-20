import { appState } from '../state.js';

export function generateSOAP() {
    const s = []; // Subjektif
    const o = []; // Objektif
    const a = []; // Değerlendirme
    const p = []; // Plan

    // --- SUBJEKTİF ---
    let ptInfo = 'Hasta Bilgileri: ';
    if (appState.biometry.ageYears !== null) ptInfo += `Yaş: ${appState.biometry.ageYears} Yıl (${appState.biometry.ageMonths} Ay), `;
    if (appState.biometry.gender) ptInfo += `Cinsiyet: ${appState.biometry.gender === 'M' ? 'Erkek' : 'Kadın'}, `;
    if (appState.biometry.weightKg) ptInfo += `Kilo: ${appState.biometry.weightKg} kg, `;
    if (appState.biometry.heightCm) ptInfo += `Boy: ${appState.biometry.heightCm} cm.`;
    
    if (ptInfo.trim() !== 'Hasta Bilgileri:') {
        s.push(ptInfo);
    }
    
    const anamnez = document.getElementById('input-custom-notes')?.value;
    if (anamnez) {
        s.push(`Ana Şikayet / Öykü: ${anamnez}`);
    }

    // --- OBJEKTİF ---
    let biometryStr = '- Büyüme/Biyometri: ';
    if (appState.biometry.bsa) biometryStr += `BSA: ${appState.biometry.bsa} m², `;
    if (appState.biometry.egfr) biometryStr += `eGFR: ${appState.biometry.egfr} mL/dk, `;
    if (appState.pediatrics.percentiles) {
        biometryStr += `Kilo/Yaş: ${appState.pediatrics.percentiles.weight}p, Boy/Yaş: ${appState.pediatrics.percentiles.height}p`;
    }
    if (biometryStr !== '- Büyüme/Biyometri: ') o.push(biometryStr.replace(/,\s*$/, '.'));

    // Triage / Vitals
    if (appState.medicine.news2) {
        o.push(`- Vital / Triyaj (NEWS2): ${appState.medicine.news2.score} (${appState.medicine.news2.risk})`);
    }
    if (appState.pediatrics.pews) {
        o.push(`- Vital / Triyaj (PEWS): ${appState.pediatrics.pews.score} (${appState.pediatrics.pews.risk})`);
    }
    if (appState.medicine.gcs) {
        o.push(`- GCS: ${appState.medicine.gcs.total} (E${appState.medicine.gcs.e}V${appState.medicine.gcs.v}M${appState.medicine.gcs.m})`);
    }

    // Blood Gas
    if (appState.medicine.bloodGas) {
        o.push(`- Kan Gazı: pH: ${appState.medicine.bloodGas.ph}, pCO2: ${appState.medicine.bloodGas.pco2}, HCO3: ${appState.medicine.bloodGas.hco3}`);
        o.push(`  -> Tanı: ${appState.medicine.bloodGas.diagnosis}`);
    }

    // Surgery
    if (appState.surgery.alvarado) {
        o.push(`- Cerrahi Skorlar: Alvarado: ${appState.surgery.alvarado.score}/10 (${appState.surgery.alvarado.risk} Apendisit Olasılığı)`);
    }

    // OBGYN
    if (appState.obgyn.eddData) {
        o.push(`- Obstetrik: SAT'a göre gebelik haftası: ${appState.obgyn.eddData.gestationalAge}, TDT: ${appState.obgyn.eddData.edd}`);
    }

    // --- DEĞERLENDİRME ---
    if (appState.surgery.alvarado && appState.surgery.alvarado.score >= 7) {
        a.push(`1. Akut Apendisit (Alvarado Skoru: ${appState.surgery.alvarado.score}, Cerrahi konsültasyon endike).`);
    }
    if (appState.medicine.bloodGas) {
        a.push(`- Kan Gazı Yorumu: ${appState.medicine.bloodGas.diagnosis}`);
    }

    // --- PLAN ---
    let pCount = 1;
    if (appState.medicine.fluid) {
        p.push(`${pCount}. İdame Sıvısı (Holliday-Segar): ${appState.medicine.fluid.dailyVolume} mL/gün (${appState.medicine.fluid.hourlyRate} mL/saat).`);
        pCount++;
    }
    if (appState.pediatrics.syrupDose) {
        p.push(`${pCount}. İlaç Dozajı: ${appState.pediatrics.syrupDose.name}: ${appState.pediatrics.syrupDose.targetDoseMg} mg tek doz (${appState.pediatrics.syrupDose.olcekText}, ${appState.pediatrics.syrupDose.freq}).`);
        pCount++;
    }
    if (appState.treatment && appState.treatment.selectedDrugs && appState.treatment.selectedDrugs.length > 0) {
        const drugsStr = appState.treatment.selectedDrugs.map(d => d.brand).join(', ');
        p.push(`${pCount}. Reçete / Tedavi Protokolü: ${drugsStr}`);
        pCount++;
    }

    let soapText = `[S] SUBJEKTİF:\n${s.length > 0 ? s.join('\n') : 'Girilen veri yok.'}\n\n`;
    soapText += `[O] OBJEKTİF:\n${o.length > 0 ? o.join('\n') : 'Girilen veri yok.'}\n\n`;
    soapText += `[A] DEĞERLENDİRME:\n${a.length > 0 ? a.join('\n') : 'Özel değerlendirme yok.'}\n\n`;
    soapText += `[P] PLAN & TEDAVİ:\n${p.length > 0 ? p.join('\n') : 'Özel plan girilmemiş.'}`;

    return soapText;
}
