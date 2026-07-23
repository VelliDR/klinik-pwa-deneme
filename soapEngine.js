export function generateSOAPNote(state) {
    const { patient, vitals, fluid, glycemia, drugs } = state;
    const pDerived = patient.derived;
    const vEval = vitals.derived.evaluation;
    const fRes = fluid.derived.fluidResult;
    const gRes = glycemia.derived.insulinResult;
    const dRes = drugs.derived.dosageResult; // YENİ

    const lines = [];
    const todayStr = new Date().toLocaleDateString('tr-TR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    lines.push(`=== KLİNİK HASTA NOTU [${todayStr}] ===`);
    lines.push(`Hasta Kodu: ${patient.id}`);
    lines.push('');

    // [S] SUBJEKTİF
    lines.push('[S] DEMOGRAFİ & ANAMNEZ');
    if (pDerived.ageGroup) {
        let ageText = `${pDerived.ageGroup.label} (${pDerived.totalMonths} Ay)`;
        if (patient.isPremature && pDerived.totalMonths <= 12) {
            ageText += ` [Düzeltilmiş Yaş: ${pDerived.correctedMonths} Ay - ${patient.gestationalWeeks}. GW]`;
        }
        lines.push(`• Yaş Grubu: ${ageText}`);
    } else { lines.push('• Yaş: Belirtilmedi'); }
    lines.push('');

    // [O] OBJEKTİF
    lines.push('[O] BİYOMETRİ & FİZİK MUAYENE / VİTALLER');
    const bioParts = [];
    if (patient.weightKg) bioParts.push(`Kilo: ${patient.weightKg} kg`);
    if (patient.heightCm) bioParts.push(`Boy: ${patient.heightCm} cm`);
    if (pDerived.bsa) bioParts.push(`BSA: ${pDerived.bsa} m²`);
    lines.push(`• Ölçümler: ${bioParts.length > 0 ? bioParts.join(' | ') : 'Belirtilmedi'}`);

    const vitParts = [];
    if (vitals.systolicBP && vitals.diastolicBP) vitParts.push(`TA: ${vitals.systolicBP}/${vitals.diastolicBP} mmHg`);
    if (vitals.heartRate) vitParts.push(`Nabız: ${vitals.heartRate}/dk`);
    if (vitals.respRate) vitParts.push(`Solunum: ${vitals.respRate}/dk`);
    if (vitals.bodyTemp) vitParts.push(`Ateş: ${vitals.bodyTemp}°C`);
    if (vitals.spo2) vitParts.push(`SpO2: %${vitals.spo2}`);
    lines.push(`• Vital Bulgular: ${vitParts.length > 0 ? vitParts.join(' | ') : 'Girilmedi'}`);
    lines.push('');

    // [A] DEĞERLENDİRME
    lines.push('[A] DEĞERLENDİRME & RİSK SKORLAMASI');
    if (vEval) {
        lines.push(`• Triyaj Skoru (${vEval.type}): ${vEval.score} Puan [Risk Düzeyi: ${vEval.risk}]`);
        if (vEval.flags && vEval.flags.length > 0) lines.push(`• Kritik Bulgular: ${vEval.flags.join(', ')}`);
    } else { lines.push('• Triyaj değerlendirmesi için yetersiz vital bulgu.'); }

    if (glycemia.currentGlucose) lines.push(`• Anlık Kan Şekeri: ${glycemia.currentGlucose} mg/dL`);
    lines.push('');

    // [P] PLAN
    lines.push('[P] TEDAVİ & TAKİP PLANI');
    
    // YENİ: Reçete Edilen İlaç Plana Yansıtılır
    if (dRes) {
        let drugText = `• Reçete: ${dRes.drugName} (Örn: ${dRes.selectedBrand}) - Doz: ${dRes.singleDoseMg} mg (Günde ${dRes.dosesPerDay} kez, ${dRes.intervalHours} saat arayla)`;
        if (dRes.syrupVolumeMl) {
            drugText += ` [Süspansiyon: ${dRes.syrupVolumeMl} ml/doz - (${dRes.syrupConcentration})]`;
        }
        lines.push(drugText);
        if (dRes.warnings && dRes.warnings.length > 0) {
            dRes.warnings.forEach(w => lines.push(`  └─ UYARI: ${w}`));
        }
    }

    if (fRes) {
        let fluidNote = `• İdame Sıvı (Holliday-Segar): ${fRes.dailyMl} ml/gün (${fRes.hourlyMl} ml/saat infüzyon)`;
        if (fRes.hasFeverAdjustment) fluidNote += ' [Ateş nedeniyle %12/°C artırıldı]';
        lines.push(fluidNote);
    }

    if (gRes && gRes.totalInsulin > 0) {
        lines.push(`• İnsülin Uygulaması: Toplam ${gRes.totalInsulin} Ünite Subkütan Bolus`);
        lines.push(`  └─ Detay: Düzeltme: ${gRes.correctionDose} Ü | Karbo Bolusu: ${gRes.carbDose} Ü`);
    }

    if (!fRes && (!gRes || gRes.totalInsulin === 0) && !dRes) {
        lines.push('• Rutin klinik takip önerilir.');
    }

    return lines.join('\n');
}