import { appState } from '../state.js';

export function generateSOAP() {
    const s = []; // Subjektif
    const o = []; // Objektif
    const a = []; // Değerlendirme
    const p = []; // Plan

    // --- SUBJEKTİF ---
    const ptParts = [];
    if (appState.biometry.ageFormatted && appState.biometry.ageFormatted !== '--') {
        ptParts.push(`Yaş: ${appState.biometry.ageFormatted}`);
    } else if (appState.biometry.ageYears !== null && appState.biometry.ageYears !== undefined) {
        ptParts.push(`Yaş: ${appState.biometry.ageYears} Yıl (${appState.biometry.ageMonths || 0} Ay)`);
    } else if (appState.biometry.ageMonths !== null) {
        ptParts.push(`Yaş: ${appState.biometry.ageMonths} Ay`);
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

    // Tromboemboli & Kardiyak Acil
    if (appState.thrombosis) {
        const th = appState.thrombosis;
        if (th.wellsDVT && th.wellsDVT.isValid) {
            o.push(`- Wells DVT Skoru: ${th.wellsDVT.score} Puan (${th.wellsDVT.riskCategory} - DVT İhtimali: ${th.wellsDVT.probability}).`);
        }
        if (th.wellsPTE && th.wellsPTE.isValid) {
            o.push(`- Wells PTE Skoru: ${th.wellsPTE.score} Puan (2-Seviyeli: ${th.wellsPTE.twoTierRisk.risk}, 3-Seviyeli: ${th.wellsPTE.threeTierRisk.risk}).`);
        }
        if (th.perc && th.perc.isValid) {
            o.push(`- PERC Dışlama Kuralı: Pozitif Kriter Sayısı: ${th.perc.positiveCount} (${th.perc.isPERCNegative ? 'PERC Negatif - PE Güvenle Dışlandı' : 'PERC Pozitif - İleri İnceleme Gerekli'}).`);
        }
        if (th.heart && th.heart.isValid) {
            o.push(`- HEART Skoru (Göğüs Ağrısı): ${th.heart.score}/10 (${th.heart.riskCategory} - 6-Haftalık MACE: %${th.heart.maceRatePercent}).`);
        }
        if (th.cha2ds2vasc && th.cha2ds2vasc.isValid) {
            o.push(`- CHA₂DS₂-VASc AF İnme Skoru: ${th.cha2ds2vasc.score} Puan (Yıllık İnme Riski: %${th.cha2ds2vasc.annualStrokeRiskPercent}).`);
        }
        if (th.hasbled && th.hasbled.isValid) {
            o.push(`- HAS-BLED Kanama Skoru: ${th.hasbled.score} Puan (${th.hasbled.bleedingRiskCategory}).`);
        }
    }

    // Nefroloji, Toksikoloji & Solunum
    if (appState.nephroTox) {
        const nt = appState.nephroTox;
        if (nt.fena && nt.fena.isValid) {
            o.push(`- FENa: %${nt.fena.fenaPercent} (${nt.fena.interpretation}).`);
        }
        if (nt.feurea && nt.feurea.isValid) {
            o.push(`- FEUrea (Diüretik Güvenli): %${nt.feurea.feUreaPercent} (${nt.feurea.interpretation}).`);
        }
        if (nt.correctedSodium && nt.correctedSodium.isValid) {
            o.push(`- Düzeltilmiş Sodyum (Katz): ${nt.correctedSodium.correctedSodium} mEq/L (Ölçülen: ${nt.correctedSodium.measuredSodium}, Glukoz: ${nt.correctedSodium.glucose}).`);
        }
        if (nt.osmolalGap && nt.osmolalGap.isValid) {
            o.push(`- Osmolal Açık: ${nt.osmolalGap.osmolalGap} mOsm/kg (${nt.osmolalGap.isElevated ? 'YÜKSEK - Toksik Alkol Şüphesi' : 'Normal'}).`);
        }
        if (nt.paracetamol && nt.paracetamol.isValid) {
            o.push(`- Parasetamol Düzeyi (Rumack-Matthew): ${nt.paracetamol.levelMcgMl} µg/mL (${nt.paracetamol.hoursPostIngestion}. saat) -> ${nt.paracetamol.interpretation}.`);
        }
        if (nt.curb65 && nt.curb65.isValid) {
            o.push(`- CURB-65 Pnömoni Skoru: ${nt.curb65.score}/5 (${nt.curb65.mortalityGroup} - 30-Günlük Mortalite: %${nt.curb65.mortalityPercent}).`);
        }
    }

    // Neonatoloji & Pediatrik Acil
    if (appState.neonatology) {
        const neo = appState.neonatology;
        if (neo.bhutani && neo.bhutani.isValid) {
            o.push(`- Bhutani Sarılık: Yaş: ${neo.bhutani.ageHours}s, TSB: ${neo.bhutani.totalBilirubin} mg/dL (Fototerapi Eşiği: ${neo.bhutani.phototherapyThreshold || '--'}, Kan Değişimi: ${neo.bhutani.exchangeThreshold || '--'}) -> ${neo.bhutani.interpretation}`);
        }
        if (neo.apgar) {
            o.push(`- APGAR Skoru (${neo.apgar.minute}. dk): ${neo.apgar.score}/10 (${neo.apgar.status}).`);
        }
        if (neo.westleyCroup) {
            o.push(`- Westley Krup Skoru: ${neo.westleyCroup.score}/17 (${neo.westleyCroup.severity} - ${neo.westleyCroup.interpretation}).`);
        }
        if (neo.cdsDehydration) {
            o.push(`- Klinik Dehidratasyon Skalası (CDS): ${neo.cdsDehydration.score}/8 (${neo.cdsDehydration.interpretation}).`);
        }
        if (neo.weightLoss && neo.weightLoss.isValid) {
            o.push(`- Yenidoğan Tartı Takibi: Doğum: ${neo.weightLoss.birthWeightG} g, Mevcut: ${neo.weightLoss.currentWeightG} g -> Tartı Değişimi: %${neo.weightLoss.percentLoss} (${neo.weightLoss.interpretation})`);
        }
    }

    // İlaç Güvenliği & DDI
    if (appState.safetyPrescription) {
        const sp = appState.safetyPrescription;
        if (sp.tripleWhammy && sp.tripleWhammy.isTripleWhammy) {
            o.push(`- 🚨 İlaç Güvenliği: Triple Whammy AKI Riski Tespit Edildi (RAS Blokörü + Diüretik + NSAİİ).`);
        }
        if (sp.renalAdjustments && sp.renalAdjustments.alertsCount > 0) {
            o.push(`- Renal Dozaj Uyarısı (${sp.renalAdjustments.egfr} mL/dk): ${sp.renalAdjustments.alertsCount} ilaçta doz kısıtlaması/kontrendikasyon mevcut.`);
        }
        if (sp.pregnancySafety && sp.pregnancySafety.alertsCount > 0) {
            o.push(`- Gebelik Güvenlik Uyarısı: ${sp.pregnancySafety.alertsCount} ilaçta fetal risk saptandı.`);
        }
        if (sp.neonatalDrugSafety && sp.neonatalDrugSafety.alertsCount > 0) {
            o.push(`- 🚨 Yenidoğan İlaç Güvenliği: ${sp.neonatalDrugSafety.alertsCount} ilaçta kontrendikasyon/toksisite uyarısı mevcut (${sp.neonatalDrugSafety.alerts.map(a => a.drugName).join(', ')}).`);
        }
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

    // Yeni Klinik Modül Değerlendirmeleri
    if (appState.thrombosis) {
        if (appState.thrombosis.wellsDVT && appState.thrombosis.wellsDVT.score >= 2) {
            a.push(`- Yüksek DVT Şüphesi: Wells Skoru ${appState.thrombosis.wellsDVT.score} (Acil Kompresyon Doppler USG önerilir).`);
        }
        if (appState.thrombosis.wellsPTE && appState.thrombosis.wellsPTE.score > 4) {
            a.push(`- Yüksek Pulmoner Emboli Olasılığı: Wells PE Skoru ${appState.thrombosis.wellsPTE.score} (Acil BT Pulmoner Anjiyografi endikedir).`);
        }
        if (appState.thrombosis.heart && appState.thrombosis.heart.score >= 7) {
            a.push(`- Yüksek Kardiyovasküler Olay Riski: HEART Skoru ${appState.thrombosis.heart.score} (Erken invaziv koroner anjiyografi/yatış).`);
        }
        if (appState.thrombosis.cha2ds2vasc && appState.thrombosis.cha2ds2vasc.score >= 2) {
            a.push(`- Yüksek AF Tromboemboli Riski: CHA₂DS₂-VASc Skoru ${appState.thrombosis.cha2ds2vasc.score} (Oral Antikoagülan - OAK Class I endikasyon).`);
        }
    }
    if (appState.nephroTox) {
        if (appState.nephroTox.paracetamol && appState.nephroTox.paracetamol.isToxic) {
            a.push(`- Akut Parasetamol Hepatotoksisitesi: Serum düzeyi Rumack-Matthew tedavi çizgisinin üzerindedir.`);
        }
        if (appState.nephroTox.osmolalGap && appState.nephroTox.osmolalGap.isElevated) {
            a.push(`- Yüksek Osmolal Açık (${appState.nephroTox.osmolalGap.osmolalGap} mOsm/kg): Metanol / Etilen Glikol intoksikasyonu dışlanmalıdır.`);
        }
        if (appState.nephroTox.curb65 && appState.nephroTox.curb65.score >= 3) {
            a.push(`- Şiddetli Pnömoni (CURB-65 Skoru: ${appState.nephroTox.curb65.score}): Yüksek mortalite riski, acil hastane/YBÜ yatışı.`);
        }
    }
    if (appState.neonatology) {
        if (appState.neonatology.bhutani && appState.neonatology.bhutani.status === 'EXCHANGE_TRANSFUSION_REQUIRED') {
            a.push(`- KRİTİK HİPERBİLİRUBİNEMİ: Acil Kan Değişimi (Exchange Transfusion) ve yoğun fototerapi endikasyonu!`);
        } else if (appState.neonatology.bhutani && appState.neonatology.bhutani.status === 'PHOTOTHERAPY_REQUIRED') {
            a.push(`- Yenidoğan Patolojik Sarılığı: TND fototerapi eşiği aşıldı, fototerapi başlanması gereklidir.`);
        }
        if (appState.neonatology.westleyCroup && appState.neonatology.westleyCroup.score >= 6) {
            a.push(`- Ciddi Krup / Yaklaşan Solunum Yetmezliği: Westley Skoru ${appState.neonatology.westleyCroup.score} (Nebülize Epinefrin ve YBÜ gözlemi).`);
        }
        if (appState.neonatology.weightLoss && (appState.neonatology.weightLoss.status === 'EXCESSIVE_LOSS_CRITICAL' || appState.neonatology.weightLoss.percentLoss > 10)) {
            a.push(`- YENİDOĞAN AŞIRI TARTI KAYBI: Doğum tartısının %${appState.neonatology.weightLoss.percentLoss}'i kaybedildi. Hipernatremik dehidratasyon riski!`);
        }
    }
    if (appState.safetyPrescription && appState.safetyPrescription.tripleWhammy && appState.safetyPrescription.tripleWhammy.isTripleWhammy) {
        a.push(`- İlaç Etkileşim Uyarısı: Triple Whammy kombinasyonu nedeniyle Akut Böbrek Hasarı riski çok yüksektir.`);
    }
    if (appState.safetyPrescription && appState.safetyPrescription.neonatalDrugSafety && appState.safetyPrescription.neonatalDrugSafety.hasContraindication) {
        a.push(`- YENİDOĞAN İLAÇ KONTRENDİKASYONU: Reçetelenen ilaçlarda fatal toksisite riski (Kernikterus/Gri Bebek Sendromu vb.) tespit edildi.`);
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
        if (fl.isNeonate) {
            p.push(`${pCount}. Yenidoğan İdame Sıvısı (TND Sıvı Kademesi - ${fl.dayTitle}): ${fl.dailyVolume} mL/gün (${fl.hourlyRate} mL/saat). ${fl.fluidTypeRecommendation}`);
        } else {
            p.push(`${pCount}. İdame Sıvısı (Holliday-Segar): ${fl.dailyVolume} mL/gün (${fl.hourlyRate} mL/saat).`);
        }
        pCount++;
    }
    if (appState.neonatology && appState.neonatology.weightLoss && appState.neonatology.weightLoss.isValid) {
        const wl = appState.neonatology.weightLoss;
        if (wl.recommendations && wl.recommendations.length > 0) {
            p.push(`${pCount}. Yenidoğan Tartı & Beslenme İzlemi: ${wl.recommendations[0]}`);
            pCount++;
        }
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

    // Yeni Plan & Tedavi Adımları
    if (appState.nephroTox && appState.nephroTox.paracetamol && appState.nephroTox.paracetamol.isToxic && appState.nephroTox.paracetamol.nacProtocol) {
        const nac = appState.nephroTox.paracetamol.nacProtocol;
        p.push(`${pCount}. IV N-Asetilsistein (NAC) 21 Saatlik Protokolü:`);
        p.push(`   - Faz 1 (Yükleme, 1. saat): ${nac.phase1.doseMgKg} mg/kg (${nac.phase1.fluidD5W})`);
        p.push(`   - Faz 2 (4 saatlik infüzyon): ${nac.phase2.doseMgKg} mg/kg (${nac.phase2.fluidD5W})`);
        p.push(`   - Faz 3 (16 saatlik infüzyon): ${nac.phase3.doseMgKg} mg/kg (${nac.phase3.fluidD5W})`);
        pCount++;
    }
    if (appState.neonatology && appState.neonatology.westleyCroup && appState.neonatology.westleyCroup.score >= 3) {
        p.push(`${pCount}. Krup Tedavisi: Tek doz Deksametazon 0.60 mg/kg oral/IM${appState.neonatology.westleyCroup.score >= 6 ? ' + Nebülize L-Epinefrin 0.5 mL/kg (1:1000, maks 5 mL)' : ''}.`);
        pCount++;
    }
    if (appState.neonatology && appState.neonatology.cdsDehydration && appState.neonatology.cdsDehydration.orsRecommendedMl) {
        p.push(`${pCount}. Dehidratasyon Sıvı Protokolü: ${appState.neonatology.cdsDehydration.orsRecommendedMl}`);
        pCount++;
    }
    if (appState.safetyPrescription && appState.safetyPrescription.tripleWhammy && appState.safetyPrescription.tripleWhammy.isTripleWhammy) {
        p.push(`${pCount}. İlaç Güvenliği Eylemi: NSAİİ kesilmeli, analjezi için Parasetamol tercih edilmeli ve böbrek fonksiyonları (kreatinin, K+) kontrol edilmelidir.`);
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

