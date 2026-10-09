import { appState } from '../state.js';

export function generateSOAP() {
    const s = []; // Subjektif
    const o = []; // Objektif
    const a = []; // Değerlendirme
    const p = []; // Plan

    // --- SUBJEKTİF ---
    const ptParts = [];
    if (appState.biometry.ageYears !== null && appState.biometry.ageYears !== undefined) {
        ptParts.push(`Yaş: ${appState.biometry.ageYears} Yıl (${appState.biometry.ageMonths || 0} Ay)`);
    }
    if (appState.pediatrics && appState.pediatrics.correctedAge && appState.pediatrics.correctedAge.isPreterm) {
        ptParts.push(`Düzeltilmiş Yaş: ${appState.pediatrics.correctedAge.correctedMonths} Ay (${appState.pediatrics.correctedAge.gestationalWeeks} GH preterm)`);
    }
    if (appState.biometry.gender) {
        ptParts.push(`Cinsiyet: ${appState.biometry.gender === 'female' ? 'Kadın' : 'Erkek'}`);
    }
    if (appState.biometry.weightKg) {
        ptParts.push(`Kilo: ${appState.biometry.weightKg} kg`);
    }
    if (appState.biometry.heightCm) {
        ptParts.push(`Boy: ${appState.biometry.heightCm} cm`);
    }

    if (ptParts.length > 0) {
        s.push(`Hasta Bilgileri: ${ptParts.join(', ')}.`);
    }

    const anamnez = document.getElementById('input-custom-notes')?.value;
    if (anamnez && anamnez.trim()) {
        s.push(`Ana Şikayet / Öykü: ${anamnez.trim()}`);
    }

    // --- OBJEKTİF ---
    const bioParts = [];
    if (appState.biometry.bsa) bioParts.push(`BSA: ${appState.biometry.bsa} m²`);
    if (appState.biometry.egfr) bioParts.push(`eGFR: ${appState.biometry.egfr} mL/dk`);
    
    if (appState.pediatrics && appState.pediatrics.percentiles) {
        const perc = appState.pediatrics.percentiles;
        if (perc.weightPercentile !== null && perc.weightPercentile !== undefined) {
            bioParts.push(`Kilo/Yaş: %${perc.weightPercentile}${perc.weightZ !== null ? ' (Z: ' + perc.weightZ + ')' : ''}`);
        }
        if (perc.heightPercentile !== null && perc.heightPercentile !== undefined) {
            bioParts.push(`Boy/Yaş: %${perc.heightPercentile}${perc.heightZ !== null ? ' (Z: ' + perc.heightZ + ')' : ''}`);
        }
        if (perc.headCircumferencePercentile !== null && perc.headCircumferencePercentile !== undefined) {
            bioParts.push(`Baş Çevresi: %${perc.headCircumferencePercentile}${perc.headCircZ !== null ? ' (Z: ' + perc.headCircZ + ')' : ''}`);
        }
        if (perc.bmiPercentile !== null && perc.bmiPercentile !== undefined) {
            bioParts.push(`BKİ: ${perc.bmiValue || ''} kg/m² (%${perc.bmiPercentile}, ${perc.category || 'Normal'})`);
        }
    }
    if (appState.pediatrics && appState.pediatrics.targetHeight) {
        const th = appState.pediatrics.targetHeight;
        bioParts.push(`Hedef Boy (Tanner): ${th.targetHeightCm} cm (${th.targetRangeCm}, %${th.targetPercentile})`);
    }
    if (bioParts.length > 0) {
        o.push(`- Büyüme & Biyometri: ${bioParts.join(', ')}.`);
    }

    // Pediatrik Demir / Anemi
    if (appState.pediatrics && appState.pediatrics.iron && appState.pediatrics.iron.status === 'SUCCESS') {
        const ir = appState.pediatrics.iron;
        o.push(`- Demir & Anemi Durumu: ${ir.anemiaStatus || 'Normal'}${ir.hb !== null ? ' (Hb: ' + ir.hb + ' g/dL)' : ''}. ${ir.treatmentRecommendation || ''}`);
    }

    // Triage / Vitals / Tansiyon
    if (appState.pediatrics && appState.pediatrics.bp) {
        o.push(`- Pediatrik Tansiyon (AAP 2017): ${appState.pediatrics.bp.stage}${appState.pediatrics.bp.thresholds ? ' [' + appState.pediatrics.bp.thresholds + ']' : ''}`);
    }
    if (appState.medicine && appState.medicine.news2) {
        o.push(`- Vital / Triyaj (NEWS2): Skor ${appState.medicine.news2.score || 0} (${appState.medicine.news2.risk || 'Düşük Risk'})`);
    }
    if (appState.pediatrics && appState.pediatrics.pews) {
        o.push(`- Vital / Triyaj (PEWS): Skor ${appState.pediatrics.pews.score || 0} (${appState.pediatrics.pews.risk || 'Düşük Risk'})`);
    }
    if (appState.medicine && appState.medicine.gcs) {
        o.push(`- GCS (Glasgow Koma Skalası): Toplam ${appState.medicine.gcs.total || 15} (E${appState.medicine.gcs.e || 4}V${appState.medicine.gcs.v || 5}M${appState.medicine.gcs.m || 6})`);
    }

    // Kardiyoloji & EKG
    if (appState.other && appState.other.cardiac && appState.other.cardiac.status === 'OK') {
        const c = appState.other.cardiac;
        let cardStr = `- EKG & Kardiyak: Nabız: ${c.hr || '--'} bpm`;
        if (c.rrMs) cardStr += ` (RR: ${c.rrMs} ms)`;
        if (c.qt) cardStr += `, QT: ${c.qt} ms`;
        if (c.qrs) cardStr += `, QRS: ${c.qrs} ms`;
        
        cardStr += `, QTcB (Bazett): ${c.qtcBazett || '--'} ms, QTcF (Fridericia): ${c.qtcFridericia || '--'} ms`;
        if (c.qtcBogossian) cardStr += `, QTcBog (Bogossian): ${c.qtcBogossian} ms`;
        cardStr += ` [Yorum: ${c.interpretation || 'Normal'}]`;
        
        if (c.tisdaleScore > 0) cardStr += ` [Tisdale Skoru: ${c.tisdaleScore} - ${c.tisdaleRisk}]`;
        o.push(cardStr + '.');

        if (c.drugFlags && c.drugFlags.length > 0) {
            c.drugFlags.forEach(flag => o.push(`  -> İlaç/EKG Uyarısı: ${flag}`));
        }
    }
    if (appState.other && appState.other.axis) {
        const ax = appState.other.axis;
        o.push(`- EKG Aksı: ${ax.degrees}° (${ax.axisCategory}).`);
    }

    // Kan Gazı
    if (appState.medicine && appState.medicine.bloodGas && appState.medicine.bloodGas.status !== 'INCOMPLETE') {
        const bg = appState.medicine.bloodGas;
        let bgStr = `- Kan Gazı (ABG/VBG): pH: ${bg.pH || '--'}, pCO2: ${bg.pCO2 || '--'}, HCO3: ${bg.HCO3 || '--'}`;
        if (bg.primaryDisorder) {
            bgStr += ` -> Tanı: ${bg.primaryDisorder} ${bg.compensationText ? '(' + bg.compensationText + ')' : ''}`;
        }
        o.push(bgStr + '.');
    }

    // İnfüzyon & GIR
    if (appState.medicine && appState.medicine.gir) {
        const g = appState.medicine.gir;
        o.push(`- Glukoz İnfüzyon Hızı (GIR): ${g.gir} mg/kg/dk (${g.interpretation}).`);
    }

    // Endokrin & Metabolizma
    if (appState.medicine && appState.medicine.homaIR) {
        const hm = appState.medicine.homaIR;
        o.push(`- HOMA-IR İnsülin Direnci: ${hm.homaIR} [${hm.tannerStage}, Eşik: ${hm.cutoff}] -> ${hm.isResistant ? 'İnsülin Direnci Pozitif' : 'Normal'}.`);
    }
    if (appState.medicine && appState.medicine.steroid) {
        const st = appState.medicine.steroid;
        o.push(`- Glukokortikoid Eşdeğerlik: ${st.sourceDrug} ${st.inputDoseMg} mg bazında hesaplandı.`);
    }

    // Akılcı Antibiyotik & Centor-McIsaac
    if (appState.pediatrics && appState.pediatrics.centor) {
        const ct = appState.pediatrics.centor;
        o.push(`- Centor / McIsaac Faranjit Skoru: ${ct.score} (GAS Riski: ${ct.riskPercent}). ${ct.recommendation}`);
    }

    // Cerrahi Skorlar
    if (appState.surgery && appState.surgery.alvarado && appState.surgery.alvarado.score > 0) {
        const alv = appState.surgery.alvarado;
        o.push(`- Cerrahi (Alvarado Apendisit Skoru): ${alv.score}/10 (${alv.risk || ''}).`);
    }

    // Obstetrik
    if (appState.obgyn && appState.obgyn.eddData && appState.obgyn.eddData.status === 'OK') {
        const edd = appState.obgyn.eddData;
        o.push(`- Obstetrik: SAT'a göre Gebelik Haftası: ${edd.gestationalAge || '--'}, Tahmini Doğum Tarihi (TDT): ${edd.edd || '--'}.`);
    }

    // --- DEĞERLENDİRME ---
    if (appState.pediatrics && appState.pediatrics.targetHeight && appState.pediatrics.targetHeight.deviationAlert) {
        a.push(`- ${appState.pediatrics.targetHeight.deviationAlert}`);
    }
    if (appState.pediatrics && appState.pediatrics.bp && appState.pediatrics.bp.stage.includes('Hipertansiyon')) {
        a.push(`- Pediatrik Kan Basıncı Uyarısı: ${appState.pediatrics.bp.stage}. Doğrulayıcı ölçümler ve etiyolojik tarama önerilir.`);
    }
    if (appState.medicine && appState.medicine.gir && (appState.medicine.gir.status === 'LOW' || appState.medicine.gir.gir < 4)) {
        a.push(`- Neonatal Hipoglisemi Riski: Glukoz infüzyon hızı kritik düşük (${appState.medicine.gir.gir} mg/kg/dk).`);
    }
    if (appState.medicine && appState.medicine.homaIR && appState.medicine.homaIR.isResistant) {
        a.push(`- ${appState.medicine.homaIR.interpretation}`);
    }
    if (appState.pediatrics && appState.pediatrics.centor && appState.pediatrics.centor.score >= 4) {
        a.push(`- Akut Tonsillofaranjit: Yüksek Streptokok olasılığı (Centor Skoru: ${appState.pediatrics.centor.score}).`);
    }
    if (appState.surgery && appState.surgery.alvarado && appState.surgery.alvarado.score >= 7) {
        a.push(`- Yüksek Apendisit Olasılığı (Alvarado Skoru: ${appState.surgery.alvarado.score}/10). Cerrahi konsültasyonu önerilir.`);
    }
    if (appState.other && appState.other.cardiac && appState.other.cardiac.colorCode === 'danger') {
        a.push(`- Kardiyak Uyarı: ${appState.other.cardiac.interpretation}`);
    }
    if (appState.medicine && appState.medicine.bloodGas && appState.medicine.bloodGas.primaryDisorder) {
        a.push(`- Asit-Baz Bozukluğu: ${appState.medicine.bloodGas.primaryDisorder}.`);
    }

    // --- PLAN & TEDAVİ ---
    let pCount = 1;
    if (appState.medicine && appState.medicine.gir && (appState.medicine.gir.status === 'LOW' || appState.medicine.gir.gir < 4)) {
        p.push(`${pCount}. Hipoglisemi Acil Protokolü: ${appState.medicine.gir.hypoglycemiaBolus.instructions}`);
        pCount++;
    }
    if (appState.surgery && appState.surgery.parkland && appState.surgery.parkland.status === 'OK') {
        const pk = appState.surgery.parkland;
        p.push(`${pCount}. Parkland Yanık Sıvı Resüsitasyonu: Toplam 24s Sıvı: ${pk.totalFluid24h} mL (İlk 8s: ${pk.first8hRate} mL/s, Sonraki 16s: ${pk.next16hRate} mL/s).`);
        pCount++;
    }
    if (appState.medicine && appState.medicine.fluid && appState.medicine.fluid.dailyVolume) {
        const fl = appState.medicine.fluid;
        p.push(`${pCount}. İdame Sıvısı (Holliday-Segar): ${fl.dailyVolume} mL/gün (${fl.hourlyRate} mL/saat).`);
        pCount++;
    }
    if (appState.pediatrics && appState.pediatrics.syrupDose) {
        const sy = appState.pediatrics.syrupDose;
        p.push(`${pCount}. Pediatrik Dozaj: ${sy.name || 'Şurup'}: ${sy.targetDoseMg || ''} mg tek doz (${sy.olcekText || ''}, ${sy.freq || ''}).`);
        pCount++;
    }
    if (appState.pediatrics && appState.pediatrics.iron && appState.pediatrics.iron.prophylaxisDose) {
        const ir = appState.pediatrics.iron;
        p.push(`${pCount}. Demir Takviyesi / Profilaksi: ${ir.prophylaxisDose}`);
        pCount++;
    }
    if (appState.pediatrics && appState.pediatrics.centor && appState.pediatrics.centor.score >= 4) {
        p.push(`${pCount}. Akılcı Antibiyotik Protokolü: AGBHS şüphesi nedeniyle Amoksisilin 50 mg/kg/gün (2 dozda, 10 gün) veya Penisilin V değerlendiriniz.`);
        pCount++;
    }
    if (appState.treatment && appState.treatment.selectedDrugs && appState.treatment.selectedDrugs.length > 0) {
        const drugsStr = appState.treatment.selectedDrugs.map(d => d.brand || d.generic).join(', ');
        p.push(`${pCount}. Reçete / Tedavi Protokolü: ${drugsStr}.`);
        pCount++;
    }

    let soapText = `[S] SUBJEKTİF:\n${s.length > 0 ? s.join('\n') : 'Girilen veri yok.'}\n\n`;
    soapText += `[O] OBJEKTİF:\n${o.length > 0 ? o.join('\n') : 'Girilen veri yok.'}\n\n`;
    soapText += `[A] DEĞERLENDİRME:\n${a.length > 0 ? a.join('\n') : 'Özel değerlendirme yok.'}\n\n`;
    soapText += `[P] PLAN & TEDAVİ:\n${p.length > 0 ? p.join('\n') : 'Özel plan girilmemiş.'}`;

    return soapText;
}

